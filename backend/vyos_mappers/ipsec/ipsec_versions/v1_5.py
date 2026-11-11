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
            "s2s_unique",
            "ppk",
            "ra_bind",
            "ra_childless",
            "proposal_esn",
        })

    def connection_types(self) -> List[str]:
        return ["initiate", "trap", "none"]

    def secret_types(self) -> List[str]:
        return ["base64", "hex", "plaintext"]

    def childless_values(self) -> List[str]:
        return ["allow", "prefer", "force", "never"]

    def ike_dh_group_values(self) -> List[str]:
        return ["1", "2", "5", *[str(n) for n in range(14, 36)]]

    def esp_pfs_values(self) -> List[str]:
        return [
            "enable", "dh-group1", "dh-group2", "dh-group5",
            *[f"dh-group{n}" for n in range(14, 36)],
            "disable",
        ]

    def esn_values(self) -> List[str]:
        return ["optional", "required", "disabled"]

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

    def get_ra_connection_auth_always_send_cert_path(self, conn: str) -> List[str]:
        return ["vpn", "ipsec", "remote-access", "connection", conn, "authentication", "always-send-cert"]

    def get_ra_pool_range_start_path(self, pool: str, start: str) -> List[str]:
        return ["vpn", "ipsec", "remote-access", "pool", pool, "range", "start", start]

    def get_ra_pool_range_stop_path(self, pool: str, stop: str) -> List[str]:
        return ["vpn", "ipsec", "remote-access", "pool", pool, "range", "stop", stop]

    def get_auth_ppk_path(self, name: str) -> List[str]:
        return ["vpn", "ipsec", "authentication", "ppk", name]

    def get_auth_ppk_id_path(self, name: str, identity: str) -> List[str]:
        return ["vpn", "ipsec", "authentication", "ppk", name, "id", identity]

    def get_auth_ppk_secret_path(self, name: str, secret: str) -> List[str]:
        return ["vpn", "ipsec", "authentication", "ppk", name, "secret", secret]

    def get_auth_ppk_secret_type_path(self, name: str, secret_type: str) -> List[str]:
        return ["vpn", "ipsec", "authentication", "ppk", name, "secret-type", secret_type]

    def get_s2s_peer_auth_ppk_id_path(self, peer: str, value: str) -> List[str]:
        return ["vpn", "ipsec", "site-to-site", "peer", peer, "authentication", "ppk", "id", value]

    def get_s2s_peer_auth_ppk_required_path(self, peer: str) -> List[str]:
        return ["vpn", "ipsec", "site-to-site", "peer", peer, "authentication", "ppk", "required"]

    def get_ra_connection_auth_ppk_id_path(self, conn: str, value: str) -> List[str]:
        return ["vpn", "ipsec", "remote-access", "connection", conn, "authentication", "ppk", "id", value]

    def get_ra_connection_auth_ppk_required_path(self, conn: str) -> List[str]:
        return ["vpn", "ipsec", "remote-access", "connection", conn, "authentication", "ppk", "required"]

    def get_ra_connection_bind_path(self, conn: str, value: str) -> List[str]:
        return ["vpn", "ipsec", "remote-access", "connection", conn, "bind", value]

    def get_ra_connection_childless_path(self, conn: str, value: str) -> List[str]:
        return ["vpn", "ipsec", "remote-access", "connection", conn, "childless", value]

    def get_esp_group_proposal_esn_path(self, name: str, proposal: str, value: str) -> List[str]:
        return ["vpn", "ipsec", "esp-group", name, "proposal", proposal, "esn", value]

    def get_ike_group_proposal_esn_path(self, name: str, proposal: str, value: str) -> List[str]:
        return ["vpn", "ipsec", "ike-group", name, "proposal", proposal, "esn", value]
