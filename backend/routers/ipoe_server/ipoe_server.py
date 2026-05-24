"""
IPoE Server Router

API endpoints for managing VyOS IPoE (IP over Ethernet) server configuration.
"""

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field
from typing import List, Dict, Optional, Any
from session_vyos_service import get_session_vyos_service
from vyos_builders.ipoe_server import IPoEServerBatchBuilder
from fastapi_permissions import require_read_permission, require_write_permission
from rbac_permissions import FeatureGroup
from starlette.concurrency import run_in_threadpool
import inspect
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/vyos/ipoe-server", tags=["ipoe-server"])

_INTERNAL_BUILDER_METHODS = frozenset({
    "add_set", "add_delete", "get_operations", "is_empty", "clear",
    "operation_count", "get_capabilities",
})


# ========================================================================
# Pydantic Models
# ========================================================================

class IPoEBatchOperation(BaseModel):
    op: str = Field(..., description="Builder method name")
    value: Optional[str] = Field(None, description="Operation value (use | as separator for multi-arg)")


class IPoEBatchRequest(BaseModel):
    item_name: str = Field(..., description="Primary identifier (interface, pool name, RADIUS server IP, or 'ipoe' for global ops)")
    operations: List[IPoEBatchOperation]


class VyOSResponse(BaseModel):
    success: bool
    data: Optional[Dict[str, Any]] = None
    error: Optional[str] = None


# ========================================================================
# Endpoint 1: Capabilities
# ========================================================================

@router.get("/capabilities")
async def get_ipoe_capabilities(request: Request):
    await require_read_permission(request, FeatureGroup.IPOE_SERVER)
    try:
        service = get_session_vyos_service(request)
        builder = IPoEServerBatchBuilder(version=service.get_version())
        return builder.get_capabilities()
    except HTTPException:
        raise
    except Exception:
        logger.exception("Unhandled error in ipoe capabilities")
        raise HTTPException(status_code=500, detail="Internal server error")


# ========================================================================
# Endpoint 2: Config
# ========================================================================

@router.get("/config")
async def get_ipoe_config(http_request: Request, refresh: bool = False):
    await require_read_permission(http_request, FeatureGroup.IPOE_SERVER)
    try:
        service = get_session_vyos_service(http_request)
        full_config = await run_in_threadpool(service.get_full_config, refresh=refresh)

        from vyos_mappers.ipoe_server import IPoEServerMapper
        mapper = IPoEServerMapper(service.get_version())
        config = mapper.parse_config(full_config)

        if not config["configured"]:
            return config

        # Convert dict-keyed collections to lists for the frontend
        auth_interfaces = []
        for iface, iface_data in config["authentication"].get("interfaces", {}).items():
            macs = list(iface_data.get("macs", {}).values())
            auth_interfaces.append({**iface_data, "macs": macs})

        radius_servers = list(config["authentication"].get("radius", {}).get("servers", {}).values())

        client_ip_pools = list(config["client_ip_pools"].values())
        client_ipv6_pools = list(config["client_ipv6_pools"].values())
        interfaces = list(config["interfaces"].values())

        return {
            "configured": True,
            "description": config["description"],
            "default_pool": config["default_pool"],
            "default_ipv6_pool": config["default_ipv6_pool"],
            "gateway_addresses": config["gateway_addresses"],
            "name_servers": config["name_servers"],
            "max_concurrent_sessions": config["max_concurrent_sessions"],
            "thread_count": config["thread_count"],
            "lua_file": config["lua_file"],
            "log": config["log"],
            "shaper": config["shaper"],
            "snmp": config["snmp"],
            "extended_scripts": config["extended_scripts"],
            "limits": config["limits"],
            "authentication": {
                "mode": config["authentication"].get("mode"),
                "interfaces": auth_interfaces,
                "radius": {
                    **{k: v for k, v in config["authentication"].get("radius", {}).items() if k != "servers"},
                    "servers": radius_servers,
                },
            },
            "client_ip_pools": client_ip_pools,
            "client_ipv6_pools": client_ipv6_pools,
            "interfaces": interfaces,
            "totals": {
                "auth_interfaces": len(auth_interfaces),
                "radius_servers": len(radius_servers),
                "client_ip_pools": len(client_ip_pools),
                "client_ipv6_pools": len(client_ipv6_pools),
                "interfaces": len(interfaces),
            },
        }
    except HTTPException:
        raise
    except Exception:
        logger.exception("Unhandled error in ipoe config")
        raise HTTPException(status_code=500, detail="Internal server error")


# ========================================================================
# Endpoint 3: Batch
# ========================================================================

@router.post("/batch", response_model=VyOSResponse)
async def ipoe_batch_configure(http_request: Request, body: IPoEBatchRequest):
    await require_write_permission(http_request, FeatureGroup.IPOE_SERVER)
    try:
        service = get_session_vyos_service(http_request)
        builder = IPoEServerBatchBuilder(version=service.get_version())

        for operation in body.operations:
            if operation.op.startswith("_") or operation.op in _INTERNAL_BUILDER_METHODS:
                raise HTTPException(status_code=400, detail=f"Invalid operation: {operation.op}")

            method = getattr(builder, operation.op, None)
            if not callable(method):
                raise HTTPException(status_code=400, detail=f"Unknown operation: {operation.op}")

            sig = inspect.signature(method)
            params = [p for p in sig.parameters.keys() if p != "self"]

            args = []
            if len(params) >= 1:
                args.append(body.item_name)
            if len(params) >= 2 and operation.value is not None:
                if len(params) >= 3:
                    parts = operation.value.split("|", len(params) - 2)
                    args.extend(parts)
                else:
                    args.append(operation.value)

            method(*args)

        if builder.is_empty():
            return VyOSResponse(success=True, data={"message": "No operations to execute"})

        response = service.execute_batch(builder)
        return VyOSResponse(
            success=response.status == 200,
            data={"message": "IPoE server configuration updated"},
            error=response.error if response.error else None,
        )
    except HTTPException:
        raise
    except Exception:
        logger.exception("Unhandled error in ipoe batch")
        raise HTTPException(status_code=500, detail="Internal server error")
