"""OpenVPN create and edit share one modal.

CreateOpenvpnModal and EditOpenvpnModal were the same form.
They are now OpenvpnModal with existing?: OpenvpnInterface | null.
"""

from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
COMP = REPO / "frontend/src/components/openvpn"
PAGE = REPO / "frontend/src/app/vpn/openvpn/page.tsx"


def test_cloned_create_edit_files_are_gone():
    assert not (COMP / "CreateOpenvpnModal.tsx").exists()
    assert not (COMP / "EditOpenvpnModal.tsx").exists()


def test_unified_modal_has_existing_and_both_ops():
    text = (COMP / "OpenvpnModal.tsx").read_text()
    assert "existing?: OpenvpnInterface | null" in text
    assert "const isEdit = !!existing" in text
    assert "createInterface" in text
    assert "updateInterface" in text
    assert "Interface name cannot be changed." in text
    assert "disabled={isEdit}" in text


def test_openvpn_page_uses_unified_modal():
    page = PAGE.read_text()
    assert "OpenvpnModal" in page
    assert 'from "@/components/openvpn/CreateOpenvpnModal"' not in page
    assert "<CreateOpenvpnModal" not in page
    assert 'from "@/components/openvpn/EditOpenvpnModal"' not in page
    assert "<EditOpenvpnModal" not in page
