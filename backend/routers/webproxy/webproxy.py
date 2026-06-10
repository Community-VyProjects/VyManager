"""
Web Proxy (Squid) Router

API endpoints for managing the VyOS webproxy service (service webproxy).

Three endpoints:
  GET  /vyos/webproxy/capabilities  — version-aware feature flags + option lists
  GET  /vyos/webproxy/config        — normalized webproxy configuration
  POST /vyos/webproxy/batch         — atomic set/delete operations

The webproxy CLI is identical on VyOS 1.4 and 1.5.
"""

from fastapi import APIRouter, HTTPException, Request
from starlette.concurrency import run_in_threadpool
from pydantic import BaseModel, Field
from typing import List, Dict, Optional, Any
from session_vyos_service import get_session_vyos_service
from vyos_builders.webproxy import WebProxyBatchBuilder
from fastapi_permissions import require_read_permission, require_write_permission
from rbac_permissions import FeatureGroup
import inspect
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/vyos/webproxy", tags=["webproxy"])


# ============================================================================
# Pydantic Models
# ============================================================================


class WebProxyLdap(BaseModel):
    server: Optional[str] = None
    base_dn: Optional[str] = None
    bind_dn: Optional[str] = None
    filter_expression: Optional[str] = None
    password: Optional[str] = None
    username_attribute: Optional[str] = None
    port: Optional[int] = None
    version: Optional[str] = None
    persistent_connection: bool = False
    use_ssl: bool = False


class WebProxyAuthentication(BaseModel):
    children: Optional[int] = None
    credentials_ttl: Optional[int] = None
    method: Optional[str] = None
    realm: Optional[str] = None
    ldap: WebProxyLdap = Field(default_factory=WebProxyLdap)


class CachePeer(BaseModel):
    name: str
    address: Optional[str] = None
    http_port: Optional[int] = None
    icp_port: Optional[int] = None
    options: Optional[str] = None
    type: Optional[str] = None


class ListenAddress(BaseModel):
    address: str
    port: Optional[int] = None
    disable_transparent: bool = False


class SquidGuardRule(BaseModel):
    number: str
    allow_categories: List[str] = []
    block_categories: List[str] = []
    log: List[str] = []
    local_block: List[str] = []
    local_block_keyword: List[str] = []
    local_block_url: List[str] = []
    local_ok: List[str] = []
    local_ok_url: List[str] = []
    allow_ipaddr_url: bool = False
    enable_safe_search: bool = False
    default_action: Optional[str] = None
    redirect_url: Optional[str] = None
    source_group: Optional[str] = None
    time_period: Optional[str] = None


class SquidGuardSourceGroup(BaseModel):
    name: str
    address: List[str] = []
    domain: List[str] = []
    ldap_ip_search: List[str] = []
    ldap_user_search: List[str] = []
    description: Optional[str] = None
    user: Optional[str] = None


class TimePeriodDay(BaseModel):
    day: str
    time: Optional[str] = None


class SquidGuardTimePeriod(BaseModel):
    name: str
    description: Optional[str] = None
    days: List[TimePeriodDay] = []


class SquidGuard(BaseModel):
    allow_categories: List[str] = []
    block_categories: List[str] = []
    log: List[str] = []
    local_block: List[str] = []
    local_block_keyword: List[str] = []
    local_block_url: List[str] = []
    local_ok: List[str] = []
    local_ok_url: List[str] = []
    allow_ipaddr_url: bool = False
    enable_safe_search: bool = False
    default_action: Optional[str] = None
    redirect_url: Optional[str] = None
    auto_update_hour: Optional[int] = None
    rules: List[SquidGuardRule] = []
    source_groups: List[SquidGuardSourceGroup] = []
    time_periods: List[SquidGuardTimePeriod] = []


class UrlFiltering(BaseModel):
    disable: bool = False
    squidguard: SquidGuard = Field(default_factory=SquidGuard)


