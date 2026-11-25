import { apiClient } from "./client";
import type { ApiError } from "../types/api";
import {
  containerDeleteOps,
  containerOps,
  containerRootDeleteOps,
  networkDeleteOps,
  networkOps,
  registryDeleteOps,
  registryOps,
} from "./container-save-ops";

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

export interface ContainerHealthCheck {
  command?: string | null;
  interval?: string | null;
  retry?: string | null;
  timeout?: string | null;
}

export interface ContainerImageUpdateStatus {
  available: boolean;
  current_tag?: string | null;
  latest_tag?: string | null;
  registry?: string | null;
  checked_at?: string | null;
}

export interface ContainerInstance {
  name: string;
  image?: string | null;
  description?: string | null;
  disabled: boolean;
  allow_host_networks: boolean;
  allow_host_cgroups: boolean;
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
  stop_timeout?: string | null;
  /** Null when the health-check node is absent. */
  health_check?: ContainerHealthCheck | null;
  capabilities: string[];
  name_servers: string[];
  devices: ContainerDevice[];
  environments: ContainerEnvironment[];
  labels: ContainerLabel[];
  networks: ContainerNetworkAttachment[];
  ports: ContainerPort[];
  sysctl_params: ContainerSysctlParam[];
  tmpfs_mounts: ContainerTmpfs[];
  volumes: ContainerVolume[];
  update_status?: ContainerImageUpdateStatus | null;
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
  /** MASKED_SECRET when a password is stored, null when not. */
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
  /** Present by key membership: null when the node is absent. */
  authentication?: ContainerRegistryAuth | null;
  /** Present by key membership: a bare mirror node is an object of nulls. */
  mirror?: ContainerRegistryMirror | null;
}

export interface ContainerConfig {
  /** The `container` root node exists. */
  configured: boolean;
  containers: ContainerInstance[];
  networks: ContainerNetworkConfig[];
  registries: ContainerRegistry[];
}

export interface ContainerFeatures {
  allow_host_cgroups: boolean;
  health_check: boolean;
  log_driver: boolean;
  stop_timeout: boolean;
  network_mac: boolean;
  tmpfs: boolean;
  network_gateway: boolean;
  network_mtu: boolean;
  network_type: boolean;
  registry_insecure: boolean;
  registry_mirror: boolean;
}

export interface ContainerValues {
  capabilities: string[];
  restart_policies: string[];
  log_drivers: string[];
  port_protocols: string[];
  volume_modes: string[];
  volume_propagations: string[];
  network_types: string[];
  macvlan_modes: string[];
  registry_password_max_length: number;
  /** Keyword values of the attachment MAC (`auto`); empty where the leaf is absent. */
  network_mac_keywords: string[];
  /** Keyword values of the health-check interval (`disable`); empty where the leaf is absent. */
  health_check_interval_keywords: string[];
}

/** Verify rules that differ by version; the screen checks them before a save. */
export interface ContainerVerifyRules {
  /** A container name-server needs no-name-server on its attached network. */
  name_server_needs_no_name_server: boolean;
  /** An attachment IP or a non-keyword MAC may not be used by two containers. */
  unique_attachment_addresses: boolean;
}

export interface ContainerCapabilities extends ContainerVerifyRules {
  version: string;
  instance_name?: string | null;
  instance_id?: string | null;
  features: ContainerFeatures;
  values: ContainerValues;
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

const NO_CHANGES: VyOSResponse = { success: true, data: { message: "No changes" } };

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

  /** One commit. Throws ApiError on a rejected commit; an empty list posts nothing. */
  async batchConfigure(operations: BatchOperation[]): Promise<VyOSResponse> {
    if (operations.length === 0) return NO_CHANGES;
    const result = await apiClient.post<VyOSResponse>("/vyos/container/batch", { operations });
    if (!result.success) {
      const error: ApiError = { message: result.error || "" };
      throw error;
    }
    return result;
  }

  // --------------------------------------------------------------------------
  // Container instances
  // --------------------------------------------------------------------------

  /** Create (original null) or edit a container in one batch of changed leaves. */
  async saveContainer(
    original: ContainerInstance | null,
    draft: ContainerInstance,
    features: ContainerFeatures,
  ): Promise<VyOSResponse> {
    return this.batchConfigure(containerOps(original, draft, features));
  }

  async deleteContainer(name: string): Promise<VyOSResponse> {
    return this.batchConfigure(containerDeleteOps(name));
  }

  /** Remove the whole `container` tree. */
  async deleteContainerRoot(): Promise<VyOSResponse> {
    return this.batchConfigure(containerRootDeleteOps());
  }

  // --------------------------------------------------------------------------
  // Networks
  // --------------------------------------------------------------------------

  async saveNetwork(
    original: ContainerNetworkConfig | null,
    draft: ContainerNetworkConfig,
    features: ContainerFeatures,
  ): Promise<VyOSResponse> {
    return this.batchConfigure(networkOps(original, draft, features));
  }

  async deleteNetwork(name: string): Promise<VyOSResponse> {
    return this.batchConfigure(networkDeleteOps(name));
  }

  // --------------------------------------------------------------------------
  // Registries
  // --------------------------------------------------------------------------

  async saveRegistry(
    original: ContainerRegistry | null,
    draft: ContainerRegistry,
    features: ContainerFeatures,
  ): Promise<VyOSResponse> {
    return this.batchConfigure(registryOps(original, draft, features));
  }

  async deleteRegistry(name: string): Promise<VyOSResponse> {
    return this.batchConfigure(registryDeleteOps(name));
  }

  // --------------------------------------------------------------------------
  // Image / restart operations (GraphQL on the router)
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

  /** Images pulled on the device. A failed device read throws (HTTP 502). */
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

  async touchContainerFiles(paths: string[]): Promise<ContainerSSHResponse> {
    return apiClient.post<ContainerSSHResponse>("/vyos/container/touch", { paths });
  }

  async readContainerFile(path: string): Promise<{ success: boolean; content?: string; error?: string }> {
    return apiClient.get("/vyos/container/file", { path });
  }

  async writeContainerFile(path: string, content: string): Promise<ContainerSSHResponse> {
    return apiClient.post<ContainerSSHResponse>("/vyos/container/file", { path, content });
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
