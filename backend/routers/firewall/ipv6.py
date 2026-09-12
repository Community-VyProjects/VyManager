"""IPv6 firewall router. Implementation lives in family.py."""

from .family import build_router

router = build_router("ipv6")
