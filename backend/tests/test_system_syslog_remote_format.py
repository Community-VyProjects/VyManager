"""Syslog remote RFC 5424 format leaves — path, version-gate, capability, 400.

`system syslog remote HOST format include-timezone` and `... octet-counted`
exist only on VyOS 1.5. The mapper must emit them on 1.5 and raise on 1.4,
the builder capability must advertise them only on 1.5, and the system batch
handler must map the 1.4 guard's ValueError to HTTP 400 (not an opaque 500).
"""

import ast
from pathlib import Path

import pytest

from vyos_builders.system.system_batch_builder import SystemBatchBuilder


HOST = "192.0.2.1"
BASE = ["system", "syslog", "remote", HOST, "format"]


@pytest.mark.parametrize(
    "method, op, expected_path",
    [
        ("set_syslog_remote_format_include_timezone", "set", BASE + ["include-timezone"]),
        ("delete_syslog_remote_format_include_timezone", "delete", BASE + ["include-timezone"]),
        ("set_syslog_remote_format_octet_counted", "set", BASE + ["octet-counted"]),
        ("delete_syslog_remote_format_octet_counted", "delete", BASE + ["octet-counted"]),
    ],
)
def test_syslog_remote_format_paths_v1_5(method, op, expected_path):
    builder = SystemBatchBuilder(version="1.5")
    getattr(builder, method)(HOST)
    operations = builder.get_operations()
    assert [(item["op"], item["path"]) for item in operations] == [(op, expected_path)]


@pytest.mark.parametrize(
    "method",
    [
        "set_syslog_remote_format_include_timezone",
        "delete_syslog_remote_format_include_timezone",
        "set_syslog_remote_format_octet_counted",
        "delete_syslog_remote_format_octet_counted",
    ],
)
def test_syslog_remote_format_rejected_on_v1_4(method):
    builder = SystemBatchBuilder(version="1.4")
    with pytest.raises(ValueError):
        getattr(builder, method)(HOST)


def test_capability_gated_to_v1_5():
    caps_15 = SystemBatchBuilder(version="1.5").get_capabilities()
    caps_14 = SystemBatchBuilder(version="1.4").get_capabilities()
    assert caps_15["syslog"]["supports_remote_format"] is True
    assert caps_14["syslog"]["supports_remote_format"] is False


def test_system_batch_handler_maps_value_error_to_http_400():
    """The 1.4 mapper guard raises ValueError; the system batch route must
    return 400, not an opaque 500. Parse the source so this holds without a
    DB or device."""
    router_path = Path(__file__).resolve().parents[1] / "routers" / "system.py"
    tree = ast.parse(router_path.read_text())

    handler = next(
        node for node in ast.walk(tree)
        if isinstance(node, ast.AsyncFunctionDef) and node.name == "system_batch_configure"
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
    assert value_error_handlers, "system_batch_configure must catch ValueError"

    status_codes = set()
    for h in value_error_handlers:
        for node in ast.walk(h):
            if isinstance(node, ast.Call) and getattr(node.func, "id", None) == "HTTPException":
                for kw in node.keywords:
                    if kw.arg == "status_code" and isinstance(kw.value, ast.Constant):
                        status_codes.add(kw.value.value)
    assert 400 in status_codes, "ValueError must map to HTTP 400"
