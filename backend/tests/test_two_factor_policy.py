"""Org selection for the require-2FA admin card. No database."""

import pytest
from fastapi import HTTPException

from routers.session.session import pick_two_factor_policy_org


def test_explicit_org_wins_over_memberships():
    assert pick_two_factor_policy_org("org-b", ["org-a", "org-c"], write=True) == "org-b"
    assert pick_two_factor_policy_org("org-b", ["org-a", "org-c"], write=False) == "org-b"


def test_sole_membership_is_used_when_no_explicit_org():
    assert pick_two_factor_policy_org(None, ["only"], write=True) == "only"
    assert pick_two_factor_policy_org(None, ["only"], write=False) == "only"


def test_write_without_explicit_org_rejects_multiple_memberships():
    with pytest.raises(HTTPException) as exc:
        pick_two_factor_policy_org(None, ["org-a", "org-b"], write=True)
    assert exc.value.status_code == 400
    assert "org_id" in str(exc.value.detail)


def test_write_without_explicit_org_rejects_zero_memberships():
    with pytest.raises(HTTPException) as exc:
        pick_two_factor_policy_org(None, [], write=True)
    assert exc.value.status_code == 400


def test_read_without_explicit_org_does_not_pick_among_many():
    assert pick_two_factor_policy_org(None, ["org-a", "org-b"], write=False) is None
    assert pick_two_factor_policy_org(None, [], write=False) is None
