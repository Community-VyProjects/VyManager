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


def test_create_and_update_behaviour_is_covered_by_the_tsx_test():
    """The submit builders and validators live in a module with its own tests.

    Run them with: npx tsx --test src/components/vpn/wireguard-form.test.ts
    (node --test cannot resolve the extensionless .ts import).
    """
    assert (COMP / "wireguard-form.ts").exists()
    assert (COMP / "wireguard-form.test.ts").exists()

    for modal in ("InterfaceModal.tsx", "PeerModal.tsx"):
        source = (COMP / modal).read_text()
        assert 'from "./wireguard-form"' in source
