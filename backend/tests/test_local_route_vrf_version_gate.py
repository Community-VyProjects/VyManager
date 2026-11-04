"""Local-route ``set vrf`` only exists from VyOS 1.5.

validateTmplPath: ``policy {local-route,local-route6} rule N set vrf`` is
INVALID on 1.4.3 and VALID on 1.5, while ``set table`` is VALID on both.
The mapper owns that answer, capabilities read it, and the modal hides the
VRF choice from the capability.
"""

import inspect
import re
from pathlib import Path
from types import SimpleNamespace

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from vyos_builders.local_route.local_route import LocalRouteBatchBuilder
from vyos_mappers.local_route.local_route import LocalRouteMapper
from vyos_mappers.local_route.local_route_versions import get_local_route_mapper
from vyos_mappers.local_route.local_route_versions.v1_5 import LocalRouteMapperV1_5

REPO = Path(__file__).resolve().parents[2]
MODAL = REPO / "frontend/src/components/policies/LocalRouteModal.tsx"

VRF = "blue"

VRF_MAPPER_METHODS = sorted(
    name for name, _ in inspect.getmembers(LocalRouteMapper, predicate=inspect.isfunction)
    if "_set_vrf" in name
)

# builder method, args, op, path
BUILDER_CASES = [
    ("set_local_route_rule_set_vrf", (10, VRF), "set",
     ["policy", "local-route", "rule", "10", "set", "vrf", VRF]),
    ("delete_local_route_rule_set_vrf", (10,), "delete",
     ["policy", "local-route", "rule", "10", "set", "vrf"]),
    ("set_local_route6_rule_set_vrf", (10, VRF), "set",
     ["policy", "local-route6", "rule", "10", "set", "vrf", VRF]),
    ("delete_local_route6_rule_set_vrf", (10,), "delete",
     ["policy", "local-route6", "rule", "10", "set", "vrf"]),
]


def _ops(builder):
    return [(item["op"], item["path"]) for item in builder.get_operations()]


def _args(method):
    return [10 if p == "rule_number" else VRF for p in inspect.signature(method).parameters]


def test_every_vrf_mapper_method_is_covered():
    assert len(VRF_MAPPER_METHODS) == 4


# ---------------------------------------------------------------------------
# Mapper and builder: emitted on 1.5, rejected on 1.4 with nothing queued
# ---------------------------------------------------------------------------


@pytest.mark.parametrize("name", VRF_MAPPER_METHODS)
def test_v14_mapper_rejects_every_vrf_path(name):
    method = getattr(get_local_route_mapper("1.4"), name)
    with pytest.raises(ValueError, match="not supported on this device"):
        method(*_args(method))


@pytest.mark.parametrize("version", ["1.5", "latest"])
@pytest.mark.parametrize("name", VRF_MAPPER_METHODS)
def test_v15_mapper_emits_every_vrf_path(name, version):
    method = getattr(get_local_route_mapper(version), name)
    path = method(*_args(method))
    assert path[0] == "policy" and path[4:6] == ["set", "vrf"]


@pytest.mark.parametrize("method, args, op, expected_path", BUILDER_CASES)
def test_vrf_builder_ops_emit_on_1_5(method, args, op, expected_path):
    builder = LocalRouteBatchBuilder(version="1.5")
    getattr(builder, method)(*args)
    assert _ops(builder) == [(op, expected_path)]


@pytest.mark.parametrize("method, args, op, expected_path", BUILDER_CASES)
def test_vrf_builder_ops_rejected_on_1_4(method, args, op, expected_path):
    builder = LocalRouteBatchBuilder(version="1.4")
    with pytest.raises(ValueError, match="not supported on this device"):
        getattr(builder, method)(*args)
    assert builder.get_operations() == []


def test_table_still_emits_on_1_4():
    """The gate is per set action. Table exists on both builds."""
    builder = LocalRouteBatchBuilder(version="1.4")
    builder.set_local_route_rule_set_table(10, "100")
    builder.set_local_route6_rule_set_table(20, "main")
    assert _ops(builder) == [
        ("set", ["policy", "local-route", "rule", "10", "set", "table", "100"]),
        ("set", ["policy", "local-route6", "rule", "20", "set", "table", "main"]),
    ]


# ---------------------------------------------------------------------------
# Capabilities read the mapper
# ---------------------------------------------------------------------------


