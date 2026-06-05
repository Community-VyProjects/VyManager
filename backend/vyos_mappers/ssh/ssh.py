"""SSH Service Command Mapper.

Maps SSH configuration attributes to VyOS config paths under: service ssh

Version differences:
  - Cipher node is named "cipher" on 1.5 and "ciphers" on 1.4 (see version overrides).
  - "fido" (pin-required / touch-required) and "trusted-user-ca" exist only on 1.5.
  Everything else is identical across 1.4 and 1.5.

Structure:
  service ssh
    port <1-65535>                          # multi
    listen-address <ip>                     # multi
    vrf <name>                              # multi
    disable-host-validation                 # presence
    disable-password-authentication         # presence
    loglevel <quiet|fatal|error|info|verbose>
    client-keepalive-interval <1-65535>
    cipher|ciphers <algo>                   # multi
    mac <algo>                              # multi
    key-exchange <algo>                     # multi
    hostkey-algorithm <algo>                # multi
    pubkey-accepted-algorithm <algo>        # multi
    trusted-user-ca <name>                  # single (1.5)
    access-control
      allow { user <name>, group <name> }   # multi
      deny  { user <name>, group <name> }   # multi
    dynamic-protection                      # presence (enables feature)
      allow-from <ip|net>                   # multi
      block-time <1-65535>
      detect-time <1-65535>
      threshold <1-65535>
    fido { pin-required, touch-required }    # presence (1.5)
    rekey { data <mb>, time <min> }
"""
from typing import List
from ..base import BaseFeatureMapper

BASE = ["service", "ssh"]


