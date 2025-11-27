import { apiClient } from "./client";

// OSPF MD5 authentication key
export interface OSPFMD5Key {
  key_id: string;
  "md5-key"?: string | null; // Hidden in output
}

// OSPF interface authentication
export interface OSPFInterfaceAuthentication {
  md5?: Record<string, Record<string, OSPFMD5Key>> | null;
  "plaintext-password"?: string | null;
}

// OSPF interface-specific configuration
export interface OSPFInterface {
  interface_name: string;
  authentication?: OSPFInterfaceAuthentication | null;
  cost?: string | null;
  "dead-interval"?: string | null;
  "hello-interval"?: string | null;
  network?: string | null; // Network type (broadcast, point-to-point, etc.)
  priority?: string | null;
  "retransmit-interval"?: string | null;
  "transmit-delay"?: string | null;
}

// OSPF area configuration
export interface OSPFArea {
  area_id: string;
  authentication?: string | null; // Authentication type (plaintext, md5)
  networks: string[]; // Networks in this area
}

// OSPF parameters
export interface OSPFParameters {
  "router-id"?: string | null;
  "abr-type"?: string | null;
}

// OSPF route redistribution
export interface OSPFRedistribute {
  connected?: Record<string, any> | null;
  static?: Record<string, any> | null;
  bgp?: Record<string, any> | null;
}

// Complete OSPF configuration
export interface OSPFConfig {
  router_id?: string | null;
  areas: Record<string, OSPFArea>;
  interfaces: Record<string, OSPFInterface>;
  parameters?: OSPFParameters | null;
  redistribute?: OSPFRedistribute | null;
  "passive-interface": string[]; // Passive interfaces
}

// Summary of an OSPF area for display
export interface OSPFAreaSummary {
  area_id: string;
  authentication?: string | null;
  network_count: number;
  networks: string[];
}

class OSPFService {
  /**
   * Get complete OSPF configuration
   */
  async getConfig(): Promise<OSPFConfig> {
    return apiClient.get<OSPFConfig>("/routing/ospf/config");
  }

  /**
   * Get all OSPF areas as a flat list
   */
  async getAreas(): Promise<OSPFAreaSummary[]> {
    return apiClient.get<OSPFAreaSummary[]>("/routing/ospf/areas");
  }
}

export const ospfService = new OSPFService();
