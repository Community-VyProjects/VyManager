"""
Dashboard Layout Router

API endpoints for managing user dashboard layouts.
Layouts are stored per user + per instance.
"""

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from typing import Dict, Any, Optional, List
from datetime import datetime
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


# ========================================================================
# Dashboard Overview Models
# ========================================================================


class InstanceStatus(BaseModel):
    """Status of a single instance."""
    id: str
    name: str
    description: Optional[str] = None
    host: str
    port: int
    vyosVersion: Optional[str] = None
    isActive: bool
    siteId: str
    siteName: str
    isConnected: bool = False
    connectedAt: Optional[datetime] = None
    connectedBy: Optional[str] = None


class SiteOverview(BaseModel):
    """Overview of a single site."""
    id: str
    name: str
    description: Optional[str] = None
    instanceCount: int
    activeInstanceCount: int
    connectedInstanceCount: int
    instances: List[InstanceStatus]


class AlertsSummary(BaseModel):
    """Summary of alerts across all instances."""
    total: int
    critical: int
    warning: int
    info: int
    unacknowledged: int


class DashboardOverview(BaseModel):
    """Complete dashboard overview."""
    sites: List[SiteOverview]
    totalSites: int
    totalInstances: int
    activeInstances: int
    connectedInstances: int
    alerts: AlertsSummary


# ========================================================================
# Endpoint: Dashboard Overview
# ========================================================================


@router.get("/overview", response_model=DashboardOverview)
async def get_dashboard_overview(request: Request):
    """
    Get complete dashboard overview.

    Returns all sites with their instances and status,
    plus aggregated alert counts.
    """
    try:
        user = request.state.user
        if not user:
            raise HTTPException(status_code=401, detail="Not authenticated")

        user_id = user["id"]
        db_pool: asyncpg.Pool = request.app.state.db_pool

        async with db_pool.acquire() as conn:
            # Get all sites the user has access to
            sites_query = """
                SELECT DISTINCT s.id, s.name, s.description
                FROM sites s
                INNER JOIN instances i ON i."siteId" = s.id
                INNER JOIN user_instance_roles uir ON uir."instanceId" = i.id
                WHERE uir."userId" = $1
                ORDER BY s.name
            """
            sites = await conn.fetch(sites_query, user_id)

            # Get all instances with their connection status
            instances_query = """
                SELECT
                    i.id, i.name, i.description, i.host, i.port,
                    i."vyosVersion", i."isActive", i."siteId",
                    s.name as "siteName",
                    CASE WHEN as2.id IS NOT NULL THEN true ELSE false END as "isConnected",
                    as2."connectedAt",
                    u.name as "connectedBy"
                FROM instances i
                INNER JOIN sites s ON s.id = i."siteId"
                INNER JOIN user_instance_roles uir ON uir."instanceId" = i.id
                LEFT JOIN active_sessions as2 ON as2."instanceId" = i.id
                LEFT JOIN users u ON u.id = as2."userId"
                WHERE uir."userId" = $1
                ORDER BY s.name, i.name
            """
            instances = await conn.fetch(instances_query, user_id)

            # Get alert counts across all accessible instances
            alerts_query = """
                SELECT
                    COUNT(*) as total,
                    COUNT(*) FILTER (WHERE severity = 'CRITICAL') as critical,
                    COUNT(*) FILTER (WHERE severity = 'WARNING') as warning,
                    COUNT(*) FILTER (WHERE severity = 'INFO') as info,
                    COUNT(*) FILTER (WHERE acknowledged = false) as unacknowledged
                FROM alert_history ah
                INNER JOIN instances i ON i.id = ah."instanceId"
                INNER JOIN user_instance_roles uir ON uir."instanceId" = i.id
                WHERE uir."userId" = $1
                AND ah.resolved = false
            """
            alerts_row = await conn.fetchrow(alerts_query, user_id)

            # Build response
            sites_map: Dict[str, SiteOverview] = {}

            for site in sites:
                sites_map[site['id']] = SiteOverview(
                    id=site['id'],
                    name=site['name'],
                    description=site['description'],
                    instanceCount=0,
                    activeInstanceCount=0,
                    connectedInstanceCount=0,
                    instances=[]
                )

            total_instances = 0
            active_instances = 0
            connected_instances = 0

            for inst in instances:
                site_id = inst['siteId']
                if site_id not in sites_map:
                    continue

                instance_status = InstanceStatus(
                    id=inst['id'],
                    name=inst['name'],
                    description=inst['description'],
                    host=inst['host'],
                    port=inst['port'],
                    vyosVersion=inst['vyosVersion'],
                    isActive=inst['isActive'],
                    siteId=site_id,
                    siteName=inst['siteName'],
                    isConnected=inst['isConnected'],
                    connectedAt=inst['connectedAt'],
                    connectedBy=inst['connectedBy']
                )

                sites_map[site_id].instances.append(instance_status)
                sites_map[site_id].instanceCount += 1
                total_instances += 1

                if inst['isActive']:
                    sites_map[site_id].activeInstanceCount += 1
                    active_instances += 1

                if inst['isConnected']:
                    sites_map[site_id].connectedInstanceCount += 1
                    connected_instances += 1

            return DashboardOverview(
                sites=list(sites_map.values()),
                totalSites=len(sites_map),
                totalInstances=total_instances,
                activeInstances=active_instances,
                connectedInstances=connected_instances,
                alerts=AlertsSummary(
                    total=alerts_row['total'] or 0 if alerts_row else 0,
                    critical=alerts_row['critical'] or 0 if alerts_row else 0,
                    warning=alerts_row['warning'] or 0 if alerts_row else 0,
                    info=alerts_row['info'] or 0 if alerts_row else 0,
                    unacknowledged=alerts_row['unacknowledged'] or 0 if alerts_row else 0
                )
            )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
