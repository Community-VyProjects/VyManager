"""DNS Forwarding Service Router.

API endpoints for managing VyOS DNS forwarding (PowerDNS Recursor) configuration.

Endpoints:
  GET  /vyos/dns-forwarding/capabilities  — version-aware feature flags
  GET  /vyos/dns-forwarding/config        — normalized forwarding configuration
  POST /vyos/dns-forwarding/batch         — atomic set/delete operations
"""

from fastapi import APIRouter, HTTPException, Request
from starlette.concurrency import run_in_threadpool
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from session_vyos_service import get_session_vyos_service
from vyos_builders.dns_forwarding import DNSForwardingBatchBuilder
from fastapi_permissions import require_read_permission, require_write_permission
from rbac_permissions import FeatureGroup
import inspect
import logging
from batch_dispatch import resolve_batch_method
from vyos_mappers.base import CommandMapperRegistry

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/vyos/dns-forwarding", tags=["dns-forwarding"])


# ============================================================================
# Pydantic Models
# ============================================================================


class NameServerEntry(BaseModel):
    ip: str
    port: Optional[int] = None


class DomainForwarder(BaseModel):
    domain: str
    name_servers: List[NameServerEntry] = []
    addnta: bool = False
    recursion_desired: bool = False


class ARecord(BaseModel):
    hostname: str
    address: Optional[str] = None
    ttl: Optional[int] = None
    disabled: bool = False


class AAAARecord(BaseModel):
    hostname: str
    address: Optional[str] = None
    ttl: Optional[int] = None
    disabled: bool = False


class CNAMERecord(BaseModel):
    hostname: str
    target: Optional[str] = None
    ttl: Optional[int] = None
    disabled: bool = False


class MXServer(BaseModel):
    server: str
    priority: Optional[int] = None


class MXRecord(BaseModel):
    hostname: str
    servers: List[MXServer] = []
    ttl: Optional[int] = None
    disabled: bool = False


class TXTRecord(BaseModel):
    hostname: str
    value: Optional[str] = None
    ttl: Optional[int] = None
    disabled: bool = False


class NSRecord(BaseModel):
    hostname: str
    target: Optional[str] = None
    ttl: Optional[int] = None
    disabled: bool = False


class PTRRecord(BaseModel):
    hostname: str
    target: Optional[str] = None
    ttl: Optional[int] = None
    disabled: bool = False


class NAPTRRule(BaseModel):
    rule: str
    order: Optional[int] = None
    preference: Optional[int] = None
    lookup_a: bool = False
    lookup_srv: bool = False
    protocol_specific: bool = False
    resolve_uri: bool = False
    regexp: Optional[str] = None
    replacement: Optional[str] = None
    service: Optional[str] = None


class NAPTRRecord(BaseModel):
    hostname: str
    rules: List[NAPTRRule] = []
    ttl: Optional[int] = None
    disabled: bool = False


class SPFRecord(BaseModel):
    hostname: str
    value: Optional[str] = None
    ttl: Optional[int] = None
    disabled: bool = False


class SRVEntry(BaseModel):
    entry: str
    hostname: Optional[str] = None
    port: Optional[int] = None
    priority: Optional[int] = None
    weight: Optional[int] = None


class SRVRecord(BaseModel):
    hostname: str
    entries: List[SRVEntry] = []
    ttl: Optional[int] = None
    disabled: bool = False


class AuthDomainRecords(BaseModel):
    a: List[ARecord] = []
    aaaa: List[AAAARecord] = []
    cname: List[CNAMERecord] = []
    mx: List[MXRecord] = []
    txt: List[TXTRecord] = []
    ns: List[NSRecord] = []
    ptr: List[PTRRecord] = []
    naptr: List[NAPTRRecord] = []
    spf: List[SPFRecord] = []
    srv: List[SRVRecord] = []


class AuthoritativeDomain(BaseModel):
    domain: str
    disabled: bool = False
    records: AuthDomainRecords = Field(default_factory=AuthDomainRecords)


class ZoneCacheOptions(BaseModel):
    dnssec: Optional[str] = None
    max_zone_size: Optional[int] = None
    refresh_interval: Optional[int] = None
    refresh_on_reload: bool = False
    retry_interval: Optional[int] = None
    timeout: Optional[int] = None
    zonemd: Optional[str] = None


