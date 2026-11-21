"""vyos_version is validated on input and resolved the same way by every factory."""

import pytest
from pydantic import ValidationError

from routers.session.session import InstanceCreateRequest, InstanceUpdateRequest
from vyos_mappers.base import is_vyos_1_4
from vyos_mappers.nat66.nat66_versions import get_nat66_mapper
from vyos_mappers.nat66.nat66_versions.v1_5 import NAT66Mapper_v1_5
from vyos_mappers.pim6 import pim6_versions
from vyos_mappers.pim6.pim6_versions import get_pim6_mapper

_CREATE = dict(site_id="s", name="n", host="h", api_key="k")


@pytest.mark.parametrize("version", ["1.4", "1.5"])
def test_known_versions_accepted(version):
    assert InstanceCreateRequest(**_CREATE, vyos_version=version).vyos_version == version
    assert InstanceUpdateRequest(vyos_version=version).vyos_version == version


@pytest.mark.parametrize("version", ["1.6", "latest", "rolling", "", "1.4 "])
def test_unknown_versions_rejected(version):
    with pytest.raises(ValidationError):
        InstanceCreateRequest(**_CREATE, vyos_version=version)
    with pytest.raises(ValidationError):
        InstanceUpdateRequest(vyos_version=version)


def test_update_without_version_still_allowed():
    assert InstanceUpdateRequest(name="x").vyos_version is None


@pytest.mark.parametrize(
    "version,expected",
    [("1.4", True), ("1.4.0", True), ("1.5", False), ("1.5.0", False), ("latest", False), ("1.3", False)],
)
def test_is_vyos_1_4(version, expected):
    assert is_vyos_1_4(version) is expected


@pytest.mark.parametrize("version", ["latest", "1.6", "rolling"])
def test_factories_agree_on_unknown_versions(version, monkeypatch):
    # Legacy rows may hold free text; every factory must pick 1.5 for it.
    assert isinstance(get_nat66_mapper(version), NAT66Mapper_v1_5)
    monkeypatch.setattr(pim6_versions, "Pim6MapperV1_4", type("V14", (), {"which": "1.4"}))
    monkeypatch.setattr(pim6_versions, "Pim6MapperV1_5", type("V15", (), {"which": "1.5"}))
    assert get_pim6_mapper(version).which == "1.5"


@pytest.mark.parametrize("stored,expected", [("1.4", "1.4"), ("1.5", "1.5"), ("latest", "1.5"), (None, "1.5"), ("", "1.5")])
def test_device_config_normalizes_legacy_versions(stored, expected):
    from vyos_service import VyOSDeviceConfig

    assert VyOSDeviceConfig(hostname="h", apikey="k", version=stored).version == expected
