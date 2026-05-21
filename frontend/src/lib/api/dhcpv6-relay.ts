import { apiClient } from "./client";

export interface DHCPv6ListenInterface {
  interface: string;
  address: string | null;
}

export interface DHCPv6UpstreamInterface {
  interface: string;
  addresses: string[];
}

export interface DHCPv6RelayConfig {
  disabled: boolean;
  max_hop_count: number | null;
  use_interface_id_option: boolean;
  listen_interfaces: DHCPv6ListenInterface[];
  upstream_interfaces: DHCPv6UpstreamInterface[];
}

export interface DHCPv6RelayCapabilities {
  version: string;
  features: {
    dhcpv6_relay: { supported: boolean; description: string };
    disable: { supported: boolean; description: string };
    max_hop_count: { supported: boolean; description: string; min: number; max: number; default: number };
    use_interface_id_option: { supported: boolean; description: string };
    listen_interface: { supported: boolean; description: string };
    listen_interface_address: { supported: boolean; description: string };
    upstream_interface: { supported: boolean; description: string };
    upstream_interface_address: { supported: boolean; description: string };
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

class DHCPv6RelayService {
  async getCapabilities(): Promise<DHCPv6RelayCapabilities> {
    return apiClient.get<DHCPv6RelayCapabilities>("/vyos/dhcpv6-relay/capabilities");
  }

  async getConfig(refresh = false): Promise<DHCPv6RelayConfig> {
    return apiClient.get<DHCPv6RelayConfig>("/vyos/dhcpv6-relay/config", {
      refresh: refresh.toString(),
    });
  }

  private async batch(operations: BatchOperation[]): Promise<VyOSResponse> {
    return apiClient.post<VyOSResponse>("/vyos/dhcpv6-relay/batch", { operations });
  }

  async setDisabled(disabled: boolean): Promise<VyOSResponse> {
    const op = disabled ? "set_disable" : "delete_disable";
    return this.batch([{ op }]);
  }

  async configure(config: DHCPv6RelayConfig): Promise<VyOSResponse> {
    const ops: BatchOperation[] = [{ op: "delete_dhcpv6_relay" }];

    if (config.disabled) {
      ops.push({ op: "set_disable" });
    }
    if (config.use_interface_id_option) {
      ops.push({ op: "set_use_interface_id_option" });
    }
    if (config.max_hop_count != null) {
      ops.push({ op: "set_max_hop_count", value: String(config.max_hop_count) });
    }
    for (const li of config.listen_interfaces) {
      ops.push({ op: "set_listen_interface", value: li.interface });
      if (li.address) {
        ops.push({ op: "set_listen_interface_address", value: `${li.interface},${li.address}` });
      }
    }
    for (const ui of config.upstream_interfaces) {
      ops.push({ op: "set_upstream_interface", value: ui.interface });
      for (const addr of ui.addresses) {
        ops.push({ op: "set_upstream_interface_address", value: `${ui.interface},${addr}` });
      }
    }

    return this.batch(ops);
  }
}

export const dhcpv6RelayService = new DHCPv6RelayService();
