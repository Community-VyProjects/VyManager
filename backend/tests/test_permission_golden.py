"""Golden-file harness proving permission equivalence across migrations.

Snapshots ``get_user_permissions`` output for a sample of (user, instance)
pairs into a local JSON file, and compares a later run against that file.
The resolver is pure given database state, so byte-identical output before
and after a schema migration proves the migration changed no permissions —
the "zero permission changes" guarantee of the organization work.

Intended flow on a real deployment:

1. BEFORE upgrading, on the running stack::

       GOLDEN_PERMISSIONS_MODE=capture DATABASE_URL=postgresql://... \
           pytest tests/test_permission_golden.py -v

2. Upgrade (new image, migrations apply on boot).

3. AFTER upgrading::

       GOLDEN_PERMISSIONS_ALLOW_VERSION_MISMATCH=1 DATABASE_URL=... \
           pytest tests/test_permission_golden.py -v

   The golden file records the app version that captured it; compare mode
   refuses a version mismatch unless the override above is set, so a stale
   or foreign golden file cannot silently pass as evidence. Across an
   upgrade the mismatch is expected — setting the override is the operator
   confirming which two versions are being compared.

Environment variables:

    DATABASE_URL                                required; test skips if unset
    GOLDEN_PERMISSIONS_MODE                     capture | compare (default)
    GOLDEN_PERMISSIONS_FILE                     golden file path
                                                (default ./permission_golden.json)
    GOLDEN_PERMISSIONS_PAIRS                    optional JSON file of
                                                [[userId, instanceId], ...];
                                                default: every user x every
                                                instance, deterministic order
    GOLDEN_PERMISSIONS_MAX_PAIRS                optional cap on pair count
    GOLDEN_PERMISSIONS_ALLOW_VERSION_MISMATCH   set to 1 to compare across
                                                app versions

The golden file is deployment-local evidence, never committed.
"""

import asyncio
import json
import os
from datetime import datetime, timezone
from pathlib import Path

import pytest

from rbac_permissions import get_user_permissions

GOLDEN_FORMAT_VERSION = 1
DEFAULT_GOLDEN_FILE = "./permission_golden.json"


# ---------------------------------------------------------------------------
# Pure helpers (unit-tested below, no database needed)
# ---------------------------------------------------------------------------

def resolve_app_version() -> str:
    """Same resolution the API uses (app.py), with the repo VERSION file as
    the fallback for source checkouts."""
    env_version = os.environ.get("VYMANAGER_VERSION")
    if env_version:
        return env_version
    version_file = Path(__file__).resolve().parents[2] / "VERSION"
    if version_file.is_file():
        return version_file.read_text().strip()
    return "dev"


def pair_key(user_id: str, instance_id: str) -> str:
    return f"{user_id}|{instance_id}"


def serialize_permissions(permissions) -> dict:
    """FeatureGroup/PermissionLevel enums to their plain string values."""
    return {feature.value: level.value for feature, level in permissions.items()}


def build_golden(app_version: str, captured_at: str, results: dict) -> dict:
    return {
        "meta": {
            "formatVersion": GOLDEN_FORMAT_VERSION,
            "appVersion": app_version,
            "capturedAt": captured_at,
            "pairCount": len(results),
        },
        "results": results,
    }


def version_gate_error(golden_version: str, current_version: str,
                       allow_mismatch: bool) -> str:
    """Non-empty error string when the golden file must be refused."""
    if golden_version == current_version or allow_mismatch:
        return ""
    return (
        f"Golden file was captured by app version {golden_version!r} but this "
        f"is {current_version!r}. If you are deliberately comparing across an "
        f"upgrade, set GOLDEN_PERMISSIONS_ALLOW_VERSION_MISMATCH=1; otherwise "
        f"you are probably pointing at the wrong golden file."
    )


