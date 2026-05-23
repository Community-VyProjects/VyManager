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


class AuthDomainRecords(BaseModel):
    a: List[ARecord] = []
    aaaa: List[AAAARecord] = []
    cname: List[CNAMERecord] = []
    mx: List[MXRecord] = []
    txt: List[TXTRecord] = []
    ns: List[NSRecord] = []
    ptr: List[PTRRecord] = []


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

        fwd = full_config.get("service", {}).get("dns", {}).get("forwarding", {})
        if not fwd:
            return DNSForwardingConfig()

        return DNSForwardingConfig(
            listen_addresses=_parse_multi(fwd.get("listen-address")),
            allow_from=_parse_multi(fwd.get("allow-from")),
            name_servers=_parse_name_servers(fwd.get("name-server")),
            port=_parse_int(fwd.get("port")),
            cache_size=_parse_int(fwd.get("cache-size")),
            dnssec=fwd.get("dnssec"),
            system="system" in fwd,
            negative_ttl=_parse_int(fwd.get("negative-ttl")),
            timeout=_parse_int(fwd.get("timeout")),
            dhcp_interfaces=_parse_multi(fwd.get("dhcp")),
            ignore_hosts_file="ignore-hosts-file" in fwd,
            no_serve_rfc1918="no-serve-rfc1918" in fwd,
            source_addresses=_parse_multi(fwd.get("source-address")),
            serve_stale_extension=_parse_int(fwd.get("serve-stale-extension")),
            dns64_prefix=fwd.get("dns64-prefix"),
            exclude_throttle_addresses=_parse_multi(fwd.get("exclude-throttle-address")),
            domain_forwarders=_parse_domain_forwarders(fwd.get("domain", {})),
            authoritative_domains=_parse_authoritative_domains(fwd.get("authoritative-domain", {})),
            zone_caches=_parse_zone_caches(fwd.get("zone-cache", {})),
            ecs_options=_parse_ecs_options(fwd.get("options", {})),
        )
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
    if value is None:
        return None
    try:
        return int(value)
    except (ValueError, TypeError):
        return None


def _parse_name_servers(raw) -> List[NameServerEntry]:
    if not raw or not isinstance(raw, dict):
        return []
    result = []
    for ip, attrs in sorted(raw.items()):
        port = None
        if isinstance(attrs, dict):
            port = _parse_int(attrs.get("port"))
        result.append(NameServerEntry(ip=ip, port=port))
    return result


def _parse_domain_forwarders(raw: dict) -> List[DomainForwarder]:
    if not raw or not isinstance(raw, dict):
        return []
    result = []
    for domain, attrs in sorted(raw.items()):
        if not isinstance(attrs, dict):
            attrs = {}
        ns_raw = attrs.get("name-server", {})
        name_servers = []
        if isinstance(ns_raw, dict):
            for ip, ns_attrs in sorted(ns_raw.items()):
                port = None
                if isinstance(ns_attrs, dict):
                    port = _parse_int(ns_attrs.get("port"))
                name_servers.append(NameServerEntry(ip=ip, port=port))
        result.append(DomainForwarder(
            domain=domain,
            name_servers=name_servers,
            addnta="addnta" in attrs,
            recursion_desired="recursion-desired" in attrs,
        ))
    return result


def _parse_a_records(raw: dict) -> List[ARecord]:
    if not raw or not isinstance(raw, dict):
        return []
    result = []
    for hostname, attrs in sorted(raw.items()):
        if not isinstance(attrs, dict):
            attrs = {}
        result.append(ARecord(
            hostname=hostname,
            address=attrs.get("address"),
            ttl=_parse_int(attrs.get("ttl")),
            disabled="disable" in attrs,
        ))
    return result


def _parse_aaaa_records(raw: dict) -> List[AAAARecord]:
    if not raw or not isinstance(raw, dict):
        return []
    result = []
    for hostname, attrs in sorted(raw.items()):
        if not isinstance(attrs, dict):
            attrs = {}
        result.append(AAAARecord(
            hostname=hostname,
            address=attrs.get("address"),
            ttl=_parse_int(attrs.get("ttl")),
            disabled="disable" in attrs,
        ))
    return result


def _parse_cname_records(raw: dict) -> List[CNAMERecord]:
    if not raw or not isinstance(raw, dict):
        return []
    result = []
    for hostname, attrs in sorted(raw.items()):
        if not isinstance(attrs, dict):
            attrs = {}
        result.append(CNAMERecord(
            hostname=hostname,
            target=attrs.get("target"),
            ttl=_parse_int(attrs.get("ttl")),
            disabled="disable" in attrs,
        ))
    return result


