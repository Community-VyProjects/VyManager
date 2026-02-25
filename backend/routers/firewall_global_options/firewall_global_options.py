"""
Firewall Global Options Router

API endpoints for managing VyOS firewall global-options configuration.
Supports version-aware configuration for VyOS 1.4 and 1.5.
"""

from fastapi import APIRouter, HTTPException, Request
from starlette.concurrency import run_in_threadpool
from pydantic import BaseModel, Field
from typing import List, Dict, Optional, Any
from session_vyos_service import get_session_vyos_service
from vyos_builders import FirewallGlobalOptionsBatchBuilder
from fastapi_permissions import require_read_permission, require_write_permission
from rbac_permissions import FeatureGroup
import inspect
import logging
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/vyos/firewall/global-options", tags=["firewall-global-options"])


# Stub functions for backwards compatibility with app.py
def set_device_registry(registry):
    """Legacy function - no longer used."""
    pass


def set_configured_device_name(name):
    """Legacy function - no longer used."""
    pass


# ============================================================================
# Pydantic Models
# ============================================================================


class StatePolicy(BaseModel):
    """State policy configuration"""
    action: Optional[str] = None  # accept, drop, reject
    log: bool = False
    log_level: Optional[str] = None  # emerg, alert, crit, err, warn, notice, info, debug


class TimeoutSettings(BaseModel):
    """Timeout settings (VyOS 1.5+)"""
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


class BridgedTraffic(BaseModel):
    """Bridged traffic settings (VyOS 1.5+)"""
    ipv4: bool = False
    ipv6: bool = False


class FirewallGlobalOptionsConfig(BaseModel):
    """Complete firewall global-options configuration"""
    # Basic options
    all_ping: Optional[str] = None  # enable, disable
    broadcast_ping: Optional[str] = None  # enable, disable

    # Source routing
    ip_src_route: Optional[str] = None  # enable, disable
    ipv6_src_route: Optional[str] = None  # enable, disable

    # ICMP redirects
    receive_redirects: Optional[str] = None  # enable, disable
    ipv6_receive_redirects: Optional[str] = None  # enable, disable
    send_redirects: Optional[str] = None  # enable, disable

    # Security options
    log_martians: Optional[str] = None  # enable, disable
    source_validation: Optional[str] = None  # strict, loose, disable
    syn_cookies: Optional[str] = None  # enable, disable
    twa_hazards_protection: Optional[str] = None  # enable, disable

    # State policies
    state_policy_established: Optional[StatePolicy] = None
    state_policy_invalid: Optional[StatePolicy] = None
    state_policy_related: Optional[StatePolicy] = None

    # VyOS 1.5+ features
    bridged_traffic: Optional[BridgedTraffic] = None
    timeouts: Optional[TimeoutSettings] = None


class FirewallGlobalOptionsConfigResponse(BaseModel):
    """Response containing firewall global-options configuration"""
    config: FirewallGlobalOptionsConfig
    has_config: bool = False


class GlobalOptionsBatchOperation(BaseModel):
    """Single operation in a batch request"""
    op: str = Field(..., description="Operation name")
    value: Optional[str] = Field(None, description="Operation value")


class GlobalOptionsBatchRequest(BaseModel):
    """Model for batch configuration"""
    operations: List[GlobalOptionsBatchOperation]


class VyOSResponse(BaseModel):
    """Standard response from VyOS operations"""
    success: bool
    data: Optional[Dict[str, Any]] = None
    error: Optional[str] = None


# ============================================================================
# Endpoint 1: Capabilities
# ============================================================================


@router.get("/capabilities")
async def get_firewall_global_options_capabilities(request: Request):
    """
    Get feature capabilities based on device VyOS version.

    Returns feature flags indicating which operations are supported.
    Allows frontends to conditionally enable/disable features.
    """
    # Check RBAC permission
    await require_read_permission(request, FeatureGroup.FIREWALL_GLOBAL_OPTIONS)

    try:
        service = get_session_vyos_service(request)
        version = service.get_version()
        builder = FirewallGlobalOptionsBatchBuilder(version=version)
        capabilities = builder.get_capabilities()

        # Add instance info
        if hasattr(request.state, "instance") and request.state.instance:
            capabilities["instance_name"] = request.state.instance.get("name")
            capabilities["instance_id"] = request.state.instance.get("id")
        return capabilities
    except Exception as e:
        logger.exception("Unhandled error")
        raise HTTPException(status_code=500, detail="Internal server error")