class WebProxyConfig(BaseModel):
    append_domain: Optional[str] = None
    cache_size: Optional[int] = None
    default_port: Optional[int] = None
    maximum_object_size: Optional[int] = None
    mem_cache_size: Optional[int] = None
    minimum_object_size: Optional[int] = None
    outgoing_address: Optional[str] = None
    reply_body_max_size: Optional[int] = None
    disable_access_log: bool = False
    domain_block: List[str] = []
    domain_noncache: List[str] = []
    reply_block_mime: List[str] = []
    safe_ports: List[str] = []
    ssl_safe_ports: List[str] = []
    authentication: WebProxyAuthentication = Field(default_factory=WebProxyAuthentication)
    cache_peers: List[CachePeer] = []
    listen_addresses: List[ListenAddress] = []
    url_filtering: UrlFiltering = Field(default_factory=UrlFiltering)


class WebProxyBatchOperation(BaseModel):
    op: str = Field(..., description="Builder method name")
    value: Optional[str] = Field(
        None,
        description=(
            "Argument(s) for the operation. "
            "Single-arg methods: plain string. "
            "Multi-arg methods: comma-separated."
        ),
    )


class WebProxyBatchRequest(BaseModel):
    operations: List[WebProxyBatchOperation]


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
async def get_webproxy_capabilities(request: Request):
    """Return webproxy feature capabilities based on the VyOS version."""
    await require_read_permission(request, FeatureGroup.WEBPROXY)
    try:
        service = get_session_vyos_service(request)
        builder = WebProxyBatchBuilder(version=service.get_version())
        caps = builder.get_capabilities()
        if hasattr(request.state, "instance") and request.state.instance:
            caps["instance_name"] = request.state.instance.get("name")
            caps["instance_id"] = request.state.instance.get("id")
        return caps
    except Exception:
        logger.exception("Unhandled error in get_webproxy_capabilities")
        raise HTTPException(status_code=500, detail="Internal server error")


# ============================================================================
# Endpoint 2: Config
# ============================================================================


@router.get("/config", response_model=WebProxyConfig)
async def get_webproxy_config(http_request: Request, refresh: bool = False):
    """Return the full webproxy configuration in a normalized format."""
    await require_read_permission(http_request, FeatureGroup.WEBPROXY)
    try:
        service = get_session_vyos_service(http_request)
        full_config = await run_in_threadpool(service.get_full_config, refresh=refresh)

        wp = full_config.get("service", {}).get("webproxy", {})
        if not wp:
            return WebProxyConfig()

        return WebProxyConfig(
            append_domain=_parse_scalar(wp.get("append-domain")),
            cache_size=_parse_int(wp.get("cache-size")),
            default_port=_parse_int(wp.get("default-port")),
            maximum_object_size=_parse_int(wp.get("maximum-object-size")),
            mem_cache_size=_parse_int(wp.get("mem-cache-size")),
            minimum_object_size=_parse_int(wp.get("minimum-object-size")),
            outgoing_address=_parse_scalar(wp.get("outgoing-address")),
            reply_body_max_size=_parse_int(wp.get("reply-body-max-size")),
            disable_access_log="disable-access-log" in wp,
            domain_block=_parse_multi(wp.get("domain-block")),
            domain_noncache=_parse_multi(wp.get("domain-noncache")),
            reply_block_mime=_parse_multi(wp.get("reply-block-mime")),
            safe_ports=_parse_multi(wp.get("safe-ports")),
            ssl_safe_ports=_parse_multi(wp.get("ssl-safe-ports")),
            authentication=_parse_authentication(wp.get("authentication", {})),
            cache_peers=_parse_cache_peers(wp.get("cache-peer", {})),
            listen_addresses=_parse_listen_addresses(wp.get("listen-address", {})),
            url_filtering=_parse_url_filtering(wp.get("url-filtering", {})),
        )
    except Exception:
        logger.exception("Unhandled error in get_webproxy_config")
        raise HTTPException(status_code=500, detail="Internal server error")


# ============================================================================
# Endpoint 3: Batch Operations
# ============================================================================