class SSHMapper(BaseFeatureMapper):
    def __init__(self, version: str):
        super().__init__(version)

    # ========================================================================
    # Global service
    # ========================================================================

    def get_ssh_delete(self) -> List[str]:
        return BASE

    # --------------------------------------------------------- port (multi)
    def get_port(self, port: str) -> List[str]:
        return BASE + ["port", port]

    def get_port_delete(self, port: str) -> List[str]:
        return BASE + ["port", port]

    def get_all_ports_delete(self) -> List[str]:
        return BASE + ["port"]

    # ----------------------------------------------- listen-address (multi)
    def get_listen_address(self, address: str) -> List[str]:
        return BASE + ["listen-address", address]

    def get_listen_address_delete(self, address: str) -> List[str]:
        return BASE + ["listen-address", address]

    def get_all_listen_addresses_delete(self) -> List[str]:
        return BASE + ["listen-address"]

    # ---------------------------------------------------------- vrf (multi)
    def get_vrf(self, name: str) -> List[str]:
        return BASE + ["vrf", name]

    def get_vrf_delete(self, name: str) -> List[str]:
        return BASE + ["vrf", name]

    def get_all_vrfs_delete(self) -> List[str]:
        return BASE + ["vrf"]

    # ------------------------------------------------------ presence flags
    def get_disable_host_validation(self) -> List[str]:
        return BASE + ["disable-host-validation"]

    def get_disable_password_authentication(self) -> List[str]:
        return BASE + ["disable-password-authentication"]

    # ------------------------------------------------------------- loglevel
    def get_loglevel(self, value: str) -> List[str]:
        return BASE + ["loglevel", value]

    def get_loglevel_delete(self) -> List[str]:
        return BASE + ["loglevel"]

    # ------------------------------------------- client-keepalive-interval
    def get_client_keepalive_interval(self, value: str) -> List[str]:
        return BASE + ["client-keepalive-interval", value]

    def get_client_keepalive_interval_delete(self) -> List[str]:
        return BASE + ["client-keepalive-interval"]

    # ----------------------------------------------------- cipher (multi)
    # Default (1.5) node name is "cipher"; overridden to "ciphers" on 1.4.
    def get_cipher(self, algo: str) -> List[str]:
        return BASE + ["cipher", algo]

    def get_cipher_delete(self, algo: str) -> List[str]:
        return BASE + ["cipher", algo]

    def get_all_ciphers_delete(self) -> List[str]:
        return BASE + ["cipher"]

    # --------------------------------------------------------- mac (multi)
    def get_mac(self, algo: str) -> List[str]:
        return BASE + ["mac", algo]

    def get_mac_delete(self, algo: str) -> List[str]:
        return BASE + ["mac", algo]

    def get_all_macs_delete(self) -> List[str]:
        return BASE + ["mac"]

    # ------------------------------------------------ key-exchange (multi)
    def get_key_exchange(self, algo: str) -> List[str]:
        return BASE + ["key-exchange", algo]

    def get_key_exchange_delete(self, algo: str) -> List[str]:
        return BASE + ["key-exchange", algo]

    def get_all_key_exchanges_delete(self) -> List[str]:
        return BASE + ["key-exchange"]

    # -------------------------------------------- hostkey-algorithm (multi)
    def get_hostkey_algorithm(self, algo: str) -> List[str]:
        return BASE + ["hostkey-algorithm", algo]

    def get_hostkey_algorithm_delete(self, algo: str) -> List[str]:
        return BASE + ["hostkey-algorithm", algo]

    def get_all_hostkey_algorithms_delete(self) -> List[str]:
        return BASE + ["hostkey-algorithm"]

    # ------------------------------------- pubkey-accepted-algorithm (multi)
    def get_pubkey_accepted_algorithm(self, algo: str) -> List[str]:
        return BASE + ["pubkey-accepted-algorithm", algo]

    def get_pubkey_accepted_algorithm_delete(self, algo: str) -> List[str]:
        return BASE + ["pubkey-accepted-algorithm", algo]

    def get_all_pubkey_accepted_algorithms_delete(self) -> List[str]:
        return BASE + ["pubkey-accepted-algorithm"]

    # ----------------------------------------------- trusted-user-ca (1.5)
    def get_trusted_user_ca(self, name: str) -> List[str]:
        return BASE + ["trusted-user-ca", name]

    def get_trusted_user_ca_delete(self) -> List[str]:
        return BASE + ["trusted-user-ca"]

    # ========================================================================
    # Access control
    # ========================================================================

    def get_access_control_allow_user(self, name: str) -> List[str]:
        return BASE + ["access-control", "allow", "user", name]

    def get_access_control_allow_user_delete(self, name: str) -> List[str]:
        return BASE + ["access-control", "allow", "user", name]

    def get_access_control_allow_group(self, name: str) -> List[str]:
        return BASE + ["access-control", "allow", "group", name]

    def get_access_control_allow_group_delete(self, name: str) -> List[str]:
        return BASE + ["access-control", "allow", "group", name]

    def get_access_control_deny_user(self, name: str) -> List[str]:
        return BASE + ["access-control", "deny", "user", name]

    def get_access_control_deny_user_delete(self, name: str) -> List[str]:
        return BASE + ["access-control", "deny", "user", name]

    def get_access_control_deny_group(self, name: str) -> List[str]:
        return BASE + ["access-control", "deny", "group", name]

    def get_access_control_deny_group_delete(self, name: str) -> List[str]:
        return BASE + ["access-control", "deny", "group", name]

    # ========================================================================
    # Dynamic protection
    # ========================================================================

    def get_dynamic_protection(self) -> List[str]:
        return BASE + ["dynamic-protection"]

    def get_dynamic_protection_delete(self) -> List[str]:
        return BASE + ["dynamic-protection"]

    def get_dynamic_protection_allow_from(self, value: str) -> List[str]:
        return BASE + ["dynamic-protection", "allow-from", value]

    def get_dynamic_protection_allow_from_delete(self, value: str) -> List[str]:
        return BASE + ["dynamic-protection", "allow-from", value]

    def get_all_dynamic_protection_allow_from_delete(self) -> List[str]:
        return BASE + ["dynamic-protection", "allow-from"]

    def get_dynamic_protection_block_time(self, value: str) -> List[str]:
        return BASE + ["dynamic-protection", "block-time", value]

    def get_dynamic_protection_block_time_delete(self) -> List[str]:
        return BASE + ["dynamic-protection", "block-time"]

    def get_dynamic_protection_detect_time(self, value: str) -> List[str]:
        return BASE + ["dynamic-protection", "detect-time", value]

    def get_dynamic_protection_detect_time_delete(self) -> List[str]:
        return BASE + ["dynamic-protection", "detect-time"]

    def get_dynamic_protection_threshold(self, value: str) -> List[str]:
        return BASE + ["dynamic-protection", "threshold", value]

    def get_dynamic_protection_threshold_delete(self) -> List[str]:
        return BASE + ["dynamic-protection", "threshold"]

    # ========================================================================
    # FIDO (1.5)
    # ========================================================================

    def get_fido_pin_required(self) -> List[str]:
        return BASE + ["fido", "pin-required"]

    def get_fido_touch_required(self) -> List[str]:
        return BASE + ["fido", "touch-required"]

    # ========================================================================
    # Rekey
    # ========================================================================

    def get_rekey_data(self, value: str) -> List[str]:
        return BASE + ["rekey", "data", value]

    def get_rekey_data_delete(self) -> List[str]:
        return BASE + ["rekey", "data"]

    def get_rekey_time(self, value: str) -> List[str]:
        return BASE + ["rekey", "time", value]

    def get_rekey_time_delete(self) -> List[str]:
        return BASE + ["rekey", "time"]
