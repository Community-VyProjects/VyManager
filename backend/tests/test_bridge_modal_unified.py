"""Bridge and VIF create/edit share one modal each.

CreateBridgeModal/EditBridgeModal and CreateBridgeVifModal/EditBridgeVifModal
were the same forms. They are now BridgeModal and BridgeVifModal with existing
or null. Bridge and VIF stay separate modals.
"""

from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
COMP = REPO / "frontend/src/components/bridge"
PAGE = REPO / "frontend/src/app/network/interfaces/page.tsx"


def test_cloned_create_edit_files_are_gone():
    assert not (COMP / "CreateBridgeModal.tsx").exists()
    assert not (COMP / "EditBridgeModal.tsx").exists()
    assert not (COMP / "CreateBridgeVifModal.tsx").exists()
    assert not (COMP / "EditBridgeVifModal.tsx").exists()


def test_unified_bridge_modal_has_existing_and_both_ops():
    text = (COMP / "BridgeModal.tsx").read_text()
    assert "existing?: BridgeInterface | null" in text
    assert "const isEdit = !!existing" in text
    assert "createInterface" in text
    assert "updateInterface" in text
    assert "Interface name cannot be changed." in text
    assert "disabled={isEdit}" in text


def test_unified_vif_modal_has_existing_and_both_ops():
    text = (COMP / "BridgeVifModal.tsx").read_text()
    assert "existing?: BridgeVifConfig | null" in text
    assert "const isEdit = !!existing" in text
    assert "createVif" in text
    assert "updateVif" in text
    assert "VLAN ID cannot be changed." in text
    assert "disabled={isEdit}" in text


def test_interfaces_page_uses_unified_modals():
    page = PAGE.read_text()
    assert "BridgeModal" in page
    assert "BridgeVifModal" in page
    assert 'from "@/components/bridge/CreateBridgeModal"' not in page
    assert "<CreateBridgeModal" not in page
    assert 'from "@/components/bridge/EditBridgeModal"' not in page
    assert "<EditBridgeModal" not in page
    assert 'from "@/components/bridge/CreateBridgeVifModal"' not in page
    assert "<CreateBridgeVifModal" not in page
    assert 'from "@/components/bridge/EditBridgeVifModal"' not in page
    assert "<EditBridgeVifModal" not in page
