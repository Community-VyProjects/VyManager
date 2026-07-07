"""
Site Updates Router — fleet-level update visibility.

Fans out ``show system updates`` across all instances in a site that the
calling user is permitted to see, and returns a per-instance rollup plus a
summary count. Read-only and op-mode only: this endpoint never applies an
update and never fetches the reported ISO URL.

Security / safety notes:
- Authorization reuses the exact RBAC-filtered instance query used by
  ``/session/sites/{site_id}/instances`` (site ADMIN sees all; everyone else
  is restricted to ``user_instance_roles`` matching instanceId or siteId), then
  additionally requires SYSTEM read. A foreign/invalid site_id yields an empty
  list, not data.
- The fan-out is the only new resource risk, so it is bounded: per-instance
  timeout (each instance's configured timeout), a concurrency semaphore, and a
  short server-side TTL cache keyed by instance id (shared across users/sites)
  with ``?refresh=true`` to force. This protects both VyManager and the routers.
- Credentials (VyOS API keys) are used to build transient services and are
  never logged or returned. Per-instance failures are reported coarsely.
"""

import asyncio
import time
from datetime import datetime, timezone
from typing import Dict, List, Optional, Tuple

import asyncpg
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from starlette.concurrency import run_in_threadpool

from fastapi_permissions import require_read_permission
from org_scope import request_scoped_conn
from rbac_permissions import FeatureGroup
from system_updates import SystemUpdatesInfo, parse_system_updates
from vyos_service import VyOSDeviceConfig, VyOSService

import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/vyos/sites", tags=["site-updates"])


# ========================================================================
# Tunables
# ========================================================================

# How long a per-instance result is reused before we re-poll the router.
_CACHE_TTL_SECONDS = 60
# Max simultaneous outbound show calls during a single fan-out.
_MAX_CONCURRENCY = 8

# instance_id -> (fetched_at_monotonic, InstanceUpdateStatus)
_cache: Dict[str, Tuple[float, "InstanceUpdateStatus"]] = {}


# ========================================================================
# Models
# ========================================================================


class InstanceUpdateStatus(BaseModel):
    """Update status for a single instance within the fan-out."""

    instance_id: str
    name: str
    host: str
    is_active: bool
    # one of: ok | not_configured | unreachable | error | inactive
    status: str
    current_version: Optional[str] = None
    update_available: bool = False
    available_version: Optional[str] = None
    update_url: Optional[str] = None
    checked_at: datetime
    cached: bool = False


class SiteUpdatesSummary(BaseModel):
    """Aggregated update rollup for a site."""

    site_id: str
    total: int = 0
    with_updates: int = 0
    up_to_date: int = 0
    not_configured: int = 0
    unreachable: int = 0
    inactive: int = 0
    instances: List[InstanceUpdateStatus] = []
    generated_at: datetime


# ========================================================================
# Fan-out helpers
# ========================================================================


def _check_one_instance(inst: asyncpg.Record) -> InstanceUpdateStatus:
    """Blocking: poll a single instance for update info. Runs in a threadpool.

    Any failure is mapped to a coarse status; exception detail is logged by
    type only and never surfaced to the caller.
    """
    now = datetime.now(timezone.utc)
    base = dict(
        instance_id=inst["id"],
        name=inst["name"],
        host=inst["host"],
        is_active=inst["isActive"],
        checked_at=now,
    )

    try:
        config = VyOSDeviceConfig(
            hostname=inst["host"],
            apikey=inst["apiKey"] or "",
            version=inst["vyosVersion"] or "1.5",
            protocol=inst["protocol"] or "https",
            port=inst["port"] or 443,
            verify=inst["verifySsl"] or False,
            timeout=inst["timeout"] or 10,
        )
        service = VyOSService(config)
        response = service.device.show(path=["system", "updates"])

        if response.status != 200:
            return InstanceUpdateStatus(status="error", **base)

        output = ""
        if isinstance(response.result, dict) and "data" in response.result:
            output = response.result["data"] or ""
        elif isinstance(response.result, str):
            output = response.result

        info: SystemUpdatesInfo = parse_system_updates(output)
        if not info.configured:
            return InstanceUpdateStatus(status="not_configured", **base)

        return InstanceUpdateStatus(
            status="ok",
            current_version=info.current_version,
            update_available=info.update_available,
            available_version=info.available_version,
            update_url=info.update_url,
            **base,
        )
    except Exception as e:
        logger.warning(
            "Update check failed for instance %s: %s", inst["id"], type(e).__name__
        )
        return InstanceUpdateStatus(status="unreachable", **base)


async def _fetch_with_limit(
    inst: asyncpg.Record, sem: asyncio.Semaphore
) -> InstanceUpdateStatus:
    """Run a single instance check under the concurrency semaphore, then cache it."""
    async with sem:
        result = await run_in_threadpool(_check_one_instance, inst)
    _cache[result.instance_id] = (time.monotonic(), result)
    return result


# ========================================================================
# Endpoint
# ========================================================================


@router.get("/{site_id}/updates", response_model=SiteUpdatesSummary)
async def get_site_updates(request: Request, site_id: str, refresh: bool = False):
    """
    Fleet-wide ``show system updates`` rollup for one site.

    Only instances the user is permitted to see are included. Results are served
    from a short-lived cache unless ``refresh=true`` is passed.
    """
    await require_read_permission(request, FeatureGroup.SYSTEM)

    if not getattr(request.state, "user", None):
        raise HTTPException(status_code=401, detail="Not authenticated")
    user_id = request.state.user["id"]

    async with request_scoped_conn(request) as conn:
        # Reuse the proven RBAC-filtered enumeration: site ADMIN sees all
        # instances in the site; everyone else is limited to instances they
        # have an explicit role on (instance- or site-scoped grant).
        user_site_role = await conn.fetchval(
            "SELECT role FROM users WHERE id = $1", user_id
        )

        if user_site_role == "ADMIN":
            instances = await conn.fetch(
                """
                SELECT id, name, host, port, "apiKey", protocol, "verifySsl",
                       "vyosVersion", "isActive", timeout
                FROM instances
                WHERE "siteId" = $1
                ORDER BY name
                """,
                site_id,
            )
        else:
            instances = await conn.fetch(
                """
                SELECT DISTINCT i.id, i.name, i.host, i.port, i."apiKey", i.protocol,
                       i."verifySsl", i."vyosVersion", i."isActive", i.timeout
                FROM instances i
                JOIN user_instance_roles uir
                    ON (uir."instanceId" = i.id OR uir."siteId" = i."siteId")
                    AND uir."userId" = $2
                WHERE i."siteId" = $1
                ORDER BY i.name
                """,
                site_id,
                user_id,
            )

    now = time.monotonic()
    to_fetch: List[asyncpg.Record] = []
    results: List[InstanceUpdateStatus] = []

    for inst in instances:
        if not inst["isActive"]:
            # Don't poll inactive instances.
            results.append(
                InstanceUpdateStatus(
                    instance_id=inst["id"],
                    name=inst["name"],
                    host=inst["host"],
                    is_active=False,
                    status="inactive",
                    checked_at=datetime.now(timezone.utc),
                )
            )
            continue

        cached = _cache.get(inst["id"])
        if not refresh and cached and (now - cached[0]) < _CACHE_TTL_SECONDS:
            hit = cached[1].copy(update={"cached": True})
            results.append(hit)
        else:
            to_fetch.append(inst)

    if to_fetch:
        sem = asyncio.Semaphore(_MAX_CONCURRENCY)
        fetched = await asyncio.gather(
            *(_fetch_with_limit(inst, sem) for inst in to_fetch)
        )
        results.extend(fetched)

    # Stable ordering by name for the UI.
    results.sort(key=lambda r: r.name.lower())

    summary = SiteUpdatesSummary(
        site_id=site_id,
        total=len(results),
        with_updates=sum(1 for r in results if r.status == "ok" and r.update_available),
        up_to_date=sum(
            1 for r in results if r.status == "ok" and not r.update_available
        ),
        not_configured=sum(1 for r in results if r.status == "not_configured"),
        unreachable=sum(1 for r in results if r.status in ("unreachable", "error")),
        inactive=sum(1 for r in results if r.status == "inactive"),
        instances=results,
        generated_at=datetime.now(timezone.utc),
    )
    return summary
