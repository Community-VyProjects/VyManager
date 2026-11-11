"""VyOS 1.5 IPSec mapper.

Path methods for leaves that do not exist on 1.4 live here. The 1.4 class
does not gain them.
"""

from typing import FrozenSet, List

from ..ipsec import IPSecMapper


class IPSecMapperV1_5(IPSecMapper):
    """VyOS 1.5 IPSec mapper."""

    def versioned_nodes(self) -> FrozenSet[str]:
        return frozenset({
            "ppk",
            "retransmission",
            "childless",
            "pool_range",
            "connection_bind",
            "always_send_cert",
            "s2s_ppk",
            "s2s_unique",
        })

    def connection_types(self) -> List[str]:
        return ["initiate", "trap", "none"]

    def get_auth_ppk_path(self, name: str) -> List[str]:
        self._require_node("ppk")
        return ["vpn", "ipsec", "authentication", "ppk", name]

    def get_auth_ppk_id_path(self, name: str, identity: str) -> List[str]:
        self._require_node("ppk")
        return ["vpn", "ipsec", "authentication", "ppk", name, "id", identity]

    def get_auth_ppk_secret_path(self, name: str, secret: str) -> List[str]:
        self._require_node("ppk")
        return ["vpn", "ipsec", "authentication", "ppk", name, "secret", secret]

    def get_auth_ppk_secret_type_path(self, name: str, secret_type: str) -> List[str]:
        self._require_node("ppk")
        return ["vpn", "ipsec", "authentication", "ppk", name, "secret-type", secret_type]

    def get_options_retransmission_attempts_path(self, attempts: str) -> List[str]:
        self._require_node("retransmission")
        return ["vpn", "ipsec", "options", "retransmission", "attempts", attempts]

    def get_options_retransmission_base_path(self, base: str) -> List[str]:
        self._require_node("retransmission")
        return ["vpn", "ipsec", "options", "retransmission", "base", base]

    def get_options_retransmission_timeout_path(self, timeout: str) -> List[str]:
        self._require_node("retransmission")
        return ["vpn", "ipsec", "options", "retransmission", "timeout", timeout]

    def get_s2s_peer_childless_path(self, peer: str, value: str) -> List[str]:
        self._require_node("childless")
        return ["vpn", "ipsec", "site-to-site", "peer", peer, "childless", value]

    def get_s2s_peer_unique_path(self, peer: str, value: str) -> List[str]:
        self._require_node("s2s_unique")
        return ["vpn", "ipsec", "site-to-site", "peer", peer, "unique", value]

    def get_s2s_peer_auth_ppk_id_path(self, peer: str, ppk_id: str) -> List[str]:
        self._require_node("s2s_ppk")
        return ["vpn", "ipsec", "site-to-site", "peer", peer, "authentication", "ppk", "id", ppk_id]

    def get_s2s_peer_auth_ppk_required_path(self, peer: str) -> List[str]:
        self._require_node("s2s_ppk")
        return ["vpn", "ipsec", "site-to-site", "peer", peer, "authentication", "ppk", "required"]

    def get_ra_connection_bind_path(self, conn: str, interface: str) -> List[str]:
        self._require_node("connection_bind")
        return ["vpn", "ipsec", "remote-access", "connection", conn, "bind", interface]

    def get_ra_connection_childless_path(self, conn: str) -> List[str]:
        self._require_node("childless")
        return ["vpn", "ipsec", "remote-access", "connection", conn, "childless"]

    def get_ra_connection_auth_always_send_cert_path(self, conn: str) -> List[str]:
        self._require_node("always_send_cert")
        return ["vpn", "ipsec", "remote-access", "connection", conn, "authentication", "always-send-cert"]

    def get_ra_connection_auth_ppk_id_path(self, conn: str, ppk_id: str) -> List[str]:
        self._require_node("ppk")
        return ["vpn", "ipsec", "remote-access", "connection", conn, "authentication", "ppk", "id", ppk_id]

    def get_ra_connection_auth_ppk_required_path(self, conn: str) -> List[str]:
        self._require_node("ppk")
        return ["vpn", "ipsec", "remote-access", "connection", conn, "authentication", "ppk", "required"]

    def get_ra_pool_range_start_path(self, pool: str, start: str) -> List[str]:
        self._require_node("pool_range")
        return ["vpn", "ipsec", "remote-access", "pool", pool, "range", "start", start]

    def get_ra_pool_range_stop_path(self, pool: str, stop: str) -> List[str]:
        self._require_node("pool_range")
        return ["vpn", "ipsec", "remote-access", "pool", pool, "range", "stop", stop]
