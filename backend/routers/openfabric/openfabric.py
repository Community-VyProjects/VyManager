import inspect
import logging
from typing import List, Dict, Optional, Any

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field
from starlette.concurrency import run_in_threadpool

from session_vyos_service import get_session_vyos_service
from vyos_builders.openfabric import OpenfabricBatchBuilder
from fastapi_permissions import require_read_permission, require_write_permission
from rbac_permissions import FeatureGroup

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/vyos/openfabric", tags=["openfabric"])

# Builder infrastructure methods that must never be invokable via the batch API
_INTERNAL_BUILDER_METHODS = frozenset({
    "add_set", "add_delete", "get_operations", "is_empty", "clear", "operation_count",
})


# ============================================================================
# Pydantic Models
# ============================================================================


class OpenfabricInterfaceConfig(BaseModel):
    name: str
    address_family_ipv4: bool = False
    address_family_ipv6: bool = False
    csnp_interval: Optional[int] = None
    hello_interval: Optional[int] = None
    hello_multiplier: Optional[int] = None
    psnp_interval: Optional[int] = None
    metric: Optional[int] = None
    passive: bool = False
    password_type: Optional[str] = None
    password_value: Optional[str] = None


class OpenfabricDomainConfig(BaseModel):
    name: str
    fabric_tier: Optional[int] = None
    log_adjacency_changes: bool = False
    purge_originator: bool = False
    set_overload_bit: bool = False
    lsp_gen_interval: Optional[int] = None
    lsp_refresh_interval: Optional[int] = None
    max_lsp_lifetime: Optional[int] = None
    spf_interval: Optional[int] = None
    domain_password_type: Optional[str] = None
    domain_password_value: Optional[str] = None
    interfaces: List[OpenfabricInterfaceConfig] = Field(default_factory=list)


class OpenfabricConfig(BaseModel):
    enabled: bool = False
    net: Optional[str] = None
    domains: List[OpenfabricDomainConfig] = Field(default_factory=list)


class OpenfabricBatchOperation(BaseModel):
    op: str = Field(..., description="Operation name on the batch builder")
    value: Optional[str] = Field(None, description="Comma-separated arguments")


class OpenfabricBatchRequest(BaseModel):
    operations: List[OpenfabricBatchOperation]


class VyOSResponse(BaseModel):
    success: bool
    data: Optional[Dict[str, Any]] = None
    error: Optional[str] = None


# ============================================================================
# Helpers
# ============================================================================


def _safe_int(val: Any) -> Optional[int]:
    if val is None:
        return None
    try:
        return int(val)
    except (ValueError, TypeError):
        return None


def _parse_interface(name: str, raw: dict) -> OpenfabricInterfaceConfig:
    if raw is None:
        raw = {}

    af_raw = raw.get("address-family", {}) or {}
    pw_raw = raw.get("password", {}) or {}

    pw_type = None
    pw_value = None
    if isinstance(pw_raw, dict):
        if "md5" in pw_raw:
            pw_type = "md5"
            pw_value = pw_raw["md5"] if isinstance(pw_raw["md5"], str) else None
        elif "plaintext-password" in pw_raw:
            pw_type = "plaintext"
            pw_value = pw_raw["plaintext-password"] if isinstance(pw_raw["plaintext-password"], str) else None

    return OpenfabricInterfaceConfig(
        name=name,
        address_family_ipv4="ipv4" in af_raw,
        address_family_ipv6="ipv6" in af_raw,
        csnp_interval=_safe_int(raw.get("csnp-interval")),
        hello_interval=_safe_int(raw.get("hello-interval")),
        hello_multiplier=_safe_int(raw.get("hello-multiplier")),
        psnp_interval=_safe_int(raw.get("psnp-interval")),
        metric=_safe_int(raw.get("metric")),
        passive="passive" in raw,
        password_type=pw_type,
        password_value=pw_value,
    )


