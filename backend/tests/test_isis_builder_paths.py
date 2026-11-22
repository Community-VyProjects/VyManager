"""Golden (method, args, op, expected_path) cases for IsisBatchBuilder.

Paths checked with validateTmplPath on 1.4 (100.64.64.4) and 1.5 (100.64.64.5).
Generated for issue #737; edit the tables directly if the mapper changes.
"""

import inspect
from pathlib import Path

import pytest

from vyos_builders.isis.isis_batch_builder import IsisBatchBuilder
from vyos_mappers.base import CommandMapperRegistry
from vyos_mappers.isis import isis_versions
from vyos_mappers.isis.isis import IsisMapper
from vyos_mappers.isis.isis_versions import IsisMapperV1_5


def _run(version, method, args, op, expected_path):
    builder = IsisBatchBuilder(version=version)
    getattr(builder, method)(*args)
    operations = builder.get_operations()
    assert [(item["op"], item["path"]) for item in operations] == [(op, expected_path)]

COMMON_CASES = [
    ('delete_advertise_high_metrics', (), 'delete', ['protocols', 'isis', 'advertise-high-metrics']),
    ('delete_advertise_passive_only', (), 'delete', ['protocols', 'isis', 'advertise-passive-only']),
    ('delete_area_password', (), 'delete', ['protocols', 'isis', 'area-password']),
    ('delete_attached_bit', (), 'delete', ['protocols', 'isis', 'set-attached-bit']),
    ('delete_default_info_ipv4', ('level-1',), 'delete', ['protocols', 'isis', 'default-information', 'originate', 'ipv4', 'level-1']),
    ('delete_default_info_ipv4_always', ('level-1',), 'delete', ['protocols', 'isis', 'default-information', 'originate', 'ipv4', 'level-1', 'always']),
    ('delete_default_info_ipv4_metric', ('level-1',), 'delete', ['protocols', 'isis', 'default-information', 'originate', 'ipv4', 'level-1', 'metric']),
    ('delete_default_info_ipv4_route_map', ('level-1',), 'delete', ['protocols', 'isis', 'default-information', 'originate', 'ipv4', 'level-1', 'route-map']),
    ('delete_domain_password', (), 'delete', ['protocols', 'isis', 'domain-password']),
    ('delete_dynamic_hostname', (), 'delete', ['protocols', 'isis', 'dynamic-hostname']),
    ('delete_frr_lfa_load_sharing_disable_level1', (), 'delete', ['protocols', 'isis', 'fast-reroute', 'lfa', 'local', 'load-sharing', 'disable', 'level-1']),
    ('delete_frr_lfa_load_sharing_disable_level2', (), 'delete', ['protocols', 'isis', 'fast-reroute', 'lfa', 'local', 'load-sharing', 'disable', 'level-2']),
    ('delete_interface', ('eth0',), 'delete', ['protocols', 'isis', 'interface', 'eth0']),
    ('delete_interface_bfd', ('eth0',), 'delete', ['protocols', 'isis', 'interface', 'eth0', 'bfd']),
    ('delete_interface_bfd_profile', ('eth0',), 'delete', ['protocols', 'isis', 'interface', 'eth0', 'bfd', 'profile']),
    ('delete_interface_circuit_type', ('eth0',), 'delete', ['protocols', 'isis', 'interface', 'eth0', 'circuit-type']),
    ('delete_interface_hello_interval', ('eth0',), 'delete', ['protocols', 'isis', 'interface', 'eth0', 'hello-interval']),
    ('delete_interface_hello_multiplier', ('eth0',), 'delete', ['protocols', 'isis', 'interface', 'eth0', 'hello-multiplier']),
    ('delete_interface_hello_padding', ('eth0',), 'delete', ['protocols', 'isis', 'interface', 'eth0', 'hello-padding']),
    ('delete_interface_ldp_sync', ('eth0',), 'delete', ['protocols', 'isis', 'interface', 'eth0', 'ldp-sync']),
    ('delete_interface_ldp_sync_disable', ('eth0',), 'delete', ['protocols', 'isis', 'interface', 'eth0', 'ldp-sync', 'disable']),
    ('delete_interface_metric', ('eth0',), 'delete', ['protocols', 'isis', 'interface', 'eth0', 'metric']),
    ('delete_interface_no_three_way_handshake', ('eth0',), 'delete', ['protocols', 'isis', 'interface', 'eth0', 'no-three-way-handshake']),
    ('delete_interface_passive', ('eth0',), 'delete', ['protocols', 'isis', 'interface', 'eth0', 'passive']),
    ('delete_interface_password', ('eth0',), 'delete', ['protocols', 'isis', 'interface', 'eth0', 'password']),
    ('delete_interface_point_to_point', ('eth0',), 'delete', ['protocols', 'isis', 'interface', 'eth0', 'network', 'point-to-point']),
    ('delete_interface_priority', ('eth0',), 'delete', ['protocols', 'isis', 'interface', 'eth0', 'priority']),
    ('delete_interface_psnp_interval', ('eth0',), 'delete', ['protocols', 'isis', 'interface', 'eth0', 'psnp-interval']),
    ('delete_isis', (), 'delete', ['protocols', 'isis']),
    ('delete_ldp_sync', (), 'delete', ['protocols', 'isis', 'ldp-sync']),
    ('delete_level', (), 'delete', ['protocols', 'isis', 'level']),
    ('delete_log_adjacency_changes', (), 'delete', ['protocols', 'isis', 'log-adjacency-changes']),
    ('delete_lsp_gen_interval', (), 'delete', ['protocols', 'isis', 'lsp-gen-interval']),
    ('delete_lsp_mtu', (), 'delete', ['protocols', 'isis', 'lsp-mtu']),
    ('delete_lsp_refresh_interval', (), 'delete', ['protocols', 'isis', 'lsp-refresh-interval']),
    ('delete_max_lsp_lifetime', (), 'delete', ['protocols', 'isis', 'max-lsp-lifetime']),
    ('delete_metric_style', (), 'delete', ['protocols', 'isis', 'metric-style']),
    ('delete_net', (), 'delete', ['protocols', 'isis', 'net']),
    ('delete_overload_bit', (), 'delete', ['protocols', 'isis', 'set-overload-bit']),
    ('delete_purge_originator', (), 'delete', ['protocols', 'isis', 'purge-originator']),
    ('delete_redistribute_ipv4', ('bgp', 'level-1'), 'delete', ['protocols', 'isis', 'redistribute', 'ipv4', 'bgp', 'level-1']),
    ('delete_redistribute_ipv4_metric', ('bgp', 'level-1'), 'delete', ['protocols', 'isis', 'redistribute', 'ipv4', 'bgp', 'level-1', 'metric']),
    ('delete_redistribute_ipv4_route_map', ('bgp', 'level-1'), 'delete', ['protocols', 'isis', 'redistribute', 'ipv4', 'bgp', 'level-1', 'route-map']),
    ('delete_spf_delay_ietf', (), 'delete', ['protocols', 'isis', 'spf-delay-ietf']),
    ('delete_spf_interval', (), 'delete', ['protocols', 'isis', 'spf-interval']),
    ('delete_sr_global_block', (), 'delete', ['protocols', 'isis', 'segment-routing', 'global-block']),
    ('delete_sr_local_block', (), 'delete', ['protocols', 'isis', 'segment-routing', 'local-block']),
    ('delete_sr_max_label_depth', (), 'delete', ['protocols', 'isis', 'segment-routing', 'maximum-label-depth']),
    ('delete_sr_prefix', ('10.0.0.0/8',), 'delete', ['protocols', 'isis', 'segment-routing', 'prefix', '10.0.0.0/8']),
    ('delete_sr_prefix_absolute_explicit_null', ('10.0.0.0/8',), 'delete', ['protocols', 'isis', 'segment-routing', 'prefix', '10.0.0.0/8', 'absolute', 'explicit-null']),
    ('delete_sr_prefix_absolute_no_php', ('10.0.0.0/8',), 'delete', ['protocols', 'isis', 'segment-routing', 'prefix', '10.0.0.0/8', 'absolute', 'no-php-flag']),
    ('delete_sr_prefix_index_explicit_null', ('10.0.0.0/8',), 'delete', ['protocols', 'isis', 'segment-routing', 'prefix', '10.0.0.0/8', 'index', 'explicit-null']),
    ('delete_sr_prefix_index_no_php', ('10.0.0.0/8',), 'delete', ['protocols', 'isis', 'segment-routing', 'prefix', '10.0.0.0/8', 'index', 'no-php-flag']),
    ('delete_te', (), 'delete', ['protocols', 'isis', 'traffic-engineering']),
    ('delete_te_address', (), 'delete', ['protocols', 'isis', 'traffic-engineering', 'address']),
    ('delete_te_enable', (), 'delete', ['protocols', 'isis', 'traffic-engineering', 'enable']),
    ('delete_topology', (), 'delete', ['protocols', 'isis', 'topology']),
    ('set_advertise_high_metrics', (), 'set', ['protocols', 'isis', 'advertise-high-metrics']),
    ('set_advertise_passive_only', (), 'set', ['protocols', 'isis', 'advertise-passive-only']),
    ('set_area_password_md5', ('secret',), 'set', ['protocols', 'isis', 'area-password', 'md5', 'secret']),
    ('set_area_password_plaintext', ('secret',), 'set', ['protocols', 'isis', 'area-password', 'plaintext-password', 'secret']),
    ('set_attached_bit', (), 'set', ['protocols', 'isis', 'set-attached-bit']),
    ('set_default_info_ipv4', ('level-1',), 'set', ['protocols', 'isis', 'default-information', 'originate', 'ipv4', 'level-1']),
    ('set_default_info_ipv4_always', ('level-1',), 'set', ['protocols', 'isis', 'default-information', 'originate', 'ipv4', 'level-1', 'always']),
    ('set_default_info_ipv4_metric', ('level-1', '5'), 'set', ['protocols', 'isis', 'default-information', 'originate', 'ipv4', 'level-1', 'metric', '5']),
    ('set_default_info_ipv4_route_map', ('level-1', 'RMAP'), 'set', ['protocols', 'isis', 'default-information', 'originate', 'ipv4', 'level-1', 'route-map', 'RMAP']),
    ('set_domain_password_plaintext', ('secret',), 'set', ['protocols', 'isis', 'domain-password', 'plaintext-password', 'secret']),
    ('set_dynamic_hostname', (), 'set', ['protocols', 'isis', 'dynamic-hostname']),
    ('set_frr_lfa_load_sharing_disable_level1', (), 'set', ['protocols', 'isis', 'fast-reroute', 'lfa', 'local', 'load-sharing', 'disable', 'level-1']),
    ('set_frr_lfa_load_sharing_disable_level2', (), 'set', ['protocols', 'isis', 'fast-reroute', 'lfa', 'local', 'load-sharing', 'disable', 'level-2']),
    ('set_interface', ('eth0',), 'set', ['protocols', 'isis', 'interface', 'eth0']),
    ('set_interface_bfd', ('eth0',), 'set', ['protocols', 'isis', 'interface', 'eth0', 'bfd']),
    ('set_interface_bfd_profile', ('eth0', 'G0'), 'set', ['protocols', 'isis', 'interface', 'eth0', 'bfd', 'profile', 'G0']),
    ('set_interface_circuit_type', ('eth0', 'level-2-only'), 'set', ['protocols', 'isis', 'interface', 'eth0', 'circuit-type', 'level-2-only']),
    ('set_interface_hello_interval', ('eth0', '5'), 'set', ['protocols', 'isis', 'interface', 'eth0', 'hello-interval', '5']),
    ('set_interface_hello_multiplier', ('eth0', '5'), 'set', ['protocols', 'isis', 'interface', 'eth0', 'hello-multiplier', '5']),
    ('set_interface_hello_padding', ('eth0',), 'set', ['protocols', 'isis', 'interface', 'eth0', 'hello-padding']),
    ('set_interface_ldp_sync_disable', ('eth0',), 'set', ['protocols', 'isis', 'interface', 'eth0', 'ldp-sync', 'disable']),
    ('set_interface_ldp_sync_holddown', ('eth0', '5'), 'set', ['protocols', 'isis', 'interface', 'eth0', 'ldp-sync', 'holddown', '5']),
    ('set_interface_metric', ('eth0', '5'), 'set', ['protocols', 'isis', 'interface', 'eth0', 'metric', '5']),
    ('set_interface_no_three_way_handshake', ('eth0',), 'set', ['protocols', 'isis', 'interface', 'eth0', 'no-three-way-handshake']),
    ('set_interface_passive', ('eth0',), 'set', ['protocols', 'isis', 'interface', 'eth0', 'passive']),
    ('set_interface_password_md5', ('eth0', 'secret'), 'set', ['protocols', 'isis', 'interface', 'eth0', 'password', 'md5', 'secret']),
    ('set_interface_password_plaintext', ('eth0', 'secret'), 'set', ['protocols', 'isis', 'interface', 'eth0', 'password', 'plaintext-password', 'secret']),
    ('set_interface_point_to_point', ('eth0',), 'set', ['protocols', 'isis', 'interface', 'eth0', 'network', 'point-to-point']),
    ('set_interface_priority', ('eth0', '5'), 'set', ['protocols', 'isis', 'interface', 'eth0', 'priority', '5']),
    ('set_interface_psnp_interval', ('eth0', '5'), 'set', ['protocols', 'isis', 'interface', 'eth0', 'psnp-interval', '5']),
    ('set_ldp_sync_holddown', ('5',), 'set', ['protocols', 'isis', 'ldp-sync', 'holddown', '5']),
    ('set_level', ('level-1',), 'set', ['protocols', 'isis', 'level', 'level-1']),
    ('set_log_adjacency_changes', (), 'set', ['protocols', 'isis', 'log-adjacency-changes']),
    ('set_lsp_gen_interval', ('5',), 'set', ['protocols', 'isis', 'lsp-gen-interval', '5']),
    ('set_lsp_mtu', ('5',), 'set', ['protocols', 'isis', 'lsp-mtu', '5']),
    ('set_lsp_refresh_interval', ('5',), 'set', ['protocols', 'isis', 'lsp-refresh-interval', '5']),
    ('set_max_lsp_lifetime', ('5',), 'set', ['protocols', 'isis', 'max-lsp-lifetime', '5']),
    ('set_metric_style', ('wide',), 'set', ['protocols', 'isis', 'metric-style', 'wide']),
    ('set_net', ('49.0001.1921.6800.1001.00',), 'set', ['protocols', 'isis', 'net', '49.0001.1921.6800.1001.00']),
    ('set_overload_bit', (), 'set', ['protocols', 'isis', 'set-overload-bit']),
    ('set_purge_originator', (), 'set', ['protocols', 'isis', 'purge-originator']),
    ('set_redistribute_ipv4', ('bgp', 'level-1'), 'set', ['protocols', 'isis', 'redistribute', 'ipv4', 'bgp', 'level-1']),
    ('set_redistribute_ipv4_metric', ('bgp', 'level-1', '5'), 'set', ['protocols', 'isis', 'redistribute', 'ipv4', 'bgp', 'level-1', 'metric', '5']),
    ('set_redistribute_ipv4_route_map', ('bgp', 'level-1', 'RMAP'), 'set', ['protocols', 'isis', 'redistribute', 'ipv4', 'bgp', 'level-1', 'route-map', 'RMAP']),
    ('set_redistribute_ipv4', ('babel', 'level-1'), 'set', ['protocols', 'isis', 'redistribute', 'ipv4', 'babel', 'level-1']),
    ('set_redistribute_ipv6', ('connected', 'level-1'), 'set', ['protocols', 'isis', 'redistribute', 'ipv6', 'connected', 'level-1']),
    ('set_redistribute_ipv6_metric', ('connected', 'level-1', '5'), 'set', ['protocols', 'isis', 'redistribute', 'ipv6', 'connected', 'level-1', 'metric', '5']),
    ('set_default_info_ipv6', ('level-1',), 'set', ['protocols', 'isis', 'default-information', 'originate', 'ipv6', 'level-1']),
    ('set_default_info_ipv6_always', ('level-1',), 'set', ['protocols', 'isis', 'default-information', 'originate', 'ipv6', 'level-1', 'always']),
    ('set_frr_lfa_priority_limit', ('critical', 'level-1'), 'set', ['protocols', 'isis', 'fast-reroute', 'lfa', 'local', 'priority-limit', 'critical', 'level-1']),
    ('set_frr_lfa_tiebreaker_index', ('downstream', '1', 'level-1'), 'set', ['protocols', 'isis', 'fast-reroute', 'lfa', 'local', 'tiebreaker', 'downstream', 'index', '1', 'level-1']),
    ('set_frr_lfa_remote_prefix_list', ('FOO', 'level-1'), 'set', ['protocols', 'isis', 'fast-reroute', 'lfa', 'remote', 'prefix-list', 'FOO', 'level-1']),
    ('delete_frr_lfa_priority_limit', ('critical', 'level-1'), 'delete', ['protocols', 'isis', 'fast-reroute', 'lfa', 'local', 'priority-limit', 'critical', 'level-1']),
    ('delete_redistribute_ipv6', ('connected', 'level-1'), 'delete', ['protocols', 'isis', 'redistribute', 'ipv6', 'connected', 'level-1']),
    ('delete_default_info_ipv6', ('level-1',), 'delete', ['protocols', 'isis', 'default-information', 'originate', 'ipv6', 'level-1']),
    ('set_spf_delay_ietf_holddown', ('5',), 'set', ['protocols', 'isis', 'spf-delay-ietf', 'holddown', '5']),
    ('set_spf_delay_ietf_init_delay', ('5',), 'set', ['protocols', 'isis', 'spf-delay-ietf', 'init-delay', '5']),
    ('set_spf_delay_ietf_long_delay', ('5',), 'set', ['protocols', 'isis', 'spf-delay-ietf', 'long-delay', '5']),
    ('set_spf_delay_ietf_short_delay', ('5',), 'set', ['protocols', 'isis', 'spf-delay-ietf', 'short-delay', '5']),
    ('set_spf_delay_ietf_time_to_learn', ('5',), 'set', ['protocols', 'isis', 'spf-delay-ietf', 'time-to-learn', '5']),
    ('set_spf_interval', ('5',), 'set', ['protocols', 'isis', 'spf-interval', '5']),
    ('set_sr_global_block_high', ('5',), 'set', ['protocols', 'isis', 'segment-routing', 'global-block', 'high-label-value', '5']),
    ('set_sr_global_block_low', ('5',), 'set', ['protocols', 'isis', 'segment-routing', 'global-block', 'low-label-value', '5']),
    ('set_sr_local_block_high', ('5',), 'set', ['protocols', 'isis', 'segment-routing', 'local-block', 'high-label-value', '5']),
    ('set_sr_local_block_low', ('5',), 'set', ['protocols', 'isis', 'segment-routing', 'local-block', 'low-label-value', '5']),
    ('set_sr_max_label_depth', ('5',), 'set', ['protocols', 'isis', 'segment-routing', 'maximum-label-depth', '5']),
    ('set_sr_prefix_absolute', ('10.0.0.0/8', '5'), 'set', ['protocols', 'isis', 'segment-routing', 'prefix', '10.0.0.0/8', 'absolute', 'value', '5']),
    ('set_sr_prefix_absolute_explicit_null', ('10.0.0.0/8',), 'set', ['protocols', 'isis', 'segment-routing', 'prefix', '10.0.0.0/8', 'absolute', 'explicit-null']),
    ('set_sr_prefix_absolute_no_php', ('10.0.0.0/8',), 'set', ['protocols', 'isis', 'segment-routing', 'prefix', '10.0.0.0/8', 'absolute', 'no-php-flag']),
    ('set_sr_prefix_index', ('10.0.0.0/8', '5'), 'set', ['protocols', 'isis', 'segment-routing', 'prefix', '10.0.0.0/8', 'index', 'value', '5']),
    ('set_sr_prefix_index_explicit_null', ('10.0.0.0/8',), 'set', ['protocols', 'isis', 'segment-routing', 'prefix', '10.0.0.0/8', 'index', 'explicit-null']),
    ('set_sr_prefix_index_no_php', ('10.0.0.0/8',), 'set', ['protocols', 'isis', 'segment-routing', 'prefix', '10.0.0.0/8', 'index', 'no-php-flag']),
    ('set_te_address', ('192.0.2.1',), 'set', ['protocols', 'isis', 'traffic-engineering', 'address', '192.0.2.1']),
    ('set_te_enable', (), 'set', ['protocols', 'isis', 'traffic-engineering', 'enable']),
    ('set_topology', ('ipv6-unicast',), 'set', ['protocols', 'isis', 'topology', 'ipv6-unicast']),
    ('delete_area_password_md5', (), 'delete', ['protocols', 'isis', 'area-password', 'md5']),
    ('delete_area_password_plaintext', (), 'delete', ['protocols', 'isis', 'area-password', 'plaintext-password']),
    ('delete_domain_password_md5', (), 'delete', ['protocols', 'isis', 'domain-password', 'md5']),
    ('delete_domain_password_plaintext', (), 'delete', ['protocols', 'isis', 'domain-password', 'plaintext-password']),
    ('delete_interface_password_md5', ('eth0',), 'delete', ['protocols', 'isis', 'interface', 'eth0', 'password', 'md5']),
    ('delete_interface_password_plaintext', ('eth0',), 'delete', ['protocols', 'isis', 'interface', 'eth0', 'password', 'plaintext-password']),
    ('delete_interface_ldp_sync_holddown', ('eth0',), 'delete', ['protocols', 'isis', 'interface', 'eth0', 'ldp-sync', 'holddown']),
    ('delete_redistribute_ipv6_metric', ('connected', 'level-1'), 'delete', ['protocols', 'isis', 'redistribute', 'ipv6', 'connected', 'level-1', 'metric']),
    ('set_redistribute_ipv6_route_map', ('connected', 'level-2', 'RMAP'), 'set', ['protocols', 'isis', 'redistribute', 'ipv6', 'connected', 'level-2', 'route-map', 'RMAP']),
    ('delete_redistribute_ipv6_route_map', ('connected', 'level-2'), 'delete', ['protocols', 'isis', 'redistribute', 'ipv6', 'connected', 'level-2', 'route-map']),
    ('set_default_info_ipv6_metric', ('level-2', '5'), 'set', ['protocols', 'isis', 'default-information', 'originate', 'ipv6', 'level-2', 'metric', '5']),
    ('delete_default_info_ipv6_metric', ('level-2',), 'delete', ['protocols', 'isis', 'default-information', 'originate', 'ipv6', 'level-2', 'metric']),
    ('set_default_info_ipv6_route_map', ('level-2', 'RMAP'), 'set', ['protocols', 'isis', 'default-information', 'originate', 'ipv6', 'level-2', 'route-map', 'RMAP']),
    ('delete_default_info_ipv6_route_map', ('level-2',), 'delete', ['protocols', 'isis', 'default-information', 'originate', 'ipv6', 'level-2', 'route-map']),
    ('delete_default_info_ipv6_always', ('level-2',), 'delete', ['protocols', 'isis', 'default-information', 'originate', 'ipv6', 'level-2', 'always']),
    ('delete_sr_prefix_index', ('10.0.0.0/8',), 'delete', ['protocols', 'isis', 'segment-routing', 'prefix', '10.0.0.0/8', 'index']),
    ('delete_sr_prefix_absolute', ('10.0.0.0/8',), 'delete', ['protocols', 'isis', 'segment-routing', 'prefix', '10.0.0.0/8', 'absolute']),
    ('delete_frr_lfa_tiebreaker_index', ('downstream', '1', 'level-1'), 'delete', ['protocols', 'isis', 'fast-reroute', 'lfa', 'local', 'tiebreaker', 'downstream', 'index', '1', 'level-1']),
    ('delete_frr_lfa_remote_prefix_list', ('FOO', 'level-1'), 'delete', ['protocols', 'isis', 'fast-reroute', 'lfa', 'remote', 'prefix-list', 'FOO', 'level-1']),
    ('set_frr_lfa_remote_prefix_list_all_levels', ('FOO',), 'set', ['protocols', 'isis', 'fast-reroute', 'lfa', 'remote', 'prefix-list', 'FOO']),
    ('delete_frr_lfa_remote_prefix_list_all_levels', ('FOO',), 'delete', ['protocols', 'isis', 'fast-reroute', 'lfa', 'remote', 'prefix-list', 'FOO']),
    ('set_frr_lfa_load_sharing_disable', (), 'set', ['protocols', 'isis', 'fast-reroute', 'lfa', 'local', 'load-sharing', 'disable']),
    ('delete_frr_lfa_load_sharing_disable', (), 'delete', ['protocols', 'isis', 'fast-reroute', 'lfa', 'local', 'load-sharing', 'disable']),
    ('set_ldp_sync', (), 'set', ['protocols', 'isis', 'ldp-sync']),
    ('delete_ldp_sync_holddown', (), 'delete', ['protocols', 'isis', 'ldp-sync', 'holddown']),
]


