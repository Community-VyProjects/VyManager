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
from typing import List, Optional, Dict, Any, cast
from session_vyos_service import get_session_vyos_service
from vyos_builders.suricata import SuricataBatchBuilder
from vyos_mappers import CommandMapperRegistry
from vyos_mappers.suricata import SuricataMapper
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
    except HTTPException:
        raise
    except Exception:
        logger.exception("Unhandled error in get_suricata_capabilities")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/config", response_model=SuricataConfig)
async def get_suricata_config(http_request: Request, refresh: bool = False):
    await require_read_permission(http_request, FeatureGroup.SURICATA)
    try:
        service = get_session_vyos_service(http_request)
        full_config = await run_in_threadpool(service.get_full_config, refresh=refresh)
        mapper = cast(
            SuricataMapper,
            CommandMapperRegistry.get_mapper("suricata", service.get_version()),
        )
        return SuricataConfig(**mapper.parse_config(full_config))
    except HTTPException:
        raise
    except Exception:
        logger.exception("Unhandled error in get_suricata_config")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.post("/batch", response_model=VyOSResponse)
async def suricata_batch_configure(http_request: Request, body: SuricataBatchRequest):
    await require_write_permission(http_request, FeatureGroup.SURICATA)
    try:
        service = get_session_vyos_service(http_request)
        builder = SuricataBatchBuilder(version=service.get_version())

        try:
            for operation in body.operations:
                method = resolve_batch_method(builder, operation.op)
                count = len(inspect.signature(method).parameters)

                if count == 0:
                    method()
                    continue
                if not operation.value:
                    raise HTTPException(
                        status_code=400,
                        detail=f"Operation {operation.op} requires a value",
                    )
                parts = operation.value.split(",", count - 1)
                if len(parts) != count or not all(parts):
                    raise HTTPException(
                        status_code=400,
                        detail=f"Operation {operation.op} requires {count} values",
                    )
                method(*parts)
        except ValueError as exc:
            # The mapper raises ValueError on 1.4 and for a value the device rejects.
            raise HTTPException(status_code=400, detail=str(exc))

        if builder.is_empty():
            return VyOSResponse(success=True, data={"message": "No Suricata changes"})

        response = await run_in_threadpool(service.execute_batch, builder)
        return VyOSResponse(
            success=response.status == 200,
            data={"message": "Suricata configuration updated"} if response.status == 200 else None,
            error=response.error if response.error else None,
        )
    except HTTPException:
        raise
    except Exception:
        logger.exception("Unhandled error in suricata_batch_configure")
        raise HTTPException(status_code=500, detail="Internal server error")
