"""Golden (method, args, op, expected_path) cases for HTTPSBatchBuilder.

Paths checked with validateTmplPath on 1.4 (100.64.64.4) and 1.5 (100.64.64.5).
Generated for issue #719; edit the tables directly if the mapper changes.
"""

import inspect

import pytest

from vyos_builders.https.https_batch_builder import HTTPSBatchBuilder
from vyos_mappers import CommandMapperRegistry
from vyos_mappers.https import HTTPSMapper
from vyos_mappers.https.https_versions.v1_5 import HTTPSMapperV1_5


def _run(version, method, args, op, expected_path):
    builder = HTTPSBatchBuilder(version=version)
    getattr(builder, method)(*args)
    operations = builder.get_operations()
    assert [(item["op"], item["path"]) for item in operations] == [(op, expected_path)]

COMMON_CASES = [
    ('delete_allow_client_address', ('192.0.2.1',), 'delete', ['service', 'https', 'allow-client', 'address', '192.0.2.1']),
    ('delete_allow_client_addresses', (), 'delete', ['service', 'https', 'allow-client', 'address']),
    ('delete_api', (), 'delete', ['service', 'https', 'api']),
    ('delete_api_graphql', (), 'delete', ['service', 'https', 'api', 'graphql']),
    ('set_api_graphql', (), 'set', ['service', 'https', 'api', 'graphql']),
    ('delete_api_graphql_auth_expiration', (), 'delete', ['service', 'https', 'api', 'graphql', 'authentication', 'expiration']),
    ('delete_api_graphql_auth_secret_length', (), 'delete', ['service', 'https', 'api', 'graphql', 'authentication', 'secret-length']),
    ('delete_api_graphql_auth_type', (), 'delete', ['service', 'https', 'api', 'graphql', 'authentication', 'type']),
    ('delete_api_graphql_introspection', (), 'delete', ['service', 'https', 'api', 'graphql', 'introspection']),
    ('delete_api_key', ('G0',), 'delete', ['service', 'https', 'api', 'keys', 'id', 'G0']),
    ('delete_api_keys', (), 'delete', ['service', 'https', 'api', 'keys', 'id']),
    ('delete_certificates_ca_certificate', (), 'delete', ['service', 'https', 'certificates', 'ca-certificate']),
    ('delete_certificates_certificate', (), 'delete', ['service', 'https', 'certificates', 'certificate']),
    ('delete_certificates_dh_params', (), 'delete', ['service', 'https', 'certificates', 'dh-params']),
    ('delete_enable_http_redirect', (), 'delete', ['service', 'https', 'enable-http-redirect']),
    ('delete_https', (), 'delete', ['service', 'https']),
    ('delete_listen_address', ('192.0.2.1',), 'delete', ['service', 'https', 'listen-address', '192.0.2.1']),
    ('delete_listen_addresses', (), 'delete', ['service', 'https', 'listen-address']),
    ('delete_port', (), 'delete', ['service', 'https', 'port']),
    ('delete_request_body_size_limit', (), 'delete', ['service', 'https', 'request-body-size-limit']),
    ('delete_tls_version', ('1.2',), 'delete', ['service', 'https', 'tls-version', '1.2']),
    ('delete_tls_versions', (), 'delete', ['service', 'https', 'tls-version']),
    ('delete_vrf', (), 'delete', ['service', 'https', 'vrf']),
    ('set_allow_client_address', ('192.0.2.1',), 'set', ['service', 'https', 'allow-client', 'address', '192.0.2.1']),
    ('set_api_graphql_auth_expiration', ('5',), 'set', ['service', 'https', 'api', 'graphql', 'authentication', 'expiration', '5']),
    ('set_api_graphql_auth_secret_length', ('5',), 'set', ['service', 'https', 'api', 'graphql', 'authentication', 'secret-length', '5']),
    ('set_api_graphql_auth_type', ('token',), 'set', ['service', 'https', 'api', 'graphql', 'authentication', 'type', 'token']),
    ('set_api_graphql_introspection', (), 'set', ['service', 'https', 'api', 'graphql', 'introspection']),
    ('set_api_key', ('G0', 'secret'), 'set', ['service', 'https', 'api', 'keys', 'id', 'G0', 'key', 'secret']),
    ('set_certificates_ca_certificate', ('G0',), 'set', ['service', 'https', 'certificates', 'ca-certificate', 'G0']),
    ('set_certificates_certificate', ('G0',), 'set', ['service', 'https', 'certificates', 'certificate', 'G0']),
    ('set_certificates_dh_params', ('G0',), 'set', ['service', 'https', 'certificates', 'dh-params', 'G0']),
    ('set_enable_http_redirect', (), 'set', ['service', 'https', 'enable-http-redirect']),
    ('set_listen_address', ('192.0.2.1',), 'set', ['service', 'https', 'listen-address', '192.0.2.1']),
    ('set_port', ('5',), 'set', ['service', 'https', 'port', '5']),
    ('set_request_body_size_limit', ('5',), 'set', ['service', 'https', 'request-body-size-limit', '5']),
    ('set_tls_version', ('1.2',), 'set', ['service', 'https', 'tls-version', '1.2']),
    ('set_vrf', ('G0',), 'set', ['service', 'https', 'vrf', 'G0']),
]


