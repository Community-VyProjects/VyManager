"""RPKI GET /config parse lives on the mapper (issue #966)."""

from pathlib import Path

from vyos_mappers.rpki.rpki_versions import get_rpki_mapper


def _tree():
    return {
        "protocols": {
            "rpki": {
                "cache": {
                    "192.0.2.1": {
                        "port": "3323",
                        "preference": "10",
                        "source-address": "192.0.2.10",
                        "ssh": {"key": "id_rsa", "username": "rpki"},
                    },
                    "192.0.2.2": None,
                },
                "expire-interval": "7200",
                "polling-period": "300",
                "retry-interval": "not-a-number",
            }
        }
    }


def _empty():
    return {
        "cache_servers": [],
        "expire_interval": None,
        "polling_period": None,
        "retry_interval": None,
    }


def test_parse_config_is_explicit_and_version_falls_through():
    mapper = get_rpki_mapper("1.4")
    assert "parse_config" in type(mapper).__dict__
    assert mapper.version == "1.4"
    assert get_rpki_mapper("1.5").version == "1.5"


def test_cache_servers_and_intervals():
    parsed = get_rpki_mapper("1.5").parse_config(_tree())
    assert type(parsed) is dict
    assert parsed["expire_interval"] == 7200
    assert parsed["polling_period"] == 300
    assert parsed["retry_interval"] is None
    by_addr = {server["address"]: server for server in parsed["cache_servers"]}
    assert by_addr["192.0.2.1"]["port"] == 3323
    assert by_addr["192.0.2.1"]["preference"] == 10
    assert by_addr["192.0.2.1"]["source_address"] == "192.0.2.10"
    assert by_addr["192.0.2.1"]["ssh"] == {"key": "id_rsa", "username": "rpki"}
    assert by_addr["192.0.2.2"]["port"] is None
    assert by_addr["192.0.2.2"]["ssh"] is None
    assert get_rpki_mapper("1.4").parse_config(_tree()) == parsed


def test_empty_tree():
    assert get_rpki_mapper("1.4").parse_config({}) == _empty()
    assert get_rpki_mapper("1.5").parse_config({"protocols": {}}) == _empty()
    assert get_rpki_mapper("1.5").parse_config({"protocols": {"rpki": {}}}) == _empty()


def test_router_has_no_config_parsers_section():
    text = Path(__file__).resolve().parents[1].joinpath("routers/rpki/rpki.py").read_text()
    assert "Config Parsers" not in text
    parse_src = (
        Path(__file__)
        .resolve()
        .parents[1]
        .joinpath("vyos_mappers/rpki/config_parse.py")
        .read_text()
    )
    assert "pydantic" not in parse_src
    assert "fastapi" not in parse_src
    assert "routers" not in parse_src


def test_get_config_returns_mapper_parse(monkeypatch):
    tree = _tree()
    expected = get_rpki_mapper("1.5").parse_config(tree)

    async def allow(*_args, **_kwargs):
        return None

    class FakeService:
        def get_version(self):
            return "1.5"

        def get_full_config(self, refresh=False):
            return tree

    monkeypatch.setattr("routers.rpki.rpki.require_read_permission", allow)
    monkeypatch.setattr(
        "routers.rpki.rpki.get_session_vyos_service",
        lambda _req: FakeService(),
    )

    from fastapi import FastAPI
    from fastapi.testclient import TestClient
    from routers.rpki.rpki import router

    app = FastAPI()
    app.include_router(router)
    client = TestClient(app)
    response = client.get("/vyos/rpki/config")
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["expire_interval"] == expected["expire_interval"]
    assert body["retry_interval"] is None
    assert body["cache_servers"][0]["ssh"]["username"] == "rpki"
    assert body["cache_servers"][1]["ssh"] is None
