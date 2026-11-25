"""
PKI (Public Key Infrastructure) command mapper.

One class holds the ``pki`` commands both VyOS versions have. The only
difference is ``pki certificate <n> acme listen-address``: 1.4 takes an IPv4
address, 1.5 also takes IPv6. ``pki_versions.v1_5.PKIMapperV1_5`` reports
that through ``acme_listen_address_ipv6``.
"""

from typing import Any, Dict, List, Optional, Tuple

from ..base import BaseFeatureMapper

# Lab `allowed:` lines, the same on 1.4 and 1.5.
ACME_RSA_KEY_SIZES = ("2048", "3072", "4096")
OPENSSH_PUBLIC_TYPES = ("ssh-rsa",)


class PKIMapper(BaseFeatureMapper):
    """Shared mapper with every PKI path."""

    # ========================================================================
    # Base path
    # ========================================================================

    def get_base_path(self) -> List[str]:
        return ["pki"]

    # ========================================================================
    # Certificate Authority (CA)
    # ========================================================================

    def get_ca_path(self, name: str) -> List[str]:
        return ["pki", "ca", name]

    def get_ca_delete_path(self, name: str) -> List[str]:
        return ["pki", "ca", name]

    def get_ca_certificate_path(self, name: str, cert: str) -> List[str]:
        return ["pki", "ca", name, "certificate", cert]

    def get_ca_certificate_delete_path(self, name: str) -> List[str]:
        return ["pki", "ca", name, "certificate"]

    def get_ca_crl_path(self, name: str, crl: str) -> List[str]:
        return ["pki", "ca", name, "crl", crl]

    def get_ca_crl_delete_path(self, name: str, crl: str) -> List[str]:
        return ["pki", "ca", name, "crl", crl]

    def get_ca_crl_delete_all_path(self, name: str) -> List[str]:
        return ["pki", "ca", name, "crl"]

    def get_ca_description_path(self, name: str, description: str) -> List[str]:
        return ["pki", "ca", name, "description", description]

    def get_ca_description_delete_path(self, name: str) -> List[str]:
        return ["pki", "ca", name, "description"]

    def get_ca_private_key_path(self, name: str, key: str) -> List[str]:
        return ["pki", "ca", name, "private", "key", key]

    def get_ca_private_key_delete_path(self, name: str) -> List[str]:
        return ["pki", "ca", name, "private", "key"]

    def get_ca_private_password_protected_path(self, name: str) -> List[str]:
        return ["pki", "ca", name, "private", "password-protected"]

    def get_ca_revoke_path(self, name: str) -> List[str]:
        return ["pki", "ca", name, "revoke"]

    def get_ca_system_install_path(self, name: str) -> List[str]:
        return ["pki", "ca", name, "system-install"]

    # ========================================================================
    # Certificate
    # ========================================================================

    def get_certificate_path(self, name: str) -> List[str]:
        return ["pki", "certificate", name]

    def get_certificate_delete_path(self, name: str) -> List[str]:
        return ["pki", "certificate", name]

    def get_certificate_cert_path(self, name: str, cert: str) -> List[str]:
        return ["pki", "certificate", name, "certificate", cert]

    def get_certificate_cert_delete_path(self, name: str) -> List[str]:
        return ["pki", "certificate", name, "certificate"]

    def get_certificate_description_path(self, name: str, description: str) -> List[str]:
        return ["pki", "certificate", name, "description", description]

    def get_certificate_description_delete_path(self, name: str) -> List[str]:
        return ["pki", "certificate", name, "description"]

    def get_certificate_private_key_path(self, name: str, key: str) -> List[str]:
        return ["pki", "certificate", name, "private", "key", key]

    def get_certificate_private_key_delete_path(self, name: str) -> List[str]:
        return ["pki", "certificate", name, "private", "key"]

    def get_certificate_private_password_protected_path(self, name: str) -> List[str]:
        return ["pki", "certificate", name, "private", "password-protected"]

    def get_certificate_revoke_path(self, name: str) -> List[str]:
        return ["pki", "certificate", name, "revoke"]

    # ACME
    def get_certificate_acme_path(self, name: str) -> List[str]:
        return ["pki", "certificate", name, "acme"]

    def get_certificate_acme_domain_name_path(self, name: str, domain: str) -> List[str]:
        return ["pki", "certificate", name, "acme", "domain-name", domain]

    def get_certificate_acme_domain_name_delete_path(self, name: str, domain: str) -> List[str]:
        return ["pki", "certificate", name, "acme", "domain-name", domain]

    def get_certificate_acme_domain_name_delete_all_path(self, name: str) -> List[str]:
        return ["pki", "certificate", name, "acme", "domain-name"]

    def get_certificate_acme_email_path(self, name: str, email: str) -> List[str]:
        return ["pki", "certificate", name, "acme", "email", email]

    def get_certificate_acme_email_delete_path(self, name: str) -> List[str]:
        return ["pki", "certificate", name, "acme", "email"]

    def get_certificate_acme_listen_address_path(self, name: str, address: str) -> List[str]:
        return ["pki", "certificate", name, "acme", "listen-address", address]

    def get_certificate_acme_listen_address_delete_path(self, name: str) -> List[str]:
        return ["pki", "certificate", name, "acme", "listen-address"]

    def get_certificate_acme_rsa_key_size_path(self, name: str, size: str) -> List[str]:
        return ["pki", "certificate", name, "acme", "rsa-key-size", size]

    def get_certificate_acme_rsa_key_size_delete_path(self, name: str) -> List[str]:
        return ["pki", "certificate", name, "acme", "rsa-key-size"]

    def get_certificate_acme_url_path(self, name: str, url: str) -> List[str]:
        return ["pki", "certificate", name, "acme", "url", url]

    def get_certificate_acme_url_delete_path(self, name: str) -> List[str]:
        return ["pki", "certificate", name, "acme", "url"]

    def get_certificate_acme_delete_path(self, name: str) -> List[str]:
        return ["pki", "certificate", name, "acme"]

    # ========================================================================
    # Diffie-Hellman (DH)
    # ========================================================================

    def get_dh_path(self, name: str) -> List[str]:
        return ["pki", "dh", name]

    def get_dh_delete_path(self, name: str) -> List[str]:
        return ["pki", "dh", name]

    def get_dh_parameters_path(self, name: str, parameters: str) -> List[str]:
        return ["pki", "dh", name, "parameters", parameters]

    def get_dh_parameters_delete_path(self, name: str) -> List[str]:
        return ["pki", "dh", name, "parameters"]

    # ========================================================================
    # Key Pair
    # ========================================================================

    def get_key_pair_path(self, name: str) -> List[str]:
        return ["pki", "key-pair", name]

    def get_key_pair_delete_path(self, name: str) -> List[str]:
        return ["pki", "key-pair", name]

    def get_key_pair_private_key_path(self, name: str, key: str) -> List[str]:
        return ["pki", "key-pair", name, "private", "key", key]

    def get_key_pair_private_key_delete_path(self, name: str) -> List[str]:
        return ["pki", "key-pair", name, "private", "key"]

    def get_key_pair_private_password_protected_path(self, name: str) -> List[str]:
        return ["pki", "key-pair", name, "private", "password-protected"]

    def get_key_pair_public_key_path(self, name: str, key: str) -> List[str]:
        return ["pki", "key-pair", name, "public", "key", key]

    def get_key_pair_public_key_delete_path(self, name: str) -> List[str]:
        return ["pki", "key-pair", name, "public", "key"]

    # ========================================================================
    # OpenSSH
    # ========================================================================

    def get_openssh_path(self, name: str) -> List[str]:
        return ["pki", "openssh", name]

    def get_openssh_delete_path(self, name: str) -> List[str]:
        return ["pki", "openssh", name]

    def get_openssh_private_key_path(self, name: str, key: str) -> List[str]:
        return ["pki", "openssh", name, "private", "key", key]

    def get_openssh_private_key_delete_path(self, name: str) -> List[str]:
        return ["pki", "openssh", name, "private", "key"]

    def get_openssh_private_password_protected_path(self, name: str) -> List[str]:
        return ["pki", "openssh", name, "private", "password-protected"]

    def get_openssh_public_key_path(self, name: str, key: str) -> List[str]:
        return ["pki", "openssh", name, "public", "key", key]

    def get_openssh_public_key_delete_path(self, name: str) -> List[str]:
        return ["pki", "openssh", name, "public", "key"]

    def get_openssh_public_type_path(self, name: str, key_type: str) -> List[str]:
        return ["pki", "openssh", name, "public", "type", key_type]

    def get_openssh_public_type_delete_path(self, name: str) -> List[str]:
        return ["pki", "openssh", name, "public", "type"]

    # ========================================================================
    # OpenVPN Shared Secret
    # ========================================================================

    def get_openvpn_shared_secret_path(self, name: str) -> List[str]:
        return ["pki", "openvpn", "shared-secret", name]

    def get_openvpn_shared_secret_delete_path(self, name: str) -> List[str]:
        return ["pki", "openvpn", "shared-secret", name]

    def get_openvpn_shared_secret_key_path(self, name: str, key: str) -> List[str]:
        return ["pki", "openvpn", "shared-secret", name, "key", key]

    def get_openvpn_shared_secret_key_delete_path(self, name: str) -> List[str]:
        return ["pki", "openvpn", "shared-secret", name, "key"]

    def get_openvpn_shared_secret_version_path(self, name: str, version: str) -> List[str]:
        return ["pki", "openvpn", "shared-secret", name, "version", version]

    def get_openvpn_shared_secret_version_delete_path(self, name: str) -> List[str]:
        return ["pki", "openvpn", "shared-secret", name, "version"]

    # ========================================================================
    # X509 Defaults
    # ========================================================================

    def get_x509_default_country_path(self, country: str) -> List[str]:
        return ["pki", "x509", "default", "country", country]

    def get_x509_default_country_delete_path(self) -> List[str]:
        return ["pki", "x509", "default", "country"]

    def get_x509_default_locality_path(self, locality: str) -> List[str]:
        return ["pki", "x509", "default", "locality", locality]

    def get_x509_default_locality_delete_path(self) -> List[str]:
        return ["pki", "x509", "default", "locality"]

    def get_x509_default_organization_path(self, organization: str) -> List[str]:
        return ["pki", "x509", "default", "organization", organization]

    def get_x509_default_organization_delete_path(self) -> List[str]:
        return ["pki", "x509", "default", "organization"]

    def get_x509_default_state_path(self, state: str) -> List[str]:
        return ["pki", "x509", "default", "state", state]

    def get_x509_default_state_delete_path(self) -> List[str]:
        return ["pki", "x509", "default", "state"]

    def get_x509_default_delete_path(self) -> List[str]:
        return ["pki", "x509", "default"]

    # ========================================================================
    # Delete all PKI
    # ========================================================================

    def get_delete_all_path(self) -> List[str]:
        return ["pki"]

    # ========================================================================
    # Version differences and value lists
    # ========================================================================

    def acme_listen_address_ipv6(self) -> bool:
        """Whether ``acme listen-address`` takes an IPv6 address (1.5 only)."""
        return False

    def rsa_key_size_values(self) -> Tuple[str, ...]:
        return ACME_RSA_KEY_SIZES

    def openssh_public_type_values(self) -> Tuple[str, ...]:
        return OPENSSH_PUBLIC_TYPES

    # ========================================================================
    # Config Parsing
    # ========================================================================

    def parse_config(self, full_config: Dict[str, Any]) -> Dict[str, Any]:
        """GET /config shape: lists of items with secrets masked, plus totals."""
        from .config_parse import parse_config as parse_pki_config

        return parse_pki_config(self, full_config)

    def reveal_kinds(self) -> Dict[str, Tuple[str, ...]]:
        """Item kinds /reveal accepts, each with the fields it may return."""
        from .config_parse import REVEAL_FIELDS

        return REVEAL_FIELDS

    def raw_item(self, full_config: Dict[str, Any], kind: str, name: str) -> Optional[Dict[str, Any]]:
        """One parsed item with secrets unmasked, or None when it is absent."""
        from .config_parse import raw_item

        return raw_item(self, full_config, kind, name)
