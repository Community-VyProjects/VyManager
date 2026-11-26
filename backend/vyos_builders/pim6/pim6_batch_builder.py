"""PIMv6 Batch Builder.

Provides all batch operations for PIMv6 (Protocol Independent Multicast for
IPv6) configuration: global timers, rendezvous points, and per-interface PIMv6
and MLD settings.

The protocols pim6 templates are the same on VyOS 1.4 and 1.5. A number
outside the lab range, a malformed IPv6 address or prefix (host bits set), a
bad interface name, an rp group outside ff00::/8, an mld join group that is
not a multicast address, or a malformed prefix-list6 name raises ValueError
before the op is queued.
"""

import ipaddress
import re
from typing import Any, Dict, cast

from vyos_mappers import CommandMapperRegistry
from vyos_mappers.pim6.pim6 import Pim6Mapper
from vyos_builders.base import BatchBuilder

# Lab syntax bounds (protocols pim6, identical on 1.4 and 1.5).
RANGES: Dict[str, Dict[str, int]] = {
    # join-prune-interval, keep-alive-timer, register-suppress-time, rp keep-alive-timer
    "timer": {"min": 1, "max": 65535},
    "packets": {"min": 1, "max": 255},
    "dr_priority": {"min": 1, "max": 4294967295},
    "hello": {"min": 1, "max": 180},
    "mld_interval": {"min": 1, "max": 65535},
    "last_member_query_count": {"min": 1, "max": 255},
    "last_member_query_interval": {"min": 100, "max": 6553500},
    "max_response_time": {"min": 100, "max": 6553500},
    "mld_version": {"min": 1, "max": 2},
}

# ASCII: a Unicode digit (٣, ３０) is not a number the lab takes.
_DECIMAL = re.compile(r"\d{1,10}", re.ASCII)
# Prefix length as the lab takes it: no leading zero (/016 is rejected).
_PREFIX_LENGTH = re.compile(r"0|[1-9]\d{0,2}", re.ASCII)
# Interface name, from the protocols pim6 interface node.def regex with up to
# two VLAN suffixes so QinQ (eth0.100.10) passes. The labs validate it
# differently: 1.4 checks /sys/class/net at set time, and its type list lacks
# vpptap/vpptun; 1.5's start-anchored regex alone passes at set time and
# verify_interface_exists runs at commit. Existence is left to the device.
_INTERFACE = re.compile(
    r"(bond|br|dum|en|ersp|eth|gnv|ifb|ipoe|lan|l2tp|l2tpeth|macsec|peth|ppp|pppoe|pptp|sstp|sstpc|tun"
    r"|veth|vpptap|vpptun|vti|vtun|vxlan|wg|wlan|wwan)[0-9]+(\.\d+){0,2}|pod-[-_a-zA-Z0-9]{1,11}|lo",
    re.ASCII,
)
# rp address prefix-list6 takes a `policy prefix-list6` name, which the lab
# limits to [-_a-zA-Z0-9]+.
_PREFIX_LIST_NAME = re.compile(r"[-_a-zA-Z0-9]+", re.ASCII)

_MULTICAST = ipaddress.IPv6Network("ff00::/8")


def _number(key: str, value: str) -> str:
    """value when it is a decimal inside RANGES[key], else ValueError."""
    bounds = RANGES[key]
    text = str(value).strip()
    if not _DECIMAL.fullmatch(text) or not bounds["min"] <= int(text) <= bounds["max"]:
        raise ValueError(f"{key} must be a number from {bounds['min']} to {bounds['max']}")
    return text


def _ipv6(label: str, value: str) -> str:
    text = str(value).strip()
    try:
        # The lab rejects a zone index (fe80::1%eth0).
        if "%" in text:
            raise ValueError
        ipaddress.IPv6Address(text)
    except ValueError:
        raise ValueError(f"{label} must be an IPv6 address") from None
    return text


