"""NAT66 mapper for VyOS 1.5.

VyOS 1.5 adds firewall group references on source and destination rules:
  source rule <num> source group {address-group,domain-group,mac-group,network-group,port-group}
  source rule <num> destination group {address-group,domain-group,mac-group,network-group,port-group}
  destination rule <num> source group {address-group,domain-group,mac-group,network-group,port-group}
  destination rule <num> destination group {address-group,domain-group,mac-group,network-group,port-group}
"""
from typing import List
from ..nat66 import NAT66Mapper


GROUP_TYPES = ["address-group", "domain-group", "mac-group", "network-group", "port-group"]


class NAT66Mapper_v1_5(NAT66Mapper):

    # ==================== Source rule - source groups ====================

    def get_source_rule_source_group(self, rule_number: int, group_type: str, value: str) -> List[str]:
        return ["nat66", "source", "rule", str(rule_number), "source", "group", group_type, value]

    def get_source_rule_source_group_path(self, rule_number: int, group_type: str) -> List[str]:
        return ["nat66", "source", "rule", str(rule_number), "source", "group", group_type]

    # ==================== Source rule - destination groups ====================

    def get_source_rule_destination_group(self, rule_number: int, group_type: str, value: str) -> List[str]:
        return ["nat66", "source", "rule", str(rule_number), "destination", "group", group_type, value]

    def get_source_rule_destination_group_path(self, rule_number: int, group_type: str) -> List[str]:
        return ["nat66", "source", "rule", str(rule_number), "destination", "group", group_type]

    # ==================== Destination rule - source groups ====================

    def get_destination_rule_source_group(self, rule_number: int, group_type: str, value: str) -> List[str]:
        return ["nat66", "destination", "rule", str(rule_number), "source", "group", group_type, value]

    def get_destination_rule_source_group_path(self, rule_number: int, group_type: str) -> List[str]:
        return ["nat66", "destination", "rule", str(rule_number), "source", "group", group_type]

    # ==================== Destination rule - destination groups ====================

    def get_destination_rule_destination_group(self, rule_number: int, group_type: str, value: str) -> List[str]:
        return ["nat66", "destination", "rule", str(rule_number), "destination", "group", group_type, value]

    def get_destination_rule_destination_group_path(self, rule_number: int, group_type: str) -> List[str]:
        return ["nat66", "destination", "rule", str(rule_number), "destination", "group", group_type]
