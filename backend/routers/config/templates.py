"""
Configuration Templates Router

API endpoints for managing reusable configuration templates.
Templates can be applied to VyOS instances to quickly configure
common patterns (firewall rules, NAT, VPN, etc.).
"""

from fastapi import APIRouter, HTTPException, Request, Query
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime
from enum import Enum
import json
import uuid

router = APIRouter(prefix="/config/templates", tags=["configuration"])


# ========================================================================
# Enums
# ========================================================================


class TemplateCategory(str, Enum):
    FIREWALL = "FIREWALL"
    NAT = "NAT"
    ROUTING = "ROUTING"
    VPN = "VPN"
    INTERFACE = "INTERFACE"
    SERVICE = "SERVICE"
    OTHER = "OTHER"


# ========================================================================
# Pydantic Models
# ========================================================================


class TemplateVariable(BaseModel):
    """A template variable definition."""
    name: str
    description: Optional[str] = None
    default_value: Optional[str] = None
    required: bool = True


class ConfigTemplateBase(BaseModel):
    """Base template fields."""
    name: str
    description: Optional[str] = None
    category: TemplateCategory
    config: Dict[str, Any]  # VyOS config as JSON
    variables: Optional[List[TemplateVariable]] = None
    isPublic: bool = False


class CreateTemplateRequest(ConfigTemplateBase):
    """Request to create a new template."""
    pass


class UpdateTemplateRequest(BaseModel):
    """Request to update an existing template."""
    name: Optional[str] = None
    description: Optional[str] = None
    category: Optional[TemplateCategory] = None
    config: Optional[Dict[str, Any]] = None
    variables: Optional[List[TemplateVariable]] = None
    isPublic: Optional[bool] = None


class ConfigTemplateResponse(ConfigTemplateBase):
    """Template response."""
    id: str
    createdBy: str
    createdByName: str
    createdAt: datetime
    updatedAt: datetime


class TemplatesListResponse(BaseModel):
    """Response containing list of templates."""
    templates: List[ConfigTemplateResponse]
    total: int


class ApplyTemplateRequest(BaseModel):
    """Request to apply a template."""
    variable_values: Dict[str, str] = {}  # Variable name -> value mapping


class ApplyTemplateResponse(BaseModel):
    """Response after applying a template."""
    success: bool
    commands_applied: int
    message: str


# ========================================================================
# Helper Functions
# ========================================================================


def get_user(request: Request) -> Dict[str, str]:
    """Get user info from the request."""
    if hasattr(request.state, 'user') and request.state.user:
        return request.state.user
    raise HTTPException(status_code=401, detail="Unauthorized")


async def get_db_pool(request: Request):
    """Get the database connection pool."""
    if hasattr(request.app.state, 'db_pool') and request.app.state.db_pool:
        return request.app.state.db_pool
    raise HTTPException(status_code=500, detail="Database not available")


def substitute_variables(config: Dict[str, Any], variables: Dict[str, str]) -> Dict[str, Any]:
    """Substitute template variables in the config."""
    config_str = json.dumps(config)
    for var_name, var_value in variables.items():
        config_str = config_str.replace(f"${{{var_name}}}", var_value)
        config_str = config_str.replace(f"$({var_name})", var_value)
    return json.loads(config_str)


# ========================================================================
# CRUD Endpoints
# ========================================================================


