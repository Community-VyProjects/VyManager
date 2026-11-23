"""Capability flags for firewall groups, zones, and family read the mapper allowlist.

Domain groups exist on 1.4 and 1.5. Remote groups, zone member nodes, GRE,
prerouting raw, and directional IPsec exist only on 1.5. validateTmplPath on
100.64.64.50 and 100.64.64.5.
"""

import inspect
from pathlib import Path

import pytest

from vyos_builders.firewall.family_batch_builder import FirewallFamilyBatchBuilder
from vyos_builders.firewall.groups_batch_builder import FirewallGroupsBatchBuilder
from vyos_builders.firewall.zones import FirewallZonesBatchBuilder
from vyos_mappers.firewall import family_versions, groups_versions
from vyos_mappers.firewall.family import FirewallFamilyMapper
from vyos_mappers.firewall.family_versions import get_firewall_family_mapper
from vyos_mappers.firewall.family_versions.v1_4 import FirewallFamilyMapperV1_4
from vyos_mappers.firewall.family_versions.v1_5 import FirewallFamilyMapperV1_5
from vyos_mappers.firewall.groups import FirewallGroupsMapper
from vyos_mappers.firewall.groups_versions import get_firewall_groups_mapper
from vyos_mappers.firewall.groups_versions.v1_5 import FirewallGroupsMapperV1_5
from vyos_mappers.firewall.zones import FirewallZonesMapper


def test_domain_group_flag_follows_the_device_tree():
    caps14 = FirewallGroupsBatchBuilder(version="1.4").get_capabilities()["group_types"]
    caps15 = FirewallGroupsBatchBuilder(version="1.5").get_capabilities()["group_types"]
    assert caps14["domain_group"]["supported"] is True
    assert caps15["domain_group"]["supported"] is True
    assert caps14["remote_group"]["supported"] is False
    assert caps15["remote_group"]["supported"] is True
    assert "domain_group" in FirewallGroupsBatchBuilder(version="1.4").get_capabilities()["operations"]
    assert "remote_group" not in FirewallGroupsBatchBuilder(version="1.4").get_capabilities()["operations"]
    assert "remote_group" in FirewallGroupsBatchBuilder(version="1.5").get_capabilities()["operations"]


def test_group_path_follows_the_mapper_allowlist(monkeypatch):
    """Remote-group paths follow the same set the capability flag reads."""
    monkeypatch.setattr(
        FirewallGroupsMapperV1_5,
        "versioned_nodes",
        lambda self: frozenset(),
    )
    builder = FirewallGroupsBatchBuilder(version="1.5")
    with pytest.raises(ValueError, match="not supported"):
        builder.set_remote_group("G1")
    assert builder.get_operations() == []
    builder.set_domain_group("G1")
    assert builder.get_operations()[0]["path"] == ["firewall", "group", "domain-group", "G1"]


def test_group_mapper_factory_follows_the_version_string():
    """Only a string that contains 1.4 is 1.4; a rolling string is 1.5."""
    assert type(get_firewall_groups_mapper("1.4.3")) is FirewallGroupsMapper
    for version in ("1.5", "2026.09.23-0027-rolling", "latest"):
        assert isinstance(get_firewall_groups_mapper(version), FirewallGroupsMapperV1_5)
    shared = FirewallGroupsMapper("1.4")
    assert not hasattr(shared, "get_remote_group")
    assert shared.versioned_nodes() == frozenset()
    assert FirewallGroupsMapperV1_5("1.5").versioned_nodes() == frozenset({"remote-group"})


def test_group_versions_package_has_no_empty_1_4_file():
    package = Path(groups_versions.__file__).parent
    assert sorted(p.name for p in package.glob("*.py")) == ["__init__.py", "v1_5.py"]


@pytest.mark.parametrize("version", ["1.4", "1.5"])
def test_group_capability_ops_match_the_builder(version):
    """Every advertised op is a builder method, and every builder op is advertised."""
    builder = FirewallGroupsBatchBuilder(version=version)
    caps = builder.get_capabilities()
    advertised = {op for ops in caps["operations"].values() for op in ops}
    supported = {key for key, flag in caps["group_types"].items() if flag["supported"]}
    assert set(caps["operations"]) == supported
    for op in advertised:
        assert callable(getattr(builder, op, None)), op
    builder_ops = {
        name for name, _ in inspect.getmembers(builder, callable)
        if name.startswith(("set_", "delete_"))
    }
    if version == "1.4":
        builder_ops = {name for name in builder_ops if "remote_group" not in name}
    assert advertised == builder_ops
    assert caps["statistics"]["total_operations"] == len(advertised)
    assert "set_address_group_include" in caps["operations"]["address_group"]
    assert "delete_mac_group_include" in caps["operations"]["mac_group"]
    assert "version_number" not in caps


