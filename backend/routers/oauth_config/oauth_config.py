"""
OAuth Role Mapping Router

Backend-owned writes for the SSO role-mapping rules (oauth_role_mappings). The
Next.js route handlers proxy here and drop better-auth's in-process rule cache
after a successful write, so the frontend no longer writes these rows to
Postgres directly. ADMIN only.
"""
import json
import secrets
import string
from datetime import datetime
from typing import Any, Dict, Optional

import asyncpg
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel

from org_scope import org_conn_admin
from fastapi_permissions import require_super_admin

router = APIRouter(prefix="/oauth-config", tags=["oauth-config"])

# Mirror the Prisma Role / InstanceRole enums.
_SITE_ROLES = {"ADMIN", "VIEWER"}
_INSTANCE_ROLES = {"ADMIN", "EDITOR", "OPERATOR", "VIEWER"}

_ID_ALPHABET = string.ascii_lowercase + string.digits


def _new_id() -> str:
    # The Prisma default cuid() is generated client-side, so there is no DB
    # default to fall back on; mint a collision-resistant opaque id here.
    return "orm_" + "".join(secrets.choice(_ID_ALPHABET) for _ in range(24))


class RoleMappingInput(BaseModel):
    """Create/update body. Every field is optional so PUT can patch a subset;
    create enforces the required shape through _validate_grant."""

    claimValue: Optional[str] = None
    siteRole: Optional[str] = None
    instanceId: Optional[str] = None
    siteId: Optional[str] = None
    instanceRole: Optional[str] = None
    featurePermissions: Optional[Any] = None
    priority: Optional[int] = None


def _serialize(row: asyncpg.Record) -> Dict[str, Any]:
    """Shape a row to the RoleMapping the frontend expects (camelCase keys,
    parsed featurePermissions, ISO timestamps)."""
    fp = row["featurePermissions"]
    if isinstance(fp, str):
        try:
            fp = json.loads(fp)
        except (ValueError, TypeError):
            fp = None
    created = row["createdAt"]
    updated = row["updatedAt"]
    return {
        "id": row["id"],
        "providerId": row["providerId"],
        "claimValue": row["claimValue"],
        "siteRole": row["siteRole"],
        "instanceId": row["instanceId"],
        "siteId": row["siteId"],
        "instanceRole": row["instanceRole"],
        "featurePermissions": fp,
        "priority": row["priority"],
        "createdAt": created.isoformat() if isinstance(created, datetime) else created,
        "updatedAt": updated.isoformat() if isinstance(updated, datetime) else updated,
    }


def _fp_bind(value: Any) -> Optional[str]:
    """Bind featurePermissions as JSON text for a jsonb column (NULL when absent)."""
    if value is None:
        return None
    return value if isinstance(value, str) else json.dumps(value)


async def _require_provider(conn: asyncpg.Connection, provider_id: str) -> None:
    if not await conn.fetchval(
        'SELECT 1 FROM oauth_providers WHERE "providerId" = $1', provider_id
    ):
        raise HTTPException(status_code=404, detail="Provider not found")


async def _validate_grant(
    conn: asyncpg.Connection,
    claim_value: Any,
    site_role: Optional[str],
    instance_id: Optional[str],
    site_id: Optional[str],
    instance_role: Optional[str],
) -> Optional[str]:
    """Return an error string if the grant shape is invalid, otherwise None."""
    if not claim_value or not isinstance(claim_value, str):
        return "claimValue is required"
    if site_role and site_role not in _SITE_ROLES:
        return f"Invalid siteRole: {site_role}"
    if instance_role and instance_role not in _INSTANCE_ROLES:
        return f"Invalid instanceRole: {instance_role}"
    if instance_id and site_id:
        return "A grant targets an instance or a site, not both"
    if (instance_id or site_id) and not instance_role:
        return "instanceRole is required for an instance/site grant"
    if not site_role and not instance_id and not site_id:
        return "A rule must grant a site role and/or an instance/site role"
    if site_id and not await conn.fetchval("SELECT 1 FROM sites WHERE id = $1", site_id):
        return "Site not found"
    if instance_id and not await conn.fetchval(
        "SELECT 1 FROM instances WHERE id = $1", instance_id
    ):
        return "Instance not found"
    return None


@router.get("/{provider_id}/role-mappings")
async def list_role_mappings(
    provider_id: str,
    request: Request,
    conn: asyncpg.Connection = Depends(org_conn_admin),
):
    """List the role-mapping rules for a provider."""
    await require_super_admin(request)
    rows = await conn.fetch(
        """
        SELECT * FROM oauth_role_mappings
        WHERE "providerId" = $1
        ORDER BY "claimValue" ASC, priority DESC, "createdAt" ASC
        """,
        provider_id,
    )
    return {"mappings": [_serialize(r) for r in rows]}


