import { apiClient } from "./client";

// ============================================================================
// TypeScript Interfaces
// ============================================================================

export interface SstpcAuthentication {
  username: string | null;
  password: string | null;
}

export interface SstpcSslConfig {
  ca_certificate: string | null;
}

export interface SstpcInterface {
  name: string;
  type: string;
  description: string | null;
  disabled: boolean;
  server: string | null;
  port: string | null;
  default_route_distance: string | null;
  no_default_route: boolean;
  no_peer_dns: boolean;
  mtu: string | null;
  vrf: string | null;
  authentication: SstpcAuthentication | null;
  ssl: SstpcSslConfig | null;
}

export interface SstpcConfigResponse {
  interfaces: SstpcInterface[];
  total: number;
}

export interface SstpcCapabilityFeature {
  supported: boolean;
  description: string;
}

export interface SstpcCapabilities {
  version: string;
  version_info: {
    is_1_4: boolean;
    is_1_5: boolean;
  };
  features: Record<string, SstpcCapabilityFeature>;
}

export interface VyOSResponse {
  success: boolean;
  data?: Record<string, unknown> | null;
  error?: string | null;
}

export interface SstpcBatchOperation {
  op: string;
  value?: string;
}

export interface SstpcCreateConfig {
  name: string;
  description?: string;
  disabled?: boolean;
  server?: string;
  port?: string;
  username?: string;
  password?: string;
  ssl_ca_certificate?: string;
  default_route_distance?: string;
  no_default_route?: boolean;
  no_peer_dns?: boolean;
  mtu?: string;
  vrf?: string;
}

// ============================================================================
// Operation builder helpers
// ============================================================================

function buildInterfaceOps(config: SstpcCreateConfig): SstpcBatchOperation[] {
  const ops: SstpcBatchOperation[] = [];

  if (config.description) ops.push({ op: "set_interface_description", value: config.description });
  if (config.disabled) ops.push({ op: "set_interface_disable" });
  if (config.server) ops.push({ op: "set_server", value: config.server });
  if (config.port) ops.push({ op: "set_port", value: config.port });

  if (config.username) ops.push({ op: "set_authentication_username", value: config.username });
  if (config.password) ops.push({ op: "set_authentication_password", value: config.password });
  if (config.ssl_ca_certificate) ops.push({ op: "set_ssl_ca_certificate", value: config.ssl_ca_certificate });

  if (config.default_route_distance) ops.push({ op: "set_default_route_distance", value: config.default_route_distance });
  if (config.no_default_route) ops.push({ op: "set_no_default_route" });
  if (config.no_peer_dns) ops.push({ op: "set_no_peer_dns" });
  if (config.mtu) ops.push({ op: "set_mtu", value: config.mtu });
  if (config.vrf) ops.push({ op: "set_vrf", value: config.vrf });

  return ops;
}

// ============================================================================
// API Service
// ============================================================================

class SstpcService {
  async getCapabilities(): Promise<SstpcCapabilities> {
    return apiClient.get<SstpcCapabilities>("/vyos/sstpc/capabilities");
  }

  async getConfig(refresh: boolean = false): Promise<SstpcConfigResponse> {
    return apiClient.get<SstpcConfigResponse>("/vyos/sstpc/config", {
      refresh: refresh.toString(),
    });
  }

  async refreshConfig(): Promise<VyOSResponse> {
    return apiClient.post<VyOSResponse>("/vyos/config/refresh");
  }

  async batchConfigure(
    interfaceName: string,
    operations: SstpcBatchOperation[]
  ): Promise<VyOSResponse> {
    const result = await apiClient.post<VyOSResponse>("/vyos/sstpc/batch", {
      interface: interfaceName,
      operations,
    });
    if (result.success) {
      await this.refreshConfig();
    }
    return result;
  }

  async createInterface(config: SstpcCreateConfig): Promise<VyOSResponse> {
    const ops = buildInterfaceOps(config);
    return this.batchConfigure(config.name, ops);
  }

  async updateInterface(
    name: string,
    current: SstpcInterface,
    updated: Partial<SstpcCreateConfig>
  ): Promise<VyOSResponse> {
    const ops: SstpcBatchOperation[] = [];

    const setOrDeleteValue = (
      key: keyof Pick<
        SstpcCreateConfig,
        | "description"
        | "server"
        | "port"
        | "username"
        | "password"
        | "ssl_ca_certificate"
        | "default_route_distance"
        | "mtu"
        | "vrf"
      >,
      setOp: string,
      deleteOp: string
    ) => {
      const val = updated[key];
      if (val === undefined) return;
      if (val) ops.push({ op: setOp, value: val });
      else ops.push({ op: deleteOp });
    };

    const setOrDeleteFlag = (
      key: keyof Pick<SstpcCreateConfig, "disabled" | "no_default_route" | "no_peer_dns">,
      setOp: string,
      deleteOp: string
    ) => {
      const val = updated[key];
      if (val === undefined) return;
      ops.push({ op: val ? setOp : deleteOp });
    };

    setOrDeleteValue("description", "set_interface_description", "delete_interface_description");
    setOrDeleteFlag("disabled", "set_interface_disable", "delete_interface_disable");
    setOrDeleteValue("server", "set_server", "delete_server");
    setOrDeleteValue("port", "set_port", "delete_port");

    // Authentication: handle username and password independently
    if (updated.username !== undefined) {
      if (updated.username) ops.push({ op: "set_authentication_username", value: updated.username });
      else if (current.authentication?.username) ops.push({ op: "delete_authentication_username" });
    }
    if (updated.password !== undefined) {
      if (updated.password) ops.push({ op: "set_authentication_password", value: updated.password });
      else if (current.authentication?.password) ops.push({ op: "delete_authentication_password" });
    }

    setOrDeleteValue("ssl_ca_certificate", "set_ssl_ca_certificate", "delete_ssl_ca_certificate");
    setOrDeleteValue("default_route_distance", "set_default_route_distance", "delete_default_route_distance");
    setOrDeleteFlag("no_default_route", "set_no_default_route", "delete_no_default_route");
    setOrDeleteFlag("no_peer_dns", "set_no_peer_dns", "delete_no_peer_dns");
    setOrDeleteValue("mtu", "set_mtu", "delete_mtu");
    setOrDeleteValue("vrf", "set_vrf", "delete_vrf");

    if (ops.length === 0) {
      return { success: true, data: { message: "No changes detected" } };
    }

    return this.batchConfigure(name, ops);
  }

  async deleteInterface(name: string): Promise<VyOSResponse> {
    return this.batchConfigure(name, [{ op: "delete_interface" }]);
  }
}

export const sstpcService = new SstpcService();
