"""VRF static, failover, DHCP, and DHCPv6 ops reuse the global builders."""

from pathlib import Path

import pytest

from vyos_builders.dhcp.dhcp import DHCPBatchBuilder
from vyos_builders.failover.failover_batch_builder import FailoverBatchBuilder
from vyos_builders.static_routes.static_routes_batch_builder import StaticRoutesBatchBuilder
from vyos_builders.vrf.vrf_batch_builder import VrfBatchBuilder


def test_feature_mixins_are_not_a_second_builder_tree():
    names = {cls.__name__ for cls in VrfBatchBuilder.__mro__}
    assert "VrfStaticMixin" not in names
    assert "VrfFailoverMixin" not in names
    assert "VrfDhcpMixin" not in names
    assert "VrfDhcpv6Mixin" not in names


def test_legacy_op_names_still_resolve():
    from vyos_builders.vrf.legacy_ops import LEGACY_OPS

    builder = VrfBatchBuilder("1.5")
    missing = [name for name in sorted(LEGACY_OPS) if not hasattr(builder, name)]
    assert missing == []
    for gone in (
        "set_vrf_dhcp_subnet_lease_max",
        "set_vrf_dhcp_subnet_lease_min",
        "set_vrf_dhcp_dynamic_dns_update_enable",
        "set_vrf_dhcpv6_subnet_vendor_option_cisco_bootfile",
    ):
        with pytest.raises(AttributeError):
            getattr(builder, gone)


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
    builder.set_vrf_static_route_next_hop_bfd_multi_hop_source(
        "blue", "10.0.0.0/24,192.0.2.1,192.0.2.2"
    )
    builder.set_vrf_static_route_next_hop_segments(
        "blue", "10.0.0.0/24,192.0.2.1,fc00::1"
    )
    paths = [op["path"] for op in builder.get_operations()]
    assert all(path[:3] != ["vrf", "name", "blue"] for path in paths)
    assert paths[1][-2:] == ["source-address", "192.0.2.2"]
    assert paths[2][-1] == "fc00::1"


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
    assert old.get_operations()[-1]["path"][:3] == ["vrf", "name", "blue"]
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


def test_short_value_is_rejected():
    builder = VrfBatchBuilder("1.5")
    with pytest.raises(ValueError, match="expects"):
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


def _schema_fields(text: str):
    """Yield {op, args, path} from schema literals and the option/DDNS maps."""
    import re

    for block in re.finditer(r"\{[^{}]*op:\s*\"([^\"]+)\"[^{}]*\}", text):
        body = block.group(0)
        args = re.findall(r"args:\s*\[([^\]]*)\]", body)
        path = re.findall(r"path:\s*\[([^\]]*)\]", body)
        if not path or not re.search(r"\"", path[0]):
            continue
        yield {
            "op": block.group(1),
            "args": re.findall(r"\"([^\"]+)\"", args[0]) if args else [],
            "path": re.findall(r"\"([^\"]+)\"", path[0]),
        }
    for match in re.finditer(
        r"\[\s*((?:\"[^\"]+\"\s*,?\s*)+)\]\.map\(\((\w+)\) => \(\{([^}]*)\}\)\)",
        text,
        re.S,
    ):
        values = re.findall(r"\"([^\"]+)\"", match.group(1))
        var = match.group(2)
        body = match.group(3)
        op = re.search(r"op:\s*\"([^\"]+)\"", body)
        if not op:
            continue
        for value in values:
            def tokens(source: str):
                out = []
                for part in source.split(","):
                    part = part.strip()
                    if part == var:
                        out.append(value)
                    elif part.startswith('"') and part.endswith('"'):
                        out.append(part[1:-1])
                return out
            args = re.search(r"args:\s*\[([^\]]*)\]", body)
            path = re.search(r"path:\s*\[([^\]]*)\]", body)
            yield {
                "op": op.group(1),
                "args": tokens(args.group(1)) if args else [],
                "path": tokens(path.group(1)) if path else [],
            }
    options = re.search(r"function optionFields[\s\S]*?path:\s*\[([^\]]*)\]", text)
    names = re.search(r"const VALUE_OPTIONS = \[([\s\S]*?)\];", text)
    if options and names:
        template = options.group(1)
        for call in re.finditer(r"optionFields\(\"([^\"]+)\"\)", text):
            for opt in re.findall(r"\"([^\"]+)\"", names.group(1)):
                path = []
                for part in template.split(","):
                    part = part.strip()
                    if part in ("opt", "name"):
                        path.append(opt)
                    elif part.startswith('"') and part.endswith('"'):
                        path.append(part[1:-1])
                yield {"op": call.group(1), "args": [opt], "path": path}


