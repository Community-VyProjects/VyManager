"""
PPPoE Server Router

API endpoints for managing VyOS PPPoE server configuration.
"""

from fastapi import APIRouter, HTTPException, Query, Request
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
import asyncio
import ipaddress
import json
from urllib.parse import unquote
from session_vyos_service import get_session_vyos_service
from vyos_builders.pppoe_server import PPPoEServerBatchBuilder
from fastapi_permissions import require_read_permission, require_write_permission
from rbac_permissions import FeatureGroup
from org_scope import request_scoped_conn
from starlette.concurrency import run_in_threadpool
from pppoe_status import (
    PPPoESessionsResponse,
    PPPoESessionsUnavailable,
    load_pppoe_sessions,
)
import inspect
import logging
import uuid
from batch_dispatch import resolve_batch_method

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/vyos/pppoe-server", tags=["pppoe-server"])


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


class PPPoESessionLabelDefinitionResponse(BaseModel):
    session_label: str = "*"
    code: str
    name: str
    description: Optional[str] = None
    severity: str = "info"
    priority: int = 10
    enabled: bool = True
    rules: Dict[str, Any] = Field(default_factory=dict)


DEFAULT_PPPoE_SESSION_LABELS: List[Dict[str, Any]] = [
    {
        "session_label": "*",
        "code": "traffic-skew",
        "name": "Traffic skew",
        "description": "Flag a session when upload (RX) bytes exceed 10% of download (TX) bytes, as a generic traffic-skew indicator.",
        "severity": "warning",
        "priority": 10,
        "enabled": True,
        "rules": {
            "type": "ratio",
            "numerator": "rx_bytes",
            "denominator": "tx_bytes",
            "operator": ">",
            "factor": 0.10,
        },
    },
]


async def _ensure_pppoe_label_table(conn) -> None:
    """Keep older deployments usable while Prisma applies the label migration."""
    await conn.execute(
        """
        CREATE TABLE IF NOT EXISTS pppoe_session_label_definitions (
            id TEXT PRIMARY KEY,
            "sessionLabel" TEXT NOT NULL DEFAULT '*',
            code VARCHAR(80) NOT NULL,
            name VARCHAR(120) NOT NULL,
            description TEXT,
            severity VARCHAR(40) NOT NULL DEFAULT 'info',
            priority INTEGER NOT NULL DEFAULT 10,
            enabled BOOLEAN NOT NULL DEFAULT TRUE,
            rules JSONB NOT NULL DEFAULT '{}'::jsonb,
            "createdAt" TIMESTAMP(3) NOT NULL DEFAULT NOW(),
            "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT NOW()
        )
        """
    )
    await conn.execute(
        """
        ALTER TABLE pppoe_session_label_definitions
        ADD COLUMN IF NOT EXISTS "sessionLabel" TEXT NOT NULL DEFAULT '*'
        """
    )
    await conn.execute(
        """
        CREATE UNIQUE INDEX IF NOT EXISTS
        pppoe_session_label_definitions_session_label_code_key
        ON pppoe_session_label_definitions ("sessionLabel", code)
        """
    )


async def _ensure_default_pppoe_labels(conn) -> None:
    """Upsert shipped default label definitions (e.g. traffic-skew) when missing."""
    await _ensure_pppoe_label_table(conn)
    for label in DEFAULT_PPPoE_SESSION_LABELS:
        await conn.execute(
            """
            INSERT INTO pppoe_session_label_definitions
            (id, "sessionLabel", code, name, description, severity, priority, enabled, rules, "createdAt", "updatedAt")
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, NOW(), NOW())
            ON CONFLICT ("sessionLabel", code) DO NOTHING
            """,
            str(uuid.uuid4()), label.get("session_label") or "*",
            label["code"], label["name"], label.get("description"),
            label.get("severity") or "info", int(label.get("priority") or 10),
            bool(label.get("enabled", True)), json.dumps(label.get("rules") or {}),
        )


def _row_to_label_response(row) -> PPPoESessionLabelDefinitionResponse:
    rules = row["rules"]
    if isinstance(rules, str):
        try:
            rules = json.loads(rules)
        except Exception:
            rules = {}
    return PPPoESessionLabelDefinitionResponse(
        session_label=row["sessionLabel"] or "*",
        code=row["code"],
        name=row["name"],
        description=row["description"],
        severity=row["severity"] or "info",
        priority=int(row["priority"] or 10),
        enabled=row["enabled"] if row["enabled"] is not None else True,
        rules=rules if isinstance(rules, dict) else {},
    )


# ========================================================================
# Endpoint 0: Session labels
# ========================================================================

@router.get("/labels", response_model=List[PPPoESessionLabelDefinitionResponse])
async def get_pppoe_session_labels(request: Request):
    """Return the Postgres-backed PPPoE session label registry.

    The first read from an empty registry table seeds the shipped default
    traffic-skew entry into database
    """
    await require_read_permission(request, FeatureGroup.PPPOE)
    try:
        async with request_scoped_conn(request) as conn:
            await _ensure_default_pppoe_labels(conn)
            rows = await conn.fetch(
                """
                SELECT "sessionLabel", code, name, description, severity, priority, enabled, rules
                FROM pppoe_session_label_definitions
                ORDER BY priority ASC, code ASC
                """
            )
            return [_row_to_label_response(row) for row in rows]

    except HTTPException:
        raise
    except Exception:
        logger.exception("Unhandled error in PPPoE session label lookup")
        return []


