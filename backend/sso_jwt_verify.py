"""JWKS verification for stored SSO id_tokens (audit D1-03).

The sso-reconcile endpoint derives group claims from the id_token stored
in the Better-Auth ``accounts`` table. That table is frontend-writable,
so a compromised frontend holding the internal secret could plant a
forged token and mint grants. When the provider has a ``discoveryUrl``,
we verify the token's signature against the provider's JWKS plus its
``iss``/``aud``/``exp`` claims before trusting it.

Failure semantics (deliberate asymmetry):

- The token is INVALID (bad signature, wrong issuer/audience, expired)
  → ``TokenInvalid``: the caller must skip reconciliation for this
  provider — falling back to the unverified decode would defeat the
  check.
- Verification is UNAVAILABLE (no discoveryUrl, discovery/JWKS fetch
  failed) → ``VerificationUnavailable``: the caller may fall back to the
  legacy unverified decode (and log), unless
  ``VYMANAGER_SSO_REQUIRE_JWT_VERIFY=1`` makes that fail closed too.
"""

import os
import time
from typing import Any, Dict, Optional, Tuple

import httpx
import jwt

# Asymmetric algorithms only: the JWKS flow hands us public keys, and
# accepting an HMAC alg here would let a forged token be "signed" with a
# public value.
ALLOWED_ALGORITHMS = ["RS256", "RS384", "RS512", "ES256", "ES384", "ES512",
                      "PS256", "PS384", "PS512"]

_CACHE_TTL_SECONDS = 3600.0

# discovery_url -> (fetched_at, discovery_doc)
_discovery_cache: Dict[str, Tuple[float, Dict[str, Any]]] = {}
# jwks_uri -> (fetched_at, jwks)
_jwks_cache: Dict[str, Tuple[float, Dict[str, Any]]] = {}


class TokenInvalid(Exception):
    """The id_token failed verification — do not trust it."""


class VerificationUnavailable(Exception):
    """Verification could not be attempted (no discovery/JWKS reachable)."""


def require_verification() -> bool:
    return os.getenv("VYMANAGER_SSO_REQUIRE_JWT_VERIFY") == "1"


async def _fetch_json(url: str) -> Dict[str, Any]:
    async with httpx.AsyncClient(timeout=10.0) as client:
        response = await client.get(url)
        response.raise_for_status()
        return response.json()


async def _cached_fetch(cache: Dict[str, Tuple[float, Dict[str, Any]]],
                        url: str) -> Dict[str, Any]:
    now = time.monotonic()
    hit = cache.get(url)
    if hit and now - hit[0] < _CACHE_TTL_SECONDS:
        return hit[1]
    try:
        doc = await _fetch_json(url)
    except Exception as e:
        if hit:  # serve stale rather than failing on a transient blip
            return hit[1]
        raise VerificationUnavailable(f"fetch failed for {url}: {e}") from e
    cache[url] = (now, doc)
    return doc


def _key_for(jwks: Dict[str, Any], kid: Optional[str]):
    keys = jwks.get("keys") or []
    for key in keys:
        if kid is None or key.get("kid") == kid:
            return jwt.PyJWK(key).key
    return None


async def verified_claims(
    id_token: str,
    discovery_url: Optional[str],
    client_id: Optional[str],
) -> Dict[str, Any]:
    """Verify the id_token against the provider's JWKS and return claims.

    Raises TokenInvalid when the token fails verification and
    VerificationUnavailable when verification cannot be attempted.
    """
    if not id_token:
        raise TokenInvalid("empty id_token")
    if not discovery_url:
        raise VerificationUnavailable("provider has no discoveryUrl")

    discovery = await _cached_fetch(_discovery_cache, discovery_url)
    jwks_uri = discovery.get("jwks_uri")
    issuer = discovery.get("issuer")
    if not jwks_uri:
        raise VerificationUnavailable("discovery document has no jwks_uri")

    try:
        header = jwt.get_unverified_header(id_token)
    except jwt.InvalidTokenError as e:
        raise TokenInvalid(f"malformed token: {e}") from e

    jwks = await _cached_fetch(_jwks_cache, jwks_uri)
    key = _key_for(jwks, header.get("kid"))
    if key is None:
        # An unknown kid usually means key rotation: refetch once.
        _jwks_cache.pop(jwks_uri, None)
        jwks = await _cached_fetch(_jwks_cache, jwks_uri)
        key = _key_for(jwks, header.get("kid"))
    if key is None:
        raise TokenInvalid(f"no JWKS key matches kid {header.get('kid')!r}")

    try:
        return jwt.decode(
            id_token,
            key=key,
            algorithms=ALLOWED_ALGORITHMS,
            audience=client_id if client_id else None,
            issuer=issuer if issuer else None,
            options={
                "require": ["exp"],
                "verify_aud": bool(client_id),
                "verify_iss": bool(issuer),
            },
            leeway=60,
        )
    except jwt.InvalidTokenError as e:
        raise TokenInvalid(str(e)) from e
