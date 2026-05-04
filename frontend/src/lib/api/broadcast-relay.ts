import { apiClient } from "./client";

export interface BroadcastRelayInstance {
  id: string;
  address?: string | null;
  description?: string | null;
  disabled: boolean;
  interfaces: string[];
  port?: number | null;
}

export interface BroadcastRelayConfig {
  globally_disabled: boolean;
  instances: BroadcastRelayInstance[];
}

export interface BroadcastRelayCapabilities {
  version: string;
  features: {
    broadcast_relay: { supported: boolean; description: string };
    global_disable: { supported: boolean; description: string };
    instance_id_range: { supported: boolean; description: string; min: number; max: number };
    address: { supported: boolean; description: string };
    description: { supported: boolean; description: string };
    instance_disable: { supported: boolean; description: string };
    interface: { supported: boolean; description: string };
    port: { supported: boolean; description: string };
  };
  version_info: { is_1_4: boolean; is_1_5: boolean };
}

export interface VyOSResponse {
  success: boolean;
  data?: Record<string, unknown> | null;
  error?: string | null;
}

export interface BatchOperation {
  op: string;
  value?: string | null;
}

class BroadcastRelayService {
  async getCapabilities(): Promise<BroadcastRelayCapabilities> {
    return apiClient.get<BroadcastRelayCapabilities>("/vyos/broadcast-relay/capabilities");
  }

  async getConfig(refresh = false): Promise<BroadcastRelayConfig> {
    return apiClient.get<BroadcastRelayConfig>("/vyos/broadcast-relay/config", {
      refresh: refresh.toString(),
    });
  }

  private async batch(operations: BatchOperation[]): Promise<VyOSResponse> {
    const result = await apiClient.post<VyOSResponse>("/vyos/broadcast-relay/batch", {
      operations,
    });
    if (!result.success) {
      throw new Error(result.error || "Operation failed");
    }
    return result;
  }

  async setGlobalDisable(): Promise<VyOSResponse> {
    return this.batch([{ op: "set_global_disable" }]);
  }

  async deleteGlobalDisable(): Promise<VyOSResponse> {
    return this.batch([{ op: "delete_global_disable" }]);
  }

  async createInstance(instance: Partial<BroadcastRelayInstance> & { id: string }): Promise<VyOSResponse> {
    const ops: BatchOperation[] = [{ op: "set_instance", value: instance.id }];

    if (instance.port != null) {
      ops.push({ op: "set_instance_port", value: `${instance.id},${instance.port}` });
    }
    for (const iface of instance.interfaces ?? []) {
      ops.push({ op: "set_instance_interface", value: `${instance.id},${iface}` });
    }
    if (instance.address) {
      ops.push({ op: "set_instance_address", value: `${instance.id},${instance.address}` });
    }
    if (instance.description) {
      ops.push({ op: "set_instance_description", value: `${instance.id},${instance.description}` });
    }
    if (instance.disabled) {
      ops.push({ op: "set_instance_disable", value: instance.id });
    }

    return this.batch(ops);
  }

  async updateInstance(
    original: BroadcastRelayInstance,
    updated: Partial<BroadcastRelayInstance>
  ): Promise<VyOSResponse> {
    const id = original.id;
    const ops: BatchOperation[] = [];

    // Port
    const newPort = updated.port ?? null;
    if (newPort !== (original.port ?? null)) {
      if (original.port != null) {
        ops.push({ op: "delete_instance_port", value: id });
      }
      if (newPort != null) {
        ops.push({ op: "set_instance_port", value: `${id},${newPort}` });
      }
    }

    // Interfaces
    const newInterfaces = updated.interfaces ?? original.interfaces;
    const removedIfaces = original.interfaces.filter((i) => !newInterfaces.includes(i));
    const addedIfaces = newInterfaces.filter((i) => !original.interfaces.includes(i));
    for (const iface of removedIfaces) {
      ops.push({ op: "delete_instance_interface", value: `${id},${iface}` });
    }
    for (const iface of addedIfaces) {
      ops.push({ op: "set_instance_interface", value: `${id},${iface}` });
    }

    // Address
    const newAddress = updated.address ?? null;
    const oldAddress = original.address ?? null;
    if (newAddress !== oldAddress) {
      if (oldAddress) {
        ops.push({ op: "delete_instance_address", value: id });
      }
      if (newAddress) {
        ops.push({ op: "set_instance_address", value: `${id},${newAddress}` });
      }
    }

    // Description
    const newDesc = updated.description ?? null;
    const oldDesc = original.description ?? null;
    if (newDesc !== oldDesc) {
      if (oldDesc) {
        ops.push({ op: "delete_instance_description", value: id });
      }
      if (newDesc) {
        ops.push({ op: "set_instance_description", value: `${id},${newDesc}` });
      }
    }

    // Disabled
    const newDisabled = updated.disabled ?? original.disabled;
    if (newDisabled !== original.disabled) {
      if (newDisabled) {
        ops.push({ op: "set_instance_disable", value: id });
      } else {
        ops.push({ op: "delete_instance_disable", value: id });
      }
    }

    if (ops.length === 0) {
      return { success: true, data: { message: "No changes" } };
    }

    return this.batch(ops);
  }

  async deleteInstance(id: string): Promise<VyOSResponse> {
    return this.batch([{ op: "delete_instance", value: id }]);
  }
}

export const broadcastRelayService = new BroadcastRelayService();
