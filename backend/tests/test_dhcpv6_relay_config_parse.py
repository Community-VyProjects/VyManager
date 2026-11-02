"""DHCPv6 relay GET /config parse lives on the mapper (issue #966)."""

from pathlib import Path

from vyos_mappers.dhcpv6_relay.dhcpv6_relay_versions import get_dhcpv6_relay_mapper


def _tree():
    return {
        "service": {
            "dhcpv6-relay": {
                "disable": {},
                "max-hop-count": "8",
                "use-interface-id-option": {},
                "listen-interface": {
                    "eth1": {"address": "2001:db8::2"},
                    "eth0": {"address": 1},
                    "eth2": None,
                },
                "upstream-interface": {
                    "eth4": {"address": ["2001:db8::b", "2001:db8::a"]},
                    "eth3": {"address": {"2001:db8::2": {}, "2001:db8::1": {}}},
                    "eth5": {"address": "2001:db8::9"},
                    "eth6": None,
                },
            }
        }
    }


def _empty():
    return {
        "disabled": False,
        "max_hop_count": None,
        "use_interface_id_option": False,
        "listen_interfaces": [],
        "upstream_interfaces": [],
    }


def test_parse_config_is_explicit_and_version_falls_through():
    mapper = get_dhcpv6_relay_mapper("1.4")
    assert "parse_config" in type(mapper).__dict__
    assert mapper.version == "1.4"


def test_interfaces_sorted_and_hop_count_coerced():
    parsed = get_dhcpv6_relay_mapper("1.5").parse_config(_tree())
    assert parsed["disabled"] is True
    assert parsed["max_hop_count"] == 8
    assert parsed["use_interface_id_option"] is True
    assert parsed["listen_interfaces"] == [
        {"interface": "eth0", "address": "1"},
        {"interface": "eth1", "address": "2001:db8::2"},
        {"interface": "eth2", "address": None},
    ]
    by_iface = {
        item["interface"]: item["addresses"] for item in parsed["upstream_interfaces"]
    }
    assert list(by_iface) == ["eth3", "eth4", "eth5", "eth6"]
    assert by_iface["eth3"] == ["2001:db8::1", "2001:db8::2"]
    assert by_iface["eth4"] == ["2001:db8::a", "2001:db8::b"]
    assert by_iface["eth5"] == ["2001:db8::9"]
    assert by_iface["eth6"] == []
    bad = get_dhcpv6_relay_mapper("1.4").parse_config(
        {"service": {"dhcpv6-relay": {"max-hop-count": "nope"}}}
    )
    assert bad["max_hop_count"] is None
    assert bad["disabled"] is False


def test_empty_tree():
    assert get_dhcpv6_relay_mapper("1.5").parse_config({}) == _empty()
    assert get_dhcpv6_relay_mapper("1.4").parse_config(
        {"service": {"dhcpv6-relay": {}}}
    ) == _empty()


def test_router_has_no_config_parsers_section():
    text = (
        Path(__file__)
        .resolve()
        .parents[1]
        .joinpath("routers/dhcpv6_relay/dhcpv6_relay.py")
        .read_text()
    )
    assert "Config Parsers" not in text


def test_get_config_returns_mapper_parse(monkeypatch):
    tree = _tree()
    expected = get_dhcpv6_relay_mapper("1.5").parse_config(tree)

    async def allow(*_args, **_kwargs):
        return None

    class FakeService:
        def get_version(self):
            return "1.5"

        def get_full_config(self, refresh=False):
            return tree

    monkeypatch.setattr(
        "routers.dhcpv6_relay.dhcpv6_relay.require_read_permission", allow
    )
    monkeypatch.setattr(
        "routers.dhcpv6_relay.dhcpv6_relay.get_session_vyos_service",
        lambda _req: FakeService(),
    )

    from fastapi import FastAPI
    from fastapi.testclient import TestClient
    from routers.dhcpv6_relay.dhcpv6_relay import router

    app = FastAPI()
    app.include_router(router)
    response = TestClient(app).get("/vyos/dhcpv6-relay/config")
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["max_hop_count"] == expected["max_hop_count"]
    assert body["use_interface_id_option"] is True
    assert body["listen_interfaces"][0]["address"] == "1"
    assert body["upstream_interfaces"][1]["addresses"] == ["2001:db8::a", "2001:db8::b"]
