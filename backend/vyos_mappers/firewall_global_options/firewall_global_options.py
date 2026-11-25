"""Firewall global-options command mapper.

One class holds the ``firewall global-options`` commands both VyOS versions
have. ``apply-to-bridged-traffic``, ``geoip``, ``state-policy offload`` and
``timeout`` exist only on 1.5; those paths live on
``firewall_global_options_versions.v1_5.FirewallGlobalOptionsMapperV1_5``.
"""

from typing import Any, Dict, FrozenSet, List, Tuple

from ..base import BaseFeatureMapper

# Lab `allowed:` lines, the same on 1.4 and 1.5.
TOGGLE_VALUES = ("enable", "disable")
SOURCE_VALIDATION_VALUES = ("strict", "loose", "disable")
STATE_ACTION_VALUES = ("accept", "drop", "reject")
LOG_LEVEL_VALUES = ("emerg", "alert", "crit", "err", "warn", "notice", "info", "debug")


class FirewallGlobalOptionsMapper(BaseFeatureMapper):
    """Firewall global-options paths shared by VyOS 1.4 and 1.5."""

    # Version-only CLI node -> every path method under it (on the subclass).
    _VERSIONED_NODES: Dict[str, Tuple[str, ...]] = {
        "apply-to-bridged-traffic": (
            "get_apply_to_bridged_traffic_path",
            "get_apply_to_bridged_traffic_family",
            "get_apply_to_bridged_traffic_accept_invalid_path",
            "get_apply_to_bridged_traffic_accept_invalid_ethernet_type",
        ),
        "geoip": (
            "get_geoip_path",
            "get_geoip_leaf",
            "get_geoip_leaf_path",
            "get_geoip_maxmind_lite",
        ),
        "state-policy offload": (
            "get_state_policy_offload_path",
            "get_state_policy_offload_target",
        ),
        "timeout": (
            "get_timeout_path",
            "get_timeout",
            "get_timeout_leaf_path",
        ),
    }

    def _base(self) -> List[str]:
        return ["firewall", "global-options"]

    # ========================================================================
    # Version allowlist
    # ========================================================================

    def versioned_nodes(self) -> FrozenSet[str]:
        """Global-options nodes only some VyOS versions have.

        A node counts when every path method below it is on this mapper.
        Capabilities and the builder read this set instead of the version
        string.
        """
        return frozenset(
            node
            for node, methods in self._VERSIONED_NODES.items()
            if all(callable(getattr(self, method, None)) for method in methods)
        )

    def require_node(self, node: str) -> None:
        if node not in self.versioned_nodes():
            raise ValueError(f"firewall global-options {node} is not supported on this device")

    # ========================================================================
    # Value lists
    # ========================================================================

    def toggle_values(self) -> Tuple[str, ...]:
        return TOGGLE_VALUES

    def source_validation_values(self) -> Tuple[str, ...]:
        return SOURCE_VALIDATION_VALUES

    def state_action_values(self) -> Tuple[str, ...]:
        return STATE_ACTION_VALUES

    def log_level_values(self) -> Tuple[str, ...]:
        return LOG_LEVEL_VALUES

    def geoip_provider_values(self) -> Tuple[str, ...]:
        """``geoip provider`` exists only on 1.5."""
        return ()

    def bridged_ethernet_type_values(self) -> Tuple[str, ...]:
        """``apply-to-bridged-traffic accept-invalid ethernet-type`` exists only on 1.5."""
        return ()

    # ========================================================================
    # Config read
    # ========================================================================

    def parse_config(self, full_config: Dict[str, Any]) -> Dict[str, Any]:
        from .config_parse import parse_config as parse_global_options_config

        return parse_global_options_config(self, full_config)

    # ========================================================================
    # Root
    # ========================================================================

    def get_global_options_path(self) -> List[str]:
        """The whole ``firewall global-options`` node."""
        return self._base()

    # ========================================================================
    # Single-value leaves (enable/disable, strict/loose/disable)
    # ========================================================================

    def get_all_ping(self, value: str) -> List[str]:
        return self._base() + ["all-ping", value]

    def get_all_ping_path(self) -> List[str]:
        return self._base() + ["all-ping"]

    def get_broadcast_ping(self, value: str) -> List[str]:
        return self._base() + ["broadcast-ping", value]

    def get_broadcast_ping_path(self) -> List[str]:
        return self._base() + ["broadcast-ping"]

    def get_directed_broadcast(self, value: str) -> List[str]:
        return self._base() + ["directed-broadcast", value]

    def get_directed_broadcast_path(self) -> List[str]:
        return self._base() + ["directed-broadcast"]

    def get_ip_src_route(self, value: str) -> List[str]:
        return self._base() + ["ip-src-route", value]

    def get_ip_src_route_path(self) -> List[str]:
        return self._base() + ["ip-src-route"]

    def get_ipv6_src_route(self, value: str) -> List[str]:
        return self._base() + ["ipv6-src-route", value]

    def get_ipv6_src_route_path(self) -> List[str]:
        return self._base() + ["ipv6-src-route"]

    def get_receive_redirects(self, value: str) -> List[str]:
        return self._base() + ["receive-redirects", value]

    def get_receive_redirects_path(self) -> List[str]:
        return self._base() + ["receive-redirects"]

    def get_ipv6_receive_redirects(self, value: str) -> List[str]:
        return self._base() + ["ipv6-receive-redirects", value]

    def get_ipv6_receive_redirects_path(self) -> List[str]:
        return self._base() + ["ipv6-receive-redirects"]

    def get_send_redirects(self, value: str) -> List[str]:
        return self._base() + ["send-redirects", value]

    def get_send_redirects_path(self) -> List[str]:
        return self._base() + ["send-redirects"]

    def get_log_martians(self, value: str) -> List[str]:
        return self._base() + ["log-martians", value]

    def get_log_martians_path(self) -> List[str]:
        return self._base() + ["log-martians"]

    def get_source_validation(self, value: str) -> List[str]:
        return self._base() + ["source-validation", value]

    def get_source_validation_path(self) -> List[str]:
        return self._base() + ["source-validation"]

    def get_ipv6_source_validation(self, value: str) -> List[str]:
        return self._base() + ["ipv6-source-validation", value]

    def get_ipv6_source_validation_path(self) -> List[str]:
        return self._base() + ["ipv6-source-validation"]

    def get_syn_cookies(self, value: str) -> List[str]:
        return self._base() + ["syn-cookies", value]

    def get_syn_cookies_path(self) -> List[str]:
        return self._base() + ["syn-cookies"]

    def get_twa_hazards_protection(self, value: str) -> List[str]:
        return self._base() + ["twa-hazards-protection", value]

    def get_twa_hazards_protection_path(self) -> List[str]:
        return self._base() + ["twa-hazards-protection"]

    # ========================================================================
    # DNS Resolver
    # ========================================================================

    def get_resolver_cache(self) -> List[str]:
        """``resolver-cache`` is a valueless flag; set and delete share the path."""
        return self._base() + ["resolver-cache"]

    def get_resolver_interval(self, seconds: str) -> List[str]:
        return self._base() + ["resolver-interval", seconds]

    def get_resolver_interval_path(self) -> List[str]:
        return self._base() + ["resolver-interval"]

    # ========================================================================
    # State Policy (established, invalid, related)
    # ========================================================================

    def get_state_policy_path(self) -> List[str]:
        return self._base() + ["state-policy"]

    def get_state_policy_state_path(self, state: str) -> List[str]:
        return self.get_state_policy_path() + [state]

    def get_state_policy_action(self, state: str, action: str) -> List[str]:
        return self.get_state_policy_state_path(state) + ["action", action]

    def get_state_policy_action_path(self, state: str) -> List[str]:
        return self.get_state_policy_state_path(state) + ["action"]

    def get_state_policy_log(self, state: str) -> List[str]:
        """``log`` is a valueless flag; set and delete share the path."""
        return self.get_state_policy_state_path(state) + ["log"]

    def get_state_policy_log_level(self, state: str, level: str) -> List[str]:
        return self.get_state_policy_state_path(state) + ["log-level", level]

    def get_state_policy_log_level_path(self, state: str) -> List[str]:
        return self.get_state_policy_state_path(state) + ["log-level"]
