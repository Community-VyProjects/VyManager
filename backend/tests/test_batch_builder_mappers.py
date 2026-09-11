"""Batch builders construct only the feature mappers they use."""

from pathlib import Path

from vyos_builders.bgp.bgp_batch_builder import BgpBatchBuilder
from vyos_builders.lldp.lldp_batch_builder import LLDPBatchBuilder
from vyos_builders.vrf.vrf_batch_builder import VrfBatchBuilder
from vyos_mappers.base import CommandMapperRegistry

VRF_MAPPER_KEYS = (
    "vrf",
    "vrf_static",
    "vrf_rpki",
    "vrf_failover",
    "vrf_ospf",
    "vrf_ospfv3",
    "vrf_isis",
    "vrf_bgp",
    "vrf_dhcp",
    "vrf_dhcpv6",
)


def _spy_get_mapper(monkeypatch):
    requested = []
    real = CommandMapperRegistry.get_mapper.__func__

    def spy(cls, feature, version):
        requested.append(feature)
        return real(cls, feature, version)

    monkeypatch.setattr(CommandMapperRegistry, "get_mapper", classmethod(spy))
    return requested


def test_bgp_builder_constructs_only_bgp_mapper(monkeypatch):
    requested = _spy_get_mapper(monkeypatch)
    BgpBatchBuilder(version="1.4")
    assert requested == ["bgp"]


def test_lldp_builder_constructs_only_lldp_mapper(monkeypatch):
    requested = _spy_get_mapper(monkeypatch)
    LLDPBatchBuilder(version="1.4")
    assert requested == ["lldp"]


def test_vrf_builder_constructs_only_mixin_mappers(monkeypatch):
    requested = _spy_get_mapper(monkeypatch)
    VrfBatchBuilder(version="1.4")
    assert requested == list(VRF_MAPPER_KEYS)
    assert len(requested) < len(CommandMapperRegistry._features)


def test_get_mappers_constructs_only_requested_features(monkeypatch):
    requested = _spy_get_mapper(monkeypatch)
    CommandMapperRegistry.get_mappers(("bgp", "ospf"), "1.4")
    assert requested == ["bgp", "ospf"]


def test_callers_do_not_use_get_all_mappers():
    root = Path(__file__).resolve().parents[1]
    offenders = sorted(
        str(p.relative_to(root))
        for p in root.rglob("*.py")
        if "tests" not in p.parts
        and p != root / "vyos_mappers" / "base.py"
        and "get_all_mappers" in p.read_text()
    )
    assert offenders == []
