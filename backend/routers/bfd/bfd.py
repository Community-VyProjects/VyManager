"""
BFD Protocol Router

API endpoints for managing VyOS BFD (Bidirectional Forwarding Detection) configuration.
Supports version-aware configuration for VyOS 1.4 and 1.5.
"""

from fastapi import APIRouter, HTTPException, Request
from starlette.concurrency import run_in_threadpool
from pydantic import BaseModel, Field
from typing import List, Dict, Optional, Any
from session_vyos_service import get_session_vyos_service
from vyos_builders import BfdBatchBuilder
from fastapi_permissions import require_read_permission, require_write_permission
from rbac_permissions import FeatureGroup
import inspect
import logging
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/vyos/bfd", tags=["bfd"])

# Builder infrastructure methods that must never be invokable via the batch API
_INTERNAL_BUILDER_METHODS = frozenset({
    "add_set", "add_delete", "get_operations", "is_empty", "clear", "operation_count",
})


# ============================================================================
# Pydantic Models
# ============================================================================


class BfdInterval(BaseModel):
    """BFD timer interval settings."""
    echo_interval: Optional[int] = None  # 10-60000 ms
    multiplier: Optional[int] = None  # 2-255 (default: 3)
    receive: Optional[int] = None  # 10-60000 ms (default: 300)
    transmit: Optional[int] = None  # 10-60000 ms (default: 300)


class BfdSource(BaseModel):
    """BFD peer source configuration."""
    address: Optional[str] = None
    interface: Optional[str] = None


class BfdPeer(BaseModel):
    """BFD peer configuration."""
    address: str
    echo_mode: bool = False
    interval: BfdInterval = BfdInterval()
    minimum_ttl: Optional[int] = None  # 1-254
    multihop: bool = False
    passive: bool = False
    profile: Optional[str] = None
    shutdown: bool = False
    source: BfdSource = BfdSource()
    vrf: Optional[str] = None


class BfdProfile(BaseModel):
    """BFD profile configuration."""
    name: str
    echo_mode: bool = False
    interval: BfdInterval = BfdInterval()
    minimum_ttl: Optional[int] = None  # 1-254
    passive: bool = False
    shutdown: bool = False


class BfdConfig(BaseModel):
    """Complete BFD configuration."""
    peers: List[BfdPeer] = []
    profiles: List[BfdProfile] = []


class BfdBatchOperation(BaseModel):
    """Single operation in a batch request."""
    op: str = Field(..., description="Operation name")
    value: Optional[str] = Field(None, description="Operation value")


class BfdBatchRequest(BaseModel):
    """Model for batch configuration."""
    operations: List[BfdBatchOperation]


class VyOSResponse(BaseModel):
    """Standard response from VyOS operations."""
    success: bool
    data: Optional[Dict[str, Any]] = None
    error: Optional[str] = None


# ============================================================================
# Endpoint 1: Capabilities
# ============================================================================


@router.get("/capabilities")
async def get_bfd_capabilities(request: Request):
    """Get BFD feature capabilities based on device VyOS version."""
    await require_read_permission(request, FeatureGroup.BFD)

    try:
        service = get_session_vyos_service(request)
        version = service.get_version()
        builder = BfdBatchBuilder(version=version)
        capabilities = builder.get_capabilities()

        if hasattr(request.state, "instance") and request.state.instance:
            capabilities["instance_name"] = request.state.instance.get("name")
            capabilities["instance_id"] = request.state.instance.get("id")
        return capabilities
    except Exception as e:
        logger.exception("Unhandled error")
        raise HTTPException(status_code=500, detail="Internal server error")


# ============================================================================
# Endpoint 2: Config
# ============================================================================


@router.get("/config", response_model=BfdConfig)
async def get_bfd_config(http_request: Request, refresh: bool = False):
    """Get all BFD configuration from VyOS in a generalized format."""
    await require_read_permission(http_request, FeatureGroup.BFD)

    try:
        service = get_session_vyos_service(http_request)
        full_config = await run_in_threadpool(service.get_full_config, refresh=refresh)

        bfd_config = full_config.get("protocols", {}).get("bfd", {})

        if not bfd_config:
            return BfdConfig()

        peers = parse_peers(bfd_config.get("peer", {}))
        profiles = parse_profiles(bfd_config.get("profile", {}))

        return BfdConfig(peers=peers, profiles=profiles)
    except Exception as e:
        logger.exception("Unhandled error")
        raise HTTPException(status_code=500, detail="Internal server error")


