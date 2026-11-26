"""Access List Batch Builder.

Provides all batch operations for ``policy access-list`` (list type ipv4) and
``policy access-list6`` (list type ipv6). The templates are the same on VyOS
1.4 and 1.5. An IPv4 list number that is not a u32 (the lab verify calls
int() on it), an IPv6 list name with whitespace, a rule number outside the lab
range, an address or prefix the lab validator rejects, an action outside
permit/deny, a description over 255 characters, or a leaf the list type does
not have (access-list6 has no destination, host or inverse-mask) raises
ValueError before the op is queued.
"""

import ipaddress
import re
from typing import Any, Dict, cast

from vyos_builders.base import BatchBuilder
from vyos_mappers import CommandMapperRegistry
from vyos_mappers.access_list.access_list import AccessListMapper

# Lab syntax bounds (the same on 1.4 and 1.5).
RANGES: Dict[str, Dict[str, int]] = {
    "rule": {"min": 1, "max": 65535},
    # IPv4 list number: u32 tag.
    "ipv4_list": {"min": 0, "max": 4294967295},
}
DESCRIPTION_MAX_LENGTH = 255

# ASCII: a Unicode digit is not a number the lab takes.
_DECIMAL = re.compile(r"\d{1,10}", re.ASCII)
# Prefix length as the lab takes it: no leading zero.
_PREFIX_LENGTH = re.compile(r"0|[1-9]\d{0,2}", re.ASCII)


def _number(key: str, label: str, value: str) -> str:
    bounds = RANGES[key]
    if not _DECIMAL.fullmatch(value) or not bounds["min"] <= int(value) <= bounds["max"]:
        raise ValueError(f"{label} must be a number from {bounds['min']} to {bounds['max']}")
    return value


def _name(list_type: str, value: str) -> str:
    if list_type == "ipv4":
        return _number("ipv4_list", "access-list number", value)
    # access-list6 is a free txt tag; whitespace splits the FRR command.
    if not value or any(ch.isspace() for ch in value):
        raise ValueError("access-list6 name must not be empty or contain whitespace")
    return value


def _ipv4_address(value: str) -> str:
    try:
        ipaddress.IPv4Address(value)
    except ValueError:
        raise ValueError("address must be an IPv4 address") from None
    return value


def _ipv6_prefix(value: str) -> str:
    """An IPv6 prefix with no host bits set, as the lab ipv6-prefix validator takes it."""
    try:
        address, sep, length = value.partition("/")
        # No zone index, and no dotted IPv4 tail (::ffff:10.0.0.0/104 is
        # rejected; the hex form ::ffff:a00:0/104 is valid).
        if not sep or "%" in address or "." in address or not _PREFIX_LENGTH.fullmatch(length):
            raise ValueError
        ipaddress.IPv6Network(value, strict=True)
    except ValueError:
        raise ValueError("network must be an IPv6 prefix with no host bits set") from None
    return value


def _description(value: str) -> str:
    # Lab regex `.{0,255}`: `.` takes no line break.
    if len(value) > DESCRIPTION_MAX_LENGTH or "\n" in value or "\r" in value:
        raise ValueError(f"description must be one line of at most {DESCRIPTION_MAX_LENGTH} characters")
    return value


