"""JWKS verification of stored SSO id_tokens (audit D1-03). No DB needed.

Generates a real RSA keypair, serves discovery/JWKS from monkeypatched
fetches, and proves: a properly signed token passes; a tampered or
expired token, a wrong audience, and an HMAC downgrade are rejected as
TokenInvalid (never falling back); missing discovery is
VerificationUnavailable (legacy fallback allowed unless the strict env
flag is set).
"""

import asyncio
import time

import jwt
import pytest
from cryptography.hazmat.primitives.asymmetric import rsa

import sso_jwt_verify
from sso_jwt_verify import (
    TokenInvalid,
    VerificationUnavailable,
    verified_claims,
)

ISSUER = "https://idp.test"
CLIENT_ID = "vymanager-client"
DISCOVERY_URL = "https://idp.test/.well-known/openid-configuration"
JWKS_URI = "https://idp.test/jwks"


@pytest.fixture()
def idp(monkeypatch):
    """A fake IdP: RSA key, discovery doc and JWKS served from memory."""
    private_key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    public_jwk = jwt.algorithms.RSAAlgorithm.to_jwk(
        private_key.public_key(), as_dict=True)
    public_jwk["kid"] = "test-key"
    public_jwk["alg"] = "RS256"

    documents = {
        DISCOVERY_URL: {"issuer": ISSUER, "jwks_uri": JWKS_URI},
        JWKS_URI: {"keys": [public_jwk]},
    }

    async def fake_fetch(url):
        if url not in documents:
            raise VerificationUnavailable(f"fetch failed for {url}")
        return documents[url]

    monkeypatch.setattr(sso_jwt_verify, "_fetch_json", fake_fetch)
    sso_jwt_verify._discovery_cache.clear()
    sso_jwt_verify._jwks_cache.clear()

    def make_token(**overrides):
        claims = {
            "iss": ISSUER,
            "aud": CLIENT_ID,
            "exp": int(time.time()) + 300,
            "sub": "user-1",
            "groups": ["netops"],
        }
        claims.update(overrides)
        return jwt.encode(
            claims, private_key, algorithm="RS256",
            headers={"kid": "test-key"})

    return make_token


def _run(coro):
    return asyncio.get_event_loop_policy().new_event_loop().run_until_complete(coro)


def test_valid_token_yields_claims(idp):
    claims = _run(verified_claims(idp(), DISCOVERY_URL, CLIENT_ID))
    assert claims["groups"] == ["netops"]


def test_tampered_token_is_invalid(idp):
    token = idp()
    header, payload, signature = token.split(".")
    forged = f"{header}.{payload[:-2]}AA.{signature}"
    with pytest.raises(TokenInvalid):
        _run(verified_claims(forged, DISCOVERY_URL, CLIENT_ID))


def test_expired_token_is_invalid(idp):
    token = idp(exp=int(time.time()) - 3600)
    with pytest.raises(TokenInvalid):
        _run(verified_claims(token, DISCOVERY_URL, CLIENT_ID))


def test_wrong_audience_is_invalid(idp):
    token = idp(aud="someone-else")
    with pytest.raises(TokenInvalid):
        _run(verified_claims(token, DISCOVERY_URL, CLIENT_ID))


def test_wrong_issuer_is_invalid(idp):
    token = idp(iss="https://evil.test")
    with pytest.raises(TokenInvalid):
        _run(verified_claims(token, DISCOVERY_URL, CLIENT_ID))


def test_hmac_downgrade_is_invalid(idp):
    # A token HMAC-"signed" with public material must not verify: only
    # asymmetric algorithms are accepted.
    forged = jwt.encode(
        {"iss": ISSUER, "aud": CLIENT_ID, "exp": int(time.time()) + 300},
        "not-a-real-key", algorithm="HS256", headers={"kid": "test-key"})
    with pytest.raises(TokenInvalid):
        _run(verified_claims(forged, DISCOVERY_URL, CLIENT_ID))


def test_missing_discovery_is_unavailable_not_invalid(idp):
    with pytest.raises(VerificationUnavailable):
        _run(verified_claims(idp(), None, CLIENT_ID))


def test_unreachable_jwks_is_unavailable(idp, monkeypatch):
    async def down(url):
        raise VerificationUnavailable(f"fetch failed for {url}")

    monkeypatch.setattr(sso_jwt_verify, "_fetch_json", down)
    sso_jwt_verify._discovery_cache.clear()
    sso_jwt_verify._jwks_cache.clear()
    with pytest.raises(VerificationUnavailable):
        _run(verified_claims(idp(), DISCOVERY_URL, CLIENT_ID))


def test_strict_mode_flag(monkeypatch):
    monkeypatch.delenv("VYMANAGER_SSO_REQUIRE_JWT_VERIFY", raising=False)
    assert sso_jwt_verify.require_verification() is False
    monkeypatch.setenv("VYMANAGER_SSO_REQUIRE_JWT_VERIFY", "1")
    assert sso_jwt_verify.require_verification() is True
