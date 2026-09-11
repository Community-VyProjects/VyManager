"""Shared batch skeleton for interface routers.

Every interface router accepted the same batch envelope and ran the same
signature-length dispatch against its builder. That skeleton was copied into
each file, which is how subject-field and registry misses kept appearing. This
module owns the envelope models and the dispatch. Per-type parse models stay in
each router where they actually differ.

A router obtains its own builder (``service.create_<type>_batch()`` or the
type's builder mixin), then hands it here. Builder methods take ``interface``
plus zero or more extra parameters; extra parameters are supplied by the client
as a colon-separated ``value``, one segment per parameter after ``interface``.
"""

import inspect
import logging
from typing import Any, Callable, Dict, List, Optional

from fastapi import HTTPException
from pydantic import BaseModel, Field

from batch_dispatch import resolve_batch_method

logger = logging.getLogger(__name__)


class BatchOperation(BaseModel):
    op: str = Field(..., description="Operation name")
    value: Optional[str] = Field(None, description="Operation value (if required)")


class BatchRequest(BaseModel):
    interface: str = Field(..., description="Interface name")
    operations: List[BatchOperation]


class VyOSResponse(BaseModel):
    success: bool
    data: Optional[Dict[str, Any]] = None
    error: Optional[str] = None


def _invoke(method: Callable[..., Any], interface: str, op: str, value: Optional[str]) -> None:
    """Call a builder method with the interface and colon-split extra args."""
    params = [p for p in inspect.signature(method).parameters if p != "self"]

    if not params:
        raise HTTPException(
            status_code=400,
            detail=f"Operation '{op}' has unexpected signature",
        )

    # Only the interface name is required.
    if len(params) == 1:
        method(interface)
        return

    if value is None:
        raise HTTPException(status_code=400, detail=f"Operation '{op}' requires a value")

    # interface + one value.
    if len(params) == 2:
        method(interface, value)
        return

    # interface + N extra parameters packed colon-separated into value.
    extra = len(params) - 1
    parts = value.split(":", extra - 1)
    if len(parts) != extra:
        fmt = ":".join(f"param{i + 1}" for i in range(extra))
        raise HTTPException(
            status_code=400,
            detail=f"Operation '{op}' requires value in '{fmt}' format",
        )
    method(interface, *parts)


def run_interface_batch(service: Any, batch: Any, request: BatchRequest) -> VyOSResponse:
    """Dispatch every operation in ``request`` onto ``batch`` and execute it."""
    try:
        for op in request.operations:
            method = resolve_batch_method(batch, op.op)
            _invoke(method, request.interface, op.op, op.value)

        response = service.execute_batch(batch)
        return VyOSResponse(
            success=response.status == 200,
            data=response.result if isinstance(response.result, dict) else None,
            error=response.error if response.error else None,
        )
    except HTTPException:
        raise
    except NotImplementedError as e:
        # Builders raise NotImplementedError for version-gated operations; the
        # dispatcher owns mapping that to a 400 for the whole interface family.
        logger.info("Unsupported operation for this VyOS version: %s", e)
        raise HTTPException(
            status_code=400,
            detail=f"Operation is not supported on this VyOS version: {e}",
        )
    except Exception:
        logger.exception("Unhandled error in batch_configure")
        raise HTTPException(status_code=500, detail="Internal server error")
