"""
Personal Access Token crypto helpers.

Tokens are presented by non-cookie API clients (e.g. the MCP server) via the
`Authorization: Bearer <token>` header. Only the sha256 hash is ever stored;
the plaintext is shown to the user exactly once at creation time.

Token format: "vym_" + url-safe random secret.
"""

import hashlib
import secrets

TOKEN_PREFIX = "vym_"

# 32 random bytes -> ~43 url-safe characters of entropy after the prefix.
_TOKEN_SECRET_BYTES = 32

# Number of leading characters stored (non-secret) for display in token lists.
_DISPLAY_PREFIX_LEN = 12


def hash_api_token(plaintext: str) -> str:
    """Return the sha256 hex digest used as the stored lookup key."""
    return hashlib.sha256(plaintext.encode("utf-8")).hexdigest()


def generate_api_token() -> tuple[str, str, str]:
    """
    Create a new token.

    Returns a tuple of (plaintext, token_hash, display_prefix). The plaintext is
    returned to the caller exactly once; only token_hash and display_prefix are
    persisted.
    """
    plaintext = TOKEN_PREFIX + secrets.token_urlsafe(_TOKEN_SECRET_BYTES)
    return plaintext, hash_api_token(plaintext), plaintext[:_DISPLAY_PREFIX_LEN]


def looks_like_api_token(value: str) -> bool:
    """Cheap check to distinguish our tokens from other Bearer credentials."""
    return value.startswith(TOKEN_PREFIX)
