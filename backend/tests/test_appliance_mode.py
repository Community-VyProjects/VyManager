"""Appliance mode helpers. No device, no DB except the optional seed test."""

import os

import pytest

import appliance_mode as am


def test_is_appliance_off_by_default(monkeypatch):
    monkeypatch.delenv("VYMANAGER_MODE", raising=False)
    assert am.is_appliance() is False
    assert am.home_path() == "/sites"
    assert am.no_instance_redirect() == "/sites"


def test_is_appliance_on(monkeypatch):
    monkeypatch.setenv("VYMANAGER_MODE", "appliance")
    assert am.is_appliance() is True
    assert am.home_path() == "/"
    assert am.no_instance_redirect() == "/"


def test_load_seed_config_requires_host_key_version(monkeypatch):
    monkeypatch.setenv("VYMANAGER_MODE", "appliance")
    monkeypatch.delenv("VYMANAGER_APPLIANCE_HOST", raising=False)
    monkeypatch.delenv("VYMANAGER_APPLIANCE_API_KEY", raising=False)
    monkeypatch.delenv("VYMANAGER_APPLIANCE_VERSION", raising=False)
    with pytest.raises(ValueError, match="VYMANAGER_APPLIANCE_HOST"):
        am.load_seed_config()


def test_load_seed_config_timeout_is_max(monkeypatch):
    monkeypatch.setenv("VYMANAGER_APPLIANCE_HOST", "10.0.0.1")
    monkeypatch.setenv("VYMANAGER_APPLIANCE_API_KEY", "k")
    monkeypatch.setenv("VYMANAGER_APPLIANCE_VERSION", "1.5")
    monkeypatch.delenv("VYMANAGER_APPLIANCE_PORT", raising=False)
    cfg = am.load_seed_config()
    assert cfg.timeout == 300
    assert cfg.port == 443
    assert cfg.protocol == "https"
    assert cfg.verify_ssl is False
    assert cfg.host == "10.0.0.1"


def test_load_seed_config_rejects_bad_version(monkeypatch):
    monkeypatch.setenv("VYMANAGER_APPLIANCE_HOST", "10.0.0.1")
    monkeypatch.setenv("VYMANAGER_APPLIANCE_API_KEY", "k")
    monkeypatch.setenv("VYMANAGER_APPLIANCE_VERSION", "1.3")
    with pytest.raises(ValueError, match="VYMANAGER_APPLIANCE_VERSION"):
        am.load_seed_config()


def test_connect_local_404_when_mode_unset(monkeypatch):
    monkeypatch.delenv("VYMANAGER_MODE", raising=False)
    import asyncio

    from fastapi import HTTPException
    from routers.session.session import connect_local

    class _Req:
        pass

    async def run():
        with pytest.raises(HTTPException) as exc:
            await connect_local(_Req())
        return exc.value.status_code

    assert asyncio.run(run()) == 404


requires_db = pytest.mark.skipif(
    not os.environ.get("DATABASE_URL"),
    reason="appliance seed test needs DATABASE_URL",
)


