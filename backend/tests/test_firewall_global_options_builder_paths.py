"""Golden (method, args, op, expected_path) cases for FirewallGlobalOptionsBatchBuilder."""

import pytest

from vyos_builders.firewall_global_options.firewall_global_options import (
    FirewallGlobalOptionsBatchBuilder,
)


BASE = ["firewall", "global-options"]

CASES = [
    ("set_resolver_cache", (), "set", BASE + ["resolver-cache"]),
    ("delete_resolver_cache", (), "delete", BASE + ["resolver-cache"]),
    ("set_resolver_interval", (60,), "set", BASE + ["resolver-interval", "60"]),
    ("delete_resolver_interval", (), "delete", BASE + ["resolver-interval"]),
]


@pytest.mark.parametrize("method, args, op, expected_path", CASES)
@pytest.mark.parametrize("version", ["1.4", "1.5"])
def test_firewall_global_options_resolver_paths(method, args, op, expected_path, version):
    builder = FirewallGlobalOptionsBatchBuilder(version=version)
    getattr(builder, method)(*args)
    operations = builder.get_operations()
    assert [(item["op"], item["path"]) for item in operations] == [(op, expected_path)]


@pytest.mark.parametrize("version", ["1.4", "1.5"])
def test_firewall_global_options_advertises_dns_resolver(version):
    builder = FirewallGlobalOptionsBatchBuilder(version=version)
    caps = builder.get_capabilities()
    assert caps["features"]["dns_resolver"]["supported"] is True