@router.post("/{provider_id}/role-mappings")
async def create_role_mapping(
    provider_id: str,
    body: RoleMappingInput,
    request: Request,
    conn: asyncpg.Connection = Depends(org_conn_admin),
):
    """Create a role-mapping rule for a provider."""
    await require_super_admin(request)
    await _require_provider(conn, provider_id)

    site_role = body.siteRole or None
    instance_id = body.instanceId or None
    site_id = body.siteId or None
    instance_role = body.instanceRole or None
    priority = body.priority if isinstance(body.priority, int) else 0

    error = await _validate_grant(
        conn, body.claimValue, site_role, instance_id, site_id, instance_role
    )
    if error:
        raise HTTPException(status_code=400, detail=error)

    try:
        row = await conn.fetchrow(
            """
            INSERT INTO oauth_role_mappings
                (id, "providerId", "claimValue", "siteRole", "instanceId",
                 "siteId", "instanceRole", "featurePermissions", priority,
                 "createdAt", "updatedAt")
            VALUES ($1, $2, $3, $4::"Role", $5, $6, $7::"InstanceRole",
                    $8::jsonb, $9, NOW(), NOW())
            RETURNING *
            """,
            _new_id(),
            provider_id,
            body.claimValue,
            site_role,
            instance_id,
            site_id,
            instance_role,
            _fp_bind(body.featurePermissions),
            priority,
        )
    except asyncpg.UniqueViolationError:
        raise HTTPException(
            status_code=409,
            detail="A rule for this claim value and target already exists",
        )
    return {"mapping": _serialize(row)}


@router.put("/{provider_id}/role-mappings/{mapping_id}")
async def update_role_mapping(
    provider_id: str,
    mapping_id: str,
    body: RoleMappingInput,
    request: Request,
    conn: asyncpg.Connection = Depends(org_conn_admin),
):
    """Update a role-mapping rule. Fields left unset keep their stored value."""
    await require_super_admin(request)

    existing = await conn.fetchrow(
        "SELECT * FROM oauth_role_mappings WHERE id = $1", mapping_id
    )
    if not existing or existing["providerId"] != provider_id:
        raise HTTPException(status_code=404, detail="Mapping not found")

    if body.siteRole and body.siteRole not in _SITE_ROLES:
        raise HTTPException(status_code=400, detail=f"Invalid siteRole: {body.siteRole}")
    if body.instanceRole and body.instanceRole not in _INSTANCE_ROLES:
        raise HTTPException(
            status_code=400, detail=f"Invalid instanceRole: {body.instanceRole}"
        )

    claim_value = body.claimValue if body.claimValue is not None else existing["claimValue"]
    site_role = (body.siteRole or None) if body.siteRole is not None else existing["siteRole"]
    instance_id = (
        (body.instanceId or None) if body.instanceId is not None else existing["instanceId"]
    )
    site_id = (body.siteId or None) if body.siteId is not None else existing["siteId"]
    instance_role = (
        (body.instanceRole or None)
        if body.instanceRole is not None
        else existing["instanceRole"]
    )
    priority = body.priority if isinstance(body.priority, int) else existing["priority"]
    # Only rewrite the JSON column when the caller supplies it; otherwise keep
    # the stored jsonb text as-is.
    feature_permissions = (
        _fp_bind(body.featurePermissions)
        if body.featurePermissions is not None
        else existing["featurePermissions"]
    )

    try:
        row = await conn.fetchrow(
            """
            UPDATE oauth_role_mappings
            SET "claimValue" = $2,
                "siteRole" = $3::"Role",
                "instanceId" = $4,
                "siteId" = $5,
                "instanceRole" = $6::"InstanceRole",
                "featurePermissions" = $7::jsonb,
                priority = $8,
                "updatedAt" = NOW()
            WHERE id = $1
            RETURNING *
            """,
            mapping_id,
            claim_value,
            site_role,
            instance_id,
            site_id,
            instance_role,
            feature_permissions,
            priority,
        )
    except asyncpg.UniqueViolationError:
        raise HTTPException(
            status_code=409,
            detail="A rule for this claim value and instance already exists",
        )
    return {"mapping": _serialize(row)}


@router.delete("/{provider_id}/role-mappings/{mapping_id}")
async def delete_role_mapping(
    provider_id: str,
    mapping_id: str,
    request: Request,
    conn: asyncpg.Connection = Depends(org_conn_admin),
):
    """Delete a role-mapping rule."""
    await require_super_admin(request)
    existing = await conn.fetchrow(
        'SELECT id, "providerId" FROM oauth_role_mappings WHERE id = $1', mapping_id
    )
    if not existing or existing["providerId"] != provider_id:
        raise HTTPException(status_code=404, detail="Mapping not found")
    await conn.execute("DELETE FROM oauth_role_mappings WHERE id = $1", mapping_id)
    return {"success": True}
