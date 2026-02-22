from typing import List, Dict, Any
from vyos_mappers import CommandMapperRegistry


class LoadBalancingBatchBuilder:
    """
    Batch builder for load-balancing configuration.

    Entity types addressed by item_name in batch request:
      - Reverse proxy backend: item_name = backend name
      - Reverse proxy service: item_name = service name
      - WAN interface health:  item_name = interface name
      - WAN rule:              item_name = rule number (string)
      - Globals / timeout:     item_name = "" (ignored)

    Composite values use "|" as separator.
    Examples:
      - value="facility|level"         for logging operations
      - value="server_name|address"    for backend server operations
      - value="rule_id|domain"         for rule sub-operations
    """

    def __init__(self, version: str):
        self.version = version
        self._operations: List[Dict[str, Any]] = []
        self.mappers = CommandMapperRegistry.get_all_mappers(version)
        self.mapper_key = "load_balancing"

    def _m(self):
        return self.mappers[self.mapper_key]

    def add_set(self, path: List[str]) -> "LoadBalancingBatchBuilder":
        if path:
            self._operations.append({"op": "set", "path": path})
        return self

    def add_delete(self, path: List[str]) -> "LoadBalancingBatchBuilder":
        if path:
            self._operations.append({"op": "delete", "path": path})
        return self

    def get_operations(self) -> List[Dict[str, Any]]:
        return self._operations.copy()

    def is_empty(self) -> bool:
        return len(self._operations) == 0

    # =========================================================================
    # Reverse Proxy — Global Parameters  (item_name ignored)
    # =========================================================================

    def set_rp_global_max_connections(self, _name: str, value: str) -> "LoadBalancingBatchBuilder":
        return self.add_set(self._m().get_rp_global_max_connections_path(value))

    def delete_rp_global_max_connections(self, _name: str) -> "LoadBalancingBatchBuilder":
        return self.add_delete(self._m().get_rp_global_params_path() + ["max-connections"])

    def set_rp_global_ssl_bind_cipher(self, _name: str, value: str) -> "LoadBalancingBatchBuilder":
        return self.add_set(self._m().get_rp_global_ssl_bind_cipher_path(value))

    def delete_rp_global_ssl_bind_cipher(self, _name: str, value: str) -> "LoadBalancingBatchBuilder":
        return self.add_delete(self._m().get_rp_global_ssl_bind_cipher_path(value))

    def delete_rp_global_ssl_bind_ciphers(self, _name: str) -> "LoadBalancingBatchBuilder":
        return self.add_delete(self._m().get_rp_global_params_path() + ["ssl-bind-ciphers"])

    def set_rp_global_tls_version_min(self, _name: str, value: str) -> "LoadBalancingBatchBuilder":
        return self.add_set(self._m().get_rp_global_tls_version_min_path(value))

    def delete_rp_global_tls_version_min(self, _name: str) -> "LoadBalancingBatchBuilder":
        return self.add_delete(self._m().get_rp_global_params_path() + ["tls-version-min"])

    def set_rp_global_logging_facility_level(self, _name: str, value: str) -> "LoadBalancingBatchBuilder":
        """value format: 'facility|level'"""
        parts = value.split("|", 1)
        if len(parts) == 2:
            return self.add_set(self._m().get_rp_global_logging_facility_level_path(parts[0], parts[1]))
        return self

    def delete_rp_global_logging_facility(self, _name: str, value: str) -> "LoadBalancingBatchBuilder":
        return self.add_delete(self._m().get_rp_global_logging_facility_path(value))

    # =========================================================================
    # Reverse Proxy — Global Timeouts  (item_name ignored)
    # =========================================================================

    def set_rp_timeout_check(self, _name: str, value: str) -> "LoadBalancingBatchBuilder":
        return self.add_set(self._m().get_rp_timeout_check_path(value))

    def delete_rp_timeout_check(self, _name: str) -> "LoadBalancingBatchBuilder":
        return self.add_delete(self._m().get_rp_timeout_base() + ["check"])

    def set_rp_timeout_client(self, _name: str, value: str) -> "LoadBalancingBatchBuilder":
        return self.add_set(self._m().get_rp_timeout_client_path(value))

    def delete_rp_timeout_client(self, _name: str) -> "LoadBalancingBatchBuilder":
        return self.add_delete(self._m().get_rp_timeout_base() + ["client"])

    def set_rp_timeout_connect(self, _name: str, value: str) -> "LoadBalancingBatchBuilder":
        return self.add_set(self._m().get_rp_timeout_connect_path(value))

    def delete_rp_timeout_connect(self, _name: str) -> "LoadBalancingBatchBuilder":
        return self.add_delete(self._m().get_rp_timeout_base() + ["connect"])

    def set_rp_timeout_server(self, _name: str, value: str) -> "LoadBalancingBatchBuilder":
        return self.add_set(self._m().get_rp_timeout_server_path(value))

    def delete_rp_timeout_server(self, _name: str) -> "LoadBalancingBatchBuilder":
        return self.add_delete(self._m().get_rp_timeout_base() + ["server"])

    # =========================================================================
    # Reverse Proxy — VRF  (item_name ignored)
    # =========================================================================

    def set_rp_vrf(self, _name: str, value: str) -> "LoadBalancingBatchBuilder":
        return self.add_set(self._m().get_rp_vrf_path(value))

    def delete_rp_vrf(self, _name: str) -> "LoadBalancingBatchBuilder":
        return self.add_delete(self._m().get_rp_base() + ["vrf"])

    # =========================================================================
    # Reverse Proxy — Backend  (item_name = backend name)
    # =========================================================================

    def create_rp_backend(self, name: str) -> "LoadBalancingBatchBuilder":
        return self.add_set(self._m().get_rp_backend_path(name))

    def delete_rp_backend(self, name: str) -> "LoadBalancingBatchBuilder":
        return self.add_delete(self._m().get_rp_backend_path(name))

    def set_rp_backend_description(self, name: str, value: str) -> "LoadBalancingBatchBuilder":
        return self.add_set(self._m().get_rp_backend_description_path(name, value))

    def delete_rp_backend_description(self, name: str) -> "LoadBalancingBatchBuilder":
        return self.add_delete(self._m().get_rp_backend_path(name) + ["description"])

    def set_rp_backend_balance(self, name: str, value: str) -> "LoadBalancingBatchBuilder":
        return self.add_set(self._m().get_rp_backend_balance_path(name, value))

    def delete_rp_backend_balance(self, name: str) -> "LoadBalancingBatchBuilder":
        return self.add_delete(self._m().get_rp_backend_path(name) + ["balance"])

    def set_rp_backend_mode(self, name: str, value: str) -> "LoadBalancingBatchBuilder":
        return self.add_set(self._m().get_rp_backend_mode_path(name, value))

    def delete_rp_backend_mode(self, name: str) -> "LoadBalancingBatchBuilder":
        return self.add_delete(self._m().get_rp_backend_path(name) + ["mode"])

    def set_rp_backend_health_check(self, name: str, value: str) -> "LoadBalancingBatchBuilder":
        return self.add_set(self._m().get_rp_backend_health_check_path(name, value))

    def delete_rp_backend_health_check(self, name: str) -> "LoadBalancingBatchBuilder":
        return self.add_delete(self._m().get_rp_backend_path(name) + ["health-check"])

    def set_rp_backend_http_check_method(self, name: str, value: str) -> "LoadBalancingBatchBuilder":
        return self.add_set(self._m().get_rp_backend_http_check_method_path(name, value))

    def set_rp_backend_http_check_uri(self, name: str, value: str) -> "LoadBalancingBatchBuilder":
        return self.add_set(self._m().get_rp_backend_http_check_uri_path(name, value))

    def set_rp_backend_http_check_expect_status(self, name: str, value: str) -> "LoadBalancingBatchBuilder":
        return self.add_set(self._m().get_rp_backend_http_check_expect_status_path(name, value))

    def set_rp_backend_http_check_expect_string(self, name: str, value: str) -> "LoadBalancingBatchBuilder":
        return self.add_set(self._m().get_rp_backend_http_check_expect_string_path(name, value))

    def delete_rp_backend_http_check(self, name: str) -> "LoadBalancingBatchBuilder":
        return self.add_delete(self._m().get_rp_backend_http_check_path(name))

    def set_rp_backend_http_response_header(self, name: str, value: str) -> "LoadBalancingBatchBuilder":
        """value format: 'header|value'"""
        parts = value.split("|", 1)
        if len(parts) == 2:
            return self.add_set(self._m().get_rp_backend_http_response_header_path(name, parts[0], parts[1]))
        return self

    def delete_rp_backend_http_response_header(self, name: str, value: str) -> "LoadBalancingBatchBuilder":
        return self.add_delete(self._m().get_rp_backend_http_response_header_key_path(name, value))

    def set_rp_backend_logging_facility_level(self, name: str, value: str) -> "LoadBalancingBatchBuilder":
        """value format: 'facility|level'"""
        parts = value.split("|", 1)
        if len(parts) == 2:
            return self.add_set(self._m().get_rp_backend_logging_facility_level_path(name, parts[0], parts[1]))
        return self

    def delete_rp_backend_logging_facility(self, name: str, value: str) -> "LoadBalancingBatchBuilder":
        return self.add_delete(self._m().get_rp_backend_logging_facility_path(name, value))

    def set_rp_backend_ssl_ca_certificate(self, name: str, value: str) -> "LoadBalancingBatchBuilder":
        return self.add_set(self._m().get_rp_backend_ssl_ca_certificate_path(name, value))

    def delete_rp_backend_ssl_ca_certificate(self, name: str) -> "LoadBalancingBatchBuilder":
        return self.add_delete(self._m().get_rp_backend_ssl_path(name) + ["ca-certificate"])

    def set_rp_backend_ssl_no_verify(self, name: str) -> "LoadBalancingBatchBuilder":
        return self.add_set(self._m().get_rp_backend_ssl_no_verify_path(name))

    def delete_rp_backend_ssl_no_verify(self, name: str) -> "LoadBalancingBatchBuilder":
        return self.add_delete(self._m().get_rp_backend_ssl_no_verify_path(name))

    def delete_rp_backend_ssl(self, name: str) -> "LoadBalancingBatchBuilder":
        return self.add_delete(self._m().get_rp_backend_ssl_path(name))

    def set_rp_backend_timeout_check(self, name: str, value: str) -> "LoadBalancingBatchBuilder":
        return self.add_set(self._m().get_rp_backend_timeout_check_path(name, value))

    def delete_rp_backend_timeout_check(self, name: str) -> "LoadBalancingBatchBuilder":
        return self.add_delete(self._m().get_rp_backend_path(name) + ["timeout", "check"])

    def set_rp_backend_timeout_connect(self, name: str, value: str) -> "LoadBalancingBatchBuilder":
        return self.add_set(self._m().get_rp_backend_timeout_connect_path(name, value))

    def delete_rp_backend_timeout_connect(self, name: str) -> "LoadBalancingBatchBuilder":
        return self.add_delete(self._m().get_rp_backend_path(name) + ["timeout", "connect"])

    def set_rp_backend_timeout_server(self, name: str, value: str) -> "LoadBalancingBatchBuilder":
        return self.add_set(self._m().get_rp_backend_timeout_server_path(name, value))

    def delete_rp_backend_timeout_server(self, name: str) -> "LoadBalancingBatchBuilder":
        return self.add_delete(self._m().get_rp_backend_path(name) + ["timeout", "server"])

    # Backend Servers  (value = "server_name" or "server_name|extra")

    def create_rp_backend_server(self, name: str, value: str) -> "LoadBalancingBatchBuilder":
        return self.add_set(self._m().get_rp_backend_server_path(name, value))

    def delete_rp_backend_server(self, name: str, value: str) -> "LoadBalancingBatchBuilder":
        return self.add_delete(self._m().get_rp_backend_server_path(name, value))

    def set_rp_backend_server_address(self, name: str, value: str) -> "LoadBalancingBatchBuilder":
        """value format: 'server_name|address'"""
        parts = value.split("|", 1)
        if len(parts) == 2:
            return self.add_set(self._m().get_rp_backend_server_address_path(name, parts[0], parts[1]))
        return self

    def set_rp_backend_server_port(self, name: str, value: str) -> "LoadBalancingBatchBuilder":
        """value format: 'server_name|port'"""
        parts = value.split("|", 1)
        if len(parts) == 2:
            return self.add_set(self._m().get_rp_backend_server_port_path(name, parts[0], parts[1]))
        return self

    def delete_rp_backend_server_port(self, name: str, value: str) -> "LoadBalancingBatchBuilder":
        return self.add_delete(self._m().get_rp_backend_server_path(name, value) + ["port"])

    def set_rp_backend_server_backup(self, name: str, value: str) -> "LoadBalancingBatchBuilder":
        return self.add_set(self._m().get_rp_backend_server_backup_path(name, value))

    def delete_rp_backend_server_backup(self, name: str, value: str) -> "LoadBalancingBatchBuilder":
        return self.add_delete(self._m().get_rp_backend_server_backup_path(name, value))

    def set_rp_backend_server_check(self, name: str, value: str) -> "LoadBalancingBatchBuilder":
        return self.add_set(self._m().get_rp_backend_server_check_path(name, value))

    def delete_rp_backend_server_check(self, name: str, value: str) -> "LoadBalancingBatchBuilder":
        return self.add_delete(self._m().get_rp_backend_server_check_path(name, value))

    def set_rp_backend_server_check_port(self, name: str, value: str) -> "LoadBalancingBatchBuilder":
        """value format: 'server_name|port'  (1.5 only)"""
        parts = value.split("|", 1)
        if len(parts) == 2:
            return self.add_set(self._m().get_rp_backend_server_check_port_path(name, parts[0], parts[1]))
        return self

    def delete_rp_backend_server_check_port(self, name: str, value: str) -> "LoadBalancingBatchBuilder":
        return self.add_delete(self._m().get_rp_backend_server_check_path(name, value) + ["port"])

    def set_rp_backend_server_send_proxy(self, name: str, value: str) -> "LoadBalancingBatchBuilder":
        return self.add_set(self._m().get_rp_backend_server_send_proxy_path(name, value))

    def delete_rp_backend_server_send_proxy(self, name: str, value: str) -> "LoadBalancingBatchBuilder":
        return self.add_delete(self._m().get_rp_backend_server_send_proxy_path(name, value))

    def set_rp_backend_server_send_proxy_v2(self, name: str, value: str) -> "LoadBalancingBatchBuilder":
        return self.add_set(self._m().get_rp_backend_server_send_proxy_v2_path(name, value))

    def delete_rp_backend_server_send_proxy_v2(self, name: str, value: str) -> "LoadBalancingBatchBuilder":
        return self.add_delete(self._m().get_rp_backend_server_send_proxy_v2_path(name, value))

    # Backend Rules  (value = "rule_id" or "rule_id|extra")

    def create_rp_backend_rule(self, name: str, value: str) -> "LoadBalancingBatchBuilder":
        return self.add_set(self._m().get_rp_backend_rule_path(name, value))

    def delete_rp_backend_rule(self, name: str, value: str) -> "LoadBalancingBatchBuilder":
        return self.add_delete(self._m().get_rp_backend_rule_path(name, value))

    def set_rp_backend_rule_domain_name(self, name: str, value: str) -> "LoadBalancingBatchBuilder":
        """value format: 'rule_id|domain'"""
        parts = value.split("|", 1)
        if len(parts) == 2:
            return self.add_set(self._m().get_rp_backend_rule_domain_name_path(name, parts[0], parts[1]))
        return self

    def delete_rp_backend_rule_domain_name(self, name: str, value: str) -> "LoadBalancingBatchBuilder":
        """value format: 'rule_id|domain'"""
        parts = value.split("|", 1)
        if len(parts) == 2:
            return self.add_delete(self._m().get_rp_backend_rule_domain_name_path(name, parts[0], parts[1]))
        return self

    def set_rp_backend_rule_wildcard_domain(self, name: str, value: str) -> "LoadBalancingBatchBuilder":
        """value format: 'rule_id|domain'  (1.5 only)"""
        parts = value.split("|", 1)
        if len(parts) == 2:
            return self.add_set(self._m().get_rp_backend_rule_wildcard_domain_path(name, parts[0], parts[1]))
        return self

    def delete_rp_backend_rule_wildcard_domain(self, name: str, value: str) -> "LoadBalancingBatchBuilder":
        """value format: 'rule_id|domain'"""
        parts = value.split("|", 1)
        if len(parts) == 2:
            return self.add_delete(self._m().get_rp_backend_rule_wildcard_domain_path(name, parts[0], parts[1]))
        return self

    def set_rp_backend_rule_ssl(self, name: str, value: str) -> "LoadBalancingBatchBuilder":
        """value format: 'rule_id|ssl_option'"""
        parts = value.split("|", 1)
        if len(parts) == 2:
            return self.add_set(self._m().get_rp_backend_rule_ssl_path(name, parts[0], parts[1]))
        return self

    def delete_rp_backend_rule_ssl(self, name: str, value: str) -> "LoadBalancingBatchBuilder":
        return self.add_delete(self._m().get_rp_backend_rule_path(name, value) + ["ssl"])

    def set_rp_backend_rule_url_path_begin(self, name: str, value: str) -> "LoadBalancingBatchBuilder":
        """value format: 'rule_id|path'"""
        parts = value.split("|", 1)
        if len(parts) == 2:
            return self.add_set(self._m().get_rp_backend_rule_url_path_begin_path(name, parts[0], parts[1]))
        return self

    def set_rp_backend_rule_url_path_end(self, name: str, value: str) -> "LoadBalancingBatchBuilder":
        """value format: 'rule_id|path'"""
        parts = value.split("|", 1)
        if len(parts) == 2:
            return self.add_set(self._m().get_rp_backend_rule_url_path_end_path(name, parts[0], parts[1]))
        return self

    def set_rp_backend_rule_url_path_exact(self, name: str, value: str) -> "LoadBalancingBatchBuilder":
        """value format: 'rule_id|path'"""
        parts = value.split("|", 1)
        if len(parts) == 2:
            return self.add_set(self._m().get_rp_backend_rule_url_path_exact_path(name, parts[0], parts[1]))
        return self

    def delete_rp_backend_rule_url_path(self, name: str, value: str) -> "LoadBalancingBatchBuilder":
        return self.add_delete(self._m().get_rp_backend_rule_url_path_path(name, value))

    def set_rp_backend_rule_set_redirect_location(self, name: str, value: str) -> "LoadBalancingBatchBuilder":
        """value format: 'rule_id|url'"""
        parts = value.split("|", 1)
        if len(parts) == 2:
            return self.add_set(self._m().get_rp_backend_rule_set_redirect_location_path(name, parts[0], parts[1]))
        return self

    def set_rp_backend_rule_set_server(self, name: str, value: str) -> "LoadBalancingBatchBuilder":
        """value format: 'rule_id|server_name'"""
        parts = value.split("|", 1)
        if len(parts) == 2:
            return self.add_set(self._m().get_rp_backend_rule_set_server_path(name, parts[0], parts[1]))
        return self

    def delete_rp_backend_rule_set(self, name: str, value: str) -> "LoadBalancingBatchBuilder":
        return self.add_delete(self._m().get_rp_backend_rule_set_path(name, value))

    # =========================================================================
    # Reverse Proxy — Service  (item_name = service name)
    # =========================================================================

    def create_rp_service(self, name: str) -> "LoadBalancingBatchBuilder":
        return self.add_set(self._m().get_rp_service_path(name))

    def delete_rp_service(self, name: str) -> "LoadBalancingBatchBuilder":
        return self.add_delete(self._m().get_rp_service_path(name))

    def set_rp_service_description(self, name: str, value: str) -> "LoadBalancingBatchBuilder":
        return self.add_set(self._m().get_rp_service_description_path(name, value))

    def delete_rp_service_description(self, name: str) -> "LoadBalancingBatchBuilder":
        return self.add_delete(self._m().get_rp_service_path(name) + ["description"])

    def set_rp_service_mode(self, name: str, value: str) -> "LoadBalancingBatchBuilder":
        return self.add_set(self._m().get_rp_service_mode_path(name, value))

    def delete_rp_service_mode(self, name: str) -> "LoadBalancingBatchBuilder":
        return self.add_delete(self._m().get_rp_service_path(name) + ["mode"])

    def set_rp_service_port(self, name: str, value: str) -> "LoadBalancingBatchBuilder":
        return self.add_set(self._m().get_rp_service_port_path(name, value))

    def delete_rp_service_port(self, name: str) -> "LoadBalancingBatchBuilder":
        return self.add_delete(self._m().get_rp_service_path(name) + ["port"])

    def set_rp_service_backend(self, name: str, value: str) -> "LoadBalancingBatchBuilder":
        return self.add_set(self._m().get_rp_service_backend_path(name, value))

    def delete_rp_service_backend(self, name: str, value: str) -> "LoadBalancingBatchBuilder":
        return self.add_delete(self._m().get_rp_service_backend_path(name, value))

    def set_rp_service_redirect_http_to_https(self, name: str) -> "LoadBalancingBatchBuilder":
        return self.add_set(self._m().get_rp_service_redirect_http_to_https_path(name))

    def delete_rp_service_redirect_http_to_https(self, name: str) -> "LoadBalancingBatchBuilder":
        return self.add_delete(self._m().get_rp_service_redirect_http_to_https_path(name))

    def set_rp_service_ssl_certificate(self, name: str, value: str) -> "LoadBalancingBatchBuilder":
        return self.add_set(self._m().get_rp_service_ssl_certificate_path(name, value))

    def delete_rp_service_ssl_certificate(self, name: str, value: str) -> "LoadBalancingBatchBuilder":
        return self.add_delete(self._m().get_rp_service_ssl_certificate_path(name, value))

    def delete_rp_service_ssl(self, name: str) -> "LoadBalancingBatchBuilder":
        return self.add_delete(self._m().get_rp_service_ssl_path(name))

    def set_rp_service_listen_address(self, name: str, value: str) -> "LoadBalancingBatchBuilder":
        return self.add_set(self._m().get_rp_service_listen_address_path(name, value))

    def delete_rp_service_listen_address(self, name: str, value: str) -> "LoadBalancingBatchBuilder":
        return self.add_delete(self._m().get_rp_service_listen_address_path(name, value))

    def set_rp_service_listen_address_accept_proxy(self, name: str, value: str) -> "LoadBalancingBatchBuilder":
        """value = address  (1.5 only — listen-address is a tag node)"""
        return self.add_set(self._m().get_rp_service_listen_address_accept_proxy_path(name, value))

    def delete_rp_service_listen_address_accept_proxy(self, name: str, value: str) -> "LoadBalancingBatchBuilder":
        return self.add_delete(self._m().get_rp_service_listen_address_accept_proxy_path(name, value))

    def set_rp_service_http_response_header(self, name: str, value: str) -> "LoadBalancingBatchBuilder":
        """value format: 'header|value'"""
        parts = value.split("|", 1)
        if len(parts) == 2:
            return self.add_set(self._m().get_rp_service_http_response_header_path(name, parts[0], parts[1]))
        return self

    def delete_rp_service_http_response_header(self, name: str, value: str) -> "LoadBalancingBatchBuilder":
        return self.add_delete(self._m().get_rp_service_http_response_header_key_path(name, value))

    def set_rp_service_logging_facility_level(self, name: str, value: str) -> "LoadBalancingBatchBuilder":
        """value format: 'facility|level'"""
        parts = value.split("|", 1)
        if len(parts) == 2:
            return self.add_set(self._m().get_rp_service_logging_facility_level_path(name, parts[0], parts[1]))
        return self

    def delete_rp_service_logging_facility(self, name: str, value: str) -> "LoadBalancingBatchBuilder":
        return self.add_delete(self._m().get_rp_service_logging_facility_path(name, value))

    def set_rp_service_tcp_request_inspect_delay(self, name: str, value: str) -> "LoadBalancingBatchBuilder":
        return self.add_set(self._m().get_rp_service_tcp_request_inspect_delay_path(name, value))

    def delete_rp_service_tcp_request(self, name: str) -> "LoadBalancingBatchBuilder":
        return self.add_delete(self._m().get_rp_service_tcp_request_path(name))

    def set_rp_service_timeout_client(self, name: str, value: str) -> "LoadBalancingBatchBuilder":
        return self.add_set(self._m().get_rp_service_timeout_client_path(name, value))

    def delete_rp_service_timeout(self, name: str) -> "LoadBalancingBatchBuilder":
        return self.add_delete(self._m().get_rp_service_timeout_path(name))

    # Service http-compression (1.5 only)

    def set_rp_service_http_compression_algorithm(self, name: str, value: str) -> "LoadBalancingBatchBuilder":
        return self.add_set(self._m().get_rp_service_http_compression_algorithm_path(name, value))

    def delete_rp_service_http_compression_algorithm(self, name: str) -> "LoadBalancingBatchBuilder":
        return self.add_delete(self._m().get_rp_service_http_compression_path(name) + ["algorithm"])

    def set_rp_service_http_compression_mime_type(self, name: str, value: str) -> "LoadBalancingBatchBuilder":
        return self.add_set(self._m().get_rp_service_http_compression_mime_type_path(name, value))

    def delete_rp_service_http_compression_mime_type(self, name: str, value: str) -> "LoadBalancingBatchBuilder":
        return self.add_delete(self._m().get_rp_service_http_compression_mime_type_path(name, value))

    def delete_rp_service_http_compression(self, name: str) -> "LoadBalancingBatchBuilder":
        return self.add_delete(self._m().get_rp_service_http_compression_path(name))

    # Service Rules  (value = "rule_id" or "rule_id|extra")

    def create_rp_service_rule(self, name: str, value: str) -> "LoadBalancingBatchBuilder":
        return self.add_set(self._m().get_rp_service_rule_path(name, value))

    def delete_rp_service_rule(self, name: str, value: str) -> "LoadBalancingBatchBuilder":
        return self.add_delete(self._m().get_rp_service_rule_path(name, value))

    def set_rp_service_rule_domain_name(self, name: str, value: str) -> "LoadBalancingBatchBuilder":
        """value format: 'rule_id|domain'"""
        parts = value.split("|", 1)
        if len(parts) == 2:
            return self.add_set(self._m().get_rp_service_rule_domain_name_path(name, parts[0], parts[1]))
        return self

    def delete_rp_service_rule_domain_name(self, name: str, value: str) -> "LoadBalancingBatchBuilder":
        """value format: 'rule_id|domain'"""
        parts = value.split("|", 1)
        if len(parts) == 2:
            return self.add_delete(self._m().get_rp_service_rule_domain_name_path(name, parts[0], parts[1]))
        return self

    def set_rp_service_rule_wildcard_domain(self, name: str, value: str) -> "LoadBalancingBatchBuilder":
        """value format: 'rule_id|domain'"""
        parts = value.split("|", 1)
        if len(parts) == 2:
            return self.add_set(self._m().get_rp_service_rule_wildcard_domain_path(name, parts[0], parts[1]))
        return self

    def delete_rp_service_rule_wildcard_domain(self, name: str, value: str) -> "LoadBalancingBatchBuilder":
        """value format: 'rule_id|domain'"""
        parts = value.split("|", 1)
        if len(parts) == 2:
            return self.add_delete(self._m().get_rp_service_rule_wildcard_domain_path(name, parts[0], parts[1]))
        return self

    def set_rp_service_rule_ssl(self, name: str, value: str) -> "LoadBalancingBatchBuilder":
        """value format: 'rule_id|ssl_option'"""
        parts = value.split("|", 1)
        if len(parts) == 2:
            return self.add_set(self._m().get_rp_service_rule_ssl_path(name, parts[0], parts[1]))
        return self

    def delete_rp_service_rule_ssl(self, name: str, value: str) -> "LoadBalancingBatchBuilder":
        return self.add_delete(self._m().get_rp_service_rule_path(name, value) + ["ssl"])

    def set_rp_service_rule_url_path_begin(self, name: str, value: str) -> "LoadBalancingBatchBuilder":
        """value format: 'rule_id|path'"""
        parts = value.split("|", 1)
        if len(parts) == 2:
            return self.add_set(self._m().get_rp_service_rule_url_path_begin_path(name, parts[0], parts[1]))
        return self

    def set_rp_service_rule_url_path_end(self, name: str, value: str) -> "LoadBalancingBatchBuilder":
        """value format: 'rule_id|path'"""
        parts = value.split("|", 1)
        if len(parts) == 2:
            return self.add_set(self._m().get_rp_service_rule_url_path_end_path(name, parts[0], parts[1]))
        return self

    def set_rp_service_rule_url_path_exact(self, name: str, value: str) -> "LoadBalancingBatchBuilder":
        """value format: 'rule_id|path'"""
        parts = value.split("|", 1)
        if len(parts) == 2:
            return self.add_set(self._m().get_rp_service_rule_url_path_exact_path(name, parts[0], parts[1]))
        return self

    def delete_rp_service_rule_url_path(self, name: str, value: str) -> "LoadBalancingBatchBuilder":
        return self.add_delete(self._m().get_rp_service_rule_url_path_path(name, value))

    def set_rp_service_rule_set_backend(self, name: str, value: str) -> "LoadBalancingBatchBuilder":
        """value format: 'rule_id|backend_name'"""
        parts = value.split("|", 1)
        if len(parts) == 2:
            return self.add_set(self._m().get_rp_service_rule_set_backend_path(name, parts[0], parts[1]))
        return self

    def set_rp_service_rule_set_redirect_location(self, name: str, value: str) -> "LoadBalancingBatchBuilder":
        """value format: 'rule_id|url'"""
        parts = value.split("|", 1)
        if len(parts) == 2:
            return self.add_set(self._m().get_rp_service_rule_set_redirect_location_path(name, parts[0], parts[1]))
        return self

    def delete_rp_service_rule_set(self, name: str, value: str) -> "LoadBalancingBatchBuilder":
        return self.add_delete(self._m().get_rp_service_rule_set_path(name, value))

    # =========================================================================
    # WAN — Global Options  (item_name ignored)
    # =========================================================================

    def set_wan_disable_source_nat(self, _name: str) -> "LoadBalancingBatchBuilder":
        return self.add_set(self._m().get_wan_disable_source_nat_path())

    def delete_wan_disable_source_nat(self, _name: str) -> "LoadBalancingBatchBuilder":
        return self.add_delete(self._m().get_wan_disable_source_nat_path())

    def set_wan_enable_local_traffic(self, _name: str) -> "LoadBalancingBatchBuilder":
        return self.add_set(self._m().get_wan_enable_local_traffic_path())

    def delete_wan_enable_local_traffic(self, _name: str) -> "LoadBalancingBatchBuilder":
        return self.add_delete(self._m().get_wan_enable_local_traffic_path())

    def set_wan_flush_connections(self, _name: str) -> "LoadBalancingBatchBuilder":
        return self.add_set(self._m().get_wan_flush_connections_path())

    def delete_wan_flush_connections(self, _name: str) -> "LoadBalancingBatchBuilder":
        return self.add_delete(self._m().get_wan_flush_connections_path())

    def set_wan_hook(self, _name: str, value: str) -> "LoadBalancingBatchBuilder":
        return self.add_set(self._m().get_wan_hook_path(value))

    def delete_wan_hook(self, _name: str) -> "LoadBalancingBatchBuilder":
        return self.add_delete(self._m().get_wan_base() + ["hook"])

    def set_wan_sticky_connections_inbound(self, _name: str) -> "LoadBalancingBatchBuilder":
        return self.add_set(self._m().get_wan_sticky_connections_inbound_path())

    def delete_wan_sticky_connections(self, _name: str) -> "LoadBalancingBatchBuilder":
        return self.add_delete(self._m().get_wan_sticky_connections_path())

    # =========================================================================
    # WAN — Interface Health  (item_name = interface name)
    # =========================================================================

    def create_wan_interface_health(self, name: str) -> "LoadBalancingBatchBuilder":
        return self.add_set(self._m().get_wan_interface_health_path(name))

    def delete_wan_interface_health(self, name: str) -> "LoadBalancingBatchBuilder":
        return self.add_delete(self._m().get_wan_interface_health_path(name))

    def set_wan_interface_health_nexthop(self, name: str, value: str) -> "LoadBalancingBatchBuilder":
        return self.add_set(self._m().get_wan_interface_health_nexthop_path(name, value))

    def delete_wan_interface_health_nexthop(self, name: str) -> "LoadBalancingBatchBuilder":
        return self.add_delete(self._m().get_wan_interface_health_path(name) + ["nexthop"])

    def set_wan_interface_health_failure_count(self, name: str, value: str) -> "LoadBalancingBatchBuilder":
        return self.add_set(self._m().get_wan_interface_health_failure_count_path(name, value))

    def delete_wan_interface_health_failure_count(self, name: str) -> "LoadBalancingBatchBuilder":
        return self.add_delete(self._m().get_wan_interface_health_path(name) + ["failure-count"])

    def set_wan_interface_health_success_count(self, name: str, value: str) -> "LoadBalancingBatchBuilder":
        return self.add_set(self._m().get_wan_interface_health_success_count_path(name, value))

    def delete_wan_interface_health_success_count(self, name: str) -> "LoadBalancingBatchBuilder":
        return self.add_delete(self._m().get_wan_interface_health_path(name) + ["success-count"])

    def create_wan_interface_health_test(self, name: str, value: str) -> "LoadBalancingBatchBuilder":
        """value = test_id"""
        return self.add_set(self._m().get_wan_interface_health_test_path(name, value))

    def delete_wan_interface_health_test(self, name: str, value: str) -> "LoadBalancingBatchBuilder":
        """value = test_id"""
        return self.add_delete(self._m().get_wan_interface_health_test_path(name, value))

    def set_wan_interface_health_test_type(self, name: str, value: str) -> "LoadBalancingBatchBuilder":
        """value format: 'test_id|type'"""
        parts = value.split("|", 1)
        if len(parts) == 2:
            return self.add_set(self._m().get_wan_interface_health_test_type_path(name, parts[0], parts[1]))
        return self

    def set_wan_interface_health_test_target(self, name: str, value: str) -> "LoadBalancingBatchBuilder":
        """value format: 'test_id|target_ip'"""
        parts = value.split("|", 1)
        if len(parts) == 2:
            return self.add_set(self._m().get_wan_interface_health_test_target_path(name, parts[0], parts[1]))
        return self

    def set_wan_interface_health_test_resp_time(self, name: str, value: str) -> "LoadBalancingBatchBuilder":
        """value format: 'test_id|seconds'"""
        parts = value.split("|", 1)
        if len(parts) == 2:
            return self.add_set(self._m().get_wan_interface_health_test_resp_time_path(name, parts[0], parts[1]))
        return self

    def set_wan_interface_health_test_ttl_limit(self, name: str, value: str) -> "LoadBalancingBatchBuilder":
        """value format: 'test_id|limit'"""
        parts = value.split("|", 1)
        if len(parts) == 2:
            return self.add_set(self._m().get_wan_interface_health_test_ttl_limit_path(name, parts[0], parts[1]))
        return self

    def set_wan_interface_health_test_script(self, name: str, value: str) -> "LoadBalancingBatchBuilder":
        """value format: 'test_id|script_path'"""
        parts = value.split("|", 1)
        if len(parts) == 2:
            return self.add_set(self._m().get_wan_interface_health_test_script_path(name, parts[0], parts[1]))
        return self

    # =========================================================================
    # WAN — Rules  (item_name = rule_id)
    # =========================================================================

    def create_wan_rule(self, name: str) -> "LoadBalancingBatchBuilder":
        return self.add_set(self._m().get_wan_rule_path(name))

    def delete_wan_rule(self, name: str) -> "LoadBalancingBatchBuilder":
        return self.add_delete(self._m().get_wan_rule_path(name))

    def set_wan_rule_description(self, name: str, value: str) -> "LoadBalancingBatchBuilder":
        return self.add_set(self._m().get_wan_rule_description_path(name, value))

    def delete_wan_rule_description(self, name: str) -> "LoadBalancingBatchBuilder":
        return self.add_delete(self._m().get_wan_rule_path(name) + ["description"])

    def set_wan_rule_inbound_interface(self, name: str, value: str) -> "LoadBalancingBatchBuilder":
        return self.add_set(self._m().get_wan_rule_inbound_interface_path(name, value))

    def delete_wan_rule_inbound_interface(self, name: str) -> "LoadBalancingBatchBuilder":
        return self.add_delete(self._m().get_wan_rule_path(name) + ["inbound-interface"])

    def set_wan_rule_exclude(self, name: str) -> "LoadBalancingBatchBuilder":
        return self.add_set(self._m().get_wan_rule_exclude_path(name))

    def delete_wan_rule_exclude(self, name: str) -> "LoadBalancingBatchBuilder":
        return self.add_delete(self._m().get_wan_rule_exclude_path(name))

    def set_wan_rule_failover(self, name: str) -> "LoadBalancingBatchBuilder":
        return self.add_set(self._m().get_wan_rule_failover_path(name))

    def delete_wan_rule_failover(self, name: str) -> "LoadBalancingBatchBuilder":
        return self.add_delete(self._m().get_wan_rule_failover_path(name))

    def set_wan_rule_per_packet_balancing(self, name: str) -> "LoadBalancingBatchBuilder":
        return self.add_set(self._m().get_wan_rule_per_packet_balancing_path(name))

    def delete_wan_rule_per_packet_balancing(self, name: str) -> "LoadBalancingBatchBuilder":
        return self.add_delete(self._m().get_wan_rule_per_packet_balancing_path(name))

    def set_wan_rule_protocol(self, name: str, value: str) -> "LoadBalancingBatchBuilder":
        return self.add_set(self._m().get_wan_rule_protocol_path(name, value))

    def delete_wan_rule_protocol(self, name: str) -> "LoadBalancingBatchBuilder":
        return self.add_delete(self._m().get_wan_rule_path(name) + ["protocol"])

    def set_wan_rule_interface(self, name: str, value: str) -> "LoadBalancingBatchBuilder":
        """value = interface name (creates interface entry without weight)"""
        return self.add_set(self._m().get_wan_rule_interface_path(name, value))

    def delete_wan_rule_interface(self, name: str, value: str) -> "LoadBalancingBatchBuilder":
        return self.add_delete(self._m().get_wan_rule_interface_path(name, value))

    def set_wan_rule_interface_weight(self, name: str, value: str) -> "LoadBalancingBatchBuilder":
        """value format: 'interface|weight'"""
        parts = value.split("|", 1)
        if len(parts) == 2:
            return self.add_set(self._m().get_wan_rule_interface_weight_path(name, parts[0], parts[1]))
        return self

    def set_wan_rule_limit_burst(self, name: str, value: str) -> "LoadBalancingBatchBuilder":
        return self.add_set(self._m().get_wan_rule_limit_burst_path(name, value))

    def set_wan_rule_limit_period(self, name: str, value: str) -> "LoadBalancingBatchBuilder":
        return self.add_set(self._m().get_wan_rule_limit_period_path(name, value))

    def set_wan_rule_limit_rate(self, name: str, value: str) -> "LoadBalancingBatchBuilder":
        return self.add_set(self._m().get_wan_rule_limit_rate_path(name, value))

    def set_wan_rule_limit_threshold(self, name: str, value: str) -> "LoadBalancingBatchBuilder":
        return self.add_set(self._m().get_wan_rule_limit_threshold_path(name, value))

    def delete_wan_rule_limit(self, name: str) -> "LoadBalancingBatchBuilder":
        return self.add_delete(self._m().get_wan_rule_limit_path(name))

    def set_wan_rule_source_address(self, name: str, value: str) -> "LoadBalancingBatchBuilder":
        return self.add_set(self._m().get_wan_rule_source_address_path(name, value))

    def delete_wan_rule_source_address(self, name: str) -> "LoadBalancingBatchBuilder":
        return self.add_delete(self._m().get_wan_rule_source_path(name) + ["address"])

    def set_wan_rule_source_port(self, name: str, value: str) -> "LoadBalancingBatchBuilder":
        return self.add_set(self._m().get_wan_rule_source_port_path(name, value))

    def delete_wan_rule_source_port(self, name: str) -> "LoadBalancingBatchBuilder":
        return self.add_delete(self._m().get_wan_rule_source_path(name) + ["port"])

    def delete_wan_rule_source(self, name: str) -> "LoadBalancingBatchBuilder":
        return self.add_delete(self._m().get_wan_rule_source_path(name))

    def set_wan_rule_destination_address(self, name: str, value: str) -> "LoadBalancingBatchBuilder":
        return self.add_set(self._m().get_wan_rule_destination_address_path(name, value))

    def delete_wan_rule_destination_address(self, name: str) -> "LoadBalancingBatchBuilder":
        return self.add_delete(self._m().get_wan_rule_destination_path(name) + ["address"])

    def set_wan_rule_destination_port(self, name: str, value: str) -> "LoadBalancingBatchBuilder":
        return self.add_set(self._m().get_wan_rule_destination_port_path(name, value))

    def delete_wan_rule_destination_port(self, name: str) -> "LoadBalancingBatchBuilder":
        return self.add_delete(self._m().get_wan_rule_destination_path(name) + ["port"])

    def delete_wan_rule_destination(self, name: str) -> "LoadBalancingBatchBuilder":
        return self.add_delete(self._m().get_wan_rule_destination_path(name))

    # WAN Rule — source/destination groups (1.5 only)
    def set_wan_rule_source_group_address(self, name: str, value: str) -> "LoadBalancingBatchBuilder":
        return self.add_set(self._m().get_wan_rule_source_group_address_path(name, value))

    def set_wan_rule_source_group_network(self, name: str, value: str) -> "LoadBalancingBatchBuilder":
        return self.add_set(self._m().get_wan_rule_source_group_network_path(name, value))

    def set_wan_rule_source_group_domain(self, name: str, value: str) -> "LoadBalancingBatchBuilder":
        return self.add_set(self._m().get_wan_rule_source_group_domain_path(name, value))

    def set_wan_rule_source_group_port(self, name: str, value: str) -> "LoadBalancingBatchBuilder":
        return self.add_set(self._m().get_wan_rule_source_group_port_path(name, value))

    def set_wan_rule_destination_group_address(self, name: str, value: str) -> "LoadBalancingBatchBuilder":
        return self.add_set(self._m().get_wan_rule_destination_group_address_path(name, value))

    def set_wan_rule_destination_group_network(self, name: str, value: str) -> "LoadBalancingBatchBuilder":
        return self.add_set(self._m().get_wan_rule_destination_group_network_path(name, value))

    def set_wan_rule_destination_group_domain(self, name: str, value: str) -> "LoadBalancingBatchBuilder":
        return self.add_set(self._m().get_wan_rule_destination_group_domain_path(name, value))

    def set_wan_rule_destination_group_port(self, name: str, value: str) -> "LoadBalancingBatchBuilder":
        return self.add_set(self._m().get_wan_rule_destination_group_port_path(name, value))

    # =========================================================================
    # Capabilities
    # =========================================================================

    def get_capabilities(self) -> Dict[str, Any]:
        is_v15 = "1.5" in self.version
        rp_key = "haproxy" if is_v15 else "reverse-proxy"
        return {
            "version": self.version,
            "rp_key": rp_key,
            "features": {
                "reverse_proxy": {
                    "supported": True,
                    "description": "HAProxy-based reverse proxy / load balancer",
                },
                "wan": {
                    "supported": True,
                    "description": "WAN load balancing with policy-based routing",
                },
                "http_compression": {
                    "supported": is_v15,
                    "description": "HTTP response compression on services (1.5+)",
                },
                "server_check_port": {
                    "supported": is_v15,
                    "description": "Separate health check port per backend server (1.5+)",
                },
                "listen_address_accept_proxy": {
                    "supported": is_v15,
                    "description": "Accept PROXY protocol per listen address (1.5+)",
                },
                "backend_rule_wildcard_domain": {
                    "supported": is_v15,
                    "description": "Wildcard domain matching in backend rules (1.5+)",
                },
                "wan_rule_groups": {
                    "supported": is_v15,
                    "description": "Firewall group matching in WAN rules (1.5+)",
                },
            },
        }
