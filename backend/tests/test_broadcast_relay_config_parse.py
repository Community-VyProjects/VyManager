"""Broadcast relay GET /config parse lives on the mapper (issue #966)."""

from pathlib import Path

from vyos_mappers.broadcast_relay.broadcast_relay_versions import (
    get_broadcast_relay_mapper,
)


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


def test_parse_config_is_explicit_and_version_falls_through():
    mapper = get_broadcast_relay_mapper("1.4")
    assert "parse_config" in type(mapper).__dict__
    assert mapper.version == "1.4"


def test_instances_sorted_by_int_id():
    parsed = get_broadcast_relay_mapper("1.5").parse_config(_tree())
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
    assert get_broadcast_relay_mapper("1.4").parse_config(_tree()) == parsed


def test_empty_tree():
    empty = {"globally_disabled": False, "instances": []}
    assert get_broadcast_relay_mapper("1.5").parse_config({}) == empty
    assert (
        get_broadcast_relay_mapper("1.4").parse_config(
            {"service": {"broadcast-relay": {}}}
        )
        == empty
    )


def test_router_has_no_config_parsers_section():
    text = (
        Path(__file__)
        .resolve()
        .parents[1]
        .joinpath("routers/broadcast_relay/broadcast_relay.py")
        .read_text()
    )
    assert "Config Parsers" not in text


def test_get_config_returns_mapper_parse(monkeypatch):
    tree = _tree()
    expected = get_broadcast_relay_mapper("1.5").parse_config(tree)

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
