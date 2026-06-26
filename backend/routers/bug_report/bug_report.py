"""Bug Reporter Router.

Lets authenticated users file a GitHub issue from inside VyManager using *their
own* GitHub account, via the OAuth Device Authorization flow.

Security / privacy design (see also redaction.py):
  - The GitHub user token NEVER reaches the browser. It is held only in
    backend memory, wrapped in ``_SecureStr`` so it cannot be logged or
    JSON-serialised, with a short TTL, and is wiped immediately after the issue
    is created (wipe-after-submit).
  - Only a PUBLIC OAuth ``client_id`` is shipped; no client secret and no
    redirect URL are required (that is the whole point of the device flow), so
    a single configuration works for every self-hosted deployment.
  - The target ``owner/repo`` is fixed by the operator via env. It is never
    taken from the request, so a user cannot redirect issues elsewhere or
    point the token at an arbitrary GitHub resource.
  - Redaction is enforced HERE, server-side, at submit time — the client only
    ever sends structured fields, never raw markdown, and the backend
    assembles + redacts the final body itself. The in-app preview is generated
    by the same code path, so what the user reviews is exactly what is sent.
  - Per-user and global rate limits guard against issue spam.

Endpoints (all require an authenticated session via the auth middleware):
  GET  /bug-report/status              — feature enabled? user connected?
  POST /bug-report/github/device/start — begin device authorization
  POST /bug-report/github/device/poll  — poll for authorization completion
  POST /bug-report/preview             — assembled + redacted markdown preview
  POST /bug-report/submit              — create the issue, then wipe the token
"""

import logging
import os
import re
import time
from collections import deque
from typing import Deque, Dict, Optional

import httpx
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field

from middleware.session import _SecureStr
from .redaction import redact

logger = logging.getLogger(__name__)

# Mounted under /vyos so it is reached via the frontend's existing
# /api/vyos/[...path] proxy (the app's generic backend-proxy namespace).
router = APIRouter(prefix="/vyos/bug-report", tags=["bug-report"])

# ============================================================================
# Configuration (operator-supplied, never from the request)
# ============================================================================

# Project-wide defaults so the feature works out of the box with NO per-deployment
# configuration. Both values are safe to ship in source:
#   - The OAuth client_id is PUBLIC. The device flow has no client secret, so
#     there is nothing secret to leak (GitHub's own CLI ships its client_id too).
#   - The repo is the VyManager issue tracker — the same for every deployment.
# The env vars exist only so a fork can route bug reports to its own repo/app.
DEFAULT_GITHUB_CLIENT_ID = "Ov23lignyrCHrXxi5tg7"  # VyManager OAuth App (device flow enabled)
DEFAULT_GITHUB_REPO = "Community-VyProjects/VyManager"

GITHUB_CLIENT_ID = os.getenv("GITHUB_BUG_REPORT_CLIENT_ID", DEFAULT_GITHUB_CLIENT_ID).strip()
GITHUB_REPO = os.getenv("GITHUB_BUG_REPORT_REPO", DEFAULT_GITHUB_REPO).strip()  # "owner/repo"
# Minimal scope: create issues on a public repo. The token cannot push code or
# read private repositories. Use "repo" only if the target repo is private.
GITHUB_SCOPE = os.getenv("GITHUB_BUG_REPORT_SCOPE", "public_repo").strip()

GITHUB_DEVICE_CODE_URL = "https://github.com/login/device/code"
GITHUB_TOKEN_URL = "https://github.com/login/oauth/access_token"
GITHUB_API_URL = "https://api.github.com"
GITHUB_API_VERSION = "2022-11-28"

_REPO_RE = re.compile(r"^[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+$")

# Token / device-code lifetimes and abuse limits.
TOKEN_TTL_SECONDS = 600          # connected token is usable for 10 min, then expires
DEVICE_TTL_SECONDS = 900         # device authorization window
MAX_BODY_CHARS = 60000           # GitHub hard limit is 65536; stay under it
RATE_LIMIT_PER_USER = 5          # issues per user per window
RATE_LIMIT_WINDOW = 3600         # seconds
RATE_LIMIT_GLOBAL = 50           # issues across all users per window


def feature_enabled() -> bool:
    return bool(GITHUB_CLIENT_ID and _REPO_RE.match(GITHUB_REPO))


# ============================================================================
# In-memory state (never persisted to disk/DB)
# ============================================================================

# user_id -> {"device_code": _SecureStr, "interval": int, "expires": float}
_pending_device: Dict[str, dict] = {}
# user_id -> {"token": _SecureStr, "expires": float}
_tokens: Dict[str, dict] = {}
# user_id -> deque[timestamps]; plus a global deque for the system-wide cap
_user_submits: Dict[str, Deque[float]] = {}
_global_submits: Deque[float] = deque()


def _now() -> float:
    return time.monotonic()


