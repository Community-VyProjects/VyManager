"""Broadcast Relay Service Router.

API endpoints for managing VyOS UDP Broadcast Relay configuration.
The template structure is identical between VyOS 1.4 and 1.5.

Endpoints:
  GET  /vyos/broadcast-relay/capabilities  — version-aware feature flags
  GET  /vyos/broadcast-relay/config        — normalized relay configuration
  POST /vyos/broadcast-relay/batch         — atomic set/delete operations
"""

from fastapi import APIRouter, HTTPException, Request
from starlette.concurrency import run_in_threadpool
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from session_vyos_service import get_session_vyos_service
from vyos_builders.broadcast_relay import BroadcastRelayBatchBuilder
from fastapi_permissions import require_read_permission, require_write_permission
from rbac_permissions import FeatureGroup
import inspect
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/vyos/broadcast-relay", tags=["broadcast-relay"])


# ============================================================================
# Pydantic Models
# ============================================================================


class BroadcastRelayInstance(BaseModel):
    """A single broadcast relay instance (ID 1–99)."""
    id: str
    address: Optional[str] = None
    description: Optional[str] = None
    disabled: bool = False
    interfaces: List[str] = []
    port: Optional[int] = None


class BroadcastRelayConfig(BaseModel):
    """Full broadcast-relay service configuration."""
    globally_disabled: bool = False
    instances: List[BroadcastRelayInstance] = []


class BroadcastRelayBatchOperation(BaseModel):
    op: str = Field(..., description="Builder method name")
    value: Optional[str] = Field(
        None,
        description=(
            "Argument(s) for the operation. "
            "Single-arg methods: plain string. "
            "Multi-arg methods: comma-separated (e.g., '5,eth0')."
        ),
    )


class BroadcastRelayBatchRequest(BaseModel):
    operations: List[BroadcastRelayBatchOperation]


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
async def get_broadcast_relay_capabilities(request: Request):
    """Return broadcast-relay feature capabilities based on the VyOS version."""
    await require_read_permission(request, FeatureGroup.BROADCAST_RELAY)
    try:
        service = get_session_vyos_service(request)
        builder = BroadcastRelayBatchBuilder(version=service.get_version())
        caps = builder.get_capabilities()
        if hasattr(request.state, "instance") and request.state.instance:
            caps["instance_name"] = request.state.instance.get("name")
            caps["instance_id"] = request.state.instance.get("id")
        return caps
    except Exception:
        logger.exception("Unhandled error in get_broadcast_relay_capabilities")
        raise HTTPException(status_code=500, detail="Internal server error")


# ============================================================================
# Endpoint 2: Config
# ============================================================================


@router.get("/config", response_model=BroadcastRelayConfig)
async def get_broadcast_relay_config(http_request: Request, refresh: bool = False):
    """Return the full broadcast-relay configuration in a normalized format."""
    await require_read_permission(http_request, FeatureGroup.BROADCAST_RELAY)
    try:
        service = get_session_vyos_service(http_request)
        full_config = await run_in_threadpool(service.get_full_config, refresh=refresh)

        br_raw = full_config.get("service", {}).get("broadcast-relay", {})
        if not br_raw:
            return BroadcastRelayConfig()

        globally_disabled = "disable" in br_raw

        instances_raw = br_raw.get("id", {})
        instances = []
        if instances_raw and isinstance(instances_raw, dict):
            for relay_id, inst_cfg in instances_raw.items():
                if inst_cfg is None:
                    inst_cfg = {}
                instances.append(_parse_instance(relay_id, inst_cfg))

        instances.sort(key=lambda i: int(i.id))

        return BroadcastRelayConfig(
            globally_disabled=globally_disabled,
            instances=instances,
        )
    except Exception:
        logger.exception("Unhandled error in get_broadcast_relay_config")
        raise HTTPException(status_code=500, detail="Internal server error")


# ============================================================================
# Endpoint 3: Batch Operations
# ============================================================================


@router.post("/batch", response_model=VyOSResponse)
async def broadcast_relay_batch_configure(
    http_request: Request, body: BroadcastRelayBatchRequest
):
    """Execute a batch of broadcast-relay configuration operations atomically."""
    await require_write_permission(http_request, FeatureGroup.BROADCAST_RELAY)
    try:
        service = get_session_vyos_service(http_request)
        builder = BroadcastRelayBatchBuilder(version=service.get_version())

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
            data={"message": "Broadcast Relay configuration updated"},
            error=response.error if response.error else None,
        )
    except HTTPException:
        raise
    except AttributeError as e:
        raise HTTPException(status_code=400, detail=f"Unknown operation: {e}")
    except Exception:
        logger.exception("Unhandled error in broadcast_relay_batch_configure")
        raise HTTPException(status_code=500, detail="Internal server error")


# ============================================================================
# Config Parsers
# ============================================================================


def _parse_instance(relay_id: str, cfg: dict) -> BroadcastRelayInstance:
    """Parse a single broadcast relay instance from raw VyOS config."""
    interfaces_raw = cfg.get("interface")
    if interfaces_raw is None:
        interfaces = []
    elif isinstance(interfaces_raw, list):
        interfaces = interfaces_raw
    elif isinstance(interfaces_raw, dict):
        interfaces = list(interfaces_raw.keys())
    else:
        interfaces = [str(interfaces_raw)]

    port_raw = cfg.get("port")
    port = None
    if port_raw is not None:
        try:
            port = int(port_raw)
        except (ValueError, TypeError):
            logger.debug("Instance %s has non-integer port value %r; leaving port unset", relay_id, port_raw)

    return BroadcastRelayInstance(
        id=relay_id,
        address=cfg.get("address"),
        description=cfg.get("description"),
        disabled="disable" in cfg,
        interfaces=sorted(interfaces),
        port=port,
    )
