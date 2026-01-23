"""
IPsec VPN Configuration Endpoints

All IPsec VPN endpoints for VyOS configuration.
Supports site-to-site VPN with IKE/ESP groups.
"""

from fastapi import APIRouter, HTTPException, Request
from starlette.concurrency import run_in_threadpool
from pydantic import BaseModel, Field, ConfigDict
from typing import Dict, List, Optional, Any

from session_vyos_service import get_session_vyos_service
from fastapi_permissions import require_read_permission, require_write_permission
from rbac_permissions import FeatureGroup

# Router for IPsec VPN endpoints
router = APIRouter(prefix="/vyos/ipsec", tags=["ipsec-vpn"])


# ============================================================================
# Request Models (for WRITE operations)
# ============================================================================


class IPsecBatchRequest(BaseModel):
    """Model for batch IPsec configuration."""

    operations: List[Dict[str, Any]] = Field(
        ...,
        description="List of IPsec operations",
        json_schema_extra={
            "example": [
                {"op": "create_ike_group", "name": "IKE-GRP1"},
                {"op": "set_ike_group_key_exchange", "name": "IKE-GRP1", "value": "ikev2"},
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


class IKEProposal(BaseModel):
    """IKE proposal configuration."""
    id: str
    dh_group: Optional[str] = None
    encryption: Optional[str] = None
    hash: Optional[str] = None


class DeadPeerDetection(BaseModel):
    """Dead Peer Detection configuration."""
    action: Optional[str] = None
    interval: Optional[str] = None
    timeout: Optional[str] = None


class IKEGroup(BaseModel):
    """IKE group configuration."""
    name: str
    key_exchange: Optional[str] = None
    lifetime: Optional[str] = None
    proposals: List[IKEProposal] = Field(default_factory=list)
    dead_peer_detection: Optional[DeadPeerDetection] = None
    close_action: Optional[str] = None
    ikev2_reauth: bool = False
    mode: Optional[str] = None


class ESPProposal(BaseModel):
    """ESP proposal configuration."""
    id: str
    encryption: Optional[str] = None
    hash: Optional[str] = None


class ESPGroup(BaseModel):
    """ESP group configuration."""
    name: str
    lifetime: Optional[str] = None
    pfs: Optional[str] = None
    mode: str = "tunnel"
    compression: bool = False
    proposals: List[ESPProposal] = Field(default_factory=list)


class PeerAuthentication(BaseModel):
    """Peer authentication configuration."""
    mode: Optional[str] = None
    pre_shared_secret: Optional[str] = None
    local_id: Optional[str] = None
    remote_id: Optional[str] = None
    x509: Optional[Dict[str, str]] = None


class PeerTunnel(BaseModel):
    """Peer tunnel configuration."""
    id: str
    esp_group: Optional[str] = None
    local_prefix: Optional[str] = None
    remote_prefix: Optional[str] = None
    protocol: Optional[str] = None
    disable: bool = False


class PeerVTI(BaseModel):
    """Peer VTI configuration."""
    bind: Optional[str] = None
    esp_group: Optional[str] = None


class SiteToSitePeer(BaseModel):
    """Site-to-site peer configuration."""
    address: str
    authentication: Optional[PeerAuthentication] = None
    connection_type: Optional[str] = None
    default_esp_group: Optional[str] = None
    ike_group: Optional[str] = None
    local_address: Optional[str] = None
    description: Optional[str] = None
    disable: bool = False
    dhcp_interface: Optional[str] = None
    vti: Optional[PeerVTI] = None
    tunnels: List[PeerTunnel] = Field(default_factory=list)


class IPsecOptions(BaseModel):
    """IPsec global options."""
    disable_route_autoinstall: bool = False
    flexvpn: bool = False
    virtual_ips: List[str] = Field(default_factory=list)


class IPsecConfigResponse(BaseModel):
    """Full IPsec configuration response."""
    configured: bool
    ike_groups: List[IKEGroup] = Field(default_factory=list)
    esp_groups: List[ESPGroup] = Field(default_factory=list)
    peers: List[SiteToSitePeer] = Field(default_factory=list)
    interfaces: List[str] = Field(default_factory=list)
    options: Optional[IPsecOptions] = None

    model_config = ConfigDict(populate_by_name=True)


# ============================================================================
# READ Operations (GET)
# ============================================================================


@router.get("/config", response_model=IPsecConfigResponse)
async def get_ipsec_config(http_request: Request) -> IPsecConfigResponse:
    """
    Get full IPsec VPN configuration from VyOS.

    Returns IKE groups, ESP groups, site-to-site peers, and options.
    """
    await require_read_permission(http_request, FeatureGroup.VPN)

    from vyos_mappers.vpn.ipsec import IPsecMapper

    try:
        service = get_session_vyos_service(http_request)
        full_config = await run_in_threadpool(service.get_full_config)

        mapper = IPsecMapper(service.get_version())
        parsed_data = mapper.parse_full_config(full_config)

        return IPsecConfigResponse(**parsed_data)
    except KeyError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/capabilities")
async def get_ipsec_capabilities(http_request: Request) -> Dict[str, Any]:
    """
    Get IPsec capabilities for the connected VyOS version.

    Returns supported encryption algorithms, hash functions, DH groups, etc.
    """
    await require_read_permission(http_request, FeatureGroup.VPN)

    try:
        service = get_session_vyos_service(http_request)
        version = service.get_version()

        # IKE/ESP encryption algorithms
        encryptions = [
            {"value": "aes128", "label": "AES-128", "description": "AES 128-bit encryption"},
            {"value": "aes192", "label": "AES-192", "description": "AES 192-bit encryption"},
            {"value": "aes256", "label": "AES-256", "description": "AES 256-bit encryption"},
            {"value": "aes128gcm128", "label": "AES-128-GCM", "description": "AES 128-bit GCM (AEAD)"},
            {"value": "aes256gcm128", "label": "AES-256-GCM", "description": "AES 256-bit GCM (AEAD)"},
            {"value": "3des", "label": "3DES", "description": "Triple DES (legacy)"},
            {"value": "chacha20poly1305", "label": "ChaCha20-Poly1305", "description": "ChaCha20-Poly1305 AEAD"},
        ]

        # Hash algorithms
        hashes = [
            {"value": "sha1", "label": "SHA-1", "description": "SHA-1 (160-bit)"},
            {"value": "sha256", "label": "SHA-256", "description": "SHA-256 (256-bit)"},
            {"value": "sha384", "label": "SHA-384", "description": "SHA-384 (384-bit)"},
            {"value": "sha512", "label": "SHA-512", "description": "SHA-512 (512-bit)"},
            {"value": "md5", "label": "MD5", "description": "MD5 (legacy, not recommended)"},
        ]

        # DH groups
        dh_groups = [
            {"value": "1", "label": "Group 1", "description": "768-bit MODP (legacy)"},
            {"value": "2", "label": "Group 2", "description": "1024-bit MODP"},
            {"value": "5", "label": "Group 5", "description": "1536-bit MODP"},
            {"value": "14", "label": "Group 14", "description": "2048-bit MODP"},
            {"value": "15", "label": "Group 15", "description": "3072-bit MODP"},
            {"value": "16", "label": "Group 16", "description": "4096-bit MODP"},
            {"value": "19", "label": "Group 19", "description": "256-bit ECP"},
            {"value": "20", "label": "Group 20", "description": "384-bit ECP"},
            {"value": "21", "label": "Group 21", "description": "521-bit ECP"},
        ]

        # PFS options (same as DH groups plus disable/enable)
        pfs_options = [
            {"value": "disable", "label": "Disabled", "description": "No Perfect Forward Secrecy"},
            {"value": "enable", "label": "Default", "description": "Use IKE DH group"},
        ] + [{"value": f"dh-group{g['value']}", "label": f"DH {g['label']}", "description": g["description"]} for g in dh_groups]

        # Key exchange versions
        key_exchanges = [
            {"value": "ikev1", "label": "IKEv1", "description": "IKE version 1 (legacy)"},
            {"value": "ikev2", "label": "IKEv2", "description": "IKE version 2 (recommended)"},
        ]

        # Connection types
        connection_types = [
            {"value": "initiate", "label": "Initiate", "description": "Initiates the connection"},
            {"value": "respond", "label": "Respond", "description": "Only responds to connections"},
        ]

        # DPD actions
        dpd_actions = [
            {"value": "clear", "label": "Clear", "description": "Remove connection on timeout"},
            {"value": "hold", "label": "Hold", "description": "Hold connection and retry"},
            {"value": "restart", "label": "Restart", "description": "Restart connection on timeout"},
        ]

        # Authentication modes
        auth_modes = [
            {"value": "pre-shared-secret", "label": "Pre-Shared Key", "description": "PSK authentication"},
            {"value": "x509", "label": "X.509 Certificate", "description": "Certificate-based authentication"},
        ]

        # ESP modes
        esp_modes = [
            {"value": "tunnel", "label": "Tunnel", "description": "Tunnel mode (default)"},
            {"value": "transport", "label": "Transport", "description": "Transport mode"},
        ]

        return {
            "encryptions": encryptions,
            "hashes": hashes,
            "dh_groups": dh_groups,
            "pfs_options": pfs_options,
            "key_exchanges": key_exchanges,
            "connection_types": connection_types,
            "dpd_actions": dpd_actions,
            "auth_modes": auth_modes,
            "esp_modes": esp_modes,
            "default_lifetimes": {
                "ike": 28800,  # 8 hours
                "esp": 3600,  # 1 hour
            },
            "version": version,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/status")
async def get_ipsec_status(http_request: Request) -> Dict[str, Any]:
    """
    Get IPsec tunnel status (show vpn ipsec sa).
    """
    await require_read_permission(http_request, FeatureGroup.VPN)

    try:
        service = get_session_vyos_service(http_request)
        result = await run_in_threadpool(service.run_show_command, "show vpn ipsec sa")

        return {
            "success": True,
            "data": result,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/connections")
async def get_ipsec_connections(http_request: Request) -> Dict[str, Any]:
    """
    Get IPsec connection information.
    """
    await require_read_permission(http_request, FeatureGroup.VPN)

    try:
        service = get_session_vyos_service(http_request)
        result = await run_in_threadpool(service.run_show_command, "show vpn ipsec connections")

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
async def configure_ipsec_batch(http_request: Request, request: IPsecBatchRequest) -> VyOSResponse:
    """
    Configure IPsec VPN using batch operations.

    **IKE Group Operations:**

    | Operation | Parameters | Description |
    |-----------|------------|-------------|
    | `create_ike_group` | name | Create IKE group |
    | `delete_ike_group` | name | Delete IKE group |
    | `set_ike_group_key_exchange` | name, value | Set key exchange (ikev1/ikev2) |
    | `set_ike_group_lifetime` | name, value | Set IKE lifetime (seconds) |
    | `add_ike_group_proposal` | name, proposal, dh_group, encryption, hash | Add proposal |
    | `delete_ike_group_proposal` | name, proposal | Delete proposal |
    | `set_ike_group_dpd` | name, action, interval, timeout | Configure DPD |
    | `set_ike_group_close_action` | name, value | Set close action |
    | `enable_ike_group_ikev2_reauth` | name | Enable IKEv2 reauth |
    | `disable_ike_group_ikev2_reauth` | name | Disable IKEv2 reauth |

    **ESP Group Operations:**

    | Operation | Parameters | Description |
    |-----------|------------|-------------|
    | `create_esp_group` | name | Create ESP group |
    | `delete_esp_group` | name | Delete ESP group |
    | `set_esp_group_lifetime` | name, value | Set ESP lifetime (seconds) |
    | `set_esp_group_pfs` | name, value | Set PFS (dh-groupN or disable) |
    | `set_esp_group_mode` | name, value | Set mode (tunnel/transport) |
    | `add_esp_group_proposal` | name, proposal, encryption, hash | Add proposal |
    | `delete_esp_group_proposal` | name, proposal | Delete proposal |
    | `enable_esp_group_compression` | name | Enable compression |
    | `disable_esp_group_compression` | name | Disable compression |

    **Site-to-Site Peer Operations:**

    | Operation | Parameters | Description |
    |-----------|------------|-------------|
    | `create_peer` | peer | Create site-to-site peer |
    | `delete_peer` | peer | Delete peer |
    | `set_peer_auth_mode` | peer, value | Set auth mode (pre-shared-secret/x509) |
    | `set_peer_auth_psk` | peer, value | Set pre-shared key |
    | `set_peer_auth_local_id` | peer, value | Set local ID |
    | `set_peer_auth_remote_id` | peer, value | Set remote ID |
    | `set_peer_ike_group` | peer, value | Set IKE group |
    | `set_peer_default_esp_group` | peer, value | Set default ESP group |
    | `set_peer_local_address` | peer, value | Set local address |
    | `set_peer_connection_type` | peer, value | Set connection type |
    | `set_peer_description` | peer, value | Set description |
    | `disable_peer` | peer | Disable peer |
    | `enable_peer` | peer | Enable peer |
    | `add_peer_tunnel` | peer, tunnel, esp_group, local_prefix, remote_prefix | Add tunnel |
    | `delete_peer_tunnel` | peer, tunnel | Delete tunnel |
    | `set_peer_vti` | peer, bind, esp_group | Configure VTI |
    | `delete_peer_vti` | peer | Remove VTI |

    **Interface & Options Operations:**

    | Operation | Parameters | Description |
    |-----------|------------|-------------|
    | `add_ipsec_interface` | interface | Add IPsec interface |
    | `delete_ipsec_interface` | interface | Remove IPsec interface |
    | `enable_disable_route_autoinstall` | - | Disable route auto-install |
    | `disable_disable_route_autoinstall` | - | Enable route auto-install |
    | `enable_flexvpn` | - | Enable FlexVPN |
    | `disable_flexvpn` | - | Disable FlexVPN |
    """
    await require_write_permission(http_request, FeatureGroup.VPN)

    from vyos_mappers.vpn.ipsec import IPsecMapper

    try:
        service = get_session_vyos_service(http_request)
        mapper = IPsecMapper(service.get_version())

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
            name = operation.get("name")
            value = operation.get("value")
            peer = operation.get("peer")
            proposal = operation.get("proposal")
            tunnel = operation.get("tunnel")
            interface = operation.get("interface")

            # ================================================================
            # IKE Group Operations
            # ================================================================

            if op_type == "create_ike_group":
                if not name:
                    raise HTTPException(status_code=400, detail="create_ike_group requires 'name'")
                set_commands.append(mapper.get_ike_group(name))

            elif op_type == "delete_ike_group":
                if not name:
                    raise HTTPException(status_code=400, detail="delete_ike_group requires 'name'")
                delete_commands.append(mapper.get_ike_group(name))

            elif op_type == "set_ike_group_key_exchange":
                if not name or not value:
                    raise HTTPException(status_code=400, detail="set_ike_group_key_exchange requires 'name' and 'value'")
                set_commands.append(mapper.get_ike_group_key_exchange(name, value))

            elif op_type == "set_ike_group_lifetime":
                if not name or not value:
                    raise HTTPException(status_code=400, detail="set_ike_group_lifetime requires 'name' and 'value'")
                set_commands.append(mapper.get_ike_group_lifetime(name, str(value)))

            elif op_type == "add_ike_group_proposal":
                if not name or not proposal:
                    raise HTTPException(status_code=400, detail="add_ike_group_proposal requires 'name' and 'proposal'")
                set_commands.append(mapper.get_ike_group_proposal(name, proposal))
                if operation.get("dh_group"):
                    set_commands.append(mapper.get_ike_group_proposal_dh_group(name, proposal, operation["dh_group"]))
                if operation.get("encryption"):
                    set_commands.append(mapper.get_ike_group_proposal_encryption(name, proposal, operation["encryption"]))
                if operation.get("hash"):
                    set_commands.append(mapper.get_ike_group_proposal_hash(name, proposal, operation["hash"]))

            elif op_type == "delete_ike_group_proposal":
                if not name or not proposal:
                    raise HTTPException(status_code=400, detail="delete_ike_group_proposal requires 'name' and 'proposal'")
                delete_commands.append(mapper.get_ike_group_proposal(name, proposal))

            elif op_type == "set_ike_group_dpd":
                if not name:
                    raise HTTPException(status_code=400, detail="set_ike_group_dpd requires 'name'")
                if operation.get("action"):
                    set_commands.append(mapper.get_ike_group_dpd_action(name, operation["action"]))
                if operation.get("interval"):
                    set_commands.append(mapper.get_ike_group_dpd_interval(name, str(operation["interval"])))
                if operation.get("timeout"):
                    set_commands.append(mapper.get_ike_group_dpd_timeout(name, str(operation["timeout"])))

            elif op_type == "set_ike_group_close_action":
                if not name or not value:
                    raise HTTPException(status_code=400, detail="set_ike_group_close_action requires 'name' and 'value'")
                set_commands.append(mapper.get_ike_group_close_action(name, value))

            elif op_type == "enable_ike_group_ikev2_reauth":
                if not name:
                    raise HTTPException(status_code=400, detail="enable_ike_group_ikev2_reauth requires 'name'")
                set_commands.append(mapper.get_ike_group_ikev2_reauth(name))

            elif op_type == "disable_ike_group_ikev2_reauth":
                if not name:
                    raise HTTPException(status_code=400, detail="disable_ike_group_ikev2_reauth requires 'name'")
                delete_commands.append(mapper.get_ike_group_ikev2_reauth(name))

            elif op_type == "set_ike_group_mode":
                if not name or not value:
                    raise HTTPException(status_code=400, detail="set_ike_group_mode requires 'name' and 'value'")
                set_commands.append(mapper.get_ike_group_mode(name, value))

            # ================================================================
            # ESP Group Operations
            # ================================================================

            elif op_type == "create_esp_group":
                if not name:
                    raise HTTPException(status_code=400, detail="create_esp_group requires 'name'")
                set_commands.append(mapper.get_esp_group(name))

            elif op_type == "delete_esp_group":
                if not name:
                    raise HTTPException(status_code=400, detail="delete_esp_group requires 'name'")
                delete_commands.append(mapper.get_esp_group(name))

            elif op_type == "set_esp_group_lifetime":
                if not name or not value:
                    raise HTTPException(status_code=400, detail="set_esp_group_lifetime requires 'name' and 'value'")
                set_commands.append(mapper.get_esp_group_lifetime(name, str(value)))

            elif op_type == "set_esp_group_pfs":
                if not name or not value:
                    raise HTTPException(status_code=400, detail="set_esp_group_pfs requires 'name' and 'value'")
                set_commands.append(mapper.get_esp_group_pfs(name, value))

            elif op_type == "set_esp_group_mode":
                if not name or not value:
                    raise HTTPException(status_code=400, detail="set_esp_group_mode requires 'name' and 'value'")
                set_commands.append(mapper.get_esp_group_mode(name, value))

            elif op_type == "add_esp_group_proposal":
                if not name or not proposal:
                    raise HTTPException(status_code=400, detail="add_esp_group_proposal requires 'name' and 'proposal'")
                set_commands.append(mapper.get_esp_group_proposal(name, proposal))
                if operation.get("encryption"):
                    set_commands.append(mapper.get_esp_group_proposal_encryption(name, proposal, operation["encryption"]))
                if operation.get("hash"):
                    set_commands.append(mapper.get_esp_group_proposal_hash(name, proposal, operation["hash"]))

            elif op_type == "delete_esp_group_proposal":
                if not name or not proposal:
                    raise HTTPException(status_code=400, detail="delete_esp_group_proposal requires 'name' and 'proposal'")
                delete_commands.append(mapper.get_esp_group_proposal(name, proposal))

            elif op_type == "enable_esp_group_compression":
                if not name:
                    raise HTTPException(status_code=400, detail="enable_esp_group_compression requires 'name'")
                set_commands.append(mapper.get_esp_group_compression(name))

            elif op_type == "disable_esp_group_compression":
                if not name:
                    raise HTTPException(status_code=400, detail="disable_esp_group_compression requires 'name'")
                delete_commands.append(mapper.get_esp_group_compression(name))

            # ================================================================
            # Site-to-Site Peer Operations
            # ================================================================

            elif op_type == "create_peer":
                if not peer:
                    raise HTTPException(status_code=400, detail="create_peer requires 'peer'")
                set_commands.append(mapper.get_site_to_site_peer(peer))

            elif op_type == "delete_peer":
                if not peer:
                    raise HTTPException(status_code=400, detail="delete_peer requires 'peer'")
                delete_commands.append(mapper.get_site_to_site_peer(peer))

            elif op_type == "set_peer_auth_mode":
                if not peer or not value:
                    raise HTTPException(status_code=400, detail="set_peer_auth_mode requires 'peer' and 'value'")
                set_commands.append(mapper.get_peer_authentication_mode(peer, value))

            elif op_type == "set_peer_auth_psk":
                if not peer or not value:
                    raise HTTPException(status_code=400, detail="set_peer_auth_psk requires 'peer' and 'value'")
                set_commands.append(mapper.get_peer_authentication_psk(peer, value))

            elif op_type == "set_peer_auth_local_id":
                if not peer or not value:
                    raise HTTPException(status_code=400, detail="set_peer_auth_local_id requires 'peer' and 'value'")
                set_commands.append(mapper.get_peer_authentication_local_id(peer, value))

            elif op_type == "set_peer_auth_remote_id":
                if not peer or not value:
                    raise HTTPException(status_code=400, detail="set_peer_auth_remote_id requires 'peer' and 'value'")
                set_commands.append(mapper.get_peer_authentication_remote_id(peer, value))

            elif op_type == "set_peer_ike_group":
                if not peer or not value:
                    raise HTTPException(status_code=400, detail="set_peer_ike_group requires 'peer' and 'value'")
                set_commands.append(mapper.get_peer_ike_group(peer, value))

            elif op_type == "set_peer_default_esp_group":
                if not peer or not value:
                    raise HTTPException(status_code=400, detail="set_peer_default_esp_group requires 'peer' and 'value'")
                set_commands.append(mapper.get_peer_default_esp_group(peer, value))

            elif op_type == "set_peer_local_address":
                if not peer or not value:
                    raise HTTPException(status_code=400, detail="set_peer_local_address requires 'peer' and 'value'")
                set_commands.append(mapper.get_peer_local_address(peer, value))

            elif op_type == "set_peer_connection_type":
                if not peer or not value:
                    raise HTTPException(status_code=400, detail="set_peer_connection_type requires 'peer' and 'value'")
                set_commands.append(mapper.get_peer_connection_type(peer, value))

            elif op_type == "set_peer_description":
                if not peer or not value:
                    raise HTTPException(status_code=400, detail="set_peer_description requires 'peer' and 'value'")
                set_commands.append(mapper.get_peer_description(peer, value))

            elif op_type == "delete_peer_description":
                if not peer:
                    raise HTTPException(status_code=400, detail="delete_peer_description requires 'peer'")
                delete_commands.append(mapper.get_peer_description_path(peer))

            elif op_type == "disable_peer":
                if not peer:
                    raise HTTPException(status_code=400, detail="disable_peer requires 'peer'")
                set_commands.append(mapper.get_peer_disable(peer))

            elif op_type == "enable_peer":
                if not peer:
                    raise HTTPException(status_code=400, detail="enable_peer requires 'peer'")
                delete_commands.append(mapper.get_peer_disable(peer))

            elif op_type == "set_peer_dhcp_interface":
                if not peer or not interface:
                    raise HTTPException(status_code=400, detail="set_peer_dhcp_interface requires 'peer' and 'interface'")
                set_commands.append(mapper.get_peer_dhcp_interface(peer, interface))

            elif op_type == "add_peer_tunnel":
                if not peer or not tunnel:
                    raise HTTPException(status_code=400, detail="add_peer_tunnel requires 'peer' and 'tunnel'")
                set_commands.append(mapper.get_peer_tunnel(peer, tunnel))
                if operation.get("esp_group"):
                    set_commands.append(mapper.get_peer_tunnel_esp_group(peer, tunnel, operation["esp_group"]))
                if operation.get("local_prefix"):
                    set_commands.append(mapper.get_peer_tunnel_local_prefix(peer, tunnel, operation["local_prefix"]))
                if operation.get("remote_prefix"):
                    set_commands.append(mapper.get_peer_tunnel_remote_prefix(peer, tunnel, operation["remote_prefix"]))
                if operation.get("protocol"):
                    set_commands.append(mapper.get_peer_tunnel_protocol(peer, tunnel, operation["protocol"]))

            elif op_type == "delete_peer_tunnel":
                if not peer or not tunnel:
                    raise HTTPException(status_code=400, detail="delete_peer_tunnel requires 'peer' and 'tunnel'")
                delete_commands.append(mapper.get_peer_tunnel(peer, tunnel))

            elif op_type == "disable_peer_tunnel":
                if not peer or not tunnel:
                    raise HTTPException(status_code=400, detail="disable_peer_tunnel requires 'peer' and 'tunnel'")
                set_commands.append(mapper.get_peer_tunnel_disable(peer, tunnel))

            elif op_type == "enable_peer_tunnel":
                if not peer or not tunnel:
                    raise HTTPException(status_code=400, detail="enable_peer_tunnel requires 'peer' and 'tunnel'")
                delete_commands.append(mapper.get_peer_tunnel_disable(peer, tunnel))

            elif op_type == "set_peer_vti":
                if not peer:
                    raise HTTPException(status_code=400, detail="set_peer_vti requires 'peer'")
                if operation.get("bind"):
                    set_commands.append(mapper.get_peer_vti_bind(peer, operation["bind"]))
                if operation.get("esp_group"):
                    set_commands.append(mapper.get_peer_vti_esp_group(peer, operation["esp_group"]))

            elif op_type == "delete_peer_vti":
                if not peer:
                    raise HTTPException(status_code=400, detail="delete_peer_vti requires 'peer'")
                delete_commands.append(["vpn", "ipsec", "site-to-site", "peer", peer, "vti"])

            # ================================================================
            # Interface Operations
            # ================================================================

            elif op_type == "add_ipsec_interface":
                if not interface:
                    raise HTTPException(status_code=400, detail="add_ipsec_interface requires 'interface'")
                set_commands.append(mapper.get_ipsec_interface(interface))

            elif op_type == "delete_ipsec_interface":
                if not interface:
                    raise HTTPException(status_code=400, detail="delete_ipsec_interface requires 'interface'")
                delete_commands.append(mapper.get_ipsec_interface(interface))

            # ================================================================
            # Options Operations
            # ================================================================

            elif op_type == "enable_disable_route_autoinstall":
                set_commands.append(mapper.get_options_disable_route_autoinstall())

            elif op_type == "disable_disable_route_autoinstall":
                delete_commands.append(mapper.get_options_disable_route_autoinstall())

            elif op_type == "enable_flexvpn":
                set_commands.append(mapper.get_options_flexvpn())

            elif op_type == "disable_flexvpn":
                delete_commands.append(mapper.get_options_flexvpn())

            elif op_type == "add_virtual_ip":
                if not value:
                    raise HTTPException(status_code=400, detail="add_virtual_ip requires 'value'")
                set_commands.append(mapper.get_options_virtual_ip(value))

            elif op_type == "delete_virtual_ip":
                if not value:
                    raise HTTPException(status_code=400, detail="delete_virtual_ip requires 'value'")
                delete_commands.append(mapper.get_options_virtual_ip(value))

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
