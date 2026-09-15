"""Bridge firewall create and edit share one modal.

CreateBridgeRuleModal and EditBridgeRuleModal were the same form.
They are now BridgeRuleModal with existing?: BridgeRule | null.
"""

from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
FW = REPO / "frontend/src/components/firewall"
PAGE = REPO / "frontend/src/app/firewall/bridge/page.tsx"


def test_cloned_create_edit_files_are_gone():
    assert not (FW / "CreateBridgeRuleModal.tsx").exists()
    assert not (FW / "EditBridgeRuleModal.tsx").exists()


def test_unified_modal_has_existing_and_both_ops():
    text = (FW / "BridgeRuleModal.tsx").read_text()
    assert "existing?: BridgeRule | null" in text
    assert "const isEdit = !!existing" in text
    assert "createRule" in text
    assert "updateRule" in text
    assert "Rule number cannot be changed" in text


def test_bridge_page_uses_unified_modal():
    page = PAGE.read_text()
    assert "BridgeRuleModal" in page
    assert "CreateBridgeRuleModal" not in page
    assert "EditBridgeRuleModal" not in page
