"""SSH Service Router.

API endpoints for managing VyOS SSH (Secure Shell) service configuration.

Version differences:
  - 1.5 cipher node is "cipher"; 1.4 uses "ciphers".
  - "fido" and "trusted-user-ca" are 1.5 only (surfaced via capabilities).

Endpoints:
  GET  /vyos/ssh/capabilities  — version-aware feature flags
  GET  /vyos/ssh/config        — normalized SSH configuration
  POST /vyos/ssh/batch         — atomic set/delete operations
"""

from fastapi import APIRouter, HTTPException, Request
from starlette.concurrency import run_in_threadpool
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from session_vyos_service import get_session_vyos_service
from vyos_mappers import CommandMapperRegistry
from vyos_builders.ssh import SSHBatchBuilder
from fastapi_permissions import require_read_permission, require_write_permission
from rbac_permissions import FeatureGroup
import inspect
import logging
from batch_dispatch import resolve_batch_method

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/vyos/ssh", tags=["ssh"])


# ============================================================================
# Pydantic Models
# ============================================================================


class SSHAccessControl(BaseModel):
    allow_users: List[str] = []
    allow_groups: List[str] = []
    deny_users: List[str] = []
    deny_groups: List[str] = []


class SSHDynamicProtection(BaseModel):
    enabled: bool = False
    allow_from: List[str] = []
    block_time: Optional[str] = None
    detect_time: Optional[str] = None
    threshold: Optional[str] = None


class SSHFido(BaseModel):
    pin_required: bool = False
    touch_required: bool = False


class SSHRekey(BaseModel):
    data: Optional[str] = None
    time: Optional[str] = None


class SSHConfig(BaseModel):
    """Full SSH service configuration."""
    ports: List[str] = []
    listen_addresses: List[str] = []
    vrfs: List[str] = []
    disable_host_validation: bool = False
    disable_password_authentication: bool = False
    loglevel: Optional[str] = None
    client_keepalive_interval: Optional[str] = None
    ciphers: List[str] = []
    macs: List[str] = []
    key_exchanges: List[str] = []
    hostkey_algorithms: List[str] = []
    pubkey_accepted_algorithms: List[str] = []
    trusted_user_ca: Optional[str] = None
    access_control: SSHAccessControl = SSHAccessControl()
    dynamic_protection: SSHDynamicProtection = SSHDynamicProtection()
    fido: SSHFido = SSHFido()
    rekey: SSHRekey = SSHRekey()


class SSHBatchOperation(BaseModel):
    op: str = Field(..., description="Builder method name")
    value: Optional[str] = Field(
        None,
        description=(
            "Argument(s) for the operation. Single-arg methods: plain string. "
            "Multi-arg methods: comma-separated."
        ),
    )


class SSHBatchRequest(BaseModel):
    operations: List[SSHBatchOperation]


class VyOSResponse(BaseModel):
    success: bool
    data: Optional[Dict[str, Any]] = None
    error: Optional[str] = None

# ============================================================================
# Endpoint 1: Capabilities
# ============================================================================


@router.get("/capabilities")
async def get_ssh_capabilities(request: Request):
    """Return SSH feature capabilities based on the VyOS version."""
    await require_read_permission(request, FeatureGroup.SSH)
    try:
        service = get_session_vyos_service(request)
        builder = SSHBatchBuilder(version=service.get_version())
        caps = builder.get_capabilities()
        if hasattr(request.state, "instance") and request.state.instance:
            caps["instance_name"] = request.state.instance.get("name")
            caps["instance_id"] = request.state.instance.get("id")
        return caps
    except Exception:
        logger.exception("Unhandled error in get_ssh_capabilities")
        raise HTTPException(status_code=500, detail="Internal server error")


# ============================================================================
# Endpoint 2: Config
# ============================================================================


@router.get("/config", response_model=SSHConfig)
async def get_ssh_config(http_request: Request, refresh: bool = False):
    """Return the full SSH configuration in a normalized format."""
    await require_read_permission(http_request, FeatureGroup.SSH)
    try:
        service = get_session_vyos_service(http_request)
        version = service.get_version()
        full_config = await run_in_threadpool(service.get_full_config, refresh=refresh)
        mapper = CommandMapperRegistry.get_mapper("ssh", version)
        return SSHConfig(**mapper.parse_config(full_config))
    except Exception:
        logger.exception("Unhandled error in get_ssh_config")
        raise HTTPException(status_code=500, detail="Internal server error")


# ============================================================================
# Endpoint 3: Batch Operations
# ============================================================================


@router.post("/batch", response_model=VyOSResponse)
async def ssh_batch_configure(http_request: Request, body: SSHBatchRequest):
    """Execute a batch of SSH configuration operations atomically."""
    await require_write_permission(http_request, FeatureGroup.SSH)
    try:
        service = get_session_vyos_service(http_request)
        builder = SSHBatchBuilder(version=service.get_version())

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
            data={"message": "SSH configuration updated"},
            error=response.error if response.error else None,
        )
    except HTTPException:
        raise
    except AttributeError as e:
        raise HTTPException(status_code=400, detail=f"Unknown operation: {e}")
    except Exception:
        logger.exception("Unhandled error in ssh_batch_configure")
        raise HTTPException(status_code=500, detail="Internal server error")
