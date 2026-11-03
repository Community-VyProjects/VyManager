"""Interface show parsers and the models they fill.

The request router exposes the endpoints. Parsing ``show interfaces counters``,
``show interfaces ethernet``, and ``show interfaces kernel json`` lives here,
the same way hardware sensor text lives in ``hardware_status``.
"""

import json
import re
from typing import Dict, List, Optional

from pydantic import BaseModel


class InterfaceCounter(BaseModel):
    """Model for interface counter statistics."""
    interface: str
    rx_packets: int
    rx_bytes: int
    tx_packets: int
    tx_bytes: int
    rx_dropped: int
    tx_dropped: int
    rx_errors: int
    tx_errors: int


class InterfaceCountersResponse(BaseModel):
    """Response containing interface counter data."""
    interfaces: List[InterfaceCounter]
    total: int


def parse_gql_interface_counters(ifaces: list) -> List["InterfaceCounter"]:
    """Convert GraphQL interface counter list to InterfaceCounter models.

    GraphQL uses ``ifname``, ``rx_over_errors``, ``tx_carrier_errors``
    instead of ``interface``, ``rx_errors``, ``tx_errors``.
    """
    result = []
    for iface in (ifaces or []):
        try:
            result.append(InterfaceCounter(
                interface=iface["ifname"],
                rx_packets=iface.get("rx_packets", 0),
                rx_bytes=iface.get("rx_bytes", 0),
                tx_packets=iface.get("tx_packets", 0),
                tx_bytes=iface.get("tx_bytes", 0),
                rx_dropped=iface.get("rx_dropped", 0),
                tx_dropped=iface.get("tx_dropped", 0),
                rx_errors=iface.get("rx_over_errors", 0),
                tx_errors=iface.get("tx_carrier_errors", 0),
            ))
        except (KeyError, ValueError):
            continue
    return result


def parse_interface_counters(output: str) -> List[InterfaceCounter]:
    """
    Parse VyOS 'show interface counters' output into structured data.
    
    Example output:
    Interface    Rx Packets    Rx Bytes      Tx Packets    Tx Bytes      Rx Dropped    Tx Dropped    Rx Errors    Tx Errors
    -----------  ------------  ------------  ------------  ------------  ------------  ------------  -----------  -----------
    eth0         270118073     394898880459  116821247     124641177808  0             0             0            0
    """
    interfaces = []
    
    if not output or not isinstance(output, str):
        return interfaces
    
    lines = output.strip().split('\n')
    
    # Skip header lines (first 2 lines)
    for line in lines[2:]:
        # Split by whitespace
        parts = line.split()
        
        if len(parts) >= 9:
            try:
                interface = InterfaceCounter(
                    interface=parts[0],
                    rx_packets=int(parts[1]),
                    rx_bytes=int(parts[2]),
                    tx_packets=int(parts[3]),
                    tx_bytes=int(parts[4]),
                    rx_dropped=int(parts[5]),
                    tx_dropped=int(parts[6]),
                    rx_errors=int(parts[7]),
                    tx_errors=int(parts[8])
                )
                interfaces.append(interface)
            except (ValueError, IndexError):
                # Skip malformed lines
                continue
    
    return interfaces


def parse_show_ethernet_names(output: str) -> List[str]:
    """Physical ``ethN`` names from ``show interfaces ethernet`` text."""
    names: List[str] = []
    for line in (output or "").split("\n"):
        parts = line.split()
        if parts and re.match(r"^eth\d+$", parts[0]):
            names.append(parts[0])
    return names


class InterfaceName(BaseModel):
    """One interface name for the picker, from config or the kernel show."""
    name: str
    type: str
    description: Optional[str] = None


# Maps the kernel's ``linkinfo.info_kind`` to the config-style ``type`` value
# the frontend expects (consumers filter on these, e.g. "ethernet"/"bonding").
# Anything not listed falls through to the raw info_kind / link_type.
_KERNEL_KIND_TO_TYPE: dict[str, str] = {
    "vlan": "vif",
    "bond": "bonding",
    "veth": "virtual-ethernet",
}


def _kernel_iface_type(entry: dict) -> str:
    """Derive a config-style ``type`` for a kernel interface entry.

    Used only for interfaces not present in the VyOS config (e.g. container or
    host-created interfaces); for configured interfaces the config type wins.
    """
    info_kind = ""
    linkinfo = entry.get("linkinfo")
    if isinstance(linkinfo, dict):
        info_kind = linkinfo.get("info_kind") or ""
    if info_kind:
        return _KERNEL_KIND_TO_TYPE.get(info_kind, info_kind)

    link_type = entry.get("link_type") or ""
    if link_type == "loopback":
        return "loopback"
    if link_type == "ether":
        return "ethernet"
    return link_type or "unknown"


def _interfaces_from_kernel(json_str: str, config_index: Dict[str, InterfaceName]) -> List[InterfaceName]:
    """Build the interface list from ``show interfaces kernel json`` output.

    The output is an ``ip -d -s -j link show`` style array covering every kernel
    interface (including container/host-created ones). Config wins for type and
    description; interfaces only in the config (e.g. a down pppoe/tunnel) are
    unioned back in so they never disappear from dropdowns. ``pim6reg`` registers
    are filtered out (no useful insight per issue #6). Sorted by name.
    """
    data = json.loads(json_str)
    if not isinstance(data, list):
        raise ValueError("kernel interface output is not a JSON array")

    interfaces: List[InterfaceName] = []
    seen: set = set()

    for entry in data:
        if not isinstance(entry, dict):
            continue
        name = entry.get("ifname")
        if not name:
            continue
        # Filter out PIM register interfaces (pim6reg / pimreg) - no useful insight.
        if entry.get("link_type") == "pimreg" or name.startswith("pim6reg") or name.startswith("pimreg"):
            continue

        seen.add(name)
        cfg_entry = config_index.get(name)
        if cfg_entry is not None:
            # Config wins for type + description.
            interfaces.append(cfg_entry)
        else:
            interfaces.append(InterfaceName(
                name=name,
                type=_kernel_iface_type(entry),
                description=(entry.get("ifalias") or None),
            ))

    # Union: configured interfaces that have no kernel device right now
    # (e.g. disconnected pppoe, down tunnels/openvpn) must still be selectable.
    for name, cfg_entry in config_index.items():
        if name not in seen:
            interfaces.append(cfg_entry)

    interfaces.sort(key=lambda x: x.name)
    return interfaces

