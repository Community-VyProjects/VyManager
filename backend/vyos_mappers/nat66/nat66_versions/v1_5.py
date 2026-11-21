"""VyOS 1.5 NAT66 mapper.

``source group`` and ``destination group`` exist only on 1.5, on source and
destination rules alike (address-group, domain-group, mac-group,
network-group, port-group). Path methods do not re-check the node: the
builder already called ``require_node``.
"""
from typing import List

from ..nat66 import NAT66Mapper


class NAT66MapperV1_5(NAT66Mapper):
    """VyOS 1.5 NAT66 mapper with firewall group matches."""

    def group_types(self) -> List[str]:
        return ["address-group", "domain-group", "mac-group", "network-group", "port-group"]

    # ==================== Source rule - groups ====================

    def get_source_rule_source_group(self, rule_number: int, group_type: str, value: str) -> List[str]:
        return ["nat66", "source", "rule", str(rule_number), "source", "group", group_type, value]

    def get_source_rule_source_group_path(self, rule_number: int, group_type: str) -> List[str]:
        return ["nat66", "source", "rule", str(rule_number), "source", "group", group_type]

    def get_source_rule_destination_group(self, rule_number: int, group_type: str, value: str) -> List[str]:
        return ["nat66", "source", "rule", str(rule_number), "destination", "group", group_type, value]

    def get_source_rule_destination_group_path(self, rule_number: int, group_type: str) -> List[str]:
        return ["nat66", "source", "rule", str(rule_number), "destination", "group", group_type]

    # ==================== Destination rule - groups ====================

    def get_destination_rule_source_group(self, rule_number: int, group_type: str, value: str) -> List[str]:
        return ["nat66", "destination", "rule", str(rule_number), "source", "group", group_type, value]

    def get_destination_rule_source_group_path(self, rule_number: int, group_type: str) -> List[str]:
        return ["nat66", "destination", "rule", str(rule_number), "source", "group", group_type]

    def get_destination_rule_destination_group(self, rule_number: int, group_type: str, value: str) -> List[str]:
        return ["nat66", "destination", "rule", str(rule_number), "destination", "group", group_type, value]

    def get_destination_rule_destination_group_path(self, rule_number: int, group_type: str) -> List[str]:
        return ["nat66", "destination", "rule", str(rule_number), "destination", "group", group_type]
