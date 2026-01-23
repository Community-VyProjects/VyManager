"""
IS-IS Protocol Command Mapper

Handles IS-IS (Intermediate System to Intermediate System) configuration commands.
IS-IS is a link-state routing protocol for large networks.
"""

from typing import List, Dict, Any
from ..base import BaseFeatureMapper


class ISISMapper(BaseFeatureMapper):
    """IS-IS protocol mapper with all IS-IS configuration operations"""

    def __init__(self, version: str):
        """Initialize with VyOS version."""
        super().__init__(version)

    # ========================================================================
    # Basic IS-IS Configuration Paths
    # ========================================================================

    def get_isis(self) -> List[str]:
        """Get command path for creating IS-IS."""
        return ["protocols", "isis"]

    def get_net(self, net: str) -> List[str]:
        """Get command path for setting NET (Network Entity Title)."""
        return ["protocols", "isis", "net", net]

    def get_is_type(self, is_type: str) -> List[str]:
        """Get command path for IS type (level-1, level-2, level-1-2)."""
        return ["protocols", "isis", "is-type", is_type]

    def get_is_type_path(self) -> List[str]:
        """Get command path for IS type (for deletion)."""
        return ["protocols", "isis", "is-type"]

    def get_dynamic_hostname(self) -> List[str]:
        """Get command path for dynamic hostname."""
        return ["protocols", "isis", "dynamic-hostname"]

    def get_level(self, level: str) -> List[str]:
        """Get command path for level configuration."""
        return ["protocols", "isis", "level", level]

    def get_lsp_gen_interval(self, interval: str) -> List[str]:
        """Get command path for LSP generation interval."""
        return ["protocols", "isis", "lsp-gen-interval", interval]

    def get_lsp_mtu(self, mtu: str) -> List[str]:
        """Get command path for LSP MTU."""
        return ["protocols", "isis", "lsp-mtu", mtu]

    def get_lsp_refresh_interval(self, interval: str) -> List[str]:
        """Get command path for LSP refresh interval."""
        return ["protocols", "isis", "lsp-refresh-interval", interval]

    def get_max_lsp_lifetime(self, lifetime: str) -> List[str]:
        """Get command path for max LSP lifetime."""
        return ["protocols", "isis", "max-lsp-lifetime", lifetime]

    def get_metric_style(self, style: str) -> List[str]:
        """Get command path for metric style (narrow, wide, transition)."""
        return ["protocols", "isis", "metric-style", style]

    def get_set_attached_bit(self) -> List[str]:
        """Get command path for set-attached-bit."""
        return ["protocols", "isis", "set-attached-bit"]

    def get_set_overload_bit(self) -> List[str]:
        """Get command path for set-overload-bit."""
        return ["protocols", "isis", "set-overload-bit"]

    def get_purge_originator(self) -> List[str]:
        """Get command path for purge-originator."""
        return ["protocols", "isis", "purge-originator"]

    # ========================================================================
    # Interface Configuration Paths
    # ========================================================================

    def get_interface(self, interface: str) -> List[str]:
        """Get command path for interface configuration."""
        return ["protocols", "isis", "interface", interface]

    def get_interface_passive(self, interface: str) -> List[str]:
        """Get command path for passive interface."""
        return ["protocols", "isis", "interface", interface, "passive"]

    def get_interface_circuit_type(self, interface: str, circuit_type: str) -> List[str]:
        """Get command path for interface circuit type."""
        return ["protocols", "isis", "interface", interface, "circuit-type", circuit_type]

    def get_interface_hello_interval(self, interface: str, interval: str) -> List[str]:
        """Get command path for hello interval."""
        return ["protocols", "isis", "interface", interface, "hello-interval", interval]

    def get_interface_hello_multiplier(self, interface: str, multiplier: str) -> List[str]:
        """Get command path for hello multiplier."""
        return ["protocols", "isis", "interface", interface, "hello-multiplier", multiplier]

    def get_interface_metric(self, interface: str, metric: str) -> List[str]:
        """Get command path for interface metric."""
        return ["protocols", "isis", "interface", interface, "metric", metric]

    def get_interface_priority(self, interface: str, priority: str) -> List[str]:
        """Get command path for interface priority."""
        return ["protocols", "isis", "interface", interface, "priority", priority]

    def get_interface_network_point_to_point(self, interface: str) -> List[str]:
        """Get command path for point-to-point network type."""
        return ["protocols", "isis", "interface", interface, "network", "point-to-point"]

    def get_interface_bfd(self, interface: str) -> List[str]:
        """Get command path for BFD on interface."""
        return ["protocols", "isis", "interface", interface, "bfd"]

    # ========================================================================
    # Redistribution Configuration Paths
    # ========================================================================

    def get_redistribute(self, level: str, protocol: str) -> List[str]:
        """Get command path for redistributing a protocol."""
        return ["protocols", "isis", "redistribute", level, protocol]

    def get_redistribute_route_map(self, level: str, protocol: str, route_map: str) -> List[str]:
        """Get command path for redistribution route-map."""
        return ["protocols", "isis", "redistribute", level, protocol, "route-map", route_map]

    def get_redistribute_metric(self, level: str, protocol: str, metric: str) -> List[str]:
        """Get command path for redistribution metric."""
        return ["protocols", "isis", "redistribute", level, protocol, "metric", metric]

    # ========================================================================
    # Default Information Configuration
    # ========================================================================

    def get_default_information_originate(self, level: str) -> List[str]:
        """Get command path for originating default information."""
        return ["protocols", "isis", "default-information", "originate", level]

    def get_default_information_originate_always(self, level: str) -> List[str]:
        """Get command path for always originating default."""
        return ["protocols", "isis", "default-information", "originate", level, "always"]

    def get_default_information_originate_metric(self, level: str, metric: str) -> List[str]:
        """Get command path for default information metric."""
        return ["protocols", "isis", "default-information", "originate", level, "metric", metric]

    def get_default_information_originate_route_map(self, level: str, route_map: str) -> List[str]:
        """Get command path for default information route-map."""
        return ["protocols", "isis", "default-information", "originate", level, "route-map", route_map]

    # ========================================================================
    # SPF Configuration Paths
    # ========================================================================

    def get_spf_delay_ietf_init_delay(self, delay: str) -> List[str]:
        """Get command path for SPF initial delay."""
        return ["protocols", "isis", "spf-delay-ietf", "init-delay", delay]

    def get_spf_delay_ietf_short_delay(self, delay: str) -> List[str]:
        """Get command path for SPF short delay."""
        return ["protocols", "isis", "spf-delay-ietf", "short-delay", delay]

    def get_spf_delay_ietf_long_delay(self, delay: str) -> List[str]:
        """Get command path for SPF long delay."""
        return ["protocols", "isis", "spf-delay-ietf", "long-delay", delay]

    def get_spf_delay_ietf_holddown(self, delay: str) -> List[str]:
        """Get command path for SPF holddown."""
        return ["protocols", "isis", "spf-delay-ietf", "holddown", delay]

    def get_spf_delay_ietf_time_to_learn(self, time: str) -> List[str]:
        """Get command path for SPF time to learn."""
        return ["protocols", "isis", "spf-delay-ietf", "time-to-learn", time]

    # ========================================================================
    # Config Parsing Methods (for READ operations)
    # ========================================================================

    def parse_isis_config(self, config: Dict[str, Any]) -> Dict[str, Any]:
        """
        Parse full IS-IS configuration from VyOS.

        Args:
            config: Raw IS-IS config dictionary from VyOS (under protocols > isis)

        Returns:
            Parsed IS-IS configuration as dictionary
        """
        if not config:
            return {
                "configured": False,
                "net": [],
                "is_type": None,
                "interfaces": [],
                "redistributions": [],
                "dynamic_hostname": False,
                "metric_style": None,
                "lsp_mtu": None,
                "lsp_gen_interval": None,
                "lsp_refresh_interval": None,
                "max_lsp_lifetime": None,
                "set_attached_bit": False,
                "set_overload_bit": False,
                "purge_originator": False,
                "spf_delay": None,
            }

        # Parse NETs
        nets = []
        net_cfg = config.get("net", [])
        if isinstance(net_cfg, list):
            nets = net_cfg
        elif isinstance(net_cfg, dict):
            nets = list(net_cfg.keys())
        elif isinstance(net_cfg, str):
            nets = [net_cfg]

        # Parse interfaces
        interfaces = self._parse_interfaces(config.get("interface", {}))

        # Parse redistributions
        redistributions = self._parse_redistributions(config.get("redistribute", {}))

        # Parse SPF delay
        spf_delay = self._parse_spf_delay(config.get("spf-delay-ietf", {}))

        return {
            "configured": True,
            "net": nets,
            "is_type": config.get("is-type"),
            "interfaces": interfaces,
            "redistributions": redistributions,
            "dynamic_hostname": "dynamic-hostname" in config,
            "metric_style": config.get("metric-style"),
            "lsp_mtu": config.get("lsp-mtu"),
            "lsp_gen_interval": config.get("lsp-gen-interval"),
            "lsp_refresh_interval": config.get("lsp-refresh-interval"),
            "max_lsp_lifetime": config.get("max-lsp-lifetime"),
            "set_attached_bit": "set-attached-bit" in config,
            "set_overload_bit": "set-overload-bit" in config,
            "purge_originator": "purge-originator" in config,
            "spf_delay": spf_delay,
        }

    def _parse_interfaces(self, interfaces_config: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Parse interface configurations."""
        interfaces = []
        for iface_name, iface_cfg in interfaces_config.items():
            if not isinstance(iface_cfg, dict):
                interfaces.append({
                    "name": iface_name,
                    "passive": False,
                    "circuit_type": None,
                    "metric": None,
                    "priority": None,
                    "hello_interval": None,
                    "hello_multiplier": None,
                    "network": None,
                    "bfd": False,
                })
                continue

            # Determine network type
            network_type = None
            network_cfg = iface_cfg.get("network", {})
            if isinstance(network_cfg, dict):
                if "point-to-point" in network_cfg:
                    network_type = "point-to-point"

            interfaces.append({
                "name": iface_name,
                "passive": "passive" in iface_cfg,
                "circuit_type": iface_cfg.get("circuit-type"),
                "metric": iface_cfg.get("metric"),
                "priority": iface_cfg.get("priority"),
                "hello_interval": iface_cfg.get("hello-interval"),
                "hello_multiplier": iface_cfg.get("hello-multiplier"),
                "network": network_type,
                "bfd": "bfd" in iface_cfg,
            })

        return interfaces

    def _parse_redistributions(self, redist_config: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Parse redistribution configurations."""
        redistributions = []
        for level, level_cfg in redist_config.items():
            if not isinstance(level_cfg, dict):
                continue
            for protocol, protocol_cfg in level_cfg.items():
                if isinstance(protocol_cfg, dict):
                    redistributions.append({
                        "level": level,
                        "protocol": protocol,
                        "route_map": protocol_cfg.get("route-map"),
                        "metric": protocol_cfg.get("metric"),
                    })
                else:
                    redistributions.append({
                        "level": level,
                        "protocol": protocol,
                        "route_map": None,
                        "metric": None,
                    })

        return redistributions

    def _parse_spf_delay(self, spf_config: Dict[str, Any]) -> Dict[str, Any] | None:
        """Parse SPF delay configurations."""
        if not spf_config:
            return None

        return {
            "init_delay": spf_config.get("init-delay"),
            "short_delay": spf_config.get("short-delay"),
            "long_delay": spf_config.get("long-delay"),
            "holddown": spf_config.get("holddown"),
            "time_to_learn": spf_config.get("time-to-learn"),
        }
