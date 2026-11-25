"""Interface factories with a real 1.4 subclass send a rolling version to 1.5.

``show version`` on the 1.5 lab (100.64.64.5) reports
``VyOS 2026.09.23-0027-rolling`` and the 1.4 lab (100.64.64.4) reports
``VyOS 1.4.3``. Only a string that contains ``1.4`` is 1.4.

The lab template trees differ on these leaves:

- openvpn: 1.4 has ``encryption ncp-ciphers``; 1.5 has ``encryption
  data-ciphers`` and ``encryption data-ciphers-fallback``.
- wireless: 1.4 has ``country-code``; 1.5 has ``bssid``.
"""

import pytest

from vyos_mappers import CommandMapperRegistry
from vyos_mappers.interfaces.openvpn_versions import get_openvpn_mapper
from vyos_mappers.interfaces.openvpn_versions.v1_4 import OpenvpnMapper_v1_4
from vyos_mappers.interfaces.openvpn_versions.v1_5 import OpenvpnMapper_v1_5
from vyos_mappers.interfaces.wireless_versions import get_wireless_mapper
from vyos_mappers.interfaces.wireless_versions.v1_4 import WirelessMapper_v1_4
from vyos_mappers.interfaces.wireless_versions.v1_5 import WirelessMapper_v1_5

ROLLING = "2026.09.23-0027-rolling"
V14_STRINGS = ["1.4", "1.4.3", "VyOS 1.4.3"]
V15_STRINGS = ["1.5", ROLLING, "latest", "1.6", ""]

# (package, registry key, factory, 1.4 class, 1.5 class,
#  (method, args, 1.4 path), (method, args, 1.5 path))
FACTORIES = [
    (
        "openvpn", "interface_openvpn", get_openvpn_mapper,
        OpenvpnMapper_v1_4, OpenvpnMapper_v1_5,
        (
            "get_encryption_data_cipher", ("vtun0", "aes256gcm"),
            ["interfaces", "openvpn", "vtun0", "encryption", "ncp-ciphers", "aes256gcm"],
        ),
        (
            "get_encryption_data_cipher", ("vtun0", "aes256gcm"),
            ["interfaces", "openvpn", "vtun0", "encryption", "data-ciphers", "aes256gcm"],
        ),
    ),
    (
        "wireless", "interface_wireless", get_wireless_mapper,
        WirelessMapper_v1_4, WirelessMapper_v1_5,
        (
            "get_country_code", ("wlan0", "us"),
            ["interfaces", "wireless", "wlan0", "country-code", "us"],
        ),
        (
            "get_bssid", ("wlan0", "aa:bb:cc:dd:ee:ff"),
            ["interfaces", "wireless", "wlan0", "bssid", "aa:bb:cc:dd:ee:ff"],
        ),
    ),
]
IDS = [row[0] for row in FACTORIES]
PARAMS = "package, key, factory, v14, v15, leaf14, leaf15"


@pytest.mark.parametrize("version", V14_STRINGS)
@pytest.mark.parametrize(PARAMS, FACTORIES, ids=IDS)
def test_v14_string_gets_the_v14_class(package, key, factory, v14, v15, leaf14, leaf15, version):
    mapper = factory(version)
    assert type(mapper) is v14
    method, args, path = leaf14
    assert getattr(mapper, method)(*args) == path
    assert type(CommandMapperRegistry.get_mapper(key, version)) is v14


@pytest.mark.parametrize("version", V15_STRINGS)
@pytest.mark.parametrize(PARAMS, FACTORIES, ids=IDS)
def test_other_strings_get_the_v15_class(package, key, factory, v14, v15, leaf14, leaf15, version):
    mapper = factory(version)
    assert type(mapper) is v15
    method, args, path = leaf15
    assert getattr(mapper, method)(*args) == path
    assert type(CommandMapperRegistry.get_mapper(key, version)) is v15


@pytest.mark.parametrize(PARAMS, FACTORIES, ids=IDS)
def test_subclasses_take_the_version_argument(package, key, factory, v14, v15, leaf14, leaf15):
    """Neither subclass has an ``__init__`` of its own; the shared one runs."""
    assert "__init__" not in vars(v14)
    assert "__init__" not in vars(v15)
    assert factory("1.4.3").version == "1.4.3"
    assert factory(ROLLING).version == ROLLING


def test_rolling_openvpn_fallback_cipher_path():
    mapper = get_openvpn_mapper(ROLLING)
    assert mapper.get_encryption_data_ciphers_fallback("vtun0", "aes256") == [
        "interfaces", "openvpn", "vtun0", "encryption", "data-ciphers-fallback", "aes256",
    ]


def test_rolling_wireless_parse_reads_bssid_not_country_code():
    raw = {"bssid": "aa:bb:cc:dd:ee:ff", "country-code": "us"}
    parsed = get_wireless_mapper(ROLLING).parse_single_interface("wlan0", raw)
    assert parsed["bssid"] == "aa:bb:cc:dd:ee:ff"
    assert "country_code" not in parsed
    parsed = get_wireless_mapper("1.4.3").parse_single_interface("wlan0", raw)
    assert parsed["country_code"] == "us"
    assert "bssid" not in parsed
