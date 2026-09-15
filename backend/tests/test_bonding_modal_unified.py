"""Bonding create and edit share one modal.

CreateBondingModal and EditBondingModal were the same form.
They are now BondingModal with existing?: BondingInterface | null.
"""

from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
COMP = REPO / "frontend/src/components/bonding"
PAGE = REPO / "frontend/src/app/network/interfaces/page.tsx"


def test_cloned_create_edit_files_are_gone():
    assert not (COMP / "CreateBondingModal.tsx").exists()
    assert not (COMP / "EditBondingModal.tsx").exists()


def test_unified_modal_has_existing_and_both_ops():
    text = (COMP / "BondingModal.tsx").read_text()
    assert "existing?: BondingInterface | null" in text
    assert "const isEdit = !!existing" in text
    assert "createInterface" in text
    assert "updateInterface" in text
    assert "Interface name cannot be changed." in text
    assert "disabled={isEdit}" in text


def test_interfaces_page_uses_unified_modal():
    page = PAGE.read_text()
    assert "BondingModal" in page
    assert 'from "@/components/bonding/CreateBondingModal"' not in page
    assert "<CreateBondingModal" not in page
    assert 'from "@/components/bonding/EditBondingModal"' not in page
    assert "<EditBondingModal" not in page
