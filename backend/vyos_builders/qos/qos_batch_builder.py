"""
QoS Batch Builder

Generates VyOS set/delete operations for Quality of Service (qos).

QoS is a very large, regular tree (13 policy types, shared class/default/match
sub-trees, interface bindings, traffic-match-groups). Rather than a named method
per leaf, this builder exposes a *compact parametrized* API: the variable leaf
path is supplied by the caller as a "/"-separated ``field`` string (e.g.
"ip/destination/address"), which is split into path segments. Structural roots
(policy/class/default/match/traffic-match-group) are owned by the mapper.

The router dispatches operations by builder-method name with comma-separated
arguments; the trailing argument (the value) absorbs any extra commas, so
free-text values such as descriptions are preserved.

Version differences (surfaced via capabilities):
  - ``traffic-match-group`` and per-class ``match-group`` are 1.5 only.
  - ``shaper-hfsc`` exists on both 1.4 and 1.5.
"""

from typing import List, Dict, Any
from vyos_mappers import CommandMapperRegistry

# ---------------------------------------------------------------------------
# Shared option lists (sourced from the VyOS templates)
# ---------------------------------------------------------------------------

POLICY_TYPES = [
    "cake", "drop-tail", "fair-queue", "fq-codel", "limiter",
    "network-emulator", "priority-queue", "random-detect", "rate-control",
    "round-robin", "shaper", "shaper-hfsc",
]

QUEUE_TYPES = ["drop-tail", "fair-queue", "fq-codel", "priority", "random-detect"]
EXCEED_ACTIONS = ["continue", "drop", "ok", "reclassify", "pipe"]
FLOW_ISOLATION_MODES = [
    "blind", "dst-host", "dual-dst-host", "dual-src-host", "flow", "host",
    "src-host", "triple-isolate",
]
DSCP_NAMES = [
    "default", "reliability", "throughput", "lowdelay", "priority", "immediate",
    "flash", "flash-override", "critical", "internet", "network",
    "AF11", "AF12", "AF13", "AF21", "AF22", "AF23", "AF31", "AF32", "AF33",
    "AF41", "AF42", "AF43", "CS1", "CS2", "CS3", "CS4", "CS5", "CS6", "CS7", "EF",
]
ETHER_PROTOCOLS = [
    "all", "ip", "ipv6", "arp", "atalk", "ipx", "802.1Q", "802_2", "802_3",
    "aarp", "aoe", "dec", "lat", "localtalk", "rarp", "snap", "x25",
]
BANDWIDTH_SUFFIXES = ["bit", "kbit", "mbit", "gbit", "tbit", "%"]


def _segs(field: str) -> List[str]:
    """Split a "/"-separated field string into path segments."""
    return [s for s in field.split("/") if s != ""]


