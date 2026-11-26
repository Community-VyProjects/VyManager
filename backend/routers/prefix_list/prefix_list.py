"""
Prefix List Router

API endpoints for VyOS policy prefix-list (ipv4) and prefix-list6 (ipv6)
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
from vyos_builders.prefix_list import PrefixListBatchBuilder
from vyos_mappers.base import CommandMapperRegistry
from vyos_mappers.prefix_list.prefix_list import PrefixListMapper

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/vyos/prefix-list", tags=["prefix-list"])

ListType = Literal["ipv4", "ipv6"]


# ============================================================================
# Pydantic Models
# ============================================================================


class PrefixListRule(BaseModel):
    rule_number: int
    action: Optional[str] = None
    description: Optional[str] = None
    prefix: Optional[str] = None
    ge: Optional[int] = None
    le: Optional[int] = None


class PrefixList(BaseModel):
    name: str
    list_type: ListType
    description: Optional[str] = None
    rules: List[PrefixListRule] = []


class PrefixListConfigResponse(BaseModel):
    ipv4_lists: List[PrefixList] = []
    ipv6_lists: List[PrefixList] = []
    total_ipv4: int = 0
    total_ipv6: int = 0


class PrefixListBatchOperation(BaseModel):
    op: str = Field(..., description="Builder operation name")
    value: Optional[str] = Field(None, description="Operation value")


class PrefixListBatchRequest(BaseModel):
    """One commit on one list. Rule ops need rule_number; list ops take none."""
    list_type: ListType
    name: str = Field(..., min_length=1)
    rule_number: Optional[int] = Field(None, ge=1, le=65535)
    operations: List[PrefixListBatchOperation]

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


def _mapper(version: str) -> PrefixListMapper:
    return cast(PrefixListMapper, CommandMapperRegistry.get_mapper("prefix_list", version))


# ============================================================================
# Endpoints
# ============================================================================


@router.get("/capabilities")
async def get_prefix_list_capabilities(request: Request):
    """Feature flags, value lists and ranges for this device."""
    await require_read_permission(request, FeatureGroup.PREFIX_LIST)

    try:
        service = get_session_vyos_service(request)
        builder = PrefixListBatchBuilder(version=service.get_version())
        capabilities = builder.get_capabilities()

        if hasattr(request.state, "instance") and request.state.instance:
            capabilities["instance_name"] = request.state.instance.get("name")
            capabilities["instance_id"] = request.state.instance.get("id")
        return capabilities
    except HTTPException:
        raise
    except Exception:
        logger.exception("Unhandled error in prefix-list capabilities")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/config", response_model=PrefixListConfigResponse)
async def get_prefix_list_config(http_request: Request, refresh: bool = False):
    """Every prefix-list and prefix-list6."""
    await require_read_permission(http_request, FeatureGroup.PREFIX_LIST)

    try:
        service = get_session_vyos_service(http_request)
        mapper = _mapper(service.get_version())
        full_config = await run_in_threadpool(service.get_full_config, refresh=refresh)
        return PrefixListConfigResponse(**mapper.parse_config(full_config or {}))
    except HTTPException:
        raise
    except Exception:
        logger.exception("Unhandled error in prefix-list config")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.post("/batch", response_model=VyOSResponse)
async def prefix_list_batch_configure(http_request: Request, body: PrefixListBatchRequest):
    """Run a batch of builder ops on one list in a single commit.

    Every op takes list_type and name; an op with a ``rule`` parameter needs
    rule_number and an op without one rejects it. The value fills the rest.
    """
    await require_write_permission(http_request, FeatureGroup.PREFIX_LIST)

    try:
        service = get_session_vyos_service(http_request)
        builder = PrefixListBatchBuilder(version=service.get_version())
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
            # The builder raises ValueError for a name or value the lab rejects.
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
        logger.exception("Unhandled error in prefix-list batch")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.post("/reorder", response_model=VyOSResponse)
async def reorder_prefix_list_rules(http_request: Request, body: ReorderRequest):
    """Renumber a list's rules in one commit.

    The listed rules must be exactly the list's rules. Each moved rule is
    deleted and recreated from its own config subtree under its new number,
    so no leaf is dropped.
    """
    await require_write_permission(http_request, FeatureGroup.PREFIX_LIST)

    try:
        service = get_session_vyos_service(http_request)
        version = service.get_version()
        mapper = _mapper(version)
        builder = PrefixListBatchBuilder(version=version)

        full_config = await run_in_threadpool(service.get_full_config, refresh=True)
        trees = mapper.rule_trees(full_config or {}, body.list_type, body.name)
        if trees is None:
            raise HTTPException(status_code=404, detail=f"Prefix list {body.name} not found")
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
        logger.exception("Unhandled error in prefix-list reorder")
        raise HTTPException(status_code=500, detail="Internal server error")
