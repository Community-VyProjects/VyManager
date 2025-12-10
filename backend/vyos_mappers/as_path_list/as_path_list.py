"""
AS Path List Command Mapper

Handles command path generation for AS path list configuration.
Commands are identical between VyOS 1.4 and 1.5.
"""

from typing import List
from ..base import BaseFeatureMapper


class AsPathListMapper(BaseFeatureMapper):
    """Mapper for AS path list commands (VyOS 1.4 and 1.5)"""

    def __init__(self, version: str):
        """Initialize with VyOS version."""
        super().__init__(version)

    # ========================================================================
    # AS Path List Operations
    # ========================================================================

    def get_as_path_list(self, name: str) -> List[str]:
        """Create AS path list.
        Command: set policy as-path-list <name>
        """
        return ["policy", "as-path-list", name]

    def get_delete_as_path_list(self, name: str) -> List[str]:
        """Delete AS path list.
        Command: delete policy as-path-list <name>
        """
        return ["policy", "as-path-list", name]

    def get_as_path_list_description(self, name: str, description: str) -> List[str]:
        """Set AS path list description.
        Command: set policy as-path-list <name> description <text>
        """
        return ["policy", "as-path-list", name, "description", description]

    def get_delete_as_path_list_description(self, name: str) -> List[str]:
        """Delete AS path list description.
        Command: delete policy as-path-list <name> description
        """
        return ["policy", "as-path-list", name, "description"]

    # ========================================================================
    # Rule Operations
    # ========================================================================

    def get_rule(self, name: str, rule: str) -> List[str]:
        """Create rule.
        Command: set policy as-path-list <name> rule <number>
        """
        return ["policy", "as-path-list", name, "rule", rule]

    def get_delete_rule(self, name: str, rule: str) -> List[str]:
        """Delete rule.
        Command: delete policy as-path-list <name> rule <number>
        """
        return ["policy", "as-path-list", name, "rule", rule]

    def get_rule_action(self, name: str, rule: str, action: str) -> List[str]:
        """Set rule action.
        Command: set policy as-path-list <name> rule <number> action <permit|deny>
        """
        return ["policy", "as-path-list", name, "rule", rule, "action", action]

    def get_rule_description(self, name: str, rule: str, description: str) -> List[str]:
        """Set rule description.
        Command: set policy as-path-list <name> rule <number> description <text>
        """
        return ["policy", "as-path-list", name, "rule", rule, "description", description]

    def get_delete_rule_description(self, name: str, rule: str) -> List[str]:
        """Delete rule description.
        Command: delete policy as-path-list <name> rule <number> description
        """
        return ["policy", "as-path-list", name, "rule", rule, "description"]

    def get_rule_regex(self, name: str, rule: str, regex: str) -> List[str]:
        """Set rule regex.
        Command: set policy as-path-list <name> rule <number> regex <text>
        """
        return ["policy", "as-path-list", name, "rule", rule, "regex", regex]

    def get_delete_rule_regex(self, name: str, rule: str) -> List[str]:
        """Delete rule regex.
        Command: delete policy as-path-list <name> rule <number> regex
        """
        return ["policy", "as-path-list", name, "rule", rule, "regex"]
