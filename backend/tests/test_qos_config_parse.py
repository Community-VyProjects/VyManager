"""QoS GET /config parse lives on the mapper."""

from vyos_mappers.qos.qos_versions import get_qos_mapper


def _tree():
    return {
        "qos": {
            "interface": {
                "eth1": {"ingress": "POL1", "egress": "CAKE1"},
                "eth0": {"egress": "SH1"},
            },
            "policy": {
                "cake": {
                    "CAKE1": {
                        "bandwidth": "100mbit",
                        "ack-filter": {"aggressive": {}},
                        "no-split-gso": {},
                        "flow-isolation": "src-host",
                        "flow-isolation-nat": {},
                    }
                },
                "shaper": {
                    "SH1": {
                        "bandwidth": "1gbit",
                        "class": {
                            "20": {
                                "bandwidth": "50%",
                                "match": {
                                    "10": {"ip": {"dscp": "ef", "tcp": {"ack": {}}}}
                                },
                            },
                            "10": {"priority": "1", "match-group": {"MG1": {}}},
                        },
                        "default": {"bandwidth": "10%"},
                    }
                },
                "random-detect": {
                    "RD1": {
                        "precedence": {
                            "1": {"mark-probability": "10", "queue-limit": "100"}
                        }
                    }
                },
            },
            "traffic-match-group": {
                "MG1": {"description": "web", "match": {"1": {"mark": "10"}}}
            },
        }
    }


def test_empty_qos_tree():
    parsed = get_qos_mapper("1.5").parse_config({})
    assert parsed == {
        "interfaces": [],
        "policies": [],
        "traffic_match_groups": [],
    }
    assert get_qos_mapper("1.4").parse_config({"qos": "nope"})["policies"] == []


def test_qos_parses_interfaces_policies_and_match_groups():
    parsed = get_qos_mapper("1.5").parse_config(_tree())
    assert [iface["name"] for iface in parsed["interfaces"]] == ["eth0", "eth1"]
    assert parsed["interfaces"][1]["ingress"] == "POL1"
    assert [p["type"] + "/" + p["name"] for p in parsed["policies"]] == [
        "cake/CAKE1",
        "random-detect/RD1",
        "shaper/SH1",
    ]
    cake = parsed["policies"][0]
    assert cake["ack_filter"] == "aggressive"
    assert cake["no_split_gso"] is True
    assert cake["flow_isolation"] == "src-host"
    assert cake["flow_isolation_nat"] is True
    shaper = parsed["policies"][2]
    assert [cls["class_id"] for cls in shaper["classes"]] == ["10", "20"]
    assert shaper["classes"][0]["match_groups"] == ["MG1"]
    assert shaper["classes"][1]["matches"][0]["ip"]["dscp"] == "ef"
    assert shaper["classes"][1]["matches"][0]["ip"]["tcp_ack"] is True
    assert shaper["default"]["bandwidth"] == "10%"
    assert parsed["policies"][1]["precedences"][0]["mark_probability"] == "10"
    assert parsed["traffic_match_groups"][0]["name"] == "MG1"
    assert parsed["traffic_match_groups"][0]["matches"][0]["mark"] == "10"



def test_get_config_returns_mapper_parse(monkeypatch):
    tree = _tree()
    expected = get_qos_mapper("1.5").parse_config(tree)

    async def allow(*_args, **_kwargs):
        return None

    class FakeService:
        def get_version(self):
            return "1.5"

        def get_full_config(self, refresh=False):
            return tree

    monkeypatch.setattr("routers.qos.qos.require_read_permission", allow)
    monkeypatch.setattr(
        "routers.qos.qos.get_session_vyos_service",
        lambda _req: FakeService(),
    )

    from fastapi import FastAPI
    from fastapi.testclient import TestClient
    from routers.qos.qos import router

    app = FastAPI()
    app.include_router(router)
    client = TestClient(app)
    response = client.get("/vyos/qos/config")
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["interfaces"][0]["name"] == expected["interfaces"][0]["name"]
    assert body["policies"][0]["ack_filter"] == "aggressive"
    assert body["policies"][0]["no_split_gso"] is True
    assert body["traffic_match_groups"][0]["description"] == "web"
