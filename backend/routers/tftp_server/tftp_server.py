"""TFTP Server Router.

API endpoints for managing VyOS TFTP server configuration.

Version differences:
  1.4 and 1.5 — identical TFTP server configuration paths; no version-specific behavior.

Endpoints:
  GET  /vyos/tftp-server/capabilities  — version-aware feature flags
  GET  /vyos/tftp-server/config        — normalized TFTP server configuration
  POST /vyos/tftp-server/batch         — atomic set/delete operations
"""

from fastapi import APIRouter, HTTPException, Request
from starlette.concurrency import run_in_threadpool
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from session_vyos_service import get_session_vyos_service
from vyos_builders.tftp_server import TFTPServerBatchBuilder
from fastapi_permissions import require_read_permission, require_write_permission
from rbac_permissions import FeatureGroup
import inspect
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/vyos/tftp-server", tags=["tftp-server"])


# ============================================================================
# Pydantic Models
# ============================================================================


class TFTPServerListenAddress(BaseModel):
    """An address the TFTP server listens on, optionally bound to a VRF."""
    address: str
    vrf: Optional[str] = None


class TFTPServerConfig(BaseModel):
    """Full TFTP server configuration."""
    directory: Optional[str] = None
    allow_upload: bool = False
    port: Optional[str] = None
    listen_addresses: List[TFTPServerListenAddress] = []


class TFTPServerBatchOperation(BaseModel):
    op: str = Field(..., description="Builder method name")
    value: Optional[str] = Field(
        None,
        description=(
            "Argument(s) for the operation. Single-arg methods: plain string. "
            "Multi-arg methods: comma-separated (e.g., '192.0.2.1,mgmt')."
        ),
    )


class TFTPServerBatchRequest(BaseModel):
    operations: List[TFTPServerBatchOperation]


class VyOSResponse(BaseModel):
    success: bool
    data: Optional[Dict[str, Any]] = None
    error: Optional[str] = None


# ============================================================================
# Internal builder method denylist
# ============================================================================

_INTERNAL_BUILDER_METHODS = frozenset({
    "add_set", "add_delete", "get_operations", "is_empty",
    "get_capabilities", "mappers", "version", "_operations", "m",
})


# ============================================================================
# Endpoint 1: Capabilities
# ============================================================================


@router.get("/capabilities")
async def get_tftp_server_capabilities(request: Request):
    """Return TFTP server feature capabilities based on the VyOS version."""
    await require_read_permission(request, FeatureGroup.TFTP_SERVER)
    try:
        service = get_session_vyos_service(request)
        builder = TFTPServerBatchBuilder(version=service.get_version())
        caps = builder.get_capabilities()
        if hasattr(request.state, "instance") and request.state.instance:
            caps["instance_name"] = request.state.instance.get("name")
            caps["instance_id"] = request.state.instance.get("id")
        return caps
    except Exception:
        logger.exception("Unhandled error in get_tftp_server_capabilities")
        raise HTTPException(status_code=500, detail="Internal server error")


# ============================================================================
# Endpoint 2: Config
# ============================================================================


@router.get("/config", response_model=TFTPServerConfig)
async def get_tftp_server_config(http_request: Request, refresh: bool = False):
    """Return the full TFTP server configuration in a normalized format."""
    await require_read_permission(http_request, FeatureGroup.TFTP_SERVER)
    try:
        service = get_session_vyos_service(http_request)
        full_config = await run_in_threadpool(service.get_full_config, refresh=refresh)

        tftp_raw = full_config.get("service", {}).get("tftp-server", {})
        if not tftp_raw or not isinstance(tftp_raw, dict):
            return TFTPServerConfig()

        return TFTPServerConfig(
            directory=tftp_raw.get("directory"),
            allow_upload="allow-upload" in tftp_raw,
            port=tftp_raw.get("port"),
            listen_addresses=_parse_listen_addresses(tftp_raw),
        )
    except Exception:
        logger.exception("Unhandled error in get_tftp_server_config")
        raise HTTPException(status_code=500, detail="Internal server error")


# ============================================================================
# Endpoint 3: Batch Operations
# ============================================================================


@router.post("/batch", response_model=VyOSResponse)
async def tftp_server_batch_configure(http_request: Request, body: TFTPServerBatchRequest):
    """Execute a batch of TFTP server configuration operations atomically."""
    await require_write_permission(http_request, FeatureGroup.TFTP_SERVER)
    try:
        service = get_session_vyos_service(http_request)
        builder = TFTPServerBatchBuilder(version=service.get_version())

        for operation in body.operations:
            if operation.op in _INTERNAL_BUILDER_METHODS or operation.op.startswith("_"):
                raise HTTPException(
                    status_code=400,
                    detail=f"Operation not allowed: {operation.op}",
                )

            method = getattr(builder, operation.op)
            sig = inspect.signature(method)
            params = [p for p in sig.parameters.keys() if p != "self"]

            if len(params) == 0:
                method()
            elif len(params) == 1:
                if operation.value is not None:
                    method(operation.value)
                else:
                    method()
            elif len(params) >= 2:
                if operation.value and "," in operation.value:
                    parts = operation.value.split(",", len(params) - 1)
                    method(*parts)
                elif operation.value:
                    method(operation.value)

        response = service.execute_batch(builder)
        return VyOSResponse(
            success=response.status == 200,
            data={"message": "TFTP server configuration updated"},
            error=response.error if response.error else None,
        )
    except HTTPException:
        raise
    except AttributeError as e:
        raise HTTPException(status_code=400, detail=f"Unknown operation: {e}")
    except Exception:
        logger.exception("Unhandled error in tftp_server_batch_configure")
        raise HTTPException(status_code=500, detail="Internal server error")


# ============================================================================
# Config parsers
# ============================================================================


def _parse_listen_addresses(tftp_raw: dict) -> List[TFTPServerListenAddress]:
    listen_raw = tftp_raw.get("listen-address", {})
    if not isinstance(listen_raw, dict):
        return []
    result = []
    for address, cfg in listen_raw.items():
        cfg = cfg or {}
        result.append(TFTPServerListenAddress(address=address, vrf=cfg.get("vrf")))
    result.sort(key=lambda a: a.address)
    return result
