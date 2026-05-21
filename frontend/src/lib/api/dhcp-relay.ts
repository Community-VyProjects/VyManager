import { apiClient } from "./client";

export interface DHCPRelayOptions {
  hop_count: number | null;
  max_size: number | null;
  relay_agents_packets: string | null;
}

export interface DHCPRelayConfig {
  disabled: boolean;
  interfaces: string[];
  listen_interfaces: string[];
  upstream_interfaces: string[];
  servers: string[];
  relay_options: DHCPRelayOptions;
}

export interface DHCPRelayCapabilities {
  version: string;
  features: {
    dhcp_relay: { supported: boolean; description: string };
    disable: { supported: boolean; description: string };
    interface: { supported: boolean; description: string };
    listen_interface: { supported: boolean; description: string };
    upstream_interface: { supported: boolean; description: string };
    server: { supported: boolean; description: string };
    hop_count: { supported: boolean; description: string; min: number; max: number; default: number };
    max_size: { supported: boolean; description: string; min: number; max: number; default: number };
    relay_agents_packets: { supported: boolean; description: string; options: string[]; default: string };
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

class DHCPRelayService {
  async getCapabilities(): Promise<DHCPRelayCapabilities> {
    return apiClient.get<DHCPRelayCapabilities>("/vyos/dhcp-relay/capabilities");
  }

  async getConfig(refresh = false): Promise<DHCPRelayConfig> {
    return apiClient.get<DHCPRelayConfig>("/vyos/dhcp-relay/config", {
      refresh: refresh.toString(),
    });
  }

  private async batch(operations: BatchOperation[]): Promise<VyOSResponse> {
    return apiClient.post<VyOSResponse>("/vyos/dhcp-relay/batch", { operations });
  }

  async setDisabled(disabled: boolean): Promise<VyOSResponse> {
    const op = disabled ? "set_disable" : "delete_disable";
    return this.batch([{ op }]);
  }

  async configure(config: DHCPRelayConfig): Promise<VyOSResponse> {
    const ops: BatchOperation[] = [{ op: "delete_dhcp_relay" }];

    for (const server of config.servers) {
      ops.push({ op: "set_server", value: server });
    }
    for (const iface of config.interfaces) {
      ops.push({ op: "set_interface", value: iface });
    }
    for (const iface of config.listen_interfaces) {
      ops.push({ op: "set_listen_interface", value: iface });
    }
    for (const iface of config.upstream_interfaces) {
      ops.push({ op: "set_upstream_interface", value: iface });
    }
    if (config.relay_options.hop_count != null) {
      ops.push({ op: "set_hop_count", value: String(config.relay_options.hop_count) });
    }
    if (config.relay_options.max_size != null) {
      ops.push({ op: "set_max_size", value: String(config.relay_options.max_size) });
    }
    if (config.relay_options.relay_agents_packets != null) {
      ops.push({ op: "set_relay_agents_packets", value: config.relay_options.relay_agents_packets });
    }
    if (config.disabled) {
      ops.push({ op: "set_disable" });
    }

    return this.batch(ops);
  }
}

export const dhcpRelayService = new DHCPRelayService();
