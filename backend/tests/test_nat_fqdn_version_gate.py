"""NAT source/destination FQDN matches only exist from VyOS 1.5.

validateTmplPath: ``nat {source,destination} rule N {source,destination}
fqdn`` is INVALID on 1.4.3 and VALID on 1.5. The mapper owns that answer,
capabilities read it, and the NAT modals hide FQDN from the capability.
"""

import inspect
import re
from pathlib import Path
from types import SimpleNamespace

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from vyos_builders.nat.nat import NATBatchBuilder
from vyos_mappers.nat.nat import NATMapper
from vyos_mappers.nat.nat_versions import get_nat_mapper
from vyos_mappers.nat.nat_versions.v1_5 import NATMapper_v1_5

REPO = Path(__file__).resolve().parents[2]
NET = REPO / "frontend/src/components/network"
PAGE = REPO / "frontend/src/app/network/nat/page.tsx"

FQDN = "host.example.com"

FQDN_MAPPER_METHODS = sorted(
    name for name, _ in inspect.getmembers(NATMapper, predicate=inspect.isfunction)
    if "_fqdn" in name
)

# builder method, args, op, path
BUILDER_CASES = [
    ("set_source_rule_source_fqdn", (10, FQDN), "set",
     ["nat", "source", "rule", "10", "source", "fqdn", FQDN]),
    ("delete_source_rule_source_fqdn", (10,), "delete",
     ["nat", "source", "rule", "10", "source", "fqdn"]),
    ("set_source_rule_destination_fqdn", (10, FQDN), "set",
     ["nat", "source", "rule", "10", "destination", "fqdn", FQDN]),
    ("delete_source_rule_destination_fqdn", (10,), "delete",
     ["nat", "source", "rule", "10", "destination", "fqdn"]),
    ("set_destination_rule_source_fqdn", (10, FQDN), "set",
     ["nat", "destination", "rule", "10", "source", "fqdn", FQDN]),
    ("delete_destination_rule_source_fqdn", (10,), "delete",
     ["nat", "destination", "rule", "10", "source", "fqdn"]),
    ("set_destination_rule_destination_fqdn", (10, FQDN), "set",
     ["nat", "destination", "rule", "10", "destination", "fqdn", FQDN]),
    ("delete_destination_rule_destination_fqdn", (10,), "delete",
     ["nat", "destination", "rule", "10", "destination", "fqdn"]),
]
FQDN_OPS = sorted(case[0] for case in BUILDER_CASES)


def _ops(builder):
    return [(item["op"], item["path"]) for item in builder.get_operations()]


def _args(method):
    return [10 if p == "rule_number" else FQDN for p in inspect.signature(method).parameters]


def test_every_fqdn_mapper_method_is_covered():
    assert len(FQDN_MAPPER_METHODS) == 8


# ---------------------------------------------------------------------------
# Mapper and builder: emitted on 1.5, rejected on 1.4 with nothing queued
# ---------------------------------------------------------------------------


@pytest.mark.parametrize("name", FQDN_MAPPER_METHODS)
def test_v14_mapper_rejects_every_fqdn_path(name):
    method = getattr(get_nat_mapper("1.4"), name)
    with pytest.raises(ValueError, match="not supported on this device"):
        method(*_args(method))


@pytest.mark.parametrize("name", FQDN_MAPPER_METHODS)
def test_v15_mapper_emits_every_fqdn_path(name):
    method = getattr(get_nat_mapper("1.5"), name)
    path = method(*_args(method))
    assert path[0] == "nat" and "fqdn" in path


@pytest.mark.parametrize("method, args, op, expected_path", BUILDER_CASES)
def test_fqdn_builder_ops_emit_on_1_5(method, args, op, expected_path):
    builder = NATBatchBuilder(version="1.5")
    getattr(builder, method)(*args)
    assert _ops(builder) == [(op, expected_path)]


@pytest.mark.parametrize("method, args, op, expected_path", BUILDER_CASES)
def test_fqdn_builder_ops_rejected_on_1_4(method, args, op, expected_path):
    builder = NATBatchBuilder(version="1.4")
    with pytest.raises(ValueError, match="not supported on this device"):
        getattr(builder, method)(*args)
    assert builder.get_operations() == []


def test_shared_match_leaves_still_emit_on_1_4():
    """The gate is per leaf. Address matches exist on both builds."""
    builder = NATBatchBuilder(version="1.4")
    builder.set_source_rule_source_address(10, "192.0.2.0/24")
    builder.set_destination_rule_destination_address(20, "198.51.100.1")
    assert _ops(builder) == [
        ("set", ["nat", "source", "rule", "10", "source", "address", "192.0.2.0/24"]),
        ("set", ["nat", "destination", "rule", "20", "destination", "address", "198.51.100.1"]),
    ]


