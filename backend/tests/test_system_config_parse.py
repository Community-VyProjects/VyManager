"""System GET /config parse lives on the mapper (issue #664)."""

from pathlib import Path
from typing import Any

from vyos_mappers.system.system_versions import get_system_mapper


def _tree_with_versioned_nodes():
    return {
        "sflow": {
            "agent-address": "10.0.0.1",
            "sampling-rate": "64",
            "server": {"192.0.2.8": {"port": "6343"}},
        },
        "system": {
            "host-name": "edge",
            "syslog": {
                "local": {
                    "facility": {"all": {"level": "info"}},
                    "preserve-fqdn": {},
                },
                "remote": {
                    "192.0.2.10": {
                        "facility": {"auth": {"level": "err"}},
                        "port": "514",
                    }
                },
                "global": {
                    "facility": {"kern": {"level": "warning"}},
                    "marker": {"interval": "60"},
                },
                "host": {
                    "192.0.2.11": {
                        "facility": {"daemon": {"level": "notice"}},
                    }
                },
            },
            "conntrack": {
                "timeout": {
                    "icmp": "30",
                    "tcp": {"established": "7440"},
                }
            },
            "flow-accounting": {
                "interface": ["eth0"],
                "sflow": {
                    "agent-address": "10.0.0.2",
                    "server": {"192.0.2.9": {"port": "6343"}},
                },
                "netflow": {
                    "interface": ["eth1"],
                    "version": "9",
                },
            },
            "config-management": {
                "commit-revisions": "20",
                "commit-archive": {
                    "location": ["scp://backup.example/cfg"],
                },
            },
        },
    }


def test_1_5_syslog_uses_local_and_remote_keys():
    parsed = get_system_mapper("1.5").parse_config(_tree_with_versioned_nodes())
    assert [f["facility"] for f in parsed["syslog"]["local_facilities"]] == ["all"]
    assert parsed["syslog"]["remote_hosts"][0]["host"] == "192.0.2.10"
    assert parsed["syslog_marker"] is None
    assert parsed["conntrack_global_timeouts"] is None
    assert parsed["sflow"]["agent_address"] == "10.0.0.1"
    assert parsed["flow_accounting"]["interfaces"] == ["eth1"]
    assert parsed["flow_accounting"]["sflow"] is None


def test_1_4_syslog_uses_global_and_host_keys():
    parsed = get_system_mapper("1.4").parse_config(_tree_with_versioned_nodes())
    assert [f["facility"] for f in parsed["syslog"]["local_facilities"]] == ["kern"]
    assert parsed["syslog"]["remote_hosts"][0]["host"] == "192.0.2.11"
    assert parsed["syslog_marker"]["interval"] == 60
    assert parsed["conntrack_global_timeouts"]["icmp"] == 30
    assert parsed["sflow"] is None
    assert parsed["flow_accounting"]["interfaces"] == ["eth0"]
    assert parsed["flow_accounting"]["sflow"]["agent_address"] == "10.0.0.2"


def test_parse_config_management_archive_locations():
    mapper = get_system_mapper("1.5")
    cm = mapper.parse_config_management(_tree_with_versioned_nodes()["system"])
    assert cm["commit_revisions"] == 20
    assert cm["archive_locations"] == ["scp://backup.example/cfg"]


def test_system_router_has_no_parse_helpers():
    text = Path(__file__).resolve().parents[1].joinpath("routers/system/system.py").read_text()
    assert "def _parse_" not in text


def test_get_config_returns_mapper_parse(monkeypatch):
    tree = _tree_with_versioned_nodes()
    expected = get_system_mapper("1.5").parse_config(tree)

    async def allow(*_args, **_kwargs):
        return None

    class FakeService:
        def get_version(self):
            return "1.5"

        def get_full_config(self, refresh=False):
            return tree

    monkeypatch.setattr("routers.system.system.require_read_permission", allow)
    monkeypatch.setattr(
        "routers.system.system.get_session_vyos_service",
        lambda _req: FakeService(),
    )

    from fastapi import FastAPI
    from fastapi.testclient import TestClient
    from routers.system.system import router

    app = FastAPI()
    app.include_router(router)
    client = TestClient(app)
    response = client.get("/vyos/system/config")
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["hostname"] == expected["hostname"]
    assert body["syslog"]["local_facilities"][0]["facility"] == "all"
    assert body["sflow"]["agent_address"] == "10.0.0.1"
    assert body["conntrack_global_timeouts"] is None


def _system_client(monkeypatch, service, *, read=None, write=None):
    async def allow(*_args, **_kwargs):
        return None

    monkeypatch.setattr("routers.system.system.require_read_permission", read or allow)
    monkeypatch.setattr("routers.system.system.require_write_permission", write or allow)
    monkeypatch.setattr("routers.system.system.get_session_vyos_service", lambda _req: service)

    from fastapi import FastAPI
    from fastapi.testclient import TestClient
    from routers.system.system import router

    app = FastAPI()
    app.include_router(router)
    return TestClient(app)


def test_the_archive_diff_needs_system_read(monkeypatch):
    """Archive locations and archived files are SYSTEM data (list and restore check it too)."""
    from fastapi import HTTPException
    from rbac_permissions import FeatureGroup

    checked = []

    async def read(_request, feature):
        checked.append(feature)
        raise HTTPException(status_code=403, detail="Forbidden")

    client = _system_client(monkeypatch, object(), read=read)
    response = client.get("/vyos/system/config/archive-diff",
                          params={"archive_location": "sftp://b/cfg/", "filename": "config.boot"})

    assert response.status_code == 403
    assert checked == [FeatureGroup.SYSTEM]


def test_a_restore_whose_reply_data_is_text_is_still_a_success(monkeypatch):
    """VyOS's /config-file load answers with its commit output as a string."""
    from pyvyos.core.rest_client import ApiResponse

    class FakeService:
        def get_version(self):
            return "1.5"

        def get_full_config(self, refresh=False):
            return {"system": {"config-management": {"commit-archive": {"location": ["sftp://b/cfg/"]}}}}

        def load_config_file(self, url):
            text: Any = "commit will be called in the background\n"
            return ApiResponse(status=200, request={}, result=text, error="")

    client = _system_client(monkeypatch, FakeService())
    response = client.post("/vyos/system/config/restore",
                           json={"archive_location": "sftp://b/cfg/", "filename": "config.boot.2026-11-27-0800"})

    assert response.status_code == 200, response.text
    assert response.json()["success"] is True


def test_an_empty_system_batch_stays_a_500(monkeypatch):
    class FakeService:
        def get_version(self):
            return "1.5"

        def execute_batch(self, builder):
            raise ValueError("Cannot execute empty batch")

    client = _system_client(monkeypatch, FakeService())
    response = client.post("/vyos/system/batch", json={"item_name": "x", "operations": []})

    assert response.status_code == 500
