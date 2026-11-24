"""
WireGuard VPN Router

API endpoints for managing VyOS WireGuard VPN configuration.

Uses session-based architecture - VyOS instance comes from user's active session.
Key generation and interface summaries are op-mode commands whose paths come
from the WireGuard mapper.
"""

from fastapi import APIRouter, HTTPException, Request
from starlette.concurrency import run_in_threadpool
from pydantic import BaseModel, Field
from typing import Any, Dict, List, Optional, cast
from vyos_builders.wireguard import WireGuardBatchBuilder
from vyos_mappers import CommandMapperRegistry
from vyos_mappers.wireguard import WireGuardMapper
from session_vyos_service import get_session_vyos_service
from fastapi_permissions import require_read_permission, require_write_permission
from rbac_permissions import FeatureGroup
from wireguard_status import (
    parse_wg_keypair,
    parse_wg_preshared_key,
    parse_wg_public_key,
    parse_wg_summary,
    wg_summary_names_interface,
)
import re
import logging
import requests as _requests
from batch_dispatch import call_item_batch_op
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/vyos/vpn/wireguard", tags=["wireguard"])

# Lab node.def for ``interfaces wireguard``: ``--regex 'wg[0-9]+'``.
_INTERFACE_NAME = re.compile(r"wg[0-9]+", re.ASCII)

_TIMEOUT_DETAIL = "VyOS API request timed out. Try increasing the timeout in instance settings."


# ========================================================================
# Pydantic Models
# ========================================================================

class WireGuardBatchOperation(BaseModel):
    """Single operation in a batch request."""
    op: str = Field(..., description="Operation name")
    value: Optional[str] = Field(None, description="Operation value")


class PeerBatchGroup(BaseModel):
    """A group of operations for a single peer, used for atomic interface+peer creation."""
    peer: str = Field(..., description="Peer name")
    operations: List[WireGuardBatchOperation]


class WireGuardInterfaceBatchRequest(BaseModel):
    """Model for interface batch configuration."""
    interface: str = Field(..., description="Interface name (e.g., wg0)")
    operations: List[WireGuardBatchOperation]
    peers: Optional[List[PeerBatchGroup]] = Field(None, description="Optional peer operations to commit atomically with the interface")


class WireGuardPeerBatchRequest(BaseModel):
    """Model for peer batch configuration."""
    interface: str = Field(..., description="Interface name (e.g., wg0)")
    peer: str = Field(..., description="Peer name")
    operations: List[WireGuardBatchOperation]


class VyOSResponse(BaseModel):
    """Standard response from VyOS operations."""
    success: bool
    data: Optional[Dict[str, Any]] = None
    error: Optional[str] = None


class WireGuardPeerConfig(BaseModel):
    """One configured peer. ``preshared_key`` is masked."""
    name: str
    public_key: Optional[str] = None
    preshared_key: Optional[str] = None
    allowed_ips: List[str]
    address: Optional[str] = None
    port: Optional[str] = None
    persistent_keepalive: Optional[str] = None
    description: Optional[str] = None
    disabled: bool
    host_name: Optional[str] = None


class WireGuardInterfaceConfig(BaseModel):
    """One configured interface. ``private_key`` is masked."""
    name: str
    description: Optional[str] = None
    addresses: List[str]
    port: Optional[str] = None
    private_key: Optional[str] = None
    mtu: Optional[str] = None
    fwmark: Optional[str] = None
    per_client_thread: bool
    disabled: bool
    mss_clamping: Optional[str] = None
    peers: List[WireGuardPeerConfig]
    peer_count: int


class WireGuardConfigResponse(BaseModel):
    interfaces: List[WireGuardInterfaceConfig]
    total: int


def _mapper(service: Any) -> WireGuardMapper:
    return cast(WireGuardMapper, CommandMapperRegistry.get_mapper("wireguard", service.get_version() or ""))


def _require_interface_name(interface_name: str) -> None:
    if not _INTERFACE_NAME.fullmatch(interface_name):
        raise HTTPException(status_code=400, detail="WireGuard interface must be named wgN")


