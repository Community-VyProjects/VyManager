"""
NHRP Protocol Router

API endpoints for managing VyOS NHRP (Next Hop Resolution Protocol) configuration.
Supports version-aware configuration for VyOS 1.4 and 1.5, which have significant
structural differences in NHRP templates.

Endpoints:
  GET  /vyos/nhrp/capabilities  — version-aware feature flags
  GET  /vyos/nhrp/config        — normalized NHRP configuration
  POST /vyos/nhrp/batch         — atomic set/delete operations
"""

from fastapi import APIRouter, HTTPException, Request
from starlette.concurrency import run_in_threadpool
from pydantic import BaseModel, Field
from typing import List, Dict, Optional, Any
from session_vyos_service import get_session_vyos_service
from vyos_builders.nhrp import NhrpBatchBuilder
from fastapi_permissions import require_read_permission, require_write_permission
from rbac_permissions import FeatureGroup
import inspect
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/vyos/nhrp", tags=["nhrp"])


# ============================================================================
# Pydantic Models
# ============================================================================


class NhrpMapEntry(BaseModel):
    """A static NHRP map entry (tunnel-IP to NBMA mapping)."""
    tunnel_ip: str
    nbma_address: Optional[str] = None
    cisco: bool = False          # VyOS 1.4 only
    register: bool = False       # VyOS 1.4 only


class NhrpDynamicMap(BaseModel):
    """A dynamic map entry (VyOS 1.4 only)."""
    network: str
    nbma_domain_name: Optional[str] = None


class NhrpNhsEntry(BaseModel):
    """An NHS (Next Hop Server) entry (VyOS 1.5 only)."""
    tunnel_ip: str
    nbma_addresses: List[str] = []


class NhrpShortcutTarget(BaseModel):
    """A shortcut target entry (VyOS 1.4 only)."""
    target: str
    holding_time: Optional[str] = None


class NhrpTunnel(BaseModel):
    """Complete NHRP tunnel configuration (version-normalized)."""
    name: str
    authentication: Optional[str] = None
    holding_time: Optional[str] = None
    maps: List[NhrpMapEntry] = []
    dynamic_maps: List[NhrpDynamicMap] = []        # VyOS 1.4 only
    nhs_entries: List[NhrpNhsEntry] = []           # VyOS 1.5 only
    multicast: List[str] = []
    mtu: Optional[str] = None                       # VyOS 1.5 only
    network_id: Optional[str] = None                # VyOS 1.5 only
    redirect: bool = False
    registration_no_unique: bool = False             # VyOS 1.5 only
    shortcut: bool = False
    non_caching: bool = False                        # VyOS 1.4 only
    shortcut_destination: bool = False               # VyOS 1.4 only
    shortcut_targets: List[NhrpShortcutTarget] = []  # VyOS 1.4 only


class NhrpConfig(BaseModel):
    """Complete NHRP configuration."""
    enabled: bool = False
    tunnels: List[NhrpTunnel] = []


class NhrpBatchOperation(BaseModel):
    """Single operation in a batch request."""
    op: str = Field(..., description="Builder method name")
    value: Optional[str] = Field(
        None,
        description=(
            "Argument(s) for the operation. "
            "Single-arg methods: plain string. "
            "Multi-arg methods: comma-separated (e.g., 'tun0,10.0.0.1')."
        ),
    )


class NhrpBatchRequest(BaseModel):
    """Batch configuration request."""
    operations: List[NhrpBatchOperation]


class VyOSResponse(BaseModel):
    """Standard VyOS operation response."""
    success: bool
    data: Optional[Dict[str, Any]] = None
    error: Optional[str] = None


# ============================================================================
# Internal builder methods denylist
# ============================================================================

_INTERNAL_BUILDER_METHODS = frozenset({
    "add_set", "add_delete", "get_operations", "is_empty",
    "get_capabilities", "mappers", "mapper_key", "version", "_operations", "m",
})


# ============================================================================
# Endpoint 1: Capabilities
# ============================================================================


@router.get("/capabilities")
async def get_nhrp_capabilities(request: Request):
    """Return NHRP feature capabilities based on the connected VyOS version."""
    await require_read_permission(request, FeatureGroup.NHRP)
    try:
        service = get_session_vyos_service(request)
        builder = NhrpBatchBuilder(version=service.get_version())
        caps = builder.get_capabilities()
        if hasattr(request.state, "instance") and request.state.instance:
            caps["instance_name"] = request.state.instance.get("name")
            caps["instance_id"] = request.state.instance.get("id")
        return caps
    except Exception:
        logger.exception("Unhandled error")
        raise HTTPException(status_code=500, detail="Internal server error")


