"""VyOS 1.5 service monitoring mapper.

1.5 adds ``prometheus`` (node-exporter, frr-exporter, blackbox-exporter),
``network-event`` and ``zabbix-agent authentication``.
"""

from typing import List

from ..service_monitoring import NETWORK_EVENT, PROMETHEUS, ZABBIX, ServiceMonitoringMapper

NODE_EXPORTER = PROMETHEUS + ["node-exporter"]
FRR_EXPORTER = PROMETHEUS + ["frr-exporter"]
BLACKBOX = PROMETHEUS + ["blackbox-exporter"]


class ServiceMonitoringMapperV1_5(ServiceMonitoringMapper):
    """VyOS 1.5 service monitoring mapper."""

    # zabbix-agent authentication mode allowed values.
    _AUTH_MODES = ("pre-shared-secret",)

    # blackbox-exporter modules preferred-ip-protocol: regex (ipv4|ipv6).
    _PREFERRED_IP_PROTOCOLS = ("ipv4", "ipv6")

    # blackbox-exporter modules dns query-type val_help values.
    _DNS_QUERY_TYPES = ("ANY", "A", "AAAA")

    # network-event log-level: regex (info|debug).
    _LOG_LEVELS = ("info", "debug")

    # network-event event child nodes.
    _EVENT_TYPES = ("addr", "link", "neigh", "route", "rule")

    def zabbix_auth_modes(self) -> List[str]:
        return list(self._AUTH_MODES)

    def preferred_ip_protocol_values(self) -> List[str]:
        return list(self._PREFERRED_IP_PROTOCOLS)

    def dns_query_types(self) -> List[str]:
        return list(self._DNS_QUERY_TYPES)

    def network_event_log_levels(self) -> List[str]:
        return list(self._LOG_LEVELS)

    def network_event_types(self) -> List[str]:
        return list(self._EVENT_TYPES)

    # ========================================================================
    # Zabbix agent authentication
    # ========================================================================

    def get_zabbix_auth_delete(self) -> List[str]:
        return ZABBIX + ["authentication"]

    def get_zabbix_auth_mode(self, mode: str) -> List[str]:
        return ZABBIX + ["authentication", "mode", mode]

    def get_zabbix_auth_mode_delete(self) -> List[str]:
        return ZABBIX + ["authentication", "mode"]

    def get_zabbix_auth_psk_id(self, psk_id: str) -> List[str]:
        return ZABBIX + ["authentication", "psk", "id", psk_id]

    def get_zabbix_auth_psk_id_delete(self) -> List[str]:
        return ZABBIX + ["authentication", "psk", "id"]

    def get_zabbix_auth_psk_secret(self, secret: str) -> List[str]:
        return ZABBIX + ["authentication", "psk", "secret", secret]

    def get_zabbix_auth_psk_secret_delete(self) -> List[str]:
        return ZABBIX + ["authentication", "psk", "secret"]

    # ========================================================================
    # Prometheus exporters
    # ========================================================================

    def get_prometheus_delete(self) -> List[str]:
        return PROMETHEUS

    # Node exporter
    def get_prometheus_node_exporter_delete(self) -> List[str]:
        return NODE_EXPORTER

    def get_prometheus_node_exporter_port(self, port: str) -> List[str]:
        return NODE_EXPORTER + ["port", port]

    def get_prometheus_node_exporter_port_delete(self) -> List[str]:
        return NODE_EXPORTER + ["port"]

    def get_prometheus_node_exporter_listen_address(self, address: str) -> List[str]:
        return NODE_EXPORTER + ["listen-address", address]

    def get_prometheus_node_exporter_all_listen_addresses_delete(self) -> List[str]:
        return NODE_EXPORTER + ["listen-address"]

    def get_prometheus_node_exporter_vrf(self, vrf: str) -> List[str]:
        return NODE_EXPORTER + ["vrf", vrf]

    def get_prometheus_node_exporter_vrf_delete(self) -> List[str]:
        return NODE_EXPORTER + ["vrf"]

    def get_prometheus_node_exporter_textfile_collector(self) -> List[str]:
        return NODE_EXPORTER + ["collectors", "textfile"]

    # FRR exporter
    def get_prometheus_frr_exporter_delete(self) -> List[str]:
        return FRR_EXPORTER

    def get_prometheus_frr_exporter_port(self, port: str) -> List[str]:
        return FRR_EXPORTER + ["port", port]

    def get_prometheus_frr_exporter_port_delete(self) -> List[str]:
        return FRR_EXPORTER + ["port"]

    def get_prometheus_frr_exporter_listen_address(self, address: str) -> List[str]:
        return FRR_EXPORTER + ["listen-address", address]

    def get_prometheus_frr_exporter_all_listen_addresses_delete(self) -> List[str]:
        return FRR_EXPORTER + ["listen-address"]

    def get_prometheus_frr_exporter_vrf(self, vrf: str) -> List[str]:
        return FRR_EXPORTER + ["vrf", vrf]

    def get_prometheus_frr_exporter_vrf_delete(self) -> List[str]:
        return FRR_EXPORTER + ["vrf"]

    # Blackbox exporter
    def get_prometheus_blackbox_exporter_delete(self) -> List[str]:
        return BLACKBOX

    def get_prometheus_blackbox_exporter_port(self, port: str) -> List[str]:
        return BLACKBOX + ["port", port]

    def get_prometheus_blackbox_exporter_port_delete(self) -> List[str]:
        return BLACKBOX + ["port"]

    def get_prometheus_blackbox_exporter_listen_address(self, address: str) -> List[str]:
        return BLACKBOX + ["listen-address", address]

    def get_prometheus_blackbox_exporter_all_listen_addresses_delete(self) -> List[str]:
        return BLACKBOX + ["listen-address"]

    def get_prometheus_blackbox_exporter_vrf(self, vrf: str) -> List[str]:
        return BLACKBOX + ["vrf", vrf]

    def get_prometheus_blackbox_exporter_vrf_delete(self) -> List[str]:
        return BLACKBOX + ["vrf"]

    # Blackbox modules: `modules <icmp|dns> name <name>` (tag node under `name`)
    def get_prometheus_blackbox_module(self, kind: str, name: str) -> List[str]:
        return BLACKBOX + ["modules", kind, "name", name]

    def get_prometheus_blackbox_module_preferred_ip_protocol(self, kind: str, name: str, protocol: str) -> List[str]:
        return self.get_prometheus_blackbox_module(kind, name) + ["preferred-ip-protocol", protocol]

    def get_prometheus_blackbox_module_preferred_ip_protocol_delete(self, kind: str, name: str) -> List[str]:
        return self.get_prometheus_blackbox_module(kind, name) + ["preferred-ip-protocol"]

    def get_prometheus_blackbox_module_ip_protocol_fallback(self, kind: str, name: str) -> List[str]:
        return self.get_prometheus_blackbox_module(kind, name) + ["ip-protocol-fallback"]

    def get_prometheus_blackbox_module_timeout(self, kind: str, name: str, timeout: str) -> List[str]:
        return self.get_prometheus_blackbox_module(kind, name) + ["timeout", timeout]

    def get_prometheus_blackbox_module_timeout_delete(self, kind: str, name: str) -> List[str]:
        return self.get_prometheus_blackbox_module(kind, name) + ["timeout"]

    def get_prometheus_blackbox_dns_query_name(self, name: str, query_name: str) -> List[str]:
        return self.get_prometheus_blackbox_module("dns", name) + ["query-name", query_name]

    def get_prometheus_blackbox_dns_query_name_delete(self, name: str) -> List[str]:
        return self.get_prometheus_blackbox_module("dns", name) + ["query-name"]

    def get_prometheus_blackbox_dns_query_type(self, name: str, query_type: str) -> List[str]:
        return self.get_prometheus_blackbox_module("dns", name) + ["query-type", query_type]

    def get_prometheus_blackbox_dns_query_type_delete(self, name: str) -> List[str]:
        return self.get_prometheus_blackbox_module("dns", name) + ["query-type"]

    # ========================================================================
    # Network event logger
    # ========================================================================

    def get_network_event_delete(self) -> List[str]:
        return NETWORK_EVENT

    def get_network_event_log_level(self, level: str) -> List[str]:
        return NETWORK_EVENT + ["log-level", level]

    def get_network_event_log_level_delete(self) -> List[str]:
        return NETWORK_EVENT + ["log-level"]

    def get_network_event_queue_size(self, size: str) -> List[str]:
        return NETWORK_EVENT + ["queue-size", size]

    def get_network_event_queue_size_delete(self) -> List[str]:
        return NETWORK_EVENT + ["queue-size"]

    def get_network_event_event(self, event_type: str) -> List[str]:
        return NETWORK_EVENT + ["event", event_type]

    def get_network_event_all_events_delete(self) -> List[str]:
        return NETWORK_EVENT + ["event"]
