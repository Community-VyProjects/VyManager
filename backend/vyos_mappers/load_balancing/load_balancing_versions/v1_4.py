_WAN_RULE_GROUPS_UNSUPPORTED = "WAN rule groups are not supported on this device"


class LoadBalancingMapperV1_4:
    """
    VyOS 1.4 specific overrides for load-balancing.

    Key differences vs 1.5:
    - Uses 'reverse-proxy' instead of 'haproxy' (handled in base mapper via _rp_key)
    - No http-compression on services
    - listen-address is a multi node (list of IPs, no accept-proxy sub-option)
    - No server check port on backends
    - No wildcard-domain in backend rules
    - Log facility allows extra values: all, authpriv, mark
    - Log level allows extra value: all
    - No source/destination group matching on WAN rules
    """

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
