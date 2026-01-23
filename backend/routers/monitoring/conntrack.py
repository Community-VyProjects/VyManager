"""
Connection Tracking (Conntrack) Router

API endpoints for VyOS connection tracking table.
Uses session-based architecture - VyOS instance comes from user's active session.
"""

from fastapi import APIRouter, HTTPException, Request, Query
from pydantic import BaseModel
from typing import List, Optional, Dict
from datetime import datetime
import re

from session_vyos_service import get_session_vyos_service

router = APIRouter(prefix="/monitoring/conntrack", tags=["monitoring"])


# ========================================================================
# Pydantic Models
# ========================================================================


class Connection(BaseModel):
    """A single connection from the conntrack table."""
    protocol: str           # tcp, udp, icmp, etc.
    state: Optional[str]    # ESTABLISHED, TIME_WAIT, SYN_SENT, etc.
    src_ip: str
    src_port: Optional[int]
    dst_ip: str
    dst_port: Optional[int]
    packets: int
    bytes: int
    timeout: Optional[int]  # Seconds until entry expires


class ConntrackResponse(BaseModel):
    """Response containing connection tracking data."""
    connections: List[Connection]
    total: int
    limit: int
    offset: int


class ConntrackSummary(BaseModel):
    """Summary statistics for connection tracking."""
    total_connections: int
    by_protocol: Dict[str, int]
    by_state: Dict[str, int]
    timestamp: datetime


class TopTalker(BaseModel):
    """A top talker entry (IP or port with aggregated statistics)."""
    key: str                # IP address or port number
    connections: int        # Number of connections
    bytes: int              # Total bytes
    packets: int            # Total packets


class TopTalkersResponse(BaseModel):
    """Response containing top talkers analysis."""
    by_source_ip: List[TopTalker]       # Top source IPs by connections
    by_destination_ip: List[TopTalker]  # Top destination IPs by connections
    by_destination_port: List[TopTalker] # Top destination ports by connections
    by_bytes_source: List[TopTalker]    # Top source IPs by bytes
    by_bytes_destination: List[TopTalker] # Top destination IPs by bytes
    total_connections: int
    total_bytes: int
    timestamp: datetime


# ========================================================================
# Parsing Helpers
# ========================================================================


def parse_conntrack_entry(line: str) -> Optional[Connection]:
    """
    Parse a single line from VyOS conntrack table output.

    VyOS format (tabular):
    Id          Original src          Original dst           Reply src              Reply dst             Protocol    State        Timeout    Mark    Zone
    ----------  --------------------  ---------------------  ---------------------  --------------------  ----------  -----------  ---------  ------  ------
    3124130848  10.10.110.106:50345   10.10.110.27:80        10.10.110.27:80        10.10.110.106:50345   tcp         TIME_WAIT    75         0

    Old conntrack -L format (also supported):
    tcp      6 431999 ESTABLISHED src=192.168.1.10 dst=8.8.8.8 sport=45678 dport=443 ...
    """
    if not line.strip():
        return None

    # Skip header lines
    if line.startswith('Id') or line.startswith('---'):
        return None

    parts = line.split()
    if len(parts) < 6:
        return None

    try:
        # Check if this is VyOS tabular format (first column is numeric ID)
        if parts[0].isdigit() and ':' in parts[1]:
            # VyOS tabular format
            # parts[0] = Id
            # parts[1] = Original src (ip:port)
            # parts[2] = Original dst (ip:port)
            # parts[3] = Reply src (ip:port)
            # parts[4] = Reply dst (ip:port)
            # parts[5] = Protocol
            # parts[6] = State (may be empty, check if it looks like a state)
            # parts[7 or 6] = Timeout

            src_parts = parts[1].rsplit(':', 1)
            dst_parts = parts[2].rsplit(':', 1)

            src_ip = src_parts[0]
            src_port = int(src_parts[1]) if len(src_parts) > 1 and src_parts[1].isdigit() else None

            dst_ip = dst_parts[0]
            dst_port = int(dst_parts[1]) if len(dst_parts) > 1 and dst_parts[1].isdigit() else None

            protocol = parts[5].lower() if len(parts) > 5 else "unknown"

            # State and timeout parsing
            state = None
            timeout = None

            if len(parts) > 6:
                # Check if parts[6] is a state or timeout
                if parts[6].isupper() or parts[6] in ['ESTABLISHED', 'TIME_WAIT', 'SYN_SENT', 'SYN_RECV', 'FIN_WAIT', 'CLOSE_WAIT', 'LAST_ACK', 'CLOSE']:
                    state = parts[6]
                    if len(parts) > 7 and parts[7].isdigit():
                        timeout = int(parts[7])
                elif parts[6].isdigit():
                    timeout = int(parts[6])

            return Connection(
                protocol=protocol,
                state=state,
                src_ip=src_ip,
                src_port=src_port,
                dst_ip=dst_ip,
                dst_port=dst_port,
                packets=0,  # Not available in VyOS table format
                bytes=0,    # Not available in VyOS table format
                timeout=timeout
            )

        # Old conntrack -L format
        protocol = parts[0]
        timeout = None
        state = None

        try:
            timeout = int(parts[2])
        except (ValueError, IndexError):
            pass

        if len(parts) > 3 and parts[3].isupper() and not parts[3].startswith('src='):
            state = parts[3]

        src_ip = None
        dst_ip = None
        src_port = None
        dst_port = None
        packets = 0
        bytes_count = 0
        found_reply = False

        for part in parts:
            if part == '[ASSURED]' or part == '[UNREPLIED]':
                continue

            if part.startswith('src=') and src_ip is None:
                src_ip = part.split('=')[1]
            elif part.startswith('dst=') and dst_ip is None:
                dst_ip = part.split('=')[1]
            elif part.startswith('sport=') and src_port is None:
                try:
                    src_port = int(part.split('=')[1])
                except ValueError:
                    pass
            elif part.startswith('dport=') and dst_port is None:
                try:
                    dst_port = int(part.split('=')[1])
                except ValueError:
                    pass
            elif part.startswith('packets=') and not found_reply:
                try:
                    packets = int(part.split('=')[1])
                    found_reply = True
                except ValueError:
                    pass
            elif part.startswith('bytes=') and bytes_count == 0:
                try:
                    bytes_count = int(part.split('=')[1])
                except ValueError:
                    pass

        if src_ip and dst_ip:
            return Connection(
                protocol=protocol,
                state=state,
                src_ip=src_ip,
                src_port=src_port,
                dst_ip=dst_ip,
                dst_port=dst_port,
                packets=packets,
                bytes=bytes_count,
                timeout=timeout
            )

    except Exception:
        pass

    return None


