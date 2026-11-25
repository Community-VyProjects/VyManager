"""PKI mapper: version factory, version difference and capabilities."""

from pathlib import Path

import pytest

from vyos_builders.pki.pki_batch_builder import PKIBatchBuilder
from vyos_mappers import CommandMapperRegistry
from vyos_mappers.pki import pki_versions
from vyos_mappers.pki.pki import PKIMapper
from vyos_mappers.pki.pki_versions.v1_5 import PKIMapperV1_5

VERSIONS_DIR = Path(pki_versions.__file__).parent


@pytest.mark.parametrize("version", ["1.4", "1.4.3", "VyOS 1.4.0-rc1"])
def test_factory_returns_shared_class_on_1_4(version):
    assert type(CommandMapperRegistry.get_mapper("pki", version)) is PKIMapper


@pytest.mark.parametrize("version", ["1.5", "latest", "2026.09.23-0027-rolling", "1.5-stream-2025-Q2"])
def test_factory_returns_subclass_for_anything_else(version):
    assert type(CommandMapperRegistry.get_mapper("pki", version)) is PKIMapperV1_5


def test_versions_package_has_no_1_4_file():
    names = {path.name for path in VERSIONS_DIR.glob("*.py")}
    assert names == {"__init__.py", "v1_5.py"}


def test_no_init_override_and_no_merge_proxy():
    assert "__init__" not in PKIMapper.__dict__
    assert "__init__" not in PKIMapperV1_5.__dict__
    assert not hasattr(PKIMapper, "__getattr__")


def test_listen_address_ipv6_by_version():
    assert PKIMapper("1.4").acme_listen_address_ipv6() is False
    assert PKIMapperV1_5("1.5").acme_listen_address_ipv6() is True


@pytest.mark.parametrize("version,expected", [("1.4.3", False), ("2026.09.23-0027-rolling", True)])
def test_capabilities_follow_the_mapper(version, expected):
    caps = PKIBatchBuilder(version).get_capabilities()
    assert caps["features"]["acme"]["listen_address_ipv6"] is expected


def test_capabilities_read_the_mapper_not_the_version_string(monkeypatch):
    """A 1.5 string whose mapper reports IPv4 only is IPv4 only."""
    monkeypatch.setattr(PKIMapperV1_5, "acme_listen_address_ipv6", lambda self: False)
    monkeypatch.setattr(PKIMapperV1_5, "rsa_key_size_values", lambda self: ("4096",))
    monkeypatch.setattr(PKIMapperV1_5, "openssh_public_type_values", lambda self: ("ssh-x",))
    features = PKIBatchBuilder("1.5").get_capabilities()["features"]
    assert features["acme"]["listen_address_ipv6"] is False
    assert features["acme"]["rsa_key_sizes"] == ["4096"]
    assert features["openssh"]["public_types"] == ["ssh-x"]


def test_capabilities_carry_the_lab_value_lists():
    caps = PKIBatchBuilder("1.4.3").get_capabilities()
    assert "version_info" not in caps
    # Lab `allowed:` lines, the same on both labs.
    assert caps["features"]["acme"]["rsa_key_sizes"] == ["2048", "3072", "4096"]
    assert caps["features"]["openssh"]["public_types"] == ["ssh-rsa"]
    assert PKIMapper("1.4").rsa_key_size_values() == ("2048", "3072", "4096")
    assert PKIMapper("1.4").openssh_public_type_values() == ("ssh-rsa",)


@pytest.mark.parametrize("version", ["1.4.3", "2026.09.23-0027-rolling"])
def test_openvpn_generate_path_has_no_install_and_no_name(version):
    mapper = CommandMapperRegistry.get_mapper("pki", version)
    assert mapper.openvpn_shared_secret_generate_path() == ["pki", "openvpn", "shared-secret"]


def test_reveal_fields_are_the_masked_fields():
    from vyos_mappers.pki import config_parse

    assert PKIMapper("1.4").reveal_kinds() == {
        kind: spec[3] for kind, spec in config_parse._KINDS.items()
    }
    assert PKIMapper("1.4").reveal_kinds() == {
        "ca": ("private_key",), "certificate": ("private_key",), "dh": ("parameters",),
        "key_pair": ("private_key",), "openssh": ("private_key",), "openvpn": ("key",),
    }
