"""Golden paths for every OSPF builder op.

Each path was checked against the protocols/ospf templates on the 1.4 lab
(100.64.64.4) and the 1.5 lab (100.64.64.5). 1.5-only leaves raise ValueError
on 1.4 before any op is queued.
"""

import inspect

import pytest

from vyos_builders.ospf.ospf_batch_builder import OspfBatchBuilder
from vyos_mappers.ospf.ospf import OspfMapper
from vyos_mappers.ospf.ospf_versions import get_ospf_mapper
from vyos_mappers.ospf.ospf_versions.v1_5 import OspfMapperV1_5

BASE = ["protocols", "ospf"]

# method, args, op, path after protocols ospf
BOTH_CASES = [
    ("delete_abr_type", (), "delete", ["parameters", "abr-type"]),
    ("delete_access_list", ("10",), "delete", ["access-list", "10"]),
    ("delete_access_list_export", ("10", "bgp"), "delete", ["access-list", "10", "export", "bgp"]),
    ("delete_aggregation_timer", (), "delete", ["aggregation", "timer"]),
    ("delete_area", ("1",), "delete", ["area", "1"]),
    ("delete_area_authentication", ("1",), "delete", ["area", "1", "authentication"]),
    ("delete_area_export_list", ("1",), "delete", ["area", "1", "export-list"]),
    ("delete_area_import_list", ("1",), "delete", ["area", "1", "import-list"]),
    ("delete_area_network", ("1", "10.0.0.0/24"), "delete", ["area", "1", "network", "10.0.0.0/24"]),
    ("delete_area_range", ("1", "10.0.0.0/24"), "delete", ["area", "1", "range", "10.0.0.0/24"]),
    ("delete_area_range_cost", ("1", "10.0.0.0/24"), "delete", ["area", "1", "range", "10.0.0.0/24", "cost"]),
    ("delete_area_range_not_advertise", ("1", "10.0.0.0/24"), "delete", ["area", "1", "range", "10.0.0.0/24", "not-advertise"]),
    ("delete_area_range_substitute", ("1", "10.0.0.0/24"), "delete", ["area", "1", "range", "10.0.0.0/24", "substitute"]),
    ("delete_area_shortcut", ("1",), "delete", ["area", "1", "shortcut"]),
    ("delete_area_type", ("1",), "delete", ["area", "1", "area-type"]),
    ("delete_area_type_nssa_default_cost", ("1",), "delete", ["area", "1", "area-type", "nssa", "default-cost"]),
    ("delete_area_type_nssa_no_summary", ("1",), "delete", ["area", "1", "area-type", "nssa", "no-summary"]),
    ("delete_area_type_nssa_translate", ("1",), "delete", ["area", "1", "area-type", "nssa", "translate"]),
    ("delete_area_type_stub_default_cost", ("1",), "delete", ["area", "1", "area-type", "stub", "default-cost"]),
    ("delete_area_type_stub_no_summary", ("1",), "delete", ["area", "1", "area-type", "stub", "no-summary"]),
    ("delete_area_virtual_link", ("1", "192.0.2.1"), "delete", ["area", "1", "virtual-link", "192.0.2.1"]),
    ("delete_area_virtual_link_authentication", ("1", "192.0.2.1"), "delete", ["area", "1", "virtual-link", "192.0.2.1", "authentication"]),
    ("delete_area_virtual_link_authentication_md5", ("1", "192.0.2.1"), "delete", ["area", "1", "virtual-link", "192.0.2.1", "authentication", "md5"]),
    ("delete_area_virtual_link_authentication_md5_key_id", ("1", "192.0.2.1", "1"), "delete", ["area", "1", "virtual-link", "192.0.2.1", "authentication", "md5", "key-id", "1"]),
    ("delete_area_virtual_link_authentication_plaintext_password", ("1", "192.0.2.1"), "delete", ["area", "1", "virtual-link", "192.0.2.1", "authentication", "plaintext-password"]),
    ("delete_area_virtual_link_dead_interval", ("1", "192.0.2.1"), "delete", ["area", "1", "virtual-link", "192.0.2.1", "dead-interval"]),
    ("delete_area_virtual_link_hello_interval", ("1", "192.0.2.1"), "delete", ["area", "1", "virtual-link", "192.0.2.1", "hello-interval"]),
    ("delete_area_virtual_link_retransmit_interval", ("1", "192.0.2.1"), "delete", ["area", "1", "virtual-link", "192.0.2.1", "retransmit-interval"]),
    ("delete_area_virtual_link_transmit_delay", ("1", "192.0.2.1"), "delete", ["area", "1", "virtual-link", "192.0.2.1", "transmit-delay"]),
    ("delete_auto_cost_reference_bandwidth", (), "delete", ["auto-cost", "reference-bandwidth"]),
    ("delete_capability_opaque", (), "delete", ["capability", "opaque"]),
    ("delete_default_information_originate", (), "delete", ["default-information", "originate"]),
    ("delete_default_information_originate_always", (), "delete", ["default-information", "originate", "always"]),
    ("delete_default_information_originate_metric", (), "delete", ["default-information", "originate", "metric"]),
    ("delete_default_information_originate_metric_type", (), "delete", ["default-information", "originate", "metric-type"]),
    ("delete_default_information_originate_route_map", (), "delete", ["default-information", "originate", "route-map"]),
    ("delete_default_metric", (), "delete", ["default-metric"]),
    ("delete_distance_global", (), "delete", ["distance", "global"]),
    ("delete_distance_ospf", (), "delete", ["distance", "ospf"]),
    ("delete_distance_ospf_external", (), "delete", ["distance", "ospf", "external"]),
    ("delete_distance_ospf_inter_area", (), "delete", ["distance", "ospf", "inter-area"]),
    ("delete_distance_ospf_intra_area", (), "delete", ["distance", "ospf", "intra-area"]),
    ("delete_graceful_restart", (), "delete", ["graceful-restart"]),
    ("delete_graceful_restart_grace_period", (), "delete", ["graceful-restart", "grace-period"]),
    ("delete_graceful_restart_helper_enable", (), "delete", ["graceful-restart", "helper", "enable"]),
    ("delete_graceful_restart_helper_enable_router_id", ("192.0.2.2",), "delete", ["graceful-restart", "helper", "enable", "router-id", "192.0.2.2"]),
    ("delete_graceful_restart_helper_no_strict_lsa_checking", (), "delete", ["graceful-restart", "helper", "no-strict-lsa-checking"]),
    ("delete_graceful_restart_helper_planned_only", (), "delete", ["graceful-restart", "helper", "planned-only"]),
    ("delete_graceful_restart_helper_supported_grace_time", (), "delete", ["graceful-restart", "helper", "supported-grace-time"]),
    ("delete_interface", ("eth0",), "delete", ["interface", "eth0"]),
    ("delete_interface_area", ("eth0",), "delete", ["interface", "eth0", "area"]),
    ("delete_interface_authentication", ("eth0",), "delete", ["interface", "eth0", "authentication"]),
    ("delete_interface_authentication_md5", ("eth0",), "delete", ["interface", "eth0", "authentication", "md5"]),
    ("delete_interface_authentication_md5_key_id", ("eth0", "1"), "delete", ["interface", "eth0", "authentication", "md5", "key-id", "1"]),
    ("delete_interface_authentication_plaintext_password", ("eth0",), "delete", ["interface", "eth0", "authentication", "plaintext-password"]),
    ("delete_interface_bandwidth", ("eth0",), "delete", ["interface", "eth0", "bandwidth"]),
    ("delete_interface_bfd", ("eth0",), "delete", ["interface", "eth0", "bfd"]),
    ("delete_interface_bfd_profile", ("eth0",), "delete", ["interface", "eth0", "bfd", "profile"]),
    ("delete_interface_cost", ("eth0",), "delete", ["interface", "eth0", "cost"]),
    ("delete_interface_dead_interval", ("eth0",), "delete", ["interface", "eth0", "dead-interval"]),
    ("delete_interface_hello_interval", ("eth0",), "delete", ["interface", "eth0", "hello-interval"]),
    ("delete_interface_hello_multiplier", ("eth0",), "delete", ["interface", "eth0", "hello-multiplier"]),
    ("delete_interface_ldp_sync", ("eth0",), "delete", ["interface", "eth0", "ldp-sync"]),
    ("delete_interface_ldp_sync_disable", ("eth0",), "delete", ["interface", "eth0", "ldp-sync", "disable"]),
    ("delete_interface_ldp_sync_holddown", ("eth0",), "delete", ["interface", "eth0", "ldp-sync", "holddown"]),
    ("delete_interface_mtu_ignore", ("eth0",), "delete", ["interface", "eth0", "mtu-ignore"]),
    ("delete_interface_network", ("eth0",), "delete", ["interface", "eth0", "network"]),
    ("delete_interface_passive", ("eth0",), "delete", ["interface", "eth0", "passive"]),
    ("delete_interface_priority", ("eth0",), "delete", ["interface", "eth0", "priority"]),
    ("delete_interface_retransmit_interval", ("eth0",), "delete", ["interface", "eth0", "retransmit-interval"]),
    ("delete_interface_transmit_delay", ("eth0",), "delete", ["interface", "eth0", "transmit-delay"]),
    ("delete_ldp_sync_holddown", (), "delete", ["ldp-sync", "holddown"]),
    ("delete_log_adjacency_changes", (), "delete", ["log-adjacency-changes"]),
    ("delete_log_adjacency_changes_detail", (), "delete", ["log-adjacency-changes", "detail"]),
    ("delete_max_metric_router_lsa", (), "delete", ["max-metric", "router-lsa"]),
    ("delete_max_metric_router_lsa_administrative", (), "delete", ["max-metric", "router-lsa", "administrative"]),
    ("delete_max_metric_router_lsa_on_shutdown", (), "delete", ["max-metric", "router-lsa", "on-shutdown"]),
    ("delete_max_metric_router_lsa_on_startup", (), "delete", ["max-metric", "router-lsa", "on-startup"]),
    ("delete_maximum_paths", (), "delete", ["maximum-paths"]),
    ("delete_mpls_te", (), "delete", ["mpls-te"]),
    ("delete_mpls_te_enable", (), "delete", ["mpls-te", "enable"]),
    ("delete_mpls_te_router_address", (), "delete", ["mpls-te", "router-address"]),
    ("delete_neighbor", ("192.0.2.1",), "delete", ["neighbor", "192.0.2.1"]),
    ("delete_neighbor_poll_interval", ("192.0.2.1",), "delete", ["neighbor", "192.0.2.1", "poll-interval"]),
    ("delete_neighbor_priority", ("192.0.2.1",), "delete", ["neighbor", "192.0.2.1", "priority"]),
    ("delete_opaque_lsa", (), "delete", ["parameters", "opaque-lsa"]),
    ("delete_ospf", (), "delete", []),
    ("delete_passive_interface_default", (), "delete", ["passive-interface"]),
    ("delete_redistribute", ("connected",), "delete", ["redistribute", "connected"]),
    ("delete_redistribute_metric", ("connected",), "delete", ["redistribute", "connected", "metric"]),
    ("delete_redistribute_metric_type", ("connected",), "delete", ["redistribute", "connected", "metric-type"]),
    ("delete_redistribute_route_map", ("connected",), "delete", ["redistribute", "connected", "route-map"]),
    ("delete_redistribute_table", ("100",), "delete", ["redistribute", "table", "100"]),
    ("delete_redistribute_table_metric", ("100",), "delete", ["redistribute", "table", "100", "metric"]),
    ("delete_redistribute_table_metric_type", ("100",), "delete", ["redistribute", "table", "100", "metric-type"]),
    ("delete_redistribute_table_route_map", ("100",), "delete", ["redistribute", "table", "100", "route-map"]),
    ("delete_refresh_timers", (), "delete", ["refresh", "timers"]),
    ("delete_rfc1583_compatibility", (), "delete", ["parameters", "rfc1583-compatibility"]),
    ("delete_router_id", (), "delete", ["parameters", "router-id"]),
    ("delete_segment_routing", (), "delete", ["segment-routing"]),
    ("delete_segment_routing_global_block", (), "delete", ["segment-routing", "global-block"]),
    ("delete_segment_routing_local_block", (), "delete", ["segment-routing", "local-block"]),
    ("delete_segment_routing_maximum_label_depth", (), "delete", ["segment-routing", "maximum-label-depth"]),
    ("delete_segment_routing_prefix", ("10.0.0.0/24",), "delete", ["segment-routing", "prefix", "10.0.0.0/24"]),
    ("delete_segment_routing_prefix_explicit_null", ("10.0.0.0/24",), "delete", ["segment-routing", "prefix", "10.0.0.0/24", "index", "explicit-null"]),
    ("delete_segment_routing_prefix_no_php_flag", ("10.0.0.0/24",), "delete", ["segment-routing", "prefix", "10.0.0.0/24", "index", "no-php-flag"]),
    ("delete_summary_address", ("10.0.0.0/24",), "delete", ["summary-address", "10.0.0.0/24"]),
    ("delete_summary_address_no_advertise", ("10.0.0.0/24",), "delete", ["summary-address", "10.0.0.0/24", "no-advertise"]),
    ("delete_summary_address_tag", ("10.0.0.0/24",), "delete", ["summary-address", "10.0.0.0/24", "tag"]),
    ("delete_timers_throttle_spf", (), "delete", ["timers", "throttle", "spf"]),
    ("delete_timers_throttle_spf_delay", (), "delete", ["timers", "throttle", "spf", "delay"]),
    ("delete_timers_throttle_spf_initial_holdtime", (), "delete", ["timers", "throttle", "spf", "initial-holdtime"]),
    ("delete_timers_throttle_spf_max_holdtime", (), "delete", ["timers", "throttle", "spf", "max-holdtime"]),
    ("set_abr_type", ("cisco",), "set", ["parameters", "abr-type", "cisco"]),
    ("set_access_list", ("10",), "set", ["access-list", "10"]),
    ("set_access_list_export", ("10", "bgp"), "set", ["access-list", "10", "export", "bgp"]),
    ("set_aggregation_timer", ("10",), "set", ["aggregation", "timer", "10"]),
    ("set_area", ("1",), "set", ["area", "1"]),
    ("set_area_authentication", ("1", "md5"), "set", ["area", "1", "authentication", "md5"]),
    ("set_area_export_list", ("1", "10"), "set", ["area", "1", "export-list", "10"]),
    ("set_area_import_list", ("1", "10"), "set", ["area", "1", "import-list", "10"]),
    ("set_area_network", ("1", "10.0.0.0/24"), "set", ["area", "1", "network", "10.0.0.0/24"]),
    ("set_area_range", ("1", "10.0.0.0/24"), "set", ["area", "1", "range", "10.0.0.0/24"]),
    ("set_area_range_cost", ("1", "10.0.0.0/24", "10"), "set", ["area", "1", "range", "10.0.0.0/24", "cost", "10"]),
    ("set_area_range_not_advertise", ("1", "10.0.0.0/24"), "set", ["area", "1", "range", "10.0.0.0/24", "not-advertise"]),
    ("set_area_range_substitute", ("1", "10.0.0.0/24", "10.1.0.0/24"), "set", ["area", "1", "range", "10.0.0.0/24", "substitute", "10.1.0.0/24"]),
    ("set_area_shortcut", ("1", "enable"), "set", ["area", "1", "shortcut", "enable"]),
    ("set_area_type_normal", ("1",), "set", ["area", "1", "area-type", "normal"]),
    ("set_area_type_nssa", ("1",), "set", ["area", "1", "area-type", "nssa"]),
    ("set_area_type_nssa_default_cost", ("1", "10"), "set", ["area", "1", "area-type", "nssa", "default-cost", "10"]),
    ("set_area_type_nssa_no_summary", ("1",), "set", ["area", "1", "area-type", "nssa", "no-summary"]),
    ("set_area_type_nssa_translate", ("1", "always"), "set", ["area", "1", "area-type", "nssa", "translate", "always"]),
    ("set_area_type_stub", ("1",), "set", ["area", "1", "area-type", "stub"]),
    ("set_area_type_stub_default_cost", ("1", "10"), "set", ["area", "1", "area-type", "stub", "default-cost", "10"]),
    ("set_area_type_stub_no_summary", ("1",), "set", ["area", "1", "area-type", "stub", "no-summary"]),
    ("set_area_virtual_link", ("1", "192.0.2.1"), "set", ["area", "1", "virtual-link", "192.0.2.1"]),
    ("set_area_virtual_link_authentication_md5_key_id_md5_key", ("1", "192.0.2.1", "1", "k"), "set", ["area", "1", "virtual-link", "192.0.2.1", "authentication", "md5", "key-id", "1", "md5-key", "k"]),
    ("set_area_virtual_link_authentication_plaintext_password", ("1", "192.0.2.1", "pw"), "set", ["area", "1", "virtual-link", "192.0.2.1", "authentication", "plaintext-password", "pw"]),
    ("set_area_virtual_link_dead_interval", ("1", "192.0.2.1", "10"), "set", ["area", "1", "virtual-link", "192.0.2.1", "dead-interval", "10"]),
    ("set_area_virtual_link_hello_interval", ("1", "192.0.2.1", "10"), "set", ["area", "1", "virtual-link", "192.0.2.1", "hello-interval", "10"]),
    ("set_area_virtual_link_retransmit_interval", ("1", "192.0.2.1", "10"), "set", ["area", "1", "virtual-link", "192.0.2.1", "retransmit-interval", "10"]),
    ("set_area_virtual_link_transmit_delay", ("1", "192.0.2.1", "10"), "set", ["area", "1", "virtual-link", "192.0.2.1", "transmit-delay", "10"]),
    ("set_auto_cost_reference_bandwidth", ("10",), "set", ["auto-cost", "reference-bandwidth", "10"]),
    ("set_capability_opaque", (), "set", ["capability", "opaque"]),
    ("set_default_information_originate", (), "set", ["default-information", "originate"]),
    ("set_default_information_originate_always", (), "set", ["default-information", "originate", "always"]),
    ("set_default_information_originate_metric", ("10",), "set", ["default-information", "originate", "metric", "10"]),
    ("set_default_information_originate_metric_type", ("10",), "set", ["default-information", "originate", "metric-type", "10"]),
    ("set_default_information_originate_route_map", ("RM",), "set", ["default-information", "originate", "route-map", "RM"]),
    ("set_default_metric", ("10",), "set", ["default-metric", "10"]),
    ("set_distance_global", ("10",), "set", ["distance", "global", "10"]),
    ("set_distance_ospf_external", ("10",), "set", ["distance", "ospf", "external", "10"]),
    ("set_distance_ospf_inter_area", ("10",), "set", ["distance", "ospf", "inter-area", "10"]),
    ("set_distance_ospf_intra_area", ("10",), "set", ["distance", "ospf", "intra-area", "10"]),
    ("set_graceful_restart", (), "set", ["graceful-restart"]),
    ("set_graceful_restart_grace_period", ("10",), "set", ["graceful-restart", "grace-period", "10"]),
    ("set_graceful_restart_helper_enable", (), "set", ["graceful-restart", "helper", "enable"]),
    ("set_graceful_restart_helper_enable_router_id", ("192.0.2.2",), "set", ["graceful-restart", "helper", "enable", "router-id", "192.0.2.2"]),
    ("set_graceful_restart_helper_no_strict_lsa_checking", (), "set", ["graceful-restart", "helper", "no-strict-lsa-checking"]),
    ("set_graceful_restart_helper_planned_only", (), "set", ["graceful-restart", "helper", "planned-only"]),
    ("set_graceful_restart_helper_supported_grace_time", ("10",), "set", ["graceful-restart", "helper", "supported-grace-time", "10"]),
    ("set_interface", ("eth0",), "set", ["interface", "eth0"]),
    ("set_interface_area", ("eth0", "1"), "set", ["interface", "eth0", "area", "1"]),
    ("set_interface_authentication_md5_key_id", ("eth0", "1"), "set", ["interface", "eth0", "authentication", "md5", "key-id", "1"]),
    ("set_interface_authentication_md5_key_id_md5_key", ("eth0", "1", "k"), "set", ["interface", "eth0", "authentication", "md5", "key-id", "1", "md5-key", "k"]),
    ("set_interface_authentication_plaintext_password", ("eth0", "pw"), "set", ["interface", "eth0", "authentication", "plaintext-password", "pw"]),
    ("set_interface_bandwidth", ("eth0", "10"), "set", ["interface", "eth0", "bandwidth", "10"]),
    ("set_interface_bfd", ("eth0",), "set", ["interface", "eth0", "bfd"]),
    ("set_interface_bfd_profile", ("eth0", "P1"), "set", ["interface", "eth0", "bfd", "profile", "P1"]),
    ("set_interface_cost", ("eth0", "10"), "set", ["interface", "eth0", "cost", "10"]),
    ("set_interface_dead_interval", ("eth0", "10"), "set", ["interface", "eth0", "dead-interval", "10"]),
    ("set_interface_hello_interval", ("eth0", "10"), "set", ["interface", "eth0", "hello-interval", "10"]),
    ("set_interface_hello_multiplier", ("eth0", "10"), "set", ["interface", "eth0", "hello-multiplier", "10"]),
    ("set_interface_ldp_sync", ("eth0",), "set", ["interface", "eth0", "ldp-sync"]),
    ("set_interface_ldp_sync_disable", ("eth0",), "set", ["interface", "eth0", "ldp-sync", "disable"]),
    ("set_interface_ldp_sync_holddown", ("eth0", "10"), "set", ["interface", "eth0", "ldp-sync", "holddown", "10"]),
    ("set_interface_mtu_ignore", ("eth0",), "set", ["interface", "eth0", "mtu-ignore"]),
    ("set_interface_network", ("eth0", "point-to-point"), "set", ["interface", "eth0", "network", "point-to-point"]),
    ("set_interface_passive", ("eth0",), "set", ["interface", "eth0", "passive"]),
    ("set_interface_passive_disable", ("eth0",), "set", ["interface", "eth0", "passive", "disable"]),
    ("set_interface_priority", ("eth0", "10"), "set", ["interface", "eth0", "priority", "10"]),
    ("set_interface_retransmit_interval", ("eth0", "10"), "set", ["interface", "eth0", "retransmit-interval", "10"]),
    ("set_interface_transmit_delay", ("eth0", "10"), "set", ["interface", "eth0", "transmit-delay", "10"]),
    ("set_ldp_sync_holddown", ("10",), "set", ["ldp-sync", "holddown", "10"]),
    ("set_log_adjacency_changes", (), "set", ["log-adjacency-changes"]),
    ("set_log_adjacency_changes_detail", (), "set", ["log-adjacency-changes", "detail"]),
    ("set_max_metric_router_lsa_administrative", (), "set", ["max-metric", "router-lsa", "administrative"]),
    ("set_max_metric_router_lsa_on_shutdown", ("10",), "set", ["max-metric", "router-lsa", "on-shutdown", "10"]),
    ("set_max_metric_router_lsa_on_startup", ("10",), "set", ["max-metric", "router-lsa", "on-startup", "10"]),
    ("set_maximum_paths", ("10",), "set", ["maximum-paths", "10"]),
    ("set_mpls_te_enable", (), "set", ["mpls-te", "enable"]),
    ("set_mpls_te_router_address", ("192.0.2.9",), "set", ["mpls-te", "router-address", "192.0.2.9"]),
    ("set_neighbor", ("192.0.2.1",), "set", ["neighbor", "192.0.2.1"]),
    ("set_neighbor_poll_interval", ("192.0.2.1", "10"), "set", ["neighbor", "192.0.2.1", "poll-interval", "10"]),
    ("set_neighbor_priority", ("192.0.2.1", "10"), "set", ["neighbor", "192.0.2.1", "priority", "10"]),
    ("set_opaque_lsa", (), "set", ["parameters", "opaque-lsa"]),
    ("set_passive_interface_default", (), "set", ["passive-interface", "default"]),
    ("set_redistribute", ("connected",), "set", ["redistribute", "connected"]),
    ("set_redistribute_metric", ("connected", "10"), "set", ["redistribute", "connected", "metric", "10"]),
    ("set_redistribute_metric_type", ("connected", "10"), "set", ["redistribute", "connected", "metric-type", "10"]),
    ("set_redistribute_route_map", ("connected", "RM"), "set", ["redistribute", "connected", "route-map", "RM"]),
    ("set_redistribute_table", ("100",), "set", ["redistribute", "table", "100"]),
    ("set_redistribute_table_metric", ("100", "10"), "set", ["redistribute", "table", "100", "metric", "10"]),
    ("set_redistribute_table_metric_type", ("100", "10"), "set", ["redistribute", "table", "100", "metric-type", "10"]),
    ("set_redistribute_table_route_map", ("100", "RM"), "set", ["redistribute", "table", "100", "route-map", "RM"]),
    ("set_refresh_timers", ("10",), "set", ["refresh", "timers", "10"]),
    ("set_rfc1583_compatibility", (), "set", ["parameters", "rfc1583-compatibility"]),
    ("set_router_id", ("192.0.2.9",), "set", ["parameters", "router-id", "192.0.2.9"]),
    ("set_segment_routing_global_block_high", ("10",), "set", ["segment-routing", "global-block", "high-label-value", "10"]),
    ("set_segment_routing_global_block_low", ("10",), "set", ["segment-routing", "global-block", "low-label-value", "10"]),
    ("set_segment_routing_local_block_high", ("10",), "set", ["segment-routing", "local-block", "high-label-value", "10"]),
    ("set_segment_routing_local_block_low", ("10",), "set", ["segment-routing", "local-block", "low-label-value", "10"]),
    ("set_segment_routing_maximum_label_depth", ("10",), "set", ["segment-routing", "maximum-label-depth", "10"]),
    ("set_segment_routing_prefix", ("10.0.0.0/24", "5"), "set", ["segment-routing", "prefix", "10.0.0.0/24", "index", "value", "5"]),
    ("set_segment_routing_prefix_explicit_null", ("10.0.0.0/24",), "set", ["segment-routing", "prefix", "10.0.0.0/24", "index", "explicit-null"]),
    ("set_segment_routing_prefix_no_php_flag", ("10.0.0.0/24",), "set", ["segment-routing", "prefix", "10.0.0.0/24", "index", "no-php-flag"]),
    ("set_summary_address", ("10.0.0.0/24",), "set", ["summary-address", "10.0.0.0/24"]),
    ("set_summary_address_no_advertise", ("10.0.0.0/24",), "set", ["summary-address", "10.0.0.0/24", "no-advertise"]),
    ("set_summary_address_tag", ("10.0.0.0/24", "10"), "set", ["summary-address", "10.0.0.0/24", "tag", "10"]),
    ("set_timers_throttle_spf_delay", ("10",), "set", ["timers", "throttle", "spf", "delay", "10"]),
    ("set_timers_throttle_spf_initial_holdtime", ("10",), "set", ["timers", "throttle", "spf", "initial-holdtime", "10"]),
    ("set_timers_throttle_spf_max_holdtime", ("10",), "set", ["timers", "throttle", "spf", "max-holdtime", "10"]),
]

