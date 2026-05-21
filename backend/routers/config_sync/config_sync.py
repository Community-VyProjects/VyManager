"""Config-Sync Service Router.

API endpoints for managing VyOS primary/secondary configuration synchronization.
The template structure is identical between VyOS 1.4 and 1.5.

Endpoints:
  GET  /vyos/config-sync/capabilities  — version-aware feature flags
  GET  /vyos/config-sync/config        — normalized config-sync configuration
  POST /vyos/config-sync/batch         — atomic set/delete operations
"""

from fastapi import APIRouter, HTTPException, Request
from starlette.concurrency import run_in_threadpool
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from session_vyos_service import get_session_vyos_service
from vyos_builders.config_sync import ConfigSyncBatchBuilder
from fastapi_permissions import require_read_permission, require_write_permission
from rbac_permissions import FeatureGroup
import inspect
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/vyos/config-sync", tags=["config-sync"])


# ============================================================================
# Pydantic Models
# ============================================================================


class ConfigSyncSecondary(BaseModel):
    address: Optional[str] = None
    key: Optional[str] = None
    port: Optional[int] = None
    timeout: Optional[int] = None


class ConfigSyncSections(BaseModel):
    # Simple top-level presence flags
    firewall: bool = False
    nat: bool = False
    nat66: bool = False
    pki: bool = False
    policy: bool = False
    vpn: bool = False
    vrf: bool = False

    # Interfaces (parent + subtypes)
    interfaces: bool = False
    interfaces_bonding: bool = False
    interfaces_bridge: bool = False
    interfaces_dummy: bool = False
    interfaces_ethernet: bool = False
    interfaces_geneve: bool = False
    interfaces_input: bool = False
    interfaces_l2tpv3: bool = False
    interfaces_loopback: bool = False
    interfaces_macsec: bool = False
    interfaces_openvpn: bool = False
    interfaces_pppoe: bool = False
    interfaces_pseudo_ethernet: bool = False
    interfaces_sstpc: bool = False
    interfaces_tunnel: bool = False
    interfaces_virtual_ethernet: bool = False
    interfaces_vti: bool = False
    interfaces_vxlan: bool = False
    interfaces_wireguard: bool = False
    interfaces_wireless: bool = False
    interfaces_wwan: bool = False

    # Protocols (parent + subtypes)
    protocols: bool = False
    protocols_babel: bool = False
    protocols_bfd: bool = False
    protocols_bgp: bool = False
    protocols_failover: bool = False
    protocols_igmp_proxy: bool = False
    protocols_isis: bool = False
    protocols_mpls: bool = False
    protocols_nhrp: bool = False
    protocols_ospf: bool = False
    protocols_ospfv3: bool = False
    protocols_pim: bool = False
    protocols_pim6: bool = False
    protocols_rip: bool = False
    protocols_ripng: bool = False
    protocols_rpki: bool = False
    protocols_segment_routing: bool = False
    protocols_static: bool = False

    # QoS (parent + subtypes)
    qos: bool = False
    qos_interface: bool = False
    qos_policy: bool = False

    # Service (parent + subtypes)
    service: bool = False
    service_console_server: bool = False
    service_dhcp_relay: bool = False
    service_dhcp_server: bool = False
    service_dhcpv6_relay: bool = False
    service_dhcpv6_server: bool = False
    service_dns: bool = False
    service_lldp: bool = False
    service_mdns: bool = False
    service_monitoring: bool = False
    service_ndp_proxy: bool = False
    service_ntp: bool = False
    service_snmp: bool = False
    service_tftp_server: bool = False
    service_webproxy: bool = False

    # System (parent + subtypes)
    system: bool = False
    system_conntrack: bool = False
    system_flow_accounting: bool = False
    system_login: bool = False
    system_option: bool = False
    system_sflow: bool = False
    system_static_host_mapping: bool = False
    system_sysctl: bool = False
    system_time_zone: bool = False


class ConfigSyncConfig(BaseModel):
    mode: Optional[str] = None
    secondary: Optional[ConfigSyncSecondary] = None
    sections: ConfigSyncSections = Field(default_factory=ConfigSyncSections)