@router.post("/batch", response_model=VyOSResponse)
async def webproxy_batch_configure(http_request: Request, body: WebProxyBatchRequest):
    """Execute a batch of webproxy configuration operations atomically."""
    await require_write_permission(http_request, FeatureGroup.WEBPROXY)
    try:
        service = get_session_vyos_service(http_request)
        builder = WebProxyBatchBuilder(version=service.get_version())

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
            data={"message": "Web proxy configuration updated"},
            error=response.error if response.error else None,
        )
    except HTTPException:
        raise
    except AttributeError as e:
        raise HTTPException(status_code=400, detail=f"Unknown operation: {e}")
    except Exception:
        logger.exception("Unhandled error in webproxy_batch_configure")
        raise HTTPException(status_code=500, detail="Internal server error")


# ============================================================================
# Config parsers
# ============================================================================


def _parse_multi(value) -> List[str]:
    if value is None:
        return []
    if isinstance(value, list):
        return sorted(str(v) for v in value)
    if isinstance(value, dict):
        return sorted(value.keys())
    return [str(value)]


def _parse_int(value) -> Optional[int]:
    if isinstance(value, list):
        value = value[0] if value else None
    if value is None:
        return None
    try:
        return int(value)
    except (ValueError, TypeError):
        return None


def _parse_scalar(value) -> Optional[str]:
    if value is None:
        return None
    if isinstance(value, list):
        return str(value[0]) if value else None
    return str(value)


def _parse_authentication(raw: dict) -> WebProxyAuthentication:
    if not isinstance(raw, dict) or not raw:
        return WebProxyAuthentication()
    ldap_raw = raw.get("ldap", {}) if isinstance(raw.get("ldap"), dict) else {}
    return WebProxyAuthentication(
        children=_parse_int(raw.get("children")),
        credentials_ttl=_parse_int(raw.get("credentials-ttl")),
        method=_parse_scalar(raw.get("method")),
        realm=_parse_scalar(raw.get("realm")),
        ldap=WebProxyLdap(
            server=_parse_scalar(ldap_raw.get("server")),
            base_dn=_parse_scalar(ldap_raw.get("base-dn")),
            bind_dn=_parse_scalar(ldap_raw.get("bind-dn")),
            filter_expression=_parse_scalar(ldap_raw.get("filter-expression")),
            password=_parse_scalar(ldap_raw.get("password")),
            username_attribute=_parse_scalar(ldap_raw.get("username-attribute")),
            port=_parse_int(ldap_raw.get("port")),
            version=_parse_scalar(ldap_raw.get("version")),
            persistent_connection="persistent-connection" in ldap_raw,
            use_ssl="use-ssl" in ldap_raw,
        ),
    )


def _parse_cache_peers(raw: dict) -> List[CachePeer]:
    if not isinstance(raw, dict):
        return []
    peers = []
    for name, attrs in sorted(raw.items()):
        if not isinstance(attrs, dict):
            attrs = {}
        peers.append(CachePeer(
            name=name,
            address=_parse_scalar(attrs.get("address")),
            http_port=_parse_int(attrs.get("http-port")),
            icp_port=_parse_int(attrs.get("icp-port")),
            options=_parse_scalar(attrs.get("options")),
            type=_parse_scalar(attrs.get("type")),
        ))
    return peers


def _parse_listen_addresses(raw: dict) -> List[ListenAddress]:
    if not isinstance(raw, dict):
        return []
    addresses = []
    for addr, attrs in sorted(raw.items()):
        if not isinstance(attrs, dict):
            attrs = {}
        addresses.append(ListenAddress(
            address=addr,
            port=_parse_int(attrs.get("port")),
            disable_transparent="disable-transparent" in attrs,
        ))
    return addresses


def _parse_url_filtering(raw: dict) -> UrlFiltering:
    if not isinstance(raw, dict) or not raw:
        return UrlFiltering()
    return UrlFiltering(
        disable="disable" in raw,
        squidguard=_parse_squidguard(raw.get("squidguard", {})),
    )


