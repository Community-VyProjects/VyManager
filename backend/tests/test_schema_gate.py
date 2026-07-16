"""Startup schema gate behavior (audit D2-03). No database needed."""

import asyncio

import pytest

import schema_gate


def _run(coro):
    return asyncio.get_event_loop_policy().new_event_loop().run_until_complete(coro)


def test_gate_disabled_by_zero_timeout(monkeypatch):
    monkeypatch.setenv("VYMANAGER_SCHEMA_WAIT_TIMEOUT", "0")

    async def boom(url):  # pragma: no cover - must not be called
        raise AssertionError("gate should not touch the database when disabled")

    monkeypatch.setattr(schema_gate, "_schema_status", boom)
    assert _run(schema_gate.wait_for_schema("postgres://unused")) is True


def test_ready_schema_passes_immediately(monkeypatch):
    monkeypatch.setenv("VYMANAGER_SCHEMA_WAIT_TIMEOUT", "5")

    async def ready(url):
        return [], 0

    monkeypatch.setattr(schema_gate, "_schema_status", ready)
    assert _run(schema_gate.wait_for_schema("postgres://unused")) is True


def test_missing_tables_time_out_and_serve_anyway(monkeypatch):
    monkeypatch.setenv("VYMANAGER_SCHEMA_WAIT_TIMEOUT", "0.05")
    monkeypatch.setenv("VYMANAGER_SCHEMA_WAIT_INTERVAL", "0.01")

    async def missing(url):
        return ["organizations"], 0

    monkeypatch.setattr(schema_gate, "_schema_status", missing)
    assert _run(schema_gate.wait_for_schema("postgres://unused")) is False


def test_unfinished_migration_blocks_until_done(monkeypatch):
    monkeypatch.setenv("VYMANAGER_SCHEMA_WAIT_TIMEOUT", "5")
    monkeypatch.setenv("VYMANAGER_SCHEMA_WAIT_INTERVAL", "0.01")
    states = iter([([], 1), ([], 1), ([], 0)])

    async def sequence(url):
        return next(states)

    monkeypatch.setattr(schema_gate, "_schema_status", sequence)
    assert _run(schema_gate.wait_for_schema("postgres://unused")) is True


def test_connection_errors_keep_polling_then_time_out(monkeypatch):
    monkeypatch.setenv("VYMANAGER_SCHEMA_WAIT_TIMEOUT", "0.05")
    monkeypatch.setenv("VYMANAGER_SCHEMA_WAIT_INTERVAL", "0.01")

    async def down(url):
        raise ConnectionRefusedError("postgres still starting")

    monkeypatch.setattr(schema_gate, "_schema_status", down)
    assert _run(schema_gate.wait_for_schema("postgres://unused")) is False
