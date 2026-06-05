"""QoS (Quality of Service) Command Mapper.

Maps QoS configuration to VyOS config paths under: qos

Because QoS is an exceptionally large, deeply-nested and highly regular tree
(13 policy types, shared class/default/match sub-trees, interface bindings and
traffic-match-groups), this mapper exposes *compact parametrized* path builders
rather than one named method per leaf. The variable leaf path is supplied by the
caller as a list of ``segments`` (e.g. ``["ip", "destination", "address"]``),
while the mapper owns the structural roots (policy/class/default/match/etc.).

Version differences (gated via capabilities, not paths):
  - ``traffic-match-group`` and the per-class ``match-group`` reference are 1.5 only.
  - ``shaper-hfsc`` exists on both 1.4 and 1.5.
Paths are identical strings across versions, so no version-specific overrides.
"""
from typing import List
from ..base import BaseFeatureMapper

BASE = ["qos"]


class QoSMapper(BaseFeatureMapper):
    def __init__(self, version: str):
        super().__init__(version)

    def get_qos_delete(self) -> List[str]:
        return BASE

    # ========================================================================
    # Interface bindings
    # ========================================================================

    def get_interface(self, ifname: str) -> List[str]:
        return BASE + ["interface", ifname]

    def get_interface_ingress(self, ifname: str, policy: str) -> List[str]:
        return BASE + ["interface", ifname, "ingress", policy]

    def get_interface_ingress_delete(self, ifname: str) -> List[str]:
        return BASE + ["interface", ifname, "ingress"]

    def get_interface_egress(self, ifname: str, policy: str) -> List[str]:
        return BASE + ["interface", ifname, "egress", policy]

    def get_interface_egress_delete(self, ifname: str) -> List[str]:
        return BASE + ["interface", ifname, "egress"]

    # ========================================================================
    # Policy roots
    # ========================================================================

    def get_policy(self, ptype: str, name: str) -> List[str]:
        return BASE + ["policy", ptype, name]

    def get_policy_field(self, ptype: str, name: str, segments: List[str], value: str) -> List[str]:
        return BASE + ["policy", ptype, name] + segments + [value]

    def get_policy_field_delete(self, ptype: str, name: str, segments: List[str]) -> List[str]:
        return BASE + ["policy", ptype, name] + segments

    # ========================================================================
    # Class / default (cls == "default" targets the default policy node)
    # ========================================================================

    def _class_base(self, ptype: str, name: str, cls: str) -> List[str]:
        base = BASE + ["policy", ptype, name]
        if cls == "default":
            return base + ["default"]
        return base + ["class", cls]

    def get_class(self, ptype: str, name: str, cls: str) -> List[str]:
        return self._class_base(ptype, name, cls)

    def get_class_field(self, ptype: str, name: str, cls: str, segments: List[str], value: str) -> List[str]:
        return self._class_base(ptype, name, cls) + segments + [value]

    def get_class_field_delete(self, ptype: str, name: str, cls: str, segments: List[str]) -> List[str]:
        return self._class_base(ptype, name, cls) + segments

    def get_class_match_group(self, ptype: str, name: str, cls: str, group: str) -> List[str]:
        return self._class_base(ptype, name, cls) + ["match-group", group]

    # ------------------------------------------------------------ class match
    def get_class_match(self, ptype: str, name: str, cls: str, rule: str) -> List[str]:
        return self._class_base(ptype, name, cls) + ["match", rule]

    def get_class_match_field(self, ptype: str, name: str, cls: str, rule: str, segments: List[str], value: str) -> List[str]:
        return self._class_base(ptype, name, cls) + ["match", rule] + segments + [value]

    def get_class_match_field_delete(self, ptype: str, name: str, cls: str, rule: str, segments: List[str]) -> List[str]:
        return self._class_base(ptype, name, cls) + ["match", rule] + segments

    # ========================================================================
    # Traffic match group (1.5 only)
    # ========================================================================

    def get_tmg(self, group: str) -> List[str]:
        return BASE + ["traffic-match-group", group]

    def get_tmg_field(self, group: str, segments: List[str], value: str) -> List[str]:
        return BASE + ["traffic-match-group", group] + segments + [value]

    def get_tmg_field_delete(self, group: str, segments: List[str]) -> List[str]:
        return BASE + ["traffic-match-group", group] + segments

    def get_tmg_match_group(self, group: str, ref: str) -> List[str]:
        return BASE + ["traffic-match-group", group, "match-group", ref]

    def get_tmg_match(self, group: str, rule: str) -> List[str]:
        return BASE + ["traffic-match-group", group, "match", rule]

    def get_tmg_match_field(self, group: str, rule: str, segments: List[str], value: str) -> List[str]:
        return BASE + ["traffic-match-group", group, "match", rule] + segments + [value]

    def get_tmg_match_field_delete(self, group: str, rule: str, segments: List[str]) -> List[str]:
        return BASE + ["traffic-match-group", group, "match", rule] + segments
