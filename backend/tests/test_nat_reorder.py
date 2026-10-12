"""A rejected VyOS commit must not look applied.

pyvyos keeps HTTP 200 and sets error when the API body says success=false.
execute_batch is the one place that turns that into a non-200 status, matching
commit-confirm. Routers keep treating status 200 as applied.
"""

from pyvyos.core.rest_client import ApiResponse
from vyos_builders.nat import NATBatchBuilder
from vyos_service import VyOSDeviceConfig, VyOSService

recorded: list[str] = []


def _service() -> VyOSService:
    service = VyOSService(VyOSDeviceConfig(
        hostname="lab",
        apikey="key",
        version="1.5",
        instance_id="inst",
    ))
    service._record_managed_config = lambda instance_id: recorded.append(instance_id)
    return service


def test_execute_batch_rejects_http_200_with_vyos_error():
    recorded.clear()
    service = _service()
    service.device.configure_multiple_op = lambda op_path: ApiResponse(
        status=200,
        request={},
        result={},
        error="translation requires address and/or port",
    )
    batch = NATBatchBuilder("1.5")
    batch.set_destination_rule(10)

    response = service.execute_batch(batch)

    assert response.status == 400
    assert "translation requires" in response.error
    assert recorded == []


def test_execute_batch_keeps_http_200_when_commit_applied():
    recorded.clear()
    service = _service()
    service.device.configure_multiple_op = lambda op_path: ApiResponse(
        status=200,
        request={},
        result="",
        error=False,
    )
    batch = NATBatchBuilder("1.5")
    batch.set_destination_rule(10)

    response = service.execute_batch(batch)

    assert response.status == 200
    assert recorded == ["inst"]
