"""IPv6 firewall batch builder. Implementation lives in family.py."""

from .family import FirewallFamilyBatchBuilder


class FirewallIPv6BatchBuilder(FirewallFamilyBatchBuilder):
    def __init__(self, version: str):
        super().__init__(version, "ipv6")