@pytest.mark.parametrize("method, args, op, expected_path", COMMON_CASES)
@pytest.mark.parametrize("version", ["1.4", "1.5"])
def test_isis_common_paths(method, args, op, expected_path, version):
    _run(version, method, args, op, expected_path)

V15_ONLY_CASES = [
    ('delete_interface_lfa_level1', ('eth0',), 'delete', ['protocols', 'isis', 'interface', 'eth0', 'fast-reroute', 'lfa', 'level-1', 'enable']),
    ('delete_interface_lfa_level1_exclude', ('eth0', 'eth1'), 'delete', ['protocols', 'isis', 'interface', 'eth0', 'fast-reroute', 'lfa', 'level-1', 'exclude', 'interface', 'eth1']),
    ('delete_interface_lfa_level2', ('eth0',), 'delete', ['protocols', 'isis', 'interface', 'eth0', 'fast-reroute', 'lfa', 'level-2', 'enable']),
    ('delete_interface_lfa_level2_exclude', ('eth0', 'eth1'), 'delete', ['protocols', 'isis', 'interface', 'eth0', 'fast-reroute', 'lfa', 'level-2', 'exclude', 'interface', 'eth1']),
    ('delete_interface_remote_lfa_level1', ('eth0',), 'delete', ['protocols', 'isis', 'interface', 'eth0', 'fast-reroute', 'remote-lfa', 'level-1']),
    ('delete_interface_remote_lfa_level1_max_metric', ('eth0',), 'delete', ['protocols', 'isis', 'interface', 'eth0', 'fast-reroute', 'remote-lfa', 'level-1', 'maximum-metric']),
    ('delete_interface_remote_lfa_level1_tunnel_mpls_ldp', ('eth0',), 'delete', ['protocols', 'isis', 'interface', 'eth0', 'fast-reroute', 'remote-lfa', 'level-1', 'tunnel', 'mpls-ldp']),
    ('delete_interface_remote_lfa_level2', ('eth0',), 'delete', ['protocols', 'isis', 'interface', 'eth0', 'fast-reroute', 'remote-lfa', 'level-2']),
    ('delete_interface_remote_lfa_level2_tunnel_mpls_ldp', ('eth0',), 'delete', ['protocols', 'isis', 'interface', 'eth0', 'fast-reroute', 'remote-lfa', 'level-2', 'tunnel', 'mpls-ldp']),
    ('delete_interface_ti_lfa', ('eth0',), 'delete', ['protocols', 'isis', 'interface', 'eth0', 'fast-reroute', 'ti-lfa']),
    ('delete_interface_ti_lfa_level1', ('eth0',), 'delete', ['protocols', 'isis', 'interface', 'eth0', 'fast-reroute', 'ti-lfa', 'level-1']),
    ('delete_interface_ti_lfa_level1_link_fallback', ('eth0',), 'delete', ['protocols', 'isis', 'interface', 'eth0', 'fast-reroute', 'ti-lfa', 'level-1', 'node-protection', 'link-fallback']),
    ('delete_interface_ti_lfa_level1_node_protection', ('eth0',), 'delete', ['protocols', 'isis', 'interface', 'eth0', 'fast-reroute', 'ti-lfa', 'level-1', 'node-protection']),
    ('delete_interface_ti_lfa_level2', ('eth0',), 'delete', ['protocols', 'isis', 'interface', 'eth0', 'fast-reroute', 'ti-lfa', 'level-2']),
    ('delete_interface_ti_lfa_level2_link_fallback', ('eth0',), 'delete', ['protocols', 'isis', 'interface', 'eth0', 'fast-reroute', 'ti-lfa', 'level-2', 'node-protection', 'link-fallback']),
    ('delete_interface_ti_lfa_level2_node_protection', ('eth0',), 'delete', ['protocols', 'isis', 'interface', 'eth0', 'fast-reroute', 'ti-lfa', 'level-2', 'node-protection']),
    ('delete_sr_srv6', (), 'delete', ['protocols', 'isis', 'segment-routing', 'srv6']),
    ('set_interface_lfa_level1', ('eth0',), 'set', ['protocols', 'isis', 'interface', 'eth0', 'fast-reroute', 'lfa', 'level-1', 'enable']),
    ('set_interface_lfa_level1_exclude', ('eth0', 'eth1'), 'set', ['protocols', 'isis', 'interface', 'eth0', 'fast-reroute', 'lfa', 'level-1', 'exclude', 'interface', 'eth1']),
    ('set_interface_lfa_level2', ('eth0',), 'set', ['protocols', 'isis', 'interface', 'eth0', 'fast-reroute', 'lfa', 'level-2', 'enable']),
    ('set_interface_lfa_level2_exclude', ('eth0', 'eth1'), 'set', ['protocols', 'isis', 'interface', 'eth0', 'fast-reroute', 'lfa', 'level-2', 'exclude', 'interface', 'eth1']),
    ('set_interface_remote_lfa_level1', ('eth0',), 'set', ['protocols', 'isis', 'interface', 'eth0', 'fast-reroute', 'remote-lfa', 'level-1']),
    ('set_interface_remote_lfa_level1_max_metric', ('eth0', '5'), 'set', ['protocols', 'isis', 'interface', 'eth0', 'fast-reroute', 'remote-lfa', 'level-1', 'maximum-metric', '5']),
    ('set_interface_remote_lfa_level1_tunnel_mpls_ldp', ('eth0',), 'set', ['protocols', 'isis', 'interface', 'eth0', 'fast-reroute', 'remote-lfa', 'level-1', 'tunnel', 'mpls-ldp']),
    ('set_interface_remote_lfa_level2', ('eth0',), 'set', ['protocols', 'isis', 'interface', 'eth0', 'fast-reroute', 'remote-lfa', 'level-2']),
    ('set_interface_remote_lfa_level2_max_metric', ('eth0', '5'), 'set', ['protocols', 'isis', 'interface', 'eth0', 'fast-reroute', 'remote-lfa', 'level-2', 'maximum-metric', '5']),
    ('set_interface_remote_lfa_level2_tunnel_mpls_ldp', ('eth0',), 'set', ['protocols', 'isis', 'interface', 'eth0', 'fast-reroute', 'remote-lfa', 'level-2', 'tunnel', 'mpls-ldp']),
    ('set_interface_ti_lfa', ('eth0',), 'set', ['protocols', 'isis', 'interface', 'eth0', 'fast-reroute', 'ti-lfa']),
    ('set_interface_ti_lfa_level1', ('eth0',), 'set', ['protocols', 'isis', 'interface', 'eth0', 'fast-reroute', 'ti-lfa', 'level-1']),
    ('set_interface_ti_lfa_level1_link_fallback', ('eth0',), 'set', ['protocols', 'isis', 'interface', 'eth0', 'fast-reroute', 'ti-lfa', 'level-1', 'node-protection', 'link-fallback']),
    ('set_interface_ti_lfa_level1_node_protection', ('eth0',), 'set', ['protocols', 'isis', 'interface', 'eth0', 'fast-reroute', 'ti-lfa', 'level-1', 'node-protection']),
    ('set_interface_ti_lfa_level2', ('eth0',), 'set', ['protocols', 'isis', 'interface', 'eth0', 'fast-reroute', 'ti-lfa', 'level-2']),
    ('set_interface_ti_lfa_level2_link_fallback', ('eth0',), 'set', ['protocols', 'isis', 'interface', 'eth0', 'fast-reroute', 'ti-lfa', 'level-2', 'node-protection', 'link-fallback']),
    ('set_interface_ti_lfa_level2_node_protection', ('eth0',), 'set', ['protocols', 'isis', 'interface', 'eth0', 'fast-reroute', 'ti-lfa', 'level-2', 'node-protection']),
    ('set_sr_srv6_locator', ('G0',), 'set', ['protocols', 'isis', 'segment-routing', 'srv6', 'locator', 'G0']),
    ('set_redistribute_ipv4', ('nhrp', 'level-1'), 'set', ['protocols', 'isis', 'redistribute', 'ipv4', 'nhrp', 'level-1']),
    ('delete_interface_remote_lfa_level2_max_metric', ('eth0',), 'delete', ['protocols', 'isis', 'interface', 'eth0', 'fast-reroute', 'remote-lfa', 'level-2', 'maximum-metric']),
    ('delete_sr_srv6_locator', (), 'delete', ['protocols', 'isis', 'segment-routing', 'srv6', 'locator']),
    ('set_sr_srv6_interface', ('dum0',), 'set', ['protocols', 'isis', 'segment-routing', 'srv6', 'interface', 'dum0']),
    ('delete_sr_srv6_interface', (), 'delete', ['protocols', 'isis', 'segment-routing', 'srv6', 'interface']),
    ('set_sr_srv6_node_msd', ('max-segs-left', '5'), 'set', ['protocols', 'isis', 'segment-routing', 'srv6', 'node-msd', 'max-segs-left', '5']),
    ('delete_sr_srv6_node_msd', ('max-segs-left',), 'delete', ['protocols', 'isis', 'segment-routing', 'srv6', 'node-msd', 'max-segs-left']),
    ('set_te_export', (), 'set', ['protocols', 'isis', 'traffic-engineering', 'export']),
    ('delete_te_export', (), 'delete', ['protocols', 'isis', 'traffic-engineering', 'export']),
    ('set_domain_password_md5', ('secret',), 'set', ['protocols', 'isis', 'domain-password', 'md5', 'secret']),
]