def test_nondirectional_ipsec_follows_the_allowlist():
    builder = FirewallFamilyBatchBuilder(version="1.4")
    with pytest.raises(ValueError, match="base chain prerouting_raw does not exist"):
        builder.set_rule_ipsec_match_ipsec("prerouting_raw", 10, False)
    assert builder.get_operations() == []
    builder.set_rule_ipsec_match_ipsec("forward", 10, False)
    assert builder.get_operations()[0]["path"][-2:] == ["ipsec", "match-ipsec"]
    other = FirewallFamilyBatchBuilder(version="1.5")
    with pytest.raises(ValueError, match="not supported"):
        other.set_rule_ipsec_match_ipsec("forward", 10, False)
    assert other.get_operations() == []


def test_zone_parse_uses_the_mapper_allowlist():
    from routers.firewall.zones import _parse_zone
    cfg = {
        "member": {"interface": ["eth1"], "vrf": ["blue"]},
        "default-firewall": {"name": "RS1"},
        "interface": ["eth9"],
    }
    latest = _parse_zone("LAN", cfg, "latest")
    assert latest["interfaces"] == ["eth1"]
    assert latest["vrfs"] == ["blue"]
    assert latest["default_firewall"]["name"] == "RS1"
    v14 = _parse_zone("LAN", cfg, "1.4")
    assert v14["interfaces"] == ["eth9"]
    assert v14["vrfs"] == []
    assert v14["default_firewall"] is None


def test_group_flags_read_the_mapper_allowlist(monkeypatch):
    """A second handwritten version check in get_capabilities() would ignore this."""
    monkeypatch.setattr(
        FirewallGroupsMapper,
        "supported_group_types",
        lambda self: frozenset({"domain-group"}),
    )
    caps = FirewallGroupsBatchBuilder(version="1.5").get_capabilities()
    assert caps["group_types"]["domain_group"]["supported"] is True
    assert caps["group_types"]["remote_group"]["supported"] is False
    assert caps["group_types"]["address_group"]["supported"] is False
    assert "domain_group" in caps["operations"]
    assert "remote_group" not in caps["operations"]
    assert "address_group" not in caps["operations"]


def test_zone_flags_follow_the_device_tree():
    caps14 = FirewallZonesBatchBuilder(version="1.4").get_capabilities()["features"]
    caps15 = FirewallZonesBatchBuilder(version="1.5").get_capabilities()["features"]
    assert caps14["interface_direct"]["supported"] is True
    assert caps14["member_interface"]["supported"] is False
    assert caps14["member_vrf"]["supported"] is False
    assert caps14["default_firewall"]["supported"] is False
    assert caps15["interface_direct"]["supported"] is False
    assert caps15["member_interface"]["supported"] is True
    assert caps15["member_vrf"]["supported"] is True
    assert caps15["default_firewall"]["supported"] is True


def test_zone_flags_read_the_mapper_allowlist(monkeypatch):
    """A second handwritten version check in get_capabilities() would ignore this."""
    monkeypatch.setattr(
        FirewallZonesMapper,
        "supported_zone_nodes",
        lambda self: frozenset({"interface"}),
    )
    caps = FirewallZonesBatchBuilder(version="1.5").get_capabilities()["features"]
    assert caps["interface_direct"]["supported"] is True
    assert caps["member_interface"]["supported"] is False
    assert caps["default_firewall"]["supported"] is False


def test_family_flags_follow_the_device_tree():
    caps14 = FirewallFamilyBatchBuilder(version="1.4").get_capabilities()["features"]
    caps15 = FirewallFamilyBatchBuilder(version="1.5").get_capabilities()["features"]
    for flag in ("remote_group", "prerouting_raw", "gre_matching", "ipsec_directional"):
        assert caps14[flag]["supported"] is False
        assert caps15[flag]["supported"] is True


def test_family_flags_read_the_mapper_allowlist(monkeypatch):
    """A second handwritten version check in get_capabilities() would ignore this."""
    monkeypatch.setattr(FirewallFamilyMapperV1_5, "versioned_nodes", lambda self: frozenset({"gre"}))
    caps = FirewallFamilyBatchBuilder(version="1.5").get_capabilities()["features"]
    assert caps["gre_matching"]["supported"] is True
    assert caps["remote_group"]["supported"] is False
    assert caps["prerouting_raw"]["supported"] is False
    assert caps["ipsec_directional"]["supported"] is False
    builder = FirewallFamilyBatchBuilder(version="1.5")
    builder.set_rule_gre_key("forward", 10, "1", False)
    assert builder.get_operations()[0]["path"][-3:] == ["gre", "key", "1"]
    builder.clear()
    with pytest.raises(ValueError, match="not supported"):
        builder.set_rule_source_group_remote("forward", 10, "RG", False)
    with pytest.raises(ValueError, match="not supported"):
        builder.set_prerouting_raw_rule(10)
    assert builder.get_operations() == []


