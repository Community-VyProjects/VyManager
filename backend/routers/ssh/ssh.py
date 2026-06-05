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
from vyos_builders.ssh import SSHBatchBuilder
from fastapi_permissions import require_read_permission, require_write_permission
from rbac_permissions import FeatureGroup
import inspect
import logging

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
        full_config = await run_in_threadpool(service.get_full_config, refresh=refresh)

        ssh_raw = full_config.get("service", {}).get("ssh", {})
        if not ssh_raw or not isinstance(ssh_raw, dict):
            return SSHConfig()

        return SSHConfig(
            ports=_parse_multi_value(ssh_raw.get("port")),
            listen_addresses=_parse_multi_value(ssh_raw.get("listen-address")),
            vrfs=_parse_multi_value(ssh_raw.get("vrf")),
            disable_host_validation="disable-host-validation" in ssh_raw,
            disable_password_authentication="disable-password-authentication" in ssh_raw,
            loglevel=ssh_raw.get("loglevel"),
            client_keepalive_interval=ssh_raw.get("client-keepalive-interval"),
            # Node is "cipher" on 1.5 and "ciphers" on 1.4 — accept either.
            ciphers=_parse_multi_value(ssh_raw.get("cipher", ssh_raw.get("ciphers"))),
            macs=_parse_multi_value(ssh_raw.get("mac")),
            key_exchanges=_parse_multi_value(ssh_raw.get("key-exchange")),
            hostkey_algorithms=_parse_multi_value(ssh_raw.get("hostkey-algorithm")),
            pubkey_accepted_algorithms=_parse_multi_value(ssh_raw.get("pubkey-accepted-algorithm")),
            trusted_user_ca=ssh_raw.get("trusted-user-ca"),
            access_control=_parse_access_control(ssh_raw),
            dynamic_protection=_parse_dynamic_protection(ssh_raw),
            fido=_parse_fido(ssh_raw),
            rekey=_parse_rekey(ssh_raw),
        )
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


def _parse_access_control(ssh_raw: dict) -> SSHAccessControl:
    ac = ssh_raw.get("access-control", {})
    if not isinstance(ac, dict):
        return SSHAccessControl()
    allow = ac.get("allow", {}) or {}
    deny = ac.get("deny", {}) or {}
    return SSHAccessControl(
        allow_users=_parse_multi_value(allow.get("user")),
        allow_groups=_parse_multi_value(allow.get("group")),
        deny_users=_parse_multi_value(deny.get("user")),
        deny_groups=_parse_multi_value(deny.get("group")),
    )


def _parse_dynamic_protection(ssh_raw: dict) -> SSHDynamicProtection:
    if "dynamic-protection" not in ssh_raw:
        return SSHDynamicProtection()
    dp = ssh_raw.get("dynamic-protection") or {}
    if not isinstance(dp, dict):
        dp = {}
    return SSHDynamicProtection(
        enabled=True,
        allow_from=_parse_multi_value(dp.get("allow-from")),
        block_time=dp.get("block-time"),
        detect_time=dp.get("detect-time"),
        threshold=dp.get("threshold"),
    )


def _parse_fido(ssh_raw: dict) -> SSHFido:
    fido = ssh_raw.get("fido", {})
    if not isinstance(fido, dict):
        return SSHFido()
    return SSHFido(
        pin_required="pin-required" in fido,
        touch_required="touch-required" in fido,
    )


def _parse_rekey(ssh_raw: dict) -> SSHRekey:
    rekey = ssh_raw.get("rekey", {})
    if not isinstance(rekey, dict):
        return SSHRekey()
    return SSHRekey(data=rekey.get("data"), time=rekey.get("time"))
