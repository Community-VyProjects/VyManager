"""
Session-Aware VyOS Service

Provides VyOS service instances based on the user's active session.
Replaces the single-device pattern with dynamic multi-instance support.
"""

from fastapi import Request, HTTPException
from typing import Optional
from vyos_service import VyOSService, VyOSDeviceConfig, VyOSDeviceRegistry


# Global registry for session-based VyOS services
# Key format: "instance_id"
_session_device_registry = VyOSDeviceRegistry()


def get_session_vyos_service(request: Request) -> VyOSService:
    """
    Get VyOS service for the user's active session.

    This function:
    1. Checks if user has an active session (set by SessionMiddleware)
    2. Retrieves instance details from request.state.instance
    3. Creates or returns cached VyOS service for that instance
    4. Returns the service for use in route handlers

    Raises:
        HTTPException 400: If user has no active session
        HTTPException 500: If instance details are invalid

    Example:
        @router.get("/interfaces")
        async def get_interfaces(request: Request):
            service = get_session_vyos_service(request)
            config = service.get_full_config()
            # ... use config
    """
    # Check if user has an active instance
    if not hasattr(request.state, "instance") or not request.state.instance:
        raise HTTPException(
            status_code=400,
            detail={
                "error": "No active instance",
                "message": "You must connect to a VyOS instance first. Go to /sites and select an instance.",
                "redirect": "/sites",
            },
        )

    instance = request.state.instance

    # Validate instance has required fields
    required_fields = ["id", "host", "api_key"]  # api_key is the VyOS API key
    for field in required_fields:
        if field not in instance:
            raise HTTPException(
                status_code=500,
                detail=f"Instance missing required field: {field}"
            )

    instance_id = instance["id"]

    # Check if we already have a service for this instance
    try:
        service = _session_device_registry.get(instance_id)
        return service
    except KeyError:
        pass  # Service doesn't exist yet, create it

    # Create new VyOS service for this instance
    try:
        version = instance.get("vyos_version") or "1.5"
        protocol = instance.get("protocol") or "https"
        verify_raw = instance.get("verify_ssl")
        if isinstance(verify_raw, bool):
            verify = verify_raw
        elif isinstance(verify_raw, str):
            verify = verify_raw.lower() in {"1", "true", "t", "yes", "y"}
        else:
            verify = False

        config = VyOSDeviceConfig(
            hostname=instance["host"],
            apikey=instance["api_key"],  # VyOS API key from database
            version=version,
            protocol=protocol,
            port=instance.get("port", 443),
            verify=verify,
            timeout=30,
        )

        # Register the service
        _session_device_registry.register(instance_id, config)
        service = _session_device_registry.get(instance_id)

        # Pre-cache the full configuration for performance
        try:
            service.get_full_config()
        except Exception as e:
            # Log warning but don't fail - config will be fetched on first use
            print(f"[SessionVyOSService] Warning: Could not pre-cache config for instance {instance_id}: {type(e).__name__}: {str(e)}")

        return service

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to create VyOS service: {str(e)}"
        )


def clear_session_cache(instance_id: str) -> None:
    """
    Clear cached VyOS service for a specific instance.

    Useful when instance credentials change or to force reconnection.
    """
    _session_device_registry.unregister(instance_id)


def clear_all_session_caches() -> None:
    """
    Clear all cached VyOS services.

    Useful for cleanup or testing.
    """
    _session_device_registry.clear()
