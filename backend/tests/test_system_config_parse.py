"""System GET /config parse lives on the mapper (issue #664)."""

from pathlib import Path

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
    text = Path(__file__).resolve().parents[1].joinpath("routers/system.py").read_text()
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

    monkeypatch.setattr("routers.system.require_read_permission", allow)
    monkeypatch.setattr(
        "routers.system.get_session_vyos_service",
        lambda _req: FakeService(),
    )

    from fastapi import FastAPI
    from fastapi.testclient import TestClient
    from routers.system import router

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