def _op_output(response: Any, action: str) -> str:
    """Return op-mode text, or 502 when the device reports a failure.

    pyvyos sets ``error`` on an HTTP 200 reply too, so both are checked.
    """
    if response.status != 200 or response.error:
        logger.warning("WireGuard %s failed: %s", action, response.error)
        raise HTTPException(status_code=502, detail=f"VyOS could not {action}")
    result = response.result
    return result if isinstance(result, str) else ""


# ========================================================================
# Endpoint 1: Capabilities
# ========================================================================

@router.get("/capabilities")
async def get_wireguard_capabilities(request: Request):
    """
    Get WireGuard capabilities based on device VyOS version.

    Returns feature flags indicating which operations are supported.
    """
    await require_read_permission(request, FeatureGroup.WIREGUARD)
    try:
        service = get_session_vyos_service(request)
        version = service.get_version()

        builder = WireGuardBatchBuilder(version=version)
        capabilities = builder.get_capabilities()

        return capabilities
    except HTTPException:
        raise
    except Exception:
        logger.exception("Unhandled error")
        raise HTTPException(status_code=500, detail="Internal server error")


# ========================================================================
# Endpoint 2: Config (Generalized Data)
# ========================================================================

@router.get("/config", response_model=WireGuardConfigResponse)
async def get_wireguard_config(request: Request, refresh: bool = False):
    """
    Get all WireGuard configurations from VyOS.

    Args:
        request: FastAPI request object
        refresh: If True, force refresh from VyOS

    Returns:
        Interfaces with their peers; secrets are masked.
    """
    await require_read_permission(request, FeatureGroup.WIREGUARD)
    try:
        service = get_session_vyos_service(request)
        mapper = _mapper(service)
        full_config = await run_in_threadpool(service.get_full_config, refresh=refresh)
        return WireGuardConfigResponse(**mapper.parse_config(full_config))
    except HTTPException:
        raise
    except _requests.exceptions.Timeout:
        logger.warning("VyOS API timed out reading WireGuard config")
        raise HTTPException(status_code=504, detail=_TIMEOUT_DETAIL)
    except _requests.exceptions.RequestException as e:
        logger.warning("VyOS API request failed reading WireGuard config: %s", e)
        raise HTTPException(status_code=502, detail="VyOS API request failed")
    except Exception:
        logger.exception("Unhandled error")
        raise HTTPException(status_code=500, detail="Internal server error")


# ========================================================================
# Endpoint 3: Interface Batch Operations
# ========================================================================

@router.post("/interface/batch")
async def wireguard_interface_batch(request: Request, body: WireGuardInterfaceBatchRequest):
    """
    Execute a batch of interface configuration operations.

    Allows multiple changes in a single VyOS commit for efficiency.
    """
    await require_write_permission(request, FeatureGroup.WIREGUARD)
    _require_interface_name(body.interface)
    try:
        service = get_session_vyos_service(request)
        version = service.get_version()

        builder = WireGuardBatchBuilder(version=version)

        try:
            for operation in body.operations:
                call_item_batch_op(
                    builder, operation.op, body.interface, operation.value,
                    bound={"peer": None},
                )

            # Optional peer operations, committed with the interface (a 1.4 interface needs a peer)
            for peer_group in body.peers or []:
                for operation in peer_group.operations:
                    call_item_batch_op(
                        builder, operation.op, body.interface, operation.value,
                        bound={"peer": peer_group.peer},
                    )
        except ValueError as e:
            raise HTTPException(status_code=400, detail=str(e))

        response = await run_in_threadpool(service.execute_batch, builder)

        return VyOSResponse(
            success=response.status == 200,
            data={"message": "Interface configuration updated"} if response.status == 200 else None,
            error=response.error if response.error else None
        )
    except HTTPException:
        raise
    except _requests.exceptions.Timeout:
        logger.warning("VyOS API timed out during interface batch operation")
        raise HTTPException(status_code=504, detail=_TIMEOUT_DETAIL)
    except _requests.exceptions.RequestException as e:
        logger.warning("VyOS API request failed during interface batch operation: %s", e)
        raise HTTPException(status_code=502, detail="VyOS API request failed")
    except Exception:
        logger.exception("Unhandled error")
        raise HTTPException(status_code=500, detail="Internal server error")


