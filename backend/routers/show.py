"""
Show Operations Router

API endpoints for VyOS show commands (interface counters, system info, etc.).
Uses session-based architecture - VyOS instance comes from user's active session.
"""

from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import asyncio
import json
import re

from session_vyos_service import get_session_vyos_service
from fastapi_permissions import has_permission
from rbac_permissions import FeatureGroup, PermissionLevel
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
# Helper: Parse System Memory
# ========================================================================


def parse_system_memory(output: str) -> dict:
    """
    Parse 'show system memory' output.

    Example:
        Total: 15.54 GB
        Free:  13.92 GB
        Used:  1.62 GB
    """
    result: dict = {"total": None, "free": None, "used": None}
    if not output or not isinstance(output, str):
        return result
    for line in output.strip().split("\n"):
        if ":" in line:
            key, _, value = line.partition(":")
            key = key.strip().lower()
            value = value.strip()
            if key in result:
                result[key] = value
    return result


# ========================================================================
# Helper: Parse System Version
# ========================================================================


def parse_system_version(output: str) -> dict:
    """
    Parse 'show version' output into a flat snake_case dict.

    Keys like 'Release train' become 'release_train'.
    """
    result: dict = {}
    if not output or not isinstance(output, str):
        return result
    for line in output.strip().split("\n"):
        if ":" in line:
            key, _, value = line.partition(":")
            key = key.strip()
            value = value.strip()
            if key and value:
                snake_key = key.lower().replace(" ", "_").replace("-", "_")
                result[snake_key] = value
    return result


# ========================================================================
# Helper: Parse Load Averages
# ========================================================================


def parse_load_averages(output: str) -> dict:
    """
    Parse 'show system processes summary' output.

    Example:
        Uptime: 1d 56m 6s

        Load averages:
        1  minute:   25.8%
        5  minutes:  24.2%
        15 minutes:  22.0%
    """
    result: dict = {
        "uptime": None,
        "load_1min": None,
        "load_5min": None,
        "load_15min": None,
    }
    if not output or not isinstance(output, str):
        return result

    for line in output.strip().split("\n"):
        line = line.strip()
        if not line or ":" not in line:
            continue
        key, _, value = line.partition(":")
        key = key.strip()
        value = value.strip()

        if key.lower() == "uptime":
            result["uptime"] = value
        elif "minute" in key.lower():
            try:
                result_val = float(value.rstrip("%"))
                if key.startswith("1 ") or key == "1":
                    result["load_1min"] = result_val
                elif key.startswith("5 ") or key == "5":
                    result["load_5min"] = result_val
                elif key.startswith("15"):
                    result["load_15min"] = result_val
            except ValueError:
                pass

    return result


# ========================================================================
# Helper: Parse System Storage
# ========================================================================


def parse_disk_usage(output: str) -> list:
    """
    Parse 'show system storage' output into a list of storage entries.

    Example output (may repeat for multiple devices):
        Filesystem: /dev/sda3
        Size:       117G
        Used:       6.5G (6%)
        Available:  105G (94%)
    """
    items: list = []
    if not output or not isinstance(output, str):
        return items

    current: dict = {}

    def _flush(entry: dict) -> None:
        if entry.get("filesystem"):
            entry.setdefault("size", "")
            entry.setdefault("used", "")
            entry.setdefault("available", "")
            entry.setdefault("use_percent", "0%")
            items.append(entry)

    for line in output.strip().split("\n"):
        line = line.strip()
        if not line:
            _flush(current)
            current = {}
            continue

        if ":" not in line:
            continue

        key, _, value = line.partition(":")
        key = key.strip().lower()
        value = value.strip()

        if key == "filesystem":
            _flush(current)
            current = {"filesystem": value}
        elif key == "size":
            current["size"] = value
        elif key == "used":
            # "6.5G (6%)"  →  used="6.5G", use_percent="6%"
            m = re.match(r"(.+?)\s*\((\d+%)\)", value)
            if m:
                current["used"] = m.group(1).strip()
                current["use_percent"] = m.group(2)
            else:
                current["used"] = value
        elif key == "available":
            # "105G (94%)"  →  available="105G"
            m = re.match(r"(.+?)\s*\((\d+%)\)", value)
            current["available"] = m.group(1).strip() if m else value

    _flush(current)
    return items


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
                interfaces.append(InterfaceName(name=iface_name, type=iface_type))

                # Handle VLANs (vif) - 802.1q sub-interfaces
                if isinstance(iface_config, dict) and "vif" in iface_config:
                    vif_data = iface_config["vif"]
                    if isinstance(vif_data, dict):
                        for vlan_id in vif_data.keys():
                            vif_name = f"{iface_name}.{vlan_id}"
                            interfaces.append(InterfaceName(name=vif_name, type="vif"))

                # Handle VIF-S (QinQ service VLANs)
                if isinstance(iface_config, dict) and "vif-s" in iface_config:
                    vif_s_data = iface_config["vif-s"]
                    if isinstance(vif_s_data, dict):
                        for s_vlan_id, s_vlan_config in vif_s_data.items():
                            vif_s_name = f"{iface_name}.{s_vlan_id}"
                            interfaces.append(InterfaceName(name=vif_s_name, type="vif-s"))

                            # Handle VIF-C (QinQ customer VLANs) nested in VIF-S
                            if isinstance(s_vlan_config, dict) and "vif-c" in s_vlan_config:
                                vif_c_data = s_vlan_config["vif-c"]
                                if isinstance(vif_c_data, dict):
                                    for c_vlan_id in vif_c_data.keys():
                                        vif_c_name = f"{iface_name}.{s_vlan_id}.{c_vlan_id}"
                                        interfaces.append(InterfaceName(name=vif_c_name, type="vif-c"))

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


