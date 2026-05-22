"""DHCPv6 Server mapper package."""
from .dhcpv6_server import DHCPv6ServerMapper
from .dhcpv6_server_versions import get_dhcpv6_server_mapper

__all__ = ["DHCPv6ServerMapper", "get_dhcpv6_server_mapper"]