def _builder_ops():
    return sorted(
        name
        for name, _ in inspect.getmembers(IsisBatchBuilder, inspect.isfunction)
        if name.startswith(("set_", "delete_", "create_"))
    )


def test_every_builder_op_has_a_golden_row():
    covered = {case[0] for case in COMMON_CASES + V15_ONLY_CASES}
    assert [name for name in _builder_ops() if name not in covered] == []


@pytest.mark.parametrize("method, args, op, expected_path", V15_ONLY_CASES)
def test_isis_v1_5_only_paths_raise_on_1_4(method, args, op, expected_path):
    """1.4 has none of these leaves; the builder raises instead of emitting."""
    builder = IsisBatchBuilder(version="1.4")
    with pytest.raises(ValueError, match="not supported on this device"):
        getattr(builder, method)(*args)
    assert builder.get_operations() == []


@pytest.mark.parametrize(
    "version, cls",
    [("1.4", IsisMapper), ("1.4.3", IsisMapper), ("1.5", IsisMapperV1_5),
     ("2026.09.23-0027-rolling", IsisMapperV1_5)],
)
def test_factory_returns_the_subclass_for_1_5_and_rolling(version, cls):
    mapper = CommandMapperRegistry.get_mapper("isis", version)
    assert type(mapper) is cls


