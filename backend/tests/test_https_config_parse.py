"""HTTPS GET /config parse lives on the mapper (issue #966)."""

from vyos_mappers.https.https_versions import get_https_mapper


def _tree():
    return {
        "service": {
            "https": {
                "listen-address": {"10.0.0.2": {}, "10.0.0.1": {}},
                "allow-client": {"address": ["192.0.2.2", "192.0.2.1"]},
                "port": "0",
                "request-body-size-limit": "nope",
                "tls-version": "1.3",
                "vrf": ["mgmt", "other"],
                "enable-http-redirect": {},
                "certificates": {
                    "certificate": "srv",
                    "ca-certificate": ["ca1", "ca2"],
                },
                "api": {
                    "keys": {
                        "id": {
                            "zeta": {"key": "z-secret"},
                            "alpha": None,
                        }
                    },
                    "debug": {},
                    "cors": {"allow-origin": {"https://old.example": {}}},
                    "graphql": {
                        "introspection": {},
                        "authentication": {
                            "type": "key",
                            "expiration": "3600",
                            "secret-length": "bad",
                        },
                        "cors": {
                            "allow-origin": {
                                "https://b.example": {},
                                "https://a.example": {},
                            }
                        },
                    },
                    "rest": {"strict": {}},
                },
            }
        }
    }


def _empty():
    return {
        "listen_addresses": [],
        "allow_client_addresses": [],
        "port": None,
        "request_body_size_limit": None,
        "tls_versions": [],
        "vrf": None,
        "enable_http_redirect": False,
        "certificates": {
            "certificate": None,
            "ca_certificate": None,
            "dh_params": None,
        },
        "api": {
            "keys": [],
            "graphql": {
                "enabled": False,
                "introspection": False,
                "authentication": {
                    "auth_type": None,
                    "expiration": None,
                    "secret_length": None,
                },
                "cors_allow_origins": [],
            },
            "rest": {"enabled": False, "debug": False, "strict": False},
        },
    }


def test_parse_config_is_explicit_and_version_falls_through():
    mapper = get_https_mapper("1.4")
    assert "parse_config" in type(mapper).__dict__
    assert mapper.version == "1.4"
    assert get_https_mapper("1.5").version == "1.5"


def test_version_keys_come_from_mapper():
    parsed_14 = get_https_mapper("1.4").parse_config(_tree())
    parsed_15 = get_https_mapper("1.5").parse_config(_tree())
    assert type(parsed_14) is dict
    assert parsed_14["listen_addresses"] == ["10.0.0.1", "10.0.0.2"]
    assert parsed_14["allow_client_addresses"] == ["192.0.2.1", "192.0.2.2"]
    assert parsed_14["port"] == 0
    assert parsed_14["request_body_size_limit"] is None
    assert parsed_14["tls_versions"] == ["1.3"]
    assert parsed_14["vrf"] == "mgmt"
    assert parsed_14["enable_http_redirect"] is True
    assert parsed_14["certificates"]["certificate"] == "srv"
    assert parsed_14["certificates"]["ca_certificate"] == "ca1"
    assert parsed_14["certificates"]["dh_params"] is None
    assert parsed_14["api"]["keys"] == [
        {"id": "alpha", "key": ""},
        {"id": "zeta", "key": "z-secret"},
    ]
    assert parsed_14["api"]["graphql"]["enabled"] is True
    assert parsed_14["api"]["graphql"]["introspection"] is True
    assert parsed_14["api"]["graphql"]["authentication"] == {
        "auth_type": "key",
        "expiration": 3600,
        "secret_length": None,
    }
    assert parsed_14["api"]["graphql"]["cors_allow_origins"] == ["https://old.example"]
    assert parsed_14["api"]["rest"] == {
        "enabled": True,
        "debug": True,
        "strict": False,
    }
    assert parsed_15["api"]["graphql"]["cors_allow_origins"] == [
        "https://a.example",
        "https://b.example",
    ]
    assert parsed_15["api"]["rest"] == {
        "enabled": True,
        "debug": False,
        "strict": True,
    }
    assert parsed_15["listen_addresses"] == parsed_14["listen_addresses"]


