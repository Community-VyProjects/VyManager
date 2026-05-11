import { apiClient } from "./client";

// ============================================================================
// Interfaces
// ============================================================================

export interface ContainerDevice {
  name: string;
  source?: string | null;
  destination?: string | null;
}

export interface ContainerEnvironment {
  name: string;
  value?: string | null;
}

export interface ContainerLabel {
  name: string;
  value?: string | null;
}

export interface ContainerHealthCheck {
  command?: string | null;
  interval?: string | null;
  retry?: string | null;
  timeout?: string | null;
}

export interface ContainerNetworkAttachment {
  name: string;
  addresses: string[];
  mac?: string | null;
}

export interface ContainerPort {
  name: string;
  source?: string | null;
  destination?: string | null;
  protocol?: string | null;
  listen_addresses: string[];
}

export interface ContainerSysctlParam {
  name: string;
  value?: string | null;
}

export interface ContainerTmpfs {
  name: string;
  destination?: string | null;
  size?: string | null;
}

export interface ContainerVolume {
  name: string;
  source?: string | null;
  destination?: string | null;
  mode?: string | null;
  propagation?: string | null;
}

export interface ContainerInstance {
  name: string;
  image?: string | null;
  description?: string | null;
  disabled: boolean;
  allow_host_networks: boolean;
  allow_host_pid: boolean;
  privileged: boolean;
  arguments?: string | null;
  command?: string | null;
  entrypoint?: string | null;
  cpu_quota?: string | null;
  memory?: string | null;
  shared_memory?: string | null;
  uid?: string | null;
  gid?: string | null;
  host_name?: string | null;
  log_driver?: string | null;
  restart?: string | null;
  capabilities: string[];
  name_servers: string[];
  devices: ContainerDevice[];
  environments: ContainerEnvironment[];
  labels: ContainerLabel[];
  health_check?: ContainerHealthCheck | null;
  networks: ContainerNetworkAttachment[];
  ports: ContainerPort[];
  sysctl_params: ContainerSysctlParam[];
  tmpfs_mounts: ContainerTmpfs[];
  volumes: ContainerVolume[];
}

export interface ContainerNetworkConfig {
  name: string;
  description?: string | null;
  gateways: string[];
  mtu?: string | null;
  no_name_server: boolean;
  prefixes: string[];
  network_type?: string | null;
  macvlan_mode?: string | null;
  macvlan_parent?: string | null;
  vrf?: string | null;
}

export interface ContainerRegistryAuth {
  username?: string | null;
  password?: string | null;
}

export interface ContainerRegistryMirror {
  address?: string | null;
  host_name?: string | null;
  path?: string | null;
  port?: string | null;
}

export interface ContainerRegistry {
  name: string;
  disabled: boolean;
  insecure: boolean;
  authentication?: ContainerRegistryAuth | null;
  mirror?: ContainerRegistryMirror | null;
}

export interface ContainerConfig {
  containers: ContainerInstance[];
  networks: ContainerNetworkConfig[];
  registries: ContainerRegistry[];
}

export interface ContainerCapabilities {
  version: string;
  version_info: { is_1_4: boolean; is_1_5: boolean };
  features: {
    container_names:        { supported: boolean };
    container_networks:     { supported: boolean };
    container_registries:   { supported: boolean };
    allow_host_networks:    { supported: boolean };
    allow_host_pid:         { supported: boolean };
    privileged:             { supported: boolean };
    capabilities:           { supported: boolean; values: string[] };
    health_check:           { supported: boolean };
    log_driver:             { supported: boolean; values: string[] };
    restart_policy:         { supported: boolean; values: string[] };
    volume_propagation:     { supported: boolean; values: string[] };
    network_attachment_mac: { supported: boolean };
    network_gateway:        { supported: boolean };
    network_mtu:            { supported: boolean };
    network_type_bridge:    { supported: boolean };
    network_type_macvlan:   { supported: boolean; macvlan_modes: string[] };
    registry_insecure:      { supported: boolean };
    registry_mirror:        { supported: boolean };
    sysctl:                 { supported: boolean };
    tmpfs:                  { supported: boolean };
  };
}

export interface VyOSResponse {
  success: boolean;
  data?: Record<string, unknown> | null;
  error?: string | null;
}

export interface ContainerSSHResponse {
  success: boolean;
  output?: string | null;
  error?: string | null;
}

