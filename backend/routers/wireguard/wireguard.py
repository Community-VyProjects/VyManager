"""
WireGuard VPN Router

API endpoints for managing VyOS WireGuard VPN configuration.
Supports version-aware configuration for VyOS 1.4 and 1.5.

Uses session-based architecture - VyOS instance comes from user's active session.
Uses pyvyos generate method for key generation.
"""

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field
from typing import List, Dict, Optional, Any
from vyos_service import VyOSService, VyOSDeviceConfig
from vyos_builders import WireGuardBatchBuilder
from vyos_mappers.wireguard import WireGuardMapper
from fastapi_permissions import require_read_permission, require_write_permission
from rbac_permissions import FeatureGroup
import asyncpg
import inspect
import re

router = APIRouter(prefix="/vyos/vpn/wireguard", tags=["wireguard"])


# ========================================================================
# Helper Function: Get User's VyOS Service
# ========================================================================

async def get_user_vyos_service(request: Request) -> VyOSService:
    """
    Get the VyOS service for the user's active session.

    Returns:
        VyOSService configured for the user's connected instance

    Raises:
        HTTPException(401): If user is not authenticated
        HTTPException(404): If user has no active VyOS session
        HTTPException(500): If database query fails
    """
    user = request.state.user
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")

    db_pool: asyncpg.Pool = request.app.state.db_pool

    async with db_pool.acquire() as conn:
        result = await conn.fetchrow("""
            SELECT
                i.id as instance_id,
                i.name as instance_name,
                i.host,
                i.port,
                i."apiKey",
                i."vyosVersion",
                i.protocol,
                i."verifySsl"
            FROM active_sessions s
            JOIN instances i ON s."instanceId" = i.id
            WHERE s."userId" = $1
            LIMIT 1
        """, user["id"])

        if not result:
            raise HTTPException(
                status_code=404,
                detail="No active VyOS instance. Please connect to an instance first."
            )

        device_config = VyOSDeviceConfig(
            hostname=result["host"],
            apikey=result["apiKey"],
            version=result["vyosVersion"],
            protocol=result["protocol"],
            port=result["port"],
            verify=result["verifySsl"],
            timeout=10,
        )

        return VyOSService(device_config)


# ========================================================================
# Pydantic Models
# ========================================================================

class WireGuardBatchOperation(BaseModel):
    """Single operation in a batch request."""
    op: str = Field(..., description="Operation name")
    value: Optional[str] = Field(None, description="Operation value")


class WireGuardInterfaceBatchRequest(BaseModel):
    """Model for interface batch configuration."""
    interface: str = Field(..., description="Interface name (e.g., wg0)")
    operations: List[WireGuardBatchOperation]


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
        service = await get_user_vyos_service(request)
        version = service.get_version()

        builder = WireGuardBatchBuilder(version=version)
        capabilities = builder.get_capabilities()

        return capabilities
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ========================================================================
# Endpoint 2: Config (Generalized Data)
# ========================================================================

