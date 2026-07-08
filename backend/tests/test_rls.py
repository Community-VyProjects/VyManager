"""Row-level-security proof.

Requires DATABASE_URL and the ability to CREATE ROLE (superuser / CREATEROLE);
skips otherwise. Creates the low-privilege runtime role, applies the same
grants the ops step does, and verifies through it:

  - a request sees only its org's rows (app.org_id filter),
  - the operator bypass (app.is_system_admin) sees everything,
  - audit_logs is append-only for the runtime role.

The running app connects as the table owner, which bypasses ENABLEd
(non-FORCEd) RLS, so these policies are inert until the enforcement flip.
"""

import asyncio
import os

import pytest

requires_db = pytest.mark.skipif(
    not os.environ.get("DATABASE_URL"),
    reason="RLS proof needs DATABASE_URL")

RUNTIME = "vym_rls_proof_role"


@requires_db
def test_rls_org_isolation_and_audit_append_only():
    import asyncpg

    async def main():
        owner = await asyncpg.connect(os.environ["DATABASE_URL"])
        try:
            try:
                await owner.execute(f"DROP ROLE IF EXISTS {RUNTIME}")
                await owner.execute(
                    f"CREATE ROLE {RUNTIME} NOLOGIN")
            except asyncpg.InsufficientPrivilegeError:
                pytest.skip("no privilege to CREATE ROLE for the RLS proof")

            # The ops-step grants (mirrors the migration's guarded block).
            await owner.execute(f"GRANT USAGE ON SCHEMA public TO {RUNTIME}")
            await owner.execute(
                "GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES "
                f"IN SCHEMA public TO {RUNTIME}")
            await owner.execute(
                f'REVOKE UPDATE, DELETE ON "audit_logs" FROM {RUNTIME}')

            # Two orgs with a site + instance each.
            await owner.execute("DELETE FROM sites WHERE id IN ('rlsA','rlsB')")
            await owner.execute(
                "DELETE FROM organizations WHERE id IN ('rlsOA','rlsOB')")
            await owner.execute(
                'INSERT INTO organizations (id,name,"createdAt","updatedAt")'
                " VALUES ('rlsOA','A',NOW(),NOW()),('rlsOB','B',NOW(),NOW())")
            await owner.execute(
                'INSERT INTO sites (id,name,"orgId","createdAt","updatedAt")'
                " VALUES ('rlsA','SA','rlsOA',NOW(),NOW()),"
                "('rlsB','SB','rlsOB',NOW(),NOW())")
            await owner.execute(
                'INSERT INTO instances (id,"siteId",name,host,username,'
                'password,"createdAt","updatedAt") VALUES '
                "('rlsIA','rlsA','r','1.1.1.1','v','p',NOW(),NOW()),"
                "('rlsIB','rlsB','r','2.2.2.2','v','p',NOW(),NOW())")

            async def as_runtime(setup_sql, query):
                conn = await asyncpg.connect(os.environ["DATABASE_URL"])
                try:
                    await conn.execute(f"SET ROLE {RUNTIME}")
                    await conn.execute(setup_sql)
                    return await conn.fetch(query)
                finally:
                    await conn.close()

            # app.org_id = rlsOA -> only org A's rows.
            a_sites = await as_runtime(
                "SET app.org_id = 'rlsOA'; SET app.is_system_admin = 'false'",
                "SELECT id FROM sites WHERE id IN ('rlsA','rlsB')")
            assert {r["id"] for r in a_sites} == {"rlsA"}

            a_inst = await as_runtime(
                "SET app.org_id = 'rlsOA'; SET app.is_system_admin = 'false'",
                "SELECT id FROM instances WHERE id IN ('rlsIA','rlsIB')")
            assert {r["id"] for r in a_inst} == {"rlsIA"}

            # Operator bypass sees both orgs.
            all_sites = await as_runtime(
                "SET app.org_id = ''; SET app.is_system_admin = 'true'",
                "SELECT id FROM sites WHERE id IN ('rlsA','rlsB')")
            assert {r["id"] for r in all_sites} == {"rlsA", "rlsB"}

            # No org context, not operator -> sees nothing (deny by default).
            none_sites = await as_runtime(
                "SET app.org_id = ''; SET app.is_system_admin = 'false'",
                "SELECT id FROM sites WHERE id IN ('rlsA','rlsB')")
            assert none_sites == []

            # audit_logs append-only for the runtime role.
            conn = await asyncpg.connect(os.environ["DATABASE_URL"])
            try:
                await conn.execute(f"SET ROLE {RUNTIME}")
                with pytest.raises(asyncpg.InsufficientPrivilegeError):
                    await conn.execute("UPDATE audit_logs SET action = 'x'")
                with pytest.raises(asyncpg.InsufficientPrivilegeError):
                    await conn.execute("DELETE FROM audit_logs")
            finally:
                await conn.close()
        finally:
            await owner.execute("DELETE FROM sites WHERE id IN ('rlsA','rlsB')")
            await owner.execute(
                "DELETE FROM organizations WHERE id IN ('rlsOA','rlsOB')")
            await owner.execute(
                "GRANT UPDATE, DELETE ON ALL TABLES IN SCHEMA public "
                f"TO {RUNTIME}")  # harmless if role about to drop
            await owner.execute(
                "REVOKE ALL ON ALL TABLES IN SCHEMA public "
                f"FROM {RUNTIME}")
            await owner.execute(
                f"REVOKE USAGE ON SCHEMA public FROM {RUNTIME}")
            await owner.execute(f"DROP ROLE IF EXISTS {RUNTIME}")
            await owner.close()

    asyncio.run(main())
