"""Golden Rule structural proof (RFC §8).

The frontend's database role must be unable to write the authorization tables
(org_memberships, user_instance_roles, user_feature_permissions,
organizations): those are backend/migration-owned, so a compromised frontend
cannot mint grants or memberships even if its code tried. This proves the ban
is structural (a table-level privilege), not merely conventional.

The proof creates a restricted role mirroring the intended frontend grants —
write access to the Better Auth core tables only — and asserts that INSERT and
UPDATE on each authz table fail. Needs CREATE ROLE; skips otherwise.

oauth_role_mappings joined the ban once its writes relocated to the backend
(PR #484); sites and instances are backend-owned and join it too. A second proof
checks the REAL runtime role instead of a synthetic one — run it on a
deployment after the enforcement flip (flip-runbook step, not CI):

    DATABASE_URL=<frontend-role-url> python -m scripts.prove_runtime_role
"""

import asyncio
import os

import pytest

requires_db = pytest.mark.skipif(
    not os.environ.get("DATABASE_URL"),
    reason="Golden Rule proof needs DATABASE_URL")

FRONTEND = "vym_frontend_proof"

# Better Auth core tables the frontend legitimately writes.
CORE_TABLES = ["users", "sessions", "accounts", "verifications"]

# Authz tables the frontend must never write.
BANNED_TABLES = [
    "org_memberships",
    "user_instance_roles",
    "user_feature_permissions",
    "organizations",
    # writes relocated to the backend; the frontend only proxies
    "oauth_role_mappings",
    # backend-owned resources — the frontend never writes them directly
    "sites",
    "instances",
]


@requires_db
def test_frontend_role_cannot_write_authz_tables():
    import asyncpg

    async def main():
        owner = await asyncpg.connect(os.environ["DATABASE_URL"])
        created = False
        try:
            try:
                await owner.execute(f"DROP ROLE IF EXISTS {FRONTEND}")
                await owner.execute(f"CREATE ROLE {FRONTEND} NOLOGIN")
                created = True
            except asyncpg.InsufficientPrivilegeError:
                return "skip"

            await owner.execute(f"GRANT USAGE ON SCHEMA public TO {FRONTEND}")
            # Frontend gets write access to the Better Auth core tables only.
            for table in CORE_TABLES:
                await owner.execute(
                    f'GRANT SELECT, INSERT, UPDATE, DELETE ON "{table}" '
                    f"TO {FRONTEND}")
            # Deliberately NOT granted on the authz tables.

            for table in BANNED_TABLES:
                conn = await asyncpg.connect(os.environ["DATABASE_URL"])
                try:
                    await conn.execute(f"SET ROLE {FRONTEND}")
                    with pytest.raises(asyncpg.InsufficientPrivilegeError):
                        await conn.execute(
                            f'INSERT INTO "{table}" (id) VALUES (\'gr_probe\')')
                    with pytest.raises(asyncpg.InsufficientPrivilegeError):
                        await conn.execute(f'UPDATE "{table}" SET id = id')
                finally:
                    await conn.close()

            # Sanity: the frontend role CAN write a core table (users).
            conn = await asyncpg.connect(os.environ["DATABASE_URL"])
            try:
                await conn.execute(f"SET ROLE {FRONTEND}")
                # Reaches the not-null/columns error, not a privilege error —
                # i.e. the grant is present.
                with pytest.raises(asyncpg.PostgresError) as exc:
                    await conn.execute(
                        "INSERT INTO users (id) VALUES ('u_probe')")
                assert not isinstance(
                    exc.value, asyncpg.InsufficientPrivilegeError)
            finally:
                await conn.close()
        finally:
            if created:
                for table in CORE_TABLES:
                    await owner.execute(
                        f'REVOKE ALL ON "{table}" FROM {FRONTEND}')
                await owner.execute(
                    f"REVOKE USAGE ON SCHEMA public FROM {FRONTEND}")
                await owner.execute(f"DROP ROLE IF EXISTS {FRONTEND}")
            await owner.close()
        return "ok"

    if asyncio.run(main()) == "skip":
        pytest.skip("no privilege to CREATE ROLE for the Golden Rule proof")

