"""Segment Routing GET /config parse lives on the mapper (issue #966)."""

from pathlib import Path

from vyos_mappers.base import CommandMapperRegistry
from vyos_mappers.segment_routing.segment_routing_versions import get_segment_routing_mapper


def _tree():
    return {
        "protocols": {
            "segment-routing": {
                "srv6": {
                    "locator": {
                        "loc1": {
                            "prefix": "2001:db8:aaaa::/48",
                            "block-len": "40",
                            "node-len": "not-a-number",
                            "func-bits": "16",
                            "behavior-usid": {},
                        },
                        "bare": None,
                    }
                },
                "interface": {
                    "eth0": {"srv6": {"hmac": "drop"}},
                    "eth9": None,
                },
            }
        }
    }


def test_parse_distinctive_fields():
    parsed = get_segment_routing_mapper("1.5").parse_config(_tree())
    locators = {item["name"]: item for item in parsed["locators"]}
    assert locators["loc1"]["prefix"] == "2001:db8:aaaa::/48"
    assert locators["loc1"]["block_len"] == 40
    assert locators["loc1"]["node_len"] is None
    assert locators["loc1"]["func_bits"] == 16
    assert locators["loc1"]["behavior_usid"] is True
    assert locators["bare"]["prefix"] is None
    assert locators["bare"]["behavior_usid"] is False
    interfaces = {item["name"]: item for item in parsed["interfaces"]}
    assert interfaces["eth0"]["hmac"] == "drop"
    assert interfaces["eth9"]["hmac"] is None


def test_empty_tree():
    parsed = get_segment_routing_mapper("1.5").parse_config({})
    assert parsed == {"locators": [], "interfaces": []}
    assert get_segment_routing_mapper("1.4").parse_config(
        {"protocols": {"segment-routing": None}}
    ) == {"locators": [], "interfaces": []}


def test_registry_matches_factory():
    import vyos_mappers  # noqa: F401

    factory = get_segment_routing_mapper("1.5").parse_config(_tree())
    registry = CommandMapperRegistry.get_mapper("segment_routing", "1.5").parse_config(_tree())
    assert registry["locators"][0]["block_len"] == factory["locators"][0]["block_len"]


def test_router_has_no_config_parsers():
    text = Path(__file__).resolve().parents[1].joinpath(
        "routers/segment_routing/segment_routing.py"
    ).read_text()
    assert "Config Parsers" not in text


def test_get_config_returns_mapper_parse(monkeypatch):
    tree = _tree()
    expected = get_segment_routing_mapper("1.5").parse_config(tree)

    async def allow(*_args, **_kwargs):
        return None

    class FakeService:
        def get_version(self):
            return "1.5"

        def get_full_config(self, refresh=False):
            return tree

    monkeypatch.setattr(
        "routers.segment_routing.segment_routing.require_read_permission", allow
    )
    monkeypatch.setattr(
        "routers.segment_routing.segment_routing.get_session_vyos_service",
        lambda _req: FakeService(),
    )

    from fastapi import FastAPI
    from fastapi.testclient import TestClient
    from routers.segment_routing.segment_routing import router

    app = FastAPI()
    app.include_router(router)
    client = TestClient(app)
    response = client.get("/vyos/segment-routing/config")
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["locators"][0]["prefix"] == expected["locators"][0]["prefix"]
    assert body["locators"][0]["block_len"] == 40
    assert body["interfaces"][0]["hmac"] == "drop"
