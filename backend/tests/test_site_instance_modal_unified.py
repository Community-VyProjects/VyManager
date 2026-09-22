"""Site and instance create and edit share one modal per entity.

CreateSiteModal/EditSiteModal and CreateInstanceModal/EditInstanceModal were
the same form twice. They are now SiteModal and InstanceModal with
existing?: T | null. Site and instance stay separate modals.
"""

from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
COMP = REPO / "frontend/src/components/sites"
SITES_PAGE = REPO / "frontend/src/app/sites/page.tsx"
ADMIN_PAGE = REPO / "frontend/src/app/administration/page.tsx"
CARD = COMP / "SiteCard.tsx"


def test_cloned_create_edit_files_are_gone():
    for name in (
        "CreateSiteModal.tsx",
        "EditSiteModal.tsx",
        "CreateInstanceModal.tsx",
        "EditInstanceModal.tsx",
    ):
        assert not (COMP / name).exists()


def test_sites_page_uses_unified_modals():
    page = SITES_PAGE.read_text()
    assert 'from "@/components/sites/SiteModal"' in page
    assert "<SiteModal" in page
    assert 'from "@/components/sites/InstanceModal"' in page
    assert "<InstanceModal" in page
    for gone in (
        "CreateSiteModal",
        "EditSiteModal",
        "CreateInstanceModal",
        "EditInstanceModal",
    ):
        assert f'from "@/components/sites/{gone}"' not in page
        assert f"<{gone}" not in page


def test_site_card_uses_unified_instance_modal():
    card = CARD.read_text()
    assert 'from "./InstanceModal"' in card
    assert "<InstanceModal" in card
    assert "CreateInstanceModal" not in card
    assert "EditInstanceModal" not in card


def test_administration_page_uses_unified_instance_modal():
    page = ADMIN_PAGE.read_text()
    assert 'from "@/components/sites/InstanceModal"' in page
    assert "<InstanceModal" in page
    assert 'from "@/components/sites/EditInstanceModal"' not in page
    assert "<EditInstanceModal" not in page


def test_modals_use_shared_mode_helpers():
    site_modal = (COMP / "SiteModal.tsx").read_text()
    assert 'from "@/lib/modal-mode"' in site_modal
    assert "modalWriteKind(existing ? { name: existing.id } : null)" in site_modal

    instance_modal = (COMP / "InstanceModal.tsx").read_text()
    assert 'from "@/lib/modal-mode"' in instance_modal
    assert "modalWriteKind(existing ? { name: existing.id } : null)" in instance_modal


def test_form_logic_lives_in_a_tested_module():
    """The draft, validators and submit builders have their own tests.

    Run them with: npx tsx --test src/components/sites/sites-form.test.ts
    (node --test cannot resolve the extensionless .ts import).
    """
    assert (COMP / "sites-form.ts").exists()
    assert (COMP / "sites-form.test.ts").exists()
    assert 'from "./sites-form"' in (COMP / "SiteModal.tsx").read_text()
    assert 'from "./sites-form"' in (COMP / "InstanceModal.tsx").read_text()


def test_config_ui_shows_no_version_only_labels():
    site_src = (COMP / "SiteModal.tsx").read_text()
    for banned in ("VyOS 1.5", "VyOS 1.4", "1.5+ only", "1.4 only"):
        assert banned not in site_src

    instance_src = (COMP / "InstanceModal.tsx").read_text()
    for banned in ("1.5+ only", "1.4 only", "Not supported on VyOS"):
        assert banned not in instance_src
