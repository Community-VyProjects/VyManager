"""
Ethernet Interface Configuration Endpoints

All ethernet-specific endpoints for VyOS configuration.
"""

from fastapi import APIRouter, HTTPException, Request
from starlette.concurrency import run_in_threadpool
from pydantic import BaseModel, Field, ConfigDict
from typing import Dict, List, Optional, Any

from session_vyos_service import get_session_vyos_service

# Router for ethernet interface endpoints
router = APIRouter(prefix="/vyos/ethernet", tags=["ethernet-interface"])


# Stub functions for backwards compatibility with app.py
# These are no longer used since we use session-based services
def set_device_registry(registry):
    """Legacy function - no longer used."""
    pass


def set_configured_device_name(name):
    """Legacy function - no longer used."""
    pass


# ============================================================================
# Request Models (for WRITE operations)
# ============================================================================


class InterfaceDescription(BaseModel):
    """Model for setting interface description."""

    interface: str = Field(..., description="Interface name (e.g., eth0)")
    description: str = Field(..., description="Interface description")


class InterfaceDelete(BaseModel):
    """Model for deleting an interface."""

    interface: str = Field(..., description="Interface name (e.g., eth0)")


class InterfaceAddress(BaseModel):
    """Model for interface address operations."""

    interface: str = Field(..., description="Interface name (e.g., eth0)")
    address: str = Field(..., description="IP address in CIDR notation (e.g., 10.0.0.1/24)")


class InterfaceMTU(BaseModel):
    """Model for setting interface MTU."""

    interface: str = Field(..., description="Interface name (e.g., eth0)")
    mtu: str = Field(..., description="MTU value (e.g., 1500)")


class InterfaceVRF(BaseModel):
    """Model for VRF assignment."""

    interface: str = Field(..., description="Interface name (e.g., eth0)")
    vrf: str = Field(..., description="VRF name")


class InterfaceDisable(BaseModel):
    """Model for disabling an interface."""

    interface: str = Field(..., description="Interface name (e.g., eth0)")


