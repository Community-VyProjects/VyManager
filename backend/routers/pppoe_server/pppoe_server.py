"""
PPPoE Server Router

API endpoints for managing VyOS PPPoE server configuration.
"""

from fastapi import APIRouter, HTTPException, Query, Request
from pydantic import BaseModel, Field, field_validator
from typing import List, Optional, Dict, Any, cast
import json
import math
import sys
from session_vyos_service import get_session_vyos_service
from vyos_builders.pppoe_server import PPPoEServerBatchBuilder
from vyos_mappers import CommandMapperRegistry
from vyos_mappers.pppoe_server import PPPoEServerMapper
from fastapi_permissions import require_read_permission, require_write_permission
from rbac_permissions import FeatureGroup
from org_scope import request_scoped_conn
from starlette.concurrency import run_in_threadpool
from pppoe_status import (
    PPPoESessionsResponse,
    PPPoESessionsUnavailable,
    load_pppoe_sessions,
)
import logging
import uuid
from batch_dispatch import call_item_batch_op

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

    @field_validator("item_name")
    @classmethod
    def _item_name_not_blank(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("item_name must not be blank")
        return value


class VyOSResponse(BaseModel):
    success: bool
    data: Optional[Dict[str, Any]] = None
    error: Optional[str] = None


class PPPoELocalUserRateLimit(BaseModel):
    download: Optional[str] = None
    upload: Optional[str] = None


class PPPoELocalUser(BaseModel):
    username: str
    password: Optional[str] = None
    disabled: bool
    static_ip: Optional[str] = None
    rate_limit: PPPoELocalUserRateLimit


class PPPoERadiusServer(BaseModel):
    address: str
    key: Optional[str] = None
    port: Optional[str] = None
    acct_port: Optional[str] = None
    priority: Optional[str] = None
    fail_time: Optional[str] = None
    disabled: bool
    backup: bool
    disable_accounting: bool


class PPPoERadiusDynamicAuthor(BaseModel):
    server: Optional[str] = None
    port: Optional[str] = None
    key: Optional[str] = None


class PPPoERadiusRateLimit(BaseModel):
    enable: bool
    attribute: Optional[str] = None
    vendor: Optional[str] = None
    multiplier: Optional[str] = None


class PPPoERadiusSettings(BaseModel):
    servers: List[PPPoERadiusServer]
    source_address: Optional[str] = None
    timeout: Optional[str] = None
    max_try: Optional[str] = None
    nas_identifier: Optional[str] = None
    nas_ip_address: Optional[str] = None
    accounting_interim_interval: Optional[str] = None
    acct_interim_jitter: Optional[str] = None
    acct_timeout: Optional[str] = None
    preallocate_vif: bool
    called_sid_format: Optional[str] = None
    dynamic_author: PPPoERadiusDynamicAuthor
    rate_limit: PPPoERadiusRateLimit


class PPPoEAuthentication(BaseModel):
    mode: Optional[str] = None
    protocols: List[str]
    any_login: bool
    local_users: List[PPPoELocalUser]
    radius: PPPoERadiusSettings


class PPPoEPadoDelay(BaseModel):
    delay: str
    sessions: Optional[str] = None


class PPPoELog(BaseModel):
    level: Optional[str] = None


class PPPoEShaper(BaseModel):
    enabled: bool
    fwmark: Optional[str] = None


class PPPoESnmp(BaseModel):
    enabled: bool
    master_agent: bool


class PPPoEExtendedScripts(BaseModel):
    enabled: bool
    on_change: Optional[str] = None
    on_down: Optional[str] = None
    on_pre_up: Optional[str] = None
    on_up: Optional[str] = None


class PPPoELimits(BaseModel):
    enabled: bool
    burst: Optional[str] = None
    connection_limit: Optional[str] = None
    timeout: Optional[str] = None


class PPPoEPppOptions(BaseModel):
    ipv4: Optional[str] = None
    ipv6: Optional[str] = None
    mppe: Optional[str] = None
    disable_ccp: bool
    interface_cache: Optional[str] = None
    ipv6_interface_id: Optional[str] = None
    ipv6_peer_interface_id: Optional[str] = None
    ipv6_peer_interface_id_secret: Optional[str] = None
    ipv6_accept_peer_interface_id: bool
    lcp_echo_failure: Optional[str] = None
    lcp_echo_interval: Optional[str] = None
    lcp_echo_timeout: Optional[str] = None
    min_mtu: Optional[str] = None
    mru: Optional[str] = None


class PPPoEIPv4Pool(BaseModel):
    name: str
    ranges: List[str]
    next_pool: Optional[str] = None


class PPPoEIPv6Prefix(BaseModel):
    prefix: str
    mask: Optional[str] = None


class PPPoEIPv6Delegate(BaseModel):
    prefix: str
    delegation_prefix: Optional[str] = None


class PPPoEIPv6Pool(BaseModel):
    name: str
    prefixes: List[PPPoEIPv6Prefix]
    delegates: List[PPPoEIPv6Delegate]


class PPPoEInterface(BaseModel):
    interface: str
    vlans: List[str]
    vlan_mon: bool
    combined: bool


class PPPoETotals(BaseModel):
    local_users: int
    radius_servers: int
    client_ip_pools: int
    client_ipv6_pools: int
    interfaces: int


class PPPoEConfig(BaseModel):
    configured: bool
    description: Optional[str] = None
    access_concentrator: Optional[str] = None
    service_names: List[str]
    gateway_address: Optional[str] = None
    name_servers: List[str]
    wins_servers: List[str]
    mtu: Optional[str] = None
    max_concurrent_sessions: Optional[str] = None
    thread_count: Optional[str] = None
    default_pool: Optional[str] = None
    default_ipv6_pool: Optional[str] = None
    session_control: Optional[str] = None
    accept_any_service: bool
    accept_blank_service: bool
    pado_delays: List[PPPoEPadoDelay]
    log: PPPoELog
    shaper: PPPoEShaper
    snmp: PPPoESnmp
    extended_scripts: PPPoEExtendedScripts
    limits: PPPoELimits
    ppp_options: PPPoEPppOptions
    authentication: PPPoEAuthentication
    client_ip_pools: List[PPPoEIPv4Pool]
    client_ipv6_pools: List[PPPoEIPv6Pool]
    interfaces: List[PPPoEInterface]
    totals: PPPoETotals


def _mapper(version: str) -> PPPoEServerMapper:
    return cast(PPPoEServerMapper, CommandMapperRegistry.get_mapper("pppoe_server", version))


class PPPoESessionLabelDefinitionResponse(BaseModel):
    code: str
    name: str
    description: Optional[str] = None
    severity: str = "info"
    priority: int = 10
    enabled: bool = True
    rules: Dict[str, Any] = Field(default_factory=dict)


DEFAULT_PPPoE_SESSION_LABELS: List[Dict[str, Any]] = [
    {
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


def _require_instance(request: Request) -> str:
    instance = getattr(request.state, "instance", None)
    if not instance:
        raise HTTPException(status_code=404, detail="No active instance")
    return instance["id"]


def _row_to_label_response(row) -> PPPoESessionLabelDefinitionResponse:
    rules = row["rules"]
    if isinstance(rules, str):
        try:
            rules = json.loads(rules)
        except Exception:
            rules = {}
    return PPPoESessionLabelDefinitionResponse(
        code=row["code"],
        name=row["name"],
        description=row["description"],
        severity=row["severity"],
        priority=row["priority"],
        enabled=row["enabled"],
        rules=rules if isinstance(rules, dict) else {},
    )


async def _fetch_labels(conn, instance_id: str) -> List[PPPoESessionLabelDefinitionResponse]:
    rows = await conn.fetch(
        """
        SELECT code, name, description, severity, priority, enabled, rules
        FROM pppoe_session_label_definitions
        WHERE "instanceId" = $1
        ORDER BY priority ASC, code ASC
        """,
        instance_id,
    )
    return [_row_to_label_response(row) for row in rows]


async def _seed_default_labels(conn, instance_id: str) -> None:
    """Insert shipped defaults only when this instance has no rows yet."""
    count = await conn.fetchval(
        'SELECT count(*) FROM pppoe_session_label_definitions WHERE "instanceId" = $1',
        instance_id,
    )
    if count:
        return
    for label in DEFAULT_PPPoE_SESSION_LABELS:
        await conn.execute(
            """
            INSERT INTO pppoe_session_label_definitions
            (id, "instanceId", code, name, description, severity, priority, enabled, rules, "createdAt", "updatedAt")
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, NOW(), NOW())
            ON CONFLICT ("instanceId", code) DO NOTHING
            """,
            str(uuid.uuid4()), instance_id,
            label["code"], label["name"], label["description"],
            label["severity"], label["priority"],
            label["enabled"], json.dumps(label["rules"]),
        )


# ========================================================================
# Endpoint 0: Session labels
# ========================================================================

@router.get("/labels", response_model=List[PPPoESessionLabelDefinitionResponse])
async def get_pppoe_session_labels(request: Request):
    """Return the instance-scoped PPPoE session label registry.

    Overlay metadata stored by Prisma, not VyOS config. An empty catalog for
    this instance is seeded with the shipped traffic-skew default once.
    """
    await require_read_permission(request, FeatureGroup.PPPOE)
    instance_id = _require_instance(request)
    try:
        async with request_scoped_conn(request) as conn:
            await _seed_default_labels(conn, instance_id)
            return await _fetch_labels(conn, instance_id)

    except HTTPException:
        raise
    except Exception:
        logger.exception("Unhandled error in PPPoE session label lookup")
        raise HTTPException(status_code=500, detail="Unable to read PPPoE session label registry")


# Column sizes of pppoe_session_label_definitions (prisma migration).
_LABEL_CODE_MAX = 80
_LABEL_NAME_MAX = 120
_LABEL_SEVERITY_MAX = 40
# priority is an INTEGER column.
_LABEL_PRIORITY_MIN = -(2**31)
_LABEL_PRIORITY_MAX = 2**31 - 1
_LABEL_FACTOR_MIN = 0


def _factor_valid(factor: Any) -> bool:
    """A ratio factor is absent, or a finite float-sized number at or above the minimum.

    The browser reads the factor back as a JS number, so an int beyond the
    float range (Infinity there) is rejected too. Ints are compared without
    ``math.isfinite``, which overflows on them.
    """
    if factor is None:
        return True
    if isinstance(factor, bool) or not isinstance(factor, (int, float)):
        return False
    if isinstance(factor, float) and not math.isfinite(factor):
        return False
    if isinstance(factor, int) and factor > sys.float_info.max:
        return False
    return factor >= _LABEL_FACTOR_MIN


def _checked_labels(body: List[PPPoESessionLabelDefinitionResponse]) -> List[PPPoESessionLabelDefinitionResponse]:
    """Trim each label and reject a row the table would refuse, naming it.

    The save replaces the whole catalog, so a bad row is a 400, never dropped.
    """
    labels: List[PPPoESessionLabelDefinitionResponse] = []
    seen: set = set()
    for item in body:
        code = item.code.strip()
        name = item.name.strip()
        severity = item.severity.strip() or "info"
        if not code and not name:
            raise HTTPException(status_code=400, detail="A label needs both a code and a name")
        if not code or not name:
            raise HTTPException(status_code=400, detail=f"Label {code or name!r} needs both a code and a name")
        if len(code) > _LABEL_CODE_MAX or len(name) > _LABEL_NAME_MAX or len(severity) > _LABEL_SEVERITY_MAX:
            raise HTTPException(status_code=400, detail=f"Label {code!r} is too long")
        if not _LABEL_PRIORITY_MIN <= item.priority <= _LABEL_PRIORITY_MAX:
            raise HTTPException(status_code=400, detail=f"Label {code!r} priority is out of range")
        if not _factor_valid(item.rules.get("factor")):
            raise HTTPException(
                status_code=400,
                detail=f"Label {code!r} ratio factor must be a number of {_LABEL_FACTOR_MIN} or more",
            )
        if code in seen:
            raise HTTPException(status_code=400, detail=f"Duplicate label code {code!r}")
        seen.add(code)
        labels.append(item.model_copy(update={"code": code, "name": name, "severity": severity}))
    return labels


@router.post("/labels", response_model=List[PPPoESessionLabelDefinitionResponse])
async def save_pppoe_session_labels(request: Request, body: List[PPPoESessionLabelDefinitionResponse]):
    """Replace this instance's PPPoE session label catalog.

    The request body is the full desired list. Defaults are not re-inserted, so
    an operator can delete the shipped traffic-skew entry.
    """
    await require_write_permission(request, FeatureGroup.PPPOE)
    instance_id = _require_instance(request)
    labels = _checked_labels(body)
    try:

        async with request_scoped_conn(request) as conn:
            async with conn.transaction():
                await conn.execute(
                    'DELETE FROM pppoe_session_label_definitions WHERE "instanceId" = $1',
                    instance_id,
                )
                for label in labels:
                    await conn.execute(
                        """
                        INSERT INTO pppoe_session_label_definitions
                        (id, "instanceId", code, name, description, severity, priority, enabled, rules, "createdAt", "updatedAt")
                        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, NOW(), NOW())
                        """,
                        str(uuid.uuid4()), instance_id, label.code, label.name, label.description,
                        label.severity, label.priority,
                        label.enabled, json.dumps(label.rules),
                    )

                return await _fetch_labels(conn, instance_id)

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

@router.get("/config", response_model=PPPoEConfig)
async def get_pppoe_config(http_request: Request, refresh: bool = False):
    await require_read_permission(http_request, FeatureGroup.PPPOE)
    try:
        service = get_session_vyos_service(http_request)
        full_config = await run_in_threadpool(service.get_full_config, refresh=refresh)
        return PPPoEConfig(**_mapper(service.get_version()).parse_config(full_config))
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

    Session counters come from ``ShowSessionsAccelppp``. Live MTUs come from
    ``ShowInterfaces`` on the same GraphQL POST and are joined by PPP interface.
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
    username = username.strip()
    if not username or username in {".", ".."} or any(char in username for char in "\r\n"):
        raise HTTPException(status_code=400, detail="Invalid PPPoE username")

    try:
        service = get_session_vyos_service(http_request)
        response = await run_in_threadpool(
            service.device.reset,
            path=_mapper(service.get_version()).session_reset_path(username),
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


# ========================================================================
# Endpoint 5: Batch
# ========================================================================

@router.post("/batch", response_model=VyOSResponse)
async def pppoe_batch_configure(http_request: Request, body: PPPoEBatchRequest):
    await require_write_permission(http_request, FeatureGroup.PPPOE)
    try:
        service = get_session_vyos_service(http_request)
        builder = PPPoEServerBatchBuilder(version=service.get_version())

        try:
            # Every op takes the request item (global ops ignore it); the value
            # fills the remaining parameters, split on "|" (test_pppoe_server_router
            # locks the arity).
            for operation in body.operations:
                call_item_batch_op(builder, operation.op, body.item_name, operation.value)
        except ValueError as exc:
            # The mapper raises ValueError for a leaf this VyOS version lacks.
            raise HTTPException(status_code=400, detail=str(exc))

        if builder.is_empty():
            return VyOSResponse(success=True, data={"message": "No operations to execute"})

        response = await run_in_threadpool(service.execute_batch, builder)
        return VyOSResponse(
            success=response.status == 200,
            data={"message": "PPPoE server configuration updated"} if response.status == 200 else None,
            error=response.error if response.error else None,
        )
    except HTTPException:
        raise
    except Exception:
        logger.exception("Unhandled error in pppoe batch")
        raise HTTPException(status_code=500, detail="Internal server error")