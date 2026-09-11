"""Shared interface batch skeleton.

Every interface router shared one batch envelope and one dispatch loop. This
covers the dispatch so a subject-field or signature miss is caught centrally
instead of once per cloned router.
"""

import pytest
from fastapi import HTTPException

from routers.interfaces.interface_batch import (
    BatchOperation,
    BatchRequest,
    VyOSResponse,
    run_interface_batch,
)


class FakeResponse:
    def __init__(self, status=200, result=None, error=None):
        self.status = status
        self.result = result
        self.error = error


class FakeService:
    """Records the batch it executed and returns a canned response."""

    def __init__(self, response=None):
        self._response = response or FakeResponse(result={"ok": True})
        self.executed = None

    def execute_batch(self, batch):
        self.executed = batch
        return self._response


class FakeBuilder:
    """Builder whose public methods record their positional args."""

    def __init__(self):
        self.calls = []

    def set_interface_disable(self, interface):
        self.calls.append(("set_interface_disable", interface))

    def set_interface_description(self, interface, value):
        self.calls.append(("set_interface_description", interface, value))

    def set_vif_address(self, interface, vlan, address):
        self.calls.append(("set_vif_address", interface, vlan, address))

    def set_vif_c_address(self, interface, svlan, cvlan, address):
        self.calls.append(("set_vif_c_address", interface, svlan, cvlan, address))

    # Plumbing that resolve_batch_method must refuse to dispatch.
    def get_operations(self):  # pragma: no cover - must never be called
        raise AssertionError("plumbing method dispatched")


def _run(ops):
    service = FakeService()
    builder = FakeBuilder()
    req = BatchRequest(interface="eth0", operations=[BatchOperation(**o) for o in ops])
    result = run_interface_batch(service, builder, req)
    return service, builder, result


def test_single_param_ignores_value():
    _, builder, result = _run([{"op": "set_interface_disable"}])
    assert builder.calls == [("set_interface_disable", "eth0")]
    assert isinstance(result, VyOSResponse)
    assert result.success is True
    assert result.data == {"ok": True}


def test_two_param_passes_value():
    _, builder, _ = _run([{"op": "set_interface_description", "value": "wan"}])
    assert builder.calls == [("set_interface_description", "eth0", "wan")]


def test_two_param_missing_value_is_400():
    with pytest.raises(HTTPException) as ei:
        _run([{"op": "set_interface_description"}])
    assert ei.value.status_code == 400
    assert "requires a value" in ei.value.detail


def test_three_param_splits_on_colon():
    _, builder, _ = _run([{"op": "set_vif_address", "value": "100:10.0.0.1/24"}])
    assert builder.calls == [("set_vif_address", "eth0", "100", "10.0.0.1/24")]


def test_four_param_splits_on_colon():
    _, builder, _ = _run([{"op": "set_vif_c_address", "value": "100:200:10.0.0.1/24"}])
    assert builder.calls == [("set_vif_c_address", "eth0", "100", "200", "10.0.0.1/24")]


def test_three_param_wrong_segment_count_is_400():
    with pytest.raises(HTTPException) as ei:
        _run([{"op": "set_vif_address", "value": "100"}])
    assert ei.value.status_code == 400
    assert "param1:param2" in ei.value.detail


def test_value_only_splits_up_to_param_count():
    # A colon in the trailing value segment must survive (limited split).
    _, builder, _ = _run([{"op": "set_vif_address", "value": "100:2001:db8::1/64"}])
    assert builder.calls == [("set_vif_address", "eth0", "100", "2001:db8::1/64")]


def test_unknown_op_is_400():
    with pytest.raises(HTTPException) as ei:
        _run([{"op": "no_such_op"}])
    assert ei.value.status_code == 400


def test_plumbing_op_is_rejected():
    with pytest.raises(HTTPException) as ei:
        _run([{"op": "get_operations"}])
    assert ei.value.status_code == 400


def test_non_200_status_reports_failure():
    service = FakeService(FakeResponse(status=400, result=None, error="boom"))
    builder = FakeBuilder()
    req = BatchRequest(
        interface="eth0",
        operations=[BatchOperation(op="set_interface_disable")],
    )
    result = run_interface_batch(service, builder, req)
    assert result.success is False
    assert result.error == "boom"
    assert result.data is None


def test_builder_error_becomes_500():
    class Boom(FakeBuilder):
        def set_interface_disable(self, interface):
            raise RuntimeError("builder blew up")

    service = FakeService()
    req = BatchRequest(
        interface="eth0",
        operations=[BatchOperation(op="set_interface_disable")],
    )
    with pytest.raises(HTTPException) as ei:
        run_interface_batch(service, Boom(), req)
    assert ei.value.status_code == 500
