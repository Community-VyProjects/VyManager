"""VRF static, failover, DHCP, and DHCPv6 ops reuse the global builders.

The golden file is the path contract of the deleted handwritten mixins.
A structural test requires the global builder method to run, so a mapper-only
fallback cannot satisfy it.
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


def test_deleted_mixin_paths_are_unchanged():
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


def test_static_root_set_is_not_an_op():
    builder = VrfBatchBuilder("1.5")
    with pytest.raises(AttributeError):
        builder.set_vrf_static("blue")
    builder.delete_vrf_static("blue")
    assert builder.get_operations() == [
        {"op": "delete", "path": ["vrf", "name", "blue", "protocols", "static"]}
    ]


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
