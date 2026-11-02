"""VRF static, failover, DHCP, and DHCPv6 ops reuse the global builders.

The golden file lists the old mixin op names. Paths that VyOS 1.5 rejects
are the global builder's path, not the old mixin path.
"""

import json
from pathlib import Path

import pytest

from vyos_builders.dhcp.dhcp import DHCPBatchBuilder
from vyos_builders.failover.failover_batch_builder import FailoverBatchBuilder
from vyos_builders.static_routes.static_routes_batch_builder import StaticRoutesBatchBuilder
from vyos_builders.vrf.vrf_batch_builder import VrfBatchBuilder

_GOLDEN = json.loads(
    (Path(__file__).parent / "fixtures" / "vrf_feature_ops.json").read_text()
)


def test_feature_mixins_are_not_a_second_builder_tree():
    names = {cls.__name__ for cls in VrfBatchBuilder.__mro__}
    assert "VrfStaticMixin" not in names
    assert "VrfFailoverMixin" not in names
    assert "VrfDhcpMixin" not in names
    assert "VrfDhcpv6Mixin" not in names


def test_legacy_op_names_still_resolve():
    for name, spec in _GOLDEN.items():
        builder = VrfBatchBuilder("1.5")
        method = getattr(builder, name)
        if spec["value"] is None:
            method("blue")
        else:
            method("blue", spec["value"])
        assert builder.get_operations() == spec["ops"], name


def test_static_route_calls_global_builder(monkeypatch):
    called = {}
    real = StaticRoutesBatchBuilder.set_ipv4_route

    def spy(self, destination):
        called["dest"] = destination
        return real(self, destination)

    monkeypatch.setattr(StaticRoutesBatchBuilder, "set_ipv4_route", spy)
    builder = VrfBatchBuilder("1.5")
    builder.set_vrf_static_route("blue", "10.0.0.0/24")
    assert called == {"dest": "10.0.0.0/24"}
    assert builder.get_operations() == [
        {
            "op": "set",
            "path": ["vrf", "name", "blue", "protocols", "static", "route", "10.0.0.0/24"],
        }
    ]


def test_failover_route_calls_global_builder(monkeypatch):
    called = {}
    real = FailoverBatchBuilder.set_route

    def spy(self, destination):
        called["dest"] = destination
        return real(self, destination)

    monkeypatch.setattr(FailoverBatchBuilder, "set_route", spy)
    builder = VrfBatchBuilder("1.5")
    builder.set_vrf_failover_route("blue", "10.1.0.0/24")
    assert called == {"dest": "10.1.0.0/24"}
    global_ops = FailoverBatchBuilder("1.5").set_route("10.1.0.0/24").get_operations()
    assert builder.get_operations() == [
        {"op": op["op"], "path": ["vrf", "name", "blue"] + op["path"]} for op in global_ops
    ]


def test_dhcp_disable_calls_global_builder(monkeypatch):
    called = {}
    real = DHCPBatchBuilder.set_global_disable

    def spy(self):
        called["ran"] = True
        return real(self)

    monkeypatch.setattr(DHCPBatchBuilder, "set_global_disable", spy)
    builder = VrfBatchBuilder("1.5")
    builder.set_vrf_dhcp_disable("blue")
    assert called == {"ran": True}
    assert builder.get_operations() == [
        {"op": "set", "path": ["vrf", "name", "blue", "service", "dhcp-server", "disable"]}
    ]


def test_queued_ops_are_the_global_builder_output(monkeypatch):
    def spy(self, destination):
        self._operations.append({"op": "set", "path": ["MARK", destination]})
        return self

    monkeypatch.setattr(StaticRoutesBatchBuilder, "set_ipv4_route", spy)
    builder = VrfBatchBuilder("1.5")
    builder.set_vrf_static_route("blue", "10.0.0.0/24")
    assert builder.get_operations() == [
        {"op": "set", "path": ["MARK", "10.0.0.0/24"]}
    ]


def test_prefix_comes_from_path_prefix_mapper(monkeypatch):
    from vyos_mappers.path_prefix import PathPrefixMapper

    class Bare(PathPrefixMapper):
        def __getattr__(self, name):
            return getattr(self._inner, name)

    monkeypatch.setattr("vyos_builders.vrf.vrf_protocol.PathPrefixMapper", Bare)
    builder = VrfBatchBuilder("1.5")
    builder.set_vrf_static_route("blue", "10.0.0.0/24")
    assert builder.get_operations() == [
        {"op": "set", "path": ["protocols", "static", "route", "10.0.0.0/24"]}
    ]


