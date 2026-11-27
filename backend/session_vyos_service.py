"""
Session-Aware VyOS Service

Provides VyOS service instances based on the user's active session.
Replaces the single-device pattern with dynamic multi-instance support.
"""

from fastapi import Request, HTTPException
from vyos_service import VyOSService, VyOSDeviceConfig, VyOSDeviceRegistry
import appliance_mode
import logging

logger = logging.getLogger(__name__)


# Global registry for session-based VyOS services
# Key format: "instance_id"
_session_device_registry = VyOSDeviceRegistry()


def require_session_instance(request: Request) -> dict:
    """Return the request's active instance, or raise the no-instance 400.

    Reads request state only, so a route that needs the instance id but no
    device I/O can call it on the event loop.
    """
    instance = getattr(request.state, "instance", None)
    if not instance:
        raise HTTPException(
            status_code=400,
            detail={
                "error": "No active instance",
                "message": "You must connect to a VyOS instance first.",
                "redirect": appliance_mode.no_instance_redirect(),
            },
        )
    return instance


def get_session_vyos_service(request: Request) -> VyOSService:
    """
    Get VyOS service for the user's active session.

    This function:
    1. Checks if user has an active session (set by SessionMiddleware)
    2. Retrieves instance details from request.state.instance
    3. Creates or returns cached VyOS service for that instance, with no device I/O
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
    instance = require_session_instance(request)

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
            apikey=instance["api_key"].value,  # unwrap _SecureStr to get the actual key
            version=version,
            protocol=protocol,
            port=instance.get("port", 443),
            verify=verify,
            timeout=instance.get("timeout") or 10,
            commit_confirm_enabled=instance.get("commit_confirm_enabled") or False,
            commit_confirm_minutes=instance.get("commit_confirm_minutes") or 5,
            instance_id=instance_id,
        )

        # Register the service. Config is not pre-fetched here: this lookup
        # runs on the event loop, and the first get_full_config call (offloaded
        # by the routers) fills the cache.
        _session_device_registry.register(instance_id, config)
        return _session_device_registry.get(instance_id)

    except Exception as e:
        logger.exception("Failed to create VyOS service for instance %s", instance.get("id", "unknown"))
        raise HTTPException(
            status_code=500,
            detail="Internal server error"
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
