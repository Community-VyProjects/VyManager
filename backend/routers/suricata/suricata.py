"""Suricata service router.

Endpoints:
  GET  /vyos/suricata/capabilities
  GET  /vyos/suricata/config
  POST /vyos/suricata/batch

``service suricata`` exists on VyOS 1.5 and not on 1.4. The mapper rejects
every path on 1.4. The device also rejects a commit that has no interface,
no address-group, or no port-group; the UI blocks that before save.
"""

from fastapi import APIRouter, HTTPException, Request
from starlette.concurrency import run_in_threadpool
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from session_vyos_service import get_session_vyos_service
from vyos_builders.suricata import SuricataBatchBuilder
from fastapi_permissions import require_read_permission, require_write_permission
from rbac_permissions import FeatureGroup
import inspect
import logging
from batch_dispatch import resolve_batch_method

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/vyos/suricata", tags=["suricata"])


class SuricataMember(BaseModel):
    value: str
    exclude: bool = False


class SuricataGroup(BaseModel):
    name: str
    members: List[SuricataMember] = []
    groups: List[SuricataMember] = []


class SuricataLog(BaseModel):
    enabled: bool = False
    filename: Optional[str] = None
    filetype: Optional[str] = None
    types: List[str] = []
    types_set: bool = False


class SuricataConfig(BaseModel):
    configured: bool = False
    interfaces: List[str] = []
    address_groups: List[SuricataGroup] = []
    port_groups: List[SuricataGroup] = []
    log: SuricataLog = Field(default_factory=SuricataLog)


class SuricataBatchOperation(BaseModel):
    op: str = Field(..., description="Builder method name")
    value: Optional[str] = None


class SuricataBatchRequest(BaseModel):
    operations: List[SuricataBatchOperation]


class VyOSResponse(BaseModel):
    success: bool
    data: Optional[Dict[str, Any]] = None
    error: Optional[str] = None


def _multi(raw: Any) -> List[str]:
    if raw is None:
        return []
    if isinstance(raw, list):
        values = [str(item) for item in raw if item is not None and str(item) != ""]
    elif isinstance(raw, dict):
        values = [str(key) for key in raw.keys() if str(key) != ""]
    elif isinstance(raw, str):
        values = [raw] if raw else []
    else:
        values = [str(raw)]
    return values


def _members(raw: Any) -> List[SuricataMember]:
    members = []
    for token in _multi(raw):
        exclude = token.startswith("!")
        value = token[1:] if exclude else token
        if not value:
            continue
        members.append(SuricataMember(value=value, exclude=exclude))
    members.sort(key=lambda item: (item.value, item.exclude))
    return members


def _parse_groups(raw: Any, member_key: str) -> List[SuricataGroup]:
    if not isinstance(raw, dict):
        return []
    groups = []
    for name, cfg in raw.items():
        if not name:
            continue
        node = cfg if isinstance(cfg, dict) else {}
        groups.append(
            SuricataGroup(
                name=str(name),
                members=_members(node.get(member_key)),
                groups=_members(node.get("group")),
            )
        )
    groups.sort(key=lambda item: item.name)
    return groups


def parse_suricata_config(service_config: Any) -> SuricataConfig:
    """Normalize a ``service.suricata`` config-tree node."""
    if not isinstance(service_config, dict) or not service_config:
        return SuricataConfig()

    log_raw = service_config.get("log")
    eve: dict = {}
    eve_present = False
    if isinstance(log_raw, dict) and "eve" in log_raw:
        eve_present = True
        eve_raw = log_raw.get("eve")
        if isinstance(eve_raw, dict):
            eve = eve_raw

    types_set = "type" in eve
    filename = eve.get("filename")
    filetype = eve.get("filetype")
    return SuricataConfig(
        configured=True,
        interfaces=sorted(_multi(service_config.get("interface"))),
        address_groups=_parse_groups(service_config.get("address-group"), "address"),
        port_groups=_parse_groups(service_config.get("port-group"), "port"),
        log=SuricataLog(
            enabled=eve_present,
            filename=str(filename) if filename else None,
            filetype=str(filetype) if filetype else None,
            types=sorted(_multi(eve.get("type"))) if types_set else [],
            types_set=types_set,
        ),
    )


@router.get("/capabilities")
async def get_suricata_capabilities(request: Request):
    await require_read_permission(request, FeatureGroup.SURICATA)
    try:
        service = get_session_vyos_service(request)
        builder = SuricataBatchBuilder(version=service.get_version())
        caps = builder.get_capabilities()
        if hasattr(request.state, "instance") and request.state.instance:
            caps["instance_name"] = request.state.instance.get("name")
            caps["instance_id"] = request.state.instance.get("id")
        return caps
    except Exception:
        logger.exception("Unhandled error in get_suricata_capabilities")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/config", response_model=SuricataConfig)
async def get_suricata_config(http_request: Request, refresh: bool = False):
    await require_read_permission(http_request, FeatureGroup.SURICATA)
    try:
        service = get_session_vyos_service(http_request)
        full_config = await run_in_threadpool(service.get_full_config, refresh=refresh)
        return parse_suricata_config(full_config.get("service", {}).get("suricata"))
    except Exception:
        logger.exception("Unhandled error in get_suricata_config")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.post("/batch", response_model=VyOSResponse)
async def suricata_batch_configure(http_request: Request, body: SuricataBatchRequest):
    await require_write_permission(http_request, FeatureGroup.SURICATA)
    try:
        service = get_session_vyos_service(http_request)
        builder = SuricataBatchBuilder(version=service.get_version())

        for operation in body.operations:
            method = resolve_batch_method(builder, operation.op)
            sig = inspect.signature(method)
            params = [p for p in sig.parameters.keys() if p != "self"]

            if len(params) == 0:
                method()
            elif len(params) == 1:
                if operation.value is None:
                    raise HTTPException(status_code=400, detail=f"Missing value for {operation.op}")
                method(operation.value)
            else:
                if not operation.value or "," not in operation.value:
                    raise HTTPException(
                        status_code=400,
                        detail=f"Missing arguments for {operation.op}",
                    )
                parts = operation.value.split(",", len(params) - 1)
                if len(parts) != len(params) or any(part == "" for part in parts):
                    raise HTTPException(
                        status_code=400,
                        detail=f"Missing arguments for {operation.op}",
                    )
                method(*parts)

        if builder.is_empty():
            return VyOSResponse(success=True, data={"message": "No Suricata changes"})

        response = service.execute_batch(builder)  # type: ignore[arg-type]
        return VyOSResponse(
            success=response.status == 200,
            data={"message": "Suricata configuration updated"} if response.status == 200 else None,
            error=response.error if response.error else None,
        )
    except HTTPException:
        raise
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception:
        logger.exception("Unhandled error in suricata_batch_configure")
        raise HTTPException(status_code=500, detail="Internal server error")
