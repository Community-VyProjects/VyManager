"""Parser and response models for VyOS Ethernet transceiver diagnostics.

Digital diagnostic monitoring (DDM) is a property of a *physical* Ethernet port:
``show interfaces ethernet <name> transceiver`` runs ``ethtool --module-info``,
which only a real NIC answers. VLAN sub-interfaces (``eth0.100``, vif/vif-s/vif-c)
have no module of their own, so they are excluded at the source by
``physical_ethernet_interfaces`` rather than by a caller-side name filter.
"""

import json
import re
from typing import Dict, List, Optional

from pydantic import BaseModel, Field


class TransceiverMeasurement(BaseModel):
    value: Optional[str] = None
    low_alarm: Optional[str] = None
    low_warning: Optional[str] = None
    high_warning: Optional[str] = None
    high_alarm: Optional[str] = None


class TransceiverStatus(BaseModel):
    interface: str
    present: bool = True
    transceiver: Optional[str] = None
    vendor: Optional[str] = None
    part_number: Optional[str] = None
    serial_number: Optional[str] = None
    measurements: Dict[str, TransceiverMeasurement] = Field(default_factory=dict)
    alarms: List[str] = Field(default_factory=list)
    warnings: List[str] = Field(default_factory=list)
    raw: str = ""


_FIELD_NAMES = {
    "identifier": "transceiver",
    "transceiver type": "transceiver",
    "transceiver": "transceiver",
    "vendor name": "vendor",
    "vendor": "vendor",
    "vendor pn": "part_number",
    "part number": "part_number",
    "part": "part_number",
    "vendor sn": "serial_number",
    "serial number": "serial_number",
}

_MEASUREMENT_NAMES = {
    "module temperature": "temperature",
    "temperature": "temperature",
    "module voltage": "voltage",
    "voltage": "voltage",
    "laser bias current": "laser_bias",
    "laser bias": "laser_bias",
    "laser output power": "tx_power",
    "tx optical power": "tx_power",
    "tx power": "tx_power",
    "receiver signal average optical power": "rx_power",
    "rx optical power": "rx_power",
    "rx power": "rx_power",
}

_INACTIVE_FLAG_VALUES = {
    "none",
    "normal",
    "no",
    "off",
    "false",
    "disabled",
    "not implemented",
    "inactive",
    "n/a",
    "na",
}


def _key(value: str) -> str:
    return re.sub(r"\s+", " ", value.strip().lower().rstrip(":"))


def _is_threshold_label(value: str) -> bool:
    normalized = _key(value)
    if "threshold" not in normalized:
        return False
    return any(token in normalized for token in ("low", "high", "alarm", "warning", "crit"))


def _is_flag_label(value: str) -> bool:
    normalized = _key(value)
    return any(token in normalized for token in ("low alarm", "low warning", "high alarm", "high warning", "alarm", "warning"))


def _measurement_key(value: str) -> Optional[str]:
    normalized = _key(value)
    for name, result in _MEASUREMENT_NAMES.items():
        if normalized.startswith(name):
            return result
    return None


def _measurement(value: str) -> TransceiverMeasurement:
    """Split a current value from inline alarm/warning thresholds."""
    thresholds = {}
    for label, field in (("low alarm", "low_alarm"), ("low warning", "low_warning"),
                         ("high warning", "high_warning"), ("high alarm", "high_alarm")):
        match = re.search(rf"{label}\s*[:=]\s*([^,;)]+)", value, re.I)
        if match:
            thresholds[field] = match.group(1).strip()
    current = value.split("(", 1)[0].strip()
    return TransceiverMeasurement(value=current, **thresholds)