def test_dhcp_and_failover_reject_on_1_4():
    builder = VrfBatchBuilder("1.4")
    with pytest.raises(ValueError, match="not supported on this device"):
        builder.set_vrf_dhcp_disable("blue")
    with pytest.raises(ValueError, match="not supported on this device"):
        builder.set_vrf_failover_route("blue", "10.0.0.0/24")


def test_static_bfd_source_follows_version():
    old = VrfBatchBuilder("1.4")
    old.set_vrf_static_route_next_hop_bfd_multi_hop_source(
        "blue", "10.0.0.0/24,192.0.2.1,192.0.2.2"
    )
    assert old.get_operations()[-1]["path"][-3:] == ["source", "192.0.2.2", "profile"]
    new = VrfBatchBuilder("1.5")
    new.set_vrf_static_route_next_hop_bfd_multi_hop_source(
        "blue", "10.0.0.0/24,192.0.2.1,192.0.2.2"
    )
    assert new.get_operations()[-1]["path"][-2:] == ["source-address", "192.0.2.2"]


def test_static_root_set_is_not_an_op():
    builder = VrfBatchBuilder("1.5")
    with pytest.raises(AttributeError):
        builder.set_vrf_static("blue")
    builder.delete_vrf_static("blue")
    assert builder.get_operations() == [
        {"op": "delete", "path": ["vrf", "name", "blue", "protocols", "static"]}
    ]


def test_ipv4_segments_set_is_a_noop_on_1_4():
    builder = VrfBatchBuilder("1.4")
    builder.set_vrf_static_route_next_hop_segments("blue", "10.0.0.0/24,192.0.2.1,1")
    assert builder.get_operations() == []


def test_short_value_does_not_emit():
    builder = VrfBatchBuilder("1.5")
    builder.set_vrf_static_route_next_hop("blue", "10.0.0.0/24")
    assert builder.get_operations() == []


def test_ui_schema_feature_ops_resolve():
    import re

    root = Path(__file__).resolve().parents[2] / "frontend" / "src"
    ops = set()
    for path in list((root / "components" / "vrf").rglob("*.ts")) + list(
        (root / "components" / "vrf").rglob("*.tsx")
    ):
        ops.update(re.findall(r"vrf_(?:static|failover|dhcpv6|dhcp)[a-z0-9_]*", path.read_text()))
    api = (root / "lib" / "api" / "vrf.ts").read_text()
    ops.update(re.findall(r"vrf_(?:static|failover|dhcpv6|dhcp)[a-z0-9_]*", api))
    # FailoverRouteModal builds `vrf_failover_route_${kind}` plus these leaves.
    for kind in ("next_hop", "dhcp_interface"):
        ops.add(f"vrf_failover_route_{kind}")
        for leaf in (
            "interface",
            "metric",
            "onlink",
            "check_type",
            "check_policy",
            "check_port",
            "check_timeout",
            "check_target",
            "check_target_interface",
            "check_target_vrf",
        ):
            ops.add(f"vrf_failover_route_{kind}_{leaf}")
    builder = VrfBatchBuilder("1.5")
    missing = []
    for op in sorted(ops):
        if op.endswith("_"):
            continue
        for verb in ("set_", "delete_"):
            try:
                getattr(builder, verb + op)
            except AttributeError:
                missing.append(verb + op)
    assert missing == []
    assert any(op.startswith("vrf_dhcp_") for op in ops)
    assert any(op.startswith("vrf_static_") for op in ops)


def test_1_5_dhcp_paths_match_the_global_tree():
    builder = VrfBatchBuilder("1.5")
    builder.set_vrf_dhcp_shared_network_ntp_server("blue", "NET,192.0.2.1")
    builder.set_vrf_dhcp_subnet_lease_default("blue", "NET,10.0.0.0/24,3600")
    builder.set_vrf_dhcpv6_subnet_vendor_option_cisco_tftp_server("blue", "NET,2001:db8::/64,2001:db8::1")
    paths = [op["path"] for op in builder.get_operations()]
    assert paths[0][-3:] == ["option", "ntp-server", "192.0.2.1"]
    assert paths[1][-2:] == ["lease", "3600"]
    assert "default" not in paths[1]
    assert paths[2][-5:] == ["option", "vendor-option", "cisco", "tftp-server", "2001:db8::1"]


def test_global_static_helpers_are_not_vrf_ops():
    builder = VrfBatchBuilder("1.5")
    with pytest.raises(AttributeError):
        builder.set_vrf_static_arp_interface("blue", "eth0")