def test_ui_schema_round_trip_uses_the_1_5_nodes():
    """A schema field's own path is the tail of the op it emits."""
    root = Path(__file__).resolve().parents[2] / "frontend" / "src" / "components" / "vrf" / "schema"
    fields = list(_schema_fields((root / "dhcpEntities.ts").read_text()))
    fields += list(_schema_fields((root / "schemas.ts").read_text()))
    wanted = {
        "vrf_dhcp_subnet_lease_default": ("LAN,10.0.0.0/24", "3600"),
        "vrf_dhcp_subnet_option": ("LAN,10.0.0.0/24", "192.0.2.1"),
        "vrf_dhcp_ddns_field": ("", "50"),
    }
    seen = set()
    builder = VrfBatchBuilder("1.5")
    for field in fields:
        if field["op"] not in wanted:
            continue
        if field["op"] == "vrf_dhcp_subnet_option" and field["args"] != ["default-router"]:
            continue
        if field["op"] == "vrf_dhcp_ddns_field" and field["args"] != ["ttl-percent"]:
            continue
        context, sample = wanted[field["op"]]
        packed = ",".join(part for part in (context, *field["args"], sample) if part != "")
        getattr(builder, "set_" + field["op"])("blue", packed)
        emitted = builder.get_operations()[-1]["path"]
        assert emitted[-len(field["path"]) - 1 : -1] == field["path"], field
        assert emitted[-1] == sample
        seen.add(field["op"])
    assert seen == set(wanted)
    with pytest.raises(ValueError, match="unsupported"):
        builder.set_vrf_dhcp_shared_network_ddns_field("blue", "NET,not-a-field,1")
    with pytest.raises(ValueError, match="unsupported"):
        builder.delete_vrf_dhcp_subnet_option("blue", "LAN,10.0.0.0/24,not-a-node")


def test_short_value_is_rejected_on_every_path():
    builder = VrfBatchBuilder("1.5")
    with pytest.raises(ValueError, match="expects"):
        builder.set_vrf_static_route_next_hop_segments("blue", "10.0.0.0/24")
    with pytest.raises(ValueError, match="expects"):
        builder.set_vrf_dhcp_ddns_field("blue", "ttl-percent")
    assert builder.get_operations() == []


def test_dhcpv6_lease_time_uses_the_global_builder(monkeypatch):
    from vyos_builders.dhcpv6_server.dhcpv6_server_batch_builder import DHCPv6ServerBatchBuilder

    called = {}
    real = DHCPv6ServerBatchBuilder.set_subnet_lease_default

    def spy(self, name, subnet, value):
        called["args"] = (name, subnet, value)
        return real(self, name, subnet, value)

    monkeypatch.setattr(DHCPv6ServerBatchBuilder, "set_subnet_lease_default", spy)
    builder = VrfBatchBuilder("1.5")
    builder.set_vrf_dhcpv6_subnet_lease_time_default("blue", "LAN,2001:db8::/64,3600")
    assert called == {"args": ("LAN", "2001:db8::/64", "3600")}
    assert builder.get_operations()[-1]["path"][-3:] == ["lease-time", "default", "3600"]