export interface BatchOperation {
  op: string;
  value?: string | null;
}

// ============================================================================
// Service
// ============================================================================

class ContainerService {
  async getConfig(refresh = false): Promise<ContainerConfig> {
    return apiClient.get<ContainerConfig>("/vyos/container/config", {
      refresh: refresh.toString(),
    });
  }

  async getCapabilities(): Promise<ContainerCapabilities> {
    return apiClient.get<ContainerCapabilities>("/vyos/container/capabilities");
  }

  private async batch(operations: BatchOperation[]): Promise<VyOSResponse> {
    const result = await apiClient.post<VyOSResponse>("/vyos/container/batch", { operations });
    if (!result.success) {
      throw new Error(result.error || "Operation failed");
    }
    return result;
  }

  // --------------------------------------------------------------------------
  // Container instances
  // --------------------------------------------------------------------------

  async createContainer(c: ContainerInstance): Promise<VyOSResponse> {
    const ops: BatchOperation[] = [{ op: "set_name", value: c.name }];

    if (c.image)        ops.push({ op: "set_name_image",       value: `${c.name},${c.image}` });
    if (c.description)  ops.push({ op: "set_name_description", value: `${c.name},${c.description}` });
    if (c.disabled)     ops.push({ op: "set_name_disable",     value: c.name });
    if (c.restart)      ops.push({ op: "set_name_restart",     value: `${c.name},${c.restart}` });
    if (c.log_driver)   ops.push({ op: "set_name_log_driver",  value: `${c.name},${c.log_driver}` });
    if (c.command)      ops.push({ op: "set_name_command",     value: `${c.name},${c.command}` });
    if (c.entrypoint)   ops.push({ op: "set_name_entrypoint",  value: `${c.name},${c.entrypoint}` });
    if (c.arguments)    ops.push({ op: "set_name_arguments",   value: `${c.name},${c.arguments}` });
    if (c.cpu_quota)    ops.push({ op: "set_name_cpu_quota",   value: `${c.name},${c.cpu_quota}` });
    if (c.memory)       ops.push({ op: "set_name_memory",      value: `${c.name},${c.memory}` });
    if (c.shared_memory) ops.push({ op: "set_name_shared_memory", value: `${c.name},${c.shared_memory}` });
    if (c.uid)          ops.push({ op: "set_name_uid",         value: `${c.name},${c.uid}` });
    if (c.gid)          ops.push({ op: "set_name_gid",         value: `${c.name},${c.gid}` });
    if (c.host_name)    ops.push({ op: "set_name_host_name",   value: `${c.name},${c.host_name}` });
    if (c.allow_host_networks) ops.push({ op: "set_name_allow_host_networks", value: c.name });
    if (c.allow_host_pid)      ops.push({ op: "set_name_allow_host_pid",      value: c.name });
    if (c.privileged)          ops.push({ op: "set_name_privileged",          value: c.name });

    for (const cap of c.capabilities) {
      ops.push({ op: "set_name_capability", value: `${c.name},${cap}` });
    }
    for (const ns of c.name_servers) {
      ops.push({ op: "set_name_name_server", value: `${c.name},${ns}` });
    }
    for (const env of c.environments) {
      ops.push({ op: "set_name_environment", value: `${c.name},${env.name}` });
      if (env.value != null) ops.push({ op: "set_name_environment_value", value: `${c.name},${env.name},${env.value}` });
    }
    for (const lbl of c.labels) {
      ops.push({ op: "set_name_label", value: `${c.name},${lbl.name}` });
      if (lbl.value != null) ops.push({ op: "set_name_label_value", value: `${c.name},${lbl.name},${lbl.value}` });
    }
    for (const dev of c.devices) {
      ops.push({ op: "set_name_device", value: `${c.name},${dev.name}` });
      if (dev.source)      ops.push({ op: "set_name_device_source",      value: `${c.name},${dev.name},${dev.source}` });
      if (dev.destination) ops.push({ op: "set_name_device_destination", value: `${c.name},${dev.name},${dev.destination}` });
    }
    for (const vol of c.volumes) {
      ops.push({ op: "set_name_volume", value: `${c.name},${vol.name}` });
      if (vol.source)      ops.push({ op: "set_name_volume_source",      value: `${c.name},${vol.name},${vol.source}` });
      if (vol.destination) ops.push({ op: "set_name_volume_destination", value: `${c.name},${vol.name},${vol.destination}` });
      if (vol.mode)        ops.push({ op: "set_name_volume_mode",        value: `${c.name},${vol.name},${vol.mode}` });
      if (vol.propagation) ops.push({ op: "set_name_volume_propagation", value: `${c.name},${vol.name},${vol.propagation}` });
    }
    for (const tmp of c.tmpfs_mounts) {
      ops.push({ op: "set_name_tmpfs", value: `${c.name},${tmp.name}` });
      if (tmp.destination) ops.push({ op: "set_name_tmpfs_destination", value: `${c.name},${tmp.name},${tmp.destination}` });
      if (tmp.size)        ops.push({ op: "set_name_tmpfs_size",        value: `${c.name},${tmp.name},${tmp.size}` });
    }
    for (const net of c.networks) {
      ops.push({ op: "set_name_network", value: `${c.name},${net.name}` });
      for (const addr of net.addresses) {
        ops.push({ op: "set_name_network_address", value: `${c.name},${net.name},${addr}` });
      }
      if (net.mac) ops.push({ op: "set_name_network_mac", value: `${c.name},${net.name},${net.mac}` });
    }
    for (const port of c.ports) {
      ops.push({ op: "set_name_port", value: `${c.name},${port.name}` });
      if (port.source)      ops.push({ op: "set_name_port_source",      value: `${c.name},${port.name},${port.source}` });
      if (port.destination) ops.push({ op: "set_name_port_destination", value: `${c.name},${port.name},${port.destination}` });
      if (port.protocol)    ops.push({ op: "set_name_port_protocol",    value: `${c.name},${port.name},${port.protocol}` });
      for (const la of port.listen_addresses) {
        ops.push({ op: "set_name_port_listen_address", value: `${c.name},${port.name},${la}` });
      }
    }
    for (const sp of c.sysctl_params) {
      ops.push({ op: "set_name_sysctl_parameter", value: `${c.name},${sp.name}` });
      if (sp.value != null) ops.push({ op: "set_name_sysctl_parameter_value", value: `${c.name},${sp.name},${sp.value}` });
    }
    if (c.health_check) {
      ops.push({ op: "set_name_health_check", value: c.name });
      if (c.health_check.command)  ops.push({ op: "set_name_health_check_command",  value: `${c.name},${c.health_check.command}` });
      if (c.health_check.interval) ops.push({ op: "set_name_health_check_interval", value: `${c.name},${c.health_check.interval}` });
      if (c.health_check.retry)    ops.push({ op: "set_name_health_check_retry",    value: `${c.name},${c.health_check.retry}` });
      if (c.health_check.timeout)  ops.push({ op: "set_name_health_check_timeout",  value: `${c.name},${c.health_check.timeout}` });
    }

    return this.batch(ops);
  }

