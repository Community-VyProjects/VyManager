"""Console server GET /config parse lives on the mapper (issue #966)."""

from pathlib import Path

from vyos_mappers.console_server.console_server_versions import (
    get_console_server_mapper,
)


def _tree():
    return {
        "service": {
            "console-server": {
                "device": {
                    "ttyUSB0": {
                        "alias": "ups",
                        "data-bits": "8",
                        "description": "ups",
                        "parity": "none",
                        "speed": "9600",
                        "ssh": {"port": "not-int"},
                        "stop-bits": "1",
                    },
                    "ttyS0": {"ssh": {"port": "2022"}, "speed": "115200"},
                    "ttyS1": None,
                    "ttyS2": {"ssh": {}},
                }
            }
        }
    }


def test_parse_config_is_explicit_and_version_falls_through():
    mapper = get_console_server_mapper("1.4")
    assert "parse_config" in type(mapper).__dict__
    assert mapper.version == "1.4"


def test_devices_sorted_and_ssh_port_coerced():
    parsed = get_console_server_mapper("1.5").parse_config(_tree())
    names = [device["name"] for device in parsed["devices"]]
    assert names == ["ttyS0", "ttyS1", "ttyS2", "ttyUSB0"]
    by_name = {device["name"]: device for device in parsed["devices"]}
    assert by_name["ttyS0"]["ssh"] == {"port": 2022}
    assert by_name["ttyS0"]["speed"] == "115200"
    assert by_name["ttyS1"]["ssh"] is None
    assert by_name["ttyS2"]["ssh"] == {"port": None}
    usb = by_name["ttyUSB0"]
    assert usb["ssh"] == {"port": None}
    assert usb["data_bits"] == "8"
    assert usb["stop_bits"] == "1"
    assert usb["alias"] == "ups"
    assert (
        get_console_server_mapper("1.5").parse_config(
            {"service": {"console-server": {"device": "ttyS0"}}}
        )
        == {"devices": []}
    )


def test_empty_tree():
    assert get_console_server_mapper("1.4").parse_config({}) == {"devices": []}
    assert get_console_server_mapper("1.5").parse_config(
        {"service": {"console-server": {}}}
    ) == {"devices": []}


def test_router_has_no_config_parsers_section():
    text = (
        Path(__file__)
        .resolve()
        .parents[1]
        .joinpath("routers/console_server/console_server.py")
        .read_text()
    )
    assert "Config Parsers" not in text


def test_get_config_returns_mapper_parse(monkeypatch):
    tree = _tree()
    expected = get_console_server_mapper("1.5").parse_config(tree)

    async def allow(*_args, **_kwargs):
        return None

    class FakeService:
        def get_version(self):
            return "1.5"

        def get_full_config(self, refresh=False):
            return tree

    monkeypatch.setattr(
        "routers.console_server.console_server.require_read_permission", allow
    )
    monkeypatch.setattr(
        "routers.console_server.console_server.get_session_vyos_service",
        lambda _req: FakeService(),
    )

    from fastapi import FastAPI
    from fastapi.testclient import TestClient
    from routers.console_server.console_server import router

    app = FastAPI()
    app.include_router(router)
    response = TestClient(app).get("/vyos/console-server/config")
    assert response.status_code == 200, response.text
    body = response.json()
    assert [device["name"] for device in body["devices"]] == [
        device["name"] for device in expected["devices"]
    ]
    assert body["devices"][0]["ssh"]["port"] == 2022
    assert body["devices"][3]["data_bits"] == "8"
