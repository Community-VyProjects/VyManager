"""IPv4 firewall mapper. Implementation lives in family.py."""

from .family import FirewallFamilyMapper


class FirewallIPv4Mapper(FirewallFamilyMapper):
    def __init__(self, version: str):
        super().__init__(version, "ipv4")
