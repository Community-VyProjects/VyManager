"""NDP proxy GET /config parse lives on the mapper (issue #966)."""

from pathlib import Path

import pytest

from vyos_mappers.ndp_proxy.ndp_proxy_versions import get_ndp_proxy_mapper


def _tree():
    return {
        "service": {
            "ndp-proxy": {
                "route-refresh": "45000",
                "interface": {
                    "eth1": None,
                    "eth0": {
                        "disable": {},
                        "enable-router-bit": {},
                        "timeout": "800",
                        "ttl": "20000",
                        "prefix": {
                            "2001:db8::/64": {
                                "disable": {},
                                "mode": "interface",
                                "interface": "eth2",
                            },
                            "2001:db8:1::/64": None,
                        },
                    },
                },
            }
        }
    }


def test_parse_config_is_explicit_and_version_falls_through():
    mapper = get_ndp_proxy_mapper("1.4")
    assert "parse_config" in type(mapper).__dict__
    assert mapper.version == "1.4"


def test_route_refresh_and_prefixes_keep_router_coercion():
    parsed = get_ndp_proxy_mapper("1.5").parse_config(_tree())
    assert parsed["route_refresh"] == 45000
    assert [iface["name"] for iface in parsed["interfaces"]] == ["eth1", "eth0"]
    empty = parsed["interfaces"][0]
    assert empty["disabled"] is False
    assert empty["timeout"] is None
    assert empty["prefixes"] == []
    eth0 = parsed["interfaces"][1]
    assert eth0["disabled"] is True
    assert eth0["enable_router_bit"] is True
    assert eth0["timeout"] == 800
    assert eth0["ttl"] == 20000
    assert eth0["prefixes"] == [
        {
            "prefix": "2001:db8::/64",
            "disabled": True,
            "mode": "interface",
            "interface": "eth2",
        },
        {
            "prefix": "2001:db8:1::/64",
            "disabled": False,
            "mode": None,
            "interface": None,
        },
    ]
    assert get_ndp_proxy_mapper("1.4").parse_config(_tree()) == parsed


def test_invalid_route_refresh_is_not_swallowed():
    with pytest.raises(ValueError):
        get_ndp_proxy_mapper("1.5").parse_config(
            {"service": {"ndp-proxy": {"route-refresh": "nope"}}}
        )


def test_empty_tree():
    empty = {"route_refresh": None, "interfaces": []}
    assert get_ndp_proxy_mapper("1.4").parse_config({}) == empty
    assert get_ndp_proxy_mapper("1.5").parse_config({"service": {"ndp-proxy": {}}}) == empty


def test_router_has_no_config_parsers_section():
    text = (
        Path(__file__)
        .resolve()
        .parents[1]
        .joinpath("routers/ndp_proxy/ndp_proxy.py")
        .read_text()
    )
    assert "Config Parsers" not in text


def test_get_config_returns_mapper_parse(monkeypatch):
    tree = _tree()
    expected = get_ndp_proxy_mapper("1.5").parse_config(tree)

    async def allow(*_args, **_kwargs):
        return None

    class FakeService:
        def get_version(self):
            return "1.5"

        def get_full_config(self, refresh=False):
            return tree

    monkeypatch.setattr("routers.ndp_proxy.ndp_proxy.require_read_permission", allow)
    monkeypatch.setattr(
        "routers.ndp_proxy.ndp_proxy.get_session_vyos_service",
        lambda _req: FakeService(),
    )

    from fastapi import FastAPI
    from fastapi.testclient import TestClient
    from routers.ndp_proxy.ndp_proxy import router

    app = FastAPI()
    app.include_router(router)
    response = TestClient(app).get("/vyos/ndp-proxy/config")
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["route_refresh"] == expected["route_refresh"]
    assert body["interfaces"][1]["timeout"] == 800
    assert body["interfaces"][1]["prefixes"][0]["mode"] == "interface"
    assert body["interfaces"][0]["prefixes"] == []
