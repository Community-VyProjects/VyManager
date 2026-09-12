"""IPv4 firewall batch builder. Implementation lives in family.py."""

from .family import FirewallFamilyBatchBuilder


class FirewallIPv4BatchBuilder(FirewallFamilyBatchBuilder):
    def __init__(self, version: str):
        super().__init__(version, "ipv4")
