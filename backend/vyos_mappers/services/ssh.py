"""
SSH Service Command Mapper

Handles SSH service commands for VyOS.
"""

from typing import List, Dict, Any, Optional
from ..base import BaseFeatureMapper


class SSHMapper(BaseFeatureMapper):
    """SSH mapper with all SSH operations"""

    def __init__(self, version: str):
        """Initialize with VyOS version."""
        super().__init__(version)

    # ========================================================================
    # Base Path
    # ========================================================================

    def get_base(self) -> List[str]:
        """Get base path for SSH service."""
        return ["service", "ssh"]

    # ========================================================================
    # Basic Settings
    # ========================================================================

    def get_port(self, port: str) -> List[str]:
        """Get command path for SSH port."""
        return ["service", "ssh", "port", port]

    def get_listen_address(self, address: str) -> List[str]:
        """Get command path for listen address."""
        return ["service", "ssh", "listen-address", address]

    def get_disable(self) -> List[str]:
        """Get command path for disabling SSH."""
        return ["service", "ssh", "disable"]

    # ========================================================================
    # Access Control
    # ========================================================================

    def get_access_control_allow_user(self, user: str) -> List[str]:
        """Get command path for allowed user."""
        return ["service", "ssh", "access-control", "allow", "user", user]

    def get_access_control_allow_group(self, group: str) -> List[str]:
        """Get command path for allowed group."""
        return ["service", "ssh", "access-control", "allow", "group", group]

    def get_access_control_deny_user(self, user: str) -> List[str]:
        """Get command path for denied user."""
        return ["service", "ssh", "access-control", "deny", "user", user]

    def get_access_control_deny_group(self, group: str) -> List[str]:
        """Get command path for denied group."""
        return ["service", "ssh", "access-control", "deny", "group", group]

    # ========================================================================
    # Authentication
    # ========================================================================

    def get_disable_password_authentication(self) -> List[str]:
        """Get command path for disabling password authentication."""
        return ["service", "ssh", "disable-password-authentication"]

    def get_disable_host_validation(self) -> List[str]:
        """Get command path for disabling host validation."""
        return ["service", "ssh", "disable-host-validation"]

    # ========================================================================
    # Ciphers and MACs
    # ========================================================================

    def get_cipher(self, cipher: str) -> List[str]:
        """Get command path for cipher."""
        return ["service", "ssh", "ciphers", cipher]

    def get_key_exchange(self, kex: str) -> List[str]:
        """Get command path for key exchange algorithm."""
        return ["service", "ssh", "key-exchange", kex]

    def get_mac(self, mac: str) -> List[str]:
        """Get command path for MAC algorithm."""
        return ["service", "ssh", "mac", mac]

    # ========================================================================
    # Session Options
    # ========================================================================

    def get_client_keepalive_interval(self, interval: str) -> List[str]:
        """Get command path for client keepalive interval."""
        return ["service", "ssh", "client-keepalive-interval", interval]

    def get_loglevel(self, level: str) -> List[str]:
        """Get command path for log level."""
        return ["service", "ssh", "loglevel", level]

    # ========================================================================
    # Dynamic Protection (VyOS 1.4+)
    # ========================================================================

    def get_dynamic_protection(self) -> List[str]:
        """Get command path for dynamic protection."""
        return ["service", "ssh", "dynamic-protection"]

    def get_dynamic_protection_allow_from(self, network: str) -> List[str]:
        """Get command path for dynamic protection allow-from."""
        return ["service", "ssh", "dynamic-protection", "allow-from", network]

    def get_dynamic_protection_block_time(self, time: str) -> List[str]:
        """Get command path for dynamic protection block time."""
        return ["service", "ssh", "dynamic-protection", "block-time", time]

    def get_dynamic_protection_detect_time(self, time: str) -> List[str]:
        """Get command path for dynamic protection detect time."""
        return ["service", "ssh", "dynamic-protection", "detect-time", time]

    def get_dynamic_protection_threshold(self, threshold: str) -> List[str]:
        """Get command path for dynamic protection threshold."""
        return ["service", "ssh", "dynamic-protection", "threshold", threshold]

    # ========================================================================
    # VRF
    # ========================================================================

    def get_vrf(self, vrf: str) -> List[str]:
        """Get command path for VRF."""
        return ["service", "ssh", "vrf", vrf]

    # ========================================================================
    # Config Parsing Methods (for READ operations)
    # ========================================================================

    def parse_access_control(self, config: Dict[str, Any]) -> Dict[str, Any]:
        """Parse access control configuration."""
        access_control = {"allow": {"users": [], "groups": []}, "deny": {"users": [], "groups": []}}

        ac_config = config.get("access-control", {})
        if not isinstance(ac_config, dict):
            return access_control

        # Parse allow
        allow_config = ac_config.get("allow", {})
        if isinstance(allow_config, dict):
            users = allow_config.get("user", [])
            if isinstance(users, str):
                users = [users]
            groups = allow_config.get("group", [])
            if isinstance(groups, str):
                groups = [groups]
            access_control["allow"]["users"] = users if isinstance(users, list) else []
            access_control["allow"]["groups"] = groups if isinstance(groups, list) else []

        # Parse deny
        deny_config = ac_config.get("deny", {})
        if isinstance(deny_config, dict):
            users = deny_config.get("user", [])
            if isinstance(users, str):
                users = [users]
            groups = deny_config.get("group", [])
            if isinstance(groups, str):
                groups = [groups]
            access_control["deny"]["users"] = users if isinstance(users, list) else []
            access_control["deny"]["groups"] = groups if isinstance(groups, list) else []

        return access_control

    def parse_dynamic_protection(self, config: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Parse dynamic protection configuration."""
        dp_config = config.get("dynamic-protection", {})
        if not dp_config:
            return None

        if not isinstance(dp_config, dict):
            return {"enabled": True}

        allow_from = dp_config.get("allow-from", [])
        if isinstance(allow_from, str):
            allow_from = [allow_from]

        return {
            "enabled": True,
            "allow_from": allow_from if isinstance(allow_from, list) else [],
            "block_time": dp_config.get("block-time"),
            "detect_time": dp_config.get("detect-time"),
            "threshold": dp_config.get("threshold"),
        }

    def parse_full_config(self, full_config: Dict[str, Any]) -> Dict[str, Any]:
        """
        Parse full SSH configuration from VyOS.

        Args:
            full_config: Full VyOS config dictionary

        Returns:
            Parsed SSH configuration
        """
        ssh_config = full_config.get("service", {}).get("ssh", {})

        if not ssh_config:
            return {
                "configured": False,
                "port": None,
                "listen_addresses": [],
                "disable": False,
                "access_control": {"allow": {"users": [], "groups": []}, "deny": {"users": [], "groups": []}},
                "disable_password_authentication": False,
                "disable_host_validation": False,
                "ciphers": [],
                "key_exchanges": [],
                "macs": [],
                "client_keepalive_interval": None,
                "loglevel": None,
                "dynamic_protection": None,
                "vrf": None,
            }

        # Parse port(s)
        port = ssh_config.get("port")
        if isinstance(port, list) and len(port) > 0:
            port = port[0]

        # Parse listen addresses
        listen_addresses = ssh_config.get("listen-address", [])
        if isinstance(listen_addresses, str):
            listen_addresses = [listen_addresses]

        # Parse ciphers
        ciphers = ssh_config.get("ciphers", [])
        if isinstance(ciphers, str):
            ciphers = [ciphers]

        # Parse key exchanges
        key_exchanges = ssh_config.get("key-exchange", [])
        if isinstance(key_exchanges, str):
            key_exchanges = [key_exchanges]

        # Parse MACs
        macs = ssh_config.get("mac", [])
        if isinstance(macs, str):
            macs = [macs]

        return {
            "configured": True,
            "port": port,
            "listen_addresses": listen_addresses if isinstance(listen_addresses, list) else [],
            "disable": "disable" in ssh_config,
            "access_control": self.parse_access_control(ssh_config),
            "disable_password_authentication": "disable-password-authentication" in ssh_config,
            "disable_host_validation": "disable-host-validation" in ssh_config,
            "ciphers": ciphers if isinstance(ciphers, list) else [],
            "key_exchanges": key_exchanges if isinstance(key_exchanges, list) else [],
            "macs": macs if isinstance(macs, list) else [],
            "client_keepalive_interval": ssh_config.get("client-keepalive-interval"),
            "loglevel": ssh_config.get("loglevel"),
            "dynamic_protection": self.parse_dynamic_protection(ssh_config),
            "vrf": ssh_config.get("vrf"),
        }