def parse_conntrack_output(output: str) -> List[Connection]:
    """Parse the full conntrack table output."""
    connections = []

    if not output:
        return connections

    for line in output.strip().split('\n'):
        conn = parse_conntrack_entry(line)
        if conn:
            connections.append(conn)

    return connections


# ========================================================================
# Endpoints
# ========================================================================


@router.get("", response_model=ConntrackResponse)
async def get_conntrack_table(
    request: Request,
    limit: int = Query(100, ge=1, le=1000, description="Maximum connections to return"),
    offset: int = Query(0, ge=0, description="Offset for pagination"),
    protocol: Optional[str] = Query(None, description="Filter by protocol (tcp, udp, icmp)"),
    state: Optional[str] = Query(None, description="Filter by state (ESTABLISHED, TIME_WAIT, etc.)")
):
    """
    Get connection tracking table from VyOS.

    Args:
        limit: Maximum number of connections to return (1-1000)
        offset: Pagination offset
        protocol: Optional protocol filter
        state: Optional state filter

    Returns:
        Paginated list of connections
    """
    try:
        service = get_session_vyos_service(request)

        # Execute 'show conntrack table ipv4' command
        response = service.device.show(path=["conntrack", "table", "ipv4"])

        if response.status != 200:
            # Try alternative command path
            response = service.device.show(path=["conntrack", "table"])

            if response.status != 200:
                raise HTTPException(
                    status_code=500,
                    detail=f"VyOS command failed: {response.error}"
                )

        # Parse the output - handle various VyOS API response formats
        output = ""
        if isinstance(response.result, dict):
            if "data" in response.result:
                output = response.result["data"]
            elif "result" in response.result:
                output = response.result["result"]
            else:
                for key in response.result:
                    if isinstance(response.result[key], str):
                        output = response.result[key]
                        break
        elif isinstance(response.result, str):
            output = response.result

        connections = parse_conntrack_output(output)

        # Apply filters
        if protocol:
            connections = [c for c in connections if c.protocol.lower() == protocol.lower()]

        if state:
            connections = [c for c in connections if c.state and c.state.upper() == state.upper()]

        # Get total before pagination
        total = len(connections)

        # Apply pagination
        connections = connections[offset:offset + limit]

        return ConntrackResponse(
            connections=connections,
            total=total,
            limit=limit,
            offset=offset
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/summary", response_model=ConntrackSummary)
async def get_conntrack_summary(request: Request):
    """
    Get summary statistics for connection tracking.

    Returns:
        Total count and breakdown by protocol and state
    """
    try:
        service = get_session_vyos_service(request)

        # Execute 'show conntrack table ipv4' command
        response = service.device.show(path=["conntrack", "table", "ipv4"])

        if response.status != 200:
            # Try alternative command path
            response = service.device.show(path=["conntrack", "table"])

            if response.status != 200:
                raise HTTPException(
                    status_code=500,
                    detail=f"VyOS command failed: {response.error}"
                )

        # Parse the output - handle various VyOS API response formats
        output = ""
        if isinstance(response.result, dict):
            if "data" in response.result:
                output = response.result["data"]
            elif "result" in response.result:
                output = response.result["result"]
            else:
                for key in response.result:
                    if isinstance(response.result[key], str):
                        output = response.result[key]
                        break
        elif isinstance(response.result, str):
            output = response.result

        connections = parse_conntrack_output(output)

        # Calculate summary statistics
        by_protocol: Dict[str, int] = {}
        by_state: Dict[str, int] = {}

        for conn in connections:
            # Count by protocol
            proto = conn.protocol.lower()
            by_protocol[proto] = by_protocol.get(proto, 0) + 1

            # Count by state
            if conn.state:
                state = conn.state.upper()
                by_state[state] = by_state.get(state, 0) + 1
            else:
                by_state["OTHER"] = by_state.get("OTHER", 0) + 1

        return ConntrackSummary(
            total_connections=len(connections),
            by_protocol=by_protocol,
            by_state=by_state,
            timestamp=datetime.utcnow()
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/top-talkers", response_model=TopTalkersResponse)
async def get_top_talkers(
    request: Request,
    limit: int = Query(10, ge=1, le=50, description="Number of top entries to return")
):
    """
    Get top talkers analysis from connection tracking.

    Aggregates connections by source IP, destination IP, and destination port
    to identify the most active hosts and services.

    Args:
        limit: Number of top entries to return per category (1-50)

    Returns:
        Top talkers grouped by different criteria
    """
    try:
        service = get_session_vyos_service(request)

        # Execute 'show conntrack table ipv4' command
        response = service.device.show(path=["conntrack", "table", "ipv4"])

        if response.status != 200:
            # Try alternative command path
            response = service.device.show(path=["conntrack", "table"])

            if response.status != 200:
                raise HTTPException(
                    status_code=500,
                    detail=f"VyOS command failed: {response.error}"
                )

        # Parse the output - handle various VyOS API response formats
        output = ""
        if isinstance(response.result, dict):
            if "data" in response.result:
                output = response.result["data"]
            elif "result" in response.result:
                output = response.result["result"]
            else:
                for key in response.result:
                    if isinstance(response.result[key], str):
                        output = response.result[key]
                        break
        elif isinstance(response.result, str):
            output = response.result

        connections = parse_conntrack_output(output)

        # Aggregate by source IP
        src_ip_stats: Dict[str, Dict[str, int]] = {}
        dst_ip_stats: Dict[str, Dict[str, int]] = {}
        dst_port_stats: Dict[str, Dict[str, int]] = {}

        total_bytes = 0

        for conn in connections:
            total_bytes += conn.bytes

            # Aggregate by source IP
            if conn.src_ip not in src_ip_stats:
                src_ip_stats[conn.src_ip] = {"connections": 0, "bytes": 0, "packets": 0}
            src_ip_stats[conn.src_ip]["connections"] += 1
            src_ip_stats[conn.src_ip]["bytes"] += conn.bytes
            src_ip_stats[conn.src_ip]["packets"] += conn.packets

            # Aggregate by destination IP
            if conn.dst_ip not in dst_ip_stats:
                dst_ip_stats[conn.dst_ip] = {"connections": 0, "bytes": 0, "packets": 0}
            dst_ip_stats[conn.dst_ip]["connections"] += 1
            dst_ip_stats[conn.dst_ip]["bytes"] += conn.bytes
            dst_ip_stats[conn.dst_ip]["packets"] += conn.packets

            # Aggregate by destination port
            if conn.dst_port:
                port_key = f"{conn.dst_port}/{conn.protocol}"
                if port_key not in dst_port_stats:
                    dst_port_stats[port_key] = {"connections": 0, "bytes": 0, "packets": 0}
                dst_port_stats[port_key]["connections"] += 1
                dst_port_stats[port_key]["bytes"] += conn.bytes
                dst_port_stats[port_key]["packets"] += conn.packets

        # Sort and create top talkers lists
        def to_top_talkers(stats: Dict[str, Dict[str, int]], sort_by: str) -> List[TopTalker]:
            sorted_items = sorted(
                stats.items(),
                key=lambda x: x[1][sort_by],
                reverse=True
            )[:limit]
            return [
                TopTalker(
                    key=key,
                    connections=data["connections"],
                    bytes=data["bytes"],
                    packets=data["packets"]
                )
                for key, data in sorted_items
            ]

        return TopTalkersResponse(
            by_source_ip=to_top_talkers(src_ip_stats, "connections"),
            by_destination_ip=to_top_talkers(dst_ip_stats, "connections"),
            by_destination_port=to_top_talkers(dst_port_stats, "connections"),
            by_bytes_source=to_top_talkers(src_ip_stats, "bytes"),
            by_bytes_destination=to_top_talkers(dst_ip_stats, "bytes"),
            total_connections=len(connections),
            total_bytes=total_bytes,
            timestamp=datetime.utcnow()
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
