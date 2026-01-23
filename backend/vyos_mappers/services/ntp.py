"""
NTP Service Command Mapper

Handles NTP service commands for VyOS.
"""

from typing import List, Dict, Any, Optional
from ..base import BaseFeatureMapper


class NTPMapper(BaseFeatureMapper):
    """NTP mapper with all NTP operations"""

    def __init__(self, version: str):
        """Initialize with VyOS version."""
        super().__init__(version)

    # ========================================================================
    # Base Path
    # ========================================================================

    def get_base(self) -> List[str]:
        """Get base path for NTP service."""
        return ["service", "ntp"]

    # ========================================================================
    # NTP Servers
    # ========================================================================

    def get_server(self, server: str) -> List[str]:
        """Get command path for NTP server."""
        return ["service", "ntp", "server", server]

    def get_server_pool(self, server: str) -> List[str]:
        """Get command path for NTP server pool flag."""
        return ["service", "ntp", "server", server, "pool"]

    def get_server_prefer(self, server: str) -> List[str]:
        """Get command path for NTP server prefer flag."""
        return ["service", "ntp", "server", server, "prefer"]

    def get_server_noselect(self, server: str) -> List[str]:
        """Get command path for NTP server noselect flag."""
        return ["service", "ntp", "server", server, "noselect"]

    def get_server_nts(self, server: str) -> List[str]:
        """Get command path for NTP server NTS (Network Time Security)."""
        return ["service", "ntp", "server", server, "nts"]

    # ========================================================================
    # Listen Addresses
    # ========================================================================

    def get_listen_address(self, address: str) -> List[str]:
        """Get command path for listen address."""
        return ["service", "ntp", "listen-address", address]

    # ========================================================================
    # Allow Networks
    # ========================================================================

    def get_allow_client_address(self, network: str) -> List[str]:
        """Get command path for allowed client address/network."""
        return ["service", "ntp", "allow-client", "address", network]

    # ========================================================================
    # Leap Second Handling
    # ========================================================================

    def get_leap_second_mode(self, mode: str) -> List[str]:
        """Get command path for leap second mode (ignore, smear, system, timezone)."""
        return ["service", "ntp", "leap-second", mode]

    # ========================================================================
    # VRF
    # ========================================================================

    def get_vrf(self, vrf: str) -> List[str]:
        """Get command path for VRF."""
        return ["service", "ntp", "vrf", vrf]

    # ========================================================================
    # Config Parsing Methods (for READ operations)
    # ========================================================================

    def parse_servers(self, config: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Parse NTP servers from config."""
        servers = []
        server_config = config.get("server", {})

        if isinstance(server_config, dict):
            for address, server_data in server_config.items():
                server = {
                    "address": address,
                    "pool": False,
                    "prefer": False,
                    "noselect": False,
                    "nts": False,
                }
                if isinstance(server_data, dict):
                    server["pool"] = "pool" in server_data
                    server["prefer"] = "prefer" in server_data
                    server["noselect"] = "noselect" in server_data
                    server["nts"] = "nts" in server_data
                servers.append(server)
        elif isinstance(server_config, list):
            for address in server_config:
                servers.append({
                    "address": address,
                    "pool": False,
                    "prefer": False,
                    "noselect": False,
                    "nts": False,
                })

        return servers

    def parse_full_config(self, full_config: Dict[str, Any]) -> Dict[str, Any]:
        """
        Parse full NTP configuration from VyOS.

        Args:
            full_config: Full VyOS config dictionary

        Returns:
            Parsed NTP configuration
        """
        ntp_config = full_config.get("service", {}).get("ntp", {})

        if not ntp_config:
            return {
                "configured": False,
                "servers": [],
                "listen_addresses": [],
                "allow_clients": [],
                "leap_second": None,
                "vrf": None,
            }

        # Parse listen addresses
        listen_addresses = ntp_config.get("listen-address", [])
        if isinstance(listen_addresses, str):
            listen_addresses = [listen_addresses]

        # Parse allow-client addresses
        allow_clients = []
        allow_client_config = ntp_config.get("allow-client", {})
        if isinstance(allow_client_config, dict):
            addresses = allow_client_config.get("address", [])
            if isinstance(addresses, str):
                allow_clients = [addresses]
            elif isinstance(addresses, list):
                allow_clients = addresses

        # Parse leap second mode
        leap_second = None
        leap_config = ntp_config.get("leap-second", {})
        if isinstance(leap_config, dict):
            for mode in ["ignore", "smear", "system", "timezone"]:
                if mode in leap_config:
                    leap_second = mode
                    break

        return {
            "configured": True,
            "servers": self.parse_servers(ntp_config),
            "listen_addresses": listen_addresses if isinstance(listen_addresses, list) else [],
            "allow_clients": allow_clients,
            "leap_second": leap_second,
            "vrf": ntp_config.get("vrf"),
        }
