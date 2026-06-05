"""
SSH Service Batch Builder

Generates VyOS set/delete operations for the SSH service.

Configuration lives under: service ssh

Version differences (reflected in capabilities + mapper):
  - 1.5 cipher node is "cipher"; 1.4 uses "ciphers".
  - 1.4 cipher list additionally allows "rijndael-cbc@lysator.liu.se".
  - "fido" (pin-required / touch-required) and "trusted-user-ca" are 1.5 only.
"""

from typing import List, Dict, Any
from vyos_mappers import CommandMapperRegistry

# Algorithm option lists sourced from the VyOS templates.
_CIPHERS_1_5 = [
    "3des-cbc", "aes128-cbc", "aes192-cbc", "aes256-cbc", "aes128-ctr",
    "aes192-ctr", "aes256-ctr", "aes128-gcm@openssh.com",
    "aes256-gcm@openssh.com", "chacha20-poly1305@openssh.com",
]
_CIPHERS_1_4 = [
    "3des-cbc", "aes128-cbc", "aes192-cbc", "aes256-cbc",
    "rijndael-cbc@lysator.liu.se", "aes128-ctr", "aes192-ctr", "aes256-ctr",
    "aes128-gcm@openssh.com", "aes256-gcm@openssh.com",
    "chacha20-poly1305@openssh.com",
]
_MACS = [
    "hmac-sha1", "hmac-sha1-96", "hmac-sha2-256", "hmac-sha2-512", "hmac-md5",
    "hmac-md5-96", "umac-64@openssh.com", "umac-128@openssh.com",
    "hmac-sha1-etm@openssh.com", "hmac-sha1-96-etm@openssh.com",
    "hmac-sha2-256-etm@openssh.com", "hmac-sha2-512-etm@openssh.com",
    "hmac-md5-etm@openssh.com", "hmac-md5-96-etm@openssh.com",
    "umac-64-etm@openssh.com", "umac-128-etm@openssh.com",
]
_KEY_EXCHANGES = [
    "diffie-hellman-group1-sha1", "diffie-hellman-group14-sha1",
    "diffie-hellman-group14-sha256", "diffie-hellman-group16-sha512",
    "diffie-hellman-group18-sha512", "diffie-hellman-group-exchange-sha1",
    "diffie-hellman-group-exchange-sha256", "ecdh-sha2-nistp256",
    "ecdh-sha2-nistp384", "ecdh-sha2-nistp521", "curve25519-sha256",
    "curve25519-sha256@libssh.org",
]
_HOSTKEY_ALGORITHMS = [
    "ssh-ed25519", "ssh-ed25519-cert-v01@openssh.com",
    "sk-ssh-ed25519@openssh.com", "sk-ssh-ed25519-cert-v01@openssh.com",
    "ssh-rsa", "rsa-sha2-256", "rsa-sha2-512", "ssh-dss",
    "ecdsa-sha2-nistp256", "ecdsa-sha2-nistp384", "ecdsa-sha2-nistp521",
    "sk-ecdsa-sha2-nistp256@openssh.com",
    "webauthn-sk-ecdsa-sha2-nistp256@openssh.com",
    "ssh-rsa-cert-v01@openssh.com", "rsa-sha2-256-cert-v01@openssh.com",
    "rsa-sha2-512-cert-v01@openssh.com", "ssh-dss-cert-v01@openssh.com",
    "ecdsa-sha2-nistp256-cert-v01@openssh.com",
    "ecdsa-sha2-nistp384-cert-v01@openssh.com",
    "ecdsa-sha2-nistp521-cert-v01@openssh.com",
    "sk-ecdsa-sha2-nistp256-cert-v01@openssh.com",
]
_PUBKEY_ALGORITHMS = [
    "ssh-ed25519", "ssh-ed25519-cert-v01@openssh.com",
    "sk-ssh-ed25519@openssh.com", "sk-ssh-ed25519-cert-v01@openssh.com",
    "ecdsa-sha2-nistp256", "ecdsa-sha2-nistp256-cert-v01@openssh.com",
    "ecdsa-sha2-nistp384", "ecdsa-sha2-nistp384-cert-v01@openssh.com",
    "ecdsa-sha2-nistp521", "ecdsa-sha2-nistp521-cert-v01@openssh.com",
    "sk-ecdsa-sha2-nistp256@openssh.com",
    "sk-ecdsa-sha2-nistp256-cert-v01@openssh.com",
    "webauthn-sk-ecdsa-sha2-nistp256@openssh.com", "ssh-dss",
    "ssh-dss-cert-v01@openssh.com", "ssh-rsa", "ssh-rsa-cert-v01@openssh.com",
    "rsa-sha2-256", "rsa-sha2-256-cert-v01@openssh.com", "rsa-sha2-512",
    "rsa-sha2-512-cert-v01@openssh.com",
]
_LOGLEVELS = ["quiet", "fatal", "error", "info", "verbose"]


