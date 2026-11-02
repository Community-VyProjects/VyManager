"""DHCP Relay Service Router.

API endpoints for managing VyOS DHCP Relay configuration.
The template structure is identical between VyOS 1.4 and 1.5.

Endpoints:
  GET  /vyos/dhcp-relay/capabilities  — version-aware feature flags
  GET  /vyos/dhcp-relay/config        — normalized relay configuration
  POST /vyos/dhcp-relay/batch         — atomic set/delete operations
"""

from fastapi import APIRouter, HTTPException, Request
from starlette.concurrency import run_in_threadpool
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from session_vyos_service import get_session_vyos_service
from vyos_mappers.base import CommandMapperRegistry
from vyos_builders.dhcp_relay import DHCPRelayBatchBuilder
from fastapi_permissions import require_read_permission, require_write_permission
from rbac_permissions import FeatureGroup
import inspect
import logging
from batch_dispatch import resolve_batch_method

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/vyos/dhcp-relay", tags=["dhcp-relay"])


# ============================================================================
# Pydantic Models
# ============================================================================


class DHCPRelayOptions(BaseModel):
    """Relay agent options."""
    hop_count: Optional[int] = None
    max_size: Optional[int] = None
    relay_agents_packets: Optional[str] = None


class DHCPRelayConfig(BaseModel):
    """Full DHCP relay service configuration."""
    disabled: bool = False
    interfaces: List[str] = []
    listen_interfaces: List[str] = []
    upstream_interfaces: List[str] = []
    servers: List[str] = []
    relay_options: DHCPRelayOptions = Field(default_factory=DHCPRelayOptions)


class DHCPRelayBatchOperation(BaseModel):
    op: str = Field(..., description="Builder method name")
    value: Optional[str] = Field(
        None,
        description=(
            "Argument(s) for the operation. "
            "Single-arg methods: plain string. "
            "Multi-arg methods: comma-separated (e.g., 'eth0,eth1')."
        ),
    )


class DHCPRelayBatchRequest(BaseModel):
    operations: List[DHCPRelayBatchOperation]


class VyOSResponse(BaseModel):
    success: bool
    data: Optional[Dict[str, Any]] = None
    error: Optional[str] = None

# ============================================================================
# Endpoint 1: Capabilities
# ============================================================================


@router.get("/capabilities")
async def get_dhcp_relay_capabilities(request: Request):
    """Return DHCP relay feature capabilities based on the VyOS version."""
    await require_read_permission(request, FeatureGroup.DHCP_RELAY)
    try:
        service = get_session_vyos_service(request)
        builder = DHCPRelayBatchBuilder(version=service.get_version())
        caps = builder.get_capabilities()
        if hasattr(request.state, "instance") and request.state.instance:
            caps["instance_name"] = request.state.instance.get("name")
            caps["instance_id"] = request.state.instance.get("id")
        return caps
    except Exception:
        logger.exception("Unhandled error in get_dhcp_relay_capabilities")
        raise HTTPException(status_code=500, detail="Internal server error")


# ============================================================================
# Endpoint 2: Config
# ============================================================================


@router.get("/config", response_model=DHCPRelayConfig)
async def get_dhcp_relay_config(http_request: Request, refresh: bool = False):
    """Return the full DHCP relay configuration in a normalized format."""
    await require_read_permission(http_request, FeatureGroup.DHCP_RELAY)
    try:
        service = get_session_vyos_service(http_request)
        version = service.get_version()
        full_config = await run_in_threadpool(service.get_full_config, refresh=refresh)
        mapper = CommandMapperRegistry.get_mapper("dhcp_relay", version)
        return DHCPRelayConfig(**mapper.parse_config(full_config))
    except Exception:
        logger.exception("Unhandled error in get_dhcp_relay_config")
        raise HTTPException(status_code=500, detail="Internal server error")


# ============================================================================
# Endpoint 3: Batch Operations
# ============================================================================


@router.post("/batch", response_model=VyOSResponse)
async def dhcp_relay_batch_configure(
    http_request: Request, body: DHCPRelayBatchRequest
):
    """Execute a batch of DHCP relay configuration operations atomically."""
    await require_write_permission(http_request, FeatureGroup.DHCP_RELAY)
    try:
        service = get_session_vyos_service(http_request)
        builder = DHCPRelayBatchBuilder(version=service.get_version())

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
            data={"message": "DHCP Relay configuration updated"},
            error=response.error if response.error else None,
        )
    except HTTPException:
        raise
    except AttributeError as e:
        raise HTTPException(status_code=400, detail=f"Unknown operation: {e}")
    except Exception:
        logger.exception("Unhandled error in dhcp_relay_batch_configure")
        raise HTTPException(status_code=500, detail="Internal server error")

