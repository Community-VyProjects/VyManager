"""VPP create and edit share one modal.

CreateVppModal and EditVppModal were the same 800-line form.
They are now VppModal with existing?: VppAnyConfig | null.
"""

from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
COMP = REPO / "frontend/src/components/vpp"
PAGE = REPO / "frontend/src/app/network/interfaces/page.tsx"


def test_cloned_create_edit_files_are_gone():
    assert not (COMP / "CreateVppModal.tsx").exists()
    assert not (COMP / "EditVppModal.tsx").exists()


def test_interfaces_page_uses_unified_modal():
    page = PAGE.read_text()
    assert 'from "@/components/vpp/VppModal"' in page
    assert "<VppModal" in page
    for gone in ("CreateVppModal", "EditVppModal"):
        assert f'from "@/components/vpp/{gone}"' not in page
        assert f"<{gone}" not in page


def test_modal_uses_shared_mode_helpers():
    modal = (COMP / "VppModal.tsx").read_text()
    assert 'from "@/lib/modal-mode"' in modal
    # Identity field is locked through the shared helper, not an ad hoc flag.
    assert "lockedIdentity(existing, (i) => i.name, draft.name)" in modal
    # The update target name comes from the stored record, not form state.
    assert "modalWriteKind(existing)" in modal


def test_form_logic_lives_in_a_tested_module():
    """The draft, validators and submit builders have their own tests.

    Run them with: npx tsx --test src/components/vpp/vpp-form.test.ts
    (node --test cannot resolve the extensionless .ts import).
    """
    assert (COMP / "vpp-form.ts").exists()
    assert (COMP / "vpp-form.test.ts").exists()
    assert 'from "./vpp-form"' in (COMP / "VppModal.tsx").read_text()


def test_config_ui_shows_no_version_numbers():
    modal = (COMP / "VppModal.tsx").read_text()
    for banned in ("VyOS 1.5", "VyOS 1.4", "1.5+ only", "1.4 only"):
        assert banned not in modal
