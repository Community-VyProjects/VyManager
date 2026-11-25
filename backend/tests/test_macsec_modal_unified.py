"""MACsec create and edit share one modal.

CreateMacsecModal and EditMacsecModal were the same form.
They are now MacsecModal with existing?: MacsecInterface | null; the save
emits a diff through macsec-save-ops.ts for both a create and an update.
"""

from pathlib import Path

from tests.en_message import en_message

REPO = Path(__file__).resolve().parents[2]
COMP = REPO / "frontend/src/components/interfaces"
PAGE = REPO / "frontend/src/app/network/interfaces/page.tsx"
CLIENT = REPO / "frontend/src/lib/api/macsec.ts"
OLD = REPO / "frontend/src/components/macsec"


def test_cloned_create_edit_files_are_gone():
    assert not OLD.exists()
    assert not (COMP / "CreateMacsecModal.tsx").exists()
    assert not (COMP / "EditMacsecModal.tsx").exists()
    assert (COMP / "MacsecModal.tsx").exists()
    assert (COMP / "DeleteMacsecModal.tsx").exists()


def test_unified_modal_has_existing_and_both_ops():
    text = (COMP / "MacsecModal.tsx").read_text()
    assert "existing?: MacsecInterface | null" in text
    assert "const isEdit = !!existing" in text
    assert "macsecService.updateInterface(original, draft, capabilities)" in text
    assert "macsecService.createInterface(draft, capabilities)" in text
    assert "macsecSaveProblem(original, draft, capabilities, existingInterfaces)" in text
    assert "disabled={isEdit}" in text
    assert en_message(REPO, "macsec.json", "modal.errors.updateFailed") == "Failed to update MACsec interface"
    assert en_message(REPO, "macsec.json", "modal.errors.createFailed") == "Failed to create MACsec interface"


def test_client_create_and_update_go_through_save_ops():
    client = CLIENT.read_text()
    assert "macsecSaveOps(null, draft, caps)" in client
    assert "macsecSaveOps(original, draft, caps)" in client


def test_interfaces_page_uses_unified_modal():
    page = PAGE.read_text()
    assert 'from "@/components/interfaces/MacsecModal"' in page
    assert 'from "@/components/interfaces/DeleteMacsecModal"' in page
    assert 'from "@/components/macsec/' not in page
    assert "MacsecModal" in page
    assert "key={macsecModalKey}" in page
    assert 'from "@/components/macsec/CreateMacsecModal"' not in page
    assert "<CreateMacsecModal" not in page
    assert 'from "@/components/macsec/EditMacsecModal"' not in page
    assert "<EditMacsecModal" not in page
