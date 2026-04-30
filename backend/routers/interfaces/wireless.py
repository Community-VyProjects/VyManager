"""
Wireless Interface Configuration Endpoints

All wireless (WiFi) interface endpoints for VyOS configuration.
Supports access-point, station, and monitor modes with full security
and radio capabilities management.
"""

import inspect
import logging
from typing import Dict, List, Optional, Any

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field, ConfigDict
from starlette.concurrency import run_in_threadpool

from fastapi_permissions import require_read_permission, require_write_permission
from rbac_permissions import FeatureGroup
from session_vyos_service import get_session_vyos_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/vyos/wireless", tags=["wireless-interface"])


# ============================================================================
# Request / Response Models
# ============================================================================


class BatchOperation(BaseModel):
    op: str = Field(..., description="Operation name")
    value: Optional[str] = Field(None, description="Operation value (if required)")


class BatchRequest(BaseModel):
    interface: str = Field(..., description="Wireless interface name (e.g., wlan0)")
    operations: List[BatchOperation]


class VyOSResponse(BaseModel):
    success: bool
    data: Optional[Dict[str, Any]] = None
    error: Optional[str] = None


class WpaRadiusServer(BaseModel):
    server: str
    key: Optional[str] = None
    port: Optional[str] = None
    accounting: bool = False
    disable: bool = False


class WpaSecurity(BaseModel):
    mode: Optional[str] = None
    passphrase: Optional[str] = None
    cipher: List[str] = Field(default_factory=list)
    group_cipher: Optional[str] = None
    group_mgmt_cipher: Optional[str] = None
    radius_servers: List[WpaRadiusServer] = Field(default_factory=list)
    radius_source_address: Optional[str] = None


class WepSecurity(BaseModel):
    key: List[str] = Field(default_factory=list)


class StationAddressSecurity(BaseModel):
    mode: Optional[str] = None
    accept_mac: List[str] = Field(default_factory=list)
    deny_mac: List[str] = Field(default_factory=list)


class WirelessSecurity(BaseModel):
    wpa: Optional[WpaSecurity] = None
    wep: Optional[WepSecurity] = None
    station_address: Optional[StationAddressSecurity] = None


class HtCapabilities(BaseModel):
    channel_set_width: List[str] = Field(default_factory=list)
    mhz_incapable_40: bool = False
    auto_powersave: bool = False
    delayed_block_ack: bool = False
    dsss_cck_40: bool = False
    greenfield: bool = False
    ldpc: bool = False
    lsig_protection: bool = False
    max_amsdu: Optional[str] = None
    short_gi: List[str] = Field(default_factory=list)
    smps: Optional[str] = None
    stbc_rx: Optional[str] = None
    stbc_tx: bool = False


class VhtCapabilities(BaseModel):
    antenna_count: Optional[str] = None
    antenna_pattern_fixed: bool = False
    beamform: List[str] = Field(default_factory=list)
    center_channel_freq_1: Optional[str] = None
    center_channel_freq_2: Optional[str] = None
    channel_set_width: Optional[str] = None
    ldpc: bool = False
    link_adaptation: Optional[str] = None
    max_mpdu_exp: Optional[str] = None
    max_mpdu: Optional[str] = None
    short_gi: List[str] = Field(default_factory=list)
    stbc_rx: Optional[str] = None
    stbc_tx: bool = False
    tx_powersave: bool = False
    vht_cf: bool = False


class HeBeamform(BaseModel):
    multi_user_beamformer: bool = False
    single_user_beamformee: bool = False
    single_user_beamformer: bool = False


class HeCapabilities(BaseModel):
    antenna_pattern_fixed: bool = False
    beamform: Optional[HeBeamform] = None
    bss_color: Optional[str] = None
    center_channel_freq_1: Optional[str] = None
    center_channel_freq_2: Optional[str] = None
    channel_set_width: Optional[str] = None
    coding_scheme: Optional[str] = None


