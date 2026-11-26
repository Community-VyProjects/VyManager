"""Prefix List Batch Builder.

Provides all batch operations for ``policy prefix-list`` (list type ipv4) and
``policy prefix-list6`` (list type ipv6). The templates are the same on VyOS
1.4 and 1.5. A list name outside the lab regex, a rule number, ge or le
outside the lab range, a prefix the lab validator rejects (host bits set,
zone index, a dotted IPv4 tail in an IPv6 prefix), an action outside permit/deny, or a description over 255
characters raises ValueError before the op is queued.
"""

import ipaddress
import re
from typing import Any, Dict, cast

from vyos_builders.base import BatchBuilder
from vyos_mappers import CommandMapperRegistry
from vyos_mappers.prefix_list.prefix_list import PrefixListMapper

# Lab syntax bounds (the same on 1.4 and 1.5).
RANGES: Dict[str, Dict[str, int]] = {
    "rule": {"min": 1, "max": 65535},
    # ge / le of a prefix-list (ipv4) and a prefix-list6 (ipv6) rule.
    "prefix_length_ipv4": {"min": 0, "max": 32},
    "prefix_length_ipv6": {"min": 0, "max": 128},
}
DESCRIPTION_MAX_LENGTH = 255

# Lab tag regex of a prefix-list / prefix-list6 name.
_NAME = re.compile(r"[-_a-zA-Z0-9]+", re.ASCII)
# ASCII: a Unicode digit is not a number the lab takes.
_DECIMAL = re.compile(r"\d{1,6}", re.ASCII)
# Prefix length as the lab takes it: no leading zero (/016 is rejected).
_PREFIX_LENGTH = re.compile(r"0|[1-9]\d{0,2}", re.ASCII)


def _name(value: str) -> str:
    if not _NAME.fullmatch(value):
        raise ValueError("prefix-list name may only contain letters, digits, hyphen and underscore")
    return value


def _number(key: str, label: str, value: str) -> str:
    bounds = RANGES[key]
    if not _DECIMAL.fullmatch(value) or not bounds["min"] <= int(value) <= bounds["max"]:
        raise ValueError(f"{label} must be a number from {bounds['min']} to {bounds['max']}")
    return value


def _length_key(list_type: str) -> str:
    return "prefix_length_ipv6" if list_type == "ipv6" else "prefix_length_ipv4"


def _prefix(list_type: str, value: str) -> str:
    """A network prefix of the list's family with no host bits set."""
    family = "IPv6" if list_type == "ipv6" else "IPv4"
    try:
        address, sep, length = value.partition("/")
        if not sep or "%" in address or not _PREFIX_LENGTH.fullmatch(length):
            raise ValueError
        # The lab ipv6-prefix validator rejects a dotted IPv4 tail
        # (::ffff:10.0.0.0/104); the hex form ::ffff:a00:0/104 is valid.
        if list_type == "ipv6" and "." in address:
            raise ValueError
        if list_type == "ipv6":
            ipaddress.IPv6Network(value, strict=True)
        else:
            ipaddress.IPv4Network(value, strict=True)
    except ValueError:
        raise ValueError(f"prefix must be an {family} prefix with no host bits set") from None
    return value


def _description(value: str) -> str:
    # Lab regex `.{0,255}`: `.` takes no line break.
    if len(value) > DESCRIPTION_MAX_LENGTH or "\n" in value or "\r" in value:
        raise ValueError(f"description must be one line of at most {DESCRIPTION_MAX_LENGTH} characters")
    return value


