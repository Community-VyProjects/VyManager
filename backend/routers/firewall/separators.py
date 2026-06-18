"""
Firewall Separators Router

User-defined coloured separator bars rendered between firewall rules. These are
pure UI metadata stored in the VyManager database (NOT in the VyOS config), in
the same spirit as dashboard layouts. The VyOS config stays the source of truth
for the rules themselves; separators only describe how to visually group them.

Separators are shared per instance (everyone viewing a router sees the same
bars) and gated by the FIREWALL_POLICIES permission, matching the firewall
rules page.
"""

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field
from typing import List, Optional
import asyncpg
import uuid

from fastapi_permissions import (
    require_permission,
    has_permission,
    PermissionLevel,
)
from rbac_permissions import FeatureGroup
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/vyos/firewall/separators", tags=["firewall_separators"])

# Families a separator may belong to. Mirrors the firewall rule families.
VALID_FAMILIES = {"ipv4", "ipv6", "bridge"}


async def _require_separator_permission(request: Request, level: PermissionLevel) -> None:
    """Separators live on firewall chains that are surfaced by both the policies
    page and the zones page, so accept either firewall permission. Passing the
    soft check on POLICIES short-circuits; otherwise fall through to ZONES,
    which raises a clean 403 if that is also missing."""
    if await has_permission(request, FeatureGroup.FIREWALL_POLICIES, level):
        return
    await require_permission(request, FeatureGroup.FIREWALL_ZONES, level)


# ========================================================================
# Pydantic Models
# ========================================================================


class FirewallSeparator(BaseModel):
    """A single separator bar."""

    id: str
    family: str
    chain: str
    position: int
    label: str
    color: str


class SeparatorUpsert(BaseModel):
    """An incoming create/update. When `id` is omitted (or unknown) a new row
    is created; when it matches an existing row for this instance it updates."""

    id: Optional[str] = None
    family: str = Field(..., description="ipv4 | ipv6 | bridge")
    chain: str = Field(..., min_length=1)
    position: int = Field(..., ge=0)
    label: str = Field(..., min_length=1, max_length=200)
    color: str = Field(..., min_length=1, max_length=32)


class SeparatorBatchRequest(BaseModel):
    """Atomic batch of separator changes for the current instance."""

    upserts: List[SeparatorUpsert] = []
    deletes: List[str] = []


class SeparatorListResponse(BaseModel):
    separators: List[FirewallSeparator]


# ========================================================================
# Helpers
# ========================================================================


def _require_instance(request: Request) -> str:
    instance = getattr(request.state, "instance", None)
    if not instance:
        raise HTTPException(status_code=404, detail="No active instance")
    return instance["id"]


async def _fetch_separators(
    conn: asyncpg.Connection, instance_id: str
) -> List[FirewallSeparator]:
    rows = await conn.fetch(
        """
        SELECT id, family, chain, position, label, color
        FROM firewall_separators
        WHERE "instanceId" = $1
        ORDER BY family, chain, position
        """,
        instance_id,
    )
    return [
        FirewallSeparator(
            id=r["id"],
            family=r["family"],
            chain=r["chain"],
            position=r["position"],
            label=r["label"],
            color=r["color"],
        )
        for r in rows
    ]


# ========================================================================
# Endpoint: List separators
# ========================================================================


@router.get("", response_model=SeparatorListResponse)
async def list_separators(request: Request):
    """List all separators for the current instance."""
    await _require_separator_permission(request, PermissionLevel.READ)
    try:
        instance_id = _require_instance(request)
        db_pool: asyncpg.Pool = request.app.state.db_pool
        async with db_pool.acquire() as conn:
            separators = await _fetch_separators(conn, instance_id)
        return SeparatorListResponse(separators=separators)
    except HTTPException:
        raise
    except Exception:
        logger.exception("Failed to list firewall separators")
        raise HTTPException(status_code=500, detail="Internal server error")


# ========================================================================
# Endpoint: Batch upsert / delete
# ========================================================================


@router.post("/batch", response_model=SeparatorListResponse)
async def batch_separators(request: Request, body: SeparatorBatchRequest):
    """Apply a batch of separator upserts and deletes for the current instance,
    atomically. Returns the full separator list for the instance afterwards."""
    await _require_separator_permission(request, PermissionLevel.WRITE)
    try:
        instance_id = _require_instance(request)

        for up in body.upserts:
            if up.family not in VALID_FAMILIES:
                raise HTTPException(
                    status_code=400, detail=f"Invalid family: {up.family}"
                )

        db_pool: asyncpg.Pool = request.app.state.db_pool
        async with db_pool.acquire() as conn:
            async with conn.transaction():
                # Deletes are scoped to this instance so a caller can never
                # remove another instance's separators by guessing an id.
                if body.deletes:
                    await conn.execute(
                        """
                        DELETE FROM firewall_separators
                        WHERE "instanceId" = $1 AND id = ANY($2::text[])
                        """,
                        instance_id,
                        body.deletes,
                    )

                for up in body.upserts:
                    if up.id:
                        # Update only if the row already belongs to this
                        # instance; otherwise fall through to an insert with a
                        # fresh server id (never reuse a client-supplied id, which
                        # could collide with another instance's primary key).
                        updated = await conn.fetchval(
                            """
                            UPDATE firewall_separators
                            SET family = $3, chain = $4, position = $5,
                                label = $6, color = $7, "updatedAt" = NOW()
                            WHERE id = $1 AND "instanceId" = $2
                            RETURNING id
                            """,
                            up.id,
                            instance_id,
                            up.family,
                            up.chain,
                            up.position,
                            up.label,
                            up.color,
                        )
                        if updated:
                            continue

                    await conn.execute(
                        """
                        INSERT INTO firewall_separators
                            (id, "instanceId", family, chain, position, label,
                             color, "createdAt", "updatedAt")
                        VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
                        """,
                        str(uuid.uuid4()),
                        instance_id,
                        up.family,
                        up.chain,
                        up.position,
                        up.label,
                        up.color,
                    )

                separators = await _fetch_separators(conn, instance_id)

        return SeparatorListResponse(separators=separators)
    except HTTPException:
        raise
    except Exception:
        logger.exception("Failed to apply firewall separator batch")
        raise HTTPException(status_code=500, detail="Internal server error")
