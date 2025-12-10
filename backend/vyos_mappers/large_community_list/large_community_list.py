"""
LargeCommunity List Command Mapper

Handles command path generation for VyOS large-community-list configuration.
Commands are identical between VyOS 1.4 and 1.5.
"""

from typing import List


class LargeCommunityListMapper:
    """Mapper for large-community-list commands (identical for 1.4 and 1.5)"""

    def __init__(self, version: str):
        """Initialize with VyOS version."""
        self.version = version

    # ========================================================================
    # LargeCommunity List Operations
    # ========================================================================

    def get_large_community_list(self, name: str) -> List[str]:
        """Create large community list.
        Command: set policy large-community-list <name>
        """
        return ["policy", "large-community-list", name]

    def get_large_community_list_path(self, name: str) -> List[str]:
        """Get path for deleting large community list.
        Command: delete policy large-community-list <name>
        """
        return ["policy", "large-community-list", name]

    def get_large_community_list_description(
        self, name: str, description: str
    ) -> List[str]:
        """Set large community list description.
        Command: set policy large-community-list <name> description <text>
        """
        return ["policy", "large-community-list", name, "description", description]

    def get_large_community_list_description_path(self, name: str) -> List[str]:
        """Get path for deleting large community list description.
        Command: delete policy large-community-list <name> description
        """
        return ["policy", "large-community-list", name, "description"]

    # ========================================================================
    # Rule Operations
    # ========================================================================

    def get_rule(self, name: str, rule: str) -> List[str]:
        """Create rule.
        Command: set policy large-community-list <name> rule <number>
        """
        return ["policy", "large-community-list", name, "rule", rule]

    def get_rule_path(self, name: str, rule: str) -> List[str]:
        """Get path for deleting rule.
        Command: delete policy large-community-list <name> rule <number>
        """
        return ["policy", "large-community-list", name, "rule", rule]

    def get_rule_action(self, name: str, rule: str, action: str) -> List[str]:
        """Set rule action.
        Command: set policy large-community-list <name> rule <number> action <permit|deny>
        """
        return ["policy", "large-community-list", name, "rule", rule, "action", action]

    def get_rule_description(
        self, name: str, rule: str, description: str
    ) -> List[str]:
        """Set rule description.
        Command: set policy large-community-list <name> rule <number> description <text>
        """
        return [
            "policy",
            "large-community-list",
            name,
            "rule",
            rule,
            "description",
            description,
        ]

    def get_rule_description_path(self, name: str, rule: str) -> List[str]:
        """Get path for deleting rule description.
        Command: delete policy large-community-list <name> rule <number> description
        """
        return ["policy", "large-community-list", name, "rule", rule, "description"]

    def get_rule_regex(self, name: str, rule: str, regex: str) -> List[str]:
        """Set rule regex.
        Command: set policy large-community-list <name> rule <number> regex <text>
        """
        return ["policy", "large-community-list", name, "rule", rule, "regex", regex]

    def get_rule_regex_path(self, name: str, rule: str) -> List[str]:
        """Get path for deleting rule regex.
        Command: delete policy large-community-list <name> rule <number> regex
        """
        return ["policy", "large-community-list", name, "rule", rule, "regex"]
