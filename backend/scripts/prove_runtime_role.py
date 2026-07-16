"""Prove the Golden Rule on the REAL runtime role (flip-runbook step).

The structural test (tests/adversarial/test_golden_rule.py) shows the
intended grant set blocks the authorization tables — but production
could still run the frontend as the table owner or a superuser with the
ban unenforced. This script asks Postgres about the actual principal of
the DATABASE_URL it is given. Run it after switching the frontend to its
fenced role:

    DATABASE_URL=<frontend-role-url> python -m scripts.prove_runtime_role

Exit code 0 = the role cannot write any authorization table and is not
a superuser. Non-zero = the Golden Rule is not structurally enforced on
this deployment; the output names each offending grant.
"""

import asyncio
import os
import sys

import asyncpg

BANNED_TABLES = [
    "org_memberships",
    "user_instance_roles",
    "user_feature_permissions",
    "organizations",
    "oauth_role_mappings",
    "sites",
    "instances",
]

PRIVILEGES = ("INSERT", "UPDATE", "DELETE")


async def main() -> int:
    url = os.environ.get("DATABASE_URL")
    if not url:
        print("DATABASE_URL is required (the frontend's connection string)")
        return 2

    conn = await asyncpg.connect(url)
    failures = []
    try:
        role = await conn.fetchval("SELECT current_user")
        superuser = await conn.fetchval(
            "SELECT usesuper FROM pg_user WHERE usename = current_user")
        print(f"runtime role: {role} (superuser: {bool(superuser)})")
        if superuser:
            failures.append(
                "role is a superuser — every table ban is bypassed")

        for table in BANNED_TABLES:
            for privilege in PRIVILEGES:
                try:
                    allowed = await conn.fetchval(
                        "SELECT has_table_privilege(current_user, $1, $2)",
                        f'"{table}"', privilege)
                except asyncpg.UndefinedTableError:
                    print(f"  {table}: missing (skipped)")
                    break
                if allowed:
                    failures.append(f"role has {privilege} on {table}")

        # The D1-01 vector: UPDATE on users.role lets a compromised
        # frontend self-promote to site ADMIN.
        role_update = await conn.fetchval(
            "SELECT has_column_privilege(current_user, 'users', 'role',"
            " 'UPDATE')")
        if role_update:
            failures.append(
                "role can UPDATE users.role — frontend self-promotion open")
    finally:
        await conn.close()

    if failures:
        print("\nGOLDEN RULE NOT ENFORCED:")
        for failure in failures:
            print(f"  ✗ {failure}")
        return 1
    print("✓ runtime role cannot write any authorization table")
    return 0


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
