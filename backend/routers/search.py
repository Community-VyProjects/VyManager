"""
Global Search Router

API endpoint for searching across all entities.
"""

from fastapi import APIRouter, HTTPException, Request, Query
from pydantic import BaseModel
from typing import List, Optional, Literal
from datetime import datetime
import asyncpg

router = APIRouter(prefix="/search", tags=["search"])


# ========================================================================
# Pydantic Models
# ========================================================================


class SearchResult(BaseModel):
    """A single search result."""
    id: str
    type: Literal["site", "instance", "interface", "firewall_rule", "nat_rule", "route", "vpn"]
    title: str
    subtitle: Optional[str] = None
    description: Optional[str] = None
    icon: Optional[str] = None
    href: str
    instanceId: Optional[str] = None
    instanceName: Optional[str] = None


class SearchResponse(BaseModel):
    """Search response with grouped results."""
    results: List[SearchResult]
    total: int
    query: str


# ========================================================================
# Helper Functions
# ========================================================================


def get_user_id(request: Request) -> str:
    """Get the user ID from the request."""
    if hasattr(request.state, 'user') and request.state.user:
        return request.state.user.get('id')
    raise HTTPException(status_code=401, detail="Unauthorized")


async def get_db_pool(request: Request):
    """Get the database connection pool."""
    if hasattr(request.app.state, 'db_pool') and request.app.state.db_pool:
        return request.app.state.db_pool
    raise HTTPException(status_code=500, detail="Database not available")


# ========================================================================
# Endpoints
# ========================================================================


@router.get("", response_model=SearchResponse)
async def search(
    request: Request,
    q: str = Query(..., min_length=1, max_length=100, description="Search query"),
    limit: int = Query(20, ge=1, le=50, description="Max results"),
):
    """
    Search across sites, instances, and other entities.

    Searches by name, description, host, and other relevant fields.
    """
    try:
        user_id = get_user_id(request)
        pool = await get_db_pool(request)

        # Normalize query
        query = q.strip().lower()
        query_pattern = f"%{query}%"

        results: List[SearchResult] = []

        async with pool.acquire() as conn:
            # Search sites
            sites = await conn.fetch(
                """
                SELECT DISTINCT s.id, s.name, s.description
                FROM sites s
                INNER JOIN instances i ON i."siteId" = s.id
                INNER JOIN user_instance_roles uir ON uir."instanceId" = i.id
                WHERE uir."userId" = $1
                AND (LOWER(s.name) LIKE $2 OR LOWER(COALESCE(s.description, '')) LIKE $2)
                LIMIT $3
                """,
                user_id, query_pattern, limit
            )

            for site in sites:
                results.append(SearchResult(
                    id=site['id'],
                    type="site",
                    title=site['name'],
                    subtitle="Site",
                    description=site['description'],
                    icon="globe",
                    href=f"/sites/{site['id']}"
                ))

            # Search instances
            instances = await conn.fetch(
                """
                SELECT i.id, i.name, i.description, i.host, i.port, i."vyosVersion",
                       s.name as "siteName"
                FROM instances i
                INNER JOIN sites s ON s.id = i."siteId"
                INNER JOIN user_instance_roles uir ON uir."instanceId" = i.id
                WHERE uir."userId" = $1
                AND (
                    LOWER(i.name) LIKE $2 OR
                    LOWER(COALESCE(i.description, '')) LIKE $2 OR
                    LOWER(i.host) LIKE $2
                )
                LIMIT $3
                """,
                user_id, query_pattern, limit
            )

            for inst in instances:
                results.append(SearchResult(
                    id=inst['id'],
                    type="instance",
                    title=inst['name'],
                    subtitle=f"{inst['host']}:{inst['port']}",
                    description=f"{inst['siteName']} - {inst['description'] or 'VyOS ' + (inst['vyosVersion'] or '')}",
                    icon="server",
                    href=f"/overview",  # Will connect to this instance
                    instanceId=inst['id'],
                    instanceName=inst['name']
                ))

            # Search firewall rules (from config backups if available)
            # This is a simplified search - in production you'd index the config
            fw_rules = await conn.fetch(
                """
                SELECT DISTINCT ar.id, ar.name, ar.description, ar.type, ar.severity,
                       i.id as "instanceId", i.name as "instanceName"
                FROM alert_rules ar
                INNER JOIN instances i ON i.id = ar."instanceId"
                INNER JOIN user_instance_roles uir ON uir."instanceId" = i.id
                WHERE uir."userId" = $1
                AND (LOWER(ar.name) LIKE $2 OR LOWER(COALESCE(ar.description, '')) LIKE $2)
                LIMIT $3
                """,
                user_id, query_pattern, limit
            )

            for rule in fw_rules:
                results.append(SearchResult(
                    id=rule['id'],
                    type="firewall_rule",
                    title=rule['name'],
                    subtitle=f"Alert Rule - {rule['type']}",
                    description=rule['description'],
                    icon="shield",
                    href="/monitoring",
                    instanceId=rule['instanceId'],
                    instanceName=rule['instanceName']
                ))

            # Search config backups by name
            backups = await conn.fetch(
                """
                SELECT cb.id, cb.name, cb.description, cb."createdAt",
                       i.id as "instanceId", i.name as "instanceName"
                FROM config_backups cb
                INNER JOIN instances i ON i.id = cb."instanceId"
                INNER JOIN user_instance_roles uir ON uir."instanceId" = i.id
                WHERE uir."userId" = $1
                AND (LOWER(cb.name) LIKE $2 OR LOWER(COALESCE(cb.description, '')) LIKE $2)
                ORDER BY cb."createdAt" DESC
                LIMIT $3
                """,
                user_id, query_pattern, limit
            )

            for backup in backups:
                results.append(SearchResult(
                    id=backup['id'],
                    type="route",  # Using route type for backups
                    title=backup['name'],
                    subtitle=f"Config Backup - {backup['instanceName']}",
                    description=backup['description'],
                    icon="file-archive",
                    href="/system/backups",
                    instanceId=backup['instanceId'],
                    instanceName=backup['instanceName']
                ))

        # Sort results - prioritize exact matches
        def sort_key(r: SearchResult) -> int:
            title_lower = r.title.lower()
            if title_lower == query:
                return 0
            if title_lower.startswith(query):
                return 1
            return 2

        results.sort(key=sort_key)

        # Limit total results
        results = results[:limit]

        return SearchResponse(
            results=results,
            total=len(results),
            query=q
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
