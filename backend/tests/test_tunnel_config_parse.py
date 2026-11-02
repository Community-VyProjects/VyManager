"""Tunnel GET /config parse lives on the mapper (issue #966)."""

from vyos_mappers.tunnel.tunnel_versions import get_tunnel_mapper


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
                        "enable-proxy-arp": {},
                        "source-validation": "strict",
                    },
                    "ipv6": {
                        "address": {
                            "autoconf": {},
                            "eui64": ["2001:db8::/64"],
                            "no-default-link-local": {},
                        },
                        "disable-forwarding": {},
                    },
                    "mirror": {"egress": "eth1", "ingress": "eth2"},
                    "mtu": "1400",
                    "parameters": {
                        "erspan": {"direction": "ingress", "hw-id": "1", "index": "2", "version": "1"},
                        "ip": {"ignore-df": {}, "key": "42", "ttl": "64"},
                        "ipv6": {"encaplimit": "4", "flowlabel": "0", "hoplimit": "64", "tclass": "0"},
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


def test_parse_config_distinctive_fields():
    parsed = get_tunnel_mapper("1.5").parse_config(_tree())
    assert parsed["total"] == 2
    tun0 = parsed["interfaces"][0]
    assert tun0["name"] == "tun0"
    assert tun0["sixrd_prefix"] == "2001:db8::/32"
    assert tun0["sixrd_relay_prefix"] == "192.0.2.0/24"
    assert tun0["addresses"] == ["192.0.2.1/24"]
    assert tun0["description"] == "edge"
    assert tun0["disabled"] is True
    assert tun0["disable_link_detect"] is True
    assert tun0["enable_multicast"] is True
    assert tun0["encapsulation"] == "gre"
    assert tun0["ip"]["adjust_mss"] == "1400"
    assert tun0["ip"]["enable_proxy_arp"] is True
    assert tun0["ip"]["disable_arp_filter"] is False
    assert tun0["ip"]["source_validation"] == "strict"
    assert tun0["ipv6"]["address"]["autoconf"] is True
    assert tun0["ipv6"]["address"]["eui64"] == ["2001:db8::/64"]
    assert tun0["ipv6"]["address"]["no_default_link_local"] is True
    assert tun0["ipv6"]["disable_forwarding"] is True
    assert tun0["mirror"] == {"egress": "eth1", "ingress": "eth2"}
    # mtu stays a string; do not coerce.
    assert tun0["mtu"] == "1400"
    assert tun0["parameters"]["erspan"]["hw_id"] == "1"
    assert tun0["parameters"]["ip"]["ignore_df"] is True
    assert tun0["parameters"]["ip"]["key"] == "42"
    assert tun0["parameters"]["ip"]["no_pmtu_discovery"] is False
    assert tun0["parameters"]["ipv6"]["encaplimit"] == "4"
    assert tun0["redirect"] == "eth3"
    assert tun0["remote"] == "192.0.2.2"
    assert tun0["source_address"] == "192.0.2.1"
    assert tun0["source_interface"] == "eth0"
    assert tun0["vrf"] == "blue"
    assert parsed["interfaces"][1]["name"] == "tun1"
    assert parsed["interfaces"][1]["disabled"] is False
    assert parsed["interfaces"][1]["addresses"] == []


def test_empty_tree():
    parsed = get_tunnel_mapper("1.4").parse_config({})
    assert parsed == {"interfaces": [], "total": 0}
    assert parsed == get_tunnel_mapper("1.5").parse_config({"interfaces": {"tunnel": {}}})
    assert parsed == get_tunnel_mapper("1.5").parse_config({"interfaces": {"tunnel": None}})



def test_get_config_returns_mapper_parse(monkeypatch):
    tree = _tree()
    expected = get_tunnel_mapper("1.5").parse_config(tree)

    async def allow(*_args, **_kwargs):
        return None

    class FakeService:
        def get_version(self):
            return "1.5"

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
    body = response.json()
    assert body["total"] == expected["total"]
    assert body["interfaces"][0]["encapsulation"] == "gre"
    assert body["interfaces"][0]["parameters"]["ip"]["key"] == "42"
    assert body["interfaces"][0]["mtu"] == "1400"
    assert body["interfaces"][1]["name"] == "tun1"
