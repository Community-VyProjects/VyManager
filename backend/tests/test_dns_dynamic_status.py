"""Resolved IP for dynamic DNS comes from ShowDynamicStatusDns, not config."""

import asyncio
import json
import logging

from typing import Optional

import httpx
from fastapi import FastAPI
from fastapi.testclient import TestClient

import dns_dynamic_status as status_mod
import routers.dns_dynamic.dns_dynamic as dns_dynamic_mod
from dns_dynamic_status import (
    dynamic_status_gql_query,
    parse_dynamic_dns_status,
)


NORMALIZED = [
    {
        "host": "example.com",
        "ipv4": "203.0.113.10",
        "status_ipv4": "good",
        "ipv6": "2001:db8::1",
        "status_ipv6": "good",
        "mtime": "2024-03-01 00:00:00",
    },
    {
        "host": "v6.example.com",
        "ipv4": "",
        "status_ipv4": "",
        "ipv6": "2001:db8::2",
        "status_ipv6": "nochg",
    },
]


class _Config:
    apikey = "test-api-key"
    protocol = "https"
    hostname = "10.0.0.1"
    port = 443
    verify = False


class _Service:
    config = _Config()


class _Response:
    def __init__(self, payload, status_code=200):
        self._payload = payload
        self.status_code = status_code

    def json(self):
        return self._payload


class _Client:
    last_url = None
    last_json: Optional[dict] = None
    last_auth = None
    scripted = _Response({})
    error: Optional[BaseException] = None

    def __init__(self, *args, **kwargs):
        pass

    async def __aenter__(self):
        return self

    async def __aexit__(self, *exc):
        return False

    async def post(self, url, json=None, auth=None):
        type(self).last_url = url
        type(self).last_json = json
        type(self).last_auth = auth
        if type(self).error is not None:
            raise type(self).error
        return type(self).scripted


def _node(success, result=None, error_name=None, errors=None):
    op_error = None
    if error_name:
        op_error = {"name": error_name, "message": error_name}
    return {
        "data": {
            "ShowDynamicStatusDns": {
                "success": success,
                "errors": errors,
                "op_mode_error": op_error,
                "data": None if result is None else {"result": result},
            }
        }
    }


def test_query_uses_typed_dynamic_status_op():
    query = dynamic_status_gql_query(json.dumps("secret"))["query"]

    assert "ShowDynamicStatusDns" in query
    assert json.dumps("secret") in query
    assert "op_mode_error" in query
    assert "ShowForwardingStatisticsDns" not in query
    assert "path:" not in query


def test_parse_normalized_cache_keeps_resolved_addresses():
    hosts = parse_dynamic_dns_status(NORMALIZED)

    assert len(hosts) == 2
    assert hosts[0].host == "example.com"
    assert hosts[0].ipv4 == "203.0.113.10"
    assert hosts[0].ipv6 == "2001:db8::1"
    assert hosts[0].status_ipv4 == "good"
    assert hosts[1].ipv4 is None
    assert hosts[1].ipv6 == "2001:db8::2"
    assert hosts[1].status_ipv4 is None


def test_parse_accepts_hyphenated_keys_and_json_string():
    raw = json.dumps([
        {
            "host": "example.com",
            "ipv4": "198.51.100.8",
            "status-ipv4": "good",
            "ipv6": "",
            "status-ipv6": "",
        }
    ])

    hosts = parse_dynamic_dns_status(raw)

    assert len(hosts) == 1
    assert hosts[0].ipv4 == "198.51.100.8"
    assert hosts[0].status_ipv4 == "good"
    assert hosts[0].ipv6 is None


def test_parse_drops_rows_without_a_hostname():
    hosts = parse_dynamic_dns_status([
        {"ipv4": "203.0.113.1"},
        "not-a-row",
        {"host": "  ", "ipv4": "203.0.113.2"},
    ])

    assert hosts == []


def test_parse_ignores_non_list_result():
    assert parse_dynamic_dns_status({"host": "example.com", "ipv4": "1.2.3.4"}) == []
    assert parse_dynamic_dns_status("not-json") == []
    assert parse_dynamic_dns_status(None) == []


