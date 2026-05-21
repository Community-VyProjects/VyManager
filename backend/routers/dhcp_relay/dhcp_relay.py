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
from vyos_builders.dhcp_relay import DHCPRelayBatchBuilder
from fastapi_permissions import require_read_permission, require_write_permission
from rbac_permissions import FeatureGroup
import inspect
import logging

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
        full_config = await run_in_threadpool(service.get_full_config, refresh=refresh)

        relay_raw = full_config.get("service", {}).get("dhcp-relay", {})
        if not relay_raw:
            return DHCPRelayConfig()

        return DHCPRelayConfig(
            disabled="disable" in relay_raw,
            interfaces=_parse_multi(relay_raw.get("interface")),
            listen_interfaces=_parse_multi(relay_raw.get("listen-interface")),
            upstream_interfaces=_parse_multi(relay_raw.get("upstream-interface")),
            servers=_parse_multi(relay_raw.get("server")),
            relay_options=_parse_relay_options(relay_raw.get("relay-options", {})),
        )
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


# ============================================================================
# Config Parsers
# ============================================================================


def _parse_multi(value) -> List[str]:
    """Normalize a VyOS multi-value node to a sorted list of strings."""
    if value is None:
        return []
    if isinstance(value, list):
        return sorted(str(v) for v in value)
    if isinstance(value, dict):
        return sorted(value.keys())
    return [str(value)]


def _parse_relay_options(opts: dict) -> DHCPRelayOptions:
    """Parse relay-options sub-tree."""
    if not opts:
        return DHCPRelayOptions()

    hop_count = None
    raw_hop = opts.get("hop-count")
    if raw_hop is not None:
        try:
            hop_count = int(raw_hop)
        except (ValueError, TypeError):
            logger.debug("Non-integer hop-count value %r; ignoring", raw_hop)

    max_size = None
    raw_max = opts.get("max-size")
    if raw_max is not None:
        try:
            max_size = int(raw_max)
        except (ValueError, TypeError):
            logger.debug("Non-integer max-size value %r; ignoring", raw_max)

    return DHCPRelayOptions(
        hop_count=hop_count,
        max_size=max_size,
        relay_agents_packets=opts.get("relay-agents-packets"),
    )