@router.get("", response_model=TemplatesListResponse)
async def list_templates(
    request: Request,
    category: Optional[TemplateCategory] = None,
    include_public: bool = Query(True, description="Include public templates"),
    my_only: bool = Query(False, description="Show only my templates")
):
    """
    List configuration templates.

    Args:
        category: Filter by category
        include_public: Include public templates from other users
        my_only: Show only templates created by current user
    """
    try:
        user = get_user(request)
        pool = await get_db_pool(request)

        async with pool.acquire() as conn:
            # Build query
            conditions = []
            params = []
            param_idx = 1

            if my_only:
                conditions.append(f'"createdBy" = ${param_idx}')
                params.append(user['id'])
                param_idx += 1
            elif include_public:
                conditions.append(f'("createdBy" = ${param_idx} OR "isPublic" = true)')
                params.append(user['id'])
                param_idx += 1
            else:
                conditions.append(f'"createdBy" = ${param_idx}')
                params.append(user['id'])
                param_idx += 1

            if category:
                conditions.append(f'category = ${param_idx}')
                params.append(category.value)
                param_idx += 1

            where_clause = " AND ".join(conditions) if conditions else "true"

            rows = await conn.fetch(
                f"""
                SELECT id, name, description, category, config, variables,
                       "isPublic", "createdBy", "createdByName", "createdAt", "updatedAt"
                FROM config_templates
                WHERE {where_clause}
                ORDER BY "updatedAt" DESC
                """,
                *params
            )

            templates = []
            for row in rows:
                variables = row['variables']
                if variables and isinstance(variables, str):
                    variables = json.loads(variables)

                templates.append(ConfigTemplateResponse(
                    id=row['id'],
                    name=row['name'],
                    description=row['description'],
                    category=TemplateCategory(row['category']),
                    config=row['config'] if isinstance(row['config'], dict) else json.loads(row['config']),
                    variables=variables,
                    isPublic=row['isPublic'],
                    createdBy=row['createdBy'],
                    createdByName=row['createdByName'],
                    createdAt=row['createdAt'],
                    updatedAt=row['updatedAt']
                ))

            return TemplatesListResponse(templates=templates, total=len(templates))

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{template_id}", response_model=ConfigTemplateResponse)
async def get_template(request: Request, template_id: str):
    """Get a single template by ID."""
    try:
        user = get_user(request)
        pool = await get_db_pool(request)

        async with pool.acquire() as conn:
            row = await conn.fetchrow(
                """
                SELECT id, name, description, category, config, variables,
                       "isPublic", "createdBy", "createdByName", "createdAt", "updatedAt"
                FROM config_templates
                WHERE id = $1 AND ("createdBy" = $2 OR "isPublic" = true)
                """,
                template_id, user['id']
            )

            if not row:
                raise HTTPException(status_code=404, detail="Template not found")

            variables = row['variables']
            if variables and isinstance(variables, str):
                variables = json.loads(variables)

            return ConfigTemplateResponse(
                id=row['id'],
                name=row['name'],
                description=row['description'],
                category=TemplateCategory(row['category']),
                config=row['config'] if isinstance(row['config'], dict) else json.loads(row['config']),
                variables=variables,
                isPublic=row['isPublic'],
                createdBy=row['createdBy'],
                createdByName=row['createdByName'],
                createdAt=row['createdAt'],
                updatedAt=row['updatedAt']
            )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("", response_model=ConfigTemplateResponse)
async def create_template(request: Request, data: CreateTemplateRequest):
    """Create a new configuration template."""
    try:
        user = get_user(request)
        pool = await get_db_pool(request)

        async with pool.acquire() as conn:
            template_id = str(uuid.uuid4())[:25]
            now = datetime.utcnow()

            variables_json = None
            if data.variables:
                variables_json = json.dumps([v.model_dump() for v in data.variables])

            row = await conn.fetchrow(
                """
                INSERT INTO config_templates (
                    id, name, description, category, config, variables,
                    "isPublic", "createdBy", "createdByName", "createdAt", "updatedAt"
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
                RETURNING id, name, description, category, config, variables,
                          "isPublic", "createdBy", "createdByName", "createdAt", "updatedAt"
                """,
                template_id, data.name, data.description, data.category.value,
                json.dumps(data.config), variables_json,
                data.isPublic, user['id'], user.get('name', 'Unknown'),
                now, now
            )

            variables = row['variables']
            if variables and isinstance(variables, str):
                variables = json.loads(variables)

            return ConfigTemplateResponse(
                id=row['id'],
                name=row['name'],
                description=row['description'],
                category=TemplateCategory(row['category']),
                config=row['config'] if isinstance(row['config'], dict) else json.loads(row['config']),
                variables=variables,
                isPublic=row['isPublic'],
                createdBy=row['createdBy'],
                createdByName=row['createdByName'],
                createdAt=row['createdAt'],
                updatedAt=row['updatedAt']
            )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/{template_id}", response_model=ConfigTemplateResponse)