def parse_transceiver_output(interface: str, text: str) -> TransceiverStatus:
    """Parse key/value output from ``show interfaces ethernet ... transceiver``."""
    status = TransceiverStatus(interface=interface, raw=text or "")
    measurements: Dict[str, TransceiverMeasurement] = {}

    for raw_line in (text or "").splitlines():
        line = raw_line.strip()
        if not line:
            continue
        if "not present" in line.lower() or "no transceiver" in line.lower():
            status.present = False

        if ":" in line:
            label, value = line.split(":", 1)
        else:
            match = re.match(r"^(.+?)\s{2,}(.+)$", line)
            if not match:
                continue
            label, value = match.groups()
        label_key = _key(label)
        value = value.strip()

        if label_key in _FIELD_NAMES:
            setattr(status, _FIELD_NAMES[label_key], value)
            continue

        if _is_threshold_label(label_key):
            continue

        lower = label_key.lower()
        if "flags implemented" in lower or ("implemented" in lower and "flag" in lower):
            continue
        if lower in {"alarm flags", "alarm flag", "warning flags", "warning flag"}:
            target = status.alarms if "alarm" in lower else status.warnings
            if value and value.lower() not in _INACTIVE_FLAG_VALUES:
                target.append(value)
            continue

        if _is_flag_label(label_key):
            target = status.alarms if "alarm" in lower else status.warnings
            if value and value.lower() not in _INACTIVE_FLAG_VALUES:
                target.append(value)
            continue

        measurement = _measurement_key(label_key)
        if measurement:
            measurements[measurement] = _measurement(value)
            continue

    status.measurements = measurements
    return status


# ============================================================================
# Dashboard SSE channel
# ============================================================================

# Each alias is one ``ethtool --module-info`` on the router. Measured on the
# 1.5 lab: ~0.42 s per port, linear in the number of aliases (1/2/8/16 aliases
# took 0.43/0.84/3.27/6.75 s). A 48-port box is therefore ~20 s for one sweep,
# which is why this never rides the shared dashboard query and runs as its own
# task instead.
_TRANSCEIVER_SECONDS_PER_PORT = 0.42

# Upper bound on ports swept per cycle, so a chassis with a very large port
# count cannot turn one sweep into a multi-minute request.
TRANSCEIVER_MAX_PORTS = 64


def transceiver_fetch_timeout(port_count: int) -> float:
    """HTTP timeout for one sweep, scaled by the measured per-port cost.

    A fixed 15-30 s timeout is wrong here: the sweep is linear in port count, so
    a two-port lab VM and a 48-port switch need very different ceilings. 3x the
    measured cost plus a 10 s floor absorbs a loaded router without letting a
    stuck sweep pin the task forever.
    """
    ports = max(0, min(port_count, TRANSCEIVER_MAX_PORTS))
    return max(10.0, ports * _TRANSCEIVER_SECONDS_PER_PORT * 3.0)


def physical_ethernet_interfaces(full_config) -> List[str]:
    """Return configured *physical* Ethernet port names, sorted.

    Only the top-level keys of ``interfaces ethernet`` are physical ports. VLAN
    sub-interfaces live nested under ``vif`` / ``vif-s`` / ``vif-c`` on their
    parent and are never returned, because a VLAN has no transceiver of its own
    (``ethtool --module-info eth0.100`` fails with "No such device").
    """
    ethernet = ((full_config or {}).get("interfaces") or {}).get("ethernet") or {}
    if not isinstance(ethernet, dict):
        return []
    return sorted(str(name) for name in ethernet)


def transceiver_alias(interface: str) -> str:
    """Return a GraphQL-safe alias for one interface, e.g. ``Transceiver_eth0``."""
    return f"Transceiver_{re.sub(r'[^_a-zA-Z0-9]', '_', interface)}"


def transceiver_gql_fields(key_literal: str, interfaces: List[str]) -> List[str]:
    """One aliased ``Show`` field per physical port.

    ``key_literal`` must already be a JSON-encoded API key (``json.dumps(key)``),
    matching the other ``*_gql_fields`` helpers.
    """
    fields = []
    for interface in interfaces[:TRANSCEIVER_MAX_PORTS]:
        path = json.dumps(["interfaces", "ethernet", interface, "transceiver"])
        fields.append(
            f"{transceiver_alias(interface)}: Show(data: {{key: {key_literal}, path: {path}}}) {{ data {{ result }} }}"
        )
    return fields


def build_transceiver_status(gql: dict, interfaces: List[str]) -> dict:
    """Build the ``transceiver-health`` SSE payload from the sidecar GraphQL result.

    ``interfaces`` must be the same list the query was built from so the aliases
    line up. The raw ``ethtool`` text is dropped: nothing renders it, and it would
    be re-sent to every subscriber on every cycle.
    """
    ports = []
    for interface in interfaces[:TRANSCEIVER_MAX_PORTS]:
        node = (gql or {}).get(transceiver_alias(interface)) or {}
        result = (node.get("data") or {}).get("result")
        status = parse_transceiver_output(interface, result if isinstance(result, str) else "")
        ports.append(status.model_dump(exclude={"raw"}))
    return {"interfaces": ports, "total": len(ports)}