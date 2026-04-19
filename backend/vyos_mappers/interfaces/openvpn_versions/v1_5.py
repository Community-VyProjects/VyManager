"""
OpenVPN Interface Mapper - VyOS 1.5

Uses `encryption/data-ciphers` for the negotiation list and adds
`encryption/data-ciphers-fallback` plus `ipv6/address/interface-identifier`.
"""

from typing import List
from ..openvpn import OpenvpnInterfaceMapper


class OpenvpnMapper_v1_5(OpenvpnInterfaceMapper):
    """VyOS 1.5 OpenVPN interface mapper."""

    def __init__(self, version: str):
        super().__init__(version)

    # --- Data cipher negotiation (1.5 syntax: data-ciphers) ---
    def get_encryption_data_cipher(self, interface: str, cipher: str) -> List[str]:
        return self._base(interface) + ["encryption", "data-ciphers", cipher]

    def get_encryption_data_ciphers_path(self, interface: str) -> List[str]:
        return self._base(interface) + ["encryption", "data-ciphers"]

    def get_encryption_data_ciphers_fallback(self, interface: str, cipher: str) -> List[str]:
        return self._base(interface) + ["encryption", "data-ciphers-fallback", cipher]

    def get_encryption_data_ciphers_fallback_path(self, interface: str) -> List[str]:
        return self._base(interface) + ["encryption", "data-ciphers-fallback"]

    # --- IPv6 interface-identifier (1.5 only) ---
    def get_ipv6_address_interface_identifier(self, interface: str, identifier: str) -> List[str]:
        return self._base(interface) + ["ipv6", "address", "interface-identifier", identifier]

    def get_ipv6_address_interface_identifier_path(self, interface: str) -> List[str]:
        return self._base(interface) + ["ipv6", "address", "interface-identifier"]
