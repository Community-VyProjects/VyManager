import { apiClient } from "./client";

export interface DynamicAddressConfig {
  interface?: string | null;
  web_url?: string | null;
  web_skip?: string | null;
}

export interface DynamicNameEntry {
  name: string;
  protocol?: string | null;
  server?: string | null;
  username?: string | null;
  password?: string | null;
  hostnames: string[];
  ip_version?: string | null;
  address: DynamicAddressConfig;
  description?: string | null;
  ttl?: number | null;
  key?: string | null;
  expiry_time?: number | null;
  wait_time?: number | null;
  zone?: string | null;
}

export interface DNSDynamicConfig {
  interval?: number | null;
  vrf?: string | null;
  entries: DynamicNameEntry[];
}

export interface DNSDynamicCapabilities {
  version: string;
  features: {
    interval: { supported: boolean; description: string; default: number; min: number; max: number };
    vrf: { supported: boolean; description: string };
    name: { supported: boolean; description: string; fields: Record<string, string> };
  };
  version_info: { is_1_4: boolean; is_1_5: boolean };
}

export interface BatchOperation {
  op: string;
  value?: string | null;
}

export interface VyOSResponse {
  success: boolean;
  data?: Record<string, unknown> | null;
  error?: string | null;
}

class DNSDynamicService {
  async getCapabilities(): Promise<DNSDynamicCapabilities> {
    return apiClient.get<DNSDynamicCapabilities>("/vyos/dns-dynamic/capabilities");
  }

  async getConfig(refresh = false): Promise<DNSDynamicConfig> {
    return apiClient.get<DNSDynamicConfig>("/vyos/dns-dynamic/config", {
      refresh: refresh.toString(),
    });
  }

  private async batch(operations: BatchOperation[]): Promise<VyOSResponse> {
    const result = await apiClient.post<VyOSResponse>("/vyos/dns-dynamic/batch", {
      operations,
    });
    if (!result.success) {
      throw new Error(result.error || "Operation failed");
    }
    return result;
  }

  async saveGlobalSettings(interval: number | null, vrf: string | null): Promise<VyOSResponse> {
    const ops: BatchOperation[] = [];
    ops.push({ op: "delete_interval" });
    if (interval != null) ops.push({ op: "set_interval", value: String(interval) });
    ops.push({ op: "delete_vrf" });
    if (vrf) ops.push({ op: "set_vrf", value: vrf });
    return this.batch(ops);
  }

  async saveEntry(name: string, fields: Omit<DynamicNameEntry, "name">): Promise<VyOSResponse> {
    const ops: BatchOperation[] = [{ op: "delete_name", value: name }];

    if (fields.protocol) ops.push({ op: "set_name_protocol", value: `${name},${fields.protocol}` });
    if (fields.server) ops.push({ op: "set_name_server", value: `${name},${fields.server}` });
    if (fields.username) ops.push({ op: "set_name_username", value: `${name},${fields.username}` });
    if (fields.password) ops.push({ op: "set_name_password", value: `${name},${fields.password}` });
    for (const h of fields.hostnames) {
      ops.push({ op: "set_name_hostname", value: `${name},${h}` });
    }
    if (fields.ip_version) ops.push({ op: "set_name_ip_version", value: `${name},${fields.ip_version}` });
    if (fields.address.interface) {
      ops.push({ op: "set_name_address_interface", value: `${name},${fields.address.interface}` });
    }
    if (fields.address.web_url) {
      ops.push({ op: "set_name_address_web_url", value: `${name},${fields.address.web_url}` });
    }
    if (fields.address.web_skip) {
      ops.push({ op: "set_name_address_web_skip", value: `${name},${fields.address.web_skip}` });
    }
    if (fields.description) ops.push({ op: "set_name_description", value: `${name},${fields.description}` });
    if (fields.ttl != null) ops.push({ op: "set_name_ttl", value: `${name},${fields.ttl}` });
    if (fields.key) ops.push({ op: "set_name_key", value: `${name},${fields.key}` });
    if (fields.expiry_time != null) ops.push({ op: "set_name_expiry_time", value: `${name},${fields.expiry_time}` });
    if (fields.wait_time != null) ops.push({ op: "set_name_wait_time", value: `${name},${fields.wait_time}` });
    if (fields.zone) ops.push({ op: "set_name_zone", value: `${name},${fields.zone}` });

    return this.batch(ops);
  }

  async deleteEntry(name: string): Promise<VyOSResponse> {
    return this.batch([{ op: "delete_name", value: name }]);
  }
}

export const dnsDynamicService = new DNSDynamicService();
