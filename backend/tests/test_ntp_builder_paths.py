"""Golden path + version-gate cases for NTP timestamp receive-filter.

`service ntp timestamp interface IFACE receive-filter VALUE` only exists on
VyOS 1.5. The mapper must emit it on 1.5 and raise on 1.4, and the builder
capability must advertise it only on 1.5.
"""

import pytest

from vyos_builders.ntp import NTPBatchBuilder


BASE = ["service", "ntp"]


@pytest.mark.parametrize(
    "method, args, op, expected_path",
    [
        (
            "set_timestamp_interface_receive_filter",
            ("eth0", "all"),
            "set",
            BASE + ["timestamp", "interface", "eth0", "receive-filter", "all"],
        ),
        (
            "delete_timestamp_interface_receive_filter",
            ("eth0",),
            "delete",
            BASE + ["timestamp", "interface", "eth0", "receive-filter"],
        ),
    ],
)
def test_timestamp_receive_filter_paths_v1_5(method, args, op, expected_path):
    builder = NTPBatchBuilder(version="1.5")
    getattr(builder, method)(*args)
    operations = builder.get_operations()
    assert [(item["op"], item["path"]) for item in operations] == [(op, expected_path)]


@pytest.mark.parametrize(
    "method, args",
    [
        ("set_timestamp_interface_receive_filter", ("eth0", "all")),
        ("delete_timestamp_interface_receive_filter", ("eth0",)),
    ],
)
def test_timestamp_receive_filter_rejected_on_v1_4(method, args):
    builder = NTPBatchBuilder(version="1.4")
    with pytest.raises(ValueError):
        getattr(builder, method)(*args)


def test_capability_gated_to_v1_5():
    caps_15 = NTPBatchBuilder(version="1.5").get_capabilities()
    caps_14 = NTPBatchBuilder(version="1.4").get_capabilities()
    assert caps_15["features"]["timestamp_receive_filter"]["supported"] is True
    assert caps_14["features"]["timestamp_receive_filter"]["supported"] is False


def test_batch_handler_maps_value_error_to_http_400():
    """The 1.4 mapper guard raises ValueError; the batch route must return 400,
    not an opaque 500. Parse the source so this holds without a DB or device."""
    import ast
    from pathlib import Path

    router_path = Path(__file__).resolve().parents[1] / "routers" / "ntp" / "ntp.py"
    tree = ast.parse(router_path.read_text())

    handler = next(
        node for node in ast.walk(tree)
        if isinstance(node, ast.AsyncFunctionDef) and node.name == "ntp_batch_configure"
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
    assert value_error_handlers, "ntp_batch_configure must catch ValueError"

    # The ValueError handler must raise HTTPException(status_code=400).
    status_codes = set()
    for h in value_error_handlers:
        for node in ast.walk(h):
            if isinstance(node, ast.Call) and getattr(node.func, "id", None) == "HTTPException":
                for kw in node.keywords:
                    if kw.arg == "status_code" and isinstance(kw.value, ast.Constant):
                        status_codes.add(kw.value.value)
    assert 400 in status_codes, "ValueError must map to HTTP 400"
