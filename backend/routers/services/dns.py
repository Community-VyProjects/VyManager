"""
DNS Forwarding Configuration Endpoints

All DNS forwarding endpoints for VyOS configuration.
Supports DNS caching, forwarding, authoritative domains, and DNSSEC.
"""

from fastapi import APIRouter, HTTPException, Request
from starlette.concurrency import run_in_threadpool
from pydantic import BaseModel, Field, ConfigDict
from typing import Dict, List, Optional, Any

from session_vyos_service import get_session_vyos_service
from fastapi_permissions import require_read_permission, require_write_permission
from rbac_permissions import FeatureGroup

# Router for DNS Forwarding endpoints
router = APIRouter(prefix="/vyos/dns", tags=["dns-forwarding"])


# ============================================================================
# Request Models (for WRITE operations)
# ============================================================================


class DNSBatchRequest(BaseModel):
    """Model for batch DNS forwarding configuration."""

    operations: List[Dict[str, Any]] = Field(
        ...,
        description="List of DNS forwarding operations",
        json_schema_extra={
            "example": [
                {"op": "add_listen_address", "address": "192.168.1.1"},
                {"op": "add_name_server", "address": "8.8.8.8"},
            ]
        }
    )


class VyOSResponse(BaseModel):
    """Standard response from VyOS operations."""

    success: bool
    data: Optional[Dict] = None
    error: Optional[str] = None


# ============================================================================
# Response Models (for READ operations)
# ============================================================================


class NameServer(BaseModel):
    """Name server configuration."""
    address: str
    port: Optional[str] = None


class ForwardDomain(BaseModel):
    """Domain-specific forwarding configuration."""
    name: str
    name_servers: List[str] = Field(default_factory=list)
    addnta: bool = False
    recursion_desired: bool = False


class DNSRecord(BaseModel):
    """DNS record for authoritative domain."""
    type: str
    name: str
    value: Optional[str] = None
    priority: Optional[str] = None


class AuthoritativeDomain(BaseModel):
    """Authoritative domain configuration."""
    name: str
    disable: bool = False
    records: List[DNSRecord] = Field(default_factory=list)


class DNSForwardingConfigResponse(BaseModel):
    """Full DNS forwarding configuration response."""
    configured: bool
    listen_addresses: List[str] = Field(default_factory=list)
    allow_from: List[str] = Field(default_factory=list)
    name_servers: List[NameServer] = Field(default_factory=list)
    domains: List[ForwardDomain] = Field(default_factory=list)
    authoritative_domains: List[AuthoritativeDomain] = Field(default_factory=list)
    dhcp_interfaces: List[str] = Field(default_factory=list)
    cache_size: Optional[str] = None
    negative_ttl: Optional[str] = None
    timeout: Optional[str] = None
    dnssec: Optional[str] = None
    system: bool = False
    ignore_hosts_file: bool = False
    no_serve_rfc1918: bool = False
    source_address: Optional[str] = None

    model_config = ConfigDict(populate_by_name=True)


# ============================================================================
# READ Operations (GET)
# ============================================================================


@router.get("/config", response_model=DNSForwardingConfigResponse)
async def get_dns_config(http_request: Request) -> DNSForwardingConfigResponse:
    """
    Get full DNS forwarding configuration from VyOS.

    Returns listen addresses, name servers, domains, authoritative domains, and settings.
    """
    await require_read_permission(http_request, FeatureGroup.DNS)

    from vyos_mappers.services.dns import DNSForwardingMapper

    try:
        service = get_session_vyos_service(http_request)
        full_config = await run_in_threadpool(service.get_full_config)

        mapper = DNSForwardingMapper(service.get_version())
        parsed_data = mapper.parse_full_config(full_config)

        return DNSForwardingConfigResponse(**parsed_data)
    except KeyError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/capabilities")
