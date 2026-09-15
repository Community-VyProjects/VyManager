"""IPv4 NAT create/edit modals must offer mac-group match.

The mapper already takes group_type. 1.4 and 1.5 accept mac-group under
source and destination NAT rule source/destination group. The IPv4 NAT
modals must expose that type the way NAT66 already does.
"""

from pathlib import Path

import pytest

from vyos_builders.nat import NATBatchBuilder

REPO = Path(__file__).resolve().parents[2]
MODALS = [
    REPO / "frontend/src/components/network/CreateSourceNATModal.tsx",
    REPO / "frontend/src/components/network/CreateDestinationNATModal.tsx",
    REPO / "frontend/src/components/network/EditSourceNATModal.tsx",
    REPO / "frontend/src/components/network/EditDestinationNATModal.tsx",
]

CASES = [
    (
        "set_source_rule_source_group",
        (10, "mac-group", "FOO"),
        ["nat", "source", "rule", "10", "source", "group", "mac-group", "FOO"],
    ),
    (
        "set_source_rule_destination_group",
        (10, "mac-group", "FOO"),
        ["nat", "source", "rule", "10", "destination", "group", "mac-group", "FOO"],
    ),
    (
        "set_destination_rule_source_group",
        (10, "mac-group", "FOO"),
        ["nat", "destination", "rule", "10", "source", "group", "mac-group", "FOO"],
    ),
    (
        "set_destination_rule_destination_group",
        (10, "mac-group", "FOO"),
        ["nat", "destination", "rule", "10", "destination", "group", "mac-group", "FOO"],
    ),
]


@pytest.mark.parametrize("version", ["1.4", "1.5"])
@pytest.mark.parametrize("method, args, expected_path", CASES)
def test_nat_mac_group_paths(version, method, args, expected_path):
    builder = NATBatchBuilder(version)
    getattr(builder, method)(*args)
    operations = builder.get_operations()
    assert [(item["op"], item["path"]) for item in operations] == [("set", expected_path)]


@pytest.mark.parametrize("modal", MODALS, ids=lambda p: p.name)
def test_ipv4_nat_modal_offers_mac_group(modal):
    text = modal.read_text()
    assert text.count('value="mac-group"') >= 2
    assert "getMacGroups" in text
    assert 'sourceGroupType === "mac-group"' in text
    assert 'destinationGroupType === "mac-group"' in text