class PrefixListBatchBuilder(BatchBuilder):
    """Complete batch builder for prefix-list operations."""

    # Not a batch op: reorder calls it with a raw config subtree.
    _INTERNAL_BUILDER_METHODS = frozenset({"restore_rule"})

    def __init__(self, version: str):
        super().__init__(version)
        self.mapper_key = "prefix_list"
        self.mappers = {self.mapper_key: CommandMapperRegistry.get_mapper(self.mapper_key, version)}

    def _mapper(self) -> PrefixListMapper:
        return cast(PrefixListMapper, self.mappers[self.mapper_key])

    def _list(self, list_type: str, name: str) -> PrefixListMapper:
        mapper = self._mapper()
        mapper.get_prefix_list_path(list_type, name)
        _name(name)
        return mapper

    def _rule(self, list_type: str, name: str, rule: str) -> PrefixListMapper:
        mapper = self._list(list_type, name)
        _number("rule", "rule", rule)
        return mapper

    # ========================================================================
    # List
    # ========================================================================

    def create_prefix_list(self, list_type: str, name: str) -> "PrefixListBatchBuilder":
        return self.add_set(self._list(list_type, name).get_prefix_list_path(list_type, name))

    def delete_prefix_list(self, list_type: str, name: str) -> "PrefixListBatchBuilder":
        return self.add_delete(self._list(list_type, name).get_prefix_list_path(list_type, name))

    def set_prefix_list_description(self, list_type: str, name: str, value: str) -> "PrefixListBatchBuilder":
        mapper = self._list(list_type, name)
        return self.add_set(mapper.get_prefix_list_description(list_type, name, _description(value)))

    def delete_prefix_list_description(self, list_type: str, name: str) -> "PrefixListBatchBuilder":
        return self.add_delete(self._list(list_type, name).get_prefix_list_description_path(list_type, name))

    # ========================================================================
    # Rule
    # ========================================================================

    def create_rule(self, list_type: str, name: str, rule: str) -> "PrefixListBatchBuilder":
        return self.add_set(self._rule(list_type, name, rule).get_rule_path(list_type, name, rule))

    def delete_rule(self, list_type: str, name: str, rule: str) -> "PrefixListBatchBuilder":
        return self.add_delete(self._rule(list_type, name, rule).get_rule_path(list_type, name, rule))

    def restore_rule(self, list_type: str, name: str, rule: str, tree: Any) -> "PrefixListBatchBuilder":
        """Recreate a rule under a new number from its config subtree (reorder)."""
        for path in self._rule(list_type, name, rule).rule_tree_paths(list_type, name, rule, tree):
            self.add_set(path)
        return self

    # Rule leaves. action and prefix are required by the lab verify, so they
    # have no delete op: an edit replaces them with a set.

    def set_rule_action(self, list_type: str, name: str, rule: str, value: str) -> "PrefixListBatchBuilder":
        mapper = self._rule(list_type, name, rule)
        if value not in mapper.rule_action_values():
            raise ValueError("action must be permit or deny")
        return self.add_set(mapper.get_rule_action(list_type, name, rule, value))

    def set_rule_description(self, list_type: str, name: str, rule: str, value: str) -> "PrefixListBatchBuilder":
        mapper = self._rule(list_type, name, rule)
        return self.add_set(mapper.get_rule_description(list_type, name, rule, _description(value)))

    def delete_rule_description(self, list_type: str, name: str, rule: str) -> "PrefixListBatchBuilder":
        return self.add_delete(self._rule(list_type, name, rule).get_rule_description_path(list_type, name, rule))

    def set_rule_prefix(self, list_type: str, name: str, rule: str, value: str) -> "PrefixListBatchBuilder":
        mapper = self._rule(list_type, name, rule)
        return self.add_set(mapper.get_rule_prefix(list_type, name, rule, _prefix(list_type, value)))

    def set_rule_ge(self, list_type: str, name: str, rule: str, value: str) -> "PrefixListBatchBuilder":
        mapper = self._rule(list_type, name, rule)
        return self.add_set(mapper.get_rule_ge(list_type, name, rule, _number(_length_key(list_type), "ge", value)))

    def delete_rule_ge(self, list_type: str, name: str, rule: str) -> "PrefixListBatchBuilder":
        return self.add_delete(self._rule(list_type, name, rule).get_rule_ge_path(list_type, name, rule))

    def set_rule_le(self, list_type: str, name: str, rule: str, value: str) -> "PrefixListBatchBuilder":
        mapper = self._rule(list_type, name, rule)
        return self.add_set(mapper.get_rule_le(list_type, name, rule, _number(_length_key(list_type), "le", value)))

    def delete_rule_le(self, list_type: str, name: str, rule: str) -> "PrefixListBatchBuilder":
        return self.add_delete(self._rule(list_type, name, rule).get_rule_le_path(list_type, name, rule))

    # ========================================================================
    # Capabilities
    # ========================================================================

    def get_capabilities(self) -> Dict[str, Any]:
        return {
            "version": self.version,
            "features": {
                "ipv4_prefix_lists": {"supported": True},
                "ipv6_prefix_lists": {"supported": True},
            },
            "values": {"rule_actions": list(self._mapper().rule_action_values())},
            "ranges": RANGES,
            "description_max_length": DESCRIPTION_MAX_LENGTH,
        }
