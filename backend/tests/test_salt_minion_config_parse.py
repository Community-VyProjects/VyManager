"""Salt Minion GET /config parse lives on the mapper (issue #966)."""

from pathlib import Path

from vyos_mappers.salt_minion.salt_minion_versions import get_salt_minion_mapper


def _tree():
    return {
        "service": {
            "salt-minion": {
                "hash": "sha256",
                "id": "edge-1",
                "interval": "30",
                "master-key": "abc",
                "master": {"10.0.0.2": {}, "10.0.0.1": {}},
                "source-interface": "eth0",
            }
        }
    }


def _empty():
    return {
        "hash": None,
        "id": None,
        "interval": None,
        "master_key": None,
        "masters": [],
        "source_interface": None,
    }


def test_parse_config_is_explicit_and_version_falls_through():
    mapper = get_salt_minion_mapper("1.4")
    assert "parse_config" in type(mapper).__dict__
    assert mapper.version == "1.4"
    assert get_salt_minion_mapper("1.5").version == "1.5"


def test_masters_sorted_and_interval_coerced():
    parsed = get_salt_minion_mapper("1.5").parse_config(_tree())
    assert type(parsed) is dict
    assert parsed["hash"] == "sha256"
    assert parsed["id"] == "edge-1"
    assert parsed["interval"] == 30
    assert parsed["master_key"] == "abc"
    assert parsed["masters"] == ["10.0.0.1", "10.0.0.2"]
    assert parsed["source_interface"] == "eth0"
    assert get_salt_minion_mapper("1.4").parse_config(_tree()) == parsed


def test_invalid_interval_and_scalar_master():
    tree = {
        "service": {
            "salt-minion": {
                "interval": "nope",
                "master": ["10.2.0.1", "10.1.0.1"],
            }
        }
    }
    parsed = get_salt_minion_mapper("1.4").parse_config(tree)
    assert parsed["interval"] is None
    assert parsed["masters"] == ["10.1.0.1", "10.2.0.1"]
    scalar = get_salt_minion_mapper("1.5").parse_config(
        {"service": {"salt-minion": {"master": "10.9.0.1"}}}
    )
    assert scalar["masters"] == ["10.9.0.1"]


def test_empty_tree():
    assert get_salt_minion_mapper("1.4").parse_config({}) == _empty()
    assert get_salt_minion_mapper("1.5").parse_config({"service": {}}) == _empty()
    assert (
        get_salt_minion_mapper("1.5").parse_config({"service": {"salt-minion": {}}})
        == _empty()
    )


def test_router_has_no_parse_helpers():
    root = Path(__file__).resolve().parents[1]
    text = root.joinpath("routers/salt_minion/salt_minion.py").read_text()
    assert "def _parse_" not in text
    assert "mapper.parse_config" in text
    parse_src = root.joinpath("vyos_mappers/salt_minion/config_parse.py").read_text()
    assert "pydantic" not in parse_src
    assert "fastapi" not in parse_src
    assert "routers" not in parse_src


def test_get_config_returns_mapper_parse(monkeypatch):
    tree = _tree()
    expected = get_salt_minion_mapper("1.5").parse_config(tree)

    async def allow(*_args, **_kwargs):
        return None

    class FakeService:
        def get_version(self):
            return "1.5"

        def get_full_config(self, refresh=False):
            return tree

    monkeypatch.setattr(
        "routers.salt_minion.salt_minion.require_read_permission", allow
    )
    monkeypatch.setattr(
        "routers.salt_minion.salt_minion.get_session_vyos_service",
        lambda _req: FakeService(),
    )

    from fastapi import FastAPI
    from fastapi.testclient import TestClient
    from routers.salt_minion.salt_minion import router

    app = FastAPI()
    app.include_router(router)
    response = TestClient(app).get("/vyos/salt-minion/config")
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["id"] == expected["id"]
    assert body["interval"] == 30
    assert body["masters"] == ["10.0.0.1", "10.0.0.2"]
    assert body["source_interface"] == "eth0"