class InterfaceBatchRequest(BaseModel):
    """Model for batch interface configuration."""

    interface: str = Field(..., description="Interface name (e.g., eth0)")
    operations: List[Dict[str, str]] = Field(
        ...,
        description="List of interface operations",
        json_schema_extra={
            "example": [
                {"op": "set_description", "value": "WAN Interface"},
                {"op": "set_address", "value": "10.0.0.1/24"},
                {"op": "set_mtu", "value": "1500"}
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


# Nested models for complex configuration sections
class OffloadConfig(BaseModel):
    """Hardware offload settings"""
    gro: Optional[str] = None
    gso: Optional[str] = None
    lro: Optional[str] = None
    rps: Optional[str] = None
    sg: Optional[str] = None
    tso: Optional[str] = None

class RingBufferConfig(BaseModel):
    """Ring buffer settings"""
    rx: Optional[str] = None
    tx: Optional[str] = None

class IPConfig(BaseModel):
    """IP configuration settings"""
    adjust_mss: Optional[str] = None
    arp_cache_timeout: Optional[str] = None
    disable_arp_filter: Optional[bool] = None
    enable_arp_accept: Optional[bool] = None
    enable_arp_announce: Optional[bool] = None
    enable_arp_ignore: Optional[bool] = None
    enable_proxy_arp: Optional[bool] = None
    proxy_arp_pvlan: Optional[bool] = None
    source_validation: Optional[str] = None
    enable_directed_broadcast: Optional[bool] = None

class IPv6Config(BaseModel):
    """IPv6 configuration settings"""
    address: Optional[List[str]] = None
    adjust_mss: Optional[str] = None
    disable_forwarding: Optional[bool] = None
    dup_addr_detect_transmits: Optional[str] = None

class DHCPOptionsConfig(BaseModel):
    """DHCP options"""
    client_id: Optional[str] = None
    host_name: Optional[str] = None
    vendor_class_id: Optional[str] = None
    no_default_route: Optional[bool] = None
    default_route_distance: Optional[str] = None

class DHCPv6OptionsConfig(BaseModel):
    """DHCPv6 options"""
    duid: Optional[str] = None
    rapid_commit: Optional[bool] = None
    pd: Optional[Dict] = None

class VIFConfig(BaseModel):
    """VLAN sub-interface (VIF) configuration"""
    vlan_id: str
    addresses: List[str] = Field(default_factory=list)
    description: Optional[str] = None
    mtu: Optional[str] = None
    mac: Optional[str] = None
    vrf: Optional[str] = None
    disable: Optional[bool] = None

class VIFSConfig(BaseModel):
    """QinQ service VLAN (VIF-S) configuration"""
    vlan_id: str
    addresses: List[str] = Field(default_factory=list)
    description: Optional[str] = None
    mtu: Optional[str] = None
    mac: Optional[str] = None
    vrf: Optional[str] = None
    disable: Optional[bool] = None
    vif_c: Optional[List[VIFConfig]] = None

class MirrorConfig(BaseModel):
    """Port mirroring configuration"""
    ingress: Optional[str] = None
    egress: Optional[str] = None

class EAPoLConfig(BaseModel):
    """802.1X EAPoL configuration"""
    ca_cert_file: Optional[str] = None
    cert_file: Optional[str] = None
    key_file: Optional[str] = None

class EVPNConfig(BaseModel):
    """EVPN configuration"""
    uplink: Optional[bool] = None

class EthernetInterfaceConfigResponse(BaseModel):
    """Ethernet interface configuration from VyOS (read operation)"""

    name: str = Field(..., description="Interface name (e.g., eth0)")
    type: str = Field(..., description="Interface type (ethernet)")
    addresses: List[str] = Field(default_factory=list, description="IP addresses with CIDR notation")
    description: Optional[str] = Field(None, description="Interface description")
    vrf: Optional[str] = Field(None, description="VRF assignment")
    mtu: Optional[str] = Field(None, description="MTU value")

    # Ethernet-specific fields
    hw_id: Optional[str] = Field(None, description="Hardware MAC address")
    mac: Optional[str] = Field(None, description="Configured MAC address")
    duplex: Optional[str] = Field(None, description="Duplex setting (auto/half/full)")
    speed: Optional[str] = Field(None, description="Speed setting (auto/10/100/1000/etc)")

    # Administrative state
    disable: Optional[bool] = Field(None, description="Whether interface is administratively disabled")
    disable_flow_control: Optional[bool] = Field(None, description="Flow control disabled")
    disable_link_detect: Optional[bool] = Field(None, description="Link detection disabled")

    # Advanced configuration
    offload: Optional[OffloadConfig] = Field(None, description="Hardware offload settings")
    ring_buffer: Optional[RingBufferConfig] = Field(None, description="Ring buffer settings")
    ip: Optional[IPConfig] = Field(None, description="IP configuration")
    ipv6: Optional[IPv6Config] = Field(None, description="IPv6 configuration")
    dhcp_options: Optional[DHCPOptionsConfig] = Field(None, description="DHCP options")
    dhcpv6_options: Optional[DHCPv6OptionsConfig] = Field(None, description="DHCPv6 options")

    # VLAN sub-interfaces
    vif: Optional[List[VIFConfig]] = Field(None, description="802.1q VLAN sub-interfaces")
    vif_s: Optional[List[VIFSConfig]] = Field(None, description="QinQ service VLAN sub-interfaces")

    # Other features
    mirror: Optional[MirrorConfig] = Field(None, description="Port mirroring configuration")
    eapol: Optional[EAPoLConfig] = Field(None, description="802.1X EAPoL configuration")
    evpn: Optional[EVPNConfig] = Field(None, description="EVPN configuration")

    class Config:
        populate_by_name = True


class EthernetInterfacesConfigResponse(BaseModel):
    """Response containing all ethernet interface configurations"""

    interfaces: List[EthernetInterfaceConfigResponse] = Field(
        default_factory=list,
        description="List of all ethernet interfaces"
    )
    total: int = Field(0, description="Total number of ethernet interfaces")

    # Statistics
    by_type: Dict[str, int] = Field(
        default_factory=dict,
        description="Count of interfaces by type (should be 'ethernet': N)"
    )
    by_vrf: Dict[str, int] = Field(
        default_factory=dict,
        description="Count of interfaces by VRF"
    )

    class Config:
        json_schema_extra = {
            "example": {
                "interfaces": [
                    {
                        "name": "eth0",
                        "type": "ethernet",
                        "addresses": ["192.168.1.1/24"],
                        "description": "WAN Interface",
                        "hw_id": "00:50:56:00:00:01",
                        "duplex": "auto",
                        "speed": "1000",
                        "vif": [
                            {
                                "vlan_id": "100",
                                "addresses": ["10.100.0.1/24"],
                                "description": "VLAN 100"
                            }
                        ]
                    }
                ],
                "total": 1,
                "by_type": {"ethernet": 1},
                "by_vrf": {}
            }
        }


# ============================================================================
# READ Operations (GET)
# ============================================================================


@router.get("/capabilities")
async def get_ethernet_capabilities(request: Request) -> Dict[str, Any]:
    """
    Get available ethernet features based on device VyOS version.

    Returns feature flags indicating which operations are supported.
    This allows frontends to conditionally enable/disable features based on version.

    Example response:
    ```json
    {
      "version": "1.5",
      "features": {
        "basic": { "address": true, "description": true, ... },
        "ip": { "directed_broadcast": true }
      }
    }
    ```
    """
    try:
        service = get_session_vyos_service(request)
        version = service.get_version()

        # Parse version for comparison (e.g., "1.4" -> 1.4, "1.5" -> 1.5)
        try:
            version_float = float(version)
        except (ValueError, TypeError):
            # Default to 1.4 if version parsing fails
            version_float = 1.4

        # Base capabilities (available in all supported versions)
        capabilities = {
            "version": version,
            "version_number": version_float,

            # Feature availability flags
            "features": {
                # Basic interface operations (all versions)
                "basic": {
                    "address": True,
                    "description": True,
                    "mtu": True,
                    "disable": True,
                    "vrf": True,
                },

                # Ethernet-specific (all versions)
                "ethernet": {
                    "duplex": True,
                    "speed": True,
                    "mac": True,
                    "hw_id": True,
                },

                # Hardware offloading (all versions)
                "offload": {
                    "gro": True,
                    "gso": True,
                    "lro": True,
                    "rps": True,
                    "sg": True,
                    "tso": True,
                },

                # Ring buffer (all versions)
                "ring_buffer": {
                    "rx": True,
                    "tx": True,
                },

                # TCP MSS (all versions)
                "tcp_mss": {
                    "ipv4_adjust": True,
                    "ipv6_adjust": True,
                    "clamp_to_pmtu_ipv4": True,
                    "clamp_to_pmtu_ipv6": True,
                },

                # ARP settings (all versions)
                "arp": {
                    "cache_timeout": True,
                    "disable_filter": True,
                    "enable_accept": True,
                    "enable_announce": True,
                    "enable_ignore": True,
                    "enable_proxy_arp": True,
                    "proxy_arp_pvlan": True,
                },

                # IP features (version-aware)
                "ip": {
                    "source_validation": True,
                    "directed_broadcast": version_float >= 1.5,  # 1.5+ only
                },

                # IPv6 (all versions)
                "ipv6": {
                    "autoconf": True,
                    "eui64": True,
                    "disable_forwarding": True,
                    "dup_addr_detect_transmits": True,
                },

                # Flow control & link detection (all versions)
                "flow_control": True,
                "link_detect": True,

                # DHCP (all versions)
                "dhcp": {
                    "client_id": True,
                    "host_name": True,
                    "vendor_class_id": True,
                    "no_default_route": True,
                    "default_route_distance": True,
                },

                # DHCPv6 (all versions)
                "dhcpv6": {
                    "duid": True,
                    "rapid_commit": True,
                    "prefix_delegation": True,
                },

                # VLANs (all versions)
                "vlan": {
                    "vif": True,  # 802.1q single tag
                    "vif_s": True,  # QinQ service VLAN
                    "vif_c": True,  # QinQ customer VLAN
                    "vif_address": True,
                    "vif_description": True,
                    "vif_mtu": True,
                    "vif_mac": True,
                    "vif_vrf": True,
                    "vif_disable": True,
                    "vif_dhcp_options": True,
                    "vif_ipv6": True,
                },

                # Port mirroring (all versions)
                "port_mirror": {
                    "ingress": True,
                    "egress": True,
                },

                # 802.1X EAPoL (all versions)
                "eapol": {
                    "enabled": True,
                    "ca_cert_file": True,
                    "cert_file": True,
                    "key_file": True,
                },

                # EVPN (all versions)
                "evpn": {
                    "uplink_tracking": True,
                },
            },

            # Supported operations by category
            "operations": {
                "basic": [
                    "set_description",
                    "delete_description",
                    "set_address",
                    "delete_address",
                    "set_mtu",
                    "delete_mtu",
                    "set_vrf",
                    "delete_vrf",
                    "disable",
                    "enable",
                    "delete_interface",
                ],
                "ethernet_specific": [
                    "set_duplex",
                    "delete_duplex",
                    "set_speed",
                    "delete_speed",
                    "set_mac",
                    "delete_mac",
                ],
                "offload": [
                    "set_offload_gro",
                    "delete_offload_gro",
                    "set_offload_gso",
                    "delete_offload_gso",
                    "set_offload_lro",
                    "delete_offload_lro",
                    "set_offload_rps",
                    "delete_offload_rps",
                    "set_offload_sg",
                    "delete_offload_sg",
                    "set_offload_tso",
                    "delete_offload_tso",
                ],
                "ring_buffer": [
                    "set_ring_buffer_rx",
                    "set_ring_buffer_tx",
                    "delete_ring_buffer",
                ],
                "tcp_mss": [
                    "set_ip_adjust_mss",
                    "set_ip_adjust_mss_clamp_to_pmtu",
                    "set_ipv6_adjust_mss",
                    "set_ipv6_adjust_mss_clamp_to_pmtu",
                ],
                "arp": [
                    "set_ip_arp_cache_timeout",
                    "set_ip_disable_arp_filter",
                    "set_ip_enable_arp_accept",
                    "set_ip_enable_arp_announce",
                    "set_ip_enable_arp_ignore",
                    "set_ip_enable_proxy_arp",
                    "set_ip_proxy_arp_pvlan",
                ],
                "ip": [
                    "set_ip_source_validation",
                    "delete_ip_source_validation",
                ] + (["set_ip_enable_directed_broadcast"] if version_float >= 1.5 else []),
                "ipv6": [
                    "set_ipv6_address_autoconf",
                    "set_ipv6_address_eui64",
                    "set_ipv6_disable_forwarding",
                    "set_ipv6_dup_addr_detect_transmits",
                ],
                "flow_link": [
                    "set_disable_flow_control",
                    "delete_disable_flow_control",
                    "set_disable_link_detect",
                    "delete_disable_link_detect",
                ],
                "dhcp": [
                    "set_dhcp_options_client_id",
                    "set_dhcp_options_host_name",
                    "set_dhcp_options_vendor_class_id",
                    "set_dhcp_options_no_default_route",
                    "set_dhcp_options_default_route_distance",
                ],
                "dhcpv6": [
                    "set_dhcpv6_options_duid",
                    "set_dhcpv6_options_rapid_commit",
                    "set_dhcpv6_options_pd",
                ],
                "vlan_vif": [
                    "set_vif",
                    "delete_vif",
                    "set_vif_address",
                    "delete_vif_address",
                    "set_vif_description",
                    "delete_vif_description",
                    "set_vif_mtu",
                    "delete_vif_mtu",
                    "set_vif_disable",
                    "delete_vif_disable",
                    "set_vif_vrf",
                    "delete_vif_vrf",
                    "set_vif_mac",
                    "delete_vif_mac",
                    "set_vif_dhcp_options_client_id",
                    "set_vif_dhcp_options_host_name",
                    "set_vif_ipv6_address_autoconf",
                    "set_vif_ipv6_address_eui64",
                ],
                "vlan_vif_s": [
                    "set_vif_s",
                    "set_vif_s_address",
                    "delete_vif_s_address",
                    "set_vif_s_description",
                    "delete_vif_s_description",
                    "set_vif_s_mtu",
                    "delete_vif_s_mtu",
                    "set_vif_s_disable",
                    "delete_vif_s_disable",
                    "set_vif_s_vrf",
                    "delete_vif_s_vrf",
                    "set_vif_s_mac",
                    "delete_vif_s_mac",
                    "set_vif_s_dhcp_options_client_id",
                    "set_vif_s_dhcp_options_host_name",
                    "set_vif_s_ipv6_address_autoconf",
                    "set_vif_s_ipv6_address_eui64",
                ],
                "vlan_vif_c": [
                    "set_vif_c",
                    "set_vif_c_address",
                    "delete_vif_c_address",
                    "set_vif_c_description",
                    "delete_vif_c_description",
                    "set_vif_c_mtu",
                    "delete_vif_c_mtu",
                    "set_vif_c_disable",
                    "delete_vif_c_disable",
                    "set_vif_c_vrf",
                    "delete_vif_c_vrf",
                    "set_vif_c_mac",
                    "delete_vif_c_mac",
                    "set_vif_c_dhcp_options_client_id",
                    "set_vif_c_dhcp_options_host_name",
                    "set_vif_c_ipv6_address_autoconf",
                    "set_vif_c_ipv6_address_eui64",
                ],
                "port_mirror": [
                    "set_mirror_ingress",
                    "set_mirror_egress",
                    "delete_mirror",
                ],
                "eapol": [
                    "set_eapol_ca_cert_file",
                    "set_eapol_cert_file",
                    "set_eapol_key_file",
                ],
                "evpn": [
                    "set_evpn_uplink",
                    "delete_evpn",
                ],
            },

            # Version-specific feature notes
            "version_info": {
                "current": version,
                "supported_versions": ["1.4", "1.5"],
                "differences": {
                    "1.4": {
                        "description": "Base VyOS 1.4 feature set",
                        "limitations": [
                            "Directed broadcast not available"
                        ]
                    },
                    "1.5": {
                        "description": "VyOS 1.5 with enhanced features",
                        "new_features": [
                            "IP directed broadcast support"
                        ]
                    }
                }
            },

            # Total operation count
            "statistics": {
                "total_operations": sum(len(ops) for ops in capabilities.get("operations", {}).values()) if "operations" in locals() else 0,
                "version_specific_operations": 1 if version_float >= 1.5 else 0,
            }
        }

        # Calculate total operations
        total_ops = sum(len(ops) for ops in capabilities["operations"].values())
        capabilities["statistics"]["total_operations"] = total_ops

        # Add instance info
        if hasattr(request.state, "instance") and request.state.instance:
            capabilities["instance_name"] = request.state.instance.get("name")
            capabilities["instance_id"] = request.state.instance.get("id")

        return capabilities

    except KeyError as e:
        raise HTTPException(status_code=404, detail=f"Device not found: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving capabilities: {str(e)}")


@router.get("/config", response_model=EthernetInterfacesConfigResponse)
async def get_ethernet_config(http_request: Request) -> EthernetInterfacesConfigResponse:
    """
    Get all ethernet interface configurations from VyOS.

    Returns configuration details including addresses, description, speed, duplex, hw_id, etc.
    """
    from vyos_mappers.interfaces import EthernetInterfaceMapper

    try:
        # Get service and retrieve raw config from cache
        service = get_session_vyos_service(http_request)
        full_config = await run_in_threadpool(service.get_full_config)
        raw_config = full_config.get("interfaces", {}).get("ethernet", {})

        # Use mapper to parse config
        mapper = EthernetInterfaceMapper(service.get_version())
        parsed_data = mapper.parse_interfaces_of_type(raw_config)

        # Return as Pydantic model
        return EthernetInterfacesConfigResponse(**parsed_data)
    except KeyError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# Ethernet Interface Batch Endpoint
# ============================================================================


@router.post("/batch")
async def configure_interface_batch(http_request: Request, request: InterfaceBatchRequest) -> VyOSResponse:
    """
    Configure ethernet interface using batch operations.

    This is the main endpoint for configuring ethernet interfaces. All operations
    are version-aware and sent to VyOS in a single batch for efficiency.

    **Supported Operations:**

    | Operation | Value Required | Description |
    |-----------|----------------|-------------|
    | `set_description` | Yes | Set interface description |
    | `delete_description` | No | Remove interface description |
    | `set_address` | Yes | Add IP address (CIDR notation) |
    | `delete_address` | Yes | Remove IP address |
    | `set_mtu` | Yes | Set MTU value |
    | `delete_mtu` | No | Remove MTU (reset to default) |
    | `set_duplex` | Yes | Set duplex mode (auto/half/full) |
    | `delete_duplex` | No | Remove duplex (reset to default) |
    | `set_speed` | Yes | Set speed (auto/10/100/1000/etc) |
    | `delete_speed` | No | Remove speed (reset to default) |
    | `set_vrf` | Yes | Assign interface to VRF |
    | `delete_vrf` | Yes | Remove interface from VRF |
    | `disable` | No | Administratively disable interface |
    | `enable` | No | Enable interface (remove disable flag) |
    | `delete_interface` | No | Delete entire interface configuration |
    | `set_mac` | Yes | Set MAC address |
    | `delete_mac` | No | Reset MAC address to default |
    | `set_offload_gro` | No | Enable Generic Receive Offload |
    | `delete_offload_gro` | No | Delete Generic Receive Offload |
    | `set_offload_gso` | No | Enable Generic Segmentation Offload |
    | `delete_offload_gso` | No | Delete Generic Segmentation Offload |
    | `set_offload_lro` | No | Enable Large Receive Offload |
    | `delete_offload_lro` | No | Delete Large Receive Offload |
    | `set_offload_rps` | No | Enable Receive Packet Steering |
    | `delete_offload_rps` | No | Delete Receive Packet Steering |
    | `set_offload_sg` | No | Enable Scatter-Gather |
    | `delete_offload_sg` | No | Delete Scatter-Gather |
    | `set_offload_tso` | No | Enable TCP Segmentation Offload |
    | `delete_offload_tso` | No | Delete TCP Segmentation Offload |
    | `set_ring_buffer_rx` | Yes | Set RX ring buffer size |
    | `set_ring_buffer_tx` | Yes | Set TX ring buffer size |
    | `delete_ring_buffer` | No | Delete ring buffer settings |
    | `set_ip_adjust_mss` | Yes | Set IPv4 TCP MSS |
    | `set_ip_adjust_mss_clamp_to_pmtu` | No | Enable IPv4 MSS clamping to PMTU |
    | `set_ipv6_adjust_mss` | Yes | Set IPv6 TCP MSS |
    | `set_ipv6_adjust_mss_clamp_to_pmtu` | No | Enable IPv6 MSS clamping to PMTU |
    | `set_ip_arp_cache_timeout` | Yes | Set ARP cache timeout |
    | `set_ip_disable_arp_filter` | No | Disable ARP filter |
    | `set_ip_enable_arp_accept` | No | Enable ARP accept |
    | `set_ip_enable_arp_announce` | No | Enable ARP announce |
    | `set_ip_enable_arp_ignore` | No | Enable ARP ignore |
    | `set_ip_enable_proxy_arp` | No | Enable proxy ARP |
    | `set_ip_proxy_arp_pvlan` | No | Enable private VLAN proxy ARP |
    | `set_ip_source_validation` | Yes | Set source validation (strict/loose/disable) |
    | `delete_ip_source_validation` | No | Delete source validation |
    | `set_ip_enable_directed_broadcast` | No | Enable directed broadcast (1.5+ only) |
    | `set_ipv6_address_autoconf` | No | Enable IPv6 SLAAC autoconfiguration |
    | `set_ipv6_address_eui64` | Yes | Set IPv6 EUI-64 address |
    | `set_ipv6_disable_forwarding` | No | Disable IPv6 forwarding |
    | `set_ipv6_dup_addr_detect_transmits` | Yes | Set IPv6 DAD transmits |
    | `set_disable_flow_control` | No | Disable flow control |
    | `delete_disable_flow_control` | No | Enable flow control |
    | `set_disable_link_detect` | No | Disable link detection |
    | `delete_disable_link_detect` | No | Enable link detection |
    | `set_dhcp_options_client_id` | Yes | Set DHCP client ID |
    | `set_dhcp_options_host_name` | Yes | Set DHCP hostname |
    | `set_dhcp_options_vendor_class_id` | Yes | Set DHCP vendor class ID |
    | `set_dhcp_options_no_default_route` | No | Reject DHCP default route |
    | `set_dhcp_options_default_route_distance` | Yes | Set DHCP default route distance |
    | `set_dhcpv6_options_duid` | Yes | Set DHCPv6 DUID |
    | `set_dhcpv6_options_rapid_commit` | No | Enable DHCPv6 rapid commit |
    | `set_dhcpv6_options_pd` | Yes (pd_id,prefix) | Set DHCPv6 prefix delegation |
    | `set_vif` | Yes | Configure 802.1q VLAN |
    | `delete_vif` | Yes (vlan_id) | Remove 802.1q VLAN |
    | `set_vif_s` | Yes | Configure QinQ service VLAN |
    | `set_vif_c` | Yes (s_vlan,c_vlan) | Configure QinQ customer VLAN |
    | `set_mirror_ingress` | Yes | Configure ingress port mirroring |
    | `set_mirror_egress` | Yes | Configure egress port mirroring |
    | `delete_mirror` | No | Delete port mirroring |
    | `set_eapol_ca_cert_file` | Yes | Set EAPoL CA certificate |
    | `set_eapol_cert_file` | Yes | Set EAPoL client certificate |
    | `set_eapol_key_file` | Yes | Set EAPoL private key |
    | `set_evpn_uplink` | No | Enable EVPN uplink tracking |
    | `delete_evpn` | No | Delete EVPN configuration |

    **VLAN Sub-interface Operations (VIF - 802.1q):**

    | Operation | Value Required | Description |
    |-----------|----------------|-------------|
    | `set_vif_address` | Yes (vlan_id,address) | Set VIF address |
    | `delete_vif_address` | Yes (vlan_id,address) | Delete VIF address |
    | `set_vif_description` | Yes (vlan_id,description) | Set VIF description |
    | `delete_vif_description` | Yes (vlan_id) | Delete VIF description |
    | `set_vif_mtu` | Yes (vlan_id,mtu) | Set VIF MTU |
    | `delete_vif_mtu` | Yes (vlan_id) | Delete VIF MTU |
    | `set_vif_disable` | Yes (vlan_id) | Disable VIF |
    | `delete_vif_disable` | Yes (vlan_id) | Enable VIF |
    | `set_vif_vrf` | Yes (vlan_id,vrf) | Set VIF VRF |
    | `delete_vif_vrf` | Yes (vlan_id,vrf) | Delete VIF VRF |
    | `set_vif_mac` | Yes (vlan_id,mac) | Set VIF MAC |
    | `delete_vif_mac` | Yes (vlan_id) | Delete VIF MAC |
    | `set_vif_dhcp_options_client_id` | Yes (vlan_id,client_id) | Set VIF DHCP client ID |
    | `set_vif_dhcp_options_host_name` | Yes (vlan_id,hostname) | Set VIF DHCP hostname |
    | `set_vif_ipv6_address_autoconf` | Yes (vlan_id) | Enable VIF IPv6 autoconf |
    | `set_vif_ipv6_address_eui64` | Yes (vlan_id,prefix) | Set VIF IPv6 EUI-64 |

    **VLAN Sub-interface Operations (VIF-S - QinQ Service):**

    | Operation | Value Required | Description |
    |-----------|----------------|-------------|
    | `set_vif_s_address` | Yes (vlan_id,address) | Set VIF-S address |
    | `delete_vif_s_address` | Yes (vlan_id,address) | Delete VIF-S address |
    | `set_vif_s_description` | Yes (vlan_id,description) | Set VIF-S description |
    | `delete_vif_s_description` | Yes (vlan_id) | Delete VIF-S description |
    | `set_vif_s_mtu` | Yes (vlan_id,mtu) | Set VIF-S MTU |
    | `delete_vif_s_mtu` | Yes (vlan_id) | Delete VIF-S MTU |
    | `set_vif_s_disable` | Yes (vlan_id) | Disable VIF-S |
    | `delete_vif_s_disable` | Yes (vlan_id) | Enable VIF-S |
    | `set_vif_s_vrf` | Yes (vlan_id,vrf) | Set VIF-S VRF |
    | `delete_vif_s_vrf` | Yes (vlan_id,vrf) | Delete VIF-S VRF |
    | `set_vif_s_mac` | Yes (vlan_id,mac) | Set VIF-S MAC |
    | `delete_vif_s_mac` | Yes (vlan_id) | Delete VIF-S MAC |
    | `set_vif_s_dhcp_options_client_id` | Yes (vlan_id,client_id) | Set VIF-S DHCP client ID |
    | `set_vif_s_dhcp_options_host_name` | Yes (vlan_id,hostname) | Set VIF-S DHCP hostname |
    | `set_vif_s_ipv6_address_autoconf` | Yes (vlan_id) | Enable VIF-S IPv6 autoconf |
    | `set_vif_s_ipv6_address_eui64` | Yes (vlan_id,prefix) | Set VIF-S IPv6 EUI-64 |

    **VLAN Sub-interface Operations (VIF-C - QinQ Customer):**

    | Operation | Value Required | Description |
    |-----------|----------------|-------------|
    | `set_vif_c_address` | Yes (s_vlan,c_vlan,address) | Set VIF-C address |
    | `delete_vif_c_address` | Yes (s_vlan,c_vlan,address) | Delete VIF-C address |
    | `set_vif_c_description` | Yes (s_vlan,c_vlan,description) | Set VIF-C description |
    | `delete_vif_c_description` | Yes (s_vlan,c_vlan) | Delete VIF-C description |
    | `set_vif_c_mtu` | Yes (s_vlan,c_vlan,mtu) | Set VIF-C MTU |
    | `delete_vif_c_mtu` | Yes (s_vlan,c_vlan) | Delete VIF-C MTU |
    | `set_vif_c_disable` | Yes (s_vlan,c_vlan) | Disable VIF-C |
    | `delete_vif_c_disable` | Yes (s_vlan,c_vlan) | Enable VIF-C |
    | `set_vif_c_vrf` | Yes (s_vlan,c_vlan,vrf) | Set VIF-C VRF |
    | `delete_vif_c_vrf` | Yes (s_vlan,c_vlan,vrf) | Delete VIF-C VRF |
    | `set_vif_c_mac` | Yes (s_vlan,c_vlan,mac) | Set VIF-C MAC |
    | `delete_vif_c_mac` | Yes (s_vlan,c_vlan) | Delete VIF-C MAC |
    | `set_vif_c_dhcp_options_client_id` | Yes (s_vlan,c_vlan,client_id) | Set VIF-C DHCP client ID |
    | `set_vif_c_dhcp_options_host_name` | Yes (s_vlan,c_vlan,hostname) | Set VIF-C DHCP hostname |
    | `set_vif_c_ipv6_address_autoconf` | Yes (s_vlan,c_vlan) | Enable VIF-C IPv6 autoconf |
    | `set_vif_c_ipv6_address_eui64` | Yes (s_vlan,c_vlan,prefix) | Set VIF-C IPv6 EUI-64 |

    **Example Request:**
    ```json
    {
        "interface": "eth0",
        "operations": [
            {"op": "set_description", "value": "WAN Interface"},
            {"op": "set_address", "value": "10.0.0.1/24"},
            {"op": "set_address", "value": "2001:db8::1/64"},
            {"op": "delete_address", "value": "192.168.1.1/24"},
            {"op": "set_mtu", "value": "9000"},
            {"op": "set_duplex", "value": "full"},
            {"op": "set_speed", "value": "1000"},
            {"op": "set_vrf", "value": "MGMT"},
            {"op": "enable"}
        ]
    }
    ```

    **Example with Delete Operations:**
    ```json
    {
        "interface": "eth1",
        "operations": [
            {"op": "delete_description"},
            {"op": "delete_mtu"},
            {"op": "delete_duplex"},
            {"op": "delete_speed"}
        ]
    }
    ```
    """
    try:
        service = get_session_vyos_service(http_request)
        batch = service.create_ethernet_batch()

        # Process each operation
        for operation in request.operations:
            op_type = operation.get("op")
            value = operation.get("value")

            if not op_type:
                raise HTTPException(
                    status_code=400,
                    detail=f"Invalid operation: {operation}. Must have 'op' key"
                )

            # Map operation to batch method
            if op_type == "set_description":
                if not value:
                    raise HTTPException(status_code=400, detail=f"{op_type} requires a value")
                batch.set_interface_description(request.interface, value)
            elif op_type == "delete_description":
                # Delete description - no value needed
                batch.delete_interface_description(request.interface)
            elif op_type == "set_address":
                if not value:
                    raise HTTPException(status_code=400, detail=f"{op_type} requires a value")
                batch.set_interface_address(request.interface, value)
            elif op_type == "delete_address":
                if not value:
                    raise HTTPException(status_code=400, detail=f"{op_type} requires a value")
                batch.delete_interface_address(request.interface, value)
            elif op_type == "set_mtu":
                if not value:
                    raise HTTPException(status_code=400, detail=f"{op_type} requires a value")
                batch.set_interface_mtu(request.interface, value)
            elif op_type == "delete_mtu":
                # Delete MTU - no value needed
                batch.delete_interface_mtu(request.interface)
            elif op_type == "set_duplex":
                if not value:
                    raise HTTPException(status_code=400, detail=f"{op_type} requires a value")
                batch.set_interface_duplex(request.interface, value)
            elif op_type == "delete_duplex":
                # Delete duplex - no value needed
                batch.delete_interface_duplex(request.interface)
            elif op_type == "set_speed":
                if not value:
                    raise HTTPException(status_code=400, detail=f"{op_type} requires a value")
                batch.set_interface_speed(request.interface, value)
            elif op_type == "delete_speed":
                # Delete speed - no value needed
                batch.delete_interface_speed(request.interface)
            elif op_type == "set_vrf":
                if not value:
                    raise HTTPException(status_code=400, detail=f"{op_type} requires a value")
                batch.set_interface_vrf(request.interface, value)
            elif op_type == "delete_vrf":
                if not value:
                    raise HTTPException(status_code=400, detail=f"{op_type} requires a value")
                batch.delete_interface_vrf(request.interface, value)
            elif op_type == "disable":
                # Disable interface - no value needed
                batch.set_interface_disable(request.interface)
            elif op_type == "enable":
                # Enable interface - no value needed
                batch.delete_interface_disable(request.interface)
            elif op_type == "delete_interface":
                # Delete entire interface - no value needed
                batch.delete_interface(request.interface)
            # MAC Address
            elif op_type == "set_mac":
                if not value:
                    raise HTTPException(status_code=400, detail=f"{op_type} requires a value")
                batch.set_interface_mac(request.interface, value)
            elif op_type == "delete_mac":
                batch.delete_interface_mac(request.interface)
            # Hardware Offloading
            elif op_type == "set_offload_gro":
                batch.set_offload_gro(request.interface)
            elif op_type == "delete_offload_gro":
                batch.delete_offload_gro(request.interface)
            elif op_type == "set_offload_gso":
                batch.set_offload_gso(request.interface)
            elif op_type == "delete_offload_gso":
                batch.delete_offload_gso(request.interface)
            elif op_type == "set_offload_lro":
                batch.set_offload_lro(request.interface)
            elif op_type == "delete_offload_lro":
                batch.delete_offload_lro(request.interface)
            elif op_type == "set_offload_rps":
                batch.set_offload_rps(request.interface)
            elif op_type == "delete_offload_rps":
                batch.delete_offload_rps(request.interface)
            elif op_type == "set_offload_sg":
                batch.set_offload_sg(request.interface)
            elif op_type == "delete_offload_sg":
                batch.delete_offload_sg(request.interface)
            elif op_type == "set_offload_tso":
                batch.set_offload_tso(request.interface)
            elif op_type == "delete_offload_tso":
                batch.delete_offload_tso(request.interface)
            # Ring Buffer
            elif op_type == "set_ring_buffer_rx":
                if not value:
                    raise HTTPException(status_code=400, detail=f"{op_type} requires a value")
                batch.set_ring_buffer_rx(request.interface, value)
            elif op_type == "set_ring_buffer_tx":
                if not value:
                    raise HTTPException(status_code=400, detail=f"{op_type} requires a value")
                batch.set_ring_buffer_tx(request.interface, value)
            elif op_type == "delete_ring_buffer":
                batch.delete_ring_buffer(request.interface)
            # TCP MSS
            elif op_type == "set_ip_adjust_mss":
                if not value:
                    raise HTTPException(status_code=400, detail=f"{op_type} requires a value")
                batch.set_ip_adjust_mss(request.interface, value)
            elif op_type == "set_ip_adjust_mss_clamp_to_pmtu":
                batch.set_ip_adjust_mss_clamp_to_pmtu(request.interface)
            elif op_type == "set_ipv6_adjust_mss":
                if not value:
                    raise HTTPException(status_code=400, detail=f"{op_type} requires a value")
                batch.set_ipv6_adjust_mss(request.interface, value)
            elif op_type == "set_ipv6_adjust_mss_clamp_to_pmtu":
                batch.set_ipv6_adjust_mss_clamp_to_pmtu(request.interface)
            # ARP Settings
            elif op_type == "set_ip_arp_cache_timeout":
                if not value:
                    raise HTTPException(status_code=400, detail=f"{op_type} requires a value")
                batch.set_ip_arp_cache_timeout(request.interface, value)
            elif op_type == "set_ip_disable_arp_filter":
                batch.set_ip_disable_arp_filter(request.interface)
            elif op_type == "set_ip_enable_arp_accept":
                batch.set_ip_enable_arp_accept(request.interface)
            elif op_type == "set_ip_enable_arp_announce":
                batch.set_ip_enable_arp_announce(request.interface)
            elif op_type == "set_ip_enable_arp_ignore":
                batch.set_ip_enable_arp_ignore(request.interface)
            elif op_type == "set_ip_enable_proxy_arp":
                batch.set_ip_enable_proxy_arp(request.interface)
            elif op_type == "set_ip_proxy_arp_pvlan":
                batch.set_ip_proxy_arp_pvlan(request.interface)
            # Source Validation
            elif op_type == "set_ip_source_validation":
                if not value:
                    raise HTTPException(status_code=400, detail=f"{op_type} requires a value")
                batch.set_ip_source_validation(request.interface, value)
            elif op_type == "delete_ip_source_validation":
                batch.delete_ip_source_validation(request.interface)
            # Directed Broadcast (1.5+)
            elif op_type == "set_ip_enable_directed_broadcast":
                batch.set_ip_enable_directed_broadcast(request.interface)
            # IPv6 Settings
            elif op_type == "set_ipv6_address_autoconf":
                batch.set_ipv6_address_autoconf(request.interface)
            elif op_type == "set_ipv6_address_eui64":
                if not value:
                    raise HTTPException(status_code=400, detail=f"{op_type} requires a value")
                batch.set_ipv6_address_eui64(request.interface, value)
            elif op_type == "set_ipv6_disable_forwarding":
                batch.set_ipv6_disable_forwarding(request.interface)
            elif op_type == "set_ipv6_dup_addr_detect_transmits":
                if not value:
                    raise HTTPException(status_code=400, detail=f"{op_type} requires a value")
                batch.set_ipv6_dup_addr_detect_transmits(request.interface, value)
            # Flow Control
            elif op_type == "set_disable_flow_control":
                batch.set_disable_flow_control(request.interface)
            elif op_type == "delete_disable_flow_control":
                batch.delete_disable_flow_control(request.interface)
            # Link Detection
            elif op_type == "set_disable_link_detect":
                batch.set_disable_link_detect(request.interface)
            elif op_type == "delete_disable_link_detect":
                batch.delete_disable_link_detect(request.interface)
            # DHCP Options
            elif op_type == "set_dhcp_options_client_id":
                if not value:
                    raise HTTPException(status_code=400, detail=f"{op_type} requires a value")
                batch.set_dhcp_options_client_id(request.interface, value)
            elif op_type == "set_dhcp_options_host_name":
                if not value:
                    raise HTTPException(status_code=400, detail=f"{op_type} requires a value")
                batch.set_dhcp_options_host_name(request.interface, value)
            elif op_type == "set_dhcp_options_vendor_class_id":
                if not value:
                    raise HTTPException(status_code=400, detail=f"{op_type} requires a value")
                batch.set_dhcp_options_vendor_class_id(request.interface, value)
            elif op_type == "set_dhcp_options_no_default_route":
                batch.set_dhcp_options_no_default_route(request.interface)
            elif op_type == "set_dhcp_options_default_route_distance":
                if not value:
                    raise HTTPException(status_code=400, detail=f"{op_type} requires a value")
                batch.set_dhcp_options_default_route_distance(request.interface, value)
            # DHCPv6 Options
            elif op_type == "set_dhcpv6_options_duid":
                if not value:
                    raise HTTPException(status_code=400, detail=f"{op_type} requires a value")
                batch.set_dhcpv6_options_duid(request.interface, value)
            elif op_type == "set_dhcpv6_options_rapid_commit":
                batch.set_dhcpv6_options_rapid_commit(request.interface)
            elif op_type == "set_dhcpv6_options_pd":
                if not value:
                    raise HTTPException(status_code=400, detail=f"{op_type} requires a value (pd_id,prefix)")
                # Parse value as "pd_id,prefix"
                parts = value.split(",")
                if len(parts) != 2:
                    raise HTTPException(status_code=400, detail=f"{op_type} value must be 'pd_id,prefix'")
                batch.set_dhcpv6_options_pd(request.interface, parts[0], parts[1])
            # VLANs
            elif op_type == "set_vif":
                if not value:
                    raise HTTPException(status_code=400, detail=f"{op_type} requires a value")
                batch.set_vif(request.interface, value)
            elif op_type == "delete_vif":
                if not value:
                    raise HTTPException(status_code=400, detail=f"{op_type} requires a value")
                batch.delete_vif(request.interface, value)
            elif op_type == "set_vif_s":
                if not value:
                    raise HTTPException(status_code=400, detail=f"{op_type} requires a value")
                batch.set_vif_s(request.interface, value)
            elif op_type == "set_vif_c":
                if not value:
                    raise HTTPException(status_code=400, detail=f"{op_type} requires a value (s_vlan,c_vlan)")
                # Parse value as "s_vlan,c_vlan"
                parts = value.split(",")
                if len(parts) != 2:
                    raise HTTPException(status_code=400, detail=f"{op_type} value must be 's_vlan,c_vlan'")
                batch.set_vif_c(request.interface, parts[0], parts[1])
            # Port Mirroring
            elif op_type == "set_mirror_ingress":
                if not value:
                    raise HTTPException(status_code=400, detail=f"{op_type} requires a value")
                batch.set_mirror_ingress(request.interface, value)
            elif op_type == "set_mirror_egress":
                if not value:
                    raise HTTPException(status_code=400, detail=f"{op_type} requires a value")
                batch.set_mirror_egress(request.interface, value)
            elif op_type == "delete_mirror":
                batch.delete_mirror(request.interface)
            # EAPoL (802.1X)
            elif op_type == "set_eapol_ca_cert_file":
                if not value:
                    raise HTTPException(status_code=400, detail=f"{op_type} requires a value")
                batch.set_eapol_ca_cert_file(request.interface, value)
            elif op_type == "set_eapol_cert_file":
                if not value:
                    raise HTTPException(status_code=400, detail=f"{op_type} requires a value")
                batch.set_eapol_cert_file(request.interface, value)
            elif op_type == "set_eapol_key_file":
                if not value:
                    raise HTTPException(status_code=400, detail=f"{op_type} requires a value")
                batch.set_eapol_key_file(request.interface, value)
            # EVPN
            elif op_type == "set_evpn_uplink":
                batch.set_evpn_uplink(request.interface)
            elif op_type == "delete_evpn":
                batch.delete_evpn(request.interface)
            # VIF (802.1q VLAN) Sub-interface Operations
            elif op_type == "set_vif_address":
                if not value:
                    raise HTTPException(status_code=400, detail=f"{op_type} requires a value (vlan_id,address)")
                parts = value.split(",", 1)
                if len(parts) != 2:
                    raise HTTPException(status_code=400, detail=f"{op_type} value must be 'vlan_id,address'")
                batch.set_vif_address(request.interface, parts[0], parts[1])
            elif op_type == "delete_vif_address":
                if not value:
                    raise HTTPException(status_code=400, detail=f"{op_type} requires a value (vlan_id,address)")
                parts = value.split(",", 1)
                if len(parts) != 2:
                    raise HTTPException(status_code=400, detail=f"{op_type} value must be 'vlan_id,address'")
                batch.delete_vif_address(request.interface, parts[0], parts[1])
            elif op_type == "set_vif_description":
                if not value:
                    raise HTTPException(status_code=400, detail=f"{op_type} requires a value (vlan_id,description)")
                parts = value.split(",", 1)
                if len(parts) != 2:
                    raise HTTPException(status_code=400, detail=f"{op_type} value must be 'vlan_id,description'")
                batch.set_vif_description(request.interface, parts[0], parts[1])
            elif op_type == "delete_vif_description":
                if not value:
                    raise HTTPException(status_code=400, detail=f"{op_type} requires a value (vlan_id)")
                batch.delete_vif_description(request.interface, value)
            elif op_type == "set_vif_mtu":
                if not value:
                    raise HTTPException(status_code=400, detail=f"{op_type} requires a value (vlan_id,mtu)")
                parts = value.split(",")
                if len(parts) != 2:
                    raise HTTPException(status_code=400, detail=f"{op_type} value must be 'vlan_id,mtu'")
                batch.set_vif_mtu(request.interface, parts[0], parts[1])
            elif op_type == "delete_vif_mtu":
                if not value:
                    raise HTTPException(status_code=400, detail=f"{op_type} requires a value (vlan_id)")
                batch.delete_vif_mtu(request.interface, value)
            elif op_type == "set_vif_disable":
                if not value:
                    raise HTTPException(status_code=400, detail=f"{op_type} requires a value (vlan_id)")
                batch.set_vif_disable(request.interface, value)
            elif op_type == "delete_vif_disable":
                if not value:
                    raise HTTPException(status_code=400, detail=f"{op_type} requires a value (vlan_id)")
                batch.delete_vif_disable(request.interface, value)
            elif op_type == "set_vif_vrf":
                if not value:
                    raise HTTPException(status_code=400, detail=f"{op_type} requires a value (vlan_id,vrf)")
                parts = value.split(",")
                if len(parts) != 2:
                    raise HTTPException(status_code=400, detail=f"{op_type} value must be 'vlan_id,vrf'")
                batch.set_vif_vrf(request.interface, parts[0], parts[1])
            elif op_type == "delete_vif_vrf":
                if not value:
                    raise HTTPException(status_code=400, detail=f"{op_type} requires a value (vlan_id,vrf)")
                parts = value.split(",")
                if len(parts) != 2:
                    raise HTTPException(status_code=400, detail=f"{op_type} value must be 'vlan_id,vrf'")
                batch.delete_vif_vrf(request.interface, parts[0], parts[1])
            elif op_type == "set_vif_mac":
                if not value:
                    raise HTTPException(status_code=400, detail=f"{op_type} requires a value (vlan_id,mac)")
                parts = value.split(",", 1)
                if len(parts) != 2:
                    raise HTTPException(status_code=400, detail=f"{op_type} value must be 'vlan_id,mac'")
                batch.set_vif_mac(request.interface, parts[0], parts[1])
            elif op_type == "delete_vif_mac":
                if not value:
                    raise HTTPException(status_code=400, detail=f"{op_type} requires a value (vlan_id)")
                batch.delete_vif_mac(request.interface, value)
            elif op_type == "set_vif_dhcp_options_client_id":
                if not value:
                    raise HTTPException(status_code=400, detail=f"{op_type} requires a value (vlan_id,client_id)")
                parts = value.split(",", 1)
                if len(parts) != 2:
                    raise HTTPException(status_code=400, detail=f"{op_type} value must be 'vlan_id,client_id'")
                batch.set_vif_dhcp_options_client_id(request.interface, parts[0], parts[1])
            elif op_type == "set_vif_dhcp_options_host_name":
                if not value:
                    raise HTTPException(status_code=400, detail=f"{op_type} requires a value (vlan_id,hostname)")
                parts = value.split(",", 1)
                if len(parts) != 2:
                    raise HTTPException(status_code=400, detail=f"{op_type} value must be 'vlan_id,hostname'")
                batch.set_vif_dhcp_options_host_name(request.interface, parts[0], parts[1])
            elif op_type == "set_vif_ipv6_address_autoconf":
                if not value:
                    raise HTTPException(status_code=400, detail=f"{op_type} requires a value (vlan_id)")
                batch.set_vif_ipv6_address_autoconf(request.interface, value)
            elif op_type == "set_vif_ipv6_address_eui64":
                if not value:
                    raise HTTPException(status_code=400, detail=f"{op_type} requires a value (vlan_id,prefix)")
                parts = value.split(",", 1)
                if len(parts) != 2:
                    raise HTTPException(status_code=400, detail=f"{op_type} value must be 'vlan_id,prefix'")
                batch.set_vif_ipv6_address_eui64(request.interface, parts[0], parts[1])
            # VIF-S (QinQ Service VLAN) Sub-interface Operations
            elif op_type == "set_vif_s_address":
                if not value:
                    raise HTTPException(status_code=400, detail=f"{op_type} requires a value (vlan_id,address)")
                parts = value.split(",", 1)
                if len(parts) != 2:
                    raise HTTPException(status_code=400, detail=f"{op_type} value must be 'vlan_id,address'")
                batch.set_vif_s_address(request.interface, parts[0], parts[1])
            elif op_type == "delete_vif_s_address":
                if not value:
                    raise HTTPException(status_code=400, detail=f"{op_type} requires a value (vlan_id,address)")
                parts = value.split(",", 1)
                if len(parts) != 2:
                    raise HTTPException(status_code=400, detail=f"{op_type} value must be 'vlan_id,address'")
                batch.delete_vif_s_address(request.interface, parts[0], parts[1])
            elif op_type == "set_vif_s_description":
                if not value:
                    raise HTTPException(status_code=400, detail=f"{op_type} requires a value (vlan_id,description)")
                parts = value.split(",", 1)
                if len(parts) != 2:
                    raise HTTPException(status_code=400, detail=f"{op_type} value must be 'vlan_id,description'")
                batch.set_vif_s_description(request.interface, parts[0], parts[1])
            elif op_type == "delete_vif_s_description":
                if not value:
                    raise HTTPException(status_code=400, detail=f"{op_type} requires a value (vlan_id)")
                batch.delete_vif_s_description(request.interface, value)
            elif op_type == "set_vif_s_mtu":
                if not value:
                    raise HTTPException(status_code=400, detail=f"{op_type} requires a value (vlan_id,mtu)")
                parts = value.split(",")
                if len(parts) != 2:
                    raise HTTPException(status_code=400, detail=f"{op_type} value must be 'vlan_id,mtu'")
                batch.set_vif_s_mtu(request.interface, parts[0], parts[1])
            elif op_type == "delete_vif_s_mtu":
                if not value:
                    raise HTTPException(status_code=400, detail=f"{op_type} requires a value (vlan_id)")
                batch.delete_vif_s_mtu(request.interface, value)
            elif op_type == "set_vif_s_disable":
                if not value:
                    raise HTTPException(status_code=400, detail=f"{op_type} requires a value (vlan_id)")
                batch.set_vif_s_disable(request.interface, value)
            elif op_type == "delete_vif_s_disable":
                if not value:
                    raise HTTPException(status_code=400, detail=f"{op_type} requires a value (vlan_id)")
                batch.delete_vif_s_disable(request.interface, value)
            elif op_type == "set_vif_s_vrf":
                if not value:
                    raise HTTPException(status_code=400, detail=f"{op_type} requires a value (vlan_id,vrf)")
                parts = value.split(",")
                if len(parts) != 2:
                    raise HTTPException(status_code=400, detail=f"{op_type} value must be 'vlan_id,vrf'")
                batch.set_vif_s_vrf(request.interface, parts[0], parts[1])
            elif op_type == "delete_vif_s_vrf":
                if not value:
                    raise HTTPException(status_code=400, detail=f"{op_type} requires a value (vlan_id,vrf)")
                parts = value.split(",")
                if len(parts) != 2:
                    raise HTTPException(status_code=400, detail=f"{op_type} value must be 'vlan_id,vrf'")
                batch.delete_vif_s_vrf(request.interface, parts[0], parts[1])
            elif op_type == "set_vif_s_mac":
                if not value:
                    raise HTTPException(status_code=400, detail=f"{op_type} requires a value (vlan_id,mac)")
                parts = value.split(",", 1)
                if len(parts) != 2:
                    raise HTTPException(status_code=400, detail=f"{op_type} value must be 'vlan_id,mac'")
                batch.set_vif_s_mac(request.interface, parts[0], parts[1])
            elif op_type == "delete_vif_s_mac":
                if not value:
                    raise HTTPException(status_code=400, detail=f"{op_type} requires a value (vlan_id)")
                batch.delete_vif_s_mac(request.interface, value)
            elif op_type == "set_vif_s_dhcp_options_client_id":
                if not value:
                    raise HTTPException(status_code=400, detail=f"{op_type} requires a value (vlan_id,client_id)")
                parts = value.split(",", 1)
                if len(parts) != 2:
                    raise HTTPException(status_code=400, detail=f"{op_type} value must be 'vlan_id,client_id'")
                batch.set_vif_s_dhcp_options_client_id(request.interface, parts[0], parts[1])
            elif op_type == "set_vif_s_dhcp_options_host_name":
                if not value:
                    raise HTTPException(status_code=400, detail=f"{op_type} requires a value (vlan_id,hostname)")
                parts = value.split(",", 1)
                if len(parts) != 2:
                    raise HTTPException(status_code=400, detail=f"{op_type} value must be 'vlan_id,hostname'")
                batch.set_vif_s_dhcp_options_host_name(request.interface, parts[0], parts[1])
            elif op_type == "set_vif_s_ipv6_address_autoconf":
                if not value:
                    raise HTTPException(status_code=400, detail=f"{op_type} requires a value (vlan_id)")
                batch.set_vif_s_ipv6_address_autoconf(request.interface, value)
            elif op_type == "set_vif_s_ipv6_address_eui64":
                if not value:
                    raise HTTPException(status_code=400, detail=f"{op_type} requires a value (vlan_id,prefix)")
                parts = value.split(",", 1)
                if len(parts) != 2:
                    raise HTTPException(status_code=400, detail=f"{op_type} value must be 'vlan_id,prefix'")
                batch.set_vif_s_ipv6_address_eui64(request.interface, parts[0], parts[1])
            # VIF-C (QinQ Customer VLAN) Sub-interface Operations
            elif op_type == "set_vif_c_address":
                if not value:
                    raise HTTPException(status_code=400, detail=f"{op_type} requires a value (s_vlan,c_vlan,address)")
                parts = value.split(",", 2)
                if len(parts) != 3:
                    raise HTTPException(status_code=400, detail=f"{op_type} value must be 's_vlan,c_vlan,address'")
                batch.set_vif_c_address(request.interface, parts[0], parts[1], parts[2])
            elif op_type == "delete_vif_c_address":
                if not value:
                    raise HTTPException(status_code=400, detail=f"{op_type} requires a value (s_vlan,c_vlan,address)")
                parts = value.split(",", 2)
                if len(parts) != 3:
                    raise HTTPException(status_code=400, detail=f"{op_type} value must be 's_vlan,c_vlan,address'")
                batch.delete_vif_c_address(request.interface, parts[0], parts[1], parts[2])
            elif op_type == "set_vif_c_description":
                if not value:
                    raise HTTPException(status_code=400, detail=f"{op_type} requires a value (s_vlan,c_vlan,description)")
                parts = value.split(",", 2)
                if len(parts) != 3:
                    raise HTTPException(status_code=400, detail=f"{op_type} value must be 's_vlan,c_vlan,description'")
                batch.set_vif_c_description(request.interface, parts[0], parts[1], parts[2])
            elif op_type == "delete_vif_c_description":
                if not value:
                    raise HTTPException(status_code=400, detail=f"{op_type} requires a value (s_vlan,c_vlan)")
                parts = value.split(",")
                if len(parts) != 2:
                    raise HTTPException(status_code=400, detail=f"{op_type} value must be 's_vlan,c_vlan'")
                batch.delete_vif_c_description(request.interface, parts[0], parts[1])
            elif op_type == "set_vif_c_mtu":
                if not value:
                    raise HTTPException(status_code=400, detail=f"{op_type} requires a value (s_vlan,c_vlan,mtu)")
                parts = value.split(",")
                if len(parts) != 3:
                    raise HTTPException(status_code=400, detail=f"{op_type} value must be 's_vlan,c_vlan,mtu'")
                batch.set_vif_c_mtu(request.interface, parts[0], parts[1], parts[2])
            elif op_type == "delete_vif_c_mtu":
                if not value:
                    raise HTTPException(status_code=400, detail=f"{op_type} requires a value (s_vlan,c_vlan)")
                parts = value.split(",")
                if len(parts) != 2:
                    raise HTTPException(status_code=400, detail=f"{op_type} value must be 's_vlan,c_vlan'")
                batch.delete_vif_c_mtu(request.interface, parts[0], parts[1])
            elif op_type == "set_vif_c_disable":
                if not value:
                    raise HTTPException(status_code=400, detail=f"{op_type} requires a value (s_vlan,c_vlan)")
                parts = value.split(",")
                if len(parts) != 2:
                    raise HTTPException(status_code=400, detail=f"{op_type} value must be 's_vlan,c_vlan'")
                batch.set_vif_c_disable(request.interface, parts[0], parts[1])
            elif op_type == "delete_vif_c_disable":
                if not value:
                    raise HTTPException(status_code=400, detail=f"{op_type} requires a value (s_vlan,c_vlan)")
                parts = value.split(",")
                if len(parts) != 2:
                    raise HTTPException(status_code=400, detail=f"{op_type} value must be 's_vlan,c_vlan'")
                batch.delete_vif_c_disable(request.interface, parts[0], parts[1])
            elif op_type == "set_vif_c_vrf":
                if not value:
                    raise HTTPException(status_code=400, detail=f"{op_type} requires a value (s_vlan,c_vlan,vrf)")
                parts = value.split(",")
                if len(parts) != 3:
                    raise HTTPException(status_code=400, detail=f"{op_type} value must be 's_vlan,c_vlan,vrf'")
                batch.set_vif_c_vrf(request.interface, parts[0], parts[1], parts[2])
            elif op_type == "delete_vif_c_vrf":
                if not value:
                    raise HTTPException(status_code=400, detail=f"{op_type} requires a value (s_vlan,c_vlan,vrf)")
                parts = value.split(",")
                if len(parts) != 3:
                    raise HTTPException(status_code=400, detail=f"{op_type} value must be 's_vlan,c_vlan,vrf'")
                batch.delete_vif_c_vrf(request.interface, parts[0], parts[1], parts[2])
            elif op_type == "set_vif_c_mac":
                if not value:
                    raise HTTPException(status_code=400, detail=f"{op_type} requires a value (s_vlan,c_vlan,mac)")
                parts = value.split(",", 2)
                if len(parts) != 3:
                    raise HTTPException(status_code=400, detail=f"{op_type} value must be 's_vlan,c_vlan,mac'")
                batch.set_vif_c_mac(request.interface, parts[0], parts[1], parts[2])
            elif op_type == "delete_vif_c_mac":
                if not value:
                    raise HTTPException(status_code=400, detail=f"{op_type} requires a value (s_vlan,c_vlan)")
                parts = value.split(",")
                if len(parts) != 2:
                    raise HTTPException(status_code=400, detail=f"{op_type} value must be 's_vlan,c_vlan'")
                batch.delete_vif_c_mac(request.interface, parts[0], parts[1])
            elif op_type == "set_vif_c_dhcp_options_client_id":
                if not value:
                    raise HTTPException(status_code=400, detail=f"{op_type} requires a value (s_vlan,c_vlan,client_id)")
                parts = value.split(",", 2)
                if len(parts) != 3:
                    raise HTTPException(status_code=400, detail=f"{op_type} value must be 's_vlan,c_vlan,client_id'")
                batch.set_vif_c_dhcp_options_client_id(request.interface, parts[0], parts[1], parts[2])
            elif op_type == "set_vif_c_dhcp_options_host_name":
                if not value:
                    raise HTTPException(status_code=400, detail=f"{op_type} requires a value (s_vlan,c_vlan,hostname)")
                parts = value.split(",", 2)
                if len(parts) != 3:
                    raise HTTPException(status_code=400, detail=f"{op_type} value must be 's_vlan,c_vlan,hostname'")
                batch.set_vif_c_dhcp_options_host_name(request.interface, parts[0], parts[1], parts[2])
            elif op_type == "set_vif_c_ipv6_address_autoconf":
                if not value:
                    raise HTTPException(status_code=400, detail=f"{op_type} requires a value (s_vlan,c_vlan)")
                parts = value.split(",")
                if len(parts) != 2:
                    raise HTTPException(status_code=400, detail=f"{op_type} value must be 's_vlan,c_vlan'")
                batch.set_vif_c_ipv6_address_autoconf(request.interface, parts[0], parts[1])
            elif op_type == "set_vif_c_ipv6_address_eui64":
                if not value:
                    raise HTTPException(status_code=400, detail=f"{op_type} requires a value (s_vlan,c_vlan,prefix)")
                parts = value.split(",", 2)
                if len(parts) != 3:
                    raise HTTPException(status_code=400, detail=f"{op_type} value must be 's_vlan,c_vlan,prefix'")
                batch.set_vif_c_ipv6_address_eui64(request.interface, parts[0], parts[1], parts[2])
            else:
                raise HTTPException(
                    status_code=400,
                    detail=f"Unsupported operation: {op_type}"
                )

        # Execute the batch
        response = service.execute_batch(batch)

        # Handle empty string result (convert to None for Pydantic validation)
        result_data = response.result
        if result_data == '' or result_data is None:
            result_data = None
        elif not isinstance(result_data, dict):
            # If it's not a dict and not empty, wrap it
            result_data = {"result": result_data}

        return VyOSResponse(
            success=response.status == 200,
            data=result_data,
            error=response.error if response.error else None
        )
    except KeyError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