# ========================================================================
# Endpoint 4: Peer Batch Operations
# ========================================================================

@router.post("/peer/batch")
async def wireguard_peer_batch(request: Request, body: WireGuardPeerBatchRequest):
    """
    Execute a batch of peer configuration operations.

    Allows multiple changes in a single VyOS commit for efficiency.
    """
    await require_write_permission(request, FeatureGroup.WIREGUARD)
    _require_interface_name(body.interface)
    try:
        service = get_session_vyos_service(request)
        version = service.get_version()

        builder = WireGuardBatchBuilder(version=version)

        try:
            for operation in body.operations:
                call_item_batch_op(
                    builder, operation.op, body.interface, operation.value,
                    bound={"peer": body.peer},
                )
        except ValueError as e:
            raise HTTPException(status_code=400, detail=str(e))

        response = await run_in_threadpool(service.execute_batch, builder)

        return VyOSResponse(
            success=response.status == 200,
            data={"message": "Peer configuration updated"} if response.status == 200 else None,
            error=response.error if response.error else None
        )
    except HTTPException:
        raise
    except _requests.exceptions.Timeout:
        logger.warning("VyOS API timed out during peer batch operation")
        raise HTTPException(status_code=504, detail=_TIMEOUT_DETAIL)
    except _requests.exceptions.RequestException as e:
        logger.warning("VyOS API request failed during peer batch operation: %s", e)
        raise HTTPException(status_code=502, detail="VyOS API request failed")
    except Exception:
        logger.exception("Unhandled error")
        raise HTTPException(status_code=500, detail="Internal server error")


# ========================================================================
# Endpoint 5: Generate Keypair
# ========================================================================

@router.post("/generate-keypair")
async def generate_keypair(request: Request):
    """
    Generate a new WireGuard keypair (``generate pki wireguard key-pair``).

    Returns the private and public keys for manual use.
    """
    await require_write_permission(request, FeatureGroup.WIREGUARD)
    try:
        service = get_session_vyos_service(request)
        mapper = _mapper(service)
        response = await run_in_threadpool(service.device.generate, path=mapper.get_keypair_generate_path())
        private_key, public_key = parse_wg_keypair(_op_output(response, "generate a keypair"))
        if not private_key or not public_key:
            raise HTTPException(status_code=502, detail="VyOS returned no keypair")

        return VyOSResponse(
            success=True,
            data={
                "private_key": private_key,
                "public_key": public_key,
            }
        )
    except HTTPException:
        raise
    except _requests.exceptions.Timeout:
        logger.warning("VyOS API timed out during keypair generation")
        raise HTTPException(status_code=504, detail=_TIMEOUT_DETAIL)
    except _requests.exceptions.RequestException as e:
        logger.warning("VyOS API request failed during keypair generation: %s", e)
        raise HTTPException(status_code=502, detail="VyOS could not generate a keypair")
    except Exception:
        logger.exception("Unhandled error")
        raise HTTPException(status_code=500, detail="Internal server error")


# ========================================================================
# Endpoint 6: Generate Preshared Key
# ========================================================================

