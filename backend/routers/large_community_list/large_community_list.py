"""
Large Community List Router

API endpoints for managing VyOS large-community-list configuration.
Supports version-aware configuration for VyOS 1.4 and 1.5 (identical feature sets).
"""

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field
from typing import List, Dict, Optional, Any
from session_vyos_service import get_session_vyos_service
from vyos_builders import LargeCommunityListBatchBuilder
import inspect

router = APIRouter(prefix="/vyos/large-community-list", tags=["large-community-list"])

# Stub functions for backwards compatibility with app.py
def set_device_registry(registry):
    """Legacy function - no longer used."""
    pass


def set_configured_device_name(name):
    """Legacy function - no longer used."""
    pass


# ============================================================================
# Pydantic Models
# ============================================================================


class LargeCommunityListRule(BaseModel):
    """Large community list rule"""
    rule_number: int
    description: Optional[str] = None
    action: str = "permit"  # permit|deny
    regex: Optional[str] = None


class LargeCommunityList(BaseModel):
    """Complete large community list configuration"""
    name: str
    description: Optional[str] = None
    rules: List[LargeCommunityListRule] = []


class LargeCommunityListConfig(BaseModel):
    """Response containing all large community lists"""
    large_community_lists: List[LargeCommunityList] = []
    total: int = 0


class LargeCommunityListBatchOperation(BaseModel):
    """Single operation in a batch request"""
    op: str = Field(..., description="Operation name")
    value: Optional[str] = Field(None, description="Operation value")


class LargeCommunityListBatchRequest(BaseModel):
    """Model for batch configuration"""
    name: str = Field(..., description="Large community list name")
    rule_number: Optional[int] = Field(None, description="Rule number (optional)")
    operations: List[LargeCommunityListBatchOperation]


class ReorderRuleItem(BaseModel):
    """Single rule in a reorder request"""
    old_number: int = Field(..., description="Original rule number")
    new_number: int = Field(..., description="New rule number after reorder")
    rule_data: LargeCommunityListRule = Field(..., description="Complete rule configuration")


class ReorderLargeCommunityListRequest(BaseModel):
    """Model for reordering large community list rules"""
    large_community_list_name: str = Field(..., description="Large community list name")
    rules: List[ReorderRuleItem] = Field(..., description="List of rules with new order")


class VyOSResponse(BaseModel):
    """Standard response from VyOS operations"""
    success: bool
    data: Optional[Dict[str, Any]] = None
    error: Optional[str] = None


# ============================================================================
# Endpoint 1: Capabilities
# ============================================================================


@router.get("/capabilities")
async def get_large_community_list_capabilities(request: Request):
    """
    Get feature capabilities based on device VyOS version.

    Returns feature flags indicating which operations are supported.
    Allows frontends to conditionally enable/disable features.
    """
    try:
        service = get_session_vyos_service(request)
        version = service.get_version()
        builder = LargeCommunityListBatchBuilder(version=version)
        capabilities = builder.get_capabilities()

        # Add instance info
        if hasattr(request.state, "instance") and request.state.instance:
            capabilities["instance_name"] = request.state.instance.get("name")
            capabilities["instance_id"] = request.state.instance.get("id")
        return capabilities
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# Endpoint 2: Config (Generalized Data)
# ============================================================================


@router.get("/config", response_model=LargeCommunityListConfig)
async def get_large_community_list_config(http_request: Request, refresh: bool = False):
    """
    Get all large-community-list configuration from VyOS in a generalized format.

    Args:
        refresh: If True, force refresh from VyOS. If False, use cache.

    Returns:
        Generalized configuration data optimized for frontend consumption
    """
    try:
        service = get_session_vyos_service(request)
        full_config = service.get_full_config(refresh=refresh)

        # Navigate to policy -> large-community-list
        large_community_list_config = full_config.get("policy", {}).get("large-community-list", {})

        if not large_community_list_config:
            return LargeCommunityListConfig(large_community_lists=[], total=0)

        # Parse large community lists
        large_community_lists = []
        for name, cl_data in large_community_list_config.items():
            large_community_list = parse_large_community_list(name, cl_data)
            large_community_lists.append(large_community_list)

        return LargeCommunityListConfig(large_community_lists=large_community_lists, total=len(large_community_lists))

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


