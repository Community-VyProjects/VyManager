"""Policy list router parameterized by community-list family."""

from typing import Annotated, Any, Dict, List, Literal, Optional, cast

from fastapi import APIRouter, HTTPException, Request
from pydantic import AfterValidator, BaseModel, Field, create_model
from starlette.concurrency import run_in_threadpool

from batch_dispatch import resolve_batch_method
from fastapi_permissions import require_read_permission, require_write_permission
from rbac_permissions import FeatureGroup
from session_vyos_service import get_session_vyos_service
from vyos_builders.community_list.community_list_batch_builder import CommunityListBatchBuilder
from vyos_builders.extcommunity_list.extcommunity_list_batch_builder import ExtCommunityListBatchBuilder
from vyos_builders.large_community_list.large_community_list_batch_builder import LargeCommunityListBatchBuilder
from vyos_mappers.base import CommandMapperRegistry
from vyos_mappers.policy_list import KIND_SPEC, POLICY_LIST_KINDS, PolicyListMapper
import inspect
import logging

logger = logging.getLogger(__name__)

KIND_FEATURE = {
    "community-list": FeatureGroup.BGP_COMMUNITY,
    "extcommunity-list": FeatureGroup.BGP_EXTENDED_COMMUNITY,
    "large-community-list": FeatureGroup.BGP_LARGE_COMMUNITY,
}

KIND_BUILDER = {
    "community-list": CommunityListBatchBuilder,
    "extcommunity-list": ExtCommunityListBatchBuilder,
    "large-community-list": LargeCommunityListBatchBuilder,
}


RULE_NUMBER_MIN = 1
RULE_NUMBER_MAX = 65535


class PolicyListRule(BaseModel):
    rule_number: int
    description: Optional[str] = None
    action: Literal["permit", "deny"] = "permit"
    regex: Optional[str] = None


class PolicyList(BaseModel):
    name: str
    description: Optional[str] = None
    rules: List[PolicyListRule] = []


class PolicyListBatchOperation(BaseModel):
    op: str = Field(..., description="Operation name")
    value: Optional[str] = Field(None, description="Operation value")


class PolicyListBatchRequest(BaseModel):
    name: str = Field(..., min_length=1, description="List name")
    rule_number: Optional[int] = Field(
        None,
        ge=0,
        le=RULE_NUMBER_MAX,
        description="Rule number for rule ops; omitted or 0 for list ops",
    )
    operations: List[PolicyListBatchOperation]


class ReorderRuleItem(BaseModel):
    old_number: int = Field(..., ge=RULE_NUMBER_MIN, le=RULE_NUMBER_MAX, description="Original rule number")
    new_number: Optional[int] = Field(
        None,
        ge=RULE_NUMBER_MIN,
        le=RULE_NUMBER_MAX,
        description="New rule number after reorder; None = delete-only",
    )
    rule_data: PolicyListRule = Field(..., description="Complete rule configuration")


def _unique_rule_numbers(rules: List[ReorderRuleItem]) -> List[ReorderRuleItem]:
    old_numbers = [rule.old_number for rule in rules]
    if len(old_numbers) != len(set(old_numbers)):
        raise ValueError("duplicate old_number")
    new_numbers = [rule.new_number for rule in rules if rule.new_number is not None]
    if len(new_numbers) != len(set(new_numbers)):
        raise ValueError("duplicate new_number")
    return rules


ReorderRules = Annotated[List[ReorderRuleItem], AfterValidator(_unique_rule_numbers)]


class VyOSResponse(BaseModel):
    success: bool
    data: Optional[Dict[str, Any]] = None
    error: Optional[str] = None


