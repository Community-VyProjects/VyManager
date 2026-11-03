"""Shared per-device SSE pump for the dashboard stream.

The show router owns the HTTP endpoint and permission gates. This module owns
the live query loop, the same way ``bgp_status`` and ``firewall_statistics``
own their live data. One pump per VyOS instance serves every subscriber.
"""

import asyncio
import json
import logging
from typing import List, Optional

import httpx
from starlette.concurrency import run_in_threadpool

from bgp_status import bgp_configured, bgp_gql_fields, build_bgp_status
from firewall_statistics import (
    FIREWALL_STATS_INTEREST,
    fetch_firewall_statistics_text,
    parse_firewall_statistics,
    zone_chain_names,
)
from hardware_status import build_hardware_status, hardware_gql_fields
from interface_show import parse_gql_interface_counters
from ipsec_status import build_ipsec_status, ipsec_configured, ipsec_gql_fields
from openvpn_status import build_openvpn_status, openvpn_configured, openvpn_gql_fields
from pppoe_status import load_pppoe_sessions, pppoe_configured
from routers.qos.qos import (
    find_cake_targets,
    parse_cake_qos_json,
    parse_shaper_qos_json,
    qos_gql_fields,
    qos_op_result,
)
from transceiver_status import (
    build_transceiver_status,
    physical_ethernet_interfaces,
    transceiver_fetch_timeout,
    transceiver_gql_fields,
)
from vrrp_status import build_vrrp_status, vrrp_configured, vrrp_gql_fields
from wireguard_status import (
    _collect_wg_from_gql,
    _gql_result,
    _parse_vyos_text_config,
    _wg_alias,
)

logger = logging.getLogger(__name__)


def _format_bytes(b: int) -> str:
    """Convert a byte count to a human-readable string, e.g. '15.54 GB'."""
    if b >= 1 << 30:
        return f"{b / (1 << 30):.2f} GB"
    if b >= 1 << 20:
        return f"{b / (1 << 20):.2f} MB"
    if b >= 1 << 10:
        return f"{b / (1 << 10):.2f} KB"
    return f"{b} B"


def _build_gql_payload(api_key: str, include_wireguard: bool, cake_targets: Optional[list] = None, include_vrrp: bool = False, include_bgp: bool = False, include_ipsec: bool = False) -> dict:
    """
    Build the JSON body for the slow dashboard GraphQL query.

    Includes CPU, storage, system status, interface counters, QoS stats, and
    (when ``include_wireguard``) the static WireGuard config for interface
    discovery. Per-interface WireGuard *live status* is intentionally excluded —
    it is fetched concurrently by ``_fetch_gql_wg_status`` so it cannot slow down
    the fast data path.
    """
    k = json.dumps(api_key)  # safely quoted/escaped string literal
    fields = [
        f"CPU: ShowSummaryCpu(data: {{key: {k}}}) {{ data {{ result }} }}",
        f"Storage: ShowStorage(data: {{key: {k}}}) {{ data {{ result }} }}",
        f"SystemStatus(data: {{key: {k}}}) {{ data {{ result }} }}",
        f"InterfaceCounters: ShowCountersInterfaces(data: {{key: {k}}}) {{ data {{ result }} }}",
    ]
    fields += qos_gql_fields(k, cake_targets or [])
    fields += hardware_gql_fields(k)
    if include_vrrp:
        fields += vrrp_gql_fields(k)
    if include_bgp:
        fields += bgp_gql_fields(k)
    if include_ipsec:
        fields += ipsec_gql_fields(k)
    if include_wireguard:
        fields.append(
            f'WireGuardConfig: ShowConfig(data: {{key: {k}, path: ["interfaces", "wireguard"]}}) {{ data {{ result }} }}'
        )
    return {"query": "{ " + " ".join(fields) + " }"}


def _build_gql_wg_status_payload(api_key: str, iface_names: List[str]) -> dict:
    """Build a GraphQL query that fetches live summary for each WireGuard interface."""
    k = json.dumps(api_key)
    fields = []
    for name in iface_names:
        alias = _wg_alias(name)
        path = json.dumps(["interfaces", "wireguard", name, "summary"])
        fields.append(f"{alias}: Show(data: {{key: {k}, path: {path}}}) {{ data {{ result }} }}")
    return {"query": "{ " + " ".join(fields) + " }"}


def _is_live_timeout(exc: BaseException) -> bool:
    """True when this error, or the one it wraps, is an HTTP timeout."""
    current: BaseException | None = exc
    for _ in range(5):
        if current is None:
            return False
        if isinstance(current, httpx.TimeoutException):
            return True
        current = current.__cause__
    return False


def _log_live_gql_failure(label: str, exc: BaseException) -> None:
    """A missed live poll is expected. Timeouts are not exceptions."""
    if _is_live_timeout(exc):
        logger.warning("%s timed out", label)
        return
    logger.exception("%s failed", label)


