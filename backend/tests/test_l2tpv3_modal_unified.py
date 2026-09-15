"""L2TPv3 create and edit share one modal.

CreateL2TPv3Modal and EditL2TPv3Modal were the same form.
They are now L2TPv3Modal with existing?: L2TPv3Interface | null.
"""

from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
COMP = REPO / "frontend/src/components/l2tpv3"
PAGE = REPO / "frontend/src/app/network/interfaces/page.tsx"


def test_cloned_create_edit_files_are_gone():
    assert not (COMP / "CreateL2TPv3Modal.tsx").exists()
    assert not (COMP / "EditL2TPv3Modal.tsx").exists()


def test_unified_modal_has_existing_and_both_ops():
    text = (COMP / "L2TPv3Modal.tsx").read_text()
    assert "existing?: L2TPv3Interface | null" in text
    assert "const isEdit = !!existing" in text
    assert "createInterface" in text
    assert "updateInterface" in text
    assert "Interface name cannot be changed." in text
    assert "disabled={isEdit}" in text


def test_interfaces_page_uses_unified_modal():
    page = PAGE.read_text()
    assert "L2TPv3Modal" in page
    assert 'from "@/components/l2tpv3/CreateL2TPv3Modal"' not in page
    assert "<CreateL2TPv3Modal" not in page
    assert 'from "@/components/l2tpv3/EditL2TPv3Modal"' not in page
    assert "<EditL2TPv3Modal" not in page