def test_fetch_returns_resolved_hosts(monkeypatch):
    _Client.scripted = _Response(_node(True, NORMALIZED))
    _Client.error = None
    monkeypatch.setattr(status_mod.httpx, "AsyncClient", _Client)

    result = asyncio.run(status_mod.fetch_dynamic_dns_status(_Service()))

    assert result.available is True
    assert result.hosts[0].ipv4 == "203.0.113.10"
    assert _Client.last_url == "https://10.0.0.1:443/graphql"
    assert _Client.last_auth == ("vyos", "test-api-key")
    assert _Client.last_json is not None
    assert "ShowDynamicStatusDns" in _Client.last_json["query"]
    assert "ShowForwardingStatisticsDns" not in _Client.last_json["query"]


def test_unconfigured_subsystem_is_an_empty_cache(monkeypatch):
    _Client.scripted = _Response(_node(False, error_name="UnconfiguredSubsystem", errors=["op_mode_error"]))
    _Client.error = None
    monkeypatch.setattr(status_mod.httpx, "AsyncClient", _Client)

    result = asyncio.run(status_mod.fetch_dynamic_dns_status(_Service()))

    assert result.available is True
    assert result.hosts == []


def test_other_op_error_is_a_miss(monkeypatch):
    _Client.scripted = _Response(_node(False, error_name="InternalError", errors=["op_mode_error"]))
    _Client.error = None
    monkeypatch.setattr(status_mod.httpx, "AsyncClient", _Client)

    result = asyncio.run(status_mod.fetch_dynamic_dns_status(_Service()))

    assert result.available is False
    assert result.hosts == []


def test_timeout_is_a_warning_not_an_exception(monkeypatch, caplog):
    _Client.error = httpx.ReadTimeout("timed out")
    monkeypatch.setattr(status_mod.httpx, "AsyncClient", _Client)

    with caplog.at_level(logging.DEBUG):
        result = asyncio.run(status_mod.fetch_dynamic_dns_status(_Service()))

    assert result.available is False
    timeouts = [record for record in caplog.records if "timed out" in record.message]
    assert timeouts
    assert all(record.levelno == logging.WARNING for record in timeouts)
    assert not any(record.exc_info for record in timeouts)


def test_unexpected_fetch_error_still_logs_a_traceback(monkeypatch, caplog):
    _Client.error = RuntimeError("graphql down")
    monkeypatch.setattr(status_mod.httpx, "AsyncClient", _Client)

    with caplog.at_level(logging.DEBUG):
        result = asyncio.run(status_mod.fetch_dynamic_dns_status(_Service()))

    assert result.available is False
    failures = [record for record in caplog.records if record.levelno >= logging.ERROR]
    assert failures
    assert any(record.exc_info for record in failures)


def test_status_endpoint_returns_resolved_ip(monkeypatch):
    async def allow(*_args, **_kwargs):
        return None

    _Client.scripted = _Response(_node(True, NORMALIZED))
    _Client.error = None
    monkeypatch.setattr(dns_dynamic_mod, "require_read_permission", allow)
    monkeypatch.setattr(dns_dynamic_mod, "get_session_vyos_service", lambda _req: _Service())
    monkeypatch.setattr(status_mod.httpx, "AsyncClient", _Client)

    app = FastAPI()
    app.include_router(dns_dynamic_mod.router)
    client = TestClient(app)

    resp = client.get("/vyos/dns-dynamic/status")

    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["available"] is True
    assert body["hosts"][0]["host"] == "example.com"
    assert body["hosts"][0]["ipv4"] == "203.0.113.10"
    assert body["hosts"][0]["ipv6"] == "2001:db8::1"
    assert _Client.last_json is not None
    assert "ShowForwardingStatisticsDns" not in _Client.last_json["query"]


def test_status_endpoint_requires_dns_dynamic_read(monkeypatch):
    seen = {}

    async def allow(_request, feature):
        seen["feature"] = feature

    monkeypatch.setattr(dns_dynamic_mod, "require_read_permission", allow)
    monkeypatch.setattr(dns_dynamic_mod, "get_session_vyos_service", lambda _req: _Service())

    async def empty(_service):
        return status_mod.DynamicDnsStatusResponse()

    monkeypatch.setattr(dns_dynamic_mod, "fetch_dynamic_dns_status", empty)

    app = FastAPI()
    app.include_router(dns_dynamic_mod.router)
    client = TestClient(app)

    resp = client.get("/vyos/dns-dynamic/status")

    assert resp.status_code == 200, resp.text
    assert seen["feature"].value == "DNS_DYNAMIC"
