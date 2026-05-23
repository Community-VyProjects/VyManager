"""HTTPS Service Batch Builder.

Generates VyOS set/delete operations for the HTTPS management service.

Configuration lives under: service https

Key sections:
  - Global: listen-address, allow-client, port, tls-version, vrf, enable-http-redirect
  - Certificates: certificate, ca-certificate, dh-params (reference PKI names)
  - API keys: tagged by id with a plaintext key value
  - GraphQL: authentication (expiration, secret-length, type), introspection, CORS
  - REST API: debug, strict (path differs between 1.4 and 1.5)

Version differences:
  - 1.4: api/debug, api/strict, api/cors/allow-origin
  - 1.5: api/rest/debug, api/rest/strict, api/graphql/cors/allow-origin
"""

from typing import List, Dict, Any
from vyos_mappers import CommandMapperRegistry


class HTTPSBatchBuilder:
    def __init__(self, version: str):
        self.version = version
        self._operations: List[Dict[str, Any]] = []
        self.mappers = CommandMapperRegistry.get_all_mappers(version)
        self.m = self.mappers["https"]

    # -----------------------------------------------------------------------
    # Core helpers
    # -----------------------------------------------------------------------

    def add_set(self, path: List[str]) -> "HTTPSBatchBuilder":
        if path:
            self._operations.append({"op": "set", "path": path})
        return self

    def add_delete(self, path: List[str]) -> "HTTPSBatchBuilder":
        if path:
            self._operations.append({"op": "delete", "path": path})
        return self

    def get_operations(self) -> List[Dict[str, Any]]:
        return self._operations.copy()

    def is_empty(self) -> bool:
        return len(self._operations) == 0

    # -----------------------------------------------------------------------
    # Capabilities
    # -----------------------------------------------------------------------

    def get_capabilities(self) -> Dict[str, Any]:
        is_1_4 = "1.4" in self.version
        is_1_5 = not is_1_4

        return {
            "version": self.version,
            "features": {
                "listen_address": {
                    "supported": True,
                    "description": "Local IP addresses to listen on (multi-value)",
                },
                "allow_client": {
                    "supported": True,
                    "description": "Allowed client IP addresses or subnets (multi-value)",
                },
                "port": {
                    "supported": True,
                    "description": "HTTPS listening port (default: 443)",
                    "default": 443,
                    "min": 1,
                    "max": 65535,
                },
                "request_body_size_limit": {
                    "supported": True,
                    "description": "Maximum request body size in megabytes (default: 1)",
                    "default": 1,
                    "min": 1,
                    "max": 256,
                },
                "tls_version": {
                    "supported": True,
                    "description": "Allowed TLS versions (multi-value, default: 1.2 and 1.3)",
                    "options": ["1.2", "1.3"],
                },
                "vrf": {
                    "supported": True,
                    "description": "VRF instance name to bind the service to",
                },
                "enable_http_redirect": {
                    "supported": True,
                    "description": "Redirect HTTP requests to HTTPS (presence flag)",
                },
                "certificates": {
                    "supported": True,
                    "description": "PKI-referenced TLS certificates and CA",
                },
                "api_keys": {
                    "supported": True,
                    "description": "Plaintext API keys (tagged by id)",
                },
                "api_graphql": {
                    "supported": True,
                    "description": "GraphQL API endpoint",
                },
                "api_graphql_auth": {
                    "supported": True,
                    "description": "GraphQL authentication (key or JWT token)",
                    "auth_types": ["key", "token"],
                    "token_expiration_min": 60,
                    "token_expiration_max": 31536000,
                    "secret_length_min": 16,
                    "secret_length_max": 65535,
                },
                "api_graphql_introspection": {
                    "supported": True,
                    "description": "Enable GraphQL schema introspection (presence flag)",
                },
                "api_cors": {
                    "supported": True,
                    "description": "CORS allow-origin list",
                    "cors_scope": "graphql" if is_1_5 else "api",
                },
                "api_rest": {
                    "supported": True,
                    "description": "REST API endpoint",
                },
                "api_debug": {
                    "supported": True,
                    "description": "Enable API debug logging (presence flag)",
                },
                "api_strict": {
                    "supported": True,
                    "description": "Enforce strict URI path checking (presence flag)",
                },
            },
            "version_info": {
                "is_1_4": is_1_4,
                "is_1_5": is_1_5,
            },
        }

    # -----------------------------------------------------------------------
    # Global delete
    # -----------------------------------------------------------------------

    def delete_https(self) -> "HTTPSBatchBuilder":
        return self.add_delete(self.m.get_https_delete())

    # -----------------------------------------------------------------------
    # Listen address
    # -----------------------------------------------------------------------

    def set_listen_address(self, addr: str) -> "HTTPSBatchBuilder":
        return self.add_set(self.m.get_listen_address(addr))

    def delete_listen_address(self, addr: str) -> "HTTPSBatchBuilder":
        return self.add_delete(self.m.get_listen_address_delete(addr))

    def delete_listen_addresses(self) -> "HTTPSBatchBuilder":
        return self.add_delete(self.m.get_listen_addresses_delete())

    # -----------------------------------------------------------------------
    # Allow-client addresses
    # -----------------------------------------------------------------------

    def set_allow_client_address(self, addr: str) -> "HTTPSBatchBuilder":
        return self.add_set(self.m.get_allow_client_address(addr))

    def delete_allow_client_address(self, addr: str) -> "HTTPSBatchBuilder":
        return self.add_delete(self.m.get_allow_client_address_delete(addr))

    def delete_allow_client_addresses(self) -> "HTTPSBatchBuilder":
        return self.add_delete(self.m.get_allow_client_addresses_delete())

    # -----------------------------------------------------------------------
    # Port
    # -----------------------------------------------------------------------

    def set_port(self, value: str) -> "HTTPSBatchBuilder":
        return self.add_set(self.m.get_port(value))

    def delete_port(self) -> "HTTPSBatchBuilder":
        return self.add_delete(self.m.get_port_delete())

    # -----------------------------------------------------------------------
    # Request body size limit
    # -----------------------------------------------------------------------

    def set_request_body_size_limit(self, value: str) -> "HTTPSBatchBuilder":
        return self.add_set(self.m.get_request_body_size_limit(value))

    def delete_request_body_size_limit(self) -> "HTTPSBatchBuilder":
        return self.add_delete(self.m.get_request_body_size_limit_delete())

    # -----------------------------------------------------------------------
    # TLS version
    # -----------------------------------------------------------------------

    def set_tls_version(self, version: str) -> "HTTPSBatchBuilder":
        return self.add_set(self.m.get_tls_version(version))

    def delete_tls_version(self, version: str) -> "HTTPSBatchBuilder":
        return self.add_delete(self.m.get_tls_version_delete(version))

    def delete_tls_versions(self) -> "HTTPSBatchBuilder":
        return self.add_delete(self.m.get_tls_versions_delete())

    # -----------------------------------------------------------------------
    # VRF
    # -----------------------------------------------------------------------

    def set_vrf(self, name: str) -> "HTTPSBatchBuilder":
        return self.add_set(self.m.get_vrf(name))

    def delete_vrf(self) -> "HTTPSBatchBuilder":
        return self.add_delete(self.m.get_vrf_delete())

    # -----------------------------------------------------------------------
    # HTTP redirect
    # -----------------------------------------------------------------------

    def set_enable_http_redirect(self) -> "HTTPSBatchBuilder":
        return self.add_set(self.m.get_enable_http_redirect())

    def delete_enable_http_redirect(self) -> "HTTPSBatchBuilder":
        return self.add_delete(self.m.get_enable_http_redirect())

    # -----------------------------------------------------------------------
    # Certificates
    # -----------------------------------------------------------------------

    def set_certificates_certificate(self, cert: str) -> "HTTPSBatchBuilder":
        return self.add_set(self.m.get_certificates_certificate(cert))

    def delete_certificates_certificate(self) -> "HTTPSBatchBuilder":
        return self.add_delete(self.m.get_certificates_certificate_delete())

    def set_certificates_ca_certificate(self, cert: str) -> "HTTPSBatchBuilder":
        return self.add_set(self.m.get_certificates_ca_certificate(cert))

    def delete_certificates_ca_certificate(self) -> "HTTPSBatchBuilder":
        return self.add_delete(self.m.get_certificates_ca_certificate_delete())

    def set_certificates_dh_params(self, params: str) -> "HTTPSBatchBuilder":
        return self.add_set(self.m.get_certificates_dh_params(params))

    def delete_certificates_dh_params(self) -> "HTTPSBatchBuilder":
        return self.add_delete(self.m.get_certificates_dh_params_delete())

    # -----------------------------------------------------------------------
    # API keys
    # -----------------------------------------------------------------------

    def set_api_key(self, key_id: str, key: str) -> "HTTPSBatchBuilder":
        return self.add_set(self.m.get_api_key(key_id, key))

    def delete_api_key(self, key_id: str) -> "HTTPSBatchBuilder":
        return self.add_delete(self.m.get_api_key_delete(key_id))

    def delete_api_keys(self) -> "HTTPSBatchBuilder":
        return self.add_delete(self.m.get_api_keys_delete())

    # -----------------------------------------------------------------------
    # GraphQL authentication
    # -----------------------------------------------------------------------

    def set_api_graphql_auth_expiration(self, value: str) -> "HTTPSBatchBuilder":
        return self.add_set(self.m.get_api_graphql_auth_expiration(value))

    def delete_api_graphql_auth_expiration(self) -> "HTTPSBatchBuilder":
        return self.add_delete(self.m.get_api_graphql_auth_expiration_delete())

    def set_api_graphql_auth_secret_length(self, value: str) -> "HTTPSBatchBuilder":
        return self.add_set(self.m.get_api_graphql_auth_secret_length(value))

    def delete_api_graphql_auth_secret_length(self) -> "HTTPSBatchBuilder":
        return self.add_delete(self.m.get_api_graphql_auth_secret_length_delete())

    def set_api_graphql_auth_type(self, auth_type: str) -> "HTTPSBatchBuilder":
        return self.add_set(self.m.get_api_graphql_auth_type(auth_type))

    def delete_api_graphql_auth_type(self) -> "HTTPSBatchBuilder":
        return self.add_delete(self.m.get_api_graphql_auth_type_delete())

    def set_api_graphql_introspection(self) -> "HTTPSBatchBuilder":
        return self.add_set(self.m.get_api_graphql_introspection())

    def delete_api_graphql_introspection(self) -> "HTTPSBatchBuilder":
        return self.add_delete(self.m.get_api_graphql_introspection())

    # -----------------------------------------------------------------------
    # CORS (path differs between 1.4 and 1.5 via mapper)
    # -----------------------------------------------------------------------

    def set_api_cors_allow_origin(self, origin: str) -> "HTTPSBatchBuilder":
        return self.add_set(self.m.get_api_cors_allow_origin(origin))

    def delete_api_cors_allow_origin(self, origin: str) -> "HTTPSBatchBuilder":
        return self.add_delete(self.m.get_api_cors_allow_origin_delete(origin))

    def delete_api_cors_allow_origins(self) -> "HTTPSBatchBuilder":
        return self.add_delete(self.m.get_api_cors_allow_origins_delete())

    # -----------------------------------------------------------------------
    # REST API debug / strict (path differs between 1.4 and 1.5 via mapper)
    # -----------------------------------------------------------------------

    def set_api_debug(self) -> "HTTPSBatchBuilder":
        return self.add_set(self.m.get_api_debug())

    def delete_api_debug(self) -> "HTTPSBatchBuilder":
        return self.add_delete(self.m.get_api_debug())

    def set_api_strict(self) -> "HTTPSBatchBuilder":
        return self.add_set(self.m.get_api_strict())

    def delete_api_strict(self) -> "HTTPSBatchBuilder":
        return self.add_delete(self.m.get_api_strict())

    def set_api_rest(self) -> "HTTPSBatchBuilder":
        return self.add_set(self.m.get_api_rest())

    def delete_api_rest(self) -> "HTTPSBatchBuilder":
        return self.add_delete(self.m.get_api_rest())