class QoSBatchBuilder:
    def __init__(self, version: str):
        self.version = version
        self._operations: List[Dict[str, Any]] = []
        self.mappers = CommandMapperRegistry.get_all_mappers(version)
        self.m = self.mappers["qos"]

    # -----------------------------------------------------------------------
    # Core helpers
    # -----------------------------------------------------------------------

    def add_set(self, path: List[str]) -> "QoSBatchBuilder":
        if path:
            self._operations.append({"op": "set", "path": path})
        return self

    def add_delete(self, path: List[str]) -> "QoSBatchBuilder":
        if path:
            self._operations.append({"op": "delete", "path": path})
        return self

    def get_operations(self) -> List[Dict[str, Any]]:
        return self._operations.copy()

    def is_empty(self) -> bool:
        return len(self._operations) == 0

    # -----------------------------------------------------------------------
    # Capabilities
    # -----------------------------------------------------------------------

    def get_capabilities(self) -> Dict[str, Any]:
        is_1_4 = "1.4" in self.version
        is_1_5 = not is_1_4

        return {
            "version": self.version,
            "features": {
                "qos": {"supported": True, "description": "Quality of Service"},
                "policy_types": POLICY_TYPES,
                "traffic_match_group": {
                    "supported": is_1_5,
                    "description": "Reusable QoS filter groups",
                },
                "match_group": {
                    "supported": is_1_5,
                    "description": "Reference a traffic-match-group from a class",
                },
                "shaper_hfsc": {"supported": True},
                "enums": {
                    "queue_types": QUEUE_TYPES,
                    "exceed_actions": EXCEED_ACTIONS,
                    "flow_isolation_modes": FLOW_ISOLATION_MODES,
                    "dscp_names": DSCP_NAMES,
                    "ether_protocols": ETHER_PROTOCOLS,
                    "bandwidth_suffixes": BANDWIDTH_SUFFIXES,
                },
            },
            "version_info": {"is_1_4": is_1_4, "is_1_5": is_1_5},
        }

    # =======================================================================
    # Global
    # =======================================================================

    def delete_qos(self) -> "QoSBatchBuilder":
        return self.add_delete(self.m.get_qos_delete())

    # =======================================================================
    # Interface bindings
    # =======================================================================

    def set_interface_ingress(self, ifname: str, policy: str) -> "QoSBatchBuilder":
        return self.add_set(self.m.get_interface_ingress(ifname, policy))

    def delete_interface_ingress(self, ifname: str) -> "QoSBatchBuilder":
        return self.add_delete(self.m.get_interface_ingress_delete(ifname))

    def set_interface_egress(self, ifname: str, policy: str) -> "QoSBatchBuilder":
        return self.add_set(self.m.get_interface_egress(ifname, policy))

    def delete_interface_egress(self, ifname: str) -> "QoSBatchBuilder":
        return self.add_delete(self.m.get_interface_egress_delete(ifname))

    def delete_interface(self, ifname: str) -> "QoSBatchBuilder":
        return self.add_delete(self.m.get_interface(ifname))

    # =======================================================================
    # Policy lifecycle + scalar/flag fields
    # =======================================================================

    def set_policy(self, ptype: str, name: str) -> "QoSBatchBuilder":
        return self.add_set(self.m.get_policy(ptype, name))

    def delete_policy(self, ptype: str, name: str) -> "QoSBatchBuilder":
        return self.add_delete(self.m.get_policy(ptype, name))

    def set_policy_field(self, ptype: str, name: str, field: str, value: str) -> "QoSBatchBuilder":
        return self.add_set(self.m.get_policy_field(ptype, name, _segs(field), value))

    def delete_policy_field(self, ptype: str, name: str, field: str) -> "QoSBatchBuilder":
        return self.add_delete(self.m.get_policy_field_delete(ptype, name, _segs(field)))

    def set_policy_flag(self, ptype: str, name: str, field: str) -> "QoSBatchBuilder":
        """Set a valueless (presence) policy node, e.g. cake flow-isolation/nat."""
        return self.add_set(self.m.get_policy_field_delete(ptype, name, _segs(field)))

    def delete_policy_flag(self, ptype: str, name: str, field: str) -> "QoSBatchBuilder":
        return self.add_delete(self.m.get_policy_field_delete(ptype, name, _segs(field)))

    # =======================================================================
    # Class / default (cls == "default" targets the default node)
    # =======================================================================

    def set_class(self, ptype: str, name: str, cls: str) -> "QoSBatchBuilder":
        return self.add_set(self.m.get_class(ptype, name, cls))

    def delete_class(self, ptype: str, name: str, cls: str) -> "QoSBatchBuilder":
        return self.add_delete(self.m.get_class(ptype, name, cls))

    def set_class_field(self, ptype: str, name: str, cls: str, field: str, value: str) -> "QoSBatchBuilder":
        return self.add_set(self.m.get_class_field(ptype, name, cls, _segs(field), value))

    def delete_class_field(self, ptype: str, name: str, cls: str, field: str) -> "QoSBatchBuilder":
        return self.add_delete(self.m.get_class_field_delete(ptype, name, cls, _segs(field)))

    def set_class_match_group(self, ptype: str, name: str, cls: str, group: str) -> "QoSBatchBuilder":
        return self.add_set(self.m.get_class_match_group(ptype, name, cls, group))

    def delete_class_match_group(self, ptype: str, name: str, cls: str, group: str) -> "QoSBatchBuilder":
        return self.add_delete(self.m.get_class_match_group(ptype, name, cls, group))

    # ------------------------------------------------------------ class match
    def set_class_match(self, ptype: str, name: str, cls: str, rule: str) -> "QoSBatchBuilder":
        return self.add_set(self.m.get_class_match(ptype, name, cls, rule))

    def delete_class_match(self, ptype: str, name: str, cls: str, rule: str) -> "QoSBatchBuilder":
        return self.add_delete(self.m.get_class_match(ptype, name, cls, rule))

    def set_class_match_field(self, ptype: str, name: str, cls: str, rule: str, field: str, value: str) -> "QoSBatchBuilder":
        return self.add_set(self.m.get_class_match_field(ptype, name, cls, rule, _segs(field), value))

    def delete_class_match_field(self, ptype: str, name: str, cls: str, rule: str, field: str) -> "QoSBatchBuilder":
        return self.add_delete(self.m.get_class_match_field_delete(ptype, name, cls, rule, _segs(field)))

    def set_class_match_flag(self, ptype: str, name: str, cls: str, rule: str, field: str) -> "QoSBatchBuilder":
        """Set a valueless match leaf, e.g. ip/tcp/ack."""
        return self.add_set(self.m.get_class_match_field_delete(ptype, name, cls, rule, _segs(field)))

    def delete_class_match_flag(self, ptype: str, name: str, cls: str, rule: str, field: str) -> "QoSBatchBuilder":
        return self.add_delete(self.m.get_class_match_field_delete(ptype, name, cls, rule, _segs(field)))

    # =======================================================================
    # Traffic match group (1.5 only)
    # =======================================================================

    def set_tmg(self, group: str) -> "QoSBatchBuilder":
        return self.add_set(self.m.get_tmg(group))

    def delete_tmg(self, group: str) -> "QoSBatchBuilder":
        return self.add_delete(self.m.get_tmg(group))

    def set_tmg_field(self, group: str, field: str, value: str) -> "QoSBatchBuilder":
        return self.add_set(self.m.get_tmg_field(group, _segs(field), value))

    def delete_tmg_field(self, group: str, field: str) -> "QoSBatchBuilder":
        return self.add_delete(self.m.get_tmg_field_delete(group, _segs(field)))

    def set_tmg_match_group(self, group: str, ref: str) -> "QoSBatchBuilder":
        return self.add_set(self.m.get_tmg_match_group(group, ref))

    def delete_tmg_match_group(self, group: str, ref: str) -> "QoSBatchBuilder":
        return self.add_delete(self.m.get_tmg_match_group(group, ref))

    def set_tmg_match(self, group: str, rule: str) -> "QoSBatchBuilder":
        return self.add_set(self.m.get_tmg_match(group, rule))

    def delete_tmg_match(self, group: str, rule: str) -> "QoSBatchBuilder":
        return self.add_delete(self.m.get_tmg_match(group, rule))

    def set_tmg_match_field(self, group: str, rule: str, field: str, value: str) -> "QoSBatchBuilder":
        return self.add_set(self.m.get_tmg_match_field(group, rule, _segs(field), value))

    def delete_tmg_match_field(self, group: str, rule: str, field: str) -> "QoSBatchBuilder":
        return self.add_delete(self.m.get_tmg_match_field_delete(group, rule, _segs(field)))

    def set_tmg_match_flag(self, group: str, rule: str, field: str) -> "QoSBatchBuilder":
        return self.add_set(self.m.get_tmg_match_field_delete(group, rule, _segs(field)))

    def delete_tmg_match_flag(self, group: str, rule: str, field: str) -> "QoSBatchBuilder":
        return self.add_delete(self.m.get_tmg_match_field_delete(group, rule, _segs(field)))