  async updateContainer(original: ContainerInstance, updated: ContainerInstance): Promise<VyOSResponse> {
    const n = original.name;
    const ops: BatchOperation[] = [];

    const strChanged = (o: string | null | undefined, u: string | null | undefined) => (o ?? null) !== (u ?? null);
    const boolChanged = (o: boolean, u: boolean) => o !== u;

    if (strChanged(original.image, updated.image)) {
      if (original.image) ops.push({ op: "delete_name_image", value: n });
      if (updated.image)  ops.push({ op: "set_name_image",    value: `${n},${updated.image}` });
    }
    if (strChanged(original.description, updated.description)) {
      if (original.description) ops.push({ op: "delete_name_description", value: n });
      if (updated.description)  ops.push({ op: "set_name_description",    value: `${n},${updated.description}` });
    }
    if (boolChanged(original.disabled, updated.disabled)) {
      ops.push(updated.disabled ? { op: "set_name_disable", value: n } : { op: "delete_name_disable", value: n });
    }
    if (strChanged(original.restart, updated.restart)) {
      if (original.restart) ops.push({ op: "delete_name_restart", value: n });
      if (updated.restart)  ops.push({ op: "set_name_restart",    value: `${n},${updated.restart}` });
    }
    if (strChanged(original.log_driver, updated.log_driver)) {
      if (original.log_driver) ops.push({ op: "delete_name_log_driver", value: n });
      if (updated.log_driver)  ops.push({ op: "set_name_log_driver",    value: `${n},${updated.log_driver}` });
    }
    if (strChanged(original.command, updated.command)) {
      if (original.command) ops.push({ op: "delete_name_command", value: n });
      if (updated.command)  ops.push({ op: "set_name_command",    value: `${n},${updated.command}` });
    }
    if (strChanged(original.entrypoint, updated.entrypoint)) {
      if (original.entrypoint) ops.push({ op: "delete_name_entrypoint", value: n });
      if (updated.entrypoint)  ops.push({ op: "set_name_entrypoint",    value: `${n},${updated.entrypoint}` });
    }
    if (strChanged(original.arguments, updated.arguments)) {
      if (original.arguments) ops.push({ op: "delete_name_arguments", value: n });
      if (updated.arguments)  ops.push({ op: "set_name_arguments",    value: `${n},${updated.arguments}` });
    }
    if (strChanged(original.cpu_quota, updated.cpu_quota)) {
      if (original.cpu_quota) ops.push({ op: "delete_name_cpu_quota", value: n });
      if (updated.cpu_quota)  ops.push({ op: "set_name_cpu_quota",    value: `${n},${updated.cpu_quota}` });
    }
    if (strChanged(original.memory, updated.memory)) {
      if (original.memory) ops.push({ op: "delete_name_memory", value: n });
      if (updated.memory)  ops.push({ op: "set_name_memory",    value: `${n},${updated.memory}` });
    }
    if (strChanged(original.shared_memory, updated.shared_memory)) {
      if (original.shared_memory) ops.push({ op: "delete_name_shared_memory", value: n });
      if (updated.shared_memory)  ops.push({ op: "set_name_shared_memory",    value: `${n},${updated.shared_memory}` });
    }
    if (strChanged(original.uid, updated.uid)) {
      if (original.uid) ops.push({ op: "delete_name_uid", value: n });
      if (updated.uid)  ops.push({ op: "set_name_uid",    value: `${n},${updated.uid}` });
    }
    if (strChanged(original.gid, updated.gid)) {
      if (original.gid) ops.push({ op: "delete_name_gid", value: n });
      if (updated.gid)  ops.push({ op: "set_name_gid",    value: `${n},${updated.gid}` });
    }
    if (strChanged(original.host_name, updated.host_name)) {
      if (original.host_name) ops.push({ op: "delete_name_host_name", value: n });
      if (updated.host_name)  ops.push({ op: "set_name_host_name",    value: `${n},${updated.host_name}` });
    }
    if (boolChanged(original.allow_host_networks, updated.allow_host_networks)) {
      ops.push(updated.allow_host_networks ? { op: "set_name_allow_host_networks", value: n } : { op: "delete_name_allow_host_networks", value: n });
    }
    if (boolChanged(original.allow_host_pid, updated.allow_host_pid)) {
      ops.push(updated.allow_host_pid ? { op: "set_name_allow_host_pid", value: n } : { op: "delete_name_allow_host_pid", value: n });
    }
    if (boolChanged(original.privileged, updated.privileged)) {
      ops.push(updated.privileged ? { op: "set_name_privileged", value: n } : { op: "delete_name_privileged", value: n });
    }

    // Capabilities
    const removedCaps = original.capabilities.filter(c => !updated.capabilities.includes(c));
    const addedCaps   = updated.capabilities.filter(c => !original.capabilities.includes(c));
    for (const cap of removedCaps) ops.push({ op: "delete_name_capability", value: `${n},${cap}` });
    for (const cap of addedCaps)   ops.push({ op: "set_name_capability",    value: `${n},${cap}` });

    // Name servers
    const removedNs = original.name_servers.filter(s => !updated.name_servers.includes(s));
    const addedNs   = updated.name_servers.filter(s => !original.name_servers.includes(s));
    for (const ns of removedNs) ops.push({ op: "delete_name_name_server", value: `${n},${ns}` });
    for (const ns of addedNs)   ops.push({ op: "set_name_name_server",    value: `${n},${ns}` });

    // Environments — replace all if any changed
    const envsChanged = JSON.stringify(original.environments) !== JSON.stringify(updated.environments);
    if (envsChanged) {
      if (original.environments.length > 0) ops.push({ op: "delete_name_environments", value: n });
      for (const env of updated.environments) {
        ops.push({ op: "set_name_environment", value: `${n},${env.name}` });
        if (env.value != null) ops.push({ op: "set_name_environment_value", value: `${n},${env.name},${env.value}` });
      }
    }

    // Labels — replace all if any changed
    const labelsChanged = JSON.stringify(original.labels) !== JSON.stringify(updated.labels);
    if (labelsChanged) {
      if (original.labels.length > 0) ops.push({ op: "delete_name_labels", value: n });
      for (const lbl of updated.labels) {
        ops.push({ op: "set_name_label", value: `${n},${lbl.name}` });
        if (lbl.value != null) ops.push({ op: "set_name_label_value", value: `${n},${lbl.name},${lbl.value}` });
      }
    }

    // Devices — replace all if any changed
    const devsChanged = JSON.stringify(original.devices) !== JSON.stringify(updated.devices);
    if (devsChanged) {
      for (const dev of original.devices) ops.push({ op: "delete_name_device", value: `${n},${dev.name}` });
      for (const dev of updated.devices) {
        ops.push({ op: "set_name_device", value: `${n},${dev.name}` });
        if (dev.source)      ops.push({ op: "set_name_device_source",      value: `${n},${dev.name},${dev.source}` });
        if (dev.destination) ops.push({ op: "set_name_device_destination", value: `${n},${dev.name},${dev.destination}` });
      }
    }

    // Volumes — replace all if any changed
    const volsChanged = JSON.stringify(original.volumes) !== JSON.stringify(updated.volumes);
    if (volsChanged) {
      for (const vol of original.volumes) ops.push({ op: "delete_name_volume", value: `${n},${vol.name}` });
      for (const vol of updated.volumes) {
        ops.push({ op: "set_name_volume", value: `${n},${vol.name}` });
        if (vol.source)      ops.push({ op: "set_name_volume_source",      value: `${n},${vol.name},${vol.source}` });
        if (vol.destination) ops.push({ op: "set_name_volume_destination", value: `${n},${vol.name},${vol.destination}` });
        if (vol.mode)        ops.push({ op: "set_name_volume_mode",        value: `${n},${vol.name},${vol.mode}` });
        if (vol.propagation) ops.push({ op: "set_name_volume_propagation", value: `${n},${vol.name},${vol.propagation}` });
      }
    }

    // Tmpfs — replace all if any changed
    const tmpfsChanged = JSON.stringify(original.tmpfs_mounts) !== JSON.stringify(updated.tmpfs_mounts);
    if (tmpfsChanged) {
      for (const tmp of original.tmpfs_mounts) ops.push({ op: "delete_name_tmpfs", value: `${n},${tmp.name}` });
      for (const tmp of updated.tmpfs_mounts) {
        ops.push({ op: "set_name_tmpfs", value: `${n},${tmp.name}` });
        if (tmp.destination) ops.push({ op: "set_name_tmpfs_destination", value: `${n},${tmp.name},${tmp.destination}` });
        if (tmp.size)        ops.push({ op: "set_name_tmpfs_size",        value: `${n},${tmp.name},${tmp.size}` });
      }
    }

    // Networks — replace all if any changed
    const netsChanged = JSON.stringify(original.networks) !== JSON.stringify(updated.networks);
    if (netsChanged) {
      for (const net of original.networks) ops.push({ op: "delete_name_network", value: `${n},${net.name}` });
      for (const net of updated.networks) {
        ops.push({ op: "set_name_network", value: `${n},${net.name}` });
        for (const addr of net.addresses) ops.push({ op: "set_name_network_address", value: `${n},${net.name},${addr}` });
        if (net.mac) ops.push({ op: "set_name_network_mac", value: `${n},${net.name},${net.mac}` });
      }
    }

    // Ports — replace all if any changed
    const portsChanged = JSON.stringify(original.ports) !== JSON.stringify(updated.ports);
    if (portsChanged) {
      for (const port of original.ports) ops.push({ op: "delete_name_port", value: `${n},${port.name}` });
      for (const port of updated.ports) {
        ops.push({ op: "set_name_port", value: `${n},${port.name}` });
        if (port.source)      ops.push({ op: "set_name_port_source",      value: `${n},${port.name},${port.source}` });
        if (port.destination) ops.push({ op: "set_name_port_destination", value: `${n},${port.name},${port.destination}` });
        if (port.protocol)    ops.push({ op: "set_name_port_protocol",    value: `${n},${port.name},${port.protocol}` });
        for (const la of port.listen_addresses) ops.push({ op: "set_name_port_listen_address", value: `${n},${port.name},${la}` });
      }
    }

    // Sysctl params — replace all if any changed
    const sysctlChanged = JSON.stringify(original.sysctl_params) !== JSON.stringify(updated.sysctl_params);
    if (sysctlChanged) {
      if (original.sysctl_params.length > 0) ops.push({ op: "delete_name_sysctl", value: n });
      for (const sp of updated.sysctl_params) {
        ops.push({ op: "set_name_sysctl_parameter", value: `${n},${sp.name}` });
        if (sp.value != null) ops.push({ op: "set_name_sysctl_parameter_value", value: `${n},${sp.name},${sp.value}` });
      }
    }

    // Health check — replace if changed
    const hcChanged = JSON.stringify(original.health_check) !== JSON.stringify(updated.health_check);
    if (hcChanged) {
      if (original.health_check) ops.push({ op: "delete_name_health_check", value: n });
      if (updated.health_check) {
        ops.push({ op: "set_name_health_check", value: n });
        if (updated.health_check.command)  ops.push({ op: "set_name_health_check_command",  value: `${n},${updated.health_check.command}` });
        if (updated.health_check.interval) ops.push({ op: "set_name_health_check_interval", value: `${n},${updated.health_check.interval}` });
        if (updated.health_check.retry)    ops.push({ op: "set_name_health_check_retry",    value: `${n},${updated.health_check.retry}` });
        if (updated.health_check.timeout)  ops.push({ op: "set_name_health_check_timeout",  value: `${n},${updated.health_check.timeout}` });
      }
    }

    if (ops.length === 0) return { success: true, data: { message: "No changes" } };
    return this.batch(ops);
  }

