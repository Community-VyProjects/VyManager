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


def test_openvpn_page_uses_unified_modal():
    page = PAGE.read_text()
    assert 'from "@/components/openvpn/OpenvpnModal"' in page
    assert "<OpenvpnModal" in page
    assert 'from "@/components/openvpn/CreateOpenvpnModal"' not in page
    assert "<CreateOpenvpnModal" not in page
    assert 'from "@/components/openvpn/EditOpenvpnModal"' not in page
    assert "<EditOpenvpnModal" not in page


def test_wizard_is_not_folded_into_the_modal():
    assert (COMP / "OpenvpnWizard.tsx").exists()
    page = PAGE.read_text()
    assert "<OpenvpnWizard" in page
