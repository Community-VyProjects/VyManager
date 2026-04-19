"""
OpenVPN Interface Mapper - VyOS 1.4

Uses `encryption/ncp-ciphers` for the data-cipher negotiation list.
No `data-ciphers-fallback` and no `ipv6/address/interface-identifier`.
"""

from typing import List
from ..openvpn import OpenvpnInterfaceMapper


class OpenvpnMapper_v1_4(OpenvpnInterfaceMapper):
    """VyOS 1.4 OpenVPN interface mapper."""

    def __init__(self, version: str):
        super().__init__(version)

    # --- Data cipher negotiation (1.4 syntax: ncp-ciphers) ---
    def get_encryption_data_cipher(self, interface: str, cipher: str) -> List[str]:
        return self._base(interface) + ["encryption", "ncp-ciphers", cipher]

    def get_encryption_data_ciphers_path(self, interface: str) -> List[str]:
        return self._base(interface) + ["encryption", "ncp-ciphers"]
