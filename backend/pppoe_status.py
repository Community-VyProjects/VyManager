"""Parsing helpers for VyOS PPPoE server operational status.

Active PPPoE sessions are read from the router GraphQL ``ShowSessionsAccelppp``
operation, which returns structured per-session data including cumulative
packet counters (``rx_pkts``/``tx_pkts``) for every session in a single call.
Packets-per-second is derived from the counter deltas between polls by
``PPPoEPpsTracker``.

If the structured operation is unavailable, the caller falls back to parsing
the pipe-delimited ``show pppoe-server sessions`` table (``parse_pppoe_sessions``),
which lists sessions but carries no packet counters, so PPS is left unknown.
"""

import json
import logging
import time
from typing import Any, Dict, List, Optional

import httpx
from pydantic import BaseModel

from starlette.concurrency import run_in_threadpool

logger = logging.getLogger(__name__)


class PPPoESessionsUnavailable(Exception):
    """Both the GraphQL op and the text-table fallback failed to read sessions."""

    def __init__(self, detail: str = "Unable to read PPPoE sessions") -> None:
        super().__init__(detail)
        self.detail = detail


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

    def annotate_sessions(self, device_key: str, sessions: List[PPPoESession]) -> None:
        """Derive RX/TX PPS for every session from its packet-counter delta.

        ``device_key`` scopes the tracked counters to one router connection so
        interfaces on different instances never collide. Sessions without packet
        counters (e.g. the text-table fallback) leave PPS unset.
        """
        now = time.monotonic()
        for session in sessions:
            key = f"{device_key}:{session.interface}"
            rx_pps, tx_pps = self.update(
                key, session.rx_packets, session.tx_packets, timestamp=now
            )
            session.rx_pps = rx_pps
            session.tx_pps = tx_pps


# Shared across the REST sessions endpoint and the dashboard SSE broadcaster so
# PPS deltas stay continuous if both paths run against the same router.
PPPOE_PPS_TRACKER = PPPoEPpsTracker(min_sample_interval=1.0)


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
    if value is None:
        return None
    text = str(value).replace(",", "").strip()
    if not text:
        return None
    try:
        return int(text)
    except ValueError:
        return None


def _format_uptime(seconds: Optional[str]) -> Optional[str]:
    """Format accel-ppp ``uptime-raw`` seconds as ``[Nd ]HH:MM:SS``."""
    total = _parse_counter(seconds)
    if total is None or total < 0:
        return None
    days, remainder = divmod(total, 86400)
    hours, remainder = divmod(remainder, 3600)
    minutes, secs = divmod(remainder, 60)
    if days:
        return f"{days}d {hours:02d}:{minutes:02d}:{secs:02d}"
    return f"{hours:02d}:{minutes:02d}:{secs:02d}"


def _accel_ppp_sessions_query(api_key: str, protocol: str = "pppoe") -> Dict[str, str]:
    """Build the GraphQL body for ``ShowSessionsAccelppp``."""
    key = json.dumps(api_key)
    proto = json.dumps(protocol)
    query = (
        "{ ShowSessionsAccelppp(data: {key: "
        + key
        + ", protocol: "
        + proto
        + "}) { success errors data { result } } }"
    )
    return {"query": query}


def parse_accel_ppp_sessions(result: Any) -> List[PPPoESession]:
    """Parse the structured session list returned by ``ShowSessionsAccelppp``.

    ``result`` is the GraphQL ``data.result`` value: a list of per-session dicts
    (accel-ppp field names, ``-`` mangled to ``_``). Some deployments return it as
    a JSON-encoded string, which is decoded here.
    """
    if isinstance(result, str):
        try:
            result = json.loads(result)
        except ValueError:
            return []
    if not isinstance(result, list):
        return []

    sessions: List[PPPoESession] = []
    for entry in result:
        if not isinstance(entry, dict):
            continue
        ifname = entry.get("ifname")
        username = entry.get("username")
        if not ifname or not username:
            continue
        sessions.append(PPPoESession(
            interface=str(ifname),
            username=str(username),
            ip=entry.get("ip") or None,
            ipv6=entry.get("ip6") or None,
            ipv6_delegated=entry.get("ip6_dp") or None,
            calling_sid=entry.get("calling_sid") or None,
            rate_limit=entry.get("rate_limit") or None,
            state=str(entry.get("state") or "unknown"),
            uptime=_format_uptime(entry.get("uptime_raw")),
            rx_bytes=_parse_counter(entry.get("rx_bytes_raw")) or 0,
            tx_bytes=_parse_counter(entry.get("tx_bytes_raw")) or 0,
            rx_packets=_parse_counter(entry.get("rx_pkts")),
            tx_packets=_parse_counter(entry.get("tx_pkts")),
        ))
    return sessions


