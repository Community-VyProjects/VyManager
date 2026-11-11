"""Golden (method, args, op, expected_path) cases for IPSecBatchBuilder.

Paths checked with validateTmplPath on 1.4 (100.64.64.50) and 1.5 (100.64.64.5).
Generated for issue #737; edit the tables directly if the mapper changes.
"""

import pytest

from vyos_builders.ipsec.ipsec_batch_builder import IPSecBatchBuilder


def _run(version, method, args, op, expected_path):
    builder = IPSecBatchBuilder(version=version)
    getattr(builder, method)(*args)
    operations = builder.get_operations()
    assert [(item["op"], item["path"]) for item in operations] == [(op, expected_path)]

COMMON_CASES = [
    ('delete_auth_psk', ('G0',), 'delete', ['vpn', 'ipsec', 'authentication', 'psk', 'G0']),
    ('delete_auth_psk_id', ('G0', 'G0'), 'delete', ['vpn', 'ipsec', 'authentication', 'psk', 'G0', 'id', 'G0']),
    ('delete_disable_uniqreqids', (), 'delete', ['vpn', 'ipsec', 'disable-uniqreqids']),
    ('delete_esp_group', ('G0',), 'delete', ['vpn', 'ipsec', 'esp-group', 'G0']),
    ('delete_ike_group', ('G0',), 'delete', ['vpn', 'ipsec', 'ike-group', 'G0']),
    ('delete_interface', ('eth0',), 'delete', ['vpn', 'ipsec', 'interface', 'eth0']),
    ('delete_log_level', (), 'delete', ['vpn', 'ipsec', 'log', 'level']),
    ('delete_log_subsystem', ('dmn',), 'delete', ['vpn', 'ipsec', 'log', 'subsystem', 'dmn']),
    ('delete_options_disable_route_autoinstall', (), 'delete', ['vpn', 'ipsec', 'options', 'disable-route-autoinstall']),
    ('delete_options_flexvpn', (), 'delete', ['vpn', 'ipsec', 'options', 'flexvpn']),
    ('delete_options_virtual_ip', (), 'delete', ['vpn', 'ipsec', 'options', 'virtual-ip']),
    ('delete_ra_connection', ('G0',), 'delete', ['vpn', 'ipsec', 'remote-access', 'connection', 'G0']),
    ('delete_ra_connection_auth_client_mode', ('G0',), 'delete', ['vpn', 'ipsec', 'remote-access', 'connection', 'G0', 'authentication', 'client-mode']),
    ('delete_ra_connection_auth_local_id', ('G0',), 'delete', ['vpn', 'ipsec', 'remote-access', 'connection', 'G0', 'authentication', 'local-id']),
    ('delete_ra_connection_auth_local_user', ('G0', 'user1'), 'delete', ['vpn', 'ipsec', 'remote-access', 'connection', 'G0', 'authentication', 'local-users', 'username', 'user1']),
    ('delete_ra_connection_auth_local_user_disable', ('G0', 'user1'), 'delete', ['vpn', 'ipsec', 'remote-access', 'connection', 'G0', 'authentication', 'local-users', 'username', 'user1', 'disable']),
    ('delete_ra_connection_auth_server_mode', ('G0',), 'delete', ['vpn', 'ipsec', 'remote-access', 'connection', 'G0', 'authentication', 'server-mode']),
    ('delete_ra_connection_auth_x509_ca_cert', ('G0', 'G0'), 'delete', ['vpn', 'ipsec', 'remote-access', 'connection', 'G0', 'authentication', 'x509', 'ca-certificate', 'G0']),
    ('delete_ra_connection_auth_x509_cert', ('G0',), 'delete', ['vpn', 'ipsec', 'remote-access', 'connection', 'G0', 'authentication', 'x509', 'certificate']),
    ('delete_ra_connection_description', ('G0',), 'delete', ['vpn', 'ipsec', 'remote-access', 'connection', 'G0', 'description']),
    ('delete_ra_connection_esp_group', ('G0',), 'delete', ['vpn', 'ipsec', 'remote-access', 'connection', 'G0', 'esp-group']),
    ('delete_ra_connection_ike_group', ('G0',), 'delete', ['vpn', 'ipsec', 'remote-access', 'connection', 'G0', 'ike-group']),
    ('delete_ra_connection_local_address', ('G0',), 'delete', ['vpn', 'ipsec', 'remote-access', 'connection', 'G0', 'local-address']),
    ('delete_ra_connection_pool', ('G0', 'G0'), 'delete', ['vpn', 'ipsec', 'remote-access', 'connection', 'G0', 'pool', 'G0']),
    ('delete_ra_pool', ('G0',), 'delete', ['vpn', 'ipsec', 'remote-access', 'pool', 'G0']),
    ('delete_s2s_peer', ('G0',), 'delete', ['vpn', 'ipsec', 'site-to-site', 'peer', 'G0']),
    ('delete_s2s_peer_auth_use_x509_id', ('G0',), 'delete', ['vpn', 'ipsec', 'site-to-site', 'peer', 'G0', 'authentication', 'use-x509-id']),
    ('delete_s2s_peer_disable', ('G0',), 'delete', ['vpn', 'ipsec', 'site-to-site', 'peer', 'G0', 'disable']),
    ('delete_s2s_peer_force_udp_encapsulation', ('G0',), 'delete', ['vpn', 'ipsec', 'site-to-site', 'peer', 'G0', 'force-udp-encapsulation']),
    ('delete_s2s_peer_ikev2_reauth', ('G0',), 'delete', ['vpn', 'ipsec', 'site-to-site', 'peer', 'G0', 'ikev2-reauth']),
    ('delete_s2s_peer_remote_address', ('G0', '192.0.2.1'), 'delete', ['vpn', 'ipsec', 'site-to-site', 'peer', 'G0', 'remote-address', '192.0.2.1']),
    ('delete_s2s_peer_tunnel', ('G0', '1'), 'delete', ['vpn', 'ipsec', 'site-to-site', 'peer', 'G0', 'tunnel', '1']),
    ('delete_s2s_peer_tunnel_disable', ('G0', '1'), 'delete', ['vpn', 'ipsec', 'site-to-site', 'peer', 'G0', 'tunnel', '1', 'disable']),
    ('delete_s2s_peer_tunnel_local_prefix', ('G0', '1', '10.0.0.0/8'), 'delete', ['vpn', 'ipsec', 'site-to-site', 'peer', 'G0', 'tunnel', '1', 'local', 'prefix', '10.0.0.0/8']),
    ('delete_s2s_peer_tunnel_remote_prefix', ('G0', '1', '10.0.0.0/8'), 'delete', ['vpn', 'ipsec', 'site-to-site', 'peer', 'G0', 'tunnel', '1', 'remote', 'prefix', '10.0.0.0/8']),
    ('delete_s2s_peer_virtual_address', ('G0', '192.0.2.1'), 'delete', ['vpn', 'ipsec', 'site-to-site', 'peer', 'G0', 'virtual-address', '192.0.2.1']),
    ('set_auth_psk_dhcp_interface', ('G0', 'eth0'), 'set', ['vpn', 'ipsec', 'authentication', 'psk', 'G0', 'dhcp-interface', 'eth0']),
    ('set_auth_psk_id', ('G0', 'G0'), 'set', ['vpn', 'ipsec', 'authentication', 'psk', 'G0', 'id', 'G0']),
    ('set_auth_psk_secret', ('G0', 'secret'), 'set', ['vpn', 'ipsec', 'authentication', 'psk', 'G0', 'secret', 'secret']),
    ('set_auth_psk_secret_type', ('G0', '5'), 'set', ['vpn', 'ipsec', 'authentication', 'psk', 'G0', 'secret-type', '5']),
    ('set_disable_uniqreqids', (), 'set', ['vpn', 'ipsec', 'disable-uniqreqids']),
    ('set_esp_group_compression', ('G0',), 'set', ['vpn', 'ipsec', 'esp-group', 'G0', 'compression']),
    ('set_esp_group_disable_rekey', ('G0',), 'set', ['vpn', 'ipsec', 'esp-group', 'G0', 'disable-rekey']),
    ('set_esp_group_life_bytes', ('G0', '5'), 'set', ['vpn', 'ipsec', 'esp-group', 'G0', 'life-bytes', '5']),
    ('set_esp_group_life_packets', ('G0', '5'), 'set', ['vpn', 'ipsec', 'esp-group', 'G0', 'life-packets', '5']),
    ('set_esp_group_lifetime', ('G0', '5'), 'set', ['vpn', 'ipsec', 'esp-group', 'G0', 'lifetime', '5']),
    ('set_esp_group_mode', ('G0', 'nat'), 'set', ['vpn', 'ipsec', 'esp-group', 'G0', 'mode', 'nat']),
    ('set_esp_group_pfs', ('G0', '5'), 'set', ['vpn', 'ipsec', 'esp-group', 'G0', 'pfs', '5']),
    ('set_esp_group_proposal_encryption', ('G0', '1', '5'), 'set', ['vpn', 'ipsec', 'esp-group', 'G0', 'proposal', '1', 'encryption', '5']),
    ('set_esp_group_proposal_hash', ('G0', '1', '5'), 'set', ['vpn', 'ipsec', 'esp-group', 'G0', 'proposal', '1', 'hash', '5']),
    ('set_ike_group_close_action', ('G0', '5'), 'set', ['vpn', 'ipsec', 'ike-group', 'G0', 'close-action', '5']),
    ('set_ike_group_disable_mobike', ('G0',), 'set', ['vpn', 'ipsec', 'ike-group', 'G0', 'disable-mobike']),
    ('set_ike_group_dpd_action', ('G0', '5'), 'set', ['vpn', 'ipsec', 'ike-group', 'G0', 'dead-peer-detection', 'action', '5']),
    ('set_ike_group_dpd_interval', ('G0', '5'), 'set', ['vpn', 'ipsec', 'ike-group', 'G0', 'dead-peer-detection', 'interval', '5']),
    ('set_ike_group_dpd_timeout', ('G0', '5'), 'set', ['vpn', 'ipsec', 'ike-group', 'G0', 'dead-peer-detection', 'timeout', '5']),
    ('set_ike_group_ikev2_reauth', ('G0',), 'set', ['vpn', 'ipsec', 'ike-group', 'G0', 'ikev2-reauth']),
    ('set_ike_group_key_exchange', ('G0', '5'), 'set', ['vpn', 'ipsec', 'ike-group', 'G0', 'key-exchange', '5']),
    ('set_ike_group_lifetime', ('G0', '5'), 'set', ['vpn', 'ipsec', 'ike-group', 'G0', 'lifetime', '5']),
    ('set_ike_group_mode', ('G0', 'nat'), 'set', ['vpn', 'ipsec', 'ike-group', 'G0', 'mode', 'nat']),
    ('set_ike_group_proposal_dh_group', ('G0', '1', '5'), 'set', ['vpn', 'ipsec', 'ike-group', 'G0', 'proposal', '1', 'dh-group', '5']),
    ('set_ike_group_proposal_encryption', ('G0', '1', '5'), 'set', ['vpn', 'ipsec', 'ike-group', 'G0', 'proposal', '1', 'encryption', '5']),
    ('set_ike_group_proposal_hash', ('G0', '1', '5'), 'set', ['vpn', 'ipsec', 'ike-group', 'G0', 'proposal', '1', 'hash', '5']),
    ('set_ike_group_proposal_prf', ('G0', '1', '5'), 'set', ['vpn', 'ipsec', 'ike-group', 'G0', 'proposal', '1', 'prf', '5']),
    ('set_interface', ('eth0',), 'set', ['vpn', 'ipsec', 'interface', 'eth0']),
    ('set_log_level', ('1',), 'set', ['vpn', 'ipsec', 'log', 'level', '1']),
    ('set_log_subsystem', ('dmn',), 'set', ['vpn', 'ipsec', 'log', 'subsystem', 'dmn']),
    ('set_options_disable_route_autoinstall', (), 'set', ['vpn', 'ipsec', 'options', 'disable-route-autoinstall']),
    ('set_options_flexvpn', (), 'set', ['vpn', 'ipsec', 'options', 'flexvpn']),
    ('set_options_virtual_ip', (), 'set', ['vpn', 'ipsec', 'options', 'virtual-ip']),
    ('set_ra_connection_auth_client_mode', ('G0', 'nat'), 'set', ['vpn', 'ipsec', 'remote-access', 'connection', 'G0', 'authentication', 'client-mode', 'nat']),
    ('set_ra_connection_auth_local_id', ('G0', 'G0'), 'set', ['vpn', 'ipsec', 'remote-access', 'connection', 'G0', 'authentication', 'local-id', 'G0']),
    ('set_ra_connection_auth_local_user_disable', ('G0', 'user1'), 'set', ['vpn', 'ipsec', 'remote-access', 'connection', 'G0', 'authentication', 'local-users', 'username', 'user1', 'disable']),
    ('set_ra_connection_auth_local_user_password', ('G0', 'user1', 'secret'), 'set', ['vpn', 'ipsec', 'remote-access', 'connection', 'G0', 'authentication', 'local-users', 'username', 'user1', 'password', 'secret']),
    ('set_ra_connection_auth_psk', ('G0', 'secret'), 'set', ['vpn', 'ipsec', 'remote-access', 'connection', 'G0', 'authentication', 'pre-shared-secret', 'secret']),
    ('set_ra_connection_auth_server_mode', ('G0', 'nat'), 'set', ['vpn', 'ipsec', 'remote-access', 'connection', 'G0', 'authentication', 'server-mode', 'nat']),
    ('set_ra_connection_auth_x509_ca_cert', ('G0', 'G0'), 'set', ['vpn', 'ipsec', 'remote-access', 'connection', 'G0', 'authentication', 'x509', 'ca-certificate', 'G0']),
    ('set_ra_connection_auth_x509_cert', ('G0', 'G0'), 'set', ['vpn', 'ipsec', 'remote-access', 'connection', 'G0', 'authentication', 'x509', 'certificate', 'G0']),
    ('set_ra_connection_description', ('G0', 'lab'), 'set', ['vpn', 'ipsec', 'remote-access', 'connection', 'G0', 'description', 'lab']),
    ('set_ra_connection_esp_group', ('G0', '5'), 'set', ['vpn', 'ipsec', 'remote-access', 'connection', 'G0', 'esp-group', '5']),
    ('set_ra_connection_ike_group', ('G0', '5'), 'set', ['vpn', 'ipsec', 'remote-access', 'connection', 'G0', 'ike-group', '5']),
    ('set_ra_connection_local_address', ('G0', '192.0.2.1'), 'set', ['vpn', 'ipsec', 'remote-access', 'connection', 'G0', 'local-address', '192.0.2.1']),
    ('set_ra_connection_pool', ('G0', 'G0'), 'set', ['vpn', 'ipsec', 'remote-access', 'connection', 'G0', 'pool', 'G0']),
    ('set_ra_pool_exclude', ('G0', '5'), 'set', ['vpn', 'ipsec', 'remote-access', 'pool', 'G0', 'exclude', '5']),
    ('set_ra_pool_name_server', ('G0', '192.0.2.1'), 'set', ['vpn', 'ipsec', 'remote-access', 'pool', 'G0', 'name-server', '192.0.2.1']),
    ('set_ra_pool_prefix', ('G0', '10.0.0.0/8'), 'set', ['vpn', 'ipsec', 'remote-access', 'pool', 'G0', 'prefix', '10.0.0.0/8']),
    ('set_s2s_peer_auth_local_id', ('G0', 'G0'), 'set', ['vpn', 'ipsec', 'site-to-site', 'peer', 'G0', 'authentication', 'local-id', 'G0']),
    ('set_s2s_peer_auth_mode', ('G0', 'nat'), 'set', ['vpn', 'ipsec', 'site-to-site', 'peer', 'G0', 'authentication', 'mode', 'nat']),
    ('set_s2s_peer_auth_remote_id', ('G0', '5'), 'set', ['vpn', 'ipsec', 'site-to-site', 'peer', 'G0', 'authentication', 'remote-id', '5']),
    ('set_s2s_peer_auth_rsa_local_key', ('G0', 'secret'), 'set', ['vpn', 'ipsec', 'site-to-site', 'peer', 'G0', 'authentication', 'rsa', 'local-key', 'secret']),
    ('set_s2s_peer_auth_rsa_passphrase', ('G0', 'secret'), 'set', ['vpn', 'ipsec', 'site-to-site', 'peer', 'G0', 'authentication', 'rsa', 'passphrase', 'secret']),
    ('set_s2s_peer_auth_rsa_remote_key', ('G0', 'secret'), 'set', ['vpn', 'ipsec', 'site-to-site', 'peer', 'G0', 'authentication', 'rsa', 'remote-key', 'secret']),
    ('set_s2s_peer_auth_use_x509_id', ('G0',), 'set', ['vpn', 'ipsec', 'site-to-site', 'peer', 'G0', 'authentication', 'use-x509-id']),
    ('set_s2s_peer_auth_x509_ca_cert', ('G0', 'G0'), 'set', ['vpn', 'ipsec', 'site-to-site', 'peer', 'G0', 'authentication', 'x509', 'ca-certificate', 'G0']),
    ('set_s2s_peer_auth_x509_cert', ('G0', 'G0'), 'set', ['vpn', 'ipsec', 'site-to-site', 'peer', 'G0', 'authentication', 'x509', 'certificate', 'G0']),
    ('set_s2s_peer_auth_x509_passphrase', ('G0', 'secret'), 'set', ['vpn', 'ipsec', 'site-to-site', 'peer', 'G0', 'authentication', 'x509', 'passphrase', 'secret']),
    ('set_s2s_peer_connection_type', ('G0', '5'), 'set', ['vpn', 'ipsec', 'site-to-site', 'peer', 'G0', 'connection-type', '5']),
    ('set_s2s_peer_default_esp_group', ('G0', '5'), 'set', ['vpn', 'ipsec', 'site-to-site', 'peer', 'G0', 'default-esp-group', '5']),
    ('set_s2s_peer_description', ('G0', 'lab'), 'set', ['vpn', 'ipsec', 'site-to-site', 'peer', 'G0', 'description', 'lab']),
    ('set_s2s_peer_dhcp_interface', ('G0', 'eth0'), 'set', ['vpn', 'ipsec', 'site-to-site', 'peer', 'G0', 'dhcp-interface', 'eth0']),
    ('set_s2s_peer_disable', ('G0',), 'set', ['vpn', 'ipsec', 'site-to-site', 'peer', 'G0', 'disable']),
    ('set_s2s_peer_force_udp_encapsulation', ('G0',), 'set', ['vpn', 'ipsec', 'site-to-site', 'peer', 'G0', 'force-udp-encapsulation']),
    ('set_s2s_peer_ike_group', ('G0', '5'), 'set', ['vpn', 'ipsec', 'site-to-site', 'peer', 'G0', 'ike-group', '5']),
    ('set_s2s_peer_ikev2_reauth', ('G0',), 'set', ['vpn', 'ipsec', 'site-to-site', 'peer', 'G0', 'ikev2-reauth']),
    ('set_s2s_peer_local_address', ('G0', '192.0.2.1'), 'set', ['vpn', 'ipsec', 'site-to-site', 'peer', 'G0', 'local-address', '192.0.2.1']),
    ('set_s2s_peer_remote_address', ('G0', '192.0.2.1'), 'set', ['vpn', 'ipsec', 'site-to-site', 'peer', 'G0', 'remote-address', '192.0.2.1']),
    ('set_s2s_peer_replay_window', ('G0', '5'), 'set', ['vpn', 'ipsec', 'site-to-site', 'peer', 'G0', 'replay-window', '5']),
    ('set_s2s_peer_tunnel_disable', ('G0', '1'), 'set', ['vpn', 'ipsec', 'site-to-site', 'peer', 'G0', 'tunnel', '1', 'disable']),
    ('set_s2s_peer_tunnel_esp_group', ('G0', '1', '5'), 'set', ['vpn', 'ipsec', 'site-to-site', 'peer', 'G0', 'tunnel', '1', 'esp-group', '5']),
    ('set_s2s_peer_tunnel_local_port', ('G0', '1', '8080'), 'set', ['vpn', 'ipsec', 'site-to-site', 'peer', 'G0', 'tunnel', '1', 'local', 'port', '8080']),
    ('delete_s2s_peer_description', ('G0',), 'delete', ['vpn', 'ipsec', 'site-to-site', 'peer', 'G0', 'description']),
    ('delete_s2s_peer_connection_type', ('G0',), 'delete', ['vpn', 'ipsec', 'site-to-site', 'peer', 'G0', 'connection-type']),
    ('delete_s2s_peer_local_address', ('G0',), 'delete', ['vpn', 'ipsec', 'site-to-site', 'peer', 'G0', 'local-address']),
    ('delete_s2s_peer_auth_x509_passphrase', ('G0',), 'delete', ['vpn', 'ipsec', 'site-to-site', 'peer', 'G0', 'authentication', 'x509', 'passphrase']),
    ('delete_s2s_peer_tunnel_esp_group', ('G0', '1'), 'delete', ['vpn', 'ipsec', 'site-to-site', 'peer', 'G0', 'tunnel', '1', 'esp-group']),
    ('set_s2s_peer_tunnel_local_prefix', ('G0', '1', '10.0.0.0/8'), 'set', ['vpn', 'ipsec', 'site-to-site', 'peer', 'G0', 'tunnel', '1', 'local', 'prefix', '10.0.0.0/8']),
    ('set_s2s_peer_tunnel_priority', ('G0', '1', '5'), 'set', ['vpn', 'ipsec', 'site-to-site', 'peer', 'G0', 'tunnel', '1', 'priority', '5']),
    ('set_s2s_peer_tunnel_protocol', ('G0', '1', 'tcp'), 'set', ['vpn', 'ipsec', 'site-to-site', 'peer', 'G0', 'tunnel', '1', 'protocol', 'tcp']),
    ('set_s2s_peer_tunnel_remote_port', ('G0', '1', '8080'), 'set', ['vpn', 'ipsec', 'site-to-site', 'peer', 'G0', 'tunnel', '1', 'remote', 'port', '8080']),
    ('set_s2s_peer_tunnel_remote_prefix', ('G0', '1', '10.0.0.0/8'), 'set', ['vpn', 'ipsec', 'site-to-site', 'peer', 'G0', 'tunnel', '1', 'remote', 'prefix', '10.0.0.0/8']),
    ('set_s2s_peer_virtual_address', ('G0', '192.0.2.1'), 'set', ['vpn', 'ipsec', 'site-to-site', 'peer', 'G0', 'virtual-address', '192.0.2.1']),
    ('set_s2s_peer_vti_bind', ('G0', 'eth0'), 'set', ['vpn', 'ipsec', 'site-to-site', 'peer', 'G0', 'vti', 'bind', 'eth0']),
    ('set_s2s_peer_vti_esp_group', ('G0', '5'), 'set', ['vpn', 'ipsec', 'site-to-site', 'peer', 'G0', 'vti', 'esp-group', '5']),
    ('set_s2s_peer_vti_ts_local_prefix', ('G0', '10.0.0.0/8'), 'set', ['vpn', 'ipsec', 'site-to-site', 'peer', 'G0', 'vti', 'traffic-selector', 'local', 'prefix', '10.0.0.0/8']),
    ('set_s2s_peer_vti_ts_remote_prefix', ('G0', '10.0.0.0/8'), 'set', ['vpn', 'ipsec', 'site-to-site', 'peer', 'G0', 'vti', 'traffic-selector', 'remote', 'prefix', '10.0.0.0/8']),
    ('delete_auth_psk_secret_type', ('G0',), 'delete', ['vpn', 'ipsec', 'authentication', 'psk', 'G0', 'secret-type']),
    ('delete_auth_psk_dhcp_interface', ('G0', 'eth0'), 'delete', ['vpn', 'ipsec', 'authentication', 'psk', 'G0', 'dhcp-interface', 'eth0']),
    ('delete_s2s_peer_replay_window', ('G0',), 'delete', ['vpn', 'ipsec', 'site-to-site', 'peer', 'G0', 'replay-window']),
    ('delete_s2s_peer_default_esp_group', ('G0',), 'delete', ['vpn', 'ipsec', 'site-to-site', 'peer', 'G0', 'default-esp-group']),
    ('delete_s2s_peer_dhcp_interface', ('G0',), 'delete', ['vpn', 'ipsec', 'site-to-site', 'peer', 'G0', 'dhcp-interface']),
    ('delete_s2s_peer_auth_local_id', ('G0',), 'delete', ['vpn', 'ipsec', 'site-to-site', 'peer', 'G0', 'authentication', 'local-id']),
    ('delete_s2s_peer_auth_remote_id', ('G0',), 'delete', ['vpn', 'ipsec', 'site-to-site', 'peer', 'G0', 'authentication', 'remote-id']),
    ('delete_s2s_peer_auth_x509_ca_cert', ('G0', 'CA'), 'delete', ['vpn', 'ipsec', 'site-to-site', 'peer', 'G0', 'authentication', 'x509', 'ca-certificate', 'CA']),
    ('delete_s2s_peer_auth_x509_cert', ('G0',), 'delete', ['vpn', 'ipsec', 'site-to-site', 'peer', 'G0', 'authentication', 'x509', 'certificate']),
    ('delete_s2s_peer_auth_rsa_local_key', ('G0',), 'delete', ['vpn', 'ipsec', 'site-to-site', 'peer', 'G0', 'authentication', 'rsa', 'local-key']),
    ('delete_s2s_peer_auth_rsa_remote_key', ('G0',), 'delete', ['vpn', 'ipsec', 'site-to-site', 'peer', 'G0', 'authentication', 'rsa', 'remote-key']),
    ('delete_s2s_peer_auth_rsa_passphrase', ('G0',), 'delete', ['vpn', 'ipsec', 'site-to-site', 'peer', 'G0', 'authentication', 'rsa', 'passphrase']),
    ('delete_s2s_peer_tunnel_protocol', ('G0', '1'), 'delete', ['vpn', 'ipsec', 'site-to-site', 'peer', 'G0', 'tunnel', '1', 'protocol']),
    ('delete_s2s_peer_vti_bind', ('G0',), 'delete', ['vpn', 'ipsec', 'site-to-site', 'peer', 'G0', 'vti', 'bind']),
    ('delete_s2s_peer_vti_esp_group', ('G0',), 'delete', ['vpn', 'ipsec', 'site-to-site', 'peer', 'G0', 'vti', 'esp-group']),
    ('delete_s2s_peer_vti_ts_local_prefix', ('G0', '10.0.0.0/8'), 'delete', ['vpn', 'ipsec', 'site-to-site', 'peer', 'G0', 'vti', 'traffic-selector', 'local', 'prefix', '10.0.0.0/8']),
    ('delete_s2s_peer_vti_ts_remote_prefix', ('G0', '10.0.0.0/8'), 'delete', ['vpn', 'ipsec', 'site-to-site', 'peer', 'G0', 'vti', 'traffic-selector', 'remote', 'prefix', '10.0.0.0/8']),
    ('delete_s2s_peer_tunnel_local_port', ('G0', '1'), 'delete', ['vpn', 'ipsec', 'site-to-site', 'peer', 'G0', 'tunnel', '1', 'local', 'port']),
    ('delete_s2s_peer_tunnel_remote_port', ('G0', '1'), 'delete', ['vpn', 'ipsec', 'site-to-site', 'peer', 'G0', 'tunnel', '1', 'remote', 'port']),
    ('delete_s2s_peer_tunnel_priority', ('G0', '1'), 'delete', ['vpn', 'ipsec', 'site-to-site', 'peer', 'G0', 'tunnel', '1', 'priority']),
    ('delete_ra_connection_auth_psk', ('G0',), 'delete', ['vpn', 'ipsec', 'remote-access', 'connection', 'G0', 'authentication', 'pre-shared-secret']),
]