def test_versioned_path_methods_live_only_on_the_subclass():
    for methods in IsisMapper._VERSIONED_NODES.values():
        for method in methods:
            assert not hasattr(IsisMapper, method), method
            assert callable(getattr(IsisMapperV1_5, method)), method


def test_isis_versions_package_has_no_1_4_file():
    package = Path(isis_versions.__file__).parent
    assert sorted(p.name for p in package.glob("*.py")) == ["__init__.py", "v1_5.py"]


@pytest.mark.parametrize(
    "flag, node",
    [("interface_fast_reroute", "interface fast-reroute"), ("srv6", "segment-routing srv6"),
     ("te_export", "traffic-engineering export")],
)
def test_capability_flags_follow_the_mapper_not_the_version(monkeypatch, flag, node):
    """Remove one node's methods from the 1.5 subclass: its flag and gate turn off."""
    for method in IsisMapper._VERSIONED_NODES[node]:
        monkeypatch.delattr(IsisMapperV1_5, method)
    builder = IsisBatchBuilder(version="1.5")
    caps = builder.get_capabilities()
    assert caps["features"][flag]["supported"] is False
    with pytest.raises(ValueError, match=f"{node} is not supported"):
        builder.m.require_node(node)
    for other in {"interface_fast_reroute", "srv6", "te_export"} - {flag}:
        assert caps["features"][other]["supported"] is True