  async deleteContainer(name: string): Promise<VyOSResponse> {
    return this.batch([{ op: "delete_name", value: name }]);
  }

  // --------------------------------------------------------------------------
  // Networks
  // --------------------------------------------------------------------------

  async createNetwork(net: ContainerNetworkConfig): Promise<VyOSResponse> {
    const ops: BatchOperation[] = [{ op: "set_network", value: net.name }];

    if (net.description)  ops.push({ op: "set_network_description",    value: `${net.name},${net.description}` });
    if (net.mtu)          ops.push({ op: "set_network_mtu",            value: `${net.name},${net.mtu}` });
    if (net.vrf)          ops.push({ op: "set_network_vrf",            value: `${net.name},${net.vrf}` });
    if (net.no_name_server) ops.push({ op: "set_network_no_name_server", value: net.name });
    for (const prefix of net.prefixes)  ops.push({ op: "set_network_prefix",  value: `${net.name},${prefix}` });
    for (const gw of net.gateways)      ops.push({ op: "set_network_gateway", value: `${net.name},${gw}` });

    if (net.network_type === "bridge") {
      ops.push({ op: "set_network_type_bridge", value: net.name });
    } else if (net.network_type === "macvlan") {
      ops.push({ op: "set_network_type_macvlan", value: net.name });
      if (net.macvlan_mode)   ops.push({ op: "set_network_type_macvlan_mode",   value: `${net.name},${net.macvlan_mode}` });
      if (net.macvlan_parent) ops.push({ op: "set_network_type_macvlan_parent", value: `${net.name},${net.macvlan_parent}` });
    }

    return this.batch(ops);
  }

