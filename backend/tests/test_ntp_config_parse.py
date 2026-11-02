"""NTP GET /config parse lives on the mapper (issue #966)."""

from pathlib import Path

from vyos_mappers.ntp.ntp_versions import get_ntp_mapper


def _tree():
    return {
        "service": {
            "ntp": {
                "allow-client": {"address": ["10.2.0.0/24", "10.1.0.0/24"]},
                "interface": {"eth1": {}, "eth0": {}},
                "leap-second": "smear",
                "listen-address": "192.0.2.1",
                "server": {
                    "pool.ntp.org": {"pool": {}, "prefer": {}},
                    "time.example": None,
                    "nts.example": {"nts": {}, "noselect": {}},
                },
                "timestamp": {
                    "interface": {
                        "eth2": {"receive-filter": "all"},
                        "eth0": "skip-me",
                        "eth1": {},
                        "eth3": {"receive-filter": "ptp"},
                    }
                },
                "vrf": "mgmt",
            }
        }
    }


def _empty():
    return {
        "allow_clients": [],
        "interfaces": [],
        "leap_second": None,
        "listen_addresses": [],
        "servers": [],
        "timestamp_interfaces": [],
        "vrf": None,
    }


def test_parse_config_is_explicit_and_version_falls_through():
    mapper = get_ntp_mapper("1.4")
    assert "parse_config" in type(mapper).__dict__
    assert mapper.version == "1.4"
    assert get_ntp_mapper("1.5").version == "1.5"


def test_servers_flags_and_timestamp_filters():
    parsed = get_ntp_mapper("1.5").parse_config(_tree())
    assert type(parsed) is dict
    assert parsed["allow_clients"] == ["10.1.0.0/24", "10.2.0.0/24"]
    assert parsed["interfaces"] == ["eth0", "eth1"]
    assert parsed["leap_second"] == "smear"
    assert parsed["listen_addresses"] == ["192.0.2.1"]
    assert parsed["vrf"] == "mgmt"
    by_name = {server["name"]: server for server in parsed["servers"]}
    assert list(by_name) == ["nts.example", "pool.ntp.org", "time.example"]
    assert by_name["pool.ntp.org"]["pool"] is True
    assert by_name["pool.ntp.org"]["prefer"] is True
    assert by_name["pool.ntp.org"]["noselect"] is False
    assert by_name["nts.example"]["nts"] is True
    assert by_name["nts.example"]["noselect"] is True
    assert by_name["time.example"]["pool"] is False
    assert parsed["timestamp_interfaces"] == [
        {"interface": "eth2", "receive_filter": "all"},
        {"interface": "eth3", "receive_filter": "ptp"},
    ]
    assert get_ntp_mapper("1.4").parse_config(_tree()) == parsed


def test_empty_tree():
    assert get_ntp_mapper("1.4").parse_config({}) == _empty()
    assert get_ntp_mapper("1.5").parse_config({"service": {}}) == _empty()
    assert get_ntp_mapper("1.5").parse_config({"service": {"ntp": {}}}) == _empty()


def test_router_has_no_parse_helpers():
    root = Path(__file__).resolve().parents[1]
    text = root.joinpath("routers/ntp/ntp.py").read_text()
    assert "def _parse_" not in text
    assert "mapper.parse_config" in text
    parse_src = root.joinpath("vyos_mappers/ntp/config_parse.py").read_text()
    assert "pydantic" not in parse_src
    assert "fastapi" not in parse_src
    assert "routers" not in parse_src


def test_get_config_returns_mapper_parse(monkeypatch):
    tree = _tree()
    expected = get_ntp_mapper("1.5").parse_config(tree)

    async def allow(*_args, **_kwargs):
        return None

    class FakeService:
        def get_version(self):
            return "1.5"

        def get_full_config(self, refresh=False):
            return tree

    monkeypatch.setattr("routers.ntp.ntp.require_read_permission", allow)
    monkeypatch.setattr(
        "routers.ntp.ntp.get_session_vyos_service",
        lambda _req: FakeService(),
    )

    from fastapi import FastAPI
    from fastapi.testclient import TestClient
    from routers.ntp.ntp import router

    app = FastAPI()
    app.include_router(router)
    response = TestClient(app).get("/vyos/ntp/config")
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["vrf"] == expected["vrf"]
    assert body["servers"][0]["name"] == "nts.example"
    assert body["servers"][0]["nts"] is True
    assert body["timestamp_interfaces"] == expected["timestamp_interfaces"]
    assert body["allow_clients"] == expected["allow_clients"]
