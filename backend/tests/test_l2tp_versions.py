"""L2TP version wiring is a subclass factory, not a merge proxy.

validateTmplPath on VyOS 1.4 (100.64.64.4) and rolling 1.5 (100.64.64.5):
``vpn l2tp remote-access ppp-options ipv6-peer-interface-id-secret`` exists
only on 1.5; every other L2TP leaf is on both.
"""

from pathlib import Path

import pytest

from vyos_builders.l2tp import L2TPBatchBuilder
from vyos_mappers import CommandMapperRegistry
from vyos_mappers.l2tp import L2TPMapper, get_l2tp_mapper
from vyos_mappers.l2tp.l2tp_versions.v1_5 import L2TPMapperV1_5

BACKEND = Path(__file__).resolve().parents[1]
FACTORY = BACKEND / "vyos_mappers" / "l2tp" / "l2tp_versions" / "__init__.py"
BUILDER = BACKEND / "vyos_builders" / "l2tp" / "l2tp_batch_builder.py"
SECRET = "ppp_ipv6_peer_interface_id_secret"


def test_factory_returns_shared_on_1_4_and_subclass_otherwise():
    assert type(get_l2tp_mapper("1.4")) is L2TPMapper
    assert type(get_l2tp_mapper("1.4.3")) is L2TPMapper
    for version in ("1.5", "2026.09.23-0027-rolling", "latest"):
        assert isinstance(get_l2tp_mapper(version), L2TPMapperV1_5)
    assert type(CommandMapperRegistry.get_mapper("l2tp", "1.4.3")) is L2TPMapper
    assert isinstance(CommandMapperRegistry.get_mapper("l2tp", "1.5"), L2TPMapperV1_5)
    factory = FACTORY.read_text()
    assert "__getattr__" not in factory
    assert "MergedMapper" not in factory
    assert not (FACTORY.parent / "v1_4.py").exists()
    assert not (BUILDER.parent / "l2tp.py").exists()


def test_shared_class_has_no_1_5_leaf_and_ignores_the_version_string():
    shared = L2TPMapper("1.5")
    assert shared.versioned_nodes() == frozenset()
    assert not hasattr(shared, "get_ppp_ipv6_peer_interface_id_secret_path")
    with pytest.raises(ValueError, match="not supported on this device"):
        shared.require_node(SECRET)


def test_subclass_owns_the_leaf_not_the_version_string():
    mapper = L2TPMapperV1_5("1.4.3")
    assert mapper.versioned_nodes() == frozenset({SECRET})
    mapper.require_node(SECRET)


def test_capabilities_read_the_allowlist(monkeypatch):
    on_14 = L2TPBatchBuilder("1.4.3").get_capabilities()
    on_15 = L2TPBatchBuilder("2026.09.23-0027-rolling").get_capabilities()
    assert on_14["features"]["ppp_options"]["ipv6_peer_interface_id_secret"] is False
    assert on_15["features"]["ppp_options"]["ipv6_peer_interface_id_secret"] is True
    assert "version_info" not in on_15

    # A handwritten version check would still report 1.5 here.
    monkeypatch.setattr(L2TPMapperV1_5, "versioned_nodes", lambda self: frozenset())
    rolling = L2TPBatchBuilder("1.5").get_capabilities()
    assert rolling["features"]["ppp_options"]["ipv6_peer_interface_id_secret"] is False


def test_capability_lists_come_from_the_mapper():
    caps = L2TPBatchBuilder("1.5").get_capabilities()["features"]
    mapper = L2TPMapper("1.5")
    assert caps["authentication"]["modes"] == mapper.auth_modes() == ["local", "radius", "noauth"]
    assert caps["authentication"]["protocols"] == mapper.auth_protocols()
    assert caps["ipsec_settings"]["auth_modes"] == mapper.ipsec_auth_modes()
    assert caps["ppp_options"]["ipv4_modes"] == mapper.ppp_ipv4_modes()
    assert caps["ppp_options"]["ipv6_modes"] == mapper.ppp_ipv6_modes()
    assert caps["ppp_options"]["mppe_modes"] == mapper.ppp_mppe_modes() == ["require", "prefer", "deny"]
    assert caps["log"]["levels"] == mapper.log_levels()
