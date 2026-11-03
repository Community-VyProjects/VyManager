"""
MPLS Protocol Router

API endpoints for managing VyOS MPLS (Multiprotocol Label Switching) and
LDP (Label Distribution Protocol) configuration.  Supports version-aware
configuration for VyOS 1.4 and 1.5 (identical template structure on both).

Endpoints:
  GET  /vyos/mpls/capabilities  — version-aware feature flags
  GET  /vyos/mpls/config        — normalized MPLS/LDP configuration
  POST /vyos/mpls/batch         — atomic set/delete operations
"""

from fastapi import APIRouter, HTTPException, Request
from starlette.concurrency import run_in_threadpool
from pydantic import BaseModel, Field
from typing import List, Dict, Optional, Any
from session_vyos_service import get_session_vyos_service
from vyos_builders.mpls import MplsBatchBuilder
from fastapi_permissions import require_read_permission, require_write_permission
from rbac_permissions import FeatureGroup
import inspect
import logging
from batch_dispatch import resolve_batch_method
from vyos_mappers.base import CommandMapperRegistry
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/vyos/mpls", tags=["mpls"])


# ============================================================================
# Pydantic Models
# ============================================================================


class MplsParameters(BaseModel):
    """Global MPLS parameters."""
    maximum_ttl: Optional[int] = None
    no_propagate_ttl: bool = False


class MplsLdpDiscovery(BaseModel):
    """LDP discovery timer and transport address settings."""
    hello_ipv4_holdtime: Optional[int] = None
    hello_ipv4_interval: Optional[int] = None
    hello_ipv6_holdtime: Optional[int] = None
    hello_ipv6_interval: Optional[int] = None
    session_ipv4_holdtime: Optional[int] = None
    session_ipv6_holdtime: Optional[int] = None
    transport_ipv4_address: Optional[str] = None
    transport_ipv6_address: Optional[str] = None


class MplsLdpAllocation(BaseModel):
    """LDP FEC allocation filtering."""
    ipv4_access_list: Optional[str] = None
    ipv6_access_list: Optional[str] = None


class MplsLdpExportFilter(BaseModel):
    """LDP export filter (FEC + neighbor ACLs)."""
    filter_access_list: Optional[str] = None
    neighbor_access_list: Optional[str] = None


class MplsLdpExport(BaseModel):
    """LDP label export configuration."""
    ipv4_explicit_null: bool = False
    ipv4_export_filter: MplsLdpExportFilter = Field(default_factory=MplsLdpExportFilter)
    ipv6_explicit_null: bool = False
    ipv6_export_filter: MplsLdpExportFilter = Field(default_factory=MplsLdpExportFilter)


class MplsLdpImportFilter(BaseModel):
    """LDP import filter (FEC + neighbor ACLs)."""
    filter_access_list: Optional[str] = None
    neighbor_access_list: Optional[str] = None


class MplsLdpImportConfig(BaseModel):
    """LDP label import configuration."""
    ipv4_import_filter: MplsLdpImportFilter = Field(default_factory=MplsLdpImportFilter)
    ipv6_import_filter: MplsLdpImportFilter = Field(default_factory=MplsLdpImportFilter)


class MplsLdpNeighbor(BaseModel):
    """LDP neighbor-specific settings."""
    address: str
    password: Optional[str] = None
    session_holdtime: Optional[int] = None
    ttl_security: Optional[str] = None


class MplsLdpInterface(BaseModel):
    """LDP interface configuration."""
    name: str
    disable_establish_hello: bool = False


class MplsLdpTargetedNeighborIpv4(BaseModel):
    """LDP targeted neighbor IPv4 settings."""
    enable: bool = False
    addresses: List[str] = []
    hello_holdtime: Optional[int] = None
    hello_interval: Optional[int] = None


class MplsLdpTargetedNeighborIpv6(BaseModel):
    """LDP targeted neighbor IPv6 settings."""
    enable: bool = False
    addresses: List[str] = []
    hello_holdtime: Optional[int] = None
    hello_interval: Optional[int] = None


class MplsLdpParameters(BaseModel):
    """LDP miscellaneous parameters."""
    cisco_interop_tlv: bool = False
    ordered_control: bool = False
    transport_prefer_ipv4: bool = False