class WirelessCapabilities(BaseModel):
    ht: Optional[HtCapabilities] = None
    vht: Optional[VhtCapabilities] = None
    he: Optional[HeCapabilities] = None
    require_ht: bool = False
    require_vht: bool = False
    require_he: bool = False


class WirelessInterfaceConfig(BaseModel):
    name: str
    type: str = "wireless"
    wireless_type: Optional[str] = None
    mode: Optional[str] = None
    ssid: Optional[str] = None
    channel: Optional[str] = None
    description: Optional[str] = None
    disable: bool = False
    mac: Optional[str] = None
    hw_id: Optional[str] = None
    physical_device: Optional[str] = None
    vrf: Optional[str] = None
    mtu: Optional[str] = None
    addresses: List[str] = Field(default_factory=list)
    # AP settings
    disable_broadcast_ssid: bool = False
    expunge_failing_stations: bool = False
    isolate_stations: bool = False
    max_stations: Optional[str] = None
    mgmt_frame_protection: Optional[str] = None
    per_client_thread: bool = False
    reduce_transmit_power: bool = False
    stationary_ap: bool = False
    enable_bf_protection: bool = False
    # IP settings
    ip_disable_forwarding: bool = False
    ip_source_validation: Optional[str] = None
    ip_enable_proxy_arp: bool = False
    ip_arp_cache_timeout: Optional[str] = None
    # IPv6 settings
    ipv6_disable_forwarding: bool = False
    ipv6_address_eui64: List[str] = Field(default_factory=list)
    ipv6_address_no_default_link_local: bool = False
    # Mirror / redirect
    mirror_ingress: Optional[str] = None
    mirror_egress: Optional[str] = None
    redirect: Optional[str] = None
    # Security
    security: Optional[WirelessSecurity] = None
    # Capabilities
    capabilities: Optional[WirelessCapabilities] = None
    # Version-specific
    country_code: Optional[str] = None  # v1.4 only
    bssid: Optional[str] = None         # v1.5 only

    model_config = ConfigDict(populate_by_name=True)


class WirelessInterfacesConfigResponse(BaseModel):
    interfaces: List[WirelessInterfaceConfig] = Field(default_factory=list)
    total: int = 0
    by_type: Dict[str, int] = Field(default_factory=dict)
    by_wireless_type: Dict[str, int] = Field(default_factory=dict)
    by_vrf: Dict[str, int] = Field(default_factory=dict)


# ============================================================================
# Endpoints
# ============================================================================


@router.get("/capabilities")
async def get_capabilities(request: Request) -> Dict[str, Any]:
    """Return version-aware feature capabilities for wireless interfaces."""
    await require_read_permission(request, FeatureGroup.INTERFACES)
    service = get_session_vyos_service(request)
    from vyos_builders.interfaces.wireless import WirelessInterfaceBuilderMixin
    builder = WirelessInterfaceBuilderMixin(version=service.get_version())
    return builder.get_capabilities()


