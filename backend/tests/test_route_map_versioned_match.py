"""Route-map match leaves that exist on 1.5 and not on 1.4.

Lab-checked with cli-shell-api validateTmplPath: ``match rpki-extcommunity``
(invalid, notfound, valid) and ``match source-peer`` are VALID on 1.5
(100.64.64.5) and INVALID on 1.4 (100.64.64.50).
"""

from types import SimpleNamespace

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from routers.route_map.route_map import parse_match_conditions
from vyos_builders.route_map.route_map_batch_builder import RouteMapBatchBuilder
from vyos_mappers.route_map.route_map import RouteMapMapper

NAME = "RM"
RULE = "10"
MATCH = ["policy", "route-map", NAME, "rule", RULE, "match"]

V15_ONLY_CASES = [
    ("set_match_rpki_extcommunity", (NAME, RULE, "valid"), "set", MATCH + ["rpki-extcommunity", "valid"]),
    ("set_match_rpki_extcommunity", (NAME, RULE, "invalid"), "set", MATCH + ["rpki-extcommunity", "invalid"]),
    ("set_match_rpki_extcommunity", (NAME, RULE, "notfound"), "set", MATCH + ["rpki-extcommunity", "notfound"]),
    ("delete_match_rpki_extcommunity", (NAME, RULE), "delete", MATCH + ["rpki-extcommunity"]),
    ("set_match_source_peer", (NAME, RULE, "192.0.2.1"), "set", MATCH + ["source-peer", "192.0.2.1"]),
    ("set_match_source_peer", (NAME, RULE, "2001:db8::1"), "set", MATCH + ["source-peer", "2001:db8::1"]),
    ("set_match_source_peer", (NAME, RULE, "eth0"), "set", MATCH + ["source-peer", "eth0"]),
    ("delete_match_source_peer", (NAME, RULE), "delete", MATCH + ["source-peer"]),
]


@pytest.mark.parametrize("method, args, op, expected_path", V15_ONLY_CASES)
def test_v15_only_match_paths(method, args, op, expected_path):
    builder = RouteMapBatchBuilder(version="1.5")
    getattr(builder, method)(*args)
    assert [(item["op"], item["path"]) for item in builder.get_operations()] == [(op, expected_path)]


@pytest.mark.parametrize("method, args, op, expected_path", V15_ONLY_CASES)
def test_v15_only_match_rejected_on_1_4(method, args, op, expected_path):
    builder = RouteMapBatchBuilder(version="1.4")
    with pytest.raises(ValueError, match="not supported on this device"):
        getattr(builder, method)(*args)
    assert builder.get_operations() == []


@pytest.mark.parametrize("version, expected", [("1.4", False), ("1.5", True)])
def test_capabilities_follow_version(version, expected):
    features = RouteMapBatchBuilder(version=version).get_capabilities()["features"]
    assert features["match_rpki_extcommunity"]["supported"] is expected
    assert features["match_source_peer"]["supported"] is expected


def test_capabilities_read_the_mapper_allowlist(monkeypatch):
    """A second handwritten list in get_capabilities() would ignore this."""
    monkeypatch.setattr(
        RouteMapMapper, "versioned_match_nodes", lambda self: frozenset({"source-peer"})
    )
    features = RouteMapBatchBuilder(version="1.5").get_capabilities()["features"]
    assert features["match_rpki_extcommunity"]["supported"] is False
    assert features["match_source_peer"]["supported"] is True


def test_parse_reads_both_leaves():
    match = parse_match_conditions({"rpki-extcommunity": "notfound", "source-peer": "192.0.2.1"})
    assert match.rpki_extcommunity == "notfound"
    assert match.source_peer == "192.0.2.1"


def _client(monkeypatch, version, execute=None):
    captured = []

    async def allow(*_args, **_kwargs):
        return None

    class Service:
        def get_version(self):
            return version

        def execute_batch(self, batch):
            if execute is not None:
                return execute(batch)
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


BATCH = {
    "name": NAME,
    "rule_number": int(RULE),
    "operations": [
        {"op": "set_match_rpki_extcommunity", "value": "valid"},
        {"op": "set_match_source_peer", "value": "192.0.2.1"},
    ],
}


def test_batch_writes_leaves_on_1_5(monkeypatch):
    client, captured = _client(monkeypatch, "1.5")
    response = client.post("/vyos/route-map/batch", json=BATCH)
    assert response.status_code == 200, response.text
    assert [(item["op"], item["path"]) for item in captured[0]] == [
        ("set", MATCH + ["rpki-extcommunity", "valid"]),
        ("set", MATCH + ["source-peer", "192.0.2.1"]),
    ]


@pytest.mark.parametrize(
    "op, value",
    [
        ("set_match_rpki_extcommunity", "valid"),
        ("delete_match_rpki_extcommunity", None),
        ("set_match_source_peer", "192.0.2.1"),
        ("delete_match_source_peer", None),
    ],
)
def test_batch_rejects_leaf_on_1_4_without_commit(monkeypatch, op, value):
    client, captured = _client(monkeypatch, "1.4")
    operation = {"op": op} if value is None else {"op": op, "value": value}
    response = client.post(
        "/vyos/route-map/batch",
        json={"name": NAME, "rule_number": int(RULE), "operations": [operation]},
    )
    assert response.status_code == 400, response.text
    assert "not supported on this device" in response.json()["detail"]
    assert captured == []


def test_batch_commit_value_error_stays_internal(monkeypatch):
    """Only the build phase maps ValueError to 400. A commit-time error
    must not echo its message to the client."""

    def boom(_batch):
        raise ValueError("secret device detail")

    client, _ = _client(monkeypatch, "1.5", execute=boom)
    response = client.post("/vyos/route-map/batch", json=BATCH)
    assert response.status_code == 500
    assert "secret" not in response.text


def _reorder_body():
    return {
        "route_map_name": NAME,
        "rules": [
            {
                "old_number": 10,
                "new_number": 20,
                "rule_data": {
                    "rule_number": 10,
                    "action": "permit",
                    "match": {"rpki_extcommunity": "invalid", "source_peer": "eth0"},
                },
            }
        ],
    }


def test_reorder_rewrites_leaves_on_1_5(monkeypatch):
    """Drag-save deletes and recreates the rule. Dropping a leaf here wipes it."""
    client, captured = _client(monkeypatch, "1.5")
    response = client.post("/vyos/route-map/reorder", json=_reorder_body())
    assert response.status_code == 200, response.text
    ops = [(item["op"], item["path"]) for item in captured[0]]
    rule = ["policy", "route-map", NAME, "rule", "20", "match"]
    assert ("set", rule + ["rpki-extcommunity", "invalid"]) in ops
    assert ("set", rule + ["source-peer", "eth0"]) in ops


def test_reorder_rejects_leaves_on_1_4_without_commit(monkeypatch):
    client, captured = _client(monkeypatch, "1.4")
    response = client.post("/vyos/route-map/reorder", json=_reorder_body())
    assert response.status_code == 400, response.text
    assert "not supported on this device" in response.json()["detail"]
    assert captured == []


def test_reorder_commit_value_error_stays_internal(monkeypatch):
    def boom(_batch):
        raise ValueError("secret device detail")

    client, _ = _client(monkeypatch, "1.5", execute=boom)
    response = client.post("/vyos/route-map/reorder", json=_reorder_body())
    assert response.status_code == 500
    assert "secret" not in response.text
