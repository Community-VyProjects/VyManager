"""DNS forwarding GET /config parse lives on the mapper."""

from pathlib import Path

from vyos_mappers.dns_forwarding.dns_forwarding_versions import get_dns_forwarding_mapper


def _tree():
    return {
        "service": {
            "dns": {
                "forwarding": {
                    "listen-address": {"10.0.0.1": {}, "192.0.2.1": {}},
                    "allow-from": ["10.0.0.0/8", "192.168.0.0/16"],
                    "name-server": {"1.1.1.1": {"port": "53"}, "8.8.8.8": {}},
                    "port": "53",
                    "cache-size": "10000",
                    "dnssec": "off",
                    "system": {},
                    "negative-ttl": "nope",
                    "dhcp": {"eth0": {}},
                    "ignore-hosts-file": {},
                    "domain": {
                        "example.com": {
                            "name-server": {"9.9.9.9": {"port": "5353"}},
                            "addnta": {},
                            "recursion-desired": {},
                        }
                    },
                    "authoritative-domain": {
                        "example.org": {
                            "disable": {},
                            "records": {
                                "a": {"www": {"address": "192.0.2.10", "ttl": "300"}},
                                "mx": {
                                    "@": {
                                        "server": {
                                            "mail.example.org": {"priority": "10"}
                                        },
                                        "ttl": "3600",
                                    }
                                },
                                "srv": {
                                    "_sip._tcp": {
                                        "entry": {
                                            "1": {
                                                "hostname": "sip.example.org",
                                                "port": "5060",
                                                "priority": "1",
                                                "weight": "5",
                                            }
                                        }
                                    }
                                },
                            },
                        }
                    },
                    "zone-cache": {
                        "example.net": {
                            "source": {
                                "url": "https://example.net/zone",
                                "axfr": "192.0.2.53",
                            },
                            "options": {
                                "dnssec": "validate",
                                "max-zone-size": "1024",
                                "refresh": {"interval": "60", "on-reload": {}},
                                "zonemd": "ignore",
                            },
                        }
                    },
                    "options": {
                        "ecs-add-for": {"192.0.2.0/24": {}},
                        "ecs-ipv4-bits": "24",
                        "edns-subnet-allow-list": ["192.0.2.1"],
                    },
                }
            }
        }
    }


def test_empty_forwarding_tree():
    parsed = get_dns_forwarding_mapper("1.5").parse_config({})
    assert parsed["listen_addresses"] == []
    assert parsed["name_servers"] == []
    assert parsed["port"] is None
    assert parsed["system"] is False
    assert parsed["domain_forwarders"] == []
    assert parsed["ecs_options"]["ecs_add_for"] == []
    assert get_dns_forwarding_mapper("1.4").parse_config(
        {"service": {"dns": {"forwarding": {}}}}
    )["authoritative_domains"] == []


def test_dns_forwarding_parses_distinctive_fields():
    parsed = get_dns_forwarding_mapper("1.5").parse_config(_tree())
    assert parsed["listen_addresses"] == ["10.0.0.1", "192.0.2.1"]
    assert parsed["allow_from"] == ["10.0.0.0/8", "192.168.0.0/16"]
    assert parsed["name_servers"][0] == {"ip": "1.1.1.1", "port": 53}
    assert parsed["port"] == 53
    assert parsed["cache_size"] == 10000
    assert parsed["negative_ttl"] is None
    assert parsed["system"] is True
    assert parsed["ignore_hosts_file"] is True
    assert parsed["dhcp_interfaces"] == ["eth0"]
    forwarder = parsed["domain_forwarders"][0]
    assert forwarder["domain"] == "example.com"
    assert forwarder["addnta"] is True
    assert forwarder["name_servers"][0]["port"] == 5353
    domain = parsed["authoritative_domains"][0]
    assert domain["disabled"] is True
    assert domain["records"]["a"][0]["address"] == "192.0.2.10"
    assert domain["records"]["a"][0]["ttl"] == 300
    assert domain["records"]["mx"][0]["servers"][0]["priority"] == 10
    assert domain["records"]["srv"][0]["entries"][0]["port"] == 5060
    zone = parsed["zone_caches"][0]
    assert zone["source_url"] == "https://example.net/zone"
    assert zone["options"]["refresh_interval"] == 60
    assert zone["options"]["refresh_on_reload"] is True
    assert zone["options"]["max_zone_size"] == 1024
    assert parsed["ecs_options"]["ecs_ipv4_bits"] == 24
    assert parsed["ecs_options"]["ecs_add_for"] == ["192.0.2.0/24"]


def test_dns_forwarding_router_has_no_parse_helpers():
    text = (
        Path(__file__)
        .resolve()
        .parents[1]
        .joinpath("routers/dns_forwarding/dns_forwarding.py")
        .read_text()
    )
    assert "def _parse_" not in text


def test_get_config_returns_mapper_parse(monkeypatch):
    tree = _tree()
    expected = get_dns_forwarding_mapper("1.5").parse_config(tree)

    async def allow(*_args, **_kwargs):
        return None

    class FakeService:
        def get_version(self):
            return "1.5"

        def get_full_config(self, refresh=False):
            return tree

    monkeypatch.setattr(
        "routers.dns_forwarding.dns_forwarding.require_read_permission", allow
    )
    monkeypatch.setattr(
        "routers.dns_forwarding.dns_forwarding.get_session_vyos_service",
        lambda _req: FakeService(),
    )

    from fastapi import FastAPI
    from fastapi.testclient import TestClient
    from routers.dns_forwarding.dns_forwarding import router

    app = FastAPI()
    app.include_router(router)
    client = TestClient(app)
    response = client.get("/vyos/dns-forwarding/config")
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["listen_addresses"] == expected["listen_addresses"]
    assert body["name_servers"][0]["port"] == 53
    assert body["negative_ttl"] is None
    assert body["authoritative_domains"][0]["records"]["a"][0]["ttl"] == 300
    assert body["zone_caches"][0]["options"]["refresh_on_reload"] is True
