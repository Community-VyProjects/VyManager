"""Policy list mapper parameterized by community-list family."""

from typing import List, Tuple

POLICY_LIST_KINDS: Tuple[str, ...] = (
    "community-list",
    "extcommunity-list",
    "large-community-list",
)

KIND_SPEC = {
    "community-list": {
        "ident": "community_list",
        "lists_field": "community_lists",
        "name_field": "community_list_name",
        "label": "community list",
    },
    "extcommunity-list": {
        "ident": "extcommunity_list",
        "lists_field": "extcommunity_lists",
        "name_field": "extcommunity_list_name",
        "label": "extcommunity list",
    },
    "large-community-list": {
        "ident": "large_community_list",
        "lists_field": "large_community_lists",
        "name_field": "large_community_list_name",
        "label": "large community list",
    },
}


class PolicyListMapper:
    """Mapper for policy community-list families (identical on 1.4 and 1.5)."""

    def __init__(self, version: str, kind: str):
        if kind not in POLICY_LIST_KINDS:
            raise ValueError(f"unsupported policy list kind: {kind}")
        self.version = version
        self.kind = kind

    def _path(self, *parts: str) -> List[str]:
        return ["policy", self.kind, *parts]

    def get_list(self, name: str) -> List[str]:
        return self._path(name)

    def get_list_path(self, name: str) -> List[str]:
        return self._path(name)

    def get_list_description(self, name: str, description: str) -> List[str]:
        return self._path(name, "description", description)

    def get_list_description_path(self, name: str) -> List[str]:
        return self._path(name, "description")

    def get_rule(self, name: str, rule: str) -> List[str]:
        return self._path(name, "rule", rule)

    def get_rule_path(self, name: str, rule: str) -> List[str]:
        return self._path(name, "rule", rule)

    def get_rule_action(self, name: str, rule: str, action: str) -> List[str]:
        return self._path(name, "rule", rule, "action", action)

    def get_rule_description(self, name: str, rule: str, description: str) -> List[str]:
        return self._path(name, "rule", rule, "description", description)

    def get_rule_description_path(self, name: str, rule: str) -> List[str]:
        return self._path(name, "rule", rule, "description")

    def get_rule_regex(self, name: str, rule: str, regex: str) -> List[str]:
        return self._path(name, "rule", rule, "regex", regex)

    def get_rule_regex_path(self, name: str, rule: str) -> List[str]:
        return self._path(name, "rule", rule, "regex")

    # Names the copied mappers used; batch getattr still hits these.
    def get_community_list(self, name: str) -> List[str]:
        return self.get_list(name)

    def get_community_list_path(self, name: str) -> List[str]:
        return self.get_list_path(name)

    def get_community_list_description(self, name: str, description: str) -> List[str]:
        return self.get_list_description(name, description)

    def get_community_list_description_path(self, name: str) -> List[str]:
        return self.get_list_description_path(name)

    def get_extcommunity_list(self, name: str) -> List[str]:
        return self.get_list(name)

    def get_extcommunity_list_path(self, name: str) -> List[str]:
        return self.get_list_path(name)

    def get_extcommunity_list_description(self, name: str, description: str) -> List[str]:
        return self.get_list_description(name, description)

    def get_extcommunity_list_description_path(self, name: str) -> List[str]:
        return self.get_list_description_path(name)

    def get_large_community_list(self, name: str) -> List[str]:
        return self.get_list(name)

    def get_large_community_list_path(self, name: str) -> List[str]:
        return self.get_list_path(name)

    def get_large_community_list_description(self, name: str, description: str) -> List[str]:
        return self.get_list_description(name, description)

    def get_large_community_list_description_path(self, name: str) -> List[str]:
        return self.get_list_description_path(name)
