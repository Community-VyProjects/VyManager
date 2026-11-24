"""Policy list routes: name plus rule_number binding, HTTP 400 on a bad op.

execute_batch and get_full_config run through run_in_threadpool (locked in
test_batch_off_event_loop.py). These tests drive the shared handlers end to
end with a stub service for every community-list family, so the emitted ops,
the 400 paths and the config response are checked.
"""

import inspect
from types import SimpleNamespace
from typing import cast

import pytest
from fastapi import FastAPI, HTTPException
from fastapi.testclient import TestClient

from routers.policy_list.policy_list import KIND_BUILDER
from vyos_mappers.base import CommandMapperRegistry
from vyos_mappers.policy_list import KIND_SPEC, POLICY_LIST_KINDS, PolicyListMapper

ROUTER = "routers.policy_list.policy_list"
KINDS = list(POLICY_LIST_KINDS)

SAMPLE = {
    "LIST-B": {
        "description": "second",
        "rule": {
            "20": {"action": "deny", "regex": "65000:2"},
            "5": {"action": "permit", "description": "first", "regex": "65000:1"},
        },
    },
    "LIST-A": {},
}


class Service:
    def __init__(self, version="1.5", status=200, error=None, config=None):
        self.version = version
        self.status = status
        self.error = error
        self.config = config or {}
        self.executed = []

    def get_version(self):
        return self.version

    def get_full_config(self, refresh=False):
        return self.config

    def execute_batch(self, batch):
        if batch.is_empty():
            raise ValueError("Cannot execute empty batch")
        self.executed.append(batch.get_operations())
        return SimpleNamespace(status=self.status, result="", error=self.error)


def _app(monkeypatch, kind, service=None, lookup=None):
    async def allow(*_args, **_kwargs):
        return None

    monkeypatch.setattr(f"{ROUTER}.require_write_permission", allow)
    monkeypatch.setattr(f"{ROUTER}.require_read_permission", allow)
    monkeypatch.setattr(f"{ROUTER}.get_session_vyos_service", lookup or (lambda _req: service))

    from routers.policy_list.policy_list import build_router

    app = FastAPI()
    app.include_router(build_router(kind))
    return TestClient(app)


def _batch(client, kind, operations, name="L1", rule_number=None):
    body = {"name": name, "operations": operations}
    if rule_number is not None:
        body["rule_number"] = rule_number
    return client.post(f"/vyos/{kind}/batch", json=body)


def _reorder(client, kind, rules, name="L1"):
    return client.post(
        f"/vyos/{kind}/reorder",
        json={KIND_SPEC[kind]["name_field"]: name, "rules": rules},
    )


@pytest.mark.parametrize("kind", KINDS)
@pytest.mark.parametrize("version", ["1.4", "1.5"])
def test_every_builder_op_takes_the_name_then_rule_then_at_most_one_value(kind, version):
    builder = KIND_BUILDER[kind](version)
    shapes = {}
    for name, method in inspect.getmembers(builder, inspect.ismethod):
        if not name.startswith(("set_", "delete_", "create_")):
            continue
        params = list(inspect.signature(method).parameters)
        shapes[name] = params
    assert shapes
    bad = {
        name: params
        for name, params in shapes.items()
        if params[0] != "name"
        or len(params) > 3
        or (len(params) == 3 and params[1] != "rule")
    }
    assert bad == {}


@pytest.mark.parametrize("kind", KINDS)
def test_batch_binds_name_rule_and_value_onto_builder_paths(monkeypatch, kind):
    service = Service()
    client = _app(monkeypatch, kind, service)
    ident = KIND_SPEC[kind]["ident"]

    response = _batch(
        client,
        kind,
        [
            {"op": f"set_{ident}"},
            {"op": f"set_{ident}_description", "value": "a, b"},
            {"op": "set_rule"},
            {"op": "set_rule_action", "value": "deny"},
            {"op": "set_rule_regex", "value": "65000:.*"},
            {"op": "delete_rule_description"},
        ],
        rule_number=10,
    )

    assert response.status_code == 200, response.text
    assert response.json()["success"] is True
    assert response.json()["data"] == {"message": "Configuration updated"}
    base = ["policy", kind, "L1"]
    assert service.executed == [
        [
            {"op": "set", "path": base},
            {"op": "set", "path": base + ["description", "a, b"]},
            {"op": "set", "path": base + ["rule", "10"]},
            {"op": "set", "path": base + ["rule", "10", "action", "deny"]},
            {"op": "set", "path": base + ["rule", "10", "regex", "65000:.*"]},
            {"op": "delete", "path": base + ["rule", "10", "description"]},
        ]
    ]