@router.post("/labels", response_model=List[PPPoESessionLabelDefinitionResponse])
async def save_pppoe_session_labels(request: Request, body: List[PPPoESessionLabelDefinitionResponse]):
    """Persist the authoritative PPPoE session label registry in Postgres.

    The request body is the full desired label catalog. The route replaces the
    stored registry table with the new list so the frontend editor and the API
    remain in a single canonical state.
    """
    await require_write_permission(request, FeatureGroup.PPPOE)
    try:
        labels = []
        for item in body:
            if not item.code or not item.name:
                continue
            labels.append(item)

        async with request_scoped_conn(request) as conn:
            await _ensure_pppoe_label_table(conn)
            await conn.execute(
                'DELETE FROM pppoe_session_label_definitions WHERE "sessionLabel" = $1', "*"
            )
            for label in labels:
                await conn.execute(
                    """
                    INSERT INTO pppoe_session_label_definitions
                    (id, "sessionLabel", code, name, description, severity, priority, enabled, rules)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb)
                    ON CONFLICT ("sessionLabel", code)
                    DO UPDATE SET
                        name = EXCLUDED.name,
                        description = EXCLUDED.description,
                        severity = EXCLUDED.severity,
                        priority = EXCLUDED.priority,
                        enabled = EXCLUDED.enabled,
                        rules = EXCLUDED.rules,
                        "updatedAt" = NOW()
                    """,
                    str(uuid.uuid4()), label.session_label or "*", label.code, label.name, label.description,
                    label.severity or "info", int(label.priority or 10),
                    bool(label.enabled if label.enabled is not None else True), json.dumps(label.rules or {}),
                )

            await _ensure_default_pppoe_labels(conn)

            rows = await conn.fetch(
                """
                SELECT "sessionLabel", code, name, description, severity, priority, enabled, rules
                FROM pppoe_session_label_definitions
                ORDER BY priority ASC, code ASC
                """
            )
            return [_row_to_label_response(row) for row in rows]

    except HTTPException:
        raise
    except Exception:
        logger.exception("Unhandled error saving PPPoE session label registry")
        raise HTTPException(status_code=500, detail="Unable to save PPPoE session label registry")


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
    search: str = Query(default="", max_length=200),
    min_rx_bytes: Optional[int] = Query(default=None, ge=0),
    max_rx_bytes: Optional[int] = Query(default=None, ge=0),
    min_tx_bytes: Optional[int] = Query(default=None, ge=0),
    max_tx_bytes: Optional[int] = Query(default=None, ge=0),
    mtu: Optional[int] = Query(default=None, ge=1),
    sort: str = Query(default="username", max_length=40),
    direction: str = Query(default="asc", pattern="^(asc|desc)$"),
):
    """Return active PPPoE sessions with per-session packet counters and PPS.

    Session counters come from ``ShowSessionsAccelppp``. Live MTUs come from a
    separate ``ShowInterfaces`` GraphQL lookup and are joined by PPP interface.
    PPS is derived from the counter deltas between polls. If the structured
    session operation is unavailable, the endpoint falls back to parsing the
    ``show pppoe-server sessions`` text table, which has no packet counters, so
    PPS is left unset.

    Live consumers should prefer the dashboard SSE ``pppoe-sessions`` event;
    this REST path remains for a one-shot refresh.
    """
    await require_read_permission(http_request, FeatureGroup.PPPOE)
    try:
        service = get_session_vyos_service(http_request)
        try:
            sessions = await load_pppoe_sessions(service)
        except PPPoESessionsUnavailable as exc:
            raise HTTPException(status_code=502, detail=exc.detail) from exc

        needle = search.strip().lower()
        if needle:
            sessions = [
                session for session in sessions
                if needle in " ".join(str(value or "") for value in (
                    session.username, session.interface, session.ip,
                    session.ipv6, session.calling_sid,
                )).lower()
            ]
        if min_rx_bytes is not None:
            sessions = [session for session in sessions if session.rx_bytes >= min_rx_bytes]
        if max_rx_bytes is not None:
            sessions = [session for session in sessions if session.rx_bytes <= max_rx_bytes]
        if min_tx_bytes is not None:
            sessions = [session for session in sessions if session.tx_bytes >= min_tx_bytes]
        if max_tx_bytes is not None:
            sessions = [session for session in sessions if session.tx_bytes <= max_tx_bytes]
        if mtu is not None:
            sessions = [session for session in sessions if session.mtu == mtu]
        sort_values = {
            "username": lambda session: session.username.lower(),
            "interface": lambda session: session.interface.lower(),
            "ip": lambda session: session.ip or "",
            "rx_bytes": lambda session: session.rx_bytes,
            "tx_bytes": lambda session: session.tx_bytes,
            "mtu": lambda session: session.mtu or 0,
        }
        sessions.sort(
            key=sort_values.get(sort, sort_values["username"]),
            reverse=direction == "desc",
        )
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
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception:
        logger.exception("Unhandled error in pppoe batch")
        raise HTTPException(status_code=500, detail="Internal server error")