def _parse_mx_records(raw: dict) -> List[MXRecord]:
    if not raw or not isinstance(raw, dict):
        return []
    result = []
    for hostname, attrs in sorted(raw.items()):
        if not isinstance(attrs, dict):
            attrs = {}
        servers = []
        server_raw = attrs.get("server", {})
        if isinstance(server_raw, dict):
            for srv, srv_attrs in sorted(server_raw.items()):
                priority = None
                if isinstance(srv_attrs, dict):
                    priority = _parse_int(srv_attrs.get("priority"))
                servers.append(MXServer(server=srv, priority=priority))
        result.append(MXRecord(
            hostname=hostname,
            servers=servers,
            ttl=_parse_int(attrs.get("ttl")),
            disabled="disable" in attrs,
        ))
    return result


def _parse_txt_records(raw: dict) -> List[TXTRecord]:
    if not raw or not isinstance(raw, dict):
        return []
    result = []
    for hostname, attrs in sorted(raw.items()):
        if not isinstance(attrs, dict):
            attrs = {}
        result.append(TXTRecord(
            hostname=hostname,
            value=attrs.get("value"),
            ttl=_parse_int(attrs.get("ttl")),
            disabled="disable" in attrs,
        ))
    return result


def _parse_ns_records(raw: dict) -> List[NSRecord]:
    if not raw or not isinstance(raw, dict):
        return []
    result = []
    for hostname, attrs in sorted(raw.items()):
        if not isinstance(attrs, dict):
            attrs = {}
        result.append(NSRecord(
            hostname=hostname,
            target=attrs.get("target"),
            ttl=_parse_int(attrs.get("ttl")),
            disabled="disable" in attrs,
        ))
    return result


def _parse_ptr_records(raw: dict) -> List[PTRRecord]:
    if not raw or not isinstance(raw, dict):
        return []
    result = []
    for hostname, attrs in sorted(raw.items()):
        if not isinstance(attrs, dict):
            attrs = {}
        result.append(PTRRecord(
            hostname=hostname,
            target=attrs.get("target"),
            ttl=_parse_int(attrs.get("ttl")),
            disabled="disable" in attrs,
        ))
    return result


def _parse_authoritative_domains(raw: dict) -> List[AuthoritativeDomain]:
    if not raw or not isinstance(raw, dict):
        return []
    result = []
    for domain, attrs in sorted(raw.items()):
        if not isinstance(attrs, dict):
            attrs = {}
        records_raw = attrs.get("records", {})
        if not isinstance(records_raw, dict):
            records_raw = {}
        records = AuthDomainRecords(
            a=_parse_a_records(records_raw.get("a", {})),
            aaaa=_parse_aaaa_records(records_raw.get("aaaa", {})),
            cname=_parse_cname_records(records_raw.get("cname", {})),
            mx=_parse_mx_records(records_raw.get("mx", {})),
            txt=_parse_txt_records(records_raw.get("txt", {})),
            ns=_parse_ns_records(records_raw.get("ns", {})),
            ptr=_parse_ptr_records(records_raw.get("ptr", {})),
        )
        result.append(AuthoritativeDomain(
            domain=domain,
            disabled="disable" in attrs,
            records=records,
        ))
    return result


def _parse_zone_caches(raw: dict) -> List[ZoneCache]:
    if not raw or not isinstance(raw, dict):
        return []
    result = []
    for zone, attrs in sorted(raw.items()):
        if not isinstance(attrs, dict):
            attrs = {}
        source = attrs.get("source", {}) or {}
        opts_raw = attrs.get("options", {}) or {}
        refresh_raw = opts_raw.get("refresh", {}) or {}
        opts = ZoneCacheOptions(
            dnssec=opts_raw.get("dnssec"),
            max_zone_size=_parse_int(opts_raw.get("max-zone-size")),
            refresh_interval=_parse_int(refresh_raw.get("interval")),
            refresh_on_reload="on-reload" in refresh_raw,
            retry_interval=_parse_int(opts_raw.get("retry-interval")),
            timeout=_parse_int(opts_raw.get("timeout")),
            zonemd=opts_raw.get("zonemd"),
        )
        result.append(ZoneCache(
            zone=zone,
            source_url=source.get("url"),
            source_axfr=source.get("axfr"),
            options=opts,
        ))
    return result


def _parse_ecs_options(raw: dict) -> ECSOptions:
    if not raw or not isinstance(raw, dict):
        return ECSOptions()
    return ECSOptions(
        ecs_add_for=_parse_multi(raw.get("ecs-add-for")),
        ecs_ipv4_bits=_parse_int(raw.get("ecs-ipv4-bits")),
        edns_subnet_allow_list=_parse_multi(raw.get("edns-subnet-allow-list")),
    )
