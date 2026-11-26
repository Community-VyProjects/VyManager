"""PIM Batch Builder.

Provides all batch operations for PIM (Protocol Independent Multicast)
configuration: global timers and flags, IGMP watermark, register accept
list, rendezvous points, SPT switchover, SSM, and per-interface PIM and IGMP
settings.

The protocols pim templates are the same on VyOS 1.4 and 1.5. A number
outside the lab range, a malformed IPv4 address or prefix (host bits set), a
bad interface name, an rp group outside 224.0.0.0/4, or a malformed list or
profile name raises ValueError
before the op is queued.
"""

import ipaddress
import re
from typing import Any, Dict, cast

from vyos_mappers import CommandMapperRegistry
from vyos_mappers.pim.pim import PimMapper
from vyos_builders.base import BatchBuilder

# Lab syntax bounds (protocols pim, identical on 1.4 and 1.5).
RANGES: Dict[str, Dict[str, int]] = {
    # join-prune-interval, keep-alive-timer, register-suppress-time, rp keep-alive-timer
    "timer": {"min": 1, "max": 65535},
    "packets": {"min": 1, "max": 255},
    "watermark_warning": {"min": 1, "max": 65535},
    "dr_priority": {"min": 1, "max": 4294967295},
    "hello": {"min": 1, "max": 180},
    "query_interval": {"min": 1, "max": 1800},
    "query_max_response_time": {"min": 10, "max": 250},
    "igmp_version": {"min": 2, "max": 3},
}

# ASCII: a Unicode digit (٣, ３０) is not a number the lab takes.
_DECIMAL = re.compile(r"\d{1,10}", re.ASCII)
# Prefix length as the lab takes it: no leading zero (/032 is rejected).
_PREFIX_LENGTH = re.compile(r"0|[1-9]\d?", re.ASCII)
# protocols pim interface node.def regex (1.5 also requires the interface to exist).
_INTERFACE = re.compile(
    r"(bond|br|dum|en|ersp|eth|gnv|ifb|ipoe|lan|l2tp|l2tpeth|macsec|peth|ppp|pppoe|pptp|sstp|sstpc|tun"
    r"|veth|vpptap|vpptun|vti|vtun|vxlan|wg|wlan|wwan)[0-9]+(.\d+)?|pod-[-_a-zA-Z0-9]{1,11}|lo"
)
# register-accept-list, spt-switchover and ssm take a `policy prefix-list`
# name, which the lab limits to [-_a-zA-Z0-9]+.
_PREFIX_LIST_NAME = re.compile(r"[-_a-zA-Z0-9]+", re.ASCII)
# interface bfd profile takes a `protocols bfd profile` name. The leaf has no
# validator; reject a blank, whitespace or a comma so the op names one profile.
_PROFILE_NAME = re.compile(r"[^\s,]+")


def _number(key: str, value: str) -> str:
    """value when it is a decimal inside RANGES[key], else ValueError."""
    bounds = RANGES[key]
    text = str(value).strip()
    if not _DECIMAL.fullmatch(text) or not bounds["min"] <= int(text) <= bounds["max"]:
        raise ValueError(f"{key} must be a number from {bounds['min']} to {bounds['max']}")
    return text


def _ipv4(label: str, value: str) -> str:
    text = str(value).strip()
    try:
        ipaddress.IPv4Address(text)
    except ValueError:
        raise ValueError(f"{label} must be an IPv4 address") from None
    return text


_MULTICAST = ipaddress.IPv4Network("224.0.0.0/4")


def _multicast_group(value: str) -> str:
    """rp group: an IPv4 prefix with no host bits inside 224.0.0.0/4 (lab verify)."""
    text = str(value).strip()
    try:
        address, sep, length = text.partition("/")
        if not sep or not _PREFIX_LENGTH.fullmatch(length):
            raise ValueError
        ipaddress.IPv4Address(address)
        # strict: a prefix with host bits set (224.0.0.1/4) is rejected.
        network = ipaddress.IPv4Network(text, strict=True)
        if not network.subnet_of(_MULTICAST):
            raise ValueError
    except ValueError:
        raise ValueError("rp group must be an IPv4 multicast prefix inside 224.0.0.0/4 with no host bits set") from None
    return text


def _interface(value: str) -> str:
    text = str(value).strip()
    if not _INTERFACE.fullmatch(text):
        raise ValueError("interface name is not one the lab takes")
    return text


def _prefix_list(value: str) -> str:
    text = str(value).strip()
    if not _PREFIX_LIST_NAME.fullmatch(text):
        raise ValueError("prefix-list name may only contain letters, digits, hyphen and underscore")
    return text


