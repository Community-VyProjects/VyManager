"""VyOS 1.5 specific firewall global-options commands.

VyOS 1.5 adds:
- apply-to-bridged-traffic (ipv4/ipv6)
- timeout settings for various protocols
"""
from typing import List


class FirewallGlobalOptionsMapperV1_5:
    """Version-specific mapper for VyOS 1.5 firewall global-options.

    Adds features not available in VyOS 1.4.
    """

    # ==================== Bridged Traffic (VyOS 1.5+) ====================

    def get_apply_to_bridged_traffic_ipv4(self) -> List[str]:
        """Get command path for apply-to-bridged-traffic ipv4."""
        return ["firewall", "global-options", "apply-to-bridged-traffic", "ipv4"]

    def get_apply_to_bridged_traffic_ipv4_path(self) -> List[str]:
        """Get command path for apply-to-bridged-traffic ipv4 (for deletion)."""
        return ["firewall", "global-options", "apply-to-bridged-traffic", "ipv4"]

    def get_apply_to_bridged_traffic_ipv6(self) -> List[str]:
        """Get command path for apply-to-bridged-traffic ipv6."""
        return ["firewall", "global-options", "apply-to-bridged-traffic", "ipv6"]

    def get_apply_to_bridged_traffic_ipv6_path(self) -> List[str]:
        """Get command path for apply-to-bridged-traffic ipv6 (for deletion)."""
        return ["firewall", "global-options", "apply-to-bridged-traffic", "ipv6"]

    # ==================== Timeout Settings (VyOS 1.5+) ====================

    def get_timeout_icmp(self, seconds: int) -> List[str]:
        """Get command path for timeout icmp."""
        return ["firewall", "global-options", "timeout", "icmp", str(seconds)]

    def get_timeout_icmp_path(self) -> List[str]:
        """Get command path for timeout icmp (for deletion)."""
        return ["firewall", "global-options", "timeout", "icmp"]

    def get_timeout_other(self, seconds: int) -> List[str]:
        """Get command path for timeout other."""
        return ["firewall", "global-options", "timeout", "other", str(seconds)]

    def get_timeout_other_path(self) -> List[str]:
        """Get command path for timeout other (for deletion)."""
        return ["firewall", "global-options", "timeout", "other"]

    # TCP Timeouts

    def get_timeout_tcp_close(self, seconds: int) -> List[str]:
        """Get command path for timeout tcp close."""
        return ["firewall", "global-options", "timeout", "tcp", "close", str(seconds)]

    def get_timeout_tcp_close_path(self) -> List[str]:
        """Get command path for timeout tcp close (for deletion)."""
        return ["firewall", "global-options", "timeout", "tcp", "close"]

    def get_timeout_tcp_close_wait(self, seconds: int) -> List[str]:
        """Get command path for timeout tcp close-wait."""
        return ["firewall", "global-options", "timeout", "tcp", "close-wait", str(seconds)]

    def get_timeout_tcp_close_wait_path(self) -> List[str]:
        """Get command path for timeout tcp close-wait (for deletion)."""
        return ["firewall", "global-options", "timeout", "tcp", "close-wait"]

    def get_timeout_tcp_established(self, seconds: int) -> List[str]:
        """Get command path for timeout tcp established."""
        return ["firewall", "global-options", "timeout", "tcp", "established", str(seconds)]

    def get_timeout_tcp_established_path(self) -> List[str]:
        """Get command path for timeout tcp established (for deletion)."""
        return ["firewall", "global-options", "timeout", "tcp", "established"]

    def get_timeout_tcp_fin_wait(self, seconds: int) -> List[str]:
        """Get command path for timeout tcp fin-wait."""
        return ["firewall", "global-options", "timeout", "tcp", "fin-wait", str(seconds)]

    def get_timeout_tcp_fin_wait_path(self) -> List[str]:
        """Get command path for timeout tcp fin-wait (for deletion)."""
        return ["firewall", "global-options", "timeout", "tcp", "fin-wait"]

    def get_timeout_tcp_last_ack(self, seconds: int) -> List[str]:
        """Get command path for timeout tcp last-ack."""
        return ["firewall", "global-options", "timeout", "tcp", "last-ack", str(seconds)]

    def get_timeout_tcp_last_ack_path(self) -> List[str]:
        """Get command path for timeout tcp last-ack (for deletion)."""
        return ["firewall", "global-options", "timeout", "tcp", "last-ack"]

    def get_timeout_tcp_syn_recv(self, seconds: int) -> List[str]:
        """Get command path for timeout tcp syn-recv."""
        return ["firewall", "global-options", "timeout", "tcp", "syn-recv", str(seconds)]

    def get_timeout_tcp_syn_recv_path(self) -> List[str]:
        """Get command path for timeout tcp syn-recv (for deletion)."""
        return ["firewall", "global-options", "timeout", "tcp", "syn-recv"]

    def get_timeout_tcp_syn_sent(self, seconds: int) -> List[str]:
        """Get command path for timeout tcp syn-sent."""
        return ["firewall", "global-options", "timeout", "tcp", "syn-sent", str(seconds)]

    def get_timeout_tcp_syn_sent_path(self) -> List[str]:
        """Get command path for timeout tcp syn-sent (for deletion)."""
        return ["firewall", "global-options", "timeout", "tcp", "syn-sent"]

    def get_timeout_tcp_time_wait(self, seconds: int) -> List[str]:
        """Get command path for timeout tcp time-wait."""
        return ["firewall", "global-options", "timeout", "tcp", "time-wait", str(seconds)]

    def get_timeout_tcp_time_wait_path(self) -> List[str]:
        """Get command path for timeout tcp time-wait (for deletion)."""
        return ["firewall", "global-options", "timeout", "tcp", "time-wait"]

    # UDP Timeouts

    def get_timeout_udp_other(self, seconds: int) -> List[str]:
        """Get command path for timeout udp other."""
        return ["firewall", "global-options", "timeout", "udp", "other", str(seconds)]

    def get_timeout_udp_other_path(self) -> List[str]:
        """Get command path for timeout udp other (for deletion)."""
        return ["firewall", "global-options", "timeout", "udp", "other"]

    def get_timeout_udp_stream(self, seconds: int) -> List[str]:
        """Get command path for timeout udp stream."""
        return ["firewall", "global-options", "timeout", "udp", "stream", str(seconds)]

    def get_timeout_udp_stream_path(self) -> List[str]:
        """Get command path for timeout udp stream (for deletion)."""
        return ["firewall", "global-options", "timeout", "udp", "stream"]
