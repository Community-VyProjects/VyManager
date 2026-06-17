"""
Show Operations Router

API endpoints for VyOS show commands (interface counters, system info, etc.).
Uses session-based architecture - VyOS instance comes from user's active session.

The SSE dashboard stream uses the VyOS GraphQL API to fetch all data in a single
HTTP request, replacing multiple individual SSH show commands.
"""

from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import asyncio
import json
import re
import httpx

from starlette.concurrency import run_in_threadpool
from session_vyos_service import get_session_vyos_service
from fastapi_permissions import has_permission, require_read_permission
from rbac_permissions import FeatureGroup, PermissionLevel
from system_updates import SystemUpdatesInfo, parse_system_updates
from routers.qos.qos import (
    find_cake_targets,
    qos_gql_fields,
    qos_op_result,
    parse_shaper_qos_json,
    parse_cake_qos_json,
)
from openvpn_status import openvpn_configured, openvpn_gql_fields, build_openvpn_status
from vrrp_status import vrrp_configured, vrrp_gql_fields, build_vrrp_status
from bgp_status import bgp_configured, bgp_gql_fields, build_bgp_status
import logging
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/vyos/show", tags=["show"])


# ========================================================================
# Pydantic Models
# ========================================================================


class SystemMemory(BaseModel):
    """Parsed memory statistics from 'show system memory'."""
    total: Optional[str] = None
    free: Optional[str] = None
    used: Optional[str] = None


class DiskPartition(BaseModel):
    """Single filesystem entry from 'show disk-usage'."""
    filesystem: str
    size: str
    used: str
    available: str
    use_percent: str
    mounted_on: str


class InterfaceCounter(BaseModel):
    """Model for interface counter statistics."""
    interface: str
    rx_packets: int
    rx_bytes: int
    tx_packets: int
    tx_bytes: int
    rx_dropped: int
    tx_dropped: int
    rx_errors: int
    tx_errors: int


class InterfaceCountersResponse(BaseModel):
    """Response containing interface counter data."""
    interfaces: List[InterfaceCounter]
    total: int


# ========================================================================
# Helper: Extract show-command output from pyvyos response
# (kept for the non-SSE REST endpoints that still use pyvyos)
# ========================================================================


def _extract_show_output(response) -> str:
    """Return the text body of a pyvyos show-command response, or ''."""
    if response.status == 200:
        if isinstance(response.result, dict) and "data" in response.result:
            return response.result["data"] or ""
        if isinstance(response.result, str):
            return response.result
    return ""


# ========================================================================
# GraphQL helpers for SSE dashboard stream
# ========================================================================


def _format_bytes(b: int) -> str:
    """Convert a byte count to a human-readable string, e.g. '15.54 GB'."""
    if b >= 1 << 30:
        return f"{b / (1 << 30):.2f} GB"
    if b >= 1 << 20:
        return f"{b / (1 << 20):.2f} MB"
    if b >= 1 << 10:
        return f"{b / (1 << 10):.2f} KB"
    return f"{b} B"


def _wg_alias(iface_name: str) -> str:
    """Return a valid GraphQL alias for a WireGuard interface name, e.g. 'WGStatus_wg0'."""
    safe = re.sub(r"[^_a-zA-Z0-9]", "_", iface_name)
    return f"WGStatus_{safe}"


def _build_gql_payload(api_key: str, include_wireguard: bool, cake_targets: Optional[list] = None, include_openvpn: bool = False, include_vrrp: bool = False, include_bgp: bool = False) -> dict:
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
    if include_openvpn:
        fields += openvpn_gql_fields(k)
    if include_vrrp:
        fields += vrrp_gql_fields(k)
    if include_bgp:
        fields += bgp_gql_fields(k)
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


