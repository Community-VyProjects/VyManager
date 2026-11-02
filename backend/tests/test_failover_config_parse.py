"""Failover GET /config parse lives on the mapper (issue #966)."""

from vyos_mappers.failover.failover_versions import get_failover_mapper


def _tree():
    return {
        "protocols": {
            "failover": {
                "route": {
                    "10.0.0.0/8": {
                        "next-hop": {
                            "192.0.2.1": {
                                "metric": "20",
                                "onlink": {},
                                "interface": "eth0",
                                "check": {
                                    "policy": "any-pass",
                                    "port": "8080",
                                    "timeout": "2",
                                    "type": "tcp",
                                    "target": {
                                        "192.0.2.9": {
                                            "interface": "eth1",
                                            "vrf": "blue",
                                        }
                                    },
                                },
                            }
                        },
                        "dhcp-interface": {
                            "eth2": {
                                "metric": "30",
                                "onlink": {},
                                "interface": "eth2",
                                "check": {
                                    "type": "icmp",
                                    "target": ["192.0.2.10"],
                                },
                            }
                        },
                    },
                    "192.0.2.0/24": {
                        "next-hop": {
                            "192.0.2.2": {
                                "check": {"target": "192.0.2.8", "port": "0"},
                            }
                        }
                    },
                }
            }
        }
    }


def test_1_4_targets_are_flat_and_dhcp_is_ignored():
    parsed = get_failover_mapper("1.4").parse_config(_tree())
    route = parsed["routes"][0]
    assert route["destination"] == "10.0.0.0/8"
    hop = route["next_hops"][0]
    assert hop["address"] == "192.0.2.1"
    assert hop["metric"] == 20
    assert hop["onlink"] is True
    assert hop["interface"] == "eth0"
    assert hop["check"]["policy"] == "any-pass"
    assert hop["check"]["port"] == 8080
    assert hop["check"]["timeout"] == 2
    assert hop["check"]["type"] == "tcp"
    # 1.4 target is a multi-value, not a tag node. A dict target is ignored.
    assert hop["check"]["targets"] == []
    assert route["dhcp_interfaces"] == []

    flat = parsed["routes"][1]["next_hops"][0]
    assert flat["address"] == "192.0.2.2"
    assert flat["check"]["targets"] == [
        {"address": "192.0.2.8", "interface": None, "vrf": None}
    ]
    # String "0" is truthy, so the old `if check_config.get("port")` path
    # coerces it to 0. Do not treat it as missing.
    assert flat["check"]["port"] == 0
    assert flat["metric"] is None
    assert flat["onlink"] is False


def test_1_5_targets_are_tag_nodes_and_dhcp_is_parsed():
    parsed = get_failover_mapper("1.5").parse_config(_tree())
    route = parsed["routes"][0]
    hop = route["next_hops"][0]
    assert hop["check"]["targets"] == [
        {"address": "192.0.2.9", "interface": "eth1", "vrf": "blue"}
    ]
    assert route["dhcp_interfaces"] == [
        {
            "name": "eth2",
            "check": {
                "policy": None,
                "port": None,
                "targets": [{"address": "192.0.2.10", "interface": None, "vrf": None}],
                "timeout": None,
                "type": "icmp",
            },
            "interface": "eth2",
            "metric": 30,
            "onlink": True,
        }
    ]
    # 1.5 does not treat a bare string target as a multi-value.
    assert parsed["routes"][1]["next_hops"][0]["check"]["targets"] == []


def test_latest_follows_1_5_branch():
    parsed = get_failover_mapper("latest").parse_config(_tree())
    assert parsed["routes"][0]["dhcp_interfaces"][0]["name"] == "eth2"
    assert parsed["routes"][0]["next_hops"][0]["check"]["targets"][0]["vrf"] == "blue"


def test_empty_tree_both_versions():
    for version in ("1.4", "1.5", "latest"):
        assert get_failover_mapper(version).parse_config({}) == {"routes": []}
        assert get_failover_mapper(version).parse_config(
            {"protocols": {"failover": {}}}
        ) == {"routes": []}



def test_get_config_returns_mapper_parse(monkeypatch):
    tree = _tree()
    expected = get_failover_mapper("1.5").parse_config(tree)

    async def allow(*_args, **_kwargs):
        return None

    class FakeService:
        def get_version(self):
            return "1.5"

        def get_full_config(self, refresh=False):
            return tree

    monkeypatch.setattr("routers.failover.failover.require_read_permission", allow)
    monkeypatch.setattr(
        "routers.failover.failover.get_session_vyos_service",
        lambda _req: FakeService(),
    )

    from fastapi import FastAPI
    from fastapi.testclient import TestClient
    from routers.failover.failover import router

    app = FastAPI()
    app.include_router(router)
    client = TestClient(app)
    response = client.get("/vyos/failover/config")
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["routes"][0]["dhcp_interfaces"][0]["name"] == "eth2"
    assert (
        body["routes"][0]["next_hops"][0]["check"]["targets"][0]["vrf"]
        == expected["routes"][0]["next_hops"][0]["check"]["targets"][0]["vrf"]
    )
    assert body["routes"][1]["next_hops"][0]["check"]["targets"] == []
