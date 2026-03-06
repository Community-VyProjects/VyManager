/**
 * Firewall Zones API Service
 */

import { apiClient } from "./client";
import type {
  ZonesCapabilities,
  ZonesConfigResponse,
  ZoneBatchOperation,
  ZoneBatchRequest,
  VyOSResponse,
  FirewallZone,
} from "./types/firewall-zones";

class FirewallZonesService {
  async getCapabilities(): Promise<ZonesCapabilities> {
    return apiClient.get<ZonesCapabilities>("/vyos/firewall/zones/capabilities");
  }

  async getConfig(refresh = false): Promise<ZonesConfigResponse> {
    return apiClient.get<ZonesConfigResponse>("/vyos/firewall/zones/config", {
      refresh: refresh.toString(),
    });
  }

  async batchConfigure(request: ZoneBatchRequest): Promise<VyOSResponse> {
    return apiClient.post<VyOSResponse>("/vyos/firewall/zones/batch", request);
  }

  // ---------------------------------------------------------------------------
  // Zone provisioning — single-payload create/delete with chains
  // ---------------------------------------------------------------------------

  /**
   * Provision a zone in one atomic transaction:
   * - Creates the zone
   * - Creates IPv4 + IPv6 chains for every pair (both directions), default drop
   * - Wires from-zone assignments
   * - If isFirstZone: also creates LOCAL zone with accept-all rule 100
   */
  async provisionZone(
    name: string,
    config: {
      description?: string | null;
      defaultAction?: string;
      defaultLog?: boolean;
      interfaces?: string[];
      vrfs?: string[];
    },
    existingZones: string[],
    isFirstZone: boolean
  ): Promise<VyOSResponse> {
    const result = await apiClient.post<VyOSResponse>("/vyos/firewall/zones/provision", {
      zone_name: name,
      description: config.description ?? null,
      default_action: config.defaultAction ?? "drop",
      default_log: config.defaultLog ?? false,
      interfaces: config.interfaces ?? [],
      vrfs: config.vrfs ?? [],
      existing_zones: existingZones,
      is_first_zone: isFirstZone,
    });
    if (!result.success) throw new Error(result.error ?? "Failed to provision zone");
    return result;
  }

  /**
   * Deprovision a zone in one atomic transaction:
   * - Deletes the zone
   * - Deletes all IPv4 + IPv6 chains for pairs involving this zone
   * - Removes from-zone references in peer zones
   * - If isLastZone: also deletes the LOCAL zone and LOCAL chains
   */
  async deprovisionZone(
    name: string,
    peerZones: string[],
    isLastZone: boolean
  ): Promise<VyOSResponse> {
    const result = await apiClient.post<VyOSResponse>("/vyos/firewall/zones/deprovision", {
      zone_name: name,
      peer_zones: peerZones,
      is_last_zone: isLastZone,
    });
    if (!result.success) throw new Error(result.error ?? "Failed to deprovision zone");
    return result;
  }

  // ---------------------------------------------------------------------------
  // Zone update helper (description, default action, log, interfaces, vrfs)
  // ---------------------------------------------------------------------------

  async updateZone(
    name: string,
    original: FirewallZone,
    updated: Partial<FirewallZone>,
    capabilities: ZonesCapabilities | null
  ): Promise<VyOSResponse> {
    const ops: ZoneBatchOperation[] = [];

    const newDesc = updated.description ?? null;
    if (newDesc !== original.description) {
      if (newDesc) {
        ops.push({ op: "set_zone_description", value: newDesc });
      } else {
        ops.push({ op: "delete_zone_description" });
      }
    }

    if (updated.default_action !== undefined && updated.default_action !== original.default_action) {
      if (updated.default_action) {
        ops.push({ op: "set_zone_default_action", value: updated.default_action });
      } else {
        ops.push({ op: "delete_zone_default_action" });
      }
    }

    if (updated.default_log !== undefined && updated.default_log !== original.default_log) {
      if (updated.default_log) {
        ops.push({ op: "set_zone_default_log" });
      } else {
        ops.push({ op: "delete_zone_default_log" });
      }
    }

    if (updated.interfaces !== undefined) {
      const oldIfaces = original.interfaces;
      const newIfaces = updated.interfaces;
      for (const iface of oldIfaces) {
        if (!newIfaces.includes(iface)) {
          ops.push({ op: "delete_zone_interface", value: iface });
        }
      }
      for (const iface of newIfaces) {
        if (!oldIfaces.includes(iface)) {
          ops.push({ op: "set_zone_interface", value: iface });
        }
      }
    }

    if (capabilities?.features.member_vrf.supported && updated.vrfs !== undefined) {
      const oldVrfs = original.vrfs;
      const newVrfs = updated.vrfs;
      for (const vrf of oldVrfs) {
        if (!newVrfs.includes(vrf)) {
          ops.push({ op: "delete_zone_member_vrf", value: vrf });
        }
      }
      for (const vrf of newVrfs) {
        if (!oldVrfs.includes(vrf)) {
          ops.push({ op: "set_zone_member_vrf", value: vrf });
        }
      }
    }

    if (ops.length === 0) return { success: true };

    const result = await this.batchConfigure({ zone_name: name, operations: ops });
    if (!result.success) throw new Error(result.error ?? "Failed to update zone");
    return result;
  }