V15_ONLY_CASES = [
    ("delete_area_virtual_link_authentication_null", ("1", "192.0.2.1"), "delete", ["area", "1", "virtual-link", "192.0.2.1", "authentication", "null"]),
    ("delete_area_virtual_link_retransmit_window", ("1", "192.0.2.1"), "delete", ["area", "1", "virtual-link", "192.0.2.1", "retransmit-window"]),
    ("delete_interface_authentication_null", ("eth0",), "delete", ["interface", "eth0", "authentication", "null"]),
    ("delete_interface_retransmit_window", ("eth0",), "delete", ["interface", "eth0", "retransmit-window"]),
    ("set_area_virtual_link_authentication_null", ("1", "192.0.2.1"), "set", ["area", "1", "virtual-link", "192.0.2.1", "authentication", "null"]),
    ("set_area_virtual_link_retransmit_window", ("1", "192.0.2.1", "10"), "set", ["area", "1", "virtual-link", "192.0.2.1", "retransmit-window", "10"]),
    ("set_interface_authentication_null", ("eth0",), "set", ["interface", "eth0", "authentication", "null"]),
    ("set_interface_retransmit_window", ("eth0", "10"), "set", ["interface", "eth0", "retransmit-window", "10"]),
]


def _run(version, method, args):
    builder = OspfBatchBuilder(version=version)
    getattr(builder, method)(*args)
    return [(item["op"], item["path"]) for item in builder.get_operations()]


