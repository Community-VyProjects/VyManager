"""DHCP range and static mapping create and edit share one modal each.

AddRangeModal and EditRangeModal were the same form, as were
AddStaticMappingModal and EditStaticMappingModal. They are now RangeModal
with existing?: { subnet, range } | null and StaticMappingModal with
existing?: { network, subnet, mapping } | null.
"""

from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
COMP = REPO / "frontend/src/components/services"
PAGE = REPO / "frontend/src/app/network/dhcp/page.tsx"


def test_cloned_create_edit_files_are_gone():
    assert not (COMP / "AddRangeModal.tsx").exists()
    assert not (COMP / "EditRangeModal.tsx").exists()
    assert not (COMP / "AddStaticMappingModal.tsx").exists()
    assert not (COMP / "EditStaticMappingModal.tsx").exists()


def test_dhcp_page_uses_unified_modals():
    page = PAGE.read_text()
    assert 'from "@/components/services/RangeModal"' in page
    assert "<RangeModal" in page
    assert 'from "@/components/services/StaticMappingModal"' in page
    assert "<StaticMappingModal" in page
    for gone in (
        "AddRangeModal",
        "EditRangeModal",
        "AddStaticMappingModal",
        "EditStaticMappingModal",
    ):
        assert f'from "@/components/services/{gone}"' not in page
        assert f"<{gone}" not in page


def test_modals_use_shared_mode_helpers():
    range_modal = (COMP / "RangeModal.tsx").read_text()
    mapping_modal = (COMP / "StaticMappingModal.tsx").read_text()

    for modal in (range_modal, mapping_modal):
        assert 'from "@/lib/modal-mode"' in modal

    assert "modalWriteKind(existing ? { name: existing.range.range_id } : null)" in range_modal
    assert "modalWriteKind(existing ? { name: existing.mapping.name } : null)" in mapping_modal
    assert "lockedIdentity(existing, (record) => record.subnet, draft.subnet)" in range_modal
    assert "lockedIdentity(existing, (record) => record.mapping.name, draft.name)" in mapping_modal


def test_form_logic_lives_in_a_tested_module():
    """The draft, validators and submit builders have their own tests.

    Run them with: npx tsx --test src/components/services/dhcp-form.test.ts
    (node --test cannot resolve the extensionless .ts import).
    """
    assert (COMP / "dhcp-form.ts").exists()
    assert (COMP / "dhcp-form.test.ts").exists()
    assert 'from "./dhcp-form"' in (COMP / "RangeModal.tsx").read_text()
    assert 'from "./dhcp-form"' in (COMP / "StaticMappingModal.tsx").read_text()


def test_config_ui_shows_no_version_only_labels():
    for name in ("RangeModal.tsx", "StaticMappingModal.tsx"):
        src = (COMP / name).read_text()
        for banned in (
            "VyOS 1.5",
            "VyOS 1.4",
            "1.5+ only",
            "1.4 only",
            "Not supported on VyOS",
        ):
            assert banned not in src
