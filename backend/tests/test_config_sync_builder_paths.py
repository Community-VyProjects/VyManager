"""Golden (method, args, expected_path) cases for ConfigSyncBatchBuilder.

Paths checked with validateTmplPath on 1.4 (100.64.64.50) and 1.5 (100.64.64.5).
"""

import pytest

from routers.config_sync.config_sync import _parse_sections
from vyos_builders.config_sync.config_sync_batch_builder import ConfigSyncBatchBuilder


BASE = ["service", "config-sync"]

CASES = [
    ("delete_config_sync", (), "delete", BASE),
    ("set_mode", ("load",), "set", BASE + ["mode", "load"]),
    ("delete_mode", (), "delete", BASE + ["mode"]),
    ("set_secondary_address", ("192.0.2.1",), "set", BASE + ["secondary", "address", "192.0.2.1"]),
    ("delete_secondary_address", (), "delete", BASE + ["secondary", "address"]),
    ("set_secondary_key", ("secret",), "set", BASE + ["secondary", "key", "secret"]),
    ("delete_secondary_key", (), "delete", BASE + ["secondary", "key"]),
    ("set_secondary_port", ("443",), "set", BASE + ["secondary", "port", "443"]),
    ("delete_secondary_port", (), "delete", BASE + ["secondary", "port"]),
    ("set_secondary_timeout", ("30",), "set", BASE + ["secondary", "timeout", "30"]),
    ("delete_secondary_timeout", (), "delete", BASE + ["secondary", "timeout"]),
    ("set_section", ("firewall",), "set", BASE + ["section", "firewall"]),
    ("delete_section", ("firewall",), "delete", BASE + ["section", "firewall"]),
    ("set_section_sub", ("system", "conntrack"), "set", BASE + ["section", "system", "conntrack"]),
    ("delete_section_sub", ("system", "conntrack"), "delete", BASE + ["section", "system", "conntrack"]),
]


@pytest.mark.parametrize("method, args, op, expected_path", CASES)
@pytest.mark.parametrize("version", ["1.4", "1.5"])
def test_config_sync_builder_paths(method, args, op, expected_path, version):
    builder = ConfigSyncBatchBuilder(version=version)
    getattr(builder, method)(*args)
    operations = builder.get_operations()
    assert [(item["op"], item["path"]) for item in operations] == [(op, expected_path)]


@pytest.mark.parametrize("version", ["1.4", "1.5"])
def test_config_sync_rejects_system_login(version):
    builder = ConfigSyncBatchBuilder(version=version)

    with pytest.raises(ValueError, match="Unsupported config-sync section subtype"):
        builder.set_section_sub("system", "login")


def test_config_sync_parser_ignores_system_login():
    sections = _parse_sections({"system": {"login": {}, "conntrack": {}}})

    assert sections.system is True
    assert sections.system_conntrack is True
    assert not hasattr(sections, "system_login")
