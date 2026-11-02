"""VXLAN GET /config parse lives on the mapper (issue #966)."""

from pathlib import Path

from vyos_mappers.vxlan.vxlan_versions import get_vxlan_mapper


def _tree():
    return {
        "interfaces": {
            "vxlan": {
                "vxlan0": {
                    "address": ["192.0.2.1/24", "192.0.2.2/24"],
                    "description": "overlay",
                    "disable": {},
                    "gpe": {},
                    "group": "239.0.0.1",
                    "ip": {"adjust-mss": "1400", "enable-arp-accept": {}},
                    "ipv6": {
                        "address": {
                            "eui64": "2001:db8::/64",
                            "interface-identifier": "1:2:3:4",
                            "no-default-link-local": {},
                        },
                        "accept-dad": "2",
                    },
                    "mac": "00:11:22:33:44:55",
                    "mirror": {"ingress": "eth1"},
                    "mtu": "1450",
                    "parameters": {
                        "external": {},
                        "ip": {"df": "unset", "tos": "inherit", "ttl": "16"},
                        "ipv6": {"flowlabel": "0x1"},
                        "neighbor-suppress": {},
                        "nolearning": {},
                        "vni-filter": {},
                    },
                    "port": "4789",
                    "redirect": "eth2",
                    "remote": ["192.0.2.10", "192.0.2.11"],
                    "source-address": "192.0.2.1",
                    "source-interface": "eth0",
                    "vlan-to-vni": {
                        "10": {"vni": "10010", "description": "ten"},
                        "20": None,
                    },
                    "vni": "100",
                    "vrf": "blue",
                }
            }
        }
    }


def test_parse_config_distinctive_fields():
    parsed = get_vxlan_mapper("1.5").parse_config(_tree())
    assert parsed["total"] == 1
    iface = parsed["interfaces"][0]
    assert iface["name"] == "vxlan0"
    assert iface["addresses"] == ["192.0.2.1/24", "192.0.2.2/24"]
    assert iface["description"] == "overlay"
    assert iface["disabled"] is True
    assert iface["gpe"] is True
    assert iface["group"] == "239.0.0.1"
    assert iface["ip"]["adjust_mss"] == "1400"
    assert iface["ip"]["enable_arp_accept"] is True
    assert iface["ip"]["disable_forwarding"] is False
    assert iface["ipv6"]["accept_dad"] == "2"
    assert iface["ipv6"]["address"]["eui64"] == ["2001:db8::/64"]
    assert iface["ipv6"]["address"]["interface_identifier"] == "1:2:3:4"
    assert iface["ipv6"]["address"]["autoconf"] is False
    assert iface["ipv6"]["address"]["no_default_link_local"] is True
    assert iface["mac"] == "00:11:22:33:44:55"
    assert iface["mirror"] == {"egress": None, "ingress": "eth1"}
    # port, mtu, and vni stay strings.
    assert iface["mtu"] == "1450"
    assert iface["port"] == "4789"
    assert iface["vni"] == "100"
    assert iface["parameters"]["external"] is True
    assert iface["parameters"]["ip"] == {"df": "unset", "tos": "inherit", "ttl": "16"}
    assert iface["parameters"]["ipv6"] == {"flowlabel": "0x1"}
    assert iface["parameters"]["neighbor_suppress"] is True
    assert iface["parameters"]["nolearning"] is True
    assert iface["parameters"]["vni_filter"] is True
    assert iface["redirect"] == "eth2"
    assert iface["remotes"] == ["192.0.2.10", "192.0.2.11"]
    assert iface["source_address"] == "192.0.2.1"
    assert iface["source_interface"] == "eth0"
    assert iface["vlan_to_vni"] == [
        {"vlan_id": "10", "vni": "10010", "description": "ten"},
        {"vlan_id": "20", "vni": None, "description": None},
    ]
    assert iface["vrf"] == "blue"


def test_remote_dict_is_not_expanded():
    # Old _ensure_list did not treat a dict as multi-value keys.
    parsed = get_vxlan_mapper("1.4").parse_config(
        {"interfaces": {"vxlan": {"vxlan1": {"remote": {"192.0.2.9": {}}}}}}
    )
    assert parsed["interfaces"][0]["remotes"] == []
    assert parsed["total"] == 1


def test_empty_tree():
    parsed = get_vxlan_mapper("1.4").parse_config({})
    assert parsed == {"interfaces": [], "total": 0}
    assert parsed == get_vxlan_mapper("1.5").parse_config({"interfaces": {"vxlan": None}})


def test_vxlan_router_has_no_config_parsers():
    text = Path(__file__).resolve().parents[1].joinpath("routers/vxlan/vxlan.py").read_text()
    assert "Config Parsers" not in text


def test_get_config_returns_mapper_parse(monkeypatch):
    tree = _tree()
    expected = get_vxlan_mapper("1.5").parse_config(tree)

    async def allow(*_args, **_kwargs):
        return None

    class FakeService:
        def get_version(self):
            return "1.5"

        def get_full_config(self, refresh=False):
            return tree

    monkeypatch.setattr("routers.vxlan.vxlan.require_read_permission", allow)
    monkeypatch.setattr(
        "routers.vxlan.vxlan.get_session_vyos_service",
        lambda _req: FakeService(),
    )

    from fastapi import FastAPI
    from fastapi.testclient import TestClient
    from routers.vxlan.vxlan import router

    app = FastAPI()
    app.include_router(router)
    client = TestClient(app)
    response = client.get("/vyos/vxlan/config")
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["total"] == expected["total"]
    assert body["interfaces"][0]["gpe"] is True
    assert body["interfaces"][0]["vlan_to_vni"][0]["vlan_id"] == "10"
    assert body["interfaces"][0]["vlan_to_vni"][0]["description"] == "ten"
    assert body["interfaces"][0]["port"] == "4789"
    assert body["interfaces"][0]["ipv6"]["address"]["interface_identifier"] == "1:2:3:4"
