"""Bug report fields are bounded before redaction and the issue body (#1035)."""

import asyncio
import re
from pathlib import Path

import pytest
from pydantic import ValidationError
from starlette.requests import Request

from routers.bug_report.bug_report import Diagnostics, ReportRequest, preview

FRONTEND_API = Path(__file__).resolve().parents[2] / "frontend/src/lib/api/bug-report.ts"

DIAGNOSTIC_LIMITS = {"app_version": 100, "vyos_version": 100, "browser": 1024, "page": 2048}


def _report(**overrides):
    fields = {"title": "console crash", "category": "bug", "description": "repro steps here"}
    fields.update(overrides)
    return ReportRequest(**fields)


@pytest.mark.parametrize("field,limit", DIAGNOSTIC_LIMITS.items())
def test_diagnostics_field_accepts_its_limit_and_rejects_one_more(field, limit):
    assert getattr(Diagnostics(**{field: "a" * limit}), field) == "a" * limit
    with pytest.raises(ValidationError):
        Diagnostics(**{field: "a" * (limit + 1)})


def test_oversized_diagnostics_reject_the_whole_report():
    # Raw JSON-shaped input, as the endpoint receives it: the nested limit must
    # fail validation of the report itself.
    payload = {
        "title": "console crash",
        "description": "repro steps here",
        "include_diagnostics": True,
        "diagnostics": {"browser": "a" * 1025},
    }
    with pytest.raises(ValidationError) as exc:
        ReportRequest.model_validate(payload)
    assert exc.value.errors()[0]["loc"] == ("diagnostics", "browser")


def test_category_accepts_its_limit_and_rejects_one_more():
    assert _report(category="a" * 32).category == "a" * 32
    with pytest.raises(ValidationError):
        _report(category="a" * 33)


def test_preview_includes_diagnostics_at_their_limits(monkeypatch):
    from routers.bug_report import bug_report

    monkeypatch.setattr(bug_report, "feature_enabled", lambda: True)
    request = Request({"type": "http", "method": "POST", "path": "/", "headers": []})
    request.state.user = {"id": "user-1"}
    # Realistic text: long single-character runs would be redacted as key blobs.
    browser = ("Mozilla/5.0 (X11; Linux x86_64) Firefox/140.0 " * 30)[:1024]
    page = ("/firewall-rules" * 200)[:2048]
    assert (len(browser), len(page)) == (1024, 2048)
    diagnostics = Diagnostics.model_validate({"browser": browser, "page": page})
    result = asyncio.run(preview(request, _report(include_diagnostics=True, diagnostics=diagnostics)))
    assert f"- Browser: {browser}" in result.body
    assert f"- Page: {page}" in result.body


def _frontend_limits() -> dict:
    source = FRONTEND_API.read_text()
    block = re.search(r"DIAGNOSTIC_LIMITS\s*=\s*\{(.*?)\}", source, re.DOTALL)
    assert block, "DIAGNOSTIC_LIMITS not found in frontend/src/lib/api/bug-report.ts"
    return {key: int(value) for key, value in re.findall(r"(\w+)\s*:\s*(\d+)", block.group(1))}


def test_backend_accepts_exactly_what_the_frontend_clips_to():
    # A frontend limit above the model's would turn long values into a 422; one
    # below it would clip more than needed. Both sides must agree.
    limits = _frontend_limits()
    assert set(limits) == {"browser", "page"}
    for field, limit in limits.items():
        Diagnostics.model_validate({field: "a" * limit})
        with pytest.raises(ValidationError):
            Diagnostics.model_validate({field: "a" * (limit + 1)})
