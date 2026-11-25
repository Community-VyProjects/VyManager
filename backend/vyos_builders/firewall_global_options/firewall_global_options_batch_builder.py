"""
Firewall Global Options Batch Builder

Provides all firewall global-options batch operations. The mapper allowlist
(versioned_nodes) decides which version-only nodes this device has; a
1.5-only op raises ValueError on 1.4.
"""

from typing import Any, Dict, List, cast

from vyos_builders.base import BatchBuilder
from vyos_mappers import CommandMapperRegistry
from vyos_mappers.firewall_global_options.firewall_global_options import FirewallGlobalOptionsMapper

# Lab syntax bounds, the same on 1.4 and 1.5 (timeout is 1.5 only).
RESOLVER_INTERVAL_RANGE = {"min": 10, "max": 3600}
TIMEOUT_RANGE = {"min": 1, "max": 21474836}


class FirewallGlobalOptionsBatchBuilder(BatchBuilder):
    """Complete batch builder for firewall global-options operations."""

    def __init__(self, version: str):
        super().__init__(version)
        self.mapper_key = "firewall_global_options"
        self.mappers = {self.mapper_key: CommandMapperRegistry.get_mapper(self.mapper_key, version)}

    def _mapper(self) -> FirewallGlobalOptionsMapper:
        return cast(FirewallGlobalOptionsMapper, self.mappers[self.mapper_key])

    def _versioned_path(self, node: str, method: str, *args: Any) -> List[str]:
        """Path for a node only one VyOS version has; ValueError elsewhere."""
        mapper = self._mapper()
        mapper.require_node(node)
        return getattr(mapper, method)(*args)

    # ========================================================================
    # Root
    # ========================================================================

    def delete_global_options(self) -> "FirewallGlobalOptionsBatchBuilder":
        """Delete the whole firewall global-options node."""
        return self.add_delete(self._mapper().get_global_options_path())

    # ========================================================================
    # Single-value leaves
    # ========================================================================

    def set_all_ping(self, value: str) -> "FirewallGlobalOptionsBatchBuilder":
        return self.add_set(self._mapper().get_all_ping(value))

    def delete_all_ping(self) -> "FirewallGlobalOptionsBatchBuilder":
        return self.add_delete(self._mapper().get_all_ping_path())

    def set_broadcast_ping(self, value: str) -> "FirewallGlobalOptionsBatchBuilder":
        return self.add_set(self._mapper().get_broadcast_ping(value))

    def delete_broadcast_ping(self) -> "FirewallGlobalOptionsBatchBuilder":
        return self.add_delete(self._mapper().get_broadcast_ping_path())

    def set_directed_broadcast(self, value: str) -> "FirewallGlobalOptionsBatchBuilder":
        return self.add_set(self._mapper().get_directed_broadcast(value))

    def delete_directed_broadcast(self) -> "FirewallGlobalOptionsBatchBuilder":
        return self.add_delete(self._mapper().get_directed_broadcast_path())

    def set_ip_src_route(self, value: str) -> "FirewallGlobalOptionsBatchBuilder":
        return self.add_set(self._mapper().get_ip_src_route(value))

    def delete_ip_src_route(self) -> "FirewallGlobalOptionsBatchBuilder":
        return self.add_delete(self._mapper().get_ip_src_route_path())

    def set_ipv6_src_route(self, value: str) -> "FirewallGlobalOptionsBatchBuilder":
        return self.add_set(self._mapper().get_ipv6_src_route(value))

    def delete_ipv6_src_route(self) -> "FirewallGlobalOptionsBatchBuilder":
        return self.add_delete(self._mapper().get_ipv6_src_route_path())

    def set_receive_redirects(self, value: str) -> "FirewallGlobalOptionsBatchBuilder":
        return self.add_set(self._mapper().get_receive_redirects(value))

    def delete_receive_redirects(self) -> "FirewallGlobalOptionsBatchBuilder":
        return self.add_delete(self._mapper().get_receive_redirects_path())

    def set_ipv6_receive_redirects(self, value: str) -> "FirewallGlobalOptionsBatchBuilder":
        return self.add_set(self._mapper().get_ipv6_receive_redirects(value))

    def delete_ipv6_receive_redirects(self) -> "FirewallGlobalOptionsBatchBuilder":
        return self.add_delete(self._mapper().get_ipv6_receive_redirects_path())

    def set_send_redirects(self, value: str) -> "FirewallGlobalOptionsBatchBuilder":
        return self.add_set(self._mapper().get_send_redirects(value))

    def delete_send_redirects(self) -> "FirewallGlobalOptionsBatchBuilder":
        return self.add_delete(self._mapper().get_send_redirects_path())

    def set_log_martians(self, value: str) -> "FirewallGlobalOptionsBatchBuilder":
        return self.add_set(self._mapper().get_log_martians(value))

    def delete_log_martians(self) -> "FirewallGlobalOptionsBatchBuilder":
        return self.add_delete(self._mapper().get_log_martians_path())

    def set_source_validation(self, value: str) -> "FirewallGlobalOptionsBatchBuilder":
        return self.add_set(self._mapper().get_source_validation(value))

    def delete_source_validation(self) -> "FirewallGlobalOptionsBatchBuilder":
        return self.add_delete(self._mapper().get_source_validation_path())

    def set_ipv6_source_validation(self, value: str) -> "FirewallGlobalOptionsBatchBuilder":
        return self.add_set(self._mapper().get_ipv6_source_validation(value))

    def delete_ipv6_source_validation(self) -> "FirewallGlobalOptionsBatchBuilder":
        return self.add_delete(self._mapper().get_ipv6_source_validation_path())

    def set_syn_cookies(self, value: str) -> "FirewallGlobalOptionsBatchBuilder":
        return self.add_set(self._mapper().get_syn_cookies(value))

    def delete_syn_cookies(self) -> "FirewallGlobalOptionsBatchBuilder":
        return self.add_delete(self._mapper().get_syn_cookies_path())

    def set_twa_hazards_protection(self, value: str) -> "FirewallGlobalOptionsBatchBuilder":
        return self.add_set(self._mapper().get_twa_hazards_protection(value))

    def delete_twa_hazards_protection(self) -> "FirewallGlobalOptionsBatchBuilder":
        return self.add_delete(self._mapper().get_twa_hazards_protection_path())

    # ========================================================================
    # DNS Resolver
    # ========================================================================

    def set_resolver_cache(self) -> "FirewallGlobalOptionsBatchBuilder":
        return self.add_set(self._mapper().get_resolver_cache())

    def delete_resolver_cache(self) -> "FirewallGlobalOptionsBatchBuilder":
        return self.add_delete(self._mapper().get_resolver_cache())

    def set_resolver_interval(self, seconds: str) -> "FirewallGlobalOptionsBatchBuilder":
        return self.add_set(self._mapper().get_resolver_interval(seconds))

    def delete_resolver_interval(self) -> "FirewallGlobalOptionsBatchBuilder":
        return self.add_delete(self._mapper().get_resolver_interval_path())

    # ========================================================================
    # State Policy
    # ========================================================================

    def delete_state_policy(self) -> "FirewallGlobalOptionsBatchBuilder":
        return self.add_delete(self._mapper().get_state_policy_path())

    def delete_state_policy_established(self) -> "FirewallGlobalOptionsBatchBuilder":
        return self.add_delete(self._mapper().get_state_policy_state_path("established"))

    def set_state_policy_established_action(self, action: str) -> "FirewallGlobalOptionsBatchBuilder":
        return self.add_set(self._mapper().get_state_policy_action("established", action))

    def delete_state_policy_established_action(self) -> "FirewallGlobalOptionsBatchBuilder":
        return self.add_delete(self._mapper().get_state_policy_action_path("established"))

    def set_state_policy_established_log(self) -> "FirewallGlobalOptionsBatchBuilder":
        return self.add_set(self._mapper().get_state_policy_log("established"))

    def delete_state_policy_established_log(self) -> "FirewallGlobalOptionsBatchBuilder":
        return self.add_delete(self._mapper().get_state_policy_log("established"))

    def set_state_policy_established_log_level(self, level: str) -> "FirewallGlobalOptionsBatchBuilder":
        return self.add_set(self._mapper().get_state_policy_log_level("established", level))

    def delete_state_policy_established_log_level(self) -> "FirewallGlobalOptionsBatchBuilder":
        return self.add_delete(self._mapper().get_state_policy_log_level_path("established"))

    def delete_state_policy_invalid(self) -> "FirewallGlobalOptionsBatchBuilder":
        return self.add_delete(self._mapper().get_state_policy_state_path("invalid"))

    def set_state_policy_invalid_action(self, action: str) -> "FirewallGlobalOptionsBatchBuilder":
        return self.add_set(self._mapper().get_state_policy_action("invalid", action))

    def delete_state_policy_invalid_action(self) -> "FirewallGlobalOptionsBatchBuilder":
        return self.add_delete(self._mapper().get_state_policy_action_path("invalid"))

    def set_state_policy_invalid_log(self) -> "FirewallGlobalOptionsBatchBuilder":
        return self.add_set(self._mapper().get_state_policy_log("invalid"))

    def delete_state_policy_invalid_log(self) -> "FirewallGlobalOptionsBatchBuilder":
        return self.add_delete(self._mapper().get_state_policy_log("invalid"))

    def set_state_policy_invalid_log_level(self, level: str) -> "FirewallGlobalOptionsBatchBuilder":
        return self.add_set(self._mapper().get_state_policy_log_level("invalid", level))

    def delete_state_policy_invalid_log_level(self) -> "FirewallGlobalOptionsBatchBuilder":
        return self.add_delete(self._mapper().get_state_policy_log_level_path("invalid"))

    def delete_state_policy_related(self) -> "FirewallGlobalOptionsBatchBuilder":
        return self.add_delete(self._mapper().get_state_policy_state_path("related"))

    def set_state_policy_related_action(self, action: str) -> "FirewallGlobalOptionsBatchBuilder":
        return self.add_set(self._mapper().get_state_policy_action("related", action))

    def delete_state_policy_related_action(self) -> "FirewallGlobalOptionsBatchBuilder":
        return self.add_delete(self._mapper().get_state_policy_action_path("related"))

    def set_state_policy_related_log(self) -> "FirewallGlobalOptionsBatchBuilder":
        return self.add_set(self._mapper().get_state_policy_log("related"))

    def delete_state_policy_related_log(self) -> "FirewallGlobalOptionsBatchBuilder":
        return self.add_delete(self._mapper().get_state_policy_log("related"))

    def set_state_policy_related_log_level(self, level: str) -> "FirewallGlobalOptionsBatchBuilder":
        return self.add_set(self._mapper().get_state_policy_log_level("related", level))

    def delete_state_policy_related_log_level(self) -> "FirewallGlobalOptionsBatchBuilder":
        return self.add_delete(self._mapper().get_state_policy_log_level_path("related"))

    # ========================================================================
    # State Policy Offload (VyOS 1.5)
    # ========================================================================

    def set_state_policy_offload_target(self, flowtable: str) -> "FirewallGlobalOptionsBatchBuilder":
        return self.add_set(
            self._versioned_path("state-policy offload", "get_state_policy_offload_target", flowtable)
        )

    def delete_state_policy_offload(self) -> "FirewallGlobalOptionsBatchBuilder":
        """offload-target is required under offload, so the clear deletes offload."""
        return self.add_delete(self._versioned_path("state-policy offload", "get_state_policy_offload_path"))

    # ========================================================================
    # Apply to Bridged Traffic (VyOS 1.5)
    # ========================================================================

    def delete_apply_to_bridged_traffic(self) -> "FirewallGlobalOptionsBatchBuilder":
        return self.add_delete(
            self._versioned_path("apply-to-bridged-traffic", "get_apply_to_bridged_traffic_path")
        )

    def set_apply_to_bridged_traffic_ipv4(self) -> "FirewallGlobalOptionsBatchBuilder":
        return self.add_set(
            self._versioned_path("apply-to-bridged-traffic", "get_apply_to_bridged_traffic_family", "ipv4")
        )

    def delete_apply_to_bridged_traffic_ipv4(self) -> "FirewallGlobalOptionsBatchBuilder":
        return self.add_delete(
            self._versioned_path("apply-to-bridged-traffic", "get_apply_to_bridged_traffic_family", "ipv4")
        )

    def set_apply_to_bridged_traffic_ipv6(self) -> "FirewallGlobalOptionsBatchBuilder":
        return self.add_set(
            self._versioned_path("apply-to-bridged-traffic", "get_apply_to_bridged_traffic_family", "ipv6")
        )

    def delete_apply_to_bridged_traffic_ipv6(self) -> "FirewallGlobalOptionsBatchBuilder":
        return self.add_delete(
            self._versioned_path("apply-to-bridged-traffic", "get_apply_to_bridged_traffic_family", "ipv6")
        )

    def delete_apply_to_bridged_traffic_accept_invalid(self) -> "FirewallGlobalOptionsBatchBuilder":
        return self.add_delete(
            self._versioned_path("apply-to-bridged-traffic", "get_apply_to_bridged_traffic_accept_invalid_path")
        )

    def set_apply_to_bridged_traffic_accept_invalid_ethernet_type(self, ethernet_type: str) -> "FirewallGlobalOptionsBatchBuilder":
        return self.add_set(
            self._versioned_path(
                "apply-to-bridged-traffic",
                "get_apply_to_bridged_traffic_accept_invalid_ethernet_type",
                ethernet_type,
            )
        )

    def delete_apply_to_bridged_traffic_accept_invalid_ethernet_type(self, ethernet_type: str) -> "FirewallGlobalOptionsBatchBuilder":
        return self.add_delete(
            self._versioned_path(
                "apply-to-bridged-traffic",
                "get_apply_to_bridged_traffic_accept_invalid_ethernet_type",
                ethernet_type,
            )
        )

    # ========================================================================
    # GeoIP (VyOS 1.5)
    # ========================================================================

    def delete_geoip(self) -> "FirewallGlobalOptionsBatchBuilder":
        return self.add_delete(self._versioned_path("geoip", "get_geoip_path"))

    def set_geoip_maxmind_lite(self) -> "FirewallGlobalOptionsBatchBuilder":
        return self.add_set(self._versioned_path("geoip", "get_geoip_maxmind_lite"))

    def delete_geoip_maxmind_lite(self) -> "FirewallGlobalOptionsBatchBuilder":
        return self.add_delete(self._versioned_path("geoip", "get_geoip_maxmind_lite"))

    def set_geoip_provider(self, value: str) -> "FirewallGlobalOptionsBatchBuilder":
        return self.add_set(self._versioned_path("geoip", "get_geoip_leaf", "provider", value))

    def delete_geoip_provider(self) -> "FirewallGlobalOptionsBatchBuilder":
        return self.add_delete(self._versioned_path("geoip", "get_geoip_leaf_path", "provider"))

    def set_geoip_maxmind_account_id(self, value: str) -> "FirewallGlobalOptionsBatchBuilder":
        return self.add_set(self._versioned_path("geoip", "get_geoip_leaf", "maxmind-account-id", value))

    def delete_geoip_maxmind_account_id(self) -> "FirewallGlobalOptionsBatchBuilder":
        return self.add_delete(self._versioned_path("geoip", "get_geoip_leaf_path", "maxmind-account-id"))

    def set_geoip_maxmind_license_key(self, value: str) -> "FirewallGlobalOptionsBatchBuilder":
        return self.add_set(self._versioned_path("geoip", "get_geoip_leaf", "maxmind-license-key", value))

    def delete_geoip_maxmind_license_key(self) -> "FirewallGlobalOptionsBatchBuilder":
        return self.add_delete(self._versioned_path("geoip", "get_geoip_leaf_path", "maxmind-license-key"))

    def set_geoip_source_address(self, value: str) -> "FirewallGlobalOptionsBatchBuilder":
        return self.add_set(self._versioned_path("geoip", "get_geoip_leaf", "source-address", value))

    def delete_geoip_source_address(self) -> "FirewallGlobalOptionsBatchBuilder":
        return self.add_delete(self._versioned_path("geoip", "get_geoip_leaf_path", "source-address"))

    def set_geoip_vrf(self, value: str) -> "FirewallGlobalOptionsBatchBuilder":
        return self.add_set(self._versioned_path("geoip", "get_geoip_leaf", "vrf", value))

    def delete_geoip_vrf(self) -> "FirewallGlobalOptionsBatchBuilder":
        return self.add_delete(self._versioned_path("geoip", "get_geoip_leaf_path", "vrf"))

    # ========================================================================
    # Connection Tracking Timeouts (VyOS 1.5)
    # ========================================================================

    def delete_timeout(self) -> "FirewallGlobalOptionsBatchBuilder":
        return self.add_delete(self._versioned_path("timeout", "get_timeout_path"))

    def delete_timeout_tcp(self) -> "FirewallGlobalOptionsBatchBuilder":
        return self.add_delete(self._versioned_path("timeout", "get_timeout_leaf_path", ["tcp"]))

    def delete_timeout_udp(self) -> "FirewallGlobalOptionsBatchBuilder":
        return self.add_delete(self._versioned_path("timeout", "get_timeout_leaf_path", ["udp"]))

    def set_timeout_icmp(self, seconds: str) -> "FirewallGlobalOptionsBatchBuilder":
        return self.add_set(self._versioned_path("timeout", "get_timeout", ["icmp"], seconds))

    def delete_timeout_icmp(self) -> "FirewallGlobalOptionsBatchBuilder":
        return self.add_delete(self._versioned_path("timeout", "get_timeout_leaf_path", ["icmp"]))

    def set_timeout_other(self, seconds: str) -> "FirewallGlobalOptionsBatchBuilder":
        return self.add_set(self._versioned_path("timeout", "get_timeout", ["other"], seconds))

    def delete_timeout_other(self) -> "FirewallGlobalOptionsBatchBuilder":
        return self.add_delete(self._versioned_path("timeout", "get_timeout_leaf_path", ["other"]))

    def set_timeout_tcp_close(self, seconds: str) -> "FirewallGlobalOptionsBatchBuilder":
        return self.add_set(self._versioned_path("timeout", "get_timeout", ["tcp", "close"], seconds))

    def delete_timeout_tcp_close(self) -> "FirewallGlobalOptionsBatchBuilder":
        return self.add_delete(self._versioned_path("timeout", "get_timeout_leaf_path", ["tcp", "close"]))

    def set_timeout_tcp_close_wait(self, seconds: str) -> "FirewallGlobalOptionsBatchBuilder":
        return self.add_set(self._versioned_path("timeout", "get_timeout", ["tcp", "close-wait"], seconds))

    def delete_timeout_tcp_close_wait(self) -> "FirewallGlobalOptionsBatchBuilder":
        return self.add_delete(self._versioned_path("timeout", "get_timeout_leaf_path", ["tcp", "close-wait"]))

    def set_timeout_tcp_established(self, seconds: str) -> "FirewallGlobalOptionsBatchBuilder":
        return self.add_set(self._versioned_path("timeout", "get_timeout", ["tcp", "established"], seconds))

    def delete_timeout_tcp_established(self) -> "FirewallGlobalOptionsBatchBuilder":
        return self.add_delete(self._versioned_path("timeout", "get_timeout_leaf_path", ["tcp", "established"]))

    def set_timeout_tcp_fin_wait(self, seconds: str) -> "FirewallGlobalOptionsBatchBuilder":
        return self.add_set(self._versioned_path("timeout", "get_timeout", ["tcp", "fin-wait"], seconds))

    def delete_timeout_tcp_fin_wait(self) -> "FirewallGlobalOptionsBatchBuilder":
        return self.add_delete(self._versioned_path("timeout", "get_timeout_leaf_path", ["tcp", "fin-wait"]))

    def set_timeout_tcp_last_ack(self, seconds: str) -> "FirewallGlobalOptionsBatchBuilder":
        return self.add_set(self._versioned_path("timeout", "get_timeout", ["tcp", "last-ack"], seconds))

    def delete_timeout_tcp_last_ack(self) -> "FirewallGlobalOptionsBatchBuilder":
        return self.add_delete(self._versioned_path("timeout", "get_timeout_leaf_path", ["tcp", "last-ack"]))

    def set_timeout_tcp_syn_recv(self, seconds: str) -> "FirewallGlobalOptionsBatchBuilder":
        return self.add_set(self._versioned_path("timeout", "get_timeout", ["tcp", "syn-recv"], seconds))

    def delete_timeout_tcp_syn_recv(self) -> "FirewallGlobalOptionsBatchBuilder":
        return self.add_delete(self._versioned_path("timeout", "get_timeout_leaf_path", ["tcp", "syn-recv"]))

    def set_timeout_tcp_syn_sent(self, seconds: str) -> "FirewallGlobalOptionsBatchBuilder":
        return self.add_set(self._versioned_path("timeout", "get_timeout", ["tcp", "syn-sent"], seconds))

    def delete_timeout_tcp_syn_sent(self) -> "FirewallGlobalOptionsBatchBuilder":
        return self.add_delete(self._versioned_path("timeout", "get_timeout_leaf_path", ["tcp", "syn-sent"]))

    def set_timeout_tcp_time_wait(self, seconds: str) -> "FirewallGlobalOptionsBatchBuilder":
        return self.add_set(self._versioned_path("timeout", "get_timeout", ["tcp", "time-wait"], seconds))

    def delete_timeout_tcp_time_wait(self) -> "FirewallGlobalOptionsBatchBuilder":
        return self.add_delete(self._versioned_path("timeout", "get_timeout_leaf_path", ["tcp", "time-wait"]))

    def set_timeout_udp_other(self, seconds: str) -> "FirewallGlobalOptionsBatchBuilder":
        return self.add_set(self._versioned_path("timeout", "get_timeout", ["udp", "other"], seconds))

    def delete_timeout_udp_other(self) -> "FirewallGlobalOptionsBatchBuilder":
        return self.add_delete(self._versioned_path("timeout", "get_timeout_leaf_path", ["udp", "other"]))

    def set_timeout_udp_stream(self, seconds: str) -> "FirewallGlobalOptionsBatchBuilder":
        return self.add_set(self._versioned_path("timeout", "get_timeout", ["udp", "stream"], seconds))

    def delete_timeout_udp_stream(self) -> "FirewallGlobalOptionsBatchBuilder":
        return self.add_delete(self._versioned_path("timeout", "get_timeout_leaf_path", ["udp", "stream"]))

    # ========================================================================
    # Capabilities
    # ========================================================================

    def get_capabilities(self) -> Dict[str, Any]:
        mapper = self._mapper()
        nodes = mapper.versioned_nodes()
        toggle = {"supported": True, "values": list(mapper.toggle_values())}
        source_validation = {"supported": True, "values": list(mapper.source_validation_values())}

        return {
            "version": self.version,
            "features": {
                "all_ping": toggle,
                "broadcast_ping": toggle,
                "directed_broadcast": toggle,
                "ip_src_route": toggle,
                "ipv6_src_route": toggle,
                "receive_redirects": toggle,
                "ipv6_receive_redirects": toggle,
                "send_redirects": toggle,
                "log_martians": toggle,
                "source_validation": source_validation,
                "ipv6_source_validation": source_validation,
                "syn_cookies": toggle,
                "twa_hazards_protection": toggle,
                "resolver_cache": {"supported": True},
                "resolver_interval": {"supported": True, **RESOLVER_INTERVAL_RANGE},
                "state_policy": {
                    "supported": True,
                    "actions": list(mapper.state_action_values()),
                    "log_levels": list(mapper.log_level_values()),
                },
                "state_policy_offload": {"supported": "state-policy offload" in nodes},
                "bridged_traffic": {
                    "supported": "apply-to-bridged-traffic" in nodes,
                    "ethernet_types": list(mapper.bridged_ethernet_type_values()),
                },
                "geoip": {
                    "supported": "geoip" in nodes,
                    "providers": list(mapper.geoip_provider_values()),
                },
                "timeouts": {"supported": "timeout" in nodes, **TIMEOUT_RANGE},
            },
        }
