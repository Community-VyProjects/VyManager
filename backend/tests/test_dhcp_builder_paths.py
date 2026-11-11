"""Golden (method, args, op, expected_path) cases for DHCPServerBatchBuilder.

Every path was checked against the service/dhcp-server template trees on the
1.4 lab (100.64.64.4) and the 1.5 lab (100.64.64.5). Rows whose path is the
same on both versions are in BOTH_CASES. A leaf whose path differs, or that
exists on only one version, has a row only in that version's list; the other
version's builder raises ValueError for a leaf it does not have.
"""

import inspect

import pytest

from vyos_builders.dhcp_server.dhcp_server_batch_builder import DHCPServerBatchBuilder

BOTH_CASES = [
    ('delete_dynamic_dns_update', (), 'delete', ['service', 'dhcp-server', 'dynamic-dns-update']),
    ('delete_failover_mode', (), 'delete', ['service', 'dhcp-server', 'high-availability', 'mode']),
    ('delete_failover_name', (), 'delete', ['service', 'dhcp-server', 'high-availability', 'name']),
    ('delete_failover_remote', (), 'delete', ['service', 'dhcp-server', 'high-availability', 'remote']),
    ('delete_failover_source_address', (), 'delete', ['service', 'dhcp-server', 'high-availability', 'source-address']),
    ('delete_failover_status', (), 'delete', ['service', 'dhcp-server', 'high-availability', 'status']),
    ('delete_global_disable', (), 'delete', ['service', 'dhcp-server', 'disable']),
    ('delete_hostfile_update', (), 'delete', ['service', 'dhcp-server', 'hostfile-update']),
    ('delete_listen_address', ('192.0.2.1',), 'delete', ['service', 'dhcp-server', 'listen-address', '192.0.2.1']),
    ('delete_shared_network', ('LAN',), 'delete', ['service', 'dhcp-server', 'shared-network-name', 'LAN']),
    ('delete_shared_network_authoritative', ('LAN',), 'delete', ['service', 'dhcp-server', 'shared-network-name', 'LAN', 'authoritative']),
    ('delete_shared_network_description', ('LAN',), 'delete', ['service', 'dhcp-server', 'shared-network-name', 'LAN', 'description']),
    ('delete_shared_network_disable', ('LAN',), 'delete', ['service', 'dhcp-server', 'shared-network-name', 'LAN', 'disable']),
    ('delete_shared_network_ping_check', ('LAN',), 'delete', ['service', 'dhcp-server', 'shared-network-name', 'LAN', 'ping-check']),
    ('delete_static_mapping', ('LAN', '192.168.1.0/24', 'host1'), 'delete', ['service', 'dhcp-server', 'shared-network-name', 'LAN', 'subnet', '192.168.1.0/24', 'static-mapping', 'host1']),
    ('delete_static_mapping_disable', ('LAN', '192.168.1.0/24', 'host1'), 'delete', ['service', 'dhcp-server', 'shared-network-name', 'LAN', 'subnet', '192.168.1.0/24', 'static-mapping', 'host1', 'disable']),
    ('delete_static_mapping_ip_address', ('LAN', '192.168.1.0/24', 'host1'), 'delete', ['service', 'dhcp-server', 'shared-network-name', 'LAN', 'subnet', '192.168.1.0/24', 'static-mapping', 'host1', 'ip-address']),
    ('delete_subnet', ('LAN', '192.168.1.0/24'), 'delete', ['service', 'dhcp-server', 'shared-network-name', 'LAN', 'subnet', '192.168.1.0/24']),
    ('delete_subnet_description', ('LAN', '192.168.1.0/24'), 'delete', ['service', 'dhcp-server', 'shared-network-name', 'LAN', 'subnet', '192.168.1.0/24', 'description']),
    ('delete_subnet_exclude', ('LAN', '192.168.1.0/24', '192.0.2.1'), 'delete', ['service', 'dhcp-server', 'shared-network-name', 'LAN', 'subnet', '192.168.1.0/24', 'exclude', '192.0.2.1']),
    ('delete_subnet_lease', ('LAN', '192.168.1.0/24'), 'delete', ['service', 'dhcp-server', 'shared-network-name', 'LAN', 'subnet', '192.168.1.0/24', 'lease']),
    ('delete_subnet_ping_check', ('LAN', '192.168.1.0/24'), 'delete', ['service', 'dhcp-server', 'shared-network-name', 'LAN', 'subnet', '192.168.1.0/24', 'ping-check']),
    ('delete_subnet_range', ('LAN', '192.168.1.0/24', '0'), 'delete', ['service', 'dhcp-server', 'shared-network-name', 'LAN', 'subnet', '192.168.1.0/24', 'range', '0']),
    ('delete_subnet_range_start', ('LAN', '192.168.1.0/24', '0'), 'delete', ['service', 'dhcp-server', 'shared-network-name', 'LAN', 'subnet', '192.168.1.0/24', 'range', '0', 'start']),
    ('delete_subnet_range_stop', ('LAN', '192.168.1.0/24', '0'), 'delete', ['service', 'dhcp-server', 'shared-network-name', 'LAN', 'subnet', '192.168.1.0/24', 'range', '0', 'stop']),
    ('set_failover_mode', ('active-active',), 'set', ['service', 'dhcp-server', 'high-availability', 'mode', 'active-active']),
    ('set_failover_name', ('peer1',), 'set', ['service', 'dhcp-server', 'high-availability', 'name', 'peer1']),
    ('set_failover_remote', ('192.0.2.1',), 'set', ['service', 'dhcp-server', 'high-availability', 'remote', '192.0.2.1']),
    ('set_failover_source_address', ('192.0.2.1',), 'set', ['service', 'dhcp-server', 'high-availability', 'source-address', '192.0.2.1']),
    ('set_failover_status', ('primary',), 'set', ['service', 'dhcp-server', 'high-availability', 'status', 'primary']),
    ('set_global_disable', (), 'set', ['service', 'dhcp-server', 'disable']),
    ('set_hostfile_update', (), 'set', ['service', 'dhcp-server', 'hostfile-update']),
    ('set_listen_address', ('192.0.2.1',), 'set', ['service', 'dhcp-server', 'listen-address', '192.0.2.1']),
    ('set_shared_network', ('LAN',), 'set', ['service', 'dhcp-server', 'shared-network-name', 'LAN']),
    ('set_shared_network_authoritative', ('LAN',), 'set', ['service', 'dhcp-server', 'shared-network-name', 'LAN', 'authoritative']),
    ('set_shared_network_description', ('LAN', 'desc'), 'set', ['service', 'dhcp-server', 'shared-network-name', 'LAN', 'description', 'desc']),
    ('set_shared_network_disable', ('LAN',), 'set', ['service', 'dhcp-server', 'shared-network-name', 'LAN', 'disable']),
    ('set_shared_network_ping_check', ('LAN',), 'set', ['service', 'dhcp-server', 'shared-network-name', 'LAN', 'ping-check']),
    ('set_static_mapping', ('LAN', '192.168.1.0/24', 'host1'), 'set', ['service', 'dhcp-server', 'shared-network-name', 'LAN', 'subnet', '192.168.1.0/24', 'static-mapping', 'host1']),
    ('set_static_mapping_disable', ('LAN', '192.168.1.0/24', 'host1'), 'set', ['service', 'dhcp-server', 'shared-network-name', 'LAN', 'subnet', '192.168.1.0/24', 'static-mapping', 'host1', 'disable']),
    ('set_static_mapping_ip_address', ('LAN', '192.168.1.0/24', 'host1', '192.168.1.10'), 'set', ['service', 'dhcp-server', 'shared-network-name', 'LAN', 'subnet', '192.168.1.0/24', 'static-mapping', 'host1', 'ip-address', '192.168.1.10']),
    ('set_subnet', ('LAN', '192.168.1.0/24'), 'set', ['service', 'dhcp-server', 'shared-network-name', 'LAN', 'subnet', '192.168.1.0/24']),
    ('set_subnet_description', ('LAN', '192.168.1.0/24', 'desc'), 'set', ['service', 'dhcp-server', 'shared-network-name', 'LAN', 'subnet', '192.168.1.0/24', 'description', 'desc']),
    ('set_subnet_exclude', ('LAN', '192.168.1.0/24', '192.0.2.1'), 'set', ['service', 'dhcp-server', 'shared-network-name', 'LAN', 'subnet', '192.168.1.0/24', 'exclude', '192.0.2.1']),
    ('set_subnet_lease', ('LAN', '192.168.1.0/24', '86400'), 'set', ['service', 'dhcp-server', 'shared-network-name', 'LAN', 'subnet', '192.168.1.0/24', 'lease', '86400']),
    ('set_subnet_ping_check', ('LAN', '192.168.1.0/24'), 'set', ['service', 'dhcp-server', 'shared-network-name', 'LAN', 'subnet', '192.168.1.0/24', 'ping-check']),
    ('set_subnet_range', ('LAN', '192.168.1.0/24', '0'), 'set', ['service', 'dhcp-server', 'shared-network-name', 'LAN', 'subnet', '192.168.1.0/24', 'range', '0']),
    ('set_subnet_range_start', ('LAN', '192.168.1.0/24', '0', '192.168.1.100'), 'set', ['service', 'dhcp-server', 'shared-network-name', 'LAN', 'subnet', '192.168.1.0/24', 'range', '0', 'start', '192.168.1.100']),
    ('set_subnet_range_stop', ('LAN', '192.168.1.0/24', '0', '192.168.1.200'), 'set', ['service', 'dhcp-server', 'shared-network-name', 'LAN', 'subnet', '192.168.1.0/24', 'range', '0', 'stop', '192.168.1.200']),
]