async def _fetch_graphql_dashboard(service, include_wireguard: bool, cake_targets: Optional[list] = None, include_vrrp: bool = False, include_bgp: bool = False, include_ipsec: bool = False) -> Optional[dict]:
    """
    Fire a single GraphQL POST for the full dashboard data.

    Returns the parsed ``data`` object from the GraphQL response, or None on any error.
    """
    api_key = str(service.config.apikey)
    url = f"{service.config.protocol}://{service.config.hostname}:{service.config.port}/graphql"
    verify = service.config.verify
    payload = _build_gql_payload(api_key, include_wireguard, cake_targets, include_vrrp, include_bgp, include_ipsec)

    try:
        async with httpx.AsyncClient(verify=verify, timeout=15.0) as client:
            resp = await client.post(url, json=payload, auth=("vyos", api_key))
        if resp.status_code != 200:
            logger.error("GraphQL HTTP error %d for %s", resp.status_code, url)
            return None
        body = resp.json()
        if "errors" in body:
            # Log but don't abort — GraphQL returns partial data alongside field errors.
            # This lets an unknown optional operation (e.g. WireGuardStatus) fail without
            # breaking the rest of the dashboard data.
            logger.warning("GraphQL response has field errors: %s", body["errors"])
        return body.get("data")
    except Exception as exc:
        _log_live_gql_failure("GraphQL dashboard fetch", exc)
        return None


def _build_fast_gql_payload(api_key: str, cake_targets: Optional[list] = None) -> dict:
    """Build the fast GraphQL payload: interface counters + (gated) QoS.

    QoS rides this 3 s call so its live bandwidth stays smooth. ``ShowShaperQos``
    is always included (it returns ``success:false`` when nothing is applied, which
    can't break the other fields); per-cake ``ShowCakeQos`` aliases are added only
    for the cake interfaces discovered from config.

    OpenVPN status is intentionally excluded — ``ShowOpenvpn`` is slow and erratic
    on some hosts (2–16 s), so it is fetched in its own concurrent task
    (``_fetch_gql_openvpn_status``) where it cannot stall counters/QoS.
    """
    k = json.dumps(api_key)
    fields = [f"InterfaceCounters: ShowCountersInterfaces(data: {{key: {k}}}) {{ data {{ result }} }}"]
    fields += qos_gql_fields(k, cake_targets or [])
    return {"query": "{ " + " ".join(fields) + " }"}


async def _fetch_graphql_fast(service, cake_targets: Optional[list] = None) -> Optional[dict]:
    """Fire a minimal GraphQL POST for interface counters + QoS.

    A timeout returns None. The broadcaster keeps the last snapshot instead of
    erroring the interface card.
    """
    api_key = str(service.config.apikey)
    url = f"{service.config.protocol}://{service.config.hostname}:{service.config.port}/graphql"
    payload = _build_fast_gql_payload(api_key, cake_targets)
    try:
        async with httpx.AsyncClient(verify=service.config.verify, timeout=15.0) as client:
            resp = await client.post(url, json=payload, auth=("vyos", api_key))
        if resp.status_code != 200:
            logger.error("GraphQL fast fetch HTTP error %d", resp.status_code)
            return None
        body = resp.json()
        if "errors" in body:
            logger.warning("GraphQL fast response errors: %s", body["errors"])
        return body.get("data")
    except Exception as exc:
        _log_live_gql_failure("GraphQL fast dashboard fetch", exc)
        return None


async def _fetch_gql_openvpn_status(service) -> dict:
    """Fetch OpenVPN status (all 3 modes) in one GraphQL POST, on its own task.

    ``ShowOpenvpn`` can take anywhere from 2 to 16 s on a loaded host, so it runs
    concurrently with a generous timeout instead of riding the fast/slow shared
    query. Returns the ``data`` dict (``{OpenvpnServer: ..., ...}``) for
    ``build_openvpn_status``, or an empty dict on any error so callers degrade
    gracefully.
    """
    api_key = str(service.config.apikey)
    url = f"{service.config.protocol}://{service.config.hostname}:{service.config.port}/graphql"
    payload = {"query": "{ " + " ".join(openvpn_gql_fields(json.dumps(api_key))) + " }"}
    try:
        async with httpx.AsyncClient(verify=service.config.verify, timeout=30.0) as client:
            resp = await client.post(url, json=payload, auth=("vyos", api_key))
        if resp.status_code != 200:
            logger.error("GraphQL OpenVPN status HTTP error %d", resp.status_code)
            return {}
        body = resp.json()
        if "errors" in body:
            logger.warning("GraphQL OpenVPN status field errors: %s", body["errors"])
        return body.get("data") or {}
    except Exception as exc:
        _log_live_gql_failure("GraphQL OpenVPN status fetch", exc)
        return {}