def _multicast_group(value: str) -> str:
    """rp group: an IPv6 prefix with no host bits inside ff00::/8 (lab verify)."""
    text = str(value).strip()
    try:
        address, sep, length = text.partition("/")
        if not sep or "%" in address or not _PREFIX_LENGTH.fullmatch(length):
            raise ValueError
        ipaddress.IPv6Address(address)
        # strict: a prefix with host bits set (ff0e::1/16) is rejected.
        network = ipaddress.IPv6Network(text, strict=True)
        if not network.subnet_of(_MULTICAST):
            raise ValueError
    except ValueError:
        raise ValueError("rp group must be an IPv6 multicast prefix inside ff00::/8 with no host bits set") from None
    return text


def _join_group(value: str) -> str:
    """mld join group: an IPv6 multicast address inside ff00::/8 (lab verify)."""
    text = _ipv6("mld join", value)
    if ipaddress.IPv6Address(text) not in _MULTICAST:
        raise ValueError("mld join group must be an IPv6 multicast address inside ff00::/8")
    return text


def _interface(value: str) -> str:
    text = str(value).strip()
    if not _INTERFACE.fullmatch(text):
        raise ValueError("interface name is not valid")
    return text


def _prefix_list6(value: str) -> str:
    text = str(value).strip()
    if not _PREFIX_LIST_NAME.fullmatch(text):
        raise ValueError("prefix-list6 name may only contain letters, digits, hyphen and underscore")
    return text


