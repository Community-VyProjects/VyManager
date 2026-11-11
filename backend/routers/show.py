"""
Show Operations Router

API endpoints for VyOS show commands (interface counters, system info, etc.).
Uses session-based architecture - VyOS instance comes from user's active session.

The SSE dashboard stream uses the VyOS GraphQL API to fetch all data in a single
HTTP request, replacing multiple individual SSH show commands. The live pump
is dashboard_broadcaster. This module is the request endpoint.
"""

from fastapi import APIRouter, HTTPException, Query, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import List, Optional
import asyncio
import json
import httpx

from starlette.concurrency import run_in_threadpool
from session_vyos_service import get_session_vyos_service
from fastapi_permissions import has_permission, require_any_read_permission, require_read_permission
from org_scope import request_scoped_conn
from rbac_permissions import FeatureGroup, PermissionLevel
from stream_auth import fail_closed
from system_updates import SystemUpdatesInfo, parse_system_updates
from hardware_status import HardwareSensorsResponse, hardware_gql_fields, build_hardware_status
from dashboard_broadcaster import (
    _STREAM_INTERESTS,
    _get_broadcaster,
    _log_live_gql_failure,
)
from interface_show import (
    InterfaceCountersResponse,
    InterfaceName,
    parse_interface_counters,
    parse_show_ethernet_names,
    _interfaces_from_kernel,
)
from firewall_statistics import (
    FIREWALL_STATS_INTEREST,
    FirewallStatisticsResponse,
    fetch_firewall_statistics_text,
    filter_firewall_statistics,
    firewall_hits_for_viewer,
    parse_firewall_statistics,
    zone_chain_names,
)
import logging
logger = logging.getLogger(__name__)


async def dashboard_session_closed(open_conn, user_id: str, instance_id: str) -> bool:
    """Close the dashboard stream when the session is gone or cannot be checked."""
    from routers.events import _has_active_session

    async def still_signed_in() -> bool:
        async with open_conn() as conn:
            return await _has_active_session(conn, user_id, instance_id)

    result = await fail_closed(still_signed_in)
    return result.close_reason is not None


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



@router.get("/hardware-sensors", response_model=HardwareSensorsResponse)
async def get_hardware_sensors(request: Request):
    """Return CPU, NIC, and other temperatures from VyOS `show environment sensors`."""
    await require_read_permission(request, FeatureGroup.INTERFACES)
    try:
        service = get_session_vyos_service(request)
        gql = await _fetch_graphql_hardware(service)
        if gql is None:
            raise HTTPException(status_code=502, detail="Unable to read hardware sensors")
        return build_hardware_status(gql)
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Unable to read hardware sensors")
        raise HTTPException(status_code=500, detail="Unable to read hardware sensors") from e


async def firewall_statistics_access(request: Request) -> tuple[bool, bool, bool]:
    """Policies, zones, and bridge read flags for the statistics endpoints."""
    policies = await has_permission(request, FeatureGroup.FIREWALL_POLICIES, PermissionLevel.READ)
    zones = await has_permission(request, FeatureGroup.FIREWALL_ZONES, PermissionLevel.READ)
    bridge = await has_permission(request, FeatureGroup.FIREWALL_BRIDGE, PermissionLevel.READ)
    return policies, zones, bridge


