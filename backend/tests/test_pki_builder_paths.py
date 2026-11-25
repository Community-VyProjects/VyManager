"""Golden (method, args, op, expected_path) cases for PKIBatchBuilder.

Every leaf exists on both labs (1.4 and 1.5), so every row runs on both
versions. ``acme listen-address`` takes IPv6 only on 1.5; ``rsa-key-size``
and the OpenSSH public ``type`` take the lab ``allowed:`` values only.
"""

import inspect

import pytest

from vyos_builders.pki.pki_batch_builder import PKIBatchBuilder

VERSIONS = ["1.4.3", "2026.09.23-0027-rolling"]

CASES = [
    ('create_ca', ('CA1',), 'set', ['pki', 'ca', 'CA1']),
    ('create_certificate', ('CERT1',), 'set', ['pki', 'certificate', 'CERT1']),
    ('create_dh', ('DH1',), 'set', ['pki', 'dh', 'DH1']),
    ('create_key_pair', ('KP1',), 'set', ['pki', 'key-pair', 'KP1']),
    ('create_openssh', ('SSH1',), 'set', ['pki', 'openssh', 'SSH1']),
    ('create_openvpn_shared_secret', ('OVPN1',), 'set', ['pki', 'openvpn', 'shared-secret', 'OVPN1']),
    ('delete_ca', ('CA1',), 'delete', ['pki', 'ca', 'CA1']),
    ('delete_ca_certificate', ('CA1',), 'delete', ['pki', 'ca', 'CA1', 'certificate']),
    ('delete_ca_crl', ('CA1', 'MIIBLDCB1gIBATANBgkqhkiG9w0BAQsFADA'), 'delete', ['pki', 'ca', 'CA1', 'crl', 'MIIBLDCB1gIBATANBgkqhkiG9w0BAQsFADA']),
    ('delete_ca_crl_all', ('CA1',), 'delete', ['pki', 'ca', 'CA1', 'crl']),
    ('delete_ca_description', ('CA1',), 'delete', ['pki', 'ca', 'CA1', 'description']),
    ('delete_ca_private_key', ('CA1',), 'delete', ['pki', 'ca', 'CA1', 'private', 'key']),
    ('delete_ca_private_password_protected', ('CA1',), 'delete', ['pki', 'ca', 'CA1', 'private', 'password-protected']),
    ('delete_ca_revoke', ('CA1',), 'delete', ['pki', 'ca', 'CA1', 'revoke']),
    ('delete_ca_system_install', ('CA1',), 'delete', ['pki', 'ca', 'CA1', 'system-install']),
    ('delete_certificate', ('CERT1',), 'delete', ['pki', 'certificate', 'CERT1']),
    ('delete_certificate_acme', ('CERT1',), 'delete', ['pki', 'certificate', 'CERT1', 'acme']),
    ('delete_certificate_acme_domain_name', ('CERT1', 'vpn.example.com'), 'delete', ['pki', 'certificate', 'CERT1', 'acme', 'domain-name', 'vpn.example.com']),
    ('delete_certificate_acme_domain_name_all', ('CERT1',), 'delete', ['pki', 'certificate', 'CERT1', 'acme', 'domain-name']),
    ('delete_certificate_acme_email', ('CERT1',), 'delete', ['pki', 'certificate', 'CERT1', 'acme', 'email']),
    ('delete_certificate_acme_listen_address', ('CERT1',), 'delete', ['pki', 'certificate', 'CERT1', 'acme', 'listen-address']),
    ('delete_certificate_acme_rsa_key_size', ('CERT1',), 'delete', ['pki', 'certificate', 'CERT1', 'acme', 'rsa-key-size']),
    ('delete_certificate_acme_url', ('CERT1',), 'delete', ['pki', 'certificate', 'CERT1', 'acme', 'url']),
    ('delete_certificate_cert', ('CERT1',), 'delete', ['pki', 'certificate', 'CERT1', 'certificate']),
    ('delete_certificate_description', ('CERT1',), 'delete', ['pki', 'certificate', 'CERT1', 'description']),
    ('delete_certificate_private_key', ('CERT1',), 'delete', ['pki', 'certificate', 'CERT1', 'private', 'key']),
    ('delete_certificate_private_password_protected', ('CERT1',), 'delete', ['pki', 'certificate', 'CERT1', 'private', 'password-protected']),
    ('delete_certificate_revoke', ('CERT1',), 'delete', ['pki', 'certificate', 'CERT1', 'revoke']),
    ('delete_dh', ('DH1',), 'delete', ['pki', 'dh', 'DH1']),
    ('delete_dh_parameters', ('DH1',), 'delete', ['pki', 'dh', 'DH1', 'parameters']),
    ('delete_key_pair', ('KP1',), 'delete', ['pki', 'key-pair', 'KP1']),
    ('delete_key_pair_private_key', ('KP1',), 'delete', ['pki', 'key-pair', 'KP1', 'private', 'key']),
    ('delete_key_pair_private_password_protected', ('KP1',), 'delete', ['pki', 'key-pair', 'KP1', 'private', 'password-protected']),
    ('delete_key_pair_public_key', ('KP1',), 'delete', ['pki', 'key-pair', 'KP1', 'public', 'key']),
    ('delete_openssh', ('SSH1',), 'delete', ['pki', 'openssh', 'SSH1']),
    ('delete_openssh_private_key', ('SSH1',), 'delete', ['pki', 'openssh', 'SSH1', 'private', 'key']),
    ('delete_openssh_private_password_protected', ('SSH1',), 'delete', ['pki', 'openssh', 'SSH1', 'private', 'password-protected']),
    ('delete_openssh_public_key', ('SSH1',), 'delete', ['pki', 'openssh', 'SSH1', 'public', 'key']),
    ('delete_openssh_public_type', ('SSH1',), 'delete', ['pki', 'openssh', 'SSH1', 'public', 'type']),
    ('delete_openvpn_shared_secret', ('OVPN1',), 'delete', ['pki', 'openvpn', 'shared-secret', 'OVPN1']),
    ('delete_openvpn_shared_secret_key', ('OVPN1',), 'delete', ['pki', 'openvpn', 'shared-secret', 'OVPN1', 'key']),
    ('delete_openvpn_shared_secret_version', ('OVPN1',), 'delete', ['pki', 'openvpn', 'shared-secret', 'OVPN1', 'version']),
    ('delete_pki', (), 'delete', ['pki']),
    ('delete_x509_default_country', (), 'delete', ['pki', 'x509', 'default', 'country']),
    ('delete_x509_default_locality', (), 'delete', ['pki', 'x509', 'default', 'locality']),
    ('delete_x509_default_organization', (), 'delete', ['pki', 'x509', 'default', 'organization']),
    ('delete_x509_default_state', (), 'delete', ['pki', 'x509', 'default', 'state']),
    ('delete_x509_defaults', (), 'delete', ['pki', 'x509', 'default']),
    ('set_ca_certificate', ('CA1', 'MIIBkTCCATegAwIBAgIUQ'), 'set', ['pki', 'ca', 'CA1', 'certificate', 'MIIBkTCCATegAwIBAgIUQ']),
    ('set_ca_crl', ('CA1', 'MIIBLDCB1gIBATANBgkqhkiG9w0BAQsFADA'), 'set', ['pki', 'ca', 'CA1', 'crl', 'MIIBLDCB1gIBATANBgkqhkiG9w0BAQsFADA']),
    ('set_ca_description', ('CA1', 'lab-root'), 'set', ['pki', 'ca', 'CA1', 'description', 'lab-root']),
    ('set_ca_private_key', ('CA1', 'MIIEvQIBADANBgkqhkiG9w0BAQEFAASC'), 'set', ['pki', 'ca', 'CA1', 'private', 'key', 'MIIEvQIBADANBgkqhkiG9w0BAQEFAASC']),
    ('set_ca_private_password_protected', ('CA1',), 'set', ['pki', 'ca', 'CA1', 'private', 'password-protected']),
    ('set_ca_revoke', ('CA1',), 'set', ['pki', 'ca', 'CA1', 'revoke']),
    ('set_ca_system_install', ('CA1',), 'set', ['pki', 'ca', 'CA1', 'system-install']),
    ('set_certificate_acme', ('CERT1',), 'set', ['pki', 'certificate', 'CERT1', 'acme']),
    ('set_certificate_acme_domain_name', ('CERT1', 'vpn.example.com'), 'set', ['pki', 'certificate', 'CERT1', 'acme', 'domain-name', 'vpn.example.com']),
    ('set_certificate_acme_email', ('CERT1', 'admin@example.com'), 'set', ['pki', 'certificate', 'CERT1', 'acme', 'email', 'admin@example.com']),
    ('set_certificate_acme_listen_address', ('CERT1', '192.0.2.1'), 'set', ['pki', 'certificate', 'CERT1', 'acme', 'listen-address', '192.0.2.1']),
    ('set_certificate_acme_rsa_key_size', ('CERT1', '2048'), 'set', ['pki', 'certificate', 'CERT1', 'acme', 'rsa-key-size', '2048']),
    ('set_certificate_acme_url', ('CERT1', 'https://acme.example.com/dir'), 'set', ['pki', 'certificate', 'CERT1', 'acme', 'url', 'https://acme.example.com/dir']),
    ('set_certificate_cert', ('CERT1', 'MIIBkTCCATegAwIBAgIUQ'), 'set', ['pki', 'certificate', 'CERT1', 'certificate', 'MIIBkTCCATegAwIBAgIUQ']),
    ('set_certificate_description', ('CERT1', 'lab-root'), 'set', ['pki', 'certificate', 'CERT1', 'description', 'lab-root']),
    ('set_certificate_private_key', ('CERT1', 'MIIEvQIBADANBgkqhkiG9w0BAQEFAASC'), 'set', ['pki', 'certificate', 'CERT1', 'private', 'key', 'MIIEvQIBADANBgkqhkiG9w0BAQEFAASC']),
    ('set_certificate_private_password_protected', ('CERT1',), 'set', ['pki', 'certificate', 'CERT1', 'private', 'password-protected']),
    ('set_certificate_revoke', ('CERT1',), 'set', ['pki', 'certificate', 'CERT1', 'revoke']),
    ('set_dh_parameters', ('DH1', 'MIIBCAKCAQEA'), 'set', ['pki', 'dh', 'DH1', 'parameters', 'MIIBCAKCAQEA']),
    ('set_key_pair_private_key', ('KP1', 'MIIEvQIBADANBgkqhkiG9w0BAQEFAASC'), 'set', ['pki', 'key-pair', 'KP1', 'private', 'key', 'MIIEvQIBADANBgkqhkiG9w0BAQEFAASC']),
    ('set_key_pair_private_password_protected', ('KP1',), 'set', ['pki', 'key-pair', 'KP1', 'private', 'password-protected']),
    ('set_key_pair_public_key', ('KP1', 'MIIEvQIBADANBgkqhkiG9w0BAQEFAASC'), 'set', ['pki', 'key-pair', 'KP1', 'public', 'key', 'MIIEvQIBADANBgkqhkiG9w0BAQEFAASC']),
    ('set_openssh_private_key', ('SSH1', 'MIIEvQIBADANBgkqhkiG9w0BAQEFAASC'), 'set', ['pki', 'openssh', 'SSH1', 'private', 'key', 'MIIEvQIBADANBgkqhkiG9w0BAQEFAASC']),
    ('set_openssh_private_password_protected', ('SSH1',), 'set', ['pki', 'openssh', 'SSH1', 'private', 'password-protected']),
    ('set_openssh_public_key', ('SSH1', 'MIIEvQIBADANBgkqhkiG9w0BAQEFAASC'), 'set', ['pki', 'openssh', 'SSH1', 'public', 'key', 'MIIEvQIBADANBgkqhkiG9w0BAQEFAASC']),
    ('set_openssh_public_type', ('SSH1', 'ssh-rsa'), 'set', ['pki', 'openssh', 'SSH1', 'public', 'type', 'ssh-rsa']),
    ('set_openvpn_shared_secret_key', ('OVPN1', 'MIIEvQIBADANBgkqhkiG9w0BAQEFAASC'), 'set', ['pki', 'openvpn', 'shared-secret', 'OVPN1', 'key', 'MIIEvQIBADANBgkqhkiG9w0BAQEFAASC']),
    ('set_openvpn_shared_secret_version', ('OVPN1', '1'), 'set', ['pki', 'openvpn', 'shared-secret', 'OVPN1', 'version', '1']),
    ('set_x509_default_country', ('US',), 'set', ['pki', 'x509', 'default', 'country', 'US']),
    ('set_x509_default_locality', ('Austin',), 'set', ['pki', 'x509', 'default', 'locality', 'Austin']),
    ('set_x509_default_organization', ('Example',), 'set', ['pki', 'x509', 'default', 'organization', 'Example']),
    ('set_x509_default_state', ('TX',), 'set', ['pki', 'x509', 'default', 'state', 'TX']),
]


