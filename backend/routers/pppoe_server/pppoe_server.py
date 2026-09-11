"""
PPPoE Server Router

API endpoints for managing VyOS PPPoE server configuration.
"""

from fastapi import APIRouter, HTTPException, Query, Request
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
import asyncio
import ipaddress
from urllib.parse import unquote
from session_vyos_service import get_session_vyos_service
from vyos_builders.pppoe_server import PPPoEServerBatchBuilder
from fastapi_permissions import require_read_permission, require_write_permission
from rbac_permissions import FeatureGroup
from starlette.concurrency import run_in_threadpool
from pppoe_status import (
    PPPoEStatsStore,
    PPPoEPpsTracker,
    PPPoESessionsResponse,
    parse_pppoe_sessions,
)
import inspect
import logging
from batch_dispatch import resolve_batch_method

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/vyos/pppoe-server", tags=["pppoe-server"])
_pppoe_stats_store = PPPoEStatsStore()


# ========================================================================
# Pydantic Models
# ========================================================================

class PPPoEBatchOperation(BaseModel):
    op: str = Field(..., description="Builder method name")
    value: Optional[str] = Field(None, description="Operation value (use | as separator for multi-arg)")


class PPPoEBatchRequest(BaseModel):
    item_name: str = Field(..., description="Primary identifier (interface, pool name, username, RADIUS server IP, or 'pppoe' for global ops)")
    operations: List[PPPoEBatchOperation]


class VyOSResponse(BaseModel):
    success: bool
    data: Optional[Dict[str, Any]] = None
    error: Optional[str] = None


class PPPoEConnectionsResponse(BaseModel):
    interface: str
    ip: str
    connections: List[str]
    total: int


# ========================================================================
# Endpoint 1: Capabilities
# ========================================================================

@router.get("/capabilities")
async def get_pppoe_capabilities(request: Request):
    await require_read_permission(request, FeatureGroup.PPPOE)
    try:
        service = get_session_vyos_service(request)
        builder = PPPoEServerBatchBuilder(version=service.get_version())
        return builder.get_capabilities()
    except HTTPException:
        raise
    except Exception:
        logger.exception("Unhandled error in pppoe capabilities")
        raise HTTPException(status_code=500, detail="Internal server error")


# ========================================================================
# Endpoint 2: Config
# ========================================================================

@router.get("/config")
async def get_pppoe_config(http_request: Request, refresh: bool = False):
    await require_read_permission(http_request, FeatureGroup.PPPOE)
    try:
        service = get_session_vyos_service(http_request)
        full_config = await run_in_threadpool(service.get_full_config, refresh=refresh)

        from vyos_mappers.pppoe_server import PPPoEServerMapper
        mapper = PPPoEServerMapper(service.get_version())
        return mapper.parse_config(full_config)
    except HTTPException:
        raise
    except Exception:
        logger.exception("Unhandled error in pppoe config")
        raise HTTPException(status_code=500, detail="Internal server error")


# ========================================================================
# Endpoint 3: Active sessions
# ========================================================================

@router.get("/sessions", response_model=PPPoESessionsResponse)
async def get_pppoe_sessions(
    http_request: Request,
    limit: int = Query(default=500, ge=1, le=1000),
    offset: int = Query(default=0, ge=0),
):
    """Return active PPPoE sessions and backend-maintained PPS snapshots.

    The backend will not hammer every PPPoE interface statistics endpoint on
    each request. Instead, it spreads one survey per session across a
    configurable rolling window, and returns stored RX/TX PPS values from the
    backend-owned stats store.
    """
    await require_read_permission(http_request, FeatureGroup.PPPOE)
    try:
        service = get_session_vyos_service(http_request)
        response = await run_in_threadpool(service.device.show, path=["pppoe-server", "sessions"])
        if response.status != 200:
            raise HTTPException(
                status_code=502,
                detail=response.error or "Unable to read PPPoE sessions",
            )
        output = response.result.get("data", "") if isinstance(response.result, dict) else response.result
        sessions = parse_pppoe_sessions(output or "")

        # Spread the statistics query load over the configured window so the
        # backend stores PPS values and only samples sessions when due.
        await _pppoe_stats_store.sample_due_sessions(service, sessions)

        total = len(sessions)
        page = sessions[offset:offset + limit]
        return PPPoESessionsResponse(
            sessions=page,
            total=total,
        )
    except HTTPException:
        raise
    except Exception:
        logger.exception("Unhandled error in pppoe sessions")
        raise HTTPException(status_code=500, detail="Internal server error")


