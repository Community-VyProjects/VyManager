"""CAKE ack-filter and no-split-gso are 1.5-only.

1.5 accepts `qos policy cake CAKE1 ack-filter`, `ack-filter aggressive`, and
`no-split-gso`; 1.4 rejects them. Paths checked with validateTmplPath on both
lab hosts.
"""

import ast
from pathlib import Path

import pytest

from routers.qos.qos import _parse_policy
from vyos_builders.qos.qos_batch_builder import QoSBatchBuilder

REPO = Path(__file__).resolve().parents[2]
MODAL = REPO / "frontend/src/components/qos/QoSPolicyModal.tsx"
API = REPO / "frontend/src/lib/api/qos.ts"
ROUTER = REPO / "backend/routers/qos/qos.py"

CASES = [
    ("ack-filter", ["qos", "policy", "cake", "CAKE1", "ack-filter"]),
    ("ack-filter/aggressive", ["qos", "policy", "cake", "CAKE1", "ack-filter", "aggressive"]),
    ("no-split-gso", ["qos", "policy", "cake", "CAKE1", "no-split-gso"]),
]


def test_cake_15_flag_paths():
    builder = QoSBatchBuilder(version="1.5")
    expected = []
    for field, path in CASES:
        builder.set_policy_flag("cake", "CAKE1", field)
        builder.delete_policy_flag("cake", "CAKE1", field)
        expected.append(("set", path))
        expected.append(("delete", path))
    assert [(item["op"], item["path"]) for item in builder.get_operations()] == expected


@pytest.mark.parametrize("field", [c[0] for c in CASES])
def test_cake_15_flags_rejected_on_v1_4(field):
    builder = QoSBatchBuilder(version="1.4")
    with pytest.raises(ValueError, match="not supported"):
        builder.set_policy_flag("cake", "CAKE1", field)
    builder = QoSBatchBuilder(version="1.4")
    with pytest.raises(ValueError, match="not supported"):
        builder.delete_policy_flag("cake", "CAKE1", field)


def test_capability_gated_to_v1_5():
    caps_15 = QoSBatchBuilder(version="1.5").get_capabilities()
    caps_14 = QoSBatchBuilder(version="1.4").get_capabilities()
    assert caps_15["features"]["cake_ack_filter"]["supported"] is True
    assert caps_15["features"]["cake_no_split_gso"]["supported"] is True
    assert caps_14["features"]["cake_ack_filter"]["supported"] is False
    assert caps_14["features"]["cake_no_split_gso"]["supported"] is False


def test_parse_cake_ack_filter_and_no_split_gso():
    none = _parse_policy("cake", "CAKE1", {"bandwidth": "100mbit"})
    assert none.ack_filter is None
    assert none.no_split_gso is False

    filt = _parse_policy("cake", "CAKE1", {"ack-filter": {}})
    assert filt.ack_filter == "filter"

    agg = _parse_policy("cake", "CAKE1", {"ack-filter": {"aggressive": {}}})
    assert agg.ack_filter == "aggressive"

    gso = _parse_policy("cake", "CAKE1", {"no-split-gso": {}})
    assert gso.no_split_gso is True


def test_policy_modal_gates_cake_flags():
    text = MODAL.read_text()
    assert "features.cake_ack_filter" in text
    assert "features.cake_no_split_gso" in text
    assert 'id="cake-no-split-gso"' in text
    assert "VyOS 1." not in text
    assert "1.5+" not in text
    assert "1.4 only" not in text


def test_api_roundtrips_cake_flags():
    text = API.read_text()
    assert 'flags.push("ack-filter/aggressive")' in text
    assert 'flags.push("ack-filter")' in text
    assert 'flags.push("no-split-gso")' in text


def test_qos_batch_handler_maps_value_error_to_http_400():
    tree = ast.parse(ROUTER.read_text())
    handler = next(
        node
        for node in ast.walk(tree)
        if isinstance(node, ast.AsyncFunctionDef) and node.name == "qos_batch_configure"
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
        h
        for h in ast.walk(handler)
        if isinstance(h, ast.ExceptHandler) and "ValueError" in _handler_names(h)
    ]
    assert value_error_handlers, "qos_batch_configure must catch ValueError"
    status_codes = set()
    for h in value_error_handlers:
        for node in ast.walk(h):
            if isinstance(node, ast.Call) and getattr(node.func, "id", None) == "HTTPException":
                for kw in node.keywords:
                    if kw.arg == "status_code" and isinstance(kw.value, ast.Constant):
                        status_codes.add(kw.value.value)
    assert 400 in status_codes, "ValueError must map to HTTP 400"
