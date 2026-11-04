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
    with pytest.raises(ValidationError):
        _report(include_diagnostics=True, diagnostics=Diagnostics.model_validate({"browser": "a" * 1025}))


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


def test_frontend_clips_to_the_same_limits():
    source = FRONTEND_API.read_text()
    match = re.search(r"DIAGNOSTIC_LIMITS = \{ browser: (\d+), page: (\d+) \}", source)
    assert match, "DIAGNOSTIC_LIMITS not found in frontend/src/lib/api/bug-report.ts"
    assert int(match.group(1)) == DIAGNOSTIC_LIMITS["browser"]
    assert int(match.group(2)) == DIAGNOSTIC_LIMITS["page"]
    assert Diagnostics.model_fields["browser"].metadata[0].max_length == DIAGNOSTIC_LIMITS["browser"]
    assert Diagnostics.model_fields["page"].metadata[0].max_length == DIAGNOSTIC_LIMITS["page"]