def _collect_wireguard_peers(service, full_config: dict) -> dict:
    """Build the wireguard-peers SSE payload from config + live summary."""
    wg_ifaces = full_config.get("interfaces", {}).get("wireguard", {})
    interfaces = []

    for iface_name, iface_cfg in wg_ifaces.items():
        # Build peer list from config
        config_peers: dict = {}
        for peer_name, peer_cfg in iface_cfg.get("peer", {}).items():
            pub_key = peer_cfg.get("public-key", "")
            allowed = peer_cfg.get("allowed-ips", [])
            if isinstance(allowed, str):
                allowed = [allowed]
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

        # Merge live status
        try:
            resp = service.device.show(path=["interfaces", "wireguard", iface_name, "summary"])
            if resp.status == 200:
                for pub_key, status in _parse_wg_summary(_extract_show_output(resp)).items():
                    if pub_key in config_peers:
                        secs = status.get("latest_handshake_seconds")
                        config_peers[pub_key].update({
                            "endpoint": status.get("endpoint"),
                            "latest_handshake": status.get("latest_handshake"),
                            "latest_handshake_seconds": secs,
                            "transfer_rx": status.get("transfer_rx"),
                            "transfer_tx": status.get("transfer_tx"),
                            "status": "connected" if secs is not None and secs <= 180 else (
                                "idle" if secs is not None else "never"
                            ),
                        })
        except Exception:
            logger.exception("SSE wireguard summary fetch failed for %s", iface_name)

        addresses = iface_cfg.get("address", [])
        if isinstance(addresses, str):
            addresses = [addresses]

        interfaces.append({
            "name": iface_name,
            "description": iface_cfg.get("description"),
            "addresses": addresses,
            "port": iface_cfg.get("port"),
            "disabled": "disable" in iface_cfg,
            "peers": list(config_peers.values()),
        })

    return {"interfaces": interfaces, "total": len(interfaces)}


# ========================================================================
# Endpoint: SSE Dashboard Stream
# ========================================================================


@router.get("/stream")
async def dashboard_stream(request: Request):
    """
    Server-Sent Events stream for dashboard data.

    Pushes interface-counters and system-info events every 5 seconds.
    Includes wireguard-peers channel when the user has WIREGUARD read permission.
    A single connection per session replaces per-card polling.
    """
    service = get_session_vyos_service(request)

    # Check optional channel permissions once — before the loop starts.
    include_wireguard = await has_permission(request, FeatureGroup.WIREGUARD, PermissionLevel.READ)

    async def event_generator():
        yield 'event: connected\ndata: {"message":"Dashboard stream connected"}\n\n'
        while True:
            if await request.is_disconnected():
                break

            # --- interface-counters ---
            try:
                resp = service.device.show(path=["interfaces", "counters"])
                if resp.status == 200:
                    interfaces = parse_interface_counters(_extract_show_output(resp))
                    payload = {
                        "interfaces": [i.dict() for i in interfaces],
                        "total": len(interfaces),
                    }
                    yield f"event: interface-counters\ndata: {json.dumps(payload)}\n\n"
                else:
                    yield f'event: error\ndata: {{"channel":"interface-counters","message":"VyOS command failed"}}\n\n'
            except Exception:
                logger.exception("SSE interface-counters error")
                yield f'event: error\ndata: {{"channel":"interface-counters","message":"Failed to fetch"}}\n\n'

            # --- system-info (memory + version + disk + cpu) ---
            # Each sub-command is fetched independently so a single failure
            # does not suppress the other data.
            memory_data: dict = {"total": None, "free": None, "used": None}
            version_data: dict = {}
            disk_data: list = []
            load_data: dict = {"uptime": None, "load_1min": None, "load_5min": None, "load_15min": None}

            try:
                memory_data = parse_system_memory(
                    _extract_show_output(service.device.show(path=["system", "memory"]))
                )
            except Exception:
                logger.exception("SSE system-info: memory fetch failed")

            try:
                version_data = parse_system_version(
                    _extract_show_output(service.device.show(path=["version"]))
                )
            except Exception:
                logger.exception("SSE system-info: version fetch failed")

            try:
                disk_data = parse_disk_usage(
                    _extract_show_output(service.device.show(path=["system", "storage"]))
                )
            except Exception:
                logger.exception("SSE system-info: disk fetch failed")

            try:
                load_data = parse_load_averages(
                    _extract_show_output(service.device.show(path=["system", "processes", "summary"]))
                )
            except Exception:
                logger.exception("SSE system-info: load averages fetch failed")

            system_payload = {
                "memory": memory_data,
                "version": version_data,
                "disk": disk_data,
                "load": load_data,
            }
            yield f"event: system-info\ndata: {json.dumps(system_payload)}\n\n"

            # --- wireguard-peers (only when user has WIREGUARD read) ---
            if include_wireguard:
                try:
                    full_config = service.get_full_config(refresh=False)
                    wg_payload = _collect_wireguard_peers(service, full_config)
                    yield f"event: wireguard-peers\ndata: {json.dumps(wg_payload)}\n\n"
                except Exception:
                    logger.exception("SSE wireguard-peers error")
                    yield f'event: error\ndata: {{"channel":"wireguard-peers","message":"Failed to fetch"}}\n\n'

            await asyncio.sleep(5)

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )
