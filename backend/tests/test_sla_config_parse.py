"""SLA GET /config parse lives on the mapper (issue #966)."""

from vyos_mappers.sla.sla_versions import get_sla_mapper


def _tree():
    return {
        "service": {
            "sla": {
                "owamp-server": {"port": "861"},
                "twamp-server": {"port": "not-a-port"},
            }
        }
    }


def _empty():
    return {
        "owamp_server": {"enabled": False, "port": None},
        "twamp_server": {"enabled": False, "port": None},
    }


def test_parse_config_is_explicit_and_version_falls_through():
    mapper = get_sla_mapper("1.4")
    assert "parse_config" in type(mapper).__dict__
    assert mapper.version == "1.4"
    assert get_sla_mapper("1.5").version == "1.5"


def test_servers_enabled_and_bad_port_dropped():
    parsed = get_sla_mapper("1.5").parse_config(_tree())
    assert type(parsed) is dict
    assert parsed["owamp_server"] == {"enabled": True, "port": 861}
    assert parsed["twamp_server"] == {"enabled": True, "port": None}
    assert get_sla_mapper("1.4").parse_config(_tree()) == parsed


def test_missing_server_stays_disabled_and_non_dict_enables():
    parsed = get_sla_mapper("1.4").parse_config(
        {"service": {"sla": {"owamp-server": "on"}}}
    )
    assert parsed["owamp_server"] == {"enabled": True, "port": None}
    assert parsed["twamp_server"] == {"enabled": False, "port": None}


def test_empty_tree():
    assert get_sla_mapper("1.4").parse_config({}) == _empty()
    assert get_sla_mapper("1.5").parse_config({"service": {}}) == _empty()
    assert get_sla_mapper("1.5").parse_config({"service": {"sla": {}}}) == _empty()



def test_get_config_returns_mapper_parse(monkeypatch):
    tree = _tree()
    expected = get_sla_mapper("1.5").parse_config(tree)

    async def allow(*_args, **_kwargs):
        return None

    class FakeService:
        def get_version(self):
            return "1.5"

        def get_full_config(self, refresh=False):
            return tree

    monkeypatch.setattr("routers.sla.sla.require_read_permission", allow)
    monkeypatch.setattr(
        "routers.sla.sla.get_session_vyos_service",
        lambda _req: FakeService(),
    )

    from fastapi import FastAPI
    from fastapi.testclient import TestClient
    from routers.sla.sla import router

    app = FastAPI()
    app.include_router(router)
    response = TestClient(app).get("/vyos/sla/config")
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["owamp_server"] == expected["owamp_server"]
    assert body["twamp_server"]["enabled"] is True
    assert body["twamp_server"]["port"] is None