  async updateNetwork(original: ContainerNetworkConfig, updated: ContainerNetworkConfig): Promise<VyOSResponse> {
    const n = original.name;
    const ops: BatchOperation[] = [];
    const strChanged = (o: string | null | undefined, u: string | null | undefined) => (o ?? null) !== (u ?? null);

    if (strChanged(original.description, updated.description)) {
      if (original.description) ops.push({ op: "delete_network_description", value: n });
      if (updated.description)  ops.push({ op: "set_network_description",    value: `${n},${updated.description}` });
    }
    if (strChanged(original.mtu, updated.mtu)) {
      if (original.mtu) ops.push({ op: "delete_network_mtu", value: n });
      if (updated.mtu)  ops.push({ op: "set_network_mtu",    value: `${n},${updated.mtu}` });
    }
    if (strChanged(original.vrf, updated.vrf)) {
      if (original.vrf) ops.push({ op: "delete_network_vrf", value: n });
      if (updated.vrf)  ops.push({ op: "set_network_vrf",    value: `${n},${updated.vrf}` });
    }
    if (original.no_name_server !== updated.no_name_server) {
      ops.push(updated.no_name_server ? { op: "set_network_no_name_server", value: n } : { op: "delete_network_no_name_server", value: n });
    }

    const removedPrefixes = original.prefixes.filter(p => !updated.prefixes.includes(p));
    const addedPrefixes   = updated.prefixes.filter(p => !original.prefixes.includes(p));
    for (const p of removedPrefixes) ops.push({ op: "delete_network_prefix", value: `${n},${p}` });
    for (const p of addedPrefixes)   ops.push({ op: "set_network_prefix",    value: `${n},${p}` });

    const removedGws = original.gateways.filter(g => !updated.gateways.includes(g));
    const addedGws   = updated.gateways.filter(g => !original.gateways.includes(g));
    for (const g of removedGws) ops.push({ op: "delete_network_gateway", value: `${n},${g}` });
    for (const g of addedGws)   ops.push({ op: "set_network_gateway",    value: `${n},${g}` });

    const typeChanged = original.network_type !== updated.network_type ||
      original.macvlan_mode !== updated.macvlan_mode ||
      original.macvlan_parent !== updated.macvlan_parent;
    if (typeChanged) {
      if (original.network_type) ops.push({ op: "delete_network_type", value: n });
      if (updated.network_type === "bridge") {
        ops.push({ op: "set_network_type_bridge", value: n });
      } else if (updated.network_type === "macvlan") {
        ops.push({ op: "set_network_type_macvlan", value: n });
        if (updated.macvlan_mode)   ops.push({ op: "set_network_type_macvlan_mode",   value: `${n},${updated.macvlan_mode}` });
        if (updated.macvlan_parent) ops.push({ op: "set_network_type_macvlan_parent", value: `${n},${updated.macvlan_parent}` });
      }
    }

    if (ops.length === 0) return { success: true, data: { message: "No changes" } };
    return this.batch(ops);
  }

