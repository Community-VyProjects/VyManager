"""Firewall create and edit share one modal.

CreateFirewallRuleModal and EditFirewallRuleModal were the same form.
They are now FirewallRuleModal with existing?: FirewallRule | null.
"""

from pathlib import Path

from tests.en_message import en_message

REPO = Path(__file__).resolve().parents[2]
FW = REPO / "frontend/src/components/firewall"
PAGE = REPO / "frontend/src/app/firewall/policies/page.tsx"


def test_cloned_create_edit_files_are_gone():
    assert not (FW / "CreateFirewallRuleModal.tsx").exists()
    assert not (FW / "EditFirewallRuleModal.tsx").exists()


def test_unified_modal_has_existing_and_both_ops():
    text = (FW / "FirewallRuleModal.tsx").read_text()
    assert "existing?: FirewallRule | null" in text
    assert "const isEdit = !!existing" in text
    assert "createRule" in text
    assert "updateRule" in text
    assert 't("basic.ruleNumberLocked")' in text
    assert en_message(REPO, "firewallRuleModal.json", "basic.ruleNumberLocked") == "Rule number cannot be changed"
    assert "cloneRule" in text


def test_policies_page_uses_unified_modal():
    page = PAGE.read_text()
    assert "FirewallRuleModal" in page
    assert "CreateFirewallRuleModal" not in page
    assert "EditFirewallRuleModal" not in page
