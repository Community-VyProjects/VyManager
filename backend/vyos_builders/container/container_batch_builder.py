"""Container Batch Builder.

Generates VyOS set/delete operations for the container subsystem.

Configuration lives under: container
  container name <name>    — container instances
  container network <name> — user-defined networks
  container registry <name> — image registries

The template structure is identical between VyOS 1.4 and 1.5.
Multi-argument batch operations encode compound values as "arg1,arg2"
(comma-separated), matching the project's standard batch dispatch pattern.
"""

from typing import List, Dict, Any
from vyos_mappers import CommandMapperRegistry


class ContainerBatchBuilder:
    def __init__(self, version: str):
        self.version = version
        self._operations: List[Dict[str, Any]] = []
        self.mappers = CommandMapperRegistry.get_all_mappers(version)
        self.m = self.mappers["container"]

    # -----------------------------------------------------------------------
    # Core helpers
    # -----------------------------------------------------------------------

    def add_set(self, path: List[str]) -> "ContainerBatchBuilder":
        if path:
            self._operations.append({"op": "set", "path": path})
        return self

    def add_delete(self, path: List[str]) -> "ContainerBatchBuilder":
        if path:
            self._operations.append({"op": "delete", "path": path})
        return self

    def get_operations(self) -> List[Dict[str, Any]]:
        return self._operations.copy()

    def is_empty(self) -> bool:
        return len(self._operations) == 0

    # -----------------------------------------------------------------------
    # Capabilities
    # -----------------------------------------------------------------------

    def get_capabilities(self) -> Dict[str, Any]:
        is_1_4 = "1.4" in self.version
        is_1_5 = not is_1_4

        return {
            "version": self.version,
            "version_info": {
                "is_1_4": is_1_4,
                "is_1_5": is_1_5,
            },
            "features": {
                "container_names": {
                    "supported": True,
                    "description": "Named container instances",
                },
                "container_networks": {
                    "supported": True,
                    "description": "User-defined container networks",
                },
                "container_registries": {
                    "supported": True,
                    "description": "Container image registries",
                },
                "allow_host_networks": {
                    "supported": True,
                    "description": "Share host networking with container",
                },
                "allow_host_pid": {
                    "supported": True,
                    "description": "Share host process namespace with container",
                },
                "privileged": {
                    "supported": True,
                    "description": "Grant root capabilities to container",
                },
                "capabilities": {
                    "supported": True,
                    "description": "Grant individual Linux capabilities",
                    "values": [
                        "net-admin",
                        "net-bind-service",
                        "net-raw",
                        "mknod",
                        "setpcap",
                        "sys-admin",
                        "sys-module",
                        "sys-nice",
                        "sys-time",
                    ],
                },
                "health_check": {
                    "supported": is_1_5,
                    "description": "Container health check configuration",
                },
                "log_driver": {
                    "supported": is_1_5,
                    "description": "Container log driver",
                    "values": ["k8s-file", "journald", "none"],
                },
                "restart_policy": {
                    "supported": True,
                    "description": "Container restart policy",
                    "values": ["no", "on-failure", "always"],
                },
                "volume_propagation": {
                    "supported": True,
                    "description": "Volume bind propagation modes",
                    "values": [
                        "shared",
                        "slave",
                        "private",
                        "rshared",
                        "rslave",
                        "rprivate",
                    ],
                },
                "network_attachment_mac": {
                    "supported": is_1_5,
                    "description": "MAC address assignment on container network attachment",
                },
                "network_gateway": {
                    "supported": is_1_5,
                    "description": "Gateway address on container network",
                },
                "network_mtu": {
                    "supported": is_1_5,
                    "description": "MTU on container network",
                },
                "network_type_bridge": {
                    "supported": is_1_5,
                    "description": "Bridge network type",
                },
                "network_type_macvlan": {
                    "supported": is_1_5,
                    "description": "MACVLAN network type",
                    "macvlan_modes": ["bridge", "private", "vepa"],
                },
                "registry_insecure": {
                    "supported": is_1_5,
                    "description": "Allow insecure (HTTP) registry connections",
                },
                "registry_mirror": {
                    "supported": is_1_5,
                    "description": "Registry mirror support",
                },
                "sysctl": {
                    "supported": True,
                    "description": "Namespaced kernel parameter configuration",
                },
                "tmpfs": {
                    "supported": is_1_5,
                    "description": "Tmpfs filesystem mounts",
                },
            },
        }

    # -----------------------------------------------------------------------
    # Container name: CRUD
    # -----------------------------------------------------------------------

    def set_name(self, name: str) -> "ContainerBatchBuilder":
        """Create or touch a container instance node."""
        return self.add_set(self.m.get_name(name))

    def delete_name(self, name: str) -> "ContainerBatchBuilder":
        """Delete an entire container instance."""
        return self.add_delete(self.m.get_name(name))

    def delete_container_root(self) -> "ContainerBatchBuilder":
        """Delete the entire container configuration."""
        return self.add_delete(self.m.get_container_root())

    # -----------------------------------------------------------------------
    # Container name: basic properties
    # -----------------------------------------------------------------------

    def set_name_image(self, name: str, image: str) -> "ContainerBatchBuilder":
        return self.add_set(self.m.get_name_image(name, image))

    def delete_name_image(self, name: str) -> "ContainerBatchBuilder":
        return self.add_delete(self.m.get_name_image_delete(name))

    def set_name_description(self, name: str, description: str) -> "ContainerBatchBuilder":
        return self.add_set(self.m.get_name_description(name, description))

    def delete_name_description(self, name: str) -> "ContainerBatchBuilder":
        return self.add_delete(self.m.get_name_description_delete(name))

    def set_name_disable(self, name: str) -> "ContainerBatchBuilder":
        return self.add_set(self.m.get_name_disable(name))

    def delete_name_disable(self, name: str) -> "ContainerBatchBuilder":
        return self.add_delete(self.m.get_name_disable(name))

    def set_name_allow_host_networks(self, name: str) -> "ContainerBatchBuilder":
        return self.add_set(self.m.get_name_allow_host_networks(name))

    def delete_name_allow_host_networks(self, name: str) -> "ContainerBatchBuilder":
        return self.add_delete(self.m.get_name_allow_host_networks(name))

    def set_name_allow_host_pid(self, name: str) -> "ContainerBatchBuilder":
        return self.add_set(self.m.get_name_allow_host_pid(name))

    def delete_name_allow_host_pid(self, name: str) -> "ContainerBatchBuilder":
        return self.add_delete(self.m.get_name_allow_host_pid(name))

    def set_name_privileged(self, name: str) -> "ContainerBatchBuilder":
        return self.add_set(self.m.get_name_privileged(name))

    def delete_name_privileged(self, name: str) -> "ContainerBatchBuilder":
        return self.add_delete(self.m.get_name_privileged(name))

    def set_name_arguments(self, name: str, arguments: str) -> "ContainerBatchBuilder":
        return self.add_set(self.m.get_name_arguments(name, arguments))

    def delete_name_arguments(self, name: str) -> "ContainerBatchBuilder":
        return self.add_delete(self.m.get_name_arguments_delete(name))

    def set_name_command(self, name: str, command: str) -> "ContainerBatchBuilder":
        return self.add_set(self.m.get_name_command(name, command))

    def delete_name_command(self, name: str) -> "ContainerBatchBuilder":
        return self.add_delete(self.m.get_name_command_delete(name))

    def set_name_entrypoint(self, name: str, entrypoint: str) -> "ContainerBatchBuilder":
        return self.add_set(self.m.get_name_entrypoint(name, entrypoint))

    def delete_name_entrypoint(self, name: str) -> "ContainerBatchBuilder":
        return self.add_delete(self.m.get_name_entrypoint_delete(name))

    def set_name_cpu_quota(self, name: str, quota: str) -> "ContainerBatchBuilder":
        return self.add_set(self.m.get_name_cpu_quota(name, quota))

    def delete_name_cpu_quota(self, name: str) -> "ContainerBatchBuilder":
        return self.add_delete(self.m.get_name_cpu_quota_delete(name))

    def set_name_memory(self, name: str, memory: str) -> "ContainerBatchBuilder":
        return self.add_set(self.m.get_name_memory(name, memory))

    def delete_name_memory(self, name: str) -> "ContainerBatchBuilder":
        return self.add_delete(self.m.get_name_memory_delete(name))

    def set_name_shared_memory(self, name: str, size: str) -> "ContainerBatchBuilder":
        return self.add_set(self.m.get_name_shared_memory(name, size))

    def delete_name_shared_memory(self, name: str) -> "ContainerBatchBuilder":
        return self.add_delete(self.m.get_name_shared_memory_delete(name))

    def set_name_uid(self, name: str, uid: str) -> "ContainerBatchBuilder":
        return self.add_set(self.m.get_name_uid(name, uid))

    def delete_name_uid(self, name: str) -> "ContainerBatchBuilder":
        return self.add_delete(self.m.get_name_uid_delete(name))

    def set_name_gid(self, name: str, gid: str) -> "ContainerBatchBuilder":
        return self.add_set(self.m.get_name_gid(name, gid))

    def delete_name_gid(self, name: str) -> "ContainerBatchBuilder":
        return self.add_delete(self.m.get_name_gid_delete(name))

    def set_name_host_name(self, name: str, hostname: str) -> "ContainerBatchBuilder":
        return self.add_set(self.m.get_name_host_name(name, hostname))

    def delete_name_host_name(self, name: str) -> "ContainerBatchBuilder":
        return self.add_delete(self.m.get_name_host_name_delete(name))

    def set_name_log_driver(self, name: str, driver: str) -> "ContainerBatchBuilder":
        return self.add_set(self.m.get_name_log_driver(name, driver))

    def delete_name_log_driver(self, name: str) -> "ContainerBatchBuilder":
        return self.add_delete(self.m.get_name_log_driver_delete(name))

    def set_name_restart(self, name: str, policy: str) -> "ContainerBatchBuilder":
        return self.add_set(self.m.get_name_restart(name, policy))

    def delete_name_restart(self, name: str) -> "ContainerBatchBuilder":
        return self.add_delete(self.m.get_name_restart_delete(name))

    # -----------------------------------------------------------------------
    # Container name: capability
    # -----------------------------------------------------------------------

    def set_name_capability(self, name: str, capability: str) -> "ContainerBatchBuilder":
        return self.add_set(self.m.get_name_capability(name, capability))

    def delete_name_capability(self, name: str, capability: str) -> "ContainerBatchBuilder":
        return self.add_delete(self.m.get_name_capability_delete(name, capability))

    def delete_name_capabilities(self, name: str) -> "ContainerBatchBuilder":
        return self.add_delete(self.m.get_name_capabilities_delete(name))

    # -----------------------------------------------------------------------
    # Container name: name-server
    # -----------------------------------------------------------------------

    def set_name_name_server(self, name: str, address: str) -> "ContainerBatchBuilder":
        return self.add_set(self.m.get_name_name_server(name, address))

    def delete_name_name_server(self, name: str, address: str) -> "ContainerBatchBuilder":
        return self.add_delete(self.m.get_name_name_server_delete(name, address))

    def delete_name_name_servers(self, name: str) -> "ContainerBatchBuilder":
        return self.add_delete(self.m.get_name_name_servers_delete(name))

    # -----------------------------------------------------------------------
    # Container name: device
    # -----------------------------------------------------------------------

    def set_name_device(self, name: str, device: str) -> "ContainerBatchBuilder":
        return self.add_set(self.m.get_name_device(name, device))

    def delete_name_device(self, name: str, device: str) -> "ContainerBatchBuilder":
        return self.add_delete(self.m.get_name_device(name, device))

    def set_name_device_source(self, name: str, device: str, source: str) -> "ContainerBatchBuilder":
        return self.add_set(self.m.get_name_device_source(name, device, source))

    def delete_name_device_source(self, name: str, device: str) -> "ContainerBatchBuilder":
        return self.add_delete(self.m.get_name_device_source_delete(name, device))

    def set_name_device_destination(self, name: str, device: str, destination: str) -> "ContainerBatchBuilder":
        return self.add_set(self.m.get_name_device_destination(name, device, destination))

    def delete_name_device_destination(self, name: str, device: str) -> "ContainerBatchBuilder":
        return self.add_delete(self.m.get_name_device_destination_delete(name, device))

    # -----------------------------------------------------------------------
    # Container name: environment
    # -----------------------------------------------------------------------

    def set_name_environment(self, name: str, env_name: str) -> "ContainerBatchBuilder":
        return self.add_set(self.m.get_name_environment(name, env_name))

    def delete_name_environment(self, name: str, env_name: str) -> "ContainerBatchBuilder":
        return self.add_delete(self.m.get_name_environment(name, env_name))

    def set_name_environment_value(self, name: str, env_name: str, value: str) -> "ContainerBatchBuilder":
        return self.add_set(self.m.get_name_environment_value(name, env_name, value))

    def delete_name_environment_value(self, name: str, env_name: str) -> "ContainerBatchBuilder":
        return self.add_delete(self.m.get_name_environment_value_delete(name, env_name))

    def delete_name_environments(self, name: str) -> "ContainerBatchBuilder":
        return self.add_delete(self.m.get_name_environments_delete(name))

    # -----------------------------------------------------------------------
    # Container name: health check
    # -----------------------------------------------------------------------

    def set_name_health_check(self, name: str) -> "ContainerBatchBuilder":
        return self.add_set(self.m.get_name_health_check(name))

    def delete_name_health_check(self, name: str) -> "ContainerBatchBuilder":
        return self.add_delete(self.m.get_name_health_check(name))

    def set_name_health_check_command(self, name: str, command: str) -> "ContainerBatchBuilder":
        return self.add_set(self.m.get_name_health_check_command(name, command))

    def delete_name_health_check_command(self, name: str) -> "ContainerBatchBuilder":
        return self.add_delete(self.m.get_name_health_check_command_delete(name))

    def set_name_health_check_interval(self, name: str, interval: str) -> "ContainerBatchBuilder":
        return self.add_set(self.m.get_name_health_check_interval(name, interval))

    def delete_name_health_check_interval(self, name: str) -> "ContainerBatchBuilder":
        return self.add_delete(self.m.get_name_health_check_interval_delete(name))

    def set_name_health_check_retry(self, name: str, retry: str) -> "ContainerBatchBuilder":
        return self.add_set(self.m.get_name_health_check_retry(name, retry))

    def delete_name_health_check_retry(self, name: str) -> "ContainerBatchBuilder":
        return self.add_delete(self.m.get_name_health_check_retry_delete(name))

    def set_name_health_check_timeout(self, name: str, timeout: str) -> "ContainerBatchBuilder":
        return self.add_set(self.m.get_name_health_check_timeout(name, timeout))

    def delete_name_health_check_timeout(self, name: str) -> "ContainerBatchBuilder":
        return self.add_delete(self.m.get_name_health_check_timeout_delete(name))

    # -----------------------------------------------------------------------
    # Container name: label
    # -----------------------------------------------------------------------

    def set_name_label(self, name: str, label: str) -> "ContainerBatchBuilder":
        return self.add_set(self.m.get_name_label(name, label))

    def delete_name_label(self, name: str, label: str) -> "ContainerBatchBuilder":
        return self.add_delete(self.m.get_name_label(name, label))

    def set_name_label_value(self, name: str, label: str, value: str) -> "ContainerBatchBuilder":
        return self.add_set(self.m.get_name_label_value(name, label, value))

    def delete_name_label_value(self, name: str, label: str) -> "ContainerBatchBuilder":
        return self.add_delete(self.m.get_name_label_value_delete(name, label))

    def delete_name_labels(self, name: str) -> "ContainerBatchBuilder":
        return self.add_delete(self.m.get_name_labels_delete(name))

    # -----------------------------------------------------------------------
    # Container name: network attachment
    # -----------------------------------------------------------------------

    def set_name_network(self, name: str, network: str) -> "ContainerBatchBuilder":
        return self.add_set(self.m.get_name_network(name, network))

    def delete_name_network(self, name: str, network: str) -> "ContainerBatchBuilder":
        return self.add_delete(self.m.get_name_network(name, network))

    def set_name_network_address(self, name: str, network: str, address: str) -> "ContainerBatchBuilder":
        return self.add_set(self.m.get_name_network_address(name, network, address))

    def delete_name_network_address(self, name: str, network: str, address: str) -> "ContainerBatchBuilder":
        return self.add_delete(self.m.get_name_network_address_delete(name, network, address))

    def delete_name_network_addresses(self, name: str, network: str) -> "ContainerBatchBuilder":
        return self.add_delete(self.m.get_name_network_addresses_delete(name, network))

    def set_name_network_mac(self, name: str, network: str, mac: str) -> "ContainerBatchBuilder":
        return self.add_set(self.m.get_name_network_mac(name, network, mac))

    def delete_name_network_mac(self, name: str, network: str) -> "ContainerBatchBuilder":
        return self.add_delete(self.m.get_name_network_mac_delete(name, network))

    # -----------------------------------------------------------------------
    # Container name: port
    # -----------------------------------------------------------------------

    def set_name_port(self, name: str, port_name: str) -> "ContainerBatchBuilder":
        return self.add_set(self.m.get_name_port(name, port_name))

    def delete_name_port(self, name: str, port_name: str) -> "ContainerBatchBuilder":
        return self.add_delete(self.m.get_name_port(name, port_name))

    def set_name_port_source(self, name: str, port_name: str, source: str) -> "ContainerBatchBuilder":
        return self.add_set(self.m.get_name_port_source(name, port_name, source))

    def delete_name_port_source(self, name: str, port_name: str) -> "ContainerBatchBuilder":
        return self.add_delete(self.m.get_name_port_source_delete(name, port_name))

    def set_name_port_destination(self, name: str, port_name: str, destination: str) -> "ContainerBatchBuilder":
        return self.add_set(self.m.get_name_port_destination(name, port_name, destination))

    def delete_name_port_destination(self, name: str, port_name: str) -> "ContainerBatchBuilder":
        return self.add_delete(self.m.get_name_port_destination_delete(name, port_name))

    def set_name_port_protocol(self, name: str, port_name: str, protocol: str) -> "ContainerBatchBuilder":
        return self.add_set(self.m.get_name_port_protocol(name, port_name, protocol))

    def delete_name_port_protocol(self, name: str, port_name: str) -> "ContainerBatchBuilder":
        return self.add_delete(self.m.get_name_port_protocol_delete(name, port_name))

    def set_name_port_listen_address(self, name: str, port_name: str, address: str) -> "ContainerBatchBuilder":
        return self.add_set(self.m.get_name_port_listen_address(name, port_name, address))

    def delete_name_port_listen_address(self, name: str, port_name: str, address: str) -> "ContainerBatchBuilder":
        return self.add_delete(self.m.get_name_port_listen_address_delete(name, port_name, address))

    def delete_name_port_listen_addresses(self, name: str, port_name: str) -> "ContainerBatchBuilder":
        return self.add_delete(self.m.get_name_port_listen_addresses_delete(name, port_name))

    # -----------------------------------------------------------------------
    # Container name: sysctl
    # -----------------------------------------------------------------------

    def set_name_sysctl_parameter(self, name: str, param: str) -> "ContainerBatchBuilder":
        return self.add_set(self.m.get_name_sysctl_parameter(name, param))

    def delete_name_sysctl_parameter(self, name: str, param: str) -> "ContainerBatchBuilder":
        return self.add_delete(self.m.get_name_sysctl_parameter(name, param))

    def set_name_sysctl_parameter_value(self, name: str, param: str, value: str) -> "ContainerBatchBuilder":
        return self.add_set(self.m.get_name_sysctl_parameter_value(name, param, value))

    def delete_name_sysctl_parameter_value(self, name: str, param: str) -> "ContainerBatchBuilder":
        return self.add_delete(self.m.get_name_sysctl_parameter_value_delete(name, param))

    def delete_name_sysctl(self, name: str) -> "ContainerBatchBuilder":
        return self.add_delete(self.m.get_name_sysctl_delete(name))

    # -----------------------------------------------------------------------
    # Container name: tmpfs
    # -----------------------------------------------------------------------

    def set_name_tmpfs(self, name: str, tmpfs_name: str) -> "ContainerBatchBuilder":
        return self.add_set(self.m.get_name_tmpfs(name, tmpfs_name))

    def delete_name_tmpfs(self, name: str, tmpfs_name: str) -> "ContainerBatchBuilder":
        return self.add_delete(self.m.get_name_tmpfs(name, tmpfs_name))

    def set_name_tmpfs_destination(self, name: str, tmpfs_name: str, destination: str) -> "ContainerBatchBuilder":
        return self.add_set(self.m.get_name_tmpfs_destination(name, tmpfs_name, destination))

    def delete_name_tmpfs_destination(self, name: str, tmpfs_name: str) -> "ContainerBatchBuilder":
        return self.add_delete(self.m.get_name_tmpfs_destination_delete(name, tmpfs_name))

    def set_name_tmpfs_size(self, name: str, tmpfs_name: str, size: str) -> "ContainerBatchBuilder":
        return self.add_set(self.m.get_name_tmpfs_size(name, tmpfs_name, size))

    def delete_name_tmpfs_size(self, name: str, tmpfs_name: str) -> "ContainerBatchBuilder":
        return self.add_delete(self.m.get_name_tmpfs_size_delete(name, tmpfs_name))

    # -----------------------------------------------------------------------
    # Container name: volume
    # -----------------------------------------------------------------------

    def set_name_volume(self, name: str, volume_name: str) -> "ContainerBatchBuilder":
        return self.add_set(self.m.get_name_volume(name, volume_name))

    def delete_name_volume(self, name: str, volume_name: str) -> "ContainerBatchBuilder":
        return self.add_delete(self.m.get_name_volume(name, volume_name))

    def set_name_volume_source(self, name: str, volume_name: str, source: str) -> "ContainerBatchBuilder":
        return self.add_set(self.m.get_name_volume_source(name, volume_name, source))

    def delete_name_volume_source(self, name: str, volume_name: str) -> "ContainerBatchBuilder":
        return self.add_delete(self.m.get_name_volume_source_delete(name, volume_name))

    def set_name_volume_destination(self, name: str, volume_name: str, destination: str) -> "ContainerBatchBuilder":
        return self.add_set(self.m.get_name_volume_destination(name, volume_name, destination))

    def delete_name_volume_destination(self, name: str, volume_name: str) -> "ContainerBatchBuilder":
        return self.add_delete(self.m.get_name_volume_destination_delete(name, volume_name))

    def set_name_volume_mode(self, name: str, volume_name: str, mode: str) -> "ContainerBatchBuilder":
        return self.add_set(self.m.get_name_volume_mode(name, volume_name, mode))

    def delete_name_volume_mode(self, name: str, volume_name: str) -> "ContainerBatchBuilder":
        return self.add_delete(self.m.get_name_volume_mode_delete(name, volume_name))

    def set_name_volume_propagation(self, name: str, volume_name: str, propagation: str) -> "ContainerBatchBuilder":
        return self.add_set(self.m.get_name_volume_propagation(name, volume_name, propagation))

    def delete_name_volume_propagation(self, name: str, volume_name: str) -> "ContainerBatchBuilder":
        return self.add_delete(self.m.get_name_volume_propagation_delete(name, volume_name))

    # -----------------------------------------------------------------------
    # Container network: CRUD
    # -----------------------------------------------------------------------

    def set_network(self, network: str) -> "ContainerBatchBuilder":
        return self.add_set(self.m.get_network(network))

    def delete_network(self, network: str) -> "ContainerBatchBuilder":
        return self.add_delete(self.m.get_network(network))

    def set_network_description(self, network: str, description: str) -> "ContainerBatchBuilder":
        return self.add_set(self.m.get_network_description(network, description))

    def delete_network_description(self, network: str) -> "ContainerBatchBuilder":
        return self.add_delete(self.m.get_network_description_delete(network))

    def set_network_gateway(self, network: str, gateway: str) -> "ContainerBatchBuilder":
        return self.add_set(self.m.get_network_gateway(network, gateway))

    def delete_network_gateway(self, network: str, gateway: str) -> "ContainerBatchBuilder":
        return self.add_delete(self.m.get_network_gateway_delete(network, gateway))

    def delete_network_gateways(self, network: str) -> "ContainerBatchBuilder":
        return self.add_delete(self.m.get_network_gateways_delete(network))

    def set_network_mtu(self, network: str, mtu: str) -> "ContainerBatchBuilder":
        return self.add_set(self.m.get_network_mtu(network, mtu))

    def delete_network_mtu(self, network: str) -> "ContainerBatchBuilder":
        return self.add_delete(self.m.get_network_mtu_delete(network))

    def set_network_no_name_server(self, network: str) -> "ContainerBatchBuilder":
        return self.add_set(self.m.get_network_no_name_server(network))

    def delete_network_no_name_server(self, network: str) -> "ContainerBatchBuilder":
        return self.add_delete(self.m.get_network_no_name_server(network))

    def set_network_prefix(self, network: str, prefix: str) -> "ContainerBatchBuilder":
        return self.add_set(self.m.get_network_prefix(network, prefix))

    def delete_network_prefix(self, network: str, prefix: str) -> "ContainerBatchBuilder":
        return self.add_delete(self.m.get_network_prefix_delete(network, prefix))

    def delete_network_prefixes(self, network: str) -> "ContainerBatchBuilder":
        return self.add_delete(self.m.get_network_prefixes_delete(network))

    def set_network_type_bridge(self, network: str) -> "ContainerBatchBuilder":
        return self.add_set(self.m.get_network_type_bridge(network))

    def set_network_type_macvlan(self, network: str) -> "ContainerBatchBuilder":
        return self.add_set(self.m.get_network_type_macvlan(network))

    def set_network_type_macvlan_mode(self, network: str, mode: str) -> "ContainerBatchBuilder":
        return self.add_set(self.m.get_network_type_macvlan_mode(network, mode))

    def delete_network_type_macvlan_mode(self, network: str) -> "ContainerBatchBuilder":
        return self.add_delete(self.m.get_network_type_macvlan_mode_delete(network))

    def set_network_type_macvlan_parent(self, network: str, parent: str) -> "ContainerBatchBuilder":
        return self.add_set(self.m.get_network_type_macvlan_parent(network, parent))

    def delete_network_type_macvlan_parent(self, network: str) -> "ContainerBatchBuilder":
        return self.add_delete(self.m.get_network_type_macvlan_parent_delete(network))

    def delete_network_type(self, network: str) -> "ContainerBatchBuilder":
        return self.add_delete(self.m.get_network_type_delete(network))

    def set_network_vrf(self, network: str, vrf: str) -> "ContainerBatchBuilder":
        return self.add_set(self.m.get_network_vrf(network, vrf))

    def delete_network_vrf(self, network: str) -> "ContainerBatchBuilder":
        return self.add_delete(self.m.get_network_vrf_delete(network))

    # -----------------------------------------------------------------------
    # Container registry: CRUD
    # -----------------------------------------------------------------------

    def set_registry(self, registry: str) -> "ContainerBatchBuilder":
        return self.add_set(self.m.get_registry(registry))

    def delete_registry(self, registry: str) -> "ContainerBatchBuilder":
        return self.add_delete(self.m.get_registry(registry))

    def set_registry_disable(self, registry: str) -> "ContainerBatchBuilder":
        return self.add_set(self.m.get_registry_disable(registry))

    def delete_registry_disable(self, registry: str) -> "ContainerBatchBuilder":
        return self.add_delete(self.m.get_registry_disable(registry))

    def set_registry_insecure(self, registry: str) -> "ContainerBatchBuilder":
        return self.add_set(self.m.get_registry_insecure(registry))

    def delete_registry_insecure(self, registry: str) -> "ContainerBatchBuilder":
        return self.add_delete(self.m.get_registry_insecure(registry))

    def set_registry_auth_username(self, registry: str, username: str) -> "ContainerBatchBuilder":
        return self.add_set(self.m.get_registry_auth_username(registry, username))

    def delete_registry_auth_username(self, registry: str) -> "ContainerBatchBuilder":
        return self.add_delete(self.m.get_registry_auth_username_delete(registry))

    def set_registry_auth_password(self, registry: str, password: str) -> "ContainerBatchBuilder":
        return self.add_set(self.m.get_registry_auth_password(registry, password))

    def delete_registry_auth_password(self, registry: str) -> "ContainerBatchBuilder":
        return self.add_delete(self.m.get_registry_auth_password_delete(registry))

    def delete_registry_auth(self, registry: str) -> "ContainerBatchBuilder":
        return self.add_delete(self.m.get_registry_auth_delete(registry))

    def set_registry_mirror(self, registry: str) -> "ContainerBatchBuilder":
        return self.add_set(self.m.get_registry_mirror(registry))

    def delete_registry_mirror(self, registry: str) -> "ContainerBatchBuilder":
        return self.add_delete(self.m.get_registry_mirror(registry))

    def set_registry_mirror_address(self, registry: str, address: str) -> "ContainerBatchBuilder":
        return self.add_set(self.m.get_registry_mirror_address(registry, address))

    def delete_registry_mirror_address(self, registry: str) -> "ContainerBatchBuilder":
        return self.add_delete(self.m.get_registry_mirror_address_delete(registry))

    def set_registry_mirror_host_name(self, registry: str, hostname: str) -> "ContainerBatchBuilder":
        return self.add_set(self.m.get_registry_mirror_host_name(registry, hostname))

    def delete_registry_mirror_host_name(self, registry: str) -> "ContainerBatchBuilder":
        return self.add_delete(self.m.get_registry_mirror_host_name_delete(registry))

    def set_registry_mirror_path(self, registry: str, path: str) -> "ContainerBatchBuilder":
        return self.add_set(self.m.get_registry_mirror_path(registry, path))

    def delete_registry_mirror_path(self, registry: str) -> "ContainerBatchBuilder":
        return self.add_delete(self.m.get_registry_mirror_path_delete(registry))

    def set_registry_mirror_port(self, registry: str, port: str) -> "ContainerBatchBuilder":
        return self.add_set(self.m.get_registry_mirror_port(registry, port))

    def delete_registry_mirror_port(self, registry: str) -> "ContainerBatchBuilder":
        return self.add_delete(self.m.get_registry_mirror_port_delete(registry))
