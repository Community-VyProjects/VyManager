"""Bridge batch deletes the leaf the screen named, and commits off the event loop."""

from types import SimpleNamespace

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient


def _client(monkeypatch, version="1.5"):
    executed = []

    async def allow(*_args, **_kwargs):
        return None

    class Service:
        def get_version(self):
            return version

        def execute_batch(self, batch):
            if batch.is_empty():
                raise ValueError("Cannot execute empty batch")
            executed.append(batch.get_operations())
            return SimpleNamespace(status=200, result="", error=None)

    monkeypatch.setattr("routers.firewall.bridge.require_write_permission", allow)
    monkeypatch.setattr(
        "routers.firewall.bridge.get_session_vyos_service",
        lambda _req: Service(),
    )
    from routers.firewall.bridge import router

    app = FastAPI()
    app.include_router(router)
    return TestClient(app), executed


def _batch(client, operations, **extra):
    body = {"chain": "forward", "operations": operations}
    body.update(extra)
    return client.post("/vyos/firewall/bridge/batch", json=body)


RULE = ["firewall", "bridge", "forward", "filter", "rule", "10"]


def test_delete_ttl_eq_deletes_the_leaf(monkeypatch):
    client, executed = _client(monkeypatch)
    resp = _batch(client, [{"op": "delete_rule_ttl_eq"}], rule_number=10)
    assert resp.status_code == 200, resp.text
    assert executed == [[{"op": "delete", "path": RULE + ["ttl", "eq"]}]]


def test_delete_limit_rate_does_not_delete_the_parent(monkeypatch):
    client, executed = _client(monkeypatch)
    resp = _batch(client, [{"op": "delete_rule_limit_rate"}], rule_number=10)
    assert resp.status_code == 200, resp.text
    assert executed == [[{"op": "delete", "path": RULE + ["limit", "rate"]}]]


def test_delete_fragment_deletes_the_presence_node(monkeypatch):
    client, executed = _client(monkeypatch)
    resp = _batch(client, [{"op": "delete_rule_fragment_match_frag"}], rule_number=10)
    assert resp.status_code == 200, resp.text
    assert executed == [[{"op": "delete", "path": RULE + ["fragment", "match-frag"]}]]


def test_delete_queue_works_on_1_4(monkeypatch):
    client, executed = _client(monkeypatch, version="1.4")
    resp = _batch(client, [{"op": "delete_rule_queue"}], rule_number=10)
    assert resp.status_code == 200, resp.text
    assert executed == [[{"op": "delete", "path": RULE + ["queue"]}]]


def test_v15_only_delete_is_400_on_1_4(monkeypatch):
    client, executed = _client(monkeypatch, version="1.4")
    resp = _batch(client, [{"op": "delete_rule_ttl_eq"}], rule_number=10)
    assert resp.status_code == 400, resp.text
    assert executed == []


def test_rolling_version_accepts_a_1_5_delete(monkeypatch):
    client, executed = _client(monkeypatch, version="2026.09.23-0027-rolling")
    resp = _batch(client, [{"op": "delete_rule_ttl_eq"}], rule_number=10)
    assert resp.status_code == 200, resp.text
    assert executed == [[{"op": "delete", "path": RULE + ["ttl", "eq"]}]]


def test_multi_delete_requires_the_value(monkeypatch):
    client, executed = _client(monkeypatch)
    missing = _batch(client, [{"op": "delete_rule_dscp"}], rule_number=10)
    assert missing.status_code == 400, missing.text
    assert executed == []
    sent = _batch(client, [{"op": "delete_rule_dscp", "value": "10"}], rule_number=10)
    assert sent.status_code == 200, sent.text
    assert executed == [[{"op": "delete", "path": RULE + ["dscp", "10"]}]]


def test_missing_value_is_400(monkeypatch):
    client, executed = _client(monkeypatch)
    resp = _batch(client, [{"op": "set_rule_ttl_eq"}], rule_number=10)
    assert resp.status_code == 400, resp.text
    assert executed == []


def test_empty_batch_stays_500(monkeypatch):
    client, _executed = _client(monkeypatch)
    resp = _batch(client, [])
    assert resp.status_code == 500, resp.text


@pytest.mark.parametrize("op", ["add_set", "get_capabilities", "no_such_op"])
def test_dispatch_rejects_non_ops(monkeypatch, op):
    client, executed = _client(monkeypatch)
    resp = _batch(client, [{"op": op}], rule_number=10)
    assert resp.status_code == 400, resp.text
    assert executed == []
