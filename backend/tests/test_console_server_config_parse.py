"""Console server GET /config parse lives on the mapper (issue #966)."""

from pathlib import Path

from vyos_mappers.base import CommandMapperRegistry
from vyos_mappers.console_server import ConsoleServerMapper


def _tree():
    return {
        "service": {
            "console-server": {
                "device": {
                    "usb0b2.4p1.0": {
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


def test_devices_sorted_and_ssh_port_coerced():
    parsed = ConsoleServerMapper("1.5").parse_config(_tree())
    names = [device["name"] for device in parsed["devices"]]
    assert names == ["ttyS0", "ttyS1", "ttyS2", "usb0b2.4p1.0"]
    by_name = {device["name"]: device for device in parsed["devices"]}
    assert by_name["ttyS0"]["ssh"] == {"port": 2022}
    assert by_name["ttyS0"]["speed"] == "115200"
    assert by_name["ttyS1"]["ssh"] is None
    assert by_name["ttyS2"]["ssh"] == {"port": None}
    usb = by_name["usb0b2.4p1.0"]
    assert usb["ssh"] == {"port": None}
    assert usb["data_bits"] == "8"
    assert usb["stop_bits"] == "1"
    assert usb["alias"] == "ups"
    assert (
        ConsoleServerMapper("1.5").parse_config(
            {"service": {"console-server": {"device": "ttyS0"}}}
        )
        == {"devices": []}
    )


def test_empty_tree():
    assert ConsoleServerMapper("1.4").parse_config({}) == {"devices": []}
    assert ConsoleServerMapper("1.5").parse_config(
        {"service": {"console-server": {}}}
    ) == {"devices": []}


def test_registry_returns_shared_mapper():
    """Labs match, so the registry must not wrap a merge proxy."""
    for version in ("1.4", "1.4.3", "1.5", "2026.09.23-rolling"):
        mapper = CommandMapperRegistry.get_mapper("console_server", version)
        assert type(mapper) is ConsoleServerMapper
        assert mapper.version == version
        assert "parse_config" in type(mapper).__dict__
    assert "__init__" not in ConsoleServerMapper.__dict__
    direct = ConsoleServerMapper("1.5").parse_config(_tree())
    registered = CommandMapperRegistry.get_mapper("console_server", "1.5")
    assert isinstance(registered, ConsoleServerMapper)
    assert registered.parse_config(_tree())["devices"][0]["ssh"]["port"] == (
        direct["devices"][0]["ssh"]["port"]
    ) == 2022
    versions = (
        Path(__file__).resolve().parents[1]
        / "vyos_mappers"
        / "console_server"
        / "console_server_versions"
    )
    assert not versions.exists()
