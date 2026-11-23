"""IPv6 firewall batch builder. Implementation lives in family_batch_builder.py."""

from .family_batch_builder import FirewallFamilyBatchBuilder


class FirewallIPv6BatchBuilder(FirewallFamilyBatchBuilder):
    def __init__(self, version: str):
        super().__init__(version, "ipv6")
