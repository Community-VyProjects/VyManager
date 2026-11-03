"""Traffic Engineering GET /config parse lives on the mapper (issue #966)."""

from vyos_mappers.base import CommandMapperRegistry
from vyos_mappers.traffic_engineering.traffic_engineering_versions import (
    get_traffic_engineering_mapper,
)


def _tree():
    return {
        "protocols": {
            "traffic-engineering": {
                "admin-group": {
                    "gold": {"bit-position": "7"},
                    "bare": None,
                },
                "interface": {
                    "eth0": {
                        "admin-group": "gold",
                        "max-bandwidth": "1000",
                        "max-reservable-bandwidth": "not-a-number",
                        "metric": "10",
                    },
                    "eth1": {"admin-group": ["gold", "silver"]},
                },
            }
        }
    }


def test_1_5_parses_admin_groups_and_interfaces():
    parsed = get_traffic_engineering_mapper("1.5").parse_config(_tree())
    groups = {item["name"]: item for item in parsed["admin_groups"]}
    assert groups["gold"]["bit_position"] == 7
    assert groups["bare"]["bit_position"] is None
    interfaces = {item["name"]: item for item in parsed["interfaces"]}
    assert interfaces["eth0"]["admin_groups"] == ["gold"]
    assert interfaces["eth0"]["max_bandwidth"] == 1000
    assert interfaces["eth0"]["max_reservable_bandwidth"] is None
    assert interfaces["eth0"]["metric"] == 10
    assert interfaces["eth1"]["admin_groups"] == ["gold", "silver"]


def test_1_4_returns_empty_even_when_tree_is_present():
    parsed = get_traffic_engineering_mapper("1.4").parse_config(_tree())
    assert parsed == {"admin_groups": [], "interfaces": []}


def test_empty_tree_on_1_5():
    parsed = get_traffic_engineering_mapper("1.5").parse_config({})
    assert parsed == {"admin_groups": [], "interfaces": []}


def test_registry_matches_factory():
    factory = get_traffic_engineering_mapper("1.4.2").parse_config(_tree())
    registry = CommandMapperRegistry.get_mapper(
        "traffic_engineering", "1.4.2"
    ).parse_config(_tree())
    assert registry == factory == {"admin_groups": [], "interfaces": []}


def test_1_4_get_does_not_fetch_config(monkeypatch):
    fetched = {"n": 0}

    async def allow(*_args, **_kwargs):
        return None

    class FakeService:
        def get_version(self):
            return "1.4"

        def get_full_config(self, refresh=False):
            fetched["n"] += 1
            raise AssertionError("1.4 must not fetch config")

    monkeypatch.setattr(
        "routers.traffic_engineering.traffic_engineering.require_read_permission",
        allow,
    )
    monkeypatch.setattr(
        "routers.traffic_engineering.traffic_engineering.get_session_vyos_service",
        lambda _req: FakeService(),
    )

    from fastapi import FastAPI
    from fastapi.testclient import TestClient
    from routers.traffic_engineering.traffic_engineering import router

    app = FastAPI()
    app.include_router(router)
    response = TestClient(app).get("/vyos/traffic-engineering/config")
    assert response.status_code == 200, response.text
    assert response.json()["admin_groups"] == []
    assert response.json()["interfaces"] == []
    assert fetched["n"] == 0


def test_get_config_returns_mapper_parse(monkeypatch):
    tree = _tree()
    expected = get_traffic_engineering_mapper("1.5").parse_config(tree)

    async def allow(*_args, **_kwargs):
        return None

    class FakeService:
        def get_version(self):
            return "1.5"

        def get_full_config(self, refresh=False):
            return tree

    monkeypatch.setattr(
        "routers.traffic_engineering.traffic_engineering.require_read_permission",
        allow,
    )
    monkeypatch.setattr(
        "routers.traffic_engineering.traffic_engineering.get_session_vyos_service",
        lambda _req: FakeService(),
    )

    from fastapi import FastAPI
    from fastapi.testclient import TestClient
    from routers.traffic_engineering.traffic_engineering import router

    app = FastAPI()
    app.include_router(router)
    client = TestClient(app)
    response = client.get("/vyos/traffic-engineering/config")
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["admin_groups"][0]["bit_position"] == expected["admin_groups"][0]["bit_position"]
    assert body["interfaces"][0]["max_bandwidth"] == 1000
    assert body["interfaces"][0]["admin_groups"] == ["gold"]
