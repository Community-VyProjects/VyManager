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
from vyos_mappers.base import CommandMapperRegistry
from vyos_builders.console_server import ConsoleServerBatchBuilder
from fastapi_permissions import require_read_permission, require_write_permission
from rbac_permissions import FeatureGroup
import inspect
import logging
from batch_dispatch import resolve_batch_method

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
        version = service.get_version()
        full_config = await run_in_threadpool(service.get_full_config, refresh=refresh)
        mapper = CommandMapperRegistry.get_mapper("console_server", version)
        return ConsoleServerConfig(**mapper.parse_config(full_config))
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
            method = resolve_batch_method(builder, operation.op)
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