@pytest.mark.parametrize("method, args, op, expected_path", COMMON_CASES)
@pytest.mark.parametrize("version", ["1.4", "1.5"])
def test_ipsec_common_paths(method, args, op, expected_path, version):
    _run(version, method, args, op, expected_path)

V15_ONLY_CASES = [
    ('delete_options_retransmission_attempts', (), 'delete', ['vpn', 'ipsec', 'options', 'retransmission', 'attempts']),
    ('delete_options_retransmission_base', (), 'delete', ['vpn', 'ipsec', 'options', 'retransmission', 'base']),
    ('delete_options_retransmission_timeout', (), 'delete', ['vpn', 'ipsec', 'options', 'retransmission', 'timeout']),
    ('set_options_retransmission_attempts', ('5',), 'set', ['vpn', 'ipsec', 'options', 'retransmission', 'attempts', '5']),
    ('set_options_retransmission_base', ('5',), 'set', ['vpn', 'ipsec', 'options', 'retransmission', 'base', '5']),
    ('set_options_retransmission_timeout', ('5',), 'set', ['vpn', 'ipsec', 'options', 'retransmission', 'timeout', '5']),
    ('set_ra_pool_range_start', ('G0', '5'), 'set', ['vpn', 'ipsec', 'remote-access', 'pool', 'G0', 'range', 'start', '5']),
    ('set_ra_pool_range_stop', ('G0', '5'), 'set', ['vpn', 'ipsec', 'remote-access', 'pool', 'G0', 'range', 'stop', '5']),
    ('set_s2s_peer_unique', ('G0', 'keep'), 'set', ['vpn', 'ipsec', 'site-to-site', 'peer', 'G0', 'unique', 'keep']),
    ('delete_s2s_peer_unique', ('G0',), 'delete', ['vpn', 'ipsec', 'site-to-site', 'peer', 'G0', 'unique']),
    ('set_ra_connection_auth_always_send_cert', ('G0',), 'set', ['vpn', 'ipsec', 'remote-access', 'connection', 'G0', 'authentication', 'always-send-cert']),
    ('delete_ra_connection_auth_always_send_cert', ('G0',), 'delete', ['vpn', 'ipsec', 'remote-access', 'connection', 'G0', 'authentication', 'always-send-cert']),
    ('set_s2s_peer_childless', ('G0', 'allow'), 'set', ['vpn', 'ipsec', 'site-to-site', 'peer', 'G0', 'childless', 'allow']),
    ('delete_s2s_peer_childless', ('G0',), 'delete', ['vpn', 'ipsec', 'site-to-site', 'peer', 'G0', 'childless']),
]


@pytest.mark.parametrize("method, args, op, expected_path", V15_ONLY_CASES)
def test_ipsec_v1_5_only_paths(method, args, op, expected_path):
    _run("1.5", method, args, op, expected_path)


def test_missing_leaf_raises_value_error():
    builder = IPSecBatchBuilder(version="1.4.3")
    with pytest.raises(ValueError):
        builder.set_s2s_peer_unique("G0", "keep")


def test_capabilities_follow_the_mapper_allowlist(monkeypatch):
    builder = IPSecBatchBuilder(version="1.4.3")
    mapper = builder.mappers["ipsec"]
    monkeypatch.setattr(mapper, "versioned_nodes", lambda: frozenset({"childless", "s2s_unique"}))
    monkeypatch.setattr(mapper, "connection_types", lambda: ["initiate", "trap", "none"])
    caps = builder.get_capabilities()
    assert "version_notes" not in caps
    assert "version" not in caps
    assert caps["features"]["site_to_site"]["childless"] is True
    assert caps["features"]["site_to_site"]["connection_types"] == ["initiate", "trap", "none"]
