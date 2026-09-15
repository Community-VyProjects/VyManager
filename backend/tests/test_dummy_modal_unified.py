"""Dummy create and edit share one modal.

CreateDummyModal and EditDummyModal were the same form.
They are now DummyModal with existing?: DummyInterface | null.
"""

from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
COMP = REPO / "frontend/src/components/dummy"
PAGE = REPO / "frontend/src/app/network/interfaces/page.tsx"


def test_cloned_create_edit_files_are_gone():
    assert not (COMP / "CreateDummyModal.tsx").exists()
    assert not (COMP / "EditDummyModal.tsx").exists()


def test_unified_modal_has_existing_and_both_ops():
    text = (COMP / "DummyModal.tsx").read_text()
    assert "existing?: DummyInterface | null" in text
    assert "const isEdit = !!existing" in text
    assert "createInterface" in text
    assert "updateInterface" in text
    assert "Interface name cannot be changed." in text
    assert "disabled={isEdit}" in text


def test_interfaces_page_uses_unified_modal():
    page = PAGE.read_text()
    assert "DummyModal" in page
    assert 'from "@/components/dummy/CreateDummyModal"' not in page
    assert "<CreateDummyModal" not in page
    assert 'from "@/components/dummy/EditDummyModal"' not in page
    assert "<EditDummyModal" not in page
