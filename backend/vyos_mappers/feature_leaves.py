"""Leaves the global feature builders do not already expose.

PathPrefixMapper adds ``vrf name <vrf>`` when the VRF builder queues one of
these through the feature builder. They are not mixed into the live DHCP
mapper classes, because several names already exist there with a different
signature.
"""
from typing import FrozenSet, List

# Lab-checked 1.5 nodes. A caller-supplied name is not a path segment.
DHCP_OPTIONS: FrozenSet[str] = frozenset({
    "default-router", "domain-name", "name-server", "domain-search", "ntp-server",
    "pop-server", "smtp-server", "time-server", "wins-server", "server-identifier",
    "bootfile-name", "bootfile-server", "bootfile-size", "tftp-server-name",
    "time-zone", "time-offset", "client-prefix-length", "captive-portal",
    "capwap-controller", "interface-mtu", "ipv6-only-preferred", "wpad-url",
})
DHCPV6_OPTIONS: FrozenSet[str] = frozenset({
    "name-server", "domain-search", "captive-portal", "capwap-controller",
    "info-refresh-time", "nis-domain", "nis-server", "nisplus-domain",
    "nisplus-server", "sip-server", "sntp-server",
})
DDNS_FIELDS: FrozenSet[str] = frozenset({
    "send-updates", "conflict-resolution", "ttl-percent", "update-on-renew",
    "generated-prefix", "qualifying-suffix", "replace-client-name",
    "override-client-update", "override-no-update",
    "hostname-char-set", "hostname-char-replacement",
})


def _known(name: str, allowed: FrozenSet[str], kind: str) -> str:
    if name not in allowed:
        raise ValueError(f"unsupported {kind}: {name}")
    return name

class StaticExtraLeaves:

    def get_root_delete(self) -> List[str]:
        return ['protocols', 'static']

    def get_route_interface_segments_delete(self, a0, a1) -> List[str]:
        return ['protocols', 'static', 'route', a0, 'interface', a1, 'segments']

    def get_route_next_hop_segments_delete(self, a0, a1) -> List[str]:
        return ['protocols', 'static', 'route', a0, 'next-hop', a1, 'segments']

    def get_route_interface_segments(self, a0, a1, a2) -> List[str]:
        return ['protocols', 'static', 'route', a0, 'interface', a1, 'segments', a2]

    def get_route_next_hop_segments(self, a0, a1, a2) -> List[str]:
        return ['protocols', 'static', 'route', a0, 'next-hop', a1, 'segments', a2]

class FailoverExtraLeaves:

    def get_root_delete(self) -> List[str]:
        return ['protocols', 'failover']

