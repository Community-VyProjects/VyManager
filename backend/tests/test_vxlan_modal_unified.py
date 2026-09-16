"""VXLAN create and edit share one modal.

CreateVxlanModal and EditVxlanModal were the same form.
They are now VxlanModal with existing?: VxlanInterface | null.
"""

from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
COMP = REPO / "frontend/src/components/vxlan"
PAGE = REPO / "frontend/src/app/network/interfaces/page.tsx"


def test_cloned_create_edit_files_are_gone():
    assert not (COMP / "CreateVxlanModal.tsx").exists()
    assert not (COMP / "EditVxlanModal.tsx").exists()


def test_interfaces_page_uses_unified_modal():
    page = PAGE.read_text()
    assert 'from "@/components/vxlan/VxlanModal"' in page
    assert "<VxlanModal" in page
    assert 'from "@/components/vxlan/CreateVxlanModal"' not in page
    assert "<CreateVxlanModal" not in page
    assert 'from "@/components/vxlan/EditVxlanModal"' not in page
    assert "<EditVxlanModal" not in page


def test_modal_uses_shared_mode_helpers():
    modal = (COMP / "VxlanModal.tsx").read_text()
    assert 'from "@/lib/modal-mode"' in modal
    # Identity field is locked through the shared helper, not an ad hoc flag.
    assert "lockedIdentity(existing, (i) => i.name, name)" in modal
    # The update target name comes from the stored record, not form state.
    assert "modalWriteKind(existing)" in modal
