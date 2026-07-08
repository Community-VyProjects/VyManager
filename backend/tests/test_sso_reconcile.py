"""Backend SSO reconciliation: mapping resolution, grant writes, and the
forged-claims property (request body carries no authority)."""

import asyncio
import base64
import json
import os

import pytest

from routers.internal.sso_reconcile import (
    extract_claim_values,
    resolve_role_mapping,
    _decode_jwt_claims,
)

requires_db = pytest.mark.skipif(
    not os.environ.get("DATABASE_URL"),
    reason="SSO reconcile endpoint test needs DATABASE_URL",
)

SECRET = "sso-reconcile-secret"


# ---------------------------------------------------------------------------
# Pure logic (no DB)
# ---------------------------------------------------------------------------

def _jwt(payload: dict) -> str:
    def b64(d):
        return base64.urlsafe_b64encode(json.dumps(d).encode()).rstrip(b"=").decode()
    return f"{b64({'alg': 'none'})}.{b64(payload)}.sig"


def test_decode_jwt_claims_reads_groups():
    token = _jwt({"groups": ["admins", "ops"], "email": "a@b.c"})
    claims = _decode_jwt_claims(token)
    assert claims["groups"] == ["admins", "ops"]


def test_extract_claim_values_shapes():
    assert extract_claim_values({"groups": ["a", "b"]}, "groups") == ["a", "b"]
    assert extract_claim_values({"groups": "a b,c"}, "groups") == ["a", "b", "c"]
    assert extract_claim_values({}, "groups") == []


def test_resolve_no_match_denies():
    rules = [{"claimValue": "admins", "siteRole": "ADMIN",
              "instanceId": None, "siteId": None,
              "instanceRole": None, "featurePermissions": None}]
    assert resolve_role_mapping(True, rules, ["nobody"])["denied"] is True


def test_resolve_instance_grant():
    rules = [{"claimValue": "ops", "siteRole": None,
              "instanceId": "i1", "siteId": None, "instanceRole": "OPERATOR",
              "featurePermissions": [{"feature": "FIREWALL",
                                      "canEdit": True, "canView": True}]}]
    r = resolve_role_mapping(True, rules, ["ops"])
    assert r["denied"] is False
    assert r["instanceGrants"][0]["instanceId"] == "i1"
    assert r["instanceGrants"][0]["instanceRole"] == "OPERATOR"


# ---------------------------------------------------------------------------
# Endpoint (real DB): reconciliation + forged-claims property
# ---------------------------------------------------------------------------

@requires_db
def test_endpoint_reconciles_and_ignores_body_claims(monkeypatch):
    import asyncpg
    from fastapi.testclient import TestClient

    monkeypatch.setenv("BETTER_AUTH_SECRET", SECRET)
    db = os.environ["DATABASE_URL"]

    # Stored token grants the "ops" group -> OPERATOR on i_sso.
    id_token = _jwt({"groups": ["ops"], "email": "sso@rec.test"})

    async def seed():
        conn = await asyncpg.connect(db)
        await conn.execute("DELETE FROM users WHERE id = 'u_sso'")
        await conn.execute("DELETE FROM sites WHERE id = 's_sso'")
        await conn.execute("DELETE FROM oauth_providers WHERE \"providerId\" = 'idp'")
        await conn.execute("""
            INSERT INTO users (id,email,name,role,"emailVerified","createdAt","updatedAt")
            VALUES ('u_sso','sso@rec.test','SSO','VIEWER',true,NOW(),NOW())""")
        await conn.execute("""
            INSERT INTO sites (id,name,"orgId","createdAt","updatedAt")
            VALUES ('s_sso','SSO Site','default',NOW(),NOW())""")
        await conn.execute("""
            INSERT INTO instances (id,"siteId",name,host,username,password,"createdAt","updatedAt")
            VALUES ('i_sso','s_sso','r','1.1.1.1','v','p',NOW(),NOW())""")
        await conn.execute("""
            INSERT INTO oauth_providers (id,"providerId","displayName",enabled,"clientId","clientSecret","roleMappingEnabled","groupsClaim","createdAt","updatedAt")
            VALUES ('op1','idp','IdP',true,'cid','csec',true,'groups',NOW(),NOW())""")
        await conn.execute("""
            INSERT INTO oauth_role_mappings (id,"providerId","claimValue","instanceId","instanceRole","featurePermissions",priority,"createdAt","updatedAt")
            VALUES ('m1','idp','ops','i_sso','OPERATOR','[{"feature":"FIREWALL","canEdit":true,"canView":true}]'::jsonb,0,NOW(),NOW())""")
        await conn.execute("""
            INSERT INTO accounts (id,"accountId","providerId","userId","idToken","createdAt","updatedAt")
            VALUES ('a1','acc1','idp','u_sso',$1,NOW(),NOW())""", id_token)
        await conn.close()

    async def grants():
        conn = await asyncpg.connect(db)
        rows = await conn.fetch(
            'SELECT "instanceId", role FROM user_instance_roles WHERE "userId" = $1',
            "u_sso")
        await conn.close()
        return {(r["instanceId"], r["role"]) for r in rows}

    async def cleanup():
        conn = await asyncpg.connect(db)
        await conn.execute("DELETE FROM users WHERE id = 'u_sso'")
        await conn.execute("DELETE FROM sites WHERE id = 's_sso'")
        await conn.execute("DELETE FROM oauth_providers WHERE \"providerId\" = 'idp'")
        await conn.close()

    from app import app
    asyncio.run(seed())
    try:
        with TestClient(app) as client:
            hdr = {"X-Internal-Auth": SECRET}

            # No auth header -> 401.
            assert client.post("/internal/sso-reconcile",
                               json={"user_id": "u_sso"}).status_code == 401

            # Reconcile: derives "ops" from the STORED token -> OPERATOR on i_sso.
            r = client.post("/internal/sso-reconcile",
                            json={"user_id": "u_sso"}, headers=hdr)
            assert r.status_code == 200 and r.json()["reconciled"] is True
            assert asyncio.run(grants()) == {("i_sso", "OPERATOR")}

            # Forged claims in the body must be ignored: even asserting an
            # ADMIN group, the result still reflects the stored token (ops).
            r2 = client.post(
                "/internal/sso-reconcile",
                json={"user_id": "u_sso", "groups": ["admins"],
                      "claims": {"groups": ["admins"]}, "role": "ADMIN"},
                headers=hdr)
            assert r2.status_code == 200
            assert asyncio.run(grants()) == {("i_sso", "OPERATOR")}
    finally:
        asyncio.run(cleanup())
