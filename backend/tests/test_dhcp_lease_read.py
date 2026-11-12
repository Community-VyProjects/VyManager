"""The lease read commands come from the DHCP server mapper on both versions."""

import asyncio
from types import SimpleNamespace
from typing import cast

import pytest

from routers.dhcp_server import dhcp_server as router
from vyos_mappers import CommandMapperRegistry
from vyos_mappers.dhcp_server import DHCPServerMapper


def _mapper(version: str) -> DHCPServerMapper:
    return cast(DHCPServerMapper, CommandMapperRegistry.get_mapper("dhcp_server", version))


@pytest.mark.parametrize("version", ["1.4", "1.5-rolling-202511110000"])
def test_lease_query_asks_each_origin(version):
    query = _mapper(version).lease_list_query()
    assert query == (
        "query ($key: String) {"
        "  local: ShowServerLeasesDhcp(data: {key: $key, family: inet, state: all, origin: local}) { success data { result } }"
        "  remote: ShowServerLeasesDhcp(data: {key: $key, family: inet, state: all, origin: remote}) { success data { result } }"
        "}"
    )


def test_rest_fallback_shows_the_mapper_path():
    seen = {}

    def show(path):
        seen["path"] = path
        return SimpleNamespace(status=200, result="")

    service = SimpleNamespace(device=SimpleNamespace(show=show))
    assert router._fetch_leases_rest(service, _mapper("1.5")) == []
    assert seen["path"] == ["dhcp", "server", "leases"]


def test_graphql_rows_dedupe_across_origins(monkeypatch):
    row = {"ip": "192.0.2.10", "mac": "aa:bb:cc:dd:ee:ff", "state": "active"}
    body = {"data": {alias: {"data": {"result": [row]}} for alias in ("local", "remote")}}
    sent = {}

    class Client:
        def __init__(self, **_):
            pass

        async def __aenter__(self):
            return self

        async def __aexit__(self, *_):
            return False

        async def post(self, url, json, auth):
            sent["query"] = json["query"]
            return SimpleNamespace(status_code=200, json=lambda: body)

    monkeypatch.setattr(router.httpx, "AsyncClient", Client)
    config = SimpleNamespace(apikey="k", protocol="https", hostname="h", port=443, verify=False)
    mapper = _mapper("1.4")
    leases = asyncio.run(router._fetch_leases_graphql(SimpleNamespace(config=config), mapper))
    assert [lease.ip_address for lease in leases] == ["192.0.2.10"]
    assert sent["query"] == mapper.lease_list_query()
