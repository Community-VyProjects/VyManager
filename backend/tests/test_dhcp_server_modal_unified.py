"""DHCP server create and edit share one modal.

CreateDHCPServerModal and EditDHCPServerModal were the same subnet form.
They are now DHCPServerModal with existing?: { network, subnet } | null.
The create wizard (new network vs add subnet) stays on the create path.
"""

from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
COMP = REPO / "frontend/src/components/services"
PAGE = REPO / "frontend/src/app/network/dhcp/page.tsx"


def test_cloned_create_edit_files_are_gone():
    assert not (COMP / "CreateDHCPServerModal.tsx").exists()
    assert not (COMP / "EditDHCPServerModal.tsx").exists()


def test_dhcp_page_uses_unified_modal():
    page = PAGE.read_text()
    assert 'from "@/components/services/DHCPServerModal"' in page
    assert "<DHCPServerModal" in page
    for gone in ("CreateDHCPServerModal", "EditDHCPServerModal"):
        assert f'from "@/components/services/{gone}"' not in page
        assert f"<{gone}" not in page


def test_modal_uses_shared_mode_helpers():
    modal = (COMP / "DHCPServerModal.tsx").read_text()
    assert 'from "@/lib/modal-mode"' in modal
    assert "lockedIdentity(existing, (record) => record.network, networkName)" in modal
    assert "lockedIdentity(existing, (record) => record.subnet.subnet, subnet)" in modal
    assert "modalWriteKind(existing ? { name: existing.subnet.subnet } : null)" in modal


def test_form_logic_lives_in_a_tested_module():
    """Draft, validators, and submit builders have their own tests.

    Run them with: npx tsx --test src/components/services/dhcp-server-form.test.ts
    """
    assert (COMP / "dhcp-server-form.ts").exists()
    assert (COMP / "dhcp-server-form.test.ts").exists()
    assert 'from "./dhcp-server-form"' in (COMP / "DHCPServerModal.tsx").read_text()


def test_config_ui_shows_no_version_only_labels():
    src = (COMP / "DHCPServerModal.tsx").read_text()
    for banned in (
        "VyOS 1.5",
        "VyOS 1.4",
        "1.5+ only",
        "1.4 only",
        "Not supported on VyOS",
    ):
        assert banned not in src
