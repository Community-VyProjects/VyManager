"""
System Option Performance Command Mapper

Handles 'set system option performance <profile>' for VyOS.
Version-specific: 1.4 has throughput/latency; 1.5 has network-throughput, network-latency,
power-save, virtual-guest, virtual-host.
"""

from typing import List, Dict, Any, Tuple, Optional
from ..base import BaseFeatureMapper


# (value, label, description) for API/capabilities
PERFORMANCE_OPTION = Tuple[str, str, str]


class SystemPerformanceMapper(BaseFeatureMapper):
    """
    Mapper for system option performance.
    Base implements VyOS 1.5 (five profiles); v1.4 overrides to two profiles.
    """

    def __init__(self, version: str):
        super().__init__(version)

    # ========================================================================
    # Command path methods (for WRITE)
    # ========================================================================

    def get_performance_set_path(self, value: str) -> List[str]:
        """Path for 'set system option performance <value>'."""
        return ["system", "option", "performance", value]

    def get_performance_delete_path(self) -> List[str]:
        """Path for 'delete system option performance'."""
        return ["system", "option", "performance"]

    # ========================================================================
    # Valid options (version-specific; override in v1_4)
    # ========================================================================

    def get_valid_performance_options(self) -> List[PERFORMANCE_OPTION]:
        """
        Return list of (value, label, description) for this VyOS version.
        Used for validation and for /capabilities.
        """
        return [
            ("network-throughput", "Network throughput", "Tune for maximum network throughput"),
            ("network-latency", "Network latency", "Tune for low network latency"),
            ("power-save", "Power save", "Tune for low power consumption"),
            ("virtual-guest", "Virtual guest", "Tune for running inside a virtual machine"),
            ("virtual-host", "Virtual host", "Tune for running guest virtual machines"),
        ]

    def get_valid_performance_values(self) -> List[str]:
        """Return list of valid value strings for validation."""
        return [opt[0] for opt in self.get_valid_performance_options()]

    # ========================================================================
    # Config parsing (for READ)
    # ========================================================================

    def parse_performance(self, option_config: Dict[str, Any]) -> Optional[str]:
        """
        Parse current performance profile from system.option config.
        option_config is the 'option' node under 'system' (e.g. {"performance": {"network-throughput": {}}}).
        Returns the profile value (e.g. "network-throughput") or None if not set.
        """
        perf_node = option_config.get("performance")
        if not perf_node:
            return None
        if isinstance(perf_node, dict) and perf_node:
            keys = list(perf_node.keys())
            return keys[0] if keys else None
        if isinstance(perf_node, str):
            return perf_node
        return None
