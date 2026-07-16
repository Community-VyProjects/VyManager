"""Cross-organization negatives and org-role semantics.

- Plain assertions: invariants that hold with enforcement off (today's
  default) and must keep holding through every step of the organization
  work. A regression here is a broken build, full stop.

- Enforcement-on assertions: the org-role semantics that activate under
  ORG_ENFORCEMENT. Each turns the flag on for the request and asserts the
  enforced behavior directly (no longer xfail placeholders — the
  enforcement path has landed and is proven by the FORCE-RLS rehearsal).
"""

import pytest

from conftest import IDS, as_user

pytestmark = pytest.mark.usefixtures("adversarial_world")


# ---------------------------------------------------------------------------
# Invariants that must hold today and forever
# ---------------------------------------------------------------------------

def test_member_site_listing_never_crosses_the_org_boundary(adversarial_world):
    response = as_user(adversarial_world, "a_member").get("/session/sites")
    assert response.status_code == 200
    site_ids = [s["id"] for s in response.json()]
    assert IDS["site_b"] not in site_ids
    assert site_ids == [IDS["site_a"]]


def test_member_cannot_connect_to_foreign_org_instance(adversarial_world):
    response = as_user(adversarial_world, "a_member").post(
        "/session/connect", json={"instance_id": IDS["instance_b"]})
    assert response.status_code == 404


def test_explicit_org_param_rejects_non_members(adversarial_world):
    response = as_user(adversarial_world, "a_member").get(
        "/session/sites", params={"org_id": IDS["org_b"]})
    assert response.status_code == 403


def test_explicit_org_param_rejects_unknown_org(adversarial_world):
    response = as_user(adversarial_world, "a_member").get(
        "/session/sites", params={"org_id": "adv_no_such_org"})
    assert response.status_code == 404


def test_member_cannot_delete_foreign_org_assignment(adversarial_world):
    response = as_user(adversarial_world, "a_member").delete(
        f"/user-management/assignments/{IDS['grant_b']}")
    assert response.status_code == 403
    # the grant must still exist: org-B member still sees their site
    check = as_user(adversarial_world, "b_member").get("/session/sites")
    assert [s["id"] for s in check.json()] == [IDS["site_b"]]


def test_org_admin_membership_grants_no_deployment_powers(adversarial_world):
    # users.role is VIEWER; orgRole ADMIN of org A must not open the
    # deployment-wide user list. NOTE: at the flip this endpoint becomes
    # org-scoped and the expectation changes to an org-A-only 200 - revisit
    # there, deliberately not an xfail (the future status code is part of
    # the org-management design, not fixed yet).
    response = as_user(adversarial_world, "a_admin").get(
        "/user-management/users")
    assert response.status_code == 403


def test_system_administrator_sees_all_orgs(adversarial_world):
    response = as_user(adversarial_world, "sys").get("/session/sites")
    assert response.status_code == 200
    site_ids = {s["id"] for s in response.json()}
    assert {IDS["site_a"], IDS["site_b"]} <= site_ids


# ---------------------------------------------------------------------------
# Org-role semantics under enforcement (proven workable by the FORCE-RLS
# rehearsal; asserted here with the flag on). These were xfail placeholders
# until the enforcement path landed and is verified; they are strict now.
# ---------------------------------------------------------------------------

def test_org_admin_sees_all_sites_of_their_org(adversarial_world, monkeypatch):
    # Composition rule: org ADMIN is at least instance-ADMIN on every
    # instance in the org - the site listing must include all org-A sites
    # without per-site grants.
    import org_scope
    monkeypatch.setattr(org_scope, "ORG_ENFORCEMENT", True)
    response = as_user(adversarial_world, "a_admin").get("/session/sites")
    assert response.status_code == 200
    assert IDS["site_a"] in [s["id"] for s in response.json()]


def test_org_admin_sees_instances_of_their_org_site(adversarial_world, monkeypatch):
    import org_scope
    monkeypatch.setattr(org_scope, "ORG_ENFORCEMENT", True)
    response = as_user(adversarial_world, "a_admin").get(
        f"/session/sites/{IDS['site_a']}/instances")
    assert response.status_code == 200
    assert IDS["instance_a"] in [i["id"] for i in response.json()]


def test_token_creation_org_confined_under_enforcement(
        adversarial_world, monkeypatch):
    # Token creation is member-reachable, so org confinement bites members
    # under enforcement without waiting for the ADMIN-per-org item. A
    # cross-org allowed-id is folded into "unknown" (400), indistinguishable
    # from a nonexistent id so existence does not leak; a same-org id passes.
    import org_scope
    monkeypatch.setattr(org_scope, "ORG_ENFORCEMENT", True)

    cross = as_user(adversarial_world, "a_member").post(
        "/tokens",
        json={"name": "adv-cross", "scopes": ["read"],
              "allowed_instance_ids": [IDS["instance_b"]],
              "allowed_site_ids": []})
    assert cross.status_code == 400

    same = as_user(adversarial_world, "a_member").post(
        "/tokens",
        json={"name": "adv-same", "scopes": ["read"],
              "allowed_instance_ids": [IDS["instance_a"]],
              "allowed_site_ids": []})
    assert same.status_code == 200


def test_token_use_cannot_cross_the_org_boundary(adversarial_world):
    # Token confinement at USE (RFC §8), not just at creation. a_member
    # mints a token scoped to their own org-A instance, then presents it
    # with an X-VyOS-Instance-Id header naming the org-B instance. Two
    # independent barriers reject it — no grant on the B instance and the
    # token's allow-list — so no active instance is ever resolved and the
    # request is denied (never a 2xx, and never a 503 that would mean the
    # B instance had been selected and contacted).
    created = as_user(adversarial_world, "a_member").post(
        "/tokens",
        json={"name": "adv-use", "scopes": ["read"],
              "allowed_instance_ids": [IDS["instance_a"]],
              "allowed_site_ids": []})
    assert created.status_code == 200
    token = created.json()["token"]

    cross = adversarial_world.get(
        "/vyos/access-list/config",
        headers={"Authorization": f"Bearer {token}",
                 "X-VyOS-Instance-Id": IDS["instance_b"]})
    assert cross.status_code in (400, 403, 404)
    assert cross.status_code not in (200, 503)
