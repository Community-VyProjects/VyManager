"""
IPsec VPN Command Mapper

Handles IPsec VPN commands for site-to-site tunnels.
"""

from typing import List, Dict, Any, Optional
from ..base import BaseFeatureMapper


class IPsecMapper(BaseFeatureMapper):
    """IPsec VPN mapper with all IPsec operations"""

    def __init__(self, version: str):
        """Initialize with VyOS version."""
        super().__init__(version)

    # ========================================================================
    # IKE Group Commands
    # ========================================================================

    def get_ike_group(self, name: str) -> List[str]:
        """Get command path for creating an IKE group."""
        return ["vpn", "ipsec", "ike-group", name]

    def get_ike_group_proposal(self, name: str, proposal: str) -> List[str]:
        """Get command path for IKE group proposal."""
        return ["vpn", "ipsec", "ike-group", name, "proposal", proposal]

    def get_ike_group_proposal_dh_group(self, name: str, proposal: str, dh_group: str) -> List[str]:
        """Get command path for IKE proposal DH group."""
        return ["vpn", "ipsec", "ike-group", name, "proposal", proposal, "dh-group", dh_group]

    def get_ike_group_proposal_encryption(self, name: str, proposal: str, encryption: str) -> List[str]:
        """Get command path for IKE proposal encryption algorithm."""
        return ["vpn", "ipsec", "ike-group", name, "proposal", proposal, "encryption", encryption]

    def get_ike_group_proposal_hash(self, name: str, proposal: str, hash_algo: str) -> List[str]:
        """Get command path for IKE proposal hash algorithm."""
        return ["vpn", "ipsec", "ike-group", name, "proposal", proposal, "hash", hash_algo]

    def get_ike_group_key_exchange(self, name: str, version: str) -> List[str]:
        """Get command path for IKE key exchange version (ikev1, ikev2)."""
        return ["vpn", "ipsec", "ike-group", name, "key-exchange", version]

    def get_ike_group_lifetime(self, name: str, lifetime: str) -> List[str]:
        """Get command path for IKE group lifetime (seconds)."""
        return ["vpn", "ipsec", "ike-group", name, "lifetime", lifetime]

    def get_ike_group_dpd_action(self, name: str, action: str) -> List[str]:
        """Get command path for DPD action (clear, hold, restart)."""
        return ["vpn", "ipsec", "ike-group", name, "dead-peer-detection", "action", action]

    def get_ike_group_dpd_interval(self, name: str, interval: str) -> List[str]:
        """Get command path for DPD interval."""
        return ["vpn", "ipsec", "ike-group", name, "dead-peer-detection", "interval", interval]

    def get_ike_group_dpd_timeout(self, name: str, timeout: str) -> List[str]:
        """Get command path for DPD timeout."""
        return ["vpn", "ipsec", "ike-group", name, "dead-peer-detection", "timeout", timeout]

    def get_ike_group_close_action(self, name: str, action: str) -> List[str]:
        """Get command path for close action (none, clear, hold, restart)."""
        return ["vpn", "ipsec", "ike-group", name, "close-action", action]

    def get_ike_group_ikev2_reauth(self, name: str) -> List[str]:
        """Get command path for IKEv2 reauth (yes/no)."""
        return ["vpn", "ipsec", "ike-group", name, "ikev2-reauth"]

    def get_ike_group_mode(self, name: str, mode: str) -> List[str]:
        """Get command path for IKE mode (main, aggressive)."""
        return ["vpn", "ipsec", "ike-group", name, "mode", mode]

    # ========================================================================
    # ESP Group Commands
    # ========================================================================

    def get_esp_group(self, name: str) -> List[str]:
        """Get command path for creating an ESP group."""
        return ["vpn", "ipsec", "esp-group", name]

    def get_esp_group_proposal(self, name: str, proposal: str) -> List[str]:
        """Get command path for ESP group proposal."""
        return ["vpn", "ipsec", "esp-group", name, "proposal", proposal]

    def get_esp_group_proposal_encryption(self, name: str, proposal: str, encryption: str) -> List[str]:
        """Get command path for ESP proposal encryption algorithm."""
        return ["vpn", "ipsec", "esp-group", name, "proposal", proposal, "encryption", encryption]

    def get_esp_group_proposal_hash(self, name: str, proposal: str, hash_algo: str) -> List[str]:
        """Get command path for ESP proposal hash algorithm."""
        return ["vpn", "ipsec", "esp-group", name, "proposal", proposal, "hash", hash_algo]

    def get_esp_group_lifetime(self, name: str, lifetime: str) -> List[str]:
        """Get command path for ESP group lifetime (seconds)."""
        return ["vpn", "ipsec", "esp-group", name, "lifetime", lifetime]

    def get_esp_group_pfs(self, name: str, pfs: str) -> List[str]:
        """Get command path for ESP group PFS (dh-group1, dh-group2, etc.)."""
        return ["vpn", "ipsec", "esp-group", name, "pfs", pfs]

    def get_esp_group_mode(self, name: str, mode: str) -> List[str]:
        """Get command path for ESP group mode (tunnel, transport)."""
        return ["vpn", "ipsec", "esp-group", name, "mode", mode]

    def get_esp_group_compression(self, name: str) -> List[str]:
        """Get command path for ESP group compression."""
        return ["vpn", "ipsec", "esp-group", name, "compression"]

    # ========================================================================
    # Site-to-Site Peer Commands
    # ========================================================================

    def get_site_to_site_peer(self, peer: str) -> List[str]:
        """Get command path for creating a site-to-site peer."""
        return ["vpn", "ipsec", "site-to-site", "peer", peer]

    def get_peer_authentication_mode(self, peer: str, mode: str) -> List[str]:
        """Get command path for peer auth mode (pre-shared-secret, x509)."""
        return ["vpn", "ipsec", "site-to-site", "peer", peer, "authentication", "mode", mode]

    def get_peer_authentication_psk(self, peer: str, psk: str) -> List[str]:
        """Get command path for peer pre-shared-key."""
        return ["vpn", "ipsec", "site-to-site", "peer", peer, "authentication", "pre-shared-secret", psk]

    def get_peer_authentication_local_id(self, peer: str, local_id: str) -> List[str]:
        """Get command path for local ID."""
        return ["vpn", "ipsec", "site-to-site", "peer", peer, "authentication", "local-id", local_id]

    def get_peer_authentication_remote_id(self, peer: str, remote_id: str) -> List[str]:
        """Get command path for remote ID."""
        return ["vpn", "ipsec", "site-to-site", "peer", peer, "authentication", "remote-id", remote_id]

    def get_peer_authentication_x509_ca_cert(self, peer: str, cert: str) -> List[str]:
        """Get command path for X.509 CA certificate."""
        return ["vpn", "ipsec", "site-to-site", "peer", peer, "authentication", "x509", "ca-certificate", cert]

    def get_peer_authentication_x509_cert(self, peer: str, cert: str) -> List[str]:
        """Get command path for X.509 certificate."""
        return ["vpn", "ipsec", "site-to-site", "peer", peer, "authentication", "x509", "certificate", cert]

    def get_peer_connection_type(self, peer: str, conn_type: str) -> List[str]:
        """Get command path for connection type (initiate, respond)."""
        return ["vpn", "ipsec", "site-to-site", "peer", peer, "connection-type", conn_type]

    def get_peer_default_esp_group(self, peer: str, esp_group: str) -> List[str]:
        """Get command path for peer default ESP group."""
        return ["vpn", "ipsec", "site-to-site", "peer", peer, "default-esp-group", esp_group]

    def get_peer_ike_group(self, peer: str, ike_group: str) -> List[str]:
        """Get command path for peer IKE group."""
        return ["vpn", "ipsec", "site-to-site", "peer", peer, "ike-group", ike_group]

    def get_peer_local_address(self, peer: str, address: str) -> List[str]:
        """Get command path for peer local address."""
        return ["vpn", "ipsec", "site-to-site", "peer", peer, "local-address", address]

    def get_peer_description(self, peer: str, description: str) -> List[str]:
        """Get command path for peer description."""
        return ["vpn", "ipsec", "site-to-site", "peer", peer, "description", description]

    def get_peer_description_path(self, peer: str) -> List[str]:
        """Get command path for peer description (for deletion)."""
        return ["vpn", "ipsec", "site-to-site", "peer", peer, "description"]

    def get_peer_disable(self, peer: str) -> List[str]:
        """Get command path for disabling a peer."""
        return ["vpn", "ipsec", "site-to-site", "peer", peer, "disable"]

    def get_peer_dhcp_interface(self, peer: str, interface: str) -> List[str]:
        """Get command path for DHCP interface (dynamic local address)."""
        return ["vpn", "ipsec", "site-to-site", "peer", peer, "dhcp-interface", interface]

    def get_peer_vti_bind(self, peer: str, vti: str) -> List[str]:
        """Get command path for VTI binding."""
        return ["vpn", "ipsec", "site-to-site", "peer", peer, "vti", "bind", vti]

    def get_peer_vti_esp_group(self, peer: str, esp_group: str) -> List[str]:
        """Get command path for VTI ESP group."""
        return ["vpn", "ipsec", "site-to-site", "peer", peer, "vti", "esp-group", esp_group]

    # Tunnel configuration
    def get_peer_tunnel(self, peer: str, tunnel_id: str) -> List[str]:
        """Get command path for peer tunnel."""
        return ["vpn", "ipsec", "site-to-site", "peer", peer, "tunnel", tunnel_id]

    def get_peer_tunnel_esp_group(self, peer: str, tunnel_id: str, esp_group: str) -> List[str]:
        """Get command path for tunnel ESP group."""
        return ["vpn", "ipsec", "site-to-site", "peer", peer, "tunnel", tunnel_id, "esp-group", esp_group]

    def get_peer_tunnel_local_prefix(self, peer: str, tunnel_id: str, prefix: str) -> List[str]:
        """Get command path for tunnel local prefix."""
        return ["vpn", "ipsec", "site-to-site", "peer", peer, "tunnel", tunnel_id, "local", "prefix", prefix]

    def get_peer_tunnel_remote_prefix(self, peer: str, tunnel_id: str, prefix: str) -> List[str]:
        """Get command path for tunnel remote prefix."""
        return ["vpn", "ipsec", "site-to-site", "peer", peer, "tunnel", tunnel_id, "remote", "prefix", prefix]

    def get_peer_tunnel_protocol(self, peer: str, tunnel_id: str, protocol: str) -> List[str]:
        """Get command path for tunnel protocol filter (gre, all, etc.)."""
        return ["vpn", "ipsec", "site-to-site", "peer", peer, "tunnel", tunnel_id, "protocol", protocol]

    def get_peer_tunnel_disable(self, peer: str, tunnel_id: str) -> List[str]:
        """Get command path for disabling a tunnel."""
        return ["vpn", "ipsec", "site-to-site", "peer", peer, "tunnel", tunnel_id, "disable"]

    # ========================================================================
    # IPsec Interface Commands
    # ========================================================================

    def get_ipsec_interface(self, interface: str) -> List[str]:
        """Get command path for IPsec interface."""
        return ["vpn", "ipsec", "interface", interface]

    # ========================================================================
    # IPsec Options Commands
    # ========================================================================

    def get_options_disable_route_autoinstall(self) -> List[str]:
        """Get command path for disabling route auto-install."""
        return ["vpn", "ipsec", "options", "disable-route-autoinstall"]

    def get_options_flexvpn(self) -> List[str]:
        """Get command path for enabling FlexVPN."""
        return ["vpn", "ipsec", "options", "flexvpn"]

    def get_options_virtual_ip(self, ip: str) -> List[str]:
        """Get command path for virtual IP."""
        return ["vpn", "ipsec", "options", "virtual-ip", ip]

    # ========================================================================
    # Config Parsing Methods (for READ operations)
    # ========================================================================

    def parse_ike_groups(self, config: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Parse IKE groups from config."""
        ike_groups = []
        ike_config = config.get("ike-group", {})

        for name, group_config in ike_config.items():
            if not isinstance(group_config, dict):
                continue

            # Parse proposals
            proposals = []
            prop_config = group_config.get("proposal", {})
            for prop_id, prop_data in prop_config.items() if isinstance(prop_config, dict) else []:
                if isinstance(prop_data, dict):
                    proposals.append({
                        "id": prop_id,
                        "dh_group": prop_data.get("dh-group"),
                        "encryption": prop_data.get("encryption"),
                        "hash": prop_data.get("hash"),
                    })

            # Parse DPD
            dpd = None
            dpd_config = group_config.get("dead-peer-detection", {})
            if isinstance(dpd_config, dict) and dpd_config:
                dpd = {
                    "action": dpd_config.get("action"),
                    "interval": dpd_config.get("interval"),
                    "timeout": dpd_config.get("timeout"),
                }

            ike_groups.append({
                "name": name,
                "key_exchange": group_config.get("key-exchange"),
                "lifetime": group_config.get("lifetime"),
                "proposals": proposals,
                "dead_peer_detection": dpd,
                "close_action": group_config.get("close-action"),
                "ikev2_reauth": "ikev2-reauth" in group_config,
                "mode": group_config.get("mode"),
            })

        return ike_groups

    def parse_esp_groups(self, config: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Parse ESP groups from config."""
        esp_groups = []
        esp_config = config.get("esp-group", {})

        for name, group_config in esp_config.items():
            if not isinstance(group_config, dict):
                continue

            # Parse proposals
            proposals = []
            prop_config = group_config.get("proposal", {})
            for prop_id, prop_data in prop_config.items() if isinstance(prop_config, dict) else []:
                if isinstance(prop_data, dict):
                    proposals.append({
                        "id": prop_id,
                        "encryption": prop_data.get("encryption"),
                        "hash": prop_data.get("hash"),
                    })

            esp_groups.append({
                "name": name,
                "lifetime": group_config.get("lifetime"),
                "pfs": group_config.get("pfs"),
                "mode": group_config.get("mode", "tunnel"),
                "compression": "compression" in group_config,
                "proposals": proposals,
            })

        return esp_groups

    def parse_site_to_site_peers(self, config: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Parse site-to-site peers from config."""
        peers = []
        sts_config = config.get("site-to-site", {}).get("peer", {})

        for peer_addr, peer_config in sts_config.items():
            if not isinstance(peer_config, dict):
                continue

            # Parse authentication
            auth = {}
            auth_config = peer_config.get("authentication", {})
            if isinstance(auth_config, dict):
                auth = {
                    "mode": auth_config.get("mode"),
                    "pre_shared_secret": auth_config.get("pre-shared-secret"),
                    "local_id": auth_config.get("local-id"),
                    "remote_id": auth_config.get("remote-id"),
                }
                # X.509 certs
                x509 = auth_config.get("x509", {})
                if isinstance(x509, dict):
                    auth["x509"] = {
                        "ca_certificate": x509.get("ca-certificate"),
                        "certificate": x509.get("certificate"),
                    }

            # Parse tunnels
            tunnels = []
            tunnel_config = peer_config.get("tunnel", {})
            for tunnel_id, tunnel_data in tunnel_config.items() if isinstance(tunnel_config, dict) else []:
                if isinstance(tunnel_data, dict):
                    local_prefix = None
                    remote_prefix = None
                    local_config = tunnel_data.get("local", {})
                    remote_config = tunnel_data.get("remote", {})
                    if isinstance(local_config, dict):
                        local_prefix = local_config.get("prefix")
                    if isinstance(remote_config, dict):
                        remote_prefix = remote_config.get("prefix")

                    tunnels.append({
                        "id": tunnel_id,
                        "esp_group": tunnel_data.get("esp-group"),
                        "local_prefix": local_prefix,
                        "remote_prefix": remote_prefix,
                        "protocol": tunnel_data.get("protocol"),
                        "disable": "disable" in tunnel_data,
                    })

            # Parse VTI
            vti = None
            vti_config = peer_config.get("vti", {})
            if isinstance(vti_config, dict) and vti_config:
                vti = {
                    "bind": vti_config.get("bind"),
                    "esp_group": vti_config.get("esp-group"),
                }

            peers.append({
                "address": peer_addr,
                "authentication": auth,
                "connection_type": peer_config.get("connection-type"),
                "default_esp_group": peer_config.get("default-esp-group"),
                "ike_group": peer_config.get("ike-group"),
                "local_address": peer_config.get("local-address"),
                "description": peer_config.get("description"),
                "disable": "disable" in peer_config,
                "dhcp_interface": peer_config.get("dhcp-interface"),
                "vti": vti,
                "tunnels": tunnels,
            })

        return peers

    def parse_interfaces(self, config: Dict[str, Any]) -> List[str]:
        """Parse IPsec interfaces from config."""
        interfaces = config.get("interface", [])
        if isinstance(interfaces, str):
            return [interfaces]
        elif isinstance(interfaces, list):
            return interfaces
        return []

    def parse_options(self, config: Dict[str, Any]) -> Dict[str, Any]:
        """Parse IPsec options from config."""
        options_config = config.get("options", {})
        if not isinstance(options_config, dict):
            return {}

        virtual_ips = options_config.get("virtual-ip", [])
        if isinstance(virtual_ips, str):
            virtual_ips = [virtual_ips]

        return {
            "disable_route_autoinstall": "disable-route-autoinstall" in options_config,
            "flexvpn": "flexvpn" in options_config,
            "virtual_ips": virtual_ips if isinstance(virtual_ips, list) else [],
        }

    def parse_full_config(self, full_config: Dict[str, Any]) -> Dict[str, Any]:
        """
        Parse full IPsec configuration from VyOS.

        Args:
            full_config: Full VyOS config dictionary

        Returns:
            Parsed IPsec configuration
        """
        ipsec_config = full_config.get("vpn", {}).get("ipsec", {})

        if not ipsec_config:
            return {
                "configured": False,
                "ike_groups": [],
                "esp_groups": [],
                "peers": [],
                "interfaces": [],
                "options": {},
            }

        return {
            "configured": True,
            "ike_groups": self.parse_ike_groups(ipsec_config),
            "esp_groups": self.parse_esp_groups(ipsec_config),
            "peers": self.parse_site_to_site_peers(ipsec_config),
            "interfaces": self.parse_interfaces(ipsec_config),
            "options": self.parse_options(ipsec_config),
        }
