"""DHCPv6 Relay Service Router.

API endpoints for managing VyOS DHCPv6 Relay configuration.
The template structure is identical between VyOS 1.4 and 1.5.

Endpoints:
  GET  /vyos/dhcpv6-relay/capabilities  — version-aware feature flags
  GET  /vyos/dhcpv6-relay/config        — normalized relay configuration
  POST /vyos/dhcpv6-relay/batch         — atomic set/delete operations
"""

from fastapi import APIRouter, HTTPException, Request
from starlette.concurrency import run_in_threadpool
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from session_vyos_service import get_session_vyos_service
from vyos_builders.dhcpv6_relay import DHCPv6RelayBatchBuilder
from fastapi_permissions import require_read_permission, require_write_permission
from rbac_permissions import FeatureGroup
import inspect
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/vyos/dhcpv6-relay", tags=["dhcpv6-relay"])


# ============================================================================
# Pydantic Models
# ============================================================================


class DHCPv6ListenInterface(BaseModel):
    interface: str
    address: Optional[str] = None


class DHCPv6UpstreamInterface(BaseModel):
    interface: str
    addresses: List[str] = []


class DHCPv6RelayConfig(BaseModel):
    disabled: bool = False
    max_hop_count: Optional[int] = None
    use_interface_id_option: bool = False
    listen_interfaces: List[DHCPv6ListenInterface] = []
    upstream_interfaces: List[DHCPv6UpstreamInterface] = []


class DHCPv6RelayBatchOperation(BaseModel):
    op: str = Field(..., description="Builder method name")
    value: Optional[str] = Field(
        None,
        description=(
            "Argument(s) for the operation. "
            "Single-arg methods: plain string. "
            "Multi-arg methods: comma-separated (e.g., 'eth0,2001:db8::1')."
        ),
    )


class DHCPv6RelayBatchRequest(BaseModel):
    operations: List[DHCPv6RelayBatchOperation]


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
async def get_dhcpv6_relay_capabilities(request: Request):
    """Return DHCPv6 relay feature capabilities based on the VyOS version."""
    await require_read_permission(request, FeatureGroup.DHCPV6_RELAY)
    try:
        service = get_session_vyos_service(request)
        builder = DHCPv6RelayBatchBuilder(version=service.get_version())
        caps = builder.get_capabilities()
        if hasattr(request.state, "instance") and request.state.instance:
            caps["instance_name"] = request.state.instance.get("name")
            caps["instance_id"] = request.state.instance.get("id")
        return caps
    except Exception:
        logger.exception("Unhandled error in get_dhcpv6_relay_capabilities")
        raise HTTPException(status_code=500, detail="Internal server error")


# ============================================================================
# Endpoint 2: Config
# ============================================================================


@router.get("/config", response_model=DHCPv6RelayConfig)
async def get_dhcpv6_relay_config(http_request: Request, refresh: bool = False):
    """Return the full DHCPv6 relay configuration in a normalized format."""
    await require_read_permission(http_request, FeatureGroup.DHCPV6_RELAY)
    try:
        service = get_session_vyos_service(http_request)
        full_config = await run_in_threadpool(service.get_full_config, refresh=refresh)

        relay_raw = full_config.get("service", {}).get("dhcpv6-relay", {})
        if not relay_raw:
            return DHCPv6RelayConfig()

        max_hop_count = None
        raw_hop = relay_raw.get("max-hop-count")
        if raw_hop is not None:
            try:
                max_hop_count = int(raw_hop)
            except (ValueError, TypeError):
                logger.debug("Non-integer max-hop-count value %r; ignoring", raw_hop)

        return DHCPv6RelayConfig(
            disabled="disable" in relay_raw,
            max_hop_count=max_hop_count,
            use_interface_id_option="use-interface-id-option" in relay_raw,
            listen_interfaces=_parse_listen_interfaces(relay_raw.get("listen-interface", {})),
            upstream_interfaces=_parse_upstream_interfaces(relay_raw.get("upstream-interface", {})),
        )
    except Exception:
        logger.exception("Unhandled error in get_dhcpv6_relay_config")
        raise HTTPException(status_code=500, detail="Internal server error")


# ============================================================================
# Endpoint 3: Batch Operations
# ============================================================================


@router.post("/batch", response_model=VyOSResponse)
async def dhcpv6_relay_batch_configure(
    http_request: Request, body: DHCPv6RelayBatchRequest
):
    """Execute a batch of DHCPv6 relay configuration operations atomically."""
    await require_write_permission(http_request, FeatureGroup.DHCPV6_RELAY)
    try:
        service = get_session_vyos_service(http_request)
        builder = DHCPv6RelayBatchBuilder(version=service.get_version())

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
            data={"message": "DHCPv6 Relay configuration updated"},
            error=response.error if response.error else None,
        )
    except HTTPException:
        raise
    except AttributeError as e:
        raise HTTPException(status_code=400, detail=f"Unknown operation: {e}")
    except Exception:
        logger.exception("Unhandled error in dhcpv6_relay_batch_configure")
        raise HTTPException(status_code=500, detail="Internal server error")


# ============================================================================
# Config Parsers
# ============================================================================


def _parse_listen_interfaces(raw) -> List[DHCPv6ListenInterface]:
    """Parse listen-interface tagged node into a list of DHCPv6ListenInterface."""
    if not raw or not isinstance(raw, dict):
        return []
    result = []
    for iface, iface_data in sorted(raw.items()):
        address = None
        if isinstance(iface_data, dict):
            addr_raw = iface_data.get("address")
            if addr_raw is not None:
                address = str(addr_raw)
        result.append(DHCPv6ListenInterface(interface=iface, address=address))
    return result


def _parse_upstream_interfaces(raw) -> List[DHCPv6UpstreamInterface]:
    """Parse upstream-interface tagged node into a list of DHCPv6UpstreamInterface."""
    if not raw or not isinstance(raw, dict):
        return []
    result = []
    for iface, iface_data in sorted(raw.items()):
        addresses: List[str] = []
        if isinstance(iface_data, dict):
            addr_raw = iface_data.get("address")
            if addr_raw is None:
                addresses = []
            elif isinstance(addr_raw, list):
                addresses = sorted(str(a) for a in addr_raw)
            elif isinstance(addr_raw, dict):
                addresses = sorted(addr_raw.keys())
            else:
                addresses = [str(addr_raw)]
        result.append(DHCPv6UpstreamInterface(interface=iface, addresses=addresses))
    return result