def build_router(kind: str) -> APIRouter:
    if kind not in POLICY_LIST_KINDS:
        raise ValueError(f"unsupported policy list kind: {kind}")
    spec = KIND_SPEC[kind]
    feature = KIND_FEATURE[kind]
    lists_field = spec["lists_field"]
    name_field = spec["name_field"]
    ident = spec["ident"]
    label = spec["label"]

    ConfigModel = create_model(
        f"{ident}_Config",
        **{lists_field: (List[PolicyList], []), "total": (int, 0)},
    )
    ReorderModel = create_model(
        f"{ident}_ReorderRequest",
        **{
            name_field: (str, Field(..., min_length=1, description=f"{label} name")),
            "rules": (ReorderRules, Field(..., min_length=1, description="List of rules with new order")),
        },
    )

    router = APIRouter(prefix=f"/vyos/{kind}", tags=[kind])

    @router.get("/capabilities", operation_id=f"get_{ident}_capabilities")
    async def get_capabilities(request: Request):
        await require_read_permission(request, feature)
        try:
            service = get_session_vyos_service(request)
            version = service.get_version()
            builder = KIND_BUILDER[kind](version=version)
            capabilities = builder.get_capabilities()
            if hasattr(request.state, "instance") and request.state.instance:
                capabilities["instance_name"] = request.state.instance.get("name")
                capabilities["instance_id"] = request.state.instance.get("id")
            return capabilities
        except HTTPException:
            raise
        except Exception:
            logger.exception("Unhandled error")
            raise HTTPException(status_code=500, detail="Internal server error")

    @router.get("/config", response_model=ConfigModel, operation_id=f"get_{ident}_config")
    async def get_config(http_request: Request, refresh: bool = False):
        await require_read_permission(http_request, feature)
        try:
            service = get_session_vyos_service(http_request)
            full_config = await run_in_threadpool(service.get_full_config, refresh=refresh)
            mapper = cast(PolicyListMapper, CommandMapperRegistry.get_mapper(ident, service.get_version()))
            return ConfigModel(**mapper.parse_config(full_config))
        except HTTPException:
            raise
        except Exception:
            logger.exception("Unhandled error")
            raise HTTPException(status_code=500, detail="Internal server error")

    @router.post("/batch", operation_id=f"{ident}_batch_configure")
    async def batch_configure(http_request: Request, body: PolicyListBatchRequest):
        await require_write_permission(http_request, feature)
        try:
            service = get_session_vyos_service(http_request)
            builder = KIND_BUILDER[kind](version=service.get_version())
            for operation in body.operations:
                method = resolve_batch_method(builder, operation.op)
                params = list(inspect.signature(method).parameters)
                args = [body.name]
                if "rule" in params:
                    if not body.rule_number:
                        raise HTTPException(status_code=400, detail=f"Operation {operation.op} requires rule_number")
                    args.append(str(body.rule_number))
                if len(params) > len(args):
                    if not operation.value:
                        raise HTTPException(status_code=400, detail=f"Operation {operation.op} requires a value")
                    args.append(operation.value)
                method(*args)
            response = await run_in_threadpool(service.execute_batch, builder)
            return VyOSResponse(
                success=response.status == 200,
                data={"message": "Configuration updated"} if response.status == 200 else None,
                error=response.error if response.error else None,
            )
        except HTTPException:
            raise
        except Exception:
            logger.exception("Unhandled error")
            raise HTTPException(status_code=500, detail="Internal server error")

    @router.post("/reorder", operation_id=f"reorder_{ident}_rules")
    async def reorder_rules(http_request: Request, body: ReorderModel):
        await require_write_permission(http_request, feature)
        try:
            service = get_session_vyos_service(http_request)
            builder = KIND_BUILDER[kind](version=service.get_version())
            list_name = getattr(body, name_field)
            rules_to_delete = sorted([r.old_number for r in body.rules], reverse=True)
            for old_number in rules_to_delete:
                builder.delete_rule(list_name, str(old_number))
            for rule_item in body.rules:
                new_number = rule_item.new_number
                if new_number is None:
                    continue
                rule_data = rule_item.rule_data
                builder.set_rule(list_name, str(new_number))
                builder.set_rule_action(list_name, str(new_number), rule_data.action)
                if rule_data.description:
                    builder.set_rule_description(list_name, str(new_number), rule_data.description)
                if rule_data.regex:
                    builder.set_rule_regex(list_name, str(new_number), rule_data.regex)
            response = await run_in_threadpool(service.execute_batch, builder)
            return VyOSResponse(
                success=response.status == 200,
                data={"message": f"Successfully reordered {len(body.rules)} rules in {label} {list_name}"} if response.status == 200 else None,
                error=response.error if response.error else None,
            )
        except HTTPException:
            raise
        except Exception:
            logger.exception("Unhandled error")
            raise HTTPException(status_code=500, detail="Internal server error")

    return router
