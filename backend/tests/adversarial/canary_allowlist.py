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
    "routers/internal/sso_reconcile.py":
        "Backend-owned SSO grant reconciliation: a deployment-level "
        "system operation triggered by the IdP (SSO is deployment-global "
        "per the RFC), reconciling a user's grants across all their "
        "providers - not an org-scoped user request.",
    "routers/events.py":
        "Background banner poller: no request, no org context - it "
        "iterates every instance with active subscribers, a "
        "deployment-wide system service. The request-path streams in "
        "the same file use org-scoped connections per tick.",
}

# Files not yet migrated to org-scoped connections. The conversion waves
# have emptied this list: every backend database access now goes through an
# org-scoped connection (org_scope), and the WebSocket surfaces resolve org
# context via ws_org_conn. A new entry here must carry a justification in the
# PR that adds it.
MIGRATION_PENDING = {}
