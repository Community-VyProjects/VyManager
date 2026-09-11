import pytest

from routers.config_sync.config_sync import _parse_sections
from vyos_builders.config_sync.config_sync_batch_builder import ConfigSyncBatchBuilder


@pytest.mark.parametrize("version", ["1.4", "1.5"])
def test_config_sync_valid_system_subsection(version):
    builder = ConfigSyncBatchBuilder(version=version)
    builder.set_section_sub("system", "conntrack")

    assert builder.get_operations() == [
        {
            "op": "set",
            "path": ["service", "config-sync", "section", "system", "conntrack"],
        }
    ]


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
