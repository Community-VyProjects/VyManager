"""Batch getattr dispatch must go through resolve_batch_method."""

import pytest
from fastapi import HTTPException

from batch_dispatch import INTERNAL_BUILDER_METHODS, resolve_batch_method
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
