"""SNMP GET /config parse lives on the mapper (issue #966)."""

from pathlib import Path

from vyos_mappers.snmp.snmp_versions import get_snmp_mapper


def _tree():
    return {
        "service": {
            "snmp": {
                "contact": "noc@example.com",
                "location": "rack-1",
                "protocol": "udp",
                "listen-address": {
                    "10.0.0.2": None,
                    "10.0.0.1": {"port": "161"},
                },
                "community": {
                    "public": {
                        "authorization": "ro",
                        "client": ["10.1.0.2", "10.1.0.1"],
                        "network": {"10.2.0.0/24": {}},
                    },
                    "private": None,
                },
                "smux-peer": ["1.3.6.1.4.1.99", "1.3.6.1.4.1.1"],
                "mib": {
                    "interface": {"eth": {}, "lo": {}},
                    "interface-max": "100",
                },
                "script-extensions": {
                    "extension-name": {
                        "disk": {"script": "/config/scripts/disk.sh"},
                        "empty": None,
                    }
                },
                "trap-target": {
                    "192.0.2.5": {"community": "public", "port": "162"},
                },
                "v3": {
                    "engineid": "0x80001f88",
                    "group": {
                        "admins": {"mode": "rw", "seclevel": "priv", "view": "all"},
                        "blank": None,
                    },
                    "user": {
                        "alice": {
                            "group": "admins",
                            "mode": "rw",
                            "auth": {"type": "sha", "plaintext-password": "secret"},
                            "privacy": {"type": "aes", "encrypted-password": "enc"},
                        },
                        "bob": None,
                    },
                    "view": {
                        "all": {
                            "oid": {
                                "1.3.6": {"mask": "ff", "exclude": ["1.3.6.1.2", "1.3.6.1.1"]},
                                "1.3.6.1.2.1": None,
                            }
                        }
                    },
                    "trap-target": {
                        "192.0.2.9": {
                            "user": "alice",
                            "type": "inform",
                            "protocol": "udp",
                            "port": "162",
                            "auth": {"type": "md5"},
                        }
                    },
                },
            }
        }
    }


def _empty():
    return {
        "contact": None,
        "description": None,
        "location": None,
        "protocol": None,
        "trap_source": None,
        "vrf": None,
        "smux_peers": [],
        "oid_enable": [],
        "listen_addresses": [],
        "communities": [],
        "mib_interfaces": [],
        "mib_interface_max": None,
        "script_extensions": [],
        "trap_targets": [],
        "v3": {
            "engineid": None,
            "groups": [],
            "users": [],
            "views": [],
            "trap_targets": [],
        },
    }


def test_parse_config_is_explicit_and_version_falls_through():
    mapper = get_snmp_mapper("1.4")
    assert "parse_config" in type(mapper).__dict__
    assert mapper.version == "1.4"
    assert get_snmp_mapper("1.5").version == "1.5"


def test_communities_v3_and_listen_addresses():
    parsed = get_snmp_mapper("1.5").parse_config(_tree())
    assert type(parsed) is dict
    assert parsed["contact"] == "noc@example.com"
    assert parsed["location"] == "rack-1"
    assert parsed["smux_peers"] == ["1.3.6.1.4.1.1", "1.3.6.1.4.1.99"]
    assert parsed["listen_addresses"] == [
        {"address": "10.0.0.1", "port": "161"},
        {"address": "10.0.0.2", "port": None},
    ]
    by_name = {item["name"]: item for item in parsed["communities"]}
    assert by_name["public"]["authorization"] == "ro"
    assert by_name["public"]["clients"] == ["10.1.0.1", "10.1.0.2"]
    assert by_name["public"]["networks"] == ["10.2.0.0/24"]
    assert by_name["private"]["clients"] == []
    assert parsed["mib_interfaces"] == ["eth", "lo"]
    assert parsed["mib_interface_max"] == "100"
    extensions = {item["name"]: item for item in parsed["script_extensions"]}
    assert extensions["disk"]["script"] == "/config/scripts/disk.sh"
    assert extensions["empty"]["script"] is None
    assert parsed["trap_targets"][0] == {
        "address": "192.0.2.5",
        "community": "public",
        "port": "162",
    }
    v3 = parsed["v3"]
    assert v3["engineid"] == "0x80001f88"
    groups = {item["name"]: item for item in v3["groups"]}
    assert groups["admins"]["seclevel"] == "priv"
    assert groups["blank"]["mode"] is None
    users = {item["name"]: item for item in v3["users"]}
    assert users["alice"]["auth"]["type"] == "sha"
    assert users["alice"]["auth"]["plaintext_password"] == "secret"
    assert users["alice"]["privacy"]["encrypted_password"] == "enc"
    assert users["bob"]["auth"] is None
    assert users["bob"]["privacy"] is None
    oids = {item["oid"]: item for item in v3["views"][0]["oids"]}
    assert oids["1.3.6"]["exclude"] == ["1.3.6.1.1", "1.3.6.1.2"]
    assert oids["1.3.6.1.2.1"]["mask"] is None
    trap = v3["trap_targets"][0]
    assert trap["user"] == "alice"
    assert trap["type"] == "inform"
    assert trap["auth"]["type"] == "md5"
    assert trap["privacy"] is None
    assert get_snmp_mapper("1.4").parse_config(_tree()) == parsed


def test_empty_tree():
    assert get_snmp_mapper("1.4").parse_config({}) == _empty()
    assert get_snmp_mapper("1.5").parse_config({"service": {}}) == _empty()
    assert get_snmp_mapper("1.5").parse_config({"service": {"snmp": {}}}) == _empty()


def test_router_parse_helpers_moved():
    text = Path(__file__).resolve().parents[1].joinpath("routers/snmp/snmp.py").read_text()
    assert "def _parse_" not in text
    parse_src = (
        Path(__file__)
        .resolve()
        .parents[1]
        .joinpath("vyos_mappers/snmp/config_parse.py")
        .read_text()
    )
    assert "pydantic" not in parse_src
    assert "fastapi" not in parse_src
    assert "routers" not in parse_src


def test_get_config_returns_mapper_parse(monkeypatch):
    tree = _tree()
    expected = get_snmp_mapper("1.5").parse_config(tree)

    async def allow(*_args, **_kwargs):
        return None

    class FakeService:
        def get_version(self):
            return "1.5"

        def get_full_config(self, refresh=False):
            return tree

    monkeypatch.setattr("routers.snmp.snmp.require_read_permission", allow)
    monkeypatch.setattr(
        "routers.snmp.snmp.get_session_vyos_service",
        lambda _req: FakeService(),
    )

    from fastapi import FastAPI
    from fastapi.testclient import TestClient
    from routers.snmp.snmp import router

    app = FastAPI()
    app.include_router(router)
    client = TestClient(app)
    response = client.get("/vyos/snmp/config")
    assert response.status_code == 200, response.text
    body = response.json()
    communities = {item["name"]: item for item in body["communities"]}
    assert body["contact"] == expected["contact"]
    assert communities["public"]["networks"] == ["10.2.0.0/24"]
    assert body["v3"]["users"][0]["auth"]["plaintext_password"] == "secret"
    assert body["v3"]["trap_targets"][0]["privacy"] is None
