"""Traffic Engineering GET /config parse lives on the mapper (issue #966)."""

from typing import Any, Dict, Optional

from routers.traffic_engineering.traffic_engineering import TrafficEngineeringConfig
from vyos_mappers.base import CommandMapperRegistry
from vyos_mappers.traffic_engineering import TrafficEngineeringMapper


def _tree():
    return {
        "protocols": {
            "traffic-engineering": {
                "admin-group": {
                    "gold": {"bit-position": "7"},
                    "silver": {"bit-position": "0"},
                },
                "interface": {
                    "eth0": {
                        "admin-group": "gold",
                        "max-bandwidth": "1000",
                        "max-reservable-bandwidth": "500",
                        "metric": "10",
                    },
                    "eth1": {"admin-group": ["gold", "silver"]},
                    "lo": {},
                },
            }
        }
    }


def _parse(full_config: Dict[str, Any], version: str = "1.5") -> TrafficEngineeringConfig:
    mapper = CommandMapperRegistry.get_mapper("traffic_engineering", version)
    assert isinstance(mapper, TrafficEngineeringMapper)
    return TrafficEngineeringConfig(**mapper.parse_config(full_config))


def _node(node: Optional[Dict[str, Any]]) -> Dict[str, Any]:
    return {"protocols": {"traffic-engineering": node}}


def test_parses_every_leaf_into_the_router_model():
    parsed = _parse(_tree())
    assert parsed.configured is True
    groups = {group.name: group.bit_position for group in parsed.admin_groups}
    assert groups == {"gold": 7, "silver": 0}
    interfaces = {item.name: item for item in parsed.interfaces}
    assert interfaces["eth0"].admin_groups == ["gold"]
    assert interfaces["eth0"].max_bandwidth == 1000
    assert interfaces["eth0"].max_reservable_bandwidth == 500
    assert interfaces["eth0"].metric == 10
    assert interfaces["eth1"].admin_groups == ["gold", "silver"]
    assert interfaces["lo"].admin_groups == []
    assert interfaces["lo"].metric is None


def test_bare_root_is_configured_with_empty_lists():
    """A bare ``protocols traffic-engineering`` commits and parses as {}."""
    for node in ({}, None):
        parsed = _parse(_node(node))
        assert parsed.configured is True
        assert parsed.admin_groups == []
        assert parsed.interfaces == []


def test_missing_root_is_the_same_shape_unconfigured():
    for full_config in ({}, {"protocols": {}}, {"protocols": {"bgp": {}}}):
        mapper = CommandMapperRegistry.get_mapper("traffic_engineering", "1.5")
        assert isinstance(mapper, TrafficEngineeringMapper)
        assert mapper.parse_config(full_config) == {
            "configured": False,
            "admin_groups": [],
            "interfaces": [],
        }


def test_parse_is_the_same_on_both_versions():
    assert _parse(_tree(), "1.4") == _parse(_tree(), "2026.09.23-0027-rolling")


def test_1_4_get_does_not_fetch_config(monkeypatch):
    fetched = {"n": 0}

    async def allow(*_args, **_kwargs):
        return None

    class FakeService:
        def get_version(self):
            return "1.4.3"

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
    assert response.json() == {"configured": False, "admin_groups": [], "interfaces": []}
    assert fetched["n"] == 0
