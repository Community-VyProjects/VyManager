"""
OSPF Protocol Command Mapper

Handles OSPF (Open Shortest Path First) configuration commands.
Supports areas, interfaces, redistribution, and authentication.
"""

from typing import List, Dict, Any
from ..base import BaseFeatureMapper


class OSPFMapper(BaseFeatureMapper):
    """OSPF protocol mapper with all OSPF configuration operations"""

    def __init__(self, version: str):
        """Initialize with VyOS version."""
        super().__init__(version)

    # ========================================================================
    # Basic OSPF Configuration Paths
    # ========================================================================

    def get_ospf(self) -> List[str]:
        """Get command path for creating OSPF."""
        return ["protocols", "ospf"]

    def get_router_id(self, router_id: str) -> List[str]:
        """Get command path for setting OSPF router ID."""
        return ["protocols", "ospf", "parameters", "router-id", router_id]

    def get_router_id_path(self) -> List[str]:
        """Get command path for router ID (for deletion)."""
        return ["protocols", "ospf", "parameters", "router-id"]

    def get_abr_type(self, abr_type: str) -> List[str]:
        """Get command path for ABR type (cisco, ibm, shortcut, standard)."""
        return ["protocols", "ospf", "parameters", "abr-type", abr_type]

    def get_abr_type_path(self) -> List[str]:
        """Get command path for ABR type (for deletion)."""
        return ["protocols", "ospf", "parameters", "abr-type"]

    def get_rfc1583_compatibility(self) -> List[str]:
        """Get command path for RFC 1583 compatibility."""
        return ["protocols", "ospf", "parameters", "rfc1583-compatibility"]

    def get_opaque_lsa(self) -> List[str]:
        """Get command path for opaque LSA."""
        return ["protocols", "ospf", "parameters", "opaque-lsa"]

    # ========================================================================
    # Area Configuration Paths
    # ========================================================================

    def get_area(self, area: str) -> List[str]:
        """Get command path for creating an area."""
        return ["protocols", "ospf", "area", area]

    def get_area_network(self, area: str, network: str) -> List[str]:
        """Get command path for adding network to area."""
        return ["protocols", "ospf", "area", area, "network", network]

    def get_area_range(self, area: str, range_prefix: str) -> List[str]:
        """Get command path for area range (summarization)."""
        return ["protocols", "ospf", "area", area, "range", range_prefix]

    def get_area_range_cost(self, area: str, range_prefix: str, cost: str) -> List[str]:
        """Get command path for area range cost."""
        return ["protocols", "ospf", "area", area, "range", range_prefix, "cost", cost]

    def get_area_range_not_advertise(self, area: str, range_prefix: str) -> List[str]:
        """Get command path for not advertising area range."""
        return ["protocols", "ospf", "area", area, "range", range_prefix, "not-advertise"]

    def get_area_type_stub(self, area: str) -> List[str]:
        """Get command path for stub area."""
        return ["protocols", "ospf", "area", area, "area-type", "stub"]

    def get_area_type_stub_no_summary(self, area: str) -> List[str]:
        """Get command path for totally stubby area (no summary)."""
        return ["protocols", "ospf", "area", area, "area-type", "stub", "no-summary"]

    def get_area_type_stub_default_cost(self, area: str, cost: str) -> List[str]:
        """Get command path for stub area default cost."""
        return ["protocols", "ospf", "area", area, "area-type", "stub", "default-cost", cost]

    def get_area_type_nssa(self, area: str) -> List[str]:
        """Get command path for NSSA area."""
        return ["protocols", "ospf", "area", area, "area-type", "nssa"]

    def get_area_type_nssa_no_summary(self, area: str) -> List[str]:
        """Get command path for NSSA no-summary."""
        return ["protocols", "ospf", "area", area, "area-type", "nssa", "no-summary"]

    def get_area_type_nssa_default_cost(self, area: str, cost: str) -> List[str]:
        """Get command path for NSSA default cost."""
        return ["protocols", "ospf", "area", area, "area-type", "nssa", "default-cost", cost]

    def get_area_type_normal(self, area: str) -> List[str]:
        """Get command path for normal area type."""
        return ["protocols", "ospf", "area", area, "area-type", "normal"]

    # Virtual links
    def get_area_virtual_link(self, area: str, router_id: str) -> List[str]:
        """Get command path for virtual link."""
        return ["protocols", "ospf", "area", area, "virtual-link", router_id]

    # ========================================================================
    # Interface Configuration Paths
    # ========================================================================

    def get_interface(self, interface: str) -> List[str]:
        """Get command path for interface configuration."""
        return ["protocols", "ospf", "interface", interface]

    def get_interface_area(self, interface: str, area: str) -> List[str]:
        """Get command path for interface area assignment."""
        return ["protocols", "ospf", "interface", interface, "area", area]

    def get_interface_cost(self, interface: str, cost: str) -> List[str]:
        """Get command path for interface cost."""
        return ["protocols", "ospf", "interface", interface, "cost", cost]

    def get_interface_cost_path(self, interface: str) -> List[str]:
        """Get command path for interface cost (for deletion)."""
        return ["protocols", "ospf", "interface", interface, "cost"]

    def get_interface_priority(self, interface: str, priority: str) -> List[str]:
        """Get command path for interface priority."""
        return ["protocols", "ospf", "interface", interface, "priority", priority]

    def get_interface_priority_path(self, interface: str) -> List[str]:
        """Get command path for interface priority (for deletion)."""
        return ["protocols", "ospf", "interface", interface, "priority"]

    def get_interface_hello_interval(self, interface: str, interval: str) -> List[str]:
        """Get command path for hello interval."""
        return ["protocols", "ospf", "interface", interface, "hello-interval", interval]

    def get_interface_hello_interval_path(self, interface: str) -> List[str]:
        """Get command path for hello interval (for deletion)."""
        return ["protocols", "ospf", "interface", interface, "hello-interval"]

    def get_interface_dead_interval(self, interface: str, interval: str) -> List[str]:
        """Get command path for dead interval."""
        return ["protocols", "ospf", "interface", interface, "dead-interval", interval]

    def get_interface_dead_interval_path(self, interface: str) -> List[str]:
        """Get command path for dead interval (for deletion)."""
        return ["protocols", "ospf", "interface", interface, "dead-interval"]

    def get_interface_retransmit_interval(self, interface: str, interval: str) -> List[str]:
        """Get command path for retransmit interval."""
        return ["protocols", "ospf", "interface", interface, "retransmit-interval", interval]

    def get_interface_transmit_delay(self, interface: str, delay: str) -> List[str]:
        """Get command path for transmit delay."""
        return ["protocols", "ospf", "interface", interface, "transmit-delay", delay]

    def get_interface_network(self, interface: str, network_type: str) -> List[str]:
        """Get command path for interface network type (broadcast, point-to-point, etc.)."""
        return ["protocols", "ospf", "interface", interface, "network", network_type]

    def get_interface_network_path(self, interface: str) -> List[str]:
        """Get command path for interface network type (for deletion)."""
        return ["protocols", "ospf", "interface", interface, "network"]

    def get_interface_passive(self, interface: str) -> List[str]:
        """Get command path for passive interface."""
        return ["protocols", "ospf", "interface", interface, "passive"]

    def get_interface_mtu_ignore(self, interface: str) -> List[str]:
        """Get command path for MTU ignore."""
        return ["protocols", "ospf", "interface", interface, "mtu-ignore"]

    # Authentication
    def get_interface_authentication_md5_key(self, interface: str, key_id: str, key: str) -> List[str]:
        """Get command path for MD5 authentication."""
        return ["protocols", "ospf", "interface", interface, "authentication", "md5", "key-id", key_id, "md5-key", key]

    def get_interface_authentication_plaintext(self, interface: str, password: str) -> List[str]:
        """Get command path for plaintext authentication."""
        return ["protocols", "ospf", "interface", interface, "authentication", "plaintext-password", password]

    # BFD
    def get_interface_bfd(self, interface: str) -> List[str]:
        """Get command path for enabling BFD on interface."""
        return ["protocols", "ospf", "interface", interface, "bfd"]

    # ========================================================================
    # Passive Interface Configuration
    # ========================================================================

    def get_passive_interface(self, interface: str) -> List[str]:
        """Get command path for passive interface."""
        return ["protocols", "ospf", "passive-interface", interface]

    def get_passive_interface_default(self) -> List[str]:
        """Get command path for passive interface default."""
        return ["protocols", "ospf", "passive-interface", "default"]

    # ========================================================================
    # Redistribution Configuration Paths
    # ========================================================================

    def get_redistribute(self, protocol: str) -> List[str]:
        """Get command path for redistributing a protocol."""
        return ["protocols", "ospf", "redistribute", protocol]

    def get_redistribute_route_map(self, protocol: str, route_map: str) -> List[str]:
        """Get command path for redistribution route-map."""
        return ["protocols", "ospf", "redistribute", protocol, "route-map", route_map]

    def get_redistribute_metric(self, protocol: str, metric: str) -> List[str]:
        """Get command path for redistribution metric."""
        return ["protocols", "ospf", "redistribute", protocol, "metric", metric]

    def get_redistribute_metric_type(self, protocol: str, metric_type: str) -> List[str]:
        """Get command path for redistribution metric type (1 or 2)."""
        return ["protocols", "ospf", "redistribute", protocol, "metric-type", metric_type]

    # ========================================================================
    # Default Information Configuration
    # ========================================================================

    def get_default_information_originate(self) -> List[str]:
        """Get command path for originating default information."""
        return ["protocols", "ospf", "default-information", "originate"]

    def get_default_information_originate_always(self) -> List[str]:
        """Get command path for always originating default."""
        return ["protocols", "ospf", "default-information", "originate", "always"]

    def get_default_information_originate_metric(self, metric: str) -> List[str]:
        """Get command path for default information metric."""
        return ["protocols", "ospf", "default-information", "originate", "metric", metric]

    def get_default_information_originate_metric_type(self, metric_type: str) -> List[str]:
        """Get command path for default information metric type."""
        return ["protocols", "ospf", "default-information", "originate", "metric-type", metric_type]

    def get_default_information_originate_route_map(self, route_map: str) -> List[str]:
        """Get command path for default information route-map."""
        return ["protocols", "ospf", "default-information", "originate", "route-map", route_map]

    # ========================================================================
    # Timers Configuration
    # ========================================================================

    def get_timers_throttle_spf_delay(self, delay: str) -> List[str]:
        """Get command path for SPF delay."""
        return ["protocols", "ospf", "timers", "throttle", "spf", "delay", delay]

    def get_timers_throttle_spf_initial_holdtime(self, holdtime: str) -> List[str]:
        """Get command path for SPF initial holdtime."""
        return ["protocols", "ospf", "timers", "throttle", "spf", "initial-holdtime", holdtime]

    def get_timers_throttle_spf_max_holdtime(self, holdtime: str) -> List[str]:
        """Get command path for SPF max holdtime."""
        return ["protocols", "ospf", "timers", "throttle", "spf", "max-holdtime", holdtime]

    # ========================================================================
    # Config Parsing Methods (for READ operations)
    # ========================================================================

    def parse_ospf_config(self, config: Dict[str, Any]) -> Dict[str, Any]:
        """
        Parse full OSPF configuration from VyOS.

        Args:
            config: Raw OSPF config dictionary from VyOS (under protocols > ospf)

        Returns:
            Parsed OSPF configuration as dictionary
        """
        if not config:
            return {"configured": False, "router_id": None, "areas": [], "interfaces": []}

        # Parse parameters
        parameters = config.get("parameters", {})
        router_id = parameters.get("router-id")

        # Parse areas
        areas = self._parse_areas(config.get("area", {}))

        # Parse interfaces
        interfaces = self._parse_interfaces(config.get("interface", {}))

        # Parse redistribution
        redistributions = self._parse_redistributions(config.get("redistribute", {}))

        # Parse passive interfaces
        passive_interfaces = self._parse_passive_interfaces(config.get("passive-interface", {}))

        # Parse default information
        default_info = self._parse_default_information(config.get("default-information", {}))

        return {
            "configured": True,
            "router_id": router_id,
            "abr_type": parameters.get("abr-type"),
            "rfc1583_compatibility": "rfc1583-compatibility" in parameters,
            "opaque_lsa": "opaque-lsa" in parameters,
            "areas": areas,
            "interfaces": interfaces,
            "redistributions": redistributions,
            "passive_interfaces": passive_interfaces,
            "default_information": default_info,
            "parameters": parameters,
        }

    def _parse_areas(self, areas_config: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Parse area configurations."""
        areas = []
        for area_id, area_cfg in areas_config.items():
            if not isinstance(area_cfg, dict):
                continue

            # Parse networks
            networks = []
            for network in area_cfg.get("network", []):
                if isinstance(network, str):
                    networks.append(network)

            # Parse area type
            area_type = "normal"
            area_type_cfg = area_cfg.get("area-type", {})
            if "stub" in area_type_cfg:
                stub_cfg = area_type_cfg.get("stub", {})
                if isinstance(stub_cfg, dict) and "no-summary" in stub_cfg:
                    area_type = "totally-stubby"
                else:
                    area_type = "stub"
            elif "nssa" in area_type_cfg:
                nssa_cfg = area_type_cfg.get("nssa", {})
                if isinstance(nssa_cfg, dict) and "no-summary" in nssa_cfg:
                    area_type = "nssa-totally-stubby"
                else:
                    area_type = "nssa"

            # Parse ranges
            ranges = []
            for range_prefix, range_cfg in area_cfg.get("range", {}).items():
                if isinstance(range_cfg, dict):
                    ranges.append({
                        "prefix": range_prefix,
                        "cost": range_cfg.get("cost"),
                        "not_advertise": "not-advertise" in range_cfg,
                    })

            # Parse virtual links
            virtual_links = list(area_cfg.get("virtual-link", {}).keys())

            areas.append({
                "id": area_id,
                "type": area_type,
                "networks": networks,
                "ranges": ranges,
                "virtual_links": virtual_links,
            })

        return areas

    def _parse_interfaces(self, interfaces_config: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Parse interface configurations."""
        interfaces = []
        for iface_name, iface_cfg in interfaces_config.items():
            if not isinstance(iface_cfg, dict):
                continue

            # Parse authentication
            auth = iface_cfg.get("authentication", {})
            authentication = None
            if auth:
                if "md5" in auth:
                    authentication = {"type": "md5", "key_id": list(auth.get("md5", {}).get("key-id", {}).keys())}
                elif "plaintext-password" in auth:
                    authentication = {"type": "plaintext"}

            interfaces.append({
                "name": iface_name,
                "area": iface_cfg.get("area"),
                "cost": iface_cfg.get("cost"),
                "priority": iface_cfg.get("priority"),
                "hello_interval": iface_cfg.get("hello-interval"),
                "dead_interval": iface_cfg.get("dead-interval"),
                "retransmit_interval": iface_cfg.get("retransmit-interval"),
                "transmit_delay": iface_cfg.get("transmit-delay"),
                "network": iface_cfg.get("network"),
                "passive": "passive" in iface_cfg,
                "mtu_ignore": "mtu-ignore" in iface_cfg,
                "bfd": "bfd" in iface_cfg,
                "authentication": authentication,
            })

        return interfaces

    def _parse_redistributions(self, redist_config: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Parse redistribution configurations."""
        redistributions = []
        for protocol, protocol_cfg in redist_config.items():
            if isinstance(protocol_cfg, dict):
                redistributions.append({
                    "protocol": protocol,
                    "route_map": protocol_cfg.get("route-map"),
                    "metric": protocol_cfg.get("metric"),
                    "metric_type": protocol_cfg.get("metric-type"),
                })
            else:
                redistributions.append({
                    "protocol": protocol,
                    "route_map": None,
                    "metric": None,
                    "metric_type": None,
                })

        return redistributions

    def _parse_passive_interfaces(self, passive_config: Any) -> Dict[str, Any]:
        """Parse passive interface configurations."""
        if isinstance(passive_config, dict):
            return {
                "default": "default" in passive_config,
                "interfaces": [k for k in passive_config.keys() if k != "default"],
            }
        return {"default": False, "interfaces": []}

    def _parse_default_information(self, default_config: Dict[str, Any]) -> Dict[str, Any]:
        """Parse default information originate configuration."""
        if not default_config or "originate" not in default_config:
            return {"originate": False}

        originate_cfg = default_config.get("originate", {})
        if not isinstance(originate_cfg, dict):
            return {"originate": True, "always": False, "metric": None, "metric_type": None, "route_map": None}

        return {
            "originate": True,
            "always": "always" in originate_cfg,
            "metric": originate_cfg.get("metric"),
            "metric_type": originate_cfg.get("metric-type"),
            "route_map": originate_cfg.get("route-map"),
        }
