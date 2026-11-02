"""VyOS 1.4 firewall global-options guards.

``apply-to-bridged-traffic`` and ``timeout`` exist only from VyOS 1.5.
Raising here maps to HTTP 400 instead of the builder dropping the op and
letting the rest of a mixed batch commit.
"""

_UNSUPPORTED = (
    "Firewall global-options timeout and bridged-traffic are not supported on VyOS 1.4"
)


def _reject(self, *_args, **_kwargs):
    raise ValueError(_UNSUPPORTED)


class FirewallGlobalOptionsMapperV1_4:
    """Reject 1.5-only global-options nodes on VyOS 1.4."""

    get_apply_to_bridged_traffic_ipv4 = _reject
    get_apply_to_bridged_traffic_ipv4_path = _reject
    get_apply_to_bridged_traffic_ipv6 = _reject
    get_apply_to_bridged_traffic_ipv6_path = _reject
    get_timeout_icmp = _reject
    get_timeout_icmp_path = _reject
    get_timeout_other = _reject
    get_timeout_other_path = _reject
    get_timeout_tcp_close = _reject
    get_timeout_tcp_close_path = _reject
    get_timeout_tcp_close_wait = _reject
    get_timeout_tcp_close_wait_path = _reject
    get_timeout_tcp_established = _reject
    get_timeout_tcp_established_path = _reject
    get_timeout_tcp_fin_wait = _reject
    get_timeout_tcp_fin_wait_path = _reject
    get_timeout_tcp_last_ack = _reject
    get_timeout_tcp_last_ack_path = _reject
    get_timeout_tcp_syn_recv = _reject
    get_timeout_tcp_syn_recv_path = _reject
    get_timeout_tcp_syn_sent = _reject
    get_timeout_tcp_syn_sent_path = _reject
    get_timeout_tcp_time_wait = _reject
    get_timeout_tcp_time_wait_path = _reject
    get_timeout_udp_other = _reject
    get_timeout_udp_other_path = _reject
    get_timeout_udp_stream = _reject
    get_timeout_udp_stream_path = _reject
