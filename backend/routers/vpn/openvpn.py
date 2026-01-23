"""
OpenVPN Configuration Endpoints

All OpenVPN endpoints for VyOS configuration.
Supports server mode, site-to-site, and client modes.
"""

from fastapi import APIRouter, HTTPException, Request
from starlette.concurrency import run_in_threadpool
from pydantic import BaseModel, Field, ConfigDict
from typing import Dict, List, Optional, Any

from session_vyos_service import get_session_vyos_service
from fastapi_permissions import require_read_permission, require_write_permission
from rbac_permissions import FeatureGroup

# Router for OpenVPN endpoints
router = APIRouter(prefix="/vyos/openvpn", tags=["openvpn"])


# ============================================================================
# Request Models (for WRITE operations)
# ============================================================================


class OpenVPNBatchRequest(BaseModel):
    """Model for batch OpenVPN configuration."""

    interface: str = Field(..., description="OpenVPN interface name (vtunX)")
    operations: List[Dict[str, Any]] = Field(
        ...,
        description="List of OpenVPN operations",
        json_schema_extra={
            "example": [
                {"op": "set_mode", "value": "server"},
                {"op": "set_server_subnet", "value": "10.8.0.0/24"},
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


class OpenVPNClient(BaseModel):
    """OpenVPN server client configuration."""
    name: str
    ip: Optional[str] = None
    subnet: Optional[str] = None
    disable: bool = False


class OpenVPNServer(BaseModel):
    """OpenVPN server mode configuration."""
    subnet: Optional[str] = None
    clients: List[OpenVPNClient] = Field(default_factory=list)
    name_servers: List[str] = Field(default_factory=list)
    domain_name: Optional[str] = None
    push_routes: List[str] = Field(default_factory=list)
    max_connections: Optional[str] = None
    topology: Optional[str] = None
    redirect_gateway: bool = False
    mfa_totp: bool = False


class OpenVPNTLS(BaseModel):
    """OpenVPN TLS configuration."""
    ca_certificate: Optional[str] = None
    certificate: Optional[str] = None
    dh_params: Optional[str] = None
    crl_file: Optional[str] = None
    auth_key: Optional[str] = None
    crypt_key: Optional[str] = None
    role: Optional[str] = None


class OpenVPNAuth(BaseModel):
    """OpenVPN authentication configuration."""
    username: Optional[str] = None
    password: bool = False  # True if password is set


class OpenVPNKeepAlive(BaseModel):
    """OpenVPN keepalive configuration."""
    failure_count: Optional[str] = None
    interval: Optional[str] = None


class OpenVPNInterface(BaseModel):
    """OpenVPN interface configuration."""
    name: str
    mode: Optional[str] = None
    description: Optional[str] = None
    disable: bool = False
    protocol: Optional[str] = None
    device_type: Optional[str] = None
    local_address: Optional[str] = None
    remote_address: Optional[str] = None
    local_host: Optional[str] = None
    local_port: Optional[str] = None
    remote_hosts: List[str] = Field(default_factory=list)
    remote_port: Optional[str] = None
    encryption: Optional[str] = None
    hash: Optional[str] = None
    shared_secret_key: Optional[str] = None
    server: Optional[OpenVPNServer] = None
    tls: Optional[OpenVPNTLS] = None
    authentication: Optional[OpenVPNAuth] = None
    keep_alive: Optional[OpenVPNKeepAlive] = None
    persistent_tunnel: bool = False
    replace_default_route: bool = False
    openvpn_options: List[str] = Field(default_factory=list)
    mtu: Optional[str] = None

    model_config = ConfigDict(populate_by_name=True)


class OpenVPNConfigResponse(BaseModel):
    """Full OpenVPN configuration response."""
    configured: bool
    interfaces: List[OpenVPNInterface] = Field(default_factory=list)
    total: int = 0
    by_mode: Dict[str, int] = Field(default_factory=dict)

    model_config = ConfigDict(populate_by_name=True)


# ============================================================================
# READ Operations (GET)
# ============================================================================


@router.get("/config", response_model=OpenVPNConfigResponse)
async def get_openvpn_config(http_request: Request) -> OpenVPNConfigResponse:
    """
    Get all OpenVPN interface configurations from VyOS.

    Returns all OpenVPN interfaces with their configurations.
    """
    await require_read_permission(http_request, FeatureGroup.VPN)

    from vyos_mappers.vpn.openvpn import OpenVPNMapper

    try:
        service = get_session_vyos_service(http_request)
        full_config = await run_in_threadpool(service.get_full_config)

        mapper = OpenVPNMapper(service.get_version())
        parsed_data = mapper.parse_all_interfaces(full_config)

        return OpenVPNConfigResponse(**parsed_data)
    except KeyError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/capabilities")
async def get_openvpn_capabilities(http_request: Request) -> Dict[str, Any]:
    """
    Get OpenVPN capabilities for the connected VyOS version.

    Returns supported modes, encryption algorithms, etc.
    """
    await require_read_permission(http_request, FeatureGroup.VPN)

    try:
        service = get_session_vyos_service(http_request)
        version = service.get_version()

        modes = [
            {"value": "server", "label": "Server", "description": "Multi-client server mode"},
            {"value": "site-to-site", "label": "Site-to-Site", "description": "Point-to-point tunnel"},
            {"value": "client", "label": "Client", "description": "Connect to OpenVPN server"},
        ]

        protocols = [
            {"value": "udp", "label": "UDP", "description": "UDP protocol (recommended)"},
            {"value": "tcp-passive", "label": "TCP Passive", "description": "TCP server mode"},
            {"value": "tcp-active", "label": "TCP Active", "description": "TCP client mode"},
        ]

        device_types = [
            {"value": "tun", "label": "TUN", "description": "Layer 3 tunnel (routing)"},
            {"value": "tap", "label": "TAP", "description": "Layer 2 tunnel (bridging)"},
        ]

        encryptions = [
            {"value": "aes128", "label": "AES-128", "description": "AES 128-bit CBC"},
            {"value": "aes192", "label": "AES-192", "description": "AES 192-bit CBC"},
            {"value": "aes256", "label": "AES-256", "description": "AES 256-bit CBC"},
            {"value": "aes128gcm", "label": "AES-128-GCM", "description": "AES 128-bit GCM (AEAD)"},
            {"value": "aes192gcm", "label": "AES-192-GCM", "description": "AES 192-bit GCM (AEAD)"},
            {"value": "aes256gcm", "label": "AES-256-GCM", "description": "AES 256-bit GCM (AEAD)"},
            {"value": "des", "label": "DES", "description": "DES (legacy, insecure)"},
            {"value": "3des", "label": "3DES", "description": "Triple DES (legacy)"},
        ]

        hashes = [
            {"value": "sha1", "label": "SHA-1", "description": "SHA-1 (160-bit)"},
            {"value": "sha256", "label": "SHA-256", "description": "SHA-256 (256-bit)"},
            {"value": "sha384", "label": "SHA-384", "description": "SHA-384 (384-bit)"},
            {"value": "sha512", "label": "SHA-512", "description": "SHA-512 (512-bit)"},
            {"value": "md5", "label": "MD5", "description": "MD5 (legacy, not recommended)"},
        ]

        topologies = [
            {"value": "subnet", "label": "Subnet", "description": "Subnet topology (recommended)"},
            {"value": "net30", "label": "Net30", "description": "Point-to-point topology (legacy)"},
        ]

        tls_roles = [
            {"value": "active", "label": "Active", "description": "Initiates TLS handshake"},
            {"value": "passive", "label": "Passive", "description": "Waits for TLS handshake"},
        ]

        return {
            "modes": modes,
            "protocols": protocols,
            "device_types": device_types,
            "encryptions": encryptions,
            "hashes": hashes,
            "topologies": topologies,
            "tls_roles": tls_roles,
            "default_port": 1194,
            "version": version,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/status")
async def get_openvpn_status(http_request: Request) -> Dict[str, Any]:
    """
    Get OpenVPN status (show openvpn).
    """
    await require_read_permission(http_request, FeatureGroup.VPN)

    try:
        service = get_session_vyos_service(http_request)
        result = await run_in_threadpool(service.run_show_command, "show openvpn")

        return {
            "success": True,
            "data": result,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/interfaces/{interface}/status")
async def get_interface_status(http_request: Request, interface: str) -> Dict[str, Any]:
    """
    Get status for a specific OpenVPN interface.
    """
    await require_read_permission(http_request, FeatureGroup.VPN)

    try:
        service = get_session_vyos_service(http_request)
        result = await run_in_threadpool(
            service.run_show_command,
            f"show openvpn server {interface}"
        )

        return {
            "success": True,
            "interface": interface,
            "data": result,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# WRITE Operations (POST)
# ============================================================================


@router.post("/batch")
async def configure_openvpn_batch(http_request: Request, request: OpenVPNBatchRequest) -> VyOSResponse:
    """
    Configure OpenVPN interface using batch operations.

    **Interface Operations:**

    | Operation | Value Required | Description |
    |-----------|----------------|-------------|
    | `create` | No | Create OpenVPN interface |
    | `delete` | No | Delete OpenVPN interface |
    | `set_mode` | Yes | Set mode (server, site-to-site, client) |
    | `set_description` | Yes | Set description |
    | `delete_description` | No | Remove description |
    | `disable` | No | Disable interface |
    | `enable` | No | Enable interface |

    **Network Operations:**

    | Operation | Value Required | Description |
    |-----------|----------------|-------------|
    | `set_local_address` | Yes | Set local tunnel address |
    | `set_remote_address` | Yes | Set remote tunnel address |
    | `set_local_host` | Yes | Set local bind address |
    | `set_local_port` | Yes | Set local port |
    | `set_remote_host` | Yes | Add remote host |
    | `delete_remote_host` | Yes | Remove remote host |
    | `set_remote_port` | Yes | Set remote port |
    | `set_protocol` | Yes | Set protocol (udp, tcp-passive, tcp-active) |
    | `set_device_type` | Yes | Set device type (tun, tap) |

    **Server Mode Operations:**

    | Operation | Value Required | Description |
    |-----------|----------------|-------------|
    | `set_server_subnet` | Yes | Set server subnet |
    | `add_server_client` | Yes (client name) | Add client configuration |
    | `delete_server_client` | Yes | Remove client |
    | `set_server_client_ip` | Yes (client, ip) | Set client IP |
    | `add_push_route` | Yes | Add route to push to clients |
    | `delete_push_route` | Yes | Remove push route |
    | `add_name_server` | Yes | Add DNS server to push |
    | `delete_name_server` | Yes | Remove DNS server |
    | `set_domain_name` | Yes | Set domain name to push |
    | `set_topology` | Yes | Set server topology |
    | `set_max_connections` | Yes | Set max connections |
    | `enable_redirect_gateway` | No | Enable redirect-gateway |
    | `disable_redirect_gateway` | No | Disable redirect-gateway |

    **Security Operations:**

    | Operation | Value Required | Description |
    |-----------|----------------|-------------|
    | `set_encryption` | Yes | Set encryption cipher |
    | `set_hash` | Yes | Set hash algorithm |
    | `set_shared_secret_key` | Yes | Set shared secret key |
    | `set_tls_ca_certificate` | Yes | Set CA certificate |
    | `set_tls_certificate` | Yes | Set certificate |
    | `set_tls_dh_params` | Yes | Set DH parameters |
    | `set_tls_auth_key` | Yes | Set TLS auth key |
    | `set_tls_crypt_key` | Yes | Set TLS crypt key |
    | `set_tls_role` | Yes | Set TLS role (active, passive) |

    **Advanced Operations:**

    | Operation | Value Required | Description |
    |-----------|----------------|-------------|
    | `set_keep_alive` | Yes (interval, failure) | Set keepalive |
    | `enable_persistent_tunnel` | No | Enable persistent tunnel |
    | `disable_persistent_tunnel` | No | Disable persistent tunnel |
    | `enable_replace_default_route` | No | Enable replace default route |
    | `disable_replace_default_route` | No | Disable replace default route |
    | `add_openvpn_option` | Yes | Add custom OpenVPN option |
    | `delete_openvpn_option` | Yes | Remove custom option |
    """
    await require_write_permission(http_request, FeatureGroup.VPN)

    from vyos_mappers.vpn.openvpn import OpenVPNMapper

    try:
        service = get_session_vyos_service(http_request)
        mapper = OpenVPNMapper(service.get_version())

        set_commands = []
        delete_commands = []

        interface = request.interface

        for operation in request.operations:
            op_type = operation.get("op")
            value = operation.get("value")

            if not op_type:
                raise HTTPException(
                    status_code=400,
                    detail=f"Invalid operation: {operation}. Must have 'op' key"
                )

            # ================================================================
            # Interface Operations
            # ================================================================

            if op_type == "create":
                set_commands.append(mapper.get_interface(interface))

            elif op_type == "delete":
                delete_commands.append(mapper.get_interface(interface))

            elif op_type == "set_mode":
                if not value:
                    raise HTTPException(status_code=400, detail="set_mode requires 'value'")
                set_commands.append(mapper.get_mode(interface, value))

            elif op_type == "set_description":
                if not value:
                    raise HTTPException(status_code=400, detail="set_description requires 'value'")
                set_commands.append(mapper.get_description(interface, value))

            elif op_type == "delete_description":
                delete_commands.append(mapper.get_description_path(interface))

            elif op_type == "disable":
                set_commands.append(mapper.get_disable(interface))

            elif op_type == "enable":
                delete_commands.append(mapper.get_disable(interface))

            # ================================================================
            # Network Operations
            # ================================================================

            elif op_type == "set_local_address":
                if not value:
                    raise HTTPException(status_code=400, detail="set_local_address requires 'value'")
                set_commands.append(mapper.get_local_address(interface, value))

            elif op_type == "delete_local_address":
                delete_commands.append(["interfaces", "openvpn", interface, "local-address"])

            elif op_type == "set_remote_address":
                if not value:
                    raise HTTPException(status_code=400, detail="set_remote_address requires 'value'")
                set_commands.append(mapper.get_remote_address(interface, value))

            elif op_type == "delete_remote_address":
                delete_commands.append(["interfaces", "openvpn", interface, "remote-address"])

            elif op_type == "set_local_host":
                if not value:
                    raise HTTPException(status_code=400, detail="set_local_host requires 'value'")
                set_commands.append(mapper.get_local_host(interface, value))

            elif op_type == "set_local_port":
                if not value:
                    raise HTTPException(status_code=400, detail="set_local_port requires 'value'")
                set_commands.append(mapper.get_local_port(interface, str(value)))

            elif op_type == "set_remote_host":
                if not value:
                    raise HTTPException(status_code=400, detail="set_remote_host requires 'value'")
                set_commands.append(mapper.get_remote_host(interface, value))

            elif op_type == "delete_remote_host":
                if not value:
                    raise HTTPException(status_code=400, detail="delete_remote_host requires 'value'")
                delete_commands.append(["interfaces", "openvpn", interface, "remote-host", value])

            elif op_type == "set_remote_port":
                if not value:
                    raise HTTPException(status_code=400, detail="set_remote_port requires 'value'")
                set_commands.append(mapper.get_remote_port(interface, str(value)))

            elif op_type == "set_protocol":
                if not value:
                    raise HTTPException(status_code=400, detail="set_protocol requires 'value'")
                set_commands.append(mapper.get_protocol(interface, value))

            elif op_type == "set_device_type":
                if not value:
                    raise HTTPException(status_code=400, detail="set_device_type requires 'value'")
                set_commands.append(mapper.get_device_type(interface, value))

            # ================================================================
            # Server Mode Operations
            # ================================================================

            elif op_type == "set_server_subnet":
                if not value:
                    raise HTTPException(status_code=400, detail="set_server_subnet requires 'value'")
                set_commands.append(mapper.get_server_subnet(interface, value))

            elif op_type == "add_server_client":
                client = operation.get("client")
                if not client:
                    raise HTTPException(status_code=400, detail="add_server_client requires 'client'")
                set_commands.append(mapper.get_server_client(interface, client))
                if operation.get("ip"):
                    set_commands.append(mapper.get_server_client_ip(interface, client, operation["ip"]))
                if operation.get("subnet"):
                    set_commands.append(mapper.get_server_client_subnet(interface, client, operation["subnet"]))

            elif op_type == "delete_server_client":
                client = operation.get("client")
                if not client:
                    raise HTTPException(status_code=400, detail="delete_server_client requires 'client'")
                delete_commands.append(mapper.get_server_client(interface, client))

            elif op_type == "disable_server_client":
                client = operation.get("client")
                if not client:
                    raise HTTPException(status_code=400, detail="disable_server_client requires 'client'")
                set_commands.append(mapper.get_server_client_disable(interface, client))

            elif op_type == "enable_server_client":
                client = operation.get("client")
                if not client:
                    raise HTTPException(status_code=400, detail="enable_server_client requires 'client'")
                delete_commands.append(mapper.get_server_client_disable(interface, client))

            elif op_type == "add_push_route":
                if not value:
                    raise HTTPException(status_code=400, detail="add_push_route requires 'value'")
                set_commands.append(mapper.get_server_push_route(interface, value))

            elif op_type == "delete_push_route":
                if not value:
                    raise HTTPException(status_code=400, detail="delete_push_route requires 'value'")
                delete_commands.append(["interfaces", "openvpn", interface, "server", "push-route", value])

            elif op_type == "add_name_server":
                if not value:
                    raise HTTPException(status_code=400, detail="add_name_server requires 'value'")
                set_commands.append(mapper.get_server_name_server(interface, value))

            elif op_type == "delete_name_server":
                if not value:
                    raise HTTPException(status_code=400, detail="delete_name_server requires 'value'")
                delete_commands.append(["interfaces", "openvpn", interface, "server", "name-server", value])

            elif op_type == "set_domain_name":
                if not value:
                    raise HTTPException(status_code=400, detail="set_domain_name requires 'value'")
                set_commands.append(mapper.get_server_domain_name(interface, value))

            elif op_type == "set_topology":
                if not value:
                    raise HTTPException(status_code=400, detail="set_topology requires 'value'")
                set_commands.append(mapper.get_server_topology(interface, value))

            elif op_type == "set_max_connections":
                if not value:
                    raise HTTPException(status_code=400, detail="set_max_connections requires 'value'")
                set_commands.append(mapper.get_server_max_connections(interface, str(value)))

            elif op_type == "enable_redirect_gateway":
                set_commands.append(mapper.get_redirect_gateway(interface))

            elif op_type == "disable_redirect_gateway":
                delete_commands.append(["interfaces", "openvpn", interface, "server", "redirect-gateway"])

            elif op_type == "enable_mfa_totp":
                set_commands.append(mapper.get_server_mfa_totp(interface))

            elif op_type == "disable_mfa_totp":
                delete_commands.append(["interfaces", "openvpn", interface, "server", "mfa", "totp"])

            # ================================================================
            # Security Operations
            # ================================================================

            elif op_type == "set_encryption":
                if not value:
                    raise HTTPException(status_code=400, detail="set_encryption requires 'value'")
                set_commands.append(mapper.get_encryption(interface, value))

            elif op_type == "set_hash":
                if not value:
                    raise HTTPException(status_code=400, detail="set_hash requires 'value'")
                set_commands.append(mapper.get_hash(interface, value))

            elif op_type == "set_shared_secret_key":
                if not value:
                    raise HTTPException(status_code=400, detail="set_shared_secret_key requires 'value'")
                set_commands.append(mapper.get_shared_secret_key(interface, value))

            elif op_type == "set_tls_ca_certificate":
                if not value:
                    raise HTTPException(status_code=400, detail="set_tls_ca_certificate requires 'value'")
                set_commands.append(mapper.get_tls_ca_certificate(interface, value))

            elif op_type == "set_tls_certificate":
                if not value:
                    raise HTTPException(status_code=400, detail="set_tls_certificate requires 'value'")
                set_commands.append(mapper.get_tls_certificate(interface, value))

            elif op_type == "set_tls_dh_params":
                if not value:
                    raise HTTPException(status_code=400, detail="set_tls_dh_params requires 'value'")
                set_commands.append(mapper.get_tls_dh_params(interface, value))

            elif op_type == "set_tls_crl_file":
                if not value:
                    raise HTTPException(status_code=400, detail="set_tls_crl_file requires 'value'")
                set_commands.append(mapper.get_tls_crl_file(interface, value))

            elif op_type == "set_tls_auth_key":
                if not value:
                    raise HTTPException(status_code=400, detail="set_tls_auth_key requires 'value'")
                set_commands.append(mapper.get_tls_auth_key(interface, value))

            elif op_type == "set_tls_crypt_key":
                if not value:
                    raise HTTPException(status_code=400, detail="set_tls_crypt_key requires 'value'")
                set_commands.append(mapper.get_tls_crypt_key(interface, value))

            elif op_type == "set_tls_role":
                if not value:
                    raise HTTPException(status_code=400, detail="set_tls_role requires 'value'")
                set_commands.append(mapper.get_tls_role(interface, value))

            # ================================================================
            # Authentication Operations
            # ================================================================

            elif op_type == "set_auth_username":
                if not value:
                    raise HTTPException(status_code=400, detail="set_auth_username requires 'value'")
                set_commands.append(mapper.get_authentication_username(interface, value))

            elif op_type == "set_auth_password":
                if not value:
                    raise HTTPException(status_code=400, detail="set_auth_password requires 'value'")
                set_commands.append(mapper.get_authentication_password(interface, value))

            # ================================================================
            # Advanced Operations
            # ================================================================

            elif op_type == "set_keep_alive":
                interval = operation.get("interval")
                failure = operation.get("failure")
                if interval:
                    set_commands.append(mapper.get_keep_alive_interval(interface, str(interval)))
                if failure:
                    set_commands.append(mapper.get_keep_alive_failure(interface, str(failure)))

            elif op_type == "enable_persistent_tunnel":
                set_commands.append(mapper.get_persistent_tunnel(interface))

            elif op_type == "disable_persistent_tunnel":
                delete_commands.append(["interfaces", "openvpn", interface, "persistent-tunnel"])

            elif op_type == "enable_replace_default_route":
                set_commands.append(mapper.get_replace_default_route(interface))

            elif op_type == "disable_replace_default_route":
                delete_commands.append(["interfaces", "openvpn", interface, "replace-default-route"])

            elif op_type == "add_openvpn_option":
                if not value:
                    raise HTTPException(status_code=400, detail="add_openvpn_option requires 'value'")
                set_commands.append(mapper.get_openvpn_option(interface, value))

            elif op_type == "delete_openvpn_option":
                if not value:
                    raise HTTPException(status_code=400, detail="delete_openvpn_option requires 'value'")
                delete_commands.append(["interfaces", "openvpn", interface, "openvpn-option", value])

            elif op_type == "set_mtu":
                if not value:
                    raise HTTPException(status_code=400, detail="set_mtu requires 'value'")
                set_commands.append(mapper.get_ip_mtu(interface, str(value)))

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
