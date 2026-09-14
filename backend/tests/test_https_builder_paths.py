"""Golden (method, args, op, expected_path) cases for HTTPSBatchBuilder.

Paths checked with validateTmplPath on 1.4 (100.64.64.50) and 1.5 (100.64.64.5).
Generated for issue #719; edit the tables directly if the mapper changes.
"""

import pytest

from vyos_builders.https.https_batch_builder import HTTPSBatchBuilder


def _run(version, method, args, op, expected_path):
    builder = HTTPSBatchBuilder(version=version)
    getattr(builder, method)(*args)
    operations = builder.get_operations()
    assert [(item["op"], item["path"]) for item in operations] == [(op, expected_path)]

COMMON_CASES = [
    ('delete_allow_client_address', ('192.0.2.1',), 'delete', ['service', 'https', 'allow-client', 'address', '192.0.2.1']),
    ('delete_allow_client_addresses', (), 'delete', ['service', 'https', 'allow-client', 'address']),
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
    ('set_api_graphql_auth_type', ('plaintext',), 'set', ['service', 'https', 'api', 'graphql', 'authentication', 'type', 'plaintext']),
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
