"""Babel version wiring is a subclass factory, not a merge proxy.

validateTmplPath: ``protocols babel redistribute ipv4 nhrp`` and
``ipv6 nhrp`` are absent on VyOS 1.4 (100.64.64.4) and present on 1.5
(100.64.64.5). Shared redistribute protocols stay on the base class.
"""

from pathlib import Path

import pytest

from vyos_builders.babel.babel_batch_builder import BabelBatchBuilder
from vyos_mappers.babel.babel import BabelMapper
from vyos_mappers.babel.babel_versions import get_babel_mapper
from vyos_mappers.babel.babel_versions.v1_4 import BabelMapperV1_4
from vyos_mappers.babel.babel_versions.v1_5 import BabelMapperV1_5


FACTORY = (
    Path(__file__).resolve().parents[1]
    / "vyos_mappers"
    / "babel"
    / "babel_versions"
    / "__init__.py"
)


def test_factory_returns_subclasses():
    assert isinstance(get_babel_mapper("1.4"), BabelMapperV1_4)
    assert isinstance(get_babel_mapper("1.4.3"), BabelMapperV1_4)
    assert isinstance(get_babel_mapper("1.5"), BabelMapperV1_5)
    assert isinstance(get_babel_mapper("2026.09.23-rolling"), BabelMapperV1_5)
    assert isinstance(get_babel_mapper("latest"), BabelMapperV1_5)
    factory = FACTORY.read_text()
    assert "__getattr__" not in factory
    assert "MergedMapper" not in factory


def test_base_allowlist_does_not_read_version():
    on_15 = BabelMapper("1.5")
    on_14 = BabelMapper("1.4")
    assert on_15.redistribute_ipv4_protocols() == on_14.redistribute_ipv4_protocols()
    assert on_15.redistribute_ipv6_protocols() == on_14.redistribute_ipv6_protocols()
    assert "nhrp" not in on_15.redistribute_ipv4_protocols()
    assert "nhrp" not in on_15.redistribute_ipv6_protocols()


def test_v14_subclass_does_not_gain_nhrp():
    mapper = BabelMapperV1_4("1.5-rolling")
    assert isinstance(mapper, BabelMapper)
    assert "nhrp" not in mapper.redistribute_ipv4_protocols()
    assert "nhrp" not in mapper.redistribute_ipv6_protocols()
    with pytest.raises(ValueError, match="not supported"):
        mapper.get_redistribute_ipv4("nhrp")
    with pytest.raises(ValueError, match="not supported"):
        mapper.get_redistribute_ipv6("nhrp")
    assert mapper.get_redistribute_ipv4_delete("nhrp")[-1] == "nhrp"


def test_v15_subclass_owns_nhrp_not_the_version_string():
    mapper = BabelMapperV1_5("1.4.2")
    assert "nhrp" in mapper.redistribute_ipv4_protocols()
    assert "nhrp" in mapper.redistribute_ipv6_protocols()
    assert mapper.get_redistribute_ipv4("nhrp") == [
        "protocols", "babel", "redistribute", "ipv4", "nhrp",
    ]
    assert mapper.get_redistribute_ipv6("nhrp") == [
        "protocols", "babel", "redistribute", "ipv6", "nhrp",
    ]


def test_nhrp_capability_reads_the_mapper(monkeypatch):
    """A handwritten version check in get_capabilities() would ignore this."""
    monkeypatch.setattr(
        BabelMapperV1_5,
        "redistribute_ipv4_protocols",
        lambda self: BabelMapper.redistribute_ipv4_protocols(self),
    )
    monkeypatch.setattr(
        BabelMapperV1_5,
        "redistribute_ipv6_protocols",
        lambda self: BabelMapper.redistribute_ipv6_protocols(self),
    )
    caps = BabelBatchBuilder(version="1.5").get_capabilities()
    assert caps["features"]["redistribute_nhrp"]["supported"] is False
    assert "nhrp" not in caps["redistribute_protocols"]["ipv4"]
    assert "nhrp" not in caps["redistribute_protocols"]["ipv6"]
    builder = BabelBatchBuilder(version="1.5")
    with pytest.raises(ValueError, match="not supported"):
        builder.set_redistribute_ipv4("nhrp")
    assert builder.get_operations() == []


def test_capabilities_do_not_read_a_version_string():
    caps = BabelBatchBuilder(version="2026.09.23-rolling").get_capabilities()
    assert "version_info" not in caps
    text = Path(__file__).resolve().parents[1].joinpath(
        "vyos_builders", "babel", "babel_batch_builder.py"
    ).read_text()
    assert "version_info" not in text
    assert "1.5" not in text
    assert "1.4" not in text


def test_delete_interface_filter_removes_the_tag_node():
    builder = BabelBatchBuilder(version="2026.09.23-rolling")
    builder.delete_distribute_list_ipv4_iface("eth0")
    builder.delete_distribute_list_ipv6_iface("eth1")
    assert builder.get_operations() == [
        {"op": "delete", "path": ["protocols", "babel", "distribute-list", "ipv4", "interface", "eth0"]},
        {"op": "delete", "path": ["protocols", "babel", "distribute-list", "ipv6", "interface", "eth1"]},
    ]