class DhcpExtraLeaves:

    def get_root_delete(self) -> List[str]:
        return ['service', 'dhcp-server']

    def get_client_class_relay_agent_information_circuit_id_delete(self, a0) -> List[str]:
        return ['service', 'dhcp-server', 'client-class', a0, 'relay-agent-information', 'circuit-id']

    def get_client_class_relay_agent_information_remote_id_delete(self, a0) -> List[str]:
        return ['service', 'dhcp-server', 'client-class', a0, 'relay-agent-information', 'remote-id']

    def get_ddns_domain_dns_server_address_delete(self, a0, a1, a2) -> List[str]:
        return ['service', 'dhcp-server', 'dynamic-dns-update', a0, a1, 'dns-server', a2, 'address']

    def get_ddns_domain_dns_server_port_delete(self, a0, a1, a2) -> List[str]:
        return ['service', 'dhcp-server', 'dynamic-dns-update', a0, a1, 'dns-server', a2, 'port']

    def get_ddns_domain_key_name_delete(self, a0, a1) -> List[str]:
        return ['service', 'dhcp-server', 'dynamic-dns-update', a0, a1, 'key-name']

    def get_ddns_field_delete(self, a0) -> List[str]:
        return ['service', 'dhcp-server', 'dynamic-dns-update', _known(a0, DDNS_FIELDS, "dynamic-dns-update field")]

    def get_dynamic_dns_update_dns_server_delete(self) -> List[str]:
        return ['service', 'dhcp-server', 'dynamic-dns-update', 'dns-server']

    def get_dynamic_dns_update_domain_name_delete(self) -> List[str]:
        return ['service', 'dhcp-server', 'dynamic-dns-update', 'domain-name']

    def get_dynamic_dns_update_enable_delete(self) -> List[str]:
        raise ValueError("dynamic-dns-update has no enable leaf on this device")

    def get_global_parameters_delete(self, a0) -> List[str]:
        return ['service', 'dhcp-server', 'global-parameters', a0]

    def get_shared_network_ddns_field_delete(self, a0, a1) -> List[str]:
        return ['service', 'dhcp-server', 'shared-network-name', a0, 'dynamic-dns-update', _known(a1, DDNS_FIELDS, "dynamic-dns-update field")]

    def get_shared_network_domain_search_delete(self, a0, a1) -> List[str]:
        return ['service', 'dhcp-server', 'shared-network-name', a0, 'domain-search', a1]

    def get_shared_network_ntp_server_delete(self, a0, a1) -> List[str]:
        return ['service', 'dhcp-server', 'shared-network-name', a0, 'option', 'ntp-server', a1]

    def get_shared_network_option_delete(self, a0, a1) -> List[str]:
        return ['service', 'dhcp-server', 'shared-network-name', a0, 'option', _known(a1, DHCP_OPTIONS, "option")]

    def get_shared_network_option_bootfile_name_delete(self, a0) -> List[str]:
        return ['service', 'dhcp-server', 'shared-network-name', a0, 'option', 'bootfile-name']

    def get_shared_network_option_bootfile_server_delete(self, a0) -> List[str]:
        return ['service', 'dhcp-server', 'shared-network-name', a0, 'option', 'bootfile-server']

    def get_shared_network_option_bootfile_size_delete(self, a0) -> List[str]:
        return ['service', 'dhcp-server', 'shared-network-name', a0, 'option', 'bootfile-size']

    def get_shared_network_option_client_prefix_length_delete(self, a0) -> List[str]:
        return ['service', 'dhcp-server', 'shared-network-name', a0, 'option', 'client-prefix-length']

    def get_shared_network_option_default_router_delete(self, a0) -> List[str]:
        return ['service', 'dhcp-server', 'shared-network-name', a0, 'option', 'default-router']

    def get_shared_network_option_domain_name_delete(self, a0) -> List[str]:
        return ['service', 'dhcp-server', 'shared-network-name', a0, 'option', 'domain-name']

    def get_shared_network_option_domain_search_delete(self, a0, a1) -> List[str]:
        return ['service', 'dhcp-server', 'shared-network-name', a0, 'option', 'domain-search', a1]

    def get_shared_network_option_ip_forwarding_delete(self, a0) -> List[str]:
        return ['service', 'dhcp-server', 'shared-network-name', a0, 'option', 'ip-forwarding']

    def get_shared_network_option_name_server_delete(self, a0, a1) -> List[str]:
        return ['service', 'dhcp-server', 'shared-network-name', a0, 'option', 'name-server', a1]

    def get_shared_network_option_ntp_server_delete(self, a0, a1) -> List[str]:
        return ['service', 'dhcp-server', 'shared-network-name', a0, 'option', 'ntp-server', a1]

    def get_shared_network_option_pop_server_delete(self, a0, a1) -> List[str]:
        return ['service', 'dhcp-server', 'shared-network-name', a0, 'option', 'pop-server', a1]

    def get_shared_network_option_smtp_server_delete(self, a0, a1) -> List[str]:
        return ['service', 'dhcp-server', 'shared-network-name', a0, 'option', 'smtp-server', a1]

    def get_shared_network_option_static_route_delete(self, a0) -> List[str]:
        return ['service', 'dhcp-server', 'shared-network-name', a0, 'option', 'static-route']

    def get_shared_network_option_static_route_next_hop_delete(self, a0, a1) -> List[str]:
        return ['service', 'dhcp-server', 'shared-network-name', a0, 'option', 'static-route', a1]

    def get_shared_network_option_tftp_server_name_delete(self, a0) -> List[str]:
        return ['service', 'dhcp-server', 'shared-network-name', a0, 'option', 'tftp-server-name']

    def get_shared_network_option_time_offset_delete(self, a0) -> List[str]:
        return ['service', 'dhcp-server', 'shared-network-name', a0, 'option', 'time-offset']

    def get_shared_network_option_time_server_delete(self, a0, a1) -> List[str]:
        return ['service', 'dhcp-server', 'shared-network-name', a0, 'option', 'time-server', a1]

    def get_shared_network_option_time_zone_delete(self, a0) -> List[str]:
        return ['service', 'dhcp-server', 'shared-network-name', a0, 'option', 'time-zone']

    def get_shared_network_option_unifi_controller_delete(self, a0) -> List[str]:
        return ['service', 'dhcp-server', 'shared-network-name', a0, 'option', 'vendor-option', 'ubiquiti', 'unifi-controller']

    def get_shared_network_option_vendor_option_delete(self, a0) -> List[str]:
        return ['service', 'dhcp-server', 'shared-network-name', a0, 'option', 'vendor-option']

    def get_shared_network_option_wins_server_delete(self, a0, a1) -> List[str]:
        return ['service', 'dhcp-server', 'shared-network-name', a0, 'option', 'wins-server', a1]

    def get_shared_network_option_wpad_url_delete(self, a0) -> List[str]:
        return ['service', 'dhcp-server', 'shared-network-name', a0, 'option', 'wpad-url']

    def get_static_mapping_option_delete(self, a0, a1, a2, a3) -> List[str]:
        return ['service', 'dhcp-server', 'shared-network-name', a0, 'subnet', a1, 'static-mapping', a2, 'option', _known(a3, DHCP_OPTIONS, "option")]

    def get_static_mapping_option_bootfile_name_delete(self, a0, a1, a2) -> List[str]:
        return ['service', 'dhcp-server', 'shared-network-name', a0, 'subnet', a1, 'static-mapping', a2, 'option', 'bootfile-name']

    def get_static_mapping_option_bootfile_server_delete(self, a0, a1, a2) -> List[str]:
        return ['service', 'dhcp-server', 'shared-network-name', a0, 'subnet', a1, 'static-mapping', a2, 'option', 'bootfile-server']

    def get_static_mapping_option_bootfile_size_delete(self, a0, a1, a2) -> List[str]:
        return ['service', 'dhcp-server', 'shared-network-name', a0, 'subnet', a1, 'static-mapping', a2, 'option', 'bootfile-size']

    def get_static_mapping_option_client_prefix_length_delete(self, a0, a1, a2) -> List[str]:
        return ['service', 'dhcp-server', 'shared-network-name', a0, 'subnet', a1, 'static-mapping', a2, 'option', 'client-prefix-length']

    def get_static_mapping_option_default_router_delete(self, a0, a1, a2) -> List[str]:
        return ['service', 'dhcp-server', 'shared-network-name', a0, 'subnet', a1, 'static-mapping', a2, 'option', 'default-router']

    def get_static_mapping_option_domain_name_delete(self, a0, a1, a2) -> List[str]:
        return ['service', 'dhcp-server', 'shared-network-name', a0, 'subnet', a1, 'static-mapping', a2, 'option', 'domain-name']

    def get_static_mapping_option_domain_search_delete(self, a0, a1, a2, a3) -> List[str]:
        return ['service', 'dhcp-server', 'shared-network-name', a0, 'subnet', a1, 'static-mapping', a2, 'option', 'domain-search', a3]

    def get_static_mapping_option_ip_forwarding_delete(self, a0, a1, a2) -> List[str]:
        return ['service', 'dhcp-server', 'shared-network-name', a0, 'subnet', a1, 'static-mapping', a2, 'option', 'ip-forwarding']

    def get_static_mapping_option_name_server_delete(self, a0, a1, a2, a3) -> List[str]:
        return ['service', 'dhcp-server', 'shared-network-name', a0, 'subnet', a1, 'static-mapping', a2, 'option', 'name-server', a3]

    def get_static_mapping_option_ntp_server_delete(self, a0, a1, a2, a3) -> List[str]:
        return ['service', 'dhcp-server', 'shared-network-name', a0, 'subnet', a1, 'static-mapping', a2, 'option', 'ntp-server', a3]

    def get_static_mapping_option_pop_server_delete(self, a0, a1, a2, a3) -> List[str]:
        return ['service', 'dhcp-server', 'shared-network-name', a0, 'subnet', a1, 'static-mapping', a2, 'option', 'pop-server', a3]

    def get_static_mapping_option_smtp_server_delete(self, a0, a1, a2, a3) -> List[str]:
        return ['service', 'dhcp-server', 'shared-network-name', a0, 'subnet', a1, 'static-mapping', a2, 'option', 'smtp-server', a3]

    def get_static_mapping_option_static_route_delete(self, a0, a1, a2) -> List[str]:
        return ['service', 'dhcp-server', 'shared-network-name', a0, 'subnet', a1, 'static-mapping', a2, 'option', 'static-route']

    def get_static_mapping_option_static_route_next_hop_delete(self, a0, a1, a2, a3) -> List[str]:
        return ['service', 'dhcp-server', 'shared-network-name', a0, 'subnet', a1, 'static-mapping', a2, 'option', 'static-route', a3]

    def get_static_mapping_option_tftp_server_name_delete(self, a0, a1, a2) -> List[str]:
        return ['service', 'dhcp-server', 'shared-network-name', a0, 'subnet', a1, 'static-mapping', a2, 'option', 'tftp-server-name']

    def get_static_mapping_option_time_offset_delete(self, a0, a1, a2) -> List[str]:
        return ['service', 'dhcp-server', 'shared-network-name', a0, 'subnet', a1, 'static-mapping', a2, 'option', 'time-offset']

    def get_static_mapping_option_time_server_delete(self, a0, a1, a2, a3) -> List[str]:
        return ['service', 'dhcp-server', 'shared-network-name', a0, 'subnet', a1, 'static-mapping', a2, 'option', 'time-server', a3]

    def get_static_mapping_option_time_zone_delete(self, a0, a1, a2) -> List[str]:
        return ['service', 'dhcp-server', 'shared-network-name', a0, 'subnet', a1, 'static-mapping', a2, 'option', 'time-zone']

    def get_static_mapping_option_unifi_controller_delete(self, a0, a1, a2) -> List[str]:
        return ['service', 'dhcp-server', 'shared-network-name', a0, 'subnet', a1, 'static-mapping', a2, 'option', 'vendor-option', 'ubiquiti', 'unifi-controller']

    def get_static_mapping_option_vendor_option_delete(self, a0, a1, a2) -> List[str]:
        return ['service', 'dhcp-server', 'shared-network-name', a0, 'subnet', a1, 'static-mapping', a2, 'option', 'vendor-option']

    def get_static_mapping_option_wins_server_delete(self, a0, a1, a2, a3) -> List[str]:
        return ['service', 'dhcp-server', 'shared-network-name', a0, 'subnet', a1, 'static-mapping', a2, 'option', 'wins-server', a3]

    def get_static_mapping_option_wpad_url_delete(self, a0, a1, a2) -> List[str]:
        return ['service', 'dhcp-server', 'shared-network-name', a0, 'subnet', a1, 'static-mapping', a2, 'option', 'wpad-url']

    def get_subnet_client_class_delete(self, a0, a1, a2) -> List[str]:
        return ['service', 'dhcp-server', 'shared-network-name', a0, 'subnet', a1, 'client-class', a2]

    def get_subnet_ddns_field_delete(self, a0, a1, a2) -> List[str]:
        return ['service', 'dhcp-server', 'shared-network-name', a0, 'subnet', a1, 'dynamic-dns-update', _known(a2, DDNS_FIELDS, "dynamic-dns-update field")]

    def get_subnet_domain_name_delete(self, a0, a1) -> List[str]:
        return ['service', 'dhcp-server', 'shared-network-name', a0, 'subnet', a1, 'domain-name']

    def get_subnet_domain_search_delete(self, a0, a1, a2) -> List[str]:
        return ['service', 'dhcp-server', 'shared-network-name', a0, 'subnet', a1, 'domain-search', a2]

    def get_subnet_id_delete(self, a0, a1) -> List[str]:
        return ['service', 'dhcp-server', 'shared-network-name', a0, 'subnet', a1, 'subnet-id']

    def get_subnet_ignore_client_id_delete(self, a0, a1) -> List[str]:
        return ['service', 'dhcp-server', 'shared-network-name', a0, 'subnet', a1, 'ignore-client-id']

    def get_subnet_lease_default_delete(self, a0, a1) -> List[str]:
        return ['service', 'dhcp-server', 'shared-network-name', a0, 'subnet', a1, 'lease']

    def get_subnet_lease_max_delete(self, a0, a1) -> List[str]:
        return ['service', 'dhcp-server', 'shared-network-name', a0, 'subnet', a1, 'lease']

    def get_subnet_lease_min_delete(self, a0, a1) -> List[str]:
        return ['service', 'dhcp-server', 'shared-network-name', a0, 'subnet', a1, 'lease']

    def get_subnet_name_server_delete(self, a0, a1, a2) -> List[str]:
        return ['service', 'dhcp-server', 'shared-network-name', a0, 'subnet', a1, 'name-server', a2]

    def get_subnet_option_delete(self, a0, a1, a2) -> List[str]:
        return ['service', 'dhcp-server', 'shared-network-name', a0, 'subnet', a1, 'option', _known(a2, DHCP_OPTIONS, "option")]

    def get_subnet_option_bootfile_name_delete(self, a0, a1) -> List[str]:
        return ['service', 'dhcp-server', 'shared-network-name', a0, 'subnet', a1, 'option', 'bootfile-name']

    def get_subnet_option_bootfile_server_delete(self, a0, a1) -> List[str]:
        return ['service', 'dhcp-server', 'shared-network-name', a0, 'subnet', a1, 'option', 'bootfile-server']

    def get_subnet_option_bootfile_size_delete(self, a0, a1) -> List[str]:
        return ['service', 'dhcp-server', 'shared-network-name', a0, 'subnet', a1, 'option', 'bootfile-size']

    def get_subnet_option_client_prefix_length_delete(self, a0, a1) -> List[str]:
        return ['service', 'dhcp-server', 'shared-network-name', a0, 'subnet', a1, 'option', 'client-prefix-length']

    def get_subnet_option_default_router_delete(self, a0, a1) -> List[str]:
        return ['service', 'dhcp-server', 'shared-network-name', a0, 'subnet', a1, 'option', 'default-router']

    def get_subnet_option_domain_name_delete(self, a0, a1) -> List[str]:
        return ['service', 'dhcp-server', 'shared-network-name', a0, 'subnet', a1, 'option', 'domain-name']

    def get_subnet_option_domain_search_delete(self, a0, a1, a2) -> List[str]:
        return ['service', 'dhcp-server', 'shared-network-name', a0, 'subnet', a1, 'option', 'domain-search', a2]

    def get_subnet_option_ip_forwarding_delete(self, a0, a1) -> List[str]:
        return ['service', 'dhcp-server', 'shared-network-name', a0, 'subnet', a1, 'option', 'ip-forwarding']

    def get_subnet_option_name_server_delete(self, a0, a1, a2) -> List[str]:
        return ['service', 'dhcp-server', 'shared-network-name', a0, 'subnet', a1, 'option', 'name-server', a2]

    def get_subnet_option_ntp_server_delete(self, a0, a1, a2) -> List[str]:
        return ['service', 'dhcp-server', 'shared-network-name', a0, 'subnet', a1, 'option', 'ntp-server', a2]

    def get_subnet_option_pop_server_delete(self, a0, a1, a2) -> List[str]:
        return ['service', 'dhcp-server', 'shared-network-name', a0, 'subnet', a1, 'option', 'pop-server', a2]

    def get_subnet_option_smtp_server_delete(self, a0, a1, a2) -> List[str]:
        return ['service', 'dhcp-server', 'shared-network-name', a0, 'subnet', a1, 'option', 'smtp-server', a2]

    def get_subnet_option_static_route_delete(self, a0, a1) -> List[str]:
        return ['service', 'dhcp-server', 'shared-network-name', a0, 'subnet', a1, 'option', 'static-route']

    def get_subnet_option_static_route_next_hop_delete(self, a0, a1, a2) -> List[str]:
        return ['service', 'dhcp-server', 'shared-network-name', a0, 'subnet', a1, 'option', 'static-route', a2]

    def get_subnet_option_tftp_server_name_delete(self, a0, a1) -> List[str]:
        return ['service', 'dhcp-server', 'shared-network-name', a0, 'subnet', a1, 'option', 'tftp-server-name']

    def get_subnet_option_time_offset_delete(self, a0, a1) -> List[str]:
        return ['service', 'dhcp-server', 'shared-network-name', a0, 'subnet', a1, 'option', 'time-offset']

    def get_subnet_option_time_server_delete(self, a0, a1, a2) -> List[str]:
        return ['service', 'dhcp-server', 'shared-network-name', a0, 'subnet', a1, 'option', 'time-server', a2]

    def get_subnet_option_time_zone_delete(self, a0, a1) -> List[str]:
        return ['service', 'dhcp-server', 'shared-network-name', a0, 'subnet', a1, 'option', 'time-zone']

    def get_subnet_option_unifi_controller_delete(self, a0, a1) -> List[str]:
        return ['service', 'dhcp-server', 'shared-network-name', a0, 'subnet', a1, 'option', 'vendor-option', 'ubiquiti', 'unifi-controller']

    def get_subnet_option_vendor_option_delete(self, a0, a1) -> List[str]:
        return ['service', 'dhcp-server', 'shared-network-name', a0, 'subnet', a1, 'option', 'vendor-option']

    def get_subnet_option_wins_server_delete(self, a0, a1, a2) -> List[str]:
        return ['service', 'dhcp-server', 'shared-network-name', a0, 'subnet', a1, 'option', 'wins-server', a2]

    def get_subnet_option_wpad_url_delete(self, a0, a1) -> List[str]:
        return ['service', 'dhcp-server', 'shared-network-name', a0, 'subnet', a1, 'option', 'wpad-url']

    def get_subnet_range_client_class_delete(self, a0, a1, a2, a3) -> List[str]:
        return ['service', 'dhcp-server', 'shared-network-name', a0, 'subnet', a1, 'range', a2, 'client-class', a3]

    def get_subnet_range_option_delete(self, a0, a1, a2, a3) -> List[str]:
        return ['service', 'dhcp-server', 'shared-network-name', a0, 'subnet', a1, 'range', a2, 'option', _known(a3, DHCP_OPTIONS, "option")]

    def get_subnet_range_option_static_route_next_hop_delete(self, a0, a1, a2, a3) -> List[str]:
        return ['service', 'dhcp-server', 'shared-network-name', a0, 'subnet', a1, 'range', a2, 'option', 'static-route', a3]

    def get_subnet_range_option_unifi_controller_delete(self, a0, a1, a2) -> List[str]:
        return ['service', 'dhcp-server', 'shared-network-name', a0, 'subnet', a1, 'range', a2, 'option', 'vendor-option', 'ubiquiti', 'unifi-controller']

    def get_root(self) -> List[str]:
        return ['service', 'dhcp-server']

    def get_client_class_relay_agent_information_circuit_id(self, a0, a1) -> List[str]:
        return ['service', 'dhcp-server', 'client-class', a0, 'relay-agent-information', 'circuit-id', a1]

    def get_client_class_relay_agent_information_remote_id(self, a0, a1) -> List[str]:
        return ['service', 'dhcp-server', 'client-class', a0, 'relay-agent-information', 'remote-id', a1]

    def get_ddns_field(self, a0, a1) -> List[str]:
        return ['service', 'dhcp-server', 'dynamic-dns-update', _known(a0, DDNS_FIELDS, "dynamic-dns-update field"), a1]

    def get_dynamic_dns_update_dns_server(self, a0) -> List[str]:
        return ['service', 'dhcp-server', 'dynamic-dns-update', 'dns-server', a0]

    def get_dynamic_dns_update_domain_name(self, a0) -> List[str]:
        return ['service', 'dhcp-server', 'dynamic-dns-update', 'domain-name', a0]

    def get_dynamic_dns_update_enable(self) -> List[str]:
        return ['service', 'dhcp-server', 'dynamic-dns-update']

    def get_global_parameters(self, a0) -> List[str]:
        return ['service', 'dhcp-server', 'global-parameters', a0]

    def get_shared_network_ddns_field(self, a0, a1, a2) -> List[str]:
        return ['service', 'dhcp-server', 'shared-network-name', a0, 'dynamic-dns-update', a1, a2]

    def get_shared_network_ntp_server(self, a0, a1) -> List[str]:
        return ['service', 'dhcp-server', 'shared-network-name', a0, 'option', 'ntp-server', a1]

    def get_shared_network_option(self, a0, a1, a2) -> List[str]:
        return ['service', 'dhcp-server', 'shared-network-name', a0, 'option', _known(a1, DHCP_OPTIONS, "option"), a2]

    def get_shared_network_option_bootfile_name(self, a0, a1) -> List[str]:
        return ['service', 'dhcp-server', 'shared-network-name', a0, 'option', 'bootfile-name', a1]

    def get_shared_network_option_bootfile_server(self, a0, a1) -> List[str]:
        return ['service', 'dhcp-server', 'shared-network-name', a0, 'option', 'bootfile-server', a1]

    def get_shared_network_option_bootfile_size(self, a0, a1) -> List[str]:
        return ['service', 'dhcp-server', 'shared-network-name', a0, 'option', 'bootfile-size', a1]

    def get_shared_network_option_client_prefix_length(self, a0, a1) -> List[str]:
        return ['service', 'dhcp-server', 'shared-network-name', a0, 'option', 'client-prefix-length', a1]

    def get_shared_network_option_default_router(self, a0, a1) -> List[str]:
        return ['service', 'dhcp-server', 'shared-network-name', a0, 'option', 'default-router', a1]

    def get_shared_network_option_domain_name(self, a0, a1) -> List[str]:
        return ['service', 'dhcp-server', 'shared-network-name', a0, 'option', 'domain-name', a1]

    def get_shared_network_option_domain_search(self, a0, a1) -> List[str]:
        return ['service', 'dhcp-server', 'shared-network-name', a0, 'option', 'domain-search', a1]

    def get_shared_network_option_ip_forwarding(self, a0) -> List[str]:
        return ['service', 'dhcp-server', 'shared-network-name', a0, 'option', 'ip-forwarding']

    def get_shared_network_option_name_server(self, a0, a1) -> List[str]:
        return ['service', 'dhcp-server', 'shared-network-name', a0, 'option', 'name-server', a1]

    def get_shared_network_option_ntp_server(self, a0, a1) -> List[str]:
        return ['service', 'dhcp-server', 'shared-network-name', a0, 'option', 'ntp-server', a1]

    def get_shared_network_option_pop_server(self, a0, a1) -> List[str]:
        return ['service', 'dhcp-server', 'shared-network-name', a0, 'option', 'pop-server', a1]

    def get_shared_network_option_smtp_server(self, a0, a1) -> List[str]:
        return ['service', 'dhcp-server', 'shared-network-name', a0, 'option', 'smtp-server', a1]

    def get_shared_network_option_static_route(self, a0, a1) -> List[str]:
        return ['service', 'dhcp-server', 'shared-network-name', a0, 'option', 'static-route', a1]

    def get_shared_network_option_static_route_next_hop(self, a0, a1, a2) -> List[str]:
        return ['service', 'dhcp-server', 'shared-network-name', a0, 'option', 'static-route', a1, 'next-hop', a2]

    def get_shared_network_option_tftp_server_name(self, a0, a1) -> List[str]:
        return ['service', 'dhcp-server', 'shared-network-name', a0, 'option', 'tftp-server-name', a1]

    def get_shared_network_option_time_offset(self, a0, a1) -> List[str]:
        return ['service', 'dhcp-server', 'shared-network-name', a0, 'option', 'time-offset', a1]

    def get_shared_network_option_time_server(self, a0, a1) -> List[str]:
        return ['service', 'dhcp-server', 'shared-network-name', a0, 'option', 'time-server', a1]

    def get_shared_network_option_time_zone(self, a0, a1) -> List[str]:
        return ['service', 'dhcp-server', 'shared-network-name', a0, 'option', 'time-zone', a1]

    def get_shared_network_option_unifi_controller(self, a0, a1) -> List[str]:
        return ['service', 'dhcp-server', 'shared-network-name', a0, 'option', 'vendor-option', 'ubiquiti', 'unifi-controller', a1]

    def get_shared_network_option_vendor_option(self, a0) -> List[str]:
        return ['service', 'dhcp-server', 'shared-network-name', a0, 'option', 'vendor-option']

    def get_shared_network_option_wins_server(self, a0, a1) -> List[str]:
        return ['service', 'dhcp-server', 'shared-network-name', a0, 'option', 'wins-server', a1]

    def get_shared_network_option_wpad_url(self, a0, a1) -> List[str]:
        return ['service', 'dhcp-server', 'shared-network-name', a0, 'option', 'wpad-url', a1]

    def get_static_mapping_option(self, a0, a1, a2, a3, a4) -> List[str]:
        return ['service', 'dhcp-server', 'shared-network-name', a0, 'subnet', a1, 'static-mapping', a2, 'option', _known(a3, DHCP_OPTIONS, "option"), a4]

    def get_static_mapping_option_bootfile_name(self, a0, a1, a2, a3) -> List[str]:
        return ['service', 'dhcp-server', 'shared-network-name', a0, 'subnet', a1, 'static-mapping', a2, 'option', 'bootfile-name', a3]

    def get_static_mapping_option_bootfile_server(self, a0, a1, a2, a3) -> List[str]:
        return ['service', 'dhcp-server', 'shared-network-name', a0, 'subnet', a1, 'static-mapping', a2, 'option', 'bootfile-server', a3]

    def get_static_mapping_option_bootfile_size(self, a0, a1, a2, a3) -> List[str]:
        return ['service', 'dhcp-server', 'shared-network-name', a0, 'subnet', a1, 'static-mapping', a2, 'option', 'bootfile-size', a3]

    def get_static_mapping_option_client_prefix_length(self, a0, a1, a2, a3) -> List[str]:
        return ['service', 'dhcp-server', 'shared-network-name', a0, 'subnet', a1, 'static-mapping', a2, 'option', 'client-prefix-length', a3]

    def get_static_mapping_option_default_router(self, a0, a1, a2, a3) -> List[str]:
        return ['service', 'dhcp-server', 'shared-network-name', a0, 'subnet', a1, 'static-mapping', a2, 'option', 'default-router', a3]

    def get_static_mapping_option_domain_name(self, a0, a1, a2, a3) -> List[str]:
        return ['service', 'dhcp-server', 'shared-network-name', a0, 'subnet', a1, 'static-mapping', a2, 'option', 'domain-name', a3]

    def get_static_mapping_option_domain_search(self, a0, a1, a2, a3) -> List[str]:
        return ['service', 'dhcp-server', 'shared-network-name', a0, 'subnet', a1, 'static-mapping', a2, 'option', 'domain-search', a3]

    def get_static_mapping_option_ip_forwarding(self, a0, a1, a2) -> List[str]:
        return ['service', 'dhcp-server', 'shared-network-name', a0, 'subnet', a1, 'static-mapping', a2, 'option', 'ip-forwarding']

    def get_static_mapping_option_name_server(self, a0, a1, a2, a3) -> List[str]:
        return ['service', 'dhcp-server', 'shared-network-name', a0, 'subnet', a1, 'static-mapping', a2, 'option', 'name-server', a3]

    def get_static_mapping_option_ntp_server(self, a0, a1, a2, a3) -> List[str]:
        return ['service', 'dhcp-server', 'shared-network-name', a0, 'subnet', a1, 'static-mapping', a2, 'option', 'ntp-server', a3]

    def get_static_mapping_option_pop_server(self, a0, a1, a2, a3) -> List[str]:
        return ['service', 'dhcp-server', 'shared-network-name', a0, 'subnet', a1, 'static-mapping', a2, 'option', 'pop-server', a3]

    def get_static_mapping_option_smtp_server(self, a0, a1, a2, a3) -> List[str]:
        return ['service', 'dhcp-server', 'shared-network-name', a0, 'subnet', a1, 'static-mapping', a2, 'option', 'smtp-server', a3]

    def get_static_mapping_option_static_route(self, a0, a1, a2, a3) -> List[str]:
        return ['service', 'dhcp-server', 'shared-network-name', a0, 'subnet', a1, 'static-mapping', a2, 'option', 'static-route', a3]

    def get_static_mapping_option_static_route_next_hop(self, a0, a1, a2, a3, a4) -> List[str]:
        return ['service', 'dhcp-server', 'shared-network-name', a0, 'subnet', a1, 'static-mapping', a2, 'option', 'static-route', a3, 'next-hop', a4]

    def get_static_mapping_option_tftp_server_name(self, a0, a1, a2, a3) -> List[str]:
        return ['service', 'dhcp-server', 'shared-network-name', a0, 'subnet', a1, 'static-mapping', a2, 'option', 'tftp-server-name', a3]

    def get_static_mapping_option_time_offset(self, a0, a1, a2, a3) -> List[str]:
        return ['service', 'dhcp-server', 'shared-network-name', a0, 'subnet', a1, 'static-mapping', a2, 'option', 'time-offset', a3]

    def get_static_mapping_option_time_server(self, a0, a1, a2, a3) -> List[str]:
        return ['service', 'dhcp-server', 'shared-network-name', a0, 'subnet', a1, 'static-mapping', a2, 'option', 'time-server', a3]

    def get_static_mapping_option_time_zone(self, a0, a1, a2, a3) -> List[str]:
        return ['service', 'dhcp-server', 'shared-network-name', a0, 'subnet', a1, 'static-mapping', a2, 'option', 'time-zone', a3]

    def get_static_mapping_option_unifi_controller(self, a0, a1, a2, a3) -> List[str]:
        return ['service', 'dhcp-server', 'shared-network-name', a0, 'subnet', a1, 'static-mapping', a2, 'option', 'vendor-option', 'ubiquiti', 'unifi-controller', a3]

    def get_static_mapping_option_vendor_option(self, a0, a1, a2) -> List[str]:
        return ['service', 'dhcp-server', 'shared-network-name', a0, 'subnet', a1, 'static-mapping', a2, 'option', 'vendor-option']

    def get_static_mapping_option_wins_server(self, a0, a1, a2, a3) -> List[str]:
        return ['service', 'dhcp-server', 'shared-network-name', a0, 'subnet', a1, 'static-mapping', a2, 'option', 'wins-server', a3]

    def get_static_mapping_option_wpad_url(self, a0, a1, a2, a3) -> List[str]:
        return ['service', 'dhcp-server', 'shared-network-name', a0, 'subnet', a1, 'static-mapping', a2, 'option', 'wpad-url', a3]

    def get_subnet_client_class(self, a0, a1, a2) -> List[str]:
        return ['service', 'dhcp-server', 'shared-network-name', a0, 'subnet', a1, 'client-class', a2]

    def get_subnet_ddns_field(self, a0, a1, a2, a3) -> List[str]:
        return ['service', 'dhcp-server', 'shared-network-name', a0, 'subnet', a1, 'dynamic-dns-update', _known(a2, DDNS_FIELDS, "dynamic-dns-update field"), a3]

    def get_subnet_id(self, a0, a1, a2) -> List[str]:
        return ['service', 'dhcp-server', 'shared-network-name', a0, 'subnet', a1, 'subnet-id', a2]

    def get_subnet_ignore_client_id(self, a0, a1) -> List[str]:
        return ['service', 'dhcp-server', 'shared-network-name', a0, 'subnet', a1, 'ignore-client-id']

    def get_subnet_lease_default(self, a0, a1, a2) -> List[str]:
        return ['service', 'dhcp-server', 'shared-network-name', a0, 'subnet', a1, 'lease', a2]

    def get_subnet_option(self, a0, a1, a2, a3) -> List[str]:
        return ['service', 'dhcp-server', 'shared-network-name', a0, 'subnet', a1, 'option', _known(a2, DHCP_OPTIONS, "option"), a3]

    def get_subnet_option_bootfile_name(self, a0, a1, a2) -> List[str]:
        return ['service', 'dhcp-server', 'shared-network-name', a0, 'subnet', a1, 'option', 'bootfile-name', a2]

    def get_subnet_option_bootfile_server(self, a0, a1, a2) -> List[str]:
        return ['service', 'dhcp-server', 'shared-network-name', a0, 'subnet', a1, 'option', 'bootfile-server', a2]

    def get_subnet_option_bootfile_size(self, a0, a1, a2) -> List[str]:
        return ['service', 'dhcp-server', 'shared-network-name', a0, 'subnet', a1, 'option', 'bootfile-size', a2]

    def get_subnet_option_client_prefix_length(self, a0, a1, a2) -> List[str]:
        return ['service', 'dhcp-server', 'shared-network-name', a0, 'subnet', a1, 'option', 'client-prefix-length', a2]

    def get_subnet_option_default_router(self, a0, a1, a2) -> List[str]:
        return ['service', 'dhcp-server', 'shared-network-name', a0, 'subnet', a1, 'option', 'default-router', a2]

    def get_subnet_option_domain_name(self, a0, a1, a2) -> List[str]:
        return ['service', 'dhcp-server', 'shared-network-name', a0, 'subnet', a1, 'option', 'domain-name', a2]

    def get_subnet_option_domain_search(self, a0, a1, a2) -> List[str]:
        return ['service', 'dhcp-server', 'shared-network-name', a0, 'subnet', a1, 'option', 'domain-search', a2]

    def get_subnet_option_ip_forwarding(self, a0, a1) -> List[str]:
        return ['service', 'dhcp-server', 'shared-network-name', a0, 'subnet', a1, 'option', 'ip-forwarding']

    def get_subnet_option_name_server(self, a0, a1, a2) -> List[str]:
        return ['service', 'dhcp-server', 'shared-network-name', a0, 'subnet', a1, 'option', 'name-server', a2]

    def get_subnet_option_ntp_server(self, a0, a1, a2) -> List[str]:
        return ['service', 'dhcp-server', 'shared-network-name', a0, 'subnet', a1, 'option', 'ntp-server', a2]

    def get_subnet_option_pop_server(self, a0, a1, a2) -> List[str]:
        return ['service', 'dhcp-server', 'shared-network-name', a0, 'subnet', a1, 'option', 'pop-server', a2]

    def get_subnet_option_smtp_server(self, a0, a1, a2) -> List[str]:
        return ['service', 'dhcp-server', 'shared-network-name', a0, 'subnet', a1, 'option', 'smtp-server', a2]

    def get_subnet_option_static_route(self, a0, a1, a2) -> List[str]:
        return ['service', 'dhcp-server', 'shared-network-name', a0, 'subnet', a1, 'option', 'static-route', a2]

    def get_subnet_option_static_route_next_hop(self, a0, a1, a2, a3) -> List[str]:
        return ['service', 'dhcp-server', 'shared-network-name', a0, 'subnet', a1, 'option', 'static-route', a2, 'next-hop', a3]

    def get_subnet_option_tftp_server_name(self, a0, a1, a2) -> List[str]:
        return ['service', 'dhcp-server', 'shared-network-name', a0, 'subnet', a1, 'option', 'tftp-server-name', a2]

    def get_subnet_option_time_offset(self, a0, a1, a2) -> List[str]:
        return ['service', 'dhcp-server', 'shared-network-name', a0, 'subnet', a1, 'option', 'time-offset', a2]

    def get_subnet_option_time_server(self, a0, a1, a2) -> List[str]:
        return ['service', 'dhcp-server', 'shared-network-name', a0, 'subnet', a1, 'option', 'time-server', a2]

    def get_subnet_option_time_zone(self, a0, a1, a2) -> List[str]:
        return ['service', 'dhcp-server', 'shared-network-name', a0, 'subnet', a1, 'option', 'time-zone', a2]

    def get_subnet_option_unifi_controller(self, a0, a1, a2) -> List[str]:
        return ['service', 'dhcp-server', 'shared-network-name', a0, 'subnet', a1, 'option', 'vendor-option', 'ubiquiti', 'unifi-controller', a2]

    def get_subnet_option_vendor_option(self, a0, a1) -> List[str]:
        return ['service', 'dhcp-server', 'shared-network-name', a0, 'subnet', a1, 'option', 'vendor-option']

    def get_subnet_option_wins_server(self, a0, a1, a2) -> List[str]:
        return ['service', 'dhcp-server', 'shared-network-name', a0, 'subnet', a1, 'option', 'wins-server', a2]

    def get_subnet_option_wpad_url(self, a0, a1, a2) -> List[str]:
        return ['service', 'dhcp-server', 'shared-network-name', a0, 'subnet', a1, 'option', 'wpad-url', a2]

    def get_subnet_range_client_class(self, a0, a1, a2, a3) -> List[str]:
        return ['service', 'dhcp-server', 'shared-network-name', a0, 'subnet', a1, 'range', a2, 'client-class', a3]

    def get_subnet_range_option(self, a0, a1, a2, a3, a4) -> List[str]:
        return ['service', 'dhcp-server', 'shared-network-name', a0, 'subnet', a1, 'range', a2, 'option', _known(a3, DHCP_OPTIONS, "option"), a4]

    def get_subnet_range_option_static_route_next_hop(self, a0, a1, a2, a3, a4) -> List[str]:
        return ['service', 'dhcp-server', 'shared-network-name', a0, 'subnet', a1, 'range', a2, 'option', 'static-route', a3, 'next-hop', a4]

    def get_subnet_range_option_unifi_controller(self, a0, a1, a2, a3) -> List[str]:
        return ['service', 'dhcp-server', 'shared-network-name', a0, 'subnet', a1, 'range', a2, 'option', 'vendor-option', 'ubiquiti', 'unifi-controller', a3]