@pytest.mark.parametrize("version", ["1.4", "1.5"])
@pytest.mark.parametrize("method, args, op, tail", BOTH_CASES, ids=[row[0] for row in BOTH_CASES])
def test_shared_op_paths(version, method, args, op, tail):
    assert _run(version, method, args) == [(op, BASE + tail)]


@pytest.mark.parametrize("method, args, op, tail", V15_ONLY_CASES, ids=[row[0] for row in V15_ONLY_CASES])
def test_15_only_op_paths(method, args, op, tail):
    assert _run("1.5", method, args) == [(op, BASE + tail)]


@pytest.mark.parametrize("method, args, op, tail", V15_ONLY_CASES, ids=[row[0] for row in V15_ONLY_CASES])
def test_15_only_ops_raise_on_14(method, args, op, tail):
    builder = OspfBatchBuilder(version="1.4")
    with pytest.raises(ValueError, match="not supported"):
        getattr(builder, method)(*args)
    assert builder.is_empty()


def test_every_builder_op_has_a_golden_row():
    ops = {
        name
        for name, _ in inspect.getmembers(OspfBatchBuilder, inspect.isfunction)
        if name.startswith(("set_", "delete_", "create_"))
    }
    covered = {row[0] for row in BOTH_CASES + V15_ONLY_CASES}
    assert ops == covered


