"""NTP timestamp receive-filter reads the mapper allowlist.

validateTmplPath: ``service ntp timestamp`` is absent on VyOS 1.4
(100.64.64.4) and present on 1.5 (100.64.64.5). Path methods live on the
1.5 subclass. Capabilities and builder ops read that set.
"""

import ast
from pathlib import Path

import pytest

from vyos_builders.ntp import NTPBatchBuilder
from vyos_mappers.ntp.ntp import NTPMapper
from vyos_mappers.ntp.ntp_versions import get_ntp_mapper
from vyos_mappers.ntp.ntp_versions.v1_4 import NTPMapperV1_4
from vyos_mappers.ntp.ntp_versions.v1_5 import NTPMapperV1_5

REPO = Path(__file__).resolve().parents[2]
MODAL = REPO / "frontend/src/components/service/ntp/NTPGlobalSettingsModal.tsx"
ROUTER = Path(__file__).resolve().parents[1] / "routers" / "ntp" / "ntp.py"

BASE = ["service", "ntp"]
V15_CASES = [
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
]


def _ops(builder):
    return [(item["op"], item["path"]) for item in builder.get_operations()]


def test_v14_mapper_has_no_timestamp_paths():
    mapper = get_ntp_mapper("1.4")
    assert isinstance(mapper, NTPMapperV1_4)
    assert mapper.versioned_nodes() == frozenset()
    assert not hasattr(mapper, "get_timestamp_interface_receive_filter")
    assert not hasattr(mapper, "get_timestamp_interface_receive_filter_delete")


def test_v15_mapper_emits_timestamp_paths():
    mapper = get_ntp_mapper("1.5")
    assert isinstance(mapper, NTPMapperV1_5)
    assert mapper.versioned_nodes() == frozenset({"timestamp_receive_filter"})
    assert mapper.get_timestamp_interface_receive_filter("eth0", "all") == (
        BASE + ["timestamp", "interface", "eth0", "receive-filter", "all"]
    )
    assert mapper.get_timestamp_interface_receive_filter_delete("eth0") == (
        BASE + ["timestamp", "interface", "eth0", "receive-filter"]
    )


def test_factory_defaults_rolling_to_v1_5():
    assert isinstance(get_ntp_mapper("2025.rolling"), NTPMapperV1_5)
    assert isinstance(get_ntp_mapper("1.4.2"), NTPMapperV1_4)


@pytest.mark.parametrize("method, args, op, expected_path", V15_CASES)
def test_v15_builder_ops_emit(method, args, op, expected_path):
    builder = NTPBatchBuilder(version="1.5")
    getattr(builder, method)(*args)
    assert _ops(builder) == [(op, expected_path)]


@pytest.mark.parametrize("method, args, op, expected_path", V15_CASES)
def test_v14_builder_ops_rejected(method, args, op, expected_path):
    builder = NTPBatchBuilder(version="1.4")
    with pytest.raises(ValueError, match="not supported on this device"):
        getattr(builder, method)(*args)
    assert builder.get_operations() == []


def test_v14_capabilities_hide_timestamp_filter():
    caps = NTPBatchBuilder(version="1.4").get_capabilities()
    assert caps["features"]["timestamp_receive_filter"]["supported"] is False
    assert caps["features"]["server"]["supported"] is True
    assert "version_info" not in caps


def test_v15_capabilities_advertise_timestamp_filter():
    caps = NTPBatchBuilder(version="1.5").get_capabilities()
    assert caps["features"]["timestamp_receive_filter"]["supported"] is True
    assert caps["features"]["timestamp_receive_filter"]["values"] == [
        "all",
        "ntp",
        "ptp",
        "none",
    ]


def test_timestamp_capability_reads_the_mapper(monkeypatch):
    """A handwritten version check in get_capabilities() would ignore this."""
    monkeypatch.setattr(NTPMapper, "versioned_nodes", lambda self: frozenset())
    caps = NTPBatchBuilder(version="1.5").get_capabilities()
    assert caps["features"]["timestamp_receive_filter"]["supported"] is False
    builder = NTPBatchBuilder(version="1.5")
    with pytest.raises(ValueError, match="not supported on this device"):
        builder.set_timestamp_interface_receive_filter("eth0", "all")
    assert builder.get_operations() == []


def test_modal_gates_timestamp_filter_on_capability():
    text = MODAL.read_text()
    assert "capabilities?.features.timestamp_receive_filter.supported" in text
    assert "version_info" not in text
    assert "is_1_5" not in text
    assert "set_timestamp_interface_receive_filter" not in text


def _handler_names(exc):
    names = set()
    etype = exc.type
    if isinstance(etype, ast.Name):
        names.add(etype.id)
    elif isinstance(etype, ast.Tuple):
        names.update(e.id for e in etype.elts if isinstance(e, ast.Name))
    return names


def test_value_error_is_caught_only_around_the_op_loop():
    """A missing leaf is HTTP 400. An empty batch ValueError stays a 500."""
    tree = ast.parse(ROUTER.read_text())
    handler = next(
        node
        for node in ast.walk(tree)
        if isinstance(node, ast.AsyncFunctionDef) and node.name == "ntp_batch_configure"
    )

    value_error_tries = []
    for node in ast.walk(handler):
        if not isinstance(node, ast.Try):
            continue
        for exc in node.handlers:
            if isinstance(exc, ast.ExceptHandler) and "ValueError" in _handler_names(exc):
                value_error_tries.append(node)

    assert value_error_tries, "ntp_batch_configure must catch ValueError"

    status_codes = set()
    for try_node in value_error_tries:
        for exc in try_node.handlers:
            if "ValueError" not in _handler_names(exc):
                continue
            for call in ast.walk(exc):
                if isinstance(call, ast.Call) and getattr(call.func, "id", None) == "HTTPException":
                    for kw in call.keywords:
                        if kw.arg == "status_code" and isinstance(kw.value, ast.Constant):
                            status_codes.add(kw.value.value)
        for call in ast.walk(try_node):
            if not isinstance(call, ast.Call):
                continue
            func = call.func
            name = getattr(func, "attr", None) or getattr(func, "id", None)
            assert name != "execute_batch", "ValueError handler must not wrap execute_batch"
        for exc in try_node.handlers:
            assert "AttributeError" not in _handler_names(exc)

    assert 400 in status_codes, "ValueError must map to HTTP 400"

    execute_calls = [
        node
        for node in ast.walk(handler)
        if isinstance(node, ast.Call) and getattr(node.func, "attr", None) == "execute_batch"
    ]
    assert execute_calls, "batch route must still call execute_batch"
