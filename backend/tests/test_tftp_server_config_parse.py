"""TFTP server GET /config parse lives on the mapper (issue #966)."""

from pathlib import Path

from vyos_mappers.tftp_server.tftp_server_versions import get_tftp_server_mapper


def _tree():
    return {
        "service": {
            "tftp-server": {
                "directory": "/config/tftp",
                "allow-upload": {},
                "port": "69",
                "listen-address": {
                    "192.0.2.10": {"vrf": "mgmt"},
                    "192.0.2.1": None,
                },
            }
        }
    }


def _empty():
    return {
        "directory": None,
        "allow_upload": False,
        "port": None,
        "listen_addresses": [],
    }


def test_parse_config_is_explicit_and_version_falls_through():
    mapper = get_tftp_server_mapper("1.4")
    assert "parse_config" in type(mapper).__dict__
    assert mapper.version == "1.4"
    assert get_tftp_server_mapper("1.5").version == "1.5"


def test_listen_addresses_sorted_with_optional_vrf():
    parsed = get_tftp_server_mapper("1.5").parse_config(_tree())
    assert type(parsed) is dict
    assert parsed["directory"] == "/config/tftp"
    assert parsed["allow_upload"] is True
    assert parsed["port"] == "69"
    assert parsed["listen_addresses"] == [
        {"address": "192.0.2.1", "vrf": None},
        {"address": "192.0.2.10", "vrf": "mgmt"},
    ]
    assert get_tftp_server_mapper("1.4").parse_config(_tree()) == parsed


def test_non_dict_listen_addresses_are_dropped():
    tree = {"service": {"tftp-server": {"listen-address": ["192.0.2.1"]}}}
    parsed = get_tftp_server_mapper("1.4").parse_config(tree)
    assert parsed["listen_addresses"] == []
    assert parsed["allow_upload"] is False


def test_empty_tree():
    assert get_tftp_server_mapper("1.4").parse_config({}) == _empty()
    assert get_tftp_server_mapper("1.5").parse_config({"service": {}}) == _empty()
    assert (
        get_tftp_server_mapper("1.5").parse_config({"service": {"tftp-server": {}}})
        == _empty()
    )
    assert (
        get_tftp_server_mapper("1.5").parse_config(
            {"service": {"tftp-server": "nope"}}
        )
        == _empty()
    )


def test_router_has_no_parse_helpers():
    root = Path(__file__).resolve().parents[1]
    text = root.joinpath("routers/tftp_server/tftp_server.py").read_text()
    assert "def _parse_" not in text
    assert "mapper.parse_config" in text
    parse_src = root.joinpath("vyos_mappers/tftp_server/config_parse.py").read_text()
    assert "pydantic" not in parse_src
    assert "fastapi" not in parse_src
    assert "routers" not in parse_src


def test_get_config_returns_mapper_parse(monkeypatch):
    tree = _tree()
    expected = get_tftp_server_mapper("1.5").parse_config(tree)

    async def allow(*_args, **_kwargs):
        return None

    class FakeService:
        def get_version(self):
            return "1.5"

        def get_full_config(self, refresh=False):
            return tree

    monkeypatch.setattr(
        "routers.tftp_server.tftp_server.require_read_permission", allow
    )
    monkeypatch.setattr(
        "routers.tftp_server.tftp_server.get_session_vyos_service",
        lambda _req: FakeService(),
    )

    from fastapi import FastAPI
    from fastapi.testclient import TestClient
    from routers.tftp_server.tftp_server import router

    app = FastAPI()
    app.include_router(router)
    response = TestClient(app).get("/vyos/tftp-server/config")
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["directory"] == expected["directory"]
    assert body["allow_upload"] is True
    assert body["listen_addresses"][0]["vrf"] is None
    assert body["listen_addresses"][1]["vrf"] == "mgmt"
