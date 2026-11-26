"""Broadcast relay GET /config parse lives on the shared mapper (issues #966, #1185)."""

from pathlib import Path

from vyos_mappers.base import CommandMapperRegistry
from vyos_mappers.broadcast_relay import BroadcastRelayMapper


def _tree():
    return {
        "service": {
            "broadcast-relay": {
                "disable": {},
                "id": {
                    "10": {
                        "address": "255.255.255.255",
                        "description": "late",
                        "interface": {"eth1": {}, "eth0": {}},
                        "port": "9",
                    },
                    "2": {
                        "disable": {},
                        "interface": ["eth3", "eth2"],
                        "port": "nope",
                    },
                    "3": None,
                },
            }
        }
    }


def test_registry_returns_shared_mapper():
    """Both labs have the same leaves, so the registry returns the one class."""
    for version in ("1.4", "1.4.3", "1.5", "2026.09.23-0027-rolling"):
        mapper = CommandMapperRegistry.get_mapper("broadcast_relay", version)
        assert type(mapper) is BroadcastRelayMapper
        assert mapper.version == version
        assert "parse_config" in type(mapper).__dict__
    registered = CommandMapperRegistry.get_mapper("broadcast_relay", "1.5")
    assert isinstance(registered, BroadcastRelayMapper)
    assert registered.parse_config(_tree()) == BroadcastRelayMapper("1.5").parse_config(_tree())
    versions = (
        Path(__file__).resolve().parents[1]
        / "vyos_mappers"
        / "broadcast_relay"
        / "broadcast_relay_versions"
    )
    for name in ("__init__.py", "v1_4.py", "v1_5.py"):
        assert not (versions / name).exists()


def test_instances_sorted_by_int_id():
    parsed = BroadcastRelayMapper("1.5").parse_config(_tree())
    assert parsed["globally_disabled"] is True
    assert [item["id"] for item in parsed["instances"]] == ["2", "3", "10"]
    disabled = parsed["instances"][0]
    assert disabled["disabled"] is True
    assert disabled["interfaces"] == ["eth2", "eth3"]
    assert disabled["port"] is None
    assert parsed["instances"][1]["interfaces"] == []
    assert parsed["instances"][1]["address"] is None
    late = parsed["instances"][2]
    assert late["interfaces"] == ["eth0", "eth1"]
    assert late["port"] == 9
    assert late["address"] == "255.255.255.255"
    assert late["description"] == "late"
    assert late["disabled"] is False
    assert BroadcastRelayMapper("1.4").parse_config(_tree()) == parsed


def test_empty_tree():
    """No root is unconfigured; a bare root (``{}`` or ``None``) is configured."""
    absent = {"configured": False, "globally_disabled": False, "instances": []}
    bare = {"configured": True, "globally_disabled": False, "instances": []}
    assert BroadcastRelayMapper("1.5").parse_config({}) == absent
    assert BroadcastRelayMapper("1.5").parse_config({"service": {}}) == absent
    for raw in ({}, None):
        assert (
            BroadcastRelayMapper("1.4").parse_config(
                {"service": {"broadcast-relay": raw}}
            )
            == bare
        )


def test_bare_root_through_response_model():
    """The response model keeps ``configured`` for a bare root and for no root."""
    from routers.broadcast_relay.broadcast_relay import BroadcastRelayConfig

    mapper = BroadcastRelayMapper("1.5")
    bare = BroadcastRelayConfig(**mapper.parse_config({"service": {"broadcast-relay": {}}}))
    assert bare.configured is True
    assert bare.globally_disabled is False
    assert bare.instances == []
    absent = BroadcastRelayConfig(**mapper.parse_config({}))
    assert absent.configured is False
    full = BroadcastRelayConfig(**mapper.parse_config(_tree()))
    assert full.configured is True
    assert full.globally_disabled is True


def test_get_config_returns_mapper_parse(monkeypatch):
    tree = _tree()
    expected = BroadcastRelayMapper("1.5").parse_config(tree)

    async def allow(*_args, **_kwargs):
        return None

    class FakeService:
        def get_version(self):
            return "1.5"

        def get_full_config(self, refresh=False):
            return tree

    monkeypatch.setattr(
        "routers.broadcast_relay.broadcast_relay.require_read_permission", allow
    )
    monkeypatch.setattr(
        "routers.broadcast_relay.broadcast_relay.get_session_vyos_service",
        lambda _req: FakeService(),
    )

    from fastapi import FastAPI
    from fastapi.testclient import TestClient
    from routers.broadcast_relay.broadcast_relay import router

    app = FastAPI()
    app.include_router(router)
    response = TestClient(app).get("/vyos/broadcast-relay/config")
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["globally_disabled"] is True
    assert [item["id"] for item in body["instances"]] == [
        item["id"] for item in expected["instances"]
    ]
    assert body["instances"][0]["port"] is None
    assert body["instances"][2]["port"] == 9
