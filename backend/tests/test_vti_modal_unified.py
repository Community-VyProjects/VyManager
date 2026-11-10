"""VTI create and edit share one modal.

CreateVtiModal and EditVtiModal were the same form.
They are now VtiModal with existing?: VtiInterface | null.
"""

from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
COMP = REPO / "frontend/src/components/interfaces"
PAGE = REPO / "frontend/src/app/network/interfaces/page.tsx"
OLD = REPO / "frontend/src/components/vti"


def test_cloned_create_edit_files_are_gone():
    assert not OLD.exists()
    assert not (COMP / "CreateVtiModal.tsx").exists()
    assert not (COMP / "EditVtiModal.tsx").exists()
    assert (COMP / "VtiModal.tsx").exists()
    assert (COMP / "DeleteVtiModal.tsx").exists()


def test_interfaces_page_uses_unified_modal():
    page = PAGE.read_text()
    assert 'from "@/components/interfaces/VtiModal"' in page
    assert 'from "@/components/interfaces/DeleteVtiModal"' in page
    assert 'from "@/components/vti/' not in page
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
