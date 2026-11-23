"""Batch getattr dispatch must go through resolve_batch_method."""

import pytest
from fastapi import HTTPException

from batch_dispatch import (
    INTERNAL_BUILDER_METHODS,
    call_comma_batch_op,
    call_item_batch_op,
    resolve_batch_method,
)
from vyos_builders.ospf.ospf_batch_builder import OspfBatchBuilder


def test_rejects_plumbing_names():
    builder = OspfBatchBuilder(version="1.4")
    for op in ("add_set", "get_operations", "get_capabilities", "is_empty"):
        with pytest.raises(HTTPException) as ei:
            resolve_batch_method(builder, op)
        assert ei.value.status_code == 400
        assert "Invalid" in ei.value.detail


def test_rejects_underscore_and_empty():
    builder = OspfBatchBuilder(version="1.4")
    for op in ("_operations", "_check", ""):
        with pytest.raises(HTTPException) as ei:
            resolve_batch_method(builder, op)
        assert ei.value.status_code == 400


def test_rejects_unknown():
    builder = OspfBatchBuilder(version="1.4")
    with pytest.raises(HTTPException) as ei:
        resolve_batch_method(builder, "not_a_real_method")
    assert ei.value.status_code == 400
    assert "Unknown" in ei.value.detail


def test_allows_real_builder_method():
    builder = OspfBatchBuilder(version="1.4")
    method = resolve_batch_method(builder, "set_redistribute")
    assert callable(method)
    assert "add_set" in INTERNAL_BUILDER_METHODS


class _CommaBuilder:
    """Records the calls call_comma_batch_op makes."""

    def __init__(self):
        self.calls = []

    def delete_all(self):
        self.calls.append(("delete_all",))

    def delete_one(self, name):
        self.calls.append(("delete_one", name))

    def set_pair(self, name, value):
        self.calls.append(("set_pair", name, value))


class _ItemBuilder:
    """Records the calls call_item_batch_op makes."""

    def __init__(self):
        self.calls = []

    def delete_item(self, item):
        self.calls.append(("delete_item", item))

    def set_leaf(self, item, value):
        self.calls.append(("set_leaf", item, value))

    def set_pair(self, item, key, value):
        self.calls.append(("set_pair", item, key, value))


def test_item_op_binds_the_item_and_splits_the_rest():
    builder = _ItemBuilder()
    call_item_batch_op(builder, "delete_item", "eth1", None)
    call_item_batch_op(builder, "delete_item", "eth1", "")
    call_item_batch_op(builder, "set_leaf", "eth1", "a|b")
    call_item_batch_op(builder, "set_pair", "eth1", "k|v|w")
    assert builder.calls == [
        ("delete_item", "eth1"),
        ("delete_item", "eth1"),
        ("set_leaf", "eth1", "a|b"),
        ("set_pair", "eth1", "k", "v|w"),
    ]


def test_item_only_op_with_a_value_is_400():
    """A value on an item-only op must not run the wider op."""
    builder = _ItemBuilder()
    with pytest.raises(HTTPException) as ei:
        call_item_batch_op(builder, "delete_item", "eth1", "mode")
    assert ei.value.status_code == 400
    assert ei.value.detail == "Operation delete_item takes no value"
    assert builder.calls == []


@pytest.mark.parametrize("op, value, detail", [
    ("set_leaf", None, "Operation set_leaf requires a value"),
    ("set_leaf", "", "Operation set_leaf requires a value"),
    ("set_leaf", "  ", "Operation set_leaf requires a value"),
    ("set_pair", "k", "Operation set_pair requires 2 values"),
    ("set_pair", "k|", "Operation set_pair requires 2 values"),
    ("set_pair", " |v", "Operation set_pair requires 2 values"),
    ("no_such_op", "x", "Unknown operation: no_such_op"),
    ("_private", None, "Invalid operation: _private"),
])
def test_item_op_bad_input_is_400(op, value, detail):
    builder = _ItemBuilder()
    with pytest.raises(HTTPException) as ei:
        call_item_batch_op(builder, op, "eth1", value)
    assert ei.value.status_code == 400
    assert ei.value.detail == detail
    assert builder.calls == []


def test_comma_op_splits_into_the_parameter_count():
    builder = _CommaBuilder()
    call_comma_batch_op(builder, "delete_all", None)
    call_comma_batch_op(builder, "delete_all", "")
    call_comma_batch_op(builder, "delete_one", "a,b")
    call_comma_batch_op(builder, "set_pair", "eth0,192.0.2.1,9")
    assert builder.calls == [
        ("delete_all",),
        ("delete_all",),
        ("delete_one", "a,b"),
        ("set_pair", "eth0", "192.0.2.1,9"),
    ]


def test_comma_op_zero_arg_with_a_value_is_400():
    """A value on a zero-arg op must not run the wider op."""
    builder = _CommaBuilder()
    with pytest.raises(HTTPException) as ei:
        call_comma_batch_op(builder, "delete_all", "eth0")
    assert ei.value.status_code == 400
    assert ei.value.detail == "Operation delete_all takes no value"
    assert builder.calls == []


@pytest.mark.parametrize("op, value, detail", [
    ("delete_one", None, "Operation delete_one requires a value"),
    ("delete_one", "", "Operation delete_one requires a value"),
    ("set_pair", "eth0", "Operation set_pair requires 2 values"),
    ("set_pair", "eth0,", "Operation set_pair requires 2 values"),
    ("set_pair", ",x", "Operation set_pair requires 2 values"),
    ("no_such_op", "x", "Unknown operation: no_such_op"),
    ("_private", None, "Invalid operation: _private"),
])
def test_comma_op_bad_input_is_400(op, value, detail):
    builder = _CommaBuilder()
    with pytest.raises(HTTPException) as ei:
        call_comma_batch_op(builder, op, value)
    assert ei.value.status_code == 400
    assert ei.value.detail == detail
    assert builder.calls == []
