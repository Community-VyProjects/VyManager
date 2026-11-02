"""Babel GET /config parse lives on the mapper (issue #966)."""

from vyos_mappers.base import CommandMapperRegistry
from vyos_mappers.babel.babel_versions import get_babel_mapper


def _tree():
    return {
        "protocols": {
            "babel": {
                "interface": {
                    "eth0": {
                        "type": "wired",
                        "hello-interval": "4000",
                        "update-interval": "0",
                        "rxcost": "96",
                        "split-horizon": "disable",
                        "enable-timestamps": {},
                        "rtt-min": "10",
                    },
                    "eth1": None,
                },
                "parameters": {"diversity": {}, "diversity-factor": "128"},
                "redistribute": {
                    "ipv4": {"connected": {}, "static": {}},
                    "ipv6": {"ripng": {}},
                },
                "distribute-list": {
                    "ipv4": {
                        "access-list": {"in": "ACL4"},
                        "prefix-list": {"out": "PFX4"},
                        "interface": {
                            "eth0": {"access-list": {"out": "ACL-ETH"}, "prefix-list": {}}
                        },
                    },
                    "ipv6": {"prefix-list": {"in": "PFX6"}},
                },
            }
        }
    }


def test_parse_distinctive_fields():
    parsed = get_babel_mapper("1.5").parse_config(_tree())
    interfaces = {item["name"]: item for item in parsed["interfaces"]}
    assert interfaces["eth0"]["type"] == "wired"
    assert interfaces["eth0"]["hello_interval"] == 4000
    assert interfaces["eth0"]["update_interval"] == 0
    assert interfaces["eth0"]["rxcost"] == 96
    assert interfaces["eth0"]["split_horizon"] == "disable"
    assert interfaces["eth0"]["enable_timestamps"] is True
    assert interfaces["eth0"]["rtt_min"] == 10
    assert interfaces["eth1"]["channel"] is None
    assert parsed["parameters"]["diversity"] is True
    assert parsed["parameters"]["diversity_factor"] == 128
    assert parsed["parameters"]["resend_delay"] is None
    assert parsed["redistribute"]["ipv4"] == ["connected", "static"]
    assert parsed["redistribute"]["ipv6"] == ["ripng"]
    assert parsed["distribute_list"]["ipv4"]["access_list_in"] == "ACL4"
    assert parsed["distribute_list"]["ipv4"]["prefix_list_out"] == "PFX4"
    assert parsed["distribute_list"]["ipv6"]["prefix_list_in"] == "PFX6"
    iface_filters = parsed["distribute_list"]["ipv4_interfaces"]
    assert iface_filters[0]["interface"] == "eth0"
    assert iface_filters[0]["access_list_out"] == "ACL-ETH"
    assert parsed["distribute_list"]["ipv6_interfaces"] == []


def test_empty_tree():
    parsed = get_babel_mapper("1.4").parse_config({})
    assert parsed["interfaces"] == []
    assert parsed["parameters"]["diversity"] is False
    assert parsed["redistribute"] == {"ipv4": [], "ipv6": []}
    assert parsed["distribute_list"]["ipv4"]["access_list_in"] is None
    assert parsed["distribute_list"]["ipv4_interfaces"] == []


def test_registry_matches_factory():
    import vyos_mappers  # noqa: F401

    factory = get_babel_mapper("1.5").parse_config(_tree())
    registry = CommandMapperRegistry.get_mapper("babel", "1.5").parse_config(_tree())
    assert registry["parameters"]["diversity_factor"] == factory["parameters"]["diversity_factor"]


def test_get_config_returns_mapper_parse(monkeypatch):
    tree = _tree()
    expected = get_babel_mapper("1.5").parse_config(tree)

    async def allow(*_args, **_kwargs):
        return None

    class FakeService:
        def get_version(self):
            return "1.5"

        def get_full_config(self, refresh=False):
            return tree

    monkeypatch.setattr("routers.babel.babel.require_read_permission", allow)
    monkeypatch.setattr(
        "routers.babel.babel.get_session_vyos_service",
        lambda _req: FakeService(),
    )

    from fastapi import FastAPI
    from fastapi.testclient import TestClient
    from routers.babel.babel import router

    app = FastAPI()
    app.include_router(router)
    client = TestClient(app)
    response = client.get("/vyos/babel/config")
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["interfaces"][0]["hello_interval"] == expected["interfaces"][0]["hello_interval"]
    assert body["parameters"]["diversity"] is True
    assert body["redistribute"]["ipv6"] == ["ripng"]
    assert body["distribute_list"]["ipv4"]["access_list_in"] == "ACL4"
