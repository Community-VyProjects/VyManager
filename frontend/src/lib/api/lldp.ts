import { apiClient } from "./client";

export interface LLDPLocationCoordinate {
  altitude?: string | null;
  datum?: string | null;
  latitude?: string | null;
  longitude?: string | null;
}

export interface LLDPLocation {
  coordinate_based?: LLDPLocationCoordinate | null;
  elin?: string | null;
}

export interface LLDPInterface {
  name: string;
  mode: string;
  disabled: boolean;
  location?: LLDPLocation | null;
}

export interface LLDPLegacyProtocols {
  cdp: boolean;
  edp: boolean;
  fdp: boolean;
  sonmp: boolean;
}

export interface LLDPConfig {
  management_addresses: string[];
  snmp_enabled: boolean;
  legacy_protocols: LLDPLegacyProtocols;
  interfaces: LLDPInterface[];
}

export interface LLDPCapabilities {
  version: string;
  features: {
    lldp: { supported: boolean; description: string };
    management_address: { supported: boolean; description: string; multi_value: boolean };
    snmp: { supported: boolean; description: string };
    legacy_protocols: {
      supported: boolean;
      description: string;
      protocols: Record<string, string>;
    };
    interface_mode: {
      supported: boolean;
      description: string;
      values: string[];
      default: string;
    };
    interface_disable_flag: { supported: boolean; description: string };
    location_coordinate_based: {
      supported: boolean;
      description: string;
      datum_values: string[];
    };
    location_elin: { supported: boolean; description: string };
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

export interface LLDPSettingsUpdate {
  original: LLDPConfig;
  managementAddresses: string[];
  snmpEnabled: boolean;
  legacyProtocols: LLDPLegacyProtocols;
}

export interface LLDPInterfaceUpdate {
  name: string;
  mode: string;
  disableFlag: boolean;
  locationCoordinate?: {
    altitude?: string;
    datum?: string;
    latitude?: string;
    longitude?: string;
  };
  locationElin?: string;
  locationType: "none" | "coordinate-based" | "elin";
}

class LLDPService {
  async getCapabilities(): Promise<LLDPCapabilities> {
    return apiClient.get<LLDPCapabilities>("/vyos/lldp/capabilities");
  }

  async getConfig(refresh = false): Promise<LLDPConfig> {
    return apiClient.get<LLDPConfig>("/vyos/lldp/config", {
      refresh: refresh.toString(),
    });
  }

  private async batch(operations: BatchOperation[]): Promise<VyOSResponse> {
    const result = await apiClient.post<VyOSResponse>("/vyos/lldp/batch", {
      operations,
    });
    if (!result.success) throw new Error(result.error || "Operation failed");
    return result;
  }

  async updateSettings(
    update: LLDPSettingsUpdate,
    _caps: LLDPCapabilities
  ): Promise<VyOSResponse> {
    const ops: BatchOperation[] = [];
    const orig = update.original;

    const added = update.managementAddresses.filter(
      (a) => !orig.management_addresses.includes(a)
    );
    const removed = orig.management_addresses.filter(
      (a) => !update.managementAddresses.includes(a)
    );
    for (const ip of removed) ops.push({ op: "delete_management_address", value: ip });
    for (const ip of added) ops.push({ op: "set_management_address", value: ip });

    if (update.snmpEnabled !== orig.snmp_enabled) {
      ops.push(update.snmpEnabled ? { op: "set_snmp" } : { op: "delete_snmp" });
    }

    const protocols: (keyof LLDPLegacyProtocols)[] = ["cdp", "edp", "fdp", "sonmp"];
    for (const proto of protocols) {
      if (update.legacyProtocols[proto] !== orig.legacy_protocols[proto]) {
        ops.push(
          update.legacyProtocols[proto]
            ? { op: "set_legacy_protocol", value: proto }
            : { op: "delete_legacy_protocol", value: proto }
        );
      }
    }

    if (ops.length === 0) return { success: true };
    return this.batch(ops);
  }

  async setInterface(
    original: LLDPInterface | null,
    update: LLDPInterfaceUpdate,
    caps: LLDPCapabilities
  ): Promise<VyOSResponse> {
    const ops: BatchOperation[] = [];
    const isCreate = original === null;
    const name = update.name;

    if (isCreate) {
      ops.push({ op: "set_interface", value: name });
    }

    if (caps.features.interface_mode.supported) {
      const oldMode = original?.mode ?? "rx-tx";
      if (isCreate || update.mode !== oldMode) {
        if (update.mode === "rx-tx") {
          if (!isCreate) ops.push({ op: "delete_interface_mode", value: name });
        } else {
          ops.push({ op: "set_interface_mode", value: `${name},${update.mode}` });
        }
      }
    } else if (caps.features.interface_disable_flag.supported) {
      const wasDisabled = original?.disabled ?? false;
      if (isCreate || update.disableFlag !== wasDisabled) {
        if (update.disableFlag) {
          ops.push({ op: "set_interface_disable", value: name });
        } else if (!isCreate && wasDisabled) {
          ops.push({ op: "delete_interface_disable", value: name });
        }
      }
    }

    const origLocType: "none" | "coordinate-based" | "elin" = !original?.location
      ? "none"
      : original.location.elin != null
      ? "elin"
      : original.location.coordinate_based != null
      ? "coordinate-based"
      : "none";

    if (!isCreate && origLocType !== "none" && origLocType !== update.locationType) {
      if (origLocType === "coordinate-based") {
        ops.push({ op: "delete_interface_location_coordinate_based", value: name });
      } else if (origLocType === "elin") {
        ops.push({ op: "delete_interface_location_elin", value: name });
      }
    }

    if (update.locationType === "coordinate-based" && update.locationCoordinate) {
      const coord = update.locationCoordinate;
      const origCoord = original?.location?.coordinate_based;
      if (coord.latitude && (isCreate || coord.latitude !== origCoord?.latitude)) {
        ops.push({
          op: "set_interface_location_coordinate_latitude",
          value: `${name},${coord.latitude}`,
        });
      }
      if (coord.longitude && (isCreate || coord.longitude !== origCoord?.longitude)) {
        ops.push({
          op: "set_interface_location_coordinate_longitude",
          value: `${name},${coord.longitude}`,
        });
      }
      if (coord.altitude && (isCreate || coord.altitude !== origCoord?.altitude)) {
        ops.push({
          op: "set_interface_location_coordinate_altitude",
          value: `${name},${coord.altitude}`,
        });
      }
      if (coord.datum && (isCreate || coord.datum !== origCoord?.datum)) {
        ops.push({
          op: "set_interface_location_coordinate_datum",
          value: `${name},${coord.datum}`,
        });
      }
    } else if (update.locationType === "elin" && update.locationElin) {
      const origElin = original?.location?.elin;
      if (isCreate || update.locationElin !== origElin) {
        ops.push({
          op: "set_interface_location_elin",
          value: `${name},${update.locationElin}`,
        });
      }
    }

    if (ops.length === 0) return { success: true };
    return this.batch(ops);
  }

  async deleteInterface(name: string): Promise<VyOSResponse> {
    return this.batch([{ op: "delete_interface", value: name }]);
  }
}

export const lldpService = new LLDPService();
