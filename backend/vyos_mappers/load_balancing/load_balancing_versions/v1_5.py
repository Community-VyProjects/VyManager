"""VyOS 1.5 load-balancing mapper.

1.5 uses ``haproxy`` where 1.4 uses ``reverse-proxy``, and it owns leaves
1.4 does not have. Path methods do not re-check the node: the builder
already called ``require_node``.
"""

from typing import List

from ..load_balancing import LoadBalancingMapper


class LoadBalancingMapperV1_5(LoadBalancingMapper):
    """VyOS 1.5 load-balancing mapper."""

    _rp_key = "haproxy"

    def get_rp_timeout_base(self) -> List[str]:
        return self.get_rp_base() + ["timeout"]

    def get_rp_timeout_check_path(self, value: str) -> List[str]:
        return self.get_rp_timeout_base() + ["check", value]

    def get_rp_timeout_check_delete_path(self) -> List[str]:
        return self.get_rp_timeout_base() + ["check"]

    def get_rp_timeout_client_path(self, value: str) -> List[str]:
        return self.get_rp_timeout_base() + ["client", value]

    def get_rp_timeout_client_delete_path(self) -> List[str]:
        return self.get_rp_timeout_base() + ["client"]

    def get_rp_timeout_connect_path(self, value: str) -> List[str]:
        return self.get_rp_timeout_base() + ["connect", value]

    def get_rp_timeout_connect_delete_path(self) -> List[str]:
        return self.get_rp_timeout_base() + ["connect"]

    def get_rp_timeout_server_path(self, value: str) -> List[str]:
        return self.get_rp_timeout_base() + ["server", value]

    def get_rp_timeout_server_delete_path(self) -> List[str]:
        return self.get_rp_timeout_base() + ["server"]

    def get_rp_backend_server_check_port_path(self, name: str, server: str, port: str) -> List[str]:
        return self.get_rp_backend_path(name) + ["server", server, "check", "port", port]

    def get_rp_backend_server_check_port_delete_path(self, name: str, server: str) -> List[str]:
        return self.get_rp_backend_path(name) + ["server", server, "check", "port"]

    def get_rp_backend_rule_wildcard_domain_path(self, name: str, rule_id: str) -> List[str]:
        return self.get_rp_backend_path(name) + ["rule", rule_id, "wildcard-domain"]

    def get_rp_service_timeout_client_path(self, name: str, value: str) -> List[str]:
        return self.get_rp_service_path(name) + ["timeout", "client", value]

    def get_rp_service_timeout_path(self, name: str) -> List[str]:
        return self.get_rp_service_path(name) + ["timeout"]

    def get_rp_service_listen_address_accept_proxy_path(self, name: str, address: str) -> List[str]:
        return self.get_rp_service_path(name) + ["listen-address", address, "accept-proxy"]

    def get_rp_service_http_compression_algorithm_path(self, name: str, value: str) -> List[str]:
        return self.get_rp_service_path(name) + ["http-compression", "algorithm", value]

    def get_rp_service_http_compression_algorithm_delete_path(self, name: str) -> List[str]:
        return self.get_rp_service_path(name) + ["http-compression", "algorithm"]

    def get_rp_service_http_compression_mime_type_path(self, name: str, mime: str) -> List[str]:
        return self.get_rp_service_path(name) + ["http-compression", "mime-type", mime]

    def get_rp_service_http_compression_path(self, name: str) -> List[str]:
        return self.get_rp_service_path(name) + ["http-compression"]

    def get_rp_service_rule_wildcard_domain_path(self, name: str, rule_id: str) -> List[str]:
        return self.get_rp_service_path(name) + ["rule", rule_id, "wildcard-domain"]

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

    def get_wan_rule_source_group_delete_path(self, rule_id: str) -> List[str]:
        return self.get_wan_rule_source_path(rule_id) + ["group"]

    def get_wan_rule_destination_group_delete_path(self, rule_id: str) -> List[str]:
        return self.get_wan_rule_destination_path(rule_id) + ["group"]