  // ---------------------------------------------------------------------------
  // From-zone policy helpers
  // Uses set_zone_from_ipv4 / set_zone_from_ipv6 — 2-param batch-safe methods
  // that encode "from_zone:chain_name" in a single value field.
  // ---------------------------------------------------------------------------

  async setFromPolicy(
    destZone: string,
    sourceZone: string,
    ipv4Name?: string | null,
    ipv6Name?: string | null
  ): Promise<VyOSResponse> {
    const ops: ZoneBatchOperation[] = [];

    // Ensure from-zone entry exists
    ops.push({ op: "set_zone_from", value: sourceZone });

    // Clear existing assignments before setting new ones
    ops.push({ op: "delete_zone_from_firewall_name", value: sourceZone });
    ops.push({ op: "delete_zone_from_firewall_ipv6_name", value: sourceZone });

    // Set new assignments using the 2-param batch-safe wrappers
    if (ipv4Name) {
      ops.push({ op: "set_zone_from_ipv4", value: `${sourceZone}:${ipv4Name}` });
    }
    if (ipv6Name) {
      ops.push({ op: "set_zone_from_ipv6", value: `${sourceZone}:${ipv6Name}` });
    }

    const result = await this.batchConfigure({ zone_name: destZone, operations: ops });
    if (!result.success) throw new Error(result.error ?? "Failed to set from-zone policy");
    return result;
  }

  async deleteFromPolicy(destZone: string, sourceZone: string): Promise<VyOSResponse> {
    const result = await this.batchConfigure({
      zone_name: destZone,
      operations: [{ op: "delete_zone_from", value: sourceZone }],
    });
    if (!result.success) throw new Error(result.error ?? "Failed to delete from-zone policy");
    return result;
  }

  // ---------------------------------------------------------------------------
  // Intra-zone filtering
  // ---------------------------------------------------------------------------

  async setIntraZone(
    zoneName: string,
    config: { action?: string | null; firewallName?: string | null; firewallIpv6Name?: string | null }
  ): Promise<VyOSResponse> {
    const ops: ZoneBatchOperation[] = [];

    if (config.action) {
      ops.push({ op: "set_zone_intra_zone_action", value: config.action });
    } else {
      ops.push({ op: "delete_zone_intra_zone_action" });
    }

    if (config.firewallName) {
      ops.push({ op: "set_zone_intra_zone_firewall_name", value: config.firewallName });
    } else {
      ops.push({ op: "delete_zone_intra_zone_firewall_name" });
    }

    if (config.firewallIpv6Name) {
      ops.push({ op: "set_zone_intra_zone_firewall_ipv6_name", value: config.firewallIpv6Name });
    } else {
      ops.push({ op: "delete_zone_intra_zone_firewall_ipv6_name" });
    }

    if (ops.length === 0) return { success: true };

    const result = await this.batchConfigure({ zone_name: zoneName, operations: ops });
    if (!result.success) throw new Error(result.error ?? "Failed to configure intra-zone filtering");
    return result;
  }
}

export const firewallZonesService = new FirewallZonesService();
export type { FirewallZone, ZonesCapabilities, ZonesConfigResponse, VyOSResponse };

// ---------------------------------------------------------------------------
// Utility: resolve the VyOS chain name from a source→dest zone pair
// ---------------------------------------------------------------------------

/**
 * Looks up the actual firewall chain name for a given zone pair from the
 * live zone configuration. Uses the stored from_zones/intra_zone_filtering
 * entries rather than constructing a name, so it works regardless of how
 * chains were provisioned.
 */
export function resolveChainName(
  srcZone: string,
  dstZone: string,
  ipVersion: "ipv4" | "ipv6",
  zones: FirewallZone[]
): string | null {
  if (!srcZone || !dstZone) return null;

  // Intra-zone: same source and destination
  if (srcZone === dstZone) {
    const zone = zones.find((z) => z.name === srcZone);
    const intra = zone?.intra_zone_filtering;
    if (!intra) return null;
    return ipVersion === "ipv4"
      ? (intra.firewall_name ?? null)
      : (intra.firewall_ipv6_name ?? null);
  }

  // Regular zone pair: look in dest zone's from_zones for the source zone
  const destZoneObj = zones.find((z) => z.name === dstZone);
  if (!destZoneObj) return null;
  const fromEntry = destZoneObj.from_zones.find((f) => f.from_zone === srcZone);
  if (!fromEntry) return null;
  return ipVersion === "ipv4"
    ? (fromEntry.firewall_name ?? null)
    : (fromEntry.firewall_ipv6_name ?? null);
}
