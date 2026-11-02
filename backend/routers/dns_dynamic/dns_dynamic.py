"""DNS Dynamic Service Router.

API endpoints for managing VyOS Dynamic DNS (ddclient) configuration.

Endpoints:
  GET  /vyos/dns-dynamic/capabilities  — version-aware feature flags
  GET  /vyos/dns-dynamic/config        — normalized dynamic DNS configuration
  GET  /vyos/dns-dynamic/status        — resolved addresses from the ddclient cache
  POST /vyos/dns-dynamic/batch         — atomic set/delete operations
"""

from fastapi import APIRouter, HTTPException, Request
from starlette.concurrency import run_in_threadpool
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from session_vyos_service import get_session_vyos_service
from vyos_mappers.base import CommandMapperRegistry
from vyos_builders.dns_dynamic import DNSDynamicBatchBuilder
from dns_dynamic_status import DynamicDnsStatusResponse, fetch_dynamic_dns_status
from fastapi_permissions import require_read_permission, require_write_permission
from rbac_permissions import FeatureGroup
import inspect
import logging
from batch_dispatch import resolve_batch_method

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
        mapper = CommandMapperRegistry.get_mapper("dns_dynamic", service.get_version())
        return DNSDynamicConfig(**mapper.parse_config(full_config))
    except Exception:
        logger.exception("Unhandled error in get_dns_dynamic_config")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/status", response_model=DynamicDnsStatusResponse)
async def get_dns_dynamic_status(request: Request):
    """Resolved addresses from the ddclient cache (``ShowDynamicStatusDns``).

    A missed read returns ``available: false`` and an empty host list. The
    page keeps the last sample. An unconfigured service is an empty cache.
    """
    await require_read_permission(request, FeatureGroup.DNS_DYNAMIC)
    try:
        service = get_session_vyos_service(request)
        return await fetch_dynamic_dns_status(service)
    except HTTPException:
        raise
    except Exception:
        logger.exception("Unhandled error in get_dns_dynamic_status")
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
            method = resolve_batch_method(builder, operation.op)
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


