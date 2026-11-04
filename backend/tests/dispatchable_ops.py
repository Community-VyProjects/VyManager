"""The batch op names a client can actually dispatch on a builder."""

from fastapi import HTTPException

from batch_dispatch import resolve_batch_method


def dispatchable_ops(builder):
    """Every attribute name resolve_batch_method accepts on this builder instance."""
    names = set()
    for name in dir(builder):
        try:
            resolve_batch_method(builder, name)
        except HTTPException:
            continue
        names.add(name)
    return names