# ============================================================================
# Endpoint 2: Config (Generalized Data)
# ============================================================================


@router.get("/config", response_model=FirewallGlobalOptionsConfigResponse)
async def get_firewall_global_options_config(http_request: Request, refresh: bool = False):
    """
    Get firewall global-options configuration from VyOS in a generalized format.

    Args:
        refresh: If True, force refresh from VyOS. If False, use cache.

    Returns:
        Generalized configuration data optimized for frontend consumption
    """
    # Check RBAC permission
    await require_read_permission(http_request, FeatureGroup.FIREWALL_GLOBAL_OPTIONS)

    try:
        service = get_session_vyos_service(http_request)
        full_config = await run_in_threadpool(service.get_full_config, refresh=refresh)

        # Navigate to firewall -> global-options
        global_options = full_config.get("firewall", {}).get("global-options", {})

        if not global_options:
            return FirewallGlobalOptionsConfigResponse(
                config=FirewallGlobalOptionsConfig(),
                has_config=False
            )

        # Parse the configuration
        config = parse_global_options(global_options)

        return FirewallGlobalOptionsConfigResponse(
            config=config,
            has_config=True
        )

    except Exception as e:
        logger.exception("Unhandled error")
        raise HTTPException(status_code=500, detail="Internal server error")


def parse_global_options(data: dict) -> FirewallGlobalOptionsConfig:
    """Parse firewall global-options configuration from VyOS format."""

    # Parse state policy
    state_policy = data.get("state-policy", {})
    established = None
    invalid = None
    related = None

    if "established" in state_policy:
        est_data = state_policy["established"]
        established = StatePolicy(
            action=est_data.get("action"),
            log="log" in est_data,
            log_level=est_data.get("log-level")
        )

    if "invalid" in state_policy:
        inv_data = state_policy["invalid"]
        invalid = StatePolicy(
            action=inv_data.get("action"),
            log="log" in inv_data,
            log_level=inv_data.get("log-level")
        )

    if "related" in state_policy:
        rel_data = state_policy["related"]
        related = StatePolicy(
            action=rel_data.get("action"),
            log="log" in rel_data,
            log_level=rel_data.get("log-level")
        )

    # Parse bridged traffic (VyOS 1.5+)
    bridged = None
    if "apply-to-bridged-traffic" in data:
        bt_data = data["apply-to-bridged-traffic"]
        bridged = BridgedTraffic(
            ipv4="ipv4" in bt_data if isinstance(bt_data, dict) else False,
            ipv6="ipv6" in bt_data if isinstance(bt_data, dict) else False
        )

    # Parse timeouts (VyOS 1.5+)
    timeouts = None
    if "timeout" in data:
        timeout_data = data["timeout"]
        tcp_data = timeout_data.get("tcp", {})
        udp_data = timeout_data.get("udp", {})

        timeouts = TimeoutSettings(
            icmp=_parse_int(timeout_data.get("icmp")),
            other=_parse_int(timeout_data.get("other")),
            tcp_close=_parse_int(tcp_data.get("close")),
            tcp_close_wait=_parse_int(tcp_data.get("close-wait")),
            tcp_established=_parse_int(tcp_data.get("established")),
            tcp_fin_wait=_parse_int(tcp_data.get("fin-wait")),
            tcp_last_ack=_parse_int(tcp_data.get("last-ack")),
            tcp_syn_recv=_parse_int(tcp_data.get("syn-recv")),
            tcp_syn_sent=_parse_int(tcp_data.get("syn-sent")),
            tcp_time_wait=_parse_int(tcp_data.get("time-wait")),
            udp_other=_parse_int(udp_data.get("other")),
            udp_stream=_parse_int(udp_data.get("stream"))
        )

    return FirewallGlobalOptionsConfig(
        # Basic options
        all_ping=data.get("all-ping"),
        broadcast_ping=data.get("broadcast-ping"),

        # Source routing
        ip_src_route=data.get("ip-src-route"),
        ipv6_src_route=data.get("ipv6-src-route"),

        # ICMP redirects
        receive_redirects=data.get("receive-redirects"),
        ipv6_receive_redirects=data.get("ipv6-receive-redirects"),
        send_redirects=data.get("send-redirects"),

        # Security options
        log_martians=data.get("log-martians"),
        source_validation=data.get("source-validation"),
        syn_cookies=data.get("syn-cookies"),
        twa_hazards_protection=data.get("twa-hazards-protection"),

        # State policies
        state_policy_established=established,
        state_policy_invalid=invalid,
        state_policy_related=related,

        # VyOS 1.5+ features
        bridged_traffic=bridged,
        timeouts=timeouts
    )


