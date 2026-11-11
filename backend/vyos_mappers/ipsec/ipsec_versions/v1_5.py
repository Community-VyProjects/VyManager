"""VyOS 1.5 IPSec mapper.

Path methods for leaves that do not exist on 1.4 live here. The builder
checks the allowlist before calling them.
"""

from typing import FrozenSet, List

from ..ipsec import IPSecMapper


class IPSecMapperV1_5(IPSecMapper):
    """VyOS 1.5 IPSec mapper."""

    def versioned_nodes(self) -> FrozenSet[str]:
        return frozenset({
            "retransmission",
            "childless",
            "pool_range",
            "always_send_cert",
            "s2s_ppk",
            "s2s_unique",
        })

    def connection_types(self) -> List[str]:
        return ["initiate", "trap", "none"]

    def get_options_retransmission_attempts_path(self, attempts: str) -> List[str]:
        return ["vpn", "ipsec", "options", "retransmission", "attempts", attempts]

    def get_options_retransmission_base_path(self, base: str) -> List[str]:
        return ["vpn", "ipsec", "options", "retransmission", "base", base]

    def get_options_retransmission_timeout_path(self, timeout: str) -> List[str]:
        return ["vpn", "ipsec", "options", "retransmission", "timeout", timeout]

    def get_s2s_peer_childless_path(self, peer: str, value: str) -> List[str]:
        return ["vpn", "ipsec", "site-to-site", "peer", peer, "childless", value]

    def get_s2s_peer_unique_path(self, peer: str, value: str) -> List[str]:
        return ["vpn", "ipsec", "site-to-site", "peer", peer, "unique", value]

    def get_s2s_peer_auth_ppk_id_path(self, peer: str, ppk_id: str) -> List[str]:
        return ["vpn", "ipsec", "site-to-site", "peer", peer, "authentication", "ppk", "id", ppk_id]

    def get_s2s_peer_auth_ppk_required_path(self, peer: str) -> List[str]:
        return ["vpn", "ipsec", "site-to-site", "peer", peer, "authentication", "ppk", "required"]

    def get_ra_connection_auth_always_send_cert_path(self, conn: str) -> List[str]:
        return ["vpn", "ipsec", "remote-access", "connection", conn, "authentication", "always-send-cert"]

    def get_ra_pool_range_start_path(self, pool: str, start: str) -> List[str]:
        return ["vpn", "ipsec", "remote-access", "pool", pool, "range", "start", start]

    def get_ra_pool_range_stop_path(self, pool: str, stop: str) -> List[str]:
        return ["vpn", "ipsec", "remote-access", "pool", pool, "range", "stop", stop]