def test_v14_capabilities_hide_vrf():
    features = LocalRouteBatchBuilder(version="1.4").get_capabilities()["features"]
    assert features["vrf_support"]["supported"] is False
    assert features["routing_table_selection"]["supported"] is True


@pytest.mark.parametrize("version", ["1.5", "latest"])
def test_v15_capabilities_advertise_vrf(version):
    features = LocalRouteBatchBuilder(version=version).get_capabilities()["features"]
    assert features["vrf_support"]["supported"] is True


def test_vrf_capability_reads_the_mapper(monkeypatch):
    """A handwritten version check in get_capabilities() would ignore this."""
    monkeypatch.setattr(LocalRouteMapperV1_5, "versioned_rule_set_actions", lambda self: frozenset())
    features = LocalRouteBatchBuilder(version="1.5").get_capabilities()["features"]
    assert features["vrf_support"]["supported"] is False


# ---------------------------------------------------------------------------
# Endpoints: 400 on 1.4 before anything is committed
# ---------------------------------------------------------------------------

MODULE = "routers.local_route.local_route"


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

    monkeypatch.setattr(f"{MODULE}.require_write_permission", allow)
    monkeypatch.setattr(f"{MODULE}.get_session_vyos_service", lambda _req: Service())

    router = __import__(MODULE, fromlist=["router"]).router
    app = FastAPI()
    app.include_router(router)
    return TestClient(app), captured


@pytest.mark.parametrize("rule_type, op, family", [
    ("ipv4", "set_local_route_rule_set_vrf", "local-route"),
    ("ipv6", "set_local_route6_rule_set_vrf", "local-route6"),
])
def test_batch_writes_vrf_on_1_5(monkeypatch, rule_type, op, family):
    client, captured = _client(monkeypatch, "1.5")
    body = {"rule_number": 10, "rule_type": rule_type, "operations": [{"op": op, "value": VRF}]}
    response = client.post("/vyos/local-route/batch", json=body)
    assert response.status_code == 200, response.text
    assert [(item["op"], item["path"]) for item in captured[0]] == [
        ("set", ["policy", family, "rule", "10", "set", "vrf", VRF]),
    ]


@pytest.mark.parametrize("op", [case[0] for case in BUILDER_CASES])
def test_batch_rejects_vrf_on_1_4_without_commit(monkeypatch, op):
    client, captured = _client(monkeypatch, "1.4")
    rule_type = "ipv6" if "route6" in op else "ipv4"
    value = VRF if op.startswith("set_") else None
    body = {"rule_number": 10, "rule_type": rule_type, "operations": [{"op": op, "value": value}]}
    response = client.post("/vyos/local-route/batch", json=body)
    assert response.status_code == 400, response.text
    assert "not supported on this device" in response.json()["detail"]
    assert captured == []


def _reorder_body(rule_type):
    return {
        "rule_type": rule_type,
        "rules": [{"old_number": 10, "new_number": 20, "rule_data": {"vrf": VRF}}],
    }


@pytest.mark.parametrize("rule_type, family", [("ipv4", "local-route"), ("ipv6", "local-route6")])
def test_reorder_writes_vrf_on_1_5(monkeypatch, rule_type, family):
    client, captured = _client(monkeypatch, "1.5")
    response = client.post("/vyos/local-route/reorder", json=_reorder_body(rule_type))
    assert response.status_code == 200, response.text
    assert ("set", ["policy", family, "rule", "20", "set", "vrf", VRF]) in [
        (item["op"], item["path"]) for item in captured[0]
    ]


@pytest.mark.parametrize("rule_type", ["ipv4", "ipv6"])
def test_reorder_rejects_vrf_on_1_4_without_commit(monkeypatch, rule_type):
    client, captured = _client(monkeypatch, "1.4")
    response = client.post("/vyos/local-route/reorder", json=_reorder_body(rule_type))
    assert response.status_code == 400, response.text
    assert "not supported on this device" in response.json()["detail"]
    assert captured == []


# ---------------------------------------------------------------------------
# Frontend: VRF choice follows the capability
# ---------------------------------------------------------------------------


def test_modal_gates_vrf_choice_on_capability():
    text = MODAL.read_text()
    gated = re.search(
        r"\{capabilities\?\.features\.vrf_support\.supported && \(\s*<div[^>]*>\s*"
        r'<input\s+type="radio"\s+id="routing-vrf"',
        text,
    )
    assert gated, "VRF radio is not gated on vrf_support"
    assert text.count('id="routing-vrf"') == 1
