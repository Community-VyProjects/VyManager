"""HTTPS Service Command Mapper."""
from typing import List
from ..base import BaseFeatureMapper

BASE = ["service", "https"]


class HTTPSMapper(BaseFeatureMapper):
    def __init__(self, version: str):
        super().__init__(version)

    # ========================================================================
    # Global delete
    # ========================================================================

    def get_https_delete(self) -> List[str]:
        return BASE

    # ========================================================================
    # Listen address (multi-value)
    # ========================================================================

    def get_listen_address(self, addr: str) -> List[str]:
        return BASE + ["listen-address", addr]

    def get_listen_address_delete(self, addr: str) -> List[str]:
        return BASE + ["listen-address", addr]

    def get_listen_addresses_delete(self) -> List[str]:
        return BASE + ["listen-address"]

    # ========================================================================
    # Allow-client addresses (multi-value)
    # ========================================================================

    def get_allow_client_address(self, addr: str) -> List[str]:
        return BASE + ["allow-client", "address", addr]

    def get_allow_client_address_delete(self, addr: str) -> List[str]:
        return BASE + ["allow-client", "address", addr]

    def get_allow_client_addresses_delete(self) -> List[str]:
        return BASE + ["allow-client", "address"]

    # ========================================================================
    # Port
    # ========================================================================

    def get_port(self, value: str) -> List[str]:
        return BASE + ["port", value]

    def get_port_delete(self) -> List[str]:
        return BASE + ["port"]

    # ========================================================================
    # Request body size limit
    # ========================================================================

    def get_request_body_size_limit(self, value: str) -> List[str]:
        return BASE + ["request-body-size-limit", value]

    def get_request_body_size_limit_delete(self) -> List[str]:
        return BASE + ["request-body-size-limit"]

    # ========================================================================
    # TLS version (multi-value)
    # ========================================================================

    def get_tls_version(self, version: str) -> List[str]:
        return BASE + ["tls-version", version]

    def get_tls_version_delete(self, version: str) -> List[str]:
        return BASE + ["tls-version", version]

    def get_tls_versions_delete(self) -> List[str]:
        return BASE + ["tls-version"]

    # ========================================================================
    # VRF
    # ========================================================================

    def get_vrf(self, name: str) -> List[str]:
        return BASE + ["vrf", name]

    def get_vrf_delete(self) -> List[str]:
        return BASE + ["vrf"]

    # ========================================================================
    # HTTP redirect (presence flag)
    # ========================================================================

    def get_enable_http_redirect(self) -> List[str]:
        return BASE + ["enable-http-redirect"]

    # ========================================================================
    # Certificates
    # ========================================================================

    def get_certificates_certificate(self, cert: str) -> List[str]:
        return BASE + ["certificates", "certificate", cert]

    def get_certificates_certificate_delete(self) -> List[str]:
        return BASE + ["certificates", "certificate"]

    def get_certificates_ca_certificate(self, cert: str) -> List[str]:
        return BASE + ["certificates", "ca-certificate", cert]

    def get_certificates_ca_certificate_delete(self) -> List[str]:
        return BASE + ["certificates", "ca-certificate"]

    def get_certificates_dh_params(self, params: str) -> List[str]:
        return BASE + ["certificates", "dh-params", params]

    def get_certificates_dh_params_delete(self) -> List[str]:
        return BASE + ["certificates", "dh-params"]

    # ========================================================================
    # API keys (tagged by id)
    # ========================================================================

    def get_api_key(self, key_id: str, key: str) -> List[str]:
        return BASE + ["api", "keys", "id", key_id, "key", key]

    def get_api_key_delete(self, key_id: str) -> List[str]:
        return BASE + ["api", "keys", "id", key_id]

    def get_api_keys_delete(self) -> List[str]:
        return BASE + ["api", "keys", "id"]

    # ========================================================================
    # GraphQL authentication (shared across versions)
    # ========================================================================

    def get_api_graphql_auth_expiration(self, value: str) -> List[str]:
        return BASE + ["api", "graphql", "authentication", "expiration", value]

    def get_api_graphql_auth_expiration_delete(self) -> List[str]:
        return BASE + ["api", "graphql", "authentication", "expiration"]

    def get_api_graphql_auth_secret_length(self, value: str) -> List[str]:
        return BASE + ["api", "graphql", "authentication", "secret-length", value]

    def get_api_graphql_auth_secret_length_delete(self) -> List[str]:
        return BASE + ["api", "graphql", "authentication", "secret-length"]

    def get_api_graphql_auth_type(self, auth_type: str) -> List[str]:
        return BASE + ["api", "graphql", "authentication", "type", auth_type]

    def get_api_graphql_auth_type_delete(self) -> List[str]:
        return BASE + ["api", "graphql", "authentication", "type"]

    def get_api_graphql_introspection(self) -> List[str]:
        return BASE + ["api", "graphql", "introspection"]

    # ========================================================================
    # Debug / Strict — 1.5 default: under api/rest
    # (v1_4 overrides place these directly under api)
    # ========================================================================

    def get_api_debug(self) -> List[str]:
        return BASE + ["api", "rest", "debug"]

    def get_api_strict(self) -> List[str]:
        return BASE + ["api", "rest", "strict"]

    def get_api_rest(self) -> List[str]:
        return BASE + ["api", "rest"]

    # ========================================================================
    # CORS allow-origin — 1.5 default: under api/graphql/cors
    # (v1_4 overrides place these under api/cors)
    # ========================================================================

    def get_api_cors_allow_origin(self, origin: str) -> List[str]:
        return BASE + ["api", "graphql", "cors", "allow-origin", origin]

    def get_api_cors_allow_origin_delete(self, origin: str) -> List[str]:
        return BASE + ["api", "graphql", "cors", "allow-origin", origin]

    def get_api_cors_allow_origins_delete(self) -> List[str]:
        return BASE + ["api", "graphql", "cors", "allow-origin"]
