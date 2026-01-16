"""Base Firewall Global Options mapper for all VyOS versions."""
from typing import List
from ..base import BaseFeatureMapper


class FirewallGlobalOptionsMapper(BaseFeatureMapper):
    """Base mapper for firewall global-options configuration commands.

    Commands that are common across VyOS 1.4 and 1.5.
    """

    def __init__(self, version: str):
        super().__init__(version)

    # ==================== Basic Options ====================

    def get_all_ping(self, value: str) -> List[str]:
        """Get command path for all-ping setting (enable/disable)."""
        return ["firewall", "global-options", "all-ping", value]

    def get_all_ping_path(self) -> List[str]:
        """Get command path for all-ping (for deletion)."""
        return ["firewall", "global-options", "all-ping"]

    def get_broadcast_ping(self, value: str) -> List[str]:
        """Get command path for broadcast-ping setting (enable/disable)."""
        return ["firewall", "global-options", "broadcast-ping", value]

    def get_broadcast_ping_path(self) -> List[str]:
        """Get command path for broadcast-ping (for deletion)."""
        return ["firewall", "global-options", "broadcast-ping"]

    # ==================== Source Routing ====================

    def get_ip_src_route(self, value: str) -> List[str]:
        """Get command path for ip-src-route setting (enable/disable)."""
        return ["firewall", "global-options", "ip-src-route", value]

    def get_ip_src_route_path(self) -> List[str]:
        """Get command path for ip-src-route (for deletion)."""
        return ["firewall", "global-options", "ip-src-route"]

    def get_ipv6_src_route(self, value: str) -> List[str]:
        """Get command path for ipv6-src-route setting (enable/disable)."""
        return ["firewall", "global-options", "ipv6-src-route", value]

    def get_ipv6_src_route_path(self) -> List[str]:
        """Get command path for ipv6-src-route (for deletion)."""
        return ["firewall", "global-options", "ipv6-src-route"]

    # ==================== ICMP Redirects ====================

    def get_receive_redirects(self, value: str) -> List[str]:
        """Get command path for receive-redirects setting (enable/disable)."""
        return ["firewall", "global-options", "receive-redirects", value]

    def get_receive_redirects_path(self) -> List[str]:
        """Get command path for receive-redirects (for deletion)."""
        return ["firewall", "global-options", "receive-redirects"]

    def get_ipv6_receive_redirects(self, value: str) -> List[str]:
        """Get command path for ipv6-receive-redirects setting (enable/disable)."""
        return ["firewall", "global-options", "ipv6-receive-redirects", value]

    def get_ipv6_receive_redirects_path(self) -> List[str]:
        """Get command path for ipv6-receive-redirects (for deletion)."""
        return ["firewall", "global-options", "ipv6-receive-redirects"]

    def get_send_redirects(self, value: str) -> List[str]:
        """Get command path for send-redirects setting (enable/disable)."""
        return ["firewall", "global-options", "send-redirects", value]

    def get_send_redirects_path(self) -> List[str]:
        """Get command path for send-redirects (for deletion)."""
        return ["firewall", "global-options", "send-redirects"]

    # ==================== Security Options ====================

    def get_log_martians(self, value: str) -> List[str]:
        """Get command path for log-martians setting (enable/disable)."""
        return ["firewall", "global-options", "log-martians", value]

    def get_log_martians_path(self) -> List[str]:
        """Get command path for log-martians (for deletion)."""
        return ["firewall", "global-options", "log-martians"]

    def get_source_validation(self, value: str) -> List[str]:
        """Get command path for source-validation setting (strict/loose/disable)."""
        return ["firewall", "global-options", "source-validation", value]

    def get_source_validation_path(self) -> List[str]:
        """Get command path for source-validation (for deletion)."""
        return ["firewall", "global-options", "source-validation"]

    def get_syn_cookies(self, value: str) -> List[str]:
        """Get command path for syn-cookies setting (enable/disable)."""
        return ["firewall", "global-options", "syn-cookies", value]

    def get_syn_cookies_path(self) -> List[str]:
        """Get command path for syn-cookies (for deletion)."""
        return ["firewall", "global-options", "syn-cookies"]

    def get_twa_hazards_protection(self, value: str) -> List[str]:
        """Get command path for twa-hazards-protection setting (enable/disable)."""
        return ["firewall", "global-options", "twa-hazards-protection", value]

    def get_twa_hazards_protection_path(self) -> List[str]:
        """Get command path for twa-hazards-protection (for deletion)."""
        return ["firewall", "global-options", "twa-hazards-protection"]

    # ==================== State Policy ====================

    def get_state_policy_established_action(self, action: str) -> List[str]:
        """Get command path for state-policy established action."""
        return ["firewall", "global-options", "state-policy", "established", "action", action]

    def get_state_policy_established_action_path(self) -> List[str]:
        """Get command path for state-policy established action (for deletion)."""
        return ["firewall", "global-options", "state-policy", "established", "action"]

    def get_state_policy_established_log(self) -> List[str]:
        """Get command path for state-policy established log."""
        return ["firewall", "global-options", "state-policy", "established", "log"]

    def get_state_policy_established_log_path(self) -> List[str]:
        """Get command path for state-policy established log (for deletion)."""
        return ["firewall", "global-options", "state-policy", "established", "log"]

    def get_state_policy_established_log_level(self, level: str) -> List[str]:
        """Get command path for state-policy established log-level."""
        return ["firewall", "global-options", "state-policy", "established", "log-level", level]

    def get_state_policy_established_log_level_path(self) -> List[str]:
        """Get command path for state-policy established log-level (for deletion)."""
        return ["firewall", "global-options", "state-policy", "established", "log-level"]

    def get_state_policy_invalid_action(self, action: str) -> List[str]:
        """Get command path for state-policy invalid action."""
        return ["firewall", "global-options", "state-policy", "invalid", "action", action]

    def get_state_policy_invalid_action_path(self) -> List[str]:
        """Get command path for state-policy invalid action (for deletion)."""
        return ["firewall", "global-options", "state-policy", "invalid", "action"]

    def get_state_policy_invalid_log(self) -> List[str]:
        """Get command path for state-policy invalid log."""
        return ["firewall", "global-options", "state-policy", "invalid", "log"]

    def get_state_policy_invalid_log_path(self) -> List[str]:
        """Get command path for state-policy invalid log (for deletion)."""
        return ["firewall", "global-options", "state-policy", "invalid", "log"]

    def get_state_policy_invalid_log_level(self, level: str) -> List[str]:
        """Get command path for state-policy invalid log-level."""
        return ["firewall", "global-options", "state-policy", "invalid", "log-level", level]

    def get_state_policy_invalid_log_level_path(self) -> List[str]:
        """Get command path for state-policy invalid log-level (for deletion)."""
        return ["firewall", "global-options", "state-policy", "invalid", "log-level"]

    def get_state_policy_related_action(self, action: str) -> List[str]:
        """Get command path for state-policy related action."""
        return ["firewall", "global-options", "state-policy", "related", "action", action]

    def get_state_policy_related_action_path(self) -> List[str]:
        """Get command path for state-policy related action (for deletion)."""
        return ["firewall", "global-options", "state-policy", "related", "action"]

    def get_state_policy_related_log(self) -> List[str]:
        """Get command path for state-policy related log."""
        return ["firewall", "global-options", "state-policy", "related", "log"]

    def get_state_policy_related_log_path(self) -> List[str]:
        """Get command path for state-policy related log (for deletion)."""
        return ["firewall", "global-options", "state-policy", "related", "log"]

    def get_state_policy_related_log_level(self, level: str) -> List[str]:
        """Get command path for state-policy related log-level."""
        return ["firewall", "global-options", "state-policy", "related", "log-level", level]

    def get_state_policy_related_log_level_path(self) -> List[str]:
        """Get command path for state-policy related log-level (for deletion)."""
        return ["firewall", "global-options", "state-policy", "related", "log-level"]
