"""VyOS 1.5 DHCP Server mapper - version-specific differences."""
from typing import List


class DHCPMapperV1_5:
    """Version-specific mapper for VyOS 1.5 DHCP commands.

    Key differences in 1.5:
    - Requires subnet-id parameter for each subnet
    - Uses 'option' prefix for:
      * default-router
      * name-server
      * domain-name
      * domain-search
      * bootfile-name
      * bootfile-server
      * tftp-server-name
      * time-server
      * ntp-server
      * wins-server
      * time-offset
    - No 'option' prefix for:
      * exclude
      * lease
      * range
      * ping-check
      * enable-failover
    """

    # ==================== Version-Specific Commands ====================

    def get_subnet_subnet_id(
        self, network_name: str, subnet: str, subnet_id: int
    ) -> List[str]:
        """Get command path for subnet-id (1.5 only)."""
        return [
            "service", "dhcp-server", "shared-network-name", network_name,
            "subnet", subnet, "subnet-id", str(subnet_id)
        ]

    def get_subnet_subnet_id_path(
        self, network_name: str, subnet: str
    ) -> List[str]:
        """Get command path for subnet-id deletion."""
        return [
            "service", "dhcp-server", "shared-network-name", network_name,
            "subnet", subnet, "subnet-id"
        ]

    def get_subnet_default_router(
        self, network_name: str, subnet: str, router: str
    ) -> List[str]:
        """Get command path for subnet default-router (1.5: with 'option' prefix)."""
        return [
            "service", "dhcp-server", "shared-network-name", network_name,
            "subnet", subnet, "option", "default-router", router
        ]

    def get_subnet_default_router_path(
        self, network_name: str, subnet: str
    ) -> List[str]:
        """Get command path for subnet default-router deletion."""
        return [
            "service", "dhcp-server", "shared-network-name", network_name,
            "subnet", subnet, "option", "default-router"
        ]

    def get_subnet_name_server(
        self, network_name: str, subnet: str, name_server: str
    ) -> List[str]:
        """Get command path for subnet name-server (1.5: with 'option' prefix)."""
        return [
            "service", "dhcp-server", "shared-network-name", network_name,
            "subnet", subnet, "option", "name-server", name_server
        ]

    def get_subnet_name_server_path(
        self, network_name: str, subnet: str, name_server: str
    ) -> List[str]:
        """Get command path for specific name-server deletion."""
        return [
            "service", "dhcp-server", "shared-network-name", network_name,
            "subnet", subnet, "option", "name-server", name_server
        ]

    def get_subnet_domain_name(
        self, network_name: str, subnet: str, domain_name: str
    ) -> List[str]:
        """Get command path for subnet domain-name (1.5: with 'option' prefix)."""
        return [
            "service", "dhcp-server", "shared-network-name", network_name,
            "subnet", subnet, "option", "domain-name", domain_name
        ]

    def get_subnet_domain_name_path(
        self, network_name: str, subnet: str
    ) -> List[str]:
        """Get command path for subnet domain-name deletion."""
        return [
            "service", "dhcp-server", "shared-network-name", network_name,
            "subnet", subnet, "option", "domain-name"
        ]

    def get_subnet_domain_search(
        self, network_name: str, subnet: str, domain_search: str
    ) -> List[str]:
        """Get command path for subnet domain-search (1.5: with 'option' prefix)."""
        return [
            "service", "dhcp-server", "shared-network-name", network_name,
            "subnet", subnet, "option", "domain-search", domain_search
        ]

    def get_subnet_domain_search_path(
        self, network_name: str, subnet: str, domain_search: str
    ) -> List[str]:
        """Get command path for specific domain-search deletion."""
        return [
            "service", "dhcp-server", "shared-network-name", network_name,
            "subnet", subnet, "option", "domain-search", domain_search
        ]

    def get_subnet_bootfile_name(
        self, network_name: str, subnet: str, bootfile_name: str
    ) -> List[str]:
        """Get command path for subnet bootfile-name (1.5: with 'option' prefix)."""
        return [
            "service", "dhcp-server", "shared-network-name", network_name,
            "subnet", subnet, "option", "bootfile-name", bootfile_name
        ]

    def get_subnet_bootfile_name_path(
        self, network_name: str, subnet: str
    ) -> List[str]:
        """Get command path for subnet bootfile-name deletion."""
        return [
            "service", "dhcp-server", "shared-network-name", network_name,
            "subnet", subnet, "option", "bootfile-name"
        ]

    def get_subnet_bootfile_server(
        self, network_name: str, subnet: str, bootfile_server: str
    ) -> List[str]:
        """Get command path for subnet bootfile-server (1.5: with 'option' prefix)."""
        return [
            "service", "dhcp-server", "shared-network-name", network_name,
            "subnet", subnet, "option", "bootfile-server", bootfile_server
        ]

    def get_subnet_bootfile_server_path(
        self, network_name: str, subnet: str
    ) -> List[str]:
        """Get command path for subnet bootfile-server deletion."""
        return [
            "service", "dhcp-server", "shared-network-name", network_name,
            "subnet", subnet, "option", "bootfile-server"
        ]

    def get_subnet_tftp_server_name(
        self, network_name: str, subnet: str, tftp_server_name: str
    ) -> List[str]:
        """Get command path for subnet tftp-server-name (1.5: with 'option' prefix)."""
        return [
            "service", "dhcp-server", "shared-network-name", network_name,
            "subnet", subnet, "option", "tftp-server-name", tftp_server_name
        ]

    def get_subnet_tftp_server_name_path(
        self, network_name: str, subnet: str
    ) -> List[str]:
        """Get command path for subnet tftp-server-name deletion."""
        return [
            "service", "dhcp-server", "shared-network-name", network_name,
            "subnet", subnet, "option", "tftp-server-name"
        ]

    def get_subnet_time_server(
        self, network_name: str, subnet: str, time_server: str
    ) -> List[str]:
        """Get command path for subnet time-server (1.5: with 'option' prefix)."""
        return [
            "service", "dhcp-server", "shared-network-name", network_name,
            "subnet", subnet, "option", "time-server", time_server
        ]

    def get_subnet_time_server_path(
        self, network_name: str, subnet: str, time_server: str
    ) -> List[str]:
        """Get command path for specific time-server deletion."""
        return [
            "service", "dhcp-server", "shared-network-name", network_name,
            "subnet", subnet, "option", "time-server", time_server
        ]

    def get_subnet_ntp_server(
        self, network_name: str, subnet: str, ntp_server: str
    ) -> List[str]:
        """Get command path for subnet ntp-server (1.5: with 'option' prefix)."""
        return [
            "service", "dhcp-server", "shared-network-name", network_name,
            "subnet", subnet, "option", "ntp-server", ntp_server
        ]

    def get_subnet_ntp_server_path(
        self, network_name: str, subnet: str, ntp_server: str
    ) -> List[str]:
        """Get command path for specific ntp-server deletion."""
        return [
            "service", "dhcp-server", "shared-network-name", network_name,
            "subnet", subnet, "option", "ntp-server", ntp_server
        ]

    def get_subnet_wins_server(
        self, network_name: str, subnet: str, wins_server: str
    ) -> List[str]:
        """Get command path for subnet wins-server (1.5: with 'option' prefix)."""
        return [
            "service", "dhcp-server", "shared-network-name", network_name,
            "subnet", subnet, "option", "wins-server", wins_server
        ]

    def get_subnet_wins_server_path(
        self, network_name: str, subnet: str, wins_server: str
    ) -> List[str]:
        """Get command path for specific wins-server deletion."""
        return [
            "service", "dhcp-server", "shared-network-name", network_name,
            "subnet", subnet, "option", "wins-server", wins_server
        ]

    def get_subnet_time_offset(
        self, network_name: str, subnet: str, time_offset: str
    ) -> List[str]:
        """Get command path for subnet time-offset (1.5: with 'option' prefix)."""
        return [
            "service", "dhcp-server", "shared-network-name", network_name,
            "subnet", subnet, "option", "time-offset", time_offset
        ]

    def get_subnet_time_offset_path(
        self, network_name: str, subnet: str
    ) -> List[str]:
        """Get command path for subnet time-offset deletion."""
        return [
            "service", "dhcp-server", "shared-network-name", network_name,
            "subnet", subnet, "option", "time-offset"
        ]

    def get_subnet_exclude(
        self, network_name: str, subnet: str, exclude: str
    ) -> List[str]:
        """Get command path for subnet exclude (1.5: no 'option' prefix for exclude)."""
        return [
            "service", "dhcp-server", "shared-network-name", network_name,
            "subnet", subnet, "exclude", exclude
        ]

    def get_subnet_exclude_path(
        self, network_name: str, subnet: str, exclude: str
    ) -> List[str]:
        """Get command path for specific exclude deletion."""
        return [
            "service", "dhcp-server", "shared-network-name", network_name,
            "subnet", subnet, "exclude", exclude
        ]

    def has_subnet_id(self) -> bool:
        """Returns True - subnet-id is required in VyOS 1.5."""
        return True
