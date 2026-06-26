"""Server-side redaction for user-submitted bug reports.

This module is the authoritative privacy boundary for the bug reporter. Because
a malicious or compromised browser could bypass any client-side scrubbing, the
backend re-runs this redaction on the final text immediately before it is sent
to GitHub. The design favours OVER-redaction: when in doubt, redact.

What it removes:
  - PEM blocks (certificates, private keys)
  - key/value secrets (password, passphrase, pre-shared-secret, api-key, token...)
  - HTTP bearer tokens
  - WireGuard-style and other long base64 keys
  - long hexadecimal blobs (hashes, keys)
  - public IPv4 / IPv6 addresses (private/loopback/link-local ranges are kept,
    because they are not sensitive and are useful for debugging)

What it deliberately does NOT do: guarantee that every possible secret typed in
free-text is caught. That is why the UI also forces a human review step before
anything is submitted.
"""

import ipaddress
import re
from typing import Match

REDACTED = "[REDACTED]"
REDACTED_PEM = "[REDACTED CERTIFICATE/KEY]"
REDACTED_IP = "[REDACTED PUBLIC IP]"

# 1. PEM blocks — certificates and private keys. Multiline, non-greedy.
_PEM_RE = re.compile(r"-----BEGIN [^-]+-----.*?-----END [^-]+-----", re.DOTALL)

# 2. key: value / key = value secrets. The key is preserved, the value redacted.
#    Matches VyOS-style (password 'xxx'), JSON ("token": "xxx") and env (API_KEY=xxx).
_SECRET_KEYS = (
    r"pre-?shared-?secret|preshared-?key|passphrase|password|passwd|"
    r"secret|client[-_]?secret|api[-_]?key|apikey|access[-_]?token|"
    r"auth[-_]?token|authorization|private-?key|psk|token"
)
_SECRET_KV_RE = re.compile(
    r"(?i)\b(" + _SECRET_KEYS + r")\b"      # 1: key
    r"(\s*['\"]?\s*[:=]\s*|\s+)"            # 2: separator (':', '=', or whitespace)
    r"(['\"]?)"                             # 3: opening quote (maybe empty)
    r"([^\s'\"]{3,})"                       # 4: the secret value
    r"\3"                                   # matching closing quote
)

# 3. HTTP bearer tokens.
_BEARER_RE = re.compile(r"(?i)\bbearer\s+[A-Za-z0-9._\-]+")

# 4. WireGuard keys and other long base64 blobs (32-byte key -> 44 base64 chars).
_B64KEY_RE = re.compile(r"\b[A-Za-z0-9+/]{43,}={0,2}")

# 5. Long hexadecimal blobs (sha256 hashes, hex-encoded keys, etc.).
_HEX_RE = re.compile(r"\b[0-9a-fA-F]{32,}\b")

# 6. IP addresses. The regex is intentionally permissive; each candidate is
#    validated with the ipaddress module so non-addresses (timestamps, version
#    strings) are left untouched, and private ranges are preserved. The IPv6
#    pattern allows empty groups so it matches "::"-compressed addresses.
_IPV4_RE = re.compile(r"\b(?:\d{1,3}\.){3}\d{1,3}\b")
_IPV6_RE = re.compile(r"(?<![:.\w])(?:[0-9A-Fa-f]{0,4}:){2,7}[0-9A-Fa-f]{0,4}(?![:.\w])")

# Carrier-grade NAT (RFC 6598). Not sensitive; some ipaddress versions do not
# flag it as private, so keep it explicitly.
_CGNAT = ipaddress.ip_network("100.64.0.0/10")


def _redact_kv(m: Match[str]) -> str:
    quote = m.group(3)
    return f"{m.group(1)}{m.group(2)}{quote}{REDACTED}{quote}"


def _redact_ipv4(m: Match[str]) -> str:
    token = m.group(0)
    try:
        ip = ipaddress.IPv4Address(token)
    except ValueError:
        return token  # not a real address (e.g. a version string) — leave it
    if (
        ip.is_private
        or ip.is_loopback
        or ip.is_link_local
        or ip.is_multicast
        or ip.is_reserved
        or ip.is_unspecified
        or ip in _CGNAT
    ):
        return token
    return REDACTED_IP


def _redact_ipv6(m: Match[str]) -> str:
    token = m.group(0)
    try:
        ip = ipaddress.IPv6Address(token)
    except ValueError:
        return token
    if (
        ip.is_private
        or ip.is_loopback
        or ip.is_link_local
        or ip.is_multicast
        or ip.is_reserved
        or ip.is_unspecified
    ):
        return token
    return REDACTED_IP


def redact(text: str) -> str:
    """Return ``text`` with sensitive content replaced by redaction markers.

    Order matters: structured/high-confidence patterns (PEM, key/value secrets,
    bearer tokens) run before the broad base64/hex/IP catch-alls so that, e.g.,
    a private key body is removed as one PEM block rather than leaving fragments.
    """
    if not text:
        return text

    text = _PEM_RE.sub(REDACTED_PEM, text)
    # Bearer runs before the key/value pass so that "Authorization: Bearer <tok>"
    # has the token removed (the kv pass alone would only redact the word "Bearer").
    text = _BEARER_RE.sub("Bearer " + REDACTED, text)
    text = _SECRET_KV_RE.sub(_redact_kv, text)
    text = _B64KEY_RE.sub(REDACTED, text)
    text = _HEX_RE.sub(REDACTED, text)
    text = _IPV4_RE.sub(_redact_ipv4, text)
    text = _IPV6_RE.sub(_redact_ipv6, text)
    return text
