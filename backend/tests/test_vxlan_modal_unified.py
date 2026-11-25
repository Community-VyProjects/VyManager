"""VXLAN create and edit share one modal.

CreateVxlanModal and EditVxlanModal were the same form.
They are now VxlanModal with existing?: VxlanInterface | null; the save
emits a diff through vxlan-save-ops.ts for both a create and an update.
"""

from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
COMP = REPO / "frontend/src/components/interfaces"
PAGE = REPO / "frontend/src/app/network/interfaces/page.tsx"
CLIENT = REPO / "frontend/src/lib/api/vxlan.ts"
OLD = REPO / "frontend/src/components/vxlan"


def test_cloned_create_edit_files_are_gone():
    assert not OLD.exists()
    assert not (COMP / "CreateVxlanModal.tsx").exists()
    assert not (COMP / "EditVxlanModal.tsx").exists()
    assert (COMP / "VxlanModal.tsx").exists()
    assert (COMP / "DeleteVxlanModal.tsx").exists()


def test_interfaces_page_uses_unified_modal():
    page = PAGE.read_text()
    assert 'from "@/components/interfaces/VxlanModal"' in page
    assert 'from "@/components/interfaces/DeleteVxlanModal"' in page
    assert 'from "@/components/vxlan/' not in page
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
    # Both saves check, then emit a diff through vxlan-save-ops.ts.
    assert "vxlanProblem(original, form, capabilities, existingInterfaces)" in modal
    assert "vxlanService.updateInterface(original, form, capabilities)" in modal
    assert "vxlanService.createInterface(form, capabilities)" in modal


def test_client_create_and_update_go_through_save_ops():
    client = CLIENT.read_text()
    assert "vxlanCreateOps(form, caps)" in client
    assert "vxlanUpdateOps(original, form, caps)" in client
    assert "version_info" not in client


def test_page_seeds_modal_by_key():
    page = PAGE.read_text()
    assert "key={vxlanModalKey}" in page
    assert "key={deleteVxlanKey}" in page
