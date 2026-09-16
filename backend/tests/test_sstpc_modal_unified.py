"""SSTPC create and edit share one modal.

CreateSstpcModal and EditSstpcModal were the same form.
They are now SstpcModal with existing?: SstpcInterface | null.
"""

from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
COMP = REPO / "frontend/src/components/sstpc"
PAGE = REPO / "frontend/src/app/network/interfaces/page.tsx"


def test_cloned_create_edit_files_are_gone():
    assert not (COMP / "CreateSstpcModal.tsx").exists()
    assert not (COMP / "EditSstpcModal.tsx").exists()


def test_interfaces_page_uses_unified_modal():
    page = PAGE.read_text()
    assert 'from "@/components/sstpc/SstpcModal"' in page
    assert "<SstpcModal" in page
    assert 'from "@/components/sstpc/CreateSstpcModal"' not in page
    assert "<CreateSstpcModal" not in page
    assert 'from "@/components/sstpc/EditSstpcModal"' not in page
    assert "<EditSstpcModal" not in page
