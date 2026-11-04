"""Route-map EVPN match and set leaves (#973).

Lab-checked with cli-shell-api validateTmplPath on 1.4 (100.64.64.50) and
1.5 (100.64.64.5): ``match evpn default-route``, ``match evpn rd``,
``match evpn route-type``, ``match evpn vni``, ``set evpn gateway ipv4`` and
``set evpn gateway ipv6`` are VALID on both, as are the ``match evpn`` and
``set evpn`` subtrees the delete ops remove.

``match evpn route-type`` values differ. Each build's node.def validator
accepts macip, multicast and prefix on 1.4, and adds ead, es and 1-5 on 1.5.

``match evpn vni``: the node.def validator takes 0-16777214 on both builds and
the FRR grammar in bgpd (9.1.3 on 1.4, 10.6.1 on 1.5) is
``match evpn vni (1-16777215)``, so 1-16777214 is what commits.
"""

from types import SimpleNamespace

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from routers.route_map.route_map import parse_match_conditions, parse_set_actions
from vyos_builders.route_map.route_map_batch_builder import RouteMapBatchBuilder
from vyos_mappers.route_map.route_map import RouteMapMapper

NAME = "RM"
RULE = "10"
RULE_PATH = ["policy", "route-map", NAME, "rule", RULE]
MATCH_EVPN = RULE_PATH + ["match", "evpn"]
SET_EVPN = RULE_PATH + ["set", "evpn"]

ROUTE_TYPES_1_4 = ["macip", "multicast", "prefix"]
ROUTE_TYPES_1_5_ONLY = ["ead", "es", "1", "2", "3", "4", "5"]

PATH_CASES = [
    ("set_match_evpn_default_route", (NAME, RULE), "set", MATCH_EVPN + ["default-route"]),
    ("set_match_evpn_rd", (NAME, RULE, "65000:100"), "set", MATCH_EVPN + ["rd", "65000:100"]),
    ("set_match_evpn_rd", (NAME, RULE, "192.0.2.1:100"), "set", MATCH_EVPN + ["rd", "192.0.2.1:100"]),
    ("set_match_evpn_route_type", (NAME, RULE, "prefix"), "set", MATCH_EVPN + ["route-type", "prefix"]),
    ("set_match_evpn_vni", (NAME, RULE, "1"), "set", MATCH_EVPN + ["vni", "1"]),
    ("set_match_evpn_vni", (NAME, RULE, "100"), "set", MATCH_EVPN + ["vni", "100"]),
    ("set_match_evpn_vni", (NAME, RULE, "16777214"), "set", MATCH_EVPN + ["vni", "16777214"]),
    ("delete_match_evpn", (NAME, RULE), "delete", MATCH_EVPN),
    ("set_evpn_gateway_ipv4", (NAME, RULE, "192.0.2.1"), "set", SET_EVPN + ["gateway", "ipv4", "192.0.2.1"]),
    ("set_evpn_gateway_ipv6", (NAME, RULE, "2001:db8::1"), "set", SET_EVPN + ["gateway", "ipv6", "2001:db8::1"]),
    ("delete_set_evpn", (NAME, RULE), "delete", SET_EVPN),
]


def _ops(builder):
    return [(item["op"], item["path"]) for item in builder.get_operations()]


@pytest.mark.parametrize("version", ["1.4", "1.5"])
@pytest.mark.parametrize("method, args, op, expected_path", PATH_CASES)
def test_evpn_paths_on_both_versions(version, method, args, op, expected_path):
    builder = RouteMapBatchBuilder(version=version)
    getattr(builder, method)(*args)
    assert _ops(builder) == [(op, expected_path)]


@pytest.mark.parametrize("version", ["1.4", "1.5"])
@pytest.mark.parametrize("route_type", ROUTE_TYPES_1_4)
def test_shared_route_types_accepted_everywhere(version, route_type):
    builder = RouteMapBatchBuilder(version=version)
    builder.set_match_evpn_route_type(NAME, RULE, route_type)
    assert _ops(builder) == [("set", MATCH_EVPN + ["route-type", route_type])]


@pytest.mark.parametrize("route_type", ROUTE_TYPES_1_5_ONLY)
def test_newer_route_types_accepted_on_1_5(route_type):
    builder = RouteMapBatchBuilder(version="1.5")
    builder.set_match_evpn_route_type(NAME, RULE, route_type)
    assert _ops(builder) == [("set", MATCH_EVPN + ["route-type", route_type])]