# ========================================================================
# Endpoint 4: Reset a user session
# ========================================================================

@router.post("/sessions/{username}/reset", response_model=VyOSResponse)
async def reset_pppoe_session(http_request: Request, username: str):
    """Terminate all active PPPoE sessions belonging to a username."""
    await require_write_permission(http_request, FeatureGroup.PPPOE)
    username = unquote(username).strip()
    if not username or username in {".", ".."} or any(char in username for char in "\r\n"):
        raise HTTPException(status_code=400, detail="Invalid PPPoE username")

    try:
        service = get_session_vyos_service(http_request)
        response = await run_in_threadpool(
            service.device.reset,
            path=["pppoe-server", "username", username],
        )
        if response.status != 200:
            return VyOSResponse(
                success=False,
                error=response.error or f"Failed to reset PPPoE sessions for {username}",
            )
        return VyOSResponse(
            success=True,
            data={"message": f"PPPoE sessions reset for {username}"},
        )
    except HTTPException:
        raise
    except Exception:
        logger.exception("Unhandled error resetting PPPoE sessions for %s", username)
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/sessions/{interface}/connections", response_model=PPPoEConnectionsResponse)
async def get_pppoe_session_connections(
    http_request: Request,
    interface: str,
    ip: str,
    limit: int = Query(default=500, ge=1, le=2000),
):
    """Return conntrack entries containing the selected PPPoE client's IP."""
    await require_read_permission(http_request, FeatureGroup.PPPOE)
    try:
        ipaddress.ip_interface(ip)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail="Invalid PPPoE session IP") from exc
    if not interface or any(char in interface for char in "\r\n|;"):
        raise HTTPException(status_code=400, detail="Invalid PPPoE session interface")

    try:
        service = get_session_vyos_service(http_request)
        response = await run_in_threadpool(service.device.show, path=["conntrack"])
        if response.status != 200:
            raise HTTPException(
                status_code=502,
                detail=response.error or "Unable to read conntrack entries",
            )
        output = response.result.get("data", "") if isinstance(response.result, dict) else response.result
        address = str(ipaddress.ip_interface(ip).ip)
        connections = [
            line.strip()
            for line in (output or "").splitlines()
            if address in line
        ]
        return PPPoEConnectionsResponse(
            interface=interface,
            ip=address,
            connections=connections[:limit],
            total=len(connections),
        )
    except HTTPException:
        raise
    except Exception:
        logger.exception("Unhandled error reading PPPoE connections for %s", interface)
        raise HTTPException(status_code=500, detail="Internal server error")


# ========================================================================
# Endpoint 3: Batch
# ========================================================================

@router.post("/batch", response_model=VyOSResponse)
async def pppoe_batch_configure(http_request: Request, body: PPPoEBatchRequest):
    await require_write_permission(http_request, FeatureGroup.PPPOE)
    try:
        service = get_session_vyos_service(http_request)
        builder = PPPoEServerBatchBuilder(version=service.get_version())

        for operation in body.operations:

            method = resolve_batch_method(builder, operation.op)

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
            data={"message": "PPPoE server configuration updated"},
            error=response.error if response.error else None,
        )
    except HTTPException:
        raise
    except Exception:
        logger.exception("Unhandled error in pppoe batch")
        raise HTTPException(status_code=500, detail="Internal server error")