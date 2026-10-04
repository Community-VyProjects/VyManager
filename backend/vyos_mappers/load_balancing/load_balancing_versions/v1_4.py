_WAN_RULE_GROUPS_UNSUPPORTED = "WAN rule groups are not supported on this device"


def _unsupported(node: str) -> None:
    raise ValueError(f"{node} is not supported on this device")


class LoadBalancingMapperV1_4:
    """
    VyOS 1.4 specific overrides for load-balancing.

    Key differences vs 1.5:
    - Uses 'reverse-proxy' instead of 'haproxy' (handled in base mapper via _rp_key)
    - No http-compression on services
    - listen-address is a multi node (list of IPs, no accept-proxy sub-option)
    - No server check port on backends
    - No wildcard-domain on rules
    - Log facility allows extra values: all, authpriv, mark
    - Log level allows extra value: all
    - No source/destination group matching on WAN rules
    """

    def supports_http_compression(self) -> bool:
        return False

    def supports_server_check_port(self) -> bool:
        return False

    def supports_listen_address_accept_proxy(self) -> bool:
        return False

    def supports_wildcard_domain(self) -> bool:
        return False

    def supports_wan_rule_groups(self) -> bool:
        return False

    def get_rp_service_http_compression_path(self, name: str):
        _unsupported("http-compression")

    def get_rp_service_http_compression_algorithm_path(self, name: str, value: str):
        _unsupported("http-compression")

    def get_rp_service_http_compression_mime_type_path(self, name: str, mime: str):
        _unsupported("http-compression")

    def get_rp_backend_server_check_port_path(self, name: str, server: str, port: str):
        _unsupported("server check port")

    def get_rp_backend_server_check_port_delete_path(self, name: str, server: str):
        _unsupported("server check port")

    def get_rp_service_listen_address_accept_proxy_path(self, name: str, address: str):
        _unsupported("listen-address accept-proxy")

    def get_rp_backend_rule_wildcard_domain_path(self, name: str, rule_id: str):
        _unsupported("wildcard-domain")

    def get_rp_service_rule_wildcard_domain_path(self, name: str, rule_id: str):
        _unsupported("wildcard-domain")

    def get_wan_rule_source_group_address_path(self, rule_id: str, grp: str):
        raise ValueError(_WAN_RULE_GROUPS_UNSUPPORTED)

    def get_wan_rule_source_group_network_path(self, rule_id: str, grp: str):
        raise ValueError(_WAN_RULE_GROUPS_UNSUPPORTED)

    def get_wan_rule_source_group_domain_path(self, rule_id: str, grp: str):
        raise ValueError(_WAN_RULE_GROUPS_UNSUPPORTED)

    def get_wan_rule_source_group_port_path(self, rule_id: str, grp: str):
        raise ValueError(_WAN_RULE_GROUPS_UNSUPPORTED)

    def get_wan_rule_destination_group_address_path(self, rule_id: str, grp: str):
        raise ValueError(_WAN_RULE_GROUPS_UNSUPPORTED)

    def get_wan_rule_destination_group_network_path(self, rule_id: str, grp: str):
        raise ValueError(_WAN_RULE_GROUPS_UNSUPPORTED)

    def get_wan_rule_destination_group_domain_path(self, rule_id: str, grp: str):
        raise ValueError(_WAN_RULE_GROUPS_UNSUPPORTED)

    def get_wan_rule_destination_group_port_path(self, rule_id: str, grp: str):
        raise ValueError(_WAN_RULE_GROUPS_UNSUPPORTED)
