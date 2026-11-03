"""IGMP proxy GET /config parse lives on the mapper (issue #966)."""

import pytest

from vyos_mappers.base import CommandMapperRegistry
from vyos_mappers.igmp_proxy import IgmpProxyMapper


def _tree():
    return {
        "protocols": {
            "igmp-proxy": {
                "disable": {},
                "disable-quickleave": {},
                "interface": {
                    "eth0": {
                        "role": "upstream",
                        "threshold": "12",
                        "alt-subnet": "10.0.0.0/24",
                        "whitelist": ["239.0.0.2/32", "239.0.0.1/32"],
                    },
                    "eth1": {
                        "role": "downstream",
                        "threshold": 0,
                        "alt-subnet": ["10.2.0.0/24", "10.1.0.0/24"],
                        "whitelist": {"10.9.0.0/24": {}},
                    },
                    "eth2": None,
                },
            }
        }
    }


def _mapper(version="1.5"):
    return CommandMapperRegistry.get_mapper("igmp_proxy", version)


def test_parse_config_is_on_the_registered_class():
    assert "parse_config" in IgmpProxyMapper.__dict__
    mapper = _mapper("1.5.0")
    assert isinstance(mapper, IgmpProxyMapper)
    assert mapper.version == "1.5.0"


def test_interfaces_keep_router_list_and_threshold_rules():
    parsed = _mapper().parse_config(_tree())
    assert parsed["disabled"] is True
    assert parsed["disable_quickleave"] is True
    assert [iface["name"] for iface in parsed["interfaces"]] == ["eth0", "eth1", "eth2"]
    eth0, eth1, eth2 = parsed["interfaces"]
    assert eth0["role"] == "upstream"
    assert eth0["threshold"] == 12
    assert eth0["alt_subnets"] == ["10.0.0.0/24"]
    assert eth0["whitelists"] == ["239.0.0.2/32", "239.0.0.1/32"]
    assert eth1["threshold"] is None
    assert eth1["alt_subnets"] == ["10.2.0.0/24", "10.1.0.0/24"]
    assert eth1["whitelists"] == []
    assert eth2 == {
        "name": "eth2",
        "role": None,
        "threshold": None,
        "alt_subnets": [],
        "whitelists": [],
    }


def test_invalid_threshold_is_not_swallowed():
    with pytest.raises(ValueError):
        _mapper().parse_config(
            {
                "protocols": {
                    "igmp-proxy": {"interface": {"eth0": {"threshold": "nope"}}}
                }
            }
        )


def test_empty_tree():
    empty = {"disabled": False, "disable_quickleave": False, "interfaces": []}
    assert _mapper("1.4").parse_config({}) == empty
    assert _mapper().parse_config({"protocols": {"igmp-proxy": {}}}) == empty



def test_get_config_returns_mapper_parse(monkeypatch):
    tree = _tree()
    expected = _mapper("1.5").parse_config(tree)

    async def allow(*_args, **_kwargs):
        return None

    class FakeService:
        def get_version(self):
            return "1.5"

        def get_full_config(self, refresh=False):
            return tree

    monkeypatch.setattr("routers.igmp_proxy.igmp_proxy.require_read_permission", allow)
    monkeypatch.setattr(
        "routers.igmp_proxy.igmp_proxy.get_session_vyos_service",
        lambda _req: FakeService(),
    )

    from fastapi import FastAPI
    from fastapi.testclient import TestClient
    from routers.igmp_proxy.igmp_proxy import router

    app = FastAPI()
    app.include_router(router)
    response = TestClient(app).get("/vyos/igmp-proxy/config")
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["disabled"] is True
    assert body["disable_quickleave"] is True
    assert body["interfaces"][0]["threshold"] == expected["interfaces"][0]["threshold"]
    assert body["interfaces"][1]["whitelists"] == []
    assert body["interfaces"][1]["alt_subnets"] == ["10.2.0.0/24", "10.1.0.0/24"]
