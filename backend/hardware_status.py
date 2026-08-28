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
        status = "critical" if "crit" in lower or "alarm" in lower else "warning" if "warn" in lower else "ok"
        high = re.search(r"high\s*[:=]\s*([^,)]+)", raw_value, re.I)
        critical = re.search(r"crit(?:ical)?\s*[:=]\s*([^,)]+)", raw_value, re.I)
        sensors.append(HardwareSensor(
            name=name.strip(), value=raw_value.split("(", 1)[0].strip(), status=status,
            high=high.group(1).strip() if high else None,
            critical=critical.group(1).strip() if critical else None,
        ))
    return HardwareSensorsResponse(sensors=sensors, raw=text or "")