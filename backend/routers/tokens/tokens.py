"""
Personal Access Token management (self-service).

Authenticated users mint, list, and revoke their own API tokens. A token
authenticates non-cookie clients (e.g. the MCP server) as its owner, so it is
automatically capped to that user's RBAC. The plaintext token is returned once
at creation and never again; only its sha256 hash is stored.
"""

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime, timedelta
import asyncpg
import logging

from middleware.auth import get_current_user
from api_token_crypto import generate_api_token
from fastapi_permissions import is_read_only_token

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/tokens", tags=["tokens"])

# Scopes a self-service token may request. Empty list = inherit full user RBAC.
_ALLOWED_SCOPES = {"read"}


class TokenCreateRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=100, description="Human-readable label")
    expires_in_days: Optional[int] = Field(
        None, ge=1, le=3650, description="Days until expiry; omit for no expiry"
    )
    scopes: List[str] = Field(
        default_factory=list,
        description='Empty = full user RBAC; ["read"] = read-only regardless of role',
    )
    allowed_instance_ids: List[str] = Field(
        default_factory=list,
        description="Restrict to these instances; empty = any instance the user can access",
    )
    allowed_site_ids: List[str] = Field(
        default_factory=list,
        description="Restrict to instances in these sites; empty = no site restriction",
    )


class TokenMetadata(BaseModel):
    id: str
    name: str
    prefix: str
    scopes: List[str]
    allowed_instance_ids: List[str]
    allowed_site_ids: List[str]
    last_used_at: Optional[datetime]
    expires_at: Optional[datetime]
    revoked_at: Optional[datetime]
    created_at: datetime


class TokenCreateResponse(BaseModel):
    token: str  # plaintext, shown exactly once
    metadata: TokenMetadata


def _get_db_pool(request: Request) -> asyncpg.Pool:
    pool = getattr(request.app.state, "db_pool", None)
    if pool is None:
        raise HTTPException(status_code=503, detail="Database connection not available")
    return pool


def _row_to_metadata(row: asyncpg.Record) -> TokenMetadata:
    return TokenMetadata(
        id=row["id"],
        name=row["name"],
        prefix=row["prefix"],
        scopes=list(row["scopes"] or []),
        allowed_instance_ids=list(row["allowedInstanceIds"] or []),
        allowed_site_ids=list(row["allowedSiteIds"] or []),
        last_used_at=row["lastUsedAt"],
        expires_at=row["expiresAt"],
        revoked_at=row["revokedAt"],
        created_at=row["createdAt"],
    )


def _reject_read_only(request: Request) -> None:
    """Read-only tokens manage nothing — block them from minting/revoking tokens."""
    if is_read_only_token(request):
        raise HTTPException(
            status_code=403,
            detail="This API token is read-only and cannot manage tokens."
        )


@router.post("", response_model=TokenCreateResponse)
async def create_token(request: Request, body: TokenCreateRequest):
    user = get_current_user(request)
    _reject_read_only(request)

    invalid = set(body.scopes) - _ALLOWED_SCOPES
    if invalid:
        raise HTTPException(status_code=400, detail=f"Unknown scopes: {sorted(invalid)}")
    scopes = sorted(set(body.scopes))
    # Enforcement intersects scope with the user's grants, so over-broad lists are
    # harmless; we just dedupe what the caller asked for.
    allowed_instance_ids = sorted(set(body.allowed_instance_ids))
    allowed_site_ids = sorted(set(body.allowed_site_ids))

    expires_at = (
        datetime.utcnow() + timedelta(days=body.expires_in_days)
        if body.expires_in_days is not None
        else None
    )

    plaintext, token_hash, prefix = generate_api_token()

    db_pool = _get_db_pool(request)
    async with db_pool.acquire() as conn:
        row = await conn.fetchrow(
            """
            INSERT INTO api_tokens
                (id, "userId", name, "tokenHash", prefix, scopes,
                 "allowedInstanceIds", "allowedSiteIds", "expiresAt", "createdAt")
            VALUES (gen_random_uuid()::text, $1, $2, $3, $4, $5, $6, $7, $8, NOW())
            RETURNING id, name, prefix, scopes, "allowedInstanceIds", "allowedSiteIds",
                      "lastUsedAt", "expiresAt", "revokedAt", "createdAt"
            """,
            user["id"], body.name, token_hash, prefix, scopes,
            allowed_instance_ids, allowed_site_ids, expires_at,
        )

    logger.info("API token created for user %s (id=%s)", user["id"], row["id"])
    return TokenCreateResponse(token=plaintext, metadata=_row_to_metadata(row))


@router.get("", response_model=List[TokenMetadata])
async def list_tokens(request: Request):
    user = get_current_user(request)
    db_pool = _get_db_pool(request)
    async with db_pool.acquire() as conn:
        rows = await conn.fetch(
            """
            SELECT id, name, prefix, scopes, "allowedInstanceIds", "allowedSiteIds",
                   "lastUsedAt", "expiresAt", "revokedAt", "createdAt"
            FROM api_tokens
            WHERE "userId" = $1
            ORDER BY "createdAt" DESC
            """,
            user["id"],
        )
    return [_row_to_metadata(r) for r in rows]


@router.delete("/{token_id}")
async def revoke_token(request: Request, token_id: str):
    user = get_current_user(request)
    _reject_read_only(request)
    db_pool = _get_db_pool(request)
    async with db_pool.acquire() as conn:
        # Scope the revoke to the caller's own tokens; null revokedAt = not yet revoked.
        result = await conn.execute(
            """
            UPDATE api_tokens
            SET "revokedAt" = NOW()
            WHERE id = $1 AND "userId" = $2 AND "revokedAt" IS NULL
            """,
            token_id, user["id"],
        )

    # asyncpg returns e.g. "UPDATE 1" / "UPDATE 0"; 0 rows = nothing to revoke.
    if int(result.split()[-1]) == 0:
        raise HTTPException(status_code=404, detail="Token not found or already revoked")

    logger.info("API token revoked for user %s (id=%s)", user["id"], token_id)
    return {"success": True}
