"""Interface show-text parsers and the counter models they fill.

The request router exposes the endpoints. Parsing ``show interfaces counters``
and ``show interfaces ethernet`` lives here, the same way hardware sensor
text lives in ``hardware_status``.
"""

import re
from typing import List

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
