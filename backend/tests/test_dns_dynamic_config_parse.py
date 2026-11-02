"""DNS dynamic GET /config parse lives on the mapper (issue #966)."""

from vyos_mappers.dns_dynamic.dns_dynamic_versions import get_dns_dynamic_mapper


def _tree():
    return {
        "service": {
            "dns": {
                "dynamic": {
                    "interval": "300",
                    "vrf": "mgmt",
                    "name": {
                        "zeta": None,
                        "beta": {"host-name": ["z.example", "m.example"], "ttl": "0"},
                        "alpha": {
                            "protocol": "cloudflare",
                            "server": "api.cloudflare.com",
                            "username": "user",
                            "password": "secret",
                            "host-name": {"b.example": {}, "a.example": {}},
                            "ip-version": "ipv4",
                            "address": {
                                "interface": "eth0",
                                "web": {
                                    "url": "https://checkip.example",
                                    "skip": "Current IP",
                                },
                            },
                            "description": "home",
                            "ttl": "120",
                            "key": "tsig",
                            "expiry-time": "nope",
                            "wait-time": "60",
                            "zone": "example.com",
                        },
                    },
                }
            }
        }
    }


def _empty():
    return {"interval": None, "vrf": None, "entries": []}


def test_parse_config_is_explicit_and_version_falls_through():
    mapper = get_dns_dynamic_mapper("1.4")
    assert "parse_config" in type(mapper).__dict__
    assert mapper.version == "1.4"
    assert get_dns_dynamic_mapper("1.5").version == "1.5"


def test_entries_intervals_and_address():
    parsed = get_dns_dynamic_mapper("1.5").parse_config(_tree())
    assert type(parsed) is dict
    assert parsed["interval"] == 300
    assert parsed["vrf"] == "mgmt"
    assert [entry["name"] for entry in parsed["entries"]] == ["alpha", "beta", "zeta"]
    alpha = parsed["entries"][0]
    assert alpha["protocol"] == "cloudflare"
    assert alpha["password"] == "secret"
    assert alpha["hostnames"] == ["a.example", "b.example"]
    assert alpha["address"] == {
        "interface": "eth0",
        "web_url": "https://checkip.example",
        "web_skip": "Current IP",
    }
    assert alpha["ttl"] == 120
    assert alpha["expiry_time"] is None
    assert alpha["wait_time"] == 60
    assert alpha["zone"] == "example.com"
    beta = parsed["entries"][1]
    assert beta["hostnames"] == ["m.example", "z.example"]
    assert beta["ttl"] == 0
    assert beta["address"]["interface"] is None
    zeta = parsed["entries"][2]
    assert zeta["password"] is None
    assert zeta["hostnames"] == []
    assert zeta["address"] == {
        "interface": None,
        "web_url": None,
        "web_skip": None,
    }
    assert get_dns_dynamic_mapper("1.4").parse_config(_tree()) == parsed


def test_empty_tree():
    assert get_dns_dynamic_mapper("1.4").parse_config({}) == _empty()
    assert get_dns_dynamic_mapper("1.5").parse_config({"service": {"dns": {}}}) == _empty()
    assert (
        get_dns_dynamic_mapper("1.5").parse_config(
            {"service": {"dns": {"dynamic": {}}}}
        )
        == _empty()
    )



def test_get_config_returns_mapper_parse(monkeypatch):
    tree = _tree()
    expected = get_dns_dynamic_mapper("1.5").parse_config(tree)

    async def allow(*_args, **_kwargs):
        return None

    class FakeService:
        def get_version(self):
            return "1.5"

        def get_full_config(self, refresh=False):
            return tree

    monkeypatch.setattr(
        "routers.dns_dynamic.dns_dynamic.require_read_permission", allow
    )
    monkeypatch.setattr(
        "routers.dns_dynamic.dns_dynamic.get_session_vyos_service",
        lambda _req: FakeService(),
    )

    from fastapi import FastAPI
    from fastapi.testclient import TestClient
    from routers.dns_dynamic.dns_dynamic import router

    app = FastAPI()
    app.include_router(router)
    client = TestClient(app)
    response = client.get("/vyos/dns-dynamic/config")
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["interval"] == expected["interval"] == 300
    assert body["entries"][0]["password"] == "secret"
    assert body["entries"][0]["hostnames"] == ["a.example", "b.example"]
    assert body["entries"][1]["ttl"] == 0
    assert body["entries"][2]["name"] == "zeta"
