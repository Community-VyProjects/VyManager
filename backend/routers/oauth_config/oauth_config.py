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
import uuid
from datetime import datetime
from typing import Any, Dict, Optional

import asyncpg
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel

from org_scope import org_conn, org_conn_admin
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


# ============================================================================
# OAuth providers
#
# better-auth reads oauth_providers at login (in the frontend) to configure the
# OAuth flow; these endpoints own the writes. The frontend proxies to them and
# drops the better-auth cache on a successful write, same as the role mappings.
# ============================================================================


class ProviderUpsertInput(BaseModel):
    """Create/update body. providerId/displayName/clientId/clientSecret are
    required on create; update patches whatever is supplied."""

    providerId: Optional[str] = None
    displayName: Optional[str] = None
    clientId: Optional[str] = None
    clientSecret: Optional[str] = None
    enabled: Optional[bool] = None
    discoveryUrl: Optional[str] = None
    authorizationUrl: Optional[str] = None
    tokenUrl: Optional[str] = None
    userInfoUrl: Optional[str] = None
    scopes: Optional[str] = None
    pkce: Optional[bool] = None
    roleMappingEnabled: Optional[bool] = None
    groupsClaim: Optional[str] = None


class ProviderEnabledInput(BaseModel):
    enabled: bool


def _iso(value: Any) -> Any:
    return value.isoformat() if isinstance(value, datetime) else value


def _serialize_provider(row: asyncpg.Record, include_secret: bool = False) -> Dict[str, Any]:
    """Shape a provider row for the frontend. The client secret is only ever
    returned on the single-item GET (for editing), never on lists or writes."""
    data = {
        "id": row["id"],
        "providerId": row["providerId"],
        "displayName": row["displayName"],
        "enabled": row["enabled"],
        "clientId": row["clientId"],
        "discoveryUrl": row["discoveryUrl"],
        "authorizationUrl": row["authorizationUrl"],
        "tokenUrl": row["tokenUrl"],
        "userInfoUrl": row["userInfoUrl"],
        "scopes": row["scopes"],
        "pkce": row["pkce"],
        "roleMappingEnabled": row["roleMappingEnabled"],
        "groupsClaim": row["groupsClaim"],
        "createdAt": _iso(row["createdAt"]),
        "updatedAt": _iso(row["updatedAt"]),
    }
    if include_secret:
        data["clientSecret"] = row["clientSecret"]
    return data


@router.get("")
async def list_providers(
    request: Request, conn: asyncpg.Connection = Depends(org_conn_admin)
):
    """List all configured providers (never includes client secrets)."""
    await require_super_admin(request)
    rows = await conn.fetch('SELECT * FROM oauth_providers ORDER BY "createdAt" ASC')
    return {"providers": [_serialize_provider(r) for r in rows]}


@router.post("")
async def upsert_provider(
    body: ProviderUpsertInput,
    request: Request,
    conn: asyncpg.Connection = Depends(org_conn_admin),
):
    """Create a provider, or update it in place when the providerId exists."""
    await require_super_admin(request)
    if not (body.providerId and body.displayName and body.clientId and body.clientSecret):
        raise HTTPException(
            status_code=400,
            detail="providerId, displayName, clientId, and clientSecret are required",
        )
    row = await conn.fetchrow(
        """
        INSERT INTO oauth_providers
            (id, "providerId", "displayName", "clientId", "clientSecret", enabled,
             "discoveryUrl", "authorizationUrl", "tokenUrl", "userInfoUrl", scopes,
             pkce, "roleMappingEnabled", "groupsClaim", "createdAt", "updatedAt")
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14,
                NOW(), NOW())
        ON CONFLICT ("providerId") DO UPDATE SET
            "displayName" = EXCLUDED."displayName",
            "clientId" = EXCLUDED."clientId",
            "clientSecret" = EXCLUDED."clientSecret",
            enabled = EXCLUDED.enabled,
            "discoveryUrl" = EXCLUDED."discoveryUrl",
            "authorizationUrl" = EXCLUDED."authorizationUrl",
            "tokenUrl" = EXCLUDED."tokenUrl",
            "userInfoUrl" = EXCLUDED."userInfoUrl",
            scopes = EXCLUDED.scopes,
            pkce = EXCLUDED.pkce,
            "roleMappingEnabled" = EXCLUDED."roleMappingEnabled",
            "groupsClaim" = EXCLUDED."groupsClaim",
            "updatedAt" = NOW()
        RETURNING *
        """,
        str(uuid.uuid4()),
        body.providerId,
        body.displayName,
        body.clientId,
        body.clientSecret,
        bool(body.enabled) if body.enabled is not None else False,
        body.discoveryUrl or None,
        body.authorizationUrl or None,
        body.tokenUrl or None,
        body.userInfoUrl or None,
        body.scopes or None,
        bool(body.pkce) if body.pkce is not None else True,
        bool(body.roleMappingEnabled) if body.roleMappingEnabled is not None else False,
        body.groupsClaim or None,
    )
    return {"provider": _serialize_provider(row)}


