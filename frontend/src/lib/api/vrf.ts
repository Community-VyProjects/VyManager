/**
 * VRF API Service
 * Handles all VRF (Virtual Routing and Forwarding) related API operations for VyOS
 */

import { apiClient } from "./client";

export interface VRFRouteInterface {
  vrf: string;
}

export interface VRFRoute {
  destination: string;
  interface: Record<string, VRFRouteInterface>;
  "next-hop": string | null;
}

export interface VRFProtocolsStatic {
  routes: Record<string, VRFRoute>;
}

export interface VRFProtocols {
  static: VRFProtocolsStatic;
}

export interface VRF {
  name: string;
  table: string;
  description: string | null;
  protocols: VRFProtocols;
}

export interface VRFConfig {
  vrfs: Record<string, VRF>;
  "bind-to-all": boolean;
}

export interface VRFFlatRoute {
  vrf: string;
  destination: string;
  interface_name: string;
  target_vrf: string;
}

export class VRFService {
  /**
   * Get complete VRF configuration
   */
  async getConfig(): Promise<VRFConfig> {
    return apiClient.get<VRFConfig>("/network/vrf/config");
  }

  /**
   * Get all VRF static routes as a flat list
   */
  async getRoutes(): Promise<VRFFlatRoute[]> {
    return apiClient.get<VRFFlatRoute[]>("/network/vrf/routes");
  }
}

export const vrfService = new VRFService();
