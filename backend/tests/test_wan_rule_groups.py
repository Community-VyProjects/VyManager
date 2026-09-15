"""WAN rule source/destination groups are 1.5-only.

The mapper must emit them on 1.5 and raise on 1.4. The load-balancing
batch handler must map that ValueError to HTTP 400.
"""

import ast
from pathlib import Path

import pytest

from vyos_builders.load_balancing import LoadBalancingBatchBuilder

BASE = ["load-balancing", "wan", "rule", "10"]

GROUP_CASES = [
    (
        "set_wan_rule_source_group_address",
        ("10", "LAN"),
        "set",
        BASE + ["source", "group", "address-group", "LAN"],
    ),
    (
        "set_wan_rule_source_group_network",
        ("10", "NETS"),
        "set",
        BASE + ["source", "group", "network-group", "NETS"],
    ),
    (
        "set_wan_rule_source_group_domain",
        ("10", "DOMS"),
        "set",
        BASE + ["source", "group", "domain-group", "DOMS"],
    ),
    (
        "set_wan_rule_source_group_port",
        ("10", "WEB"),
        "set",
        BASE + ["source", "group", "port-group", "WEB"],
    ),
    (
        "set_wan_rule_destination_group_address",
        ("10", "LAN"),
        "set",
        BASE + ["destination", "group", "address-group", "LAN"],
    ),
    (
        "set_wan_rule_destination_group_network",
        ("10", "NETS"),
        "set",
        BASE + ["destination", "group", "network-group", "NETS"],
    ),
    (
        "set_wan_rule_destination_group_domain",
        ("10", "DOMS"),
        "set",
        BASE + ["destination", "group", "domain-group", "DOMS"],
    ),
    (
        "set_wan_rule_destination_group_port",
        ("10", "WEB"),
        "set",
        BASE + ["destination", "group", "port-group", "WEB"],
    ),
    (
        "delete_wan_rule_source_group",
        ("10",),
        "delete",
        BASE + ["source", "group"],
    ),
    (
        "delete_wan_rule_destination_group",
        ("10",),
        "delete",
        BASE + ["destination", "group"],
    ),
]


@pytest.mark.parametrize("method, args, op, expected_path", GROUP_CASES)
def test_wan_rule_group_paths_v1_5(method, args, op, expected_path):
    builder = LoadBalancingBatchBuilder(version="1.5")
    getattr(builder, method)(*args)
    operations = builder.get_operations()
    assert [(item["op"], item["path"]) for item in operations] == [(op, expected_path)]


@pytest.mark.parametrize(
    "method, args",
    [
        ("set_wan_rule_source_group_address", ("10", "LAN")),
        ("set_wan_rule_source_group_network", ("10", "NETS")),
        ("set_wan_rule_source_group_domain", ("10", "DOMS")),
        ("set_wan_rule_source_group_port", ("10", "WEB")),
        ("set_wan_rule_destination_group_address", ("10", "LAN")),
        ("set_wan_rule_destination_group_network", ("10", "NETS")),
        ("set_wan_rule_destination_group_domain", ("10", "DOMS")),
        ("set_wan_rule_destination_group_port", ("10", "WEB")),
    ],
)
def test_wan_rule_group_set_rejected_on_v1_4(method, args):
    builder = LoadBalancingBatchBuilder(version="1.4")
    with pytest.raises(ValueError):
        getattr(builder, method)(*args)


@pytest.mark.parametrize(
    "method, args, expected_path",
    [
        ("delete_wan_rule_source_group", ("10",), BASE + ["source", "group"]),
        ("delete_wan_rule_destination_group", ("10",), BASE + ["destination", "group"]),
    ],
)
def test_wan_rule_group_delete_unguarded_on_v1_4(method, args, expected_path):
    builder = LoadBalancingBatchBuilder(version="1.4")
    getattr(builder, method)(*args)
    operations = builder.get_operations()
    assert [(item["op"], item["path"]) for item in operations] == [("delete", expected_path)]


def test_capability_gated_to_v1_5():
    caps_15 = LoadBalancingBatchBuilder(version="1.5").get_capabilities()
    caps_14 = LoadBalancingBatchBuilder(version="1.4").get_capabilities()
    assert caps_15["features"]["wan_rule_groups"]["supported"] is True
    assert caps_14["features"]["wan_rule_groups"]["supported"] is False


def test_batch_handler_maps_value_error_to_http_400():
    router_path = Path(__file__).resolve().parents[1] / "routers" / "load_balancing" / "load_balancing.py"
    tree = ast.parse(router_path.read_text())

    handler = next(
        node for node in ast.walk(tree)
        if isinstance(node, ast.AsyncFunctionDef) and node.name == "batch_configure"
    )

    def _handler_names(exc):
        names = set()
        etype = exc.type
        if isinstance(etype, ast.Name):
            names.add(etype.id)
        elif isinstance(etype, ast.Tuple):
            names.update(e.id for e in etype.elts if isinstance(e, ast.Name))
        return names

    value_error_handlers = [
        h for h in ast.walk(handler)
        if isinstance(h, ast.ExceptHandler) and "ValueError" in _handler_names(h)
    ]
    assert value_error_handlers, "batch_configure must catch ValueError"

    status_codes = set()
    for h in value_error_handlers:
        for node in ast.walk(h):
            if isinstance(node, ast.Call) and getattr(node.func, "id", None) == "HTTPException":
                for kw in node.keywords:
                    if kw.arg == "status_code" and isinstance(kw.value, ast.Constant):
                        status_codes.add(kw.value.value)
    assert 400 in status_codes, "ValueError must map to HTTP 400"
