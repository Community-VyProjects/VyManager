"""
OpenFabric Protocol Command Mapper

Handles OpenFabric routing protocol configuration commands.
OpenFabric is a simplified IS-IS based protocol designed for
data center fabrics with fast convergence.
"""

from typing import List, Dict, Any
from ..base import BaseFeatureMapper


class OpenFabricMapper(BaseFeatureMapper):
    """OpenFabric protocol mapper with all OpenFabric configuration operations"""

    def __init__(self, version: str):
        """Initialize with VyOS version."""
        super().__init__(version)

    # ========================================================================
    # Basic OpenFabric Configuration Paths
    # ========================================================================

    def get_openfabric(self) -> List[str]:
        """Get command path for creating OpenFabric."""
        return ["protocols", "openfabric"]

    def get_name(self, fabric_name: str) -> List[str]:
        """Get command path for fabric name."""
        return ["protocols", "openfabric", fabric_name]

    def get_net(self, fabric_name: str, net: str) -> List[str]:
        """Get command path for Network Entity Title."""
        return ["protocols", "openfabric", fabric_name, "net", net]

    def get_domain_password(self, fabric_name: str, password: str) -> List[str]:
        """Get command path for domain password."""
        return ["protocols", "openfabric", fabric_name, "domain-password", "plaintext-password", password]

    def get_log_adjacency_changes(self, fabric_name: str) -> List[str]:
        """Get command path for logging adjacency changes."""
        return ["protocols", "openfabric", fabric_name, "log-adjacency-changes"]

    def get_set_overload_bit(self, fabric_name: str) -> List[str]:
        """Get command path for overload bit."""
        return ["protocols", "openfabric", fabric_name, "set-overload-bit"]

    def get_lsp_gen_interval(self, fabric_name: str, interval: str) -> List[str]:
        """Get command path for LSP generation interval."""
        return ["protocols", "openfabric", fabric_name, "lsp-gen-interval", interval]

    def get_lsp_refresh_interval(self, fabric_name: str, interval: str) -> List[str]:
        """Get command path for LSP refresh interval."""
        return ["protocols", "openfabric", fabric_name, "lsp-refresh-interval", interval]

    def get_max_lsp_lifetime(self, fabric_name: str, lifetime: str) -> List[str]:
        """Get command path for max LSP lifetime."""
        return ["protocols", "openfabric", fabric_name, "max-lsp-lifetime", lifetime]

    def get_spf_interval(self, fabric_name: str, interval: str) -> List[str]:
        """Get command path for SPF interval."""
        return ["protocols", "openfabric", fabric_name, "spf-interval", interval]

    # ========================================================================
    # Interface Configuration Paths
    # ========================================================================

    def get_interface(self, fabric_name: str, interface: str) -> List[str]:
        """Get command path for interface configuration."""
        return ["protocols", "openfabric", fabric_name, "interface", interface]

    def get_interface_passive(self, fabric_name: str, interface: str) -> List[str]:
        """Get command path for passive interface."""
        return ["protocols", "openfabric", fabric_name, "interface", interface, "passive"]

    def get_interface_metric(self, fabric_name: str, interface: str, metric: str) -> List[str]:
        """Get command path for interface metric."""
        return ["protocols", "openfabric", fabric_name, "interface", interface, "metric", metric]

    def get_interface_hello_interval(self, fabric_name: str, interface: str, interval: str) -> List[str]:
        """Get command path for hello interval."""
        return ["protocols", "openfabric", fabric_name, "interface", interface, "hello-interval", interval]

    def get_interface_hello_multiplier(self, fabric_name: str, interface: str, multiplier: str) -> List[str]:
        """Get command path for hello multiplier."""
        return ["protocols", "openfabric", fabric_name, "interface", interface, "hello-multiplier", multiplier]

    def get_interface_csnp_interval(self, fabric_name: str, interface: str, interval: str) -> List[str]:
        """Get command path for CSNP interval."""
        return ["protocols", "openfabric", fabric_name, "interface", interface, "csnp-interval", interval]

    def get_interface_psnp_interval(self, fabric_name: str, interface: str, interval: str) -> List[str]:
        """Get command path for PSNP interval."""
        return ["protocols", "openfabric", fabric_name, "interface", interface, "psnp-interval", interval]

    def get_interface_password(self, fabric_name: str, interface: str, password: str) -> List[str]:
        """Get command path for interface password."""
        return ["protocols", "openfabric", fabric_name, "interface", interface, "password", "plaintext-password", password]

    # ========================================================================
    # Redistribution Configuration Paths
    # ========================================================================

    def get_redistribute(self, fabric_name: str, level: str, protocol: str) -> List[str]:
        """Get command path for redistributing a protocol."""
        return ["protocols", "openfabric", fabric_name, "redistribute", level, protocol]

    def get_redistribute_route_map(self, fabric_name: str, level: str, protocol: str, route_map: str) -> List[str]:
        """Get command path for redistribution route-map."""
        return ["protocols", "openfabric", fabric_name, "redistribute", level, protocol, "route-map", route_map]

    def get_redistribute_metric(self, fabric_name: str, level: str, protocol: str, metric: str) -> List[str]:
        """Get command path for redistribution metric."""
        return ["protocols", "openfabric", fabric_name, "redistribute", level, protocol, "metric", metric]

    # ========================================================================
    # Segment Routing Configuration (if supported)
    # ========================================================================

    def get_segment_routing(self, fabric_name: str) -> List[str]:
        """Get command path for segment routing."""
        return ["protocols", "openfabric", fabric_name, "segment-routing"]

    def get_segment_routing_enable(self, fabric_name: str) -> List[str]:
        """Get command path for enabling segment routing."""
        return ["protocols", "openfabric", fabric_name, "segment-routing", "enable"]

    def get_segment_routing_global_block_low(self, fabric_name: str, value: str) -> List[str]:
        """Get command path for global block low value."""
        return ["protocols", "openfabric", fabric_name, "segment-routing", "global-block", "low-label-value", value]

    def get_segment_routing_global_block_high(self, fabric_name: str, value: str) -> List[str]:
        """Get command path for global block high value."""
        return ["protocols", "openfabric", fabric_name, "segment-routing", "global-block", "high-label-value", value]

    def get_segment_routing_prefix_sid(self, fabric_name: str, prefix: str, index: str) -> List[str]:
        """Get command path for prefix SID."""
        return ["protocols", "openfabric", fabric_name, "segment-routing", "prefix", prefix, "index", "value", index]

    # ========================================================================
    # Config Parsing Methods (for READ operations)
    # ========================================================================

    def parse_openfabric_config(self, config: Dict[str, Any]) -> Dict[str, Any]:
        """
        Parse full OpenFabric configuration from VyOS.

        Args:
            config: Raw OpenFabric config dictionary from VyOS (under protocols > openfabric)

        Returns:
            Parsed OpenFabric configuration as dictionary
        """
        if not config:
            return {
                "configured": False,
                "fabrics": [],
            }

        fabrics = []
        for fabric_name, fabric_cfg in config.items():
            if not isinstance(fabric_cfg, dict):
                continue

            fabric = self._parse_fabric(fabric_name, fabric_cfg)
            fabrics.append(fabric)

        return {
            "configured": len(fabrics) > 0,
            "fabrics": fabrics,
        }

    def _parse_fabric(self, name: str, config: Dict[str, Any]) -> Dict[str, Any]:
        """Parse a single fabric configuration."""
        # Parse NETs
        nets = []
        net_config = config.get("net", {})
        if isinstance(net_config, dict):
            nets = list(net_config.keys())
        elif isinstance(net_config, list):
            nets = net_config

        # Parse interfaces
        interfaces = self._parse_interfaces(config.get("interface", {}))

        # Parse redistributions
        redistributions = self._parse_redistributions(config.get("redistribute", {}))

        # Parse segment routing
        segment_routing = self._parse_segment_routing(config.get("segment-routing", {}))

        return {
            "name": name,
            "net": nets,
            "interfaces": interfaces,
            "redistributions": redistributions,
            "log_adjacency_changes": "log-adjacency-changes" in config,
            "set_overload_bit": "set-overload-bit" in config,
            "lsp_gen_interval": config.get("lsp-gen-interval"),
            "lsp_refresh_interval": config.get("lsp-refresh-interval"),
            "max_lsp_lifetime": config.get("max-lsp-lifetime"),
            "spf_interval": config.get("spf-interval"),
            "domain_password": bool(config.get("domain-password")),
            "segment_routing": segment_routing,
        }

    def _parse_interfaces(self, interfaces_config: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Parse interface configurations."""
        interfaces = []
        for iface_name, iface_cfg in interfaces_config.items():
            if not isinstance(iface_cfg, dict):
                # Interface with no additional config
                interfaces.append({
                    "name": iface_name,
                    "passive": False,
                    "metric": None,
                    "hello_interval": None,
                    "hello_multiplier": None,
                    "csnp_interval": None,
                    "psnp_interval": None,
                    "password": False,
                })
                continue

            interfaces.append({
                "name": iface_name,
                "passive": "passive" in iface_cfg,
                "metric": iface_cfg.get("metric"),
                "hello_interval": iface_cfg.get("hello-interval"),
                "hello_multiplier": iface_cfg.get("hello-multiplier"),
                "csnp_interval": iface_cfg.get("csnp-interval"),
                "psnp_interval": iface_cfg.get("psnp-interval"),
                "password": bool(iface_cfg.get("password")),
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

    def _parse_segment_routing(self, sr_config: Dict[str, Any]) -> Dict[str, Any]:
        """Parse segment routing configuration."""
        if not sr_config:
            return None

        enabled = "enable" in sr_config

        global_block = sr_config.get("global-block", {})

        prefixes = []
        prefix_config = sr_config.get("prefix", {})
        for prefix, prefix_cfg in prefix_config.items():
            if isinstance(prefix_cfg, dict):
                index_cfg = prefix_cfg.get("index", {})
                prefixes.append({
                    "prefix": prefix,
                    "index": index_cfg.get("value") if isinstance(index_cfg, dict) else None,
                })

        return {
            "enabled": enabled,
            "global_block_low": global_block.get("low-label-value"),
            "global_block_high": global_block.get("high-label-value"),
            "prefixes": prefixes,
        }