def diff_results(expected: dict, actual: dict) -> list:
    """Per-pair differences, deterministic order. Pairs present only in
    ``actual`` are ignored: the golden file defines the sample."""
    problems = []
    for key in sorted(expected):
        if key not in actual:
            problems.append(f"{key}: pair missing after migration "
                            f"(user or instance no longer resolvable)")
            continue
        exp, act = expected[key], actual[key]
        for feature in sorted(set(exp) | set(act)):
            before = exp.get(feature, "<absent>")
            after = act.get(feature, "<absent>")
            if before != after:
                problems.append(f"{key}: {feature} {before} -> {after}")
    return problems


def cap_pairs(pairs: list, max_pairs: int) -> tuple:
    """Apply the pair cap; returns (kept, dropped_count)."""
    if max_pairs <= 0 or len(pairs) <= max_pairs:
        return pairs, 0
    return pairs[:max_pairs], len(pairs) - max_pairs


# ---------------------------------------------------------------------------
# Database collection
# ---------------------------------------------------------------------------

async def _default_pairs(pool) -> list:
    users = await pool.fetch('SELECT id FROM users ORDER BY "createdAt", id')
    instances = await pool.fetch(
        'SELECT id FROM instances ORDER BY "createdAt", id')
    return [(u["id"], i["id"]) for u in users for i in instances]


async def _collect(database_url: str, pairs_file: str, max_pairs: int) -> dict:
    import asyncpg

    pool = await asyncpg.create_pool(database_url, min_size=1, max_size=4,
                                     command_timeout=60)
    try:
        if pairs_file:
            raw = json.loads(Path(pairs_file).read_text())
            pairs = [(str(u), str(i)) for u, i in raw]
        else:
            pairs = await _default_pairs(pool)

        pairs, dropped = cap_pairs(pairs, max_pairs)
        if dropped:
            print(f"NOTE: GOLDEN_PERMISSIONS_MAX_PAIRS dropped {dropped} of "
                  f"{dropped + len(pairs)} pairs; the sample is not exhaustive.")

        results = {}
        for user_id, instance_id in pairs:
            permissions = await get_user_permissions(pool, user_id, instance_id)
            results[pair_key(user_id, instance_id)] = \
                serialize_permissions(permissions)
        return results
    finally:
        await pool.close()


def collect_results() -> dict:
    return asyncio.run(_collect(
        os.environ["DATABASE_URL"],
        os.environ.get("GOLDEN_PERMISSIONS_PAIRS", ""),
        int(os.environ.get("GOLDEN_PERMISSIONS_MAX_PAIRS", "0")),
    ))


# ---------------------------------------------------------------------------
# The harness entry point
# ---------------------------------------------------------------------------

@pytest.mark.skipif(not os.environ.get("DATABASE_URL"),
                    reason="golden harness needs DATABASE_URL")
def test_permission_golden():
    mode = os.environ.get("GOLDEN_PERMISSIONS_MODE", "compare")
    golden_path = Path(os.environ.get("GOLDEN_PERMISSIONS_FILE",
                                      DEFAULT_GOLDEN_FILE))
    app_version = resolve_app_version()

    if mode == "capture":
        results = collect_results()
        captured_at = datetime.now(timezone.utc).isoformat(timespec="seconds")
        golden = build_golden(app_version, captured_at, results)
        golden_path.write_text(json.dumps(golden, indent=2, sort_keys=True)
                               + "\n")
        print(f"Captured {len(results)} pairs (app {app_version}) "
              f"to {golden_path.resolve()}")
        return

    if mode != "compare":
        pytest.fail(f"GOLDEN_PERMISSIONS_MODE must be 'capture' or 'compare', "
                    f"got {mode!r}")

    if not golden_path.is_file():
        pytest.fail(
            f"No golden file at {golden_path.resolve()}. Capture one first:\n"
            f"  GOLDEN_PERMISSIONS_MODE=capture DATABASE_URL=... "
            f"pytest tests/test_permission_golden.py")

    golden = json.loads(golden_path.read_text())
    meta = golden["meta"]

    if meta.get("formatVersion") != GOLDEN_FORMAT_VERSION:
        pytest.fail(f"Golden file format {meta.get('formatVersion')!r} not "
                    f"supported (expected {GOLDEN_FORMAT_VERSION})")

    gate = version_gate_error(
        meta.get("appVersion", "<missing>"), app_version,
        os.environ.get("GOLDEN_PERMISSIONS_ALLOW_VERSION_MISMATCH") == "1")
    if gate:
        pytest.fail(gate)

    actual = collect_results()
    problems = diff_results(golden["results"], actual)
    if problems:
        listing = "\n  ".join(problems[:50])
        more = f"\n  ... and {len(problems) - 50} more" \
            if len(problems) > 50 else ""
        pytest.fail(
            f"{len(problems)} permission difference(s) against golden file "
            f"(captured {meta['capturedAt']}, app {meta['appVersion']}, "
            f"{meta['pairCount']} pairs):\n  {listing}{more}")

    print(f"Permission output identical to golden file for "
          f"{meta['pairCount']} pairs "
          f"(captured {meta['capturedAt']}, app {meta['appVersion']}).")