@pytest.mark.parametrize("version", ["1.4", "1.4.3", "VyOS 1.4.3"])
def test_factory_returns_shared_class_on_14(version):
    assert type(get_ospf_mapper(version)) is OspfMapper


@pytest.mark.parametrize("version", ["1.5", "2026.09.23-0027-rolling", "latest"])
def test_factory_returns_15_subclass_otherwise(version):
    assert isinstance(get_ospf_mapper(version), OspfMapperV1_5)


def test_versioned_nodes_follow_the_subclass():
    assert get_ospf_mapper("1.4").versioned_nodes() == frozenset()
    assert get_ospf_mapper("1.5").versioned_nodes() == frozenset(OspfMapper._VERSIONED_NODES)


def test_capability_lists_come_from_the_mapper(monkeypatch):
    """Flags and lists read the mapper, not the version string."""
    monkeypatch.setattr(OspfMapper, "redistribute_protocol_list", lambda self: ["x-proto"])
    monkeypatch.setattr(OspfMapper, "authentication_modes", lambda self: ["x-mode"])
    monkeypatch.setattr(OspfMapper, "versioned_nodes", lambda self: frozenset({"interface retransmit-window"}))
    caps = OspfBatchBuilder(version="1.4").get_capabilities()
    features = caps["features"]
    assert features["redistribute"]["protocols"] == ["x-proto"]
    assert features["interfaces"]["authentication_modes"] == ["x-mode"]
    assert features["virtual_links"]["authentication_modes"] == ["x-mode"]
    assert features["interfaces"]["retransmit_window"] is True
    assert features["virtual_links"]["retransmit_window"] is False
    assert "version_info" not in caps


