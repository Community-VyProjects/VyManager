"""PBR match tcp mss is 1.5-only.

1.5 accepts `policy route FOO rule 10 tcp mss 1400` (and the same on
route6); 1.4 rejects it. Paths checked with validateTmplPath on both
lab hosts.
"""

from pathlib import Path

import pytest

from routers.route.route import MatchConditions, parse_match_conditions, _recreate_match_conditions
from vyos_builders.route.route_batch_builder import RouteBatchBuilder

REPO = Path(__file__).resolve().parents[2]
CREATE = REPO / "frontend/src/components/policies/CreateRouteRuleModal.tsx"
EDIT = REPO / "frontend/src/components/policies/EditRouteRuleModal.tsx"
API = REPO / "frontend/src/lib/api/route.ts"
ROW = REPO / "frontend/src/components/policies/RouteRuleRow.tsx"

MSS = ["policy", "route", "FOO", "rule", "10", "tcp", "mss", "1400"]
MSS6 = ["policy", "route6", "FOO", "rule", "10", "tcp", "mss", "1400"]
RANGE = ["policy", "route", "FOO", "rule", "10", "tcp", "mss", "500-1460"]


def test_tcp_mss_paths_v1_5():
    builder = RouteBatchBuilder(version="1.5")
    builder.set_match_tcp_mss("route", "FOO", "10", "1400")
    builder.delete_match_tcp_mss("route", "FOO", "10")
    builder.set_match_tcp_mss("route6", "FOO", "10", "1400")
    builder.set_match_tcp_mss("route", "FOO", "10", "500-1460")
    operations = builder.get_operations()
    assert [(item["op"], item["path"]) for item in operations] == [
        ("set", MSS),
        ("delete", MSS[:-1]),
        ("set", MSS6),
        ("set", RANGE),
    ]


@pytest.mark.parametrize(
    "method,args",
    [
        ("set_match_tcp_mss", ("route", "FOO", "10", "1400")),
        ("delete_match_tcp_mss", ("route", "FOO", "10")),
        ("set_match_tcp_mss", ("route6", "FOO", "10", "1400")),
    ],
)
def test_tcp_mss_rejected_on_v1_4(method, args):
    builder = RouteBatchBuilder(version="1.4")
    with pytest.raises(ValueError, match="not supported"):
        getattr(builder, method)(*args)


def test_capability_gated_to_v1_5():
    caps_15 = RouteBatchBuilder(version="1.5").get_capabilities()
    caps_14 = RouteBatchBuilder(version="1.4").get_capabilities()
    assert caps_15["features"]["tcp_mss_matching"]["supported"] is True
    assert caps_14["features"]["tcp_mss_matching"]["supported"] is False


def test_parse_tcp_mss_string_and_list():
    match = MatchConditions()
    parse_match_conditions({"tcp": {"mss": "1400"}}, match)
    assert match.tcp_mss == "1400"

    listed = MatchConditions()
    parse_match_conditions({"tcp": {"mss": ["500-1460"]}}, listed)
    assert listed.tcp_mss == "500-1460"


def test_parse_tcp_mss_absent():
    match = MatchConditions()
    parse_match_conditions({"tcp": {"flags": {"syn": {}}}}, match)
    assert match.tcp_mss is None
    assert match.tcp_flags == ["syn"]


def test_reorder_recreates_tcp_mss():
    builder = RouteBatchBuilder(version="1.5")
    _recreate_match_conditions(
        builder,
        "route",
        "FOO",
        "10",
        {"tcp": {"mss": "1400", "flags": {"syn": {}}}},
    )
    ops = builder.get_operations()
    paths = [item["path"] for item in ops if item["op"] == "set"]
    assert ["policy", "route", "FOO", "rule", "10", "tcp", "flags", "syn"] in paths
    assert MSS in paths


def test_modals_gate_tcp_mss():
    create = CREATE.read_text()
    edit = EDIT.read_text()
    assert 'id="matchTcpMss"' in create
    assert "features.tcp_mss_matching" in create
    assert 'id="edit-matchTcpMss"' in edit
    assert "features.tcp_mss_matching" in edit
    for text in (create, edit):
        assert "VyOS 1." not in text
        assert "1.5+" not in text
        assert "1.4 only" not in text


def test_api_emits_tcp_mss_ops():
    text = API.read_text()
    assert "set_match_tcp_mss" in text
    assert "delete_match_tcp_mss" in text
    assert "tcp_mss_matching" in text


def test_row_labels_tcp_mss_match():
    text = ROW.read_text()
    assert 'tcp_mss: "TCP MSS"' in text
    assert "tcp_mss:" in text.split("MATCH_LABELS")[1].split("SET_LABELS")[0]