# ---------------------------------------------------------------------------
# Unit tests for the pure pieces (no database)
# ---------------------------------------------------------------------------

def test_version_gate_accepts_same_version():
    assert version_gate_error("1.0.0", "1.0.0", allow_mismatch=False) == ""


def test_version_gate_refuses_mismatch():
    error = version_gate_error("1.0.0", "2.0.0", allow_mismatch=False)
    assert "1.0.0" in error and "2.0.0" in error
    assert "GOLDEN_PERMISSIONS_ALLOW_VERSION_MISMATCH" in error


def test_version_gate_override_allows_mismatch():
    assert version_gate_error("1.0.0", "2.0.0", allow_mismatch=True) == ""


def test_diff_identical_results_is_empty():
    results = {"u1|i1": {"FIREWALL": "WRITE", "NAT": "NONE"}}
    assert diff_results(results, dict(results)) == []


def test_diff_reports_changed_level():
    expected = {"u1|i1": {"FIREWALL": "WRITE"}}
    actual = {"u1|i1": {"FIREWALL": "READ"}}
    problems = diff_results(expected, actual)
    assert problems == ["u1|i1: FIREWALL WRITE -> READ"]


def test_diff_reports_missing_pair():
    problems = diff_results({"u1|i1": {"FIREWALL": "WRITE"}}, {})
    assert len(problems) == 1
    assert problems[0].startswith("u1|i1: pair missing")


def test_diff_reports_added_and_removed_features():
    expected = {"u1|i1": {"FIREWALL": "WRITE"}}
    actual = {"u1|i1": {"NAT": "READ"}}
    problems = diff_results(expected, actual)
    assert "u1|i1: FIREWALL WRITE -> <absent>" in problems
    assert "u1|i1: NAT <absent> -> READ" in problems


def test_diff_ignores_extra_pairs_in_actual():
    expected = {"u1|i1": {"FIREWALL": "WRITE"}}
    actual = {"u1|i1": {"FIREWALL": "WRITE"},
              "u2|i1": {"FIREWALL": "NONE"}}
    assert diff_results(expected, actual) == []


def test_cap_pairs_keeps_all_when_unlimited():
    pairs = [("u1", "i1"), ("u2", "i1")]
    assert cap_pairs(pairs, 0) == (pairs, 0)


def test_cap_pairs_truncates_deterministically():
    pairs = [("u1", "i1"), ("u2", "i1"), ("u3", "i1")]
    kept, dropped = cap_pairs(pairs, 2)
    assert kept == [("u1", "i1"), ("u2", "i1")]
    assert dropped == 1


def test_build_golden_meta():
    golden = build_golden("1.0.0", "2026-07-07T00:00:00+00:00",
                          {"u1|i1": {"FIREWALL": "WRITE"}})
    assert golden["meta"]["appVersion"] == "1.0.0"
    assert golden["meta"]["pairCount"] == 1
    assert golden["meta"]["formatVersion"] == GOLDEN_FORMAT_VERSION


def test_serialize_permissions_uses_enum_values():
    from rbac_permissions import FeatureGroup, PermissionLevel
    serialized = serialize_permissions(
        {FeatureGroup.FIREWALL: PermissionLevel.WRITE})
    assert serialized == {"FIREWALL": "WRITE"}
