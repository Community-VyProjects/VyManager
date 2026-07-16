"""Unscoped-connection canary.

Fails the build when any backend file resolves a database connection
outside the org_scope primitives without being on the reviewed allowlist
(canary_allowlist.py), and when an allowlist entry goes stale. Pure
source scan - no database needed, runs everywhere.
"""

from pathlib import Path

from canary_allowlist import MIGRATION_PENDING, PERMANENT_GLOBAL

BACKEND_ROOT = Path(__file__).resolve().parents[2]

# Direct pool access markers. org-scoped code never mentions db_pool or
# acquires connections itself: handlers take a connection from the
# org_conn dependencies, and the permission path goes through
# request_scoped_conn. The generic ".acquire(" marker also catches
# aliased acquisitions (a Pool passed under another name) that the old
# literal markers were blind to.
MARKERS = (".acquire(", '"db_pool"', "'db_pool'", "state.db_pool")

EXCLUDED_DIRS = {"tests", "__pycache__", "venv", ".venv", "node_modules"}


def scan_backend():
    hits = set()
    for path in BACKEND_ROOT.rglob("*.py"):
        rel = path.relative_to(BACKEND_ROOT)
        if any(part in EXCLUDED_DIRS for part in rel.parts):
            continue
        source = path.read_text(encoding="utf-8", errors="replace")
        if any(marker in source for marker in MARKERS):
            hits.add(str(rel))
    return hits


def test_no_unscoped_connections_outside_allowlist():
    hits = scan_backend()
    allowed = set(PERMANENT_GLOBAL) | set(MIGRATION_PENDING)

    violations = sorted(hits - allowed)
    assert not violations, (
        "Files resolve database connections outside org_scope and are not "
        "on the reviewed allowlist (add with justification, or migrate to "
        f"org-scoped connections): {violations}"
    )


def test_allowlist_has_no_stale_entries():
    hits = scan_backend()
    allowed = set(PERMANENT_GLOBAL) | set(MIGRATION_PENDING)

    stale = sorted(allowed - hits)
    assert not stale, (
        "Allowlist entries whose files no longer access the pool directly "
        f"- remove them so the burn-down stays honest: {stale}"
    )


def test_permanent_and_pending_do_not_overlap():
    overlap = sorted(set(PERMANENT_GLOBAL) & set(MIGRATION_PENDING))
    assert not overlap, f"File cannot be both permanent and pending: {overlap}"