def test_family_mapper_factory_follows_the_version_string():
    """Only a string that contains 1.4 is 1.4; a rolling string is 1.5."""
    for family in ("ipv4", "ipv6"):
        v14 = get_firewall_family_mapper("1.4.3", family)
        assert type(v14) is FirewallFamilyMapperV1_4
        assert v14.family == family
        for version in ("1.5", "2026.09.23-0027-rolling", "latest"):
            v15 = get_firewall_family_mapper(version, family)
            assert type(v15) is FirewallFamilyMapperV1_5
            assert v15.family == family
    assert FirewallFamilyMapper("1.4", "ipv4").versioned_nodes() == frozenset()
    assert FirewallFamilyMapperV1_4("1.4", "ipv4").versioned_nodes() == frozenset({"ipsec-match"})
    assert FirewallFamilyMapperV1_5("1.5", "ipv4").versioned_nodes() == frozenset(
        {"remote-group", "ipsec-directional", "gre", "prerouting-raw"}
    )


def test_family_version_only_paths_live_on_their_subclass():
    """The shared class and the other version do not carry a version-only path."""
    shared = FirewallFamilyMapper("1.4", "ipv4")
    v14 = FirewallFamilyMapperV1_4("1.4", "ipv4")
    v15 = FirewallFamilyMapperV1_5("1.5", "ipv4")
    only_14 = ("get_rule_ipsec_match_ipsec", "get_rule_ipsec_match_none_path")
    only_15 = (
        "get_rule_source_group_remote",
        "get_rule_ipsec_match_ipsec_in",
        "get_rule_gre_key",
        "get_rule_gre_path",
        "get_prerouting_raw_rule",
        "get_prerouting_raw_default_jump_target_path",
    )
    for name in only_14:
        assert hasattr(v14, name) and not hasattr(shared, name) and not hasattr(v15, name), name
    for name in only_15:
        assert hasattr(v15, name) and not hasattr(shared, name) and not hasattr(v14, name), name
    for cls in (FirewallFamilyMapperV1_4, FirewallFamilyMapperV1_5):
        assert "__init__" not in vars(cls)


def test_family_versions_package_has_no_merge_proxy():
    package = Path(family_versions.__file__).parent
    assert sorted(p.name for p in package.glob("*.py")) == ["__init__.py", "v1_4.py", "v1_5.py"]
    assert "MergedMapper" not in Path(family_versions.__file__).read_text()
    assert "__getattr__" not in Path(family_versions.__file__).read_text()
    # One factory: no per-family re-export packages or shared-class aliases.
    firewall = package.parent
    for rel in ("ipv4.py", "ipv6.py", "ipv4_versions/__init__.py", "ipv6_versions/__init__.py"):
        assert not (firewall / rel).exists(), rel


def test_family_tcp_flags_come_from_the_mapper(monkeypatch):
    """Only a lab flag or 'not <flag>' becomes a path node; capabilities list the same set."""
    builder = FirewallFamilyBatchBuilder(version="1.4")
    assert builder.get_capabilities()["tcp_flags"] == builder._m().tcp_flag_names()
    builder.set_rule_tcp_flags("forward", 10, "syn", False)
    builder.set_rule_tcp_flags("forward", 10, "not ack", False)
    assert [op["path"][-3:] for op in builder.get_operations()] == [
        ["tcp", "flags", "syn"],
        ["flags", "not", "ack"],
    ]
    builder.clear()
    for bad in ("", "not", "syn ack", "not not", "syn extra node", "bogus", "not bogus"):
        with pytest.raises(ValueError, match="tcp flag"):
            builder.set_rule_tcp_flags("forward", 10, bad, False)
    assert builder.get_operations() == []
    monkeypatch.setattr(FirewallFamilyMapper, "tcp_flag_names", lambda self: ["syn"])
    narrowed = FirewallFamilyBatchBuilder(version="1.5")
    assert narrowed.get_capabilities()["tcp_flags"] == ["syn"]
    with pytest.raises(ValueError, match="tcp flag"):
        narrowed.set_rule_tcp_flags("forward", 10, "ack", False)


