/**
 * Network Interfaces API Service
 * Handles all network interface related API operations for VyOS
 */

import { apiClient } from "./client";

export interface NetworkInterface {
  name: string;
  type: "ethernet" | "wireguard" | "dummy" | "loopback" | "pppoe";
  addresses: string[];
  description: string | null;
  vrf: string | null;
  "hw-id": string | null;
  "source-interface": string | null;
  authentication: unknown | null;
}

export interface InterfacesConfig {
  interfaces: NetworkInterface[];
}

export interface CreateInterfaceRequest {
  name: string;
  type: "ethernet" | "wireguard" | "dummy" | "loopback" | "pppoe";
  addresses?: string[];
  description?: string;
  vrf?: string;
  "hw-id"?: string;
  "source-interface"?: string;
}

export interface UpdateInterfaceRequest extends Partial<CreateInterfaceRequest> {
  name: string;
}

export class InterfacesService {
  /**
   * Get complete interface configuration
   */
  async getConfig(): Promise<InterfacesConfig> {
    return apiClient.get<InterfacesConfig>("/network/interfaces/config");
  }

  /**
   * Create a new interface
   */
  async createInterface(data: CreateInterfaceRequest): Promise<NetworkInterface> {
    return apiClient.post<NetworkInterface>("/network/interfaces", data);
  }

  /**
   * Update an existing interface
   */
  async updateInterface(name: string, data: UpdateInterfaceRequest): Promise<NetworkInterface> {
    return apiClient.put<NetworkInterface>(`/network/interfaces/${name}`, data);
  }

  /**
   * Delete an interface
   */
  async deleteInterface(name: string): Promise<void> {
    return apiClient.delete<void>(`/network/interfaces/${name}`);
  }
}

export const interfacesService = new InterfacesService();
