"""Cross-organization negatives and target-state expectations.

Two kinds of tests, deliberately mixed in one file so the boundary reads
as one story:

- Plain assertions: invariants that hold TODAY and must keep holding
  through every step of the organization work. A regression here is a
  broken build, full stop.

- xfail assertions: the TARGET semantics of org roles, which arrive with
  org enforcement. They execute the real request today and document
  current behavior; the enforcement-flip PR converts them to strict
  assertions. An early XPASS is a SIGNAL, not noise - it means an
  endpoint started enforcing (or otherwise changed) ahead of the flip,
  and must be reported and explained, whether it is good news or bad.
"""

import pytest

from conftest import IDS, as_user

pytestmark = pytest.mark.usefixtures("adversarial_world")

ENFORCEMENT_OFF = pytest.mark.xfail(
    reason="target org-role semantics; enforced at the org-enforcement flip",
    strict=False,
)


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
# Target-state expectations (xfail until the enforcement flip)
# ---------------------------------------------------------------------------

@ENFORCEMENT_OFF
def test_org_admin_sees_all_sites_of_their_org(adversarial_world):
    # Composition rule: org ADMIN is at least instance-ADMIN on every
    # instance in the org - the site listing must include all org-A sites
    # without per-site grants.
    response = as_user(adversarial_world, "a_admin").get("/session/sites")
    assert response.status_code == 200
    assert IDS["site_a"] in [s["id"] for s in response.json()]


@ENFORCEMENT_OFF
def test_org_admin_sees_instances_of_their_org_site(adversarial_world):
    response = as_user(adversarial_world, "a_admin").get(
        f"/session/sites/{IDS['site_a']}/instances")
    assert response.status_code == 200
    assert IDS["instance_a"] in [i["id"] for i in response.json()]


@ENFORCEMENT_OFF
def test_token_creation_rejects_foreign_org_instance_ids(adversarial_world):
    # Target semantics with enforcement OFF: a cross-org allowed-id is inert
    # (FK passes, request-time grant intersection is the backstop). This
    # xfails today and flips strict at the enforcement flip; the enforced
    # behavior is proven in the ON test below.
    response = as_user(adversarial_world, "a_member").post(
        "/tokens",
        json={"name": "adv-cross-org-probe", "scopes": ["read"],
              "allowed_instance_ids": [IDS["instance_b"]],
              "allowed_site_ids": []})
    assert response.status_code in (400, 403, 422)


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