@pytest.mark.parametrize("version", ["1.4", "1.5"])
def test_family_builder_reads_the_registered_subclass(version):
    builder = FirewallFamilyBatchBuilder(version=version, family="ipv6")
    expected = FirewallFamilyMapperV1_4 if version == "1.4" else FirewallFamilyMapperV1_5
    assert type(builder.mappers[builder.mapper_key]) is expected


@pytest.mark.parametrize("chain", ["filter", "name", "prerouting raw", ""])
def test_family_base_chain_rejects_an_unknown_chain(chain):
    builder = FirewallFamilyBatchBuilder(version="1.5")
    with pytest.raises(ValueError, match="does not exist"):
        builder.set_rule_action(chain, 10, "drop", False)
    assert builder.get_operations() == []


def test_family_batch_maps_unsupported_nodes_to_400(monkeypatch):
    """A 1.4 request for a missing node is 400 and never commits."""
    from types import SimpleNamespace

    from fastapi import FastAPI
    from fastapi.testclient import TestClient

    executed = []

    async def allow(*_args, **_kwargs):
        return None

    class Service:
        def get_version(self):
            return "1.4"

        def execute_batch(self, batch):
            executed.append(batch)
            return SimpleNamespace(status=200, result="", error=None)

    monkeypatch.setattr("routers.firewall.family.require_write_permission", allow)
    monkeypatch.setattr(
        "routers.firewall.family.get_session_vyos_service",
        lambda _req: Service(),
    )
    from routers.firewall.ipv4 import router

    app = FastAPI()
    app.include_router(router)
    client = TestClient(app)
    batch = client.post(
        "/vyos/firewall/ipv4/batch",
        json={
            "chain": "prerouting_raw",
            "rule_number": 10,
            "operations": [{"op": "set_rule_action", "value": "drop"}],
        },
    )
    assert batch.status_code == 400, batch.text
    assert batch.json()["detail"] == "firewall ipv4 base chain prerouting_raw does not exist"
    reorder = client.post(
        "/vyos/firewall/ipv4/reorder",
        json={
            "chain": "prerouting_raw",
            "rules": [{"old_number": 10, "new_number": 20, "rule_data": {}}],
        },
    )
    assert reorder.status_code == 400, reorder.text
    assert reorder.json()["detail"] == "firewall ipv4 base chain prerouting_raw does not exist"
    assert executed == []
    builder = FirewallFamilyBatchBuilder(version="1.4")
    with pytest.raises(ValueError, match="does not exist"):
        builder.set_rule_action("prerouting_raw", 10, "drop", False)
    assert builder.get_operations() == []


def test_zone_path_follows_the_mapper_allowlist(monkeypatch):
    """Path methods must follow the same set the capability flag reads."""
    monkeypatch.setattr(
        FirewallZonesMapper,
        "supported_zone_nodes",
        lambda self: frozenset({"interface"}),
    )
    builder = FirewallZonesBatchBuilder(version="1.5")
    builder.set_zone_interface("LAN", "eth1")
    assert builder.get_operations()[0]["path"] == ["firewall", "zone", "LAN", "interface", "eth1"]
    builder.clear()
    with pytest.raises(ValueError, match="not supported"):
        builder.delete_zone_default_firewall_name("LAN")
    assert builder.get_operations() == []


def test_zone_delete_paths_raise_on_the_other_version():
    builder = FirewallZonesBatchBuilder(version="1.4")
    with pytest.raises(ValueError, match="not supported"):
        builder.delete_zone_default_firewall_name("LAN")
    assert builder.get_operations() == []
    from vyos_mappers.firewall.zones_versions import get_firewall_zones_mapper
    with pytest.raises(ValueError, match="not supported"):
        get_firewall_zones_mapper("1.5").get_zone_interface_path("LAN")
    with pytest.raises(ValueError, match="not supported"):
        get_firewall_zones_mapper("1.4").get_zone_member_interface_path("LAN")


@pytest.mark.parametrize(
    "method, args",
    [
        ("set_rule_source_group_remote", ("forward", 10, "RG", False)),
        ("set_rule_gre_key", ("forward", 10, "1", False)),
        ("set_prerouting_raw_rule", (10,)),
        ("set_rule_ipsec_match_ipsec_in", ("forward", 10, False)),
    ],
)
def test_family_v15_nodes_rejected_on_1_4(method, args):
    builder = FirewallFamilyBatchBuilder(version="1.4")
    with pytest.raises(ValueError, match="not supported"):
        getattr(builder, method)(*args)
    assert builder.get_operations() == []