V14_CASES = [
    ('delete_global_catalog', ('global-parameters|authoritative;',), 'delete', ['service', 'dhcp-server', 'global-parameters', 'authoritative;']),
    ('delete_host_decl_name', (), 'delete', ['service', 'dhcp-server', 'host-decl-name']),
    ('delete_network_catalog', ('LAN', 'ntp-server|192.0.2.123'), 'delete', ['service', 'dhcp-server', 'shared-network-name', 'LAN', 'ntp-server', '192.0.2.123']),
    ('delete_shared_network_domain_name', ('LAN',), 'delete', ['service', 'dhcp-server', 'shared-network-name', 'LAN', 'domain-name']),
    ('delete_shared_network_domain_search', ('LAN', 'example.com'), 'delete', ['service', 'dhcp-server', 'shared-network-name', 'LAN', 'domain-search', 'example.com']),
    ('delete_shared_network_name_server', ('LAN', '192.0.2.53'), 'delete', ['service', 'dhcp-server', 'shared-network-name', 'LAN', 'name-server', '192.0.2.53']),
    ('delete_static_mapping_mac_address', ('LAN', '192.168.1.0/24', 'host1'), 'delete', ['service', 'dhcp-server', 'shared-network-name', 'LAN', 'subnet', '192.168.1.0/24', 'static-mapping', 'host1', 'mac-address']),
    ('delete_subnet_bootfile_name', ('LAN', '192.168.1.0/24'), 'delete', ['service', 'dhcp-server', 'shared-network-name', 'LAN', 'subnet', '192.168.1.0/24', 'bootfile-name']),
    ('delete_subnet_bootfile_server', ('LAN', '192.168.1.0/24'), 'delete', ['service', 'dhcp-server', 'shared-network-name', 'LAN', 'subnet', '192.168.1.0/24', 'bootfile-server']),
    ('delete_subnet_catalog', ('LAN', '192.168.1.0/24', 'bootfile-size'), 'delete', ['service', 'dhcp-server', 'shared-network-name', 'LAN', 'subnet', '192.168.1.0/24', 'bootfile-size']),
    ('delete_subnet_client_prefix_length', ('LAN', '192.168.1.0/24'), 'delete', ['service', 'dhcp-server', 'shared-network-name', 'LAN', 'subnet', '192.168.1.0/24', 'client-prefix-length']),
    ('delete_subnet_default_router', ('LAN', '192.168.1.0/24'), 'delete', ['service', 'dhcp-server', 'shared-network-name', 'LAN', 'subnet', '192.168.1.0/24', 'default-router']),
    ('delete_subnet_domain_name', ('LAN', '192.168.1.0/24'), 'delete', ['service', 'dhcp-server', 'shared-network-name', 'LAN', 'subnet', '192.168.1.0/24', 'domain-name']),
    ('delete_subnet_domain_search', ('LAN', '192.168.1.0/24', 'example.com'), 'delete', ['service', 'dhcp-server', 'shared-network-name', 'LAN', 'subnet', '192.168.1.0/24', 'domain-search', 'example.com']),
    ('delete_subnet_enable_failover', ('LAN', '192.168.1.0/24'), 'delete', ['service', 'dhcp-server', 'shared-network-name', 'LAN', 'subnet', '192.168.1.0/24', 'enable-failover']),
    ('delete_subnet_name_server', ('LAN', '192.168.1.0/24', '192.0.2.53'), 'delete', ['service', 'dhcp-server', 'shared-network-name', 'LAN', 'subnet', '192.168.1.0/24', 'name-server', '192.0.2.53']),
    ('delete_subnet_ntp_server', ('LAN', '192.168.1.0/24', '192.0.2.123'), 'delete', ['service', 'dhcp-server', 'shared-network-name', 'LAN', 'subnet', '192.168.1.0/24', 'ntp-server', '192.0.2.123']),
    ('delete_subnet_tftp_server_name', ('LAN', '192.168.1.0/24'), 'delete', ['service', 'dhcp-server', 'shared-network-name', 'LAN', 'subnet', '192.168.1.0/24', 'tftp-server-name']),
    ('delete_subnet_time_offset', ('LAN', '192.168.1.0/24'), 'delete', ['service', 'dhcp-server', 'shared-network-name', 'LAN', 'subnet', '192.168.1.0/24', 'time-offset']),
    ('delete_subnet_time_server', ('LAN', '192.168.1.0/24', '192.0.2.123'), 'delete', ['service', 'dhcp-server', 'shared-network-name', 'LAN', 'subnet', '192.168.1.0/24', 'time-server', '192.0.2.123']),
    ('delete_subnet_wins_server', ('LAN', '192.168.1.0/24', '192.0.2.139'), 'delete', ['service', 'dhcp-server', 'shared-network-name', 'LAN', 'subnet', '192.168.1.0/24', 'wins-server', '192.0.2.139']),
    ('delete_subnet_wpad_url', ('LAN', '192.168.1.0/24'), 'delete', ['service', 'dhcp-server', 'shared-network-name', 'LAN', 'subnet', '192.168.1.0/24', 'wpad-url']),
    ('set_dynamic_dns_update', (), 'set', ['service', 'dhcp-server', 'dynamic-dns-update']),
    ('set_global_catalog', ('global-parameters|authoritative;',), 'set', ['service', 'dhcp-server', 'global-parameters', 'authoritative;']),
    ('set_host_decl_name', (), 'set', ['service', 'dhcp-server', 'host-decl-name']),
    ('set_network_catalog', ('LAN', 'ntp-server|192.0.2.123'), 'set', ['service', 'dhcp-server', 'shared-network-name', 'LAN', 'ntp-server', '192.0.2.123']),
    ('set_shared_network_domain_name', ('LAN', 'example.com'), 'set', ['service', 'dhcp-server', 'shared-network-name', 'LAN', 'domain-name', 'example.com']),
    ('set_shared_network_domain_search', ('LAN', 'example.com'), 'set', ['service', 'dhcp-server', 'shared-network-name', 'LAN', 'domain-search', 'example.com']),
    ('set_shared_network_name_server', ('LAN', '192.0.2.53'), 'set', ['service', 'dhcp-server', 'shared-network-name', 'LAN', 'name-server', '192.0.2.53']),
    ('set_static_mapping_mac_address', ('LAN', '192.168.1.0/24', 'host1', '00:11:22:33:44:55'), 'set', ['service', 'dhcp-server', 'shared-network-name', 'LAN', 'subnet', '192.168.1.0/24', 'static-mapping', 'host1', 'mac-address', '00:11:22:33:44:55']),
    ('set_subnet_bootfile_name', ('LAN', '192.168.1.0/24', 'pxelinux.0'), 'set', ['service', 'dhcp-server', 'shared-network-name', 'LAN', 'subnet', '192.168.1.0/24', 'bootfile-name', 'pxelinux.0']),
    ('set_subnet_bootfile_server', ('LAN', '192.168.1.0/24', '192.0.2.10'), 'set', ['service', 'dhcp-server', 'shared-network-name', 'LAN', 'subnet', '192.168.1.0/24', 'bootfile-server', '192.0.2.10']),
    ('set_subnet_catalog', ('LAN', '192.168.1.0/24', 'bootfile-size|4'), 'set', ['service', 'dhcp-server', 'shared-network-name', 'LAN', 'subnet', '192.168.1.0/24', 'bootfile-size', '4']),
    ('set_subnet_client_prefix_length', ('LAN', '192.168.1.0/24', '24'), 'set', ['service', 'dhcp-server', 'shared-network-name', 'LAN', 'subnet', '192.168.1.0/24', 'client-prefix-length', '24']),
    ('set_subnet_default_router', ('LAN', '192.168.1.0/24', '192.168.1.1'), 'set', ['service', 'dhcp-server', 'shared-network-name', 'LAN', 'subnet', '192.168.1.0/24', 'default-router', '192.168.1.1']),
    ('set_subnet_domain_name', ('LAN', '192.168.1.0/24', 'example.com'), 'set', ['service', 'dhcp-server', 'shared-network-name', 'LAN', 'subnet', '192.168.1.0/24', 'domain-name', 'example.com']),
    ('set_subnet_domain_search', ('LAN', '192.168.1.0/24', 'example.com'), 'set', ['service', 'dhcp-server', 'shared-network-name', 'LAN', 'subnet', '192.168.1.0/24', 'domain-search', 'example.com']),
    ('set_subnet_enable_failover', ('LAN', '192.168.1.0/24'), 'set', ['service', 'dhcp-server', 'shared-network-name', 'LAN', 'subnet', '192.168.1.0/24', 'enable-failover']),
    ('set_subnet_name_server', ('LAN', '192.168.1.0/24', '192.0.2.53'), 'set', ['service', 'dhcp-server', 'shared-network-name', 'LAN', 'subnet', '192.168.1.0/24', 'name-server', '192.0.2.53']),
    ('set_subnet_ntp_server', ('LAN', '192.168.1.0/24', '192.0.2.123'), 'set', ['service', 'dhcp-server', 'shared-network-name', 'LAN', 'subnet', '192.168.1.0/24', 'ntp-server', '192.0.2.123']),
    ('set_subnet_tftp_server_name', ('LAN', '192.168.1.0/24', 'tftp.example.com'), 'set', ['service', 'dhcp-server', 'shared-network-name', 'LAN', 'subnet', '192.168.1.0/24', 'tftp-server-name', 'tftp.example.com']),
    ('set_subnet_time_offset', ('LAN', '192.168.1.0/24', '-18000'), 'set', ['service', 'dhcp-server', 'shared-network-name', 'LAN', 'subnet', '192.168.1.0/24', 'time-offset', '-18000']),
    ('set_subnet_time_server', ('LAN', '192.168.1.0/24', '192.0.2.123'), 'set', ['service', 'dhcp-server', 'shared-network-name', 'LAN', 'subnet', '192.168.1.0/24', 'time-server', '192.0.2.123']),
    ('set_subnet_wins_server', ('LAN', '192.168.1.0/24', '192.0.2.139'), 'set', ['service', 'dhcp-server', 'shared-network-name', 'LAN', 'subnet', '192.168.1.0/24', 'wins-server', '192.0.2.139']),
    ('set_subnet_wpad_url', ('LAN', '192.168.1.0/24', 'http://wpad.example.com/wpad.dat'), 'set', ['service', 'dhcp-server', 'shared-network-name', 'LAN', 'subnet', '192.168.1.0/24', 'wpad-url', 'http://wpad.example.com/wpad.dat']),
]

