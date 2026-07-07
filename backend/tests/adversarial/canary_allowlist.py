"""Reviewed allowlist for the unscoped-connection canary.

Every file that resolves a database connection outside the org_scope
primitives must be listed here with a justification. Any ADDITION to
either list must carry its justification in the PR that makes it —
widening the boundary is a visible, reviewed decision, never a silent
one. The canary also fails on STALE entries (file listed but clean), so
the burn-down list cannot rot.
"""

# Files that legitimately access the pool outside org scoping, forever.
PERMANENT_GLOBAL = {
    "middleware/auth.py":
        "Identity resolution (sessions/users/api_tokens) necessarily "
        "precedes org context; the org is derived FROM the "
        "authenticated user.",
    "middleware/session.py":
        "The resolver that CREATES org context must query "
        "instances/sites to derive it.",
    "app.py":
        "Pool lifecycle and the session-cleanup background task: no "
        "request, no org; deployment-wide janitor by nature.",
    "org_scope.py":
        "The sanctioned primitive itself - every org-scoped "
        "acquisition goes through it.",
}

# Files not yet migrated to org-scoped connections. Each conversion wave
# removes its entries; the target end state is an empty dict.
MIGRATION_PENDING = {
    # Wave B - streaming/scheduling surfaces (per-tick scoped connections)
    "routers/events.py": "SSE poll tick",
    "routers/monitoring/monitoring.py": "SSH monitoring streams",
    "routers/console/console.py": "console websocket sessions",
    "routers/power.py": "scheduled power actions",
    # Wave C - remaining DB-backed handlers
    "middleware/audit.py": "audit log writes",
    "routers/firewall/separators.py": "separator CRUD",
    "routers/dashboard.py": "dashboard layouts",
    "routers/container/container.py": "container feature state",
    "routers/site_updates/site_updates.py": "site update polling",
    "routers/show.py": "SSE stream session revalidation tick",
}
