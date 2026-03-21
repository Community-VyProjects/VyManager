"""
PKI (Public Key Infrastructure) Router

API endpoints for managing VyOS PKI configuration including:
- Certificate Authorities (CA)
- Certificates (including ACME/Let's Encrypt)
- Diffie-Hellman parameters
- Key Pairs
- OpenSSH keys
- OpenVPN shared secrets
- X509 defaults

Uses session-based architecture - VyOS instance comes from user's active session.
"""

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field
from typing import List, Dict, Optional, Any
from session_vyos_service import get_session_vyos_service
from vyos_builders.pki import PKIBatchBuilder
from vyos_mappers.pki import PKIMapper
from fastapi_permissions import require_read_permission, require_write_permission
from rbac_permissions import FeatureGroup
import inspect
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/vyos/pki", tags=["pki"])

# Builder infrastructure methods that must never be invokable via the batch API
_INTERNAL_BUILDER_METHODS = frozenset({
    "add_set", "add_delete", "get_operations", "is_empty", "clear", "operation_count",
})


# ========================================================================
# Pydantic Models
# ========================================================================

class PKIBatchOperation(BaseModel):
    """Single operation in a batch request."""
    op: str = Field(..., description="Operation name (e.g., create_ca, set_ca_certificate)")
    value: Optional[str] = Field(None, description="Operation value")


class PKIBatchRequest(BaseModel):
    """Batch request for PKI configuration changes."""
    item_name: str = Field(..., description="Primary item name (e.g., CA name, cert name, or placeholder for global ops)")
    operations: List[PKIBatchOperation]


class VyOSResponse(BaseModel):
    """Standard response from VyOS operations."""
    success: bool
    data: Optional[Dict[str, Any]] = None
    error: Optional[str] = None


# ========================================================================
# Endpoint 1: Capabilities
# ========================================================================

@router.get("/capabilities")
async def get_pki_capabilities(request: Request):
    """
    Get PKI capabilities based on device VyOS version.

    Returns feature flags indicating which operations are supported.
    """
    await require_read_permission(request, FeatureGroup.PKI)
    try:
        service = get_session_vyos_service(request)
        version = service.get_version()

        builder = PKIBatchBuilder(version=version)
        return builder.get_capabilities()
    except HTTPException:
        raise
    except Exception:
        logger.exception("Unhandled error")
        raise HTTPException(status_code=500, detail="Internal server error")


# ========================================================================
# Endpoint 2: Config (Generalized Data)
# ========================================================================

@router.get("/config")
async def get_pki_config(request: Request, refresh: bool = False):
    """
    Get PKI configuration from VyOS.

    Returns generalized PKI configuration data including:
    - Certificate Authorities
    - Certificates (with ACME info)
    - Diffie-Hellman parameters
    - Key Pairs
    - OpenSSH keys
    - OpenVPN shared secrets
    - X509 defaults
    """
    await require_read_permission(request, FeatureGroup.PKI)
    try:
        service = get_session_vyos_service(request)
        version = service.get_version()

        full_config = service.get_full_config(refresh=refresh)

        mapper = PKIMapper(version)
        config = mapper.parse_config(full_config)

        # Convert CA dict to list for frontend
        ca_list = []
        for name, data in config.get("ca", {}).items():
            # Mask private keys
            masked = {**data}
            if masked.get("private_key"):
                masked["private_key"] = "***"
            ca_list.append(masked)

        # Convert certificates dict to list
        cert_list = []
        for name, data in config.get("certificates", {}).items():
            masked = {**data}
            if masked.get("private_key"):
                masked["private_key"] = "***"
            cert_list.append(masked)

        # Convert DH dict to list
        dh_list = []
        for name, data in config.get("dh", {}).items():
            masked = {**data}
            if masked.get("parameters"):
                masked["parameters"] = "***"
            dh_list.append(masked)

        # Convert key pairs dict to list
        key_pair_list = []
        for name, data in config.get("key_pairs", {}).items():
            masked = {**data}
            if masked.get("private_key"):
                masked["private_key"] = "***"
            key_pair_list.append(masked)

        # Convert OpenSSH dict to list
        openssh_list = []
        for name, data in config.get("openssh", {}).items():
            masked = {**data}
            if masked.get("private_key"):
                masked["private_key"] = "***"
            openssh_list.append(masked)

        # Convert OpenVPN shared secrets dict to list
        openvpn_list = []
        for name, data in config.get("openvpn_shared_secrets", {}).items():
            masked = {**data}
            if masked.get("key"):
                masked["key"] = "***"
            openvpn_list.append(masked)

        return {
            "configured": config.get("configured", False),
            "ca": ca_list,
            "certificates": cert_list,
            "dh": dh_list,
            "key_pairs": key_pair_list,
            "openssh": openssh_list,
            "openvpn_shared_secrets": openvpn_list,
            "x509_defaults": config.get("x509_defaults", {}),
            "totals": {
                "ca": len(ca_list),
                "certificates": len(cert_list),
                "dh": len(dh_list),
                "key_pairs": len(key_pair_list),
                "openssh": len(openssh_list),
                "openvpn_shared_secrets": len(openvpn_list),
            },
        }
    except HTTPException:
        raise
    except Exception:
        logger.exception("Unhandled error")
        raise HTTPException(status_code=500, detail="Internal server error")


# ========================================================================
# Endpoint 3: Batch Operations
# ========================================================================

@router.post("/batch", response_model=VyOSResponse)
async def pki_batch_configure(http_request: Request, request: PKIBatchRequest):
    """
    Execute a batch of PKI configuration operations.

    All operations are executed in a single VyOS commit for atomicity.

    The item_name field serves as the primary identifier for the operations
    (e.g., CA name for CA ops, cert name for cert ops, or a
    placeholder like "pki" for global settings like X509 defaults).

    Each operation's `op` field maps to a method on PKIBatchBuilder.
    The `value` field provides additional parameters when needed.
    """
    await require_write_permission(http_request, FeatureGroup.PKI)
    try:
        service = get_session_vyos_service(http_request)
        version = service.get_version()

        builder = PKIBatchBuilder(version=version)

        for operation in request.operations:
            if operation.op.startswith("_") or operation.op in _INTERNAL_BUILDER_METHODS:
                raise HTTPException(status_code=400, detail=f"Invalid operation: {operation.op}")

            method = getattr(builder, operation.op, None)
            if not callable(method):
                raise HTTPException(
                    status_code=400,
                    detail=f"Unknown operation: {operation.op}"
                )

            sig = inspect.signature(method)
            params = [p for p in sig.parameters.keys() if p != "self"]

            args = []
            if len(params) >= 1:
                args.append(request.item_name)
            if len(params) >= 2 and operation.value is not None:
                if len(params) >= 3:
                    parts = operation.value.split("|", len(params) - 2)
                    args.extend(parts)
                else:
                    args.append(operation.value)

            method(*args)

        if builder.is_empty():
            return VyOSResponse(
                success=True,
                data={"message": "No operations to execute"},
            )

        response = service.execute_batch(builder)

        return VyOSResponse(
            success=response.status == 200,
            data={"message": "PKI configuration updated"},
            error=response.error if response.error else None,
        )
    except HTTPException:
        raise
    except Exception:
        logger.exception("Unhandled error")
        raise HTTPException(status_code=500, detail="Internal server error")
