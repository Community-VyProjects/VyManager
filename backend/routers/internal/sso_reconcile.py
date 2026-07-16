"""Backend-owned SSO grant reconciliation (Golden Rule, RFC 3.3).

The frontend is banned from writing authorization tables. On an OAuth login
it notifies this endpoint with only a user reference; the backend re-derives
the IdP group claims from the user's STORED account token and applies the
oauth_role_mappings itself, then reconciles user_instance_roles /
user_feature_permissions. Any claims in the request body are ignored by
construction — the body carries none.

This is a port of the frontend's sso-role-mapping.resolveRoleMapping and
auth.ts reconcileGrants, with claim extraction moved server-side.
"""

import base64
import json
import logging
import os
from typing import Any, Dict, List, Optional

import asyncpg
from fastapi import APIRouter, Header, HTTPException, Request
from pydantic import BaseModel

from sso_jwt_verify import (
    TokenInvalid,
    VerificationUnavailable,
    require_verification,
    verified_claims,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/internal", tags=["internal"])

SSO_ASSIGNED_BY = "sso"
DEFAULT_GROUPS_CLAIM = "groups"
SITE_ROLE_RANK = {"ADMIN": 2, "VIEWER": 1}
INSTANCE_ROLE_RANK = {"ADMIN": 3, "OPERATOR": 2, "EDITOR": 2, "VIEWER": 1}


class SsoReconcileRequest(BaseModel):
    user_id: str
    # Note: no claims field by design. The backend derives claims itself.


def _internal_secret() -> str:
    return os.getenv("INTERNAL_API_SECRET") or os.getenv("BETTER_AUTH_SECRET") or ""


def _require_internal_auth(x_internal_auth: Optional[str]) -> None:
    import hmac

    expected = _internal_secret()
    if not expected:
        raise HTTPException(status_code=500,
                            detail="Server is not configured for internal requests")
    if not x_internal_auth or not hmac.compare_digest(x_internal_auth, expected):
        raise HTTPException(status_code=401, detail="Unauthorized")


# ---------------------------------------------------------------------------
# Claim extraction from a stored JWT id_token (no request-body trust)
# ---------------------------------------------------------------------------

def _decode_jwt_claims(id_token: str) -> Dict[str, Any]:
    """Decode a JWT payload without signature verification. The token was
    already verified by Better Auth during the OAuth code exchange and stored
    server-side; this reads claims from that stored state."""
    try:
        payload_b64 = id_token.split(".")[1]
        payload_b64 += "=" * (-len(payload_b64) % 4)  # pad base64url
        return json.loads(base64.urlsafe_b64decode(payload_b64))
    except Exception:
        return {}


def extract_claim_values(profile: Dict[str, Any], claim_name: str) -> List[str]:
    raw = profile.get(claim_name)
    if isinstance(raw, list):
        return [v for v in raw if isinstance(v, str) and v]
    if isinstance(raw, str):
        return [v for v in raw.replace(",", " ").split() if v]
    return []


# ---------------------------------------------------------------------------
# Mapping resolution (port of resolveRoleMapping / buildGrants)
# ---------------------------------------------------------------------------

def _merge_perms(base: List[dict], extra: List[dict]) -> List[dict]:
    by_feature: Dict[str, dict] = {}
    for perm in list(base) + list(extra):
        f = perm["feature"]
        cur = by_feature.get(f)
        if not cur:
            by_feature[f] = dict(perm)
        else:
            cur["canEdit"] = cur["canEdit"] or perm["canEdit"]
            cur["canView"] = cur["canView"] or perm["canView"]
    return list(by_feature.values())


def _build_grants(matched: List[dict], key: str) -> List[dict]:
    by_id: Dict[str, dict] = {}
    for rule in matched:
        ident = rule.get(key)
        role = rule.get("instanceRole")
        if not ident or not role:
            continue
        perms = rule.get("featurePermissions") or []
        cur = by_id.get(ident)
        if not cur:
            by_id[ident] = {"id": ident, "instanceRole": role,
                            "featurePermissions": _merge_perms([], perms)}
            continue
        if INSTANCE_ROLE_RANK.get(role, 0) > INSTANCE_ROLE_RANK.get(cur["instanceRole"], 0):
            cur["instanceRole"] = role
        cur["featurePermissions"] = _merge_perms(cur["featurePermissions"], perms)
    return list(by_id.values())


def resolve_role_mapping(enabled: bool, rules: List[dict],
                         claim_values: List[str]) -> dict:
    if not enabled:
        return {"denied": False, "siteRole": None,
                "instanceGrants": [], "siteGrants": []}
    claim_set = set(claim_values)
    matched = [r for r in rules if r["claimValue"] in claim_set]
    if not matched:
        return {"denied": True, "siteRole": None,
                "instanceGrants": [], "siteGrants": []}

    site_role, best = None, 0
    for rule in matched:
        sr = rule.get("siteRole")
        if sr and SITE_ROLE_RANK.get(sr, 0) > best:
            best, site_role = SITE_ROLE_RANK[sr], sr

    is_admin = site_role == "ADMIN"
    instance_grants = [] if is_admin else [
        {"instanceId": g["id"], "instanceRole": g["instanceRole"],
         "featurePermissions": g["featurePermissions"]}
        for g in _build_grants(matched, "instanceId")]
    site_grants = [] if is_admin else [
        {"siteId": g["id"], "instanceRole": g["instanceRole"],
         "featurePermissions": g["featurePermissions"]}
        for g in _build_grants(matched, "siteId")]
    return {"denied": False, "siteRole": site_role,
            "instanceGrants": instance_grants, "siteGrants": site_grants}


# ---------------------------------------------------------------------------
# Grant reconciliation (port of auth.ts reconcileGrants), server-side
# ---------------------------------------------------------------------------

async def _reconcile_grants(conn: asyncpg.Connection, user_id: str,
                            instance_grants: List[dict],
                            site_grants: List[dict]) -> None:
    desired: Dict[str, dict] = {}

    def add(instance_id: str, role: str, perms: List[dict]) -> None:
        cur = desired.get(instance_id)
        if not cur:
            desired[instance_id] = {"instanceRole": role,
                                    "featurePermissions": _merge_perms([], perms)}
            return
        if INSTANCE_ROLE_RANK.get(role, 0) > INSTANCE_ROLE_RANK.get(cur["instanceRole"], 0):
            cur["instanceRole"] = role
        cur["featurePermissions"] = _merge_perms(cur["featurePermissions"], perms)

    if site_grants:
        by_site = {g["siteId"]: g for g in site_grants}
        rows = await conn.fetch(
            'SELECT id, "siteId" FROM instances WHERE "siteId" = ANY($1)',
            list(by_site.keys()))
        for row in rows:
            g = by_site.get(row["siteId"])
            if g:
                add(row["id"], g["instanceRole"], g["featurePermissions"])
    for g in instance_grants:
        add(g["instanceId"], g["instanceRole"], g["featurePermissions"])

    valid = set()
    if desired:
        rows = await conn.fetch(
            "SELECT id FROM instances WHERE id = ANY($1)", list(desired.keys()))
        valid = {r["id"] for r in rows}

    # Remove SSO-managed assignments no longer desired.
    existing = await conn.fetch(
        'SELECT id, "instanceId" FROM user_instance_roles'
        ' WHERE "userId" = $1 AND "assignedBy" = $2',
        user_id, SSO_ASSIGNED_BY)
    for a in existing:
        if not a["instanceId"] or a["instanceId"] not in valid:
            await conn.execute(
                "DELETE FROM user_instance_roles WHERE id = $1", a["id"])

    # Upsert each desired assignment and rebuild its feature permissions.
    for instance_id, grant in desired.items():
        if instance_id not in valid:
            continue
        assignment_id = await conn.fetchval(
            '''
            INSERT INTO user_instance_roles
                (id, "userId", "instanceId", role, "assignedBy",
                 "createdAt", "updatedAt")
            VALUES (gen_random_uuid()::text, $1, $2, $3, $4, NOW(), NOW())
            ON CONFLICT ("userId", "instanceId")
            DO UPDATE SET role = EXCLUDED.role,
                          "assignedBy" = EXCLUDED."assignedBy",
                          "updatedAt" = NOW()
            RETURNING id
            ''',
            user_id, instance_id, grant["instanceRole"], SSO_ASSIGNED_BY)

        await conn.execute(
            'DELETE FROM user_feature_permissions WHERE "userInstanceRoleId" = $1',
            assignment_id)
        if grant["instanceRole"] != "ADMIN" and grant["featurePermissions"]:
            await conn.executemany(
                '''
                INSERT INTO user_feature_permissions
                    (id, "userInstanceRoleId", feature, "canEdit", "canView",
                     "createdAt")
                VALUES (gen_random_uuid()::text, $1, $2, $3, $4, NOW())
                ON CONFLICT ("userInstanceRoleId", feature) DO NOTHING
                ''',
                [(assignment_id, fp["feature"], fp["canEdit"], fp["canView"])
                 for fp in grant["featurePermissions"]])


@router.post("/sso-reconcile")
async def sso_reconcile(
    request: Request,
    body: SsoReconcileRequest,
    x_internal_auth: Optional[str] = Header(default=None),
) -> dict:
    """Re-derive the user's SSO grants from their stored account and apply
    oauth_role_mappings server-side. The request body carries no claims."""
    _require_internal_auth(x_internal_auth)

    pool: asyncpg.Pool = request.app.state.db_pool
    if pool is None:
        raise HTTPException(status_code=503, detail="Database not available")

    async with pool.acquire() as conn:
        async with conn.transaction():
            # The user's OAuth accounts (providerId + stored id_token).
            accounts = await conn.fetch(
                'SELECT "providerId", "idToken" FROM accounts WHERE "userId" = $1',
                body.user_id)
            if not accounts:
                return {"reconciled": False, "reason": "no oauth account"}

            applied = False
            for acc in accounts:
                provider = await conn.fetchrow(
                    'SELECT "providerId", enabled, "roleMappingEnabled",'
                    ' "groupsClaim", "discoveryUrl", "clientId"'
                    ' FROM oauth_providers'
                    ' WHERE "providerId" = $1 AND enabled = true',
                    acc["providerId"])
                if not provider or not provider["roleMappingEnabled"]:
                    continue

                claim_name = provider["groupsClaim"] or DEFAULT_GROUPS_CLAIM
                # Verify the stored id_token against the provider's JWKS
                # before trusting its groups: accounts is frontend-writable,
                # so an unverified decode would let a planted token mint
                # grants (audit D1-03).
                try:
                    claims = await verified_claims(
                        acc["idToken"] or "",
                        provider["discoveryUrl"],
                        provider["clientId"])
                except TokenInvalid as e:
                    # A token that FAILS verification is never trusted —
                    # skip this provider entirely (no grant changes).
                    logger.warning(
                        "sso-reconcile: id_token for provider %s failed "
                        "verification (%s); skipping", acc["providerId"], e)
                    continue
                except VerificationUnavailable as e:
                    if require_verification():
                        logger.warning(
                            "sso-reconcile: verification unavailable for "
                            "provider %s (%s) and "
                            "VYMANAGER_SSO_REQUIRE_JWT_VERIFY=1; skipping",
                            acc["providerId"], e)
                        continue
                    logger.info(
                        "sso-reconcile: verification unavailable for "
                        "provider %s (%s); using unverified claims",
                        acc["providerId"], e)
                    claims = _decode_jwt_claims(acc["idToken"] or "")
                claim_values = extract_claim_values(claims, claim_name)

                rules = [dict(r) for r in await conn.fetch(
                    'SELECT "claimValue", "siteRole", "instanceId", "siteId",'
                    ' "instanceRole", "featurePermissions"'
                    ' FROM oauth_role_mappings WHERE "providerId" = $1',
                    provider["providerId"])]
                for r in rules:
                    fp = r.get("featurePermissions")
                    r["featurePermissions"] = (
                        json.loads(fp) if isinstance(fp, str) else fp)

                resolved = resolve_role_mapping(True, rules, claim_values)
                if resolved["denied"]:
                    # Mapping enabled but no claim matched: strip SSO grants.
                    await _reconcile_grants(conn, body.user_id, [], [])
                    applied = True
                    continue

                if resolved["siteRole"]:
                    await conn.execute(
                        'UPDATE users SET role = $1, "updatedAt" = NOW()'
                        ' WHERE id = $2',
                        resolved["siteRole"], body.user_id)
                await _reconcile_grants(
                    conn, body.user_id,
                    resolved["instanceGrants"], resolved["siteGrants"])
                applied = True

    return {"reconciled": applied}
