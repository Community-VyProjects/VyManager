"""Container Command Mapper.

Shared ``container`` commands for VyOS 1.4 and 1.5:

  container name <name>     — container instances
  container network <name>  — user-defined networks
  container registry <name> — image registries

The 1.5-only leaves (allow-host-cgroups, health-check, log-driver,
stop-timeout, tmpfs, network <net> mac, network gateway/mtu/type, registry
insecure/mirror) live on the 1.5 subclass in ``container_versions``. The
op-mode show paths and the GraphQL mutation documents the router sends are
here too.
"""

from typing import Any, Dict, FrozenSet, List, NamedTuple

from ..base import BaseFeatureMapper

BASE = ["container"]


class GraphQLMutation(NamedTuple):
    """One GraphQL mutation: the result field and the document.

    The document takes ``$key`` and ``$name`` as variables, so neither the API
    key nor the client value is ever written into the query text.
    """

    field: str
    document: str


def _mutation(field: str) -> GraphQLMutation:
    return GraphQLMutation(
        field,
        "mutation ($key: String!, $name: String!) { "
        f"{field}(data: {{key: $key, name: $name}}) "
        "{ success errors data { result } } }",
    )


class ContainerMapper(BaseFeatureMapper):
    """Shared container commands."""

    # node -> path methods that only the version subclass defines
    _VERSIONED_NODES = {
        "allow_host_cgroups": ("get_name_allow_host_cgroups",),
        "health_check": (
            "get_name_health_check",
            "get_name_health_check_command",
            "get_name_health_check_command_delete",
            "get_name_health_check_interval",
            "get_name_health_check_interval_delete",
            "get_name_health_check_retry",
            "get_name_health_check_retry_delete",
            "get_name_health_check_timeout",
            "get_name_health_check_timeout_delete",
        ),
        "log_driver": ("get_name_log_driver", "get_name_log_driver_delete"),
        "stop_timeout": ("get_name_stop_timeout", "get_name_stop_timeout_delete"),
        "network_mac": ("get_name_network_mac", "get_name_network_mac_delete"),
        "tmpfs": (
            "get_name_tmpfs",
            "get_name_tmpfs_destination",
            "get_name_tmpfs_destination_delete",
            "get_name_tmpfs_size",
            "get_name_tmpfs_size_delete",
        ),
        "network_gateway": ("get_network_gateway", "get_network_gateways_delete"),
        "network_mtu": ("get_network_mtu", "get_network_mtu_delete"),
        "network_type": (
            "get_network_type_bridge",
            "get_network_type_macvlan",
            "get_network_type_macvlan_mode",
            "get_network_type_macvlan_mode_delete",
            "get_network_type_macvlan_parent",
            "get_network_type_macvlan_parent_delete",
            "get_network_type_delete",
        ),
        "registry_insecure": ("get_registry_insecure",),
        "registry_mirror": (
            "get_registry_mirror",
            "get_registry_mirror_address",
            "get_registry_mirror_address_delete",
            "get_registry_mirror_host_name",
            "get_registry_mirror_host_name_delete",
            "get_registry_mirror_path",
            "get_registry_mirror_path_delete",
            "get_registry_mirror_port",
            "get_registry_mirror_port_delete",
        ),
    }

    # ========================================================================
    # Version allowlist
    # ========================================================================

    def versioned_nodes(self) -> FrozenSet[str]:
        """Version-only leaves this device has.

        A node counts when every path method below it is on this mapper.
        Capabilities and the builder read this set instead of the version
        string.
        """
        return frozenset(
            node
            for node, methods in self._VERSIONED_NODES.items()
            if all(callable(getattr(self, method, None)) for method in methods)
        )

    def require_node(self, node: str) -> None:
        if node not in self.versioned_nodes():
            raise ValueError(f"container {node} is not supported on this device")

    # ========================================================================
    # Allowed values (lab ``allowed:`` lists)
    # ========================================================================

    def capability_values(self) -> List[str]:
        return [
            "net-admin",
            "net-bind-service",
            "net-raw",
            "mknod",
            "setpcap",
            "sys-admin",
            "sys-module",
            "sys-nice",
            "sys-time",
        ]

    def restart_values(self) -> List[str]:
        return ["no", "on-failure", "always"]

    def log_driver_values(self) -> List[str]:
        return []

    def port_protocols(self) -> List[str]:
        return ["tcp", "udp"]

    def volume_modes(self) -> List[str]:
        return ["ro", "rw"]

    def volume_propagations(self) -> List[str]:
        return ["shared", "slave", "private", "rshared", "rslave", "rprivate"]

    def network_types(self) -> List[str]:
        return []

    def macvlan_modes(self) -> List[str]:
        return []

    def registry_password_max_length(self) -> int:
        return 128

    # ========================================================================
    # Config parse
    # ========================================================================

    def parse_config(self, full_config: Dict[str, Any]) -> Dict[str, Any]:
        from .config_parse import parse_config as parse_container_config

        return parse_container_config(self, full_config)

    # ========================================================================
    # Op-mode show paths and GraphQL mutations
    # ========================================================================

    def get_image_show_path(self) -> List[str]:
        return ["container", "image"]

    def get_log_show_path(self, name: str) -> List[str]:
        return ["container", "log", name]

    def add_image_mutation(self) -> GraphQLMutation:
        """``add container image <ref>``; a re-pull is the same mutation."""
        return _mutation("AddImageContainer")

    def delete_image_mutation(self) -> GraphQLMutation:
        return _mutation("DeleteImageContainer")

    def restart_mutation(self) -> GraphQLMutation:
        return _mutation("RestartContainer")

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

    def get_name_restart(self, name: str, policy: str) -> List[str]:
        return self._name(name) + ["restart", policy]

    def get_name_restart_delete(self, name: str) -> List[str]:
        return self._name(name) + ["restart"]

    # Capability (multi-value): one value, or the whole leaf
    def get_name_capability(self, name: str, capability: str) -> List[str]:
        return self._name(name) + ["capability", capability]

    def get_name_capabilities_delete(self, name: str) -> List[str]:
        return self._name(name) + ["capability"]

    # Name server (multi-value)
    def get_name_name_server(self, name: str, address: str) -> List[str]:
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

    def get_name_network_addresses_delete(self, name: str, network: str) -> List[str]:
        return self._name(name) + ["network", network, "address"]

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

    def get_network_no_name_server(self, network: str) -> List[str]:
        return self._network(network) + ["no-name-server"]

    def get_network_prefix(self, network: str, prefix: str) -> List[str]:
        return self._network(network) + ["prefix", prefix]

    def get_network_prefixes_delete(self, network: str) -> List[str]:
        return self._network(network) + ["prefix"]

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