@router.get("/config", response_model=WirelessInterfacesConfigResponse)
async def get_config(http_request: Request, refresh: bool = False) -> WirelessInterfacesConfigResponse:
    """Get all wireless interface configurations from VyOS."""
    await require_read_permission(http_request, FeatureGroup.INTERFACES)
    try:
        service = get_session_vyos_service(http_request)
        full_config = await run_in_threadpool(service.get_full_config, refresh)
        raw_config = full_config.get("interfaces", {}).get("wireless", {})

        from vyos_mappers.interfaces.wireless_versions import get_wireless_mapper
        mapper = get_wireless_mapper(service.get_version())
        parsed = mapper.parse_interfaces_of_type(raw_config)

        interfaces = []
        for iface in parsed.get("interfaces", []):
            security_raw = iface.get("security", {}) or {}
            security = None
            if security_raw:
                wpa_raw = security_raw.get("wpa")
                wpa = None
                if wpa_raw:
                    wpa = WpaSecurity(
                        mode=wpa_raw.get("mode"),
                        passphrase=wpa_raw.get("passphrase"),
                        cipher=wpa_raw.get("cipher") or [],
                        group_cipher=wpa_raw.get("group_cipher"),
                        group_mgmt_cipher=wpa_raw.get("group_mgmt_cipher"),
                        radius_servers=[
                            WpaRadiusServer(**srv)
                            for srv in (wpa_raw.get("radius_servers") or [])
                        ],
                        radius_source_address=wpa_raw.get("radius_source_address"),
                    )

                wep_raw = security_raw.get("wep")
                wep = WepSecurity(key=wep_raw.get("key") or []) if wep_raw else None

                sa_raw = security_raw.get("station_address")
                station_address = None
                if sa_raw:
                    station_address = StationAddressSecurity(
                        mode=sa_raw.get("mode"),
                        accept_mac=sa_raw.get("accept_mac") or [],
                        deny_mac=sa_raw.get("deny_mac") or [],
                    )

                security = WirelessSecurity(wpa=wpa, wep=wep, station_address=station_address)

            cap_raw = iface.get("capabilities", {}) or {}
            capabilities = None
            if cap_raw:
                ht_raw = cap_raw.get("ht")
                ht = None
                if ht_raw:
                    ht = HtCapabilities(
                        channel_set_width=ht_raw.get("channel_set_width") or [],
                        mhz_incapable_40=ht_raw.get("40mhz_incapable", False),
                        auto_powersave=ht_raw.get("auto_powersave", False),
                        delayed_block_ack=ht_raw.get("delayed_block_ack", False),
                        dsss_cck_40=ht_raw.get("dsss_cck_40", False),
                        greenfield=ht_raw.get("greenfield", False),
                        ldpc=ht_raw.get("ldpc", False),
                        lsig_protection=ht_raw.get("lsig_protection", False),
                        max_amsdu=ht_raw.get("max_amsdu"),
                        short_gi=ht_raw.get("short_gi") or [],
                        smps=ht_raw.get("smps"),
                        stbc_rx=ht_raw.get("stbc_rx"),
                        stbc_tx=ht_raw.get("stbc_tx", False),
                    )

                vht_raw = cap_raw.get("vht")
                vht = None
                if vht_raw:
                    vht = VhtCapabilities(
                        antenna_count=vht_raw.get("antenna_count"),
                        antenna_pattern_fixed=vht_raw.get("antenna_pattern_fixed", False),
                        beamform=vht_raw.get("beamform") or [],
                        center_channel_freq_1=vht_raw.get("center_channel_freq_1"),
                        center_channel_freq_2=vht_raw.get("center_channel_freq_2"),
                        channel_set_width=vht_raw.get("channel_set_width"),
                        ldpc=vht_raw.get("ldpc", False),
                        link_adaptation=vht_raw.get("link_adaptation"),
                        max_mpdu_exp=vht_raw.get("max_mpdu_exp"),
                        max_mpdu=vht_raw.get("max_mpdu"),
                        short_gi=vht_raw.get("short_gi") or [],
                        stbc_rx=vht_raw.get("stbc_rx"),
                        stbc_tx=vht_raw.get("stbc_tx", False),
                        tx_powersave=vht_raw.get("tx_powersave", False),
                        vht_cf=vht_raw.get("vht_cf", False),
                    )

                he_raw = cap_raw.get("he")
                he = None
                if he_raw:
                    bf_raw = he_raw.get("beamform")
                    he_beamform = None
                    if bf_raw:
                        he_beamform = HeBeamform(
                            multi_user_beamformer=bf_raw.get("multi_user_beamformer", False),
                            single_user_beamformee=bf_raw.get("single_user_beamformee", False),
                            single_user_beamformer=bf_raw.get("single_user_beamformer", False),
                        )
                    he = HeCapabilities(
                        antenna_pattern_fixed=he_raw.get("antenna_pattern_fixed", False),
                        beamform=he_beamform,
                        bss_color=he_raw.get("bss_color"),
                        center_channel_freq_1=he_raw.get("center_channel_freq_1"),
                        center_channel_freq_2=he_raw.get("center_channel_freq_2"),
                        channel_set_width=he_raw.get("channel_set_width"),
                        coding_scheme=he_raw.get("coding_scheme"),
                    )

                capabilities = WirelessCapabilities(
                    ht=ht,
                    vht=vht,
                    he=he,
                    require_ht=cap_raw.get("require_ht", False),
                    require_vht=cap_raw.get("require_vht", False),
                    require_he=cap_raw.get("require_he", False),
                )

            interfaces.append(WirelessInterfaceConfig(
                name=iface["name"],
                wireless_type=iface.get("wireless_type"),
                mode=iface.get("mode"),
                ssid=iface.get("ssid"),
                channel=iface.get("channel"),
                description=iface.get("description"),
                disable=iface.get("disable", False),
                mac=iface.get("mac"),
                hw_id=iface.get("hw_id"),
                physical_device=iface.get("physical_device"),
                vrf=iface.get("vrf"),
                mtu=iface.get("mtu"),
                addresses=iface.get("addresses") or [],
                disable_broadcast_ssid=iface.get("disable_broadcast_ssid", False),
                expunge_failing_stations=iface.get("expunge_failing_stations", False),
                isolate_stations=iface.get("isolate_stations", False),
                max_stations=iface.get("max_stations"),
                mgmt_frame_protection=iface.get("mgmt_frame_protection"),
                per_client_thread=iface.get("per_client_thread", False),
                reduce_transmit_power=iface.get("reduce_transmit_power", False),
                stationary_ap=iface.get("stationary_ap", False),
                enable_bf_protection=iface.get("enable_bf_protection", False),
                ip_disable_forwarding=iface.get("ip_disable_forwarding", False),
                ip_source_validation=iface.get("ip_source_validation"),
                ip_enable_proxy_arp=iface.get("ip_enable_proxy_arp", False),
                ip_arp_cache_timeout=iface.get("ip_arp_cache_timeout"),
                ipv6_disable_forwarding=iface.get("ipv6_disable_forwarding", False),
                ipv6_address_eui64=iface.get("ipv6_address_eui64") or [],
                ipv6_address_no_default_link_local=iface.get("ipv6_address_no_default_link_local", False),
                mirror_ingress=iface.get("mirror_ingress"),
                mirror_egress=iface.get("mirror_egress"),
                redirect=iface.get("redirect"),
                security=security,
                capabilities=capabilities,
                country_code=iface.get("country_code"),
                bssid=iface.get("bssid"),
            ))

        return WirelessInterfacesConfigResponse(
            interfaces=interfaces,
            total=parsed.get("total", 0),
            by_type=parsed.get("by_type", {}),
            by_wireless_type=parsed.get("by_wireless_type", {}),
            by_vrf=parsed.get("by_vrf", {}),
        )
    except Exception:
        logger.exception("Unhandled error in get_config")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.post("/batch", response_model=VyOSResponse)
