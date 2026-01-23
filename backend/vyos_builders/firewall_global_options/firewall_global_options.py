"""
Firewall Global Options Batch Builder

Provides all firewall global-options batch operations following the standard pattern.
Handles version-specific differences through the mapper layer.
"""

from typing import List, Dict, Any
from vyos_mappers import CommandMapperRegistry


class FirewallGlobalOptionsBatchBuilder:
    """Complete batch builder for firewall global-options operations"""

    def __init__(self, version: str):
        """Initialize firewall global-options batch builder."""
        self.version = version
        self._operations: List[Dict[str, Any]] = []

        # Get mapper for this version
        self.mappers = CommandMapperRegistry.get_all_mappers(version)
        self.mapper_key = "firewall_global_options"

    # ========================================================================
    # Core Batch Operations
    # ========================================================================

    def add_set(self, path: List[str]) -> "FirewallGlobalOptionsBatchBuilder":
        """Add a 'set' operation to the batch."""
        if path:  # Only add if path is not empty
            self._operations.append({"op": "set", "path": path})
        return self

    def add_delete(self, path: List[str]) -> "FirewallGlobalOptionsBatchBuilder":
        """Add a 'delete' operation to the batch."""
        if path:
            self._operations.append({"op": "delete", "path": path})
        return self

    def clear(self) -> None:
        """Clear all operations from the batch."""
        self._operations = []

    def get_operations(self) -> List[Dict[str, Any]]:
        """Get the list of operations."""
        return self._operations.copy()

    def operation_count(self) -> int:
        """Get the number of operations in the batch."""
        return len(self._operations)

    def is_empty(self) -> bool:
        """Check if the batch is empty."""
        return len(self._operations) == 0

    # ========================================================================
    # Basic Options
    # ========================================================================

    def set_all_ping(self, value: str) -> "FirewallGlobalOptionsBatchBuilder":
        """Set all-ping (enable/disable)."""
        path = self.mappers[self.mapper_key].get_all_ping(value)
        return self.add_set(path)

    def delete_all_ping(self) -> "FirewallGlobalOptionsBatchBuilder":
        """Delete all-ping setting."""
        path = self.mappers[self.mapper_key].get_all_ping_path()
        return self.add_delete(path)

    def set_broadcast_ping(self, value: str) -> "FirewallGlobalOptionsBatchBuilder":
        """Set broadcast-ping (enable/disable)."""
        path = self.mappers[self.mapper_key].get_broadcast_ping(value)
        return self.add_set(path)

    def delete_broadcast_ping(self) -> "FirewallGlobalOptionsBatchBuilder":
        """Delete broadcast-ping setting."""
        path = self.mappers[self.mapper_key].get_broadcast_ping_path()
        return self.add_delete(path)

    # ========================================================================
    # Source Routing Options
    # ========================================================================

    def set_ip_src_route(self, value: str) -> "FirewallGlobalOptionsBatchBuilder":
        """Set ip-src-route (enable/disable)."""
        path = self.mappers[self.mapper_key].get_ip_src_route(value)
        return self.add_set(path)

    def delete_ip_src_route(self) -> "FirewallGlobalOptionsBatchBuilder":
        """Delete ip-src-route setting."""
        path = self.mappers[self.mapper_key].get_ip_src_route_path()
        return self.add_delete(path)

    def set_ipv6_src_route(self, value: str) -> "FirewallGlobalOptionsBatchBuilder":
        """Set ipv6-src-route (enable/disable)."""
        path = self.mappers[self.mapper_key].get_ipv6_src_route(value)
        return self.add_set(path)

    def delete_ipv6_src_route(self) -> "FirewallGlobalOptionsBatchBuilder":
        """Delete ipv6-src-route setting."""
        path = self.mappers[self.mapper_key].get_ipv6_src_route_path()
        return self.add_delete(path)

    # ========================================================================
    # ICMP Redirect Options
    # ========================================================================

    def set_receive_redirects(self, value: str) -> "FirewallGlobalOptionsBatchBuilder":
        """Set receive-redirects (enable/disable)."""
        path = self.mappers[self.mapper_key].get_receive_redirects(value)
        return self.add_set(path)

    def delete_receive_redirects(self) -> "FirewallGlobalOptionsBatchBuilder":
        """Delete receive-redirects setting."""
        path = self.mappers[self.mapper_key].get_receive_redirects_path()
        return self.add_delete(path)

    def set_ipv6_receive_redirects(self, value: str) -> "FirewallGlobalOptionsBatchBuilder":
        """Set ipv6-receive-redirects (enable/disable)."""
        path = self.mappers[self.mapper_key].get_ipv6_receive_redirects(value)
        return self.add_set(path)

    def delete_ipv6_receive_redirects(self) -> "FirewallGlobalOptionsBatchBuilder":
        """Delete ipv6-receive-redirects setting."""
        path = self.mappers[self.mapper_key].get_ipv6_receive_redirects_path()
        return self.add_delete(path)

    def set_send_redirects(self, value: str) -> "FirewallGlobalOptionsBatchBuilder":
        """Set send-redirects (enable/disable)."""
        path = self.mappers[self.mapper_key].get_send_redirects(value)
        return self.add_set(path)

    def delete_send_redirects(self) -> "FirewallGlobalOptionsBatchBuilder":
        """Delete send-redirects setting."""
        path = self.mappers[self.mapper_key].get_send_redirects_path()
        return self.add_delete(path)

    # ========================================================================
    # Security Options
    # ========================================================================

    def set_log_martians(self, value: str) -> "FirewallGlobalOptionsBatchBuilder":
        """Set log-martians (enable/disable)."""
        path = self.mappers[self.mapper_key].get_log_martians(value)
        return self.add_set(path)

    def delete_log_martians(self) -> "FirewallGlobalOptionsBatchBuilder":
        """Delete log-martians setting."""
        path = self.mappers[self.mapper_key].get_log_martians_path()
        return self.add_delete(path)

    def set_source_validation(self, value: str) -> "FirewallGlobalOptionsBatchBuilder":
        """Set source-validation (strict/loose/disable)."""
        path = self.mappers[self.mapper_key].get_source_validation(value)
        return self.add_set(path)

    def delete_source_validation(self) -> "FirewallGlobalOptionsBatchBuilder":
        """Delete source-validation setting."""
        path = self.mappers[self.mapper_key].get_source_validation_path()
        return self.add_delete(path)

    def set_syn_cookies(self, value: str) -> "FirewallGlobalOptionsBatchBuilder":
        """Set syn-cookies (enable/disable)."""
        path = self.mappers[self.mapper_key].get_syn_cookies(value)
        return self.add_set(path)

    def delete_syn_cookies(self) -> "FirewallGlobalOptionsBatchBuilder":
        """Delete syn-cookies setting."""
        path = self.mappers[self.mapper_key].get_syn_cookies_path()
        return self.add_delete(path)

    def set_twa_hazards_protection(self, value: str) -> "FirewallGlobalOptionsBatchBuilder":
        """Set twa-hazards-protection (enable/disable)."""
        path = self.mappers[self.mapper_key].get_twa_hazards_protection(value)
        return self.add_set(path)

    def delete_twa_hazards_protection(self) -> "FirewallGlobalOptionsBatchBuilder":
        """Delete twa-hazards-protection setting."""
        path = self.mappers[self.mapper_key].get_twa_hazards_protection_path()
        return self.add_delete(path)

    # ========================================================================
    # State Policy - Established
    # ========================================================================

    def set_state_policy_established_action(self, action: str) -> "FirewallGlobalOptionsBatchBuilder":
        """Set state-policy established action (accept/drop/reject)."""
        path = self.mappers[self.mapper_key].get_state_policy_established_action(action)
        return self.add_set(path)

    def delete_state_policy_established_action(self) -> "FirewallGlobalOptionsBatchBuilder":
        """Delete state-policy established action."""
        path = self.mappers[self.mapper_key].get_state_policy_established_action_path()
        return self.add_delete(path)

    def set_state_policy_established_log(self) -> "FirewallGlobalOptionsBatchBuilder":
        """Enable state-policy established log."""
        path = self.mappers[self.mapper_key].get_state_policy_established_log()
        return self.add_set(path)

    def delete_state_policy_established_log(self) -> "FirewallGlobalOptionsBatchBuilder":
        """Disable state-policy established log."""
        path = self.mappers[self.mapper_key].get_state_policy_established_log_path()
        return self.add_delete(path)

    def set_state_policy_established_log_level(self, level: str) -> "FirewallGlobalOptionsBatchBuilder":
        """Set state-policy established log-level."""
        path = self.mappers[self.mapper_key].get_state_policy_established_log_level(level)
        return self.add_set(path)

    def delete_state_policy_established_log_level(self) -> "FirewallGlobalOptionsBatchBuilder":
        """Delete state-policy established log-level."""
        path = self.mappers[self.mapper_key].get_state_policy_established_log_level_path()
        return self.add_delete(path)

    # ========================================================================
    # State Policy - Invalid
    # ========================================================================

    def set_state_policy_invalid_action(self, action: str) -> "FirewallGlobalOptionsBatchBuilder":
        """Set state-policy invalid action (accept/drop/reject)."""
        path = self.mappers[self.mapper_key].get_state_policy_invalid_action(action)
        return self.add_set(path)

    def delete_state_policy_invalid_action(self) -> "FirewallGlobalOptionsBatchBuilder":
        """Delete state-policy invalid action."""
        path = self.mappers[self.mapper_key].get_state_policy_invalid_action_path()
        return self.add_delete(path)

    def set_state_policy_invalid_log(self) -> "FirewallGlobalOptionsBatchBuilder":
        """Enable state-policy invalid log."""
        path = self.mappers[self.mapper_key].get_state_policy_invalid_log()
        return self.add_set(path)

    def delete_state_policy_invalid_log(self) -> "FirewallGlobalOptionsBatchBuilder":
        """Disable state-policy invalid log."""
        path = self.mappers[self.mapper_key].get_state_policy_invalid_log_path()
        return self.add_delete(path)

    def set_state_policy_invalid_log_level(self, level: str) -> "FirewallGlobalOptionsBatchBuilder":
        """Set state-policy invalid log-level."""
        path = self.mappers[self.mapper_key].get_state_policy_invalid_log_level(level)
        return self.add_set(path)

    def delete_state_policy_invalid_log_level(self) -> "FirewallGlobalOptionsBatchBuilder":
        """Delete state-policy invalid log-level."""
        path = self.mappers[self.mapper_key].get_state_policy_invalid_log_level_path()
        return self.add_delete(path)

    # ========================================================================
    # State Policy - Related
    # ========================================================================

    def set_state_policy_related_action(self, action: str) -> "FirewallGlobalOptionsBatchBuilder":
        """Set state-policy related action (accept/drop/reject)."""
        path = self.mappers[self.mapper_key].get_state_policy_related_action(action)
        return self.add_set(path)

    def delete_state_policy_related_action(self) -> "FirewallGlobalOptionsBatchBuilder":
        """Delete state-policy related action."""
        path = self.mappers[self.mapper_key].get_state_policy_related_action_path()
        return self.add_delete(path)

    def set_state_policy_related_log(self) -> "FirewallGlobalOptionsBatchBuilder":
        """Enable state-policy related log."""
        path = self.mappers[self.mapper_key].get_state_policy_related_log()
        return self.add_set(path)

    def delete_state_policy_related_log(self) -> "FirewallGlobalOptionsBatchBuilder":
        """Disable state-policy related log."""
        path = self.mappers[self.mapper_key].get_state_policy_related_log_path()
        return self.add_delete(path)

    def set_state_policy_related_log_level(self, level: str) -> "FirewallGlobalOptionsBatchBuilder":
        """Set state-policy related log-level."""
        path = self.mappers[self.mapper_key].get_state_policy_related_log_level(level)
        return self.add_set(path)

    def delete_state_policy_related_log_level(self) -> "FirewallGlobalOptionsBatchBuilder":
        """Delete state-policy related log-level."""
        path = self.mappers[self.mapper_key].get_state_policy_related_log_level_path()
        return self.add_delete(path)

    # ========================================================================
    # Bridged Traffic (VyOS 1.5+)
    # ========================================================================

    def set_apply_to_bridged_traffic_ipv4(self) -> "FirewallGlobalOptionsBatchBuilder":
        """Enable apply-to-bridged-traffic ipv4 (VyOS 1.5+)."""
        if self._is_v15_or_later():
            path = self.mappers[self.mapper_key].get_apply_to_bridged_traffic_ipv4()
            return self.add_set(path)
        return self

    def delete_apply_to_bridged_traffic_ipv4(self) -> "FirewallGlobalOptionsBatchBuilder":
        """Disable apply-to-bridged-traffic ipv4 (VyOS 1.5+)."""
        if self._is_v15_or_later():
            path = self.mappers[self.mapper_key].get_apply_to_bridged_traffic_ipv4_path()
            return self.add_delete(path)
        return self

    def set_apply_to_bridged_traffic_ipv6(self) -> "FirewallGlobalOptionsBatchBuilder":
        """Enable apply-to-bridged-traffic ipv6 (VyOS 1.5+)."""
        if self._is_v15_or_later():
            path = self.mappers[self.mapper_key].get_apply_to_bridged_traffic_ipv6()
            return self.add_set(path)
        return self

    def delete_apply_to_bridged_traffic_ipv6(self) -> "FirewallGlobalOptionsBatchBuilder":
        """Disable apply-to-bridged-traffic ipv6 (VyOS 1.5+)."""
        if self._is_v15_or_later():
            path = self.mappers[self.mapper_key].get_apply_to_bridged_traffic_ipv6_path()
            return self.add_delete(path)
        return self

    # ========================================================================
    # Timeout Settings (VyOS 1.5+)
    # ========================================================================

    def set_timeout_icmp(self, seconds: int) -> "FirewallGlobalOptionsBatchBuilder":
        """Set timeout icmp (VyOS 1.5+)."""
        if self._is_v15_or_later():
            path = self.mappers[self.mapper_key].get_timeout_icmp(seconds)
            return self.add_set(path)
        return self

    def delete_timeout_icmp(self) -> "FirewallGlobalOptionsBatchBuilder":
        """Delete timeout icmp (VyOS 1.5+)."""
        if self._is_v15_or_later():
            path = self.mappers[self.mapper_key].get_timeout_icmp_path()
            return self.add_delete(path)
        return self

    def set_timeout_other(self, seconds: int) -> "FirewallGlobalOptionsBatchBuilder":
        """Set timeout other (VyOS 1.5+)."""
        if self._is_v15_or_later():
            path = self.mappers[self.mapper_key].get_timeout_other(seconds)
            return self.add_set(path)
        return self

    def delete_timeout_other(self) -> "FirewallGlobalOptionsBatchBuilder":
        """Delete timeout other (VyOS 1.5+)."""
        if self._is_v15_or_later():
            path = self.mappers[self.mapper_key].get_timeout_other_path()
            return self.add_delete(path)
        return self

    # TCP Timeouts

    def set_timeout_tcp_close(self, seconds: int) -> "FirewallGlobalOptionsBatchBuilder":
        """Set timeout tcp close (VyOS 1.5+)."""
        if self._is_v15_or_later():
            path = self.mappers[self.mapper_key].get_timeout_tcp_close(seconds)
            return self.add_set(path)
        return self

    def delete_timeout_tcp_close(self) -> "FirewallGlobalOptionsBatchBuilder":
        """Delete timeout tcp close (VyOS 1.5+)."""
        if self._is_v15_or_later():
            path = self.mappers[self.mapper_key].get_timeout_tcp_close_path()
            return self.add_delete(path)
        return self

    def set_timeout_tcp_close_wait(self, seconds: int) -> "FirewallGlobalOptionsBatchBuilder":
        """Set timeout tcp close-wait (VyOS 1.5+)."""
        if self._is_v15_or_later():
            path = self.mappers[self.mapper_key].get_timeout_tcp_close_wait(seconds)
            return self.add_set(path)
        return self

    def delete_timeout_tcp_close_wait(self) -> "FirewallGlobalOptionsBatchBuilder":
        """Delete timeout tcp close-wait (VyOS 1.5+)."""
        if self._is_v15_or_later():
            path = self.mappers[self.mapper_key].get_timeout_tcp_close_wait_path()
            return self.add_delete(path)
        return self

    def set_timeout_tcp_established(self, seconds: int) -> "FirewallGlobalOptionsBatchBuilder":
        """Set timeout tcp established (VyOS 1.5+)."""
        if self._is_v15_or_later():
            path = self.mappers[self.mapper_key].get_timeout_tcp_established(seconds)
            return self.add_set(path)
        return self

    def delete_timeout_tcp_established(self) -> "FirewallGlobalOptionsBatchBuilder":
        """Delete timeout tcp established (VyOS 1.5+)."""
        if self._is_v15_or_later():
            path = self.mappers[self.mapper_key].get_timeout_tcp_established_path()
            return self.add_delete(path)
        return self

    def set_timeout_tcp_fin_wait(self, seconds: int) -> "FirewallGlobalOptionsBatchBuilder":
        """Set timeout tcp fin-wait (VyOS 1.5+)."""
        if self._is_v15_or_later():
            path = self.mappers[self.mapper_key].get_timeout_tcp_fin_wait(seconds)
            return self.add_set(path)
        return self

    def delete_timeout_tcp_fin_wait(self) -> "FirewallGlobalOptionsBatchBuilder":
        """Delete timeout tcp fin-wait (VyOS 1.5+)."""
        if self._is_v15_or_later():
            path = self.mappers[self.mapper_key].get_timeout_tcp_fin_wait_path()
            return self.add_delete(path)
        return self

    def set_timeout_tcp_last_ack(self, seconds: int) -> "FirewallGlobalOptionsBatchBuilder":
        """Set timeout tcp last-ack (VyOS 1.5+)."""
        if self._is_v15_or_later():
            path = self.mappers[self.mapper_key].get_timeout_tcp_last_ack(seconds)
            return self.add_set(path)
        return self

    def delete_timeout_tcp_last_ack(self) -> "FirewallGlobalOptionsBatchBuilder":
        """Delete timeout tcp last-ack (VyOS 1.5+)."""
        if self._is_v15_or_later():
            path = self.mappers[self.mapper_key].get_timeout_tcp_last_ack_path()
            return self.add_delete(path)
        return self

    def set_timeout_tcp_syn_recv(self, seconds: int) -> "FirewallGlobalOptionsBatchBuilder":
        """Set timeout tcp syn-recv (VyOS 1.5+)."""
        if self._is_v15_or_later():
            path = self.mappers[self.mapper_key].get_timeout_tcp_syn_recv(seconds)
            return self.add_set(path)
        return self

    def delete_timeout_tcp_syn_recv(self) -> "FirewallGlobalOptionsBatchBuilder":
        """Delete timeout tcp syn-recv (VyOS 1.5+)."""
        if self._is_v15_or_later():
            path = self.mappers[self.mapper_key].get_timeout_tcp_syn_recv_path()
            return self.add_delete(path)
        return self

    def set_timeout_tcp_syn_sent(self, seconds: int) -> "FirewallGlobalOptionsBatchBuilder":
        """Set timeout tcp syn-sent (VyOS 1.5+)."""
        if self._is_v15_or_later():
            path = self.mappers[self.mapper_key].get_timeout_tcp_syn_sent(seconds)
            return self.add_set(path)
        return self

    def delete_timeout_tcp_syn_sent(self) -> "FirewallGlobalOptionsBatchBuilder":
        """Delete timeout tcp syn-sent (VyOS 1.5+)."""
        if self._is_v15_or_later():
            path = self.mappers[self.mapper_key].get_timeout_tcp_syn_sent_path()
            return self.add_delete(path)
        return self

    def set_timeout_tcp_time_wait(self, seconds: int) -> "FirewallGlobalOptionsBatchBuilder":
        """Set timeout tcp time-wait (VyOS 1.5+)."""
        if self._is_v15_or_later():
            path = self.mappers[self.mapper_key].get_timeout_tcp_time_wait(seconds)
            return self.add_set(path)
        return self

    def delete_timeout_tcp_time_wait(self) -> "FirewallGlobalOptionsBatchBuilder":
        """Delete timeout tcp time-wait (VyOS 1.5+)."""
        if self._is_v15_or_later():
            path = self.mappers[self.mapper_key].get_timeout_tcp_time_wait_path()
            return self.add_delete(path)
        return self

    # UDP Timeouts

    def set_timeout_udp_other(self, seconds: int) -> "FirewallGlobalOptionsBatchBuilder":
        """Set timeout udp other (VyOS 1.5+)."""
        if self._is_v15_or_later():
            path = self.mappers[self.mapper_key].get_timeout_udp_other(seconds)
            return self.add_set(path)
        return self

    def delete_timeout_udp_other(self) -> "FirewallGlobalOptionsBatchBuilder":
        """Delete timeout udp other (VyOS 1.5+)."""
        if self._is_v15_or_later():
            path = self.mappers[self.mapper_key].get_timeout_udp_other_path()
            return self.add_delete(path)
        return self

    def set_timeout_udp_stream(self, seconds: int) -> "FirewallGlobalOptionsBatchBuilder":
        """Set timeout udp stream (VyOS 1.5+)."""
        if self._is_v15_or_later():
            path = self.mappers[self.mapper_key].get_timeout_udp_stream(seconds)
            return self.add_set(path)
        return self

    def delete_timeout_udp_stream(self) -> "FirewallGlobalOptionsBatchBuilder":
        """Delete timeout udp stream (VyOS 1.5+)."""
        if self._is_v15_or_later():
            path = self.mappers[self.mapper_key].get_timeout_udp_stream_path()
            return self.add_delete(path)
        return self

    # ========================================================================
    # Capabilities
    # ========================================================================

    def get_capabilities(self) -> Dict[str, Any]:
        """Get capabilities for the current VyOS version."""
        is_v15 = self._is_v15_or_later()

        return {
            "version": self.version,
            "features": {
                "basic_options": {
                    "supported": True,
                    "description": "Basic firewall options (all-ping, broadcast-ping, etc.)",
                },
                "source_routing": {
                    "supported": True,
                    "description": "IPv4/IPv6 source routing control",
                },
                "icmp_redirects": {
                    "supported": True,
                    "description": "ICMP redirect message control",
                },
                "security_options": {
                    "supported": True,
                    "description": "Security options (log-martians, syn-cookies, etc.)",
                },
                "state_policy": {
                    "supported": True,
                    "description": "Connection state policies (established, invalid, related)",
                },
                "bridged_traffic": {
                    "supported": is_v15,
                    "description": "Apply firewall to bridged traffic (VyOS 1.5+)",
                },
                "timeouts": {
                    "supported": is_v15,
                    "description": "Connection tracking timeout settings (VyOS 1.5+)",
                },
            },
            "version_notes": {
                "has_bridged_traffic": is_v15,
                "has_timeouts": is_v15,
            },
        }

    # ========================================================================
    # Helper Methods
    # ========================================================================

    def _is_v15_or_later(self) -> bool:
        """Check if version is 1.5 or later."""
        return "1.5" in self.version or "latest" in self.version.lower()
