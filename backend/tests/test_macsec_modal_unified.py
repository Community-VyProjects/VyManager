"""MACsec create and edit share one modal.

CreateMacsecModal and EditMacsecModal were the same form.
They are now MacsecModal with existing?: MacsecInterface | null.
"""

from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
COMP = REPO / "frontend/src/components/macsec"
PAGE = REPO / "frontend/src/app/network/interfaces/page.tsx"


def test_cloned_create_edit_files_are_gone():
    assert not (COMP / "CreateMacsecModal.tsx").exists()
    assert not (COMP / "EditMacsecModal.tsx").exists()


def test_unified_modal_has_existing_and_both_ops():
    text = (COMP / "MacsecModal.tsx").read_text()
    assert "existing?: MacsecInterface | null" in text
    assert "const isEdit = !!existing" in text
    assert "createInterface" in text
    assert "updateInterface" in text
    assert "Interface name cannot be changed." in text
    assert "disabled={isEdit}" in text


def test_interfaces_page_uses_unified_modal():
    page = PAGE.read_text()
    assert "MacsecModal" in page
    assert 'from "@/components/macsec/CreateMacsecModal"' not in page
    assert "<CreateMacsecModal" not in page
    assert 'from "@/components/macsec/EditMacsecModal"' not in page
    assert "<EditMacsecModal" not in page
