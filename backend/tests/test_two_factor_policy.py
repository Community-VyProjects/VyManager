"""Org selection for the require-2FA admin card. No database."""

import pytest
from fastapi import HTTPException

from routers.session.session import (
    allow_explicit_policy_org,
    auth_session_is_live,
    pick_two_factor_policy_org,
)


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


def test_explicit_org_is_dropped_unless_admin_or_member():
    assert allow_explicit_policy_org("org-x", is_super_admin=True, is_member=False) == "org-x"
    assert allow_explicit_policy_org("org-x", is_super_admin=False, is_member=True) == "org-x"
    assert allow_explicit_policy_org("org-x", is_super_admin=False, is_member=False) is None
    assert allow_explicit_policy_org(None, is_super_admin=True, is_member=True) is None


def test_idle_auth_session_is_not_another_device():
    from datetime import datetime, timedelta, timezone

    now = datetime(2026, 9, 22, 12, 0, tzinfo=timezone.utc)
    expires = now + timedelta(days=7)
    assert auth_session_is_live(expires, now - timedelta(minutes=5), now, idle_minutes=30) is True
    assert auth_session_is_live(expires, now - timedelta(minutes=31), now, idle_minutes=30) is False
    assert auth_session_is_live(now - timedelta(minutes=1), now, now, idle_minutes=30) is False
