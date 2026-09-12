"""Policy list batch builder parameterized by community-list family."""

from typing import Any, Dict

from vyos_builders.base import BatchBuilder
from vyos_mappers.policy_list import KIND_SPEC, POLICY_LIST_KINDS, PolicyListMapper


class PolicyListBatchBuilder(BatchBuilder):
    """Batch builder for policy community-list families."""

    def __init__(self, version: str, kind: str):
        if kind not in POLICY_LIST_KINDS:
            raise ValueError(f"unsupported policy list kind: {kind}")
        super().__init__(version)
        self.kind = kind
        self.ident = KIND_SPEC[kind]["ident"]
        self.mapper = PolicyListMapper(version, kind)
        ident = self.ident
        setattr(self, f"set_{ident}", self.set_list)
        setattr(self, f"delete_{ident}", self.delete_list)
        setattr(self, f"set_{ident}_description", self.set_list_description)
        setattr(self, f"delete_{ident}_description", self.delete_list_description)

    def clear(self) -> None:
        self._operations = []

    def operation_count(self) -> int:
        return len(self._operations)

    def set_list(self, name: str) -> "PolicyListBatchBuilder":
        return self.add_set(self.mapper.get_list(name))

    def delete_list(self, name: str) -> "PolicyListBatchBuilder":
        return self.add_delete(self.mapper.get_list_path(name))

    def set_list_description(self, name: str, description: str) -> "PolicyListBatchBuilder":
        return self.add_set(self.mapper.get_list_description(name, description))

    def delete_list_description(self, name: str) -> "PolicyListBatchBuilder":
        return self.add_delete(self.mapper.get_list_description_path(name))

    def set_rule(self, name: str, rule: str) -> "PolicyListBatchBuilder":
        return self.add_set(self.mapper.get_rule(name, rule))

    def delete_rule(self, name: str, rule: str) -> "PolicyListBatchBuilder":
        return self.add_delete(self.mapper.get_rule_path(name, rule))

    def set_rule_action(self, name: str, rule: str, action: str) -> "PolicyListBatchBuilder":
        return self.add_set(self.mapper.get_rule_action(name, rule, action))

    def set_rule_description(self, name: str, rule: str, description: str) -> "PolicyListBatchBuilder":
        return self.add_set(self.mapper.get_rule_description(name, rule, description))

    def delete_rule_description(self, name: str, rule: str) -> "PolicyListBatchBuilder":
        return self.add_delete(self.mapper.get_rule_description_path(name, rule))

    def set_rule_regex(self, name: str, rule: str, regex: str) -> "PolicyListBatchBuilder":
        return self.add_set(self.mapper.get_rule_regex(name, rule, regex))

    def delete_rule_regex(self, name: str, rule: str) -> "PolicyListBatchBuilder":
        return self.add_delete(self.mapper.get_rule_regex_path(name, rule))

    def get_capabilities(self) -> Dict[str, Any]:
        return {
            "version": self.version,
            "features": {
                "basic": {
                    "supported": True,
                    "description": f"Basic {self.kind} configuration",
                },
                "rules": {
                    "supported": True,
                    "description": "Rule-based filtering with permit/deny actions",
                },
                "actions": {
                    "supported": True,
                    "description": "Permit and deny actions for rules",
                },
            },
            "version_notes": {
                "identical_versions": "Commands are identical between VyOS 1.4 and 1.5",
            },
        }
