"""
Interface Traffic Router

API endpoints for interface traffic statistics with rate calculation.
Uses session-based architecture - VyOS instance comes from user's active session.
"""

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from typing import List, Optional, Dict
from datetime import datetime
import time

from session_vyos_service import get_session_vyos_service

router = APIRouter(prefix="/monitoring/interfaces", tags=["monitoring"])


# ========================================================================
# In-Memory Cache for Rate Calculation
# ========================================================================

# Store previous interface counters for rate calculation
# Key: (instance_id, interface_name) -> (timestamp, rx_bytes, tx_bytes)
_previous_counters: Dict[str, Dict[str, tuple]] = {}


def _get_cache_key(request: Request) -> str:
    """Get a unique cache key for the current session's instance."""
    if hasattr(request.state, 'active_session') and request.state.active_session:
        return request.state.active_session.get('instanceId', 'default')
    return 'default'


def _calculate_rate(
    current_bytes: int,
    prev_bytes: int,
    time_delta: float
) -> float:
    """Calculate rate in bytes/second."""
    if time_delta <= 0:
        return 0.0

    # Handle counter wraparound (32-bit or 64-bit)
    if current_bytes < prev_bytes:
        # Assume 64-bit counter wraparound
        byte_delta = (2**64 - prev_bytes) + current_bytes
    else:
        byte_delta = current_bytes - prev_bytes

    return round(byte_delta / time_delta, 2)


# ========================================================================
# Pydantic Models
# ========================================================================


class InterfaceTraffic(BaseModel):
    """Interface traffic statistics with rates."""
    name: str
    rx_bytes: int
    tx_bytes: int
    rx_packets: int
    tx_packets: int
    rx_errors: int
    tx_errors: int
    rx_dropped: int
    tx_dropped: int
    # Calculated rates (bytes/sec)
    rx_rate: Optional[float] = None
    tx_rate: Optional[float] = None


class InterfaceTrafficResponse(BaseModel):
    """Response containing interface traffic data."""
    interfaces: List[InterfaceTraffic]
    total: int
    timestamp: datetime


class InterfaceDataPoint(BaseModel):
    """A single data point for historical tracking."""
    timestamp: datetime
    rx_bytes: int
    tx_bytes: int
    rx_rate: float
    tx_rate: float


# ========================================================================
# Parsing Helpers
# ========================================================================


def parse_interface_counters(output: str) -> List[Dict]:
    """
    Parse VyOS 'show interface counters' output.

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
        parts = line.split()

        if len(parts) >= 9:
            try:
                interfaces.append({
                    'name': parts[0],
                    'rx_packets': int(parts[1]),
                    'rx_bytes': int(parts[2]),
                    'tx_packets': int(parts[3]),
                    'tx_bytes': int(parts[4]),
                    'rx_dropped': int(parts[5]),
                    'tx_dropped': int(parts[6]),
                    'rx_errors': int(parts[7]),
                    'tx_errors': int(parts[8])
                })
            except (ValueError, IndexError):
                continue

    return interfaces


# ========================================================================
# Endpoints
# ========================================================================


@router.get("/traffic", response_model=InterfaceTrafficResponse)
async def get_interface_traffic(request: Request):
    """
    Get interface traffic statistics with rate calculation.

    Rates are calculated by comparing current counters with previously
    fetched values. First request will have null rates.

    Returns:
        Interface traffic data with RX/TX rates in bytes/second
    """
    global _previous_counters

    try:
        service = get_session_vyos_service(request)
        cache_key = _get_cache_key(request)
        current_time = time.time()

        # Execute 'show interface counters' command
        response = service.device.show(path=["interfaces", "counters"])

        if response.status != 200:
            raise HTTPException(
                status_code=500,
                detail=f"VyOS command failed: {response.error}"
            )

        # Parse the output
        output = ""
        if isinstance(response.result, dict) and "data" in response.result:
            output = response.result["data"]
        elif isinstance(response.result, str):
            output = response.result

        raw_interfaces = parse_interface_counters(output)

        # Initialize cache for this instance if needed
        if cache_key not in _previous_counters:
            _previous_counters[cache_key] = {}

        prev_cache = _previous_counters[cache_key]
        interfaces = []

        for iface_data in raw_interfaces:
            name = iface_data['name']
            rx_bytes = iface_data['rx_bytes']
            tx_bytes = iface_data['tx_bytes']

            # Calculate rates if we have previous data
            rx_rate = None
            tx_rate = None

            if name in prev_cache:
                prev_time, prev_rx, prev_tx = prev_cache[name]
                time_delta = current_time - prev_time

                if time_delta > 0:
                    rx_rate = _calculate_rate(rx_bytes, prev_rx, time_delta)
                    tx_rate = _calculate_rate(tx_bytes, prev_tx, time_delta)

            # Update cache with current values
            prev_cache[name] = (current_time, rx_bytes, tx_bytes)

            interfaces.append(InterfaceTraffic(
                name=name,
                rx_bytes=rx_bytes,
                tx_bytes=tx_bytes,
                rx_packets=iface_data['rx_packets'],
                tx_packets=iface_data['tx_packets'],
                rx_errors=iface_data['rx_errors'],
                tx_errors=iface_data['tx_errors'],
                rx_dropped=iface_data['rx_dropped'],
                tx_dropped=iface_data['tx_dropped'],
                rx_rate=rx_rate,
                tx_rate=tx_rate
            ))

        return InterfaceTrafficResponse(
            interfaces=interfaces,
            total=len(interfaces),
            timestamp=datetime.utcnow()
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/traffic/{interface_name}", response_model=InterfaceTraffic)
async def get_single_interface_traffic(
    request: Request,
    interface_name: str
):
    """
    Get traffic statistics for a single interface.

    Args:
        interface_name: Name of the interface (e.g., "eth0")

    Returns:
        Traffic data for the specified interface
    """
    try:
        # Get all interfaces and filter
        response = await get_interface_traffic(request)

        for iface in response.interfaces:
            if iface.name == interface_name:
                return iface

        raise HTTPException(
            status_code=404,
            detail=f"Interface '{interface_name}' not found"
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/traffic/cache")
async def clear_traffic_cache(request: Request):
    """
    Clear the rate calculation cache for the current instance.

    Use this when you want to reset rate calculations.
    """
    global _previous_counters

    cache_key = _get_cache_key(request)

    if cache_key in _previous_counters:
        del _previous_counters[cache_key]

    return {"success": True, "message": "Traffic cache cleared"}