def test_capability_lists_match_the_labs():
    caps_14 = OspfBatchBuilder(version="1.4").get_capabilities()["features"]
    caps_15 = OspfBatchBuilder(version="1.5").get_capabilities()["features"]
    assert caps_14["interfaces"]["authentication_modes"] == ["plaintext-password", "md5"]
    assert caps_15["interfaces"]["authentication_modes"] == ["plaintext-password", "md5", "null"]
    assert caps_14["redistribute"]["protocols"] == [
        "connected", "static", "bgp", "kernel", "rip", "isis", "babel",
    ]
    assert caps_15["redistribute"]["protocols"][-1] == "nhrp"
    for caps in (caps_14, caps_15):
        assert caps["interfaces"]["network_types"] == [
            "broadcast", "non-broadcast", "point-to-multipoint", "point-to-point",
        ]
        assert caps["parameters"]["abr_types"] == ["cisco", "ibm", "shortcut", "standard"]
        assert caps["areas"]["shortcut_values"] == ["default", "disable", "enable"]
        assert caps["areas"]["authentication_values"] == ["plaintext-password", "md5"]
        assert caps["areas"]["nssa_translate_values"] == ["always", "candidate", "never"]
        assert caps["access_list"]["export_values"] == ["bgp", "connected", "kernel", "rip", "static"]


def test_redistribute_nhrp_is_15_only():
    with pytest.raises(ValueError, match="not supported"):
        OspfBatchBuilder(version="1.4").set_redistribute("nhrp")
    assert _run("1.5", "set_redistribute", ("nhrp",)) == [("set", BASE + ["redistribute", "nhrp"])]