class ZoneCache(BaseModel):
    zone: str
    source_url: Optional[str] = None
    source_axfr: Optional[str] = None
    options: ZoneCacheOptions = Field(default_factory=ZoneCacheOptions)


class ECSOptions(BaseModel):
    ecs_add_for: List[str] = []
    ecs_ipv4_bits: Optional[int] = None
    edns_subnet_allow_list: List[str] = []


class DNSForwardingConfig(BaseModel):
    listen_addresses: List[str] = []
    allow_from: List[str] = []
    name_servers: List[NameServerEntry] = []
    port: Optional[int] = None
    cache_size: Optional[int] = None
    dnssec: Optional[str] = None
    system: bool = False
    negative_ttl: Optional[int] = None
    timeout: Optional[int] = None
    dhcp_interfaces: List[str] = []
    ignore_hosts_file: bool = False
    no_serve_rfc1918: bool = False
    source_addresses: List[str] = []
    serve_stale_extension: Optional[int] = None
    dns64_prefix: Optional[str] = None
    exclude_throttle_addresses: List[str] = []
    domain_forwarders: List[DomainForwarder] = []
    authoritative_domains: List[AuthoritativeDomain] = []
    zone_caches: List[ZoneCache] = []
    ecs_options: ECSOptions = Field(default_factory=ECSOptions)


class DNSForwardingBatchOperation(BaseModel):
    op: str = Field(..., description="Builder method name")
    value: Optional[str] = Field(
        None,
        description=(
            "Argument(s) for the operation. "
            "Single-arg methods: plain string. "
            "Multi-arg methods: comma-separated."
        ),
    )


class DNSForwardingBatchRequest(BaseModel):
    operations: List[DNSForwardingBatchOperation]


class VyOSResponse(BaseModel):
    success: bool
    data: Optional[Dict[str, Any]] = None
    error: Optional[str] = None

# ============================================================================
# Endpoint 1: Capabilities
# ============================================================================


@router.get("/capabilities")
async def get_dns_forwarding_capabilities(request: Request):
    """Return DNS forwarding feature capabilities based on the VyOS version."""
    await require_read_permission(request, FeatureGroup.DNS_FORWARDING)
    try:
        service = get_session_vyos_service(request)
        builder = DNSForwardingBatchBuilder(version=service.get_version())
        caps = builder.get_capabilities()
        if hasattr(request.state, "instance") and request.state.instance:
            caps["instance_name"] = request.state.instance.get("name")
            caps["instance_id"] = request.state.instance.get("id")
        return caps
    except Exception:
        logger.exception("Unhandled error in get_dns_forwarding_capabilities")
        raise HTTPException(status_code=500, detail="Internal server error")


# ============================================================================
# Endpoint 2: Config
# ============================================================================


@router.get("/config", response_model=DNSForwardingConfig)
async def get_dns_forwarding_config(http_request: Request, refresh: bool = False):
    """Return the full DNS forwarding configuration in a normalized format."""
    await require_read_permission(http_request, FeatureGroup.DNS_FORWARDING)
    try:
        service = get_session_vyos_service(http_request)
        full_config = await run_in_threadpool(service.get_full_config, refresh=refresh)
        mapper = CommandMapperRegistry.get_mapper("dns_forwarding", service.get_version())
        return DNSForwardingConfig(**mapper.parse_config(full_config))
    except Exception:
        logger.exception("Unhandled error in get_dns_forwarding_config")
        raise HTTPException(status_code=500, detail="Internal server error")


# ============================================================================
# Endpoint 3: Batch Operations
# ============================================================================


@router.post("/batch", response_model=VyOSResponse)
async def dns_forwarding_batch_configure(
    http_request: Request, body: DNSForwardingBatchRequest
):
    """Execute a batch of DNS forwarding configuration operations atomically."""
    await require_write_permission(http_request, FeatureGroup.DNS_FORWARDING)
    try:
        service = get_session_vyos_service(http_request)
        builder = DNSForwardingBatchBuilder(version=service.get_version())

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
            data={"message": "DNS forwarding configuration updated"},
            error=response.error if response.error else None,
        )
    except HTTPException:
        raise
    except AttributeError as e:
        raise HTTPException(status_code=400, detail=f"Unknown operation: {e}")
    except Exception:
        logger.exception("Unhandled error in dns_forwarding_batch_configure")
        raise HTTPException(status_code=500, detail="Internal server error")
