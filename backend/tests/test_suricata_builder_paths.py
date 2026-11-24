"""Golden paths and version gates for Suricata."""

import inspect
from pathlib import Path

import pytest

from vyos_builders.suricata import SuricataBatchBuilder
from routers.suricata.suricata import SuricataConfig
from vyos_mappers import CommandMapperRegistry
from vyos_mappers.suricata import SuricataMapper, suricata_versions
from vyos_mappers.suricata.suricata import SURICATA_NODE
from vyos_mappers.suricata.suricata_versions import SuricataMapperV1_5


BASE = ["service", "suricata"]


def parse_suricata_config(node):
    """Feed a ``service suricata`` node through the mapper into the router model."""
    mapper = CommandMapperRegistry.get_mapper("suricata", "1.5")
    assert isinstance(mapper, SuricataMapper)
    full_config = {} if node is None else {"service": {"suricata": node}}
    return SuricataConfig(**mapper.parse_config(full_config))


CASES = [
    ("delete_suricata", (), "delete", BASE),
    ("set_interface", ("eth0",), "set", BASE + ["interface", "eth0"]),
    ("delete_interface", ("eth0.10",), "delete", BASE + ["interface", "eth0.10"]),
    ("set_address_group", ("home-net",), "set", BASE + ["address-group", "home-net"]),
    ("delete_address_group", ("home-net",), "delete", BASE + ["address-group", "home-net"]),
    (
        "set_address",
        ("home-net", "10.0.0.0/8"),
        "set",
        BASE + ["address-group", "home-net", "address", "10.0.0.0/8"],
    ),
    (
        "delete_address",
        ("home-net", "!192.0.2.1"),
        "delete",
        BASE + ["address-group", "home-net", "address", "!192.0.2.1"],
    ),
    (
        "set_address_group_ref",
        ("external-net", "!home-net"),
        "set",
        BASE + ["address-group", "external-net", "group", "!home-net"],
    ),
    (
        "delete_address_group_ref",
        ("external-net", "home-net"),
        "delete",
        BASE + ["address-group", "external-net", "group", "home-net"],
    ),
    ("set_port_group", ("http-ports",), "set", BASE + ["port-group", "http-ports"]),
    ("delete_port_group", ("http-ports",), "delete", BASE + ["port-group", "http-ports"]),
    (
        "set_port",
        ("http-ports", "80"),
        "set",
        BASE + ["port-group", "http-ports", "port", "80"],
    ),
    (
        "delete_port",
        ("shellcode-ports", "!80"),
        "delete",
        BASE + ["port-group", "shellcode-ports", "port", "!80"],
    ),
    (
        "set_port",
        ("file-data-ports", "1001-1005"),
        "set",
        BASE + ["port-group", "file-data-ports", "port", "1001-1005"],
    ),
    (
        "set_port_group_ref",
        ("file-data-ports", "http-ports"),
        "set",
        BASE + ["port-group", "file-data-ports", "group", "http-ports"],
    ),
    (
        "delete_port_group_ref",
        ("file-data-ports", "!http-ports"),
        "delete",
        BASE + ["port-group", "file-data-ports", "group", "!http-ports"],
    ),
    ("delete_log", (), "delete", BASE + ["log"]),
    (
        "set_log_eve_filename",
        ("eve.json",),
        "set",
        BASE + ["log", "eve", "filename", "eve.json"],
    ),
    (
        "set_log_eve_filetype",
        ("syslog",),
        "set",
        BASE + ["log", "eve", "filetype", "syslog"],
    ),
    ("set_log_eve_type", ("alert",), "set", BASE + ["log", "eve", "type", "alert"]),
    (
        "delete_log_eve_type",
        ("http",),
        "delete",
        BASE + ["log", "eve", "type", "http"],
    ),
]


