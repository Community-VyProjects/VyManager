/**
 * Routing API Service
 * Handles all routing-related API operations for VyOS
 */

import { apiClient } from "./client";

export interface StaticRoute {
  destination: string;
  next_hop: string;
  interface: string | null;
  distance: number | null;
  description: string | null;
}

export interface RoutingTableEntry {
  destination: string;
  route_type: string; // S=Static, C=Connected, L=Local, K=Kernel, etc.
  is_selected: boolean;
  is_fib: boolean;
  protocol_codes: string;
  via: string | null;
  interface: string;
  is_connected: boolean;
  admin_distance: number | null;
  metric: number | null;
  weight: number | null;
  age: string;
}

export interface RoutingTableResponse {
  routes: RoutingTableEntry[];
  total_routes?: number;
}

export class RoutesService {
  /**
   * Get static routes configuration
   */
  async getStaticRoutes(): Promise<StaticRoute[]> {
    return apiClient.get<StaticRoute[]>("/network/routes/static");
  }

  /**
   * Get complete routing table
   */
  async getRoutingTable(): Promise<RoutingTableResponse> {
    return apiClient.get<RoutingTableResponse>("/system/ip/route");
  }
}

export const routesService = new RoutesService();
