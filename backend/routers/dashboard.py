"""
Dashboard Layout Router

API endpoints for managing user dashboard layouts.
Layouts are stored per user + per instance.
"""

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from typing import Dict, Any, Optional
import asyncpg
import json
import uuid

from session_vyos_service import get_session_vyos_service

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


# ========================================================================
# Pydantic Models
# ========================================================================


class DashboardLayoutRequest(BaseModel):
    """Request model for saving dashboard layout."""
    layout: Dict[str, Any]  # JSON object with grid positions and card configs


class DashboardLayoutResponse(BaseModel):
    """Response model for dashboard layout."""
    layout: Optional[Dict[str, Any]] = None
    exists: bool


# ========================================================================
# Endpoint: Get Layout
# ========================================================================


@router.get("/layout", response_model=DashboardLayoutResponse)
async def get_dashboard_layout(request: Request):
    """
    Get the user's dashboard layout for the current instance.

    Returns:
        The saved layout or None if no layout exists
    """
    try:
        user = request.state.user
        if not user:
            raise HTTPException(status_code=401, detail="Not authenticated")

        instance = request.state.instance
        if not instance:
            raise HTTPException(status_code=404, detail="No active instance")

        user_id = user["id"]
        instance_id = instance["id"]

        db_pool: asyncpg.Pool = request.app.state.db_pool

        async with db_pool.acquire() as conn:
            result = await conn.fetchrow(
                """
                SELECT layout FROM dashboard_layouts
                WHERE "userId" = $1 AND "instanceId" = $2
                """,
                user_id,
                instance_id
            )

            if result:
                # Parse JSON string back to dict if needed
                layout_data = result["layout"]
                if isinstance(layout_data, str):
                    layout_data = json.loads(layout_data)
                return DashboardLayoutResponse(
                    layout=layout_data,
                    exists=True
                )
            else:
                return DashboardLayoutResponse(
                    layout=None,
                    exists=False
                )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ========================================================================
# Endpoint: Save Layout
# ========================================================================


@router.post("/layout")
async def save_dashboard_layout(request: Request, body: DashboardLayoutRequest):
    """
    Save the user's dashboard layout for the current instance.

    Upserts the layout (creates if doesn't exist, updates if exists).
    """
    try:
        user = request.state.user
        if not user:
            raise HTTPException(status_code=401, detail="Not authenticated")

        instance = request.state.instance
        if not instance:
            raise HTTPException(status_code=404, detail="No active instance")

        user_id = user["id"]
        instance_id = instance["id"]

        db_pool: asyncpg.Pool = request.app.state.db_pool

        async with db_pool.acquire() as conn:
            # Generate a unique ID for new records
            record_id = str(uuid.uuid4())

            # Upsert the layout
            # Note: For JSONB columns with asyncpg, we need to pass JSON string
            layout_json = json.dumps(body.layout)
            await conn.execute(
                """
                INSERT INTO dashboard_layouts (id, "userId", "instanceId", layout, "createdAt", "updatedAt")
                VALUES ($1, $2, $3, $4::jsonb, NOW(), NOW())
                ON CONFLICT ("userId", "instanceId")
                DO UPDATE SET layout = $4::jsonb, "updatedAt" = NOW()
                """,
                record_id,
                user_id,
                instance_id,
                layout_json
            )

        return {"success": True, "message": "Dashboard layout saved"}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
