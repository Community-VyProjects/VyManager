"""
Dummy Interface Configuration Endpoints

All dummy (virtual) interface endpoints for VyOS configuration.
Dummy interfaces do not support physical properties like speed/duplex.
"""

import inspect
import logging
from typing import Dict, List, Optional, Any

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field, ConfigDict
from starlette.concurrency import run_in_threadpool

from fastapi_permissions import require_read_permission, require_write_permission
from rbac_permissions import FeatureGroup
from session_vyos_service import get_session_vyos_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/vyos/dummy", tags=["dummy-interface"])


# Stub functions for backwards compatibility with app.py
def set_device_registry(registry):
    """Legacy function - no longer used."""
    pass


def set_configured_device_name(name):
    """Legacy function - no longer used."""
    pass


# ============================================================================
# Request / Response Models
# ============================================================================


class BatchOperation(BaseModel):
    op: str = Field(..., description="Operation name")
    value: Optional[str] = Field(None, description="Operation value (if required)")


class BatchRequest(BaseModel):
    interface: str = Field(..., description="Interface name (e.g., dum0)")
    operations: List[BatchOperation]


class VyOSResponse(BaseModel):
    success: bool
    data: Optional[Dict[str, Any]] = None
    error: Optional[str] = None


class DummyInterfaceConfig(BaseModel):
    name: str
    type: str
    addresses: List[str] = Field(default_factory=list)
    description: Optional[str] = None
    vrf: Optional[str] = None
    mtu: Optional[str] = None
    disable: Optional[bool] = None
    ip_disable_forwarding: Optional[bool] = None
    ip_source_validation: Optional[str] = None
    ipv6_disable_forwarding: Optional[bool] = None
    ipv6_address_eui64: List[str] = Field(default_factory=list)
    ipv6_address_no_default_link_local: Optional[bool] = None
    mirror_ingress: Optional[str] = None
    mirror_egress: Optional[str] = None
    redirect: Optional[str] = None
    # VyOS 1.5+ only
    mac: Optional[str] = None
    netns: Optional[str] = None

    model_config = ConfigDict(populate_by_name=True)


class DummyInterfacesConfigResponse(BaseModel):
    interfaces: List[DummyInterfaceConfig] = Field(default_factory=list)
    total: int = 0
    by_type: Dict[str, int] = Field(default_factory=dict)
    by_vrf: Dict[str, int] = Field(default_factory=dict)


# ============================================================================
# Endpoints
# ============================================================================


@router.get("/capabilities")
async def get_capabilities(request: Request) -> Dict[str, Any]:
    """Return version-aware feature capabilities for dummy interfaces."""
    await require_read_permission(request, FeatureGroup.INTERFACES)
    service = get_session_vyos_service(request)
    from vyos_builders.interfaces.dummy import DummyInterfaceBuilderMixin
    builder = DummyInterfaceBuilderMixin(version=service.get_version())
    return builder.get_capabilities()


@router.get("/config", response_model=DummyInterfacesConfigResponse)
async def get_config(http_request: Request, refresh: bool = False) -> DummyInterfacesConfigResponse:
    """Get all dummy interface configurations from VyOS."""
    await require_read_permission(http_request, FeatureGroup.INTERFACES)
    try:
        service = get_session_vyos_service(http_request)
        full_config = await run_in_threadpool(service.get_full_config, refresh)
        raw_config = full_config.get("interfaces", {}).get("dummy", {})

        from vyos_mappers.interfaces.dummy_versions import get_dummy_mapper
        mapper = get_dummy_mapper(service.get_version())
        parsed = mapper.parse_interfaces_of_type(raw_config)
        return DummyInterfacesConfigResponse(**parsed)
    except Exception:
        logger.exception("Unhandled error in get_config")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.post("/batch", response_model=VyOSResponse)
async def batch_configure(http_request: Request, request: BatchRequest) -> VyOSResponse:
    """
    Configure a dummy interface using batch operations.

    **Supported operations (all versions):**
    | Operation | Value | Description |
    |-----------|-------|-------------|
    | `set_interface_description` | Yes | Set description |
    | `delete_interface_description` | No | Remove description |
    | `set_interface_address` | Yes | Add IP address (CIDR) |
    | `delete_interface_address` | Yes | Remove IP address |
    | `set_interface_mtu` | Yes | Set MTU (68-16000) |
    | `delete_interface_mtu` | No | Reset MTU to default |
    | `set_interface_disable` | No | Administratively disable |
    | `delete_interface_disable` | No | Re-enable interface |
    | `set_interface_vrf` | Yes | Assign to VRF |
    | `delete_interface_vrf` | No | Remove VRF assignment |
    | `set_ip_disable_forwarding` | No | Disable IPv4 forwarding |
    | `delete_ip_disable_forwarding` | No | Enable IPv4 forwarding |
    | `set_ip_source_validation` | Yes | Source validation (strict/loose/disable) |
    | `delete_ip_source_validation` | No | Remove source validation |
    | `set_ipv6_disable_forwarding` | No | Disable IPv6 forwarding |
    | `delete_ipv6_disable_forwarding` | No | Enable IPv6 forwarding |
    | `set_ipv6_address_eui64` | Yes | Add EUI-64 prefix |
    | `delete_ipv6_address_eui64` | Yes | Remove EUI-64 prefix |
    | `set_ipv6_address_no_default_link_local` | No | Remove default link-local |
    | `delete_ipv6_address_no_default_link_local` | No | Restore default link-local |
    | `set_mirror_ingress` | Yes | Mirror ingress to interface |
    | `delete_mirror_ingress` | No | Remove ingress mirror |
    | `set_mirror_egress` | Yes | Mirror egress to interface |
    | `delete_mirror_egress` | No | Remove egress mirror |
    | `set_redirect` | Yes | Redirect incoming packets |
    | `delete_redirect` | No | Remove redirect |
    | `delete_interface` | No | Delete entire interface |

    **VyOS 1.5+ only:**
    | `set_mac` | Yes | Set MAC address |
    | `delete_mac` | No | Remove MAC address |
    | `set_netns` | Yes | Assign to network namespace |
    | `delete_netns` | No | Remove network namespace |
    """
    await require_write_permission(http_request, FeatureGroup.INTERFACES)

    try:
        service = get_session_vyos_service(http_request)
        batch = service.create_dummy_batch()

        for op in request.operations:
            if op.op in batch._INTERNAL_BUILDER_METHODS:
                raise HTTPException(
                    status_code=400,
                    detail=f"Operation '{op.op}' is not a valid interface operation",
                )

            method = getattr(batch, op.op, None)
            if method is None:
                raise HTTPException(
                    status_code=400,
                    detail=f"Unsupported operation: {op.op}",
                )

            sig = inspect.signature(method)
            params = [p for p in sig.parameters.keys() if p != "self"]

            if len(params) == 1:
                method(request.interface)
            elif len(params) == 2:
                if op.value is None:
                    raise HTTPException(
                        status_code=400,
                        detail=f"Operation '{op.op}' requires a value",
                    )
                method(request.interface, op.value)
            else:
                raise HTTPException(
                    status_code=400,
                    detail=f"Operation '{op.op}' has unexpected signature",
                )

        response = service.execute_batch(batch)
        return VyOSResponse(
            success=response.status == 200,
            data=response.result,
            error=response.error if response.error else None,
        )
    except HTTPException:
        raise
    except Exception:
        logger.exception("Unhandled error in batch_configure")
        raise HTTPException(status_code=500, detail="Internal server error")
