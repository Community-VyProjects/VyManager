"""Op-mode path for PPPoE session conntrack inspection."""

from __future__ import annotations

import ipaddress


def conntrack_show_path(ip: str) -> list[str]:
    """`show conntrack` is incomplete. Family table is the valid op-mode path."""
    family = "ipv6" if ipaddress.ip_interface(ip).version == 6 else "ipv4"
    return ["conntrack", "table", family]
