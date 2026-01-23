"""
SSH Service Configuration Endpoints

All SSH service endpoints for VyOS configuration.
Supports SSH server settings, access control, and security options.
"""

from fastapi import APIRouter, HTTPException, Request
from starlette.concurrency import run_in_threadpool
from pydantic import BaseModel, Field, ConfigDict
from typing import Dict, List, Optional, Any

from session_vyos_service import get_session_vyos_service
from fastapi_permissions import require_read_permission, require_write_permission
from rbac_permissions import FeatureGroup

# Router for SSH Service endpoints
router = APIRouter(prefix="/vyos/ssh", tags=["ssh-service"])


# ============================================================================
# Request Models (for WRITE operations)
# ============================================================================


class SSHBatchRequest(BaseModel):
    """Model for batch SSH configuration."""

    operations: List[Dict[str, Any]] = Field(
        ...,
        description="List of SSH operations",
        json_schema_extra={
            "example": [
                {"op": "set_port", "port": "22"},
                {"op": "add_listen_address", "address": "192.168.1.1"},
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


class AccessControlEntry(BaseModel):
    """Access control entry."""
    users: List[str] = Field(default_factory=list)
    groups: List[str] = Field(default_factory=list)


class AccessControl(BaseModel):
    """SSH access control configuration."""
    allow: AccessControlEntry = Field(default_factory=AccessControlEntry)
    deny: AccessControlEntry = Field(default_factory=AccessControlEntry)


class DynamicProtection(BaseModel):
    """SSH dynamic protection configuration."""
    enabled: bool = True
    allow_from: List[str] = Field(default_factory=list)
    block_time: Optional[str] = None
    detect_time: Optional[str] = None
    threshold: Optional[str] = None


class SSHConfigResponse(BaseModel):
    """Full SSH configuration response."""
    configured: bool
    port: Optional[str] = None
    listen_addresses: List[str] = Field(default_factory=list)
    disable: bool = False
    access_control: AccessControl = Field(default_factory=AccessControl)
    disable_password_authentication: bool = False
    disable_host_validation: bool = False
    ciphers: List[str] = Field(default_factory=list)
    key_exchanges: List[str] = Field(default_factory=list)
    macs: List[str] = Field(default_factory=list)
    client_keepalive_interval: Optional[str] = None
    loglevel: Optional[str] = None
    dynamic_protection: Optional[DynamicProtection] = None
    vrf: Optional[str] = None

    model_config = ConfigDict(populate_by_name=True)


# ============================================================================
# READ Operations (GET)
# ============================================================================


@router.get("/config", response_model=SSHConfigResponse)
async def get_ssh_config(http_request: Request) -> SSHConfigResponse:
    """
    Get full SSH configuration from VyOS.

    Returns port, listen addresses, access control, ciphers, and settings.
    """
    await require_read_permission(http_request, FeatureGroup.SSH)

    from vyos_mappers.services.ssh import SSHMapper

    try:
        service = get_session_vyos_service(http_request)
        full_config = await run_in_threadpool(service.get_full_config)

        mapper = SSHMapper(service.get_version())
        parsed_data = mapper.parse_full_config(full_config)

        return SSHConfigResponse(**parsed_data)
    except KeyError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/capabilities")
async def get_ssh_capabilities(http_request: Request) -> Dict[str, Any]:
    """
    Get SSH capabilities for the connected VyOS version.

    Returns supported ciphers, key exchanges, MACs, and log levels.
    """
    await require_read_permission(http_request, FeatureGroup.SSH)

    try:
        service = get_session_vyos_service(http_request)
        version = service.get_version()

        # Ciphers
        ciphers = [
            {"value": "aes128-ctr", "label": "AES-128-CTR", "description": "AES 128-bit counter mode"},
            {"value": "aes192-ctr", "label": "AES-192-CTR", "description": "AES 192-bit counter mode"},
            {"value": "aes256-ctr", "label": "AES-256-CTR", "description": "AES 256-bit counter mode"},
            {"value": "aes128-gcm@openssh.com", "label": "AES-128-GCM", "description": "AES 128-bit GCM"},
            {"value": "aes256-gcm@openssh.com", "label": "AES-256-GCM", "description": "AES 256-bit GCM"},
            {"value": "chacha20-poly1305@openssh.com", "label": "ChaCha20-Poly1305", "description": "ChaCha20-Poly1305"},
        ]

        # Key exchanges
        key_exchanges = [
            {"value": "curve25519-sha256", "label": "Curve25519-SHA256", "description": "Curve25519 with SHA-256"},
            {"value": "curve25519-sha256@libssh.org", "label": "Curve25519-SHA256 (libssh)", "description": "Curve25519 with SHA-256 (libssh)"},
            {"value": "diffie-hellman-group14-sha256", "label": "DH-Group14-SHA256", "description": "DH Group 14 with SHA-256"},
            {"value": "diffie-hellman-group16-sha512", "label": "DH-Group16-SHA512", "description": "DH Group 16 with SHA-512"},
            {"value": "diffie-hellman-group18-sha512", "label": "DH-Group18-SHA512", "description": "DH Group 18 with SHA-512"},
            {"value": "ecdh-sha2-nistp256", "label": "ECDH-SHA2-NISTP256", "description": "ECDH with NIST P-256"},
            {"value": "ecdh-sha2-nistp384", "label": "ECDH-SHA2-NISTP384", "description": "ECDH with NIST P-384"},
            {"value": "ecdh-sha2-nistp521", "label": "ECDH-SHA2-NISTP521", "description": "ECDH with NIST P-521"},
        ]

        # MACs
        macs = [
            {"value": "hmac-sha2-256", "label": "HMAC-SHA2-256", "description": "HMAC with SHA-256"},
            {"value": "hmac-sha2-512", "label": "HMAC-SHA2-512", "description": "HMAC with SHA-512"},
            {"value": "hmac-sha2-256-etm@openssh.com", "label": "HMAC-SHA2-256-ETM", "description": "HMAC-SHA2-256 Encrypt-then-MAC"},
            {"value": "hmac-sha2-512-etm@openssh.com", "label": "HMAC-SHA2-512-ETM", "description": "HMAC-SHA2-512 Encrypt-then-MAC"},
            {"value": "umac-128-etm@openssh.com", "label": "UMAC-128-ETM", "description": "UMAC-128 Encrypt-then-MAC"},
        ]

        # Log levels
        log_levels = [
            {"value": "QUIET", "label": "Quiet", "description": "Minimal logging"},
            {"value": "FATAL", "label": "Fatal", "description": "Fatal errors only"},
            {"value": "ERROR", "label": "Error", "description": "Errors only"},
            {"value": "INFO", "label": "Info", "description": "Informational messages"},
            {"value": "VERBOSE", "label": "Verbose", "description": "Verbose logging"},
            {"value": "DEBUG", "label": "Debug", "description": "Debug logging"},
            {"value": "DEBUG1", "label": "Debug1", "description": "Debug level 1"},
            {"value": "DEBUG2", "label": "Debug2", "description": "Debug level 2"},
            {"value": "DEBUG3", "label": "Debug3", "description": "Debug level 3"},
        ]

        return {
            "ciphers": ciphers,
            "key_exchanges": key_exchanges,
            "macs": macs,
            "log_levels": log_levels,
            "defaults": {
                "port": 22,
                "client_keepalive_interval": 180,
            },
            "dynamic_protection_defaults": {
                "block_time": 120,
                "detect_time": 1800,
                "threshold": 30,
            },
            "version": version,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# WRITE Operations (POST)
# ============================================================================


@router.post("/batch")
async def configure_ssh_batch(http_request: Request, request: SSHBatchRequest) -> VyOSResponse:
    """
    Configure SSH using batch operations.

    **Basic Operations:**

    | Operation | Parameters | Description |
    |-----------|------------|-------------|
    | `set_port` | port | Set SSH port |
    | `delete_port` | port | Remove port |
    | `add_listen_address` | address | Add listen address |
    | `delete_listen_address` | address | Remove listen address |
    | `enable_ssh` | - | Enable SSH service |
    | `disable_ssh` | - | Disable SSH service |

    **Access Control Operations:**

    | Operation | Parameters | Description |
    |-----------|------------|-------------|
    | `allow_user` | user | Allow user access |
    | `deny_user` | user | Deny user access |
    | `allow_group` | group | Allow group access |
    | `deny_group` | group | Deny group access |
    | `delete_allow_user` | user | Remove user from allow list |
    | `delete_deny_user` | user | Remove user from deny list |
    | `delete_allow_group` | group | Remove group from allow list |
    | `delete_deny_group` | group | Remove group from deny list |

    **Authentication Operations:**

    | Operation | Parameters | Description |
    |-----------|------------|-------------|
    | `disable_password_auth` | - | Disable password authentication |
    | `enable_password_auth` | - | Enable password authentication |
    | `disable_host_validation` | - | Disable host validation |
    | `enable_host_validation` | - | Enable host validation |

    **Cipher & MAC Operations:**

    | Operation | Parameters | Description |
    |-----------|------------|-------------|
    | `add_cipher` | cipher | Add cipher |
    | `delete_cipher` | cipher | Remove cipher |
    | `add_key_exchange` | kex | Add key exchange algorithm |
    | `delete_key_exchange` | kex | Remove key exchange algorithm |
    | `add_mac` | mac | Add MAC algorithm |
    | `delete_mac` | mac | Remove MAC algorithm |

    **Session Operations:**

    | Operation | Parameters | Description |
    |-----------|------------|-------------|
    | `set_keepalive_interval` | value | Set client keepalive interval |
    | `delete_keepalive_interval` | - | Remove keepalive interval |
    | `set_loglevel` | level | Set log level |
    | `delete_loglevel` | - | Remove log level setting |

    **Dynamic Protection Operations:**

    | Operation | Parameters | Description |
    |-----------|------------|-------------|
    | `enable_dynamic_protection` | - | Enable dynamic protection |
    | `disable_dynamic_protection` | - | Disable dynamic protection |
    | `add_dp_allow_from` | network | Add network to allow list |
    | `delete_dp_allow_from` | network | Remove network from allow list |
    | `set_dp_block_time` | value | Set block time |
    | `set_dp_detect_time` | value | Set detect time |
    | `set_dp_threshold` | value | Set threshold |

    **VRF Operations:**

    | Operation | Parameters | Description |
    |-----------|------------|-------------|
    | `set_vrf` | vrf | Set VRF |
    | `delete_vrf` | - | Remove VRF |
    """
    await require_write_permission(http_request, FeatureGroup.SSH)

    from vyos_mappers.services.ssh import SSHMapper

    try:
        service = get_session_vyos_service(http_request)
        mapper = SSHMapper(service.get_version())

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
            port = operation.get("port")
            address = operation.get("address")
            user = operation.get("user")
            group = operation.get("group")
            cipher = operation.get("cipher")
            kex = operation.get("kex")
            mac = operation.get("mac")
            value = operation.get("value")
            level = operation.get("level")
            network = operation.get("network")
            vrf = operation.get("vrf")

            # ================================================================
            # Basic Operations
            # ================================================================

            if op_type == "set_port":
                if not port:
                    raise HTTPException(status_code=400, detail="set_port requires 'port'")
                set_commands.append(mapper.get_port(str(port)))

            elif op_type == "delete_port":
                if not port:
                    raise HTTPException(status_code=400, detail="delete_port requires 'port'")
                delete_commands.append(mapper.get_port(str(port)))

            elif op_type == "add_listen_address":
                if not address:
                    raise HTTPException(status_code=400, detail="add_listen_address requires 'address'")
                set_commands.append(mapper.get_listen_address(address))

            elif op_type == "delete_listen_address":
                if not address:
                    raise HTTPException(status_code=400, detail="delete_listen_address requires 'address'")
                delete_commands.append(mapper.get_listen_address(address))

            elif op_type == "enable_ssh":
                delete_commands.append(mapper.get_disable())

            elif op_type == "disable_ssh":
                set_commands.append(mapper.get_disable())

            # ================================================================
            # Access Control Operations
            # ================================================================

            elif op_type == "allow_user":
                if not user:
                    raise HTTPException(status_code=400, detail="allow_user requires 'user'")
                set_commands.append(mapper.get_access_control_allow_user(user))

            elif op_type == "deny_user":
                if not user:
                    raise HTTPException(status_code=400, detail="deny_user requires 'user'")
                set_commands.append(mapper.get_access_control_deny_user(user))

            elif op_type == "allow_group":
                if not group:
                    raise HTTPException(status_code=400, detail="allow_group requires 'group'")
                set_commands.append(mapper.get_access_control_allow_group(group))

            elif op_type == "deny_group":
                if not group:
                    raise HTTPException(status_code=400, detail="deny_group requires 'group'")
                set_commands.append(mapper.get_access_control_deny_group(group))

            elif op_type == "delete_allow_user":
                if not user:
                    raise HTTPException(status_code=400, detail="delete_allow_user requires 'user'")
                delete_commands.append(mapper.get_access_control_allow_user(user))

            elif op_type == "delete_deny_user":
                if not user:
                    raise HTTPException(status_code=400, detail="delete_deny_user requires 'user'")
                delete_commands.append(mapper.get_access_control_deny_user(user))

            elif op_type == "delete_allow_group":
                if not group:
                    raise HTTPException(status_code=400, detail="delete_allow_group requires 'group'")
                delete_commands.append(mapper.get_access_control_allow_group(group))

            elif op_type == "delete_deny_group":
                if not group:
                    raise HTTPException(status_code=400, detail="delete_deny_group requires 'group'")
                delete_commands.append(mapper.get_access_control_deny_group(group))

            # ================================================================
            # Authentication Operations
            # ================================================================

            elif op_type == "disable_password_auth":
                set_commands.append(mapper.get_disable_password_authentication())

            elif op_type == "enable_password_auth":
                delete_commands.append(mapper.get_disable_password_authentication())

            elif op_type == "disable_host_validation":
                set_commands.append(mapper.get_disable_host_validation())

            elif op_type == "enable_host_validation":
                delete_commands.append(mapper.get_disable_host_validation())

            # ================================================================
            # Cipher & MAC Operations
            # ================================================================

            elif op_type == "add_cipher":
                if not cipher:
                    raise HTTPException(status_code=400, detail="add_cipher requires 'cipher'")
                set_commands.append(mapper.get_cipher(cipher))

            elif op_type == "delete_cipher":
                if not cipher:
                    raise HTTPException(status_code=400, detail="delete_cipher requires 'cipher'")
                delete_commands.append(mapper.get_cipher(cipher))

            elif op_type == "add_key_exchange":
                if not kex:
                    raise HTTPException(status_code=400, detail="add_key_exchange requires 'kex'")
                set_commands.append(mapper.get_key_exchange(kex))

            elif op_type == "delete_key_exchange":
                if not kex:
                    raise HTTPException(status_code=400, detail="delete_key_exchange requires 'kex'")
                delete_commands.append(mapper.get_key_exchange(kex))

            elif op_type == "add_mac":
                if not mac:
                    raise HTTPException(status_code=400, detail="add_mac requires 'mac'")
                set_commands.append(mapper.get_mac(mac))

            elif op_type == "delete_mac":
                if not mac:
                    raise HTTPException(status_code=400, detail="delete_mac requires 'mac'")
                delete_commands.append(mapper.get_mac(mac))

            # ================================================================
            # Session Operations
            # ================================================================

            elif op_type == "set_keepalive_interval":
                if not value:
                    raise HTTPException(status_code=400, detail="set_keepalive_interval requires 'value'")
                set_commands.append(mapper.get_client_keepalive_interval(str(value)))

            elif op_type == "delete_keepalive_interval":
                delete_commands.append(["service", "ssh", "client-keepalive-interval"])

            elif op_type == "set_loglevel":
                if not level:
                    raise HTTPException(status_code=400, detail="set_loglevel requires 'level'")
                set_commands.append(mapper.get_loglevel(level))

            elif op_type == "delete_loglevel":
                delete_commands.append(["service", "ssh", "loglevel"])

            # ================================================================
            # Dynamic Protection Operations
            # ================================================================

            elif op_type == "enable_dynamic_protection":
                set_commands.append(mapper.get_dynamic_protection())

            elif op_type == "disable_dynamic_protection":
                delete_commands.append(mapper.get_dynamic_protection())

            elif op_type == "add_dp_allow_from":
                if not network:
                    raise HTTPException(status_code=400, detail="add_dp_allow_from requires 'network'")
                set_commands.append(mapper.get_dynamic_protection_allow_from(network))

            elif op_type == "delete_dp_allow_from":
                if not network:
                    raise HTTPException(status_code=400, detail="delete_dp_allow_from requires 'network'")
                delete_commands.append(mapper.get_dynamic_protection_allow_from(network))

            elif op_type == "set_dp_block_time":
                if not value:
                    raise HTTPException(status_code=400, detail="set_dp_block_time requires 'value'")
                set_commands.append(mapper.get_dynamic_protection_block_time(str(value)))

            elif op_type == "set_dp_detect_time":
                if not value:
                    raise HTTPException(status_code=400, detail="set_dp_detect_time requires 'value'")
                set_commands.append(mapper.get_dynamic_protection_detect_time(str(value)))

            elif op_type == "set_dp_threshold":
                if not value:
                    raise HTTPException(status_code=400, detail="set_dp_threshold requires 'value'")
                set_commands.append(mapper.get_dynamic_protection_threshold(str(value)))

            # ================================================================
            # VRF Operations
            # ================================================================

            elif op_type == "set_vrf":
                if not vrf:
                    raise HTTPException(status_code=400, detail="set_vrf requires 'vrf'")
                set_commands.append(mapper.get_vrf(vrf))

            elif op_type == "delete_vrf":
                delete_commands.append(["service", "ssh", "vrf"])

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
