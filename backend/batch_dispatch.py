"""Resolve client-supplied batch operation names onto a builder.

Routers must not getattr(builder, operation.op) themselves. The denylist
lived in each file and drifted; one helper is the only allowed dispatch.
"""

import inspect
import re
from typing import Any, Callable, Collection, FrozenSet, List, Mapping, Optional, Union

from fastapi import HTTPException

# Plumbing every batch builder exposes. Underscore-prefixed names are also
# rejected. If a builder defines _INTERNAL_BUILDER_METHODS, those names are
# unioned in.
INTERNAL_BUILDER_METHODS: FrozenSet[str] = frozenset({
    "add_set",
    "add_delete",
    "add_multiple_sets",
    "get_operations",
    "is_empty",
    "clear",
    "operation_count",
    "get_capabilities",
    "get_version",
    "build",
})


def resolve_batch_method(builder: Any, op: str) -> Callable[..., Any]:
    """Return builder.op if it is a public callable, else HTTP 400."""
    if not isinstance(op, str) or not op or op.startswith("_"):
        raise HTTPException(status_code=400, detail=f"Invalid operation: {op}")
    blocked = INTERNAL_BUILDER_METHODS
    extra = getattr(builder, "_INTERNAL_BUILDER_METHODS", None)
    if extra:
        blocked = blocked | frozenset(extra)
    if op in blocked:
        raise HTTPException(status_code=400, detail=f"Invalid operation: {op}")
    method = getattr(builder, op, None)
    if not callable(method):
        raise HTTPException(status_code=400, detail=f"Unknown operation: {op}")
    return method


def call_comma_batch_op(
    builder: Any,
    op: str,
    value: Optional[str],
    *,
    may_be_empty: Collection[str] = (),
    name_pattern: Optional[re.Pattern[str]] = None,
) -> None:
    """Resolve op and call it with value split on commas, else HTTP 400.

    The value is split into as many parts as the method has parameters, so a
    comma inside the last argument is kept. A zero-arg op rejects a value:
    calling it anyway drops the value and runs the wider op (delete_interfaces
    for a delete_interface that lost its name).

    may_be_empty names parameters of a multi-arg op whose part may be an empty
    string, for a leaf the device commits with an empty value (an event-handler
    environment variable). Every other part, and the whole value, must be set.

    name_pattern, when given, must match the whole first argument the method
    receives (an object name), so a single-arg op cannot take "name,extra".
    """
    method = resolve_batch_method(builder, op)
    params = list(inspect.signature(method).parameters)
    count = len(params)
    if count == 0:
        if value:
            raise HTTPException(status_code=400, detail=f"Operation {op} takes no value")
        method()
        return
    if not value:
        raise HTTPException(status_code=400, detail=f"Operation {op} requires a value")
    parts = value.split(",", count - 1)
    if len(parts) != count or not all(
        part or name in may_be_empty for name, part in zip(params, parts)
    ):
        raise HTTPException(status_code=400, detail=f"Operation {op} requires {count} values")
    if name_pattern is not None and not name_pattern.fullmatch(parts[0]):
        raise HTTPException(status_code=400, detail=f"Invalid name in operation '{op}'.")
    method(*parts)


def call_item_batch_op(
    builder: Any,
    op: str,
    item_name: Union[str, int],
    value: Optional[str],
    *,
    blank_is_missing: bool = True,
    separator: str = "|",
    bound: Optional[Mapping[str, Optional[Union[str, int]]]] = None,
) -> None:
    """Resolve op and call it with item_name plus value split on separator, else HTTP 400.

    The first parameter is the request's item_name (a name, or a rule number);
    the value fills the rest, split into as many parts as remain, so the
    separator inside the last argument is kept. An item-only op rejects a
    value: calling it anyway drops the value and runs the wider op
    (delete_interface for a delete that lost its leaf). A whitespace-only value
    or part counts as missing unless blank_is_missing is False, for a feature
    whose leaves (passwords, secrets) accept spaces.

    bound maps a later parameter name to a request-level id (a pool number
    under a rule). An op with that parameter requires the id; an op without
    it rejects one, for the same reason an item-only op rejects a value.
    """
    method = resolve_batch_method(builder, op)
    params = list(inspect.signature(method).parameters)
    if not params:
        # Not an item op: there is no parameter to bind item_name to.
        raise HTTPException(status_code=400, detail=f"Invalid operation: {op}")
    bound = bound or {}
    for name, bound_value in bound.items():
        if name in params[1:] and bound_value is None:
            raise HTTPException(status_code=400, detail=f"Operation {op} requires {name}")
        if name not in params[1:] and bound_value is not None:
            raise HTTPException(status_code=400, detail=f"Operation {op} takes no {name}")
    count = len([name for name in params[1:] if name not in bound])
    if count == 0:
        if value:
            raise HTTPException(status_code=400, detail=f"Operation {op} takes no value")
        parts: List[str] = []
    else:
        def present(text: str) -> bool:
            return bool(text.strip()) if blank_is_missing else bool(text)

        if value is None or not present(value):
            raise HTTPException(status_code=400, detail=f"Operation {op} requires a value")
        parts = value.split(separator, count - 1)
        if len(parts) != count or not all(present(part) for part in parts):
            raise HTTPException(status_code=400, detail=f"Operation {op} requires {count} values")
    values = iter(parts)
    method(item_name, *(bound[name] if name in bound else next(values) for name in params[1:]))
