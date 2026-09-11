"""Version-gating corrections from the 2026-07-09 audit (Domain 2).

- IS-IS 1.4 mapper: 1.5-only options must raise, not silently no-op —
  a direct API call setting TI-LFA on a 1.4 device used to return
  success while applying nothing.
- OSPF builder: redistribute nhrp is 1.5-only and must be rejected on
  1.4 instead of emitting an invalid path.
- ethernet/zones factories: version selection must substring-match like
  every other factory, not silently fall back to 1.5 on "1.4.0".
"""

import pytest

from vyos_builders.babel.babel_batch_builder import BabelBatchBuilder
from vyos_builders.bgp.bgp_batch_builder import BgpBatchBuilder
from vyos_builders.ospf.ospf_batch_builder import OspfBatchBuilder
from vyos_builders.vrf.vrf_batch_builder import VrfBatchBuilder
from vyos_mappers.babel.babel_versions import get_babel_mapper
from vyos_mappers.bgp.bgp_versions import get_bgp_mapper
from vyos_mappers.firewall.zones_versions import get_firewall_zones_mapper
from vyos_mappers.interfaces.ethernet_versions import get_ethernet_mapper
from vyos_mappers.isis.isis_versions.v1_4 import IsisMapperV1_4
from vyos_mappers.ospf.ospf_versions import get_ospf_mapper
from vyos_mappers.vrf.vrf_bgp import VrfBgpMapper
from vyos_mappers.vrf.vrf_ospf import VrfOspfMapper


def test_isis_v14_rejects_ti_lfa_instead_of_silent_noop():
    mapper = IsisMapperV1_4()
    with pytest.raises(ValueError, match="1.5"):
        mapper.get_interface_ti_lfa_path("eth0")
    with pytest.raises(ValueError, match="1.5"):
        mapper.get_sr_srv6_locator_path("LOC1")
    with pytest.raises(ValueError, match="1.5"):
        mapper.get_te_export_path()


def test_mappers_14_reject_redistribute_nhrp():
    babel = get_babel_mapper("1.4")
    with pytest.raises(ValueError, match="not supported"):
        babel.get_redistribute_ipv4("nhrp")
    with pytest.raises(ValueError, match="not supported"):
        babel.get_redistribute_ipv6("nhrp")
    ospf = get_ospf_mapper("1.4")
    with pytest.raises(ValueError, match="not supported"):
        ospf.get_redistribute("nhrp")
    bgp = get_bgp_mapper("1.4")
    with pytest.raises(ValueError, match="not supported"):
        bgp.get_af_redistribute("ipv4-unicast", "nhrp")
    vrf_ospf = VrfOspfMapper("1.4")
    with pytest.raises(ValueError, match="not supported"):
        vrf_ospf.get_ospf_redistribute("blue", "nhrp")
    vrf_bgp = VrfBgpMapper("1.4")
    with pytest.raises(ValueError, match="not supported"):
        vrf_bgp.get_bgp_af_redistribute("blue", "ipv4-unicast", "nhrp")


def test_mappers_14_delete_redistribute_nhrp():
    babel = get_babel_mapper("1.4")
    assert babel.get_redistribute_ipv4_delete("nhrp")[-1] == "nhrp"
    assert get_ospf_mapper("1.4").get_redistribute_delete("nhrp")[-1] == "nhrp"
    assert VrfOspfMapper("1.4").get_ospf_redistribute_delete("blue", "nhrp")[-1] == "nhrp"


def test_ospf_14_rejects_redistribute_nhrp():
    builder = OspfBatchBuilder(version="1.4")
    with pytest.raises(ValueError, match="not supported"):
        builder.set_redistribute("nhrp")
    # supported protocols still pass through
    builder.set_redistribute("bgp")
    assert builder.get_operations()


def test_ospf_15_allows_redistribute_nhrp():
    builder = OspfBatchBuilder(version="1.5")
    builder.set_redistribute("nhrp")
    assert builder.get_operations()[-1]["path"][-1] == "nhrp"


def test_babel_14_rejects_redistribute_nhrp():
    builder = BabelBatchBuilder(version="1.4")
    with pytest.raises(ValueError, match="not supported"):
        builder.set_redistribute_ipv4("nhrp")
    with pytest.raises(ValueError, match="not supported"):
        builder.set_redistribute_ipv6("nhrp")
    # supported protocols still pass through
    builder.set_redistribute_ipv4("bgp")
    assert builder.get_operations()
    builder.delete_redistribute_ipv4("nhrp")
    assert builder.get_operations()[-1]["op"] == "delete"