V15_CASES = [
    ('delete_client_class', ('CLS',), 'delete', ['service', 'dhcp-server', 'client-class', 'CLS']),
    ('delete_client_class_circuit_id', ('CLS',), 'delete', ['service', 'dhcp-server', 'client-class', 'CLS', 'relay-agent-information', 'circuit-id']),
    ('delete_client_class_disable', ('CLS',), 'delete', ['service', 'dhcp-server', 'client-class', 'CLS', 'disable']),
    ('delete_client_class_remote_id', ('CLS',), 'delete', ['service', 'dhcp-server', 'client-class', 'CLS', 'relay-agent-information', 'remote-id']),
    ('delete_ddns_domain', ('forward-domain', 'example.com'), 'delete', ['service', 'dhcp-server', 'dynamic-dns-update', 'forward-domain', 'example.com']),
    ('delete_ddns_domain_dns_server', ('forward-domain', 'example.com', '1'), 'delete', ['service', 'dhcp-server', 'dynamic-dns-update', 'forward-domain', 'example.com', 'dns-server', '1']),
    ('delete_ddns_domain_dns_server_port', ('forward-domain', 'example.com', '1'), 'delete', ['service', 'dhcp-server', 'dynamic-dns-update', 'forward-domain', 'example.com', 'dns-server', '1', 'port']),
    ('delete_ddns_domain_key_name', ('forward-domain', 'example.com'), 'delete', ['service', 'dhcp-server', 'dynamic-dns-update', 'forward-domain', 'example.com', 'key-name']),
    ('delete_ddns_scalar', ('ttl-percent',), 'delete', ['service', 'dhcp-server', 'dynamic-dns-update', 'ttl-percent']),
    ('delete_ddns_send_updates', (), 'delete', ['service', 'dhcp-server', 'dynamic-dns-update', 'send-updates']),
    ('delete_ddns_tsig_key', ('k1',), 'delete', ['service', 'dhcp-server', 'dynamic-dns-update', 'tsig-key', 'k1']),
    ('delete_failover_ca_certificate', (), 'delete', ['service', 'dhcp-server', 'high-availability', 'ca-certificate']),
    ('delete_failover_certificate', (), 'delete', ['service', 'dhcp-server', 'high-availability', 'certificate']),
    ('delete_global_catalog', ('log-level',), 'delete', ['service', 'dhcp-server', 'log-level']),
    ('delete_listen_interface', ('eth0',), 'delete', ['service', 'dhcp-server', 'listen-interface', 'eth0']),
    ('delete_mapping_catalog', ('LAN', '192.168.1.0/24', 'host1|bootfile-name'), 'delete', ['service', 'dhcp-server', 'shared-network-name', 'LAN', 'subnet', '192.168.1.0/24', 'static-mapping', 'host1', 'option', 'bootfile-name']),
    ('delete_network_catalog', ('LAN', 'pop-server|192.0.2.1'), 'delete', ['service', 'dhcp-server', 'shared-network-name', 'LAN', 'option', 'pop-server', '192.0.2.1']),
    ('delete_range_catalog', ('LAN', '192.168.1.0/24', '0|bootfile-size'), 'delete', ['service', 'dhcp-server', 'shared-network-name', 'LAN', 'subnet', '192.168.1.0/24', 'range', '0', 'option', 'bootfile-size']),
    ('delete_shared_network_domain_name', ('LAN',), 'delete', ['service', 'dhcp-server', 'shared-network-name', 'LAN', 'option', 'domain-name']),
    ('delete_shared_network_domain_search', ('LAN', 'example.com'), 'delete', ['service', 'dhcp-server', 'shared-network-name', 'LAN', 'option', 'domain-search', 'example.com']),
    ('delete_shared_network_name_server', ('LAN', '192.0.2.53'), 'delete', ['service', 'dhcp-server', 'shared-network-name', 'LAN', 'option', 'name-server', '192.0.2.53']),
    ('delete_static_mapping_description', ('LAN', '192.168.1.0/24', 'host1'), 'delete', ['service', 'dhcp-server', 'shared-network-name', 'LAN', 'subnet', '192.168.1.0/24', 'static-mapping', 'host1', 'description']),
    ('delete_static_mapping_duid', ('LAN', '192.168.1.0/24', 'host1'), 'delete', ['service', 'dhcp-server', 'shared-network-name', 'LAN', 'subnet', '192.168.1.0/24', 'static-mapping', 'host1', 'duid']),
    ('delete_static_mapping_mac_address', ('LAN', '192.168.1.0/24', 'host1'), 'delete', ['service', 'dhcp-server', 'shared-network-name', 'LAN', 'subnet', '192.168.1.0/24', 'static-mapping', 'host1', 'mac']),
    ('delete_subnet_bootfile_name', ('LAN', '192.168.1.0/24'), 'delete', ['service', 'dhcp-server', 'shared-network-name', 'LAN', 'subnet', '192.168.1.0/24', 'option', 'bootfile-name']),
    ('delete_subnet_bootfile_server', ('LAN', '192.168.1.0/24'), 'delete', ['service', 'dhcp-server', 'shared-network-name', 'LAN', 'subnet', '192.168.1.0/24', 'option', 'bootfile-server']),
    ('delete_subnet_catalog', ('LAN', '192.168.1.0/24', 'bootfile-size'), 'delete', ['service', 'dhcp-server', 'shared-network-name', 'LAN', 'subnet', '192.168.1.0/24', 'option', 'bootfile-size']),
    ('delete_subnet_client_prefix_length', ('LAN', '192.168.1.0/24'), 'delete', ['service', 'dhcp-server', 'shared-network-name', 'LAN', 'subnet', '192.168.1.0/24', 'option', 'client-prefix-length']),
    ('delete_subnet_default_router', ('LAN', '192.168.1.0/24'), 'delete', ['service', 'dhcp-server', 'shared-network-name', 'LAN', 'subnet', '192.168.1.0/24', 'option', 'default-router']),
    ('delete_subnet_disable', ('LAN', '192.168.1.0/24'), 'delete', ['service', 'dhcp-server', 'shared-network-name', 'LAN', 'subnet', '192.168.1.0/24', 'disable']),
    ('delete_subnet_domain_name', ('LAN', '192.168.1.0/24'), 'delete', ['service', 'dhcp-server', 'shared-network-name', 'LAN', 'subnet', '192.168.1.0/24', 'option', 'domain-name']),
    ('delete_subnet_domain_search', ('LAN', '192.168.1.0/24', 'example.com'), 'delete', ['service', 'dhcp-server', 'shared-network-name', 'LAN', 'subnet', '192.168.1.0/24', 'option', 'domain-search', 'example.com']),
    ('delete_subnet_name_server', ('LAN', '192.168.1.0/24', '192.0.2.53'), 'delete', ['service', 'dhcp-server', 'shared-network-name', 'LAN', 'subnet', '192.168.1.0/24', 'option', 'name-server', '192.0.2.53']),
    ('delete_subnet_ntp_server', ('LAN', '192.168.1.0/24', '192.0.2.123'), 'delete', ['service', 'dhcp-server', 'shared-network-name', 'LAN', 'subnet', '192.168.1.0/24', 'option', 'ntp-server', '192.0.2.123']),
    ('delete_subnet_tftp_server_name', ('LAN', '192.168.1.0/24'), 'delete', ['service', 'dhcp-server', 'shared-network-name', 'LAN', 'subnet', '192.168.1.0/24', 'option', 'tftp-server-name']),
    ('delete_subnet_time_offset', ('LAN', '192.168.1.0/24'), 'delete', ['service', 'dhcp-server', 'shared-network-name', 'LAN', 'subnet', '192.168.1.0/24', 'option', 'time-offset']),
    ('delete_subnet_time_server', ('LAN', '192.168.1.0/24', '192.0.2.123'), 'delete', ['service', 'dhcp-server', 'shared-network-name', 'LAN', 'subnet', '192.168.1.0/24', 'option', 'time-server', '192.0.2.123']),
    ('delete_subnet_wins_server', ('LAN', '192.168.1.0/24', '192.0.2.139'), 'delete', ['service', 'dhcp-server', 'shared-network-name', 'LAN', 'subnet', '192.168.1.0/24', 'option', 'wins-server', '192.0.2.139']),
    ('delete_subnet_wpad_url', ('LAN', '192.168.1.0/24'), 'delete', ['service', 'dhcp-server', 'shared-network-name', 'LAN', 'subnet', '192.168.1.0/24', 'option', 'wpad-url']),
    ('set_client_class', ('CLS',), 'set', ['service', 'dhcp-server', 'client-class', 'CLS']),
    ('set_client_class_circuit_id', ('CLS', 'ge-0'), 'set', ['service', 'dhcp-server', 'client-class', 'CLS', 'relay-agent-information', 'circuit-id', 'ge-0']),
    ('set_client_class_disable', ('CLS',), 'set', ['service', 'dhcp-server', 'client-class', 'CLS', 'disable']),
    ('set_client_class_remote_id', ('CLS', 'aa:bb'), 'set', ['service', 'dhcp-server', 'client-class', 'CLS', 'relay-agent-information', 'remote-id', 'aa:bb']),
    ('set_ddns_domain', ('forward-domain', 'example.com'), 'set', ['service', 'dhcp-server', 'dynamic-dns-update', 'forward-domain', 'example.com']),
    ('set_ddns_domain_dns_server_address', ('forward-domain', 'example.com', '1', '192.0.2.1'), 'set', ['service', 'dhcp-server', 'dynamic-dns-update', 'forward-domain', 'example.com', 'dns-server', '1', 'address', '192.0.2.1']),
    ('set_ddns_domain_dns_server_port', ('forward-domain', 'example.com', '1', '53'), 'set', ['service', 'dhcp-server', 'dynamic-dns-update', 'forward-domain', 'example.com', 'dns-server', '1', 'port', '53']),
    ('set_ddns_domain_key_name', ('forward-domain', 'example.com', 'k1'), 'set', ['service', 'dhcp-server', 'dynamic-dns-update', 'forward-domain', 'example.com', 'key-name', 'k1']),
    ('set_ddns_scalar', ('ttl-percent|50',), 'set', ['service', 'dhcp-server', 'dynamic-dns-update', 'ttl-percent', '50']),
    ('set_ddns_send_updates', ('enable',), 'set', ['service', 'dhcp-server', 'dynamic-dns-update', 'send-updates', 'enable']),
    ('set_ddns_tsig_key', ('k1',), 'set', ['service', 'dhcp-server', 'dynamic-dns-update', 'tsig-key', 'k1']),
    ('set_ddns_tsig_key_algorithm', ('k1', 'sha256'), 'set', ['service', 'dhcp-server', 'dynamic-dns-update', 'tsig-key', 'k1', 'algorithm', 'sha256']),
    ('set_ddns_tsig_key_secret', ('k1', 'c2VjcmV0'), 'set', ['service', 'dhcp-server', 'dynamic-dns-update', 'tsig-key', 'k1', 'secret', 'c2VjcmV0']),
    ('set_failover_ca_certificate', ('CA',), 'set', ['service', 'dhcp-server', 'high-availability', 'ca-certificate', 'CA']),
    ('set_failover_certificate', ('CERT',), 'set', ['service', 'dhcp-server', 'high-availability', 'certificate', 'CERT']),
    ('set_global_catalog', ('log-level|debug',), 'set', ['service', 'dhcp-server', 'log-level', 'debug']),
    ('set_listen_interface', ('eth0',), 'set', ['service', 'dhcp-server', 'listen-interface', 'eth0']),
    ('set_mapping_catalog', ('LAN', '192.168.1.0/24', 'host1|bootfile-name|pxelinux.0'), 'set', ['service', 'dhcp-server', 'shared-network-name', 'LAN', 'subnet', '192.168.1.0/24', 'static-mapping', 'host1', 'option', 'bootfile-name', 'pxelinux.0']),
    ('set_network_catalog', ('LAN', 'pop-server|192.0.2.1'), 'set', ['service', 'dhcp-server', 'shared-network-name', 'LAN', 'option', 'pop-server', '192.0.2.1']),
    ('set_range_catalog', ('LAN', '192.168.1.0/24', '0|bootfile-size|4'), 'set', ['service', 'dhcp-server', 'shared-network-name', 'LAN', 'subnet', '192.168.1.0/24', 'range', '0', 'option', 'bootfile-size', '4']),
    ('set_shared_network_domain_name', ('LAN', 'example.com'), 'set', ['service', 'dhcp-server', 'shared-network-name', 'LAN', 'option', 'domain-name', 'example.com']),
    ('set_shared_network_domain_search', ('LAN', 'example.com'), 'set', ['service', 'dhcp-server', 'shared-network-name', 'LAN', 'option', 'domain-search', 'example.com']),
    ('set_shared_network_name_server', ('LAN', '192.0.2.53'), 'set', ['service', 'dhcp-server', 'shared-network-name', 'LAN', 'option', 'name-server', '192.0.2.53']),
    ('set_static_mapping_description', ('LAN', '192.168.1.0/24', 'host1', 'desc'), 'set', ['service', 'dhcp-server', 'shared-network-name', 'LAN', 'subnet', '192.168.1.0/24', 'static-mapping', 'host1', 'description', 'desc']),
    ('set_static_mapping_duid', ('LAN', '192.168.1.0/24', 'host1', '00:01:02'), 'set', ['service', 'dhcp-server', 'shared-network-name', 'LAN', 'subnet', '192.168.1.0/24', 'static-mapping', 'host1', 'duid', '00:01:02']),
    ('set_static_mapping_mac_address', ('LAN', '192.168.1.0/24', 'host1', '00:11:22:33:44:55'), 'set', ['service', 'dhcp-server', 'shared-network-name', 'LAN', 'subnet', '192.168.1.0/24', 'static-mapping', 'host1', 'mac', '00:11:22:33:44:55']),
    ('set_subnet_bootfile_name', ('LAN', '192.168.1.0/24', 'pxelinux.0'), 'set', ['service', 'dhcp-server', 'shared-network-name', 'LAN', 'subnet', '192.168.1.0/24', 'option', 'bootfile-name', 'pxelinux.0']),
    ('set_subnet_bootfile_server', ('LAN', '192.168.1.0/24', '192.0.2.10'), 'set', ['service', 'dhcp-server', 'shared-network-name', 'LAN', 'subnet', '192.168.1.0/24', 'option', 'bootfile-server', '192.0.2.10']),
    ('set_subnet_catalog', ('LAN', '192.168.1.0/24', 'bootfile-size|4'), 'set', ['service', 'dhcp-server', 'shared-network-name', 'LAN', 'subnet', '192.168.1.0/24', 'option', 'bootfile-size', '4']),
    ('set_subnet_client_prefix_length', ('LAN', '192.168.1.0/24', '24'), 'set', ['service', 'dhcp-server', 'shared-network-name', 'LAN', 'subnet', '192.168.1.0/24', 'option', 'client-prefix-length', '24']),
    ('set_subnet_default_router', ('LAN', '192.168.1.0/24', '192.168.1.1'), 'set', ['service', 'dhcp-server', 'shared-network-name', 'LAN', 'subnet', '192.168.1.0/24', 'option', 'default-router', '192.168.1.1']),
    ('set_subnet_disable', ('LAN', '192.168.1.0/24'), 'set', ['service', 'dhcp-server', 'shared-network-name', 'LAN', 'subnet', '192.168.1.0/24', 'disable']),
    ('set_subnet_domain_name', ('LAN', '192.168.1.0/24', 'example.com'), 'set', ['service', 'dhcp-server', 'shared-network-name', 'LAN', 'subnet', '192.168.1.0/24', 'option', 'domain-name', 'example.com']),
    ('set_subnet_domain_search', ('LAN', '192.168.1.0/24', 'example.com'), 'set', ['service', 'dhcp-server', 'shared-network-name', 'LAN', 'subnet', '192.168.1.0/24', 'option', 'domain-search', 'example.com']),
    ('set_subnet_name_server', ('LAN', '192.168.1.0/24', '192.0.2.53'), 'set', ['service', 'dhcp-server', 'shared-network-name', 'LAN', 'subnet', '192.168.1.0/24', 'option', 'name-server', '192.0.2.53']),
    ('set_subnet_ntp_server', ('LAN', '192.168.1.0/24', '192.0.2.123'), 'set', ['service', 'dhcp-server', 'shared-network-name', 'LAN', 'subnet', '192.168.1.0/24', 'option', 'ntp-server', '192.0.2.123']),
    ('set_subnet_subnet_id', ('LAN', '192.168.1.0/24', 1), 'set', ['service', 'dhcp-server', 'shared-network-name', 'LAN', 'subnet', '192.168.1.0/24', 'subnet-id', '1']),
    ('set_subnet_tftp_server_name', ('LAN', '192.168.1.0/24', 'tftp.example.com'), 'set', ['service', 'dhcp-server', 'shared-network-name', 'LAN', 'subnet', '192.168.1.0/24', 'option', 'tftp-server-name', 'tftp.example.com']),
    ('set_subnet_time_offset', ('LAN', '192.168.1.0/24', '-18000'), 'set', ['service', 'dhcp-server', 'shared-network-name', 'LAN', 'subnet', '192.168.1.0/24', 'option', 'time-offset', '-18000']),
    ('set_subnet_time_server', ('LAN', '192.168.1.0/24', '192.0.2.123'), 'set', ['service', 'dhcp-server', 'shared-network-name', 'LAN', 'subnet', '192.168.1.0/24', 'option', 'time-server', '192.0.2.123']),
    ('set_subnet_wins_server', ('LAN', '192.168.1.0/24', '192.0.2.139'), 'set', ['service', 'dhcp-server', 'shared-network-name', 'LAN', 'subnet', '192.168.1.0/24', 'option', 'wins-server', '192.0.2.139']),
    ('set_subnet_wpad_url', ('LAN', '192.168.1.0/24', 'http://wpad.example.com/wpad.dat'), 'set', ['service', 'dhcp-server', 'shared-network-name', 'LAN', 'subnet', '192.168.1.0/24', 'option', 'wpad-url', 'http://wpad.example.com/wpad.dat']),
]

