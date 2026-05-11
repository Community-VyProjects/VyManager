"""Container Command Mapper.

Generates VyOS configuration path lists for the container subsystem.

Configuration lives under: container
  container name <name>   — container instances
  container network <name> — user-defined networks
  container registry <name> — image registries
"""

from typing import List
from ..base import BaseFeatureMapper

BASE = ["container"]


class ContainerMapper(BaseFeatureMapper):
    def __init__(self, version: str):
        super().__init__(version)

    # ========================================================================
    # Top-level delete
    # ========================================================================

    def get_container_root(self) -> List[str]:
        return BASE

    # ========================================================================
    # Container name paths
    # ========================================================================

    def _name(self, name: str) -> List[str]:
        return BASE + ["name", name]

    def get_name(self, name: str) -> List[str]:
        return self._name(name)

    def get_name_image(self, name: str, image: str) -> List[str]:
        return self._name(name) + ["image", image]

    def get_name_image_delete(self, name: str) -> List[str]:
        return self._name(name) + ["image"]

    def get_name_description(self, name: str, description: str) -> List[str]:
        return self._name(name) + ["description", description]

    def get_name_description_delete(self, name: str) -> List[str]:
        return self._name(name) + ["description"]

    def get_name_disable(self, name: str) -> List[str]:
        return self._name(name) + ["disable"]

    def get_name_allow_host_networks(self, name: str) -> List[str]:
        return self._name(name) + ["allow-host-networks"]

    def get_name_allow_host_pid(self, name: str) -> List[str]:
        return self._name(name) + ["allow-host-pid"]

    def get_name_privileged(self, name: str) -> List[str]:
        return self._name(name) + ["privileged"]

    def get_name_arguments(self, name: str, arguments: str) -> List[str]:
        return self._name(name) + ["arguments", arguments]

    def get_name_arguments_delete(self, name: str) -> List[str]:
        return self._name(name) + ["arguments"]

    def get_name_command(self, name: str, command: str) -> List[str]:
        return self._name(name) + ["command", command]

    def get_name_command_delete(self, name: str) -> List[str]:
        return self._name(name) + ["command"]

    def get_name_entrypoint(self, name: str, entrypoint: str) -> List[str]:
        return self._name(name) + ["entrypoint", entrypoint]

    def get_name_entrypoint_delete(self, name: str) -> List[str]:
        return self._name(name) + ["entrypoint"]

    def get_name_cpu_quota(self, name: str, quota: str) -> List[str]:
        return self._name(name) + ["cpu-quota", quota]

    def get_name_cpu_quota_delete(self, name: str) -> List[str]:
        return self._name(name) + ["cpu-quota"]

    def get_name_memory(self, name: str, memory: str) -> List[str]:
        return self._name(name) + ["memory", memory]

    def get_name_memory_delete(self, name: str) -> List[str]:
        return self._name(name) + ["memory"]

    def get_name_shared_memory(self, name: str, size: str) -> List[str]:
        return self._name(name) + ["shared-memory", size]

    def get_name_shared_memory_delete(self, name: str) -> List[str]:
        return self._name(name) + ["shared-memory"]

    def get_name_uid(self, name: str, uid: str) -> List[str]:
        return self._name(name) + ["uid", uid]

    def get_name_uid_delete(self, name: str) -> List[str]:
        return self._name(name) + ["uid"]

    def get_name_gid(self, name: str, gid: str) -> List[str]:
        return self._name(name) + ["gid", gid]

    def get_name_gid_delete(self, name: str) -> List[str]:
        return self._name(name) + ["gid"]

    def get_name_host_name(self, name: str, hostname: str) -> List[str]:
        return self._name(name) + ["host-name", hostname]

    def get_name_host_name_delete(self, name: str) -> List[str]:
        return self._name(name) + ["host-name"]

    def get_name_log_driver(self, name: str, driver: str) -> List[str]:
        return self._name(name) + ["log-driver", driver]

    def get_name_log_driver_delete(self, name: str) -> List[str]:
        return self._name(name) + ["log-driver"]

    def get_name_restart(self, name: str, policy: str) -> List[str]:
        return self._name(name) + ["restart", policy]

    def get_name_restart_delete(self, name: str) -> List[str]:
        return self._name(name) + ["restart"]

    # Capability (multi-value)
    def get_name_capability(self, name: str, capability: str) -> List[str]:
        return self._name(name) + ["capability", capability]

    def get_name_capability_delete(self, name: str, capability: str) -> List[str]:
        return self._name(name) + ["capability", capability]

    def get_name_capabilities_delete(self, name: str) -> List[str]:
        return self._name(name) + ["capability"]

    # Name server (multi-value)
    def get_name_name_server(self, name: str, address: str) -> List[str]:
        return self._name(name) + ["name-server", address]

    def get_name_name_server_delete(self, name: str, address: str) -> List[str]:
        return self._name(name) + ["name-server", address]

    def get_name_name_servers_delete(self, name: str) -> List[str]:
        return self._name(name) + ["name-server"]

    # Device
    def get_name_device(self, name: str, device: str) -> List[str]:
        return self._name(name) + ["device", device]

    def get_name_device_source(self, name: str, device: str, source: str) -> List[str]:
        return self._name(name) + ["device", device, "source", source]

    def get_name_device_source_delete(self, name: str, device: str) -> List[str]:
        return self._name(name) + ["device", device, "source"]

    def get_name_device_destination(self, name: str, device: str, destination: str) -> List[str]:
        return self._name(name) + ["device", device, "destination", destination]

    def get_name_device_destination_delete(self, name: str, device: str) -> List[str]:
        return self._name(name) + ["device", device, "destination"]

    # Environment
    def get_name_environment(self, name: str, env_name: str) -> List[str]:
        return self._name(name) + ["environment", env_name]

    def get_name_environment_value(self, name: str, env_name: str, value: str) -> List[str]:
        return self._name(name) + ["environment", env_name, "value", value]

    def get_name_environment_value_delete(self, name: str, env_name: str) -> List[str]:
        return self._name(name) + ["environment", env_name, "value"]

    def get_name_environments_delete(self, name: str) -> List[str]:
        return self._name(name) + ["environment"]

    # Health check
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

    # Label
    def get_name_label(self, name: str, label: str) -> List[str]:
        return self._name(name) + ["label", label]

    def get_name_label_value(self, name: str, label: str, value: str) -> List[str]:
        return self._name(name) + ["label", label, "value", value]

    def get_name_label_value_delete(self, name: str, label: str) -> List[str]:
        return self._name(name) + ["label", label, "value"]

    def get_name_labels_delete(self, name: str) -> List[str]:
        return self._name(name) + ["label"]

    # Network attachment
    def get_name_network(self, name: str, network: str) -> List[str]:
        return self._name(name) + ["network", network]

    def get_name_network_address(self, name: str, network: str, address: str) -> List[str]:
        return self._name(name) + ["network", network, "address", address]

    def get_name_network_address_delete(self, name: str, network: str, address: str) -> List[str]:
        return self._name(name) + ["network", network, "address", address]

    def get_name_network_addresses_delete(self, name: str, network: str) -> List[str]:
        return self._name(name) + ["network", network, "address"]

    def get_name_network_mac(self, name: str, network: str, mac: str) -> List[str]:
        return self._name(name) + ["network", network, "mac", mac]

    def get_name_network_mac_delete(self, name: str, network: str) -> List[str]:
        return self._name(name) + ["network", network, "mac"]

    # Port
    def get_name_port(self, name: str, port_name: str) -> List[str]:
        return self._name(name) + ["port", port_name]

    def get_name_port_source(self, name: str, port_name: str, source: str) -> List[str]:
        return self._name(name) + ["port", port_name, "source", source]

    def get_name_port_source_delete(self, name: str, port_name: str) -> List[str]:
        return self._name(name) + ["port", port_name, "source"]

    def get_name_port_destination(self, name: str, port_name: str, destination: str) -> List[str]:
        return self._name(name) + ["port", port_name, "destination", destination]

    def get_name_port_destination_delete(self, name: str, port_name: str) -> List[str]:
        return self._name(name) + ["port", port_name, "destination"]

    def get_name_port_protocol(self, name: str, port_name: str, protocol: str) -> List[str]:
        return self._name(name) + ["port", port_name, "protocol", protocol]

    def get_name_port_protocol_delete(self, name: str, port_name: str) -> List[str]:
        return self._name(name) + ["port", port_name, "protocol"]

    def get_name_port_listen_address(self, name: str, port_name: str, address: str) -> List[str]:
        return self._name(name) + ["port", port_name, "listen-address", address]

    def get_name_port_listen_address_delete(self, name: str, port_name: str, address: str) -> List[str]:
        return self._name(name) + ["port", port_name, "listen-address", address]

    def get_name_port_listen_addresses_delete(self, name: str, port_name: str) -> List[str]:
        return self._name(name) + ["port", port_name, "listen-address"]

    # Sysctl
    def get_name_sysctl_parameter(self, name: str, param: str) -> List[str]:
        return self._name(name) + ["sysctl", "parameter", param]

    def get_name_sysctl_parameter_value(self, name: str, param: str, value: str) -> List[str]:
        return self._name(name) + ["sysctl", "parameter", param, "value", value]

    def get_name_sysctl_parameter_value_delete(self, name: str, param: str) -> List[str]:
        return self._name(name) + ["sysctl", "parameter", param, "value"]

    def get_name_sysctl_delete(self, name: str) -> List[str]:
        return self._name(name) + ["sysctl"]

    # Tmpfs
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

    # Volume
    def get_name_volume(self, name: str, volume_name: str) -> List[str]:
        return self._name(name) + ["volume", volume_name]

    def get_name_volume_source(self, name: str, volume_name: str, source: str) -> List[str]:
        return self._name(name) + ["volume", volume_name, "source", source]

    def get_name_volume_source_delete(self, name: str, volume_name: str) -> List[str]:
        return self._name(name) + ["volume", volume_name, "source"]

    def get_name_volume_destination(self, name: str, volume_name: str, destination: str) -> List[str]:
        return self._name(name) + ["volume", volume_name, "destination", destination]

    def get_name_volume_destination_delete(self, name: str, volume_name: str) -> List[str]:
        return self._name(name) + ["volume", volume_name, "destination"]

    def get_name_volume_mode(self, name: str, volume_name: str, mode: str) -> List[str]:
        return self._name(name) + ["volume", volume_name, "mode", mode]

    def get_name_volume_mode_delete(self, name: str, volume_name: str) -> List[str]:
        return self._name(name) + ["volume", volume_name, "mode"]

    def get_name_volume_propagation(self, name: str, volume_name: str, propagation: str) -> List[str]:
        return self._name(name) + ["volume", volume_name, "propagation", propagation]

    def get_name_volume_propagation_delete(self, name: str, volume_name: str) -> List[str]:
        return self._name(name) + ["volume", volume_name, "propagation"]

    # ========================================================================
    # Container network paths
    # ========================================================================

    def _network(self, network: str) -> List[str]:
        return BASE + ["network", network]

    def get_network(self, network: str) -> List[str]:
        return self._network(network)

    def get_network_description(self, network: str, description: str) -> List[str]:
        return self._network(network) + ["description", description]

    def get_network_description_delete(self, network: str) -> List[str]:
        return self._network(network) + ["description"]

    def get_network_gateway(self, network: str, gateway: str) -> List[str]:
        return self._network(network) + ["gateway", gateway]

    def get_network_gateway_delete(self, network: str, gateway: str) -> List[str]:
        return self._network(network) + ["gateway", gateway]

    def get_network_gateways_delete(self, network: str) -> List[str]:
        return self._network(network) + ["gateway"]

    def get_network_mtu(self, network: str, mtu: str) -> List[str]:
        return self._network(network) + ["mtu", mtu]

    def get_network_mtu_delete(self, network: str) -> List[str]:
        return self._network(network) + ["mtu"]

    def get_network_no_name_server(self, network: str) -> List[str]:
        return self._network(network) + ["no-name-server"]

    def get_network_prefix(self, network: str, prefix: str) -> List[str]:
        return self._network(network) + ["prefix", prefix]

    def get_network_prefix_delete(self, network: str, prefix: str) -> List[str]:
        return self._network(network) + ["prefix", prefix]

    def get_network_prefixes_delete(self, network: str) -> List[str]:
        return self._network(network) + ["prefix"]

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

    def get_network_vrf(self, network: str, vrf: str) -> List[str]:
        return self._network(network) + ["vrf", vrf]

    def get_network_vrf_delete(self, network: str) -> List[str]:
        return self._network(network) + ["vrf"]

    # ========================================================================
    # Container registry paths
    # ========================================================================

    def _registry(self, registry: str) -> List[str]:
        return BASE + ["registry", registry]

    def get_registry(self, registry: str) -> List[str]:
        return self._registry(registry)

    def get_registry_disable(self, registry: str) -> List[str]:
        return self._registry(registry) + ["disable"]

    def get_registry_insecure(self, registry: str) -> List[str]:
        return self._registry(registry) + ["insecure"]

    def get_registry_auth_username(self, registry: str, username: str) -> List[str]:
        return self._registry(registry) + ["authentication", "username", username]

    def get_registry_auth_username_delete(self, registry: str) -> List[str]:
        return self._registry(registry) + ["authentication", "username"]

    def get_registry_auth_password(self, registry: str, password: str) -> List[str]:
        return self._registry(registry) + ["authentication", "password", password]

    def get_registry_auth_password_delete(self, registry: str) -> List[str]:
        return self._registry(registry) + ["authentication", "password"]

    def get_registry_auth_delete(self, registry: str) -> List[str]:
        return self._registry(registry) + ["authentication"]

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