def test_babel_15_allows_redistribute_nhrp():
    builder = BabelBatchBuilder(version="1.5")
    builder.set_redistribute_ipv4("nhrp")
    builder.set_redistribute_ipv6("nhrp")
    ops = builder.get_operations()
    assert ops[0]["path"] == ["protocols", "babel", "redistribute", "ipv4", "nhrp"]
    assert ops[1]["path"] == ["protocols", "babel", "redistribute", "ipv6", "nhrp"]


def test_bgp_14_rejects_redistribute_nhrp():
    builder = BgpBatchBuilder(version="1.4")
    with pytest.raises(ValueError, match="not supported"):
        builder.set_af_redistribute("ipv4-unicast", "nhrp")
    with pytest.raises(ValueError, match="not supported"):
        builder.set_af_redistribute_metric("ipv4-unicast", "nhrp", "10")
    with pytest.raises(ValueError, match="not supported"):
        builder.set_af_redistribute_route_map("ipv4-unicast", "nhrp", "RM")
    # supported protocols still pass through
    builder.set_af_redistribute("ipv4-unicast", "connected")
    assert builder.get_operations()


def test_bgp_15_allows_redistribute_nhrp():
    builder = BgpBatchBuilder(version="1.5")
    builder.set_af_redistribute("ipv4-unicast", "nhrp")
    assert builder.get_operations()[-1]["path"][-1] == "nhrp"


def test_vrf_bgp_14_rejects_redistribute_nhrp():
    builder = VrfBatchBuilder(version="1.4")
    with pytest.raises(ValueError, match="not supported"):
        builder.set_vrf_bgp_af_redistribute("blue", "ipv4-unicast,nhrp")
    with pytest.raises(ValueError, match="not supported"):
        builder.set_vrf_bgp_af_redistribute_metric("blue", "ipv4-unicast,nhrp,10")
    with pytest.raises(ValueError, match="not supported"):
        builder.set_vrf_bgp_af_redistribute_route_map("blue", "ipv4-unicast,nhrp,RM")


def test_vrf_ospf_14_rejects_redistribute_nhrp():
    builder = VrfBatchBuilder(version="1.4")
    with pytest.raises(ValueError, match="not supported"):
        builder.set_vrf_ospf_redistribute("blue", "nhrp")
    with pytest.raises(ValueError, match="not supported"):
        builder.set_vrf_ospf_redistribute_metric("blue", "nhrp,10")
    with pytest.raises(ValueError, match="not supported"):
        builder.set_vrf_ospf_redistribute_metric_type("blue", "nhrp,2")
    with pytest.raises(ValueError, match="not supported"):
        builder.set_vrf_ospf_redistribute_route_map("blue", "nhrp,RM")


def test_vrf_15_allows_redistribute_nhrp():
    builder = VrfBatchBuilder(version="1.5")
    builder.set_vrf_bgp_af_redistribute("blue", "ipv4-unicast,nhrp")
    builder.set_vrf_ospf_redistribute("blue", "nhrp")
    assert builder.get_operations()


def test_allowlist_rejects_unknown_redistribute_protocol():
    with pytest.raises(ValueError, match="not supported"):
        get_ospf_mapper("1.5").get_redistribute("not-a-protocol")
    with pytest.raises(ValueError, match="not supported"):
        get_babel_mapper("1.5").get_redistribute_ipv4("not-a-protocol")


def test_capabilities_read_mapper_allowlist():
    caps_14 = OspfBatchBuilder(version="1.4").get_capabilities()
    assert "nhrp" not in caps_14["redistribute_protocols"]
    assert caps_14["features"]["redistribute_nhrp"]["supported"] is False
    caps_15 = OspfBatchBuilder(version="1.5").get_capabilities()
    assert "nhrp" in caps_15["redistribute_protocols"]
    assert caps_15["features"]["redistribute_nhrp"]["supported"] is True
    babel_14 = BabelBatchBuilder(version="1.4").get_capabilities()
    assert "nhrp" not in babel_14["redistribute_protocols"]["ipv4"]
    babel_15 = BabelBatchBuilder(version="1.5").get_capabilities()
    assert "nhrp" in babel_15["redistribute_protocols"]["ipv4"]


@pytest.mark.parametrize("version", ["1.4", "1.4.0", "1.4.4 sagitta"])
def test_factories_substring_match_14(version):
    assert type(get_ethernet_mapper(version)).__name__ == "EthernetMapper_v1_4"
    assert type(get_firewall_zones_mapper(version)).__name__ == "FirewallZonesMapper_v1_4"


@pytest.mark.parametrize("version", ["1.5", "1.5.0", "2025.rolling"])
def test_factories_default_to_15(version):
    assert type(get_ethernet_mapper(version)).__name__ == "EthernetMapper_v1_5"
    assert type(get_firewall_zones_mapper(version)).__name__ == "FirewallZonesMapper_v1_5"
