"""
VyOS 1.5 Firewall Groups Mapper

Adds domain-group support (new in VyOS 1.5).
"""

from typing import List
from ..groups import FirewallGroupsMapper


class FirewallGroupsMapper_v1_5(FirewallGroupsMapper):
    """
    VyOS 1.5-specific firewall groups mapper.

    Adds support for domain groups (introduced in VyOS 1.5).
    """

    # ========================================================================
    # Domain Group Operations (VyOS 1.5+ only)
    # ========================================================================

    def get_domain_group(self, group_name: str) -> List[str]:
        """Get command path for creating domain group."""
        return ["firewall", "group", "domain-group", group_name]

    def get_domain_group_description(self, group_name: str, description: str) -> List[str]:
        """Get command path for setting domain group description."""
        return ["firewall", "group", "domain-group", group_name, "description", description]

    def get_domain_group_description_path(self, group_name: str) -> List[str]:
        """Get command path for domain group description (for deletion)."""
        return ["firewall", "group", "domain-group", group_name, "description"]

    def get_domain_group_address(self, group_name: str, address: str) -> List[str]:
        """Get command path for adding domain to group."""
        return ["firewall", "group", "domain-group", group_name, "address", address]

    def get_remote_group(self, group_name: str) -> List[str]:
        """Get command path for creating remote group."""
        return ["firewall", "group", "remote-group", group_name]

    def get_remote_group_description(self, group_name: str, description: str) -> List[str]:
        """Get command path for setting remote group description."""
        return ["firewall", "group", "remote-group", group_name, "description", description]

    def get_remote_group_description_path(self, group_name: str) -> List[str]:
        """Get command path for remote group description (for deletion)."""
        return ["firewall", "group", "remote-group", group_name, "description"]

    def get_remote_group_url(self, group_name: str, url: str) -> List[str]:
        """Get command path for setting remote group URL."""
        return ["firewall", "group", "remote-group", group_name, "url", url]

    def get_remote_group_url_path(self, group_name: str, url: str = None) -> List[str]:
        """Get command path for remote group URL (for deletion).

        Args:
            group_name: Name of the remote group
            url: Optional URL to delete. If provided, deletes specific URL.
                 If None, deletes the entire url path.
        """
        base_path = ["firewall", "group", "remote-group", group_name, "url"]
        if url:
            return base_path + [url]
        return base_path
