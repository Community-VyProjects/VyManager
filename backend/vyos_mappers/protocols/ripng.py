"""
RIPng Protocol Command Mapper

Handles RIPng (Routing Information Protocol Next Generation) configuration commands.
RIPng is RIP for IPv6 networks.
"""

from typing import List, Dict, Any
from ..base import BaseFeatureMapper


class RIPngMapper(BaseFeatureMapper):
    """RIPng protocol mapper with all RIPng configuration operations"""

    def __init__(self, version: str):
        """Initialize with VyOS version."""
        super().__init__(version)

    # ========================================================================
    # Basic RIPng Configuration Paths
    # ========================================================================

    def get_ripng(self) -> List[str]:
        """Get command path for creating RIPng."""
        return ["protocols", "ripng"]

    def get_default_metric(self, metric: str) -> List[str]:
        """Get command path for setting default metric."""
        return ["protocols", "ripng", "default-metric", metric]

    def get_default_metric_path(self) -> List[str]:
        """Get command path for default metric (for deletion)."""
        return ["protocols", "ripng", "default-metric"]

    # ========================================================================
    # Network Configuration Paths
    # ========================================================================

    def get_network(self, network: str) -> List[str]:
        """Get command path for adding a network."""
        return ["protocols", "ripng", "network", network]

    # ========================================================================
    # Interface Configuration Paths
    # ========================================================================

    def get_interface(self, interface: str) -> List[str]:
        """Get command path for interface configuration."""
        return ["protocols", "ripng", "interface", interface]

    def get_interface_split_horizon(self, interface: str) -> List[str]:
        """Get command path for split-horizon."""
        return ["protocols", "ripng", "interface", interface, "split-horizon"]

    def get_interface_split_horizon_disable(self, interface: str) -> List[str]:
        """Get command path for disabling split-horizon."""
        return ["protocols", "ripng", "interface", interface, "split-horizon", "disable"]

    def get_interface_split_horizon_poison_reverse(self, interface: str) -> List[str]:
        """Get command path for split-horizon poison-reverse."""
        return ["protocols", "ripng", "interface", interface, "split-horizon", "poison-reverse"]

    # ========================================================================
    # Passive Interface Configuration
    # ========================================================================

    def get_passive_interface(self, interface: str) -> List[str]:
        """Get command path for passive interface."""
        return ["protocols", "ripng", "passive-interface", interface]

    # ========================================================================
    # Aggregate Address Configuration
    # ========================================================================

    def get_aggregate_address(self, prefix: str) -> List[str]:
        """Get command path for aggregate address."""
        return ["protocols", "ripng", "aggregate-address", prefix]

    # ========================================================================
    # Redistribution Configuration Paths
    # ========================================================================

    def get_redistribute(self, protocol: str) -> List[str]:
        """Get command path for redistributing a protocol."""
        return ["protocols", "ripng", "redistribute", protocol]

    def get_redistribute_route_map(self, protocol: str, route_map: str) -> List[str]:
        """Get command path for redistribution route-map."""
        return ["protocols", "ripng", "redistribute", protocol, "route-map", route_map]

    def get_redistribute_metric(self, protocol: str, metric: str) -> List[str]:
        """Get command path for redistribution metric."""
        return ["protocols", "ripng", "redistribute", protocol, "metric", metric]

    # ========================================================================
    # Default Information Configuration
    # ========================================================================

    def get_default_information_originate(self) -> List[str]:
        """Get command path for originating default information."""
        return ["protocols", "ripng", "default-information", "originate"]

    # ========================================================================
    # Distribute List Configuration
    # ========================================================================

    def get_distribute_list_access_list_in(self, access_list: str) -> List[str]:
        """Get command path for distribute list access-list in."""
        return ["protocols", "ripng", "distribute-list", "access-list", "in", access_list]

    def get_distribute_list_access_list_out(self, access_list: str) -> List[str]:
        """Get command path for distribute list access-list out."""
        return ["protocols", "ripng", "distribute-list", "access-list", "out", access_list]

    def get_distribute_list_prefix_list_in(self, prefix_list: str) -> List[str]:
        """Get command path for distribute list prefix-list in."""
        return ["protocols", "ripng", "distribute-list", "prefix-list", "in", prefix_list]

    def get_distribute_list_prefix_list_out(self, prefix_list: str) -> List[str]:
        """Get command path for distribute list prefix-list out."""
        return ["protocols", "ripng", "distribute-list", "prefix-list", "out", prefix_list]

    # ========================================================================
    # Timer Configuration
    # ========================================================================

    def get_timers_update(self, seconds: str) -> List[str]:
        """Get command path for update timer."""
        return ["protocols", "ripng", "timers", "update", seconds]

    def get_timers_timeout(self, seconds: str) -> List[str]:
        """Get command path for timeout timer."""
        return ["protocols", "ripng", "timers", "timeout", seconds]

    def get_timers_garbage_collection(self, seconds: str) -> List[str]:
        """Get command path for garbage collection timer."""
        return ["protocols", "ripng", "timers", "garbage-collection", seconds]

    # ========================================================================
    # Route Configuration
    # ========================================================================

    def get_route(self, prefix: str) -> List[str]:
        """Get command path for static route injection."""
        return ["protocols", "ripng", "route", prefix]

    # ========================================================================
    # Config Parsing Methods (for READ operations)
    # ========================================================================

    def parse_ripng_config(self, config: Dict[str, Any]) -> Dict[str, Any]:
        """
        Parse full RIPng configuration from VyOS.

        Args:
            config: Raw RIPng config dictionary from VyOS (under protocols > ripng)

        Returns:
            Parsed RIPng configuration as dictionary
        """
        if not config:
            return {
                "configured": False,
                "networks": [],
                "interfaces": [],
                "passive_interfaces": [],
                "aggregate_addresses": [],
                "routes": [],
                "redistributions": [],
                "default_metric": None,
                "default_information_originate": False,
                "timers": None,
            }

        # Parse networks
        networks = []
        network_cfg = config.get("network", [])
        if isinstance(network_cfg, list):
            networks = network_cfg
        elif isinstance(network_cfg, dict):
            networks = list(network_cfg.keys())

        # Parse interfaces
        interfaces = self._parse_interfaces(config.get("interface", {}))

        # Parse passive interfaces
        passive_interfaces = []
        passive_cfg = config.get("passive-interface", [])
        if isinstance(passive_cfg, list):
            passive_interfaces = passive_cfg
        elif isinstance(passive_cfg, dict):
            passive_interfaces = list(passive_cfg.keys())

        # Parse aggregate addresses
        aggregate_addresses = []
        aggregate_cfg = config.get("aggregate-address", [])
        if isinstance(aggregate_cfg, list):
            aggregate_addresses = aggregate_cfg
        elif isinstance(aggregate_cfg, dict):
            aggregate_addresses = list(aggregate_cfg.keys())

        # Parse routes
        routes = []
        route_cfg = config.get("route", [])
        if isinstance(route_cfg, list):
            routes = route_cfg
        elif isinstance(route_cfg, dict):
            routes = list(route_cfg.keys())

        # Parse redistribution
        redistributions = self._parse_redistributions(config.get("redistribute", {}))

        # Parse timers
        timers = self._parse_timers(config.get("timers", {}))

        # Parse default information
        default_info = config.get("default-information", {})
        default_information_originate = "originate" in default_info if isinstance(default_info, dict) else False

        return {
            "configured": True,
            "networks": networks,
            "interfaces": interfaces,
            "passive_interfaces": passive_interfaces,
            "aggregate_addresses": aggregate_addresses,
            "routes": routes,
            "redistributions": redistributions,
            "default_metric": config.get("default-metric"),
            "default_information_originate": default_information_originate,
            "timers": timers,
        }

    def _parse_interfaces(self, interfaces_config: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Parse interface configurations."""
        interfaces = []
        for iface_name, iface_cfg in interfaces_config.items():
            if not isinstance(iface_cfg, dict):
                interfaces.append({"name": iface_name, "split_horizon": None})
                continue

            # Parse split-horizon
            split_horizon = None
            split_horizon_cfg = iface_cfg.get("split-horizon", {})
            if isinstance(split_horizon_cfg, dict):
                if "disable" in split_horizon_cfg:
                    split_horizon = "disabled"
                elif "poison-reverse" in split_horizon_cfg:
                    split_horizon = "poison-reverse"
            elif split_horizon_cfg:
                split_horizon = "enabled"

            interfaces.append({
                "name": iface_name,
                "split_horizon": split_horizon,
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
                })
            else:
                redistributions.append({
                    "protocol": protocol,
                    "route_map": None,
                    "metric": None,
                })

        return redistributions

    def _parse_timers(self, timers_config: Dict[str, Any]) -> Dict[str, Any] | None:
        """Parse timer configurations."""
        if not timers_config:
            return None

        return {
            "update": timers_config.get("update"),
            "timeout": timers_config.get("timeout"),
            "garbage_collection": timers_config.get("garbage-collection"),
        }