async def _fetch_graphql_dashboard(service, include_wireguard: bool, cake_targets: Optional[list] = None, include_openvpn: bool = False, include_vrrp: bool = False, include_bgp: bool = False) -> Optional[dict]:
    """
    Fire a single GraphQL POST for the full dashboard data.

    Returns the parsed ``data`` object from the GraphQL response, or None on any error.
    """
    api_key = str(service.config.apikey)
    url = f"{service.config.protocol}://{service.config.hostname}:{service.config.port}/graphql"
    verify = service.config.verify
    payload = _build_gql_payload(api_key, include_wireguard, cake_targets, include_openvpn, include_vrrp, include_bgp)

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
    except Exception:
        logger.exception("GraphQL dashboard fetch failed")
        return None


def _build_fast_gql_payload(api_key: str, cake_targets: Optional[list] = None, include_openvpn: bool = False) -> dict:
    """Build the fast GraphQL payload: interface counters + (gated) QoS + OpenVPN.

    QoS rides this 3 s call so its live bandwidth stays smooth. ``ShowShaperQos``
    is always included (it returns ``success:false`` when nothing is applied, which
    can't break the other fields); per-cake ``ShowCakeQos`` aliases are added only
    for the cake interfaces discovered from config. OpenVPN status (3 modes) is
    added only when OpenVPN is configured.
    """
    k = json.dumps(api_key)
    fields = [f"InterfaceCounters: ShowCountersInterfaces(data: {{key: {k}}}) {{ data {{ result }} }}"]
    fields += qos_gql_fields(k, cake_targets or [])
    if include_openvpn:
        fields += openvpn_gql_fields(k)
    return {"query": "{ " + " ".join(fields) + " }"}


async def _fetch_graphql_fast(service, cake_targets: Optional[list] = None, include_openvpn: bool = False) -> Optional[dict]:
    """Fire a minimal GraphQL POST for interface counters + QoS + OpenVPN status."""
    api_key = str(service.config.apikey)
    url = f"{service.config.protocol}://{service.config.hostname}:{service.config.port}/graphql"
    payload = _build_fast_gql_payload(api_key, cake_targets, include_openvpn)
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
    except Exception:
        logger.exception("GraphQL fast dashboard fetch failed")
        return None


def _gql_result(gql: dict, key: str):
    """Safely extract ``data.result`` from a named GraphQL alias."""
    entry = gql.get(key) or {}
    data = entry.get("data") or {}
    return data.get("result")


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
    except Exception:
        logger.exception("GraphQL WireGuard status fetch failed")
        return {}


