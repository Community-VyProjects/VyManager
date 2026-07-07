"""Post-migration verifier for the organization schema backfill.

Run once against a database that has just applied the organizations
migration (fresh install or upgrade). Asserts the backfill invariants and
exits nonzero on any violation, so it slots into upgrade runbooks and CI:

    DATABASE_URL=postgresql://... python -m scripts.verify_org_migration

Rules:

    R1  the default organization (id 'default') exists
    R2  every site references an existing organization
    R3  membership count equals user count (every user was backfilled)
    R4  every membership references an existing user and organization
    R5  every organization that has members has at least one OWNER

R3 holds at migration time by construction. Users created later are only
enrolled once the membership write path lands, so run this right after the
migration, not as a recurring check.

The rule logic is pure (plain values in, violation strings out) and unit
tested in tests/test_org_migration_verifier.py; this script only gathers
the inputs with SQL and reports.
"""

import asyncio
import os
import sys


# ---------------------------------------------------------------------------
# Pure rules: inputs are plain values, output is a list of violations
# ---------------------------------------------------------------------------

DEFAULT_ORG_ID = "default"


def rule_default_org_exists(default_org_count: int) -> list:
    if default_org_count == 1:
        return []
    return [f"R1: expected exactly one organization with id "
            f"'{DEFAULT_ORG_ID}', found {default_org_count}"]


def rule_sites_reference_valid_org(orphan_sites: list) -> list:
    return [f"R2: site {site_id!r} references missing organization {org_id!r}"
            for site_id, org_id in orphan_sites]


def rule_membership_count_matches_users(user_count: int,
                                        membership_count: int) -> list:
    if membership_count == user_count:
        return []
    return [f"R3: membership count ({membership_count}) does not equal "
            f"user count ({user_count})"]


def rule_memberships_reference_valid_rows(orphan_memberships: list) -> list:
    return [f"R4: membership {membership_id!r} references a missing "
            f"{kind}" for membership_id, kind in orphan_memberships]


def rule_orgs_with_members_have_owner(org_owner_stats: list) -> list:
    problems = []
    for org_id, member_count, owner_count in org_owner_stats:
        if member_count > 0 and owner_count == 0:
            problems.append(f"R5: organization {org_id!r} has "
                            f"{member_count} member(s) but no OWNER")
    return problems


def evaluate(default_org_count: int, orphan_sites: list, user_count: int,
             membership_count: int, orphan_memberships: list,
             org_owner_stats: list) -> list:
    """All rules over gathered inputs; empty list means the backfill holds."""
    return (
        rule_default_org_exists(default_org_count)
        + rule_sites_reference_valid_org(orphan_sites)
        + rule_membership_count_matches_users(user_count, membership_count)
        + rule_memberships_reference_valid_rows(orphan_memberships)
        + rule_orgs_with_members_have_owner(org_owner_stats)
    )


# ---------------------------------------------------------------------------
# Input gathering
# ---------------------------------------------------------------------------

async def gather(conn) -> dict:
    default_org_count = await conn.fetchval(
        "SELECT COUNT(*) FROM organizations WHERE id = $1", DEFAULT_ORG_ID)

    orphan_sites = [
        (r["id"], r["orgId"]) for r in await conn.fetch(
            """
            SELECT s.id, s."orgId" FROM sites s
            LEFT JOIN organizations o ON o.id = s."orgId"
            WHERE o.id IS NULL
            ORDER BY s.id
            """)
    ]

    user_count = await conn.fetchval("SELECT COUNT(*) FROM users")
    membership_count = await conn.fetchval(
        "SELECT COUNT(*) FROM org_memberships")

    orphan_memberships = [
        (r["id"], r["kind"]) for r in await conn.fetch(
            """
            SELECT m.id, 'user' AS kind FROM org_memberships m
            LEFT JOIN users u ON u.id = m."userId" WHERE u.id IS NULL
            UNION ALL
            SELECT m.id, 'organization' AS kind FROM org_memberships m
            LEFT JOIN organizations o ON o.id = m."orgId" WHERE o.id IS NULL
            ORDER BY 1, 2
            """)
    ]

    org_owner_stats = [
        (r["id"], r["member_count"], r["owner_count"]) for r in await conn.fetch(
            """
            SELECT o.id,
                   COUNT(m.id) AS member_count,
                   COUNT(m.id) FILTER (WHERE m."orgRole" = 'OWNER') AS owner_count
            FROM organizations o
            LEFT JOIN org_memberships m ON m."orgId" = o.id
            GROUP BY o.id
            ORDER BY o.id
            """)
    ]

    return {
        "default_org_count": default_org_count,
        "orphan_sites": orphan_sites,
        "user_count": user_count,
        "membership_count": membership_count,
        "orphan_memberships": orphan_memberships,
        "org_owner_stats": org_owner_stats,
    }


async def run(database_url: str) -> int:
    import asyncpg

    conn = await asyncpg.connect(database_url)
    try:
        inputs = await gather(conn)
    finally:
        await conn.close()

    problems = evaluate(**inputs)

    print(f"Organization migration verifier")
    print(f"  users: {inputs['user_count']}, "
          f"memberships: {inputs['membership_count']}, "
          f"organizations checked: {len(inputs['org_owner_stats'])}")

    if problems:
        for problem in problems:
            print(f"  FAIL {problem}")
        print(f"{len(problems)} violation(s). The backfill did not hold — "
              f"do not proceed with the upgrade.")
        return 1

    print("  All rules hold (R1-R5).")
    return 0


def main() -> int:
    database_url = os.environ.get("DATABASE_URL")
    if not database_url:
        print("DATABASE_URL is required", file=sys.stderr)
        return 2
    return asyncio.run(run(database_url))


if __name__ == "__main__":
    sys.exit(main())