VERSIONS = {"1.4": V14_CASES, "1.5": V15_CASES}


@pytest.mark.parametrize("method, args, op, expected_path", BOTH_CASES)
@pytest.mark.parametrize("version", ["1.4", "1.5"])
def test_dhcp_builder_shared_paths(method, args, op, expected_path, version):
    builder = DHCPServerBatchBuilder(version=version)
    getattr(builder, method)(*args)
    operations = builder.get_operations()
    assert [(item["op"], item["path"]) for item in operations] == [(op, expected_path)]


@pytest.mark.parametrize(
    "version, method, args, op, expected_path",
    [(version, *row) for version, rows in VERSIONS.items() for row in rows],
)
def test_dhcp_builder_version_paths(version, method, args, op, expected_path):
    builder = DHCPServerBatchBuilder(version=version)
    getattr(builder, method)(*args)
    operations = builder.get_operations()
    assert [(item["op"], item["path"]) for item in operations] == [(op, expected_path)]


@pytest.mark.parametrize(
    "version, other, method, args",
    [
        (version, other, row[0], row[1])
        for version, other in (("1.4", "1.5"), ("1.5", "1.4"))
        for row in VERSIONS[version]
        if row[0] not in {r[0] for r in VERSIONS[other]}
    ],
)
def test_dhcp_builder_rejects_other_version_leaf(version, other, method, args):
    builder = DHCPServerBatchBuilder(version=other)
    with pytest.raises(ValueError, match="not supported"):
        getattr(builder, method)(*args)


def test_every_builder_op_has_a_golden_row():
    builder = DHCPServerBatchBuilder(version="1.5")
    ops = {
        name
        for name, _ in inspect.getmembers(builder, inspect.ismethod)
        if name.startswith(("set_", "delete_", "create_"))
    }
    covered = {row[0] for row in BOTH_CASES + V14_CASES + V15_CASES}
    assert ops - covered == set()