class Dhcpv6ExtraLeaves:

    def get_root_delete(self) -> List[str]:
        return ['service', 'dhcpv6-server']

    def get_global_parameters_delete(self) -> List[str]:
        return ['service', 'dhcpv6-server', 'global-parameters']

    def get_shared_network_option_delete(self, a0, a1) -> List[str]:
        return ['service', 'dhcpv6-server', 'shared-network-name', a0, 'option', _known(a1, DHCPV6_OPTIONS, "option")]

    def get_shared_network_option_domain_search_delete(self, a0, a1) -> List[str]:
        return ['service', 'dhcpv6-server', 'shared-network-name', a0, 'option', 'domain-search', a1]

    def get_shared_network_option_name_server_delete(self, a0, a1) -> List[str]:
        return ['service', 'dhcpv6-server', 'shared-network-name', a0, 'option', 'name-server', a1]

    def get_shared_network_option_nis_domain_delete(self, a0) -> List[str]:
        return ['service', 'dhcpv6-server', 'shared-network-name', a0, 'option', 'nis-domain']

    def get_shared_network_option_nis_server_delete(self, a0, a1) -> List[str]:
        return ['service', 'dhcpv6-server', 'shared-network-name', a0, 'option', 'nis-server', a1]

    def get_shared_network_option_nisplus_domain_delete(self, a0) -> List[str]:
        return ['service', 'dhcpv6-server', 'shared-network-name', a0, 'option', 'nisplus-domain']

    def get_shared_network_option_nisplus_server_delete(self, a0, a1) -> List[str]:
        return ['service', 'dhcpv6-server', 'shared-network-name', a0, 'option', 'nisplus-server', a1]

    def get_shared_network_option_sip_server_delete(self, a0, a1) -> List[str]:
        return ['service', 'dhcpv6-server', 'shared-network-name', a0, 'option', 'sip-server', a1]

    def get_shared_network_option_sntp_server_delete(self, a0, a1) -> List[str]:
        return ['service', 'dhcpv6-server', 'shared-network-name', a0, 'option', 'sntp-server', a1]

    def get_shared_network_option_vendor_cisco_tftp_server_delete(self, a0) -> List[str]:
        return ['service', 'dhcpv6-server', 'shared-network-name', a0, 'option', 'vendor-option', 'cisco', 'tftp-server']

    def get_static_mapping_option_delete(self, a0, a1, a2, a3) -> List[str]:
        return ['service', 'dhcpv6-server', 'shared-network-name', a0, 'subnet', a1, 'static-mapping', a2, 'option', _known(a3, DHCPV6_OPTIONS, "option")]

    def get_static_mapping_option_vendor_cisco_tftp_server_delete(self, a0, a1, a2) -> List[str]:
        return ['service', 'dhcpv6-server', 'shared-network-name', a0, 'subnet', a1, 'static-mapping', a2, 'option', 'vendor-option', 'cisco', 'tftp-server']

    def get_subnet_description_delete(self, a0, a1) -> List[str]:
        return ['service', 'dhcpv6-server', 'shared-network-name', a0, 'subnet', a1, 'description']

    def get_subnet_domain_search_delete(self, a0, a1, a2) -> List[str]:
        return ['service', 'dhcpv6-server', 'shared-network-name', a0, 'subnet', a1, 'domain-search', a2]

    def get_subnet_lease_time_default_delete(self, a0, a1) -> List[str]:
        return ['service', 'dhcpv6-server', 'shared-network-name', a0, 'subnet', a1, 'lease-time', 'default']

    def get_subnet_lease_time_maximum_delete(self, a0, a1) -> List[str]:
        return ['service', 'dhcpv6-server', 'shared-network-name', a0, 'subnet', a1, 'lease-time', 'maximum']

    def get_subnet_lease_time_minimum_delete(self, a0, a1) -> List[str]:
        return ['service', 'dhcpv6-server', 'shared-network-name', a0, 'subnet', a1, 'lease-time', 'minimum']

    def get_subnet_name_server_delete(self, a0, a1, a2) -> List[str]:
        return ['service', 'dhcpv6-server', 'shared-network-name', a0, 'subnet', a1, 'name-server', a2]

    def get_subnet_nis_domain_delete(self, a0, a1) -> List[str]:
        return ['service', 'dhcpv6-server', 'shared-network-name', a0, 'subnet', a1, 'nis-domain']

    def get_subnet_nis_server_delete(self, a0, a1, a2) -> List[str]:
        return ['service', 'dhcpv6-server', 'shared-network-name', a0, 'subnet', a1, 'nis-server', a2]

    def get_subnet_nisplus_domain_delete(self, a0, a1) -> List[str]:
        return ['service', 'dhcpv6-server', 'shared-network-name', a0, 'subnet', a1, 'nisplus-domain']

    def get_subnet_nisplus_server_delete(self, a0, a1, a2) -> List[str]:
        return ['service', 'dhcpv6-server', 'shared-network-name', a0, 'subnet', a1, 'nisplus-server', a2]

    def get_subnet_option_delete(self, a0, a1, a2) -> List[str]:
        return ['service', 'dhcpv6-server', 'shared-network-name', a0, 'subnet', a1, 'option', _known(a2, DHCPV6_OPTIONS, "option")]

    def get_subnet_option_vendor_cisco_tftp_server_delete(self, a0, a1) -> List[str]:
        return ['service', 'dhcpv6-server', 'shared-network-name', a0, 'subnet', a1, 'option', 'vendor-option', 'cisco', 'tftp-server']

    def get_subnet_pd_prefix_prefix_length_delete(self, a0, a1, a2) -> List[str]:
        return ['service', 'dhcpv6-server', 'shared-network-name', a0, 'subnet', a1, 'prefix-delegation', 'prefix', a2, 'prefix-length']

    def get_subnet_range_option_delete(self, a0, a1, a2, a3) -> List[str]:
        return ['service', 'dhcpv6-server', 'shared-network-name', a0, 'subnet', a1, 'range', a2, 'option', _known(a3, DHCPV6_OPTIONS, "option")]

    def get_subnet_range_option_vendor_cisco_tftp_server_delete(self, a0, a1, a2) -> List[str]:
        return ['service', 'dhcpv6-server', 'shared-network-name', a0, 'subnet', a1, 'range', a2, 'option', 'vendor-option', 'cisco', 'tftp-server']

    def get_subnet_sip_server_delete(self, a0, a1, a2) -> List[str]:
        return ['service', 'dhcpv6-server', 'shared-network-name', a0, 'subnet', a1, 'sip-server', a2]

    def get_subnet_sntp_server_delete(self, a0, a1, a2) -> List[str]:
        return ['service', 'dhcpv6-server', 'shared-network-name', a0, 'subnet', a1, 'sntp-server', a2]

    def get_subnet_static_mapping_delete(self, a0, a1, a2) -> List[str]:
        return ['service', 'dhcpv6-server', 'shared-network-name', a0, 'subnet', a1, 'static-mapping', a2]

    def get_subnet_static_mapping_description_delete(self, a0, a1, a2) -> List[str]:
        return ['service', 'dhcpv6-server', 'shared-network-name', a0, 'subnet', a1, 'static-mapping', a2, 'description']

    def get_subnet_static_mapping_disable_delete(self, a0, a1, a2) -> List[str]:
        return ['service', 'dhcpv6-server', 'shared-network-name', a0, 'subnet', a1, 'static-mapping', a2, 'disable']

    def get_subnet_static_mapping_duid_delete(self, a0, a1, a2) -> List[str]:
        return ['service', 'dhcpv6-server', 'shared-network-name', a0, 'subnet', a1, 'static-mapping', a2, 'duid']

    def get_subnet_static_mapping_identifier_duid_delete(self, a0, a1, a2) -> List[str]:
        return ['service', 'dhcpv6-server', 'shared-network-name', a0, 'subnet', a1, 'static-mapping', a2, 'identifier', 'duid']

    def get_subnet_static_mapping_ipv6_address_delete(self, a0, a1, a2) -> List[str]:
        return ['service', 'dhcpv6-server', 'shared-network-name', a0, 'subnet', a1, 'static-mapping', a2, 'ipv6-address']

    def get_subnet_static_mapping_ipv6_prefix_delete(self, a0, a1, a2) -> List[str]:
        return ['service', 'dhcpv6-server', 'shared-network-name', a0, 'subnet', a1, 'static-mapping', a2, 'ipv6-prefix']

    def get_subnet_static_mapping_mac_delete(self, a0, a1, a2) -> List[str]:
        return ['service', 'dhcpv6-server', 'shared-network-name', a0, 'subnet', a1, 'static-mapping', a2, 'mac']

    def get_subnet_static_mapping_option_domain_search_delete(self, a0, a1, a2, a3) -> List[str]:
        return ['service', 'dhcpv6-server', 'shared-network-name', a0, 'subnet', a1, 'static-mapping', a2, 'option', 'domain-search', a3]

    def get_subnet_static_mapping_option_name_server_delete(self, a0, a1, a2, a3) -> List[str]:
        return ['service', 'dhcpv6-server', 'shared-network-name', a0, 'subnet', a1, 'static-mapping', a2, 'option', 'name-server', a3]

    def get_subnet_static_mapping_option_nis_domain_delete(self, a0, a1, a2) -> List[str]:
        return ['service', 'dhcpv6-server', 'shared-network-name', a0, 'subnet', a1, 'static-mapping', a2, 'option', 'nis-domain']

    def get_subnet_static_mapping_option_nis_server_delete(self, a0, a1, a2, a3) -> List[str]:
        return ['service', 'dhcpv6-server', 'shared-network-name', a0, 'subnet', a1, 'static-mapping', a2, 'option', 'nis-server', a3]

    def get_subnet_static_mapping_option_nisplus_domain_delete(self, a0, a1, a2) -> List[str]:
        return ['service', 'dhcpv6-server', 'shared-network-name', a0, 'subnet', a1, 'static-mapping', a2, 'option', 'nisplus-domain']

    def get_subnet_static_mapping_option_nisplus_server_delete(self, a0, a1, a2, a3) -> List[str]:
        return ['service', 'dhcpv6-server', 'shared-network-name', a0, 'subnet', a1, 'static-mapping', a2, 'option', 'nisplus-server', a3]

    def get_subnet_static_mapping_option_sip_server_delete(self, a0, a1, a2, a3) -> List[str]:
        return ['service', 'dhcpv6-server', 'shared-network-name', a0, 'subnet', a1, 'static-mapping', a2, 'option', 'sip-server', a3]

    def get_subnet_static_mapping_option_sntp_server_delete(self, a0, a1, a2, a3) -> List[str]:
        return ['service', 'dhcpv6-server', 'shared-network-name', a0, 'subnet', a1, 'static-mapping', a2, 'option', 'sntp-server', a3]

    def get_subnet_vendor_option_cisco_bootfile_delete(self, a0, a1) -> List[str]:
        raise ValueError("vendor-option cisco bootfile is not a VyOS node")

    def get_subnet_vendor_option_cisco_tftp_server_delete(self, a0, a1, a2) -> List[str]:
        return ['service', 'dhcpv6-server', 'shared-network-name', a0, 'subnet', a1, 'option', 'vendor-option', 'cisco', 'tftp-server', a2]

    def get_root(self) -> List[str]:
        return ['service', 'dhcpv6-server']

    def get_global_parameters(self, a0) -> List[str]:
        return ['service', 'dhcpv6-server', 'global-parameters', a0]

    def get_shared_network_option(self, a0, a1, a2) -> List[str]:
        return ['service', 'dhcpv6-server', 'shared-network-name', a0, 'option', _known(a1, DHCPV6_OPTIONS, "option"), a2]

    def get_shared_network_option_domain_search(self, a0, a1) -> List[str]:
        return ['service', 'dhcpv6-server', 'shared-network-name', a0, 'option', 'domain-search', a1]

    def get_shared_network_option_name_server(self, a0, a1) -> List[str]:
        return ['service', 'dhcpv6-server', 'shared-network-name', a0, 'option', 'name-server', a1]

    def get_shared_network_option_nis_domain(self, a0, a1) -> List[str]:
        return ['service', 'dhcpv6-server', 'shared-network-name', a0, 'option', 'nis-domain', a1]

    def get_shared_network_option_nis_server(self, a0, a1) -> List[str]:
        return ['service', 'dhcpv6-server', 'shared-network-name', a0, 'option', 'nis-server', a1]

    def get_shared_network_option_nisplus_domain(self, a0, a1) -> List[str]:
        return ['service', 'dhcpv6-server', 'shared-network-name', a0, 'option', 'nisplus-domain', a1]

    def get_shared_network_option_nisplus_server(self, a0, a1) -> List[str]:
        return ['service', 'dhcpv6-server', 'shared-network-name', a0, 'option', 'nisplus-server', a1]

    def get_shared_network_option_sip_server(self, a0, a1) -> List[str]:
        return ['service', 'dhcpv6-server', 'shared-network-name', a0, 'option', 'sip-server', a1]

    def get_shared_network_option_sntp_server(self, a0, a1) -> List[str]:
        return ['service', 'dhcpv6-server', 'shared-network-name', a0, 'option', 'sntp-server', a1]

    def get_shared_network_option_vendor_cisco_tftp_server(self, a0, a1) -> List[str]:
        return ['service', 'dhcpv6-server', 'shared-network-name', a0, 'option', 'vendor-option', 'cisco', 'tftp-server', a1]

    def get_static_mapping_option(self, a0, a1, a2, a3, a4) -> List[str]:
        return ['service', 'dhcpv6-server', 'shared-network-name', a0, 'subnet', a1, 'static-mapping', a2, 'option', _known(a3, DHCPV6_OPTIONS, "option"), a4]

    def get_static_mapping_option_vendor_cisco_tftp_server(self, a0, a1, a2, a3) -> List[str]:
        return ['service', 'dhcpv6-server', 'shared-network-name', a0, 'subnet', a1, 'static-mapping', a2, 'option', 'vendor-option', 'cisco', 'tftp-server', a3]

    def get_subnet_description(self, a0, a1, a2) -> List[str]:
        return ['service', 'dhcpv6-server', 'shared-network-name', a0, 'subnet', a1, 'description', a2]

    def get_subnet_domain_search(self, a0, a1, a2) -> List[str]:
        return ['service', 'dhcpv6-server', 'shared-network-name', a0, 'subnet', a1, 'domain-search', a2]

    def get_subnet_lease_time_default(self, a0, a1, a2) -> List[str]:
        return ['service', 'dhcpv6-server', 'shared-network-name', a0, 'subnet', a1, 'lease-time', 'default', a2]

    def get_subnet_lease_time_maximum(self, a0, a1, a2) -> List[str]:
        return ['service', 'dhcpv6-server', 'shared-network-name', a0, 'subnet', a1, 'lease-time', 'maximum', a2]

    def get_subnet_lease_time_minimum(self, a0, a1, a2) -> List[str]:
        return ['service', 'dhcpv6-server', 'shared-network-name', a0, 'subnet', a1, 'lease-time', 'minimum', a2]

    def get_subnet_name_server(self, a0, a1, a2) -> List[str]:
        return ['service', 'dhcpv6-server', 'shared-network-name', a0, 'subnet', a1, 'name-server', a2]

    def get_subnet_nis_domain(self, a0, a1, a2) -> List[str]:
        return ['service', 'dhcpv6-server', 'shared-network-name', a0, 'subnet', a1, 'nis-domain', a2]

    def get_subnet_nis_server(self, a0, a1, a2) -> List[str]:
        return ['service', 'dhcpv6-server', 'shared-network-name', a0, 'subnet', a1, 'nis-server', a2]

    def get_subnet_nisplus_domain(self, a0, a1, a2) -> List[str]:
        return ['service', 'dhcpv6-server', 'shared-network-name', a0, 'subnet', a1, 'nisplus-domain', a2]

    def get_subnet_nisplus_server(self, a0, a1, a2) -> List[str]:
        return ['service', 'dhcpv6-server', 'shared-network-name', a0, 'subnet', a1, 'nisplus-server', a2]

    def get_subnet_option(self, a0, a1, a2, a3) -> List[str]:
        return ['service', 'dhcpv6-server', 'shared-network-name', a0, 'subnet', a1, 'option', _known(a2, DHCPV6_OPTIONS, "option"), a3]

    def get_subnet_option_vendor_cisco_tftp_server(self, a0, a1, a2) -> List[str]:
        return ['service', 'dhcpv6-server', 'shared-network-name', a0, 'subnet', a1, 'option', 'vendor-option', 'cisco', 'tftp-server', a2]

    def get_subnet_pd_prefix_prefix_length(self, a0, a1, a2, a3) -> List[str]:
        return ['service', 'dhcpv6-server', 'shared-network-name', a0, 'subnet', a1, 'prefix-delegation', 'prefix', a2, 'prefix-length', a3]

    def get_subnet_range_option(self, a0, a1, a2, a3, a4) -> List[str]:
        return ['service', 'dhcpv6-server', 'shared-network-name', a0, 'subnet', a1, 'range', a2, 'option', _known(a3, DHCPV6_OPTIONS, "option"), a4]

    def get_subnet_range_option_vendor_cisco_tftp_server(self, a0, a1, a2, a3) -> List[str]:
        return ['service', 'dhcpv6-server', 'shared-network-name', a0, 'subnet', a1, 'range', a2, 'option', 'vendor-option', 'cisco', 'tftp-server', a3]

    def get_subnet_sip_server(self, a0, a1, a2) -> List[str]:
        return ['service', 'dhcpv6-server', 'shared-network-name', a0, 'subnet', a1, 'sip-server', a2]

    def get_subnet_sntp_server(self, a0, a1, a2) -> List[str]:
        return ['service', 'dhcpv6-server', 'shared-network-name', a0, 'subnet', a1, 'sntp-server', a2]

    def get_subnet_static_mapping(self, a0, a1, a2) -> List[str]:
        return ['service', 'dhcpv6-server', 'shared-network-name', a0, 'subnet', a1, 'static-mapping', a2]

    def get_subnet_static_mapping_description(self, a0, a1, a2, a3) -> List[str]:
        return ['service', 'dhcpv6-server', 'shared-network-name', a0, 'subnet', a1, 'static-mapping', a2, 'description', a3]

    def get_subnet_static_mapping_disable(self, a0, a1, a2) -> List[str]:
        return ['service', 'dhcpv6-server', 'shared-network-name', a0, 'subnet', a1, 'static-mapping', a2, 'disable']

    def get_subnet_static_mapping_duid(self, a0, a1, a2, a3) -> List[str]:
        return ['service', 'dhcpv6-server', 'shared-network-name', a0, 'subnet', a1, 'static-mapping', a2, 'duid', a3]

    def get_subnet_static_mapping_identifier_duid(self, a0, a1, a2, a3) -> List[str]:
        return ['service', 'dhcpv6-server', 'shared-network-name', a0, 'subnet', a1, 'static-mapping', a2, 'identifier', 'duid', a3]

    def get_subnet_static_mapping_ipv6_address(self, a0, a1, a2, a3) -> List[str]:
        return ['service', 'dhcpv6-server', 'shared-network-name', a0, 'subnet', a1, 'static-mapping', a2, 'ipv6-address', a3]

    def get_subnet_static_mapping_ipv6_prefix(self, a0, a1, a2, a3) -> List[str]:
        return ['service', 'dhcpv6-server', 'shared-network-name', a0, 'subnet', a1, 'static-mapping', a2, 'ipv6-prefix', a3]

    def get_subnet_static_mapping_mac(self, a0, a1, a2, a3) -> List[str]:
        return ['service', 'dhcpv6-server', 'shared-network-name', a0, 'subnet', a1, 'static-mapping', a2, 'mac', a3]

    def get_subnet_static_mapping_option_domain_search(self, a0, a1, a2, a3) -> List[str]:
        return ['service', 'dhcpv6-server', 'shared-network-name', a0, 'subnet', a1, 'static-mapping', a2, 'option', 'domain-search', a3]

    def get_subnet_static_mapping_option_name_server(self, a0, a1, a2, a3) -> List[str]:
        return ['service', 'dhcpv6-server', 'shared-network-name', a0, 'subnet', a1, 'static-mapping', a2, 'option', 'name-server', a3]

    def get_subnet_static_mapping_option_nis_domain(self, a0, a1, a2, a3) -> List[str]:
        return ['service', 'dhcpv6-server', 'shared-network-name', a0, 'subnet', a1, 'static-mapping', a2, 'option', 'nis-domain', a3]

    def get_subnet_static_mapping_option_nis_server(self, a0, a1, a2, a3) -> List[str]:
        return ['service', 'dhcpv6-server', 'shared-network-name', a0, 'subnet', a1, 'static-mapping', a2, 'option', 'nis-server', a3]

    def get_subnet_static_mapping_option_nisplus_domain(self, a0, a1, a2, a3) -> List[str]:
        return ['service', 'dhcpv6-server', 'shared-network-name', a0, 'subnet', a1, 'static-mapping', a2, 'option', 'nisplus-domain', a3]

    def get_subnet_static_mapping_option_nisplus_server(self, a0, a1, a2, a3) -> List[str]:
        return ['service', 'dhcpv6-server', 'shared-network-name', a0, 'subnet', a1, 'static-mapping', a2, 'option', 'nisplus-server', a3]

    def get_subnet_static_mapping_option_sip_server(self, a0, a1, a2, a3) -> List[str]:
        return ['service', 'dhcpv6-server', 'shared-network-name', a0, 'subnet', a1, 'static-mapping', a2, 'option', 'sip-server', a3]

    def get_subnet_static_mapping_option_sntp_server(self, a0, a1, a2, a3) -> List[str]:
        return ['service', 'dhcpv6-server', 'shared-network-name', a0, 'subnet', a1, 'static-mapping', a2, 'option', 'sntp-server', a3]

    def get_subnet_vendor_option_cisco_bootfile(self, a0, a1, a2) -> List[str]:
        raise ValueError("vendor-option cisco bootfile is not a VyOS node")

    def get_subnet_vendor_option_cisco_tftp_server(self, a0, a1, a2) -> List[str]:
        return ['service', 'dhcpv6-server', 'shared-network-name', a0, 'subnet', a1, 'option', 'vendor-option', 'cisco', 'tftp-server', a2]
