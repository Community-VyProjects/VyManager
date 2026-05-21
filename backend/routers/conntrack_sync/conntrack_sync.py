"""Conntrack-Sync Service Router.

API endpoints for managing VyOS Connection Tracking Synchronization configuration.
The template structure is identical between VyOS 1.4 and 1.5.

Endpoints:
  GET  /vyos/conntrack-sync/capabilities  — version-aware feature flags
  GET  /vyos/conntrack-sync/config        — normalized conntrack-sync configuration
  POST /vyos/conntrack-sync/batch         — atomic set/delete operations
"""

from fastapi import APIRouter, HTTPException, Request
from starlette.concurrency import run_in_threadpool
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from session_vyos_service import get_session_vyos_service
from vyos_builders.conntrack_sync import ConntrackSyncBatchBuilder
from fastapi_permissions import require_read_permission, require_write_permission
from rbac_permissions import FeatureGroup
import inspect
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/vyos/conntrack-sync", tags=["conntrack-sync"])


# ============================================================================
# Pydantic Models
# ============================================================================


class ConntrackSyncInterface(BaseModel):
    """A single interface configured for conntrack-sync."""
    name: str
    peer: Optional[str] = None
    port: Optional[int] = None


class ConntrackSyncFailoverVrrp(BaseModel):
    sync_group: Optional[str] = None


class ConntrackSyncFailoverMechanism(BaseModel):
    vrrp: Optional[ConntrackSyncFailoverVrrp] = None


class ConntrackSyncConfig(BaseModel):
    """Full conntrack-sync service configuration."""
    accept_protocols: List[str] = []
    disable_external_cache: bool = False
    disable_syslog: bool = False
    event_listen_queue_size: Optional[int] = None
    expect_sync: List[str] = []
    failover_mechanism: Optional[ConntrackSyncFailoverMechanism] = None
    ignore_addresses: List[str] = []
    interfaces: List[ConntrackSyncInterface] = []
    listen_addresses: List[str] = []
    mcast_group: Optional[str] = None
    startup_resync: bool = False
    sync_queue_size: Optional[int] = None


class ConntrackSyncBatchOperation(BaseModel):
    op: str = Field(..., description="Builder method name")
    value: Optional[str] = Field(
        None,
        description=(
            "Argument(s) for the operation. "
            "Single-arg methods: plain string. "
            "Multi-arg methods: comma-separated (e.g., 'eth0,192.168.1.2')."
        ),
    )


class ConntrackSyncBatchRequest(BaseModel):
    operations: List[ConntrackSyncBatchOperation]


class VyOSResponse(BaseModel):
    success: bool
    data: Optional[Dict[str, Any]] = None
    error: Optional[str] = None


# ============================================================================
# Internal builder method denylist
# ============================================================================

_INTERNAL_BUILDER_METHODS = frozenset({
    "add_set", "add_delete", "get_operations", "is_empty",
    "get_capabilities", "mappers", "version", "_operations", "m",
})


# ============================================================================
# Endpoint 1: Capabilities
# ============================================================================


@router.get("/capabilities")
async def get_conntrack_sync_capabilities(request: Request):
    """Return conntrack-sync feature capabilities based on the VyOS version."""
    await require_read_permission(request, FeatureGroup.CONNTRACK_SYNC)
    try:
        service = get_session_vyos_service(request)
        builder = ConntrackSyncBatchBuilder(version=service.get_version())
        caps = builder.get_capabilities()
        if hasattr(request.state, "instance") and request.state.instance:
            caps["instance_name"] = request.state.instance.get("name")
            caps["instance_id"] = request.state.instance.get("id")
        return caps
    except Exception:
        logger.exception("Unhandled error in get_conntrack_sync_capabilities")
        raise HTTPException(status_code=500, detail="Internal server error")


# ============================================================================
# Endpoint 2: Config
# ============================================================================


