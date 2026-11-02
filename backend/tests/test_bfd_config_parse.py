"""BFD GET /config parse lives on the mapper (issue #966)."""

from vyos_mappers.base import CommandMapperRegistry
from vyos_mappers.bfd.bfd_versions import get_bfd_mapper


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
    parsed = get_bfd_mapper("1.5").parse_config(_tree())
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
    parsed = get_bfd_mapper("1.4").parse_config({})
    assert parsed == {"peers": [], "profiles": []}
    assert get_bfd_mapper("1.5").parse_config({"protocols": {"bfd": None}}) == {
        "peers": [],
        "profiles": [],
    }


def test_registry_matches_factory():
    import vyos_mappers  # noqa: F401

    factory = get_bfd_mapper("1.5").parse_config(_tree())
    registry = CommandMapperRegistry.get_mapper("bfd", "1.5").parse_config(_tree())
    assert registry["peers"][0]["profile"] == factory["peers"][0]["profile"] == "fast"


def test_get_config_returns_mapper_parse(monkeypatch):
    tree = _tree()
    expected = get_bfd_mapper("1.5").parse_config(tree)

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