class ConfigSyncBatchOperation(BaseModel):
    op: str = Field(..., description="Builder method name")
    value: Optional[str] = Field(
        None,
        description=(
            "Argument(s) for the operation. "
            "Single-arg methods: plain string. "
            "Multi-arg methods: comma-separated (e.g., 'interfaces,ethernet')."
        ),
    )


class ConfigSyncBatchRequest(BaseModel):
    operations: List[ConfigSyncBatchOperation]


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
# Section parse helpers
# ============================================================================

# Maps VyOS hyphenated sub-names to ConfigSyncSections field name suffixes
_IFACE_SUBTYPES: Dict[str, str] = {
    "bonding": "bonding",
    "bridge": "bridge",
    "dummy": "dummy",
    "ethernet": "ethernet",
    "geneve": "geneve",
    "input": "input",
    "l2tpv3": "l2tpv3",
    "loopback": "loopback",
    "macsec": "macsec",
    "openvpn": "openvpn",
    "pppoe": "pppoe",
    "pseudo-ethernet": "pseudo_ethernet",
    "sstpc": "sstpc",
    "tunnel": "tunnel",
    "virtual-ethernet": "virtual_ethernet",
    "vti": "vti",
    "vxlan": "vxlan",
    "wireguard": "wireguard",
    "wireless": "wireless",
    "wwan": "wwan",
}

_PROTO_SUBTYPES: Dict[str, str] = {
    "babel": "babel",
    "bfd": "bfd",
    "bgp": "bgp",
    "failover": "failover",
    "igmp-proxy": "igmp_proxy",
    "isis": "isis",
    "mpls": "mpls",
    "nhrp": "nhrp",
    "ospf": "ospf",
    "ospfv3": "ospfv3",
    "pim": "pim",
    "pim6": "pim6",
    "rip": "rip",
    "ripng": "ripng",
    "rpki": "rpki",
    "segment-routing": "segment_routing",
    "static": "static",
}

_QOS_SUBTYPES: Dict[str, str] = {
    "interface": "interface",
    "policy": "policy",
}

_SERVICE_SUBTYPES: Dict[str, str] = {
    "console-server": "console_server",
    "dhcp-relay": "dhcp_relay",
    "dhcp-server": "dhcp_server",
    "dhcpv6-relay": "dhcpv6_relay",
    "dhcpv6-server": "dhcpv6_server",
    "dns": "dns",
    "lldp": "lldp",
    "mdns": "mdns",
    "monitoring": "monitoring",
    "ndp-proxy": "ndp_proxy",
    "ntp": "ntp",
    "snmp": "snmp",
    "tftp-server": "tftp_server",
    "webproxy": "webproxy",
}

_SYSTEM_SUBTYPES: Dict[str, str] = {
    "conntrack": "conntrack",
    "flow-accounting": "flow_accounting",
    "login": "login",
    "option": "option",
    "sflow": "sflow",
    "static-host-mapping": "static_host_mapping",
    "sysctl": "sysctl",
    "time-zone": "time_zone",
}


def _parse_sections(section_raw: dict) -> ConfigSyncSections:
    """Parse the 'section' dict from VyOS config into a ConfigSyncSections model."""
    s = ConfigSyncSections()
    if not isinstance(section_raw, dict):
        return s

    def _has(key: str) -> bool:
        return key in section_raw

    def _children(key: str) -> dict:
        val = section_raw.get(key)
        return val if isinstance(val, dict) else {}

    s.firewall = _has("firewall")
    s.nat = _has("nat")
    s.nat66 = _has("nat66")
    s.pki = _has("pki")
    s.policy = _has("policy")
    s.vpn = _has("vpn")
    s.vrf = _has("vrf")

    if _has("interfaces"):
        s.interfaces = True
        iface_children = _children("interfaces")
        for vyos_name, field_suffix in _IFACE_SUBTYPES.items():
            if vyos_name in iface_children:
                setattr(s, f"interfaces_{field_suffix}", True)

    if _has("protocols"):
        s.protocols = True
        proto_children = _children("protocols")
        for vyos_name, field_suffix in _PROTO_SUBTYPES.items():
            if vyos_name in proto_children:
                setattr(s, f"protocols_{field_suffix}", True)

    if _has("qos"):
        s.qos = True
        qos_children = _children("qos")
        for vyos_name, field_suffix in _QOS_SUBTYPES.items():
            if vyos_name in qos_children:
                setattr(s, f"qos_{field_suffix}", True)

    if _has("service"):
        s.service = True
        svc_children = _children("service")
        for vyos_name, field_suffix in _SERVICE_SUBTYPES.items():
            if vyos_name in svc_children:
                setattr(s, f"service_{field_suffix}", True)

    if _has("system"):
        s.system = True
        sys_children = _children("system")
        for vyos_name, field_suffix in _SYSTEM_SUBTYPES.items():
            if vyos_name in sys_children:
                setattr(s, f"system_{field_suffix}", True)

    return s


