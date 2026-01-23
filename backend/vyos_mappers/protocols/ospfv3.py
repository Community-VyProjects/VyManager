"""
OSPFv3 Protocol Command Mapper

Handles OSPFv3 (OSPF for IPv6) configuration commands.
Supports areas, interfaces, redistribution, and authentication.
"""

from typing import List, Dict, Any
from ..base import BaseFeatureMapper


class OSPFv3Mapper(BaseFeatureMapper):
    """OSPFv3 protocol mapper with all OSPFv3 configuration operations"""

    def __init__(self, version: str):
        """Initialize with VyOS version."""
        super().__init__(version)

    # ========================================================================
    # Basic OSPFv3 Configuration Paths
    # ========================================================================

    def get_ospfv3(self) -> List[str]:
        """Get command path for creating OSPFv3."""
        return ["protocols", "ospfv3"]

    def get_router_id(self, router_id: str) -> List[str]:
        """Get command path for setting OSPFv3 router ID."""
        return ["protocols", "ospfv3", "parameters", "router-id", router_id]

    def get_router_id_path(self) -> List[str]:
        """Get command path for router ID (for deletion)."""
        return ["protocols", "ospfv3", "parameters", "router-id"]

    # ========================================================================
    # Area Configuration Paths
    # ========================================================================

    def get_area(self, area: str) -> List[str]:
        """Get command path for creating an area."""
        return ["protocols", "ospfv3", "area", area]

    def get_area_range(self, area: str, range_prefix: str) -> List[str]:
        """Get command path for area range (summarization)."""
        return ["protocols", "ospfv3", "area", area, "range", range_prefix]

    def get_area_range_advertise(self, area: str, range_prefix: str) -> List[str]:
        """Get command path for advertising area range."""
        return ["protocols", "ospfv3", "area", area, "range", range_prefix, "advertise"]

    def get_area_range_not_advertise(self, area: str, range_prefix: str) -> List[str]:
        """Get command path for not advertising area range."""
        return ["protocols", "ospfv3", "area", area, "range", range_prefix, "not-advertise"]

    def get_area_type_stub(self, area: str) -> List[str]:
        """Get command path for stub area."""
        return ["protocols", "ospfv3", "area", area, "area-type", "stub"]

    def get_area_type_stub_no_summary(self, area: str) -> List[str]:
        """Get command path for totally stubby area (no summary)."""
        return ["protocols", "ospfv3", "area", area, "area-type", "stub", "no-summary"]

    def get_area_type_nssa(self, area: str) -> List[str]:
        """Get command path for NSSA area."""
        return ["protocols", "ospfv3", "area", area, "area-type", "nssa"]

    def get_area_type_nssa_no_summary(self, area: str) -> List[str]:
        """Get command path for NSSA no-summary."""
        return ["protocols", "ospfv3", "area", area, "area-type", "nssa", "no-summary"]

    def get_area_type_normal(self, area: str) -> List[str]:
        """Get command path for normal area type."""
        return ["protocols", "ospfv3", "area", area, "area-type", "normal"]

    def get_area_export_list(self, area: str, export_list: str) -> List[str]:
        """Get command path for area export list."""
        return ["protocols", "ospfv3", "area", area, "export-list", export_list]

    def get_area_import_list(self, area: str, import_list: str) -> List[str]:
        """Get command path for area import list."""
        return ["protocols", "ospfv3", "area", area, "import-list", import_list]

    # ========================================================================
    # Interface Configuration Paths
    # ========================================================================

    def get_interface(self, interface: str) -> List[str]:
        """Get command path for interface configuration."""
        return ["protocols", "ospfv3", "interface", interface]

    def get_interface_area(self, interface: str, area: str) -> List[str]:
        """Get command path for interface area assignment."""
        return ["protocols", "ospfv3", "interface", interface, "area", area]

    def get_interface_cost(self, interface: str, cost: str) -> List[str]:
        """Get command path for interface cost."""
        return ["protocols", "ospfv3", "interface", interface, "cost", cost]

    def get_interface_cost_path(self, interface: str) -> List[str]:
        """Get command path for interface cost (for deletion)."""
        return ["protocols", "ospfv3", "interface", interface, "cost"]

    def get_interface_priority(self, interface: str, priority: str) -> List[str]:
        """Get command path for interface priority."""
        return ["protocols", "ospfv3", "interface", interface, "priority", priority]

    def get_interface_priority_path(self, interface: str) -> List[str]:
        """Get command path for interface priority (for deletion)."""
        return ["protocols", "ospfv3", "interface", interface, "priority"]

    def get_interface_hello_interval(self, interface: str, interval: str) -> List[str]:
        """Get command path for hello interval."""
        return ["protocols", "ospfv3", "interface", interface, "hello-interval", interval]

    def get_interface_hello_interval_path(self, interface: str) -> List[str]:
        """Get command path for hello interval (for deletion)."""
        return ["protocols", "ospfv3", "interface", interface, "hello-interval"]

    def get_interface_dead_interval(self, interface: str, interval: str) -> List[str]:
        """Get command path for dead interval."""
        return ["protocols", "ospfv3", "interface", interface, "dead-interval", interval]

    def get_interface_dead_interval_path(self, interface: str) -> List[str]:
        """Get command path for dead interval (for deletion)."""
        return ["protocols", "ospfv3", "interface", interface, "dead-interval"]

    def get_interface_retransmit_interval(self, interface: str, interval: str) -> List[str]:
        """Get command path for retransmit interval."""
        return ["protocols", "ospfv3", "interface", interface, "retransmit-interval", interval]

    def get_interface_transmit_delay(self, interface: str, delay: str) -> List[str]:
        """Get command path for transmit delay."""
        return ["protocols", "ospfv3", "interface", interface, "transmit-delay", delay]

    def get_interface_network(self, interface: str, network_type: str) -> List[str]:
        """Get command path for interface network type (broadcast, point-to-point)."""
        return ["protocols", "ospfv3", "interface", interface, "network", network_type]

    def get_interface_network_path(self, interface: str) -> List[str]:
        """Get command path for interface network type (for deletion)."""
        return ["protocols", "ospfv3", "interface", interface, "network"]

    def get_interface_passive(self, interface: str) -> List[str]:
        """Get command path for passive interface."""
        return ["protocols", "ospfv3", "interface", interface, "passive"]

    def get_interface_mtu_ignore(self, interface: str) -> List[str]:
        """Get command path for MTU ignore."""
        return ["protocols", "ospfv3", "interface", interface, "mtu-ignore"]

    def get_interface_instance_id(self, interface: str, instance_id: str) -> List[str]:
        """Get command path for interface instance ID."""
        return ["protocols", "ospfv3", "interface", interface, "instance-id", instance_id]

    def get_interface_ifmtu(self, interface: str, mtu: str) -> List[str]:
        """Get command path for interface MTU."""
        return ["protocols", "ospfv3", "interface", interface, "ifmtu", mtu]

    # BFD
    def get_interface_bfd(self, interface: str) -> List[str]:
        """Get command path for enabling BFD on interface."""
        return ["protocols", "ospfv3", "interface", interface, "bfd"]

    # ========================================================================
    # Redistribution Configuration Paths
    # ========================================================================

    def get_redistribute(self, protocol: str) -> List[str]:
        """Get command path for redistributing a protocol."""
        return ["protocols", "ospfv3", "redistribute", protocol]

    def get_redistribute_route_map(self, protocol: str, route_map: str) -> List[str]:
        """Get command path for redistribution route-map."""
        return ["protocols", "ospfv3", "redistribute", protocol, "route-map", route_map]

    # ========================================================================
    # Default Information Configuration
    # ========================================================================

    def get_default_information_originate(self) -> List[str]:
        """Get command path for originating default information."""
        return ["protocols", "ospfv3", "default-information", "originate"]

    def get_default_information_originate_always(self) -> List[str]:
        """Get command path for always originating default."""
        return ["protocols", "ospfv3", "default-information", "originate", "always"]

    def get_default_information_originate_metric(self, metric: str) -> List[str]:
        """Get command path for default information metric."""
        return ["protocols", "ospfv3", "default-information", "originate", "metric", metric]

    def get_default_information_originate_metric_type(self, metric_type: str) -> List[str]:
        """Get command path for default information metric type."""
        return ["protocols", "ospfv3", "default-information", "originate", "metric-type", metric_type]

    def get_default_information_originate_route_map(self, route_map: str) -> List[str]:
        """Get command path for default information route-map."""
        return ["protocols", "ospfv3", "default-information", "originate", "route-map", route_map]

    # ========================================================================
    # Distance Configuration
    # ========================================================================

    def get_distance_global(self, distance: str) -> List[str]:
        """Get command path for global distance."""
        return ["protocols", "ospfv3", "distance", "global", distance]

    def get_distance_external(self, distance: str) -> List[str]:
        """Get command path for external distance."""
        return ["protocols", "ospfv3", "distance", "ospfv3", "external", distance]

    def get_distance_inter_area(self, distance: str) -> List[str]:
        """Get command path for inter-area distance."""
        return ["protocols", "ospfv3", "distance", "ospfv3", "inter-area", distance]

    def get_distance_intra_area(self, distance: str) -> List[str]:
        """Get command path for intra-area distance."""
        return ["protocols", "ospfv3", "distance", "ospfv3", "intra-area", distance]

    # ========================================================================
    # Graceful Restart Configuration
    # ========================================================================

    def get_graceful_restart(self) -> List[str]:
        """Get command path for graceful restart."""
        return ["protocols", "ospfv3", "graceful-restart"]

    def get_graceful_restart_helper_enable(self) -> List[str]:
        """Get command path for graceful restart helper."""
        return ["protocols", "ospfv3", "graceful-restart", "helper", "enable"]

    # ========================================================================
    # Config Parsing Methods (for READ operations)
    # ========================================================================

    def parse_ospfv3_config(self, config: Dict[str, Any]) -> Dict[str, Any]:
        """
        Parse full OSPFv3 configuration from VyOS.

        Args:
            config: Raw OSPFv3 config dictionary from VyOS (under protocols > ospfv3)

        Returns:
            Parsed OSPFv3 configuration as dictionary
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

        # Parse default information
        default_info = self._parse_default_information(config.get("default-information", {}))

        # Parse distance
        distance = self._parse_distance(config.get("distance", {}))

        # Parse graceful restart
        graceful_restart = "graceful-restart" in config

        return {
            "configured": True,
            "router_id": router_id,
            "areas": areas,
            "interfaces": interfaces,
            "redistributions": redistributions,
            "default_information": default_info,
            "distance": distance,
            "graceful_restart": graceful_restart,
            "parameters": parameters,
        }

    def _parse_areas(self, areas_config: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Parse area configurations."""
        areas = []
        for area_id, area_cfg in areas_config.items():
            if not isinstance(area_cfg, dict):
                continue

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
                        "advertise": "advertise" in range_cfg,
                        "not_advertise": "not-advertise" in range_cfg,
                    })
                else:
                    ranges.append({
                        "prefix": range_prefix,
                        "advertise": True,
                        "not_advertise": False,
                    })

            areas.append({
                "id": area_id,
                "type": area_type,
                "ranges": ranges,
                "export_list": area_cfg.get("export-list"),
                "import_list": area_cfg.get("import-list"),
            })

        return areas

    def _parse_interfaces(self, interfaces_config: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Parse interface configurations."""
        interfaces = []
        for iface_name, iface_cfg in interfaces_config.items():
            if not isinstance(iface_cfg, dict):
                continue

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
                "instance_id": iface_cfg.get("instance-id"),
                "ifmtu": iface_cfg.get("ifmtu"),
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
                })
            else:
                redistributions.append({
                    "protocol": protocol,
                    "route_map": None,
                })

        return redistributions

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

    def _parse_distance(self, distance_config: Dict[str, Any]) -> Dict[str, Any]:
        """Parse distance configuration."""
        if not distance_config:
            return None

        ospfv3_distance = distance_config.get("ospfv3", {})
        return {
            "global": distance_config.get("global"),
            "external": ospfv3_distance.get("external"),
            "inter_area": ospfv3_distance.get("inter-area"),
            "intra_area": ospfv3_distance.get("intra-area"),
        }