# ============================================================================
# Endpoint 2: Config
# ============================================================================


@router.get("/config", response_model=NhrpConfig)
async def get_nhrp_config(http_request: Request, refresh: bool = False):
    """Return the full NHRP configuration in a normalized format."""
    await require_read_permission(http_request, FeatureGroup.NHRP)
    try:
        service = get_session_vyos_service(http_request)
        version = service.get_version()
        is_1_4 = "1.4" in version
        full_config = await run_in_threadpool(service.get_full_config, refresh=refresh)

        nhrp_raw = full_config.get("protocols", {}).get("nhrp", {})
        if not nhrp_raw:
            return NhrpConfig(enabled=False)

        tunnels_raw = nhrp_raw.get("tunnel", {})
        if not tunnels_raw:
            return NhrpConfig(enabled=True, tunnels=[])

        tunnels = []
        for tun_name, tun_cfg in tunnels_raw.items():
            if tun_cfg is None:
                tun_cfg = {}
            tunnels.append(_parse_tunnel(tun_name, tun_cfg, is_1_4))

        return NhrpConfig(
            enabled=True,
            tunnels=sorted(tunnels, key=lambda t: t.name),
        )
    except Exception:
        logger.exception("Unhandled error")
        raise HTTPException(status_code=500, detail="Internal server error")


# ============================================================================
# Endpoint 3: Batch Operations
# ============================================================================


@router.post("/batch", response_model=VyOSResponse)
async def nhrp_batch_configure(http_request: Request, body: NhrpBatchRequest):
    """Execute a batch of NHRP configuration operations atomically."""
    await require_write_permission(http_request, FeatureGroup.NHRP)
    try:
        service = get_session_vyos_service(http_request)
        builder = NhrpBatchBuilder(version=service.get_version())

        for operation in body.operations:
            if operation.op in _INTERNAL_BUILDER_METHODS or operation.op.startswith("_"):
                raise HTTPException(
                    status_code=400,
                    detail=f"Operation not allowed: {operation.op}",
                )

            method = getattr(builder, operation.op)
            sig = inspect.signature(method)
            params = [p for p in sig.parameters.keys() if p != "self"]

            if len(params) == 0:
                method()
            elif len(params) == 1:
                if operation.value is not None:
                    method(operation.value)
                else:
                    method()
            elif len(params) >= 2:
                if operation.value and "," in operation.value:
                    parts = operation.value.split(",", len(params) - 1)
                    method(*parts)
                elif operation.value:
                    method(operation.value)

        response = service.execute_batch(builder)
        return VyOSResponse(
            success=response.status == 200,
            data={"message": "NHRP configuration updated"},
            error=response.error if response.error else None,
        )
    except HTTPException:
        raise
    except AttributeError as e:
        raise HTTPException(status_code=400, detail=f"Unknown operation: {e}")
    except Exception:
        logger.exception("Unhandled error")
        raise HTTPException(status_code=500, detail="Internal server error")


# ============================================================================
# Config Parsers
# ============================================================================


def _to_list(val) -> List[str]:
    """Normalize a value to a list of strings."""
    if val is None:
        return []
    if isinstance(val, list):
        return val
    if isinstance(val, dict):
        return list(val.keys())
    return [str(val)]


def _parse_tunnel(name: str, cfg: dict, is_1_4: bool) -> NhrpTunnel:
    """Parse a single NHRP tunnel configuration."""
    tunnel = NhrpTunnel(name=name)

    # Authentication — different key per version
    if is_1_4:
        auth = cfg.get("cisco-authentication")
    else:
        auth = cfg.get("authentication")
    tunnel.authentication = str(auth) if auth is not None else None

    # Holding time — different key per version
    if is_1_4:
        ht = cfg.get("holding-time")
    else:
        ht = cfg.get("holdtime")
    tunnel.holding_time = str(ht) if ht is not None else None

    # Maps — different structure per version
    if is_1_4:
        tunnel.maps = _parse_maps_v1_4(cfg.get("map", {}))
    else:
        tunnel.maps = _parse_maps_v1_5(cfg.get("map", {}))

    # Dynamic maps — VyOS 1.4 only
    if is_1_4:
        tunnel.dynamic_maps = _parse_dynamic_maps(cfg.get("dynamic-map", {}))

    # NHS — VyOS 1.5 only
    if not is_1_4:
        tunnel.nhs_entries = _parse_nhs(cfg.get("nhs", {}))

    # Multicast
    tunnel.multicast = _to_list(cfg.get("multicast"))

    # MTU — VyOS 1.5 only
    if not is_1_4:
        mtu = cfg.get("mtu")
        tunnel.mtu = str(mtu) if mtu is not None else None

    # Network ID — VyOS 1.5 only
    if not is_1_4:
        nid = cfg.get("network-id")
        tunnel.network_id = str(nid) if nid is not None else None

    # Flags (common)
    tunnel.redirect = "redirect" in cfg
    tunnel.shortcut = "shortcut" in cfg

    # Flags — VyOS 1.5 only
    if not is_1_4:
        tunnel.registration_no_unique = "registration-no-unique" in cfg

    # Flags — VyOS 1.4 only
    if is_1_4:
        tunnel.non_caching = "non-caching" in cfg
        tunnel.shortcut_destination = "shortcut-destination" in cfg
        tunnel.shortcut_targets = _parse_shortcut_targets(cfg.get("shortcut-target", {}))

    return tunnel