@pytest.mark.parametrize("method, args, op, expected_path", COMMON_CASES)
@pytest.mark.parametrize("version", ["1.4", "1.5"])
def test_https_common_paths(method, args, op, expected_path, version):
    _run(version, method, args, op, expected_path)

V15_ONLY_CASES = [
    ('delete_api_cors_allow_origin', ('https://example.com',), 'delete', ['service', 'https', 'api', 'graphql', 'cors', 'allow-origin', 'https://example.com']),
    ('delete_api_cors_allow_origins', (), 'delete', ['service', 'https', 'api', 'graphql', 'cors', 'allow-origin']),
    ('delete_api_debug', (), 'delete', ['service', 'https', 'api', 'rest', 'debug']),
    ('delete_api_rest', (), 'delete', ['service', 'https', 'api', 'rest']),
    ('delete_api_strict', (), 'delete', ['service', 'https', 'api', 'rest', 'strict']),
    ('set_api_cors_allow_origin', ('https://example.com',), 'set', ['service', 'https', 'api', 'graphql', 'cors', 'allow-origin', 'https://example.com']),
    ('set_api_debug', (), 'set', ['service', 'https', 'api', 'rest', 'debug']),
    ('set_api_rest', (), 'set', ['service', 'https', 'api', 'rest']),
    ('set_api_strict', (), 'set', ['service', 'https', 'api', 'rest', 'strict']),
]


@pytest.mark.parametrize("method, args, op, expected_path", V15_ONLY_CASES)
def test_https_v1_5_only_paths(method, args, op, expected_path):
    _run("1.5", method, args, op, expected_path)

V14_ONLY_CASES = [
    ('delete_api_cors_allow_origin', ('https://example.com',), 'delete', ['service', 'https', 'api', 'cors', 'allow-origin', 'https://example.com']),
    ('delete_api_cors_allow_origins', (), 'delete', ['service', 'https', 'api', 'cors', 'allow-origin']),
    ('delete_api_debug', (), 'delete', ['service', 'https', 'api', 'debug']),
    ('delete_api_strict', (), 'delete', ['service', 'https', 'api', 'strict']),
    ('set_api_cors_allow_origin', ('https://example.com',), 'set', ['service', 'https', 'api', 'cors', 'allow-origin', 'https://example.com']),
    ('set_api_debug', (), 'set', ['service', 'https', 'api', 'debug']),
    ('set_api_strict', (), 'set', ['service', 'https', 'api', 'strict']),
]


@pytest.mark.parametrize("method, args, op, expected_path", V14_ONLY_CASES)
def test_https_v1_4_only_paths(method, args, op, expected_path):
    _run("1.4", method, args, op, expected_path)


@pytest.mark.parametrize("method", ["set_api_rest", "delete_api_rest"])
def test_https_api_rest_is_rejected_on_1_4(method):
    builder = HTTPSBatchBuilder("1.4")
    with pytest.raises(ValueError, match="api rest is not supported on this device"):
        getattr(builder, method)()
    assert builder.get_operations() == []


def test_every_builder_op_has_a_golden_row():
    covered = {row[0] for row in COMMON_CASES + V15_ONLY_CASES + V14_ONLY_CASES}
    ops = {
        name
        for name, _ in inspect.getmembers(HTTPSBatchBuilder, inspect.isfunction)
        if name.startswith(("set_", "delete_", "create_"))
    }
    assert ops - covered == set()


@pytest.mark.parametrize("version", ["1.4.3", "2026.09.23-0027-rolling", "1.5"])
def test_factory_picks_the_subclass_unless_1_4(version):
    mapper = CommandMapperRegistry.get_mapper("https", version)
    assert isinstance(mapper, HTTPSMapper)
    assert isinstance(mapper, HTTPSMapperV1_5) is ("1.4" not in version)


def test_https_capability_flags_follow_the_mapper(monkeypatch):
    caps_14 = HTTPSBatchBuilder("1.4").get_capabilities()
    caps_15 = HTTPSBatchBuilder("1.5").get_capabilities()
    assert "version_info" not in caps_14
    assert "version_info" not in caps_15
    assert caps_14["features"]["api_rest"]["supported"] is False
    assert caps_15["features"]["api_rest"]["supported"] is True
    assert caps_14["features"]["api_cors"]["cors_scope"] == "api"
    assert caps_15["features"]["api_cors"]["cors_scope"] == "graphql"
    for caps in (caps_14, caps_15):
        assert caps["features"]["tls_version"]["options"] == ["1.2", "1.3"]
        assert caps["features"]["tls_version"]["defaults"] == ["1.2", "1.3"]
        assert caps["features"]["api_graphql_auth"]["auth_types"] == ["key", "token"]

    # The flags come from the mapper, not from the version string.
    monkeypatch.setattr(HTTPSMapper, "_VERSIONED_NODES", {})
    monkeypatch.setattr(HTTPSMapper, "_TLS_VERSIONS", ("1.3",))
    caps = HTTPSBatchBuilder("1.5").get_capabilities()["features"]
    assert caps["api_rest"]["supported"] is False
    assert caps["tls_version"]["options"] == ["1.3"]

