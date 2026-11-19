"""BGP version wiring is a subclass factory, not a merge proxy.

validateTmplPath on VyOS 1.4 (100.64.64.4) and 1.5 rolling (100.64.64.5):
nhrp redistribute, ipv6 redistribute table, neighbor/peer-group link-state,
bfd strict, peer-group solo, as-notation, queue limits, update-delay,
bmp local-rib, and bmp source-interface exist only on 1.5.
"""

from pathlib import Path

import pytest

from vyos_builders.bgp.bgp_batch_builder import BgpBatchBuilder
from vyos_mappers.bgp.bgp import BgpMapper
from vyos_mappers.bgp.bgp_versions import get_bgp_mapper
from vyos_mappers.bgp.bgp_versions.v1_5 import BgpMapperV1_5


FACTORY = (
    Path(__file__).resolve().parents[1]
    / "vyos_mappers"
    / "bgp"
    / "bgp_versions"
    / "__init__.py"
)


def test_factory_returns_shared_on_1_4_and_subclass_on_rolling():
    assert type(get_bgp_mapper("1.4")) is BgpMapper
    assert type(get_bgp_mapper("1.4.3")) is BgpMapper
    assert isinstance(get_bgp_mapper("1.5"), BgpMapperV1_5)
    assert isinstance(get_bgp_mapper("2026.09.23-rolling"), BgpMapperV1_5)
    assert isinstance(get_bgp_mapper("latest"), BgpMapperV1_5)
    factory = FACTORY.read_text()
    assert "__getattr__" not in factory
    assert "MergedMapper" not in factory
    assert "v1_4" not in factory
    assert not (FACTORY.parent / "v1_4.py").exists()


def test_base_allowlist_does_not_read_version():
    on_15 = BgpMapper("1.5")
    on_14 = BgpMapper("1.4")
    assert on_15.redistribute_ipv4_protocols() == on_14.redistribute_ipv4_protocols()
    assert "nhrp" not in on_15.redistribute_ipv4_protocols()
    assert "nhrp" not in on_15.redistribute_ipv6_protocols()
    assert on_15.redistribute_table_afis() == frozenset({"ipv4-unicast"})
    assert "local-rib" not in on_15.bmp_monitor_policies()
    assert on_15.versioned_nodes() == frozenset()
    assert on_15.as_notation_values() == []


def test_v14_mapper_rejects_1_5_leaves():
    mapper = get_bgp_mapper("1.4.3")
    assert type(mapper) is BgpMapper
    with pytest.raises(ValueError, match="not supported"):
        mapper.get_af_redistribute("ipv4-unicast", "nhrp")
    with pytest.raises(ValueError, match="not supported"):
        mapper.get_af_redistribute_table("ipv6-unicast", "10")
    assert mapper.get_af_redistribute_table("ipv4-unicast", "10")[-2:] == ["table", "10"]
    with pytest.raises(ValueError, match="not supported"):
        mapper.require_node("as-notation")
    with pytest.raises(ValueError, match="not supported"):
        mapper.require_node("peer-group solo")


def test_v15_subclass_owns_leaves_not_the_version_string():
    mapper = BgpMapperV1_5("1.4.2")
    assert "nhrp" in mapper.redistribute_ipv4_protocols()
    assert "nhrp" in mapper.redistribute_ipv6_protocols()
    assert "ipv6-unicast" in mapper.redistribute_table_afis()
    assert "local-rib" in mapper.bmp_monitor_policies()
    assert mapper.as_notation_values() == ["asdot", "asdot+"]
    assert "as-notation" in mapper.versioned_nodes()
    assert mapper.get_parameters_as_notation("asdot") == [
        "protocols", "bgp", "parameters", "as-notation", "asdot",
    ]
    assert mapper.get_neighbor_link_state("192.0.2.1")[-2:] == ["address-family", "link-state"]
    assert mapper.get_peer_group_solo("UPSTREAM")[-1] == "solo"
    assert mapper.get_bmp_target_source_interface("T1", "eth0")[-2:] == ["source-interface", "eth0"]


