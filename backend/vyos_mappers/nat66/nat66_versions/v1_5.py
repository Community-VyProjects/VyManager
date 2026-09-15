"""NAT66 mapper for VyOS 1.5.

VyOS 1.5 accepts firewall group references on destination match only:
  source rule <num> destination group {address-group,domain-group,mac-group,network-group,port-group}
  destination rule <num> destination group {address-group,domain-group,mac-group,network-group,port-group}

Source match groups are invalid on 1.4 and 1.5.
"""
from typing import List
from ..nat66 import NAT66Mapper


class NAT66Mapper_v1_5(NAT66Mapper):

    # ==================== Source rule - destination groups ====================

    def get_source_rule_destination_group(self, rule_number: int, group_type: str, value: str) -> List[str]:
        return ["nat66", "source", "rule", str(rule_number), "destination", "group", group_type, value]

    def get_source_rule_destination_group_path(self, rule_number: int, group_type: str) -> List[str]:
        return ["nat66", "source", "rule", str(rule_number), "destination", "group", group_type]

    # ==================== Destination rule - destination groups ====================

    def get_destination_rule_destination_group(self, rule_number: int, group_type: str, value: str) -> List[str]:
        return ["nat66", "destination", "rule", str(rule_number), "destination", "group", group_type, value]

    def get_destination_rule_destination_group_path(self, rule_number: int, group_type: str) -> List[str]:
        return ["nat66", "destination", "rule", str(rule_number), "destination", "group", group_type]