@pytest.mark.parametrize("kind", KINDS)
def test_list_op_ignores_the_zero_rule_number_the_client_sends(monkeypatch, kind):
    service = Service()
    client = _app(monkeypatch, kind, service)
    ident = KIND_SPEC[kind]["ident"]

    response = _batch(client, kind, [{"op": f"delete_{ident}"}], rule_number=0)

    assert response.status_code == 200, response.text
    assert service.executed == [[{"op": "delete", "path": ["policy", kind, "L1"]}]]


@pytest.mark.parametrize("kind", KINDS)
@pytest.mark.parametrize("value", [None, "", "   "])
def test_missing_or_empty_value_is_400(monkeypatch, kind, value):
    service = Service()
    client = _app(monkeypatch, kind, service)
    op = {"op": "set_rule_regex"}
    if value is not None:
        op["value"] = value

    response = _batch(client, kind, [op], rule_number=10)

    assert response.status_code == 400
    assert response.json()["detail"] == "Operation set_rule_regex requires a value"
    assert service.executed == []


@pytest.mark.parametrize("kind", KINDS)
@pytest.mark.parametrize("rule_number", [None, 0])
def test_rule_op_without_rule_number_is_400(monkeypatch, kind, rule_number):
    service = Service()
    client = _app(monkeypatch, kind, service)

    response = _batch(client, kind, [{"op": "delete_rule"}], rule_number=rule_number)

    assert response.status_code == 400
    assert response.json()["detail"] == "Operation delete_rule requires rule_number"
    assert service.executed == []


@pytest.mark.parametrize("kind", KINDS)
@pytest.mark.parametrize("op", ["set_list_op", "delete_list_op", "set_rule", "delete_rule", "delete_rule_regex", "delete_rule_description"])
def test_value_on_an_op_that_takes_none_is_400(monkeypatch, kind, op):
    service = Service()
    client = _app(monkeypatch, kind, service)
    ident = KIND_SPEC[kind]["ident"]
    op = {"set_list_op": f"set_{ident}", "delete_list_op": f"delete_{ident}"}.get(op, op)

    response = _batch(client, kind, [{"op": op, "value": "x"}], rule_number=10)

    assert response.status_code == 400
    assert response.json()["detail"] == f"Operation {op} takes no value"
    assert service.executed == []


@pytest.mark.parametrize("kind", KINDS)
def test_reorder_validation_error_is_422_on_the_body(monkeypatch, kind):
    service = Service()
    client = _app(monkeypatch, kind, service)

    response = client.post(f"/vyos/{kind}/reorder", json={"rules": []})

    assert response.status_code == 422
    locs = [tuple(error["loc"]) for error in response.json()["detail"]]
    assert ("body", KIND_SPEC[kind]["name_field"]) in locs
    assert ("body", "rules") in locs
    assert service.executed == []


@pytest.mark.parametrize("kind", KINDS)
def test_openapi_schema_builds(monkeypatch, kind):
    client = _app(monkeypatch, kind, Service())

    response = client.get("/openapi.json")

    assert response.status_code == 200
    assert f"/vyos/{kind}/reorder" in response.json()["paths"]


@pytest.mark.parametrize("kind", KINDS)
@pytest.mark.parametrize("op", ["set_list", "_set_list", "get_capabilities", "bogus"])
def test_unknown_or_internal_op_is_400(monkeypatch, kind, op):
    service = Service()
    client = _app(monkeypatch, kind, service)

    response = _batch(client, kind, [{"op": op}])

    assert response.status_code == 400
    assert service.executed == []


@pytest.mark.parametrize("kind", KINDS)
@pytest.mark.parametrize("name", ["", None])
def test_blank_list_name_is_rejected(monkeypatch, kind, name):
    service = Service()
    client = _app(monkeypatch, kind, service)
    ident = KIND_SPEC[kind]["ident"]

    response = client.post(
        f"/vyos/{kind}/batch",
        json={"name": name, "operations": [{"op": f"set_{ident}"}]},
    )

    assert response.status_code == 422
    assert service.executed == []