class Pim6BatchBuilder(BatchBuilder):
    """Complete batch builder for PIMv6 operations."""

    def __init__(self, version: str):
        super().__init__(version)
        self.mapper_key = "pim6"
        self.mappers = {self.mapper_key: CommandMapperRegistry.get_mapper(self.mapper_key, version)}

    @property
    def m(self) -> Pim6Mapper:
        return cast(Pim6Mapper, self.mappers[self.mapper_key])

    # ========================================================================
    # Capabilities
    # ========================================================================

    def get_capabilities(self) -> Dict[str, Any]:
        return {
            "version": self.version,
            "features": {
                "pim6": {"supported": True, "description": "Protocol Independent Multicast for IPv6 (PIMv6)"},
                "interface": {"supported": True, "description": "PIMv6 interface configuration"},
                "interface_mld": {"supported": True, "description": "MLD (Multicast Listener Discovery) per-interface settings"},
                "mld_join": {"supported": True, "description": "MLD join multicast group with optional sources"},
                "join_prune_interval": {"supported": True, "description": "Join/prune send interval"},
                "keep_alive_timer": {"supported": True, "description": "Keep alive timer"},
                "packets": {"supported": True, "description": "Packets to process at once"},
                "register_suppress_time": {"supported": True, "description": "Register suppress timer"},
                "rp": {"supported": True, "description": "Rendezvous Point configuration"},
                "rp_prefix_list6": {"supported": True, "description": "RP selection by IPv6 prefix-list"},
            },
            "ranges": RANGES,
        }

    # ========================================================================
    # Global Operations
    # ========================================================================

    def set_join_prune_interval(self, value: str) -> "Pim6BatchBuilder":
        return self.add_set(self.m.get_join_prune_interval(_number("timer", value)))

    def delete_join_prune_interval(self) -> "Pim6BatchBuilder":
        return self.add_delete(self.m.get_join_prune_interval_delete())

    def set_keep_alive_timer(self, value: str) -> "Pim6BatchBuilder":
        return self.add_set(self.m.get_keep_alive_timer(_number("timer", value)))

    def delete_keep_alive_timer(self) -> "Pim6BatchBuilder":
        return self.add_delete(self.m.get_keep_alive_timer_delete())

    def set_packets(self, value: str) -> "Pim6BatchBuilder":
        return self.add_set(self.m.get_packets(_number("packets", value)))

    def delete_packets(self) -> "Pim6BatchBuilder":
        return self.add_delete(self.m.get_packets_delete())

    def set_register_suppress_time(self, value: str) -> "Pim6BatchBuilder":
        return self.add_set(self.m.get_register_suppress_time(_number("timer", value)))

    def delete_register_suppress_time(self) -> "Pim6BatchBuilder":
        return self.add_delete(self.m.get_register_suppress_time_delete())

    # ========================================================================
    # RP (Rendezvous Point) Operations
    # ========================================================================

    def delete_rp(self) -> "Pim6BatchBuilder":
        # An `rp` node left with no address fails the commit, so the last address goes with it.
        return self.add_delete(self.m.get_rp())

    def set_rp_address(self, address: str) -> "Pim6BatchBuilder":
        return self.add_set(self.m.get_rp_address(_ipv6("rp address", address)))

    def delete_rp_address(self, address: str) -> "Pim6BatchBuilder":
        return self.add_delete(self.m.get_rp_address(_ipv6("rp address", address)))

    def set_rp_address_group(self, address: str, group: str) -> "Pim6BatchBuilder":
        return self.add_set(
            self.m.get_rp_address_group(_ipv6("rp address", address), _multicast_group(group)))

    def delete_rp_address_group(self, address: str, group: str) -> "Pim6BatchBuilder":
        return self.add_delete(
            self.m.get_rp_address_group(_ipv6("rp address", address), _multicast_group(group)))

    # The lab requires at least one group on every rp address; a prefix-list6 is
    # an extra next to the groups, not a replacement for them.
    def set_rp_address_prefix_list6(self, address: str, value: str) -> "Pim6BatchBuilder":
        return self.add_set(
            self.m.get_rp_address_prefix_list6(_ipv6("rp address", address), _prefix_list6(value)))

    def delete_rp_address_prefix_list6(self, address: str) -> "Pim6BatchBuilder":
        return self.add_delete(self.m.get_rp_address_prefix_list6_delete(_ipv6("rp address", address)))

    def set_rp_keep_alive_timer(self, value: str) -> "Pim6BatchBuilder":
        return self.add_set(self.m.get_rp_keep_alive_timer(_number("timer", value)))

    def delete_rp_keep_alive_timer(self) -> "Pim6BatchBuilder":
        return self.add_delete(self.m.get_rp_keep_alive_timer_delete())

    # ========================================================================
    # Interface Operations
    # ========================================================================

    def set_interface(self, iface: str) -> "Pim6BatchBuilder":
        return self.add_set(self.m.get_interface(_interface(iface)))

    def delete_interface(self, iface: str) -> "Pim6BatchBuilder":
        return self.add_delete(self.m.get_interface(_interface(iface)))

    def set_interface_dr_priority(self, iface: str, value: str) -> "Pim6BatchBuilder":
        return self.add_set(self.m.get_interface_dr_priority(_interface(iface), _number("dr_priority", value)))

    def delete_interface_dr_priority(self, iface: str) -> "Pim6BatchBuilder":
        return self.add_delete(self.m.get_interface_dr_priority_delete(_interface(iface)))

    def set_interface_hello(self, iface: str, value: str) -> "Pim6BatchBuilder":
        return self.add_set(self.m.get_interface_hello(_interface(iface), _number("hello", value)))

    def delete_interface_hello(self, iface: str) -> "Pim6BatchBuilder":
        return self.add_delete(self.m.get_interface_hello_delete(_interface(iface)))

    def set_interface_no_bsm(self, iface: str) -> "Pim6BatchBuilder":
        return self.add_set(self.m.get_interface_no_bsm(_interface(iface)))

    def delete_interface_no_bsm(self, iface: str) -> "Pim6BatchBuilder":
        return self.add_delete(self.m.get_interface_no_bsm(_interface(iface)))

    def set_interface_no_unicast_bsm(self, iface: str) -> "Pim6BatchBuilder":
        return self.add_set(self.m.get_interface_no_unicast_bsm(_interface(iface)))

    def delete_interface_no_unicast_bsm(self, iface: str) -> "Pim6BatchBuilder":
        return self.add_delete(self.m.get_interface_no_unicast_bsm(_interface(iface)))

    def set_interface_passive(self, iface: str) -> "Pim6BatchBuilder":
        return self.add_set(self.m.get_interface_passive(_interface(iface)))

    def delete_interface_passive(self, iface: str) -> "Pim6BatchBuilder":
        return self.add_delete(self.m.get_interface_passive(_interface(iface)))

    # ========================================================================
    # Interface MLD Operations
    # ========================================================================

    def set_interface_mld(self, iface: str) -> "Pim6BatchBuilder":
        return self.add_set(self.m.get_interface_mld(_interface(iface)))

    def delete_interface_mld(self, iface: str) -> "Pim6BatchBuilder":
        return self.add_delete(self.m.get_interface_mld(_interface(iface)))

    def set_interface_mld_disable(self, iface: str) -> "Pim6BatchBuilder":
        return self.add_set(self.m.get_interface_mld_disable(_interface(iface)))

    def delete_interface_mld_disable(self, iface: str) -> "Pim6BatchBuilder":
        return self.add_delete(self.m.get_interface_mld_disable(_interface(iface)))

    def set_interface_mld_interval(self, iface: str, value: str) -> "Pim6BatchBuilder":
        return self.add_set(self.m.get_interface_mld_interval(_interface(iface), _number("mld_interval", value)))

    def delete_interface_mld_interval(self, iface: str) -> "Pim6BatchBuilder":
        return self.add_delete(self.m.get_interface_mld_interval_delete(_interface(iface)))

    def set_interface_mld_last_member_query_count(self, iface: str, value: str) -> "Pim6BatchBuilder":
        return self.add_set(self.m.get_interface_mld_last_member_query_count(
            _interface(iface), _number("last_member_query_count", value)))

    def delete_interface_mld_last_member_query_count(self, iface: str) -> "Pim6BatchBuilder":
        return self.add_delete(self.m.get_interface_mld_last_member_query_count_delete(_interface(iface)))

    # last-member-query-interval and max-response-time are lab leaves, but on 1.4
    # and 1.5 any set value crashes the FRR render (pim6d.frr.j2 floor-divides
    # the string), so no set commits. The screen only emits their deletes.
    def set_interface_mld_last_member_query_interval(self, iface: str, value: str) -> "Pim6BatchBuilder":
        return self.add_set(self.m.get_interface_mld_last_member_query_interval(
            _interface(iface), _number("last_member_query_interval", value)))

    def delete_interface_mld_last_member_query_interval(self, iface: str) -> "Pim6BatchBuilder":
        return self.add_delete(self.m.get_interface_mld_last_member_query_interval_delete(_interface(iface)))

    def set_interface_mld_max_response_time(self, iface: str, value: str) -> "Pim6BatchBuilder":
        return self.add_set(self.m.get_interface_mld_max_response_time(
            _interface(iface), _number("max_response_time", value)))

    def delete_interface_mld_max_response_time(self, iface: str) -> "Pim6BatchBuilder":
        return self.add_delete(self.m.get_interface_mld_max_response_time_delete(_interface(iface)))

    def set_interface_mld_version(self, iface: str, value: str) -> "Pim6BatchBuilder":
        return self.add_set(self.m.get_interface_mld_version(_interface(iface), _number("mld_version", value)))

    def delete_interface_mld_version(self, iface: str) -> "Pim6BatchBuilder":
        return self.add_delete(self.m.get_interface_mld_version_delete(_interface(iface)))

    def set_interface_mld_join(self, iface: str, group: str) -> "Pim6BatchBuilder":
        return self.add_set(self.m.get_interface_mld_join(_interface(iface), _join_group(group)))

    def delete_interface_mld_join(self, iface: str, group: str) -> "Pim6BatchBuilder":
        return self.add_delete(self.m.get_interface_mld_join(_interface(iface), _join_group(group)))

    def set_interface_mld_join_source(self, iface: str, group: str, source: str) -> "Pim6BatchBuilder":
        return self.add_set(self.m.get_interface_mld_join_source(
            _interface(iface), _join_group(group), _ipv6("mld join source", source)))

    def delete_interface_mld_join_source(self, iface: str, group: str, source: str) -> "Pim6BatchBuilder":
        return self.add_delete(self.m.get_interface_mld_join_source(
            _interface(iface), _join_group(group), _ipv6("mld join source", source)))

    # ========================================================================
    # Delete Entire PIMv6
    # ========================================================================

    def delete_pim6(self) -> "Pim6BatchBuilder":
        return self.add_delete(self.m.get_pim6_path())
