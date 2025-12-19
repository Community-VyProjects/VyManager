"""
System Information Endpoints

API endpoints for retrieving system information about the VyOS device.
"""

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from typing import Optional

from session_vyos_service import get_session_vyos_service

# Router for system endpoints
router = APIRouter(prefix="/vyos/system", tags=["system"])


# Stub functions for backwards compatibility with app.py
def set_device_registry(registry):
    """Legacy function - no longer used."""
    pass


def set_configured_device_name(name):
    """Legacy function - no longer used."""
    pass


class SystemInfo(BaseModel):
    """System information response model."""
    instance_id: str
    instance_name: str
    site_name: str
    vyos_version: str
    connection_host: str
    connected: bool


@router.get("/info", response_model=SystemInfo)
async def get_system_info(request: Request) -> SystemInfo:
    """
    Get system information about the active VyOS instance.

    Returns:
    - instance_id: The ID of the connected instance
    - instance_name: The name of the instance
    - site_name: The site the instance belongs to
    - vyos_version: VyOS version (e.g., "1.4", "1.5")
    - connection_host: The hostname/IP we're connected to
    - connected: Whether we can connect to the device
    """
    try:
        service = get_session_vyos_service(request)
        instance = request.state.instance

        version = service.get_version()
        hostname = service.config.hostname

        # Try to get config to verify connection
        try:
            service.get_full_config()
            connected = True
        except Exception:
            connected = False

        return SystemInfo(
            instance_id=instance['id'],
            instance_name=instance['name'],
            site_name=instance.get('site_name', 'Unknown'),
            vyos_version=version,
            connection_host=hostname,
            connected=connected,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving system info: {str(e)}")
