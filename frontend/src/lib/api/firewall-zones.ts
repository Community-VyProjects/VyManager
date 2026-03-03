/**
 * Firewall Zones API Service
 */

import { apiClient } from "./client";
import { firewallIPv4Service } from "./firewall-ipv4";
import { firewallIPv6Service } from "./firewall-ipv6";
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
  // Zone CRUD helpers
  // ---------------------------------------------------------------------------

  async createZone(
    name: string,
    config: Partial<FirewallZone>,
    capabilities: ZonesCapabilities | null
  ): Promise<VyOSResponse> {
    const ops: ZoneBatchOperation[] = [{ op: "set_zone" }];

    if (config.description) {
      ops.push({ op: "set_zone_description", value: config.description });
    }
    if (config.default_action) {
      ops.push({ op: "set_zone_default_action", value: config.default_action });
    }
    if (config.default_log) {
      ops.push({ op: "set_zone_default_log" });
    }
    if (config.local_zone) {
      ops.push({ op: "set_zone_local_zone" });
    }

    for (const iface of config.interfaces ?? []) {
      ops.push({ op: "set_zone_interface", value: iface });
    }

    if (capabilities?.features.member_vrf.supported) {
      for (const vrf of config.vrfs ?? []) {
        ops.push({ op: "set_zone_member_vrf", value: vrf });
      }
    }

    if (capabilities?.features.default_firewall.supported && config.default_firewall) {
      if (config.default_firewall.name) {
        ops.push({ op: "set_zone_default_firewall_name", value: config.default_firewall.name });
      }
      if (config.default_firewall.ipv6_name) {
        ops.push({ op: "set_zone_default_firewall_ipv6_name", value: config.default_firewall.ipv6_name });
      }
    }

    const result = await this.batchConfigure({ zone_name: name, operations: ops });
    if (!result.success) throw new Error(result.error ?? "Failed to create zone");
    return result;
  }

  /**
   * Create a zone and automatically provision firewall chains + from-zone
   * assignments for every existing zone pair in both directions.
   *
   * Chain naming: {FROM}-{TO} for IPv4, {FROM}-{TO}-V6 for IPv6.
   * Progress callbacks let the modal display live status.
   */
  async createZoneWithChains(
    name: string,
    config: Partial<FirewallZone>,
    capabilities: ZonesCapabilities | null,
    existingZones: FirewallZone[],
    onProgress?: (step: string) => void
  ): Promise<{ zoneCreated: boolean; chainErrors: string[] }> {
    const chainErrors: string[] = [];

    // 1. Create the zone itself
    onProgress?.("Creating zone…");
    await this.createZone(name, config, capabilities);

    // Non-local zones that are eligible for zone-pair policies
    const peers = existingZones.filter((z) => !z.local_zone);

    // 2. For each existing peer zone, set up both directions
    for (const peer of peers) {
      // ---- Direction A: new zone → peer zone (traffic from NEW to PEER)
      //      firewall zone PEER from NEW firewall name NEW-PEER
      const a4 = `${name}-${peer.name}`;     // IPv4 chain name
      const a6 = `${name}-${peer.name}-V6`;  // IPv6 chain name

      onProgress?.(`Creating chains for ${name} → ${peer.name}…`);
      try {
        await firewallIPv4Service.createCustomChain(a4, `Auto: traffic from ${name} to ${peer.name}`, "drop");
      } catch (e) {
        chainErrors.push(`IPv4 chain ${a4}: ${e instanceof Error ? e.message : String(e)}`);
      }
      try {
        await firewallIPv6Service.createCustomChain(a6, `Auto: traffic from ${name} to ${peer.name} (IPv6)`, "drop");
      } catch (e) {
        chainErrors.push(`IPv6 chain ${a6}: ${e instanceof Error ? e.message : String(e)}`);
      }

      // Assign: zone PEER, from-zone NEW → chain a4 / a6
      onProgress?.(`Assigning policies for ${name} → ${peer.name}…`);
      try {
        await this.setFromPolicy(peer.name, name, a4, a6);
      } catch (e) {
        chainErrors.push(`From-policy ${name}→${peer.name}: ${e instanceof Error ? e.message : String(e)}`);
      }

      // ---- Direction B: peer zone → new zone (traffic from PEER to NEW)
      //      firewall zone NEW from PEER firewall name PEER-NEW
      const b4 = `${peer.name}-${name}`;
      const b6 = `${peer.name}-${name}-V6`;

      onProgress?.(`Creating chains for ${peer.name} → ${name}…`);
      try {
        await firewallIPv4Service.createCustomChain(b4, `Auto: traffic from ${peer.name} to ${name}`, "drop");
      } catch (e) {
        chainErrors.push(`IPv4 chain ${b4}: ${e instanceof Error ? e.message : String(e)}`);
      }
      try {
        await firewallIPv6Service.createCustomChain(b6, `Auto: traffic from ${peer.name} to ${name} (IPv6)`, "drop");
      } catch (e) {
        chainErrors.push(`IPv6 chain ${b6}: ${e instanceof Error ? e.message : String(e)}`);
      }

      // Assign: zone NEW, from-zone PEER → chain b4 / b6
      onProgress?.(`Assigning policies for ${peer.name} → ${name}…`);
      try {
        await this.setFromPolicy(name, peer.name, b4, b6);
      } catch (e) {
        chainErrors.push(`From-policy ${peer.name}→${name}: ${e instanceof Error ? e.message : String(e)}`);
      }
    }

    onProgress?.("Done");
    return { zoneCreated: true, chainErrors };
  }

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

    if (updated.local_zone !== undefined && updated.local_zone !== original.local_zone) {
      if (updated.local_zone) {
        ops.push({ op: "set_zone_local_zone" });
      } else {
        ops.push({ op: "delete_zone_local_zone" });
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

    if (capabilities?.features.default_firewall.supported && updated.default_firewall !== undefined) {
      const newName = updated.default_firewall?.name ?? null;
      const oldName = original.default_firewall?.name ?? null;
      if (newName !== oldName) {
        if (newName) {
          ops.push({ op: "set_zone_default_firewall_name", value: newName });
        } else {
          ops.push({ op: "delete_zone_default_firewall_name" });
        }
      }
      const newIpv6 = updated.default_firewall?.ipv6_name ?? null;
      const oldIpv6 = original.default_firewall?.ipv6_name ?? null;
      if (newIpv6 !== oldIpv6) {
        if (newIpv6) {
          ops.push({ op: "set_zone_default_firewall_ipv6_name", value: newIpv6 });
        } else {
          ops.push({ op: "delete_zone_default_firewall_ipv6_name" });
        }
      }
    }

    if (ops.length === 0) return { success: true };

    const result = await this.batchConfigure({ zone_name: name, operations: ops });
    if (!result.success) throw new Error(result.error ?? "Failed to update zone");
    return result;
  }

  async deleteZone(name: string): Promise<VyOSResponse> {
    const result = await this.batchConfigure({
      zone_name: name,
      operations: [{ op: "delete_zone" }],
    });
    if (!result.success) throw new Error(result.error ?? "Failed to delete zone");
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