def test_ipv4_segments_delete_is_a_noop_on_1_4():
    builder = VrfBatchBuilder("1.4")
    builder.delete_vrf_static_route_next_hop_segments("blue", "10.0.0.0/24,192.0.2.1")
    builder.delete_vrf_static_route_interface_segments("blue", "10.0.0.0/24,eth0")
    builder.set_vrf_static_route_interface_segments("blue", "10.0.0.0/24,eth0,1")
    assert builder.get_operations() == []


def test_bfd_source_delete_follows_version():
    old = VrfBatchBuilder("1.4")
    old.delete_vrf_static_route_next_hop_bfd_multi_hop_source("blue", "10.0.0.0/24,192.0.2.1")
    assert old.get_operations()[-1]["path"][-1] == "source"
    new = VrfBatchBuilder("1.5")
    new.delete_vrf_static_route_next_hop_bfd_multi_hop_source("blue", "10.0.0.0/24,192.0.2.1")
    assert new.get_operations()[-1]["path"][-1] == "source-address"


def test_dhcpv6_static_mapping_uses_the_global_builder(monkeypatch):
    from vyos_builders.dhcpv6_server.dhcpv6_server_batch_builder import DHCPv6ServerBatchBuilder

    called = {}
    real = DHCPv6ServerBatchBuilder.set_static_mapping

    def spy(self, name, subnet, mapping):
        called["args"] = (name, subnet, mapping)
        return real(self, name, subnet, mapping)

    monkeypatch.setattr(DHCPv6ServerBatchBuilder, "set_static_mapping", spy)
    builder = VrfBatchBuilder("1.5")
    builder.set_vrf_dhcpv6_subnet_static_mapping("blue", "LAN,2001:db8::/64,host1")
    assert called == {"args": ("LAN", "2001:db8::/64", "host1")}
    assert builder.get_operations() == [{
        "op": "set",
        "path": [
            "vrf", "name", "blue", "service", "dhcpv6-server",
            "shared-network-name", "LAN", "subnet", "2001:db8::/64",
            "static-mapping", "host1",
        ],
    }]
    deleted = VrfBatchBuilder("1.5")
    deleted.delete_vrf_dhcpv6_subnet_static_mapping("blue", "LAN,2001:db8::/64,host1")
    assert deleted.get_operations() == [{
        "op": "delete",
        "path": [
            "vrf", "name", "blue", "service", "dhcpv6-server",
            "shared-network-name", "LAN", "subnet", "2001:db8::/64",
            "static-mapping", "host1",
        ],
    }]


def test_dhcpv6_prefix_comes_from_the_mapper_wrapper(monkeypatch):
    from vyos_mappers.path_prefix import PathPrefixMapper

    class Bare(PathPrefixMapper):
        def __getattr__(self, name):
            return getattr(self._inner, name)

    monkeypatch.setattr("vyos_builders.vrf.vrf_protocol.PathPrefixMapper", Bare)
    builder = VrfBatchBuilder("1.5")
    builder.set_vrf_dhcpv6_subnet_static_mapping("blue", "LAN,2001:db8::/64,host1")
    assert builder.get_operations() == [{
        "op": "set",
        "path": [
            "service", "dhcpv6-server", "shared-network-name", "LAN",
            "subnet", "2001:db8::/64", "static-mapping", "host1",
        ],
    }]


def test_short_drop_value_is_rejected():
    builder = VrfBatchBuilder("1.5")
    with pytest.raises(ValueError, match="expects"):
        builder.delete_vrf_static_route_interface_vrf("blue", "10.0.0.0/24")
    assert builder.get_operations() == []


def test_global_static_helpers_are_not_vrf_ops():
    builder = VrfBatchBuilder("1.5")
    with pytest.raises(AttributeError):
        builder.set_vrf_static_arp_interface("blue", "eth0")

