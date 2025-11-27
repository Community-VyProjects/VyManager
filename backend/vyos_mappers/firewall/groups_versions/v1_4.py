"""
VyOS 1.4 Firewall Groups Mapper

Base version for firewall groups.
VyOS 1.4 supports all group types except domain-group and remote-group.
"""

from typing import List
from ..groups import FirewallGroupsMapper


class FirewallGroupsMapper_v1_4(FirewallGroupsMapper):
    """
    VyOS 1.4-specific firewall groups mapper.

    Domain groups and remote groups are not available in VyOS 1.4.
    """

    def get_domain_group(self, group_name: str) -> List[str]:
        """Domain groups are not available in VyOS 1.4."""
        raise ValueError(
            "Domain groups require VyOS 1.5+. Current device is running v1.4"
        )

    def get_domain_group_description(self, group_name: str, description: str) -> List[str]:
        """Domain groups are not available in VyOS 1.4."""
        raise ValueError(
            "Domain groups require VyOS 1.5+. Current device is running v1.4"
        )

    def get_domain_group_description_path(self, group_name: str) -> List[str]:
        """Domain groups are not available in VyOS 1.4."""
        raise ValueError(
            "Domain groups require VyOS 1.5+. Current device is running v1.4"
        )

    def get_domain_group_address(self, group_name: str, address: str) -> List[str]:
        """Domain groups are not available in VyOS 1.4."""
        raise ValueError(
            "Domain groups require VyOS 1.5+. Current device is running v1.4"
        )

    # ========================================================================
    # Remote Group Operations (VyOS 1.5+ only)
    # ========================================================================

    def get_remote_group(self, group_name: str) -> List[str]:
        """Remote groups are not available in VyOS 1.4."""
        raise ValueError(
            "Remote groups require VyOS 1.5+. Current device is running v1.4"
        )

    def get_remote_group_description(self, group_name: str, description: str) -> List[str]:
        """Remote groups are not available in VyOS 1.4."""
        raise ValueError(
            "Remote groups require VyOS 1.5+. Current device is running v1.4"
        )

    def get_remote_group_description_path(self, group_name: str) -> List[str]:
        """Remote groups are not available in VyOS 1.4."""
        raise ValueError(
            "Remote groups require VyOS 1.5+. Current device is running v1.4"
        )

    def get_remote_group_url(self, group_name: str, url: str) -> List[str]:
        """Remote groups are not available in VyOS 1.4."""
        raise ValueError(
            "Remote groups require VyOS 1.5+. Current device is running v1.4"
        )

    def get_remote_group_url_path(self, group_name: str) -> List[str]:
        """Remote groups are not available in VyOS 1.4."""
        raise ValueError(
            "Remote groups require VyOS 1.5+. Current device is running v1.4"
        )
