"""Webproxy GET /config parse lives on the mapper (issue #966)."""

from vyos_mappers.webproxy.webproxy_versions import get_webproxy_mapper


def _tree():
    return {
        "service": {
            "webproxy": {
                "append-domain": [".example.com"],
                "cache-size": ["256"],
                "default-port": "3128",
                "disable-access-log": {},
                "domain-block": ["b.example", "a.example"],
                "safe-ports": {"80": {}, "443": {}},
                "authentication": {
                    "children": "8",
                    "method": "ldap",
                    "realm": "proxy",
                    "ldap": {
                        "server": "ldap.example",
                        "base-dn": "dc=example,dc=com",
                        "port": "389",
                        "use-ssl": {},
                        "persistent-connection": {},
                    },
                },
                "cache-peer": {
                    "upstream-b": None,
                    "upstream-a": {
                        "address": "192.0.2.20",
                        "http-port": "3128",
                        "type": "parent",
                    },
                },
                "listen-address": {
                    "10.0.0.2": {"disable-transparent": {}},
                    "10.0.0.1": {"port": "8080"},
                },
                "url-filtering": {
                    "disable": {},
                    "squidguard": {
                        "default-action": "block",
                        "redirect-url": "http://deny.example",
                        "auto-update": {"update-hour": "3"},
                        "block-category": ["ads", "malware"],
                        "rule": {
                            "10": {
                                "source-group": "staff",
                                "time-period": "work",
                                "allow-category": ["news"],
                                "enable-safe-search": {},
                            },
                            "2": None,
                        },
                        "source-group": {
                            "guests": {"address": ["10.9.0.0/24"], "user": "guest"},
                            "staff": {"domain": ["staff.example"], "description": "Staff"},
                        },
                        "time-period": {
                            "work": {
                                "description": "office hours",
                                "days": {
                                    "sun": None,
                                    "mon": {"time": "09:00-17:00"},
                                },
                            }
                        },
                    },
                },
            }
        }
    }


def _empty():
    squidguard = {
        "allow_categories": [],
        "block_categories": [],
        "log": [],
        "local_block": [],
        "local_block_keyword": [],
        "local_block_url": [],
        "local_ok": [],
        "local_ok_url": [],
        "allow_ipaddr_url": False,
        "enable_safe_search": False,
        "default_action": None,
        "redirect_url": None,
        "auto_update_hour": None,
        "rules": [],
        "source_groups": [],
        "time_periods": [],
    }
    return {
        "append_domain": None,
        "cache_size": None,
        "default_port": None,
        "maximum_object_size": None,
        "mem_cache_size": None,
        "minimum_object_size": None,
        "outgoing_address": None,
        "reply_body_max_size": None,
        "disable_access_log": False,
        "domain_block": [],
        "domain_noncache": [],
        "reply_block_mime": [],
        "safe_ports": [],
        "ssl_safe_ports": [],
        "authentication": {
            "children": None,
            "credentials_ttl": None,
            "method": None,
            "realm": None,
            "ldap": {
                "server": None,
                "base_dn": None,
                "bind_dn": None,
                "filter_expression": None,
                "password": None,
                "username_attribute": None,
                "port": None,
                "version": None,
                "persistent_connection": False,
                "use_ssl": False,
            },
        },
        "cache_peers": [],
        "listen_addresses": [],
        "url_filtering": {"disable": False, "squidguard": squidguard},
    }


def test_parse_config_is_explicit_and_version_falls_through():
    mapper = get_webproxy_mapper("1.4")
    assert "parse_config" in type(mapper).__dict__
    assert mapper.version == "1.4"
    assert get_webproxy_mapper("1.5").version == "1.5"


def test_auth_peers_and_squidguard_rules():
    parsed = get_webproxy_mapper("1.5").parse_config(_tree())
    assert type(parsed) is dict
    assert parsed["append_domain"] == ".example.com"
    assert parsed["cache_size"] == 256
    assert parsed["default_port"] == 3128
    assert parsed["disable_access_log"] is True
    assert parsed["domain_block"] == ["a.example", "b.example"]
    assert parsed["safe_ports"] == ["443", "80"]
    auth = parsed["authentication"]
    assert auth["children"] == 8
    assert auth["method"] == "ldap"
    assert auth["ldap"]["server"] == "ldap.example"
    assert auth["ldap"]["port"] == 389
    assert auth["ldap"]["use_ssl"] is True
    assert auth["ldap"]["persistent_connection"] is True
    assert parsed["cache_peers"][0]["name"] == "upstream-a"
    assert parsed["cache_peers"][0]["http_port"] == 3128
    assert parsed["cache_peers"][1]["address"] is None
    assert parsed["listen_addresses"] == [
        {"address": "10.0.0.1", "port": 8080, "disable_transparent": False},
        {"address": "10.0.0.2", "port": None, "disable_transparent": True},
    ]
    filtering = parsed["url_filtering"]
    assert filtering["disable"] is True
    guard = filtering["squidguard"]
    assert guard["default_action"] == "block"
    assert guard["auto_update_hour"] == 3
    assert guard["block_categories"] == ["ads", "malware"]
    assert [rule["number"] for rule in guard["rules"]] == ["2", "10"]
    assert guard["rules"][0]["allow_categories"] == []
    assert guard["rules"][1]["source_group"] == "staff"
    assert guard["rules"][1]["enable_safe_search"] is True
    groups = {item["name"]: item for item in guard["source_groups"]}
    assert groups["guests"]["address"] == ["10.9.0.0/24"]
    assert groups["staff"]["description"] == "Staff"
    period = guard["time_periods"][0]
    assert period["name"] == "work"
    assert period["days"] == [
        {"day": "mon", "time": "09:00-17:00"},
        {"day": "sun", "time": None},
    ]
    assert get_webproxy_mapper("1.4").parse_config(_tree()) == parsed


def test_empty_tree():
    assert get_webproxy_mapper("1.4").parse_config({}) == _empty()
    assert get_webproxy_mapper("1.5").parse_config({"service": {}}) == _empty()
    assert get_webproxy_mapper("1.5").parse_config({"service": {"webproxy": {}}}) == _empty()



def test_get_config_returns_mapper_parse(monkeypatch):
    tree = _tree()
    expected = get_webproxy_mapper("1.5").parse_config(tree)

    async def allow(*_args, **_kwargs):
        return None

    class FakeService:
        def get_version(self):
            return "1.5"

        def get_full_config(self, refresh=False):
            return tree

    monkeypatch.setattr("routers.webproxy.webproxy.require_read_permission", allow)
    monkeypatch.setattr(
        "routers.webproxy.webproxy.get_session_vyos_service",
        lambda _req: FakeService(),
    )

    from fastapi import FastAPI
    from fastapi.testclient import TestClient
    from routers.webproxy.webproxy import router

    app = FastAPI()
    app.include_router(router)
    client = TestClient(app)
    response = client.get("/vyos/webproxy/config")
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["cache_size"] == expected["cache_size"]
    assert body["authentication"]["ldap"]["use_ssl"] is True
    assert body["url_filtering"]["squidguard"]["rules"][1]["source_group"] == "staff"
    assert body["url_filtering"]["squidguard"]["time_periods"][0]["days"][1]["time"] is None
