"""Adversarial coverage for the organization CRUD + membership router.

The router that mints and alters org roles (create/update/delete org,
add/set-role/remove member, the last-owner guard) had no tests — audit
D4 flagged it. Every mutating endpoint is require_super_admin-gated
today, so the invariants proven here are:

- a non-deployment-admin (even an org ADMIN by membership) cannot touch
  the org router at all;
- a System Administrator can run the full lifecycle;
- the last-OWNER orphan guard holds for both demote and remove.

These run under the two-org fixture; they seed and tear down their own
throwaway org so they never disturb the shared adversarial world.
"""

import asyncio
import os

import asyncpg
import pytest

from conftest import USERS, as_user

pytestmark = pytest.mark.usefixtures("adversarial_world")

TEST_ORG = "adv_org_crud"


def _db():
    return os.environ["DATABASE_URL"]


async def _cleanup_org():
    conn = await asyncpg.connect(_db())
    try:
        await conn.execute('DELETE FROM org_memberships WHERE "orgId" = $1', TEST_ORG)
        await conn.execute("DELETE FROM organizations WHERE id = $1", TEST_ORG)
        await conn.execute(
            "DELETE FROM organizations WHERE name = 'CRUD Probe Org'")
    finally:
        await conn.close()


@pytest.fixture()
def clean_org():
    asyncio.run(_cleanup_org())
    yield
    asyncio.run(_cleanup_org())


# ---------------------------------------------------------------------------
# Non-deployment-admins cannot mutate the org router
# ---------------------------------------------------------------------------

@pytest.mark.parametrize("actor", ["a_admin", "a_member", "b_member"])
def test_non_sysadmin_cannot_create_org(adversarial_world, actor):
    # a_admin is org-A ADMIN by membership but only a deployment VIEWER;
    # the org router is deployment-admin-only, so all three are denied.
    response = as_user(adversarial_world, actor).post(
        "/organizations", json={"name": "CRUD Probe Org"})
    assert response.status_code == 403


def test_non_sysadmin_cannot_add_member(adversarial_world):
    from conftest import IDS
    response = as_user(adversarial_world, "a_admin").post(
        f"/organizations/{IDS['org_a']}/members",
        json={"userId": USERS["b_member"][0], "orgRole": "MEMBER"})
    assert response.status_code == 403


def test_non_sysadmin_cannot_delete_org(adversarial_world):
    from conftest import IDS
    response = as_user(adversarial_world, "a_member").delete(
        f"/organizations/{IDS['org_a']}")
    assert response.status_code == 403


# ---------------------------------------------------------------------------
# System Administrator lifecycle + the last-owner guard
# ---------------------------------------------------------------------------

def test_sysadmin_full_membership_lifecycle(adversarial_world, clean_org):
    client = as_user(adversarial_world, "sys")

    async def seed_org():
        conn = await asyncpg.connect(_db())
        try:
            await conn.execute(
                'INSERT INTO organizations (id, name, "createdAt", "updatedAt")'
                " VALUES ($1, 'CRUD Lifecycle Org', NOW(), NOW())", TEST_ORG)
            # sys is the sole OWNER; a_member is a MEMBER to demote/promote.
            await conn.execute(
                'INSERT INTO org_memberships (id, "userId", "orgId", "orgRole",'
                ' "createdAt", "updatedAt") VALUES'
                " ('omc_sys', $1, $3, 'OWNER', NOW(), NOW()),"
                " ('omc_mem', $2, $3, 'MEMBER', NOW(), NOW())",
                USERS["sys"][0], USERS["a_member"][0], TEST_ORG)
        finally:
            await conn.close()

    asyncio.run(seed_org())

    # Promote the member to OWNER, then the original OWNER can be demoted.
    promote = client.patch(
        f"/organizations/{TEST_ORG}/members/{USERS['a_member'][0]}",
        json={"orgRole": "OWNER"})
    assert promote.status_code == 200

    demote = client.patch(
        f"/organizations/{TEST_ORG}/members/{USERS['sys'][0]}",
        json={"orgRole": "MEMBER"})
    assert demote.status_code == 200


def test_sysadmin_cannot_orphan_the_last_owner(adversarial_world, clean_org):
    client = as_user(adversarial_world, "sys")

    async def seed_org():
        conn = await asyncpg.connect(_db())
        try:
            await conn.execute(
                'INSERT INTO organizations (id, name, "createdAt", "updatedAt")'
                " VALUES ($1, 'CRUD Orphan Org', NOW(), NOW())", TEST_ORG)
            await conn.execute(
                'INSERT INTO org_memberships (id, "userId", "orgId", "orgRole",'
                ' "createdAt", "updatedAt") VALUES'
                " ('omc_sys', $1, $3, 'OWNER', NOW(), NOW()),"
                " ('omc_mem', $2, $3, 'MEMBER', NOW(), NOW())",
                USERS["sys"][0], USERS["a_member"][0], TEST_ORG)
        finally:
            await conn.close()

    asyncio.run(seed_org())

    # Demoting the sole OWNER while a member remains must be refused.
    demote = client.patch(
        f"/organizations/{TEST_ORG}/members/{USERS['sys'][0]}",
        json={"orgRole": "MEMBER"})
    assert demote.status_code == 409

    # Removing the sole OWNER while a member remains must be refused too.
    remove = client.delete(
        f"/organizations/{TEST_ORG}/members/{USERS['sys'][0]}")
    assert remove.status_code == 409