def test_1_5_missing_rest_node_is_disabled():
    tree = {"service": {"https": {"api": {"graphql": {"introspection": {}}}}}}
    parsed_15 = get_https_mapper("1.5").parse_config(tree)
    parsed_14 = get_https_mapper("1.4").parse_config(tree)
    assert parsed_15["api"]["rest"] == {
        "enabled": False,
        "debug": False,
        "strict": False,
    }
    assert parsed_15["api"]["graphql"]["introspection"] is True
    assert parsed_14["api"]["rest"]["enabled"] is False
    assert parsed_14["api"]["graphql"]["cors_allow_origins"] == []


def test_1_5_empty_rest_node_is_enabled():
    tree = {"service": {"https": {"api": {"rest": {}}}}}
    parsed = get_https_mapper("1.5").parse_config(tree)
    assert parsed["api"]["rest"] == {
        "enabled": True,
        "debug": False,
        "strict": False,
    }


def test_1_4_keeps_api_cors_without_graphql():
    tree = {
        "service": {
            "https": {"api": {"cors": {"allow-origin": "https://x.example"}}}
        }
    }
    parsed = get_https_mapper("1.4").parse_config(tree)
    assert parsed["api"]["graphql"]["enabled"] is False
    assert parsed["api"]["graphql"]["cors_allow_origins"] == ["https://x.example"]
    assert parsed["api"]["rest"]["enabled"] is False


def test_1_5_does_not_read_api_level_cors():
    tree = {
        "service": {
            "https": {"api": {"cors": {"allow-origin": "https://x.example"}}}
        }
    }
    parsed = get_https_mapper("1.5").parse_config(tree)
    assert parsed["api"]["graphql"]["enabled"] is False
    assert parsed["api"]["graphql"]["cors_allow_origins"] == []
    assert parsed["api"]["rest"]["enabled"] is False


def test_1_5_keys_do_not_enable_rest():
    tree = {
        "service": {
            "https": {"api": {"keys": {"id": {"k": {"key": "secret"}}}}}
        }
    }
    parsed = get_https_mapper("1.5").parse_config(tree)
    assert parsed["api"]["keys"] == [{"id": "k", "key": "secret"}]
    assert parsed["api"]["rest"]["enabled"] is False


def test_1_4_keys_enable_classic_api():
    tree = {
        "service": {
            "https": {"api": {"keys": {"id": {"k": {"key": "secret"}}}}}
        }
    }
    parsed = get_https_mapper("1.4").parse_config(tree)
    assert parsed["api"]["rest"] == {
        "enabled": True,
        "debug": False,
        "strict": False,
    }


def test_1_4_strict_without_keys_does_not_enable_rest():
    tree = {"service": {"https": {"api": {"strict": {}}}}}
    parsed = get_https_mapper("1.4").parse_config(tree)
    assert parsed["api"]["rest"] == {
        "enabled": False,
        "debug": False,
        "strict": True,
    }
    assert parsed["api"]["keys"] == []


def test_empty_tree():
    assert get_https_mapper("1.4").parse_config({}) == _empty()
    assert get_https_mapper("1.5").parse_config({"service": {}}) == _empty()
    assert get_https_mapper("1.5").parse_config({"service": {"https": {}}}) == _empty()



def test_get_config_returns_mapper_parse(monkeypatch):
    tree = _tree()
    expected = get_https_mapper("1.4").parse_config(tree)

    async def allow(*_args, **_kwargs):
        return None

    class FakeService:
        def get_version(self):
            return "1.4"

        def get_full_config(self, refresh=False):
            return tree

    monkeypatch.setattr("routers.https.https.require_read_permission", allow)
    monkeypatch.setattr(
        "routers.https.https.get_session_vyos_service",
        lambda _req: FakeService(),
    )

    from fastapi import FastAPI
    from fastapi.testclient import TestClient
    from routers.https.https import router

    app = FastAPI()
    app.include_router(router)
    client = TestClient(app)
    response = client.get("/vyos/https/config")
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["port"] == expected["port"] == 0
    assert body["vrf"] == "mgmt"
    assert body["certificates"]["ca_certificate"] == "ca1"
    assert body["api"]["keys"][0] == {"id": "alpha", "key": ""}
    assert body["api"]["graphql"]["cors_allow_origins"] == ["https://old.example"]
    assert body["api"]["rest"]["debug"] is True
    assert body["api"]["rest"]["strict"] is False
    assert body["api"]["graphql"]["authentication"]["expiration"] == 3600
