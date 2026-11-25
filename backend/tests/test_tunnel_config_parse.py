"""Tunnel GET /config parse lives on the mapper (issue #966).

interfaces tunnel has the same node.def tree on VyOS 1.4 (100.64.64.4) and
1.5 (100.64.64.5), so the registry returns the shared TunnelMapper for every
version string and there is no versions package (issue #1399).
"""

from pathlib import Path

import pytest

from routers.tunnel.tunnel import TunnelConfigResponse
from vyos_mappers import CommandMapperRegistry
from vyos_mappers.tunnel import TunnelMapper

ROLLING = "2026.09.23-0027-rolling"
VERSIONS = ["1.4", "1.4.3", "VyOS 1.4.3", "1.5", ROLLING, "latest", "1.6", ""]

TUNNEL_DIR = Path(__file__).resolve().parents[1] / "vyos_mappers" / "tunnel"


def _mapper(version: str) -> TunnelMapper:
    mapper = CommandMapperRegistry.get_mapper("tunnel", version)
    assert isinstance(mapper, TunnelMapper)
    return mapper


def _tree():
    return {
        "interfaces": {
            "tunnel": {
                "tun0": {
                    "6rd-prefix": "2001:db8::/32",
                    "6rd-relay-prefix": "192.0.2.0/24",
                    "address": "192.0.2.1/24",
                    "description": "edge",
                    "disable": {},
                    "disable-link-detect": {},
                    "enable-multicast": {},
                    "encapsulation": "gre",
                    "ip": {
                        "adjust-mss": "1400",
                        "arp-cache-timeout": "30",
                        "disable-arp-filter": {},
                        "disable-forwarding": {},
                        "enable-arp-accept": {},
                        "enable-arp-announce": {},
                        "enable-arp-ignore": {},
                        "enable-directed-broadcast": {},
                        "enable-proxy-arp": {},
                        "proxy-arp-pvlan": {},
                        "source-validation": "strict",
                    },
                    "ipv6": {
                        "accept-dad": "1",
                        "address": {
                            "autoconf": {},
                            "eui64": ["2001:db8::/64", "2001:db8:1::/64"],
                            "no-default-link-local": {},
                        },
                        "adjust-mss": "clamp-mss-to-pmtu",
                        "base-reachable-time": "30",
                        "disable-forwarding": {},
                        "dup-addr-detect-transmits": "0",
                        "source-validation": "loose",
                    },
                    "mirror": {"egress": "eth1", "ingress": "eth2"},
                    "mtu": "1400",
                    "parameters": {
                        "erspan": {"direction": "ingress", "hw-id": "1", "index": "2", "version": "1"},
                        "ip": {
                            "ignore-df": {},
                            "key": "42",
                            "no-pmtu-discovery": {},
                            "tos": "8",
                            "ttl": "64",
                        },
                        "ipv6": {"encaplimit": "none", "flowlabel": "inherit", "hoplimit": "64", "tclass": "0x10"},
                    },
                    "redirect": "eth3",
                    "remote": "192.0.2.2",
                    "source-address": "192.0.2.1",
                    "source-interface": "eth0",
                    "vrf": "blue",
                },
                "tun1": None,
            }
        }
    }


@pytest.mark.parametrize("version", VERSIONS)
def test_registry_returns_the_shared_class(version):
    mapper = CommandMapperRegistry.get_mapper("tunnel", version)
    assert type(mapper) is TunnelMapper
    assert mapper.version == version


def test_no_versions_package():
    versions = TUNNEL_DIR / "tunnel_versions"
    for name in ("__init__.py", "v1_4.py", "v1_5.py"):
        assert not (versions / name).exists()


def test_parse_config_every_leaf():
    parsed = _mapper(ROLLING).parse_config(_tree())
    assert parsed["total"] == 2
    assert parsed["interfaces"][0] == {
        "name": "tun0",
        "sixrd_prefix": "2001:db8::/32",
        "sixrd_relay_prefix": "192.0.2.0/24",
        "addresses": ["192.0.2.1/24"],
        "description": "edge",
        "disabled": True,
        "disable_link_detect": True,
        "enable_multicast": True,
        "encapsulation": "gre",
        "ip": {
            "adjust_mss": "1400",
            "arp_cache_timeout": "30",
            "disable_arp_filter": True,
            "disable_forwarding": True,
            "enable_arp_accept": True,
            "enable_arp_announce": True,
            "enable_arp_ignore": True,
            "enable_directed_broadcast": True,
            "enable_proxy_arp": True,
            "proxy_arp_pvlan": True,
            "source_validation": "strict",
        },
        "ipv6": {
            "accept_dad": "1",
            "address": {
                "autoconf": True,
                "eui64": ["2001:db8::/64", "2001:db8:1::/64"],
                "no_default_link_local": True,
            },
            "adjust_mss": "clamp-mss-to-pmtu",
            "base_reachable_time": "30",
            "disable_forwarding": True,
            "dup_addr_detect_transmits": "0",
            "source_validation": "loose",
        },
        "mirror": {"egress": "eth1", "ingress": "eth2"},
        # mtu stays a string; do not coerce.
        "mtu": "1400",
        "parameters": {
            "erspan": {"direction": "ingress", "hw_id": "1", "index": "2", "version": "1"},
            "ip": {"ignore_df": True, "key": "42", "no_pmtu_discovery": True, "tos": "8", "ttl": "64"},
            "ipv6": {"encaplimit": "none", "flowlabel": "inherit", "hoplimit": "64", "tclass": "0x10"},
        },
        "redirect": "eth3",
        "remote": "192.0.2.2",
        "source_address": "192.0.2.1",
        "source_interface": "eth0",
        "vrf": "blue",
    }
    tun1 = parsed["interfaces"][1]
    assert tun1["name"] == "tun1"
    assert tun1["disabled"] is False
    assert tun1["addresses"] == []
    assert tun1["ipv6"]["address"]["eui64"] == []


@pytest.mark.parametrize("version", ["1.4", ROLLING])
def test_parse_config_fits_the_response_model(version):
    parsed = _mapper(version).parse_config(_tree())
    assert TunnelConfigResponse(**parsed).model_dump() == parsed


def test_empty_tree():
    parsed = _mapper("1.4").parse_config({})
    assert parsed == {"interfaces": [], "total": 0}
    assert parsed == _mapper("1.5").parse_config({"interfaces": {"tunnel": {}}})
    assert parsed == _mapper(ROLLING).parse_config({"interfaces": {"tunnel": None}})


def test_get_config_returns_mapper_parse(monkeypatch):
    tree = _tree()
    expected = _mapper(ROLLING).parse_config(tree)

    async def allow(*_args, **_kwargs):
        return None

    class FakeService:
        def get_version(self):
            return ROLLING

        def get_full_config(self, refresh=False):
            return tree

    monkeypatch.setattr("routers.tunnel.tunnel.require_read_permission", allow)
    monkeypatch.setattr(
        "routers.tunnel.tunnel.get_session_vyos_service",
        lambda _req: FakeService(),
    )

    from fastapi import FastAPI
    from fastapi.testclient import TestClient
    from routers.tunnel.tunnel import router

    app = FastAPI()
    app.include_router(router)
    client = TestClient(app)
    response = client.get("/vyos/tunnel/config")
    assert response.status_code == 200, response.text
    assert response.json() == expected
