"""
VPP Interface Command Mapper

Handles all VPP (Vector Packet Processing) interface types for VyOS 1.5+:
  bonding   (vppbondN)  — bond/LAG interfaces
  bridge    (vppbrN)    — bridge domains
  gre       (vppgreN)   — GRE tunnels
  ipip      (vppipipN)  — IP-in-IP tunnels
  loopback  (vpploN)    — loopback interfaces
  vxlan     (vppvxlanN) — VXLAN tunnels
  xconnect  (vppxconN)  — L2 cross-connects
"""

from typing import List
from ..base import BaseFeatureMapper


class VppInterfaceMapper(BaseFeatureMapper):
    """Base VPP interface mapper — paths for all VPP interface types."""

    def __init__(self, version: str):
        super().__init__(version)

    # =========================================================================
    # Internal base helpers
    # =========================================================================

    def _bonding_base(self, name: str) -> List[str]:
        return ["interfaces", "vpp", "bonding", name]

    def _bridge_base(self, name: str) -> List[str]:
        return ["interfaces", "vpp", "bridge", name]

    def _gre_base(self, name: str) -> List[str]:
        return ["interfaces", "vpp", "gre", name]

    def _ipip_base(self, name: str) -> List[str]:
        return ["interfaces", "vpp", "ipip", name]

    def _loopback_base(self, name: str) -> List[str]:
        return ["interfaces", "vpp", "loopback", name]

    def _vxlan_base(self, name: str) -> List[str]:
        return ["interfaces", "vpp", "vxlan", name]

    def _xconnect_base(self, name: str) -> List[str]:
        return ["interfaces", "vpp", "xconnect", name]

    # =========================================================================
    # Bonding paths
    # =========================================================================

    def get_bonding(self, name: str) -> List[str]:
        return self._bonding_base(name)

    def get_bonding_description(self, name: str, description: str) -> List[str]:
        return self._bonding_base(name) + ["description", description]

    def get_bonding_description_path(self, name: str) -> List[str]:
        return self._bonding_base(name) + ["description"]

    def get_bonding_disable(self, name: str) -> List[str]:
        return self._bonding_base(name) + ["disable"]

    def get_bonding_mac(self, name: str, mac: str) -> List[str]:
        return self._bonding_base(name) + ["mac", mac]

    def get_bonding_mac_path(self, name: str) -> List[str]:
        return self._bonding_base(name) + ["mac"]

    def get_bonding_mtu(self, name: str, mtu: str) -> List[str]:
        return self._bonding_base(name) + ["mtu", mtu]

    def get_bonding_mtu_path(self, name: str) -> List[str]:
        return self._bonding_base(name) + ["mtu"]

    def get_bonding_mode(self, name: str, mode: str) -> List[str]:
        return self._bonding_base(name) + ["mode", mode]

    def get_bonding_mode_path(self, name: str) -> List[str]:
        return self._bonding_base(name) + ["mode"]

    def get_bonding_hash_policy(self, name: str, policy: str) -> List[str]:
        return self._bonding_base(name) + ["hash-policy", policy]

    def get_bonding_hash_policy_path(self, name: str) -> List[str]:
        return self._bonding_base(name) + ["hash-policy"]

    def get_bonding_address(self, name: str, address: str) -> List[str]:
        return self._bonding_base(name) + ["address", address]

    def get_bonding_address_path(self, name: str) -> List[str]:
        return self._bonding_base(name) + ["address"]

    def get_bonding_member(self, name: str, member: str) -> List[str]:
        return self._bonding_base(name) + ["member", "interface", member]

    def get_bonding_member_path(self, name: str) -> List[str]:
        return self._bonding_base(name) + ["member", "interface"]

    def get_bonding_vif(self, name: str, vlan_id: str) -> List[str]:
        return self._bonding_base(name) + ["vif", vlan_id]

    def get_bonding_vif_address(self, name: str, vlan_id: str, address: str) -> List[str]:
        return self._bonding_base(name) + ["vif", vlan_id, "address", address]

    def get_bonding_vif_address_path(self, name: str, vlan_id: str) -> List[str]:
        return self._bonding_base(name) + ["vif", vlan_id, "address"]

    def get_bonding_vif_description(self, name: str, vlan_id: str, description: str) -> List[str]:
        return self._bonding_base(name) + ["vif", vlan_id, "description", description]

    def get_bonding_vif_description_path(self, name: str, vlan_id: str) -> List[str]:
        return self._bonding_base(name) + ["vif", vlan_id, "description"]

    def get_bonding_vif_disable(self, name: str, vlan_id: str) -> List[str]:
        return self._bonding_base(name) + ["vif", vlan_id, "disable"]

    def get_bonding_vif_mtu(self, name: str, vlan_id: str, mtu: str) -> List[str]:
        return self._bonding_base(name) + ["vif", vlan_id, "mtu", mtu]

    def get_bonding_vif_mtu_path(self, name: str, vlan_id: str) -> List[str]:
        return self._bonding_base(name) + ["vif", vlan_id, "mtu"]

    # =========================================================================
    # Bridge paths
    # =========================================================================

    def get_bridge(self, name: str) -> List[str]:
        return self._bridge_base(name)

    def get_bridge_description(self, name: str, description: str) -> List[str]:
        return self._bridge_base(name) + ["description", description]

    def get_bridge_description_path(self, name: str) -> List[str]:
        return self._bridge_base(name) + ["description"]

    def get_bridge_member(self, name: str, member: str) -> List[str]:
        return self._bridge_base(name) + ["member", "interface", member]

    def get_bridge_member_path(self, name: str) -> List[str]:
        return self._bridge_base(name) + ["member", "interface"]

    def get_bridge_member_bvi(self, name: str, member: str) -> List[str]:
        return self._bridge_base(name) + ["member", "interface", member, "bvi"]

    # =========================================================================
    # GRE paths
    # =========================================================================

    def get_gre(self, name: str) -> List[str]:
        return self._gre_base(name)

    def get_gre_description(self, name: str, description: str) -> List[str]:
        return self._gre_base(name) + ["description", description]

    def get_gre_description_path(self, name: str) -> List[str]:
        return self._gre_base(name) + ["description"]

    def get_gre_disable(self, name: str) -> List[str]:
        return self._gre_base(name) + ["disable"]

    def get_gre_address(self, name: str, address: str) -> List[str]:
        return self._gre_base(name) + ["address", address]

    def get_gre_address_path(self, name: str) -> List[str]:
        return self._gre_base(name) + ["address"]

    def get_gre_mtu(self, name: str, mtu: str) -> List[str]:
        return self._gre_base(name) + ["mtu", mtu]

    def get_gre_mtu_path(self, name: str) -> List[str]:
        return self._gre_base(name) + ["mtu"]

    def get_gre_remote(self, name: str, remote: str) -> List[str]:
        return self._gre_base(name) + ["remote", remote]

    def get_gre_remote_path(self, name: str) -> List[str]:
        return self._gre_base(name) + ["remote"]

    def get_gre_source_address(self, name: str, source: str) -> List[str]:
        return self._gre_base(name) + ["source-address", source]

    def get_gre_source_address_path(self, name: str) -> List[str]:
        return self._gre_base(name) + ["source-address"]

    def get_gre_tunnel_type(self, name: str, tunnel_type: str) -> List[str]:
        return self._gre_base(name) + ["tunnel-type", tunnel_type]

    def get_gre_tunnel_type_path(self, name: str) -> List[str]:
        return self._gre_base(name) + ["tunnel-type"]

    def get_gre_key(self, name: str, key: str) -> List[str]:
        return self._gre_base(name) + ["key", key]

    def get_gre_key_path(self, name: str) -> List[str]:
        return self._gre_base(name) + ["key"]

    # =========================================================================
    # IPIP paths
    # =========================================================================

    def get_ipip(self, name: str) -> List[str]:
        return self._ipip_base(name)

    def get_ipip_description(self, name: str, description: str) -> List[str]:
        return self._ipip_base(name) + ["description", description]

    def get_ipip_description_path(self, name: str) -> List[str]:
        return self._ipip_base(name) + ["description"]

    def get_ipip_disable(self, name: str) -> List[str]:
        return self._ipip_base(name) + ["disable"]

    def get_ipip_address(self, name: str, address: str) -> List[str]:
        return self._ipip_base(name) + ["address", address]

    def get_ipip_address_path(self, name: str) -> List[str]:
        return self._ipip_base(name) + ["address"]

    def get_ipip_mtu(self, name: str, mtu: str) -> List[str]:
        return self._ipip_base(name) + ["mtu", mtu]

    def get_ipip_mtu_path(self, name: str) -> List[str]:
        return self._ipip_base(name) + ["mtu"]

    def get_ipip_remote(self, name: str, remote: str) -> List[str]:
        return self._ipip_base(name) + ["remote", remote]

    def get_ipip_remote_path(self, name: str) -> List[str]:
        return self._ipip_base(name) + ["remote"]

    def get_ipip_source_address(self, name: str, source: str) -> List[str]:
        return self._ipip_base(name) + ["source-address", source]

    def get_ipip_source_address_path(self, name: str) -> List[str]:
        return self._ipip_base(name) + ["source-address"]

    # =========================================================================
    # Loopback paths
    # =========================================================================

    def get_loopback(self, name: str) -> List[str]:
        return self._loopback_base(name)

    def get_loopback_description(self, name: str, description: str) -> List[str]:
        return self._loopback_base(name) + ["description", description]

    def get_loopback_description_path(self, name: str) -> List[str]:
        return self._loopback_base(name) + ["description"]

    def get_loopback_disable(self, name: str) -> List[str]:
        return self._loopback_base(name) + ["disable"]

    def get_loopback_address(self, name: str, address: str) -> List[str]:
        return self._loopback_base(name) + ["address", address]

    def get_loopback_address_path(self, name: str) -> List[str]:
        return self._loopback_base(name) + ["address"]

    def get_loopback_mtu(self, name: str, mtu: str) -> List[str]:
        return self._loopback_base(name) + ["mtu", mtu]

    def get_loopback_mtu_path(self, name: str) -> List[str]:
        return self._loopback_base(name) + ["mtu"]

    def get_loopback_vif(self, name: str, vlan_id: str) -> List[str]:
        return self._loopback_base(name) + ["vif", vlan_id]

    def get_loopback_vif_address(self, name: str, vlan_id: str, address: str) -> List[str]:
        return self._loopback_base(name) + ["vif", vlan_id, "address", address]

    def get_loopback_vif_address_path(self, name: str, vlan_id: str) -> List[str]:
        return self._loopback_base(name) + ["vif", vlan_id, "address"]

    def get_loopback_vif_description(self, name: str, vlan_id: str, description: str) -> List[str]:
        return self._loopback_base(name) + ["vif", vlan_id, "description", description]

    def get_loopback_vif_description_path(self, name: str, vlan_id: str) -> List[str]:
        return self._loopback_base(name) + ["vif", vlan_id, "description"]

    def get_loopback_vif_disable(self, name: str, vlan_id: str) -> List[str]:
        return self._loopback_base(name) + ["vif", vlan_id, "disable"]

    def get_loopback_vif_mtu(self, name: str, vlan_id: str, mtu: str) -> List[str]:
        return self._loopback_base(name) + ["vif", vlan_id, "mtu", mtu]

    def get_loopback_vif_mtu_path(self, name: str, vlan_id: str) -> List[str]:
        return self._loopback_base(name) + ["vif", vlan_id, "mtu"]

    # =========================================================================
    # VXLAN paths
    # =========================================================================

    def get_vxlan(self, name: str) -> List[str]:
        return self._vxlan_base(name)

    def get_vxlan_description(self, name: str, description: str) -> List[str]:
        return self._vxlan_base(name) + ["description", description]

    def get_vxlan_description_path(self, name: str) -> List[str]:
        return self._vxlan_base(name) + ["description"]

    def get_vxlan_disable(self, name: str) -> List[str]:
        return self._vxlan_base(name) + ["disable"]

    def get_vxlan_address(self, name: str, address: str) -> List[str]:
        return self._vxlan_base(name) + ["address", address]

    def get_vxlan_address_path(self, name: str) -> List[str]:
        return self._vxlan_base(name) + ["address"]

    def get_vxlan_mtu(self, name: str, mtu: str) -> List[str]:
        return self._vxlan_base(name) + ["mtu", mtu]

    def get_vxlan_mtu_path(self, name: str) -> List[str]:
        return self._vxlan_base(name) + ["mtu"]

    def get_vxlan_remote(self, name: str, remote: str) -> List[str]:
        return self._vxlan_base(name) + ["remote", remote]

    def get_vxlan_remote_path(self, name: str) -> List[str]:
        return self._vxlan_base(name) + ["remote"]

    def get_vxlan_source_address(self, name: str, source: str) -> List[str]:
        return self._vxlan_base(name) + ["source-address", source]

    def get_vxlan_source_address_path(self, name: str) -> List[str]:
        return self._vxlan_base(name) + ["source-address"]

    def get_vxlan_vni(self, name: str, vni: str) -> List[str]:
        return self._vxlan_base(name) + ["vni", vni]

    def get_vxlan_vni_path(self, name: str) -> List[str]:
        return self._vxlan_base(name) + ["vni"]

    # =========================================================================
    # XConnect paths
    # =========================================================================

    def get_xconnect(self, name: str) -> List[str]:
        return self._xconnect_base(name)

    def get_xconnect_description(self, name: str, description: str) -> List[str]:
        return self._xconnect_base(name) + ["description", description]

    def get_xconnect_description_path(self, name: str) -> List[str]:
        return self._xconnect_base(name) + ["description"]

    def get_xconnect_disable(self, name: str) -> List[str]:
        return self._xconnect_base(name) + ["disable"]

    def get_xconnect_member(self, name: str, member: str) -> List[str]:
        return self._xconnect_base(name) + ["member", "interface", member]

    def get_xconnect_member_path(self, name: str) -> List[str]:
        return self._xconnect_base(name) + ["member", "interface"]

    # =========================================================================
    # Config parsing helpers
    # =========================================================================

    def parse_all_vpp_interfaces(self, raw_config: dict) -> dict:
        bonding = [
            self._parse_bonding(n, d)
            for n, d in raw_config.get("bonding", {}).items()
            if isinstance(d, dict)
        ]
        bridge = [
            self._parse_bridge(n, d)
            for n, d in raw_config.get("bridge", {}).items()
            if isinstance(d, dict)
        ]
        gre = [
            self._parse_gre(n, d)
            for n, d in raw_config.get("gre", {}).items()
            if isinstance(d, dict)
        ]
        ipip = [
            self._parse_ipip(n, d)
            for n, d in raw_config.get("ipip", {}).items()
            if isinstance(d, dict)
        ]
        loopback = [
            self._parse_loopback(n, d)
            for n, d in raw_config.get("loopback", {}).items()
            if isinstance(d, dict)
        ]
        vxlan = [
            self._parse_vxlan(n, d)
            for n, d in raw_config.get("vxlan", {}).items()
            if isinstance(d, dict)
        ]
        xconnect = [
            self._parse_xconnect(n, d)
            for n, d in raw_config.get("xconnect", {}).items()
            if isinstance(d, dict)
        ]
        total = len(bonding) + len(bridge) + len(gre) + len(ipip) + len(loopback) + len(vxlan) + len(xconnect)
        return {
            "bonding": bonding,
            "bridge": bridge,
            "gre": gre,
            "ipip": ipip,
            "loopback": loopback,
            "vxlan": vxlan,
            "xconnect": xconnect,
            "total": total,
        }

    def _parse_addresses(self, data: dict) -> List[str]:
        addr_raw = data.get("address", {})
        return list(addr_raw.keys()) if isinstance(addr_raw, dict) else []

    def _parse_vif(self, vlan_id: str, data: dict) -> dict:
        return {
            "vlan_id": vlan_id,
            "description": data.get("description"),
            "disabled": "disable" in data,
            "addresses": self._parse_addresses(data),
            "mtu": data.get("mtu"),
        }

    def _parse_bonding(self, name: str, data: dict) -> dict:
        member_raw = data.get("member", {}).get("interface", {})
        members = list(member_raw.keys()) if isinstance(member_raw, dict) else []
        vif_raw = data.get("vif", {})
        vifs = [self._parse_vif(vid, vd) for vid, vd in vif_raw.items() if isinstance(vd, dict)]
        return {
            "name": name,
            "description": data.get("description"),
            "disabled": "disable" in data,
            "mode": data.get("mode"),
            "hash_policy": data.get("hash-policy"),
            "mac": data.get("mac"),
            "mtu": data.get("mtu"),
            "addresses": self._parse_addresses(data),
            "members": members,
            "vif": vifs,
        }

    def _parse_bridge(self, name: str, data: dict) -> dict:
        member_raw = data.get("member", {}).get("interface", {})
        members = []
        if isinstance(member_raw, dict):
            for iface, iface_data in member_raw.items():
                bvi = isinstance(iface_data, dict) and "bvi" in iface_data
                members.append({"interface": iface, "bvi": bvi})
        return {
            "name": name,
            "description": data.get("description"),
            "members": members,
        }

    def _parse_gre(self, name: str, data: dict) -> dict:
        return {
            "name": name,
            "description": data.get("description"),
            "disabled": "disable" in data,
            "addresses": self._parse_addresses(data),
            "mtu": data.get("mtu"),
            "remote": data.get("remote"),
            "source_address": data.get("source-address"),
            "tunnel_type": data.get("tunnel-type"),
            "key": data.get("key"),
        }

    def _parse_ipip(self, name: str, data: dict) -> dict:
        return {
            "name": name,
            "description": data.get("description"),
            "disabled": "disable" in data,
            "addresses": self._parse_addresses(data),
            "mtu": data.get("mtu"),
            "remote": data.get("remote"),
            "source_address": data.get("source-address"),
        }

    def _parse_loopback(self, name: str, data: dict) -> dict:
        vif_raw = data.get("vif", {})
        vifs = [self._parse_vif(vid, vd) for vid, vd in vif_raw.items() if isinstance(vd, dict)]
        return {
            "name": name,
            "description": data.get("description"),
            "disabled": "disable" in data,
            "addresses": self._parse_addresses(data),
            "mtu": data.get("mtu"),
            "vif": vifs,
        }

    def _parse_vxlan(self, name: str, data: dict) -> dict:
        return {
            "name": name,
            "description": data.get("description"),
            "disabled": "disable" in data,
            "addresses": self._parse_addresses(data),
            "mtu": data.get("mtu"),
            "remote": data.get("remote"),
            "source_address": data.get("source-address"),
            "vni": data.get("vni"),
        }

    def _parse_xconnect(self, name: str, data: dict) -> dict:
        member_raw = data.get("member", {}).get("interface", {})
        members = list(member_raw.keys()) if isinstance(member_raw, dict) else []
        return {
            "name": name,
            "description": data.get("description"),
            "disabled": "disable" in data,
            "members": members,
        }
