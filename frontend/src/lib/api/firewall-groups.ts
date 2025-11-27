/**
 * Firewall Groups API Service
 * Handles all firewall group operations
 */

import { apiClient } from "./client";
import type {
  GroupsConfigResponse,
  FirewallGroupsCapabilities,
  GroupBatchRequest,
  VyOSResponse,
  GroupBatchOperation,
} from "./types/firewall-groups";

class FirewallGroupsService {
  /**
   * Get firewall groups capabilities based on VyOS version
   */
  async getCapabilities(): Promise<FirewallGroupsCapabilities> {
    return apiClient.get<FirewallGroupsCapabilities>("/vyos/firewall/groups/capabilities");
  }

  /**
   * Get all firewall group configurations
   */
  async getConfig(): Promise<GroupsConfigResponse> {
    return apiClient.get<GroupsConfigResponse>("/vyos/firewall/groups/config");
  }

  /**
   * Configure firewall group using batch operations
   */
  async batchConfigure(request: GroupBatchRequest): Promise<VyOSResponse> {
    return apiClient.post<VyOSResponse>("/vyos/firewall/groups/batch", request);
  }

  /**
   * Create a new firewall group with initial configuration
   */
  async createGroup(
    groupName: string,
    groupType: string,
    config: {
      description?: string;
      members?: string[];
    }
  ): Promise<VyOSResponse> {
    const operations: GroupBatchOperation[] = [];

    // Create the group based on type
    const createOp = this.getCreateOperation(groupType);
    if (createOp) {
      operations.push({ op: createOp });
    }

    // Add description if provided
    if (config.description) {
      const descOp = this.getDescriptionOperation(groupType, "set");
      if (descOp) {
        operations.push({ op: descOp, value: config.description });
      }
    }

    // Add members if provided
    if (config.members && config.members.length > 0) {
      const memberOp = this.getMemberOperation(groupType, "set");
      if (memberOp) {
        config.members.forEach((member) => {
          operations.push({ op: memberOp, value: member });
        });
      }
    }

    return this.batchConfigure({
      group_name: groupName,
      operations,
    });
  }

  /**
   * Update an existing firewall group
   */
  async updateGroup(
    groupName: string,
    groupType: string,
    operations: GroupBatchOperation[]
  ): Promise<VyOSResponse> {
    return this.batchConfigure({
      group_name: groupName,
      operations,
    });
  }

  /**
   * Delete a firewall group
   */
  async deleteGroup(groupName: string, groupType: string): Promise<VyOSResponse> {
    const deleteOp = this.getDeleteOperation(groupType);
    if (!deleteOp) {
      return {
        success: false,
        error: `Unsupported group type: ${groupType}`,
      };
    }

    return this.batchConfigure({
      group_name: groupName,
      operations: [{ op: deleteOp }],
    });
  }

  /**
   * Refresh the configuration cache
   */
  async refreshConfig(): Promise<{ success: boolean }> {
    return apiClient.post<{ success: boolean }>("/vyos/config/refresh");
  }

  // Helper methods to get operation names based on group type

  private getCreateOperation(groupType: string): string | null {
    const map: Record<string, string> = {
      "address-group": "set_address_group",
      "ipv6-address-group": "set_ipv6_address_group",
      "network-group": "set_network_group",
      "ipv6-network-group": "set_ipv6_network_group",
      "port-group": "set_port_group",
      "interface-group": "set_interface_group",
      "mac-group": "set_mac_group",
      "domain-group": "set_domain_group",
      "remote-group": "set_remote_group",
    };
    return map[groupType] || null;
  }

  private getDeleteOperation(groupType: string): string | null {
    const map: Record<string, string> = {
      "address-group": "delete_address_group",
      "ipv6-address-group": "delete_ipv6_address_group",
      "network-group": "delete_network_group",
      "ipv6-network-group": "delete_ipv6_network_group",
      "port-group": "delete_port_group",
      "interface-group": "delete_interface_group",
      "mac-group": "delete_mac_group",
      "domain-group": "delete_domain_group",
      "remote-group": "delete_remote_group",
    };
    return map[groupType] || null;
  }

  private getDescriptionOperation(groupType: string, action: "set" | "delete"): string | null {
    const prefix = action === "set" ? "set" : "delete";
    const map: Record<string, string> = {
      "address-group": `${prefix}_address_group_description`,
      "ipv6-address-group": `${prefix}_ipv6_address_group_description`,
      "network-group": `${prefix}_network_group_description`,
      "ipv6-network-group": `${prefix}_ipv6_network_group_description`,
      "port-group": `${prefix}_port_group_description`,
      "interface-group": `${prefix}_interface_group_description`,
      "mac-group": `${prefix}_mac_group_description`,
      "domain-group": `${prefix}_domain_group_description`,
      "remote-group": `${prefix}_remote_group_description`,
    };
    return map[groupType] || null;
  }

  private getMemberOperation(groupType: string, action: "set" | "delete"): string | null {
    const prefix = action === "set" ? "set" : "delete";
    const map: Record<string, string> = {
      "address-group": `${prefix}_address_group_address`,
      "ipv6-address-group": `${prefix}_ipv6_address_group_address`,
      "network-group": `${prefix}_network_group_network`,
      "ipv6-network-group": `${prefix}_ipv6_network_group_network`,
      "port-group": `${prefix}_port_group_port`,
      "interface-group": `${prefix}_interface_group_interface`,
      "mac-group": `${prefix}_mac_group_mac`,
      "domain-group": `${prefix}_domain_group_address`,
      "remote-group": `${prefix}_remote_group_url`,
    };
    return map[groupType] || null;
  }
}

export const firewallGroupsService = new FirewallGroupsService();
