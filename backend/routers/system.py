"""
System Information Endpoints

API endpoints for retrieving system information about the VyOS device.
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional

from vyos_service import VyOSDeviceRegistry

# Router for system endpoints
router = APIRouter(prefix="/vyos/system", tags=["system"])

# Shared device registry (will be set from app.py)
device_registry: VyOSDeviceRegistry = None

# Configured device name (will be imported from app.py)
CONFIGURED_DEVICE_NAME: Optional[str] = None


def set_device_registry(registry: VyOSDeviceRegistry):
    """Set the device registry for this router."""
    global device_registry
    device_registry = registry


def set_configured_device_name(name: str):
    """Set the configured device name for this router."""
    global CONFIGURED_DEVICE_NAME
    CONFIGURED_DEVICE_NAME = name


class SystemInfo(BaseModel):
    """System information response model."""
    device_name: str
    vyos_version: str
    connection_host: str
    connected: bool


@router.get("/info", response_model=SystemInfo)
async def get_system_info() -> SystemInfo:
    """
    Get system information about the VyOS device.

    Returns:
    - device_name: The configured name of the device
    - vyos_version: VyOS version (e.g., "1.4", "1.5")
    - connection_host: The hostname/IP we're connected to
    - connected: Whether we can connect to the device
    """
    if CONFIGURED_DEVICE_NAME is None:
        raise HTTPException(
            status_code=503, detail="No device configured. Check .env file."
        )

    try:
        service = device_registry.get(CONFIGURED_DEVICE_NAME)
        version = service.get_version()
        hostname = service.config.hostname

        # Try to get config to verify connection
        try:
            service.get_full_config()
            connected = True
        except Exception:
            connected = False

        return SystemInfo(
            device_name=CONFIGURED_DEVICE_NAME,
            vyos_version=version,
            connection_host=hostname,
            connected=connected,
        )
    except KeyError as e:
        raise HTTPException(status_code=404, detail=f"Device not found: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving system info: {str(e)}")