def parse_gql_memory(ram: dict) -> dict:
    """Convert GraphQL RAM dict (bytes) to human-readable strings.

    The GraphQL ``used`` field equals ``total - free`` (Linux kernel definition),
    which includes reclaimable buffers and page cache.  We subtract those so the
    displayed value matches what ``free -h`` / ``show system memory`` reports as
    the application-level used memory.

    ``free`` is reported as the truly *available* amount (raw free + reclaimable
    buffers + cache) so that ``used + free ≈ total`` from the user's perspective.
    """
    if not ram:
        return {"total": None, "free": None, "used": None}

    total   = ram.get("total")   or 0
    free    = ram.get("free")    or 0
    raw_used = ram.get("used")   or (total - free)
    buffers = ram.get("buffers") or 0
    cached  = ram.get("cached")  or 0

    # Application memory: strip reclaimable buffers + page cache
    app_used  = max(0, raw_used - buffers - cached)
    # Available: raw free + everything the kernel can reclaim on demand
    available = free + buffers + cached

    return {
        "total": _format_bytes(total)     if total     else None,
        "used":  _format_bytes(app_used)  if total     else None,
        "free":  _format_bytes(available) if available else None,
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


def parse_gql_interface_counters(ifaces: list) -> List["InterfaceCounter"]:
    """Convert GraphQL interface counter list to InterfaceCounter models.

    GraphQL uses ``ifname``, ``rx_over_errors``, ``tx_carrier_errors``
    instead of ``interface``, ``rx_errors``, ``tx_errors``.
    """
    result = []
    for iface in (ifaces or []):
        try:
            result.append(InterfaceCounter(
                interface=iface["ifname"],
                rx_packets=iface.get("rx_packets", 0),
                rx_bytes=iface.get("rx_bytes", 0),
                tx_packets=iface.get("tx_packets", 0),
                tx_bytes=iface.get("tx_bytes", 0),
                rx_dropped=iface.get("rx_dropped", 0),
                tx_dropped=iface.get("tx_dropped", 0),
                rx_errors=iface.get("rx_over_errors", 0),
                tx_errors=iface.get("tx_carrier_errors", 0),
            ))
        except (KeyError, ValueError):
            continue
    return result


# ========================================================================
# Helper: Parse Interface Counters
# ========================================================================


def parse_interface_counters(output: str) -> List[InterfaceCounter]:
    """
    Parse VyOS 'show interface counters' output into structured data.
    
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
        # Split by whitespace
        parts = line.split()
        
        if len(parts) >= 9:
            try:
                interface = InterfaceCounter(
                    interface=parts[0],
                    rx_packets=int(parts[1]),
                    rx_bytes=int(parts[2]),
                    tx_packets=int(parts[3]),
                    tx_bytes=int(parts[4]),
                    rx_dropped=int(parts[5]),
                    tx_dropped=int(parts[6]),
                    rx_errors=int(parts[7]),
                    tx_errors=int(parts[8])
                )
                interfaces.append(interface)
            except (ValueError, IndexError):
                # Skip malformed lines
                continue
    
    return interfaces


# ========================================================================
# Endpoint: Interface Counters
# ========================================================================


@router.get("/interface-counters", response_model=InterfaceCountersResponse)
async def get_interface_counters(request: Request):
    """
    Get interface counter statistics from VyOS.

    Returns:
        Structured interface counter data for all interfaces
    """
    try:
        service = get_session_vyos_service(request)

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

        interfaces = parse_interface_counters(output)

        return InterfaceCountersResponse(
            interfaces=interfaces,
            total=len(interfaces)
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Unhandled error")
        raise HTTPException(status_code=500, detail="Internal server error")


# ========================================================================
# Endpoint: All Interfaces (from config)
# ========================================================================


class InterfaceName(BaseModel):
    """Model for interface name from config."""
    name: str
    type: str
    description: Optional[str] = None


class AllInterfacesResponse(BaseModel):
    """Response containing all interface names from config."""
    interfaces: List[InterfaceName]
    total: int


@router.get("/all-interfaces", response_model=AllInterfacesResponse)
async def get_all_interfaces(request: Request):
    """
    Get all interface names from VyOS configuration.

    This returns all configured interfaces regardless of their active/up status,
    including VLANs (vif) and other sub-interfaces.

    Returns:
        List of all interface names from the config
    """
    try:
        service = get_session_vyos_service(request)

        # Get full config to extract all interfaces
        full_config = service.get_full_config(refresh=False)
        interfaces_config = full_config.get("interfaces", {})

        interfaces = []

        # Process each interface type
        for iface_type, iface_data in interfaces_config.items():
            if not isinstance(iface_data, dict):
                continue

            # Each interface type contains interface names as keys
            for iface_name, iface_config in iface_data.items():
                cfg = iface_config if isinstance(iface_config, dict) else {}
                interfaces.append(InterfaceName(
                    name=iface_name,
                    type=iface_type,
                    description=cfg.get("description") or None,
                ))

                # Handle VLANs (vif) - 802.1q sub-interfaces
                if "vif" in cfg:
                    vif_data = cfg["vif"]
                    if isinstance(vif_data, dict):
                        for vlan_id, vlan_cfg in vif_data.items():
                            vif_name = f"{iface_name}.{vlan_id}"
                            vlan_desc = vlan_cfg.get("description") or None if isinstance(vlan_cfg, dict) else None
                            interfaces.append(InterfaceName(name=vif_name, type="vif", description=vlan_desc))

                # Handle VIF-S (QinQ service VLANs)
                if "vif-s" in cfg:
                    vif_s_data = cfg["vif-s"]
                    if isinstance(vif_s_data, dict):
                        for s_vlan_id, s_vlan_config in vif_s_data.items():
                            vif_s_name = f"{iface_name}.{s_vlan_id}"
                            s_desc = s_vlan_config.get("description") or None if isinstance(s_vlan_config, dict) else None
                            interfaces.append(InterfaceName(name=vif_s_name, type="vif-s", description=s_desc))

                            # Handle VIF-C (QinQ customer VLANs) nested in VIF-S
                            if isinstance(s_vlan_config, dict) and "vif-c" in s_vlan_config:
                                vif_c_data = s_vlan_config["vif-c"]
                                if isinstance(vif_c_data, dict):
                                    for c_vlan_id, c_vlan_cfg in vif_c_data.items():
                                        vif_c_name = f"{iface_name}.{s_vlan_id}.{c_vlan_id}"
                                        c_desc = c_vlan_cfg.get("description") or None if isinstance(c_vlan_cfg, dict) else None
                                        interfaces.append(InterfaceName(name=vif_c_name, type="vif-c", description=c_desc))

        # Sort interfaces by name for consistent ordering
        interfaces.sort(key=lambda x: x.name)

        return AllInterfacesResponse(
            interfaces=interfaces,
            total=len(interfaces)
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Unhandled error")
        raise HTTPException(status_code=500, detail="Internal server error")


# ========================================================================
# Endpoint: Available Ethernet Interfaces (unconfigured physical ports)
# ========================================================================


class AvailableEthernetInterfacesResponse(BaseModel):
    interfaces: List[str]
    total: int


@router.get("/available-ethernet-interfaces", response_model=AvailableEthernetInterfacesResponse)
async def get_available_ethernet_interfaces(request: Request):
    """
    Return physical ethernet interfaces that exist on the router but are not
    yet configured in VyOS. Used to populate the create-interface dropdown.
    """
    try:
        service = get_session_vyos_service(request)

        # Operational show to list all physical ethernet ports
        response = service.device.show(path=["interfaces", "ethernet"])

        all_eth: List[str] = []
        if response.status == 200:
            output = ""
            if isinstance(response.result, dict) and "data" in response.result:
                output = response.result["data"]
            elif isinstance(response.result, str):
                output = response.result

            for line in output.split("\n"):
                parts = line.split()
                if parts and re.match(r"^eth\d+$", parts[0]):
                    all_eth.append(parts[0])

        # Exclude interfaces that already have an address configured.
        # Interfaces in the config tree with no address (e.g. disabled/empty)
        # are still considered available.
        full_config = service.get_full_config(refresh=False)
        eth_config = full_config.get("interfaces", {}).get("ethernet", {})
        with_address = {
            name for name, cfg in eth_config.items()
            if isinstance(cfg, dict) and "address" in cfg
        }
        available = sorted(i for i in all_eth if i not in with_address)

        return AvailableEthernetInterfacesResponse(interfaces=available, total=len(available))

    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Unhandled error")
        raise HTTPException(status_code=500, detail="Internal server error")


# ========================================================================
# System Updates (op-mode: show system updates)
# ========================================================================


@router.get("/system-updates", response_model=SystemUpdatesInfo)
async def get_system_updates(request: Request):
    """
    Get available-update info for the active instance via ``show system updates``.

    Requires ``set system update-check url <url>`` to be configured on the box;
    when it is not, ``configured`` is False and the rest of the fields are empty.

    The reported URL is for display only — VyManager never fetches it.
    """
    await require_read_permission(request, FeatureGroup.SYSTEM)
    service = get_session_vyos_service(request)

    response = service.device.show(path=["system", "updates"])
    if response.status != 200:
        # A non-200 here usually means the command is unsupported on this version
        # or update-check is not configured — surface as "not configured", not 500.
        return SystemUpdatesInfo(configured=False)

    return parse_system_updates(_extract_show_output(response))


# ========================================================================
# GraphQL-based WireGuard helpers (no pyvyos show calls)
# ========================================================================


def _parse_vyos_text_config(text: str) -> dict:
    """
    Parse VyOS ``show configuration`` text format into a nested dict.

    Handles the following line patterns:
      ``key value {``   → {key: {value: <nested block>}}  (named block)
      ``key {``         → {key: <nested block>}            (unnamed block)
      ``key value``     → {key: "value"}
      ``key``           → {key: True}   (boolean flag, e.g. ``disable``)

    Repeated simple keys become a list so multiple ``allowed-ips`` lines
    are collected as ``["10.0.0.0/8", "192.168.1.0/24"]``.
    Repeated named blocks (e.g. two ``wireguard wgN {`` entries) are merged
    into the same parent dict under key ``wireguard``.
    """
    lines = [l.strip() for l in text.splitlines() if l.strip() and not l.strip().startswith("#")]

    def _set(d: dict, key: str, value: Any) -> None:
        """Append value to list if key already exists, otherwise set it."""
        if key in d:
            existing = d[key]
            if isinstance(existing, list):
                existing.append(value)
            else:
                d[key] = [existing, value]
        else:
            d[key] = value

    def _parse_block(pos: int) -> tuple:
        block: dict = {}
        while pos < len(lines):
            line = lines[pos]
            if line == "}":
                return block, pos + 1
            if line.endswith("{"):
                header = line[:-1].strip()
                parts = header.split(None, 1)
                if len(parts) == 0:
                    pos += 1
                    continue
                if len(parts) == 1:
                    # ``key {``
                    key = parts[0]
                    nested, pos = _parse_block(pos + 1)
                    _set(block, key, nested)
                else:
                    # ``key value {``
                    key, subkey = parts[0], parts[1].strip("\"'")
                    nested, pos = _parse_block(pos + 1)
                    if key not in block or not isinstance(block[key], dict):
                        block[key] = {}
                    block[key][subkey] = nested
            else:
                parts = line.split(None, 1)
                if len(parts) == 1:
                    block[parts[0]] = True
                else:
                    _set(block, parts[0], parts[1].strip("\"'"))
                pos += 1
        return block, pos

    result, _ = _parse_block(0)
    return result


def _collect_wg_from_gql(gql: dict, parsed_config: Optional[dict] = None) -> dict:
    """
    Build the wireguard-peers SSE payload entirely from GraphQL data.

    Uses:
      * ``WireGuardConfig`` alias — static peer definitions (from ShowConfig)
      * ``WGStatus_<name>`` aliases — per-interface live handshake / transfer data
        (from ``Show(data: {path: ["interfaces","wireguard","<name>","summary"]})``)

    ``parsed_config`` may be supplied by the caller to avoid re-parsing the config
    text when it has already been parsed in the same cycle.

    No pyvyos ``show`` calls are made.
    """
    if parsed_config is None:
        config_text = _gql_result(gql, "WireGuardConfig") or ""
        parsed_config = _parse_vyos_text_config(config_text)

    wg_ifaces: dict = parsed_config.get("wireguard") or {}
    if not isinstance(wg_ifaces, dict):
        wg_ifaces = {}

    # Collect live peer status from per-interface aliases.
    # Each alias is keyed by public key; merging across all interfaces is safe
    # because WireGuard public keys are globally unique.
    all_peer_status: dict = {}
    for iface_name in wg_ifaces:
        status_text = _gql_result(gql, _wg_alias(iface_name)) or ""
        if status_text:
            all_peer_status.update(_parse_wg_summary(status_text))

    interfaces = []
    for iface_name, iface_cfg in wg_ifaces.items():
        if not isinstance(iface_cfg, dict):
            continue

        config_peers: dict = {}
        for peer_name, peer_cfg in (iface_cfg.get("peer") or {}).items():
            if not isinstance(peer_cfg, dict):
                continue
            pub_key = peer_cfg.get("public-key", "") or ""
            allowed = peer_cfg.get("allowed-ips", [])
            if isinstance(allowed, str):
                allowed = [allowed]
            elif not isinstance(allowed, list):
                allowed = []
            config_peers[pub_key] = {
                "name": peer_name,
                "public_key": pub_key or None,
                "allowed_ips": allowed,
                "endpoint": None,
                "latest_handshake": None,
                "latest_handshake_seconds": None,
                "transfer_rx": None,
                "transfer_tx": None,
                "status": "never",
            }

        # Overlay live handshake / transfer data from the GraphQL show result
        for pub_key, live in all_peer_status.items():
            if pub_key in config_peers:
                secs = live.get("latest_handshake_seconds")
                config_peers[pub_key].update({
                    "endpoint": live.get("endpoint"),
                    "latest_handshake": live.get("latest_handshake"),
                    "latest_handshake_seconds": secs,
                    "transfer_rx": live.get("transfer_rx"),
                    "transfer_tx": live.get("transfer_tx"),
                    "status": (
                        "connected" if secs is not None and secs <= 180
                        else "idle" if secs is not None
                        else "never"
                    ),
                })

        addresses = iface_cfg.get("address", [])
        if isinstance(addresses, str):
            addresses = [addresses]

        interfaces.append({
            "name": iface_name,
            "description": iface_cfg.get("description"),
            "addresses": addresses,
            "port": iface_cfg.get("port"),
            "disabled": iface_cfg.get("disable") is True,
            "peers": list(config_peers.values()),
        })

    return {"interfaces": interfaces, "total": len(interfaces)}


# ========================================================================
# Helper: Parse WireGuard Interface Summary
# ========================================================================


def _parse_wg_handshake(s: str) -> int | None:
    """Convert a WireGuard handshake time string to seconds.

    Handles two formats:
      Stream release:  "1 minute, 30 seconds ago"  → 90
      Rolling release: "0:01:30"                   → 90
      No handshake:    "(none)"                    → None
    """
    if not s or s.strip().lower() in ("(none)", "none", "-", ""):
        return None
    s = s.strip()

    # H:MM:SS or M:SS
    m = re.match(r"^(\d+):(\d{2}):(\d{2})$", s)
    if m:
        return int(m.group(1)) * 3600 + int(m.group(2)) * 60 + int(m.group(3))
    m = re.match(r"^(\d+):(\d{2})$", s)
    if m:
        return int(m.group(1)) * 60 + int(m.group(2))

    # "X minutes, Y seconds ago"
    total = 0
    text = s.lower().replace(" ago", "")
    for pattern, factor in [(r"(\d+)\s*hour", 3600), (r"(\d+)\s*minute", 60), (r"(\d+)\s*second", 1)]:
        hit = re.search(pattern, text)
        if hit:
            total += int(hit.group(1)) * factor
    return total if total > 0 else None


def _parse_wg_summary(output: str) -> dict:
    """Parse 'show interfaces wireguard <iface> summary' output.

    Returns a dict keyed by public key with handshake/transfer/endpoint data.
    """
    peers: dict = {}
    current: dict | None = None

    def _is_pubkey(v: str) -> bool:
        return bool(re.match(r"^[A-Za-z0-9+/=]{43,44}$", v))

    def _save() -> None:
        if current and current.get("public_key"):
            peers[current["public_key"]] = current

    for raw_line in (output or "").splitlines():
        line = raw_line.strip()
        if not line:
            continue

        if line.startswith("peer:"):
            _save()
            val = line.split(":", 1)[1].strip()
            current = {
                "public_key": val if _is_pubkey(val) else None,
                "latest_handshake": None,
                "latest_handshake_seconds": None,
                "transfer_rx": None,
                "transfer_tx": None,
                "endpoint": None,
            }
        elif current is not None:
            lower = line.lower()
            if lower.startswith("public key:"):
                current["public_key"] = line.split(":", 1)[1].strip()
            elif "latest handshake:" in lower:
                hs = line.split(":", 1)[1].strip()
                current["latest_handshake"] = hs
                current["latest_handshake_seconds"] = _parse_wg_handshake(hs)
            elif lower.startswith("transfer:"):
                parts = line.split(":", 1)[1].strip().split(" received, ")
                if len(parts) == 2:
                    current["transfer_rx"] = parts[0].strip()
                    current["transfer_tx"] = parts[1].replace(" sent", "").strip()
            elif lower.startswith("endpoint:"):
                current["endpoint"] = line.split(":", 1)[1].strip()

    _save()
    return peers



# ========================================================================
# Broadcaster: shared per-device SSE data pump
# ========================================================================

_FAST_INTERVAL = 3.0     # seconds between fast cycles (interface counters)
_SLOW_EVERY = 5          # emit system-info / WG every N fast cycles (= every 15 s)
_WG_MIN_INTERVAL = 15.0  # minimum seconds between WireGuard status queries


class DeviceDataBroadcaster:
    """
    One shared background task per VyOS device instance.
    All SSE clients connected to the same device subscribe to this broadcaster
    instead of each running their own VyOS query loop.

    Fast data (interface counters): fetched every 1 s.
    Slow data (CPU, RAM, disk, WireGuard config): fetched every 5 s.
    WireGuard live peer status: background task, minimum 15 s between queries.
    """

    def __init__(self, key: str, service) -> None:
        self._key = key
        self._service = service
        self._subscribers: list[asyncio.Queue] = []
        self._task: Optional[asyncio.Task] = None
        self._wg_task: Optional[asyncio.Task] = None
        self._last_wg_status: dict = {}
        self._cached_wg_ifaces: list[str] = []
        self._last_wg_query_time: float = 0.0
        # Cake interfaces (interface, policy) discovered from config; refreshed on
        # the slow cycle and used to build per-cake GraphQL aliases each cycle.
        self._cached_cake_targets: list = []
        # Whether OpenVPN is configured (gates the ShowOpenvpn fetch).
        self._openvpn_configured: bool = False
        # Whether any VRRP group is configured (gates the show vrrp fetch).
        self._vrrp_configured: bool = False
        # Whether BGP is configured (gates the show bgp summary fetch).
        self._bgp_configured: bool = False

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def subscribe(self) -> asyncio.Queue:
        """Add a subscriber queue and ensure the background task is running."""
        q: asyncio.Queue = asyncio.Queue(maxsize=32)
        self._subscribers.append(q)
        if self._task is None or self._task.done():
            self._task = asyncio.create_task(self._run())
            self._task.add_done_callback(self._on_task_done)
        return q

    def unsubscribe(self, q: asyncio.Queue) -> None:
        """Remove a subscriber queue; stop background tasks when the last one leaves."""
        try:
            self._subscribers.remove(q)
        except ValueError:
            pass
        if not self._subscribers:
            if self._task and not self._task.done():
                self._task.cancel()
            if self._wg_task and not self._wg_task.done():
                self._wg_task.cancel()
            _broadcasters.pop(self._key, None)

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    def _push_to_all(self, event: dict) -> None:
        """Put an event into every subscriber queue. Drop oldest if full."""
        for q in list(self._subscribers):
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
        except Exception:
            logger.exception("Broadcaster: config-state refresh error")

    def _broadcast_openvpn(self, gql: dict) -> None:
        """Parse OpenVPN status from the shared GraphQL result and push an event."""
        try:
            self._push_to_all({"type": "openvpn-status", "data": build_openvpn_status(gql)})
        except Exception:
            logger.exception("Broadcaster: openvpn-status parse error")
            self._push_to_all({"type": "error", "data": {"channel": "openvpn-status", "message": "Parse failed"}})

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
                    ovpn = self._openvpn_configured
                    vrrp = self._vrrp_configured
                    bgp = self._bgp_configured
                    # Full query: counters + system info + QoS + OpenVPN + VRRP + BGP + WireGuard
                    gql = await _fetch_graphql_dashboard(self._service, include_wireguard=True, cake_targets=targets, include_openvpn=ovpn, include_vrrp=vrrp, include_bgp=bgp)
                    if gql is not None:
                        self._broadcast_interface_counters(gql)
                        self._broadcast_system_info(gql)
                        self._handle_wg_cycle(gql)
                        self._broadcast_qos(gql, targets)
                        if ovpn:
                            self._broadcast_openvpn(gql)
                        if vrrp:
                            self._broadcast_vrrp(gql)
                        if bgp:
                            self._broadcast_bgp(gql)
                    else:
                        self._push_to_all({"type": "error", "data": {"channel": "all", "message": "GraphQL fetch failed"}})
                else:
                    # Fast query: interface counters + QoS + OpenVPN status
                    targets = self._cached_cake_targets
                    ovpn = self._openvpn_configured
                    gql = await _fetch_graphql_fast(self._service, cake_targets=targets, include_openvpn=ovpn)
                    if gql is not None:
                        self._broadcast_interface_counters(gql)
                        self._broadcast_qos(gql, targets)
                        if ovpn:
                            self._broadcast_openvpn(gql)
                    else:
                        self._push_to_all({"type": "error", "data": {"channel": "interface-counters", "message": "GraphQL fast fetch failed"}})

                cycle += 1
                await asyncio.sleep(_FAST_INTERVAL)
        except asyncio.CancelledError:
            raise
        finally:
            if self._wg_task and not self._wg_task.done():
                self._wg_task.cancel()


# Global broadcaster registry: instance_id -> DeviceDataBroadcaster
# Entries are added on first subscribe and removed when the last subscriber leaves.
_broadcasters: dict[str, DeviceDataBroadcaster] = {}


def _get_broadcaster(service) -> DeviceDataBroadcaster:
    """Return the existing broadcaster for this device instance, creating one if needed."""
    key: str = service.config.instance_id
    if key not in _broadcasters:
        _broadcasters[key] = DeviceDataBroadcaster(key, service)
    return _broadcasters[key]


# ========================================================================
# Endpoint: SSE Dashboard Stream
# ========================================================================


@router.get("/stream")
async def dashboard_stream(request: Request):
    """
    Server-Sent Events stream for dashboard data.

    All clients connected to the same VyOS instance share one DeviceDataBroadcaster
    that runs a single set of VyOS GraphQL queries.

    Fast data  (interface counters): every 1 s.
    Slow data  (system info, WG config): every 5 s.
    WG live peers: background task, 15 s minimum between queries.
    """
    service = get_session_vyos_service(request)
    include_wireguard = await has_permission(request, FeatureGroup.WIREGUARD, PermissionLevel.READ)
    include_vrrp = await has_permission(request, FeatureGroup.HIGH_AVAILABILITY, PermissionLevel.READ)
    include_bgp = await has_permission(request, FeatureGroup.BGP, PermissionLevel.READ)
    broadcaster = _get_broadcaster(service)

    instance_id: str = service.config.instance_id
    user_id: str = request.state.user["id"]
    db_pool = request.app.state.db_pool

    async def event_generator():
        from routers.events import _has_active_session
        queue = broadcaster.subscribe()
        try:
            yield 'event: connected\ndata: {"message":"Dashboard stream connected"}\n\n'
            while True:
                if await request.is_disconnected():
                    break
                try:
                    event = await asyncio.wait_for(queue.get(), timeout=30.0)
                except asyncio.TimeoutError:
                    # Close the stream if the user's session has expired
                    if db_pool and not await _has_active_session(db_pool, user_id, instance_id):
                        break
                    yield ": keep-alive\n\n"
                    continue
                if event["type"] == "wireguard-peers" and not include_wireguard:
                    continue
                if event["type"] == "vrrp-status" and not include_vrrp:
                    continue
                if event["type"] == "bgp-status" and not include_bgp:
                    continue
                yield f'event: {event["type"]}\ndata: {json.dumps(event["data"])}\n\n'
        finally:
            broadcaster.unsubscribe(queue)

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )
