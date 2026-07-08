"""
Audit Middleware

Records config-mutating API calls into the audit_logs table for attribution.
Runs inner to AuthenticationMiddleware and SessionMiddleware, so request.state
already carries the resolved user, active instance, and (for non-cookie clients)
the API token provenance.

Design notes:
- Only mutating methods on the /vyos/* surface are audited (config writes); reads
  are skipped to avoid noise.
- The request body is never consumed here, so the batch handlers are unaffected.
  Field-level operation capture is intentionally deferred to a later enhancement.
- Audit logging must never break the underlying request: any failure is swallowed
  and logged, and the original response is always returned.
"""

import json
from org_scope import request_scoped_conn
import logging
from starlette.middleware.base import BaseHTTPMiddleware

logger = logging.getLogger(__name__)


class AuditMiddleware(BaseHTTPMiddleware):
    AUDITED_METHODS = {"POST", "PUT", "PATCH", "DELETE"}

    # Prefixes whose mutating calls are authz-relevant: VyOS config changes
    # plus the admin surface (site/instance/user/grant/token/backup lifecycle).
    AUDITED_PREFIXES = ("/vyos/", "/session/", "/user-management", "/tokens")

    def _should_audit(self, request) -> bool:
        if request.method not in self.AUDITED_METHODS:
            return False
        path = request.url.path
        return any(path.startswith(p) for p in self.AUDITED_PREFIXES)

    @staticmethod
    def _feature_from_path(path: str) -> str:
        # "/vyos/nat/batch" -> "nat"; "/vyos/firewall/ipv4/batch" -> "firewall";
        # "/tokens" -> "tokens"; "/user-management/users" -> "user-management".
        parts = [p for p in path.split("/") if p]
        if not parts:
            return "unknown"
        if parts[0] == "vyos":
            return parts[1] if len(parts) >= 2 else "unknown"
        return parts[0]

    async def dispatch(self, request, call_next):
        if not self._should_audit(request):
            return await call_next(request)

        response = await call_next(request)
        try:
            await self._record(request, response)
        except Exception:
            # Never let auditing break the request it is recording.
            logger.warning("Audit logging failed for %s %s", request.method, request.url.path)
        return response

    async def _record(self, request, response) -> None:
        user = getattr(request.state, "user", None)
        if not user:
            # Unauthenticated attempts are rejected before state is populated and
            # have no identity to attribute, so there is nothing to record.
            return

        path = request.url.path
        feature = self._feature_from_path(path)
        instance = getattr(request.state, "instance", None) or {}
        site = getattr(request.state, "site", None) or {}
        org = getattr(request.state, "org", None) or {}
        # Admin-surface endpoints have no active instance, so state.org is
        # unset; the org they acted in is the org_conn_admin acting org.
        org_id = org.get("id") or getattr(request.state, "acting_org_id", None)
        success = response.status_code < 400

        details = {
            "method": request.method,
            "path": path,
            "status_code": response.status_code,
            "success": success,
            "auth_method": getattr(request.state, "auth_method", "session"),
            "api_token_id": getattr(request.state, "api_token_id", None),
            "instance_id": instance.get("id"),
            "instance_name": instance.get("name"),
        }

        ip = request.client.host if request.client else None
        user_agent = request.headers.get("user-agent")

        # Fire-and-forget: dispatch() swallows any failure here, including
        # an unavailable database, so auditing never breaks the request.
        async with request_scoped_conn(request) as conn:
            await conn.execute(
                """
                INSERT INTO audit_logs
                    (id, "userId", "userEmail", action, resource, details,
                     "ipAddress", "userAgent", "orgId", "siteId", "instanceId",
                     "createdAt")
                VALUES (gen_random_uuid()::text, $1, $2, $3, $4, $5::jsonb, $6,
                        $7, $8, $9, $10, NOW())
                """,
                user["id"],
                user.get("email") or "",
                f"{request.method}_{feature.upper()}",
                path,
                json.dumps(details),
                ip,
                user_agent,
                org_id,
                site.get("id"),
                instance.get("id"),
            )
