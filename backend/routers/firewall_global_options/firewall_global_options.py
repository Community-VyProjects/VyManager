"""
Firewall Global Options Router

API endpoints for managing VyOS firewall global-options configuration. The
mapper decides which nodes this VyOS version has; capabilities report them.
"""

import logging
from typing import Any, Dict, List, Optional, cast

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field
from starlette.concurrency import run_in_threadpool

from batch_dispatch import call_comma_batch_op
from fastapi_permissions import require_read_permission, require_write_permission
from rbac_permissions import FeatureGroup
from session_vyos_service import get_session_vyos_service
from vyos_builders.firewall_global_options import FirewallGlobalOptionsBatchBuilder
from vyos_mappers.base import CommandMapperRegistry
from vyos_mappers.firewall_global_options.firewall_global_options import FirewallGlobalOptionsMapper

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/vyos/firewall/global-options", tags=["firewall-global-options"])


# ============================================================================
# Pydantic Models
# ============================================================================


class StatePolicyState(BaseModel):
    """One of state-policy established / invalid / related."""
    action: Optional[str] = None
    log: bool = False
    log_level: Optional[str] = None


class StatePolicy(BaseModel):
    """state-policy; offload_target exists only on 1.5."""
    established: StatePolicyState = StatePolicyState()
    invalid: StatePolicyState = StatePolicyState()
    related: StatePolicyState = StatePolicyState()
    offload_target: Optional[str] = None


class BridgedTraffic(BaseModel):
    """apply-to-bridged-traffic (1.5)."""
    ipv4: bool = False
    ipv6: bool = False
    accept_invalid_ethernet_types: List[str] = []


class GeoIP(BaseModel):
    """geoip (1.5). The license key is returned masked."""
    provider: Optional[str] = None
    maxmind_account_id: Optional[str] = None
    maxmind_license_key: Optional[str] = None
    maxmind_lite: bool = False
    source_address: Optional[str] = None
    vrf: Optional[str] = None


class TimeoutSettings(BaseModel):
    """timeout (1.5), in seconds."""
    icmp: Optional[int] = None
    other: Optional[int] = None
    tcp_close: Optional[int] = None
    tcp_close_wait: Optional[int] = None
    tcp_established: Optional[int] = None
    tcp_fin_wait: Optional[int] = None
    tcp_last_ack: Optional[int] = None
    tcp_syn_recv: Optional[int] = None
    tcp_syn_sent: Optional[int] = None
    tcp_time_wait: Optional[int] = None
    udp_other: Optional[int] = None
    udp_stream: Optional[int] = None


class FirewallGlobalOptionsConfig(BaseModel):
    """Complete firewall global-options configuration."""
    configured: bool = False
    all_ping: Optional[str] = None
    broadcast_ping: Optional[str] = None
    directed_broadcast: Optional[str] = None
    ip_src_route: Optional[str] = None
    ipv6_src_route: Optional[str] = None
    receive_redirects: Optional[str] = None
    ipv6_receive_redirects: Optional[str] = None
    send_redirects: Optional[str] = None
    log_martians: Optional[str] = None
    source_validation: Optional[str] = None
    ipv6_source_validation: Optional[str] = None
    syn_cookies: Optional[str] = None
    twa_hazards_protection: Optional[str] = None
    resolver_cache: bool = False
    resolver_interval: Optional[int] = None
    state_policy: StatePolicy = StatePolicy()
    bridged_traffic: BridgedTraffic = BridgedTraffic()
    geoip: GeoIP = GeoIP()
    timeouts: TimeoutSettings = TimeoutSettings()


class GlobalOptionsBatchOperation(BaseModel):
    """Single operation in a batch request."""
    op: str = Field(..., description="Builder method name")
    value: Optional[str] = Field(None, description="The op's single value, if it takes one")


class GlobalOptionsBatchRequest(BaseModel):
    """Model for batch configuration."""
    operations: List[GlobalOptionsBatchOperation]


class VyOSResponse(BaseModel):
    """Standard response from VyOS operations."""
    success: bool
    data: Optional[Dict[str, Any]] = None
    error: Optional[str] = None


# ============================================================================
# Endpoint 1: Capabilities
# ============================================================================


@router.get("/capabilities")
async def get_firewall_global_options_capabilities(request: Request):
    """Get firewall global-options capabilities based on device VyOS version."""
    await require_read_permission(request, FeatureGroup.FIREWALL_GLOBAL_OPTIONS)

    try:
        service = get_session_vyos_service(request)
        builder = FirewallGlobalOptionsBatchBuilder(version=service.get_version())
        capabilities = builder.get_capabilities()

        if hasattr(request.state, "instance") and request.state.instance:
            capabilities["instance_name"] = request.state.instance.get("name")
            capabilities["instance_id"] = request.state.instance.get("id")
        return capabilities
    except HTTPException:
        raise
    except Exception:
        logger.exception("Unhandled error in firewall global-options capabilities")
        raise HTTPException(status_code=500, detail="Internal server error")


# ============================================================================
# Endpoint 2: Config
# ============================================================================


@router.get("/config", response_model=FirewallGlobalOptionsConfig)
async def get_firewall_global_options_config(http_request: Request, refresh: bool = False):
    """Get firewall global-options configuration in a generalized format."""
    await require_read_permission(http_request, FeatureGroup.FIREWALL_GLOBAL_OPTIONS)

    try:
        service = get_session_vyos_service(http_request)
        full_config = await run_in_threadpool(service.get_full_config, refresh=refresh)
        mapper = cast(
            FirewallGlobalOptionsMapper,
            CommandMapperRegistry.get_mapper("firewall_global_options", service.get_version()),
        )
        return FirewallGlobalOptionsConfig(**mapper.parse_config(full_config))
    except HTTPException:
        raise
    except Exception:
        logger.exception("Unhandled error in firewall global-options config")
        raise HTTPException(status_code=500, detail="Internal server error")


# ============================================================================
# Endpoint 3: Batch Operations
# ============================================================================


@router.post("/batch", response_model=VyOSResponse)
async def firewall_global_options_batch_configure(http_request: Request, body: GlobalOptionsBatchRequest):
    """Execute a batch of firewall global-options operations in one commit."""
    await require_write_permission(http_request, FeatureGroup.FIREWALL_GLOBAL_OPTIONS)

    try:
        service = get_session_vyos_service(http_request)
        builder = FirewallGlobalOptionsBatchBuilder(version=service.get_version())
        try:
            # Every op takes no value or one (test_firewall_global_options_batch_router
            # locks the arity).
            for operation in body.operations:
                call_comma_batch_op(builder, operation.op, operation.value)
        except ValueError as exc:
            # The mapper raises ValueError for a node this VyOS version lacks.
            raise HTTPException(status_code=400, detail=str(exc))

        response = await run_in_threadpool(service.execute_batch, builder)
        return VyOSResponse(
            success=response.status == 200,
            data={"message": "Firewall global options updated"} if response.status == 200 else None,
            error=response.error if response.error else None,
        )
    except HTTPException:
        raise
    except Exception:
        logger.exception("Unhandled error in firewall global-options batch")
        raise HTTPException(status_code=500, detail="Internal server error")