def _parse_squidguard(raw: dict) -> SquidGuard:
    if not isinstance(raw, dict) or not raw:
        return SquidGuard()
    auto_update = raw.get("auto-update", {})
    auto_update_hour = None
    if isinstance(auto_update, dict):
        auto_update_hour = _parse_int(auto_update.get("update-hour"))
    return SquidGuard(
        allow_categories=_parse_multi(raw.get("allow-category")),
        block_categories=_parse_multi(raw.get("block-category")),
        log=_parse_multi(raw.get("log")),
        local_block=_parse_multi(raw.get("local-block")),
        local_block_keyword=_parse_multi(raw.get("local-block-keyword")),
        local_block_url=_parse_multi(raw.get("local-block-url")),
        local_ok=_parse_multi(raw.get("local-ok")),
        local_ok_url=_parse_multi(raw.get("local-ok-url")),
        allow_ipaddr_url="allow-ipaddr-url" in raw,
        enable_safe_search="enable-safe-search" in raw,
        default_action=_parse_scalar(raw.get("default-action")),
        redirect_url=_parse_scalar(raw.get("redirect-url")),
        auto_update_hour=auto_update_hour,
        rules=_parse_squidguard_rules(raw.get("rule", {})),
        source_groups=_parse_source_groups(raw.get("source-group", {})),
        time_periods=_parse_time_periods(raw.get("time-period", {})),
    )


def _parse_squidguard_rules(raw: dict) -> List[SquidGuardRule]:
    if not isinstance(raw, dict):
        return []
    rules = []
    for number, attrs in sorted(raw.items(), key=lambda kv: _parse_int(kv[0]) or 0):
        if not isinstance(attrs, dict):
            attrs = {}
        rules.append(SquidGuardRule(
            number=str(number),
            allow_categories=_parse_multi(attrs.get("allow-category")),
            block_categories=_parse_multi(attrs.get("block-category")),
            log=_parse_multi(attrs.get("log")),
            local_block=_parse_multi(attrs.get("local-block")),
            local_block_keyword=_parse_multi(attrs.get("local-block-keyword")),
            local_block_url=_parse_multi(attrs.get("local-block-url")),
            local_ok=_parse_multi(attrs.get("local-ok")),
            local_ok_url=_parse_multi(attrs.get("local-ok-url")),
            allow_ipaddr_url="allow-ipaddr-url" in attrs,
            enable_safe_search="enable-safe-search" in attrs,
            default_action=_parse_scalar(attrs.get("default-action")),
            redirect_url=_parse_scalar(attrs.get("redirect-url")),
            source_group=_parse_scalar(attrs.get("source-group")),
            time_period=_parse_scalar(attrs.get("time-period")),
        ))
    return rules


def _parse_source_groups(raw: dict) -> List[SquidGuardSourceGroup]:
    if not isinstance(raw, dict):
        return []
    groups = []
    for name, attrs in sorted(raw.items()):
        if not isinstance(attrs, dict):
            attrs = {}
        groups.append(SquidGuardSourceGroup(
            name=name,
            address=_parse_multi(attrs.get("address")),
            domain=_parse_multi(attrs.get("domain")),
            ldap_ip_search=_parse_multi(attrs.get("ldap-ip-search")),
            ldap_user_search=_parse_multi(attrs.get("ldap-user-search")),
            description=_parse_scalar(attrs.get("description")),
            user=_parse_scalar(attrs.get("user")),
        ))
    return groups


def _parse_time_periods(raw: dict) -> List[SquidGuardTimePeriod]:
    if not isinstance(raw, dict):
        return []
    periods = []
    for name, attrs in sorted(raw.items()):
        if not isinstance(attrs, dict):
            attrs = {}
        days_raw = attrs.get("days", {})
        days = []
        if isinstance(days_raw, dict):
            for day, day_attrs in sorted(days_raw.items()):
                time_val = None
                if isinstance(day_attrs, dict):
                    time_val = _parse_scalar(day_attrs.get("time"))
                days.append(TimePeriodDay(day=day, time=time_val))
        periods.append(SquidGuardTimePeriod(
            name=name,
            description=_parse_scalar(attrs.get("description")),
            days=days,
        ))
    return periods
