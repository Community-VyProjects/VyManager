/**
 * Demo Management API Service
 *
 * Handles creating, listing, and deleting demo environments.
 */

import { apiClient } from "./client";

export interface DemoCreateResponse {
  org_id: string;
  org_name: string;
  slug: string;
  email: string;
  password: string;
  expires_at: string;
  demo_url: string;
}

export interface DemoInfo {
  org_id: string;
  org_name: string;
  slug: string;
  email: string;
  demo_url: string;
  expires_at: string;
  created_at: string;
  site_count: number;
  instance_count: number;
}

export interface DemoListResponse {
  demos: DemoInfo[];
  total: number;
}

class DemoService {
  async createDemo(): Promise<DemoCreateResponse> {
    return apiClient.post<DemoCreateResponse>("/demo/create");
  }

  async listDemos(): Promise<DemoListResponse> {
    return apiClient.get<DemoListResponse>("/demo/list");
  }

  async deleteDemo(orgId: string): Promise<{ success: boolean; message: string }> {
    return apiClient.delete(`/demo/${orgId}`);
  }
}

export const demoService = new DemoService();