class MplsLdpConfig(BaseModel):
    """Complete LDP configuration."""
    router_id: Optional[str] = None
    interfaces: List[MplsLdpInterface] = []
    neighbors: List[MplsLdpNeighbor] = []
    discovery: MplsLdpDiscovery = Field(default_factory=MplsLdpDiscovery)
    allocation: MplsLdpAllocation = Field(default_factory=MplsLdpAllocation)
    export: MplsLdpExport = Field(default_factory=MplsLdpExport)
    ldp_import: MplsLdpImportConfig = Field(default_factory=MplsLdpImportConfig)
    targeted_neighbor_ipv4: MplsLdpTargetedNeighborIpv4 = Field(default_factory=MplsLdpTargetedNeighborIpv4)
    targeted_neighbor_ipv6: MplsLdpTargetedNeighborIpv6 = Field(default_factory=MplsLdpTargetedNeighborIpv6)
    parameters: MplsLdpParameters = Field(default_factory=MplsLdpParameters)


class MplsConfig(BaseModel):
    """Complete MPLS configuration."""
    enabled: bool = False
    interfaces: List[str] = []
    parameters: MplsParameters = Field(default_factory=MplsParameters)
    ldp: Optional[MplsLdpConfig] = None


class MplsBatchOperation(BaseModel):
    """Single operation in a batch request."""
    op: str = Field(..., description="Builder method name")
    value: Optional[str] = Field(
        None,
        description=(
            "Argument(s) for the operation. "
            "Single-arg methods: plain string. "
            "Two-arg methods: 'arg1,arg2' (comma-separated)."
        ),
    )


class MplsBatchRequest(BaseModel):
    """Batch configuration request."""
    operations: List[MplsBatchOperation]


class VyOSResponse(BaseModel):
    """Standard VyOS operation response."""
    success: bool
    data: Optional[Dict[str, Any]] = None
    error: Optional[str] = None


# ============================================================================
# Endpoint 1: Capabilities
# ============================================================================


@router.get("/capabilities")
async def get_mpls_capabilities(request: Request):
    """Return MPLS feature capabilities based on the connected VyOS version."""
    await require_read_permission(request, FeatureGroup.MPLS)
    try:
        service = get_session_vyos_service(request)
        builder = MplsBatchBuilder(version=service.get_version())
        caps = builder.get_capabilities()
        if hasattr(request.state, "instance") and request.state.instance:
            caps["instance_name"] = request.state.instance.get("name")
            caps["instance_id"] = request.state.instance.get("id")
        return caps
    except Exception as e:
        logger.exception("Unhandled error")
        raise HTTPException(status_code=500, detail="Internal server error")


# ============================================================================
# Endpoint 2: Config
# ============================================================================


@router.get("/config", response_model=MplsConfig)
async def get_mpls_config(http_request: Request, refresh: bool = False):
    """Return the full MPLS/LDP configuration in a normalized format."""
    await require_read_permission(http_request, FeatureGroup.MPLS)
    try:
        service = get_session_vyos_service(http_request)
        full_config = await run_in_threadpool(service.get_full_config, refresh=refresh)
        mapper = CommandMapperRegistry.get_mapper("mpls", service.get_version())
        return MplsConfig(**mapper.parse_config(full_config))
    except Exception:
        logger.exception("Unhandled error")
        raise HTTPException(status_code=500, detail="Internal server error")


# ============================================================================
# Endpoint 3: Batch Operations
# ============================================================================


@router.post("/batch", response_model=VyOSResponse)
async def mpls_batch_configure(http_request: Request, body: MplsBatchRequest):
    """Execute a batch of MPLS/LDP configuration operations atomically."""
    await require_write_permission(http_request, FeatureGroup.MPLS)
    try:
        service = get_session_vyos_service(http_request)
        builder = MplsBatchBuilder(version=service.get_version())

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
            elif len(params) == 2:
                if operation.value and "," in operation.value:
                    parts = operation.value.split(",", 1)
                    method(parts[0], parts[1])
                elif operation.value:
                    method(operation.value)

        response = service.execute_batch(builder)
        return VyOSResponse(
            success=response.status == 200,
            data={"message": "MPLS configuration updated"},
            error=response.error if response.error else None,
        )
    except AttributeError as e:
        raise HTTPException(status_code=400, detail=f"Unknown operation: {e}")
    except Exception as e:
        logger.exception("Unhandled error")
        raise HTTPException(status_code=500, detail="Internal server error")