class SSHBatchBuilder:
    def __init__(self, version: str):
        self.version = version
        self._operations: List[Dict[str, Any]] = []
        self.mappers = CommandMapperRegistry.get_all_mappers(version)
        self.m = self.mappers["ssh"]

    # -----------------------------------------------------------------------
    # Core helpers
    # -----------------------------------------------------------------------

    def add_set(self, path: List[str]) -> "SSHBatchBuilder":
        if path:
            self._operations.append({"op": "set", "path": path})
        return self

    def add_delete(self, path: List[str]) -> "SSHBatchBuilder":
        if path:
            self._operations.append({"op": "delete", "path": path})
        return self

    def get_operations(self) -> List[Dict[str, Any]]:
        return self._operations.copy()

    def is_empty(self) -> bool:
        return len(self._operations) == 0

    # -----------------------------------------------------------------------
    # Capabilities
    # -----------------------------------------------------------------------

    def get_capabilities(self) -> Dict[str, Any]:
        is_1_4 = "1.4" in self.version
        is_1_5 = not is_1_4

        return {
            "version": self.version,
            "features": {
                "ssh": {
                    "supported": True,
                    "description": "Secure Shell service",
                },
                "port": {"supported": True, "multi_value": True, "default": "22"},
                "listen_address": {"supported": True, "multi_value": True},
                "vrf": {"supported": True, "multi_value": True},
                "disable_host_validation": {"supported": True},
                "disable_password_authentication": {"supported": True},
                "loglevel": {
                    "supported": True,
                    "values": _LOGLEVELS,
                    "default": "info",
                },
                "client_keepalive_interval": {"supported": True},
                "cipher": {
                    "supported": True,
                    "multi_value": True,
                    "values": _CIPHERS_1_4 if is_1_4 else _CIPHERS_1_5,
                },
                "mac": {"supported": True, "multi_value": True, "values": _MACS},
                "key_exchange": {
                    "supported": True,
                    "multi_value": True,
                    "values": _KEY_EXCHANGES,
                },
                "hostkey_algorithm": {
                    "supported": True,
                    "multi_value": True,
                    "values": _HOSTKEY_ALGORITHMS,
                },
                "pubkey_accepted_algorithm": {
                    "supported": True,
                    "multi_value": True,
                    "values": _PUBKEY_ALGORITHMS,
                },
                "trusted_user_ca": {
                    "supported": is_1_5,
                    "description": "OpenSSH trusted user CA from the PKI subsystem",
                },
                "access_control": {
                    "supported": True,
                    "description": "Allow/deny SSH access by user and group",
                },
                "dynamic_protection": {
                    "supported": True,
                    "description": "Throttle and block brute-force SSH attempts",
                    "defaults": {"block_time": "120", "detect_time": "1800", "threshold": "30"},
                },
                "fido": {
                    "supported": is_1_5,
                    "description": "FIDO2 hardware security key options",
                },
                "rekey": {
                    "supported": True,
                    "description": "Session rekey limits by data volume and time",
                },
            },
            "version_info": {
                "is_1_4": is_1_4,
                "is_1_5": is_1_5,
            },
        }

    # =======================================================================
    # Global service
    # =======================================================================

    def delete_ssh(self) -> "SSHBatchBuilder":
        return self.add_delete(self.m.get_ssh_delete())

    # ----------------------------------------------------------- port (multi)
    def set_port(self, port: str) -> "SSHBatchBuilder":
        return self.add_set(self.m.get_port(port))

    def delete_port(self, port: str) -> "SSHBatchBuilder":
        return self.add_delete(self.m.get_port_delete(port))

    def delete_all_ports(self) -> "SSHBatchBuilder":
        return self.add_delete(self.m.get_all_ports_delete())

    # ------------------------------------------------- listen-address (multi)
    def set_listen_address(self, address: str) -> "SSHBatchBuilder":
        return self.add_set(self.m.get_listen_address(address))

    def delete_listen_address(self, address: str) -> "SSHBatchBuilder":
        return self.add_delete(self.m.get_listen_address_delete(address))

    def delete_all_listen_addresses(self) -> "SSHBatchBuilder":
        return self.add_delete(self.m.get_all_listen_addresses_delete())

    # ------------------------------------------------------------ vrf (multi)
    def set_vrf(self, name: str) -> "SSHBatchBuilder":
        return self.add_set(self.m.get_vrf(name))

    def delete_vrf(self, name: str) -> "SSHBatchBuilder":
        return self.add_delete(self.m.get_vrf_delete(name))

    def delete_all_vrfs(self) -> "SSHBatchBuilder":
        return self.add_delete(self.m.get_all_vrfs_delete())

    # -------------------------------------------------------- presence flags
    def set_disable_host_validation(self) -> "SSHBatchBuilder":
        return self.add_set(self.m.get_disable_host_validation())

    def delete_disable_host_validation(self) -> "SSHBatchBuilder":
        return self.add_delete(self.m.get_disable_host_validation())

    def set_disable_password_authentication(self) -> "SSHBatchBuilder":
        return self.add_set(self.m.get_disable_password_authentication())

    def delete_disable_password_authentication(self) -> "SSHBatchBuilder":
        return self.add_delete(self.m.get_disable_password_authentication())

    # --------------------------------------------------------------- loglevel
    def set_loglevel(self, value: str) -> "SSHBatchBuilder":
        return self.add_set(self.m.get_loglevel(value))

    def delete_loglevel(self) -> "SSHBatchBuilder":
        return self.add_delete(self.m.get_loglevel_delete())

    # --------------------------------------------- client-keepalive-interval
    def set_client_keepalive_interval(self, value: str) -> "SSHBatchBuilder":
        return self.add_set(self.m.get_client_keepalive_interval(value))

    def delete_client_keepalive_interval(self) -> "SSHBatchBuilder":
        return self.add_delete(self.m.get_client_keepalive_interval_delete())

    # ------------------------------------------------------- cipher (multi)
    def set_cipher(self, algo: str) -> "SSHBatchBuilder":
        return self.add_set(self.m.get_cipher(algo))

    def delete_cipher(self, algo: str) -> "SSHBatchBuilder":
        return self.add_delete(self.m.get_cipher_delete(algo))

    def delete_all_ciphers(self) -> "SSHBatchBuilder":
        return self.add_delete(self.m.get_all_ciphers_delete())

    # ---------------------------------------------------------- mac (multi)
    def set_mac(self, algo: str) -> "SSHBatchBuilder":
        return self.add_set(self.m.get_mac(algo))

    def delete_mac(self, algo: str) -> "SSHBatchBuilder":
        return self.add_delete(self.m.get_mac_delete(algo))

    def delete_all_macs(self) -> "SSHBatchBuilder":
        return self.add_delete(self.m.get_all_macs_delete())

    # ------------------------------------------------- key-exchange (multi)
    def set_key_exchange(self, algo: str) -> "SSHBatchBuilder":
        return self.add_set(self.m.get_key_exchange(algo))

    def delete_key_exchange(self, algo: str) -> "SSHBatchBuilder":
        return self.add_delete(self.m.get_key_exchange_delete(algo))

    def delete_all_key_exchanges(self) -> "SSHBatchBuilder":
        return self.add_delete(self.m.get_all_key_exchanges_delete())

    # -------------------------------------------- hostkey-algorithm (multi)
    def set_hostkey_algorithm(self, algo: str) -> "SSHBatchBuilder":
        return self.add_set(self.m.get_hostkey_algorithm(algo))

    def delete_hostkey_algorithm(self, algo: str) -> "SSHBatchBuilder":
        return self.add_delete(self.m.get_hostkey_algorithm_delete(algo))

    def delete_all_hostkey_algorithms(self) -> "SSHBatchBuilder":
        return self.add_delete(self.m.get_all_hostkey_algorithms_delete())

    # ------------------------------------ pubkey-accepted-algorithm (multi)
    def set_pubkey_accepted_algorithm(self, algo: str) -> "SSHBatchBuilder":
        return self.add_set(self.m.get_pubkey_accepted_algorithm(algo))

    def delete_pubkey_accepted_algorithm(self, algo: str) -> "SSHBatchBuilder":
        return self.add_delete(self.m.get_pubkey_accepted_algorithm_delete(algo))

    def delete_all_pubkey_accepted_algorithms(self) -> "SSHBatchBuilder":
        return self.add_delete(self.m.get_all_pubkey_accepted_algorithms_delete())

    # ------------------------------------------------ trusted-user-ca (1.5)
    def set_trusted_user_ca(self, name: str) -> "SSHBatchBuilder":
        return self.add_set(self.m.get_trusted_user_ca(name))

    def delete_trusted_user_ca(self) -> "SSHBatchBuilder":
        return self.add_delete(self.m.get_trusted_user_ca_delete())

    # =======================================================================
    # Access control
    # =======================================================================

    def set_access_control_allow_user(self, name: str) -> "SSHBatchBuilder":
        return self.add_set(self.m.get_access_control_allow_user(name))

    def delete_access_control_allow_user(self, name: str) -> "SSHBatchBuilder":
        return self.add_delete(self.m.get_access_control_allow_user_delete(name))

    def set_access_control_allow_group(self, name: str) -> "SSHBatchBuilder":
        return self.add_set(self.m.get_access_control_allow_group(name))

    def delete_access_control_allow_group(self, name: str) -> "SSHBatchBuilder":
        return self.add_delete(self.m.get_access_control_allow_group_delete(name))

    def set_access_control_deny_user(self, name: str) -> "SSHBatchBuilder":
        return self.add_set(self.m.get_access_control_deny_user(name))

    def delete_access_control_deny_user(self, name: str) -> "SSHBatchBuilder":
        return self.add_delete(self.m.get_access_control_deny_user_delete(name))

    def set_access_control_deny_group(self, name: str) -> "SSHBatchBuilder":
        return self.add_set(self.m.get_access_control_deny_group(name))

    def delete_access_control_deny_group(self, name: str) -> "SSHBatchBuilder":
        return self.add_delete(self.m.get_access_control_deny_group_delete(name))

    # =======================================================================
    # Dynamic protection
    # =======================================================================

    def set_dynamic_protection(self) -> "SSHBatchBuilder":
        return self.add_set(self.m.get_dynamic_protection())

    def delete_dynamic_protection(self) -> "SSHBatchBuilder":
        return self.add_delete(self.m.get_dynamic_protection_delete())

    def set_dynamic_protection_allow_from(self, value: str) -> "SSHBatchBuilder":
        return self.add_set(self.m.get_dynamic_protection_allow_from(value))

    def delete_dynamic_protection_allow_from(self, value: str) -> "SSHBatchBuilder":
        return self.add_delete(self.m.get_dynamic_protection_allow_from_delete(value))

    def delete_all_dynamic_protection_allow_from(self) -> "SSHBatchBuilder":
        return self.add_delete(self.m.get_all_dynamic_protection_allow_from_delete())

    def set_dynamic_protection_block_time(self, value: str) -> "SSHBatchBuilder":
        return self.add_set(self.m.get_dynamic_protection_block_time(value))

    def delete_dynamic_protection_block_time(self) -> "SSHBatchBuilder":
        return self.add_delete(self.m.get_dynamic_protection_block_time_delete())

    def set_dynamic_protection_detect_time(self, value: str) -> "SSHBatchBuilder":
        return self.add_set(self.m.get_dynamic_protection_detect_time(value))

    def delete_dynamic_protection_detect_time(self) -> "SSHBatchBuilder":
        return self.add_delete(self.m.get_dynamic_protection_detect_time_delete())

    def set_dynamic_protection_threshold(self, value: str) -> "SSHBatchBuilder":
        return self.add_set(self.m.get_dynamic_protection_threshold(value))

    def delete_dynamic_protection_threshold(self) -> "SSHBatchBuilder":
        return self.add_delete(self.m.get_dynamic_protection_threshold_delete())

    # =======================================================================
    # FIDO (1.5)
    # =======================================================================

    def set_fido_pin_required(self) -> "SSHBatchBuilder":
        return self.add_set(self.m.get_fido_pin_required())

    def delete_fido_pin_required(self) -> "SSHBatchBuilder":
        return self.add_delete(self.m.get_fido_pin_required())

    def set_fido_touch_required(self) -> "SSHBatchBuilder":
        return self.add_set(self.m.get_fido_touch_required())

    def delete_fido_touch_required(self) -> "SSHBatchBuilder":
        return self.add_delete(self.m.get_fido_touch_required())

    # =======================================================================
    # Rekey
    # =======================================================================

    def set_rekey_data(self, value: str) -> "SSHBatchBuilder":
        return self.add_set(self.m.get_rekey_data(value))

    def delete_rekey_data(self) -> "SSHBatchBuilder":
        return self.add_delete(self.m.get_rekey_data_delete())

    def set_rekey_time(self, value: str) -> "SSHBatchBuilder":
        return self.add_set(self.m.get_rekey_time(value))

    def delete_rekey_time(self) -> "SSHBatchBuilder":
        return self.add_delete(self.m.get_rekey_time_delete())