@pytest.mark.parametrize("method, args, op, expected_path", CASES)
def test_suricata_builder_paths_v1_5(method, args, op, expected_path):
    builder = SuricataBatchBuilder(version="1.5")
    getattr(builder, method)(*args)
    operations = builder.get_operations()
    assert [(item["op"], item["path"]) for item in operations] == [(op, expected_path)]


@pytest.mark.parametrize("method, args, op, expected_path", CASES)
def test_suricata_builder_rejects_v1_4(method, args, op, expected_path):
    builder = SuricataBatchBuilder(version="1.4")
    with pytest.raises(ValueError, match="not supported"):
        getattr(builder, method)(*args)


def test_suricata_capabilities_follow_the_device():
    v14 = SuricataBatchBuilder(version="1.4").get_capabilities()
    v15 = SuricataBatchBuilder(version="1.5").get_capabilities()
    assert v14["features"]["suricata"]["supported"] is False
    assert v14["features"]["eve_log"]["supported"] is False
    assert v15["features"]["suricata"]["supported"] is True
    assert v15["features"]["eve_log"]["filetypes"] == ["regular", "syslog"]
    assert "alert" in v15["features"]["eve_log"]["types"]
    assert "netflow" in v15["features"]["eve_log"]["types"]


@pytest.mark.parametrize(
    "method, args",
    [
        ("set_interface", ("tailscale0",)),
        ("set_interface", ("eth0\n",)),
        ("set_interface", ("eth0.\u0661\u0660",)),
        ("set_address_group", ("home-net\n",)),
        ("set_port_group", ("http-ports\n",)),
        ("set_log_eve_filename", ("eve.json\n",)),
        ("set_address_group", ("Home",)),
        ("set_address", ("home-net", "192.168.1.1/24")),
        ("set_address", ("home-net", "not-an-ip")),
        ("set_port", ("http-ports", "0")),
        ("set_port", ("http-ports", "65536")),
        ("set_port", ("http-ports", "99999")),
        ("set_port", ("http-ports", "١٠")),
        ("set_port", ("http-ports", "1005-1001")),
        ("set_address", ("home-net", "fe80::1%eth0")),
        ("set_address", ("home-net", "2001:db8::1/32")),
        ("set_log_eve_filetype", ("redis",)),
        ("set_log_eve_type", ("geoip",)),
        ("set_address_group_ref", ("external-net", "!")),
    ],
)
def test_suricata_rejects_values_the_device_rejects(method, args):
    builder = SuricataBatchBuilder(version="1.5")
    with pytest.raises(ValueError):
        getattr(builder, method)(*args)


def test_parse_suricata_config_splits_exclusions_and_implicit_log():
    parsed = parse_suricata_config(
        {
            "interface": {"eth1": {}, "eth0": {}},
            "address-group": {
                "external-net": {"group": {"!home-net": {}}},
                "home-net": {"address": {"10.0.0.0/8": {}, "192.168.0.0/16": {}}},
            },
            "port-group": {
                "shellcode-ports": {"port": "!80"},
                "http-ports": {"port": {"80": {}}},
            },
            "log": {"eve": {"filename": "eve.json", "filetype": "regular"}},
        }
    )
    assert parsed.configured is True
    assert parsed.interfaces == ["eth0", "eth1"]
    home = next(group for group in parsed.address_groups if group.name == "home-net")
    assert [member.value for member in home.members] == ["10.0.0.0/8", "192.168.0.0/16"]
    external = next(group for group in parsed.address_groups if group.name == "external-net")
    assert external.groups[0].value == "home-net"
    assert external.groups[0].exclude is True
    shellcode = next(group for group in parsed.port_groups if group.name == "shellcode-ports")
    assert shellcode.members[0].value == "80"
    assert shellcode.members[0].exclude is True
    assert parsed.log.enabled is True
    assert parsed.log.types_set is False
    assert parsed.log.types == []


def test_parse_missing_suricata_is_unconfigured():
    assert parse_suricata_config(None).configured is False
    assert parse_suricata_config({}).configured is False