# ---------------------------------------------------------------------------
# Capabilities read the mapper
# ---------------------------------------------------------------------------


def _advertised_fqdn_ops(caps):
    ops = caps["operations"]["source_nat"] + caps["operations"]["destination_nat"]
    return sorted(op for op in ops if op.endswith("_fqdn"))


def test_v14_capabilities_hide_fqdn():
    caps = NATBatchBuilder(version="1.4").get_capabilities()
    assert caps["features"]["fqdn"]["supported"] is False
    assert _advertised_fqdn_ops(caps) == []
    assert "set_source_rule_source_address" in caps["operations"]["source_nat"]
    assert "set_destination_rule_source_address" in caps["operations"]["destination_nat"]


def test_v15_capabilities_advertise_fqdn():
    caps = NATBatchBuilder(version="1.5").get_capabilities()
    assert caps["features"]["fqdn"]["supported"] is True
    assert _advertised_fqdn_ops(caps) == FQDN_OPS


def test_fqdn_capability_reads_the_mapper(monkeypatch):
    """A handwritten version check in get_capabilities() would ignore this."""
    monkeypatch.setattr(NATMapper_v1_5, "versioned_rule_match_nodes", lambda self: frozenset())
    caps = NATBatchBuilder(version="1.5").get_capabilities()
    assert caps["features"]["fqdn"]["supported"] is False
    assert _advertised_fqdn_ops(caps) == []


# ---------------------------------------------------------------------------
# Endpoints: 400 on 1.4 before anything is committed
# ---------------------------------------------------------------------------

MODULE = "routers.nat.nat"


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


BATCH_BODY = {
    "rule_number": 10,
    "nat_type": "source",
    "operations": [
        {"op": "set_source_rule"},
        {"op": "set_source_rule_source_fqdn", "value": FQDN},
    ],
}
REORDER_BODY = {
    "nat_type": "destination",
    "rules": [{"old_number": 10, "new_number": 20, "rule_data": {"destination_fqdn": FQDN}}],
}


def test_batch_writes_fqdn_on_1_5(monkeypatch):
    client, captured = _client(monkeypatch, "1.5")
    response = client.post("/vyos/nat/batch", json=BATCH_BODY)
    assert response.status_code == 200, response.text
    assert [(item["op"], item["path"]) for item in captured[0]] == [
        ("set", ["nat", "source", "rule", "10"]),
        ("set", ["nat", "source", "rule", "10", "source", "fqdn", FQDN]),
    ]


def test_batch_rejects_fqdn_on_1_4_without_commit(monkeypatch):
    client, captured = _client(monkeypatch, "1.4")
    response = client.post("/vyos/nat/batch", json=BATCH_BODY)
    assert response.status_code == 400, response.text
    assert "not supported on this device" in response.json()["detail"]
    assert captured == []


def test_reorder_writes_fqdn_on_1_5(monkeypatch):
    client, captured = _client(monkeypatch, "1.5")
    response = client.post("/vyos/nat/reorder", json=REORDER_BODY)
    assert response.status_code == 200, response.text
    assert ("set", ["nat", "destination", "rule", "20", "destination", "fqdn", FQDN]) in [
        (item["op"], item["path"]) for item in captured[0]
    ]


def test_reorder_rejects_fqdn_on_1_4_without_commit(monkeypatch):
    client, captured = _client(monkeypatch, "1.4")
    response = client.post("/vyos/nat/reorder", json=REORDER_BODY)
    assert response.status_code == 400, response.text
    assert "not supported on this device" in response.json()["detail"]
    assert captured == []


# ---------------------------------------------------------------------------
# Frontend: FQDN choice follows the capability
# ---------------------------------------------------------------------------


@pytest.mark.parametrize("modal", ["SourceNATModal", "DestinationNATModal"])
def test_modal_gates_both_fqdn_choices_on_capability(modal):
    text = (NET / f"{modal}.tsx").read_text()
    assert "fqdnSupported: boolean;" in text
    assert re.search(rf"export function {modal}\(\{{[^}}]*\bfqdnSupported\b[^}}]*\}}", text)
    for prefix in ("source", "dest"):
        gated = re.search(
            r"\{fqdnSupported && \(\s*<div[^>]*>\s*"
            rf'<RadioGroupItem value="fqdn" id="{prefix}-fqdn" />',
            text,
        )
        assert gated, f"{modal} {prefix} FQDN radio is not gated"
    assert text.count('value="fqdn"') == 2


def test_page_passes_fqdn_capability_to_both_modals():
    page = PAGE.read_text()
    assert "const fqdnSupported = capabilities?.features?.fqdn?.supported ?? false;" in page
    for modal in ("SourceNATModal", "DestinationNATModal"):
        block = re.search(rf"<{modal}\b(.*?)/>", page, re.S)
        assert block and "fqdnSupported={fqdnSupported}" in block.group(1), modal
