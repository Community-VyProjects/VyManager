"""
Version Check Endpoint

Provides current version info and checks GitHub for available updates.
No authentication required — version info is not sensitive.
"""

import logging
import os
import time
from typing import Optional

import httpx
from fastapi import APIRouter
from pydantic import BaseModel

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/vyos/version", tags=["version"])

GITHUB_REPO = "Community-VyProjects/VyManager"
CACHE_TTL_SECONDS = 3600  # 1 hour


class VersionCheckResponse(BaseModel):
    current_version: str
    latest_version: Optional[str] = None
    update_available: bool = False
    release_url: Optional[str] = None
    published_at: Optional[str] = None
    environment: str


# Simple in-memory cache
_cache: dict[str, object] = {}
_cache_time: float = 0.0


async def _fetch_latest_release() -> Optional[dict[str, str]]:
    """Fetch the latest release from GitHub API with 1-hour caching."""
    global _cache, _cache_time

    now = time.time()
    if _cache and (now - _cache_time) < CACHE_TTL_SECONDS:
        return _cache  # type: ignore[return-value]

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(
                f"https://api.github.com/repos/{GITHUB_REPO}/releases/latest",
                headers={"Accept": "application/vnd.github+json"},
            )
            if resp.status_code == 200:
                data = resp.json()
                result = {
                    "tag_name": data.get("tag_name", ""),
                    "html_url": data.get("html_url", ""),
                    "published_at": data.get("published_at", ""),
                }
                _cache = result
                _cache_time = now
                return result
            logger.warning("GitHub API returned status %d", resp.status_code)
            return None
    except Exception:
        logger.exception("Failed to fetch latest release from GitHub")
        return None


def _parse_version(version_str: str) -> Optional[tuple[int, ...]]:
    """Parse a version string like '1.0.0-beta.1' into comparable tuples.

    Returns a tuple suitable for comparison. Beta versions sort below their
    release counterpart (e.g. 1.0.0-beta.1 < 1.0.0).
    """
    clean = version_str.lstrip("v")
    try:
        # Split on hyphen: "1.0.0-beta.1" -> ["1.0.0", "beta.1"]
        parts = clean.split("-", 1)
        core = tuple(int(x) for x in parts[0].split("."))

        if len(parts) == 1:
            # Release version: use a high pre-release marker so it sorts above betas
            return core + (1, 0)

        # Pre-release: extract the numeric suffix
        pre = parts[1]  # e.g. "beta.1"
        pre_parts = pre.split(".")
        pre_num = int(pre_parts[-1]) if pre_parts[-1].isdigit() else 0
        # 0 in the fourth position means pre-release (sorts below release's 1)
        return core + (0, pre_num)
    except (ValueError, IndexError):
        return None


def _is_update_available(current: str, latest: str) -> bool:
    """Compare version strings. Returns True if latest > current."""
    if current == "dev":
        return False

    current_tuple = _parse_version(current)
    latest_tuple = _parse_version(latest)

    if current_tuple is None or latest_tuple is None:
        return False

    return latest_tuple > current_tuple


@router.get("/check", response_model=VersionCheckResponse)
async def check_version() -> VersionCheckResponse:
    """Check for available updates against the latest GitHub release."""
    current_version = os.environ.get("VYMANAGER_VERSION", "dev")
    environment = os.environ.get("VYMANAGER_ENV", "dev")

    release = await _fetch_latest_release()

    if not release:
        return VersionCheckResponse(
            current_version=current_version,
            update_available=True,
            environment=environment,
        )

    tag = release["tag_name"]
    latest_version = tag.lstrip("v")

    return VersionCheckResponse(
        current_version=current_version,
        latest_version=latest_version,
        update_available=_is_update_available(current_version, latest_version),
        release_url=release["html_url"],
        published_at=release["published_at"],
        environment=environment,
    )
