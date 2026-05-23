"""DNS Dynamic Service Router.

API endpoints for managing VyOS Dynamic DNS (ddclient) configuration.

Endpoints:
  GET  /vyos/dns-dynamic/capabilities  — version-aware feature flags
  GET  /vyos/dns-dynamic/config        — normalized dynamic DNS configuration
  POST /vyos/dns-dynamic/batch         — atomic set/delete operations
"""

from fastapi import APIRouter, HTTPException, Request
from starlette.concurrency import run_in_threadpool
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from session_vyos_service import get_session_vyos_service
from vyos_builders.dns_dynamic import DNSDynamicBatchBuilder
from fastapi_permissions import require_read_permission, require_write_permission
from rbac_permissions import FeatureGroup
import inspect
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/vyos/dns-dynamic", tags=["dns-dynamic"])


# ============================================================================
# Pydantic Models
# ============================================================================


class DynamicAddressConfig(BaseModel):
    interface: Optional[str] = None
    web_url: Optional[str] = None
    web_skip: Optional[str] = None


class DynamicNameEntry(BaseModel):
    name: str
    protocol: Optional[str] = None
    server: Optional[str] = None
    username: Optional[str] = None
    password: Optional[str] = None
    hostnames: List[str] = []
    ip_version: Optional[str] = None
    address: DynamicAddressConfig = Field(default_factory=DynamicAddressConfig)
    description: Optional[str] = None
    ttl: Optional[int] = None
    key: Optional[str] = None
    expiry_time: Optional[int] = None
    wait_time: Optional[int] = None
    zone: Optional[str] = None


class DNSDynamicConfig(BaseModel):
    interval: Optional[int] = None
    vrf: Optional[str] = None
    entries: List[DynamicNameEntry] = []


class DNSDynamicBatchOperation(BaseModel):
    op: str = Field(..., description="Builder method name")
    value: Optional[str] = Field(
        None,
        description=(
            "Argument(s) for the operation. "
            "Single-arg methods: plain string. "
            "Multi-arg methods: comma-separated."
        ),
    )


class DNSDynamicBatchRequest(BaseModel):
    operations: List[DNSDynamicBatchOperation]


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
async def get_dns_dynamic_capabilities(request: Request):
    """Return DNS dynamic feature capabilities based on the VyOS version."""
    await require_read_permission(request, FeatureGroup.DNS_DYNAMIC)
    try:
        service = get_session_vyos_service(request)
        builder = DNSDynamicBatchBuilder(version=service.get_version())
        caps = builder.get_capabilities()
        if hasattr(request.state, "instance") and request.state.instance:
            caps["instance_name"] = request.state.instance.get("name")
            caps["instance_id"] = request.state.instance.get("id")
        return caps
    except Exception:
        logger.exception("Unhandled error in get_dns_dynamic_capabilities")
        raise HTTPException(status_code=500, detail="Internal server error")


# ============================================================================
# Endpoint 2: Config
# ============================================================================


@router.get("/config", response_model=DNSDynamicConfig)
async def get_dns_dynamic_config(http_request: Request, refresh: bool = False):
    """Return the full DNS dynamic configuration in a normalized format."""
    await require_read_permission(http_request, FeatureGroup.DNS_DYNAMIC)
    try:
        service = get_session_vyos_service(http_request)
        full_config = await run_in_threadpool(service.get_full_config, refresh=refresh)

        dyn = full_config.get("service", {}).get("dns", {}).get("dynamic", {})
        if not dyn:
            return DNSDynamicConfig()

        return DNSDynamicConfig(
            interval=_parse_int(dyn.get("interval")),
            vrf=dyn.get("vrf"),
            entries=_parse_name_entries(dyn.get("name", {})),
        )
    except Exception:
        logger.exception("Unhandled error in get_dns_dynamic_config")
        raise HTTPException(status_code=500, detail="Internal server error")


# ============================================================================
# Endpoint 3: Batch Operations
# ============================================================================


@router.post("/batch", response_model=VyOSResponse)
async def dns_dynamic_batch_configure(
    http_request: Request, body: DNSDynamicBatchRequest
):
    """Execute a batch of DNS dynamic configuration operations atomically."""
    await require_write_permission(http_request, FeatureGroup.DNS_DYNAMIC)
    try:
        service = get_session_vyos_service(http_request)
        builder = DNSDynamicBatchBuilder(version=service.get_version())

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
            data={"message": "DNS dynamic configuration updated"},
            error=response.error if response.error else None,
        )
    except HTTPException:
        raise
    except AttributeError as e:
        raise HTTPException(status_code=400, detail=f"Unknown operation: {e}")
    except Exception:
        logger.exception("Unhandled error in dns_dynamic_batch_configure")
        raise HTTPException(status_code=500, detail="Internal server error")


# ============================================================================
# Config parsers
# ============================================================================


def _parse_int(value) -> Optional[int]:
    if value is None:
        return None
    try:
        return int(value)
    except (ValueError, TypeError):
        return None


def _parse_multi(value) -> List[str]:
    if value is None:
        return []
    if isinstance(value, list):
        return sorted(str(v) for v in value)
    if isinstance(value, dict):
        return sorted(value.keys())
    return [str(value)]


def _parse_name_entries(raw: dict) -> List[DynamicNameEntry]:
    if not raw or not isinstance(raw, dict):
        return []
    result = []
    for name, attrs in sorted(raw.items()):
        if not isinstance(attrs, dict):
            attrs = {}

        addr_raw = attrs.get("address", {}) or {}
        web_raw = addr_raw.get("web", {}) or {}
        address = DynamicAddressConfig(
            interface=addr_raw.get("interface"),
            web_url=web_raw.get("url"),
            web_skip=web_raw.get("skip"),
        )

        result.append(DynamicNameEntry(
            name=name,
            protocol=attrs.get("protocol"),
            server=attrs.get("server"),
            username=attrs.get("username"),
            password=attrs.get("password"),
            hostnames=_parse_multi(attrs.get("host-name")),
            ip_version=attrs.get("ip-version"),
            address=address,
            description=attrs.get("description"),
            ttl=_parse_int(attrs.get("ttl")),
            key=attrs.get("key"),
            expiry_time=_parse_int(attrs.get("expiry-time")),
            wait_time=_parse_int(attrs.get("wait-time")),
            zone=attrs.get("zone"),
        ))
    return result
