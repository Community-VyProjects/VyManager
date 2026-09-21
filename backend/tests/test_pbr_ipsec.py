"""PBR IPsec match is versioned: classic on 1.4, in/out on 1.5.

1.5 accepts match-ipsec-in/out and match-none-in/out on policy route and
route6; 1.4 still uses match-ipsec and match-none. Paths checked with
validateTmplPath on both lab hosts.
"""

from pathlib import Path

import pytest

from routers.route.route import MatchConditions, parse_match_conditions
from vyos_builders.route.route_batch_builder import RouteBatchBuilder

REPO = Path(__file__).resolve().parents[2]
MODAL = REPO / "frontend/src/components/policies/RouteRuleModal.tsx"
FORM = REPO / "frontend/src/components/policies/route-rule-form.ts"
API = REPO / "frontend/src/lib/api/route.ts"

CLASSIC = ["match-ipsec", "match-none"]
DIRECTIONAL = ["match-ipsec-in", "match-ipsec-out", "match-none-in", "match-none-out"]


def test_classic_ipsec_paths_v1_4():
    builder = RouteBatchBuilder(version="1.4")
    builder.set_match_ipsec("route", "FOO", "10", "match-ipsec")
    builder.delete_match_ipsec("route", "FOO", "10", "match-ipsec")
    builder.set_match_ipsec("route", "FOO", "10", "match-none")
    builder.set_match_ipsec("route6", "FOO", "10", "match-ipsec")
    builder.delete_match_ipsec_node("route", "FOO", "10")
    operations = builder.get_operations()
    assert [(item["op"], item["path"]) for item in operations] == [
        ("set", ["policy", "route", "FOO", "rule", "10", "ipsec", "match-ipsec"]),
        ("delete", ["policy", "route", "FOO", "rule", "10", "ipsec", "match-ipsec"]),
        ("set", ["policy", "route", "FOO", "rule", "10", "ipsec", "match-none"]),
        ("set", ["policy", "route6", "FOO", "rule", "10", "ipsec", "match-ipsec"]),
        ("delete", ["policy", "route", "FOO", "rule", "10", "ipsec"]),
    ]


def test_directional_ipsec_paths_v1_5():
    builder = RouteBatchBuilder(version="1.5")
    for token in DIRECTIONAL:
        builder.set_match_ipsec("route", "FOO", "10", token)
        builder.delete_match_ipsec("route", "FOO", "10", token)
    builder.set_match_ipsec("route6", "FOO", "10", "match-ipsec-in")
    operations = builder.get_operations()
    expected = []
    for token in DIRECTIONAL:
        path = ["policy", "route", "FOO", "rule", "10", "ipsec", token]
        expected.append(("set", path))
        expected.append(("delete", path))
    expected.append(
        ("set", ["policy", "route6", "FOO", "rule", "10", "ipsec", "match-ipsec-in"])
    )
    assert [(item["op"], item["path"]) for item in operations] == expected


@pytest.mark.parametrize("token", DIRECTIONAL)
def test_directional_rejected_on_v1_4(token):
    builder = RouteBatchBuilder(version="1.4")
    with pytest.raises(ValueError, match="not supported"):
        builder.set_match_ipsec("route", "FOO", "10", token)
    builder = RouteBatchBuilder(version="1.4")
    with pytest.raises(ValueError, match="not supported"):
        builder.delete_match_ipsec("route", "FOO", "10", token)


@pytest.mark.parametrize("token", CLASSIC)
def test_classic_rejected_on_v1_5(token):
    builder = RouteBatchBuilder(version="1.5")
    with pytest.raises(ValueError, match="not supported"):
        builder.set_match_ipsec("route", "FOO", "10", token)
    builder = RouteBatchBuilder(version="1.5")
    with pytest.raises(ValueError, match="not supported"):
        builder.delete_match_ipsec("route", "FOO", "10", token)


def test_capability_gates_directional_to_v1_5():
    caps_15 = RouteBatchBuilder(version="1.5").get_capabilities()
    caps_14 = RouteBatchBuilder(version="1.4").get_capabilities()
    assert caps_15["features"]["ipsec_directional"]["supported"] is True
    assert caps_14["features"]["ipsec_directional"]["supported"] is False
    assert caps_15["features"]["ipsec_matching"]["supported"] is True
    assert caps_14["features"]["ipsec_matching"]["supported"] is True


def test_parse_classic_and_directional_ipsec():
    classic = MatchConditions()
    parse_match_conditions({"ipsec": {"match-ipsec": {}}}, classic)
    assert classic.ipsec == "match-ipsec"
    assert classic.ipsec_in is None
    assert classic.ipsec_out is None

    directional = MatchConditions()
    parse_match_conditions(
        {"ipsec": {"match-ipsec-in": {}, "match-none-out": {}}},
        directional,
    )
    assert directional.ipsec is None
    assert directional.ipsec_in == "match-ipsec-in"
    assert directional.ipsec_out == "match-none-out"


def test_modals_gate_directional_ipsec():
    modal = MODAL.read_text()
    assert 'id="ipsecInbound"' in modal
    assert 'id="ipsecOutbound"' in modal
    assert "features.ipsec_directional" in modal
    assert "VyOS 1." not in modal
    assert "1.5+" not in modal
    assert "1.4 only" not in modal


def test_api_emits_directional_ipsec_ops():
    api = API.read_text()
    assert "ipsec_in" in api
    assert "ipsec_out" in api
    assert "set_match_ipsec" in api
    assert "delete_match_ipsec_node" in api
    form = FORM.read_text()
    assert 'match.ipsec_in = "match-ipsec-in"' in form
    assert 'match.ipsec_out = "match-ipsec-out"' in form
    assert 'match.ipsec_in = "match-none-in"' in form
    assert 'match.ipsec_out = "match-none-out"' in form


def test_reorder_emits_directional_ipsec():
    from routers.route.route import _recreate_match_conditions

    builder = RouteBatchBuilder(version="1.5")
    _recreate_match_conditions(
        builder,
        "route",
        "FOO",
        "10",
        {"ipsec": {"match-ipsec-in": {}, "match-none-out": {}}},
    )
    leaves = [item["path"][-1] for item in builder.get_operations() if item["op"] == "set"]
    assert leaves == ["match-ipsec-in", "match-none-out"]
