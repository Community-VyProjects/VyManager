"""Parser and models for VyOS hardware temperature sensors."""

import re
from typing import List, Optional

from pydantic import BaseModel, Field


class HardwareSensor(BaseModel):
    name: str
    value: str
    status: str = "ok"
    high: Optional[str] = None
    critical: Optional[str] = None


class HardwareSensorsResponse(BaseModel):
    sensors: List[HardwareSensor] = Field(default_factory=list)
    raw: str = ""


def _as_numeric(value: Optional[str]) -> Optional[float]:
    if value is None:
        return None
    match = re.search(r"[-+]?\d+(?:\.\d+)?", value)
    if not match:
        return None
    return float(match.group(0))


def parse_hardware_sensors(text: str) -> HardwareSensorsResponse:
    """Parse common ``sensors``/``show system sensors`` key/value formats."""
    sensors: List[HardwareSensor] = []
    for raw_line in (text or "").splitlines():
        line = raw_line.strip()
        if not line or line.endswith(":") or line.startswith("Adapter"):
            continue
        match = re.match(r"^([^:]+):\s*(.+)$", line)
        if not match:
            continue
        name, raw_value = match.groups()
        lower = line.lower()

        sensor_value = raw_value.split("(", 1)[0].strip()
        high_match = re.search(r"high\s*[:=]\s*([-+]?\d+(?:\.\d+)?)\s*(?:°?[CFK])?", raw_value, re.I)
        critical_match = re.search(r"crit(?:ical)?\s*[:=]\s*([-+]?\d+(?:\.\d+)?)\s*(?:°?[CFK])?", raw_value, re.I)
        reading = _as_numeric(sensor_value)
        high_value = _as_numeric(high_match.group(1) if high_match else None)
        critical_value = _as_numeric(critical_match.group(1) if critical_match else None)

        if reading is not None:
            if critical_value is not None and reading >= critical_value:
                status = "critical"
            elif high_value is not None and reading >= high_value:
                status = "warning"
            else:
                status = "ok"
        elif "alarm" in lower or "crit" in lower:
            status = "critical"
        elif "warn" in lower:
            status = "warning"
        else:
            status = "ok"

        sensors.append(HardwareSensor(
            name=name.strip(), value=sensor_value, status=status,
            high=high_match.group(1).strip() if high_match else None,
            critical=critical_match.group(1).strip() if critical_match else None,
        ))
    return HardwareSensorsResponse(sensors=sensors, raw=text or "")