def _get_user_id(request: Request) -> str:
    user = getattr(request.state, "user", None)
    if not user or "id" not in user:
        # Should not happen behind the auth middleware, but fail closed.
        raise HTTPException(status_code=401, detail="Authentication required")
    return user["id"]


def _store_token(user_id: str, token: str) -> None:
    _tokens[user_id] = {"token": _SecureStr(token), "expires": _now() + TOKEN_TTL_SECONDS}


def _get_token(user_id: str) -> Optional[str]:
    entry = _tokens.get(user_id)
    if not entry:
        return None
    if entry["expires"] < _now():
        _wipe_token(user_id)
        return None
    return entry["token"].value


def _wipe_token(user_id: str) -> None:
    _tokens.pop(user_id, None)


def _check_rate_limit(user_id: str) -> None:
    now = _now()
    cutoff = now - RATE_LIMIT_WINDOW

    while _global_submits and _global_submits[0] < cutoff:
        _global_submits.popleft()
    if len(_global_submits) >= RATE_LIMIT_GLOBAL:
        raise HTTPException(status_code=429, detail="Too many bug reports right now. Please try again later.")

    dq = _user_submits.setdefault(user_id, deque())
    while dq and dq[0] < cutoff:
        dq.popleft()
    if len(dq) >= RATE_LIMIT_PER_USER:
        raise HTTPException(status_code=429, detail="You have submitted too many bug reports. Please try again later.")


def _record_submit(user_id: str) -> None:
    now = _now()
    _global_submits.append(now)
    _user_submits.setdefault(user_id, deque()).append(now)


def _ensure_enabled() -> None:
    if not feature_enabled():
        raise HTTPException(
            status_code=503,
            detail="Bug reporting is not configured on this server.",
        )


# ============================================================================
# Pydantic models
# ============================================================================

CATEGORIES = {"bug", "crash", "ui", "performance", "other"}


class StatusResponse(BaseModel):
    enabled: bool
    connected: bool
    repo: Optional[str] = None


class DeviceStartResponse(BaseModel):
    user_code: str
    verification_uri: str
    expires_in: int
    interval: int


class DevicePollResponse(BaseModel):
    status: str  # "pending" | "connected" | "expired" | "denied" | "error"


class Diagnostics(BaseModel):
    app_version: Optional[str] = None
    vyos_version: Optional[str] = None
    browser: Optional[str] = None
    page: Optional[str] = None


class ReportRequest(BaseModel):
    title: str = Field(..., min_length=3, max_length=200)
    category: str = Field("bug")
    description: str = Field(..., min_length=10, max_length=20000)
    include_diagnostics: bool = False
    diagnostics: Optional[Diagnostics] = None
    error_text: Optional[str] = Field(None, max_length=30000)


class PreviewResponse(BaseModel):
    title: str
    body: str


class SubmitResponse(BaseModel):
    url: str
    number: int


# ============================================================================
# Body assembly (single source of truth for preview AND submit)
# ============================================================================

def _safe_category(category: str) -> str:
    return category if category in CATEGORIES else "other"


def _build_issue(req: ReportRequest) -> tuple[str, str]:
    """Assemble the issue title and markdown body from structured fields, then
    redact. Both the preview and submit endpoints call this, guaranteeing the
    user reviews exactly what gets sent."""
    title = f"[{_safe_category(req.category)}] {req.title.strip()}"

    parts = ["### Description", req.description.strip(), ""]

    if req.error_text and req.error_text.strip():
        parts += [
            "### Error / stack trace",
            "```",
            req.error_text.strip(),
            "```",
            "",
        ]

    if req.include_diagnostics and req.diagnostics:
        d = req.diagnostics
        diag_lines = []
        if d.app_version:
            diag_lines.append(f"- VyManager: {d.app_version}")
        if d.vyos_version:
            diag_lines.append(f"- VyOS: {d.vyos_version}")
        if d.browser:
            diag_lines.append(f"- Browser: {d.browser}")
        if d.page:
            diag_lines.append(f"- Page: {d.page}")
        if diag_lines:
            parts += ["### Diagnostics", *diag_lines, ""]

    parts.append("_Submitted from VyManager. Sensitive data is automatically redacted; please review before posting._")

    body = "\n".join(parts)

    # The privacy boundary: redact the FINAL assembled text, server-side.
    title = redact(title)
    body = redact(body)

    if len(body) > MAX_BODY_CHARS:
        body = body[:MAX_BODY_CHARS] + "\n\n_…truncated._"
    return title, body


# ============================================================================
# Endpoints
# ============================================================================

@router.get("/status", response_model=StatusResponse)
async def status(request: Request) -> StatusResponse:
    user_id = _get_user_id(request)
    if not feature_enabled():
        return StatusResponse(enabled=False, connected=False)
    return StatusResponse(
        enabled=True,
        connected=_get_token(user_id) is not None,
        repo=GITHUB_REPO,
    )