@router.get("/firewall-statistics", response_model=FirewallStatisticsResponse)
async def get_firewall_statistics(request: Request):
    """Per-rule packets and bytes from ``show firewall statistics``.

    The VyOS GraphQL schema has no typed firewall-counter op. This parses the
    text table and returns only the families the caller can already read.
    A missing rule means VyOS did not report it (usually disabled), not that
    its counters are zero.
    """
    policies, zones, bridge = await firewall_statistics_access(request)
    if not (policies or zones or bridge):
        raise HTTPException(
            status_code=403,
            detail="Insufficient permissions. Read access to Firewall Policies, Zones, or Bridge required.",
        )
    try:
        service = get_session_vyos_service(request)
        text = await fetch_firewall_statistics_text(service)
        if text is None:
            raise HTTPException(status_code=502, detail="Unable to read firewall statistics")
        stats = parse_firewall_statistics(text)
        zone_chains: dict[str, set[str]] = {"ipv4": set(), "ipv6": set()}
        if zones and not policies:
            try:
                config = await run_in_threadpool(service.get_full_config, refresh=False)
                zone_chains = zone_chain_names(config)
            except Exception:
                logger.exception("Unable to read zone chain names for statistics filter")
                zone_chains = {"ipv4": set(), "ipv6": set()}
        return filter_firewall_statistics(
            stats,
            policies=policies,
            zones=zones,
            bridge=bridge,
            zone_chains=zone_chains,
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Unable to read firewall statistics")
        raise HTTPException(status_code=500, detail="Unable to read firewall statistics") from e


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


async def _fetch_graphql_hardware(service) -> Optional[dict]:
    """Fetch hardware sensors through VyOS GraphQL."""
    api_key = str(service.config.apikey)
    url = f"{service.config.protocol}://{service.config.hostname}:{service.config.port}/graphql"
    payload = {"query": "{ " + " ".join(hardware_gql_fields(json.dumps(api_key))) + " }"}

    try:
        async with httpx.AsyncClient(verify=service.config.verify, timeout=15.0) as client:
            resp = await client.post(url, json=payload, auth=("vyos", api_key))
        if resp.status_code != 200:
            logger.error("GraphQL hardware sensors HTTP error %d", resp.status_code)
            return None
        body = resp.json()
        if body.get("errors"):
            logger.warning("GraphQL hardware sensors response errors: %s", body["errors"])
        return body.get("data")
    except Exception as exc:
        _log_live_gql_failure("GraphQL hardware sensors fetch", exc)
        return None


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
    await require_read_permission(request, FeatureGroup.INTERFACES)
    try:
        service = get_session_vyos_service(request)

        # Execute 'show interface counters' command
        response = await run_in_threadpool(
            service.device.show, path=["interfaces", "counters"]
        )

        if response.status != 200:
            raise HTTPException(
                status_code=500,
                detail="Unable to read interface counters",
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


class AllInterfacesResponse(BaseModel):
    """Response containing all interface names from config."""
    interfaces: List[InterfaceName]
    total: int


def _interfaces_from_config(interfaces_config: dict) -> List[InterfaceName]:
    """Build the interface list from the VyOS ``interfaces`` config tree.

    Returns every configured interface (regardless of active/up status), plus
    VLAN sub-interfaces (vif), QinQ service VLANs (vif-s) and their customer
    VLANs (vif-c). Sorted by name.
    """
    interfaces: List[InterfaceName] = []

    if not isinstance(interfaces_config, dict):
        return interfaces

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
    return interfaces


@router.get("/all-interfaces", response_model=AllInterfacesResponse)
async def get_all_interfaces(request: Request):
    """
    Get all interface names for use in the interface pickers.

    On VyOS 1.5+ the list is sourced from ``show interfaces kernel json`` so that
    host/container-created interfaces (e.g. tailscale, podman veth/bridges) are
    selectable too; config descriptions/types are merged in and configured-but-
    down interfaces are unioned back in. On VyOS 1.4 (where that command does not
    exist) the list is built from the VyOS config tree.

    Returns:
        List of all interface names, including VLANs and sub-interfaces.
    """
    await require_any_read_permission(request)
    try:
        service = get_session_vyos_service(request)

        # Config-derived list is both the 1.4 result and the 1.5 fallback /
        # enrichment source.
        full_config = await run_in_threadpool(service.get_full_config, refresh=False)
        config_list = _interfaces_from_config(full_config.get("interfaces", {}))

        version = service.get_version() or ""
        interfaces = config_list

        if "1.4" not in version:
            # VyOS 1.5+: prefer the kernel interface list, fall back to config
            # on any failure so the dropdowns never break.
            try:
                response = await run_in_threadpool(
                    service.device.show, path=["interfaces", "kernel", "json"]
                )
                if response.status == 200:
                    output = ""
                    if isinstance(response.result, dict) and "data" in response.result:
                        output = response.result["data"]
                    elif isinstance(response.result, str):
                        output = response.result
                    if output and output.strip():
                        config_index = {i.name: i for i in config_list}
                        interfaces = _interfaces_from_kernel(output, config_index)
                    else:
                        logger.warning("Empty 'show interfaces kernel json' output; using config list")
                else:
                    logger.warning(
                        "'show interfaces kernel json' failed (status %s); using config list",
                        response.status,
                    )
            except Exception:
                logger.exception("Failed to parse kernel interface list; using config list")
                interfaces = config_list

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
    await require_read_permission(request, FeatureGroup.ETHERNET)
    try:
        service = get_session_vyos_service(request)

        # Operational show to list all physical ethernet ports
        response = await run_in_threadpool(
            service.device.show, path=["interfaces", "ethernet"]
        )

        all_eth: List[str] = []
        if response.status == 200:
            output = ""
            if isinstance(response.result, dict) and "data" in response.result:
                output = response.result["data"]
            elif isinstance(response.result, str):
                output = response.result

            all_eth.extend(parse_show_ethernet_names(output))

        # Exclude interfaces that already have an address configured.
        # Interfaces in the config tree with no address (e.g. disabled/empty)
        # are still considered available.
        full_config = await run_in_threadpool(service.get_full_config, refresh=False)
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

    response = await run_in_threadpool(service.device.show, path=["system", "updates"])
    if response.status != 200:
        # A non-200 here usually means the command is unsupported on this version
        # or update-check is not configured — surface as "not configured", not 500.
        return SystemUpdatesInfo(configured=False)

    return parse_system_updates(_extract_show_output(response))




# ========================================================================
# Endpoint: SSE Dashboard Stream
# ========================================================================


def retain_firewall_interest(requested: set[str], *, include_firewall: bool) -> set[str]:
    """Drop the statistics interest when this subscriber cannot see any counters."""
    if not include_firewall:
        requested.discard(FIREWALL_STATS_INTEREST)
    return requested


@router.get("/stream")
async def dashboard_stream(
    request: Request,
    interest: Optional[List[str]] = Query(default=None),
):
    """
    Server-Sent Events stream for dashboard data.

    All clients connected to the same VyOS instance share one DeviceDataBroadcaster
    that runs a single set of VyOS GraphQL queries.

    Fast data  (interface counters): every 3 s.
    Slow data  (system info and WG config): every 15 s.
    PPPoE sessions when requested: every 3 s.
    WG live peers: background task, 15 s minimum between queries.

    Pass ``interest=pppoe-sessions`` to have the broadcaster fetch PPPoE session
    counters. The fetch is skipped unless pppoe-server is configured and at least
    one current subscriber requested that interest.

    Pass ``interest=transceiver-health`` for physical-port DDM diagnostics. That
    sweep is one ``ethtool --module-info`` per configured physical Ethernet port
    (VLAN sub-interfaces have no module and are never swept), so it runs on its
    own task with a 15 s floor and only while a permitted subscriber asks for it.

    Pass ``interest=firewall-statistics`` for the top firewall rule hits card.
    That op dumps every nft ruleset, so it runs on its own task with a 15 s floor
    and only while a permitted subscriber asks for it.
    """
    service = get_session_vyos_service(request)
    include_wireguard = await has_permission(request, FeatureGroup.WIREGUARD, PermissionLevel.READ)
    include_vrrp = await has_permission(request, FeatureGroup.HIGH_AVAILABILITY, PermissionLevel.READ)
    include_bgp = await has_permission(request, FeatureGroup.BGP, PermissionLevel.READ)
    include_pppoe = await has_permission(request, FeatureGroup.PPPOE, PermissionLevel.READ)
    include_hardware = await has_permission(request, FeatureGroup.INTERFACES, PermissionLevel.READ)
    # Same gate as GET /vyos/ethernet/{interface}/transceiver, so the stream
    # cannot hand out DDM data the REST endpoint would refuse.
    include_transceiver = await has_permission(request, FeatureGroup.ETHERNET, PermissionLevel.READ)
    include_policies, include_zones, include_bridge = await firewall_statistics_access(request)
    include_firewall = include_policies or include_zones or include_bridge
    broadcaster = _get_broadcaster(service)

    instance_id: str = service.config.instance_id
    user_id: str = request.state.user["id"]
    requested = {name for name in (interest or []) if name in _STREAM_INTERESTS}
    if not include_pppoe:
        requested.discard("pppoe-sessions")
    if not include_transceiver:
        requested.discard("transceiver-health")
    retain_firewall_interest(requested, include_firewall=include_firewall)

    async def event_generator():
        queue = broadcaster.subscribe(requested)
        try:
            yield 'event: connected\ndata: {"message":"Dashboard stream connected"}\n\n'
            while True:
                if await request.is_disconnected():
                    break
                try:
                    event = await asyncio.wait_for(queue.get(), timeout=30.0)
                except asyncio.TimeoutError:
                    # Close the stream if the user's session has expired.
                    # One short org-scoped connection per tick - a stream
                    # must never hold a transaction open between ticks.
                    if await dashboard_session_closed(
                        lambda: request_scoped_conn(request),
                        user_id,
                        instance_id,
                    ):
                        break
                    yield ": keep-alive\n\n"
                    continue
                if event["type"] == "wireguard-peers" and not include_wireguard:
                    continue
                if event["type"] == "vrrp-status" and not include_vrrp:
                    continue
                if event["type"] == "bgp-status" and not include_bgp:
                    continue
                if event["type"] == "pppoe-sessions" and not include_pppoe:
                    continue
                if event["type"] == "hardware-sensors" and not include_hardware:
                    continue
                if event["type"] == "transceiver-health" and not include_transceiver:
                    continue
                if event["type"] == FIREWALL_STATS_INTEREST:
                    if not include_firewall:
                        continue
                    # Copy. The queued event is shared with every subscriber.
                    payload = firewall_hits_for_viewer(
                        event["data"],
                        policies=include_policies,
                        zones=include_zones,
                        bridge=include_bridge,
                    )
                    yield f'event: {event["type"]}\ndata: {json.dumps(payload)}\n\n'
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
