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
from vyos_mappers.base import CommandMapperRegistry
from vyos_builders.webproxy import WebProxyBatchBuilder
from fastapi_permissions import require_read_permission, require_write_permission
from rbac_permissions import FeatureGroup
import inspect
import logging
from batch_dispatch import resolve_batch_method

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
        version = service.get_version()
        full_config = await run_in_threadpool(service.get_full_config, refresh=refresh)
        mapper = CommandMapperRegistry.get_mapper("webproxy", version)
        return WebProxyConfig(**mapper.parse_config(full_config))
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
            method = resolve_batch_method(builder, operation.op)
            count = len(inspect.signature(method).parameters)

            if count == 0:
                method()
                continue
            if not operation.value:
                raise HTTPException(
                    status_code=400,
                    detail=f"Operation {operation.op} requires a value",
                )
            parts = operation.value.split(",", count - 1)
            if len(parts) != count or not all(parts):
                raise HTTPException(
                    status_code=400,
                    detail=f"Operation {operation.op} requires {count} values",
                )
            method(*parts)

        response = await run_in_threadpool(service.execute_batch, builder)
        return VyOSResponse(
            success=response.status == 200,
            data={"message": "Web proxy configuration updated"},
            error=response.error if response.error else None,
        )
    except HTTPException:
        raise
    except Exception:
        logger.exception("Unhandled error in webproxy_batch_configure")
        raise HTTPException(status_code=500, detail="Internal server error")