@router.post("/github/device/start", response_model=DeviceStartResponse)
async def device_start(request: Request) -> DeviceStartResponse:
    _ensure_enabled()
    user_id = _get_user_id(request)

    async with httpx.AsyncClient(timeout=15) as client:
        resp = await client.post(
            GITHUB_DEVICE_CODE_URL,
            headers={"Accept": "application/json"},
            data={"client_id": GITHUB_CLIENT_ID, "scope": GITHUB_SCOPE},
        )
    if resp.status_code != 200:
        logger.warning("GitHub device-code request failed: %s", resp.status_code)
        raise HTTPException(status_code=502, detail="Could not start GitHub authorization.")

    data = resp.json()
    device_code = data.get("device_code")
    user_code = data.get("user_code")
    verification_uri = data.get("verification_uri")
    if not device_code or not user_code or not verification_uri:
        raise HTTPException(status_code=502, detail="Unexpected response from GitHub.")

    interval = int(data.get("interval", 5))
    _pending_device[user_id] = {
        "device_code": _SecureStr(device_code),
        "interval": interval,
        "expires": _now() + min(int(data.get("expires_in", DEVICE_TTL_SECONDS)), DEVICE_TTL_SECONDS),
    }

    return DeviceStartResponse(
        user_code=user_code,
        verification_uri=verification_uri,
        expires_in=int(data.get("expires_in", DEVICE_TTL_SECONDS)),
        interval=interval,
    )


@router.post("/github/device/poll", response_model=DevicePollResponse)
async def device_poll(request: Request) -> DevicePollResponse:
    _ensure_enabled()
    user_id = _get_user_id(request)

    pending = _pending_device.get(user_id)
    if not pending:
        return DevicePollResponse(status="expired")
    if pending["expires"] < _now():
        _pending_device.pop(user_id, None)
        return DevicePollResponse(status="expired")

    async with httpx.AsyncClient(timeout=15) as client:
        resp = await client.post(
            GITHUB_TOKEN_URL,
            headers={"Accept": "application/json"},
            data={
                "client_id": GITHUB_CLIENT_ID,
                "device_code": pending["device_code"].value,
                "grant_type": "urn:ietf:params:oauth:grant-type:device_code",
            },
        )
    data = resp.json() if resp.status_code == 200 else {}

    access_token = data.get("access_token")
    if access_token:
        _store_token(user_id, access_token)
        _pending_device.pop(user_id, None)
        return DevicePollResponse(status="connected")

    error = data.get("error")
    if error == "authorization_pending" or error == "slow_down":
        return DevicePollResponse(status="pending")
    if error == "expired_token":
        _pending_device.pop(user_id, None)
        return DevicePollResponse(status="expired")
    if error == "access_denied":
        _pending_device.pop(user_id, None)
        return DevicePollResponse(status="denied")

    return DevicePollResponse(status="pending")


@router.post("/preview", response_model=PreviewResponse)
async def preview(request: Request, body: ReportRequest) -> PreviewResponse:
    _ensure_enabled()
    _get_user_id(request)  # auth check
    title, md = _build_issue(body)
    return PreviewResponse(title=title, body=md)


@router.post("/submit", response_model=SubmitResponse)
async def submit(request: Request, body: ReportRequest) -> SubmitResponse:
    _ensure_enabled()
    user_id = _get_user_id(request)

    token = _get_token(user_id)
    if not token:
        raise HTTPException(status_code=401, detail="Not connected to GitHub. Please connect first.")

    _check_rate_limit(user_id)

    title, md = _build_issue(body)
    labels = ["from-app"]
    cat = _safe_category(body.category)
    if cat != "other":
        labels.append(cat)

    owner, repo = GITHUB_REPO.split("/", 1)
    try:
        async with httpx.AsyncClient(timeout=20) as client:
            resp = await client.post(
                f"{GITHUB_API_URL}/repos/{owner}/{repo}/issues",
                headers={
                    "Accept": "application/vnd.github+json",
                    "Authorization": f"token {token}",
                    "X-GitHub-Api-Version": GITHUB_API_VERSION,
                },
                json={"title": title, "body": md, "labels": labels},
            )
    finally:
        # Wipe-after-submit: the token is single-use from our side regardless of
        # whether the GitHub call succeeded or raised.
        _wipe_token(user_id)

    if resp.status_code == 201:
        _record_submit(user_id)
        data = resp.json()
        return SubmitResponse(url=data["html_url"], number=data["number"])

    if resp.status_code in (401, 403):
        raise HTTPException(status_code=401, detail="GitHub authorization failed or was revoked. Please reconnect.")
    logger.warning("GitHub issue creation failed: %s", resp.status_code)
    raise HTTPException(status_code=502, detail="GitHub rejected the issue. Please try again.")
