"""RIP GET /config parse lives on the mapper (issue #966)."""

from vyos_mappers.rip.rip_versions import get_rip_mapper


def _tree():
    return {
        "protocols": {
            "rip": {
                "default-distance": "10",
                "default-metric": "nope",
                "default-information": {"originate": {}},
                "route-map": "RM-IN",
                "version": "2",
                "network": {"10.0.0.0/8": {}, "192.0.2.0/24": {}},
                "neighbor": "192.0.2.1",
                "route": ["10.1.0.0/16"],
                "passive-interface": ["eth1", "eth2"],
                "distribute-list": {
                    "access-list": {"in": "ACL-IN", "out": "ACL-OUT"},
                    "prefix-list": {"in": "PL-IN"},
                    "interface": {
                        "eth0": {
                            "access-list": {"out": "ACL-ETH"},
                            "prefix-list": {"in": "PL-ETH"},
                        }
                    },
                },
                "interface": {
                    "eth0": {
                        "authentication": {
                            "md5": {"1": {"password": "secret"}},
                        },
                        "split-horizon": {"poison-reverse": {}, "disable": {}},
                        "receive": {"version": "2"},
                        "send": {"version": "1"},
                    },
                    "eth3": {
                        "authentication": {"plaintext-password": "plain"},
                        "split-horizon": {"disable": {}},
                    },
                },
                "network-distance": {
                    "10.2.0.0/16": {"distance": "5", "access-list": "ACL-DIST"},
                },
                "redistribute": {
                    "connected": {"metric": "3", "route-map": "RM-RED"},
                },
                "timers": {
                    "update": "30",
                    "timeout": "180",
                    "garbage-collection": "120",
                },
            }
        }
    }


def test_parse_config_distinctive_fields():
    parsed = get_rip_mapper("1.5").parse_config(_tree())
    assert parsed["default_distance"] == 10
    assert parsed["default_metric"] is None
    assert parsed["default_information_originate"] is True
    assert parsed["route_map"] == "RM-IN"
    assert parsed["version"] == "2"
    assert parsed["networks"] == ["10.0.0.0/8", "192.0.2.0/24"]
    assert parsed["neighbors"] == ["192.0.2.1"]
    assert parsed["routes"] == ["10.1.0.0/16"]
    assert parsed["passive_interfaces"] == ["eth1", "eth2"]
    assert parsed["distribute_list"]["global_filters"]["access_list_in"] == "ACL-IN"
    assert parsed["distribute_list"]["global_filters"]["prefix_list_out"] is None
    assert parsed["distribute_list"]["interface_filters"][0] == {
        "interface": "eth0",
        "access_list_in": None,
        "access_list_out": "ACL-ETH",
        "prefix_list_in": "PL-ETH",
        "prefix_list_out": None,
    }
    eth0 = parsed["interfaces"][0]
    assert eth0["name"] == "eth0"
    assert eth0["authentication_type"] == "md5"
    assert eth0["md5_keys"] == [{"key_id": "1", "password": "secret"}]
    assert eth0["split_horizon"] == "poison-reverse"
    assert eth0["receive_version"] == "2"
    assert eth0["send_version"] == "1"
    eth3 = parsed["interfaces"][1]
    assert eth3["authentication_type"] == "plaintext"
    assert eth3["plaintext_password"] == "plain"
    assert eth3["split_horizon"] == "disable"
    assert parsed["network_distances"] == [
        {"prefix": "10.2.0.0/16", "distance": 5, "access_list": "ACL-DIST"}
    ]
    assert parsed["redistribute"] == [
        {"protocol": "connected", "metric": 3, "route_map": "RM-RED"}
    ]
    assert parsed["timers"] == {
        "update": 30,
        "timeout": 180,
        "garbage_collection": 120,
    }


def test_empty_tree():
    parsed = get_rip_mapper("1.4").parse_config({})
    assert parsed["default_distance"] is None
    assert parsed["default_information_originate"] is False
    assert parsed["networks"] == []
    assert parsed["interfaces"] == []
    assert parsed["distribute_list"]["interface_filters"] == []
    assert parsed["timers"]["update"] is None
    assert parsed == get_rip_mapper("1.5").parse_config({"protocols": {"rip": {}}})
    assert parsed == get_rip_mapper("1.5").parse_config({"protocols": {"rip": None}})



def test_get_config_returns_mapper_parse(monkeypatch):
    tree = _tree()
    expected = get_rip_mapper("1.5").parse_config(tree)

    async def allow(*_args, **_kwargs):
        return None

    class FakeService:
        def get_version(self):
            return "1.5"

        def get_full_config(self, refresh=False):
            return tree

    monkeypatch.setattr("routers.rip.rip.require_read_permission", allow)
    monkeypatch.setattr(
        "routers.rip.rip.get_session_vyos_service",
        lambda _req: FakeService(),
    )

    from fastapi import FastAPI
    from fastapi.testclient import TestClient
    from routers.rip.rip import router

    app = FastAPI()
    app.include_router(router)
    client = TestClient(app)
    response = client.get("/vyos/rip/config")
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["default_distance"] == expected["default_distance"]
    assert body["interfaces"][0]["authentication_type"] == "md5"
    assert body["interfaces"][0]["split_horizon"] == "poison-reverse"
    assert body["timers"]["garbage_collection"] == 120
    assert body["default_metric"] is None
