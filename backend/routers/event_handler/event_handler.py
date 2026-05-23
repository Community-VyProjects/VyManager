"""Event Handler Service Router.

API endpoints for managing VyOS event handler configuration.

Endpoints:
  GET  /vyos/event-handler/capabilities  — version-aware feature flags
  GET  /vyos/event-handler/config        — normalized event handler configuration
  POST /vyos/event-handler/batch         — atomic set/delete operations
"""

from fastapi import APIRouter, HTTPException, Request
from starlette.concurrency import run_in_threadpool
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from session_vyos_service import get_session_vyos_service
from vyos_builders.event_handler import EventHandlerBatchBuilder
from fastapi_permissions import require_read_permission, require_write_permission
from rbac_permissions import FeatureGroup
import inspect
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/vyos/event-handler", tags=["event-handler"])


# ============================================================================
# Pydantic Models
# ============================================================================


class EventFilter(BaseModel):
    pattern: Optional[str] = None
    syslog_identifier: Optional[str] = None


class EventEnvironmentVar(BaseModel):
    name: str
    value: Optional[str] = None


class EventScript(BaseModel):
    path: Optional[str] = None
    arguments: Optional[str] = None
    environment: List[EventEnvironmentVar] = []


class EventHandlerEntry(BaseModel):
    name: str
    filter: EventFilter = Field(default_factory=EventFilter)
    script: EventScript = Field(default_factory=EventScript)


class EventHandlerConfig(BaseModel):
    events: List[EventHandlerEntry] = []


class EventHandlerBatchOperation(BaseModel):
    op: str = Field(..., description="Builder method name")
    value: Optional[str] = Field(
        None,
        description=(
            "Argument(s) for the operation. "
            "Single-arg methods: plain string. "
            "Multi-arg methods: comma-separated."
        ),
    )


class EventHandlerBatchRequest(BaseModel):
    operations: List[EventHandlerBatchOperation]


class VyOSResponse(BaseModel):
    success: bool
    data: Optional[Dict[str, Any]] = None
    error: Optional[str] = None


# ============================================================================
# Internal builder method denylist
# ============================================================================

_INTERNAL_BUILDER_METHODS = frozenset({
    "add_set", "add_delete", "get_operations", "is_empty",
    "get_capabilities", "mappers", "version", "_operations", "m",
})


# ============================================================================
# Endpoint 1: Capabilities
# ============================================================================


@router.get("/capabilities")
async def get_event_handler_capabilities(request: Request):
    """Return event handler feature capabilities based on the VyOS version."""
    await require_read_permission(request, FeatureGroup.EVENT_HANDLER)
    try:
        service = get_session_vyos_service(request)
        builder = EventHandlerBatchBuilder(version=service.get_version())
        caps = builder.get_capabilities()
        if hasattr(request.state, "instance") and request.state.instance:
            caps["instance_name"] = request.state.instance.get("name")
            caps["instance_id"] = request.state.instance.get("id")
        return caps
    except Exception:
        logger.exception("Unhandled error in get_event_handler_capabilities")
        raise HTTPException(status_code=500, detail="Internal server error")


# ============================================================================
# Endpoint 2: Config
# ============================================================================


@router.get("/config", response_model=EventHandlerConfig)
async def get_event_handler_config(http_request: Request, refresh: bool = False):
    """Return the full event handler configuration in a normalized format."""
    await require_read_permission(http_request, FeatureGroup.EVENT_HANDLER)
    try:
        service = get_session_vyos_service(http_request)
        full_config = await run_in_threadpool(service.get_full_config, refresh=refresh)

        raw = full_config.get("service", {}).get("event-handler", {}).get("event", {})
        if not raw or not isinstance(raw, dict):
            return EventHandlerConfig()

        return EventHandlerConfig(events=_parse_events(raw))
    except Exception:
        logger.exception("Unhandled error in get_event_handler_config")
        raise HTTPException(status_code=500, detail="Internal server error")


# ============================================================================
# Endpoint 3: Batch Operations
# ============================================================================


@router.post("/batch", response_model=VyOSResponse)
async def event_handler_batch_configure(
    http_request: Request, body: EventHandlerBatchRequest
):
    """Execute a batch of event handler configuration operations atomically."""
    await require_write_permission(http_request, FeatureGroup.EVENT_HANDLER)
    try:
        service = get_session_vyos_service(http_request)
        builder = EventHandlerBatchBuilder(version=service.get_version())

        for operation in body.operations:
            if operation.op in _INTERNAL_BUILDER_METHODS or operation.op.startswith("_"):
                raise HTTPException(
                    status_code=400,
                    detail=f"Operation not allowed: {operation.op}",
                )

            method = getattr(builder, operation.op)
            sig = inspect.signature(method)
            params = [p for p in sig.parameters.keys() if p != "self"]

            if len(params) == 0:
                method()
            elif len(params) == 1:
                if operation.value is not None:
                    method(operation.value)
                else:
                    method()
            elif len(params) >= 2:
                if operation.value and "," in operation.value:
                    parts = operation.value.split(",", len(params) - 1)
                    method(*parts)
                elif operation.value:
                    method(operation.value)

        response = service.execute_batch(builder)
        return VyOSResponse(
            success=response.status == 200,
            data={"message": "Event handler configuration updated"},
            error=response.error if response.error else None,
        )
    except HTTPException:
        raise
    except AttributeError as e:
        raise HTTPException(status_code=400, detail=f"Unknown operation: {e}")
    except Exception:
        logger.exception("Unhandled error in event_handler_batch_configure")
        raise HTTPException(status_code=500, detail="Internal server error")


# ============================================================================
# Config parsers
# ============================================================================


def _parse_events(raw: dict) -> List[EventHandlerEntry]:
    result = []
    for name, attrs in sorted(raw.items()):
        if not isinstance(attrs, dict):
            attrs = {}
        result.append(EventHandlerEntry(
            name=name,
            filter=_parse_filter(attrs.get("filter", {})),
            script=_parse_script(attrs.get("script", {})),
        ))
    return result


def _parse_filter(raw) -> EventFilter:
    if not raw or not isinstance(raw, dict):
        return EventFilter()
    return EventFilter(
        pattern=raw.get("pattern"),
        syslog_identifier=raw.get("syslog-identifier"),
    )


def _parse_script(raw) -> EventScript:
    if not raw or not isinstance(raw, dict):
        return EventScript()
    return EventScript(
        path=raw.get("path"),
        arguments=raw.get("arguments"),
        environment=_parse_environment(raw.get("environment", {})),
    )


def _parse_environment(raw) -> List[EventEnvironmentVar]:
    if not raw or not isinstance(raw, dict):
        return []
    result = []
    for env_name, attrs in sorted(raw.items()):
        value = None
        if isinstance(attrs, dict):
            value = attrs.get("value")
        result.append(EventEnvironmentVar(name=env_name, value=value))
    return result