def _profile(value: str) -> str:
    text = str(value).strip()
    if not _PROFILE_NAME.fullmatch(text):
        raise ValueError("bfd profile name must not be blank or contain whitespace or a comma")
    return text


class PimBatchBuilder(BatchBuilder):
    """Complete batch builder for PIM operations."""

    def __init__(self, version: str):
        super().__init__(version)
        self.mapper_key = "pim"
        self.mappers = {self.mapper_key: CommandMapperRegistry.get_mapper(self.mapper_key, version)}

    @property
    def m(self) -> PimMapper:
        return cast(PimMapper, self.mappers[self.mapper_key])

    # ========================================================================
    # Capabilities
    # ========================================================================

    def get_capabilities(self) -> Dict[str, Any]:
        return {
            "version": self.version,
            "features": {
                "pim": {"supported": True, "description": "Protocol Independent Multicast (PIM)"},
                "ecmp": {"supported": True, "description": "PIM ECMP"},
                "ecmp_rebalance": {"supported": True, "description": "PIM ECMP Rebalance"},
                "igmp": {"supported": True, "description": "IGMP options (watermark warning)"},
                "interface": {"supported": True, "description": "PIM interface configuration"},
                "interface_bfd": {"supported": True, "description": "BFD on PIM interfaces"},
                "interface_igmp": {"supported": True, "description": "IGMP per-interface settings"},
                "join_prune_interval": {"supported": True, "description": "Join/prune send interval"},
                "keep_alive_timer": {"supported": True, "description": "Keep alive timer"},
                "no_v6_secondary": {"supported": True, "description": "Disable IPv6 secondary address in hello packets"},
                "packets": {"supported": True, "description": "Packets to process at once"},
                "register_accept_list": {"supported": True, "description": "Register accept list with prefix-list"},
                "register_suppress_time": {"supported": True, "description": "Register suppress timer"},
                "rp": {"supported": True, "description": "Rendezvous Point configuration"},
                "spt_switchover": {"supported": True, "description": "SPT switchover settings"},
                "ssm": {"supported": True, "description": "Source-Specific Multicast"},
            },
            "ranges": RANGES,
        }

    # ========================================================================
    # Global Operations
    # ========================================================================

    def set_ecmp(self) -> "PimBatchBuilder":
        return self.add_set(self.m.get_ecmp())

    def delete_ecmp(self) -> "PimBatchBuilder":
        return self.add_delete(self.m.get_ecmp())

    def set_ecmp_rebalance(self) -> "PimBatchBuilder":
        return self.add_set(self.m.get_ecmp_rebalance())

    def delete_ecmp_rebalance(self) -> "PimBatchBuilder":
        return self.add_delete(self.m.get_ecmp_rebalance())

    def set_join_prune_interval(self, value: str) -> "PimBatchBuilder":
        return self.add_set(self.m.get_join_prune_interval(_number("timer", value)))

    def delete_join_prune_interval(self) -> "PimBatchBuilder":
        return self.add_delete(self.m.get_join_prune_interval_delete())

    def set_keep_alive_timer(self, value: str) -> "PimBatchBuilder":
        return self.add_set(self.m.get_keep_alive_timer(_number("timer", value)))

    def delete_keep_alive_timer(self) -> "PimBatchBuilder":
        return self.add_delete(self.m.get_keep_alive_timer_delete())

    def set_no_v6_secondary(self) -> "PimBatchBuilder":
        return self.add_set(self.m.get_no_v6_secondary())

    def delete_no_v6_secondary(self) -> "PimBatchBuilder":
        return self.add_delete(self.m.get_no_v6_secondary())

    def set_packets(self, value: str) -> "PimBatchBuilder":
        return self.add_set(self.m.get_packets(_number("packets", value)))

    def delete_packets(self) -> "PimBatchBuilder":
        return self.add_delete(self.m.get_packets_delete())

    def set_register_suppress_time(self, value: str) -> "PimBatchBuilder":
        return self.add_set(self.m.get_register_suppress_time(_number("timer", value)))

    def delete_register_suppress_time(self) -> "PimBatchBuilder":
        return self.add_delete(self.m.get_register_suppress_time_delete())

    # ========================================================================
    # IGMP Global Operations
    # ========================================================================

    def set_igmp_watermark_warning(self, value: str) -> "PimBatchBuilder":
        return self.add_set(self.m.get_igmp_watermark_warning(_number("watermark_warning", value)))

    def delete_igmp_watermark_warning(self) -> "PimBatchBuilder":
        return self.add_delete(self.m.get_igmp_watermark_warning_delete())

    # ========================================================================
    # Register Accept List Operations
    # ========================================================================

    def set_register_accept_list_prefix_list(self, value: str) -> "PimBatchBuilder":
        return self.add_set(self.m.get_register_accept_list_prefix_list(_prefix_list(value)))

    def delete_register_accept_list_prefix_list(self) -> "PimBatchBuilder":
        return self.add_delete(self.m.get_register_accept_list_prefix_list_delete())

    # ========================================================================
    # RP (Rendezvous Point) Operations
    # ========================================================================

    def delete_rp(self) -> "PimBatchBuilder":
        # An `rp` node left with no address fails the commit, so the last address goes with it.
        return self.add_delete(self.m.get_rp())

    def set_rp_address(self, address: str) -> "PimBatchBuilder":
        return self.add_set(self.m.get_rp_address(_ipv4("rp address", address)))

    def delete_rp_address(self, address: str) -> "PimBatchBuilder":
        return self.add_delete(self.m.get_rp_address_delete(_ipv4("rp address", address)))

    def set_rp_address_group(self, address: str, group: str) -> "PimBatchBuilder":
        return self.add_set(
            self.m.get_rp_address_group(_ipv4("rp address", address), _multicast_group(group)))

    def delete_rp_address_group(self, address: str, group: str) -> "PimBatchBuilder":
        return self.add_delete(
            self.m.get_rp_address_group_delete(_ipv4("rp address", address), _multicast_group(group)))

    def set_rp_keep_alive_timer(self, value: str) -> "PimBatchBuilder":
        return self.add_set(self.m.get_rp_keep_alive_timer(_number("timer", value)))

    def delete_rp_keep_alive_timer(self) -> "PimBatchBuilder":
        return self.add_delete(self.m.get_rp_keep_alive_timer_delete())

    # ========================================================================
    # SPT Switchover Operations
    # ========================================================================

    def set_spt_switchover_infinity(self) -> "PimBatchBuilder":
        return self.add_set(self.m.get_spt_switchover_infinity())

    def delete_spt_switchover(self) -> "PimBatchBuilder":
        # infinity-and-beyond is the only child, so this is also its delete.
        return self.add_delete(self.m.get_spt_switchover_delete())

    def set_spt_switchover_infinity_prefix_list(self, value: str) -> "PimBatchBuilder":
        return self.add_set(self.m.get_spt_switchover_infinity_prefix_list(_prefix_list(value)))

    def delete_spt_switchover_infinity_prefix_list(self) -> "PimBatchBuilder":
        return self.add_delete(self.m.get_spt_switchover_infinity_prefix_list_delete())

    # ========================================================================
    # SSM Operations
    # ========================================================================

    def set_ssm_prefix_list(self, value: str) -> "PimBatchBuilder":
        return self.add_set(self.m.get_ssm_prefix_list(_prefix_list(value)))

    def delete_ssm_prefix_list(self) -> "PimBatchBuilder":
        return self.add_delete(self.m.get_ssm_prefix_list_delete())

    # ========================================================================
    # Interface Operations
    # ========================================================================

    def set_interface(self, iface: str) -> "PimBatchBuilder":
        return self.add_set(self.m.get_interface(_interface(iface)))

    def delete_interface(self, iface: str) -> "PimBatchBuilder":
        return self.add_delete(self.m.get_interface(_interface(iface)))

    def set_interface_bfd(self, iface: str) -> "PimBatchBuilder":
        return self.add_set(self.m.get_interface_bfd(_interface(iface)))

    def delete_interface_bfd(self, iface: str) -> "PimBatchBuilder":
        return self.add_delete(self.m.get_interface_bfd(_interface(iface)))

    def set_interface_bfd_profile(self, iface: str, value: str) -> "PimBatchBuilder":
        return self.add_set(self.m.get_interface_bfd_profile(_interface(iface), _profile(value)))

    def delete_interface_bfd_profile(self, iface: str) -> "PimBatchBuilder":
        return self.add_delete(self.m.get_interface_bfd_profile_delete(_interface(iface)))

    def set_interface_dr_priority(self, iface: str, value: str) -> "PimBatchBuilder":
        return self.add_set(self.m.get_interface_dr_priority(_interface(iface), _number("dr_priority", value)))

    def delete_interface_dr_priority(self, iface: str) -> "PimBatchBuilder":
        return self.add_delete(self.m.get_interface_dr_priority_delete(_interface(iface)))

    def set_interface_hello(self, iface: str, value: str) -> "PimBatchBuilder":
        return self.add_set(self.m.get_interface_hello(_interface(iface), _number("hello", value)))

    def delete_interface_hello(self, iface: str) -> "PimBatchBuilder":
        return self.add_delete(self.m.get_interface_hello_delete(_interface(iface)))

    def set_interface_no_bsm(self, iface: str) -> "PimBatchBuilder":
        return self.add_set(self.m.get_interface_no_bsm(_interface(iface)))

    def delete_interface_no_bsm(self, iface: str) -> "PimBatchBuilder":
        return self.add_delete(self.m.get_interface_no_bsm(_interface(iface)))

    def set_interface_no_unicast_bsm(self, iface: str) -> "PimBatchBuilder":
        return self.add_set(self.m.get_interface_no_unicast_bsm(_interface(iface)))

    def delete_interface_no_unicast_bsm(self, iface: str) -> "PimBatchBuilder":
        return self.add_delete(self.m.get_interface_no_unicast_bsm(_interface(iface)))

    def set_interface_passive(self, iface: str) -> "PimBatchBuilder":
        return self.add_set(self.m.get_interface_passive(_interface(iface)))

    def delete_interface_passive(self, iface: str) -> "PimBatchBuilder":
        return self.add_delete(self.m.get_interface_passive(_interface(iface)))

    def set_interface_source_address(self, iface: str, value: str) -> "PimBatchBuilder":
        return self.add_set(
            self.m.get_interface_source_address(_interface(iface), _ipv4("source-address", value)))

    def delete_interface_source_address(self, iface: str) -> "PimBatchBuilder":
        return self.add_delete(self.m.get_interface_source_address_delete(_interface(iface)))

    # ========================================================================
    # Interface IGMP Operations
    # ========================================================================

    def set_interface_igmp(self, iface: str) -> "PimBatchBuilder":
        return self.add_set(self.m.get_interface_igmp(_interface(iface)))

    def delete_interface_igmp(self, iface: str) -> "PimBatchBuilder":
        return self.add_delete(self.m.get_interface_igmp(_interface(iface)))

    def set_interface_igmp_disable(self, iface: str) -> "PimBatchBuilder":
        return self.add_set(self.m.get_interface_igmp_disable(_interface(iface)))

    def delete_interface_igmp_disable(self, iface: str) -> "PimBatchBuilder":
        return self.add_delete(self.m.get_interface_igmp_disable(_interface(iface)))

    def set_interface_igmp_join(self, iface: str, group: str) -> "PimBatchBuilder":
        return self.add_set(self.m.get_interface_igmp_join(_interface(iface), _ipv4("igmp join", group)))

    def delete_interface_igmp_join(self, iface: str, group: str) -> "PimBatchBuilder":
        return self.add_delete(self.m.get_interface_igmp_join(_interface(iface), _ipv4("igmp join", group)))

    def set_interface_igmp_join_source(self, iface: str, group: str, source: str) -> "PimBatchBuilder":
        return self.add_set(self.m.get_interface_igmp_join_source(
            _interface(iface), _ipv4("igmp join", group), _ipv4("source-address", source)))

    def delete_interface_igmp_join_source(self, iface: str, group: str, source: str) -> "PimBatchBuilder":
        return self.add_delete(self.m.get_interface_igmp_join_source_delete(
            _interface(iface), _ipv4("igmp join", group), _ipv4("source-address", source)))

    def set_interface_igmp_query_interval(self, iface: str, value: str) -> "PimBatchBuilder":
        return self.add_set(
            self.m.get_interface_igmp_query_interval(_interface(iface), _number("query_interval", value)))

    def delete_interface_igmp_query_interval(self, iface: str) -> "PimBatchBuilder":
        return self.add_delete(self.m.get_interface_igmp_query_interval_delete(_interface(iface)))

    def set_interface_igmp_query_max_response_time(self, iface: str, value: str) -> "PimBatchBuilder":
        return self.add_set(self.m.get_interface_igmp_query_max_response_time(
            _interface(iface), _number("query_max_response_time", value)))

    def delete_interface_igmp_query_max_response_time(self, iface: str) -> "PimBatchBuilder":
        return self.add_delete(self.m.get_interface_igmp_query_max_response_time_delete(_interface(iface)))

    def set_interface_igmp_version(self, iface: str, value: str) -> "PimBatchBuilder":
        return self.add_set(self.m.get_interface_igmp_version(_interface(iface), _number("igmp_version", value)))

    def delete_interface_igmp_version(self, iface: str) -> "PimBatchBuilder":
        return self.add_delete(self.m.get_interface_igmp_version_delete(_interface(iface)))

    # ========================================================================
    # Delete Entire PIM
    # ========================================================================

    def delete_pim(self) -> "PimBatchBuilder":
        return self.add_delete(self.m.get_pim_path())
