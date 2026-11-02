"""SNMP Service Router.

API endpoints for managing VyOS SNMP (Simple Network Management Protocol)
configuration.

Version differences:
  1.4 and 1.5 — identical SNMP configuration paths; no version-specific behavior.

Endpoints:
  GET  /vyos/snmp/capabilities  — version-aware feature flags
  GET  /vyos/snmp/config        — normalized SNMP configuration
  POST /vyos/snmp/batch         — atomic set/delete operations
"""

from fastapi import APIRouter, HTTPException, Request
from starlette.concurrency import run_in_threadpool
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from session_vyos_service import get_session_vyos_service
from vyos_mappers.base import CommandMapperRegistry
from vyos_builders.snmp import SNMPBatchBuilder
from fastapi_permissions import require_read_permission, require_write_permission
from rbac_permissions import FeatureGroup
import inspect
import logging
from batch_dispatch import resolve_batch_method

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/vyos/snmp", tags=["snmp"])


# ============================================================================
# Pydantic Models
# ============================================================================


class SNMPListenAddress(BaseModel):
    """An address SNMP listens on, with an optional custom port."""
    address: str
    port: Optional[str] = None


class SNMPCommunity(BaseModel):
    """An SNMPv1/v2c community."""
    name: str
    authorization: Optional[str] = None  # ro|rw (default ro)
    clients: List[str] = []
    networks: List[str] = []


class SNMPScriptExtension(BaseModel):
    """A custom script extension for the SNMP agent."""
    name: str
    script: Optional[str] = None


class SNMPTrapTarget(BaseModel):
    """An SNMPv1/v2c trap target."""
    address: str
    community: Optional[str] = None
    port: Optional[str] = None


class SNMPv3Auth(BaseModel):
    """SNMPv3 authentication settings."""
    type: Optional[str] = None  # md5|sha
    plaintext_password: Optional[str] = None
    encrypted_password: Optional[str] = None


class SNMPv3Privacy(BaseModel):
    """SNMPv3 privacy (encryption) settings."""
    type: Optional[str] = None  # des|aes
    plaintext_password: Optional[str] = None
    encrypted_password: Optional[str] = None


class SNMPv3Group(BaseModel):
    """An SNMPv3 group."""
    name: str
    mode: Optional[str] = None  # ro|rw
    seclevel: Optional[str] = None  # noauth|auth|priv
    view: Optional[str] = None


class SNMPv3User(BaseModel):
    """An SNMPv3 user."""
    name: str
    group: Optional[str] = None
    mode: Optional[str] = None  # ro|rw
    auth: Optional[SNMPv3Auth] = None
    privacy: Optional[SNMPv3Privacy] = None


class SNMPv3ViewOid(BaseModel):
    """A single OID subtree within an SNMPv3 view."""
    oid: str
    mask: Optional[str] = None
    exclude: List[str] = []


class SNMPv3View(BaseModel):
    """An SNMPv3 view (collection of OID subtrees)."""
    name: str
    oids: List[SNMPv3ViewOid] = []


class SNMPv3TrapTarget(BaseModel):
    """An SNMPv3 trap/inform target."""
    address: str
    user: Optional[str] = None
    type: Optional[str] = None  # inform|trap
    protocol: Optional[str] = None  # udp|tcp
    port: Optional[str] = None
    auth: Optional[SNMPv3Auth] = None
    privacy: Optional[SNMPv3Privacy] = None


class SNMPv3(BaseModel):
    """SNMPv3 configuration."""
    engineid: Optional[str] = None
    groups: List[SNMPv3Group] = []
    users: List[SNMPv3User] = []
    views: List[SNMPv3View] = []
    trap_targets: List[SNMPv3TrapTarget] = []


class SNMPConfig(BaseModel):
    """Full SNMP service configuration."""
    contact: Optional[str] = None
    description: Optional[str] = None
    location: Optional[str] = None
    protocol: Optional[str] = None  # udp|tcp
    trap_source: Optional[str] = None
    vrf: Optional[str] = None
    smux_peers: List[str] = []
    oid_enable: List[str] = []
    listen_addresses: List[SNMPListenAddress] = []
    communities: List[SNMPCommunity] = []
    mib_interfaces: List[str] = []
    mib_interface_max: Optional[str] = None
    script_extensions: List[SNMPScriptExtension] = []
    trap_targets: List[SNMPTrapTarget] = []
    v3: SNMPv3 = SNMPv3()


class SNMPBatchOperation(BaseModel):
    op: str = Field(..., description="Builder method name")
    value: Optional[str] = Field(
        None,
        description=(
            "Argument(s) for the operation. "
            "Single-arg methods: plain string. "
            "Multi-arg methods: comma-separated (e.g., 'community,ro')."
        ),
    )


class SNMPBatchRequest(BaseModel):
    operations: List[SNMPBatchOperation]


class VyOSResponse(BaseModel):
    success: bool
    data: Optional[Dict[str, Any]] = None
    error: Optional[str] = None

# ============================================================================
# Endpoint 1: Capabilities
# ============================================================================


@router.get("/capabilities")
async def get_snmp_capabilities(request: Request):
    """Return SNMP feature capabilities based on the VyOS version."""
    await require_read_permission(request, FeatureGroup.SNMP)
    try:
        service = get_session_vyos_service(request)
        builder = SNMPBatchBuilder(version=service.get_version())
        caps = builder.get_capabilities()
        if hasattr(request.state, "instance") and request.state.instance:
            caps["instance_name"] = request.state.instance.get("name")
            caps["instance_id"] = request.state.instance.get("id")
        return caps
    except Exception:
        logger.exception("Unhandled error in get_snmp_capabilities")
        raise HTTPException(status_code=500, detail="Internal server error")


# ============================================================================
# Endpoint 2: Config
# ============================================================================


@router.get("/config", response_model=SNMPConfig)
async def get_snmp_config(http_request: Request, refresh: bool = False):
    """Return the full SNMP configuration in a normalized format."""
    await require_read_permission(http_request, FeatureGroup.SNMP)
    try:
        service = get_session_vyos_service(http_request)
        version = service.get_version()
        full_config = await run_in_threadpool(service.get_full_config, refresh=refresh)
        mapper = CommandMapperRegistry.get_mapper("snmp", version)
        return SNMPConfig(**mapper.parse_config(full_config))
    except Exception:
        logger.exception("Unhandled error in get_snmp_config")
        raise HTTPException(status_code=500, detail="Internal server error")


# ============================================================================
# Endpoint 3: Batch Operations
# ============================================================================


@router.post("/batch", response_model=VyOSResponse)
async def snmp_batch_configure(http_request: Request, body: SNMPBatchRequest):
    """Execute a batch of SNMP configuration operations atomically."""
    await require_write_permission(http_request, FeatureGroup.SNMP)
    try:
        service = get_session_vyos_service(http_request)
        builder = SNMPBatchBuilder(version=service.get_version())

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
            data={"message": "SNMP configuration updated"},
            error=response.error if response.error else None,
        )
    except HTTPException:
        raise
    except AttributeError as e:
        raise HTTPException(status_code=400, detail=f"Unknown operation: {e}")
    except Exception:
        logger.exception("Unhandled error in snmp_batch_configure")
        raise HTTPException(status_code=500, detail="Internal server error")