@router.get("/config")
async def get_wireguard_config(request: Request, refresh: bool = False):
    """
    Get all WireGuard configurations from VyOS.

    Args:
        request: FastAPI request object
        refresh: If True, force refresh from VyOS

    Returns:
        Generalized WireGuard configuration data
    """
    await require_read_permission(request, FeatureGroup.WIREGUARD)
    try:
        service = await get_user_vyos_service(request)
        version = service.get_version()

        # Fetch configuration from VyOS
        full_config = service.get_full_config(refresh=refresh)

        # Parse raw VyOS config into generalized structure
        mapper = WireGuardMapper(version)
        config = mapper.parse_config(full_config)

        # Convert to list format for frontend
        interfaces = []
        for iface_name, iface_data in config.get("interfaces", {}).items():
            peers = []
            for peer_name, peer_data in iface_data.get("peers", {}).items():
                peers.append({
                    "name": peer_name,
                    "public_key": peer_data.get("public_key"),
                    "preshared_key": "***" if peer_data.get("preshared_key") else None,
                    "allowed_ips": peer_data.get("allowed_ips", []),
                    "address": peer_data.get("address"),
                    "port": peer_data.get("port"),
                    "persistent_keepalive": peer_data.get("persistent_keepalive"),
                    "description": peer_data.get("description"),
                    "disabled": peer_data.get("disabled", False),
                    "host_name": peer_data.get("host_name"),
                })

            interfaces.append({
                "name": iface_name,
                "description": iface_data.get("description"),
                "addresses": iface_data.get("address", []),
                "port": iface_data.get("port"),
                "private_key": "***" if iface_data.get("private_key") else None,
                "mtu": iface_data.get("mtu"),
                "fwmark": iface_data.get("fwmark"),
                "per_client_thread": iface_data.get("per_client_thread", False),
                "peers": peers,
                "peer_count": len(peers),
            })

        return {
            "interfaces": interfaces,
            "total": len(interfaces),
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


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
    try:
        service = await get_user_vyos_service(request)
        version = service.get_version()

        builder = WireGuardBatchBuilder(version=version)

        for operation in body.operations:
            method_name = operation.op
            method = getattr(builder, method_name, None)

            if method is None:
                raise HTTPException(
                    status_code=400,
                    detail=f"Unknown operation: {method_name}"
                )

            sig = inspect.signature(method)
            params = list(sig.parameters.keys())

            # Build arguments
            args = []
            if "interface" in params:
                args.append(body.interface)
            if operation.value and len(params) > len(args):
                args.append(operation.value)

            method(*args)

        # Execute batch
        response = service.execute_batch(builder)

        return VyOSResponse(
            success=response.status == 200,
            data={"message": "Interface configuration updated"},
            error=response.error if response.error else None
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


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
    try:
        service = await get_user_vyos_service(request)
        version = service.get_version()

        builder = WireGuardBatchBuilder(version=version)

        for operation in body.operations:
            method_name = operation.op
            method = getattr(builder, method_name, None)

            if method is None:
                raise HTTPException(
                    status_code=400,
                    detail=f"Unknown operation: {method_name}"
                )

            sig = inspect.signature(method)
            params = list(sig.parameters.keys())

            # Build arguments
            args = []
            if "interface" in params:
                args.append(body.interface)
            if "peer" in params:
                args.append(body.peer)
            if operation.value and len(params) > len(args):
                args.append(operation.value)

            method(*args)

        # Execute batch
        response = service.execute_batch(builder)

        return VyOSResponse(
            success=response.status == 200,
            data={"message": "Peer configuration updated"},
            error=response.error if response.error else None
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ========================================================================
# Endpoint 5: Generate Keypair (uses pyvyos generate)
# ========================================================================

@router.post("/generate-keypair")
async def generate_keypair(request: Request):
    """
    Generate a new WireGuard keypair using pyvyos generate method.

    Returns the private and public keys for manual use.
    """
    await require_write_permission(request, FeatureGroup.WIREGUARD)
    try:
        service = await get_user_vyos_service(request)

        # Use pyvyos generate method with wireguard key-pair path
        response = service.device.generate(path=["pki", "wireguard", "key-pair"])

        if response.status != 200:
            return VyOSResponse(
                success=False,
                error=response.error or "Failed to generate keypair"
            )

        # Parse the response to extract keys
        output = response.result if hasattr(response, 'result') else str(response)

        # Try to extract private and public keys from output
        private_key = None
        public_key = None

        if isinstance(output, str):
            lines = output.strip().split('\n')
            for line in lines:
                line_lower = line.lower()
                if 'private' in line_lower and ':' in line:
                    private_key = line.split(':', 1)[1].strip()
                elif 'public' in line_lower and ':' in line:
                    public_key = line.split(':', 1)[1].strip()

        return VyOSResponse(
            success=True,
            data={
                "private_key": private_key,
                "public_key": public_key,
                "raw_output": output,
            }
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ========================================================================
# Endpoint 6: Generate Preshared Key (uses pyvyos generate)
# ========================================================================

@router.post("/generate-psk")
async def generate_psk(request: Request):
    """
    Generate a WireGuard preshared key using pyvyos generate method.

    Returns the PSK for manual use.
    """
    await require_write_permission(request, FeatureGroup.WIREGUARD)
    try:
        service = await get_user_vyos_service(request)

        # Use pyvyos generate method with preshared-key path
        response = service.device.generate(path=["pki", "wireguard", "preshared-key"])

        if response.status != 200:
            return VyOSResponse(
                success=False,
                error=response.error or "Failed to generate preshared key"
            )

        output = response.result if hasattr(response, 'result') else str(response)

        # The output should be the key directly or in a format we can parse
        preshared_key = output.strip() if isinstance(output, str) else output

        return VyOSResponse(
            success=True,
            data={
                "preshared_key": preshared_key,
            }
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ========================================================================
# Endpoint 7: Get Interface Public Key
# ========================================================================

@router.get("/interface/{interface_name}/status")
async def get_interface_status(request: Request, interface_name: str):
    """
    Get runtime status for a WireGuard interface including peer handshake times and transfer stats.

    Uses VyOS show command: show interfaces wireguard <interface> summary
    Returns connection status for each peer based on latest handshake time.
    """
    await require_read_permission(request, FeatureGroup.WIREGUARD)
    try:
        service = await get_user_vyos_service(request)

        # Use VyOS show command to get WireGuard interface summary
        # Command: show interfaces wireguard <interface> summary
        response = service.device.show(
            path=["interfaces", "wireguard", interface_name, "summary"]
        )

        if response.status != 200:
            return VyOSResponse(
                success=False,
                error=response.error or f"Failed to get interface {interface_name} status"
            )

        output = response.result if hasattr(response, 'result') else str(response)

        # Parse the output to extract peer status information
        peers_status = {}
        current_peer = None

        if isinstance(output, str):
            lines = output.strip().split('\n')
            for line in lines:
                line_stripped = line.strip()

                # Detect peer section (public key line)
                if line_stripped.startswith('peer:'):
                    current_peer = line_stripped.split(':', 1)[1].strip()
                    peers_status[current_peer] = {
                        "public_key": current_peer,
                        "latest_handshake": None,
                        "latest_handshake_seconds": None,
                        "transfer_rx": None,
                        "transfer_tx": None,
                        "endpoint": None,
                    }

                elif current_peer:
                    # Parse peer details
                    if 'latest handshake:' in line_stripped.lower():
                        handshake_str = line_stripped.split(':', 1)[1].strip()
                        peers_status[current_peer]["latest_handshake"] = handshake_str
                        # Convert to seconds for comparison
                        seconds = _parse_handshake_time(handshake_str)
                        peers_status[current_peer]["latest_handshake_seconds"] = seconds

                    elif 'transfer:' in line_stripped.lower():
                        transfer_str = line_stripped.split(':', 1)[1].strip()
                        peers_status[current_peer]["transfer"] = transfer_str
                        # Parse rx/tx
                        if 'received' in transfer_str and 'sent' in transfer_str:
                            parts = transfer_str.split(',')
                            for part in parts:
                                part = part.strip()
                                if 'received' in part:
                                    peers_status[current_peer]["transfer_rx"] = part.replace('received', '').strip()
                                elif 'sent' in part:
                                    peers_status[current_peer]["transfer_tx"] = part.replace('sent', '').strip()

                    elif 'endpoint:' in line_stripped.lower():
                        endpoint_str = line_stripped.split(':', 1)[1].strip()
                        peers_status[current_peer]["endpoint"] = endpoint_str

        return VyOSResponse(
            success=True,
            data={
                "interface": interface_name,
                "peers": peers_status,
                "raw_output": output,
            }
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


def _parse_handshake_time(handshake_str: str) -> int | None:
    """
    Parse WireGuard handshake time string to seconds.

    Examples:
        "1 minute, 32 seconds ago" -> 92
        "2 hours, 15 minutes, 30 seconds ago" -> 8130
        "45 seconds ago" -> 45
        "(none)" -> None
    """
    if not handshake_str or handshake_str.lower() in ['(none)', 'none', '-']:
        return None

    total_seconds = 0
    handshake_str = handshake_str.lower().replace(' ago', '').strip()

    # Parse hours
    if 'hour' in handshake_str:
        match = re.search(r'(\d+)\s*hour', handshake_str)
        if match:
            total_seconds += int(match.group(1)) * 3600

    # Parse minutes
    if 'minute' in handshake_str:
        match = re.search(r'(\d+)\s*minute', handshake_str)
        if match:
            total_seconds += int(match.group(1)) * 60

    # Parse seconds
    if 'second' in handshake_str:
        match = re.search(r'(\d+)\s*second', handshake_str)
        if match:
            total_seconds += int(match.group(1))

    return total_seconds if total_seconds > 0 else None


@router.get("/interface/{interface_name}/public-key")
async def get_interface_public_key(request: Request, interface_name: str):
    """
    Get the public key for a WireGuard interface.

    Uses VyOS show command to get interface summary which includes the public key.
    Command: show interfaces wireguard <interface> summary
    """
    await require_read_permission(request, FeatureGroup.WIREGUARD)
    try:
        service = await get_user_vyos_service(request)

        # Use VyOS show command to get WireGuard interface summary
        # This returns the public key along with other interface info
        response = service.device.show(
            path=["interfaces", "wireguard", interface_name, "summary"]
        )

        if response.status != 200:
            return VyOSResponse(
                success=False,
                error=response.error or f"Failed to get interface {interface_name} summary"
            )

        output = response.result if hasattr(response, 'result') else str(response)

        # Parse the output to extract public key
        # The output format is like:
        # interface: wg0
        #   public key: QjGgy1nhsb1oA5CMHyhPOtGyXp9Sa24Yn2xBcrF+aQY=
        #   private key: (hidden)
        #   listening port: 51820
        public_key = None

        if isinstance(output, str):
            lines = output.strip().split('\n')
            for line in lines:
                line_stripped = line.strip()
                line_lower = line_stripped.lower()
                if 'public key' in line_lower and ':' in line_stripped:
                    # Extract the key after the colon
                    parts = line_stripped.split(':', 1)
                    if len(parts) >= 2:
                        key_candidate = parts[1].strip()
                        # Validate it looks like a WireGuard key (base64, 44 chars)
                        if re.match(r'^[A-Za-z0-9+/=]{43,44}$', key_candidate):
                            public_key = key_candidate
                            break

        if not public_key:
            return VyOSResponse(
                success=False,
                error="Could not extract public key from interface summary",
                data={"raw_output": output}
            )

        return VyOSResponse(
            success=True,
            data={
                "interface": interface_name,
                "public_key": public_key,
            }
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
