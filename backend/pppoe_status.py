"""Parsing helpers for VyOS PPPoE server operational status."""

import asyncio
import os
import time
from typing import Any, Dict, List, Optional

from pydantic import BaseModel
from starlette.concurrency import run_in_threadpool


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
    """Calculate packet-per-second rates from cumulative per-interface packet counters.

    Supports an optional throttle that avoids sampling too aggressively when the
    same transport key is refreshed in a very short interval.
    """

    def __init__(self, min_sample_interval: float = 0.0) -> None:
        self.min_sample_interval = float(min_sample_interval)
        self._previous: Dict[str, tuple[int, int, float]] = {}
        self._enabled = True

    def enable(self) -> None:
        self._enabled = True

    def disable(self) -> None:
        self._enabled = False
        self._previous.clear()

    def clear(self) -> None:
        self._previous.clear()

    def update(
        self,
        key: str,
        rx_packets: Optional[int],
        tx_packets: Optional[int],
        timestamp: Optional[float] = None,
    ) -> tuple[Optional[float], Optional[float]]:
        if not self._enabled:
            return None, None
        if rx_packets is None or tx_packets is None:
            self._previous.pop(key, None)
            return None, None

        now = time.monotonic() if timestamp is None else timestamp
        previous = self._previous.get(key)
        if previous is None:
            self._previous[key] = (rx_packets, tx_packets, now)
            return None, None

        previous_rx, previous_tx, previous_at = previous
        elapsed = now - previous_at
        if elapsed < self.min_sample_interval:
            return None, None
        if elapsed <= 0 or rx_packets < previous_rx or tx_packets < previous_tx:
            self._previous[key] = (rx_packets, tx_packets, now)
            return None, None

        rx_pps = (rx_packets - previous_rx) / elapsed
        tx_pps = (tx_packets - previous_tx) / elapsed
        self._previous[key] = (rx_packets, tx_packets, now)
        return rx_pps, tx_pps


class PPPoEStatsStore:
    """Backend-owned cache honoring a configurable rolling sample window.

    The store enforces a load-splitting policy: if the API sees N active PPPoE
    sessions, then each session interface is sampled at most once every
    poll_window_seconds / N seconds, effectively spreading the sampling burst
    across the whole configured window.
    """

    def __init__(
        self,
        poll_window_seconds: int = 300,
        max_concurrent_samples: int = 20,
        min_sample_interval: float = 1.0,
    ) -> None:
        self.poll_window_seconds = int(os.getenv("PPPOE_STATS_POLL_WINDOW_SECONDS", str(poll_window_seconds)))
        self.max_concurrent_samples = int(os.getenv("PPPOE_STATS_POLL_CONCURRENCY", str(max_concurrent_samples)))
        self.min_sample_interval = float(min_sample_interval)
        self._last_sample_at: Dict[str, float] = {}
        self._snapshots: Dict[str, Dict[str, Any]] = {}
        self._tracker = PPPoEPpsTracker(min_sample_interval=self.min_sample_interval)

    def sample_interval_for_session_count(self, session_count: int) -> float:
        """Return the dynamic per-session sample cadence for the current light load."""
        if session_count <= 0:
            return float(self.poll_window_seconds)
        return max(float(self.poll_window_seconds) / float(session_count), 1.0)

    def annotate_sessions_from_cache(self, sessions: List[PPPoESession]) -> None:
        for session in sessions:
            cache = self._snapshots.get(session.interface)
            if not cache:
                continue
            session.rx_packets = cache.get("rx_packets", session.rx_packets)
            session.tx_packets = cache.get("tx_packets", session.tx_packets)
            session.rx_pps = cache.get("rx_pps", session.rx_pps)
            session.tx_pps = cache.get("tx_pps", session.tx_pps)

    async def sample_due_sessions(self, service, sessions: List[PPPoESession]) -> None:
        """Sample only sessions whose per-session cadence says they are now due.

        Due sessions are decided uniformly across the configured polling window,
        which means the total request pressure is spread by session count instead
        of hitting every interface on every sessions call.
        """
        if not sessions:
            return

        session_count = len(sessions)
        sample_interval = self.sample_interval_for_session_count(session_count)
        due_sessions: List[PPPoESession] = []
        now = time.monotonic()

        for session in sessions:
            interface = session.interface
            last_sample_at = self._last_sample_at.get(interface)
            if last_sample_at is None or (now - last_sample_at) >= sample_interval:
                due_sessions.append(session)

        if not due_sessions:
            self.annotate_sessions_from_cache(sessions)
            return

        semaphore = asyncio.Semaphore(self.max_concurrent_samples)

        async def fetch_one(session: PPPoESession) -> None:
            async with semaphore:
                # Block out access into the VyOS device API using a threadpool and
                # avoid starving the event loop while the backend samples stats.
                stats_response = await run_in_threadpool(
                    service.device.show,
                    path=["interfaces", "pppoe", session.interface, "statistics"],
                )
            if stats_response.status != 200:
                return

            stats_output = (
                stats_response.result.get("data", "")
                if isinstance(stats_response.result, dict)
                else stats_response.result
            )
            rx_packets, tx_packets = parse_pppoe_interface_statistics(stats_output or "")
            if rx_packets is None or tx_packets is None:
                return

            key = f"{id(service.device)}:{session.interface}"
            rx_pps, tx_pps = self._tracker.update(key, rx_packets, tx_packets, timestamp=time.monotonic())
            self._last_sample_at[session.interface] = time.monotonic()
            self._snapshots[session.interface] = {
                "rx_packets": rx_packets,
                "tx_packets": tx_packets,
                "rx_pps": rx_pps,
                "tx_pps": tx_pps,
                "updated_at": time.monotonic(),
            }

            session.rx_packets = rx_packets
            session.tx_packets = tx_packets
            session.rx_pps = rx_pps
            session.tx_pps = tx_pps

        try:
            await asyncio.gather(*(fetch_one(session) for session in due_sessions))
        finally:
            self.annotate_sessions_from_cache(sessions)


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