  async deleteNetwork(name: string): Promise<VyOSResponse> {
    return this.batch([{ op: "delete_network", value: name }]);
  }

  // --------------------------------------------------------------------------
  // Registries
  // --------------------------------------------------------------------------

  async createRegistry(reg: ContainerRegistry): Promise<VyOSResponse> {
    const ops: BatchOperation[] = [{ op: "set_registry", value: reg.name }];

    if (reg.disabled)  ops.push({ op: "set_registry_disable",   value: reg.name });
    if (reg.insecure)  ops.push({ op: "set_registry_insecure",  value: reg.name });

    if (reg.authentication?.username) {
      ops.push({ op: "set_registry_auth_username", value: `${reg.name},${reg.authentication.username}` });
    }
    if (reg.authentication?.password) {
      ops.push({ op: "set_registry_auth_password", value: `${reg.name},${reg.authentication.password}` });
    }

    if (reg.mirror) {
      ops.push({ op: "set_registry_mirror", value: reg.name });
      if (reg.mirror.address)   ops.push({ op: "set_registry_mirror_address",   value: `${reg.name},${reg.mirror.address}` });
      if (reg.mirror.host_name) ops.push({ op: "set_registry_mirror_host_name", value: `${reg.name},${reg.mirror.host_name}` });
      if (reg.mirror.path)      ops.push({ op: "set_registry_mirror_path",      value: `${reg.name},${reg.mirror.path}` });
      if (reg.mirror.port)      ops.push({ op: "set_registry_mirror_port",      value: `${reg.name},${reg.mirror.port}` });
    }

    return this.batch(ops);
  }

