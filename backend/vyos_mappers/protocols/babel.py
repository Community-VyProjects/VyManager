"""
Babel Protocol Command Mapper

Handles Babel routing protocol configuration commands.
Babel is a distance-vector routing protocol for IPv6 and IPv4
with fast convergence and robust loop avoidance.
"""

from typing import List, Dict, Any
from ..base import BaseFeatureMapper


class BabelMapper(BaseFeatureMapper):
    """Babel protocol mapper with all Babel configuration operations"""

    def __init__(self, version: str):
        """Initialize with VyOS version."""
        super().__init__(version)

    # ========================================================================
    # Basic Babel Configuration Paths
    # ========================================================================

    def get_babel(self) -> List[str]:
        """Get command path for creating Babel."""
        return ["protocols", "babel"]

    def get_parameters_diversity(self) -> List[str]:
        """Get command path for diversity factor."""
        return ["protocols", "babel", "parameters", "diversity"]

    def get_parameters_diversity_factor(self, factor: str) -> List[str]:
        """Get command path for diversity factor value."""
        return ["protocols", "babel", "parameters", "diversity-factor", factor]

    def get_parameters_resend_delay(self, delay: str) -> List[str]:
        """Get command path for resend delay."""
        return ["protocols", "babel", "parameters", "resend-delay", delay]

    def get_parameters_smoothing_half_life(self, value: str) -> List[str]:
        """Get command path for smoothing half life."""
        return ["protocols", "babel", "parameters", "smoothing-half-life", value]

    # ========================================================================
    # Interface Configuration Paths
    # ========================================================================

    def get_interface(self, interface: str) -> List[str]:
        """Get command path for interface configuration."""
        return ["protocols", "babel", "interface", interface]

    def get_interface_type(self, interface: str, iface_type: str) -> List[str]:
        """Get command path for interface type (wired, wireless, tunnel)."""
        return ["protocols", "babel", "interface", interface, "type", iface_type]

    def get_interface_type_path(self, interface: str) -> List[str]:
        """Get command path for interface type (for deletion)."""
        return ["protocols", "babel", "interface", interface, "type"]

    def get_interface_channel(self, interface: str, channel: str) -> List[str]:
        """Get command path for interface channel (interfering, non-interfering)."""
        return ["protocols", "babel", "interface", interface, "channel", channel]

    def get_interface_channel_path(self, interface: str) -> List[str]:
        """Get command path for interface channel (for deletion)."""
        return ["protocols", "babel", "interface", interface, "channel"]

    def get_interface_rxcost(self, interface: str, rxcost: str) -> List[str]:
        """Get command path for interface rxcost."""
        return ["protocols", "babel", "interface", interface, "rxcost", rxcost]

    def get_interface_rxcost_path(self, interface: str) -> List[str]:
        """Get command path for interface rxcost (for deletion)."""
        return ["protocols", "babel", "interface", interface, "rxcost"]

    def get_interface_hello_interval(self, interface: str, interval: str) -> List[str]:
        """Get command path for interface hello interval."""
        return ["protocols", "babel", "interface", interface, "hello-interval", interval]

    def get_interface_hello_interval_path(self, interface: str) -> List[str]:
        """Get command path for interface hello interval (for deletion)."""
        return ["protocols", "babel", "interface", interface, "hello-interval"]

    def get_interface_update_interval(self, interface: str, interval: str) -> List[str]:
        """Get command path for interface update interval."""
        return ["protocols", "babel", "interface", interface, "update-interval", interval]

    def get_interface_update_interval_path(self, interface: str) -> List[str]:
        """Get command path for interface update interval (for deletion)."""
        return ["protocols", "babel", "interface", interface, "update-interval"]

    def get_interface_rtt_decay(self, interface: str, decay: str) -> List[str]:
        """Get command path for interface RTT decay."""
        return ["protocols", "babel", "interface", interface, "rtt-decay", decay]

    def get_interface_rtt_min(self, interface: str, min_val: str) -> List[str]:
        """Get command path for interface RTT min."""
        return ["protocols", "babel", "interface", interface, "rtt-min", min_val]

    def get_interface_rtt_max(self, interface: str, max_val: str) -> List[str]:
        """Get command path for interface RTT max."""
        return ["protocols", "babel", "interface", interface, "rtt-max", max_val]

    def get_interface_max_rtt_penalty(self, interface: str, penalty: str) -> List[str]:
        """Get command path for interface max RTT penalty."""
        return ["protocols", "babel", "interface", interface, "max-rtt-penalty", penalty]

    def get_interface_enable_timestamps(self, interface: str) -> List[str]:
        """Get command path for enabling timestamps on interface."""
        return ["protocols", "babel", "interface", interface, "enable-timestamps"]

    def get_interface_split_horizon(self, interface: str) -> List[str]:
        """Get command path for split horizon."""
        return ["protocols", "babel", "interface", interface, "split-horizon"]

    # ========================================================================
    # Redistribution Configuration Paths
    # ========================================================================

    def get_redistribute(self, protocol: str) -> List[str]:
        """Get command path for redistributing a protocol."""
        return ["protocols", "babel", "redistribute", protocol]

    def get_redistribute_route_map(self, protocol: str, route_map: str) -> List[str]:
        """Get command path for redistribution route-map."""
        return ["protocols", "babel", "redistribute", protocol, "route-map", route_map]

    # ========================================================================
    # Distribution List Configuration
    # ========================================================================

    def get_distribute_list_ipv4_access_list_in(self, acl: str) -> List[str]:
        """Get command path for IPv4 incoming access list."""
        return ["protocols", "babel", "distribute-list", "ipv4", "access-list", "in", acl]

    def get_distribute_list_ipv4_access_list_out(self, acl: str) -> List[str]:
        """Get command path for IPv4 outgoing access list."""
        return ["protocols", "babel", "distribute-list", "ipv4", "access-list", "out", acl]

    def get_distribute_list_ipv4_prefix_list_in(self, prefix_list: str) -> List[str]:
        """Get command path for IPv4 incoming prefix list."""
        return ["protocols", "babel", "distribute-list", "ipv4", "prefix-list", "in", prefix_list]

    def get_distribute_list_ipv4_prefix_list_out(self, prefix_list: str) -> List[str]:
        """Get command path for IPv4 outgoing prefix list."""
        return ["protocols", "babel", "distribute-list", "ipv4", "prefix-list", "out", prefix_list]

    def get_distribute_list_ipv6_access_list_in(self, acl: str) -> List[str]:
        """Get command path for IPv6 incoming access list."""
        return ["protocols", "babel", "distribute-list", "ipv6", "access-list", "in", acl]

    def get_distribute_list_ipv6_access_list_out(self, acl: str) -> List[str]:
        """Get command path for IPv6 outgoing access list."""
        return ["protocols", "babel", "distribute-list", "ipv6", "access-list", "out", acl]

    def get_distribute_list_ipv6_prefix_list_in(self, prefix_list: str) -> List[str]:
        """Get command path for IPv6 incoming prefix list."""
        return ["protocols", "babel", "distribute-list", "ipv6", "prefix-list", "in", prefix_list]

    def get_distribute_list_ipv6_prefix_list_out(self, prefix_list: str) -> List[str]:
        """Get command path for IPv6 outgoing prefix list."""
        return ["protocols", "babel", "distribute-list", "ipv6", "prefix-list", "out", prefix_list]

    def get_distribute_list_interface_ipv4_access_list_in(self, interface: str, acl: str) -> List[str]:
        """Get command path for interface-specific IPv4 incoming access list."""
        return ["protocols", "babel", "distribute-list", "ipv4", "interface", interface, "access-list", "in", acl]

    def get_distribute_list_interface_ipv4_access_list_out(self, interface: str, acl: str) -> List[str]:
        """Get command path for interface-specific IPv4 outgoing access list."""
        return ["protocols", "babel", "distribute-list", "ipv4", "interface", interface, "access-list", "out", acl]

    def get_distribute_list_interface_ipv6_access_list_in(self, interface: str, acl: str) -> List[str]:
        """Get command path for interface-specific IPv6 incoming access list."""
        return ["protocols", "babel", "distribute-list", "ipv6", "interface", interface, "access-list", "in", acl]

    def get_distribute_list_interface_ipv6_access_list_out(self, interface: str, acl: str) -> List[str]:
        """Get command path for interface-specific IPv6 outgoing access list."""
        return ["protocols", "babel", "distribute-list", "ipv6", "interface", interface, "access-list", "out", acl]

    # ========================================================================
    # Config Parsing Methods (for READ operations)
    # ========================================================================

    def parse_babel_config(self, config: Dict[str, Any]) -> Dict[str, Any]:
        """
        Parse full Babel configuration from VyOS.

        Args:
            config: Raw Babel config dictionary from VyOS (under protocols > babel)

        Returns:
            Parsed Babel configuration as dictionary
        """
        if not config:
            return {
                "configured": False,
                "interfaces": [],
                "redistributions": [],
                "parameters": {},
                "distribute_lists": {},
            }

        # Parse parameters
        parameters = self._parse_parameters(config.get("parameters", {}))

        # Parse interfaces
        interfaces = self._parse_interfaces(config.get("interface", {}))

        # Parse redistribution
        redistributions = self._parse_redistributions(config.get("redistribute", {}))

        # Parse distribute lists
        distribute_lists = self._parse_distribute_lists(config.get("distribute-list", {}))

        return {
            "configured": True,
            "interfaces": interfaces,
            "redistributions": redistributions,
            "parameters": parameters,
            "distribute_lists": distribute_lists,
        }

    def _parse_parameters(self, params_config: Dict[str, Any]) -> Dict[str, Any]:
        """Parse Babel parameters."""
        return {
            "diversity": "diversity" in params_config,
            "diversity_factor": params_config.get("diversity-factor"),
            "resend_delay": params_config.get("resend-delay"),
            "smoothing_half_life": params_config.get("smoothing-half-life"),
        }

    def _parse_interfaces(self, interfaces_config: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Parse interface configurations."""
        interfaces = []
        for iface_name, iface_cfg in interfaces_config.items():
            if not isinstance(iface_cfg, dict):
                # Interface with no additional config
                interfaces.append({
                    "name": iface_name,
                    "type": None,
                    "channel": None,
                    "rxcost": None,
                    "hello_interval": None,
                    "update_interval": None,
                    "rtt_decay": None,
                    "rtt_min": None,
                    "rtt_max": None,
                    "max_rtt_penalty": None,
                    "enable_timestamps": False,
                    "split_horizon": True,  # Default in Babel
                })
                continue

            interfaces.append({
                "name": iface_name,
                "type": iface_cfg.get("type"),
                "channel": iface_cfg.get("channel"),
                "rxcost": iface_cfg.get("rxcost"),
                "hello_interval": iface_cfg.get("hello-interval"),
                "update_interval": iface_cfg.get("update-interval"),
                "rtt_decay": iface_cfg.get("rtt-decay"),
                "rtt_min": iface_cfg.get("rtt-min"),
                "rtt_max": iface_cfg.get("rtt-max"),
                "max_rtt_penalty": iface_cfg.get("max-rtt-penalty"),
                "enable_timestamps": "enable-timestamps" in iface_cfg,
                "split_horizon": "split-horizon" not in iface_cfg or iface_cfg.get("split-horizon") != "disable",
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

    def _parse_distribute_lists(self, dist_config: Dict[str, Any]) -> Dict[str, Any]:
        """Parse distribute list configurations."""
        result = {
            "ipv4": {
                "access_list_in": None,
                "access_list_out": None,
                "prefix_list_in": None,
                "prefix_list_out": None,
            },
            "ipv6": {
                "access_list_in": None,
                "access_list_out": None,
                "prefix_list_in": None,
                "prefix_list_out": None,
            },
        }

        ipv4_cfg = dist_config.get("ipv4", {})
        if ipv4_cfg:
            acl_cfg = ipv4_cfg.get("access-list", {})
            if acl_cfg:
                result["ipv4"]["access_list_in"] = acl_cfg.get("in")
                result["ipv4"]["access_list_out"] = acl_cfg.get("out")
            prefix_cfg = ipv4_cfg.get("prefix-list", {})
            if prefix_cfg:
                result["ipv4"]["prefix_list_in"] = prefix_cfg.get("in")
                result["ipv4"]["prefix_list_out"] = prefix_cfg.get("out")

        ipv6_cfg = dist_config.get("ipv6", {})
        if ipv6_cfg:
            acl_cfg = ipv6_cfg.get("access-list", {})
            if acl_cfg:
                result["ipv6"]["access_list_in"] = acl_cfg.get("in")
                result["ipv6"]["access_list_out"] = acl_cfg.get("out")
            prefix_cfg = ipv6_cfg.get("prefix-list", {})
            if prefix_cfg:
                result["ipv6"]["prefix_list_in"] = prefix_cfg.get("in")
                result["ipv6"]["prefix_list_out"] = prefix_cfg.get("out")

        return result
