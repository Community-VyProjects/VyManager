"""
Access List Router

API endpoints for VyOS policy access-list (ipv4) and access-list6 (ipv6)
configuration. The config read returns the mapper's parse unchanged.
"""

import logging
from typing import Any, Dict, List, Literal, Optional, cast

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field, field_validator
from starlette.concurrency import run_in_threadpool

from batch_dispatch import call_item_batch_op
from fastapi_permissions import require_read_permission, require_write_permission
from rbac_permissions import FeatureGroup
from session_vyos_service import get_session_vyos_service
from vyos_builders.access_list import AccessListBatchBuilder
from vyos_mappers.access_list.access_list import AccessListMapper
from vyos_mappers.base import CommandMapperRegistry

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/vyos/access-list", tags=["access-list"])

ListType = Literal["ipv4", "ipv6"]


# ============================================================================
# Pydantic Models
# ============================================================================


class AccessListRule(BaseModel):
    rule_number: int
    action: Optional[str] = None
    description: Optional[str] = None
    source_any: bool = False
    source_host: Optional[str] = None
    source_network: Optional[str] = None
    source_inverse_mask: Optional[str] = None
    source_exact_match: bool = False
    destination_any: bool = False
    destination_host: Optional[str] = None
    destination_network: Optional[str] = None
    destination_inverse_mask: Optional[str] = None


class AccessList(BaseModel):
    number: str  # IPv4 list number, or the IPv6 list name
    list_type: ListType
    description: Optional[str] = None
    rules: List[AccessListRule] = []


class AccessListConfigResponse(BaseModel):
    ipv4_lists: List[AccessList] = []
    ipv6_lists: List[AccessList] = []
    total_ipv4: int = 0
    total_ipv6: int = 0


class AccessListBatchOperation(BaseModel):
    op: str = Field(..., description="Builder operation name")
    value: Optional[str] = Field(None, description="Operation value")


class AccessListBatchRequest(BaseModel):
    """One commit on one list. Rule ops need rule_number; list ops take none."""
    list_type: ListType
    name: str = Field(..., min_length=1, description="IPv4 list number or IPv6 list name")
    rule_number: Optional[int] = Field(None, ge=1, le=65535)
    operations: List[AccessListBatchOperation]

    @field_validator("name")
    @classmethod
    def name_not_blank(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("name must not be blank")
        return value


class ReorderRequest(BaseModel):
    """New order of a list's rules; each listed number takes the next sorted slot."""
    list_type: ListType
    name: str = Field(..., min_length=1)
    rule_numbers: List[int] = Field(..., min_length=1)

    @field_validator("rule_numbers")
    @classmethod
    def no_duplicates(cls, value: List[int]) -> List[int]:
        if len(set(value)) != len(value):
            raise ValueError("rule_numbers must not repeat")
        return value


class VyOSResponse(BaseModel):
    success: bool
    data: Optional[Dict[str, Any]] = None
    error: Optional[str] = None


def _mapper(version: str) -> AccessListMapper:
    return cast(AccessListMapper, CommandMapperRegistry.get_mapper("access_list", version))


# ============================================================================
# Endpoints
# ============================================================================


@router.get("/capabilities")
async def get_access_list_capabilities(request: Request):
    """Feature flags, value lists and ranges for this device."""
    await require_read_permission(request, FeatureGroup.ACCESS_LIST)

    try:
        service = get_session_vyos_service(request)
        builder = AccessListBatchBuilder(version=service.get_version())
        capabilities = builder.get_capabilities()

        if hasattr(request.state, "instance") and request.state.instance:
            capabilities["instance_name"] = request.state.instance.get("name")
            capabilities["instance_id"] = request.state.instance.get("id")
        return capabilities
    except HTTPException:
        raise
    except Exception:
        logger.exception("Unhandled error in access-list capabilities")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/config", response_model=AccessListConfigResponse)
async def get_access_list_config(http_request: Request, refresh: bool = False):
    """Every access-list and access-list6."""
    await require_read_permission(http_request, FeatureGroup.ACCESS_LIST)

    try:
        service = get_session_vyos_service(http_request)
        mapper = _mapper(service.get_version())
        full_config = await run_in_threadpool(service.get_full_config, refresh=refresh)
        return AccessListConfigResponse(**mapper.parse_config(full_config or {}))
    except HTTPException:
        raise
    except Exception:
        logger.exception("Unhandled error in access-list config")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.post("/batch", response_model=VyOSResponse)
async def access_list_batch_configure(http_request: Request, body: AccessListBatchRequest):
    """Run a batch of builder ops on one list in a single commit.

    Every op takes list_type and name; an op with a ``rule`` parameter needs
    rule_number and an op without one rejects it. The value fills the rest.
    """
    await require_write_permission(http_request, FeatureGroup.ACCESS_LIST)

    try:
        service = get_session_vyos_service(http_request)
        builder = AccessListBatchBuilder(version=service.get_version())
        rule = str(body.rule_number) if body.rule_number else None

        try:
            for operation in body.operations:
                call_item_batch_op(
                    builder,
                    operation.op,
                    body.list_type,
                    operation.value,
                    bound={"name": body.name, "rule": rule},
                )
        except ValueError as exc:
            # The builder raises ValueError for a name, leaf or value the lab rejects.
            raise HTTPException(status_code=400, detail=str(exc))

        response = await run_in_threadpool(service.execute_batch, builder)
        return VyOSResponse(
            success=response.status == 200,
            data={"message": "Configuration updated"} if response.status == 200 else None,
            error=response.error or None,
        )
    except HTTPException:
        raise
    except Exception:
        logger.exception("Unhandled error in access-list batch")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.post("/reorder", response_model=VyOSResponse)
async def reorder_access_list_rules(http_request: Request, body: ReorderRequest):
    """Renumber a list's rules in one commit.

    The listed rules must be exactly the list's rules. Each moved rule is
    deleted and recreated from its own config subtree under its new number,
    so no leaf (IPv6 exact-match, a network beside any) is dropped.
    """
    await require_write_permission(http_request, FeatureGroup.ACCESS_LIST)

    try:
        service = get_session_vyos_service(http_request)
        version = service.get_version()
        mapper = _mapper(version)
        builder = AccessListBatchBuilder(version=version)

        full_config = await run_in_threadpool(service.get_full_config, refresh=True)
        trees = mapper.rule_trees(full_config or {}, body.list_type, body.name)
        if trees is None:
            raise HTTPException(status_code=404, detail=f"Access list {body.name} not found")
        if set(trees) != set(body.rule_numbers):
            raise HTTPException(status_code=400, detail="rule_numbers must list every rule of the list")

        targets = sorted(body.rule_numbers)
        moves = [(old, new) for old, new in zip(body.rule_numbers, targets) if old != new]
        if not moves:
            return VyOSResponse(success=True, data={"message": "Rules reordered"})

        try:
            for old, _ in moves:
                builder.delete_rule(body.list_type, body.name, str(old))
            for old, new in moves:
                builder.restore_rule(body.list_type, body.name, str(new), trees[old])
        except ValueError as exc:
            raise HTTPException(status_code=400, detail=str(exc))

        response = await run_in_threadpool(service.execute_batch, builder)
        return VyOSResponse(
            success=response.status == 200,
            data={"message": "Rules reordered"} if response.status == 200 else None,
            error=response.error or None,
        )
    except HTTPException:
        raise
    except Exception:
        logger.exception("Unhandled error in access-list reorder")
        raise HTTPException(status_code=500, detail="Internal server error")
