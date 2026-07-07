"""Unit tests for the organization-migration verifier rules.

The rules are pure functions over gathered inputs — no database or FastAPI
app needed, matching the house unit-test style.
"""

from scripts.verify_org_migration import (
    evaluate,
    rule_default_org_exists,
    rule_membership_count_matches_users,
    rule_memberships_reference_valid_rows,
    rule_orgs_with_members_have_owner,
    rule_sites_reference_valid_org,
)


def clean_inputs(**overrides):
    """Inputs for a healthy freshly-migrated database with three users."""
    inputs = {
        "default_org_count": 1,
        "orphan_sites": [],
        "user_count": 3,
        "membership_count": 3,
        "orphan_memberships": [],
        "org_owner_stats": [("default", 3, 1)],
    }
    inputs.update(overrides)
    return inputs


def test_healthy_upgrade_passes():
    assert evaluate(**clean_inputs()) == []


def test_fresh_install_passes():
    # Empty database: no users, no memberships, no OWNER — all valid.
    assert evaluate(**clean_inputs(
        user_count=0, membership_count=0,
        org_owner_stats=[("default", 0, 0)])) == []


def test_missing_default_org_fails():
    problems = rule_default_org_exists(0)
    assert len(problems) == 1
    assert problems[0].startswith("R1")


def test_orphan_site_fails():
    problems = rule_sites_reference_valid_org([("s_one", "gone")])
    assert problems == ["R2: site 's_one' references missing "
                        "organization 'gone'"]


def test_membership_count_mismatch_fails():
    problems = rule_membership_count_matches_users(3, 2)
    assert len(problems) == 1
    assert "membership count (2)" in problems[0]
    assert "user count (3)" in problems[0]


def test_orphan_membership_fails():
    problems = rule_memberships_reference_valid_rows(
        [("om_x", "user"), ("om_y", "organization")])
    assert problems == [
        "R4: membership 'om_x' references a missing user",
        "R4: membership 'om_y' references a missing organization",
    ]


def test_org_with_members_but_no_owner_fails():
    problems = rule_orgs_with_members_have_owner([("default", 3, 0)])
    assert problems == ["R5: organization 'default' has 3 member(s) "
                        "but no OWNER"]


def test_org_without_members_needs_no_owner():
    assert rule_orgs_with_members_have_owner([("default", 0, 0)]) == []


def test_multiple_owners_are_fine():
    assert rule_orgs_with_members_have_owner([("default", 5, 2)]) == []


def test_evaluate_collects_across_rules():
    problems = evaluate(**clean_inputs(
        default_org_count=0,
        membership_count=2,
        org_owner_stats=[("default", 2, 0)],
    ))
    assert len(problems) == 3
    prefixes = sorted(p.split(":")[0] for p in problems)
    assert prefixes == ["R1", "R3", "R5"]
