"""WWAN create and edit share one modal.

CreateWwanModal and EditWwanModal were the same form.
They are now WwanModal with existing?: WwanInterface | null.
"""

from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
COMP = REPO / "frontend/src/components/wwan"
PAGE = REPO / "frontend/src/app/network/interfaces/page.tsx"


def test_cloned_create_edit_files_are_gone():
    assert not (COMP / "CreateWwanModal.tsx").exists()
    assert not (COMP / "EditWwanModal.tsx").exists()


def test_interfaces_page_uses_unified_modal():
    page = PAGE.read_text()
    assert 'from "@/components/wwan/WwanModal"' in page
    assert "<WwanModal" in page
    assert 'from "@/components/wwan/CreateWwanModal"' not in page
    assert "<CreateWwanModal" not in page
    assert 'from "@/components/wwan/EditWwanModal"' not in page
    assert "<EditWwanModal" not in page


def test_modal_uses_shared_mode_helpers():
    modal = (COMP / "WwanModal.tsx").read_text()
    assert 'from "@/lib/modal-mode"' in modal
    # Identity field is locked through the shared helper, not an ad hoc flag.
    assert "lockedIdentity(existing, (i) => i.name, name)" in modal
    # The update target name comes from the stored record, not form state.
    assert "modalWriteKind(existing)" in modal


def test_name_input_is_bound_to_the_locked_identity():
    modal = (COMP / "WwanModal.tsx").read_text()
    # A raw `value={name}` on the name field would let edit rename the record.
    assert "value={lockedName.value}" in modal
    assert "disabled={lockedName.disabled}" in modal


def test_create_only_name_validation_does_not_run_on_edit():
    """The create rules reject any name already in use.

    Running them on edit would reject every edit, since the record being
    edited is itself in existingInterfaces.
    """
    modal = (COMP / "WwanModal.tsx").read_text()
    validate = modal.split("const validateForm", 1)[1].split("};", 1)[0]
    assert "if (!isEdit) {" in validate
    assert "already exists" in validate
