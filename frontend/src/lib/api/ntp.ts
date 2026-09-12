import { apiClient } from "./client";

export interface NTPServer {
  name: string;
  noselect: boolean;
  nts: boolean;
  pool: boolean;
  prefer: boolean;
}

export interface NTPTimestampInterface {
  interface: string;
  receive_filter: string;
}

export interface NTPConfig {
  allow_clients: string[];
  interfaces: string[];
  leap_second: string | null;
  listen_addresses: string[];
  servers: NTPServer[];
  timestamp_interfaces: NTPTimestampInterface[];
  vrf: string | null;
}

export interface NTPCapabilities {
  version: string;
  features: {
    ntp: { supported: boolean; description: string };
    allow_client: { supported: boolean; description: string; multi_value: boolean };
    interface: { supported: boolean; description: string; multi_value: boolean };
    leap_second: {
      supported: boolean;
      description: string;
      values: string[];
      default: string;
    };
    listen_address: { supported: boolean; description: string; multi_value: boolean };
    server: {
      supported: boolean;
      description: string;
      flags: Record<string, string>;
    };
    vrf: { supported: boolean; description: string };
    timestamp_receive_filter: {
      supported: boolean;
      description: string;
      values: string[];
    };
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

export interface NTPGlobalSettingsUpdate {
  original: NTPConfig;
  listenAddresses: string[];
  allowClients: string[];
  interfaces: string[];
  leapSecond: string;
  vrf: string;
  timestampInterfaces: NTPTimestampInterface[];
}

export interface NTPServerUpdate {
  name: string;
  noselect: boolean;
  nts: boolean;
  pool: boolean;
  prefer: boolean;
}

class NTPService {
  async getCapabilities(): Promise<NTPCapabilities> {
    return apiClient.get<NTPCapabilities>("/vyos/ntp/capabilities");
  }

  async getConfig(refresh = false): Promise<NTPConfig> {
    return apiClient.get<NTPConfig>("/vyos/ntp/config", {
      refresh: refresh.toString(),
    });
  }

  private async batch(operations: BatchOperation[]): Promise<VyOSResponse> {
    const result = await apiClient.post<VyOSResponse>("/vyos/ntp/batch", {
      operations,
    });
    if (!result.success) throw new Error(result.error || "Operation failed");
    return result;
  }

  async updateGlobalSettings(update: NTPGlobalSettingsUpdate): Promise<VyOSResponse> {
    const ops: BatchOperation[] = [];
    const orig = update.original;

    // Listen addresses
    const addedListen = update.listenAddresses.filter(
      (a) => !orig.listen_addresses.includes(a)
    );
    const removedListen = orig.listen_addresses.filter(
      (a) => !update.listenAddresses.includes(a)
    );
    for (const a of removedListen) ops.push({ op: "delete_listen_address", value: a });
    for (const a of addedListen) ops.push({ op: "set_listen_address", value: a });

    // Allow clients
    const addedClients = update.allowClients.filter(
      (a) => !orig.allow_clients.includes(a)
    );
    const removedClients = orig.allow_clients.filter(
      (a) => !update.allowClients.includes(a)
    );
    for (const a of removedClients) ops.push({ op: "delete_allow_client", value: a });
    for (const a of addedClients) ops.push({ op: "set_allow_client", value: a });

    // Interfaces
    const addedIfaces = update.interfaces.filter(
      (i) => !orig.interfaces.includes(i)
    );
    const removedIfaces = orig.interfaces.filter(
      (i) => !update.interfaces.includes(i)
    );
    for (const i of removedIfaces) ops.push({ op: "delete_interface", value: i });
    for (const i of addedIfaces) ops.push({ op: "set_interface", value: i });

    // Leap second — empty string means "use default" (delete the node)
    const origLeap = orig.leap_second ?? "";
    if (update.leapSecond !== origLeap) {
      if (update.leapSecond === "") {
        ops.push({ op: "delete_leap_second" });
      } else {
        ops.push({ op: "set_leap_second", value: update.leapSecond });
      }
    }

    // VRF — empty string means "no VRF"
    const origVrf = orig.vrf ?? "";
    if (update.vrf !== origVrf) {
      if (update.vrf === "") {
        ops.push({ op: "delete_vrf" });
      } else {
        ops.push({ op: "set_vrf", value: update.vrf });
      }
    }

    // Timestamp interface receive-filters (VyOS 1.5+)
    const origTs = new Map(
      orig.timestamp_interfaces.map((t) => [t.interface, t.receive_filter])
    );
    const newTs = new Map(
      update.timestampInterfaces.map((t) => [t.interface, t.receive_filter])
    );
    for (const [iface, filter] of newTs) {
      if (origTs.get(iface) !== filter) {
        ops.push({ op: "set_timestamp_interface_receive_filter", value: `${iface},${filter}` });
      }
    }
    for (const iface of origTs.keys()) {
      if (!newTs.has(iface)) {
        ops.push({ op: "delete_timestamp_interface_receive_filter", value: iface });
      }
    }

    if (ops.length === 0) return { success: true };
    return this.batch(ops);
  }

  async setServer(
    original: NTPServer | null,
    update: NTPServerUpdate
  ): Promise<VyOSResponse> {
    const ops: BatchOperation[] = [];
    const isCreate = original === null;
    const name = update.name;

    if (isCreate) {
      ops.push({ op: "set_server", value: name });
    }

    const flags: (keyof NTPServerUpdate)[] = ["noselect", "nts", "pool", "prefer"];
    for (const flag of flags) {
      if (flag === "name") continue;
      const newVal = update[flag] as boolean;
      const oldVal = original ? (original[flag as keyof NTPServer] as boolean) : false;
      if (newVal !== oldVal) {
        ops.push({ op: newVal ? `set_server_${flag}` : `delete_server_${flag}`, value: name });
      }
    }

    if (ops.length === 0) return { success: true };
    return this.batch(ops);
  }

  async deleteServer(name: string): Promise<VyOSResponse> {
    return this.batch([{ op: "delete_server", value: name }]);
  }
}

export const ntpService = new NTPService();