async def fetch_accel_ppp_sessions(service, protocol: str = "pppoe") -> Optional[List[PPPoESession]]:
    """Fetch active sessions via the ``ShowSessionsAccelppp`` GraphQL operation.

    Returns the parsed session list (possibly empty) on success, or ``None`` when
    the structured operation is unavailable so the caller can fall back to the
    text-table path. A ``success: false`` op-mode error (e.g. pppoe-server not
    configured) is treated as unavailable rather than an empty session set, so the
    fallback decides the final answer.
    """
    api_key = str(service.config.apikey)
    url = f"{service.config.protocol}://{service.config.hostname}:{service.config.port}/graphql"
    payload = _accel_ppp_sessions_query(api_key, protocol)
    try:
        async with httpx.AsyncClient(verify=service.config.verify, timeout=15.0) as client:
            resp = await client.post(url, json=payload, auth=("vyos", api_key))
        if resp.status_code != 200:
            logger.warning("ShowSessionsAccelppp HTTP error %d", resp.status_code)
            return None
        body = resp.json()
        if body.get("errors"):
            logger.warning("ShowSessionsAccelppp field errors: %s", body["errors"])
        node = (body.get("data") or {}).get("ShowSessionsAccelppp") or {}
        if not node.get("success"):
            return None
        result = (node.get("data") or {}).get("result")
        return parse_accel_ppp_sessions(result)
    except Exception:
        logger.exception("ShowSessionsAccelppp fetch failed")
        return None


def pppoe_configured(full_config) -> bool:
    """True when ``service pppoe-server`` is configured (gates the dashboard fetch)."""
    service = (full_config or {}).get("service", {}) or {}
    return "pppoe-server" in service


async def load_pppoe_sessions(service) -> List[PPPoESession]:
    """Load sessions (GraphQL, then text-table fallback) and annotate PPS.

    Used by both the REST sessions endpoint and the dashboard SSE broadcaster so
    the two paths share one tracker. Raises ``PPPoESessionsUnavailable`` when
    both the structured op and the text-table fallback fail. The REST endpoint
    maps that to HTTP 502; the SSE path treats it as a fetch error and does not
    502 the stream.
    """
    sessions = await fetch_accel_ppp_sessions(service)
    if sessions is None:
        try:
            response = await run_in_threadpool(
                service.device.show, path=["pppoe-server", "sessions"]
            )
        except Exception as exc:
            logger.exception("PPPoE sessions text-table fallback failed")
            raise PPPoESessionsUnavailable("Unable to read PPPoE sessions") from exc
        if response.status != 200:
            raise PPPoESessionsUnavailable(
                response.error or "Unable to read PPPoE sessions"
            )
        output = (
            response.result.get("data", "")
            if isinstance(response.result, dict)
            else response.result
        )
        sessions = parse_pppoe_sessions(output or "")
    PPPOE_PPS_TRACKER.annotate_sessions(str(id(service.device)), sessions)
    return sessions


def parse_pppoe_sessions(output: str) -> List[PPPoESession]:
    """Parse the pipe-delimited table from ``show pppoe-server sessions``.

    Fallback for when the structured ``ShowSessionsAccelppp`` operation is
    unavailable. The table carries no packet counters in normal operation, so
    ``rx_packets``/``tx_packets`` (and therefore PPS) are typically unknown here.
    """
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
