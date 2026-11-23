"""VyOS 1.5 firewall groups mapper.

``remote-group`` exists only on 1.5. Path methods do not re-check the node:
the builder already called ``require_node``.
"""

from typing import FrozenSet, List

from ..groups import FirewallGroupsMapper


class FirewallGroupsMapperV1_5(FirewallGroupsMapper):
    """Firewall groups mapper for VyOS 1.5 and rolling."""

    def versioned_nodes(self) -> FrozenSet[str]:
        return frozenset({"remote-group"})

    # ========================================================================
    # Remote Group Operations
    # ========================================================================

    def get_remote_group(self, group_name: str) -> List[str]:
        """Get command path for creating a remote group."""
        return ["firewall", "group", "remote-group", group_name]

    def get_remote_group_description(self, group_name: str, description: str) -> List[str]:
        """Get command path for setting a remote group description."""
        return ["firewall", "group", "remote-group", group_name, "description", description]

    def get_remote_group_description_path(self, group_name: str) -> List[str]:
        """Get command path for a remote group description (for deletion)."""
        return ["firewall", "group", "remote-group", group_name, "description"]

    def get_remote_group_url(self, group_name: str, url: str) -> List[str]:
        """Get command path for a remote group URL."""
        return ["firewall", "group", "remote-group", group_name, "url", url]
