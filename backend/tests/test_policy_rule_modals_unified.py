"""Policy rule create and edit share one modal per pair.

Route rules, local routes, and the list-rule pairs were the same form twice.
They are now one modal each with existing?: T | null. List-container create
(first-rule wizard) stays separate from description-only list edit.
"""

from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
COMP = REPO / "frontend/src/components/policies"
PAGES = REPO / "frontend/src/app/policies"

MODALS = (
    "RouteRuleModal.tsx",
    "LocalRouteModal.tsx",
    "AsPathListRuleModal.tsx",
    "CommunityListRuleModal.tsx",
    "LargeCommunityListRuleModal.tsx",
    "ExtCommunityListRuleModal.tsx",
    "AccessListRuleModal.tsx",
    "PrefixListRuleModal.tsx",
    "RouteMapRuleModal.tsx",
)

GONE = (
    "CreateRouteRuleModal.tsx",
    "EditRouteRuleModal.tsx",
    "CreateLocalRouteModal.tsx",
    "EditLocalRouteModal.tsx",
    "CreateAsPathListRuleModal.tsx",
    "EditAsPathListRuleModal.tsx",
    "CreateCommunityListRuleModal.tsx",
    "EditCommunityListRuleModal.tsx",
    "CreateLargeCommunityListRuleModal.tsx",
    "EditLargeCommunityListRuleModal.tsx",
    "CreateExtCommunityListRuleModal.tsx",
    "EditExtCommunityListRuleModal.tsx",
    "AddAccessListRuleModal.tsx",
    "EditAccessListRuleModal.tsx",
    "AddPrefixListRuleModal.tsx",
    "EditPrefixListRuleModal.tsx",
    "AddRouteMapRuleModal.tsx",
    "EditRouteMapRuleModal.tsx",
)

PAGE_IMPORTS = (
    (PAGES / "route/page.tsx", "RouteRuleModal"),
    (PAGES / "local-route/page.tsx", "LocalRouteModal"),
    (PAGES / "bgp-as/page.tsx", "AsPathListRuleModal"),
    (PAGES / "bgp-community/page.tsx", "CommunityListRuleModal"),
    (PAGES / "bgp-large-community/page.tsx", "LargeCommunityListRuleModal"),
    (PAGES / "bgp-extended-community/page.tsx", "ExtCommunityListRuleModal"),
    (PAGES / "access-list/page.tsx", "AccessListRuleModal"),
    (PAGES / "prefix-list/page.tsx", "PrefixListRuleModal"),
    (PAGES / "route-map/page.tsx", "RouteMapRuleModal"),
)

FORMS = (
    "policy-list-rule-form.ts",
    "local-route-form.ts",
    "prefix-list-rule-form.ts",
    "access-list-rule-form.ts",
    "route-rule-form.ts",
    "route-map-rule-form.ts",
    "policy-rules-form.test.ts",
)


def test_cloned_create_edit_files_are_gone():
    for name in GONE:
        assert not (COMP / name).exists(), name


def test_pages_use_unified_modals():
    for page, modal in PAGE_IMPORTS:
        src = page.read_text()
        assert f'from "@/components/policies/{modal}"' in src
        assert f"<{modal}" in src
        gone_names = [g[:-4] for g in GONE]
        for gone in gone_names:
            assert f'from "@/components/policies/{gone}"' not in src
            assert f"<{gone}" not in src


def test_modals_use_shared_mode_helpers():
    for name in MODALS:
        modal = (COMP / name).read_text()
        assert 'from "@/lib/modal-mode"' in modal
        assert "lockedIdentity(existing, (r) => String(r.rule_number)" in modal
        assert "modalWriteKind(existing ? { name: String(existing.rule_number) } : null)" in modal


def test_form_logic_lives_in_a_tested_module():
    for name in FORMS:
        assert (COMP / name).exists(), name
    assert 'from "./policy-list-rule-form"' in (COMP / "AsPathListRuleModal.tsx").read_text()
    assert 'from "./local-route-form"' in (COMP / "LocalRouteModal.tsx").read_text()
    assert 'from "./route-rule-form"' in (COMP / "RouteRuleModal.tsx").read_text()
    assert 'from "./route-map-rule-form"' in (COMP / "RouteMapRuleModal.tsx").read_text()
    assert 'from "./prefix-list-rule-form"' in (COMP / "PrefixListRuleModal.tsx").read_text()
    assert 'from "./access-list-rule-form"' in (COMP / "AccessListRuleModal.tsx").read_text()


def test_config_ui_shows_no_version_numbers():
    for name in MODALS:
        src = (COMP / name).read_text()
        for banned in ("VyOS 1.5", "VyOS 1.4", "1.5+ only", "1.4 only"):
            assert banned not in src


def test_list_container_create_edit_were_not_merged():
    assert (COMP / "CreateAccessListModal.tsx").exists()
    assert (COMP / "EditAccessListModal.tsx").exists()
    assert (COMP / "CreatePrefixListModal.tsx").exists()
    assert (COMP / "EditPrefixListModal.tsx").exists()
    assert (COMP / "CreateAsPathListModal.tsx").exists()
    assert (COMP / "EditAsPathListModal.tsx").exists()
    assert (COMP / "CreateRouteMapModal.tsx").exists()
    assert (COMP / "EditRouteMapModal.tsx").exists()