# ============================================================================
# Endpoint 1: Capabilities
# ============================================================================


@router.get("/capabilities")
async def get_config_sync_capabilities(request: Request):
    """Return config-sync feature capabilities based on the VyOS version."""
    await require_read_permission(request, FeatureGroup.CONFIG_SYNC)
    try:
        service = get_session_vyos_service(request)
        builder = ConfigSyncBatchBuilder(version=service.get_version())
        caps = builder.get_capabilities()
        if hasattr(request.state, "instance") and request.state.instance:
            caps["instance_name"] = request.state.instance.get("name")
            caps["instance_id"] = request.state.instance.get("id")
        return caps
    except Exception:
        logger.exception("Unhandled error in get_config_sync_capabilities")
        raise HTTPException(status_code=500, detail="Internal server error")


# ============================================================================
# Endpoint 2: Config
# ============================================================================


@router.get("/config", response_model=ConfigSyncConfig)
async def get_config_sync_config(http_request: Request, refresh: bool = False):
    """Return the full config-sync configuration in a normalized format."""
    await require_read_permission(http_request, FeatureGroup.CONFIG_SYNC)
    try:
        service = get_session_vyos_service(http_request)
        full_config = await run_in_threadpool(service.get_full_config, refresh=refresh)

        cs_raw = full_config.get("service", {}).get("config-sync", {})
        if not cs_raw:
            return ConfigSyncConfig()

        mode = cs_raw.get("mode")

        secondary = None
        sec_raw = cs_raw.get("secondary")
        if sec_raw and isinstance(sec_raw, dict):
            port_raw = sec_raw.get("port")
            timeout_raw = sec_raw.get("timeout")
            secondary = ConfigSyncSecondary(
                address=sec_raw.get("address"),
                key=sec_raw.get("key"),
                port=int(port_raw) if port_raw is not None else None,
                timeout=int(timeout_raw) if timeout_raw is not None else None,
            )

        sections = _parse_sections(cs_raw.get("section", {}))

        return ConfigSyncConfig(mode=mode, secondary=secondary, sections=sections)
    except Exception:
        logger.exception("Unhandled error in get_config_sync_config")
        raise HTTPException(status_code=500, detail="Internal server error")


# ============================================================================
# Endpoint 3: Batch Operations
# ============================================================================


@router.post("/batch", response_model=VyOSResponse)
async def config_sync_batch_configure(
    http_request: Request, body: ConfigSyncBatchRequest
):
    """Execute a batch of config-sync configuration operations atomically."""
    await require_write_permission(http_request, FeatureGroup.CONFIG_SYNC)
    try:
        service = get_session_vyos_service(http_request)
        builder = ConfigSyncBatchBuilder(version=service.get_version())

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
            data={"message": "Config-Sync configuration updated"},
            error=response.error if response.error else None,
        )
    except HTTPException:
        raise
    except AttributeError as e:
        raise HTTPException(status_code=400, detail=f"Unknown operation: {e}")
    except Exception:
        logger.exception("Unhandled error in config_sync_batch_configure")
        raise HTTPException(status_code=500, detail="Internal server error")
