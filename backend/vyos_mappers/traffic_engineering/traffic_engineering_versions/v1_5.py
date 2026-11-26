"""VyOS 1.5 Traffic Engineering mapper.

``protocols traffic-engineering`` exists only on 1.5. Path methods do not
re-check the node: the builder already called ``require_node``.

Leaves under ``protocols traffic-engineering``:

  admin-group <name>                       tag [-a-zA-Z0-9]+
    bit-position <0-31>                    required, unique per group
  interface <name>                         tag
    admin-group <name>                     multi, a configured admin-group
    max-bandwidth <1-4294967295>
    max-reservable-bandwidth <1-4294967295>
    metric <1-4294967295>
"""

from __future__ import annotations

import re
from typing import Dict, List, Tuple

from ..traffic_engineering import TrafficEngineeringMapper

BASE = ["protocols", "traffic-engineering"]

# Lab node.def regexes. ASCII and \Z so a non-ASCII digit or a trailing newline
# cannot pass.
_GROUP_NAME = re.compile(r"[-a-zA-Z0-9]+\Z", re.ASCII)
# The interface tag passes validate-value when either its regex or
# interface-exists passes (any existing interface, QinQ and host names
# included), so only a shape that cannot reach the CLI as one word is refused.
_INTERFACE = re.compile(r"[^\s,'\"]+\Z", re.ASCII)
_DIGITS = re.compile(r"[0-9]+\Z", re.ASCII)

# Lab val_help ranges.
BIT_POSITION_RANGE: Tuple[int, int] = (0, 31)
U32_RANGE: Tuple[int, int] = (1, 4294967295)


def _number(value: str, bounds: Tuple[int, int], label: str) -> str:
    low, high = bounds
    if not _DIGITS.match(value) or not low <= int(value) <= high:
        raise ValueError(f"{label} must be {low}-{high}")
    return value


class TrafficEngineeringMapperV1_5(TrafficEngineeringMapper):
    """Traffic Engineering mapper for VyOS 1.5 and rolling."""

    # ------------------------------------------------------------------
    # Value ranges
    # ------------------------------------------------------------------

    def value_ranges(self) -> Dict[str, Dict[str, int]]:
        def bounds(pair: Tuple[int, int]) -> Dict[str, int]:
            return {"min": pair[0], "max": pair[1]}

        return {
            "bit_position": bounds(BIT_POSITION_RANGE),
            "max_bandwidth": bounds(U32_RANGE),
            "max_reservable_bandwidth": bounds(U32_RANGE),
            "metric": bounds(U32_RANGE),
        }

    # ------------------------------------------------------------------
    # Whole tree
    # ------------------------------------------------------------------

    def get_te_delete(self) -> List[str]:
        return list(BASE)

    # ------------------------------------------------------------------
    # Admin groups
    # ------------------------------------------------------------------

    def get_admin_group(self, name: str) -> List[str]:
        return BASE + ["admin-group", self._group_name(name)]

    def get_admin_group_delete(self, name: str) -> List[str]:
        return self.get_admin_group(name)

    def get_admin_group_bit_position(self, name: str, bit: str) -> List[str]:
        return self.get_admin_group(name) + [
            "bit-position",
            _number(bit, BIT_POSITION_RANGE, "Bit position"),
        ]

    def get_admin_group_bit_position_delete(self, name: str) -> List[str]:
        return self.get_admin_group(name) + ["bit-position"]

    # ------------------------------------------------------------------
    # Interfaces
    # ------------------------------------------------------------------

    def get_interface(self, iface: str) -> List[str]:
        if not _INTERFACE.match(iface):
            raise ValueError("Invalid interface name")
        return BASE + ["interface", iface]

    def get_interface_delete(self, iface: str) -> List[str]:
        return self.get_interface(iface)

    def get_interface_admin_group(self, iface: str, group: str) -> List[str]:
        return self.get_interface(iface) + ["admin-group", self._group_name(group)]

    def get_interface_admin_group_delete(self, iface: str, group: str) -> List[str]:
        return self.get_interface_admin_group(iface, group)

    def get_interface_max_bandwidth(self, iface: str, value: str) -> List[str]:
        return self.get_interface(iface) + [
            "max-bandwidth",
            _number(value, U32_RANGE, "Max bandwidth"),
        ]

    def get_interface_max_bandwidth_delete(self, iface: str) -> List[str]:
        return self.get_interface(iface) + ["max-bandwidth"]

    def get_interface_max_reservable_bandwidth(self, iface: str, value: str) -> List[str]:
        return self.get_interface(iface) + [
            "max-reservable-bandwidth",
            _number(value, U32_RANGE, "Max reservable bandwidth"),
        ]

    def get_interface_max_reservable_bandwidth_delete(self, iface: str) -> List[str]:
        return self.get_interface(iface) + ["max-reservable-bandwidth"]

    def get_interface_metric(self, iface: str, value: str) -> List[str]:
        return self.get_interface(iface) + ["metric", _number(value, U32_RANGE, "Metric")]

    def get_interface_metric_delete(self, iface: str) -> List[str]:
        return self.get_interface(iface) + ["metric"]

    # ------------------------------------------------------------------
    # Value checks
    # ------------------------------------------------------------------

    @staticmethod
    def _group_name(name: str) -> str:
        if not _GROUP_NAME.match(name):
            raise ValueError("Admin group names must be letters, digits, and hyphens")
        return name
