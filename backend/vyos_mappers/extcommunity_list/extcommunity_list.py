"""
ExtCommunity List Command Mapper

Handles command path generation for VyOS extcommunity-list configuration.
Commands are identical between VyOS 1.4 and 1.5.
"""

from typing import List


class ExtCommunityListMapper:
    """Mapper for extcommunity-list commands (identical for 1.4 and 1.5)"""

    def __init__(self, version: str):
        """Initialize with VyOS version."""
        self.version = version

    # ========================================================================
    # ExtCommunity List Operations
    # ========================================================================

    def get_extcommunity_list(self, name: str) -> List[str]:
        """Create community list.
        Command: set policy extcommunity-list <name>
        """
        return ["policy", "extcommunity-list", name]

    def get_extcommunity_list_path(self, name: str) -> List[str]:
        """Get path for deleting community list.
        Command: delete policy extcommunity-list <name>
        """
        return ["policy", "extcommunity-list", name]

    def get_extcommunity_list_description(
        self, name: str, description: str
    ) -> List[str]:
        """Set community list description.
        Command: set policy extcommunity-list <name> description <text>
        """
        return ["policy", "extcommunity-list", name, "description", description]

    def get_extcommunity_list_description_path(self, name: str) -> List[str]:
        """Get path for deleting community list description.
        Command: delete policy extcommunity-list <name> description
        """
        return ["policy", "extcommunity-list", name, "description"]

    # ========================================================================
    # Rule Operations
    # ========================================================================

    def get_rule(self, name: str, rule: str) -> List[str]:
        """Create rule.
        Command: set policy extcommunity-list <name> rule <number>
        """
        return ["policy", "extcommunity-list", name, "rule", rule]

    def get_rule_path(self, name: str, rule: str) -> List[str]:
        """Get path for deleting rule.
        Command: delete policy extcommunity-list <name> rule <number>
        """
        return ["policy", "extcommunity-list", name, "rule", rule]

    def get_rule_action(self, name: str, rule: str, action: str) -> List[str]:
        """Set rule action.
        Command: set policy extcommunity-list <name> rule <number> action <permit|deny>
        """
        return ["policy", "extcommunity-list", name, "rule", rule, "action", action]

    def get_rule_description(
        self, name: str, rule: str, description: str
    ) -> List[str]:
        """Set rule description.
        Command: set policy extcommunity-list <name> rule <number> description <text>
        """
        return [
            "policy",
            "extcommunity-list",
            name,
            "rule",
            rule,
            "description",
            description,
        ]

    def get_rule_description_path(self, name: str, rule: str) -> List[str]:
        """Get path for deleting rule description.
        Command: delete policy extcommunity-list <name> rule <number> description
        """
        return ["policy", "extcommunity-list", name, "rule", rule, "description"]

    def get_rule_regex(self, name: str, rule: str, regex: str) -> List[str]:
        """Set rule regex.
        Command: set policy extcommunity-list <name> rule <number> regex <text>
        """
        return ["policy", "extcommunity-list", name, "rule", rule, "regex", regex]

    def get_rule_regex_path(self, name: str, rule: str) -> List[str]:
        """Get path for deleting rule regex.
        Command: delete policy extcommunity-list <name> rule <number> regex
        """
        return ["policy", "extcommunity-list", name, "rule", rule, "regex"]