def _parse_domain(name: str, raw: dict) -> OpenfabricDomainConfig:
    if raw is None:
        raw = {}

    dp_raw = raw.get("domain-password", {}) or {}
    dp_type = None
    dp_value = None
    if isinstance(dp_raw, dict):
        if "md5" in dp_raw:
            dp_type = "md5"
            dp_value = dp_raw["md5"] if isinstance(dp_raw["md5"], str) else None
        elif "plaintext-password" in dp_raw:
            dp_type = "plaintext"
            dp_value = dp_raw["plaintext-password"] if isinstance(dp_raw["plaintext-password"], str) else None

    interfaces_raw = raw.get("interface", {}) or {}
    interfaces = []
    if isinstance(interfaces_raw, dict):
        for iface_name, iface_cfg in sorted(interfaces_raw.items()):
            interfaces.append(_parse_interface(iface_name, iface_cfg))

    return OpenfabricDomainConfig(
        name=name,
        fabric_tier=_safe_int(raw.get("fabric-tier")),
        log_adjacency_changes="log-adjacency-changes" in raw,
        purge_originator="purge-originator" in raw,
        set_overload_bit="set-overload-bit" in raw,
        lsp_gen_interval=_safe_int(raw.get("lsp-gen-interval")),
        lsp_refresh_interval=_safe_int(raw.get("lsp-refresh-interval")),
        max_lsp_lifetime=_safe_int(raw.get("max-lsp-lifetime")),
        spf_interval=_safe_int(raw.get("spf-interval")),
        domain_password_type=dp_type,
        domain_password_value=dp_value,
        interfaces=interfaces,
    )


# ============================================================================
# Endpoint 1: Capabilities
# ============================================================================


@router.get("/capabilities")
async def get_capabilities(request: Request):
    """Return version-aware OpenFabric feature flags."""
    await require_read_permission(request, FeatureGroup.OPENFABRIC)
    try:
        service = get_session_vyos_service(request)
        builder = OpenfabricBatchBuilder(version=service.get_version())
        return builder.get_capabilities()
    except Exception:
        logger.exception("Unhandled error")
        raise HTTPException(status_code=500, detail="Internal server error")


# ============================================================================
# Endpoint 2: Config
# ============================================================================


@router.get("/config", response_model=OpenfabricConfig)
async def get_config(http_request: Request, refresh: bool = False):
    """Return normalised OpenFabric configuration."""
    await require_read_permission(http_request, FeatureGroup.OPENFABRIC)
    try:
        service = get_session_vyos_service(http_request)
        full_config = await run_in_threadpool(service.get_full_config, refresh=refresh)

        of_raw = full_config.get("protocols", {}).get("openfabric", {})
        if not of_raw:
            return OpenfabricConfig(enabled=False)

        net_raw = of_raw.get("net", None)
        if isinstance(net_raw, dict):
            net_val = list(net_raw.keys())[0] if net_raw else None
        elif isinstance(net_raw, str):
            net_val = net_raw
        else:
            net_val = None

        domains_raw = of_raw.get("domain", {}) or {}
        domains = []
        if isinstance(domains_raw, dict):
            for domain_name, domain_cfg in sorted(domains_raw.items()):
                domains.append(_parse_domain(domain_name, domain_cfg))

        return OpenfabricConfig(
            enabled=True,
            net=net_val,
            domains=domains,
        )
    except Exception:
        logger.exception("Unhandled error")
        raise HTTPException(status_code=500, detail="Internal server error")


# ============================================================================
# Endpoint 3: Batch Operations
# ============================================================================


@router.post("/batch", response_model=VyOSResponse)
async def openfabric_batch_configure(http_request: Request, body: OpenfabricBatchRequest):
    """Execute a batch of OpenFabric configuration operations atomically."""
    await require_write_permission(http_request, FeatureGroup.OPENFABRIC)
    try:
        service = get_session_vyos_service(http_request)
        builder = OpenfabricBatchBuilder(version=service.get_version())

        for operation in body.operations:
            op_name = operation.op
            op_value = operation.value

            if op_name.startswith("_") or op_name in _INTERNAL_BUILDER_METHODS:
                raise HTTPException(status_code=400, detail=f"Invalid operation: {op_name}")

            method = getattr(builder, op_name, None)
            if not callable(method):
                raise HTTPException(status_code=400, detail=f"Unknown operation: {op_name}")

            sig = inspect.signature(method)
            params = [p for p in sig.parameters.keys() if p != "self"]

            if len(params) == 0:
                method()
            elif len(params) == 1:
                if op_value is not None:
                    method(op_value)
                else:
                    method()
            elif len(params) == 2:
                if op_value and "," in op_value:
                    parts = op_value.split(",", 1)
                    method(parts[0], parts[1])
                elif op_value:
                    method(op_value)
            elif len(params) == 3:
                if op_value:
                    parts = op_value.split(",", 2)
                    if len(parts) == 3:
                        method(parts[0], parts[1], parts[2])
                    elif len(parts) == 2:
                        method(parts[0], parts[1])

        response = service.execute_batch(builder)
        return VyOSResponse(
            success=response.status == 200,
            data={"message": "OpenFabric configuration updated"},
            error=response.error if response.error else None,
        )
    except HTTPException:
        raise
    except Exception:
        logger.exception("Unhandled error")
        raise HTTPException(status_code=500, detail="Internal server error")
