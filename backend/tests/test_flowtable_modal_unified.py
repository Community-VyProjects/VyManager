"""Flowtable create and edit share one modal.

CreateFlowtableModal and EditFlowtableModal were the same form.
They are now FlowtableModal with existing?: Flowtable | null.
"""

from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
FW = REPO / "frontend/src/components/firewall"
PAGE = REPO / "frontend/src/app/firewall/flowtables/page.tsx"


def test_cloned_create_edit_files_are_gone():
    assert not (FW / "CreateFlowtableModal.tsx").exists()
    assert not (FW / "EditFlowtableModal.tsx").exists()


def test_unified_modal_has_existing_and_both_ops():
    text = (FW / "FlowtableModal.tsx").read_text()
    assert "existing?: Flowtable | null" in text
    assert "const isEdit = !!existing" in text
    assert "createFlowtable" in text
    assert "updateFlowtable" in text
    assert "Flowtable name cannot be changed" in text
    assert "disabled={isEdit}" in text


def test_flowtables_page_uses_unified_modal():
    page = PAGE.read_text()
    assert "FlowtableModal" in page
    assert "CreateFlowtableModal" not in page
    assert "EditFlowtableModal" not in page
