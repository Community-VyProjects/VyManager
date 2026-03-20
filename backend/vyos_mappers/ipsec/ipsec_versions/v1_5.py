"""
IPSec Mapper for VyOS 1.5

VyOS 1.5 adds support for:
- authentication/ppk (Post-quantum Pre-shared Keys)
- options/retransmission (attempts, base, timeout)
- remote-access/connection/*/authentication/always-send-cert
- remote-access/connection/*/authentication/ppk (id, required)
- remote-access/connection/*/bind
- remote-access/connection/*/childless
- remote-access/pool/*/range (start, stop)
- site-to-site/peer/*/authentication/ppk (id, required)
- site-to-site/peer/*/childless
"""

from typing import List


class IPSecMapperV1_5:
    """VyOS 1.5 specific IPSec paths."""

    # ========================================================================
    # Authentication - PPK (Post-quantum Pre-shared Keys) - 1.5 only
    # ========================================================================

    def get_auth_ppk_path(self, name: str) -> List[str]:
        return ["vpn", "ipsec", "authentication", "ppk", name]

    def get_auth_ppk_id_path(self, name: str, identity: str) -> List[str]:
        return ["vpn", "ipsec", "authentication", "ppk", name, "id", identity]

    def get_auth_ppk_secret_path(self, name: str, secret: str) -> List[str]:
        return ["vpn", "ipsec", "authentication", "ppk", name, "secret", secret]

    def get_auth_ppk_secret_type_path(self, name: str, secret_type: str) -> List[str]:
        return ["vpn", "ipsec", "authentication", "ppk", name, "secret-type", secret_type]

    # ========================================================================
    # Options - Retransmission - 1.5 only
    # ========================================================================

    def get_options_retransmission_attempts_path(self, attempts: str) -> List[str]:
        return ["vpn", "ipsec", "options", "retransmission", "attempts", attempts]

    def get_options_retransmission_base_path(self, base: str) -> List[str]:
        return ["vpn", "ipsec", "options", "retransmission", "base", base]

    def get_options_retransmission_timeout_path(self, timeout: str) -> List[str]:
        return ["vpn", "ipsec", "options", "retransmission", "timeout", timeout]

    # ========================================================================
    # Site-to-Site Peer - 1.5 only features
    # ========================================================================

    def get_s2s_peer_childless_path(self, peer: str) -> List[str]:
        return ["vpn", "ipsec", "site-to-site", "peer", peer, "childless"]

    def get_s2s_peer_auth_ppk_id_path(self, peer: str, ppk_id: str) -> List[str]:
        return ["vpn", "ipsec", "site-to-site", "peer", peer, "authentication", "ppk", "id", ppk_id]

    def get_s2s_peer_auth_ppk_required_path(self, peer: str) -> List[str]:
        return ["vpn", "ipsec", "site-to-site", "peer", peer, "authentication", "ppk", "required"]

    # ========================================================================
    # Remote Access Connection - 1.5 only features
    # ========================================================================

    def get_ra_connection_bind_path(self, conn: str, interface: str) -> List[str]:
        return ["vpn", "ipsec", "remote-access", "connection", conn, "bind", interface]

    def get_ra_connection_childless_path(self, conn: str) -> List[str]:
        return ["vpn", "ipsec", "remote-access", "connection", conn, "childless"]

    def get_ra_connection_auth_always_send_cert_path(self, conn: str) -> List[str]:
        return ["vpn", "ipsec", "remote-access", "connection", conn, "authentication", "always-send-cert"]

    def get_ra_connection_auth_ppk_id_path(self, conn: str, ppk_id: str) -> List[str]:
        return ["vpn", "ipsec", "remote-access", "connection", conn, "authentication", "ppk", "id", ppk_id]

    def get_ra_connection_auth_ppk_required_path(self, conn: str) -> List[str]:
        return ["vpn", "ipsec", "remote-access", "connection", conn, "authentication", "ppk", "required"]

    # ========================================================================
    # Remote Access Pool - Range - 1.5 only
    # ========================================================================

    def get_ra_pool_range_start_path(self, pool: str, start: str) -> List[str]:
        return ["vpn", "ipsec", "remote-access", "pool", pool, "range", "start", start]

    def get_ra_pool_range_stop_path(self, pool: str, stop: str) -> List[str]:
        return ["vpn", "ipsec", "remote-access", "pool", pool, "range", "stop", stop]
