from typing import List, Dict, Any, Optional


class LoadBalancingMapper:
    """
    Mapper for load-balancing configuration.

    VyOS 1.5 uses:  load-balancing haproxy ...
    VyOS 1.4 uses:  load-balancing reverse-proxy ...
    WAN path is identical on both versions: load-balancing wan ...
    """

    def __init__(self, version: str):
        self.version = version
        self._base = ["load-balancing"]
        # Version-specific key for the reverse-proxy/haproxy section
        self._rp_key = "reverse-proxy" if "1.4" in version else "haproxy"

    # =========================================================================
    # Helper path builders
    # =========================================================================

    def get_rp_base(self) -> List[str]:
        return self._base + [self._rp_key]

    def get_wan_base(self) -> List[str]:
        return self._base + ["wan"]

    # =========================================================================
    # Reverse Proxy — Global Parameters
    # =========================================================================

    def get_rp_global_params_path(self) -> List[str]:
        return self.get_rp_base() + ["global-parameters"]

    def get_rp_global_max_connections_path(self, value: str) -> List[str]:
        return self.get_rp_global_params_path() + ["max-connections", value]

    def get_rp_global_ssl_bind_cipher_path(self, cipher: str) -> List[str]:
        return self.get_rp_global_params_path() + ["ssl-bind-ciphers", cipher]

    def get_rp_global_tls_version_min_path(self, value: str) -> List[str]:
        return self.get_rp_global_params_path() + ["tls-version-min", value]

    def get_rp_global_logging_facility_level_path(self, facility: str, level: str) -> List[str]:
        return self.get_rp_global_params_path() + ["logging", "facility", facility, "level", level]

    def get_rp_global_logging_facility_path(self, facility: str) -> List[str]:
        return self.get_rp_global_params_path() + ["logging", "facility", facility]

    # =========================================================================
    # Reverse Proxy — Global Timeouts
    # =========================================================================

    def get_rp_timeout_base(self) -> List[str]:
        return self.get_rp_base() + ["timeout"]

    def get_rp_timeout_check_path(self, value: str) -> List[str]:
        return self.get_rp_timeout_base() + ["check", value]

    def get_rp_timeout_client_path(self, value: str) -> List[str]:
        return self.get_rp_timeout_base() + ["client", value]

    def get_rp_timeout_connect_path(self, value: str) -> List[str]:
        return self.get_rp_timeout_base() + ["connect", value]

    def get_rp_timeout_server_path(self, value: str) -> List[str]:
        return self.get_rp_timeout_base() + ["server", value]

    # =========================================================================
    # Reverse Proxy — VRF
    # =========================================================================

    def get_rp_vrf_path(self, value: str) -> List[str]:
        return self.get_rp_base() + ["vrf", value]

    # =========================================================================
    # Reverse Proxy — Backend
    # =========================================================================

    def get_rp_backend_path(self, name: str) -> List[str]:
        return self.get_rp_base() + ["backend", name]

    def get_rp_backend_description_path(self, name: str, value: str) -> List[str]:
        return self.get_rp_backend_path(name) + ["description", value]

    def get_rp_backend_balance_path(self, name: str, value: str) -> List[str]:
        return self.get_rp_backend_path(name) + ["balance", value]

    def get_rp_backend_mode_path(self, name: str, value: str) -> List[str]:
        return self.get_rp_backend_path(name) + ["mode", value]

    def get_rp_backend_health_check_path(self, name: str, value: str) -> List[str]:
        return self.get_rp_backend_path(name) + ["health-check", value]

    def get_rp_backend_http_check_method_path(self, name: str, value: str) -> List[str]:
        return self.get_rp_backend_path(name) + ["http-check", "method", value]

    def get_rp_backend_http_check_uri_path(self, name: str, value: str) -> List[str]:
        return self.get_rp_backend_path(name) + ["http-check", "uri", value]

    def get_rp_backend_http_check_expect_status_path(self, name: str, value: str) -> List[str]:
        return self.get_rp_backend_path(name) + ["http-check", "expect", "status", value]

    def get_rp_backend_http_check_expect_string_path(self, name: str, value: str) -> List[str]:
        return self.get_rp_backend_path(name) + ["http-check", "expect", "string", value]

    def get_rp_backend_http_check_path(self, name: str) -> List[str]:
        return self.get_rp_backend_path(name) + ["http-check"]

    def get_rp_backend_http_response_header_path(self, name: str, header: str, value: str) -> List[str]:
        return self.get_rp_backend_path(name) + ["http-response-headers", header, "value", value]

    def get_rp_backend_http_response_header_key_path(self, name: str, header: str) -> List[str]:
        return self.get_rp_backend_path(name) + ["http-response-headers", header]

    def get_rp_backend_logging_facility_level_path(self, name: str, facility: str, level: str) -> List[str]:
        return self.get_rp_backend_path(name) + ["logging", "facility", facility, "level", level]

    def get_rp_backend_logging_facility_path(self, name: str, facility: str) -> List[str]:
        return self.get_rp_backend_path(name) + ["logging", "facility", facility]

    def get_rp_backend_ssl_ca_certificate_path(self, name: str, value: str) -> List[str]:
        return self.get_rp_backend_path(name) + ["ssl", "ca-certificate", value]

    def get_rp_backend_ssl_no_verify_path(self, name: str) -> List[str]:
        return self.get_rp_backend_path(name) + ["ssl", "no-verify"]

    def get_rp_backend_ssl_path(self, name: str) -> List[str]:
        return self.get_rp_backend_path(name) + ["ssl"]

    def get_rp_backend_timeout_check_path(self, name: str, value: str) -> List[str]:
        return self.get_rp_backend_path(name) + ["timeout", "check", value]

    def get_rp_backend_timeout_connect_path(self, name: str, value: str) -> List[str]:
        return self.get_rp_backend_path(name) + ["timeout", "connect", value]

    def get_rp_backend_timeout_server_path(self, name: str, value: str) -> List[str]:
        return self.get_rp_backend_path(name) + ["timeout", "server", value]

    # Backend Servers
    def get_rp_backend_server_path(self, name: str, server: str) -> List[str]:
        return self.get_rp_backend_path(name) + ["server", server]

    def get_rp_backend_server_address_path(self, name: str, server: str, address: str) -> List[str]:
        return self.get_rp_backend_path(name) + ["server", server, "address", address]

    def get_rp_backend_server_port_path(self, name: str, server: str, port: str) -> List[str]:
        return self.get_rp_backend_path(name) + ["server", server, "port", port]

    def get_rp_backend_server_backup_path(self, name: str, server: str) -> List[str]:
        return self.get_rp_backend_path(name) + ["server", server, "backup"]

    def get_rp_backend_server_check_path(self, name: str, server: str) -> List[str]:
        return self.get_rp_backend_path(name) + ["server", server, "check"]

    def get_rp_backend_server_check_port_path(self, name: str, server: str, port: str) -> List[str]:
        return self.get_rp_backend_path(name) + ["server", server, "check", "port", port]

    def get_rp_backend_server_send_proxy_path(self, name: str, server: str) -> List[str]:
        return self.get_rp_backend_path(name) + ["server", server, "send-proxy"]

    def get_rp_backend_server_send_proxy_v2_path(self, name: str, server: str) -> List[str]:
        return self.get_rp_backend_path(name) + ["server", server, "send-proxy-v2"]

    # Backend Rules
    def get_rp_backend_rule_path(self, name: str, rule_id: str) -> List[str]:
        return self.get_rp_backend_path(name) + ["rule", rule_id]

    def get_rp_backend_rule_domain_name_path(self, name: str, rule_id: str, domain: str) -> List[str]:
        return self.get_rp_backend_path(name) + ["rule", rule_id, "domain-name", domain]

    def get_rp_backend_rule_wildcard_domain_path(self, name: str, rule_id: str, domain: str) -> List[str]:
        return self.get_rp_backend_path(name) + ["rule", rule_id, "wildcard-domain", domain]

    def get_rp_backend_rule_ssl_path(self, name: str, rule_id: str, value: str) -> List[str]:
        return self.get_rp_backend_path(name) + ["rule", rule_id, "ssl", value]

    def get_rp_backend_rule_url_path_begin_path(self, name: str, rule_id: str, url: str) -> List[str]:
        return self.get_rp_backend_path(name) + ["rule", rule_id, "url-path", "begin", url]

    def get_rp_backend_rule_url_path_end_path(self, name: str, rule_id: str, url: str) -> List[str]:
        return self.get_rp_backend_path(name) + ["rule", rule_id, "url-path", "end", url]

    def get_rp_backend_rule_url_path_exact_path(self, name: str, rule_id: str, url: str) -> List[str]:
        return self.get_rp_backend_path(name) + ["rule", rule_id, "url-path", "exact", url]

    def get_rp_backend_rule_set_redirect_location_path(self, name: str, rule_id: str, url: str) -> List[str]:
        return self.get_rp_backend_path(name) + ["rule", rule_id, "set", "redirect-location", url]

    def get_rp_backend_rule_set_server_path(self, name: str, rule_id: str, server: str) -> List[str]:
        return self.get_rp_backend_path(name) + ["rule", rule_id, "set", "server", server]

    def get_rp_backend_rule_url_path_path(self, name: str, rule_id: str) -> List[str]:
        return self.get_rp_backend_path(name) + ["rule", rule_id, "url-path"]

    def get_rp_backend_rule_set_path(self, name: str, rule_id: str) -> List[str]:
        return self.get_rp_backend_path(name) + ["rule", rule_id, "set"]

    # =========================================================================
    # Reverse Proxy — Service
    # =========================================================================

    def get_rp_service_path(self, name: str) -> List[str]:
        return self.get_rp_base() + ["service", name]

    def get_rp_service_description_path(self, name: str, value: str) -> List[str]:
        return self.get_rp_service_path(name) + ["description", value]

    def get_rp_service_mode_path(self, name: str, value: str) -> List[str]:
        return self.get_rp_service_path(name) + ["mode", value]

    def get_rp_service_port_path(self, name: str, port: str) -> List[str]:
        return self.get_rp_service_path(name) + ["port", port]

    def get_rp_service_backend_path(self, name: str, backend: str) -> List[str]:
        return self.get_rp_service_path(name) + ["backend", backend]

    def get_rp_service_redirect_http_to_https_path(self, name: str) -> List[str]:
        return self.get_rp_service_path(name) + ["redirect-http-to-https"]

    def get_rp_service_ssl_certificate_path(self, name: str, cert: str) -> List[str]:
        return self.get_rp_service_path(name) + ["ssl", "certificate", cert]

    def get_rp_service_ssl_path(self, name: str) -> List[str]:
        return self.get_rp_service_path(name) + ["ssl"]

    def get_rp_service_http_response_header_path(self, name: str, header: str, value: str) -> List[str]:
        return self.get_rp_service_path(name) + ["http-response-headers", header, "value", value]

    def get_rp_service_http_response_header_key_path(self, name: str, header: str) -> List[str]:
        return self.get_rp_service_path(name) + ["http-response-headers", header]

    def get_rp_service_logging_facility_level_path(self, name: str, facility: str, level: str) -> List[str]:
        return self.get_rp_service_path(name) + ["logging", "facility", facility, "level", level]

    def get_rp_service_logging_facility_path(self, name: str, facility: str) -> List[str]:
        return self.get_rp_service_path(name) + ["logging", "facility", facility]

    def get_rp_service_tcp_request_inspect_delay_path(self, name: str, value: str) -> List[str]:
        return self.get_rp_service_path(name) + ["tcp-request", "inspect-delay", value]

    def get_rp_service_tcp_request_path(self, name: str) -> List[str]:
        return self.get_rp_service_path(name) + ["tcp-request"]

    def get_rp_service_timeout_client_path(self, name: str, value: str) -> List[str]:
        return self.get_rp_service_path(name) + ["timeout", "client", value]

    def get_rp_service_timeout_path(self, name: str) -> List[str]:
        return self.get_rp_service_path(name) + ["timeout"]

    # Service listen-address: in 1.5 it's a tag node; in 1.4 it's multi
    def get_rp_service_listen_address_path(self, name: str, address: str) -> List[str]:
        return self.get_rp_service_path(name) + ["listen-address", address]

    def get_rp_service_listen_address_accept_proxy_path(self, name: str, address: str) -> List[str]:
        return self.get_rp_service_path(name) + ["listen-address", address, "accept-proxy"]

    # Service http-compression (1.5 only — path added in version mapper)
    def get_rp_service_http_compression_algorithm_path(self, name: str, value: str) -> List[str]:
        return self.get_rp_service_path(name) + ["http-compression", "algorithm", value]

    def get_rp_service_http_compression_mime_type_path(self, name: str, mime: str) -> List[str]:
        return self.get_rp_service_path(name) + ["http-compression", "mime-type", mime]

    def get_rp_service_http_compression_path(self, name: str) -> List[str]:
        return self.get_rp_service_path(name) + ["http-compression"]

    # Service Rules
    def get_rp_service_rule_path(self, name: str, rule_id: str) -> List[str]:
        return self.get_rp_service_path(name) + ["rule", rule_id]

    def get_rp_service_rule_domain_name_path(self, name: str, rule_id: str, domain: str) -> List[str]:
        return self.get_rp_service_path(name) + ["rule", rule_id, "domain-name", domain]

    def get_rp_service_rule_wildcard_domain_path(self, name: str, rule_id: str, domain: str) -> List[str]:
        return self.get_rp_service_path(name) + ["rule", rule_id, "wildcard-domain", domain]

    def get_rp_service_rule_ssl_path(self, name: str, rule_id: str, value: str) -> List[str]:
        return self.get_rp_service_path(name) + ["rule", rule_id, "ssl", value]

    def get_rp_service_rule_url_path_begin_path(self, name: str, rule_id: str, url: str) -> List[str]:
        return self.get_rp_service_path(name) + ["rule", rule_id, "url-path", "begin", url]

    def get_rp_service_rule_url_path_end_path(self, name: str, rule_id: str, url: str) -> List[str]:
        return self.get_rp_service_path(name) + ["rule", rule_id, "url-path", "end", url]

    def get_rp_service_rule_url_path_exact_path(self, name: str, rule_id: str, url: str) -> List[str]:
        return self.get_rp_service_path(name) + ["rule", rule_id, "url-path", "exact", url]

    def get_rp_service_rule_set_backend_path(self, name: str, rule_id: str, backend: str) -> List[str]:
        return self.get_rp_service_path(name) + ["rule", rule_id, "set", "backend", backend]

    def get_rp_service_rule_set_redirect_location_path(self, name: str, rule_id: str, url: str) -> List[str]:
        return self.get_rp_service_path(name) + ["rule", rule_id, "set", "redirect-location", url]

    def get_rp_service_rule_url_path_path(self, name: str, rule_id: str) -> List[str]:
        return self.get_rp_service_path(name) + ["rule", rule_id, "url-path"]

    def get_rp_service_rule_set_path(self, name: str, rule_id: str) -> List[str]:
        return self.get_rp_service_path(name) + ["rule", rule_id, "set"]

    # =========================================================================
    # WAN — Global Options
    # =========================================================================

    def get_wan_disable_source_nat_path(self) -> List[str]:
        return self.get_wan_base() + ["disable-source-nat"]

    def get_wan_enable_local_traffic_path(self) -> List[str]:
        return self.get_wan_base() + ["enable-local-traffic"]

    def get_wan_flush_connections_path(self) -> List[str]:
        return self.get_wan_base() + ["flush-connections"]

    def get_wan_hook_path(self, value: str) -> List[str]:
        return self.get_wan_base() + ["hook", value]

    def get_wan_sticky_connections_inbound_path(self) -> List[str]:
        return self.get_wan_base() + ["sticky-connections", "inbound"]

    def get_wan_sticky_connections_path(self) -> List[str]:
        return self.get_wan_base() + ["sticky-connections"]

    # =========================================================================
    # WAN — Interface Health
    # =========================================================================

    def get_wan_interface_health_path(self, iface: str) -> List[str]:
        return self.get_wan_base() + ["interface-health", iface]

    def get_wan_interface_health_nexthop_path(self, iface: str, nexthop: str) -> List[str]:
        return self.get_wan_base() + ["interface-health", iface, "nexthop", nexthop]

    def get_wan_interface_health_failure_count_path(self, iface: str, value: str) -> List[str]:
        return self.get_wan_base() + ["interface-health", iface, "failure-count", value]

    def get_wan_interface_health_success_count_path(self, iface: str, value: str) -> List[str]:
        return self.get_wan_base() + ["interface-health", iface, "success-count", value]

    def get_wan_interface_health_test_path(self, iface: str, test_id: str) -> List[str]:
        return self.get_wan_base() + ["interface-health", iface, "test", test_id]

    def get_wan_interface_health_test_type_path(self, iface: str, test_id: str, ttype: str) -> List[str]:
        return self.get_wan_base() + ["interface-health", iface, "test", test_id, "type", ttype]

    def get_wan_interface_health_test_target_path(self, iface: str, test_id: str, target: str) -> List[str]:
        return self.get_wan_base() + ["interface-health", iface, "test", test_id, "target", target]

    def get_wan_interface_health_test_resp_time_path(self, iface: str, test_id: str, value: str) -> List[str]:
        return self.get_wan_base() + ["interface-health", iface, "test", test_id, "resp-time", value]

    def get_wan_interface_health_test_ttl_limit_path(self, iface: str, test_id: str, value: str) -> List[str]:
        return self.get_wan_base() + ["interface-health", iface, "test", test_id, "ttl-limit", value]

    def get_wan_interface_health_test_script_path(self, iface: str, test_id: str, script: str) -> List[str]:
        return self.get_wan_base() + ["interface-health", iface, "test", test_id, "test-script", script]

    # =========================================================================
    # WAN — Rules
    # =========================================================================

    def get_wan_rule_path(self, rule_id: str) -> List[str]:
        return self.get_wan_base() + ["rule", rule_id]

    def get_wan_rule_description_path(self, rule_id: str, value: str) -> List[str]:
        return self.get_wan_base() + ["rule", rule_id, "description", value]

    def get_wan_rule_inbound_interface_path(self, rule_id: str, iface: str) -> List[str]:
        return self.get_wan_base() + ["rule", rule_id, "inbound-interface", iface]

    def get_wan_rule_exclude_path(self, rule_id: str) -> List[str]:
        return self.get_wan_base() + ["rule", rule_id, "exclude"]

    def get_wan_rule_failover_path(self, rule_id: str) -> List[str]:
        return self.get_wan_base() + ["rule", rule_id, "failover"]

    def get_wan_rule_per_packet_balancing_path(self, rule_id: str) -> List[str]:
        return self.get_wan_base() + ["rule", rule_id, "per-packet-balancing"]

    def get_wan_rule_protocol_path(self, rule_id: str, proto: str) -> List[str]:
        return self.get_wan_base() + ["rule", rule_id, "protocol", proto]

    def get_wan_rule_interface_path(self, rule_id: str, iface: str) -> List[str]:
        return self.get_wan_base() + ["rule", rule_id, "interface", iface]

    def get_wan_rule_interface_weight_path(self, rule_id: str, iface: str, weight: str) -> List[str]:
        return self.get_wan_base() + ["rule", rule_id, "interface", iface, "weight", weight]

    def get_wan_rule_limit_burst_path(self, rule_id: str, value: str) -> List[str]:
        return self.get_wan_base() + ["rule", rule_id, "limit", "burst", value]

    def get_wan_rule_limit_period_path(self, rule_id: str, value: str) -> List[str]:
        return self.get_wan_base() + ["rule", rule_id, "limit", "period", value]

    def get_wan_rule_limit_rate_path(self, rule_id: str, value: str) -> List[str]:
        return self.get_wan_base() + ["rule", rule_id, "limit", "rate", value]

    def get_wan_rule_limit_threshold_path(self, rule_id: str, value: str) -> List[str]:
        return self.get_wan_base() + ["rule", rule_id, "limit", "threshold", value]

    def get_wan_rule_limit_path(self, rule_id: str) -> List[str]:
        return self.get_wan_base() + ["rule", rule_id, "limit"]

    def get_wan_rule_source_address_path(self, rule_id: str, address: str) -> List[str]:
        return self.get_wan_base() + ["rule", rule_id, "source", "address", address]

    def get_wan_rule_source_port_path(self, rule_id: str, port: str) -> List[str]:
        return self.get_wan_base() + ["rule", rule_id, "source", "port", port]

    def get_wan_rule_source_path(self, rule_id: str) -> List[str]:
        return self.get_wan_base() + ["rule", rule_id, "source"]

    def get_wan_rule_destination_address_path(self, rule_id: str, address: str) -> List[str]:
        return self.get_wan_base() + ["rule", rule_id, "destination", "address", address]

    def get_wan_rule_destination_port_path(self, rule_id: str, port: str) -> List[str]:
        return self.get_wan_base() + ["rule", rule_id, "destination", "port", port]

    def get_wan_rule_destination_path(self, rule_id: str) -> List[str]:
        return self.get_wan_base() + ["rule", rule_id, "destination"]

    # WAN Rule — source/destination groups (1.5 only, but paths defined here)
    def get_wan_rule_source_group_address_path(self, rule_id: str, grp: str) -> List[str]:
        return self.get_wan_base() + ["rule", rule_id, "source", "group", "address-group", grp]

    def get_wan_rule_source_group_network_path(self, rule_id: str, grp: str) -> List[str]:
        return self.get_wan_base() + ["rule", rule_id, "source", "group", "network-group", grp]

    def get_wan_rule_source_group_domain_path(self, rule_id: str, grp: str) -> List[str]:
        return self.get_wan_base() + ["rule", rule_id, "source", "group", "domain-group", grp]

    def get_wan_rule_source_group_port_path(self, rule_id: str, grp: str) -> List[str]:
        return self.get_wan_base() + ["rule", rule_id, "source", "group", "port-group", grp]

    def get_wan_rule_destination_group_address_path(self, rule_id: str, grp: str) -> List[str]:
        return self.get_wan_base() + ["rule", rule_id, "destination", "group", "address-group", grp]

    def get_wan_rule_destination_group_network_path(self, rule_id: str, grp: str) -> List[str]:
        return self.get_wan_base() + ["rule", rule_id, "destination", "group", "network-group", grp]

    def get_wan_rule_destination_group_domain_path(self, rule_id: str, grp: str) -> List[str]:
        return self.get_wan_base() + ["rule", rule_id, "destination", "group", "domain-group", grp]

    def get_wan_rule_destination_group_port_path(self, rule_id: str, grp: str) -> List[str]:
        return self.get_wan_base() + ["rule", rule_id, "destination", "group", "port-group", grp]

    # =========================================================================
    # Config Parsing
    # =========================================================================

    def parse_config(self, full_config: Dict[str, Any]) -> Dict[str, Any]:
        lb_config = full_config.get("load-balancing", {})
        return {
            "reverse_proxy": self._parse_reverse_proxy(lb_config.get(self._rp_key, {})),
            "wan": self._parse_wan(lb_config.get("wan", {})),
        }

    def _parse_reverse_proxy(self, rp: Dict[str, Any]) -> Dict[str, Any]:
        global_params = rp.get("global-parameters", {})
        timeout = rp.get("timeout", {})

        # Parse logging facilities
        def parse_logging(log_cfg: Dict) -> Dict[str, Optional[str]]:
            result = {}
            for fac, fac_cfg in log_cfg.get("facility", {}).items():
                level = fac_cfg.get("level") if isinstance(fac_cfg, dict) else None
                result[fac] = {"level": level}
            return result

        ssl_ciphers = global_params.get("ssl-bind-ciphers", [])
        if isinstance(ssl_ciphers, str):
            ssl_ciphers = [ssl_ciphers]

        return {
            "global_parameters": {
                "max_connections": global_params.get("max-connections"),
                "ssl_bind_ciphers": ssl_ciphers,
                "tls_version_min": global_params.get("tls-version-min"),
                "logging": parse_logging(global_params.get("logging", {})),
            },
            "timeout": {
                "check": timeout.get("check"),
                "client": timeout.get("client"),
                "connect": timeout.get("connect"),
                "server": timeout.get("server"),
            },
            "vrf": rp.get("vrf"),
            "backends": self._parse_backends(rp.get("backend", {})),
            "services": self._parse_services(rp.get("service", {})),
        }

    def _parse_backends(self, backends_cfg: Dict[str, Any]) -> List[Dict[str, Any]]:
        result = []
        for name, cfg in backends_cfg.items():
            if not isinstance(cfg, dict):
                cfg = {}

            http_check_cfg = cfg.get("http-check", {}) or {}
            expect_cfg = http_check_cfg.get("expect", {}) or {}
            ssl_cfg = cfg.get("ssl", {}) or {}
            timeout_cfg = cfg.get("timeout", {}) or {}

            # Parse http-response-headers
            headers = {}
            for hdr, hdr_cfg in (cfg.get("http-response-headers") or {}).items():
                headers[hdr] = hdr_cfg.get("value") if isinstance(hdr_cfg, dict) else None

            result.append({
                "name": name,
                "description": cfg.get("description"),
                "balance": cfg.get("balance"),
                "mode": cfg.get("mode"),
                "health_check": cfg.get("health-check"),
                "http_check": {
                    "method": http_check_cfg.get("method"),
                    "uri": http_check_cfg.get("uri"),
                    "expect": {
                        "status": expect_cfg.get("status"),
                        "string": expect_cfg.get("string"),
                    },
                } if http_check_cfg else None,
                "http_response_headers": headers,
                "logging": self._parse_logging_dict(cfg.get("logging", {})),
                "ssl": {
                    "ca_certificate": ssl_cfg.get("ca-certificate"),
                    "no_verify": "no-verify" in ssl_cfg,
                } if ssl_cfg else None,
                "timeout": {
                    "check": timeout_cfg.get("check"),
                    "connect": timeout_cfg.get("connect"),
                    "server": timeout_cfg.get("server"),
                },
                "servers": self._parse_backend_servers(cfg.get("server", {})),
                "rules": self._parse_rules(cfg.get("rule", {}), is_service=False),
            })
        return result

    def _parse_backend_servers(self, servers_cfg: Dict[str, Any]) -> List[Dict[str, Any]]:
        result = []
        for name, cfg in servers_cfg.items():
            if not isinstance(cfg, dict):
                cfg = {}
            check_cfg = cfg.get("check", {}) or {}
            result.append({
                "name": name,
                "address": cfg.get("address"),
                "port": cfg.get("port"),
                "backup": "backup" in cfg,
                "check": "check" in cfg,
                "check_port": check_cfg.get("port") if isinstance(check_cfg, dict) else None,
                "send_proxy": "send-proxy" in cfg,
                "send_proxy_v2": "send-proxy-v2" in cfg,
            })
        return result

    def _parse_rules(self, rules_cfg: Dict[str, Any], is_service: bool) -> List[Dict[str, Any]]:
        result = []
        for rule_id, cfg in sorted(rules_cfg.items(), key=lambda x: int(x[0]) if x[0].isdigit() else 0):
            if not isinstance(cfg, dict):
                cfg = {}

            url_path_cfg = cfg.get("url-path", {}) or {}
            set_cfg = cfg.get("set", {}) or {}

            def to_list(val):
                if val is None:
                    return []
                if isinstance(val, str):
                    return [val]
                return list(val) if isinstance(val, (list, dict)) else []

            domain_names = to_list(cfg.get("domain-name"))
            wildcard_domains = to_list(cfg.get("wildcard-domain"))

            entry = {
                "rule_id": rule_id,
                "domain_name": domain_names,
                "wildcard_domain": wildcard_domains,
                "ssl": cfg.get("ssl"),
                "url_path": {
                    "begin": to_list(url_path_cfg.get("begin")),
                    "end": to_list(url_path_cfg.get("end")),
                    "exact": to_list(url_path_cfg.get("exact")),
                },
                "set": {
                    "redirect_location": set_cfg.get("redirect-location"),
                },
            }
            if is_service:
                entry["set"]["backend"] = set_cfg.get("backend")
            else:
                entry["set"]["server"] = set_cfg.get("server")

            result.append(entry)
        return result

    def _parse_services(self, services_cfg: Dict[str, Any]) -> List[Dict[str, Any]]:
        result = []
        for name, cfg in services_cfg.items():
            if not isinstance(cfg, dict):
                cfg = {}

            ssl_cfg = cfg.get("ssl", {}) or {}
            certs = ssl_cfg.get("certificate", [])
            if isinstance(certs, str):
                certs = [certs]

            timeout_cfg = cfg.get("timeout", {}) or {}
            tcp_request_cfg = cfg.get("tcp-request", {}) or {}
            http_compression_cfg = cfg.get("http-compression", {}) or {}

            # Parse listen-address: could be tag node (1.5) or multi (1.4)
            listen_addresses = []
            la_raw = cfg.get("listen-address", {})
            if isinstance(la_raw, dict):
                for addr, la_cfg in la_raw.items():
                    accept_proxy = isinstance(la_cfg, dict) and "accept-proxy" in la_cfg
                    listen_addresses.append({"address": addr, "accept_proxy": accept_proxy})
            elif isinstance(la_raw, list):
                for addr in la_raw:
                    listen_addresses.append({"address": addr, "accept_proxy": False})
            elif isinstance(la_raw, str):
                listen_addresses.append({"address": la_raw, "accept_proxy": False})

            # Parse backends (multi list or single string)
            backends_raw = cfg.get("backend", [])
            if isinstance(backends_raw, str):
                backends_raw = [backends_raw]
            elif isinstance(backends_raw, dict):
                backends_raw = list(backends_raw.keys())

            # Parse http-response-headers
            headers = {}
            for hdr, hdr_cfg in (cfg.get("http-response-headers") or {}).items():
                headers[hdr] = hdr_cfg.get("value") if isinstance(hdr_cfg, dict) else None

            mime_types = http_compression_cfg.get("mime-type", [])
            if isinstance(mime_types, str):
                mime_types = [mime_types]

            result.append({
                "name": name,
                "description": cfg.get("description"),
                "mode": cfg.get("mode"),
                "port": cfg.get("port"),
                "listen_addresses": listen_addresses,
                "backends": backends_raw,
                "redirect_http_to_https": "redirect-http-to-https" in cfg,
                "ssl": {
                    "certificates": certs,
                } if ssl_cfg else None,
                "http_compression": {
                    "algorithm": http_compression_cfg.get("algorithm"),
                    "mime_types": mime_types,
                } if http_compression_cfg else None,
                "http_response_headers": headers,
                "logging": self._parse_logging_dict(cfg.get("logging", {})),
                "tcp_request": {
                    "inspect_delay": tcp_request_cfg.get("inspect-delay"),
                } if tcp_request_cfg else None,
                "timeout": {
                    "client": timeout_cfg.get("client"),
                },
                "rules": self._parse_rules(cfg.get("rule", {}), is_service=True),
            })
        return result

    def _parse_logging_dict(self, log_cfg: Dict) -> Dict[str, Any]:
        result = {}
        for fac, fac_cfg in (log_cfg.get("facility") or {}).items():
            result[fac] = {"level": fac_cfg.get("level") if isinstance(fac_cfg, dict) else None}
        return result

    def _parse_wan(self, wan: Dict[str, Any]) -> Dict[str, Any]:
        sticky = wan.get("sticky-connections", {}) or {}
        return {
            "disable_source_nat": "disable-source-nat" in wan,
            "enable_local_traffic": "enable-local-traffic" in wan,
            "flush_connections": "flush-connections" in wan,
            "hook": wan.get("hook"),
            "sticky_connections": {
                "inbound": "inbound" in sticky,
            },
            "interface_health": self._parse_interface_health(wan.get("interface-health", {})),
            "rules": self._parse_wan_rules(wan.get("rule", {})),
        }

    def _parse_interface_health(self, ih_cfg: Dict[str, Any]) -> List[Dict[str, Any]]:
        result = []
        for iface, cfg in ih_cfg.items():
            if not isinstance(cfg, dict):
                cfg = {}
            tests = []
            for test_id, test_cfg in sorted(
                (cfg.get("test") or {}).items(),
                key=lambda x: int(x[0]) if x[0].isdigit() else 0,
            ):
                if not isinstance(test_cfg, dict):
                    test_cfg = {}
                tests.append({
                    "test_id": test_id,
                    "type": test_cfg.get("type"),
                    "target": test_cfg.get("target"),
                    "resp_time": test_cfg.get("resp-time"),
                    "ttl_limit": test_cfg.get("ttl-limit"),
                    "test_script": test_cfg.get("test-script"),
                })
            result.append({
                "interface": iface,
                "nexthop": cfg.get("nexthop"),
                "failure_count": cfg.get("failure-count"),
                "success_count": cfg.get("success-count"),
                "tests": tests,
            })
        return result

    def _parse_wan_rules(self, rules_cfg: Dict[str, Any]) -> List[Dict[str, Any]]:
        result = []
        for rule_id, cfg in sorted(rules_cfg.items(), key=lambda x: int(x[0]) if x[0].isdigit() else 0):
            if not isinstance(cfg, dict):
                cfg = {}

            # Parse outbound interfaces
            interfaces = []
            for iface, iface_cfg in (cfg.get("interface") or {}).items():
                weight = None
                if isinstance(iface_cfg, dict):
                    weight = iface_cfg.get("weight")
                interfaces.append({"interface": iface, "weight": weight})

            limit_cfg = cfg.get("limit", {}) or {}
            src_cfg = cfg.get("source", {}) or {}
            dst_cfg = cfg.get("destination", {}) or {}
            src_grp = src_cfg.get("group", {}) or {}
            dst_grp = dst_cfg.get("group", {}) or {}

            result.append({
                "rule_id": rule_id,
                "description": cfg.get("description"),
                "inbound_interface": cfg.get("inbound-interface"),
                "exclude": "exclude" in cfg,
                "failover": "failover" in cfg,
                "per_packet_balancing": "per-packet-balancing" in cfg,
                "protocol": cfg.get("protocol"),
                "interfaces": interfaces,
                "limit": {
                    "burst": limit_cfg.get("burst"),
                    "period": limit_cfg.get("period"),
                    "rate": limit_cfg.get("rate"),
                    "threshold": limit_cfg.get("threshold"),
                } if limit_cfg else None,
                "source": {
                    "address": src_cfg.get("address"),
                    "port": src_cfg.get("port"),
                    "group": {
                        "address_group": src_grp.get("address-group"),
                        "network_group": src_grp.get("network-group"),
                        "domain_group": src_grp.get("domain-group"),
                        "port_group": src_grp.get("port-group"),
                    } if src_grp else None,
                } if src_cfg else None,
                "destination": {
                    "address": dst_cfg.get("address"),
                    "port": dst_cfg.get("port"),
                    "group": {
                        "address_group": dst_grp.get("address-group"),
                        "network_group": dst_grp.get("network-group"),
                        "domain_group": dst_grp.get("domain-group"),
                        "port_group": dst_grp.get("port-group"),
                    } if dst_grp else None,
                } if dst_cfg else None,
            })
        return result
