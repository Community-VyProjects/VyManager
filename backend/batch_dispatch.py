"""Resolve client-supplied batch operation names onto a builder.

Routers must not getattr(builder, operation.op) themselves. The denylist
lived in each file and drifted; one helper is the only allowed dispatch.
"""

import inspect
from typing import Any, Callable, FrozenSet, Optional

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


def call_comma_batch_op(builder: Any, op: str, value: Optional[str]) -> None:
    """Resolve op and call it with value split on commas, else HTTP 400.

    The value is split into as many parts as the method has parameters, so a
    comma inside the last argument is kept. A zero-arg op rejects a value:
    calling it anyway drops the value and runs the wider op (delete_interfaces
    for a delete_interface that lost its name).
    """
    method = resolve_batch_method(builder, op)
    count = len(inspect.signature(method).parameters)
    if count == 0:
        if value:
            raise HTTPException(status_code=400, detail=f"Operation {op} takes no value")
        method()
        return
    if not value:
        raise HTTPException(status_code=400, detail=f"Operation {op} requires a value")
    parts = value.split(",", count - 1)
    if len(parts) != count or not all(parts):
        raise HTTPException(status_code=400, detail=f"Operation {op} requires {count} values")
    method(*parts)


def call_item_batch_op(builder: Any, op: str, item_name: str, value: Optional[str]) -> None:
    """Resolve op and call it with item_name plus value split on "|", else HTTP 400.

    The first parameter is the request's item_name; the value fills the rest,
    split into as many parts as remain, so a "|" inside the last argument is
    kept. An item-only op rejects a value: calling it anyway drops the value
    and runs the wider op (delete_interface for a delete that lost its leaf).
    """
    method = resolve_batch_method(builder, op)
    count = len(inspect.signature(method).parameters)
    if count == 1:
        if value:
            raise HTTPException(status_code=400, detail=f"Operation {op} takes no value")
        method(item_name)
        return
    if not value or not value.strip():
        raise HTTPException(status_code=400, detail=f"Operation {op} requires a value")
    parts = value.split("|", count - 2)
    if len(parts) != count - 1 or not all(part.strip() for part in parts):
        raise HTTPException(status_code=400, detail=f"Operation {op} requires {count - 1} values")
    method(item_name, *parts)