@pytest.mark.parametrize("method, args, op, expected_path", V15_ONLY_CASES)
def test_isis_v1_5_only_paths(method, args, op, expected_path):
    _run("1.5", method, args, op, expected_path)


def test_isis_capabilities_read_mapper_allowlists():
    v14 = IsisBatchBuilder(version="1.4").get_capabilities()
    v15 = IsisBatchBuilder(version="1.5").get_capabilities()
    assert "version_info" not in v14
    assert v14["features"]["interface_fast_reroute"]["supported"] is False
    assert v15["features"]["interface_fast_reroute"]["supported"] is True
    assert v14["features"]["srv6"]["supported"] is False
    assert v15["features"]["srv6"]["supported"] is True
    assert v14["features"]["te_export"]["supported"] is False
    assert v15["features"]["te_export"]["supported"] is True
    assert v14["lsp_refresh_interval"] == {"min": 1, "max": 65235}
    assert v15["lsp_refresh_interval"] == {"min": 2, "max": 65235}
    assert v14["area_password_modes"] == v15["area_password_modes"] == ["md5", "plaintext-password"]
    assert v14["domain_password_modes"] == ["plaintext-password"]
    assert v15["domain_password_modes"] == ["md5", "plaintext-password"]
    assert v14["srv6_node_msd_types"] == []
    assert v15["srv6_node_msd_types"] == ["max-end-d", "max-end-pop", "max-h-encaps", "max-segs-left"]
    assert v14["lfa_priority_limit_values"] == ["critical", "high", "medium"]
    assert v14["lfa_tiebreaker_values"] == [
        "downstream", "lowest-backup-metric", "node-protecting",
    ]
    assert v14["lsp_timer_defaults"] is None
    assert v15["lsp_timer_defaults"] == {
        "lsp_gen_interval": 30, "lsp_refresh_interval": 900, "max_lsp_lifetime": 1200,
    }
    assert set(v14["features"]) == {"interface_fast_reroute", "srv6", "te_export"}
    assert "babel" in v14["redistribute_protocols"]["ipv4"]
    assert "nhrp" not in v14["redistribute_protocols"]["ipv4"]
    assert "nhrp" in v15["redistribute_protocols"]["ipv4"]
    assert "connected" in v14["redistribute_protocols"]["ipv6"]
    assert "nhrp" not in v14["redistribute_protocols"]["ipv6"]


@pytest.mark.parametrize("version", ["1.4", "1.5"])
@pytest.mark.parametrize("method, args", [
    ("set_frr_lfa_priority_limit", ("urgent", "level-1")),
    ("delete_frr_lfa_priority_limit", ("urgent", "level-1")),
    ("set_frr_lfa_tiebreaker_index", ("random", "1", "level-1")),
    ("set_sr_srv6_node_msd", ("max-foo", "5")),
    ("delete_sr_srv6_node_msd", ("max-foo",)),
])
def test_builder_rejects_values_the_lab_does_not_allow(version, method, args):
    builder = IsisBatchBuilder(version=version)
    with pytest.raises(ValueError, match="not supported on this device"):
        getattr(builder, method)(*args)
    assert builder.get_operations() == []


def test_isis_14_builder_rejects_nhrp():
    builder = IsisBatchBuilder(version="1.4")
    with pytest.raises(ValueError, match="not supported"):
        builder.set_redistribute_ipv4("nhrp", "level-1")
