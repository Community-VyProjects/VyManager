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

from vyos_builders.ospf.ospf_batch_builder import OspfBatchBuilder
from vyos_mappers.firewall.zones_versions import get_firewall_zones_mapper
from vyos_mappers.interfaces.ethernet_versions import get_ethernet_mapper
from vyos_mappers.isis.isis_versions.v1_4 import IsisMapperV1_4


def test_isis_v14_rejects_ti_lfa_instead_of_silent_noop():
    mapper = IsisMapperV1_4()
    with pytest.raises(ValueError, match="1.5"):
        mapper.get_interface_ti_lfa_path("eth0")
    with pytest.raises(ValueError, match="1.5"):
        mapper.get_sr_srv6_locator_path("LOC1")
    with pytest.raises(ValueError, match="1.5"):
        mapper.get_te_export_path()


def test_ospf_14_rejects_redistribute_nhrp():
    builder = OspfBatchBuilder(version="1.4")
    with pytest.raises(ValueError, match="1.5"):
        builder.set_redistribute("nhrp")
    # supported protocols still pass through
    builder.set_redistribute("bgp")
    assert builder.get_operations()


def test_ospf_15_allows_redistribute_nhrp():
    builder = OspfBatchBuilder(version="1.5")
    builder.set_redistribute("nhrp")
    assert builder.get_operations()[-1]["path"][-1] == "nhrp"


@pytest.mark.parametrize("version", ["1.4", "1.4.0", "1.4.4 sagitta"])
def test_factories_substring_match_14(version):
    assert type(get_ethernet_mapper(version)).__name__ == "EthernetMapper_v1_4"
    assert type(get_firewall_zones_mapper(version)).__name__ == "FirewallZonesMapper_v1_4"


@pytest.mark.parametrize("version", ["1.5", "1.5.0", "2025.rolling"])
def test_factories_default_to_15(version):
    assert type(get_ethernet_mapper(version)).__name__ == "EthernetMapper_v1_5"
    assert type(get_firewall_zones_mapper(version)).__name__ == "FirewallZonesMapper_v1_5"
