"""GENEVE create and edit share one modal.

CreateGeneveModal and EditGeneveModal were the same form.
They are now GeneveModal with existing?: GeneveInterface | null.
"""

from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
COMP = REPO / "frontend/src/components/geneve"
PAGE = REPO / "frontend/src/app/network/interfaces/page.tsx"


def test_cloned_create_edit_files_are_gone():
    assert not (COMP / "CreateGeneveModal.tsx").exists()
    assert not (COMP / "EditGeneveModal.tsx").exists()


def test_unified_modal_has_existing_and_both_ops():
    text = (COMP / "GeneveModal.tsx").read_text()
    assert "existing?: GeneveInterface | null" in text
    assert "const isEdit = !!existing" in text
    assert "createInterface" in text
    assert "updateInterface" in text
    assert "Interface name cannot be changed." in text
    assert "disabled={isEdit}" in text


def test_interfaces_page_uses_unified_modal():
    page = PAGE.read_text()
    assert "GeneveModal" in page
    assert 'from "@/components/geneve/CreateGeneveModal"' not in page
    assert "<CreateGeneveModal" not in page
    assert 'from "@/components/geneve/EditGeneveModal"' not in page
    assert "<EditGeneveModal" not in page