@pytest.mark.parametrize("route_type", ROUTE_TYPES_1_5_ONLY + ["bogus", ""])
def test_route_type_rejected_on_1_4(route_type):
    builder = RouteMapBatchBuilder(version="1.4")
    with pytest.raises(ValueError, match="not supported on this device"):
        builder.set_match_evpn_route_type(NAME, RULE, route_type)
    assert builder.get_operations() == []


def test_unknown_route_type_rejected_on_1_5():
    builder = RouteMapBatchBuilder(version="1.5")
    with pytest.raises(ValueError, match="not supported on this device"):
        builder.set_match_evpn_route_type(NAME, RULE, "bogus")
    assert builder.get_operations() == []


@pytest.mark.parametrize("version", ["1.4", "1.5"])
@pytest.mark.parametrize("vni", ["0", "16777215", "-1", "abc", "", " 1", "1.5", "\u0661", "\u00b2"])
def test_vni_outside_committable_range_rejected(version, vni):
    builder = RouteMapBatchBuilder(version=version)
    with pytest.raises(ValueError, match="1-16777214"):
        builder.set_match_evpn_vni(NAME, RULE, vni)
    assert builder.get_operations() == []


@pytest.mark.parametrize(
    "version, expected",
    [("1.4", ROUTE_TYPES_1_4), ("1.5", ["ead", "macip", "multicast", "es", "prefix", "1", "2", "3", "4", "5"])],
)
def test_capabilities_list_route_types(version, expected):
    feature = RouteMapBatchBuilder(version=version).get_capabilities()["features"]["match_evpn"]
    assert feature["supported"] is True
    assert feature["route_types"] == expected
    assert (feature["vni_min"], feature["vni_max"]) == (1, 16777214)


def test_capabilities_read_the_mapper_allowlist(monkeypatch):
    """A second handwritten list in get_capabilities() would ignore this."""
    monkeypatch.setattr(RouteMapMapper, "evpn_route_types", lambda self: ("prefix",))
    monkeypatch.setattr(RouteMapMapper, "EVPN_VNI_RANGE", (5, 9))
    features = RouteMapBatchBuilder(version="1.5").get_capabilities()["features"]
    assert features["match_evpn"]["route_types"] == ["prefix"]
    assert (features["match_evpn"]["vni_min"], features["match_evpn"]["vni_max"]) == (5, 9)


def test_parse_reads_evpn_match():
    match = parse_match_conditions(
        {"evpn": {"default-route": {}, "rd": "65000:100", "route-type": "macip", "vni": "100"}}
    )
    assert match.evpn_default_route is True
    assert match.evpn_rd == "65000:100"
    assert match.evpn_route_type == "macip"
    assert match.evpn_vni == 100


def test_parse_without_evpn_match():
    match = parse_match_conditions({"tag": "5"})
    assert match.evpn_default_route is False
    assert match.evpn_rd is None
    assert match.evpn_route_type is None
    assert match.evpn_vni is None


def test_parse_reads_evpn_set():
    actions = parse_set_actions({"evpn": {"gateway": {"ipv4": "192.0.2.1", "ipv6": "2001:db8::1"}}})
    assert actions.evpn_gateway_ipv4 == "192.0.2.1"
    assert actions.evpn_gateway_ipv6 == "2001:db8::1"


def test_parse_without_evpn_set():
    actions = parse_set_actions({"tag": "5"})
    assert actions.evpn_gateway_ipv4 is None
    assert actions.evpn_gateway_ipv6 is None


def _client(monkeypatch, version):
    captured = []

    async def allow(*_args, **_kwargs):
        return None

    class Service:
        def get_version(self):
            return version

        def execute_batch(self, batch):
            captured.append(batch.get_operations())
            return SimpleNamespace(status=200, result="", error=None)

    monkeypatch.setattr("routers.route_map.route_map.require_write_permission", allow)
    monkeypatch.setattr(
        "routers.route_map.route_map.get_session_vyos_service", lambda _req: Service()
    )

    from routers.route_map.route_map import router

    app = FastAPI()
    app.include_router(router)
    return TestClient(app), captured


def _batch(*operations):
    return {"name": NAME, "rule_number": int(RULE), "operations": list(operations)}