# ============================================================================
# Config Parsers
# ============================================================================


def parse_interval(config: dict) -> BfdInterval:
    """Parse BFD interval settings from config."""
    interval_raw = config.get("interval", {})
    if not interval_raw:
        return BfdInterval()

    return BfdInterval(
        echo_interval=int(interval_raw["echo-interval"]) if interval_raw.get("echo-interval") else None,
        multiplier=int(interval_raw["multiplier"]) if interval_raw.get("multiplier") else None,
        receive=int(interval_raw["receive"]) if interval_raw.get("receive") else None,
        transmit=int(interval_raw["transmit"]) if interval_raw.get("transmit") else None,
    )


def parse_source(config: dict) -> BfdSource:
    """Parse BFD peer source configuration."""
    source_raw = config.get("source", {})
    if not source_raw:
        return BfdSource()

    return BfdSource(
        address=source_raw.get("address"),
        interface=source_raw.get("interface"),
    )


def parse_peers(peers_raw: dict) -> List[BfdPeer]:
    """Parse BFD peer configurations."""
    peers = []

    for peer_addr, peer_config in peers_raw.items():
        if peer_config is None:
            peer_config = {}

        peers.append(BfdPeer(
            address=peer_addr,
            echo_mode="echo-mode" in peer_config,
            interval=parse_interval(peer_config),
            minimum_ttl=int(peer_config["minimum-ttl"]) if peer_config.get("minimum-ttl") else None,
            multihop="multihop" in peer_config,
            passive="passive" in peer_config,
            profile=peer_config.get("profile"),
            shutdown="shutdown" in peer_config,
            source=parse_source(peer_config),
            vrf=peer_config.get("vrf"),
        ))

    return peers


def parse_profiles(profiles_raw: dict) -> List[BfdProfile]:
    """Parse BFD profile configurations."""
    profiles = []

    for profile_name, profile_config in profiles_raw.items():
        if profile_config is None:
            profile_config = {}

        profiles.append(BfdProfile(
            name=profile_name,
            echo_mode="echo-mode" in profile_config,
            interval=parse_interval(profile_config),
            minimum_ttl=int(profile_config["minimum-ttl"]) if profile_config.get("minimum-ttl") else None,
            passive="passive" in profile_config,
            shutdown="shutdown" in profile_config,
        ))

    return profiles


# ============================================================================
# Endpoint 3: Batch Operations
# ============================================================================


@router.post("/batch", response_model=VyOSResponse)
async def bfd_batch_configure(http_request: Request, body: BfdBatchRequest):
    """Execute a batch of BFD configuration operations."""
    await require_write_permission(http_request, FeatureGroup.BFD)

    try:
        service = get_session_vyos_service(http_request)
        version = service.get_version()
        builder = BfdBatchBuilder(version=version)

        for operation in body.operations:
            if operation.op.startswith("_") or operation.op in _INTERNAL_BUILDER_METHODS:
                raise HTTPException(status_code=400, detail=f"Invalid operation: {operation.op}")
            method = getattr(builder, operation.op, None)
            if not callable(method):
                raise HTTPException(status_code=400, detail=f"Unknown operation: {operation.op}")
            sig = inspect.signature(method)
            params = [p for p in sig.parameters.keys() if p != "self"]

            if len(params) == 0:
                method()
            elif len(params) == 1 and operation.value:
                method(operation.value)
            elif len(params) == 2 and operation.value:
                values = operation.value.split(",", 1)
                if len(values) == 2:
                    method(values[0], values[1])
                else:
                    method(operation.value)
            elif len(params) == 0:
                method()

        response = service.execute_batch(builder)

        return VyOSResponse(
            success=response.status == 200,
            data={"message": "BFD configuration updated"},
            error=response.error if response.error else None
        )
    except AttributeError as e:
        raise HTTPException(status_code=400, detail=f"Unknown operation: {str(e)}")
    except Exception as e:
        logger.exception("Unhandled error")
        raise HTTPException(status_code=500, detail="Internal server error")
