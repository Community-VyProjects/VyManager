"""
PKI (Public Key Infrastructure) Batch Builder

Provides all batch operations for PKI configuration including:
- Certificate Authorities (CA)
- Certificates (including ACME)
- Diffie-Hellman parameters
- Key Pairs
- OpenSSH keys
- OpenVPN shared secrets
- X509 defaults
"""

from typing import List, Dict, Any
from vyos_mappers import CommandMapperRegistry


class PKIBatchBuilder:
    """Complete batch builder for PKI operations."""

    def __init__(self, version: str):
        self.version = version
        self._operations: List[Dict[str, Any]] = []
        self.mappers = CommandMapperRegistry.get_all_mappers(version)
        self.mapper_key = "pki"

    # ========================================================================
    # Core Batch Operations
    # ========================================================================

    def add_set(self, path: List[str]) -> "PKIBatchBuilder":
        if path:
            self._operations.append({"op": "set", "path": path})
        return self

    def add_delete(self, path: List[str]) -> "PKIBatchBuilder":
        if path:
            self._operations.append({"op": "delete", "path": path})
        return self

    def clear(self) -> None:
        self._operations = []

    def get_operations(self) -> List[Dict[str, Any]]:
        return self._operations.copy()

    def operation_count(self) -> int:
        return len(self._operations)

    def is_empty(self) -> bool:
        return len(self._operations) == 0

    # ========================================================================
    # Certificate Authority (CA)
    # ========================================================================

    def create_ca(self, name: str) -> "PKIBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_ca_path(name))

    def delete_ca(self, name: str) -> "PKIBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_ca_delete_path(name))

    def set_ca_certificate(self, name: str, cert: str) -> "PKIBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_ca_certificate_path(name, cert))

    def delete_ca_certificate(self, name: str) -> "PKIBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_ca_certificate_delete_path(name))

    def set_ca_crl(self, name: str, crl: str) -> "PKIBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_ca_crl_path(name, crl))

    def delete_ca_crl(self, name: str, crl: str) -> "PKIBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_ca_crl_delete_path(name, crl))

    def delete_ca_crl_all(self, name: str) -> "PKIBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_ca_crl_delete_all_path(name))

    def set_ca_description(self, name: str, description: str) -> "PKIBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_ca_description_path(name, description))

    def delete_ca_description(self, name: str) -> "PKIBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_ca_description_delete_path(name))

    def set_ca_private_key(self, name: str, key: str) -> "PKIBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_ca_private_key_path(name, key))

    def delete_ca_private_key(self, name: str) -> "PKIBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_ca_private_key_delete_path(name))

    def set_ca_private_password_protected(self, name: str) -> "PKIBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_ca_private_password_protected_path(name))

    def delete_ca_private_password_protected(self, name: str) -> "PKIBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_ca_private_password_protected_path(name))

    def set_ca_revoke(self, name: str) -> "PKIBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_ca_revoke_path(name))

    def delete_ca_revoke(self, name: str) -> "PKIBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_ca_revoke_path(name))

    def set_ca_system_install(self, name: str) -> "PKIBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_ca_system_install_path(name))

    def delete_ca_system_install(self, name: str) -> "PKIBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_ca_system_install_path(name))

    # ========================================================================
    # Certificate
    # ========================================================================

    def create_certificate(self, name: str) -> "PKIBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_certificate_path(name))

    def delete_certificate(self, name: str) -> "PKIBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_certificate_delete_path(name))

    def set_certificate_cert(self, name: str, cert: str) -> "PKIBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_certificate_cert_path(name, cert))

    def delete_certificate_cert(self, name: str) -> "PKIBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_certificate_cert_delete_path(name))

    def set_certificate_description(self, name: str, description: str) -> "PKIBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_certificate_description_path(name, description))

    def delete_certificate_description(self, name: str) -> "PKIBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_certificate_description_delete_path(name))

    def set_certificate_private_key(self, name: str, key: str) -> "PKIBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_certificate_private_key_path(name, key))

    def delete_certificate_private_key(self, name: str) -> "PKIBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_certificate_private_key_delete_path(name))

    def set_certificate_private_password_protected(self, name: str) -> "PKIBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_certificate_private_password_protected_path(name))

    def delete_certificate_private_password_protected(self, name: str) -> "PKIBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_certificate_private_password_protected_path(name))

    def set_certificate_revoke(self, name: str) -> "PKIBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_certificate_revoke_path(name))

    def delete_certificate_revoke(self, name: str) -> "PKIBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_certificate_revoke_path(name))

    # ACME
    def set_certificate_acme(self, name: str) -> "PKIBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_certificate_acme_path(name))

    def delete_certificate_acme(self, name: str) -> "PKIBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_certificate_acme_delete_path(name))

    def set_certificate_acme_domain_name(self, name: str, domain: str) -> "PKIBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_certificate_acme_domain_name_path(name, domain))

    def delete_certificate_acme_domain_name(self, name: str, domain: str) -> "PKIBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_certificate_acme_domain_name_delete_path(name, domain))

    def delete_certificate_acme_domain_name_all(self, name: str) -> "PKIBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_certificate_acme_domain_name_delete_all_path(name))

    def set_certificate_acme_email(self, name: str, email: str) -> "PKIBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_certificate_acme_email_path(name, email))

    def delete_certificate_acme_email(self, name: str) -> "PKIBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_certificate_acme_email_delete_path(name))

    def set_certificate_acme_listen_address(self, name: str, address: str) -> "PKIBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_certificate_acme_listen_address_path(name, address))

    def delete_certificate_acme_listen_address(self, name: str) -> "PKIBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_certificate_acme_listen_address_delete_path(name))

    def set_certificate_acme_rsa_key_size(self, name: str, size: str) -> "PKIBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_certificate_acme_rsa_key_size_path(name, size))

    def delete_certificate_acme_rsa_key_size(self, name: str) -> "PKIBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_certificate_acme_rsa_key_size_delete_path(name))

    def set_certificate_acme_url(self, name: str, url: str) -> "PKIBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_certificate_acme_url_path(name, url))

    def delete_certificate_acme_url(self, name: str) -> "PKIBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_certificate_acme_url_delete_path(name))

    # ========================================================================
    # Diffie-Hellman (DH)
    # ========================================================================

    def create_dh(self, name: str) -> "PKIBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_dh_path(name))

    def delete_dh(self, name: str) -> "PKIBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_dh_delete_path(name))

    def set_dh_parameters(self, name: str, parameters: str) -> "PKIBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_dh_parameters_path(name, parameters))

    def delete_dh_parameters(self, name: str) -> "PKIBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_dh_parameters_delete_path(name))

    # ========================================================================
    # Key Pair
    # ========================================================================

    def create_key_pair(self, name: str) -> "PKIBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_key_pair_path(name))

    def delete_key_pair(self, name: str) -> "PKIBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_key_pair_delete_path(name))

    def set_key_pair_private_key(self, name: str, key: str) -> "PKIBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_key_pair_private_key_path(name, key))

    def delete_key_pair_private_key(self, name: str) -> "PKIBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_key_pair_private_key_delete_path(name))

    def set_key_pair_private_password_protected(self, name: str) -> "PKIBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_key_pair_private_password_protected_path(name))

    def delete_key_pair_private_password_protected(self, name: str) -> "PKIBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_key_pair_private_password_protected_path(name))

    def set_key_pair_public_key(self, name: str, key: str) -> "PKIBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_key_pair_public_key_path(name, key))

    def delete_key_pair_public_key(self, name: str) -> "PKIBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_key_pair_public_key_delete_path(name))

    # ========================================================================
    # OpenSSH
    # ========================================================================

    def create_openssh(self, name: str) -> "PKIBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_openssh_path(name))

    def delete_openssh(self, name: str) -> "PKIBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_openssh_delete_path(name))

    def set_openssh_private_key(self, name: str, key: str) -> "PKIBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_openssh_private_key_path(name, key))

    def delete_openssh_private_key(self, name: str) -> "PKIBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_openssh_private_key_delete_path(name))

    def set_openssh_private_password_protected(self, name: str) -> "PKIBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_openssh_private_password_protected_path(name))

    def delete_openssh_private_password_protected(self, name: str) -> "PKIBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_openssh_private_password_protected_path(name))

    def set_openssh_public_key(self, name: str, key: str) -> "PKIBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_openssh_public_key_path(name, key))

    def delete_openssh_public_key(self, name: str) -> "PKIBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_openssh_public_key_delete_path(name))

    def set_openssh_public_type(self, name: str, key_type: str) -> "PKIBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_openssh_public_type_path(name, key_type))

    def delete_openssh_public_type(self, name: str) -> "PKIBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_openssh_public_type_delete_path(name))

    # ========================================================================
    # OpenVPN Shared Secret
    # ========================================================================

    def create_openvpn_shared_secret(self, name: str) -> "PKIBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_openvpn_shared_secret_path(name))

    def delete_openvpn_shared_secret(self, name: str) -> "PKIBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_openvpn_shared_secret_delete_path(name))

    def set_openvpn_shared_secret_key(self, name: str, key: str) -> "PKIBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_openvpn_shared_secret_key_path(name, key))

    def delete_openvpn_shared_secret_key(self, name: str) -> "PKIBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_openvpn_shared_secret_key_delete_path(name))

    def set_openvpn_shared_secret_version(self, name: str, version: str) -> "PKIBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_openvpn_shared_secret_version_path(name, version))

    def delete_openvpn_shared_secret_version(self, name: str) -> "PKIBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_openvpn_shared_secret_version_delete_path(name))

    # ========================================================================
    # X509 Defaults
    # ========================================================================

    def set_x509_default_country(self, _unused: str, country: str) -> "PKIBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_x509_default_country_path(country))

    def delete_x509_default_country(self, _unused: str) -> "PKIBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_x509_default_country_delete_path())

    def set_x509_default_locality(self, _unused: str, locality: str) -> "PKIBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_x509_default_locality_path(locality))

    def delete_x509_default_locality(self, _unused: str) -> "PKIBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_x509_default_locality_delete_path())

    def set_x509_default_organization(self, _unused: str, organization: str) -> "PKIBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_x509_default_organization_path(organization))

    def delete_x509_default_organization(self, _unused: str) -> "PKIBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_x509_default_organization_delete_path())

    def set_x509_default_state(self, _unused: str, state: str) -> "PKIBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_x509_default_state_path(state))

    def delete_x509_default_state(self, _unused: str) -> "PKIBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_x509_default_state_delete_path())

    def delete_x509_defaults(self, _unused: str) -> "PKIBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_x509_default_delete_path())

    # ========================================================================
    # Delete entire PKI
    # ========================================================================

    def delete_pki(self, _unused: str) -> "PKIBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_delete_all_path())

    # ========================================================================
    # Capabilities
    # ========================================================================

    def get_capabilities(self) -> Dict[str, Any]:
        is_v14 = "1.4" in self.version
        is_v15 = "1.5" in self.version or "latest" in self.version

        return {
            "version": self.version,
            "version_info": {
                "is_1_4": is_v14,
                "is_1_5": is_v15,
            },
            "features": {
                "ca": {
                    "supported": True,
                    "description": "Certificate Authority management",
                    "settings": ["certificate", "crl", "description", "private_key",
                                 "password_protected", "revoke", "system_install"],
                },
                "certificate": {
                    "supported": True,
                    "description": "Certificate management",
                    "settings": ["certificate", "description", "private_key",
                                 "password_protected", "revoke"],
                },
                "acme": {
                    "supported": True,
                    "description": "ACME certificate management (Let's Encrypt)",
                    "settings": ["domain_name", "email", "listen_address",
                                 "rsa_key_size", "url"],
                    "rsa_key_sizes": ["2048", "3072", "4096"],
                    "listen_address_ipv6": is_v15,
                },
                "dh": {
                    "supported": True,
                    "description": "Diffie-Hellman parameters",
                },
                "key_pair": {
                    "supported": True,
                    "description": "Public and private key pairs",
                    "settings": ["private_key", "password_protected", "public_key"],
                },
                "openssh": {
                    "supported": True,
                    "description": "OpenSSH key management",
                    "settings": ["private_key", "password_protected", "public_key", "public_type"],
                    "public_types": ["ssh-rsa"],
                },
                "openvpn_shared_secret": {
                    "supported": True,
                    "description": "OpenVPN shared secret keys",
                    "settings": ["key", "version"],
                },
                "x509_defaults": {
                    "supported": True,
                    "description": "X509 default values for certificate generation",
                    "settings": ["country", "locality", "organization", "state"],
                },
            },
        }
