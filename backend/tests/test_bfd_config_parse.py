"""BFD GET /config parse lives on the mapper (issue #966)."""

from pathlib import Path

from vyos_mappers.base import CommandMapperRegistry
from vyos_mappers.bfd import BfdMapper


def _tree():
    return {
        "protocols": {
            "bfd": {
                "peer": {
                    "192.0.2.1": {
                        "echo-mode": {},
                        "interval": {
                            "echo-interval": "50",
                            "multiplier": "3",
                            "receive": "300",
                            "transmit": "300",
                        },
                        "minimum-ttl": "5",
                        "multihop": {},
                        "profile": "fast",
                        "source": {"address": "192.0.2.2", "interface": "eth0"},
                        "vrf": "blue",
                    },
                    "192.0.2.9": None,
                },
                "profile": {
                    "fast": {
                        "passive": {},
                        "shutdown": {},
                        "interval": {"receive": "100"},
                    }
                },
            }
        }
    }


def test_parse_distinctive_fields():
    parsed = BfdMapper("1.5").parse_config(_tree())
    peers = {item["address"]: item for item in parsed["peers"]}
    peer = peers["192.0.2.1"]
    assert peer["echo_mode"] is True
    assert peer["interval"]["echo_interval"] == 50
    assert peer["interval"]["multiplier"] == 3
    assert peer["minimum_ttl"] == 5
    assert peer["multihop"] is True
    assert peer["passive"] is False
    assert peer["profile"] == "fast"
    assert peer["shutdown"] is False
    assert peer["source"] == {"address": "192.0.2.2", "interface": "eth0"}
    assert peer["vrf"] == "blue"
    bare = peers["192.0.2.9"]
    assert bare["interval"]["receive"] is None
    assert bare["source"] == {"address": None, "interface": None}
    profiles = {item["name"]: item for item in parsed["profiles"]}
    assert profiles["fast"]["passive"] is True
    assert profiles["fast"]["shutdown"] is True
    assert profiles["fast"]["interval"]["receive"] == 100
    assert profiles["fast"]["echo_mode"] is False


def test_empty_tree():
    parsed = BfdMapper("1.4").parse_config({})
    assert parsed == {"peers": [], "profiles": []}
    assert BfdMapper("1.5").parse_config({"protocols": {"bfd": None}}) == {
        "peers": [],
        "profiles": [],
    }


def test_registry_returns_shared_mapper():
    """Labs match, so the registry must not wrap a merge proxy."""
    for version in ("1.4", "1.4.3", "1.5", "2026.09.23-rolling"):
        mapper = CommandMapperRegistry.get_mapper("bfd", version)
        assert type(mapper) is BfdMapper
        assert mapper.version == version
    direct = BfdMapper("1.5").parse_config(_tree())
    registry = CommandMapperRegistry.get_mapper("bfd", "1.5").parse_config(_tree())
    assert registry["peers"][0]["profile"] == direct["peers"][0]["profile"] == "fast"
    versions = Path(__file__).resolve().parents[1] / "vyos_mappers" / "bfd" / "bfd_versions"
    assert not versions.exists()


def test_get_config_returns_mapper_parse(monkeypatch):
    tree = _tree()
    expected = BfdMapper("1.5").parse_config(tree)

    async def allow(*_args, **_kwargs):
        return None

    class FakeService:
        def get_version(self):
            return "1.5"

        def get_full_config(self, refresh=False):
            return tree

    monkeypatch.setattr("routers.bfd.bfd.require_read_permission", allow)
    monkeypatch.setattr(
        "routers.bfd.bfd.get_session_vyos_service",
        lambda _req: FakeService(),
    )

    from fastapi import FastAPI
    from fastapi.testclient import TestClient
    from routers.bfd.bfd import router

    app = FastAPI()
    app.include_router(router)
    client = TestClient(app)
    response = client.get("/vyos/bfd/config")
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["peers"][0]["address"] == expected["peers"][0]["address"]
    assert body["peers"][0]["interval"]["echo_interval"] == 50
    assert body["profiles"][0]["name"] == "fast"
    assert body["profiles"][0]["passive"] is True
