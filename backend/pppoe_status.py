"""Parsing helpers for VyOS PPPoE server operational status."""

from typing import Any, Dict, List, Optional

from pydantic import BaseModel


class PPPoESession(BaseModel):
    interface: str
    username: str
    ip: Optional[str] = None
    ipv6: Optional[str] = None
    ipv6_delegated: Optional[str] = None
    calling_sid: Optional[str] = None
    rate_limit: Optional[str] = None
    state: str
    uptime: Optional[str] = None
    rx_bytes: int = 0
    tx_bytes: int = 0
    rx_packets: int = 0
    tx_packets: int = 0
    vlan: Optional[str] = None
    mtu: Optional[int] = None


class PPPoESessionsResponse(BaseModel):
    sessions: List[PPPoESession]
    total: int


def _parse_bytes(value: str) -> int:
    """Parse the byte units emitted by accel-ppp, preserving counter precision."""
    parts = value.strip().split()
    if not parts:
        return 0
    try:
        amount = float(parts[0].replace(",", ""))
    except ValueError:
        return 0
    multiplier = {
        "b": 1,
        "kib": 1024,
        "kb": 1000,
        "mib": 1024 ** 2,
        "mb": 1000 ** 2,
        "gib": 1024 ** 3,
        "gb": 1000 ** 3,
    }.get(parts[1].lower(), 1) if len(parts) > 1 else 1
    return int(amount * multiplier)


def parse_pppoe_sessions(output: str) -> List[PPPoESession]:
    """Parse the pipe-delimited table from ``show pppoe-server sessions``."""
    if not output or not isinstance(output, str):
        return []

    headers: Optional[List[str]] = None
    sessions: List[PPPoESession] = []
    for line in output.splitlines():
        if "|" not in line:
            continue
        cells = [cell.strip() for cell in line.split("|")]
        normalized = [cell.lower().replace(" ", "-") for cell in cells]
        if "ifname" in normalized and "username" in normalized:
            headers = normalized
            continue
        if not headers or len(cells) < len(headers) or set(cells) <= {"", "-", "+"}:
            continue

        row: Dict[str, Any] = dict(zip(headers, cells))
        if not row.get("ifname") or not row.get("username"):
            continue
        mtu_value = row.get("mtu") or None
        try:
            mtu = int(mtu_value) if mtu_value else None
        except ValueError:
            mtu = None
        sessions.append(PPPoESession(
            interface=row["ifname"],
            username=row["username"],
            ip=row.get("ip") or None,
            ipv6=row.get("ip6") or None,
            ipv6_delegated=row.get("ip6-dp") or None,
            calling_sid=row.get("calling-sid") or None,
            rate_limit=row.get("rate-limit") or None,
            state=row.get("state", "unknown"),
            uptime=row.get("uptime") or None,
            rx_bytes=_parse_bytes(row.get("rx-bytes", "0")),
            tx_bytes=_parse_bytes(row.get("tx-bytes", "0")),
            vlan=row.get("vlan") or row.get("vlan-id") or None,
            mtu=mtu,
        ))
    return sessions