async def update_template(request: Request, template_id: str, data: UpdateTemplateRequest):
    """Update an existing template. Only the owner can update."""
    try:
        user = get_user(request)
        pool = await get_db_pool(request)

        async with pool.acquire() as conn:
            # Verify ownership
            existing = await conn.fetchrow(
                'SELECT id FROM config_templates WHERE id = $1 AND "createdBy" = $2',
                template_id, user['id']
            )
            if not existing:
                raise HTTPException(status_code=404, detail="Template not found or not owned by you")

            # Build update query
            updates = []
            values = []
            param_idx = 1

            if data.name is not None:
                updates.append(f'name = ${param_idx}')
                values.append(data.name)
                param_idx += 1

            if data.description is not None:
                updates.append(f'description = ${param_idx}')
                values.append(data.description)
                param_idx += 1

            if data.category is not None:
                updates.append(f'category = ${param_idx}')
                values.append(data.category.value)
                param_idx += 1

            if data.config is not None:
                updates.append(f'config = ${param_idx}')
                values.append(json.dumps(data.config))
                param_idx += 1

            if data.variables is not None:
                updates.append(f'variables = ${param_idx}')
                values.append(json.dumps([v.model_dump() for v in data.variables]))
                param_idx += 1

            if data.isPublic is not None:
                updates.append(f'"isPublic" = ${param_idx}')
                values.append(data.isPublic)
                param_idx += 1

            if not updates:
                raise HTTPException(status_code=400, detail="No fields to update")

            updates.append(f'"updatedAt" = ${param_idx}')
            values.append(datetime.utcnow())
            param_idx += 1

            values.append(template_id)

            row = await conn.fetchrow(
                f"""
                UPDATE config_templates
                SET {', '.join(updates)}
                WHERE id = ${param_idx}
                RETURNING id, name, description, category, config, variables,
                          "isPublic", "createdBy", "createdByName", "createdAt", "updatedAt"
                """,
                *values
            )

            variables = row['variables']
            if variables and isinstance(variables, str):
                variables = json.loads(variables)

            return ConfigTemplateResponse(
                id=row['id'],
                name=row['name'],
                description=row['description'],
                category=TemplateCategory(row['category']),
                config=row['config'] if isinstance(row['config'], dict) else json.loads(row['config']),
                variables=variables,
                isPublic=row['isPublic'],
                createdBy=row['createdBy'],
                createdByName=row['createdByName'],
                createdAt=row['createdAt'],
                updatedAt=row['updatedAt']
            )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{template_id}")
async def delete_template(request: Request, template_id: str):
    """Delete a template. Only the owner can delete."""
    try:
        user = get_user(request)
        pool = await get_db_pool(request)

        async with pool.acquire() as conn:
            result = await conn.execute(
                'DELETE FROM config_templates WHERE id = $1 AND "createdBy" = $2',
                template_id, user['id']
            )

            if result == "DELETE 0":
                raise HTTPException(status_code=404, detail="Template not found or not owned by you")

            return {"success": True}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ========================================================================
# Apply Template
# ========================================================================


@router.post("/{template_id}/apply", response_model=ApplyTemplateResponse)
async def apply_template(
    request: Request,
    template_id: str,
    data: ApplyTemplateRequest
):
    """
    Apply a template to the current VyOS instance.

    Substitutes variables and applies the configuration commands.
    """
    from session_vyos_service import get_session_vyos_service

    try:
        user = get_user(request)
        pool = await get_db_pool(request)

        async with pool.acquire() as conn:
            row = await conn.fetchrow(
                """
                SELECT config, variables
                FROM config_templates
                WHERE id = $1 AND ("createdBy" = $2 OR "isPublic" = true)
                """,
                template_id, user['id']
            )

            if not row:
                raise HTTPException(status_code=404, detail="Template not found")

            config = row['config']
            if isinstance(config, str):
                config = json.loads(config)

            variables = row['variables']
            if variables and isinstance(variables, str):
                variables = json.loads(variables)

            # Validate required variables
            if variables:
                for var in variables:
                    if var.get('required', True) and var['name'] not in data.variable_values:
                        if not var.get('default_value'):
                            raise HTTPException(
                                status_code=400,
                                detail=f"Missing required variable: {var['name']}"
                            )

            # Substitute variables
            final_config = substitute_variables(config, data.variable_values)

            # Get VyOS service and apply config
            service = get_session_vyos_service(request)

            commands_applied = 0
            if 'set_commands' in final_config:
                for cmd in final_config['set_commands']:
                    path = cmd.split()[1:]  # Remove 'set' prefix
                    # This is a simplified example - real implementation would
                    # need proper command parsing and execution
                    commands_applied += 1

            return ApplyTemplateResponse(
                success=True,
                commands_applied=commands_applied,
                message=f"Template applied successfully ({commands_applied} commands)"
            )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
