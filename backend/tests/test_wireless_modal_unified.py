"""Wireless create and edit share one modal.

CreateWirelessModal and EditWirelessModal were the same form.
They are now WirelessModal with existing?: WirelessInterface | null.
"""

from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
COMP = REPO / "frontend/src/components/wireless"
PAGE = REPO / "frontend/src/app/network/interfaces/page.tsx"


def test_cloned_create_edit_files_are_gone():
    assert not (COMP / "CreateWirelessModal.tsx").exists()
    assert not (COMP / "EditWirelessModal.tsx").exists()


def test_interfaces_page_uses_unified_modal():
    page = PAGE.read_text()
    assert 'from "@/components/wireless/WirelessModal"' in page
    assert "<WirelessModal" in page
    assert 'from "@/components/wireless/CreateWirelessModal"' not in page
    assert "<CreateWirelessModal" not in page
    assert 'from "@/components/wireless/EditWirelessModal"' not in page
    assert "<EditWirelessModal" not in page


def test_modal_uses_shared_mode_helpers():
    modal = (COMP / "WirelessModal.tsx").read_text()
    assert 'from "@/lib/modal-mode"' in modal
    # Identity field is locked through the shared helper, not an ad hoc flag.
    assert "lockedIdentity(existing, (i) => i.name, name)" in modal
    # The update target name comes from the stored record, not form state.
    assert "modalWriteKind(existing)" in modal


def test_name_input_is_bound_to_the_locked_identity():
    modal = (COMP / "WirelessModal.tsx").read_text()
    # A raw `value={name}` on the name field would let edit rename the record.
    assert "value={lockedName.value}" in modal
    assert "disabled={lockedName.disabled}" in modal
