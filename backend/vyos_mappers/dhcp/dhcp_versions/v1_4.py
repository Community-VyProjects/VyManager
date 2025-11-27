"""VyOS 1.4 DHCP Server mapper - version-specific differences."""
from typing import List


class DHCPMapperV1_4:
    """Version-specific mapper for VyOS 1.4 DHCP commands.

    Key differences in 1.4:
    - No subnet-id parameter (doesn't exist in 1.4)
    - Direct commands without 'option' prefix for:
      * default-router
      * name-server
      * domain-name
      * domain-search
    """

    # ==================== Version-Specific Commands ====================

    def get_subnet_default_router(
        self, network_name: str, subnet: str, router: str
    ) -> List[str]:
        """Get command path for subnet default-router (1.4: no 'option' prefix)."""
        return [
            "service", "dhcp-server", "shared-network-name", network_name,
            "subnet", subnet, "default-router", router
        ]

    def get_subnet_default_router_path(
        self, network_name: str, subnet: str
    ) -> List[str]:
        """Get command path for subnet default-router deletion."""
        return [
            "service", "dhcp-server", "shared-network-name", network_name,
            "subnet", subnet, "default-router"
        ]

    def get_subnet_name_server(
        self, network_name: str, subnet: str, name_server: str
    ) -> List[str]:
        """Get command path for subnet name-server (1.4: no 'option' prefix)."""
        return [
            "service", "dhcp-server", "shared-network-name", network_name,
            "subnet", subnet, "name-server", name_server
        ]

    def get_subnet_name_server_path(
        self, network_name: str, subnet: str, name_server: str
    ) -> List[str]:
        """Get command path for specific name-server deletion."""
        return [
            "service", "dhcp-server", "shared-network-name", network_name,
            "subnet", subnet, "name-server", name_server
        ]

    def get_subnet_domain_name(
        self, network_name: str, subnet: str, domain_name: str
    ) -> List[str]:
        """Get command path for subnet domain-name (1.4: no 'option' prefix)."""
        return [
            "service", "dhcp-server", "shared-network-name", network_name,
            "subnet", subnet, "domain-name", domain_name
        ]

    def get_subnet_domain_name_path(
        self, network_name: str, subnet: str
    ) -> List[str]:
        """Get command path for subnet domain-name deletion."""
        return [
            "service", "dhcp-server", "shared-network-name", network_name,
            "subnet", subnet, "domain-name"
        ]

    def has_subnet_id(self) -> bool:
        """Returns False - subnet-id does not exist in VyOS 1.4."""
        return False
