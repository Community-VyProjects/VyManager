"""Parsing helpers for VyOS PPPoE server operational status."""

import time
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
    rx_packets: Optional[int] = None
    tx_packets: Optional[int] = None
    rx_pps: Optional[float] = None
    tx_pps: Optional[float] = None
    vlan: Optional[str] = None
    mtu: Optional[int] = None


class PPPoESessionsResponse(BaseModel):
    sessions: List[PPPoESession]
    total: int


class PPPoEPpsTracker:
    """Calculate rates from cumulative per-interface packet counters.

    The optional ``min_sample_interval`` suppresses repeated per-session PPS
    recomputation in tight loops so the same parser can use the counters from
    the session table without forcing a second statistics query for every
    interface.
    """

    def __init__(self, min_sample_interval: float = 0.0) -> None:
        self._previous: Dict[str, tuple[int, int, float]] = {}
        self._last_sample_at: Dict[str, float] = {}
        self._min_sample_interval = min_sample_interval

    def update(
        self,
        key: str,
        rx_packets: Optional[int],
        tx_packets: Optional[int],
        timestamp: Optional[float] = None,
    ) -> tuple[Optional[float], Optional[float]]:
        if rx_packets is None or tx_packets is None:
            self._previous.pop(key, None)
            self._last_sample_at.pop(key, None)
            return None, None

        now = time.monotonic() if timestamp is None else timestamp
        if self._min_sample_interval > 0:
            last_sample_at = self._last_sample_at.get(key)
            if last_sample_at is not None and (now - last_sample_at) < self._min_sample_interval:
                return None, None

        previous = self._previous.get(key)
        self._previous[key] = (rx_packets, tx_packets, now)
        self._last_sample_at[key] = now
        if previous is None:
            return None, None

        previous_rx, previous_tx, previous_at = previous
        elapsed = now - previous_at
        if elapsed <= 0 or rx_packets < previous_rx or tx_packets < previous_tx:
            return None, None
        return (rx_packets - previous_rx) / elapsed, (tx_packets - previous_tx) / elapsed


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


def _parse_counter(value: Optional[str]) -> Optional[int]:
    if not value:
        return None
    try:
        return int(value.replace(",", ""))
    except ValueError:
        return None


def parse_pppoe_interface_statistics(output: str) -> tuple[Optional[int], Optional[int]]:
    """Parse IN and OUT packet counters from PPPoE interface statistics."""
    if not output or not isinstance(output, str):
        return None, None

    numbers = []
    for line in output.splitlines():
        fields = line.split()
        if len(fields) >= 10 and fields[1].isdigit() and fields[5] == "|" and fields[7].isdigit():
            numbers = [fields[1], fields[7]]
            break
    if not numbers:
        return None, None
    return int(numbers[0]), int(numbers[1])


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
            ipv6=row.get("ip6") or row.get("ipv6") or None,
            ipv6_delegated=row.get("ip6-dp") or row.get("ipv6-delegated") or None,
            calling_sid=row.get("calling-sid") or None,
            rate_limit=row.get("rate-limit") or None,
            state=row.get("state", "unknown"),
            uptime=row.get("uptime") or None,
            rx_bytes=_parse_bytes(row.get("rx-bytes", "0")),
            tx_bytes=_parse_bytes(row.get("tx-bytes", "0")),
            rx_packets=_parse_counter(row.get("rx-packets") or row.get("rx-pkts")),
            tx_packets=_parse_counter(row.get("tx-packets") or row.get("tx-pkts")),
            vlan=row.get("vlan") or row.get("vlan-id") or None,
            mtu=mtu,
        ))
    return sessions