async def _fetch_gql_transceivers(service, interfaces: List[str]) -> Optional[dict]:
    """Fetch DDM diagnostics for the named physical ports in one GraphQL POST.

    Each alias is a separate ``ethtool --module-info`` on the router (~0.42 s per
    port, measured), so this runs on its own task with a port-count-scaled
    timeout and never rides the shared dashboard query. Returns ``None`` on any
    error so the caller keeps showing the previous snapshot instead of blanking
    the card.
    """
    if not interfaces:
        return {}
    api_key = str(service.config.apikey)
    url = f"{service.config.protocol}://{service.config.hostname}:{service.config.port}/graphql"
    fields = transceiver_gql_fields(json.dumps(api_key), interfaces)
    payload = {"query": "{ " + " ".join(fields) + " }"}
    try:
        timeout = transceiver_fetch_timeout(len(interfaces))
        async with httpx.AsyncClient(verify=service.config.verify, timeout=timeout) as client:
            resp = await client.post(url, json=payload, auth=("vyos", api_key))
        if resp.status_code != 200:
            logger.error("GraphQL transceiver HTTP error %d", resp.status_code)
            return None
        body = resp.json()
        if "errors" in body:
            logger.warning("GraphQL transceiver field errors: %s", body["errors"])
        return body.get("data") or {}
    except Exception as exc:
        _log_live_gql_failure("GraphQL transceiver fetch", exc)
        return None


async def _fetch_gql_wg_status(service, iface_names: List[str]) -> dict:
    """
    Fetch live WireGuard peer status for each named interface in one GraphQL POST.

    Returns a dict of ``{alias: result_data}`` suitable for merging into the main
    ``gql`` dict so ``_collect_wg_from_gql`` can read the ``WGStatus_*`` aliases.
    Returns an empty dict on any error so callers can degrade gracefully.
    """
    if not iface_names:
        return {}
    api_key = str(service.config.apikey)
    url = f"{service.config.protocol}://{service.config.hostname}:{service.config.port}/graphql"
    verify = service.config.verify
    payload = _build_gql_wg_status_payload(api_key, iface_names)
    try:
        async with httpx.AsyncClient(verify=verify, timeout=20.0) as client:
            resp = await client.post(url, json=payload, auth=("vyos", api_key))
        if resp.status_code != 200:
            logger.error("GraphQL WG status HTTP error %d", resp.status_code)
            return {}
        body = resp.json()
        if "errors" in body:
            logger.warning("GraphQL WG status field errors: %s", body["errors"])
        return body.get("data") or {}
    except Exception as exc:
        _log_live_gql_failure("GraphQL WireGuard status fetch", exc)
        return {}


def parse_gql_memory(ram: dict) -> dict:
    """Convert GraphQL RAM dict (bytes) to human-readable strings.

    VyOS memory.show(raw=True) exposes MemAvailable as ``free`` and
    MemTotal - MemAvailable as ``used``. Buffers and cache are already
    accounted for; adjusting these fields again double-counts them.
    """
    if not ram:
        return {"total": None, "free": None, "used": None}

    total = ram.get("total") or 0
    available = ram.get("free") or 0
    used = ram.get("used")
    if used is None:
        used = max(0, total - available)

    return {
        "total": _format_bytes(total) if total else None,
        "used": _format_bytes(used) if total else None,
        "free": _format_bytes(available) if total else None,
    }


def parse_gql_load(uptime_data: dict, cpu_count: int) -> dict:
    """Convert GraphQL uptime/load_average dict to frontend load format (percentages)."""
    if not uptime_data:
        return {"uptime": None, "load_1min": None, "load_5min": None, "load_15min": None}
    cpu_count = max(cpu_count or 1, 1)
    load_avg = uptime_data.get("load_average") or {}

    def _to_pct(val: Optional[float]) -> Optional[float]:
        if val is None:
            return None
        return round((val / cpu_count) * 100, 1)

    return {
        "uptime": uptime_data.get("uptime"),
        "load_1min": _to_pct(load_avg.get("1")),
        "load_5min": _to_pct(load_avg.get("5")),
        "load_15min": _to_pct(load_avg.get("15")),
    }


def parse_gql_storage(storage) -> list:
    """Convert GraphQL storage dict (bytes) to the DiskPartition list format."""
    if not storage or not isinstance(storage, dict) or not storage.get("filesystem"):
        return []
    use_pct = storage.get("use_percentage", "0")
    return [{
        "filesystem": storage["filesystem"],
        "size": _format_bytes(storage.get("size") or 0),
        "used": _format_bytes(storage.get("used") or 0),
        "available": _format_bytes(storage.get("avail") or 0),
        "use_percent": f"{use_pct}%",
        "mounted_on": "",
    }]


