"""VyOS 1.5 container mapper.

These leaves exist only on 1.5: ``allow-host-cgroups``, ``health-check``,
``log-driver``, ``stop-timeout``, ``tmpfs`` and ``network <net> mac`` under
``container name``; ``gateway``, ``mtu`` and ``type`` under ``container
network``; ``insecure`` and ``mirror`` under ``container registry``. 1.5 also
adds the ``chown`` and ``sys-rawio`` capabilities. Path methods do not re-check
the node: the builder already called ``require_node``.
"""

from typing import List

from ..container import ContainerMapper


class ContainerMapperV1_5(ContainerMapper):
    """VyOS 1.5 container mapper with the 1.5-only leaves."""

    # ========================================================================
    # Allowed values
    # ========================================================================

    def capability_values(self) -> List[str]:
        return [
            "net-admin",
            "net-bind-service",
            "net-raw",
            "chown",
            "mknod",
            "setpcap",
            "sys-admin",
            "sys-module",
            "sys-nice",
            "sys-rawio",
            "sys-time",
        ]

    def log_driver_values(self) -> List[str]:
        return ["k8s-file", "journald", "none"]

    def network_types(self) -> List[str]:
        return ["bridge", "macvlan"]

    def macvlan_modes(self) -> List[str]:
        return ["bridge", "private", "vepa"]

    def network_mac_keywords(self) -> List[str]:
        return ["auto"]

    def health_check_interval_keywords(self) -> List[str]:
        return ["disable"]

    def registry_password_max_length(self) -> int:
        return 512

    # ========================================================================
    # Verify rules
    # ========================================================================

    def name_server_needs_no_name_server(self) -> bool:
        return True

    def unique_attachment_addresses(self) -> bool:
        return True

    # ========================================================================
    # Container name
    # ========================================================================

    def get_name_allow_host_cgroups(self, name: str) -> List[str]:
        return self._name(name) + ["allow-host-cgroups"]

    def get_name_health_check(self, name: str) -> List[str]:
        return self._name(name) + ["health-check"]

    def get_name_health_check_command(self, name: str, command: str) -> List[str]:
        return self._name(name) + ["health-check", "command", command]

    def get_name_health_check_command_delete(self, name: str) -> List[str]:
        return self._name(name) + ["health-check", "command"]

    def get_name_health_check_interval(self, name: str, interval: str) -> List[str]:
        return self._name(name) + ["health-check", "interval", interval]

    def get_name_health_check_interval_delete(self, name: str) -> List[str]:
        return self._name(name) + ["health-check", "interval"]

    def get_name_health_check_retry(self, name: str, retry: str) -> List[str]:
        return self._name(name) + ["health-check", "retry", retry]

    def get_name_health_check_retry_delete(self, name: str) -> List[str]:
        return self._name(name) + ["health-check", "retry"]

    def get_name_health_check_timeout(self, name: str, timeout: str) -> List[str]:
        return self._name(name) + ["health-check", "timeout", timeout]

    def get_name_health_check_timeout_delete(self, name: str) -> List[str]:
        return self._name(name) + ["health-check", "timeout"]

    def get_name_log_driver(self, name: str, driver: str) -> List[str]:
        return self._name(name) + ["log-driver", driver]

    def get_name_log_driver_delete(self, name: str) -> List[str]:
        return self._name(name) + ["log-driver"]

    def get_name_stop_timeout(self, name: str, seconds: str) -> List[str]:
        return self._name(name) + ["stop-timeout", seconds]

    def get_name_stop_timeout_delete(self, name: str) -> List[str]:
        return self._name(name) + ["stop-timeout"]

    def get_name_network_mac(self, name: str, network: str, mac: str) -> List[str]:
        return self._name(name) + ["network", network, "mac", mac]

    def get_name_network_mac_delete(self, name: str, network: str) -> List[str]:
        return self._name(name) + ["network", network, "mac"]

    def get_name_tmpfs(self, name: str, tmpfs_name: str) -> List[str]:
        return self._name(name) + ["tmpfs", tmpfs_name]

    def get_name_tmpfs_destination(self, name: str, tmpfs_name: str, destination: str) -> List[str]:
        return self._name(name) + ["tmpfs", tmpfs_name, "destination", destination]

    def get_name_tmpfs_destination_delete(self, name: str, tmpfs_name: str) -> List[str]:
        return self._name(name) + ["tmpfs", tmpfs_name, "destination"]

    def get_name_tmpfs_size(self, name: str, tmpfs_name: str, size: str) -> List[str]:
        return self._name(name) + ["tmpfs", tmpfs_name, "size", size]

    def get_name_tmpfs_size_delete(self, name: str, tmpfs_name: str) -> List[str]:
        return self._name(name) + ["tmpfs", tmpfs_name, "size"]

    # ========================================================================
    # Container network
    # ========================================================================

    def get_network_gateway(self, network: str, gateway: str) -> List[str]:
        return self._network(network) + ["gateway", gateway]

    def get_network_gateways_delete(self, network: str) -> List[str]:
        return self._network(network) + ["gateway"]

    def get_network_mtu(self, network: str, mtu: str) -> List[str]:
        return self._network(network) + ["mtu", mtu]

    def get_network_mtu_delete(self, network: str) -> List[str]:
        return self._network(network) + ["mtu"]

    def get_network_type_bridge(self, network: str) -> List[str]:
        return self._network(network) + ["type", "bridge"]

    def get_network_type_macvlan(self, network: str) -> List[str]:
        return self._network(network) + ["type", "macvlan"]

    def get_network_type_macvlan_mode(self, network: str, mode: str) -> List[str]:
        return self._network(network) + ["type", "macvlan", "mode", mode]

    def get_network_type_macvlan_mode_delete(self, network: str) -> List[str]:
        return self._network(network) + ["type", "macvlan", "mode"]

    def get_network_type_macvlan_parent(self, network: str, parent: str) -> List[str]:
        return self._network(network) + ["type", "macvlan", "parent", parent]

    def get_network_type_macvlan_parent_delete(self, network: str) -> List[str]:
        return self._network(network) + ["type", "macvlan", "parent"]

    def get_network_type_delete(self, network: str) -> List[str]:
        return self._network(network) + ["type"]

    # ========================================================================
    # Container registry
    # ========================================================================

    def get_registry_insecure(self, registry: str) -> List[str]:
        return self._registry(registry) + ["insecure"]

    def get_registry_mirror(self, registry: str) -> List[str]:
        return self._registry(registry) + ["mirror"]

    def get_registry_mirror_address(self, registry: str, address: str) -> List[str]:
        return self._registry(registry) + ["mirror", "address", address]

    def get_registry_mirror_address_delete(self, registry: str) -> List[str]:
        return self._registry(registry) + ["mirror", "address"]

    def get_registry_mirror_host_name(self, registry: str, hostname: str) -> List[str]:
        return self._registry(registry) + ["mirror", "host-name", hostname]

    def get_registry_mirror_host_name_delete(self, registry: str) -> List[str]:
        return self._registry(registry) + ["mirror", "host-name"]

    def get_registry_mirror_path(self, registry: str, path: str) -> List[str]:
        return self._registry(registry) + ["mirror", "path", path]

    def get_registry_mirror_path_delete(self, registry: str) -> List[str]:
        return self._registry(registry) + ["mirror", "path"]

    def get_registry_mirror_port(self, registry: str, port: str) -> List[str]:
        return self._registry(registry) + ["mirror", "port", port]

    def get_registry_mirror_port_delete(self, registry: str) -> List[str]:
        return self._registry(registry) + ["mirror", "port"]
