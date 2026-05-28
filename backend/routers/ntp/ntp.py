"""NTP Service Router.

API endpoints for managing VyOS NTP (Network Time Protocol) configuration.

Version differences:
  1.4 and 1.5 — identical NTP configuration paths; no version-specific behavior.

Endpoints:
  GET  /vyos/ntp/capabilities  — version-aware feature flags
  GET  /vyos/ntp/config        — normalized NTP configuration
  POST /vyos/ntp/batch         — atomic set/delete operations
"""

from fastapi import APIRouter, HTTPException, Request
from starlette.concurrency import run_in_threadpool
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from session_vyos_service import get_session_vyos_service
from vyos_builders.ntp import NTPBatchBuilder
from fastapi_permissions import require_read_permission, require_write_permission
from rbac_permissions import FeatureGroup
import inspect
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/vyos/ntp", tags=["ntp"])


# ============================================================================
# Pydantic Models
# ============================================================================


class NTPServer(BaseModel):
    """A single upstream NTP server and its flags."""
    name: str
    noselect: bool = False
    nts: bool = False
    pool: bool = False
    prefer: bool = False


class NTPConfig(BaseModel):
    """Full NTP service configuration."""
    allow_clients: List[str] = []
    interfaces: List[str] = []
    leap_second: Optional[str] = None
    listen_addresses: List[str] = []
    servers: List[NTPServer] = []
    vrf: Optional[str] = None


class NTPBatchOperation(BaseModel):
    op: str = Field(..., description="Builder method name")
    value: Optional[str] = Field(
        None,
        description=(
            "Argument(s) for the operation. "
            "Single-arg methods: plain string. "
            "Multi-arg methods: comma-separated (e.g., 'server1,prefer')."
        ),
    )


class NTPBatchRequest(BaseModel):
    operations: List[NTPBatchOperation]


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
async def get_ntp_capabilities(request: Request):
    """Return NTP feature capabilities based on the VyOS version."""
    await require_read_permission(request, FeatureGroup.NTP)
    try:
        service = get_session_vyos_service(request)
        builder = NTPBatchBuilder(version=service.get_version())
        caps = builder.get_capabilities()
        if hasattr(request.state, "instance") and request.state.instance:
            caps["instance_name"] = request.state.instance.get("name")
            caps["instance_id"] = request.state.instance.get("id")
        return caps
    except Exception:
        logger.exception("Unhandled error in get_ntp_capabilities")
        raise HTTPException(status_code=500, detail="Internal server error")


# ============================================================================
# Endpoint 2: Config
# ============================================================================


@router.get("/config", response_model=NTPConfig)
async def get_ntp_config(http_request: Request, refresh: bool = False):
    """Return the full NTP configuration in a normalized format."""
    await require_read_permission(http_request, FeatureGroup.NTP)
    try:
        service = get_session_vyos_service(http_request)
        full_config = await run_in_threadpool(service.get_full_config, refresh=refresh)

        ntp_raw = full_config.get("service", {}).get("ntp", {})
        if not ntp_raw:
            return NTPConfig()

        return NTPConfig(
            allow_clients=_parse_allow_clients(ntp_raw),
            interfaces=_parse_interfaces(ntp_raw),
            leap_second=ntp_raw.get("leap-second"),
            listen_addresses=_parse_listen_addresses(ntp_raw),
            servers=_parse_servers(ntp_raw),
            vrf=ntp_raw.get("vrf"),
        )
    except Exception:
        logger.exception("Unhandled error in get_ntp_config")
        raise HTTPException(status_code=500, detail="Internal server error")


# ============================================================================
# Endpoint 3: Batch Operations
# ============================================================================


@router.post("/batch", response_model=VyOSResponse)
async def ntp_batch_configure(http_request: Request, body: NTPBatchRequest):
    """Execute a batch of NTP configuration operations atomically."""
    await require_write_permission(http_request, FeatureGroup.NTP)
    try:
        service = get_session_vyos_service(http_request)
        builder = NTPBatchBuilder(version=service.get_version())

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
            data={"message": "NTP configuration updated"},
            error=response.error if response.error else None,
        )
    except HTTPException:
        raise
    except AttributeError as e:
        raise HTTPException(status_code=400, detail=f"Unknown operation: {e}")
    except Exception:
        logger.exception("Unhandled error in ntp_batch_configure")
        raise HTTPException(status_code=500, detail="Internal server error")


# ============================================================================
# Config parsers
# ============================================================================


def _parse_multi_value(raw) -> List[str]:
    """Parse a VyOS multi-value node into a sorted list of strings."""
    if raw is None:
        return []
    if isinstance(raw, list):
        return sorted(str(v) for v in raw)
    if isinstance(raw, dict):
        return sorted(raw.keys())
    return [str(raw)]


def _parse_allow_clients(ntp_raw: dict) -> List[str]:
    allow_raw = ntp_raw.get("allow-client", {})
    if not allow_raw:
        return []
    return _parse_multi_value(allow_raw.get("address"))


def _parse_interfaces(ntp_raw: dict) -> List[str]:
    return _parse_multi_value(ntp_raw.get("interface"))


def _parse_listen_addresses(ntp_raw: dict) -> List[str]:
    return _parse_multi_value(ntp_raw.get("listen-address"))


def _parse_servers(ntp_raw: dict) -> List[NTPServer]:
    servers_raw = ntp_raw.get("server", {})
    if not servers_raw or not isinstance(servers_raw, dict):
        return []

    servers = []
    for server_name, server_cfg in servers_raw.items():
        if server_cfg is None:
            server_cfg = {}
        servers.append(NTPServer(
            name=server_name,
            noselect="noselect" in server_cfg,
            nts="nts" in server_cfg,
            pool="pool" in server_cfg,
            prefer="prefer" in server_cfg,
        ))

    servers.sort(key=lambda s: s.name)
    return servers
