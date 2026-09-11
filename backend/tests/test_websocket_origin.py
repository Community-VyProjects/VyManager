"""WebSocket Origin allowlist must not fail open when FRONTEND_URL is unset (#595)."""

import os

import pytest

from trusted_origins import websocket_origin_allowed, websocket_trusted_origins


@pytest.fixture
def clean_origin_env(monkeypatch):
    monkeypatch.delenv("TRUSTED_ORIGINS", raising=False)
    monkeypatch.delenv("FRONTEND_URL", raising=False)


def test_unset_frontend_url_defaults_to_localhost(clean_origin_env):
    assert websocket_trusted_origins() == {"http://localhost:3000"}
    assert websocket_origin_allowed("http://localhost:3000") is True
    assert websocket_origin_allowed("https://evil.example") is False
    assert websocket_origin_allowed(None) is False


def test_frontend_url_fallback(monkeypatch, clean_origin_env):
    monkeypatch.setenv("FRONTEND_URL", "https://vymanager.example")
    assert websocket_origin_allowed("https://vymanager.example") is True
    assert websocket_origin_allowed("http://localhost:3000") is False


def test_trusted_origins_overrides_frontend_url(monkeypatch, clean_origin_env):
    monkeypatch.setenv("FRONTEND_URL", "http://localhost:3000")
    monkeypatch.setenv("TRUSTED_ORIGINS", "https://app.example, http://localhost:3000")
    assert websocket_origin_allowed("https://app.example") is True
    assert websocket_origin_allowed("http://localhost:3000") is True
    assert websocket_origin_allowed("https://evil.example") is False


def test_whitespace_only_allowlist_refuses_upgrade(monkeypatch, clean_origin_env):
    monkeypatch.setenv("TRUSTED_ORIGINS", "  ,  ")
    assert websocket_trusted_origins() == set()
    assert websocket_origin_allowed("http://localhost:3000") is False
    assert websocket_origin_allowed(None) is False
