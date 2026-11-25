"""Interface mapper factories send a rolling version to the 1.5 class.

``show version`` on the 1.5 lab (100.64.64.5) reports
``VyOS 2026.09.23-0027-rolling`` and the 1.4 lab (100.64.64.4) reports
``VyOS 1.4.3``. Only a string that contains ``1.4`` is 1.4; every 1.4 leaf
is on the shared class, so 1.4 has no subclass file.
"""

from pathlib import Path

import pytest

from vyos_builders.interfaces.geneve import GeneveInterfaceBuilderMixin
from vyos_mappers import CommandMapperRegistry
from vyos_mappers.interfaces.bonding import BondingInterfaceMapper
from vyos_mappers.interfaces.bonding_versions import get_bonding_mapper
from vyos_mappers.interfaces.bonding_versions.v1_5 import BondingMapper_v1_5
from vyos_mappers.interfaces.bridge import BridgeInterfaceMapper
from vyos_mappers.interfaces.bridge_versions import get_bridge_mapper
from vyos_mappers.interfaces.bridge_versions.v1_5 import BridgeMapper_v1_5
from vyos_mappers.interfaces.geneve import GeneveInterfaceMapper
from vyos_mappers.interfaces.geneve_versions import get_geneve_mapper
from vyos_mappers.interfaces.geneve_versions.v1_5 import GeneveMapper_v1_5
from vyos_mappers.interfaces.pppoe import PppoeInterfaceMapper
from vyos_mappers.interfaces.pppoe_versions import get_pppoe_mapper
from vyos_mappers.interfaces.pppoe_versions.v1_5 import PppoeMapper_v1_5
from vyos_mappers.interfaces.pseudo_ethernet import PseudoEthernetInterfaceMapper
from vyos_mappers.interfaces.pseudo_ethernet_versions import get_pseudo_ethernet_mapper
from vyos_mappers.interfaces.pseudo_ethernet_versions.v1_5 import PseudoEthernetMapper_v1_5
from vyos_mappers.interfaces.virtual_ethernet import VirtualEthernetInterfaceMapper
from vyos_mappers.interfaces.virtual_ethernet_versions import get_virtual_ethernet_mapper
from vyos_mappers.interfaces.virtual_ethernet_versions.v1_5 import VirtualEthernetMapper_v1_5
from vyos_mappers.interfaces.wwan import WwanInterfaceMapper
from vyos_mappers.interfaces.wwan_versions import get_wwan_mapper
from vyos_mappers.interfaces.wwan_versions.v1_5 import WwanMapper_v1_5

MAPPERS_DIR = Path(__file__).resolve().parents[1] / "vyos_mappers" / "interfaces"

ROLLING = "2026.09.23-0027-rolling"
V14_STRINGS = ["1.4", "1.4.3", "VyOS 1.4.3"]
V15_STRINGS = ["1.5", ROLLING, "latest", "1.6", ""]

# (package, registry key, factory, shared class, 1.5 class,
#  1.5-only path method, args, expected path)
FACTORIES = [
    (
        "bonding", "interface_bonding", get_bonding_mapper,
        BondingInterfaceMapper, BondingMapper_v1_5,
        "get_eapol_ca_certificate", ("bond0", "CA1"),
        ["interfaces", "bonding", "bond0", "eapol", "ca-certificate", "CA1"],
    ),
    (
        "bridge", "interface_bridge", get_bridge_mapper,
        BridgeInterfaceMapper, BridgeMapper_v1_5,
        "get_member_interface_bpdu_guard", ("br0", "eth1"),
        ["interfaces", "bridge", "br0", "member", "interface", "eth1", "bpdu-guard"],
    ),
    (
        "geneve", "interface_geneve", get_geneve_mapper,
        GeneveInterfaceMapper, GeneveMapper_v1_5,
        "get_ipv6_address_interface_identifier", ("gnv0", "::1"),
        ["interfaces", "geneve", "gnv0", "ipv6", "address", "interface-identifier", "::1"],
    ),
    (
        "pppoe", "interface_pppoe", get_pppoe_mapper,
        PppoeInterfaceMapper, PppoeMapper_v1_5,
        "get_address", ("pppoe0", "dhcpv6"),
        ["interfaces", "pppoe", "pppoe0", "address", "dhcpv6"],
    ),
    (
        "pseudo_ethernet", "interface_pseudo_ethernet", get_pseudo_ethernet_mapper,
        PseudoEthernetInterfaceMapper, PseudoEthernetMapper_v1_5,
        "get_dhcpv6_options_no_request_dns", ("peth0",),
        ["interfaces", "pseudo-ethernet", "peth0", "dhcpv6-options", "no-request-dns"],
    ),
    (
        "virtual_ethernet", "interface_virtual_ethernet", get_virtual_ethernet_mapper,
        VirtualEthernetInterfaceMapper, VirtualEthernetMapper_v1_5,
        "get_netns", ("veth0", "ns1"),
        ["interfaces", "virtual-ethernet", "veth0", "netns", "ns1"],
    ),
    (
        "wwan", "interface_wwan", get_wwan_mapper,
        WwanInterfaceMapper, WwanMapper_v1_5,
        "get_dhcpv6_no_request_dns", ("wwan0",),
        ["interfaces", "wwan", "wwan0", "dhcpv6-options", "no-request-dns"],
    ),
]
IDS = [row[0] for row in FACTORIES]


@pytest.mark.parametrize("version", V14_STRINGS)
@pytest.mark.parametrize(
    "package, key, factory, shared, v15, method, args, path", FACTORIES, ids=IDS
)
def test_v14_string_gets_the_shared_class(package, key, factory, shared, v15, method, args, path, version):
    mapper = factory(version)
    assert type(mapper) is shared
    assert type(CommandMapperRegistry.get_mapper(key, version)) is shared


@pytest.mark.parametrize("version", V15_STRINGS)
@pytest.mark.parametrize(
    "package, key, factory, shared, v15, method, args, path", FACTORIES, ids=IDS
)
def test_other_strings_get_the_v15_class(package, key, factory, shared, v15, method, args, path, version):
    mapper = factory(version)
    assert type(mapper) is v15
    assert getattr(mapper, method)(*args) == path
    assert type(CommandMapperRegistry.get_mapper(key, version)) is v15


@pytest.mark.parametrize(
    "package, key, factory, shared, v15, method, args, path", FACTORIES, ids=IDS
)
def test_v15_class_takes_the_version_argument(package, key, factory, shared, v15, method, args, path):
    """The 1.5 subclass has no ``__init__`` of its own; the shared one runs."""
    assert "__init__" not in vars(v15)
    assert factory(ROLLING).version == ROLLING


@pytest.mark.parametrize(
    "package, key, factory, shared, v15, method, args, path", FACTORIES, ids=IDS
)
def test_no_v14_version_file(package, key, factory, shared, v15, method, args, path):
    versions = MAPPERS_DIR / f"{package}_versions"
    assert (versions / "__init__.py").is_file()
    assert (versions / "v1_5.py").is_file()
    assert not (versions / "v1_4.py").exists()


def test_rolling_geneve_capabilities_advertise_interface_identifier():
    caps = GeneveInterfaceBuilderMixin(version=ROLLING).get_capabilities()
    assert caps["features"]["ipv6_address_interface_identifier"]["supported"] is True
    caps = GeneveInterfaceBuilderMixin(version="1.4.3").get_capabilities()
    assert caps["features"]["ipv6_address_interface_identifier"]["supported"] is False
