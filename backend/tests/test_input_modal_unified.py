"""Input create and edit share one modal.

CreateInputModal and EditInputModal were the same form.
They are now InputModal with existing?: InputInterface | null.
"""

from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
COMP = REPO / "frontend/src/components/input"
PAGE = REPO / "frontend/src/app/network/interfaces/page.tsx"


def test_cloned_create_edit_files_are_gone():
    assert not (COMP / "CreateInputModal.tsx").exists()
    assert not (COMP / "EditInputModal.tsx").exists()


def test_unified_modal_has_existing_and_both_ops():
    text = (COMP / "InputModal.tsx").read_text()
    assert "existing?: InputInterface | null" in text
    assert "const isEdit = !!existing" in text
    assert "createInterface" in text
    assert "updateInterface" in text
    assert "Interface name cannot be changed." in text
    assert "disabled={isEdit}" in text


def test_interfaces_page_uses_unified_modal():
    page = PAGE.read_text()
    assert "InputModal" in page
    assert 'from "@/components/input/CreateInputModal"' not in page
    assert "<CreateInputModal" not in page
    assert 'from "@/components/input/EditInputModal"' not in page
    assert "<EditInputModal" not in page
