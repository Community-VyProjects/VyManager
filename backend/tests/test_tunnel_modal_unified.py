"""Tunnel create and edit share one modal.

CreateTunnelModal and EditTunnelModal were the same form.
They are now TunnelModal with existing?: TunnelInterface | null.
"""

from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
COMP = REPO / "frontend/src/components/tunnel"
PAGE = REPO / "frontend/src/app/network/interfaces/page.tsx"


def test_cloned_create_edit_files_are_gone():
    assert not (COMP / "CreateTunnelModal.tsx").exists()
    assert not (COMP / "EditTunnelModal.tsx").exists()


def test_interfaces_page_uses_unified_modal():
    page = PAGE.read_text()
    assert 'from "@/components/tunnel/TunnelModal"' in page
    assert "<TunnelModal" in page
    assert 'from "@/components/tunnel/CreateTunnelModal"' not in page
    assert "<CreateTunnelModal" not in page
    assert 'from "@/components/tunnel/EditTunnelModal"' not in page
    assert "<EditTunnelModal" not in page


def test_modal_uses_shared_mode_helpers():
    modal = (COMP / "TunnelModal.tsx").read_text()
    assert 'from "@/lib/modal-mode"' in modal
    # Identity fields are locked through the shared helper, not an ad hoc flag.
    assert "lockedIdentity(existing, (i) => i.name, name)" in modal
    assert "lockedIdentity(existing, (i) => i.encapsulation, encapsulationDraft)" in modal
    # The update target name comes from the stored record, not form state.
    assert "modalWriteKind(existing)" in modal