@requires_db
def test_seed_appliance_is_idempotent_and_timeout_300(monkeypatch):
    import asyncio

    import asyncpg

    monkeypatch.setenv("VYMANAGER_MODE", "appliance")
    monkeypatch.setenv("VYMANAGER_APPLIANCE_HOST", "192.0.2.1")
    monkeypatch.setenv("VYMANAGER_APPLIANCE_API_KEY", "seed-key")
    monkeypatch.setenv("VYMANAGER_APPLIANCE_VERSION", "1.4")
    monkeypatch.setenv("VYMANAGER_APPLIANCE_PORT", "8443")

    async def run():
        conn = await asyncpg.connect(os.environ["DATABASE_URL"])
        try:
            await conn.execute("DELETE FROM instances WHERE id = $1", am.INSTANCE_ID)
            await conn.execute("DELETE FROM sites WHERE id = $1", am.SITE_ID)
            await am.seed_appliance(conn)
            await am.seed_appliance(conn)
            row = await conn.fetchrow(
                "SELECT host, port, timeout, \"apiKey\", \"vyosVersion\" "
                "FROM instances WHERE id = $1",
                am.INSTANCE_ID,
            )
            site = await conn.fetchval(
                "SELECT name FROM sites WHERE id = $1", am.SITE_ID
            )
            iid = await am.local_instance_id(conn)
        finally:
            await conn.execute("DELETE FROM instances WHERE id = $1", am.INSTANCE_ID)
            await conn.execute("DELETE FROM sites WHERE id = $1", am.SITE_ID)
            await conn.close()
        return row, site, iid

    row, site, iid = asyncio.run(run())
    assert site == "Local"
    assert iid == am.INSTANCE_ID
    assert row["host"] == "192.0.2.1"
    assert row["port"] == 8443
    assert row["timeout"] == 300
    assert row["apiKey"] == "seed-key"
    assert row["vyosVersion"] == "1.4"


def test_stack_identity():
    assert am.is_stack_container("vymanager-backend") is True
    assert am.is_stack_container("vymanager-frontend") is True
    assert am.is_stack_container("vymanager-postgres") is True
    assert am.is_stack_container("adguard") is False
    assert am.is_stack_container("") is False
    assert am.is_stack_network("vymanager") is True
    assert am.is_stack_network("lan") is False
    assert am.is_stack_volume_path("/config/containers/vymanager-postgres") is True
    assert am.is_stack_volume_path("/config/containers/vymanager-postgres/pgdata") is True
    assert am.is_stack_volume_path("/config/containers/adguard") is False
    assert am.is_stack_image_ref("ghcr.io/community-vyprojects/vymanager-backend:beta") is True
    assert am.is_stack_image_ref("vymanager-frontend:beta") is True
    assert am.is_stack_image_ref("postgres:16-alpine") is False


def test_fleet_restore_error_vps_allows_multi_site(monkeypatch):
    monkeypatch.delenv("VYMANAGER_MODE", raising=False)
    tables = {
        "sites": [{"id": "s1"}, {"id": "s2"}],
        "instances": [{"id": "i1", "siteId": "s1"}, {"id": "i2", "siteId": "s2"}],
    }
    assert am.fleet_restore_error(tables) is None


def test_fleet_restore_error_appliance_refuses_fleet(monkeypatch):
    monkeypatch.setenv("VYMANAGER_MODE", "appliance")
    fleet = {
        "sites": [{"id": "s1"}, {"id": "s2"}],
        "instances": [{"id": "i1", "siteId": "s1"}],
    }
    assert am.fleet_restore_error(fleet) == am.FLEET_RESTORE_DETAIL
    wrong_ids = {
        "sites": [{"id": "other_site"}],
        "instances": [{"id": "other_instance", "siteId": "other_site"}],
    }
    assert am.fleet_restore_error(wrong_ids) == am.FLEET_RESTORE_DETAIL
    extra_instance = {
        "sites": [{"id": am.SITE_ID}],
        "instances": [
            {"id": am.INSTANCE_ID, "siteId": am.SITE_ID},
            {"id": "extra", "siteId": am.SITE_ID},
        ],
    }
    assert am.fleet_restore_error(extra_instance) == am.FLEET_RESTORE_DETAIL
    empty = {"sites": [], "instances": []}
    assert am.fleet_restore_error(empty) == am.FLEET_RESTORE_DETAIL


def test_fleet_restore_error_appliance_allows_this_router(monkeypatch):
    monkeypatch.setenv("VYMANAGER_MODE", "appliance")
    tables = {
        "sites": [{"id": am.SITE_ID, "name": "Local"}],
        "instances": [{"id": am.INSTANCE_ID, "siteId": am.SITE_ID, "name": "This router"}],
        "users": [{"id": "u1", "role": "ADMIN"}],
    }
    assert am.fleet_restore_error(tables) is None
