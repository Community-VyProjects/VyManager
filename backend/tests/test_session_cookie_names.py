"""Session cookie must be readable under both deployment names (audit D2).

Better Auth prefixes the cookie with __Secure- when secure cookies are
on (HTTPS). Reads that only checked the bare name silently lost session
tracking on secure deployments: device-change clears never fired,
/session/connect stored a NULL sessionToken, and the current-session
guard in auth-session revocation was defeated.
"""

from types import SimpleNamespace

from session_cookie import SESSION_COOKIE_NAMES, get_session_cookie


def _request_with(cookies):
    return SimpleNamespace(cookies=cookies)


def test_plain_name_wins_when_present():
    request = _request_with({"better-auth.session_token": "plain"})
    assert get_session_cookie(request) == "plain"


def test_secure_prefixed_name_is_read():
    request = _request_with({"__Secure-better-auth.session_token": "secure"})
    assert get_session_cookie(request) == "secure"


def test_missing_cookie_returns_none():
    assert get_session_cookie(_request_with({})) is None


def test_both_names_are_covered():
    assert SESSION_COOKIE_NAMES == (
        "better-auth.session_token",
        "__Secure-better-auth.session_token",
    )
