"""Parser and response models for VyOS Ethernet transceiver diagnostics."""

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
    "transceiver type": "transceiver",
    "vendor name": "vendor",
    "vendor": "vendor",
    "part number": "part_number",
    "serial number": "serial_number",
}

_MEASUREMENT_NAMES = {
    "module temperature": "temperature",
    "temperature": "temperature",
    "module voltage": "voltage",
    "voltage": "voltage",
    "laser bias current": "laser_bias",
    "laser bias": "laser_bias",
    "tx optical power": "tx_power",
    "tx power": "tx_power",
    "rx optical power": "rx_power",
    "rx power": "rx_power",
}


def _key(value: str) -> str:
    return re.sub(r"\s+", " ", value.strip().lower().rstrip(":"))


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

        measurement = _measurement_key(label_key)
        if measurement:
            measurements[measurement] = _measurement(value)
            continue

        lower = line.lower()
        if "alarm" in lower or "warning" in lower:
            target = status.alarms if "alarm" in lower else status.warnings
            if value and value.lower() not in ("none", "normal", "no"):
                target.append(value)

    status.measurements = measurements
    return status