"""Console Server Router.

API endpoints for managing VyOS Serial Console Server configuration.
The template structure is identical between VyOS 1.4 and 1.5.

Endpoints:
  GET  /vyos/console-server/capabilities  — version-aware feature flags
  GET  /vyos/console-server/config        — normalized console-server configuration
  POST /vyos/console-server/batch         — atomic set/delete operations
"""

from fastapi import APIRouter, HTTPException, Request
from starlette.concurrency import run_in_threadpool
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from session_vyos_service import get_session_vyos_service
from vyos_builders.console_server import ConsoleServerBatchBuilder
from fastapi_permissions import require_read_permission, require_write_permission
from rbac_permissions import FeatureGroup
import inspect
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/vyos/console-server", tags=["console-server"])


# ============================================================================
# Pydantic Models
# ============================================================================


class ConsoleDeviceSsh(BaseModel):
    port: Optional[int] = None


class ConsoleDevice(BaseModel):
    name: str
    alias: Optional[str] = None
    data_bits: Optional[str] = None
    description: Optional[str] = None
    parity: Optional[str] = None
    speed: Optional[str] = None
    ssh: Optional[ConsoleDeviceSsh] = None
    stop_bits: Optional[str] = None


class ConsoleServerConfig(BaseModel):
    devices: List[ConsoleDevice] = []


class ConsoleServerBatchOperation(BaseModel):
    op: str = Field(..., description="Builder method name")
    value: Optional[str] = Field(
        None,
        description=(
            "Argument(s) for the operation. "
            "Single-arg methods: plain string. "
            "Multi-arg methods: comma-separated (e.g., 'ttyS0,115200')."
        ),
    )


class ConsoleServerBatchRequest(BaseModel):
    operations: List[ConsoleServerBatchOperation]


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
async def get_console_server_capabilities(request: Request):
    """Return console-server feature capabilities based on the VyOS version."""
    await require_read_permission(request, FeatureGroup.CONSOLE_SERVER)
    try:
        service = get_session_vyos_service(request)
        builder = ConsoleServerBatchBuilder(version=service.get_version())
        caps = builder.get_capabilities()
        if hasattr(request.state, "instance") and request.state.instance:
            caps["instance_name"] = request.state.instance.get("name")
            caps["instance_id"] = request.state.instance.get("id")
        return caps
    except Exception:
        logger.exception("Unhandled error in get_console_server_capabilities")
        raise HTTPException(status_code=500, detail="Internal server error")


# ============================================================================
# Endpoint 2: Config
# ============================================================================


@router.get("/config", response_model=ConsoleServerConfig)
async def get_console_server_config(http_request: Request, refresh: bool = False):
    """Return the full console-server configuration in a normalized format."""
    await require_read_permission(http_request, FeatureGroup.CONSOLE_SERVER)
    try:
        service = get_session_vyos_service(http_request)
        full_config = await run_in_threadpool(service.get_full_config, refresh=refresh)

        cs_raw = full_config.get("service", {}).get("console-server", {})
        if not cs_raw:
            return ConsoleServerConfig()

        devices = _parse_devices(cs_raw.get("device"))
        return ConsoleServerConfig(devices=devices)
    except Exception:
        logger.exception("Unhandled error in get_console_server_config")
        raise HTTPException(status_code=500, detail="Internal server error")


# ============================================================================
# Endpoint 3: Batch Operations
# ============================================================================


@router.post("/batch", response_model=VyOSResponse)
async def console_server_batch_configure(
    http_request: Request, body: ConsoleServerBatchRequest
):
    """Execute a batch of console-server configuration operations atomically."""
    await require_write_permission(http_request, FeatureGroup.CONSOLE_SERVER)
    try:
        service = get_session_vyos_service(http_request)
        builder = ConsoleServerBatchBuilder(version=service.get_version())

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
            data={"message": "Console Server configuration updated"},
            error=response.error if response.error else None,
        )
    except HTTPException:
        raise
    except AttributeError as e:
        raise HTTPException(status_code=400, detail=f"Unknown operation: {e}")
    except Exception:
        logger.exception("Unhandled error in console_server_batch_configure")
        raise HTTPException(status_code=500, detail="Internal server error")


# ============================================================================
# Config Parsers
# ============================================================================


def _parse_devices(raw) -> List[ConsoleDevice]:
    if not raw or not isinstance(raw, dict):
        return []
    devices = []
    for device_name, device_cfg in raw.items():
        if device_cfg is None:
            device_cfg = {}
        ssh_raw = device_cfg.get("ssh")
        ssh = None
        if ssh_raw is not None:
            port = None
            if isinstance(ssh_raw, dict):
                port_raw = ssh_raw.get("port")
                if port_raw is not None:
                    try:
                        port = int(port_raw)
                    except (ValueError, TypeError):
                        logger.debug(
                            "Invalid ssh port '%s' for device '%s'",
                            port_raw, device_name,
                        )
            ssh = ConsoleDeviceSsh(port=port)
        devices.append(ConsoleDevice(
            name=device_name,
            alias=device_cfg.get("alias"),
            data_bits=device_cfg.get("data-bits"),
            description=device_cfg.get("description"),
            parity=device_cfg.get("parity"),
            speed=device_cfg.get("speed"),
            ssh=ssh,
            stop_bits=device_cfg.get("stop-bits"),
        ))
    return sorted(devices, key=lambda d: d.name)
