"""Conntrack-sync GET /config parse lives on the shared mapper (issues #966, #1342)."""

from pathlib import Path

import pytest

from vyos_builders.conntrack_sync.conntrack_sync_batch_builder import (
    ConntrackSyncBatchBuilder,
)
from vyos_mappers.base import CommandMapperRegistry
from vyos_mappers.conntrack_sync.conntrack_sync import ConntrackSyncMapper
from vyos_mappers.conntrack_sync.conntrack_sync_versions import get_conntrack_sync_mapper
from vyos_mappers.conntrack_sync.conntrack_sync_versions.v1_5 import ConntrackSyncMapperV1_5

ROLLING = "2026.09.23-0027-rolling"
VERSIONS_DIR = (
    Path(__file__).resolve().parents[1]
    / "vyos_mappers"
    / "conntrack_sync"
    / "conntrack_sync_versions"
)


def _tree():
    return {
        "high-availability": {
            "vrrp": {"sync-group": {"SG-B": {"member": "G1"}, "SG-A": {"member": "G2"}}}
        },
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
                "purge-timeout": "60",
                "startup-resync": {},
                "sync-queue-size": "not-a-number",
            }
        },
    }


def test_parse_distinctive_fields():
    parsed = get_conntrack_sync_mapper("1.5").parse_config(_tree())
    assert parsed["configured"] is True
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
    assert parsed["purge_timeout"] == 60
    assert parsed["startup_resync"] is True
    assert parsed["sync_queue_size"] is None
    assert parsed["vrrp_sync_groups"] == ["SG-A", "SG-B"]


def test_failover_without_vrrp_is_empty_mechanism():
    tree = {"service": {"conntrack-sync": {"failover-mechanism": {"other": {}}}}}
    parsed = get_conntrack_sync_mapper("1.4").parse_config(tree)
    assert parsed["failover_mechanism"] == {"vrrp": None}


def test_empty_tree_has_the_same_shape():
    parsed = get_conntrack_sync_mapper("1.5").parse_config({})
    assert parsed.keys() == get_conntrack_sync_mapper("1.5").parse_config(_tree()).keys()
    assert parsed["configured"] is False
    assert parsed["interfaces"] == []
    assert parsed["ignore_addresses"] == []
    assert parsed["failover_mechanism"] is None
    assert parsed["disable_external_cache"] is False
    assert parsed["mcast_group"] is None
    assert parsed["purge_timeout"] is None
    assert parsed["vrrp_sync_groups"] == []


def test_unconfigured_service_still_lists_sync_groups():
    tree = {"high-availability": {"vrrp": {"sync-group": {"SG": {}}}}}
    parsed = get_conntrack_sync_mapper("1.4").parse_config(tree)
    assert parsed["configured"] is False
    assert parsed["vrrp_sync_groups"] == ["SG"]


def test_bare_root_is_configured():
    """A bare `service conntrack-sync` node parses as {} but is still present."""
    parsed = get_conntrack_sync_mapper("1.4").parse_config({"service": {"conntrack-sync": {}}})
    assert parsed["configured"] is True
    assert parsed["disable_syslog"] is False


@pytest.mark.parametrize("version", ["1.4", "1.4.3"])
def test_factory_returns_shared_class_on_1_4(version):
    mapper = CommandMapperRegistry.get_mapper("conntrack_sync", version)
    assert type(mapper) is ConntrackSyncMapper
    assert mapper.versioned_nodes() == frozenset()
    assert mapper.address_families() == ["ipv4"]


@pytest.mark.parametrize("version", ["1.5", ROLLING])
def test_factory_returns_subclass_on_1_5_and_rolling(version):
    mapper = CommandMapperRegistry.get_mapper("conntrack_sync", version)
    assert isinstance(mapper, ConntrackSyncMapperV1_5)
    assert mapper.versioned_nodes() == frozenset({"purge-timeout"})
    assert mapper.address_families() == ["ipv4", "ipv6"]


def test_versions_package_has_no_1_4_file_and_no_proxy():
    names = sorted(p.name for p in VERSIONS_DIR.glob("*.py"))
    assert names == ["__init__.py", "v1_5.py"]
    assert "MergedMapper" not in (VERSIONS_DIR / "__init__.py").read_text()
    assert "__getattr__" not in (VERSIONS_DIR / "__init__.py").read_text()


def test_shared_class_has_no_1_5_paths():
    assert not hasattr(ConntrackSyncMapper, "get_purge_timeout")
    assert not hasattr(ConntrackSyncMapper, "get_purge_timeout_delete")


@pytest.mark.parametrize("version, supported", [("1.4", False), ("1.5", True), (ROLLING, True)])
def test_capabilities_read_the_mapper(version, supported):
    caps = ConntrackSyncBatchBuilder(version).get_capabilities()
    features = caps["features"]
    assert "version_info" not in caps
    assert features["purge_timeout"]["supported"] is supported
    assert features["purge_timeout"]["default"] == 60
    families = ["ipv4", "ipv6"] if supported else ["ipv4"]
    for key in ("interface_peer", "listen_address", "mcast_group"):
        assert features[key]["families"] == families
    assert features["accept_protocol"]["options"] == ["tcp", "udp", "icmp", "icmp6", "sctp", "dccp"]
    assert features["expect_sync"]["options"] == ["all", "ftp", "sip", "h323", "nfs", "sqlnet"]


@pytest.mark.parametrize("method", ["get_purge_timeout", "get_purge_timeout_delete"])
def test_capabilities_follow_the_allowlist_not_the_version(monkeypatch, method):
    """Removing either 1.5 path method turns the flag off; a version check would not."""
    monkeypatch.delattr(ConntrackSyncMapperV1_5, method)
    caps = ConntrackSyncBatchBuilder("1.5").get_capabilities()
    assert caps["features"]["purge_timeout"]["supported"] is False
    with pytest.raises(ValueError):
        ConntrackSyncBatchBuilder("1.5").set_purge_timeout("60")
    with pytest.raises(ValueError):
        ConntrackSyncBatchBuilder("1.5").delete_purge_timeout()


def test_capabilities_follow_added_path_methods(monkeypatch):
    path = ["service", "conntrack-sync", "purge-timeout"]
    monkeypatch.setattr(
        ConntrackSyncMapper, "get_purge_timeout", lambda self, timeout: path + [timeout], raising=False
    )
    monkeypatch.setattr(
        ConntrackSyncMapper, "get_purge_timeout_delete", lambda self: list(path), raising=False
    )
    caps = ConntrackSyncBatchBuilder("1.4").get_capabilities()
    assert caps["features"]["purge_timeout"]["supported"] is True


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
    assert response.json() == expected
