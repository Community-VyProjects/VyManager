"""A second organization with ORG_ENFORCEMENT off is not an isolation boundary.

Creating one stays allowed (orgs can be staged before the enforcement flip)
but the API and startup log say so.
"""

import asyncio
from datetime import datetime
from types import SimpleNamespace

import pytest

import org_scope


@pytest.mark.parametrize(
    "enforced,count,warns",
    [(False, 1, False), (False, 2, True), (True, 2, False), (True, 1, False)],
)
def test_multi_org_warning(monkeypatch, enforced, count, warns):
    monkeypatch.setattr(org_scope, "ORG_ENFORCEMENT", enforced)
    assert (org_scope.multi_org_warning(count) is not None) is warns


class _Conn:
    def __init__(self, org_count):
        self.org_count = org_count

    async def fetchval(self, sql, *args):
        if "COUNT(*)" in sql:
            return self.org_count
        return None  # org id is free

    async def fetchrow(self, sql, *args):
        now = datetime(2026, 1, 1)
        return {"id": args[0], "name": args[1], "description": args[2],
                "member_count": 0, "createdAt": now, "updatedAt": now}


@pytest.mark.parametrize("enforced,warns", [(False, True), (True, False)])
def test_create_organization_reports_missing_enforcement(monkeypatch, enforced, warns):
    from routers.organizations import organizations as orgs

    async def allow(_request):
        return None

    monkeypatch.setattr(orgs, "require_super_admin", allow)
    monkeypatch.setattr(org_scope, "ORG_ENFORCEMENT", enforced)
    body = orgs.OrgCreateInput(name="Second")
    out = asyncio.run(orgs.create_organization(body, SimpleNamespace(), _Conn(2)))
    assert out["organization"]["name"] == "Second"
    assert ("warning" in out) is warns
