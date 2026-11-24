"""TFTP server GET /config parse lives on the mapper (issue #966)."""

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