@pytest.mark.parametrize("version", ["1.4", "1.5"])
def test_batch_writes_evpn_leaves(monkeypatch, version):
    client, captured = _client(monkeypatch, version)
    response = client.post(
        "/vyos/route-map/batch",
        json=_batch(
            {"op": "delete_match_evpn"},
            {"op": "delete_set_evpn"},
            {"op": "set_match_evpn_default_route"},
            {"op": "set_match_evpn_rd", "value": "65000:100"},
            {"op": "set_match_evpn_route_type", "value": "prefix"},
            {"op": "set_match_evpn_vni", "value": "100"},
            {"op": "set_evpn_gateway_ipv4", "value": "192.0.2.1"},
            {"op": "set_evpn_gateway_ipv6", "value": "2001:db8::1"},
        ),
    )
    assert response.status_code == 200, response.text
    assert [(item["op"], item["path"]) for item in captured[0]] == [
        ("delete", MATCH_EVPN),
        ("delete", SET_EVPN),
        ("set", MATCH_EVPN + ["default-route"]),
        ("set", MATCH_EVPN + ["rd", "65000:100"]),
        ("set", MATCH_EVPN + ["route-type", "prefix"]),
        ("set", MATCH_EVPN + ["vni", "100"]),
        ("set", SET_EVPN + ["gateway", "ipv4", "192.0.2.1"]),
        ("set", SET_EVPN + ["gateway", "ipv6", "2001:db8::1"]),
    ]


def test_batch_rejects_newer_route_type_on_1_4_without_commit(monkeypatch):
    client, captured = _client(monkeypatch, "1.4")
    response = client.post(
        "/vyos/route-map/batch",
        json=_batch({"op": "set_match_evpn_route_type", "value": "ead"}),
    )
    assert response.status_code == 400, response.text
    assert "not supported on this device" in response.json()["detail"]
    assert captured == []


@pytest.mark.parametrize("version", ["1.4", "1.5"])
def test_batch_rejects_vni_zero_without_commit(monkeypatch, version):
    client, captured = _client(monkeypatch, version)
    response = client.post(
        "/vyos/route-map/batch",
        json=_batch({"op": "set_match_evpn_vni", "value": "0"}),
    )
    assert response.status_code == 400, response.text
    assert "1-16777214" in response.json()["detail"]
    assert captured == []


def _reorder_body(route_type):
    return {
        "route_map_name": NAME,
        "rules": [
            {
                "old_number": 10,
                "new_number": 20,
                "rule_data": {
                    "rule_number": 10,
                    "action": "permit",
                    "match": {
                        "evpn_default_route": True,
                        "evpn_rd": "65000:100",
                        "evpn_route_type": route_type,
                        "evpn_vni": 100,
                    },
                    "set": {"evpn_gateway_ipv4": "192.0.2.1", "evpn_gateway_ipv6": "2001:db8::1"},
                },
            }
        ],
    }


@pytest.mark.parametrize("version", ["1.4", "1.5"])
def test_reorder_rewrites_evpn_leaves(monkeypatch, version):
    """Drag-save deletes and recreates the rule. Dropping a leaf here wipes it."""
    client, captured = _client(monkeypatch, version)
    response = client.post("/vyos/route-map/reorder", json=_reorder_body("macip"))
    assert response.status_code == 200, response.text
    ops = [(item["op"], item["path"]) for item in captured[0]]
    rule = ["policy", "route-map", NAME, "rule", "20"]
    for expected in (
        rule + ["match", "evpn", "default-route"],
        rule + ["match", "evpn", "rd", "65000:100"],
        rule + ["match", "evpn", "route-type", "macip"],
        rule + ["match", "evpn", "vni", "100"],
        rule + ["set", "evpn", "gateway", "ipv4", "192.0.2.1"],
        rule + ["set", "evpn", "gateway", "ipv6", "2001:db8::1"],
    ):
        assert ("set", expected) in ops


def test_reorder_rejects_newer_route_type_on_1_4_without_commit(monkeypatch):
    client, captured = _client(monkeypatch, "1.4")
    response = client.post("/vyos/route-map/reorder", json=_reorder_body("es"))
    assert response.status_code == 400, response.text
    assert "not supported on this device" in response.json()["detail"]
    assert captured == []
