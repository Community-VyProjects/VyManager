"""VTI create and edit share one modal.

CreateVtiModal and EditVtiModal were the same form.
They are now VtiModal with existing?: VtiInterface | null.
"""

from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
COMP = REPO / "frontend/src/components/vti"
PAGE = REPO / "frontend/src/app/network/interfaces/page.tsx"


def test_cloned_create_edit_files_are_gone():
    assert not (COMP / "CreateVtiModal.tsx").exists()
    assert not (COMP / "EditVtiModal.tsx").exists()


def test_interfaces_page_uses_unified_modal():
    page = PAGE.read_text()
    assert 'from "@/components/vti/VtiModal"' in page
    assert "<VtiModal" in page
    assert 'from "@/components/vti/CreateVtiModal"' not in page
    assert "<CreateVtiModal" not in page
    assert 'from "@/components/vti/EditVtiModal"' not in page
    assert "<EditVtiModal" not in page


def test_modal_uses_shared_mode_helpers():
    modal = (COMP / "VtiModal.tsx").read_text()
    assert 'from "@/lib/modal-mode"' in modal
    # Identity field is locked through the shared helper, not an ad hoc flag.
    assert "lockedIdentity(existing, (i) => i.name, name)" in modal
    # The update target name comes from the stored record, not form state.
    assert "modalWriteKind(existing)" in modal
