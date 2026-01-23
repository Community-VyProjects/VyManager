"""
RIP Protocol Command Mapper

Handles RIP (Routing Information Protocol) configuration commands.
Supports networks, interfaces, redistribution, and timers.
"""

from typing import List, Dict, Any
from ..base import BaseFeatureMapper


class RIPMapper(BaseFeatureMapper):
    """RIP protocol mapper with all RIP configuration operations"""

    def __init__(self, version: str):
        """Initialize with VyOS version."""
        super().__init__(version)

    # ========================================================================
    # Basic RIP Configuration Paths
    # ========================================================================

    def get_rip(self) -> List[str]:
        """Get command path for creating RIP."""
        return ["protocols", "rip"]

    def get_default_distance(self, distance: str) -> List[str]:
        """Get command path for setting default administrative distance."""
        return ["protocols", "rip", "default-distance", distance]

    def get_default_distance_path(self) -> List[str]:
        """Get command path for default distance (for deletion)."""
        return ["protocols", "rip", "default-distance"]

    def get_version(self, version: str) -> List[str]:
        """Get command path for RIP version (1, 2)."""
        return ["protocols", "rip", "version", version]

    def get_version_path(self) -> List[str]:
        """Get command path for version (for deletion)."""
        return ["protocols", "rip", "version"]

    # ========================================================================
    # Network Configuration Paths
    # ========================================================================

    def get_network(self, network: str) -> List[str]:
        """Get command path for adding a network."""
        return ["protocols", "rip", "network", network]

    # ========================================================================
    # Interface Configuration Paths
    # ========================================================================

    def get_interface(self, interface: str) -> List[str]:
        """Get command path for interface configuration."""
        return ["protocols", "rip", "interface", interface]

    def get_interface_send(self, interface: str, version: str) -> List[str]:
        """Get command path for interface send version."""
        return ["protocols", "rip", "interface", interface, "send", version]

    def get_interface_receive(self, interface: str, version: str) -> List[str]:
        """Get command path for interface receive version."""
        return ["protocols", "rip", "interface", interface, "receive", version]

    def get_interface_split_horizon(self, interface: str) -> List[str]:
        """Get command path for split-horizon."""
        return ["protocols", "rip", "interface", interface, "split-horizon"]

    def get_interface_split_horizon_disable(self, interface: str) -> List[str]:
        """Get command path for disabling split-horizon."""
        return ["protocols", "rip", "interface", interface, "split-horizon", "disable"]

    def get_interface_split_horizon_poison_reverse(self, interface: str) -> List[str]:
        """Get command path for split-horizon poison-reverse."""
        return ["protocols", "rip", "interface", interface, "split-horizon", "poison-reverse"]

    def get_interface_authentication_md5(self, interface: str, key_id: str, md5_key: str) -> List[str]:
        """Get command path for MD5 authentication."""
        return ["protocols", "rip", "interface", interface, "authentication", "md5", key_id, "md5-key", md5_key]

    def get_interface_authentication_plaintext(self, interface: str, password: str) -> List[str]:
        """Get command path for plaintext authentication."""
        return ["protocols", "rip", "interface", interface, "authentication", "plaintext-password", password]

    # ========================================================================
    # Passive Interface Configuration
    # ========================================================================

    def get_passive_interface(self, interface: str) -> List[str]:
        """Get command path for passive interface."""
        return ["protocols", "rip", "passive-interface", interface]

    def get_passive_interface_default(self) -> List[str]:
        """Get command path for passive interface default."""
        return ["protocols", "rip", "passive-interface", "default"]

    # ========================================================================
    # Neighbor Configuration Paths
    # ========================================================================

    def get_neighbor(self, neighbor: str) -> List[str]:
        """Get command path for neighbor (for non-broadcast networks)."""
        return ["protocols", "rip", "neighbor", neighbor]

    # ========================================================================
    # Redistribution Configuration Paths
    # ========================================================================

    def get_redistribute(self, protocol: str) -> List[str]:
        """Get command path for redistributing a protocol."""
        return ["protocols", "rip", "redistribute", protocol]

    def get_redistribute_route_map(self, protocol: str, route_map: str) -> List[str]:
        """Get command path for redistribution route-map."""
        return ["protocols", "rip", "redistribute", protocol, "route-map", route_map]

    def get_redistribute_metric(self, protocol: str, metric: str) -> List[str]:
        """Get command path for redistribution metric."""
        return ["protocols", "rip", "redistribute", protocol, "metric", metric]

    # ========================================================================
    # Default Information Configuration
    # ========================================================================

    def get_default_information_originate(self) -> List[str]:
        """Get command path for originating default information."""
        return ["protocols", "rip", "default-information", "originate"]

    # ========================================================================
    # Distribute List Configuration
    # ========================================================================

    def get_distribute_list_access_list_in(self, access_list: str) -> List[str]:
        """Get command path for distribute list access-list in."""
        return ["protocols", "rip", "distribute-list", "access-list", "in", access_list]

    def get_distribute_list_access_list_out(self, access_list: str) -> List[str]:
        """Get command path for distribute list access-list out."""
        return ["protocols", "rip", "distribute-list", "access-list", "out", access_list]

    def get_distribute_list_interface_access_list_in(self, interface: str, access_list: str) -> List[str]:
        """Get command path for distribute list interface access-list in."""
        return ["protocols", "rip", "distribute-list", "interface", interface, "access-list", "in", access_list]

    def get_distribute_list_interface_access_list_out(self, interface: str, access_list: str) -> List[str]:
        """Get command path for distribute list interface access-list out."""
        return ["protocols", "rip", "distribute-list", "interface", interface, "access-list", "out", access_list]

    def get_distribute_list_prefix_list_in(self, prefix_list: str) -> List[str]:
        """Get command path for distribute list prefix-list in."""
        return ["protocols", "rip", "distribute-list", "prefix-list", "in", prefix_list]

    def get_distribute_list_prefix_list_out(self, prefix_list: str) -> List[str]:
        """Get command path for distribute list prefix-list out."""
        return ["protocols", "rip", "distribute-list", "prefix-list", "out", prefix_list]

    # ========================================================================
    # Timer Configuration
    # ========================================================================

    def get_timers_update(self, seconds: str) -> List[str]:
        """Get command path for update timer."""
        return ["protocols", "rip", "timers", "update", seconds]

    def get_timers_timeout(self, seconds: str) -> List[str]:
        """Get command path for timeout timer."""
        return ["protocols", "rip", "timers", "timeout", seconds]

    def get_timers_garbage_collection(self, seconds: str) -> List[str]:
        """Get command path for garbage collection timer."""
        return ["protocols", "rip", "timers", "garbage-collection", seconds]

    # ========================================================================
    # Config Parsing Methods (for READ operations)
    # ========================================================================

    def parse_rip_config(self, config: Dict[str, Any]) -> Dict[str, Any]:
        """
        Parse full RIP configuration from VyOS.

        Args:
            config: Raw RIP config dictionary from VyOS (under protocols > rip)

        Returns:
            Parsed RIP configuration as dictionary
        """
        if not config:
            return {
                "configured": False,
                "networks": [],
                "interfaces": [],
                "passive_interfaces": [],
                "neighbors": [],
                "redistributions": [],
                "version": None,
                "default_distance": None,
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
        passive_interfaces = self._parse_passive_interfaces(config.get("passive-interface", {}))

        # Parse neighbors
        neighbors = []
        neighbor_cfg = config.get("neighbor", [])
        if isinstance(neighbor_cfg, list):
            neighbors = neighbor_cfg
        elif isinstance(neighbor_cfg, dict):
            neighbors = list(neighbor_cfg.keys())

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
            "neighbors": neighbors,
            "redistributions": redistributions,
            "version": config.get("version"),
            "default_distance": config.get("default-distance"),
            "default_information_originate": default_information_originate,
            "timers": timers,
        }

    def _parse_interfaces(self, interfaces_config: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Parse interface configurations."""
        interfaces = []
        for iface_name, iface_cfg in interfaces_config.items():
            if not isinstance(iface_cfg, dict):
                interfaces.append({"name": iface_name})
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

            # Parse authentication
            auth = iface_cfg.get("authentication", {})
            authentication = None
            if auth:
                if "md5" in auth:
                    authentication = {"type": "md5"}
                elif "plaintext-password" in auth:
                    authentication = {"type": "plaintext"}

            interfaces.append({
                "name": iface_name,
                "send": iface_cfg.get("send"),
                "receive": iface_cfg.get("receive"),
                "split_horizon": split_horizon,
                "authentication": authentication,
            })

        return interfaces

    def _parse_passive_interfaces(self, passive_config: Any) -> Dict[str, Any]:
        """Parse passive interface configurations."""
        if isinstance(passive_config, dict):
            return {
                "default": "default" in passive_config,
                "interfaces": [k for k in passive_config.keys() if k != "default"],
            }
        return {"default": False, "interfaces": []}

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