async def get_dns_capabilities(http_request: Request) -> Dict[str, Any]:
    """
    Get DNS forwarding capabilities for the connected VyOS version.

    Returns DNSSEC options, record types, and limits.
    """
    await require_read_permission(http_request, FeatureGroup.DNS)

    try:
        service = get_session_vyos_service(http_request)
        version = service.get_version()

        # DNSSEC modes
        dnssec_modes = [
            {"value": "off", "label": "Off", "description": "DNSSEC disabled"},
            {"value": "process-no-validate", "label": "Process (no validate)", "description": "Process DNSSEC records but don't validate"},
            {"value": "process", "label": "Process", "description": "Process and validate DNSSEC"},
            {"value": "log-fail", "label": "Log Fail", "description": "Log validation failures"},
            {"value": "validate", "label": "Validate", "description": "Full DNSSEC validation"},
        ]

        # Record types for authoritative domains
        record_types = [
            {"value": "a", "label": "A", "description": "IPv4 address record"},
            {"value": "aaaa", "label": "AAAA", "description": "IPv6 address record"},
            {"value": "cname", "label": "CNAME", "description": "Canonical name (alias)"},
            {"value": "mx", "label": "MX", "description": "Mail exchange record"},
            {"value": "txt", "label": "TXT", "description": "Text record"},
            {"value": "ptr", "label": "PTR", "description": "Pointer record (reverse DNS)"},
            {"value": "ns", "label": "NS", "description": "Name server record"},
        ]

        return {
            "dnssec_modes": dnssec_modes,
            "record_types": record_types,
            "defaults": {
                "cache_size": 10000,
                "negative_ttl": 3600,
                "timeout": 1500,
            },
            "limits": {
                "cache_size_max": 1000000,
                "negative_ttl_max": 86400,
            },
            "version": version,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/statistics")
async def get_dns_statistics(http_request: Request) -> Dict[str, Any]:
    """
    Get DNS forwarding statistics.
    """
    await require_read_permission(http_request, FeatureGroup.DNS)

    try:
        service = get_session_vyos_service(http_request)
        result = await run_in_threadpool(service.run_show_command, "show dns forwarding statistics")

        return {
            "success": True,
            "data": result,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# WRITE Operations (POST)
# ============================================================================


@router.post("/batch")
async def configure_dns_batch(http_request: Request, request: DNSBatchRequest) -> VyOSResponse:
    """
    Configure DNS forwarding using batch operations.

    **Listen & Access Control Operations:**

    | Operation | Parameters | Description |
    |-----------|------------|-------------|
    | `add_listen_address` | address | Add listen address |
    | `delete_listen_address` | address | Remove listen address |
    | `add_allow_from` | network | Add allowed network |
    | `delete_allow_from` | network | Remove allowed network |
    | `set_source_address` | address | Set source address for queries |
    | `delete_source_address` | address | Remove source address |

    **Name Server Operations:**

    | Operation | Parameters | Description |
    |-----------|------------|-------------|
    | `enable_system` | - | Use system nameservers |
    | `disable_system` | - | Don't use system nameservers |
    | `add_name_server` | address, port? | Add name server |
    | `delete_name_server` | address | Remove name server |
    | `add_dhcp_interface` | interface | Use DNS from DHCP interface |
    | `delete_dhcp_interface` | interface | Remove DHCP interface |

    **Domain Forwarding Operations:**

    | Operation | Parameters | Description |
    |-----------|------------|-------------|
    | `add_domain` | domain | Create domain forwarding |
    | `delete_domain` | domain | Delete domain forwarding |
    | `add_domain_name_server` | domain, server | Add server to domain |
    | `delete_domain_name_server` | domain, server | Remove server from domain |
    | `enable_domain_addnta` | domain | Enable negative trust anchor |
    | `disable_domain_addnta` | domain | Disable negative trust anchor |
    | `enable_domain_recursion` | domain | Enable recursion-desired |
    | `disable_domain_recursion` | domain | Disable recursion-desired |

    **Cache & Performance Operations:**

    | Operation | Parameters | Description |
    |-----------|------------|-------------|
    | `set_cache_size` | value | Set cache size |
    | `delete_cache_size` | - | Reset cache size to default |
    | `set_negative_ttl` | value | Set negative TTL |
    | `delete_negative_ttl` | - | Reset negative TTL |
    | `set_timeout` | value | Set query timeout (ms) |
    | `delete_timeout` | - | Reset timeout |

    **Security Operations:**

    | Operation | Parameters | Description |
    |-----------|------------|-------------|
    | `set_dnssec` | value | Set DNSSEC mode |
    | `delete_dnssec` | - | Disable DNSSEC |
    | `enable_ignore_hosts_file` | - | Ignore /etc/hosts |
    | `disable_ignore_hosts_file` | - | Use /etc/hosts |
    | `enable_no_serve_rfc1918` | - | Don't serve RFC1918 PTR |
    | `disable_no_serve_rfc1918` | - | Serve RFC1918 PTR |

    **Authoritative Domain Operations:**

    | Operation | Parameters | Description |
    |-----------|------------|-------------|
    | `add_authoritative_domain` | domain | Create authoritative domain |
    | `delete_authoritative_domain` | domain | Delete authoritative domain |
    | `disable_authoritative_domain` | domain | Disable authoritative domain |
    | `enable_authoritative_domain` | domain | Enable authoritative domain |
    | `add_record_a` | domain, name, address | Add A record |
    | `delete_record_a` | domain, name, address | Delete A record |
    | `add_record_aaaa` | domain, name, address | Add AAAA record |
    | `delete_record_aaaa` | domain, name, address | Delete AAAA record |
    | `add_record_cname` | domain, name, target | Add CNAME record |
    | `delete_record_cname` | domain, name | Delete CNAME record |
    | `add_record_mx` | domain, name, server, priority | Add MX record |
    | `delete_record_mx` | domain, name | Delete MX record |
    | `add_record_txt` | domain, name, value | Add TXT record |
    | `delete_record_txt` | domain, name, value | Delete TXT record |
    | `add_record_ptr` | domain, name, target | Add PTR record |
    | `delete_record_ptr` | domain, name | Delete PTR record |
    | `add_record_ns` | domain, name, target | Add NS record |
    | `delete_record_ns` | domain, name | Delete NS record |
    """
    await require_write_permission(http_request, FeatureGroup.DNS)

    from vyos_mappers.services.dns import DNSForwardingMapper

    try:
        service = get_session_vyos_service(http_request)
        mapper = DNSForwardingMapper(service.get_version())

        set_commands = []
        delete_commands = []

        for operation in request.operations:
            op_type = operation.get("op")

            if not op_type:
                raise HTTPException(
                    status_code=400,
                    detail=f"Invalid operation: {operation}. Must have 'op' key"
                )

            # Extract common parameters
            address = operation.get("address")
            network = operation.get("network")
            domain = operation.get("domain")
            server = operation.get("server")
            interface = operation.get("interface")
            value = operation.get("value")
            name = operation.get("name")
            target = operation.get("target")
            priority = operation.get("priority")
            port = operation.get("port")

            # ================================================================
            # Listen & Access Control Operations
            # ================================================================

            if op_type == "add_listen_address":
                if not address:
                    raise HTTPException(status_code=400, detail="add_listen_address requires 'address'")
                set_commands.append(mapper.get_listen_address(address))

            elif op_type == "delete_listen_address":
                if not address:
                    raise HTTPException(status_code=400, detail="delete_listen_address requires 'address'")
                delete_commands.append(mapper.get_listen_address(address))

            elif op_type == "add_allow_from":
                if not network:
                    raise HTTPException(status_code=400, detail="add_allow_from requires 'network'")
                set_commands.append(mapper.get_allow_from(network))

            elif op_type == "delete_allow_from":
                if not network:
                    raise HTTPException(status_code=400, detail="delete_allow_from requires 'network'")
                delete_commands.append(mapper.get_allow_from(network))

            elif op_type == "set_source_address":
                if not address:
                    raise HTTPException(status_code=400, detail="set_source_address requires 'address'")
                set_commands.append(mapper.get_source_address(address))

            elif op_type == "delete_source_address":
                if not address:
                    raise HTTPException(status_code=400, detail="delete_source_address requires 'address'")
                delete_commands.append(mapper.get_source_address(address))

            # ================================================================
            # Name Server Operations
            # ================================================================

            elif op_type == "enable_system":
                set_commands.append(mapper.get_system())

            elif op_type == "disable_system":
                delete_commands.append(mapper.get_system())

            elif op_type == "add_name_server":
                if not address:
                    raise HTTPException(status_code=400, detail="add_name_server requires 'address'")
                set_commands.append(mapper.get_name_server(address))
                if port:
                    set_commands.append(mapper.get_name_server_port(address, str(port)))

            elif op_type == "delete_name_server":
                if not address:
                    raise HTTPException(status_code=400, detail="delete_name_server requires 'address'")
                delete_commands.append(mapper.get_name_server(address))

            elif op_type == "add_dhcp_interface":
                if not interface:
                    raise HTTPException(status_code=400, detail="add_dhcp_interface requires 'interface'")
                set_commands.append(mapper.get_dhcp_interface(interface))

            elif op_type == "delete_dhcp_interface":
                if not interface:
                    raise HTTPException(status_code=400, detail="delete_dhcp_interface requires 'interface'")
                delete_commands.append(mapper.get_dhcp_interface(interface))

            # ================================================================
            # Domain Forwarding Operations
            # ================================================================

            elif op_type == "add_domain":
                if not domain:
                    raise HTTPException(status_code=400, detail="add_domain requires 'domain'")
                set_commands.append(mapper.get_domain(domain))

            elif op_type == "delete_domain":
                if not domain:
                    raise HTTPException(status_code=400, detail="delete_domain requires 'domain'")
                delete_commands.append(mapper.get_domain(domain))

            elif op_type == "add_domain_name_server":
                if not domain or not server:
                    raise HTTPException(status_code=400, detail="add_domain_name_server requires 'domain' and 'server'")
                set_commands.append(mapper.get_domain_name_server(domain, server))

            elif op_type == "delete_domain_name_server":
                if not domain or not server:
                    raise HTTPException(status_code=400, detail="delete_domain_name_server requires 'domain' and 'server'")
                delete_commands.append(mapper.get_domain_name_server(domain, server))

            elif op_type == "enable_domain_addnta":
                if not domain:
                    raise HTTPException(status_code=400, detail="enable_domain_addnta requires 'domain'")
                set_commands.append(mapper.get_domain_addnta(domain))

            elif op_type == "disable_domain_addnta":
                if not domain:
                    raise HTTPException(status_code=400, detail="disable_domain_addnta requires 'domain'")
                delete_commands.append(mapper.get_domain_addnta(domain))

            elif op_type == "enable_domain_recursion":
                if not domain:
                    raise HTTPException(status_code=400, detail="enable_domain_recursion requires 'domain'")
                set_commands.append(mapper.get_domain_recursion_desired(domain))

            elif op_type == "disable_domain_recursion":
                if not domain:
                    raise HTTPException(status_code=400, detail="disable_domain_recursion requires 'domain'")
                delete_commands.append(mapper.get_domain_recursion_desired(domain))

            # ================================================================
            # Cache & Performance Operations
            # ================================================================

            elif op_type == "set_cache_size":
                if not value:
                    raise HTTPException(status_code=400, detail="set_cache_size requires 'value'")
                set_commands.append(mapper.get_cache_size(str(value)))

            elif op_type == "delete_cache_size":
                delete_commands.append(["service", "dns", "forwarding", "cache-size"])

            elif op_type == "set_negative_ttl":
                if not value:
                    raise HTTPException(status_code=400, detail="set_negative_ttl requires 'value'")
                set_commands.append(mapper.get_negative_ttl(str(value)))

            elif op_type == "delete_negative_ttl":
                delete_commands.append(["service", "dns", "forwarding", "negative-ttl"])

            elif op_type == "set_timeout":
                if not value:
                    raise HTTPException(status_code=400, detail="set_timeout requires 'value'")
                set_commands.append(mapper.get_timeout(str(value)))

            elif op_type == "delete_timeout":
                delete_commands.append(["service", "dns", "forwarding", "timeout"])

            # ================================================================
            # Security Operations
            # ================================================================

            elif op_type == "set_dnssec":
                if not value:
                    raise HTTPException(status_code=400, detail="set_dnssec requires 'value'")
                set_commands.append(mapper.get_dnssec(value))

            elif op_type == "delete_dnssec":
                delete_commands.append(["service", "dns", "forwarding", "dnssec"])

            elif op_type == "enable_ignore_hosts_file":
                set_commands.append(mapper.get_ignore_hosts_file())

            elif op_type == "disable_ignore_hosts_file":
                delete_commands.append(mapper.get_ignore_hosts_file())

            elif op_type == "enable_no_serve_rfc1918":
                set_commands.append(mapper.get_no_serve_rfc1918())

            elif op_type == "disable_no_serve_rfc1918":
                delete_commands.append(mapper.get_no_serve_rfc1918())

            # ================================================================
            # Authoritative Domain Operations
            # ================================================================

            elif op_type == "add_authoritative_domain":
                if not domain:
                    raise HTTPException(status_code=400, detail="add_authoritative_domain requires 'domain'")
                set_commands.append(mapper.get_authoritative_domain(domain))

            elif op_type == "delete_authoritative_domain":
                if not domain:
                    raise HTTPException(status_code=400, detail="delete_authoritative_domain requires 'domain'")
                delete_commands.append(mapper.get_authoritative_domain(domain))

            elif op_type == "disable_authoritative_domain":
                if not domain:
                    raise HTTPException(status_code=400, detail="disable_authoritative_domain requires 'domain'")
                set_commands.append(mapper.get_authoritative_domain_disable(domain))

            elif op_type == "enable_authoritative_domain":
                if not domain:
                    raise HTTPException(status_code=400, detail="enable_authoritative_domain requires 'domain'")
                delete_commands.append(mapper.get_authoritative_domain_disable(domain))

            # ================================================================
            # DNS Record Operations
            # ================================================================

            elif op_type == "add_record_a":
                if not domain or not name or not address:
                    raise HTTPException(status_code=400, detail="add_record_a requires 'domain', 'name', and 'address'")
                set_commands.append(mapper.get_authoritative_domain_record_a(domain, name, address))

            elif op_type == "delete_record_a":
                if not domain or not name or not address:
                    raise HTTPException(status_code=400, detail="delete_record_a requires 'domain', 'name', and 'address'")
                delete_commands.append(mapper.get_authoritative_domain_record_a(domain, name, address))

            elif op_type == "add_record_aaaa":
                if not domain or not name or not address:
                    raise HTTPException(status_code=400, detail="add_record_aaaa requires 'domain', 'name', and 'address'")
                set_commands.append(mapper.get_authoritative_domain_record_aaaa(domain, name, address))

            elif op_type == "delete_record_aaaa":
                if not domain or not name or not address:
                    raise HTTPException(status_code=400, detail="delete_record_aaaa requires 'domain', 'name', and 'address'")
                delete_commands.append(mapper.get_authoritative_domain_record_aaaa(domain, name, address))

            elif op_type == "add_record_cname":
                if not domain or not name or not target:
                    raise HTTPException(status_code=400, detail="add_record_cname requires 'domain', 'name', and 'target'")
                set_commands.append(mapper.get_authoritative_domain_record_cname(domain, name, target))

            elif op_type == "delete_record_cname":
                if not domain or not name:
                    raise HTTPException(status_code=400, detail="delete_record_cname requires 'domain' and 'name'")
                delete_commands.append(["service", "dns", "forwarding", "authoritative-domain", domain, "records", "cname", name])

            elif op_type == "add_record_mx":
                if not domain or not name or not server or not priority:
                    raise HTTPException(status_code=400, detail="add_record_mx requires 'domain', 'name', 'server', and 'priority'")
                set_commands.append(mapper.get_authoritative_domain_record_mx(domain, name, server, str(priority)))

            elif op_type == "delete_record_mx":
                if not domain or not name:
                    raise HTTPException(status_code=400, detail="delete_record_mx requires 'domain' and 'name'")
                delete_commands.append(["service", "dns", "forwarding", "authoritative-domain", domain, "records", "mx", name])

            elif op_type == "add_record_txt":
                if not domain or not name or not value:
                    raise HTTPException(status_code=400, detail="add_record_txt requires 'domain', 'name', and 'value'")
                set_commands.append(mapper.get_authoritative_domain_record_txt(domain, name, value))

            elif op_type == "delete_record_txt":
                if not domain or not name or not value:
                    raise HTTPException(status_code=400, detail="delete_record_txt requires 'domain', 'name', and 'value'")
                delete_commands.append(mapper.get_authoritative_domain_record_txt(domain, name, value))

            elif op_type == "add_record_ptr":
                if not domain or not name or not target:
                    raise HTTPException(status_code=400, detail="add_record_ptr requires 'domain', 'name', and 'target'")
                set_commands.append(mapper.get_authoritative_domain_record_ptr(domain, name, target))

            elif op_type == "delete_record_ptr":
                if not domain or not name:
                    raise HTTPException(status_code=400, detail="delete_record_ptr requires 'domain' and 'name'")
                delete_commands.append(["service", "dns", "forwarding", "authoritative-domain", domain, "records", "ptr", name])

            elif op_type == "add_record_ns":
                if not domain or not name or not target:
                    raise HTTPException(status_code=400, detail="add_record_ns requires 'domain', 'name', and 'target'")
                set_commands.append(mapper.get_authoritative_domain_record_ns(domain, name, target))

            elif op_type == "delete_record_ns":
                if not domain or not name:
                    raise HTTPException(status_code=400, detail="delete_record_ns requires 'domain' and 'name'")
                delete_commands.append(["service", "dns", "forwarding", "authoritative-domain", domain, "records", "ns", name])

            else:
                raise HTTPException(status_code=400, detail=f"Unsupported operation: {op_type}")

        # Execute commands
        response = await run_in_threadpool(
            service.configure_batch,
            set_commands=set_commands,
            delete_commands=delete_commands
        )

        return VyOSResponse(
            success=response.status == 200,
            data=response.result if hasattr(response, 'result') else None,
            error=response.error if hasattr(response, 'error') and response.error else None
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
