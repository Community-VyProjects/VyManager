"""VyOS 1.4 DHCP server mapper.

On 1.4 the subnet and shared-network options sit directly under their node,
the static-mapping hardware address is ``mac-address``, and these leaves exist
only here: ``host-decl-name``, ``subnet enable-failover``, and the valueless
``dynamic-dns-update`` leaf.
"""
from typing import Any, Dict, List, Optional, Tuple

from ..dhcp_server import DHCPServerMapper


class DHCPServerMapperV1_4(DHCPServerMapper):
    """VyOS 1.4 DHCP server mapper."""

    OPTION_PREFIX = ()
    MAC_LEAF = "mac-address"
    CATALOG_KEY = "1.4"
    # 1.4 GraphQL ClearReleaseLeaseDhcp only releases active leases.
    CLEARS_INACTIVE_LEASES = False
    LEASE_CLEAR_MUTATION = "ClearReleaseLeaseDhcp"

    def lease_clear_request(
        self, address: str, family: str, vrf: Optional[str]
    ) -> Tuple[str, Dict[str, Any]]:
        query = (
            "mutation ($key: String, $ip: String!) {"
            f"  {self.LEASE_CLEAR_MUTATION}(data: {{key: $key, ip_address: $ip}}) {{"
            "    success errors"
            "  }"
            "}"
        )
        return query, {"ip": address}

    def get_host_decl_name(self) -> List[str]:
        return ["service", "dhcp-server", "host-decl-name"]

    def get_host_decl_name_path(self) -> List[str]:
        return ["service", "dhcp-server", "host-decl-name"]

    def get_subnet_enable_failover(self, network_name: str, subnet: str) -> List[str]:
        return self.get_subnet(network_name, subnet) + ["enable-failover"]

    def get_subnet_enable_failover_path(self, network_name: str, subnet: str) -> List[str]:
        return self.get_subnet(network_name, subnet) + ["enable-failover"]

    def get_dynamic_dns_update(self) -> List[str]:
        return ["service", "dhcp-server", "dynamic-dns-update"]
