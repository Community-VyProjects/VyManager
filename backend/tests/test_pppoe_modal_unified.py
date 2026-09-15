"""PPPoE create and edit share one modal.

CreatePppoeModal and EditPppoeModal were the same form.
They are now PppoeModal with existing?: PppoeInterface | null.
"""

from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
COMP = REPO / "frontend/src/components/pppoe"
PAGE = REPO / "frontend/src/app/network/interfaces/page.tsx"


def test_cloned_create_edit_files_are_gone():
    assert not (COMP / "CreatePppoeModal.tsx").exists()
    assert not (COMP / "EditPppoeModal.tsx").exists()


def test_interfaces_page_uses_unified_modal():
    page = PAGE.read_text()
    assert 'from "@/components/pppoe/PppoeModal"' in page
    assert "<PppoeModal" in page
    assert 'from "@/components/pppoe/CreatePppoeModal"' not in page
    assert "<CreatePppoeModal" not in page
    assert 'from "@/components/pppoe/EditPppoeModal"' not in page
    assert "<EditPppoeModal" not in page
