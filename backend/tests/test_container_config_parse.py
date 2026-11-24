"""Container GET /config parse lives on the mapper (issue #966)."""

from routers.container.container import ContainerConfig, ContainerInstance
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
    empty = {"containers": [], "networks": [], "registries": []}
    parsed = get_container_mapper("1.5").parse_config({})
    assert parsed == {"configured": False, **empty}
    parsed = get_container_mapper("1.4").parse_config({"container": {}})
    assert parsed == {"configured": True, **empty}


def _full_tree():
    """Every leaf the 1.5 lab has, set once."""
    return {
        "container": {
            "name": {
                "web": {
                    "image": "nginx:1.27",
                    "description": "web",
                    "disable": {},
                    "allow-host-networks": {},
                    "allow-host-cgroups": {},
                    "allow-host-pid": {},
                    "privileged": {},
                    "arguments": "--debug",
                    "command": "/bin/sh",
                    "entrypoint": "/init",
                    "cpu-quota": "1.5",
                    "memory": "512",
                    "shared-memory": "64",
                    "uid": "1000",
                    "gid": "1000",
                    "host-name": "web1",
                    "log-driver": "journald",
                    "restart": "always",
                    "stop-timeout": "30",
                    "health-check": {"command": "true", "interval": "disable", "retry": "0", "timeout": "5"},
                    "capability": ["net-admin", "chown"],
                    "name-server": "192.0.2.53",
                    "device": {"tty": {"source": "/dev/ttyS0", "destination": "/dev/ttyS0"}},
                    "environment": {"TZ": {"value": "UTC"}},
                    "label": {"app": {"value": "web"}},
                    "network": {"lan": {"address": "192.0.2.10", "mac": "00:53:00:00:00:01"}},
                    "port": {"http": {"source": "8080", "destination": "80", "protocol": "tcp", "listen-address": "192.0.2.1"}},
                    "sysctl": {"parameter": {"net.ipv4.ip_forward": {"value": "1"}}},
                    "tmpfs": {"cache": {"destination": "/cache", "size": "64"}},
                    "volume": {"data": {"source": "/config/containers/web", "destination": "/data", "mode": "ro", "propagation": "rshared"}},
                }
            },
            "network": {
                "lan": {
                    "description": "lan",
                    "gateway": "192.0.2.1",
                    "mtu": "1500",
                    "no-name-server": {},
                    "prefix": "192.0.2.0/24",
                    "type": {"bridge": {}},
                    "vrf": "blue",
                }
            },
            "registry": {
                "ghcr.io": {
                    "disable": {},
                    "insecure": {},
                    "authentication": {"username": "bot", "password": "secret"},
                    "mirror": {"host-name": "mirror.example.com", "path": "/v2", "port": "5000"},
                }
            },
        }
    }


def test_every_leaf_parses_into_the_response_models():
    parsed = get_container_mapper("1.5").parse_config(_full_tree())
    model = ContainerConfig(
        configured=parsed["configured"],
        containers=[ContainerInstance(**c) for c in parsed["containers"]],
        networks=parsed["networks"],
        registries=parsed["registries"],
    )
    web = model.containers[0]
    assert web.allow_host_cgroups is True
    assert web.stop_timeout == "30"
    assert web.health_check is not None
    assert web.health_check.model_dump() == {"command": "true", "interval": "disable", "retry": "0", "timeout": "5"}
    assert web.log_driver == "journald"
    assert web.capabilities == ["net-admin", "chown"]
    assert web.name_servers == ["192.0.2.53"]
    assert web.networks[0].model_dump() == {"name": "lan", "addresses": ["192.0.2.10"], "mac": "00:53:00:00:00:01"}
    assert web.ports[0].listen_addresses == ["192.0.2.1"]
    assert web.tmpfs_mounts[0].size == "64"
    assert web.volumes[0].propagation == "rshared"
    lan = model.networks[0]
    assert (lan.gateways, lan.mtu, lan.network_type, lan.prefixes) == (["192.0.2.1"], "1500", "bridge", ["192.0.2.0/24"])
    reg = model.registries[0]
    assert reg.disabled and reg.insecure
    assert reg.authentication is not None and reg.authentication.password == "***"
    assert reg.mirror is not None and reg.mirror.host_name == "mirror.example.com"
    assert "secret" not in model.model_dump_json()


def test_bare_nodes_parse_by_key_membership():
    tree = {
        "container": {
            "name": {"web": {"image": "nginx", "health-check": {}}},
            "registry": {"ghcr.io": {"mirror": {}, "authentication": {}}},
        }
    }
    parsed = get_container_mapper("1.5").parse_config(tree)
    assert parsed["containers"][0]["health_check"] == {"command": None, "interval": None, "retry": None, "timeout": None}
    assert parsed["containers"][0]["networks"] == []
    reg = parsed["registries"][0]
    assert reg["mirror"] == {"address": None, "host_name": None, "path": None, "port": None}
    assert reg["authentication"] == {"username": None, "password": None}
    unset = get_container_mapper("1.5").parse_config({"container": {"name": {"web": {}}}})["containers"][0]
    assert unset["health_check"] is None
    assert unset["stop_timeout"] is None
    assert unset["allow_host_cgroups"] is False


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
    assert body["registries"][0]["authentication"] == {"username": "user", "password": "***"}
    assert "secret" not in response.text
    assert body["containers"][0]["update_status"] is None
    assert body["configured"] is True


def test_registry_password_is_masked():
    """The registry credential never leaves the backend; an unset one stays None."""
    tree = _tree()
    tree["container"]["registry"]["quay.io"] = {"authentication": {"username": "bot"}}
    for version in ("1.4", "1.5"):
        regs = get_container_mapper(version).parse_config(tree)["registries"]
        assert [r["authentication"] for r in regs] == [
            {"username": "user", "password": "***"},
            {"username": "bot", "password": None},
        ]
