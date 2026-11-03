"""Conntrack-sync GET /config parse lives on the mapper (issue #966)."""

from vyos_mappers.base import CommandMapperRegistry
from vyos_mappers.conntrack_sync.conntrack_sync_versions import get_conntrack_sync_mapper


def _tree():
    return {
        "service": {
            "conntrack-sync": {
                "accept-protocol": "tcp",
                "disable-external-cache": {},
                "event-listen-queue-size": "8",
                "expect-sync": {"ftp": {}, "sip": {}},
                "failover-mechanism": {"vrrp": {"sync-group": "cluster"}},
                "ignore-address": ["10.0.0.2", "10.0.0.1"],
                "interface": {
                    "eth1": {"peer": "192.0.2.2", "port": "bad"},
                    "eth0": {"peer": "192.0.2.1", "port": "3780"},
                },
                "listen-address": {"192.0.2.10": {}, "192.0.2.9": {}},
                "mcast-group": "225.0.0.50",
                "startup-resync": {},
                "sync-queue-size": "not-a-number",
            }
        }
    }


def test_parse_distinctive_fields():
    parsed = get_conntrack_sync_mapper("1.5").parse_config(_tree())
    assert parsed["accept_protocols"] == ["tcp"]
    assert parsed["disable_external_cache"] is True
    assert parsed["disable_syslog"] is False
    assert parsed["event_listen_queue_size"] == 8
    assert parsed["expect_sync"] == ["ftp", "sip"]
    assert parsed["failover_mechanism"] == {"vrrp": {"sync_group": "cluster"}}
    assert parsed["ignore_addresses"] == ["10.0.0.1", "10.0.0.2"]
    assert [item["name"] for item in parsed["interfaces"]] == ["eth0", "eth1"]
    assert parsed["interfaces"][0]["port"] == 3780
    assert parsed["interfaces"][1]["port"] is None
    assert parsed["listen_addresses"] == ["192.0.2.10", "192.0.2.9"]
    assert parsed["mcast_group"] == "225.0.0.50"
    assert parsed["startup_resync"] is True
    assert parsed["sync_queue_size"] is None


def test_failover_without_vrrp_is_empty_mechanism():
    tree = {"service": {"conntrack-sync": {"failover-mechanism": {"other": {}}}}}
    parsed = get_conntrack_sync_mapper("1.4").parse_config(tree)
    assert parsed["failover_mechanism"] == {"vrrp": None}


def test_empty_tree():
    parsed = get_conntrack_sync_mapper("1.5").parse_config({})
    assert parsed["interfaces"] == []
    assert parsed["ignore_addresses"] == []
    assert parsed["failover_mechanism"] is None
    assert parsed["disable_external_cache"] is False
    assert parsed["mcast_group"] is None


def test_registry_matches_factory():
    factory = get_conntrack_sync_mapper("1.5").parse_config(_tree())
    registry = CommandMapperRegistry.get_mapper("conntrack_sync", "1.5").parse_config(_tree())
    assert registry["mcast_group"] == factory["mcast_group"] == "225.0.0.50"


def test_get_config_returns_mapper_parse(monkeypatch):
    tree = _tree()
    expected = get_conntrack_sync_mapper("1.5").parse_config(tree)

    async def allow(*_args, **_kwargs):
        return None

    class FakeService:
        def get_version(self):
            return "1.5"

        def get_full_config(self, refresh=False):
            return tree

    monkeypatch.setattr(
        "routers.conntrack_sync.conntrack_sync.require_read_permission", allow
    )
    monkeypatch.setattr(
        "routers.conntrack_sync.conntrack_sync.get_session_vyos_service",
        lambda _req: FakeService(),
    )

    from fastapi import FastAPI
    from fastapi.testclient import TestClient
    from routers.conntrack_sync.conntrack_sync import router

    app = FastAPI()
    app.include_router(router)
    client = TestClient(app)
    response = client.get("/vyos/conntrack-sync/config")
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["mcast_group"] == expected["mcast_group"]
    assert body["interfaces"][0]["name"] == "eth0"
    assert body["interfaces"][0]["port"] == 3780
    assert body["failover_mechanism"]["vrrp"]["sync_group"] == "cluster"
