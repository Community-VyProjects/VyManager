"""Read-only API tokens must not hit bug-report write POSTs (#591)."""

import asyncio

import pytest
from fastapi import HTTPException
from starlette.requests import Request

from routers.bug_report.bug_report import (
    ReportRequest,
    device_poll,
    device_start,
    preview,
    status,
    submit,
)

BODY = ReportRequest(
    title="console crash",
    category="bug",
    description="repro steps here",
)


def _request(*, scopes=None) -> Request:
    request = Request(
        {
            "type": "http",
            "method": "POST",
            "path": "/",
            "headers": [],
        }
    )
    request.state.user = {"id": "user-1"}
    if scopes is not None:
        request.state.api_token_scopes = scopes
    return request


@pytest.mark.parametrize(
    "call",
    [
        lambda req: device_start(req),
        lambda req: device_poll(req),
        lambda req: preview(req, BODY),
        lambda req: submit(req, BODY),
    ],
    ids=["device_start", "device_poll", "preview", "submit"],
)
def test_bug_report_posts_reject_read_only_token(call):
    request = _request(scopes=["read"])
    with pytest.raises(HTTPException) as exc:
        asyncio.run(call(request))
    assert exc.value.status_code == 403
    assert "read-only" in exc.value.detail


def test_bug_report_status_allows_read_only_token():
    result = asyncio.run(status(_request(scopes=["read"])))
    assert result.connected is False