class AccessListBatchBuilder(BatchBuilder):
    """Complete batch builder for access-list operations."""

    # Not a batch op: reorder calls it with a raw config subtree.
    _INTERNAL_BUILDER_METHODS = frozenset({"restore_rule"})

    def __init__(self, version: str):
        super().__init__(version)
        self.mapper_key = "access_list"
        self.mappers = {self.mapper_key: CommandMapperRegistry.get_mapper(self.mapper_key, version)}

    def _mapper(self) -> AccessListMapper:
        return cast(AccessListMapper, self.mappers[self.mapper_key])

    def _list(self, list_type: str, name: str) -> AccessListMapper:
        mapper = self._mapper()
        mapper.get_access_list_path(list_type, name)
        _name(list_type, name)
        return mapper

    def _rule(self, list_type: str, name: str, rule: str) -> AccessListMapper:
        mapper = self._list(list_type, name)
        _number("rule", "rule", rule)
        return mapper

    def _set_leaf(self, list_type: str, name: str, rule: str, endpoint: str, leaf: str) -> "AccessListBatchBuilder":
        mapper = self._rule(list_type, name, rule)
        return self.add_set(mapper.get_rule_endpoint_leaf_path(list_type, name, rule, endpoint, leaf))

    def _set_value(
        self, list_type: str, name: str, rule: str, endpoint: str, leaf: str, value: str
    ) -> "AccessListBatchBuilder":
        mapper = self._rule(list_type, name, rule)
        path = mapper.get_rule_endpoint_leaf_path(list_type, name, rule, endpoint, leaf)
        if leaf == "network" and list_type == "ipv6":
            value = _ipv6_prefix(value)
        else:
            value = _ipv4_address(value)
        return self.add_set(path + [value])

    def _delete_leaf(self, list_type: str, name: str, rule: str, endpoint: str, leaf: str) -> "AccessListBatchBuilder":
        mapper = self._rule(list_type, name, rule)
        return self.add_delete(mapper.get_rule_endpoint_leaf_path(list_type, name, rule, endpoint, leaf))

    # ========================================================================
    # List
    # ========================================================================

    def create_access_list(self, list_type: str, name: str) -> "AccessListBatchBuilder":
        return self.add_set(self._list(list_type, name).get_access_list_path(list_type, name))

    def delete_access_list(self, list_type: str, name: str) -> "AccessListBatchBuilder":
        return self.add_delete(self._list(list_type, name).get_access_list_path(list_type, name))

    def set_access_list_description(self, list_type: str, name: str, value: str) -> "AccessListBatchBuilder":
        mapper = self._list(list_type, name)
        return self.add_set(mapper.get_access_list_description(list_type, name, _description(value)))

    def delete_access_list_description(self, list_type: str, name: str) -> "AccessListBatchBuilder":
        return self.add_delete(self._list(list_type, name).get_access_list_description_path(list_type, name))

    # ========================================================================
    # Rule
    # ========================================================================

    def create_rule(self, list_type: str, name: str, rule: str) -> "AccessListBatchBuilder":
        return self.add_set(self._rule(list_type, name, rule).get_rule_path(list_type, name, rule))

    def delete_rule(self, list_type: str, name: str, rule: str) -> "AccessListBatchBuilder":
        return self.add_delete(self._rule(list_type, name, rule).get_rule_path(list_type, name, rule))

    def restore_rule(self, list_type: str, name: str, rule: str, tree: Any) -> "AccessListBatchBuilder":
        """Recreate a rule under a new number from its config subtree (reorder)."""
        for path in self._rule(list_type, name, rule).rule_tree_paths(list_type, name, rule, tree):
            self.add_set(path)
        return self

    # action and source are required by the lab verify, so they have no
    # delete op: an edit replaces the action with a set and switches the
    # source leaves in one batch.

    def set_rule_action(self, list_type: str, name: str, rule: str, value: str) -> "AccessListBatchBuilder":
        mapper = self._rule(list_type, name, rule)
        if value not in mapper.rule_action_values():
            raise ValueError("action must be permit or deny")
        return self.add_set(mapper.get_rule_action(list_type, name, rule, value))

    def set_rule_description(self, list_type: str, name: str, rule: str, value: str) -> "AccessListBatchBuilder":
        mapper = self._rule(list_type, name, rule)
        return self.add_set(mapper.get_rule_description(list_type, name, rule, _description(value)))

    def delete_rule_description(self, list_type: str, name: str, rule: str) -> "AccessListBatchBuilder":
        return self.add_delete(self._rule(list_type, name, rule).get_rule_description_path(list_type, name, rule))

    # ========================================================================
    # Rule source
    # ========================================================================

    def set_rule_source_any(self, list_type: str, name: str, rule: str) -> "AccessListBatchBuilder":
        return self._set_leaf(list_type, name, rule, "source", "any")

    def delete_rule_source_any(self, list_type: str, name: str, rule: str) -> "AccessListBatchBuilder":
        return self._delete_leaf(list_type, name, rule, "source", "any")

    def set_rule_source_host(self, list_type: str, name: str, rule: str, value: str) -> "AccessListBatchBuilder":
        return self._set_value(list_type, name, rule, "source", "host", value)

    def delete_rule_source_host(self, list_type: str, name: str, rule: str) -> "AccessListBatchBuilder":
        return self._delete_leaf(list_type, name, rule, "source", "host")

    def set_rule_source_network(self, list_type: str, name: str, rule: str, value: str) -> "AccessListBatchBuilder":
        return self._set_value(list_type, name, rule, "source", "network", value)

    def delete_rule_source_network(self, list_type: str, name: str, rule: str) -> "AccessListBatchBuilder":
        return self._delete_leaf(list_type, name, rule, "source", "network")

    def set_rule_source_inverse_mask(
        self, list_type: str, name: str, rule: str, value: str
    ) -> "AccessListBatchBuilder":
        return self._set_value(list_type, name, rule, "source", "inverse-mask", value)

    def delete_rule_source_inverse_mask(self, list_type: str, name: str, rule: str) -> "AccessListBatchBuilder":
        return self._delete_leaf(list_type, name, rule, "source", "inverse-mask")

    def set_rule_source_exact_match(self, list_type: str, name: str, rule: str) -> "AccessListBatchBuilder":
        return self._set_leaf(list_type, name, rule, "source", "exact-match")

    def delete_rule_source_exact_match(self, list_type: str, name: str, rule: str) -> "AccessListBatchBuilder":
        return self._delete_leaf(list_type, name, rule, "source", "exact-match")

    # ========================================================================
    # Rule destination (ipv4 only)
    # ========================================================================

    def delete_rule_destination(self, list_type: str, name: str, rule: str) -> "AccessListBatchBuilder":
        """Clear a standard list's destination (an extended list requires one)."""
        mapper = self._rule(list_type, name, rule)
        return self.add_delete(mapper.get_rule_endpoint_path(list_type, name, rule, "destination"))

    def set_rule_destination_any(self, list_type: str, name: str, rule: str) -> "AccessListBatchBuilder":
        return self._set_leaf(list_type, name, rule, "destination", "any")

    def delete_rule_destination_any(self, list_type: str, name: str, rule: str) -> "AccessListBatchBuilder":
        return self._delete_leaf(list_type, name, rule, "destination", "any")

    def set_rule_destination_host(
        self, list_type: str, name: str, rule: str, value: str
    ) -> "AccessListBatchBuilder":
        return self._set_value(list_type, name, rule, "destination", "host", value)

    def delete_rule_destination_host(self, list_type: str, name: str, rule: str) -> "AccessListBatchBuilder":
        return self._delete_leaf(list_type, name, rule, "destination", "host")

    def set_rule_destination_network(
        self, list_type: str, name: str, rule: str, value: str
    ) -> "AccessListBatchBuilder":
        return self._set_value(list_type, name, rule, "destination", "network", value)

    def delete_rule_destination_network(self, list_type: str, name: str, rule: str) -> "AccessListBatchBuilder":
        return self._delete_leaf(list_type, name, rule, "destination", "network")

    def set_rule_destination_inverse_mask(
        self, list_type: str, name: str, rule: str, value: str
    ) -> "AccessListBatchBuilder":
        return self._set_value(list_type, name, rule, "destination", "inverse-mask", value)

    def delete_rule_destination_inverse_mask(
        self, list_type: str, name: str, rule: str
    ) -> "AccessListBatchBuilder":
        return self._delete_leaf(list_type, name, rule, "destination", "inverse-mask")

    # ========================================================================
    # Capabilities
    # ========================================================================

    def get_capabilities(self) -> Dict[str, Any]:
        mapper = self._mapper()
        return {
            "version": self.version,
            "features": {
                "ipv4_access_lists": {"supported": True},
                "ipv6_access_lists": {"supported": True},
            },
            "values": {"rule_actions": list(mapper.rule_action_values())},
            "ranges": RANGES,
            # IPv4 list numbers whose rules need a destination.
            "extended_ranges": [{"min": low, "max": high} for low, high in mapper.extended_ranges()],
            "description_max_length": DESCRIPTION_MAX_LENGTH,
        }