  async updateRegistry(original: ContainerRegistry, updated: ContainerRegistry): Promise<VyOSResponse> {
    const n = original.name;
    const ops: BatchOperation[] = [];

    if (original.disabled !== updated.disabled) {
      ops.push(updated.disabled ? { op: "set_registry_disable", value: n } : { op: "delete_registry_disable", value: n });
    }
    if (original.insecure !== updated.insecure) {
      ops.push(updated.insecure ? { op: "set_registry_insecure", value: n } : { op: "delete_registry_insecure", value: n });
    }

    const oldUser = original.authentication?.username ?? null;
    const newUser = updated.authentication?.username ?? null;
    if (oldUser !== newUser) {
      if (oldUser) ops.push({ op: "delete_registry_auth_username", value: n });
      if (newUser) ops.push({ op: "set_registry_auth_username", value: `${n},${newUser}` });
    }
    const oldPass = original.authentication?.password ?? null;
    const newPass = updated.authentication?.password ?? null;
    if (oldPass !== newPass) {
      if (oldPass) ops.push({ op: "delete_registry_auth_password", value: n });
      if (newPass) ops.push({ op: "set_registry_auth_password", value: `${n},${newPass}` });
    }

    const mirrorChanged = JSON.stringify(original.mirror) !== JSON.stringify(updated.mirror);
    if (mirrorChanged) {
      if (original.mirror) ops.push({ op: "delete_registry_mirror", value: n });
      if (updated.mirror) {
        ops.push({ op: "set_registry_mirror", value: n });
        if (updated.mirror.address)   ops.push({ op: "set_registry_mirror_address",   value: `${n},${updated.mirror.address}` });
        if (updated.mirror.host_name) ops.push({ op: "set_registry_mirror_host_name", value: `${n},${updated.mirror.host_name}` });
        if (updated.mirror.path)      ops.push({ op: "set_registry_mirror_path",      value: `${n},${updated.mirror.path}` });
        if (updated.mirror.port)      ops.push({ op: "set_registry_mirror_port",      value: `${n},${updated.mirror.port}` });
      }
    }

    if (ops.length === 0) return { success: true, data: { message: "No changes" } };
    return this.batch(ops);
  }