def parse_large_community_list(name: str, cl_data: dict) -> LargeCommunityList:
    """Parse large community list configuration from VyOS format."""
    description = cl_data.get("description")

    rules = []
    rules_raw = cl_data.get("rule", {})
    if rules_raw:
        for rule_num, rule_data in rules_raw.items():
            rule = parse_rule(int(rule_num), rule_data)
            rules.append(rule)

    return LargeCommunityList(
        name=name,
        description=description,
        rules=sorted(rules, key=lambda r: r.rule_number)
    )


def parse_rule(rule_number: int, rule_data: dict) -> LargeCommunityListRule:
    """Parse large community list rule from VyOS format."""
    description = rule_data.get("description")
    action = rule_data.get("action", "permit")
    regex = rule_data.get("regex")

    return LargeCommunityListRule(
        rule_number=rule_number,
        description=description,
        action=action,
        regex=regex
    )


# ============================================================================
# Endpoint 3: Batch Operations
# ============================================================================


@router.post("/batch")
async def large_community_list_batch_configure(http_request: Request, request: LargeCommunityListBatchRequest):
    """
    Execute a batch of configuration operations.

    Allows multiple changes in a single VyOS commit for efficiency.
    """
    try:
        service = get_session_vyos_service(request)
        version = service.get_version()
        builder = LargeCommunityListBatchBuilder(version=version)

        # Process operations using inspect for dynamic method calls
        for operation in request.operations:
            method = getattr(builder, operation.op)
            sig = inspect.signature(method)
            params = list(sig.parameters.keys())

            # Build arguments dynamically
            args = []

            # Add large community list name
            if "name" in params:
                args.append(request.name)

            # Add rule number if specified and method accepts it
            if request.rule_number and "rule" in params:
                args.append(str(request.rule_number))

            # Add operation value if provided
            if operation.value and len(params) > len(args):
                # Check remaining parameters
                remaining_params = params[len(args):]
                for param in remaining_params:
                    if param != "self":
                        args.append(operation.value)
                        break

            method(*args)

        # Execute batch
        response = service.execute_batch(builder)

        return VyOSResponse(
            success=response.status == 200,
            data={"message": "Configuration updated"},
            error=response.error if response.error else None
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# Reorder Endpoint
# ============================================================================


@router.post("/reorder")
async def reorder_large_community_list_rules(request: ReorderLargeCommunityListRequest):
    """
    Reorder large community list rules by deleting and recreating them in a single commit.

    This endpoint efficiently reorders multiple rules by:
    1. Deleting all specified rules in reverse order
    2. Recreating them with new rule numbers
    All operations are executed in a single VyOS commit.

    Args:
        request: Reorder request containing large community list name and list of rules

    Returns:
        VyOSResponse with success/failure information
    """
    try:
        service = get_session_vyos_service(request)
        version = service.get_version()
        builder = LargeCommunityListBatchBuilder(version=version)

        # Step 1: Delete all rules in reverse order
        rules_to_delete = sorted([r.old_number for r in request.rules], reverse=True)
        for old_number in rules_to_delete:
            builder.delete_rule(request.large_community_list_name, str(old_number))

        # Step 2: Recreate rules with new numbers
        for rule_item in request.rules:
            new_number = rule_item.new_number
            rule_data = rule_item.rule_data

            # Create the rule
            builder.set_rule(request.large_community_list_name, str(new_number))

            # Set action
            if rule_data.action:
                builder.set_rule_action(request.large_community_list_name, str(new_number), rule_data.action)

            # Set description
            if rule_data.description:
                builder.set_rule_description(request.large_community_list_name, str(new_number), rule_data.description)

            # Set regex
            if rule_data.regex:
                builder.set_rule_regex(request.large_community_list_name, str(new_number), rule_data.regex)

        # Execute batch
        response = service.execute_batch(builder)

        return VyOSResponse(
            success=response.status == 200,
            data={"message": f"Successfully reordered {len(request.rules)} rules in large community list {request.large_community_list_name}"},
            error=response.error if response.error else None
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