@router.get("/config", response_model=ConntrackSyncConfig)
async def get_conntrack_sync_config(http_request: Request, refresh: bool = False):
    """Return the full conntrack-sync configuration in a normalized format."""
    await require_read_permission(http_request, FeatureGroup.CONNTRACK_SYNC)
    try:
        service = get_session_vyos_service(http_request)
        full_config = await run_in_threadpool(service.get_full_config, refresh=refresh)

        cs_raw = full_config.get("service", {}).get("conntrack-sync", {})
        if not cs_raw:
            return ConntrackSyncConfig()

        return ConntrackSyncConfig(
            accept_protocols=_parse_multi(cs_raw.get("accept-protocol")),
            disable_external_cache="disable-external-cache" in cs_raw,
            disable_syslog="disable-syslog" in cs_raw,
            event_listen_queue_size=_parse_int(cs_raw.get("event-listen-queue-size")),
            expect_sync=_parse_multi(cs_raw.get("expect-sync")),
            failover_mechanism=_parse_failover(cs_raw.get("failover-mechanism")),
            ignore_addresses=sorted(_parse_multi(cs_raw.get("ignore-address"))),
            interfaces=_parse_interfaces(cs_raw.get("interface")),
            listen_addresses=sorted(_parse_multi(cs_raw.get("listen-address"))),
            mcast_group=cs_raw.get("mcast-group"),
            startup_resync="startup-resync" in cs_raw,
            sync_queue_size=_parse_int(cs_raw.get("sync-queue-size")),
        )
    except Exception:
        logger.exception("Unhandled error in get_conntrack_sync_config")
        raise HTTPException(status_code=500, detail="Internal server error")


# ============================================================================
# Endpoint 3: Batch Operations
# ============================================================================


@router.post("/batch", response_model=VyOSResponse)
async def conntrack_sync_batch_configure(
    http_request: Request, body: ConntrackSyncBatchRequest
):
    """Execute a batch of conntrack-sync configuration operations atomically."""
    await require_write_permission(http_request, FeatureGroup.CONNTRACK_SYNC)
    try:
        service = get_session_vyos_service(http_request)
        builder = ConntrackSyncBatchBuilder(version=service.get_version())

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
            data={"message": "Conntrack-Sync configuration updated"},
            error=response.error if response.error else None,
        )
    except HTTPException:
        raise
    except AttributeError as e:
        raise HTTPException(status_code=400, detail=f"Unknown operation: {e}")
    except Exception:
        logger.exception("Unhandled error in conntrack_sync_batch_configure")
        raise HTTPException(status_code=500, detail="Internal server error")


# ============================================================================
# Config Parsers
# ============================================================================


def _parse_multi(value) -> List[str]:
    """Normalize a VyOS multi-value field to a list of strings."""
    if value is None:
        return []
    if isinstance(value, list):
        return value
    if isinstance(value, dict):
        return list(value.keys())
    return [str(value)]


def _parse_int(value) -> Optional[int]:
    if value is None:
        return None
    try:
        return int(value)
    except (ValueError, TypeError):
        return None


def _parse_failover(raw) -> Optional[ConntrackSyncFailoverMechanism]:
    if not raw:
        return None
    vrrp_raw = raw.get("vrrp")
    if vrrp_raw is None:
        return ConntrackSyncFailoverMechanism()
    sync_group = vrrp_raw.get("sync-group") if isinstance(vrrp_raw, dict) else None
    return ConntrackSyncFailoverMechanism(
        vrrp=ConntrackSyncFailoverVrrp(sync_group=sync_group)
    )


def _parse_interfaces(raw) -> List[ConntrackSyncInterface]:
    if not raw or not isinstance(raw, dict):
        return []
    interfaces = []
    for iface_name, iface_cfg in raw.items():
        if iface_cfg is None:
            iface_cfg = {}
        port_raw = iface_cfg.get("port")
        port = None
        if port_raw is not None:
            try:
                port = int(port_raw)
            except (ValueError, TypeError):
                pass
        interfaces.append(ConntrackSyncInterface(
            name=iface_name,
            peer=iface_cfg.get("peer"),
            port=port,
        ))
    return sorted(interfaces, key=lambda i: i.name)
