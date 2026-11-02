"""Container GET /config parse lives on the mapper (issue #966)."""

from vyos_mappers.container.container_versions import get_container_mapper


def _tree():
    return {
        "container": {
            "name": {
                "zeta": {"disable": {}, "capability": ["NET_ADMIN"]},
                "alpha": {
                    "description": "first",
                    "device": {
                        "zdev": {"source": "/dev/z"},
                        "adev": {"source": "/dev/a", "destination": "/dev/a"},
                    },
                    "port": {
                        "web": {
                            "source": "8080",
                            "destination": "80",
                            "protocol": "tcp",
                            "listen-address": {"10.0.0.1": {}, "10.0.0.2": {}},
                        }
                    },
                    "sysctl": {"parameter": {"net.ipv4.ip_forward": {"value": "1"}}},
                    "volume": {
                        "data": {
                            "source": "/config/containers/data",
                            "destination": "/data",
                            "mode": "rw",
                        }
                    },
                },
            },
            "network": {
                "znet": {"prefix": ["10.2.0.0/24"], "no-name-server": {}},
                "anet": {
                    "description": "mac",
                    "gateway": {"10.1.0.1": {}},
                    "mtu": "1500",
                    "type": {"macvlan": {"mode": "bridge", "parent": "eth0"}},
                    "vrf": "BLUE",
                },
            },
            "registry": {
                "docker.io": {
                    "insecure": {},
                    "authentication": {"username": "user", "password": "secret"},
                    "mirror": {
                        "address": "mirror.example",
                        "host-name": "mirror",
                        "path": "/v2",
                        "port": "5000",
                    },
                }
            },
        }
    }


def test_empty_container_tree():
    parsed = get_container_mapper("1.5").parse_config({})
    assert parsed == {"containers": [], "networks": [], "registries": []}
    parsed = get_container_mapper("1.4").parse_config({"container": {}})
    assert parsed == {"containers": [], "networks": [], "registries": []}


def test_parse_sorts_and_normalises_container_tree():
    parsed = get_container_mapper("1.5").parse_config(_tree())
    assert [c["name"] for c in parsed["containers"]] == ["alpha", "zeta"]
    alpha = parsed["containers"][0]
    assert alpha["description"] == "first"
    assert [d["name"] for d in alpha["devices"]] == ["adev", "zdev"]
    assert alpha["devices"][0]["destination"] == "/dev/a"
    assert alpha["ports"][0]["listen_addresses"] == ["10.0.0.1", "10.0.0.2"]
    assert alpha["sysctl_params"][0] == {"name": "net.ipv4.ip_forward", "value": "1"}
    assert alpha["volumes"][0]["mode"] == "rw"
    assert parsed["containers"][1]["disabled"] is True
    assert parsed["containers"][1]["capabilities"] == ["NET_ADMIN"]
    assert [n["name"] for n in parsed["networks"]] == ["anet", "znet"]
    anet = parsed["networks"][0]
    assert anet["network_type"] == "macvlan"
    assert anet["macvlan_mode"] == "bridge"
    assert anet["macvlan_parent"] == "eth0"
    assert anet["gateways"] == ["10.1.0.1"]
    assert anet["vrf"] == "BLUE"
    assert parsed["networks"][1]["no_name_server"] is True
    assert parsed["networks"][1]["prefixes"] == ["10.2.0.0/24"]
    reg = parsed["registries"][0]
    assert reg["name"] == "docker.io"
    assert reg["insecure"] is True
    assert reg["authentication"]["username"] == "user"
    assert reg["mirror"]["host_name"] == "mirror"
    assert reg["mirror"]["port"] == "5000"



def test_get_config_returns_mapper_parse(monkeypatch):
    tree = _tree()
    expected = get_container_mapper("1.5").parse_config(tree)

    async def allow(*_args, **_kwargs):
        return None

    class FakeService:
        def get_version(self):
            return "1.5"

        def get_full_config(self, refresh=False):
            return tree

    monkeypatch.setattr("routers.container.container.require_read_permission", allow)
    monkeypatch.setattr(
        "routers.container.container.get_session_vyos_service",
        lambda _req: FakeService(),
    )

    from fastapi import FastAPI
    from fastapi.testclient import TestClient
    from routers.container.container import router

    app = FastAPI()
    app.include_router(router)
    client = TestClient(app)
    response = client.get("/vyos/container/config")
    assert response.status_code == 200, response.text
    body = response.json()
    assert [c["name"] for c in body["containers"]] == ["alpha", "zeta"]
    assert body["containers"][0]["devices"][0]["source"] == expected["containers"][0]["devices"][0]["source"]
    assert body["networks"][0]["macvlan_parent"] == "eth0"
    assert body["registries"][0]["authentication"]["password"] == "secret"
    assert body["containers"][0]["update_status"] is None
