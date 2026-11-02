"""Router advertisement GET /config parse lives on the mapper (issue #966)."""

from pathlib import Path

from vyos_mappers.router_advert.router_advert_versions import get_router_advert_mapper


def _tree():
    return {
        "service": {
            "router-advert": {
                "interface": {
                    "eth0": {
                        "auto-ignore": "2001:db8::/64",
                        "captive-portal": "https://portal.example",
                        "default-lifetime": "1800",
                        "default-preference": "high",
                        "dnssl": ["b.example", "a.example"],
                        "hop-limit": "0",
                        "interval": {"max": "600", "min": "200"},
                        "link-mtu": "1500",
                        "managed-flag": {},
                        "name-server": "2001:db8::53",
                        "name-server-lifetime": "600",
                        "nat64prefix": {
                            "64:ff9b::/96": {"valid-lifetime": "infinity"},
                            "2001:db8:64::/96": None,
                        },
                        "no-send-advert": {},
                        "other-config-flag": {},
                        "prefix": {
                            "2001:db8:1::/64": {
                                "base-interface": "eth1",
                                "decrement-lifetime": {},
                                "deprecate-prefix": {},
                                "no-autonomous-flag": {},
                                "no-on-link-flag": {},
                                "preferred-lifetime": "3600",
                                "valid-lifetime": "infinity",
                            },
                            "2001:db8:2::/64": None,
                        },
                        "reachable-time": "30000",
                        "retrans-timer": "1000",
                        "route": {
                            "::/0": {
                                "no-remove-route": {},
                                "route-preference": "low",
                                "valid-lifetime": "infinity",
                            }
                        },
                        "source-address": ["2001:db8::1", "2001:db8::2"],
                    },
                    "eth1": None,
                }
            }
        }
    }


def test_parse_config_is_explicit_and_version_falls_through():
    mapper = get_router_advert_mapper("1.4")
    assert "parse_config" in type(mapper).__dict__
    assert mapper.version == "1.4"
    assert get_router_advert_mapper("1.5").version == "1.5"


def test_interface_prefix_and_route_fields():
    parsed = get_router_advert_mapper("1.5").parse_config(_tree())
    assert type(parsed) is dict
    by_name = {item["name"]: item for item in parsed["interfaces"]}
    eth0 = by_name["eth0"]
    assert eth0["hop_limit"] == 0
    assert eth0["interval_max"] == 600
    assert eth0["interval_min"] == 200
    assert eth0["link_mtu"] == 1500
    assert eth0["captive_portal"] == "https://portal.example"
    assert eth0["auto_ignore"] == ["2001:db8::/64"]
    assert eth0["dnssl"] == ["b.example", "a.example"]
    assert eth0["name_server"] == ["2001:db8::53"]
    assert eth0["name_server_lifetime"] == 600
    assert eth0["managed_flag"] is True
    assert eth0["other_config_flag"] is True
    assert eth0["no_send_advert"] is True
    assert eth0["no_send_interval"] is False
    assert eth0["source_address"] == ["2001:db8::1", "2001:db8::2"]
    prefixes = {item["prefix"]: item for item in eth0["prefixes"]}
    assert prefixes["2001:db8:1::/64"]["base_interface"] == "eth1"
    assert prefixes["2001:db8:1::/64"]["decrement_lifetime"] is True
    assert prefixes["2001:db8:1::/64"]["valid_lifetime"] == "infinity"
    assert prefixes["2001:db8:1::/64"]["preferred_lifetime"] == "3600"
    assert prefixes["2001:db8:2::/64"]["base_interface"] is None
    assert prefixes["2001:db8:2::/64"]["no_on_link_flag"] is False
    nat64 = {item["prefix"]: item for item in eth0["nat64_prefixes"]}
    assert nat64["64:ff9b::/96"]["valid_lifetime"] == "infinity"
    assert nat64["2001:db8:64::/96"]["valid_lifetime"] is None
    assert eth0["routes"] == [
        {
            "route": "::/0",
            "no_remove_route": True,
            "route_preference": "low",
            "valid_lifetime": "infinity",
        }
    ]
    eth1 = by_name["eth1"]
    assert eth1["hop_limit"] is None
    assert eth1["managed_flag"] is False
    assert eth1["prefixes"] == []
    assert eth1["captive_portal"] is None
    assert get_router_advert_mapper("1.4").parse_config(_tree()) == parsed


def test_empty_tree():
    empty = {"interfaces": []}
    assert get_router_advert_mapper("1.4").parse_config({}) == empty
    assert get_router_advert_mapper("1.5").parse_config({"service": {}}) == empty
    assert (
        get_router_advert_mapper("1.5").parse_config(
            {"service": {"router-advert": {}}}
        )
        == empty
    )


def test_router_has_no_parse_helpers():
    text = (
        Path(__file__)
        .resolve()
        .parents[1]
        .joinpath("routers/router_advert/router_advert.py")
        .read_text()
    )
    assert "def _parse_" not in text
    assert "def _to_list" not in text
    parse_src = (
        Path(__file__)
        .resolve()
        .parents[1]
        .joinpath("vyos_mappers/router_advert/config_parse.py")
        .read_text()
    )
    assert "pydantic" not in parse_src
    assert "fastapi" not in parse_src
    assert "routers" not in parse_src


def test_get_config_returns_mapper_parse(monkeypatch):
    tree = _tree()
    expected = get_router_advert_mapper("1.5").parse_config(tree)

    async def allow(*_args, **_kwargs):
        return None

    class FakeService:
        def get_version(self):
            return "1.5"

        def get_full_config(self, refresh=False):
            return tree

    monkeypatch.setattr(
        "routers.router_advert.router_advert.require_read_permission", allow
    )
    monkeypatch.setattr(
        "routers.router_advert.router_advert.get_session_vyos_service",
        lambda _req: FakeService(),
    )

    from fastapi import FastAPI
    from fastapi.testclient import TestClient
    from routers.router_advert.router_advert import router

    app = FastAPI()
    app.include_router(router)
    client = TestClient(app)
    response = client.get("/vyos/router-advert/config")
    assert response.status_code == 200, response.text
    body = response.json()
    by_name = {item["name"]: item for item in body["interfaces"]}
    assert by_name["eth0"]["hop_limit"] == expected["interfaces"][0]["hop_limit"] == 0
    assert by_name["eth0"]["prefixes"][0]["base_interface"] == "eth1"
    assert by_name["eth0"]["nat64_prefixes"][0]["valid_lifetime"] == "infinity"
    assert by_name["eth1"]["prefixes"] == []
    assert by_name["eth0"]["captive_portal"] == "https://portal.example"
