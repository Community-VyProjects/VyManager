"""Parser and models for VyOS hardware temperature sensors from `show environment sensors`."""

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
    summary: str = ""


def _as_numeric(value: Optional[str]) -> Optional[float]:
    if value is None:
        return None
    match = re.search(r"[-+]?\d+(?:\.\d+)?", value)
    if not match:
        return None
    return float(match.group(0))


def _build_hardware_summary(sensors: List[HardwareSensor]) -> str:
    """Return a compact global status sentence from the parsed sensor states."""
    critical_count = sum(1 for sensor in sensors if sensor.status == "critical")
    warning_count = sum(1 for sensor in sensors if sensor.status == "warning")

    if critical_count == 0 and warning_count == 0:
        return "No issues"

    parts: List[str] = []
    if critical_count:
        parts.append(f"{critical_count} in critical" if critical_count != 1 else "1 in critical")
    if warning_count:
        parts.append(f"{warning_count} in warning" if warning_count != 1 else "1 in warning")

    return " and ".join(parts)


def parse_hardware_sensors(text: str) -> HardwareSensorsResponse:
    """Parse VyOS ``show environment sensors`` output format.
    
    Handles output like:
    ```
    k10temp-pci-00c3
    temp1:        +54.6°C  (high = +70.0°C)
                           (crit = +105.0°C, hyst = +104.0°C)
    
    fam15h_power-pci-00c4
    power1:        3.28 W  (interval =   0.01 s, crit =   6.00 W)
    ```
    
    And handles hypervisor/bare metal cases:
    - "VyOS running under hypervisor, no sensors available"
    - "No sensors found"
    """
    sensors: List[HardwareSensor] = []
    
    # Check for no sensors available
    lower_text = (text or "").lower().strip()
    if "no sensors available" in lower_text or "no sensors found" in lower_text:
        return HardwareSensorsResponse(sensors=[], raw=text or "", summary="")
    
    lines = (text or "").splitlines()
    current_adapter = None
    
    for i, raw_line in enumerate(lines):
        line = raw_line.rstrip()
        stripped = line.strip()
        
        # Skip empty lines
        if not stripped:
            continue
            
        # Adapter/Device name lines (no colon)
        if ":" not in stripped:
            current_adapter = stripped
            continue
            
        # Sensor data lines (contain colon)
        match = re.match(r"^([^:]+):\s*(.+)$", stripped)
        if not match:
            continue
        
        sensor_name, raw_value = match.groups()
        
        # Build full sensor name with adapter prefix
        full_name = f"{current_adapter}: {sensor_name}" if current_adapter else sensor_name
        
        # Parse sensor value (before parentheses)
        sensor_value = raw_value.split("(", 1)[0].strip()
        
        # Combine current line with next line for threshold parsing (handles multi-line VyOS output)
        combined_value = raw_value
        if i + 1 < len(lines):
            combined_value += " " + lines[i + 1].strip()
        
        # Extract thresholds
        high_match = re.search(r"high\s*[:=]\s*([-+]?\d+(?:\.\d+)?)\s*(?:°?[CFK])?", combined_value, re.I)
        critical_match = re.search(r"crit(?:ical)?\s*[:=]\s*([-+]?\d+(?:\.\d+)?)\s*(?:°?[CFK])?", combined_value, re.I)
        
        reading = _as_numeric(sensor_value)
        high_value = _as_numeric(high_match.group(1) if high_match else None)
        critical_value = _as_numeric(critical_match.group(1) if critical_match else None)
        
        # Determine status
        if reading is not None:
            if critical_value is not None and reading >= critical_value:
                status = "critical"
            elif high_value is not None and reading >= high_value:
                status = "warning"
            else:
                status = "ok"
        elif "alarm" in raw_value.lower() or "crit" in raw_value.lower():
            status = "critical"
        elif "warn" in raw_value.lower():
            status = "warning"
        else:
            status = "ok"
        
        sensors.append(HardwareSensor(
            name=full_name.strip(),
            value=sensor_value,
            status=status,
            high=high_match.group(1).strip() if high_match else None,
            critical=critical_match.group(1).strip() if critical_match else None,
        ))
    
    return HardwareSensorsResponse(sensors=sensors, raw=text or "", summary=_build_hardware_summary(sensors))


def hardware_gql_fields(key_literal: str) -> List[str]:
    """GraphQL alias field fetching ``show environment sensors`` via ``Show``.

    ``key_literal`` must be a JSON-encoded API key (``json.dumps(key)``), matching
    the other ``*_gql_fields`` helpers folded into the dashboard broadcaster query.
    """
    return [
        f'HardwareSensors: Show(data: {{key: {key_literal}, path: ["environment", "sensors"]}}) {{ data {{ result }} }}'
    ]


def build_hardware_status(gql: dict) -> dict:
    """Build the ``hardware-sensors`` SSE payload from the shared GraphQL result."""
    node = (gql or {}).get("HardwareSensors") or {}
    result = (node.get("data") or {}).get("result")
    return parse_hardware_sensors(result if isinstance(result, str) else "").dict()