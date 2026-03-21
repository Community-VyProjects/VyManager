"""
PKI (Public Key Infrastructure) Command Mapper

Handles command path generation and config parsing for PKI.
The PKI command tree is nearly identical between VyOS 1.4 and 1.5.
Only difference: VyOS 1.5 ACME listen-address supports IPv6.
"""

from typing import List, Dict, Any, Optional


class PKIMapper:
    """Base mapper with all PKI operations."""

    def __init__(self, version: str):
        self.version = version

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
    # Config Parsing
    # ========================================================================

    def parse_config(self, full_config: Dict[str, Any]) -> Dict[str, Any]:
        """Parse full VyOS config and extract PKI configuration."""
        pki_config = full_config.get("pki", {})

        if not pki_config:
            return {
                "configured": False,
                "ca": {},
                "certificates": {},
                "dh": {},
                "key_pairs": {},
                "openssh": {},
                "openvpn_shared_secrets": {},
                "x509_defaults": {},
            }

        return {
            "configured": True,
            "ca": self._parse_ca(pki_config.get("ca", {})),
            "certificates": self._parse_certificates(pki_config.get("certificate", {})),
            "dh": self._parse_dh(pki_config.get("dh", {})),
            "key_pairs": self._parse_key_pairs(pki_config.get("key-pair", {})),
            "openssh": self._parse_openssh(pki_config.get("openssh", {})),
            "openvpn_shared_secrets": self._parse_openvpn(pki_config.get("openvpn", {}).get("shared-secret", {})),
            "x509_defaults": self._parse_x509_defaults(pki_config.get("x509", {}).get("default", {})),
        }

    def _parse_ca(self, ca_config: Dict[str, Any]) -> Dict[str, Any]:
        """Parse CA entries."""
        result = {}
        for name, data in ca_config.items():
            if not isinstance(data, dict):
                continue
            private = data.get("private", {})
            crl_data = data.get("crl", {})
            # CRL is multi-value - can be a list or a single string
            if isinstance(crl_data, str):
                crl_list = [crl_data]
            elif isinstance(crl_data, list):
                crl_list = crl_data
            elif isinstance(crl_data, dict):
                crl_list = list(crl_data.keys()) if crl_data else []
            else:
                crl_list = []

            result[name] = {
                "name": name,
                "certificate": data.get("certificate"),
                "crl": crl_list,
                "description": data.get("description"),
                "private_key": private.get("key") if isinstance(private, dict) else None,
                "password_protected": "password-protected" in private if isinstance(private, dict) else False,
                "revoke": "revoke" in data,
                "system_install": "system-install" in data,
            }
        return result

    def _parse_certificates(self, cert_config: Dict[str, Any]) -> Dict[str, Any]:
        """Parse certificate entries."""
        result = {}
        for name, data in cert_config.items():
            if not isinstance(data, dict):
                continue
            private = data.get("private", {})
            acme = data.get("acme", {})

            # ACME domain-name is multi-value
            acme_domains = acme.get("domain-name", []) if isinstance(acme, dict) else []
            if isinstance(acme_domains, str):
                acme_domains = [acme_domains]

            acme_config = None
            if isinstance(acme, dict) and acme:
                acme_config = {
                    "domain_names": acme_domains,
                    "email": acme.get("email"),
                    "listen_address": acme.get("listen-address"),
                    "rsa_key_size": acme.get("rsa-key-size"),
                    "url": acme.get("url"),
                }

            result[name] = {
                "name": name,
                "certificate": data.get("certificate"),
                "description": data.get("description"),
                "private_key": private.get("key") if isinstance(private, dict) else None,
                "password_protected": "password-protected" in private if isinstance(private, dict) else False,
                "revoke": "revoke" in data,
                "acme": acme_config,
            }
        return result

    def _parse_dh(self, dh_config: Dict[str, Any]) -> Dict[str, Any]:
        """Parse DH parameter entries."""
        result = {}
        for name, data in dh_config.items():
            if not isinstance(data, dict):
                continue
            result[name] = {
                "name": name,
                "parameters": data.get("parameters"),
            }
        return result

    def _parse_key_pairs(self, kp_config: Dict[str, Any]) -> Dict[str, Any]:
        """Parse key pair entries."""
        result = {}
        for name, data in kp_config.items():
            if not isinstance(data, dict):
                continue
            private = data.get("private", {})
            public = data.get("public", {})
            result[name] = {
                "name": name,
                "private_key": private.get("key") if isinstance(private, dict) else None,
                "password_protected": "password-protected" in private if isinstance(private, dict) else False,
                "public_key": public.get("key") if isinstance(public, dict) else None,
            }
        return result

    def _parse_openssh(self, openssh_config: Dict[str, Any]) -> Dict[str, Any]:
        """Parse OpenSSH key entries."""
        result = {}
        for name, data in openssh_config.items():
            if not isinstance(data, dict):
                continue
            private = data.get("private", {})
            public = data.get("public", {})
            result[name] = {
                "name": name,
                "private_key": private.get("key") if isinstance(private, dict) else None,
                "password_protected": "password-protected" in private if isinstance(private, dict) else False,
                "public_key": public.get("key") if isinstance(public, dict) else None,
                "public_type": public.get("type") if isinstance(public, dict) else None,
            }
        return result

    def _parse_openvpn(self, openvpn_config: Dict[str, Any]) -> Dict[str, Any]:
        """Parse OpenVPN shared secret entries."""
        result = {}
        for name, data in openvpn_config.items():
            if not isinstance(data, dict):
                continue
            result[name] = {
                "name": name,
                "key": data.get("key"),
                "version": data.get("version"),
            }
        return result

    def _parse_x509_defaults(self, x509_config: Dict[str, Any]) -> Dict[str, Any]:
        """Parse X509 default values."""
        if not x509_config:
            return {}
        return {
            "country": x509_config.get("country"),
            "locality": x509_config.get("locality"),
            "organization": x509_config.get("organization"),
            "state": x509_config.get("state"),
        }