def test_parse_bare_eve_node_is_logging_on():
    bare = parse_suricata_config({"interface": "eth0", "log": {"eve": {}}})
    assert bare.log.enabled is True
    assert bare.log.filename is None
    assert bare.log.filetype is None
    assert bare.log.types_set is False

    typed = parse_suricata_config({"log": {"eve": {"type": {"alert": {}, "dns": {}}}}})
    assert typed.log.enabled is True
    assert typed.log.types_set is True
    assert typed.log.types == ["alert", "dns"]
    assert typed.log.filename is None


def test_registry_mapper_parses_on_both_versions():
    tree = {"service": {"suricata": {"interface": "eth0"}}}
    for version in ("1.4", "1.5"):
        mapper = CommandMapperRegistry.get_mapper("suricata", version)
        assert isinstance(mapper, SuricataMapper)
        assert SuricataConfig(**mapper.parse_config(tree)).interfaces == ["eth0"]
    assert SuricataMapper("1.5").parse_config({}) == {"configured": False}


@pytest.mark.parametrize(
    "version, cls",
    [
        ("1.4", SuricataMapper),
        ("1.4.3", SuricataMapper),
        ("1.5", SuricataMapperV1_5),
        ("2026.09.23-0027-rolling", SuricataMapperV1_5),
    ],
)
def test_factory_returns_the_class_for_the_device(version, cls):
    mapper = CommandMapperRegistry.get_mapper("suricata", version)
    assert type(mapper) is cls


def test_shared_class_has_no_suricata_paths():
    shared = SuricataMapper("1.4")
    assert shared.versioned_nodes() == frozenset()
    assert shared.eve_filetype_values() == []
    assert shared.eve_type_values() == []
    for methods in SuricataMapper._VERSIONED_NODES.values():
        for method in methods:
            assert not hasattr(shared, method), method
            assert callable(getattr(SuricataMapperV1_5, method)), method
    assert SuricataMapperV1_5("1.5").versioned_nodes() == frozenset({SURICATA_NODE})


def test_no_empty_1_4_version_file():
    package = Path(suricata_versions.__file__).parent
    assert not (package / "v1_4.py").exists()


def test_capabilities_and_ops_follow_the_mapper_not_the_version(monkeypatch):
    # A 1.5 mapper missing one path method under the node no longer reports it.
    monkeypatch.delattr(SuricataMapperV1_5, "get_log_eve_type_delete")
    builder = SuricataBatchBuilder(version="1.5")
    caps = builder.get_capabilities()
    assert caps["features"]["suricata"]["supported"] is False
    assert caps["features"]["eve_log"]["supported"] is False
    with pytest.raises(ValueError, match="not supported"):
        builder.set_interface("eth0")
    assert builder.get_operations() == []


def test_capabilities_on_1_4_follow_a_mapper_with_the_paths(monkeypatch):
    monkeypatch.setattr(
        "vyos_mappers.suricata.suricata_versions.SuricataMapper", SuricataMapperV1_5
    )
    builder = SuricataBatchBuilder(version="1.4")
    caps = builder.get_capabilities()
    assert caps["features"]["suricata"]["supported"] is True
    assert caps["features"]["eve_log"]["types"] == list(SuricataMapperV1_5("1.5").eve_type_values())
    builder.set_interface("eth0")
    assert builder.get_operations()[0]["path"] == BASE + ["interface", "eth0"]


def test_every_builder_op_has_a_golden_row():
    ops = {
        name
        for name, _ in inspect.getmembers(SuricataBatchBuilder, inspect.isfunction)
        if name.startswith(("set_", "delete_", "create_"))
    }
    assert ops == {case[0] for case in CASES}


def test_capabilities_on_1_4_list_no_eve_values():
    caps = SuricataBatchBuilder(version="1.4").get_capabilities()
    assert caps["features"]["eve_log"]["filetypes"] == []
    assert caps["features"]["eve_log"]["types"] == []