def test_nhrp_capability_reads_the_mapper(monkeypatch):
    """A handwritten version check in get_capabilities() would ignore this."""
    monkeypatch.setattr(
        BgpMapperV1_5,
        "redistribute_ipv4_protocols",
        lambda self: BgpMapper.redistribute_ipv4_protocols(self),
    )
    monkeypatch.setattr(
        BgpMapperV1_5,
        "redistribute_ipv6_protocols",
        lambda self: BgpMapper.redistribute_ipv6_protocols(self),
    )
    caps = BgpBatchBuilder(version="1.5").get_capabilities()
    assert caps["features"]["redistribute_nhrp"]["supported"] is False
    assert "nhrp" not in caps["redistribute_protocols"]["ipv4-unicast"]
    assert "version_info" not in caps
    builder = BgpBatchBuilder(version="1.5")
    with pytest.raises(ValueError, match="not supported"):
        builder.set_af_redistribute("ipv4-unicast", "nhrp")
    assert builder.get_operations() == []


def test_capabilities_do_not_read_a_version_string():
    caps = BgpBatchBuilder(version="2026.09.23-rolling").get_capabilities()
    assert "version_info" not in caps
    assert caps["features"]["as_notation"]["values"] == ["asdot", "asdot+"]
    assert "ipv6-unicast" in caps["redistribute_table_afis"]
    text = Path(__file__).resolve().parents[1].joinpath(
        "vyos_builders", "bgp", "bgp_batch_builder.py"
    ).read_text()
    assert "version_info" not in text
    assert '"1.5"' not in text
    assert '"1.4"' not in text


def test_ipv6_redistribute_protocols_match_the_lab():
    mapper = get_bgp_mapper("1.4")
    assert "ospfv3" in mapper.redistribute_ipv6_protocols()
    assert "ripng" in mapper.redistribute_ipv6_protocols()
    assert "ospf" not in mapper.redistribute_ipv6_protocols()
    assert "rip" not in mapper.redistribute_ipv6_protocols()
    with pytest.raises(ValueError, match="not supported"):
        mapper.get_af_redistribute("ipv6-unicast", "ospf")


def test_parse_config_masks_password_and_reads_new_leaves():
    from routers.bgp.bgp import BgpBmpTarget, BgpConfig

    tree = {
        "protocols": {
            "bgp": {
                "parameters": {
                    "as-notation": "asdot",
                    "input-queue-limit": "100",
                    "update-delay": {"establish-wait": "30", "max-delay": "60"},
                },
                "neighbor": {
                    "192.0.2.1": {
                        "password": "secret",
                        "solo": {},
                        "bfd": {"strict": {"hold-time": "5"}},
                        "address-family": {"link-state": {}},
                    }
                },
                "peer-group": {
                    "UPSTREAM": {"password": "group-secret", "solo": {}},
                },
                "bmp": {
                    "mirror-buffer-limit": "4096",
                    "target": {
                        "T1": {
                            "address": "192.0.2.9",
                            "port": "5000",
                            "min-retry": "10",
                            "max-retry": "60",
                            "mirror": {},
                            "source-interface": "eth0",
                            "monitor": {"ipv4-unicast": {"local-rib": {}}},
                        }
                    },
                },
            }
        }
    }
    parsed = get_bgp_mapper("2026.09.23-rolling").parse_config(tree)
    assert parsed["neighbors"][0]["password"] == "***"
    assert parsed["peer_groups"][0]["password"] == "***"
    assert parsed["neighbors"][0]["link_state"] is True
    assert parsed["neighbors"][0]["bfd"]["strict"] is True
    assert parsed["neighbors"][0]["bfd"]["strict_hold_time"] == 5
    assert parsed["parameters"]["as_notation"] == "asdot"
    assert parsed["bmp"]["targets"][0]["min_retry"] == 10
    assert parsed["bmp"]["targets"][0]["max_retry"] == 60
    assert parsed["bmp"]["mirror_buffer_limit"] == 4096
    BgpConfig(**parsed)
    BgpBmpTarget(**parsed["bmp"]["targets"][0])
