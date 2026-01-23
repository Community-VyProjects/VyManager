"""
VRF (Virtual Routing and Forwarding) Command Mapper

Handles VRF commands for routing table isolation.
"""

from typing import List, Dict, Any, Optional
from .base import BaseFeatureMapper


class VRFMapper(BaseFeatureMapper):
    """VRF mapper with all VRF operations"""

    def __init__(self, version: str):
        """Initialize with VyOS version."""
        super().__init__(version)

    # ========================================================================
    # VRF Instance Commands
    # ========================================================================

    def get_vrf(self, name: str) -> List[str]:
        """Get command path for creating a VRF."""
        return ["vrf", "name", name]

    def get_vrf_table(self, name: str, table_id: str) -> List[str]:
        """Get command path for VRF routing table ID."""
        return ["vrf", "name", name, "table", table_id]

    def get_vrf_description(self, name: str, description: str) -> List[str]:
        """Get command path for VRF description."""
        return ["vrf", "name", name, "description", description]

    def get_vrf_description_path(self, name: str) -> List[str]:
        """Get command path for VRF description (for deletion)."""
        return ["vrf", "name", name, "description"]

    def get_vrf_disable(self, name: str) -> List[str]:
        """Get command path for disabling VRF."""
        return ["vrf", "name", name, "disable"]

    # ========================================================================
    # VRF Global Commands
    # ========================================================================

    def get_bind_to_all() -> List[str]:
        """Get command path for binding services to all VRFs."""
        return ["vrf", "bind-to-all"]

    # ========================================================================
    # VRF Route Filtering Commands
    # ========================================================================

    def get_vrf_ip_protocol_route_map(self, name: str, protocol: str, route_map: str) -> List[str]:
        """Get command path for IPv4 route filtering."""
        return ["vrf", name, "ip", "protocol", protocol, "route-map", route_map]

    def get_vrf_ipv6_protocol_route_map(self, name: str, protocol: str, route_map: str) -> List[str]:
        """Get command path for IPv6 route filtering."""
        return ["vrf", name, "ipv6", "protocol", protocol, "route-map", route_map]

    # ========================================================================
    # VRF Nexthop Tracking Commands
    # ========================================================================

    def get_vrf_ip_nht_no_resolve_via_default(self, name: str) -> List[str]:
        """Get command path for disabling IPv4 default route resolution."""
        return ["vrf", "name", name, "ip", "nht", "no-resolve-via-default"]

    def get_vrf_ipv6_nht_no_resolve_via_default(self, name: str) -> List[str]:
        """Get command path for disabling IPv6 default route resolution."""
        return ["vrf", "name", name, "ipv6", "nht", "no-resolve-via-default"]

    # ========================================================================
    # VRF Static Routes Commands
    # ========================================================================

    def get_vrf_static_route(self, name: str, network: str) -> List[str]:
        """Get command path for VRF static route."""
        return ["vrf", "name", name, "protocols", "static", "route", network]

    def get_vrf_static_route_next_hop(self, name: str, network: str, next_hop: str) -> List[str]:
        """Get command path for VRF static route next-hop."""
        return ["vrf", "name", name, "protocols", "static", "route", network, "next-hop", next_hop]

    def get_vrf_static_route_next_hop_distance(self, name: str, network: str, next_hop: str, distance: str) -> List[str]:
        """Get command path for VRF static route next-hop distance."""
        return ["vrf", "name", name, "protocols", "static", "route", network, "next-hop", next_hop, "distance", distance]

    def get_vrf_static_route_blackhole(self, name: str, network: str) -> List[str]:
        """Get command path for VRF blackhole route."""
        return ["vrf", "name", name, "protocols", "static", "route", network, "blackhole"]

    def get_vrf_static_route_interface(self, name: str, network: str, interface: str) -> List[str]:
        """Get command path for VRF static route interface."""
        return ["vrf", "name", name, "protocols", "static", "route", network, "interface", interface]

    # IPv6 static routes
    def get_vrf_static_route6(self, name: str, network: str) -> List[str]:
        """Get command path for VRF static IPv6 route."""
        return ["vrf", "name", name, "protocols", "static", "route6", network]

    def get_vrf_static_route6_next_hop(self, name: str, network: str, next_hop: str) -> List[str]:
        """Get command path for VRF static IPv6 route next-hop."""
        return ["vrf", "name", name, "protocols", "static", "route6", network, "next-hop", next_hop]

    # ========================================================================
    # VRF BGP Commands
    # ========================================================================

    def get_vrf_bgp_system_as(self, name: str, asn: str) -> List[str]:
        """Get command path for VRF BGP system AS."""
        return ["vrf", "name", name, "protocols", "bgp", "system-as", asn]

    def get_vrf_bgp_router_id(self, name: str, router_id: str) -> List[str]:
        """Get command path for VRF BGP router-id."""
        return ["vrf", "name", name, "protocols", "bgp", "parameters", "router-id", router_id]

    def get_vrf_bgp_neighbor(self, name: str, neighbor: str) -> List[str]:
        """Get command path for VRF BGP neighbor."""
        return ["vrf", "name", name, "protocols", "bgp", "neighbor", neighbor]

    def get_vrf_bgp_neighbor_remote_as(self, name: str, neighbor: str, asn: str) -> List[str]:
        """Get command path for VRF BGP neighbor remote-as."""
        return ["vrf", "name", name, "protocols", "bgp", "neighbor", neighbor, "remote-as", asn]

    def get_vrf_bgp_address_family(self, name: str, af: str) -> List[str]:
        """Get command path for VRF BGP address family."""
        return ["vrf", "name", name, "protocols", "bgp", "address-family", af]

    def get_vrf_bgp_redistribute(self, name: str, af: str, protocol: str) -> List[str]:
        """Get command path for VRF BGP redistribution."""
        return ["vrf", "name", name, "protocols", "bgp", "address-family", af, "redistribute", protocol]

    # L3VPN Commands
    def get_vrf_bgp_rd_vpn_export(self, name: str, af: str, rd: str) -> List[str]:
        """Get command path for VRF BGP route distinguisher export."""
        return ["vrf", "name", name, "protocols", "bgp", "address-family", af, "rd", "vpn", "export", rd]

    def get_vrf_bgp_route_target_vpn(self, name: str, af: str, direction: str, rt: str) -> List[str]:
        """Get command path for VRF BGP route target."""
        return ["vrf", "name", name, "protocols", "bgp", "address-family", af, "route-target", "vpn", direction, rt]

    def get_vrf_bgp_label_vpn_export(self, name: str, af: str, label: str) -> List[str]:
        """Get command path for VRF BGP label export."""
        return ["vrf", "name", name, "protocols", "bgp", "address-family", af, "label", "vpn", "export", label]

    def get_vrf_bgp_import_vpn(self, name: str, af: str) -> List[str]:
        """Get command path for VRF BGP VPN import."""
        return ["vrf", "name", name, "protocols", "bgp", "address-family", af, "import", "vpn"]

    def get_vrf_bgp_export_vpn(self, name: str, af: str) -> List[str]:
        """Get command path for VRF BGP VPN export."""
        return ["vrf", "name", name, "protocols", "bgp", "address-family", af, "export", "vpn"]

    def get_vrf_bgp_import_vrf(self, name: str, af: str, import_vrf: str) -> List[str]:
        """Get command path for VRF BGP route leaking from another VRF."""
        return ["vrf", "name", name, "protocols", "bgp", "address-family", af, "import", "vrf", import_vrf]

    # ========================================================================
    # VRF OSPF Commands
    # ========================================================================

    def get_vrf_ospf(self, name: str) -> List[str]:
        """Get command path for VRF OSPF."""
        return ["vrf", "name", name, "protocols", "ospf"]

    def get_vrf_ospf_area(self, name: str, area: str) -> List[str]:
        """Get command path for VRF OSPF area."""
        return ["vrf", "name", name, "protocols", "ospf", "area", area]

    def get_vrf_ospf_area_network(self, name: str, area: str, network: str) -> List[str]:
        """Get command path for VRF OSPF area network."""
        return ["vrf", "name", name, "protocols", "ospf", "area", area, "network", network]

    def get_vrf_ospf_redistribute(self, name: str, protocol: str) -> List[str]:
        """Get command path for VRF OSPF redistribution."""
        return ["vrf", "name", name, "protocols", "ospf", "redistribute", protocol]

    # ========================================================================
    # Interface VRF Assignment
    # ========================================================================

    def get_interface_vrf(self, interface_type: str, interface_name: str, vrf_name: str) -> List[str]:
        """Get command path for assigning interface to VRF."""
        return ["interfaces", interface_type, interface_name, "vrf", vrf_name]

    def get_interface_vrf_path(self, interface_type: str, interface_name: str) -> List[str]:
        """Get command path for interface VRF (for deletion)."""
        return ["interfaces", interface_type, interface_name, "vrf"]

    # ========================================================================
    # Config Parsing Methods
    # ========================================================================

    def parse_static_routes(self, static_config: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Parse static routes from VRF config."""
        routes = []
        route_config = static_config.get("route", {})

        for network, route_data in route_config.items():
            if not isinstance(route_data, dict):
                continue

            route = {
                "network": network,
                "next_hops": [],
                "blackhole": "blackhole" in route_data,
                "interfaces": [],
            }

            # Parse next-hops
            next_hop_config = route_data.get("next-hop", {})
            for nh, nh_data in next_hop_config.items() if isinstance(next_hop_config, dict) else []:
                nh_entry = {"address": nh}
                if isinstance(nh_data, dict):
                    nh_entry["distance"] = nh_data.get("distance")
                    nh_entry["disable"] = "disable" in nh_data
                route["next_hops"].append(nh_entry)

            # Parse interfaces
            interface_config = route_data.get("interface", {})
            for iface in interface_config.keys() if isinstance(interface_config, dict) else []:
                route["interfaces"].append(iface)

            routes.append(route)

        return routes

    def parse_vrf(self, vrf_name: str, vrf_data: Dict[str, Any]) -> Dict[str, Any]:
        """Parse a single VRF configuration."""
        protocols = vrf_data.get("protocols", {})

        # Parse static routes
        static_routes_ipv4 = []
        static_routes_ipv6 = []
        static_config = protocols.get("static", {})
        if static_config:
            static_routes_ipv4 = self.parse_static_routes(static_config)
            # Parse IPv6 routes
            route6_config = static_config.get("route6", {})
            for network, route_data in route6_config.items() if isinstance(route6_config, dict) else []:
                if isinstance(route_data, dict):
                    route = {
                        "network": network,
                        "next_hops": [],
                    }
                    next_hop_config = route_data.get("next-hop", {})
                    for nh in next_hop_config.keys() if isinstance(next_hop_config, dict) else []:
                        route["next_hops"].append({"address": nh})
                    static_routes_ipv6.append(route)

        # Parse BGP
        bgp_config = protocols.get("bgp", {})
        bgp = None
        if bgp_config:
            bgp = {
                "system_as": bgp_config.get("system-as"),
                "router_id": bgp_config.get("parameters", {}).get("router-id"),
                "neighbors": [],
                "address_families": [],
            }
            # Parse neighbors
            for neighbor, neighbor_data in bgp_config.get("neighbor", {}).items():
                if isinstance(neighbor_data, dict):
                    bgp["neighbors"].append({
                        "address": neighbor,
                        "remote_as": neighbor_data.get("remote-as"),
                    })
            # Parse address families
            for af, af_data in bgp_config.get("address-family", {}).items():
                if isinstance(af_data, dict):
                    af_entry = {
                        "name": af,
                        "redistribute": list(af_data.get("redistribute", {}).keys()) if isinstance(af_data.get("redistribute"), dict) else [],
                        "import_vpn": "import" in af_data and "vpn" in af_data.get("import", {}),
                        "export_vpn": "export" in af_data and "vpn" in af_data.get("export", {}),
                        "import_vrfs": list(af_data.get("import", {}).get("vrf", {}).keys()) if isinstance(af_data.get("import", {}).get("vrf"), dict) else [],
                    }
                    # L3VPN settings
                    rd_config = af_data.get("rd", {})
                    if rd_config:
                        af_entry["rd_export"] = rd_config.get("vpn", {}).get("export")
                    rt_config = af_data.get("route-target", {})
                    if rt_config:
                        vpn_rt = rt_config.get("vpn", {})
                        af_entry["route_target_import"] = vpn_rt.get("import")
                        af_entry["route_target_export"] = vpn_rt.get("export")
                        af_entry["route_target_both"] = vpn_rt.get("both")
                    bgp["address_families"].append(af_entry)

        # Parse OSPF
        ospf_config = protocols.get("ospf", {})
        ospf = None
        if ospf_config:
            ospf = {
                "areas": [],
                "redistribute": list(ospf_config.get("redistribute", {}).keys()) if isinstance(ospf_config.get("redistribute"), dict) else [],
            }
            for area, area_data in ospf_config.get("area", {}).items():
                if isinstance(area_data, dict):
                    ospf["areas"].append({
                        "id": area,
                        "networks": list(area_data.get("network", {}).keys()) if isinstance(area_data.get("network"), dict) else [],
                    })

        return {
            "name": vrf_name,
            "table": vrf_data.get("table"),
            "description": vrf_data.get("description"),
            "disable": "disable" in vrf_data,
            "static_routes_ipv4": static_routes_ipv4,
            "static_routes_ipv6": static_routes_ipv6,
            "bgp": bgp,
            "ospf": ospf,
        }

    def parse_full_config(self, full_config: Dict[str, Any]) -> Dict[str, Any]:
        """
        Parse full VRF configuration from VyOS.

        Args:
            full_config: Full VyOS config dictionary

        Returns:
            Parsed VRF configuration
        """
        vrf_config = full_config.get("vrf", {})
        name_config = vrf_config.get("name", {})

        vrfs = []
        for vrf_name, vrf_data in name_config.items():
            if isinstance(vrf_data, dict):
                vrfs.append(self.parse_vrf(vrf_name, vrf_data))

        # Get interfaces assigned to VRFs
        interfaces_by_vrf: Dict[str, List[str]] = {}
        interfaces_config = full_config.get("interfaces", {})
        for iface_type, iface_type_data in interfaces_config.items():
            if isinstance(iface_type_data, dict):
                for iface_name, iface_data in iface_type_data.items():
                    if isinstance(iface_data, dict) and "vrf" in iface_data:
                        vrf_name = iface_data["vrf"]
                        if vrf_name not in interfaces_by_vrf:
                            interfaces_by_vrf[vrf_name] = []
                        interfaces_by_vrf[vrf_name].append(f"{iface_type}{iface_name}" if iface_type != "ethernet" else f"eth{iface_name}")

        # Add interfaces to VRF data
        for vrf in vrfs:
            vrf["interfaces"] = interfaces_by_vrf.get(vrf["name"], [])

        return {
            "configured": len(vrfs) > 0,
            "bind_to_all": "bind-to-all" in vrf_config,
            "vrfs": vrfs,
        }