def _run(version, method, args):
    builder = PKIBatchBuilder(version)
    getattr(builder, method)(*args)
    (operation,) = builder.get_operations()
    return operation


@pytest.mark.parametrize("version", VERSIONS)
@pytest.mark.parametrize("method,args,op,path", CASES, ids=[row[0] for row in CASES])
def test_paths(version, method, args, op, path):
    result = _run(version, method, args)
    assert (result["op"], result["path"]) == (op, path)


def test_every_builder_op_has_a_golden_row():
    covered = {row[0] for row in CASES}
    ops = {
        name
        for name, _ in inspect.getmembers(PKIBatchBuilder("1.5"), inspect.ismethod)
        if name.startswith(("set_", "delete_", "create_"))
    }
    assert ops == covered


def test_item_ops_take_name_first_and_global_ops_take_no_name():
    """The batch router binds item_name to a first parameter called ``name``."""
    for name, method in inspect.getmembers(PKIBatchBuilder("1.5"), inspect.ismethod):
        if not name.startswith(("set_", "delete_", "create_")):
            continue
        params = list(inspect.signature(method).parameters)
        if name.startswith(("set_x509", "delete_x509", "delete_pki")):
            assert "name" not in params, name
            assert len(params) <= 1, name
        else:
            assert params[0] == "name", name
            assert len(params) in (1, 2), name


def test_ipv6_listen_address_only_on_1_5():
    path = ["pki", "certificate", "CERT1", "acme", "listen-address", "2001:db8::1"]
    result = _run("2026.09.23-0027-rolling", "set_certificate_acme_listen_address", ("CERT1", "2001:db8::1"))
    assert (result["op"], result["path"]) == ("set", path)
    with pytest.raises(ValueError):
        PKIBatchBuilder("1.4.3").set_certificate_acme_listen_address("CERT1", "2001:db8::1")


@pytest.mark.parametrize("version", VERSIONS)
@pytest.mark.parametrize(
    "method,args",
    [
        ("set_certificate_acme_rsa_key_size", ("CERT1", "1024")),
        ("set_openssh_public_type", ("SSH1", "ssh-ed25519")),
    ],
)
def test_value_outside_the_lab_list_is_value_error(version, method, args):
    with pytest.raises(ValueError):
        getattr(PKIBatchBuilder(version), method)(*args)


def test_unused_plumbing_is_gone():
    assert "clear" not in PKIBatchBuilder.__dict__
    assert "operation_count" not in PKIBatchBuilder.__dict__