async def batch_configure(http_request: Request, request: BatchRequest) -> VyOSResponse:
    """
    Configure a wireless interface using batch operations.

    **Basic operations (all versions):**
    | Operation | Value | Description |
    |-----------|-------|-------------|
    | `set_interface_type` | Yes | Wireless type (access-point/station/monitor) |
    | `delete_interface_type` | No | Reset type to default |
    | `set_interface_mode` | Yes | Radio mode (a/b/g/n/ac/ax) |
    | `delete_interface_mode` | No | Reset mode |
    | `set_interface_ssid` | Yes | Set SSID |
    | `delete_interface_ssid` | No | Remove SSID |
    | `set_interface_channel` | Yes | Set channel (0=ACS) |
    | `delete_interface_channel` | No | Reset channel |
    | `set_interface_description` | Yes | Set description |
    | `delete_interface_description` | No | Remove description |
    | `set_interface_address` | Yes | Add IP address (CIDR) |
    | `delete_interface_address` | Yes | Remove IP address |
    | `set_interface_disable` | No | Disable interface |
    | `delete_interface_disable` | No | Enable interface |
    | `set_interface_mac` | Yes | Set MAC address |
    | `delete_interface_mac` | No | Remove MAC override |
    | `set_interface_hw_id` | Yes | Set hardware MAC ID |
    | `delete_interface_hw_id` | No | Remove hardware MAC |
    | `set_interface_physical_device` | Yes | Set physical device (phy0) |
    | `delete_interface_physical_device` | No | Remove physical device |
    | `set_interface_vrf` | Yes | Assign to VRF |
    | `delete_interface_vrf` | No | Remove VRF |
    | `set_interface_mtu` | Yes | Set MTU |
    | `delete_interface_mtu` | No | Reset MTU |
    | `delete_interface` | No | Delete entire interface |

    **AP settings:**
    | `set_disable_broadcast_ssid` | No | Hide SSID |
    | `delete_disable_broadcast_ssid` | No | Broadcast SSID |
    | `set_expunge_failing_stations` | No | Kick failing stations |
    | `delete_expunge_failing_stations` | No | Allow failing stations |
    | `set_isolate_stations` | No | Isolate clients |
    | `delete_isolate_stations` | No | Allow client communication |
    | `set_max_stations` | Yes | Max connected clients |
    | `delete_max_stations` | No | Remove station limit |
    | `set_mgmt_frame_protection` | Yes | MFP mode (disabled/optional/required) |
    | `delete_mgmt_frame_protection` | No | Reset MFP |
    | `set_per_client_thread` | No | Per-client thread mode |
    | `delete_per_client_thread` | No | Shared thread mode |
    | `set_reduce_transmit_power` | No | Reduce TX power |
    | `delete_reduce_transmit_power` | No | Normal TX power |
    | `set_stationary_ap` | No | Stationary AP mode |
    | `delete_stationary_ap` | No | Mobile AP mode |
    | `set_enable_bf_protection` | No | Enable beacon frame protection |
    | `delete_enable_bf_protection` | No | Disable beacon protection |

    **Security - WPA:**
    | `set_security_wpa_mode` | Yes | WPA mode (wpa/wpa2/wpa+wpa2/wpa3) |
    | `delete_security_wpa_mode` | No | Remove WPA mode |
    | `set_security_wpa_passphrase` | Yes | WPA passphrase |
    | `delete_security_wpa_passphrase` | No | Remove passphrase |
    | `set_security_wpa_cipher` | Yes | Add cipher (CCMP/TKIP/etc) |
    | `delete_security_wpa_cipher` | Yes | Remove specific cipher |
    | `delete_security_wpa_cipher_all` | No | Remove all ciphers |
    | `set_security_wpa_group_cipher` | Yes | Group cipher |
    | `delete_security_wpa_group_cipher` | No | Remove group cipher |
    | `set_security_wpa_group_mgmt_cipher` | Yes | Group management cipher |
    | `delete_security_wpa_group_mgmt_cipher` | No | Remove group mgmt cipher |
    | `set_security_wpa_radius_server` | Yes | Add RADIUS server |
    | `delete_security_wpa_radius_server` | Yes | Remove RADIUS server |
    | `set_security_wpa_radius_server_key` | Yes | server:key format |
    | `set_security_wpa_radius_server_port` | Yes | server:port format |
    | `set_security_wpa_radius_server_accounting` | Yes | Enable accounting |
    | `delete_security_wpa_radius_server_accounting` | Yes | Disable accounting |
    | `set_security_wpa_radius_server_disable` | Yes | Disable RADIUS server |
    | `delete_security_wpa_radius_server_disable` | Yes | Enable RADIUS server |
    | `set_security_wpa_radius_source_address` | Yes | RADIUS source address |
    | `delete_security_wpa_radius_source_address` | No | Remove source address |
    | `delete_security_wpa` | No | Remove all WPA config |

    **Security - WEP:**
    | `set_security_wep_key` | Yes | Add WEP key |
    | `delete_security_wep` | No | Remove WEP config |

    **Security - Station filtering:**
    | `set_security_station_address_mode` | Yes | Mode (accept/deny) |
    | `delete_security_station_address_mode` | No | Remove mode |
    | `set_security_station_accept_mac` | Yes | Add MAC to accept list |
    | `delete_security_station_accept_mac` | Yes | Remove MAC from accept |
    | `delete_security_station_accept_all` | No | Clear accept list |
    | `set_security_station_deny_mac` | Yes | Add MAC to deny list |
    | `delete_security_station_deny_mac` | Yes | Remove MAC from deny |
    | `delete_security_station_deny_all` | No | Clear deny list |
    | `delete_security` | No | Remove all security config |

    **Capabilities - HT (802.11n):**
    | `set_cap_ht_channel_set_width` | Yes | ht20/ht40+/ht40- |
    | `delete_cap_ht_channel_set_width` | Yes | Remove specific width |
    | `delete_cap_ht_channel_set_width_all` | No | Clear all widths |
    | `set_cap_ht_40mhz_incapable` | No | Declare 40MHz incapable |
    | `delete_cap_ht_40mhz_incapable` | No | Allow 40MHz |
    | `set_cap_ht_auto_powersave` | No | HT auto power save |
    | `delete_cap_ht_auto_powersave` | No | No HT auto power save |
    | `set_cap_ht_delayed_block_ack` | No | Delayed block ack |
    | `delete_cap_ht_delayed_block_ack` | No | Immediate block ack |
    | `set_cap_ht_dsss_cck_40` | No | DSSS/CCK in 40MHz |
    | `delete_cap_ht_dsss_cck_40` | No | No DSSS/CCK in 40MHz |
    | `set_cap_ht_greenfield` | No | Greenfield mode |
    | `delete_cap_ht_greenfield` | No | No greenfield |
    | `set_cap_ht_ldpc` | No | LDPC coding |
    | `delete_cap_ht_ldpc` | No | No LDPC |
    | `set_cap_ht_lsig_protection` | No | L-SIG TXOP protection |
    | `delete_cap_ht_lsig_protection` | No | No L-SIG protection |
    | `set_cap_ht_max_amsdu` | Yes | Max A-MSDU (3839/7935) |
    | `delete_cap_ht_max_amsdu` | No | Reset A-MSDU |
    | `set_cap_ht_short_gi` | Yes | Short GI width (20/40) |
    | `delete_cap_ht_short_gi` | Yes | Remove specific short GI |
    | `delete_cap_ht_short_gi_all` | No | Remove all short GI |
    | `set_cap_ht_smps` | Yes | SMPS mode (static/dynamic) |
    | `delete_cap_ht_smps` | No | Disable SMPS |
    | `set_cap_ht_stbc_rx` | Yes | STBC RX streams |
    | `delete_cap_ht_stbc_rx` | No | Disable STBC RX |
    | `set_cap_ht_stbc_tx` | No | Enable STBC TX |
    | `delete_cap_ht_stbc_tx` | No | Disable STBC TX |
    | `delete_cap_ht` | No | Remove all HT capabilities |
    | `set_cap_require_ht` | No | Require HT association |
    | `delete_cap_require_ht` | No | Allow non-HT |

    **Capabilities - VHT (802.11ac):**
    | `set_cap_vht_antenna_count` | Yes | Antenna count |
    | `delete_cap_vht_antenna_count` | No | Remove antenna count |
    | `set_cap_vht_antenna_pattern_fixed` | No | Fixed antenna pattern |
    | `delete_cap_vht_antenna_pattern_fixed` | No | Variable pattern |
    | `set_cap_vht_beamform` | Yes | Beamform mode |
    | `delete_cap_vht_beamform` | Yes | Remove beamform mode |
    | `delete_cap_vht_beamform_all` | No | Remove all beamform |
    | `set_cap_vht_center_channel_freq_1` | Yes | Center freq 1 |
    | `delete_cap_vht_center_channel_freq_1` | No | Remove center freq 1 |
    | `set_cap_vht_center_channel_freq_2` | Yes | Center freq 2 |
    | `delete_cap_vht_center_channel_freq_2` | No | Remove center freq 2 |
    | `set_cap_vht_channel_set_width` | Yes | Channel width (0-3) |
    | `delete_cap_vht_channel_set_width` | No | Reset channel width |
    | `set_cap_vht_ldpc` | No | LDPC coding |
    | `delete_cap_vht_ldpc` | No | No LDPC |
    | `set_cap_vht_link_adaptation` | Yes | Link adaptation mode |
    | `delete_cap_vht_link_adaptation` | No | Remove link adaptation |
    | `set_cap_vht_max_mpdu_exp` | Yes | Max MPDU exponent |
    | `delete_cap_vht_max_mpdu_exp` | No | Reset MPDU exponent |
    | `set_cap_vht_max_mpdu` | Yes | Max MPDU (7991/11454) |
    | `delete_cap_vht_max_mpdu` | No | Reset max MPDU |
    | `set_cap_vht_short_gi` | Yes | Short GI (80/160) |
    | `delete_cap_vht_short_gi` | Yes | Remove specific GI |
    | `delete_cap_vht_short_gi_all` | No | Remove all short GI |
    | `set_cap_vht_stbc_rx` | Yes | STBC RX streams |
    | `delete_cap_vht_stbc_rx` | No | Disable STBC RX |
    | `set_cap_vht_stbc_tx` | No | Enable STBC TX |
    | `delete_cap_vht_stbc_tx` | No | Disable STBC TX |
    | `set_cap_vht_tx_powersave` | No | VHT TX power save |
    | `delete_cap_vht_tx_powersave` | No | No TX power save |
    | `set_cap_vht_vht_cf` | No | VHT HT operation |
    | `delete_cap_vht_vht_cf` | No | No VHT-CF |
    | `delete_cap_vht` | No | Remove all VHT capabilities |
    | `set_cap_require_vht` | No | Require VHT association |
    | `delete_cap_require_vht` | No | Allow non-VHT |

    **Capabilities - HE (802.11ax):**
    | `set_cap_he_antenna_pattern_fixed` | No | Fixed antenna pattern |
    | `delete_cap_he_antenna_pattern_fixed` | No | Variable pattern |
    | `set_cap_he_beamform` | Yes | Beamform mode |
    | `delete_cap_he_beamform` | Yes | Remove beamform mode |
    | `delete_cap_he_beamform_all` | No | Remove all beamform |
    | `set_cap_he_bss_color` | Yes | BSS color (1-63) |
    | `delete_cap_he_bss_color` | No | Remove BSS color |
    | `set_cap_he_center_channel_freq_1` | Yes | HE center freq 1 |
    | `delete_cap_he_center_channel_freq_1` | No | Remove center freq 1 |
    | `set_cap_he_center_channel_freq_2` | Yes | HE center freq 2 |
    | `delete_cap_he_center_channel_freq_2` | No | Remove center freq 2 |
    | `set_cap_he_channel_set_width` | Yes | HE channel width |
    | `delete_cap_he_channel_set_width` | No | Reset channel width |
    | `set_cap_he_coding_scheme` | Yes | Coding scheme (0-3) |
    | `delete_cap_he_coding_scheme` | No | Reset coding scheme |
    | `delete_cap_he` | No | Remove all HE capabilities |
    | `set_cap_require_he` | No | Require HE association |
    | `delete_cap_require_he` | No | Allow non-HE |
    | `delete_capabilities` | No | Remove all capabilities |

    **IP / IPv6 settings:**
    | `set_ip_disable_forwarding` | No | Disable IPv4 forwarding |
    | `delete_ip_disable_forwarding` | No | Enable IPv4 forwarding |
    | `set_ip_source_validation` | Yes | strict/loose/disable |
    | `delete_ip_source_validation` | No | Remove source validation |
    | `set_ip_enable_proxy_arp` | No | Enable proxy ARP |
    | `delete_ip_enable_proxy_arp` | No | Disable proxy ARP |
    | `set_ip_arp_cache_timeout` | Yes | ARP cache timeout |
    | `delete_ip_arp_cache_timeout` | No | Reset ARP cache timeout |
    | `set_ipv6_disable_forwarding` | No | Disable IPv6 forwarding |
    | `delete_ipv6_disable_forwarding` | No | Enable IPv6 forwarding |
    | `set_ipv6_address_eui64` | Yes | EUI-64 prefix |
    | `delete_ipv6_address_eui64` | Yes | Remove specific EUI-64 |
    | `delete_ipv6_address_eui64_all` | No | Remove all EUI-64 |
    | `set_ipv6_address_no_default_link_local` | No | Remove link-local |
    | `delete_ipv6_address_no_default_link_local` | No | Restore link-local |

    **Mirror / Redirect:**
    | `set_mirror_ingress` | Yes | Mirror ingress to interface |
    | `delete_mirror_ingress` | No | Remove ingress mirror |
    | `set_mirror_egress` | Yes | Mirror egress to interface |
    | `delete_mirror_egress` | No | Remove egress mirror |
    | `set_redirect` | Yes | Redirect incoming packets |
    | `delete_redirect` | No | Remove redirect |

    **VyOS 1.4 only:**
    | `set_country_code` | Yes | Regulatory country code (e.g., US) |
    | `delete_country_code` | No | Remove country code |

    **VyOS 1.5 only:**
    | `set_bssid` | Yes | Target BSSID (MAC) for station mode |
    | `delete_bssid` | No | Remove BSSID |
    """
    await require_write_permission(http_request, FeatureGroup.INTERFACES)

    try:
        service = get_session_vyos_service(http_request)
        from vyos_builders.interfaces.wireless import WirelessInterfaceBuilderMixin
        batch = WirelessInterfaceBuilderMixin(version=service.get_version())

        for op in request.operations:
            if op.op in batch._INTERNAL_BUILDER_METHODS:
                raise HTTPException(
                    status_code=400,
                    detail=f"Operation '{op.op}' is not a valid interface operation",
                )

            method = getattr(batch, op.op, None)
            if method is None:
                raise HTTPException(
                    status_code=400,
                    detail=f"Unsupported operation: {op.op}",
                )

            sig = inspect.signature(method)
            params = [p for p in sig.parameters.keys() if p != "self"]

            if len(params) == 1:
                method(request.interface)
            elif len(params) == 2:
                if op.value is None:
                    raise HTTPException(
                        status_code=400,
                        detail=f"Operation '{op.op}' requires a value",
                    )
                method(request.interface, op.value)
            else:
                raise HTTPException(
                    status_code=400,
                    detail=f"Operation '{op.op}' has unexpected signature",
                )

        response = service.execute_batch(batch)
        return VyOSResponse(
            success=response.status == 200,
            data=response.result if isinstance(response.result, dict) else None,
            error=response.error if response.error else None,
        )
    except HTTPException:
        raise
    except Exception:
        logger.exception("Unhandled error in batch_configure")
        raise HTTPException(status_code=500, detail="Internal server error")
