"""IPv6 firewall mapper. Implementation lives in family.py."""

from .family import FirewallFamilyMapper


class FirewallIPv6Mapper(FirewallFamilyMapper):
    def __init__(self, version: str):
        super().__init__(version, "ipv6")