def _parse_maps_v1_4(raw: dict) -> List[NhrpMapEntry]:
    """Parse VyOS 1.4 map entries: map {ip} nbma-address/cisco/register."""
    if not raw or not isinstance(raw, dict):
        return []
    maps = []
    for tunnel_ip, map_cfg in raw.items():
        if map_cfg is None:
            map_cfg = {}
        entry = NhrpMapEntry(
            tunnel_ip=tunnel_ip,
            nbma_address=map_cfg.get("nbma-address") if isinstance(map_cfg, dict) else None,
            cisco="cisco" in map_cfg if isinstance(map_cfg, dict) else False,
            register="register" in map_cfg if isinstance(map_cfg, dict) else False,
        )
        maps.append(entry)
    return sorted(maps, key=lambda m: m.tunnel_ip)


def _parse_maps_v1_5(raw: dict) -> List[NhrpMapEntry]:
    """Parse VyOS 1.5 map entries: map tunnel-ip {ip} nbma {ip|local}."""
    if not raw or not isinstance(raw, dict):
        return []
    tunnel_ip_raw = raw.get("tunnel-ip", {})
    if not tunnel_ip_raw or not isinstance(tunnel_ip_raw, dict):
        return []
    maps = []
    for tunnel_ip, map_cfg in tunnel_ip_raw.items():
        if map_cfg is None:
            map_cfg = {}
        entry = NhrpMapEntry(
            tunnel_ip=tunnel_ip,
            nbma_address=map_cfg.get("nbma") if isinstance(map_cfg, dict) else None,
        )
        maps.append(entry)
    return sorted(maps, key=lambda m: m.tunnel_ip)


def _parse_dynamic_maps(raw: dict) -> List[NhrpDynamicMap]:
    """Parse VyOS 1.4 dynamic-map entries."""
    if not raw or not isinstance(raw, dict):
        return []
    entries = []
    for network, dm_cfg in raw.items():
        if dm_cfg is None:
            dm_cfg = {}
        entries.append(NhrpDynamicMap(
            network=network,
            nbma_domain_name=dm_cfg.get("nbma-domain-name") if isinstance(dm_cfg, dict) else None,
        ))
    return sorted(entries, key=lambda e: e.network)


def _parse_nhs(raw: dict) -> List[NhrpNhsEntry]:
    """Parse VyOS 1.5 NHS entries: nhs tunnel-ip {ip|dynamic} nbma {ip}."""
    if not raw or not isinstance(raw, dict):
        return []
    tunnel_ip_raw = raw.get("tunnel-ip", {})
    if not tunnel_ip_raw or not isinstance(tunnel_ip_raw, dict):
        return []
    entries = []
    for tunnel_ip, nhs_cfg in tunnel_ip_raw.items():
        if nhs_cfg is None:
            nhs_cfg = {}
        nbma_raw = nhs_cfg.get("nbma", {}) if isinstance(nhs_cfg, dict) else {}
        nbma_list = _to_list(nbma_raw)
        entries.append(NhrpNhsEntry(
            tunnel_ip=tunnel_ip,
            nbma_addresses=sorted(nbma_list),
        ))
    return sorted(entries, key=lambda e: e.tunnel_ip)


def _parse_shortcut_targets(raw: dict) -> List[NhrpShortcutTarget]:
    """Parse VyOS 1.4 shortcut-target entries."""
    if not raw or not isinstance(raw, dict):
        return []
    entries = []
    for target, st_cfg in raw.items():
        if st_cfg is None:
            st_cfg = {}
        ht = st_cfg.get("holding-time") if isinstance(st_cfg, dict) else None
        entries.append(NhrpShortcutTarget(
            target=target,
            holding_time=str(ht) if ht is not None else None,
        ))
    return sorted(entries, key=lambda e: e.target)