def _parse_int(value) -> Optional[int]:
    """Parse a value to int, returning None if not possible."""
    if value is None:
        return None
    try:
        return int(value)
    except (ValueError, TypeError):
        return None


# ============================================================================
# Endpoint 3: Batch Operations
# ============================================================================


@router.post("/batch")
async def firewall_global_options_batch_configure(http_request: Request, body: GlobalOptionsBatchRequest):
    """
    Execute a batch of configuration operations.

    Allows multiple changes in a single VyOS commit for efficiency.
    """
    # Check RBAC permission - require WRITE for modifications
    await require_write_permission(http_request, FeatureGroup.FIREWALL_GLOBAL_OPTIONS)

    try:
        service = get_session_vyos_service(http_request)
        version = service.get_version()
        builder = FirewallGlobalOptionsBatchBuilder(version=version)

        # Process operations using inspect for dynamic method calls
        for operation in body.operations:
            method = getattr(builder, operation.op, None)
            if method is None:
                raise HTTPException(
                    status_code=400,
                    detail=f"Unknown operation: {operation.op}"
                )

            sig = inspect.signature(method)
            params = list(sig.parameters.keys())

            # Build arguments dynamically
            args = []

            # Add operation value if provided and method accepts it
            if operation.value and len(params) > 0:
                # Check if we need to convert to int for timeout operations
                if "timeout" in operation.op and operation.value.isdigit():
                    args.append(int(operation.value))
                else:
                    args.append(operation.value)

            method(*args)

        # Execute batch
        response = service.execute_batch(builder)

        return VyOSResponse(
            success=response.status == 200,
            data={"message": "Configuration updated"},
            error=response.error if response.error else None
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Unhandled error")
        raise HTTPException(status_code=500, detail="Internal server error")


# ============================================================================
# Convenience Endpoints
# ============================================================================


@router.post("/update")
async def update_firewall_global_options(http_request: Request, config: FirewallGlobalOptionsConfig):
    """
    Update firewall global-options with the provided configuration.

    This is a convenience endpoint that handles the conversion of
    the configuration model to batch operations.
    """
    # Check RBAC permission
    await require_write_permission(http_request, FeatureGroup.FIREWALL_GLOBAL_OPTIONS)

    try:
        service = get_session_vyos_service(http_request)
        version = service.get_version()
        builder = FirewallGlobalOptionsBatchBuilder(version=version)

        # Get current config to determine what needs to be deleted
        full_config = await run_in_threadpool(service.get_full_config, refresh=True)
        current = full_config.get("firewall", {}).get("global-options", {})

        # Build operations based on config
        _build_basic_options(builder, config, current)
        _build_source_routing_options(builder, config, current)
        _build_redirect_options(builder, config, current)
        _build_security_options(builder, config, current)
        _build_state_policy_options(builder, config, current)
        _build_bridged_traffic_options(builder, config, current)
        _build_timeout_options(builder, config, current)

        if builder.is_empty():
            return VyOSResponse(
                success=True,
                data={"message": "No changes to apply"}
            )

        # Execute batch
        response = service.execute_batch(builder)

        return VyOSResponse(
            success=response.status == 200,
            data={"message": "Configuration updated"},
            error=response.error if response.error else None
        )
    except Exception as e:
        logger.exception("Unhandled error")
        raise HTTPException(status_code=500, detail="Internal server error")


def _build_basic_options(builder: FirewallGlobalOptionsBatchBuilder, config: FirewallGlobalOptionsConfig, current: dict):
    """Build operations for basic options."""
    if config.all_ping is not None:
        if config.all_ping:
            builder.set_all_ping(config.all_ping)
        elif "all-ping" in current:
            builder.delete_all_ping()

    if config.broadcast_ping is not None:
        if config.broadcast_ping:
            builder.set_broadcast_ping(config.broadcast_ping)
        elif "broadcast-ping" in current:
            builder.delete_broadcast_ping()


def _build_source_routing_options(builder: FirewallGlobalOptionsBatchBuilder, config: FirewallGlobalOptionsConfig, current: dict):
    """Build operations for source routing options."""
    if config.ip_src_route is not None:
        if config.ip_src_route:
            builder.set_ip_src_route(config.ip_src_route)
        elif "ip-src-route" in current:
            builder.delete_ip_src_route()

    if config.ipv6_src_route is not None:
        if config.ipv6_src_route:
            builder.set_ipv6_src_route(config.ipv6_src_route)
        elif "ipv6-src-route" in current:
            builder.delete_ipv6_src_route()


def _build_redirect_options(builder: FirewallGlobalOptionsBatchBuilder, config: FirewallGlobalOptionsConfig, current: dict):
    """Build operations for ICMP redirect options."""
    if config.receive_redirects is not None:
        if config.receive_redirects:
            builder.set_receive_redirects(config.receive_redirects)
        elif "receive-redirects" in current:
            builder.delete_receive_redirects()

    if config.ipv6_receive_redirects is not None:
        if config.ipv6_receive_redirects:
            builder.set_ipv6_receive_redirects(config.ipv6_receive_redirects)
        elif "ipv6-receive-redirects" in current:
            builder.delete_ipv6_receive_redirects()

    if config.send_redirects is not None:
        if config.send_redirects:
            builder.set_send_redirects(config.send_redirects)
        elif "send-redirects" in current:
            builder.delete_send_redirects()


def _build_security_options(builder: FirewallGlobalOptionsBatchBuilder, config: FirewallGlobalOptionsConfig, current: dict):
    """Build operations for security options."""
    if config.log_martians is not None:
        if config.log_martians:
            builder.set_log_martians(config.log_martians)
        elif "log-martians" in current:
            builder.delete_log_martians()

    if config.source_validation is not None:
        if config.source_validation:
            builder.set_source_validation(config.source_validation)
        elif "source-validation" in current:
            builder.delete_source_validation()

    if config.syn_cookies is not None:
        if config.syn_cookies:
            builder.set_syn_cookies(config.syn_cookies)
        elif "syn-cookies" in current:
            builder.delete_syn_cookies()

    if config.twa_hazards_protection is not None:
        if config.twa_hazards_protection:
            builder.set_twa_hazards_protection(config.twa_hazards_protection)
        elif "twa-hazards-protection" in current:
            builder.delete_twa_hazards_protection()


def _build_state_policy_options(builder: FirewallGlobalOptionsBatchBuilder, config: FirewallGlobalOptionsConfig, current: dict):
    """Build operations for state policy options."""
    current_state_policy = current.get("state-policy", {})

    # Established
    if config.state_policy_established is not None:
        sp = config.state_policy_established
        if sp.action:
            builder.set_state_policy_established_action(sp.action)
        elif "established" in current_state_policy and "action" in current_state_policy.get("established", {}):
            builder.delete_state_policy_established_action()

        if sp.log:
            builder.set_state_policy_established_log()
        elif "established" in current_state_policy and "log" in current_state_policy.get("established", {}):
            builder.delete_state_policy_established_log()

        if sp.log_level:
            builder.set_state_policy_established_log_level(sp.log_level)
        elif "established" in current_state_policy and "log-level" in current_state_policy.get("established", {}):
            builder.delete_state_policy_established_log_level()

    # Invalid
    if config.state_policy_invalid is not None:
        sp = config.state_policy_invalid
        if sp.action:
            builder.set_state_policy_invalid_action(sp.action)
        elif "invalid" in current_state_policy and "action" in current_state_policy.get("invalid", {}):
            builder.delete_state_policy_invalid_action()

        if sp.log:
            builder.set_state_policy_invalid_log()
        elif "invalid" in current_state_policy and "log" in current_state_policy.get("invalid", {}):
            builder.delete_state_policy_invalid_log()

        if sp.log_level:
            builder.set_state_policy_invalid_log_level(sp.log_level)
        elif "invalid" in current_state_policy and "log-level" in current_state_policy.get("invalid", {}):
            builder.delete_state_policy_invalid_log_level()

    # Related
    if config.state_policy_related is not None:
        sp = config.state_policy_related
        if sp.action:
            builder.set_state_policy_related_action(sp.action)
        elif "related" in current_state_policy and "action" in current_state_policy.get("related", {}):
            builder.delete_state_policy_related_action()

        if sp.log:
            builder.set_state_policy_related_log()
        elif "related" in current_state_policy and "log" in current_state_policy.get("related", {}):
            builder.delete_state_policy_related_log()

        if sp.log_level:
            builder.set_state_policy_related_log_level(sp.log_level)
        elif "related" in current_state_policy and "log-level" in current_state_policy.get("related", {}):
            builder.delete_state_policy_related_log_level()


def _build_bridged_traffic_options(builder: FirewallGlobalOptionsBatchBuilder, config: FirewallGlobalOptionsConfig, current: dict):
    """Build operations for bridged traffic options (VyOS 1.5+)."""
    if config.bridged_traffic is not None:
        current_bridged = current.get("apply-to-bridged-traffic", {})

        if config.bridged_traffic.ipv4:
            builder.set_apply_to_bridged_traffic_ipv4()
        elif isinstance(current_bridged, dict) and "ipv4" in current_bridged:
            builder.delete_apply_to_bridged_traffic_ipv4()

        if config.bridged_traffic.ipv6:
            builder.set_apply_to_bridged_traffic_ipv6()
        elif isinstance(current_bridged, dict) and "ipv6" in current_bridged:
            builder.delete_apply_to_bridged_traffic_ipv6()


def _build_timeout_options(builder: FirewallGlobalOptionsBatchBuilder, config: FirewallGlobalOptionsConfig, current: dict):
    """Build operations for timeout options (VyOS 1.5+)."""
    if config.timeouts is None:
        return

    t = config.timeouts
    current_timeout = current.get("timeout", {})
    current_tcp = current_timeout.get("tcp", {})
    current_udp = current_timeout.get("udp", {})

    # ICMP timeout
    if t.icmp is not None:
        builder.set_timeout_icmp(t.icmp)
    elif "icmp" in current_timeout:
        builder.delete_timeout_icmp()

    # Other timeout
    if t.other is not None:
        builder.set_timeout_other(t.other)
    elif "other" in current_timeout:
        builder.delete_timeout_other()

    # TCP timeouts
    if t.tcp_close is not None:
        builder.set_timeout_tcp_close(t.tcp_close)
    elif "close" in current_tcp:
        builder.delete_timeout_tcp_close()

    if t.tcp_close_wait is not None:
        builder.set_timeout_tcp_close_wait(t.tcp_close_wait)
    elif "close-wait" in current_tcp:
        builder.delete_timeout_tcp_close_wait()

    if t.tcp_established is not None:
        builder.set_timeout_tcp_established(t.tcp_established)
    elif "established" in current_tcp:
        builder.delete_timeout_tcp_established()

    if t.tcp_fin_wait is not None:
        builder.set_timeout_tcp_fin_wait(t.tcp_fin_wait)
    elif "fin-wait" in current_tcp:
        builder.delete_timeout_tcp_fin_wait()

    if t.tcp_last_ack is not None:
        builder.set_timeout_tcp_last_ack(t.tcp_last_ack)
    elif "last-ack" in current_tcp:
        builder.delete_timeout_tcp_last_ack()

    if t.tcp_syn_recv is not None:
        builder.set_timeout_tcp_syn_recv(t.tcp_syn_recv)
    elif "syn-recv" in current_tcp:
        builder.delete_timeout_tcp_syn_recv()

    if t.tcp_syn_sent is not None:
        builder.set_timeout_tcp_syn_sent(t.tcp_syn_sent)
    elif "syn-sent" in current_tcp:
        builder.delete_timeout_tcp_syn_sent()

    if t.tcp_time_wait is not None:
        builder.set_timeout_tcp_time_wait(t.tcp_time_wait)
    elif "time-wait" in current_tcp:
        builder.delete_timeout_tcp_time_wait()

    # UDP timeouts
    if t.udp_other is not None:
        builder.set_timeout_udp_other(t.udp_other)
    elif "other" in current_udp:
        builder.delete_timeout_udp_other()

    if t.udp_stream is not None:
        builder.set_timeout_udp_stream(t.udp_stream)
    elif "stream" in current_udp:
        builder.delete_timeout_udp_stream()