# Declared before /{provider_id} so "public" is not captured as a provider id.
@router.get("/public")
async def list_public_providers(conn: asyncpg.Connection = Depends(org_conn)):
    """Enabled providers with no secrets, for the pre-auth login page."""
    rows = await conn.fetch(
        'SELECT "providerId", "displayName", enabled FROM oauth_providers'
        ' WHERE enabled = true ORDER BY "createdAt" ASC'
    )
    return {
        "providers": [
            {
                "providerId": r["providerId"],
                "displayName": r["displayName"],
                "enabled": r["enabled"],
            }
            for r in rows
        ]
    }


@router.get("/{provider_id}")
async def get_provider(
    provider_id: str,
    request: Request,
    conn: asyncpg.Connection = Depends(org_conn_admin),
):
    """Get a single provider, including its client secret for editing."""
    await require_super_admin(request)
    row = await conn.fetchrow(
        'SELECT * FROM oauth_providers WHERE "providerId" = $1', provider_id
    )
    if not row:
        raise HTTPException(status_code=404, detail="Provider not found")
    return {"provider": _serialize_provider(row, include_secret=True)}


@router.put("/{provider_id}")
async def update_provider(
    provider_id: str,
    body: ProviderUpsertInput,
    request: Request,
    conn: asyncpg.Connection = Depends(org_conn_admin),
):
    """Full update. Unset fields keep their stored value; the client secret is
    only rewritten when a non-empty value is supplied."""
    await require_super_admin(request)
    existing = await conn.fetchrow(
        'SELECT * FROM oauth_providers WHERE "providerId" = $1', provider_id
    )
    if not existing:
        raise HTTPException(status_code=404, detail="Provider not found")

    def keep_nullable(new: Optional[str], key: str) -> Optional[str]:
        return (new or None) if new is not None else existing[key]

    display_name = body.displayName if body.displayName is not None else existing["displayName"]
    client_id = body.clientId if body.clientId is not None else existing["clientId"]
    client_secret = body.clientSecret if body.clientSecret else existing["clientSecret"]
    enabled = body.enabled if body.enabled is not None else existing["enabled"]
    pkce = body.pkce if body.pkce is not None else existing["pkce"]
    role_mapping = (
        body.roleMappingEnabled
        if body.roleMappingEnabled is not None
        else existing["roleMappingEnabled"]
    )

    row = await conn.fetchrow(
        """
        UPDATE oauth_providers SET
            "displayName" = $2,
            "clientId" = $3,
            "clientSecret" = $4,
            enabled = $5,
            "discoveryUrl" = $6,
            "authorizationUrl" = $7,
            "tokenUrl" = $8,
            "userInfoUrl" = $9,
            scopes = $10,
            pkce = $11,
            "roleMappingEnabled" = $12,
            "groupsClaim" = $13,
            "updatedAt" = NOW()
        WHERE "providerId" = $1
        RETURNING *
        """,
        provider_id,
        display_name,
        client_id,
        client_secret,
        enabled,
        keep_nullable(body.discoveryUrl, "discoveryUrl"),
        keep_nullable(body.authorizationUrl, "authorizationUrl"),
        keep_nullable(body.tokenUrl, "tokenUrl"),
        keep_nullable(body.userInfoUrl, "userInfoUrl"),
        keep_nullable(body.scopes, "scopes"),
        pkce,
        role_mapping,
        keep_nullable(body.groupsClaim, "groupsClaim"),
    )
    return {"provider": _serialize_provider(row)}


@router.patch("/{provider_id}")
async def set_provider_enabled(
    provider_id: str,
    body: ProviderEnabledInput,
    request: Request,
    conn: asyncpg.Connection = Depends(org_conn_admin),
):
    """Toggle just the enabled flag."""
    await require_super_admin(request)
    if not await conn.fetchval(
        'SELECT 1 FROM oauth_providers WHERE "providerId" = $1', provider_id
    ):
        raise HTTPException(status_code=404, detail="Provider not found")
    row = await conn.fetchrow(
        'UPDATE oauth_providers SET enabled = $2, "updatedAt" = NOW()'
        ' WHERE "providerId" = $1 RETURNING *',
        provider_id,
        body.enabled,
    )
    return {"provider": _serialize_provider(row)}


@router.delete("/{provider_id}")
async def delete_provider(
    provider_id: str,
    request: Request,
    conn: asyncpg.Connection = Depends(org_conn_admin),
):
    """Delete a provider (cascades its role mappings)."""
    await require_super_admin(request)
    if not await conn.fetchval(
        'SELECT 1 FROM oauth_providers WHERE "providerId" = $1', provider_id
    ):
        raise HTTPException(status_code=404, detail="Provider not found")
    await conn.execute('DELETE FROM oauth_providers WHERE "providerId" = $1', provider_id)
    return {"success": True}