@pytest.mark.parametrize("kind", KINDS)
def test_empty_batch_stays_500(monkeypatch, kind):
    service = Service()
    client = _app(monkeypatch, kind, service)

    response = _batch(client, kind, [])

    assert response.status_code == 500
    assert response.json()["detail"] == "Internal server error"


@pytest.mark.parametrize("kind", KINDS)
def test_rejected_commit_is_success_false(monkeypatch, kind):
    service = Service(status=400, error="Commit failed")
    client = _app(monkeypatch, kind, service)
    ident = KIND_SPEC[kind]["ident"]

    response = _batch(client, kind, [{"op": f"set_{ident}"}])

    assert response.status_code == 200
    assert response.json()["success"] is False
    assert response.json()["error"] == "Commit failed"
    assert response.json()["data"] is None


@pytest.mark.parametrize("kind", KINDS)
@pytest.mark.parametrize("rule_number", [-1, 65536])
def test_out_of_range_rule_number_is_rejected(monkeypatch, kind, rule_number):
    service = Service()
    client = _app(monkeypatch, kind, service)

    response = _batch(client, kind, [{"op": "delete_rule"}], rule_number=rule_number)

    assert response.status_code == 422
    assert service.executed == []


@pytest.mark.parametrize("kind", KINDS)
@pytest.mark.parametrize(
    "method,path,body",
    [
        ("get", "capabilities", None),
        ("get", "config", None),
        ("post", "batch", {"name": "L1", "operations": [{"op": "delete_rule"}], "rule_number": 1}),
        ("post", "reorder", "reorder"),
    ],
)
def test_session_lookup_400_is_not_turned_into_500(monkeypatch, kind, method, path, body):
    def lookup(_req):
        raise HTTPException(status_code=400, detail="No active session")

    client = _app(monkeypatch, kind, lookup=lookup)
    if body == "reorder":
        body = {
            KIND_SPEC[kind]["name_field"]: "L1",
            "rules": [{"old_number": 1, "new_number": 2, "rule_data": {"rule_number": 1}}],
        }
    url = f"/vyos/{kind}/{path}"
    response = client.get(url) if method == "get" else client.post(url, json=body)

    assert response.status_code == 400
    assert response.json()["detail"] == "No active session"


@pytest.mark.parametrize("kind", KINDS)
def test_reorder_deletes_then_resets_each_rule(monkeypatch, kind):
    service = Service()
    client = _app(monkeypatch, kind, service)

    response = _reorder(
        client,
        kind,
        [
            {"old_number": 5, "new_number": None, "rule_data": {"rule_number": 5}},
            {
                "old_number": 10,
                "new_number": 5,
                "rule_data": {"rule_number": 10, "action": "deny", "description": "d", "regex": "65000:1"},
            },
        ],
    )

    assert response.status_code == 200, response.text
    label = KIND_SPEC[kind]["label"]
    assert response.json()["success"] is True
    assert response.json()["data"] == {"message": f"Successfully reordered 2 rules in {label} L1"}
    base = ["policy", kind, "L1", "rule"]
    assert service.executed == [
        [
            {"op": "delete", "path": base + ["10"]},
            {"op": "delete", "path": base + ["5"]},
            {"op": "set", "path": base + ["5"]},
            {"op": "set", "path": base + ["5", "action", "deny"]},
            {"op": "set", "path": base + ["5", "description", "d"]},
            {"op": "set", "path": base + ["5", "regex", "65000:1"]},
        ]
    ]


