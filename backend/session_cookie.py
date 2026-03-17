import base64
import hashlib
import hmac
import logging
import os
from urllib.parse import unquote

logger = logging.getLogger(__name__)
_secret: bytes = os.environ.get("BETTER_AUTH_SECRET", "").encode("utf-8")


def verify_session_cookie(signed_value: str) -> str | None:
    """
    Verify a better-auth signed session cookie and return the session ID.

    Cookie format: "{session_id}.{base64(HMAC-SHA256(secret, session_id))}"
    The split point is the LAST dot in the cookie value (matching better-call's
    lastIndexOf(".") behaviour).

    better-call URL-encodes the cookie value when setting it (encodeURIComponent)
    and URL-decodes it when reading (tryDecode/decodeURIComponent). Python's cookie
    parser does NOT URL-decode, so we must do it here to match the JS behaviour.

    Returns the session_id string if the signature is valid, None otherwise.
    """
    if not _secret:
        logger.error("BETTER_AUTH_SECRET is not set — cannot verify session cookies")
        return None

    # Mirror better-call's tryDecode: URL-decode if the value contains '%'
    if "%" in signed_value:
        signed_value = unquote(signed_value)

    dot_pos = signed_value.rfind(".")
    if dot_pos < 1:
        # No dot found, or dot is at position 0 (no session_id before it)
        return None

    session_id = signed_value[:dot_pos]
    received_sig = signed_value[dot_pos + 1:]

    # better-call always produces a standard base64 signature: exactly 44 chars, ends with '='
    if len(received_sig) != 44 or not received_sig.endswith("="):
        return None

    expected_sig = base64.b64encode(
        hmac.new(_secret, session_id.encode("utf-8"), digestmod=hashlib.sha256).digest()
    ).decode("ascii")

    if not hmac.compare_digest(expected_sig, received_sig):
        logger.warning("Session cookie signature verification failed")
        return None

    return session_id
