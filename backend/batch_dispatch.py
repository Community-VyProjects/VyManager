"""Resolve client-supplied batch operation names onto a builder.

Routers must not getattr(builder, operation.op) themselves. The denylist
lived in each file and drifted; one helper is the only allowed dispatch.
"""

from typing import Any, Callable, FrozenSet

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