def parse_gql_version(version: dict) -> dict:
    """Extract the version fields that the frontend SystemInfoCard expects."""
    if not version:
        return {}
    return {
        "version": version.get("version"),
        "hardware_vendor": version.get("hardware_vendor"),
        "hardware_model": version.get("hardware_model"),
        "release_train": version.get("release_train"),
        "built_on": version.get("built_on"),
    }


_FAST_INTERVAL = 3.0     # seconds between fast cycles (interface counters)
_SLOW_EVERY = 5          # emit system-info / WG every N fast cycles (= every 15 s)
_WG_MIN_INTERVAL = 15.0  # minimum seconds between WireGuard status queries
_OPENVPN_MIN_INTERVAL = 6.0  # minimum seconds between (slow, erratic) OpenVPN status queries
_TRANSCEIVER_MIN_INTERVAL = 15.0  # minimum seconds between DDM sweeps (one ethtool per port)
_STREAM_INTERESTS = frozenset({"pppoe-sessions", "transceiver-health", FIREWALL_STATS_INTEREST})
_FIREWALL_STATS_MIN_INTERVAL = 15.0  # nft dump; never ride the 3 s counter loop


class DeviceDataBroadcaster:
    """
    One shared background task per VyOS device instance.
    All SSE clients connected to the same device subscribe to this broadcaster
    instead of each running their own VyOS query loop.

    Fast data (interface counters): fetched every 3 s.
    Slow data (CPU, RAM, disk, WireGuard config): fetched every 15 s.
    WireGuard live peer status: background task, minimum 15 s between queries.
    """

    def __init__(self, key: str, service) -> None:
        self._key = key
        self._service = service
        self._subscribers: list[tuple[asyncio.Queue, frozenset[str]]] = []
        self._task: Optional[asyncio.Task] = None
        self._wg_task: Optional[asyncio.Task] = None
        self._last_wg_status: dict = {}
        self._cached_wg_ifaces: list[str] = []
        self._last_wg_query_time: float = 0.0
        # OpenVPN status runs on its own task (ShowOpenvpn is slow/erratic) so it
        # never stalls the fast counters/QoS query.
        self._openvpn_task: Optional[asyncio.Task] = None
        self._last_openvpn_status: dict = {}
        self._last_openvpn_query_time: float = 0.0
        self._openvpn_fetched: bool = False
        # Cake interfaces (interface, policy) discovered from config; refreshed on
        # the slow cycle and used to build per-cake GraphQL aliases each cycle.
        self._cached_cake_targets: list = []
        # Whether OpenVPN is configured (gates the ShowOpenvpn fetch).
        self._openvpn_configured: bool = False
        # Whether any VRRP group is configured (gates the show vrrp fetch).
        self._vrrp_configured: bool = False
        # Whether BGP is configured (gates the show bgp summary fetch).
        self._bgp_configured: bool = False
        # Whether IPSec is configured (gates the show ipsec connections fetch).
        self._ipsec_configured: bool = False
        # Whether service pppoe-server is configured (gates the sessions fetch).
        self._pppoe_configured: bool = False
        self._pppoe_task: Optional[asyncio.Task] = None
        # Transceiver DDM runs on its own task: one ``ethtool --module-info`` per
        # physical port, so its cost grows with port count and must never ride
        # the shared query. Interest-gated like PPPoE sessions.
        self._transceiver_task: Optional[asyncio.Task] = None
        self._transceiver_interfaces: list[str] = []
        self._transceiver_pending: list[str] = []
        self._last_transceiver_query_time: float = 0.0
        # Firewall statistics walks every nft ruleset. Interest-gated and kept
        # off the shared query so a dashboard without the hits card pays nothing.
        self._firewall_task: Optional[asyncio.Task] = None
        self._last_firewall_query_time: float = 0.0
        self._zone_chains: dict[str, set[str]] = {"ipv4": set(), "ipv6": set()}

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def subscribe(self, interests: Optional[set[str]] = None) -> asyncio.Queue:
        """Add a subscriber queue and ensure the background task is running.

        ``interests`` is an optional set of extra event types this subscriber
        wants fetched. Only names in ``_STREAM_INTERESTS`` are honoured. The
        PPPoE sessions GraphQL call runs only when at least one current
        subscriber asked for ``pppoe-sessions``.
        """
        q: asyncio.Queue = asyncio.Queue(maxsize=32)
        wanted = frozenset(i for i in (interests or set()) if i in _STREAM_INTERESTS)
        self._subscribers.append((q, wanted))
        if self._task is None or self._task.done():
            self._task = asyncio.create_task(self._run())
            self._task.add_done_callback(self._on_task_done)
        return q

    def unsubscribe(self, q: asyncio.Queue) -> None:
        """Remove a subscriber queue; stop background tasks when the last one leaves."""
        self._subscribers = [item for item in self._subscribers if item[0] is not q]
        if not self._has_interest("pppoe-sessions") and self._pppoe_task and not self._pppoe_task.done():
            self._pppoe_task.cancel()
            self._pppoe_task = None
        if not self._has_interest("transceiver-health") and self._transceiver_task and not self._transceiver_task.done():
            self._transceiver_task.cancel()
            self._transceiver_task = None
        if not self._has_interest(FIREWALL_STATS_INTEREST) and self._firewall_task and not self._firewall_task.done():
            self._firewall_task.cancel()
            self._firewall_task = None
        if not self._subscribers:
            if self._task and not self._task.done():
                self._task.cancel()
            if self._wg_task and not self._wg_task.done():
                self._wg_task.cancel()
            if self._openvpn_task and not self._openvpn_task.done():
                self._openvpn_task.cancel()
            if self._pppoe_task and not self._pppoe_task.done():
                self._pppoe_task.cancel()
            if self._transceiver_task and not self._transceiver_task.done():
                self._transceiver_task.cancel()
            if self._firewall_task and not self._firewall_task.done():
                self._firewall_task.cancel()
            _broadcasters.pop(self._key, None)

    def _has_interest(self, name: str) -> bool:
        return any(name in interests for _, interests in self._subscribers)

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    def _push_to_all(self, event: dict) -> None:
        """Put an event into every subscriber queue. Drop oldest if full."""
        for q, _interests in list(self._subscribers):
            if q.full():
                try:
                    q.get_nowait()
                except asyncio.QueueEmpty:
                    pass
            try:
                q.put_nowait(event)
            except asyncio.QueueFull:
                logger.debug("Broadcaster queue still full after drop; skipping subscriber")

    def _broadcast_interface_counters(self, gql: dict) -> None:
        try:
            iface_list = _gql_result(gql, "InterfaceCounters") or []
            interfaces = parse_gql_interface_counters(iface_list)
            self._push_to_all({
                "type": "interface-counters",
                "data": {"interfaces": [i.dict() for i in interfaces], "total": len(interfaces)},
            })
        except Exception:
            logger.exception("Broadcaster: interface-counters parse error")
            self._push_to_all({"type": "error", "data": {"channel": "interface-counters", "message": "Parse failed"}})

    def _broadcast_system_info(self, gql: dict) -> None:
        try:
            sys_result = _gql_result(gql, "SystemStatus") or {}
            cpu_result = _gql_result(gql, "CPU") or {}
            storage_result = _gql_result(gql, "Storage") or {}
            cpu_count = cpu_result.get("count", 1)
            self._push_to_all({
                "type": "system-info",
                "data": {
                    "memory": parse_gql_memory(sys_result.get("ram") or {}),
                    "version": parse_gql_version(sys_result.get("version") or {}),
                    "disk": parse_gql_storage(storage_result),
                    "load": parse_gql_load(sys_result.get("uptime") or {}, cpu_count),
                },
            })
        except Exception:
            logger.exception("Broadcaster: system-info parse error")
            self._push_to_all({"type": "error", "data": {"channel": "system-info", "message": "Parse failed"}})

    def _handle_wg_cycle(self, gql: dict) -> None:
        try:
            config_text = _gql_result(gql, "WireGuardConfig") or ""
            parsed_config = _parse_vyos_text_config(config_text)
            new_ifaces = list((parsed_config.get("wireguard") or {}).keys())
            if new_ifaces:
                self._cached_wg_ifaces = new_ifaces

            # Collect completed WG task
            if self._wg_task is not None and self._wg_task.done():
                try:
                    self._last_wg_status = self._wg_task.result() or {}
                except Exception:
                    self._last_wg_status = {}
                self._wg_task = None
                self._last_wg_query_time = asyncio.get_event_loop().time()

            # Start new WG task if cooldown elapsed
            now = asyncio.get_event_loop().time()
            if (self._wg_task is None
                    and self._cached_wg_ifaces
                    and (now - self._last_wg_query_time) >= _WG_MIN_INTERVAL):
                self._wg_task = asyncio.create_task(
                    _fetch_gql_wg_status(self._service, self._cached_wg_ifaces)
                )

            merged_gql = {**gql, **self._last_wg_status}
            wg_payload = _collect_wg_from_gql(merged_gql, parsed_config)
            self._push_to_all({"type": "wireguard-peers", "data": wg_payload})
        except Exception:
            logger.exception("Broadcaster: wireguard-peers error")
            self._push_to_all({"type": "error", "data": {"channel": "wireguard-peers", "message": "Failed to fetch"}})

    def _broadcast_qos(self, gql: dict, cake_targets: list) -> None:
        """Parse QoS stats from the shared GraphQL result and push a qos-stats event.

        ``cake_targets`` must be the same list the query was built with, so the
        ``Cake_<i>`` aliases line up by index.
        """
        try:
            shaper = parse_shaper_qos_json(qos_op_result(gql, "Shaper"))
            cake = []
            for i, (ifname, policy) in enumerate(cake_targets):
                parsed = parse_cake_qos_json(qos_op_result(gql, f"Cake_{i}"), ifname, policy)
                if parsed:
                    cake.append(parsed)
            self._push_to_all({
                "type": "qos-stats",
                "data": {
                    "applied": bool(shaper.interfaces) or bool(cake),
                    "interfaces": [i.dict() for i in shaper.interfaces],
                    "cake": [c.dict() for c in cake],
                },
            })
        except Exception:
            logger.exception("Broadcaster: qos-stats parse error")
            self._push_to_all({"type": "error", "data": {"channel": "qos-stats", "message": "Parse failed"}})

    async def _refresh_config_state(self) -> None:
        """Refresh config-derived gates (cake interfaces, OpenVPN presence)."""
        try:
            cfg = await run_in_threadpool(self._service.get_full_config, refresh=False)
            self._cached_cake_targets = find_cake_targets(cfg)
            self._openvpn_configured = openvpn_configured(cfg)
            self._vrrp_configured = vrrp_configured(cfg)
            self._bgp_configured = bgp_configured(cfg)
            self._ipsec_configured = ipsec_configured(cfg)
            self._pppoe_configured = pppoe_configured(cfg)
            # Physical Ethernet ports only — a VLAN sub-interface has no module.
            self._transceiver_interfaces = physical_ethernet_interfaces(cfg)
            self._zone_chains = zone_chain_names(cfg)
        except Exception:
            logger.exception("Broadcaster: config-state refresh error")

    def _handle_openvpn_cycle(self) -> None:
        """Drive the concurrent OpenVPN status fetch and push the latest snapshot.

        Mirrors ``_handle_wg_cycle``: collect a completed fetch, start a new one
        when the cooldown has elapsed, and push the last good snapshot every cycle.
        ``ShowOpenvpn`` is slow/erratic, so it runs off the shared query path here.
        Only pushes once a first result has arrived, so the card shows "Loading…"
        rather than flashing an empty list before the initial fetch returns.
        """
        try:
            # Collect a completed fetch.
            if self._openvpn_task is not None and self._openvpn_task.done():
                try:
                    self._last_openvpn_status = self._openvpn_task.result() or {}
                except Exception:
                    self._last_openvpn_status = {}
                self._openvpn_fetched = True
                self._openvpn_task = None
                self._last_openvpn_query_time = asyncio.get_event_loop().time()

            # Start a new fetch if the cooldown has elapsed.
            now = asyncio.get_event_loop().time()
            if (self._openvpn_task is None
                    and (now - self._last_openvpn_query_time) >= _OPENVPN_MIN_INTERVAL):
                self._openvpn_task = asyncio.create_task(
                    _fetch_gql_openvpn_status(self._service)
                )

            if self._openvpn_fetched:
                self._push_to_all({"type": "openvpn-status", "data": build_openvpn_status(self._last_openvpn_status)})
        except Exception:
            logger.exception("Broadcaster: openvpn-status error")
            self._push_to_all({"type": "error", "data": {"channel": "openvpn-status", "message": "Failed to fetch"}})

    def _broadcast_vrrp(self, gql: dict) -> None:
        """Parse live VRRP group state from the shared GraphQL result and push an event."""
        try:
            self._push_to_all({"type": "vrrp-status", "data": build_vrrp_status(gql)})
        except Exception:
            logger.exception("Broadcaster: vrrp-status parse error")
            self._push_to_all({"type": "error", "data": {"channel": "vrrp-status", "message": "Parse failed"}})

    def _broadcast_bgp(self, gql: dict) -> None:
        """Parse live BGP session state from the shared GraphQL result and push an event."""
        try:
            self._push_to_all({"type": "bgp-status", "data": build_bgp_status(gql)})
        except Exception:
            logger.exception("Broadcaster: bgp-status parse error")
            self._push_to_all({"type": "error", "data": {"channel": "bgp-status", "message": "Parse failed"}})

    def _broadcast_ipsec(self, gql: dict) -> None:
        """Parse live IPSec tunnel state from the shared GraphQL result and push an event."""
        try:
            self._push_to_all({"type": "ipsec-status", "data": build_ipsec_status(gql)})
        except Exception:
            logger.exception("Broadcaster: ipsec-status parse error")
            self._push_to_all({"type": "error", "data": {"channel": "ipsec-status", "message": "Parse failed"}})

    def _broadcast_hardware(self, gql: dict) -> None:
        """Parse hardware sensor readings from the shared GraphQL result and push an event."""
        try:
            self._push_to_all({"type": "hardware-sensors", "data": build_hardware_status(gql)})
        except Exception:
            logger.exception("Broadcaster: hardware-sensors parse error")
            self._push_to_all({"type": "error", "data": {"channel": "hardware-sensors", "message": "Parse failed"}})

    def _handle_pppoe_cycle(self, *, start: bool) -> None:
        """Collect a completed PPPoE sessions fetch; start a new one each cycle.

        ``ShowSessionsAccelppp`` is a ~2s GraphQL call, so it runs off the shared
        query path (same pattern as OpenVPN) and is only started when pppoe-server
        is configured and a subscriber asked for ``pppoe-sessions``.
        """
        try:
            if self._pppoe_task is not None and self._pppoe_task.done():
                try:
                    sessions = self._pppoe_task.result() or []
                except asyncio.CancelledError:
                    self._pppoe_task = None
                    return
                except Exception as exc:
                    self._pppoe_task = None
                    _log_live_gql_failure("Broadcaster: pppoe-sessions fetch", exc)
                    return
                self._pppoe_task = None
                payload = {
                    "sessions": [s.model_dump() for s in sessions],
                    "total": len(sessions),
                }
                self._push_to_all({"type": "pppoe-sessions", "data": payload})

            if not start:
                return
            if not self._has_interest("pppoe-sessions"):
                return
            if not self._pppoe_configured:
                self._push_to_all({
                    "type": "pppoe-sessions",
                    "data": {"sessions": [], "total": 0},
                })
                return
            if self._pppoe_task is None:
                self._pppoe_task = asyncio.create_task(load_pppoe_sessions(self._service))
        except Exception:
            logger.exception("Broadcaster: pppoe-sessions error")
            self._push_to_all({"type": "error", "data": {"channel": "pppoe-sessions", "message": "Failed to fetch"}})

    def _handle_transceiver_cycle(self, *, start: bool) -> None:
        """Collect a completed DDM sweep and start the next one when due.

        One ``ethtool --module-info`` per physical port makes this cost scale
        with port count (~0.42 s each, measured), so it runs off the shared query
        path on its own task, is gated on a subscriber asking for
        ``transceiver-health``, and re-sweeps at most every
        ``_TRANSCEIVER_MIN_INTERVAL`` seconds regardless of the 3 s cycle.

        VLAN sub-interfaces are never swept: ``physical_ethernet_interfaces``
        returns only the top-level ``interfaces ethernet`` keys.
        """
        try:
            if self._transceiver_task is not None and self._transceiver_task.done():
                swept = self._transceiver_pending
                try:
                    result = self._transceiver_task.result()
                except asyncio.CancelledError:
                    self._transceiver_task = None
                    return
                except Exception:
                    logger.exception("Broadcaster: transceiver-health fetch error")
                    result = None
                self._transceiver_task = None
                self._last_transceiver_query_time = asyncio.get_event_loop().time()
                if result is not None:
                    self._push_to_all({
                        "type": "transceiver-health",
                        "data": build_transceiver_status(result, swept),
                    })

            if not start:
                return
            if not self._has_interest("transceiver-health"):
                return
            if self._transceiver_task is not None:
                return
            now = asyncio.get_event_loop().time()
            if (now - self._last_transceiver_query_time) < _TRANSCEIVER_MIN_INTERVAL:
                return
            if not self._transceiver_interfaces:
                # No physical Ethernet ports configured: nothing to sweep.
                self._push_to_all({
                    "type": "transceiver-health",
                    "data": {"interfaces": [], "total": 0},
                })
                self._last_transceiver_query_time = now
                return
            # Freeze the swept list so the aliases the reply is parsed against
            # match the query even if config changes mid-flight.
            self._transceiver_pending = list(self._transceiver_interfaces)
            self._transceiver_task = asyncio.create_task(
                _fetch_gql_transceivers(self._service, self._transceiver_pending)
            )
        except Exception:
            logger.exception("Broadcaster: transceiver-health error")
            self._push_to_all({"type": "error", "data": {"channel": "transceiver-health", "message": "Failed to fetch"}})

    def _handle_firewall_cycle(self, *, start: bool) -> None:
        """Collect a completed firewall-statistics fetch and start the next when due.

        ``show firewall statistics`` walks every nft ruleset, so it stays off the
        shared dashboard query. It runs only while a subscriber asked for
        ``firewall-statistics``, and at most every ``_FIREWALL_STATS_MIN_INTERVAL``.
        """
        try:
            if self._firewall_task is not None and self._firewall_task.done():
                try:
                    text = self._firewall_task.result()
                except asyncio.CancelledError:
                    self._firewall_task = None
                    return
                except Exception:
                    logger.exception("Broadcaster: firewall-statistics fetch error")
                    text = None
                self._firewall_task = None
                self._last_firewall_query_time = asyncio.get_event_loop().time()
                if text is not None:
                    parsed = parse_firewall_statistics(text)
                    self._push_to_all({
                        "type": FIREWALL_STATS_INTEREST,
                        "data": {
                            "rules": [rule.model_dump() for rule in parsed.rules],
                            "zone_chains": {
                                "ipv4": sorted(self._zone_chains.get("ipv4") or []),
                                "ipv6": sorted(self._zone_chains.get("ipv6") or []),
                            },
                        },
                    })

            if not start:
                return
            if not self._has_interest(FIREWALL_STATS_INTEREST):
                return
            if self._firewall_task is not None:
                return
            now = asyncio.get_event_loop().time()
            if (now - self._last_firewall_query_time) < _FIREWALL_STATS_MIN_INTERVAL:
                return
            self._firewall_task = asyncio.create_task(
                fetch_firewall_statistics_text(self._service)
            )
        except Exception:
            logger.exception("Broadcaster: firewall-statistics error")
            self._push_to_all({
                "type": "error",
                "data": {"channel": FIREWALL_STATS_INTEREST, "message": "Failed to fetch"},
            })

    def _on_task_done(self, fut: asyncio.Future) -> None:
        """Clean up if _run() exits unexpectedly."""
        if fut.cancelled():
            return
        exc = fut.exception()
        if exc:
            logger.error("Broadcaster _run crashed for %s: %s", self._key, exc)
            _broadcasters.pop(self._key, None)
            if self._wg_task and not self._wg_task.done():
                self._wg_task.cancel()
            if self._openvpn_task and not self._openvpn_task.done():
                self._openvpn_task.cancel()
            if self._pppoe_task and not self._pppoe_task.done():
                self._pppoe_task.cancel()
            if self._transceiver_task and not self._transceiver_task.done():
                self._transceiver_task.cancel()
            if self._firewall_task and not self._firewall_task.done():
                self._firewall_task.cancel()

    # ------------------------------------------------------------------
    # Main loop
    # ------------------------------------------------------------------

    async def _run(self) -> None:
        cycle = 0
        try:
            while self._subscribers:
                if cycle % _SLOW_EVERY == 0:
                    # Refresh config-derived gates before building the query.
                    await self._refresh_config_state()
                    targets = self._cached_cake_targets
                    vrrp = self._vrrp_configured
                    bgp = self._bgp_configured
                    ipsec = self._ipsec_configured
                    # Full query: counters + system info + QoS + VRRP + BGP + IPSec + WireGuard
                    gql = await _fetch_graphql_dashboard(self._service, include_wireguard=True, cake_targets=targets, include_vrrp=vrrp, include_bgp=bgp, include_ipsec=ipsec)
                    if gql is not None:
                        self._broadcast_interface_counters(gql)
                        self._broadcast_system_info(gql)
                        self._handle_wg_cycle(gql)
                        self._broadcast_qos(gql, targets)
                        self._broadcast_hardware(gql)
                        if vrrp:
                            self._broadcast_vrrp(gql)
                        if bgp:
                            self._broadcast_bgp(gql)
                        if ipsec:
                            self._broadcast_ipsec(gql)
                    # A missed sample keeps the last snapshot. A timeout is not a card error.
                else:
                    # Fast query: interface counters + QoS
                    targets = self._cached_cake_targets
                    gql = await _fetch_graphql_fast(self._service, cake_targets=targets)
                    if gql is not None:
                        self._broadcast_interface_counters(gql)
                        self._broadcast_qos(gql, targets)
                    # Missed fast sample keeps the last counters. Do not error the card.

                # OpenVPN runs on its own concurrent task (slow/erratic op) so it
                # never blocks the shared queries above; driven every cycle.
                if self._openvpn_configured:
                    self._handle_openvpn_cycle()

                # PPPoE traffic history needs a sample on every 3-second cycle.
                # The in-flight task guard prevents overlapping session queries.
                self._handle_pppoe_cycle(start=True)

                # Transceiver DDM is one ethtool per physical port, so its own
                # task re-sweeps on a 15 s floor rather than every cycle.
                self._handle_transceiver_cycle(start=True)
                self._handle_firewall_cycle(start=True)

                cycle += 1
                await asyncio.sleep(_FAST_INTERVAL)
        except asyncio.CancelledError:
            raise
        finally:
            if self._wg_task and not self._wg_task.done():
                self._wg_task.cancel()
            if self._openvpn_task and not self._openvpn_task.done():
                self._openvpn_task.cancel()
            if self._pppoe_task and not self._pppoe_task.done():
                self._pppoe_task.cancel()
            if self._transceiver_task and not self._transceiver_task.done():
                self._transceiver_task.cancel()
            if self._firewall_task and not self._firewall_task.done():
                self._firewall_task.cancel()


# Global broadcaster registry: instance_id -> DeviceDataBroadcaster
# Entries are added on first subscribe and removed when the last subscriber leaves.
_broadcasters: dict[str, DeviceDataBroadcaster] = {}


def _get_broadcaster(service) -> DeviceDataBroadcaster:
    """Return the existing broadcaster for this device instance, creating one if needed."""
    key: str = service.config.instance_id
    if key not in _broadcasters:
        _broadcasters[key] = DeviceDataBroadcaster(key, service)
    return _broadcasters[key]
