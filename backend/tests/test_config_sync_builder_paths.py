"""Config-sync paths and the 1.5-only section system login leaf.

validateTmplPath: ``service config-sync section system login`` is absent on
VyOS 1.4 (100.64.64.4) and present on 1.5 (100.64.64.5). Path methods live
on the 1.5 subclass. The factory returns the shared mapper on 1.4.
Capabilities and builder ops read that allowlist.
"""

import pytest
from pathlib import Path

from routers.config_sync.config_sync import _parse_sections
from vyos_builders.config_sync.config_sync_batch_builder import ConfigSyncBatchBuilder
from vyos_mappers.config_sync.config_sync import ConfigSyncMapper
from vyos_mappers.config_sync.config_sync_versions import get_config_sync_mapper
from vyos_mappers.config_sync.config_sync_versions.v1_5 import ConfigSyncMapperV1_5


REPO = Path(__file__).resolve().parents[2]
MODAL = REPO / "frontend/src/components/service/config-sync/ConfigSyncModal.tsx"
CLIENT = REPO / "frontend/src/lib/api/config-sync.ts"

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

LOGIN_CASES = [
    ("set_section_system_login", (), "set", BASE + ["section", "system", "login"]),
    ("delete_section_system_login", (), "delete", BASE + ["section", "system", "login"]),
]


def _ops(builder):
    return [(item["op"], item["path"]) for item in builder.get_operations()]


@pytest.mark.parametrize("method, args, op, expected_path", CASES)
@pytest.mark.parametrize("version", ["1.4", "1.5"])
def test_config_sync_builder_paths(method, args, op, expected_path, version):
    builder = ConfigSyncBatchBuilder(version=version)
    getattr(builder, method)(*args)
    assert _ops(builder) == [(op, expected_path)]


@pytest.mark.parametrize("version", ["1.4", "1.5"])
def test_shared_section_sub_rejects_system_login(version):
    builder = ConfigSyncBatchBuilder(version=version)
    with pytest.raises(ValueError, match="Unsupported config-sync section subtype"):
        builder.set_section_sub("system", "login")
    assert builder.get_operations() == []


def test_v14_mapper_is_the_shared_class():
    mapper = get_config_sync_mapper("1.4.3")
    assert type(mapper) is ConfigSyncMapper
    assert mapper.versioned_nodes() == frozenset()
    assert not hasattr(mapper, "get_section_system_login")
    assert not hasattr(mapper, "get_section_system_login_delete")


def test_v15_mapper_emits_system_login():
    mapper = get_config_sync_mapper("1.5")
    assert isinstance(mapper, ConfigSyncMapperV1_5)
    assert mapper.versioned_nodes() == frozenset({"system_login"})
    assert mapper.get_section_system_login() == BASE + ["section", "system", "login"]
    assert mapper.get_section_system_login_delete() == BASE + ["section", "system", "login"]


def test_factory_defaults_rolling_to_v1_5():
    assert isinstance(get_config_sync_mapper("2026.09.23-0027-rolling"), ConfigSyncMapperV1_5)
    assert type(get_config_sync_mapper("1.4.2")) is ConfigSyncMapper


@pytest.mark.parametrize("method, args, op, expected_path", LOGIN_CASES)
def test_v15_builder_ops_emit_system_login(method, args, op, expected_path):
    builder = ConfigSyncBatchBuilder(version="1.5")
    getattr(builder, method)(*args)
    assert _ops(builder) == [(op, expected_path)]


@pytest.mark.parametrize("method, args, op, expected_path", LOGIN_CASES)
def test_v14_builder_ops_reject_system_login(method, args, op, expected_path):
    builder = ConfigSyncBatchBuilder(version="1.4")
    with pytest.raises(ValueError, match="not supported on this device"):
        getattr(builder, method)(*args)
    assert builder.get_operations() == []


def test_v14_capabilities_hide_system_login():
    caps = ConfigSyncBatchBuilder(version="1.4").get_capabilities()
    assert caps["features"]["system_login"]["supported"] is False
    assert caps["features"]["sections"]["supported"] is True
    assert "version_info" not in caps


def test_v15_capabilities_advertise_system_login():
    caps = ConfigSyncBatchBuilder(version="1.5").get_capabilities()
    assert caps["features"]["system_login"]["supported"] is True


def test_system_login_capability_reads_the_mapper(monkeypatch):
    """A handwritten version check in get_capabilities() would ignore this."""
    monkeypatch.setattr(ConfigSyncMapper, "versioned_nodes", lambda self: frozenset())
    caps = ConfigSyncBatchBuilder(version="1.5").get_capabilities()
    assert caps["features"]["system_login"]["supported"] is False
    builder = ConfigSyncBatchBuilder(version="1.5")
    with pytest.raises(ValueError, match="not supported on this device"):
        builder.set_section_system_login()
    assert builder.get_operations() == []


def test_parser_reads_system_login():
    sections = _parse_sections({"system": {"login": {}, "conntrack": {}}})
    assert sections.system is True
    assert sections.system_conntrack is True
    assert sections.system_login is True


def test_modal_gates_system_login_on_capability():
    text = MODAL.read_text()
    assert "capabilities?.features.system_login.supported" in text
    assert "version_info" not in text
    assert "is_1_5" not in text
    assert "set_section_system_login" not in text
    client = CLIENT.read_text()
    assert "set_section_system_login" in client
    assert "delete_section_system_login" in client