@router.post("/generate-psk")
async def generate_psk(request: Request):
    """
    Generate a WireGuard preshared key (``generate pki wireguard preshared-key``).

    Returns the PSK for manual use.
    """
    await require_write_permission(request, FeatureGroup.WIREGUARD)
    try:
        service = get_session_vyos_service(request)
        mapper = _mapper(service)
        response = await run_in_threadpool(service.device.generate, path=mapper.get_preshared_key_generate_path())
        preshared_key = parse_wg_preshared_key(_op_output(response, "generate a preshared key"))
        if not preshared_key:
            raise HTTPException(status_code=502, detail="VyOS returned no preshared key")

        return VyOSResponse(
            success=True,
            data={
                "preshared_key": preshared_key,
            }
        )
    except HTTPException:
        raise
    except _requests.exceptions.Timeout:
        logger.warning("VyOS API timed out during preshared key generation")
        raise HTTPException(status_code=504, detail=_TIMEOUT_DETAIL)
    except _requests.exceptions.RequestException as e:
        logger.warning("VyOS API request failed during preshared key generation: %s", e)
        raise HTTPException(status_code=502, detail="VyOS could not generate a preshared key")
    except Exception:
        logger.exception("Unhandled error")
        raise HTTPException(status_code=500, detail="Internal server error")


# ========================================================================
# Endpoint 7: Interface Status
# ========================================================================

@router.get("/interface/{interface_name}/status")
async def get_interface_status(request: Request, interface_name: str):
    """
    Get runtime status for a WireGuard interface including peer handshake times and transfer stats.

    Reads ``show interfaces wireguard <interface> summary``; peers are keyed by public key.
    """
    await require_read_permission(request, FeatureGroup.WIREGUARD)
    _require_interface_name(interface_name)
    try:
        service = get_session_vyos_service(request)
        mapper = _mapper(service)
        response = await run_in_threadpool(
            service.device.show, path=mapper.get_interface_summary_show_path(interface_name)
        )
        output = _op_output(response, f"read interface {interface_name} status")
        if not wg_summary_names_interface(output):
            raise HTTPException(status_code=404, detail=f"WireGuard interface {interface_name} is not up on the device")

        return VyOSResponse(
            success=True,
            data={
                "interface": interface_name,
                "peers": parse_wg_summary(output),
            }
        )
    except HTTPException:
        raise
    except _requests.exceptions.Timeout:
        logger.warning("VyOS API timed out reading WireGuard interface status")
        raise HTTPException(status_code=504, detail=_TIMEOUT_DETAIL)
    except _requests.exceptions.RequestException as e:
        logger.warning("VyOS API request failed reading WireGuard interface status: %s", e)
        raise HTTPException(status_code=502, detail=f"VyOS could not read interface {interface_name} status")
    except Exception:
        logger.exception("Unhandled error")
        raise HTTPException(status_code=500, detail="Internal server error")


# ========================================================================
# Endpoint 8: Interface Public Key
# ========================================================================

@router.get("/interface/{interface_name}/public-key")
async def get_interface_public_key(request: Request, interface_name: str):
    """
    Get the public key for a WireGuard interface.

    Reads ``show interfaces wireguard <interface> public-key`` (``wg show <if> public-key``).
    """
    await require_read_permission(request, FeatureGroup.WIREGUARD)
    _require_interface_name(interface_name)
    try:
        service = get_session_vyos_service(request)
        mapper = _mapper(service)
        response = await run_in_threadpool(
            service.device.show, path=mapper.get_interface_public_key_show_path(interface_name)
        )
        public_key = parse_wg_public_key(_op_output(response, f"read interface {interface_name} public key"))
        if not public_key:
            raise HTTPException(status_code=404, detail=f"WireGuard interface {interface_name} has no public key")

        return VyOSResponse(
            success=True,
            data={
                "interface": interface_name,
                "public_key": public_key,
            }
        )
    except HTTPException:
        raise
    except _requests.exceptions.Timeout:
        logger.warning("VyOS API timed out reading WireGuard interface public key")
        raise HTTPException(status_code=504, detail=_TIMEOUT_DETAIL)
    except _requests.exceptions.RequestException as e:
        logger.warning("VyOS API request failed reading WireGuard interface public key: %s", e)
        raise HTTPException(status_code=502, detail=f"VyOS could not read interface {interface_name} public key")
    except Exception:
        logger.exception("Unhandled error")
        raise HTTPException(status_code=500, detail="Internal server error")
