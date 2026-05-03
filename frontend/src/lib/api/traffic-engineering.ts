import { apiClient } from "./client";

export interface AdminGroup {
  name: string;
  bit_position: number | null;
}

export interface TeInterface {
  name: string;
  admin_groups: string[];
  max_bandwidth: number | null;
  max_reservable_bandwidth: number | null;
  metric: number | null;
}

export interface TrafficEngineeringConfig {
  admin_groups: AdminGroup[];
  interfaces: TeInterface[];
}

export interface TrafficEngineeringCapabilities {
  version: string;
  version_info: { is_1_4: boolean; is_1_5: boolean };
  features: {
    traffic_engineering: { supported: boolean; description: string };
    admin_groups: { supported: boolean; description: string };
    interface_params: { supported: boolean; description: string };
  };
  instance_name?: string;
  instance_id?: string;
}

export interface BatchOperation {
  op: string;
  value?: string;
}

export interface VyOSResponse {
  success: boolean;
  data?: Record<string, unknown> | null;
  error?: string | null;
}

class TrafficEngineeringService {
  async getCapabilities(): Promise<TrafficEngineeringCapabilities> {
    return apiClient.get<TrafficEngineeringCapabilities>(
      "/vyos/traffic-engineering/capabilities"
    );
  }

  async getConfig(refresh = false): Promise<TrafficEngineeringConfig> {
    return apiClient.get<TrafficEngineeringConfig>(
      "/vyos/traffic-engineering/config",
      { refresh: refresh.toString() }
    );
  }

  private async batch(ops: BatchOperation[]): Promise<VyOSResponse> {
    const result = await apiClient.post<VyOSResponse>(
      "/vyos/traffic-engineering/batch",
      { operations: ops }
    );
    if (!result.success)
      throw new Error(result.error || "Traffic Engineering operation failed");
    return result;
  }

  async createAdminGroup(name: string, bitPosition?: number | null): Promise<VyOSResponse> {
    const ops: BatchOperation[] = [{ op: "set_admin_group", value: name }];
    if (bitPosition != null) {
      ops.push({ op: "set_admin_group_bit_position", value: `${name},${bitPosition}` });
    }
    return this.batch(ops);
  }

  async updateAdminGroup(
    oldName: string,
    name: string,
    bitPosition?: number | null
  ): Promise<VyOSResponse> {
    const ops: BatchOperation[] = [{ op: "delete_admin_group", value: oldName }];
    ops.push({ op: "set_admin_group", value: name });
    if (bitPosition != null) {
      ops.push({ op: "set_admin_group_bit_position", value: `${name},${bitPosition}` });
    }
    return this.batch(ops);
  }

  async deleteAdminGroup(name: string): Promise<VyOSResponse> {
    return this.batch([{ op: "delete_admin_group", value: name }]);
  }

  async createInterface(iface: TeInterface): Promise<VyOSResponse> {
    const ops: BatchOperation[] = [{ op: "set_interface", value: iface.name }];
    for (const group of iface.admin_groups) {
      ops.push({ op: "set_interface_admin_group", value: `${iface.name},${group}` });
    }
    if (iface.max_bandwidth != null) {
      ops.push({ op: "set_interface_max_bandwidth", value: `${iface.name},${iface.max_bandwidth}` });
    }
    if (iface.max_reservable_bandwidth != null) {
      ops.push({
        op: "set_interface_max_reservable_bandwidth",
        value: `${iface.name},${iface.max_reservable_bandwidth}`,
      });
    }
    if (iface.metric != null) {
      ops.push({ op: "set_interface_metric", value: `${iface.name},${iface.metric}` });
    }
    return this.batch(ops);
  }

  async updateInterface(oldName: string, iface: TeInterface): Promise<VyOSResponse> {
    const ops: BatchOperation[] = [{ op: "delete_interface", value: oldName }];
    ops.push({ op: "set_interface", value: iface.name });
    for (const group of iface.admin_groups) {
      ops.push({ op: "set_interface_admin_group", value: `${iface.name},${group}` });
    }
    if (iface.max_bandwidth != null) {
      ops.push({ op: "set_interface_max_bandwidth", value: `${iface.name},${iface.max_bandwidth}` });
    }
    if (iface.max_reservable_bandwidth != null) {
      ops.push({
        op: "set_interface_max_reservable_bandwidth",
        value: `${iface.name},${iface.max_reservable_bandwidth}`,
      });
    }
    if (iface.metric != null) {
      ops.push({ op: "set_interface_metric", value: `${iface.name},${iface.metric}` });
    }
    return this.batch(ops);
  }

  async deleteInterface(name: string): Promise<VyOSResponse> {
    return this.batch([{ op: "delete_interface", value: name }]);
  }
}

export const trafficEngineeringService = new TrafficEngineeringService();