  async deleteRegistry(name: string): Promise<VyOSResponse> {
    return this.batch([{ op: "delete_registry", value: name }]);
  }

  // --------------------------------------------------------------------------
  // SSH operations
  // --------------------------------------------------------------------------

  async pullImage(imageRef: string): Promise<ContainerSSHResponse> {
    return apiClient.post<ContainerSSHResponse>("/vyos/container/image/pull", { image: imageRef });
  }

  async addImage(containerName: string): Promise<ContainerSSHResponse> {
    return apiClient.post<ContainerSSHResponse>("/vyos/container/image/add", { container_name: containerName });
  }

  async updateImage(containerName: string): Promise<ContainerSSHResponse> {
    return apiClient.post<ContainerSSHResponse>("/vyos/container/image/update", { container_name: containerName });
  }

  async deleteImage(containerName: string): Promise<ContainerSSHResponse> {
    return apiClient.post<ContainerSSHResponse>("/vyos/container/image/delete", { container_name: containerName });
  }

  async restartContainer(containerName: string): Promise<ContainerSSHResponse> {
    return apiClient.post<ContainerSSHResponse>("/vyos/container/restart", { container_name: containerName });
  }

  async getImages(): Promise<string[]> {
    const result = await apiClient.get<{ images: string[] }>("/vyos/container/images");
    return result.images ?? [];
  }

  async checkBaseDir(): Promise<{ exists: boolean }> {
    return apiClient.get<{ exists: boolean }>("/vyos/container/base-dir");
  }

  async createBaseDir(): Promise<ContainerSSHResponse> {
    return apiClient.post<ContainerSSHResponse>("/vyos/container/base-dir", {});
  }

  async createContainerDirs(paths: string[]): Promise<ContainerSSHResponse> {
    return apiClient.post<ContainerSSHResponse>("/vyos/container/mkdir", { paths });
  }

  async removeContainerDir(path: string): Promise<ContainerSSHResponse> {
    return apiClient.post<ContainerSSHResponse>("/vyos/container/rmdir", { path });
  }

  async updateImageRef(imageRef: string): Promise<ContainerSSHResponse> {
    return apiClient.post<ContainerSSHResponse>("/vyos/container/image/update-ref", { image: imageRef });
  }

  async deleteImageRef(imageRef: string): Promise<ContainerSSHResponse> {
    return apiClient.post<ContainerSSHResponse>("/vyos/container/image/delete-ref", { image: imageRef });
  }

  async getContainerLog(containerName: string): Promise<ContainerSSHResponse> {
    return apiClient.post<ContainerSSHResponse>("/vyos/container/log", { container_name: containerName });
  }
}

export const containerService = new ContainerService();