@pytest.mark.parametrize("kind", KINDS)
@pytest.mark.parametrize(
    "rules",
    [
        [],
        [
            {"old_number": 1, "new_number": 2, "rule_data": {"rule_number": 1}},
            {"old_number": 1, "new_number": 3, "rule_data": {"rule_number": 1}},
        ],
        [
            {"old_number": 1, "new_number": 3, "rule_data": {"rule_number": 1}},
            {"old_number": 2, "new_number": 3, "rule_data": {"rule_number": 2}},
        ],
        [{"old_number": 0, "new_number": 1, "rule_data": {"rule_number": 0}}],
        [{"old_number": 1, "new_number": 65536, "rule_data": {"rule_number": 1}}],
        [{"old_number": 1, "new_number": 2, "rule_data": {"rule_number": 1, "action": "allow"}}],
    ],
    ids=["empty", "duplicate-old", "duplicate-new", "old-zero", "new-too-large", "bad-action"],
)
def test_reorder_rejects_a_bad_rule_list(monkeypatch, kind, rules):
    service = Service()
    client = _app(monkeypatch, kind, service)

    response = _reorder(client, kind, rules)

    assert response.status_code == 422
    assert service.executed == []


@pytest.mark.parametrize("kind", KINDS)
@pytest.mark.parametrize("version", ["1.4", "1.5"])
def test_registry_returns_the_family_mapper(kind, version):
    mapper = CommandMapperRegistry.get_mapper(KIND_SPEC[kind]["ident"], version)
    assert isinstance(mapper, PolicyListMapper)
    assert mapper.kind == kind
    assert mapper.version == version


@pytest.mark.parametrize("kind", KINDS)
def test_parse_config_returns_the_client_shape(kind):
    mapper = cast(PolicyListMapper, CommandMapperRegistry.get_mapper(KIND_SPEC[kind]["ident"], "1.5"))
    lists_field = KIND_SPEC[kind]["lists_field"]

    parsed = mapper.parse_config({"policy": {kind: SAMPLE}})

    assert parsed == {
        lists_field: [
            {
                "name": "LIST-B",
                "description": "second",
                "rules": [
                    {"rule_number": 5, "description": "first", "action": "permit", "regex": "65000:1"},
                    {"rule_number": 20, "description": None, "action": "deny", "regex": "65000:2"},
                ],
            },
            {"name": "LIST-A", "description": None, "rules": []},
        ],
        "total": 2,
    }


@pytest.mark.parametrize("kind", KINDS)
@pytest.mark.parametrize("config", [{}, {"policy": {}}, {"policy": {"route-map": {"X": {}}}}])
def test_unconfigured_parse_has_the_same_shape(kind, config):
    mapper = cast(PolicyListMapper, CommandMapperRegistry.get_mapper(KIND_SPEC[kind]["ident"], "1.4"))

    assert mapper.parse_config(config) == {KIND_SPEC[kind]["lists_field"]: [], "total": 0}


@pytest.mark.parametrize("kind", KINDS)
def test_config_route_returns_parse_config_through_the_response_model(monkeypatch, kind):
    other = [k for k in KINDS if k != kind][0]
    service = Service(config={"policy": {kind: SAMPLE, other: {"OTHER": {}}}})
    client = _app(monkeypatch, kind, service)
    lists_field = KIND_SPEC[kind]["lists_field"]

    response = client.get(f"/vyos/{kind}/config")

    assert response.status_code == 200, response.text
    body = response.json()
    assert body["total"] == 2
    assert [item["name"] for item in body[lists_field]] == ["LIST-B", "LIST-A"]
    assert body[lists_field][0]["rules"][0] == {
        "rule_number": 5,
        "description": "first",
        "action": "permit",
        "regex": "65000:1",
    }
    assert body[lists_field][1]["rules"] == []


@pytest.mark.parametrize("kind", KINDS)
def test_reorder_rejected_commit_is_success_false(monkeypatch, kind):
    service = Service(status=400, error="Commit failed")
    client = _app(monkeypatch, kind, service)

    response = _reorder(
        client,
        kind,
        [{"old_number": 10, "new_number": 5, "rule_data": {"rule_number": 10}}],
    )

    assert response.status_code == 200
    assert response.json()["success"] is False
    assert response.json()["error"] == "Commit failed"
    assert response.json()["data"] is None


@pytest.mark.parametrize("kind", KINDS)
def test_reorder_blank_list_name_is_rejected(monkeypatch, kind):
    service = Service()
    client = _app(monkeypatch, kind, service)

    response = _reorder(
        client,
        kind,
        [{"old_number": 10, "new_number": 5, "rule_data": {"rule_number": 10}}],
        name="",
    )

    assert response.status_code == 422
    assert service.executed == []
