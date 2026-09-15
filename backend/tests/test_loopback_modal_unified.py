"""Loopback create and edit share one modal.

CreateLoopbackModal and EditLoopbackModal were the same form.
They are now LoopbackModal with existing?: LoopbackInterface | null.
"""

from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
COMP = REPO / "frontend/src/components/loopback"
PAGE = REPO / "frontend/src/app/network/interfaces/page.tsx"


def test_cloned_create_edit_files_are_gone():
    assert not (COMP / "CreateLoopbackModal.tsx").exists()
    assert not (COMP / "EditLoopbackModal.tsx").exists()


def test_unified_modal_has_existing_and_both_ops():
    text = (COMP / "LoopbackModal.tsx").read_text()
    assert "existing?: LoopbackInterface | null" in text
    assert "const isEdit = !!existing" in text
    assert "createInterface" in text
    assert "updateInterface" in text
    assert 'name: "lo"' in text
    assert "isEdit ? existing.name : \"lo\"" in text


def test_interfaces_page_uses_unified_modal():
    page = PAGE.read_text()
    assert "LoopbackModal" in page
    assert 'from "@/components/loopback/CreateLoopbackModal"' not in page
    assert "<CreateLoopbackModal" not in page
    assert 'from "@/components/loopback/EditLoopbackModal"' not in page
    assert "<EditLoopbackModal" not in page
