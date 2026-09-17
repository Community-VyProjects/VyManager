"""WireGuard interface and peer create and edit share one modal each.

CreateInterfaceModal and EditInterfaceModal were the same form, as were
CreatePeerModal and EditPeerModal. They are now InterfaceModal with
existing?: WireGuardInterface | null and PeerModal with
existing?: WireGuardPeer | null.
"""

from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
COMP = REPO / "frontend/src/components/vpn"
PAGE = REPO / "frontend/src/app/vpn/wireguard/page.tsx"
INDEX = COMP / "index.ts"


def test_cloned_create_edit_files_are_gone():
    assert not (COMP / "CreateInterfaceModal.tsx").exists()
    assert not (COMP / "EditInterfaceModal.tsx").exists()
    assert not (COMP / "CreatePeerModal.tsx").exists()
    assert not (COMP / "EditPeerModal.tsx").exists()


def test_wireguard_page_uses_unified_modals():
    page = PAGE.read_text()
    assert 'from "@/components/vpn/InterfaceModal"' in page
    assert "<InterfaceModal" in page
    assert 'from "@/components/vpn/PeerModal"' in page
    assert "<PeerModal" in page
    for gone in ("CreateInterfaceModal", "EditInterfaceModal", "CreatePeerModal", "EditPeerModal"):
        assert f'from "@/components/vpn/{gone}"' not in page
        assert f"<{gone}" not in page


def test_barrel_exports_only_unified_modals():
    index = INDEX.read_text()
    assert 'export { InterfaceModal } from "./InterfaceModal";' in index
    assert 'export { PeerModal } from "./PeerModal";' in index
    for gone in ("CreateInterfaceModal", "EditInterfaceModal", "CreatePeerModal", "EditPeerModal"):
        assert f'from "./{gone}"' not in index


def test_modals_use_shared_mode_helpers():
    interface_modal = (COMP / "InterfaceModal.tsx").read_text()
    peer_modal = (COMP / "PeerModal.tsx").read_text()

    for modal in (interface_modal, peer_modal):
        assert 'from "@/lib/modal-mode"' in modal
        # The update target name comes from the stored record, not form state.
        assert "modalWriteKind(existing)" in modal

    # Identity fields are locked through the shared helper, not an ad hoc flag.
    assert "lockedIdentity(existing, (i) => i.name, name)" in interface_modal
    assert "lockedIdentity(existing, (p) => p.name, name)" in peer_modal


def test_peer_name_uniqueness_is_create_only():
    """Editing a peer must not fail because its own name is already taken."""
    peer_modal = (COMP / "PeerModal.tsx").read_text()
    assert "isCreate && interfaceData?.peers.some((p) => p.name === name.trim())" in peer_modal


def test_interface_disable_control_is_edit_only():
    """createInterface has no disable op, so the checkbox only renders on edit."""
    interface_modal = (COMP / "InterfaceModal.tsx").read_text()
    checkbox = interface_modal.index('id="wg-disabled"')
    guard = interface_modal.rindex("{isEdit && (", 0, checkbox)
    # Nothing but the wrapper div and its className sits between the guard and
    # the checkbox, so the control cannot render in create mode.
    assert interface_modal.count("<Checkbox", guard, checkbox) == 1
