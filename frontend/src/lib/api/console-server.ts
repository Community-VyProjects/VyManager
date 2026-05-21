import { apiClient } from "./client";

export interface ConsoleDeviceSsh {
  port?: number | null;
}

export interface ConsoleDevice {
  name: string;
  alias?: string | null;
  data_bits?: string | null;
  description?: string | null;
  parity?: string | null;
  speed?: string | null;
  ssh?: ConsoleDeviceSsh | null;
  stop_bits?: string | null;
}

export interface ConsoleServerConfig {
  devices: ConsoleDevice[];
}

export interface ConsoleServerCapabilities {
  version: string;
  features: Record<string, unknown>;
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

class ConsoleServerService {
  async getCapabilities(): Promise<ConsoleServerCapabilities> {
    return apiClient.get<ConsoleServerCapabilities>("/vyos/console-server/capabilities");
  }

  async getConfig(refresh = false): Promise<ConsoleServerConfig> {
    return apiClient.get<ConsoleServerConfig>("/vyos/console-server/config", {
      refresh: refresh.toString(),
    });
  }

  private async batch(operations: BatchOperation[]): Promise<VyOSResponse> {
    const result = await apiClient.post<VyOSResponse>("/vyos/console-server/batch", {
      operations,
    });
    if (!result.success) throw new Error(result.error || "Operation failed");
    return result;
  }

  async saveDevice(original: ConsoleDevice | null, updated: ConsoleDevice): Promise<VyOSResponse> {
    const ops: BatchOperation[] = [];
    const name = updated.name;

    if (!original) {
      // New device — set the device node first, then all configured attributes
      ops.push({ op: "set_device", value: name });

      if (updated.alias) ops.push({ op: "set_device_alias", value: `${name},${updated.alias}` });
      if (updated.description) ops.push({ op: "set_device_description", value: `${name},${updated.description}` });
      if (updated.speed) ops.push({ op: "set_device_speed", value: `${name},${updated.speed}` });
      if (updated.data_bits) ops.push({ op: "set_device_data_bits", value: `${name},${updated.data_bits}` });
      if (updated.parity) ops.push({ op: "set_device_parity", value: `${name},${updated.parity}` });
      if (updated.stop_bits) ops.push({ op: "set_device_stop_bits", value: `${name},${updated.stop_bits}` });
      if (updated.ssh?.port != null) ops.push({ op: "set_device_ssh_port", value: `${name},${updated.ssh.port}` });
    } else {
      // Existing device — only push ops for changed fields
      const origAlias = original.alias ?? null;
      const updAlias = updated.alias || null;
      if (origAlias !== updAlias) {
        if (updAlias) ops.push({ op: "set_device_alias", value: `${name},${updAlias}` });
        else ops.push({ op: "delete_device_alias", value: name });
      }

      const origDesc = original.description ?? null;
      const updDesc = updated.description || null;
      if (origDesc !== updDesc) {
        if (updDesc) ops.push({ op: "set_device_description", value: `${name},${updDesc}` });
        else ops.push({ op: "delete_device_description", value: name });
      }

      const origSpeed = original.speed ?? null;
      const updSpeed = updated.speed || null;
      if (origSpeed !== updSpeed) {
        if (updSpeed) ops.push({ op: "set_device_speed", value: `${name},${updSpeed}` });
        else ops.push({ op: "delete_device_speed", value: name });
      }

      const origDataBits = original.data_bits ?? null;
      const updDataBits = updated.data_bits || null;
      if (origDataBits !== updDataBits) {
        if (updDataBits) ops.push({ op: "set_device_data_bits", value: `${name},${updDataBits}` });
        else ops.push({ op: "delete_device_data_bits", value: name });
      }

      const origParity = original.parity ?? null;
      const updParity = updated.parity || null;
      if (origParity !== updParity) {
        if (updParity) ops.push({ op: "set_device_parity", value: `${name},${updParity}` });
        else ops.push({ op: "delete_device_parity", value: name });
      }

      const origStopBits = original.stop_bits ?? null;
      const updStopBits = updated.stop_bits || null;
      if (origStopBits !== updStopBits) {
        if (updStopBits) ops.push({ op: "set_device_stop_bits", value: `${name},${updStopBits}` });
        else ops.push({ op: "delete_device_stop_bits", value: name });
      }

      const origPort = original.ssh?.port ?? null;
      const updPort = updated.ssh?.port ?? null;
      if (origPort !== updPort) {
        if (updPort != null) ops.push({ op: "set_device_ssh_port", value: `${name},${updPort}` });
        else ops.push({ op: "delete_device_ssh", value: name });
      }
    }

    if (ops.length === 0) return { success: true };
    return this.batch(ops);
  }

  async deleteDevice(deviceName: string): Promise<VyOSResponse> {
    return this.batch([{ op: "delete_device", value: deviceName }]);
  }

  async deleteConsoleServer(): Promise<VyOSResponse> {
    return this.batch([{ op: "delete_console_server" }]);
  }
}

export const consoleServerService = new ConsoleServerService();
