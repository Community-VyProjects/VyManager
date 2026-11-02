"""DHCP relay GET /config parse lives on the mapper (issue #966)."""

from vyos_mappers.dhcp_relay.dhcp_relay_versions import get_dhcp_relay_mapper


def _tree():
    return {
        "service": {
            "dhcp-relay": {
                "disable": {},
                "interface": ["eth1", "eth0"],
                "listen-interface": {"eth2": {}, "eth0": None},
                "upstream-interface": "eth3",
                "server": {"192.0.2.2": {}, "192.0.2.1": {}},
                "relay-options": {
                    "hop-count": "4",
                    "max-size": "big",
                    "relay-agents-packets": "append",
                },
            }
        }
    }


def _empty():
    return {
        "disabled": False,
        "interfaces": [],
        "listen_interfaces": [],
        "upstream_interfaces": [],
        "servers": [],
        "relay_options": {
            "hop_count": None,
            "max_size": None,
            "relay_agents_packets": None,
        },
    }


def test_parse_config_is_explicit_and_version_falls_through():
    mapper = get_dhcp_relay_mapper("1.4")
    assert "parse_config" in type(mapper).__dict__
    assert mapper.version == "1.4"


def test_multi_values_sorted_and_options_coerced():
    parsed = get_dhcp_relay_mapper("1.5").parse_config(_tree())
    assert parsed["disabled"] is True
    assert parsed["interfaces"] == ["eth0", "eth1"]
    assert parsed["listen_interfaces"] == ["eth0", "eth2"]
    assert parsed["upstream_interfaces"] == ["eth3"]
    assert parsed["servers"] == ["192.0.2.1", "192.0.2.2"]
    assert parsed["relay_options"] == {
        "hop_count": 4,
        "max_size": None,
        "relay_agents_packets": "append",
    }
    assert get_dhcp_relay_mapper("1.4").parse_config(_tree()) == parsed


def test_empty_tree():
    assert get_dhcp_relay_mapper("1.5").parse_config({}) == _empty()
    missing_options = get_dhcp_relay_mapper("1.4").parse_config(
        {"service": {"dhcp-relay": {"disable": {}}}}
    )
    assert missing_options["disabled"] is True
    assert missing_options["relay_options"]["hop_count"] is None
    assert missing_options["interfaces"] == []



def test_get_config_returns_mapper_parse(monkeypatch):
    tree = _tree()
    expected = get_dhcp_relay_mapper("1.5").parse_config(tree)

    async def allow(*_args, **_kwargs):
        return None

    class FakeService:
        def get_version(self):
            return "1.5"

        def get_full_config(self, refresh=False):
            return tree

    monkeypatch.setattr("routers.dhcp_relay.dhcp_relay.require_read_permission", allow)
    monkeypatch.setattr(
        "routers.dhcp_relay.dhcp_relay.get_session_vyos_service",
        lambda _req: FakeService(),
    )

    from fastapi import FastAPI
    from fastapi.testclient import TestClient
    from routers.dhcp_relay.dhcp_relay import router

    app = FastAPI()
    app.include_router(router)
    response = TestClient(app).get("/vyos/dhcp-relay/config")
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["interfaces"] == expected["interfaces"]
    assert body["servers"] == expected["servers"]
    assert body["relay_options"]["hop_count"] == 4
    assert body["relay_options"]["max_size"] is None
    assert body["disabled"] is True
