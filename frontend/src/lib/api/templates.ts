import { apiClient } from "./client";

// ============================================================================
// TypeScript Interfaces
// ============================================================================

export type TemplateCategory =
  | "FIREWALL"
  | "NAT"
  | "ROUTING"
  | "VPN"
  | "INTERFACE"
  | "SERVICE"
  | "OTHER";

export interface TemplateVariable {
  name: string;
  description?: string;
  default_value?: string;
  required: boolean;
}

export interface ConfigTemplate {
  id: string;
  name: string;
  description: string | null;
  category: TemplateCategory;
  config: Record<string, unknown>;
  variables: TemplateVariable[] | null;
  isPublic: boolean;
  createdBy: string;
  createdByName: string;
  createdAt: string;
  updatedAt: string;
}

export interface TemplatesListResponse {
  templates: ConfigTemplate[];
  total: number;
}

export interface CreateTemplateRequest {
  name: string;
  description?: string;
  category: TemplateCategory;
  config: Record<string, unknown>;
  variables?: TemplateVariable[];
  isPublic?: boolean;
}

export interface UpdateTemplateRequest {
  name?: string;
  description?: string;
  category?: TemplateCategory;
  config?: Record<string, unknown>;
  variables?: TemplateVariable[];
  isPublic?: boolean;
}

export interface ApplyTemplateRequest {
  variable_values: Record<string, string>;
}

export interface ApplyTemplateResponse {
  success: boolean;
  commands_applied: number;
  message: string;
}

// ============================================================================
// Category Metadata
// ============================================================================

export const TEMPLATE_CATEGORIES: Record<TemplateCategory, { label: string; description: string }> = {
  FIREWALL: { label: "Firewall", description: "Firewall rules and zones" },
  NAT: { label: "NAT", description: "Network Address Translation rules" },
  ROUTING: { label: "Routing", description: "Static routes and routing protocols" },
  VPN: { label: "VPN", description: "VPN configurations (IPsec, OpenVPN, WireGuard)" },
  INTERFACE: { label: "Interface", description: "Interface configurations" },
  SERVICE: { label: "Service", description: "System services (DHCP, DNS, NTP)" },
  OTHER: { label: "Other", description: "Miscellaneous configurations" },
};

// ============================================================================
// API Service
// ============================================================================

class TemplatesService {
  /**
   * List configuration templates
   */
  async listTemplates(params?: {
    category?: TemplateCategory;
    include_public?: boolean;
    my_only?: boolean;
  }): Promise<TemplatesListResponse> {
    const searchParams = new URLSearchParams();
    if (params?.category) searchParams.set("category", params.category);
    if (params?.include_public !== undefined)
      searchParams.set("include_public", String(params.include_public));
    if (params?.my_only !== undefined)
      searchParams.set("my_only", String(params.my_only));

    const query = searchParams.toString();
    return apiClient.get<TemplatesListResponse>(`/config/templates${query ? `?${query}` : ""}`);
  }

  /**
   * Get a single template by ID
   */
  async getTemplate(templateId: string): Promise<ConfigTemplate> {
    return apiClient.get<ConfigTemplate>(`/config/templates/${templateId}`);
  }

  /**
   * Create a new template
   */
  async createTemplate(data: CreateTemplateRequest): Promise<ConfigTemplate> {
    return apiClient.post<ConfigTemplate>("/config/templates", data);
  }

  /**
   * Update an existing template
   */
  async updateTemplate(templateId: string, data: UpdateTemplateRequest): Promise<ConfigTemplate> {
    return apiClient.put<ConfigTemplate>(`/config/templates/${templateId}`, data);
  }

  /**
   * Delete a template
   */
  async deleteTemplate(templateId: string): Promise<{ success: boolean }> {
    return apiClient.delete<{ success: boolean }>(`/config/templates/${templateId}`);
  }

  /**
   * Apply a template to the current instance
   */
  async applyTemplate(
    templateId: string,
    data: ApplyTemplateRequest
  ): Promise<ApplyTemplateResponse> {
    return apiClient.post<ApplyTemplateResponse>(`/config/templates/${templateId}/apply`, data);
  }
}

export const templatesService = new TemplatesService();
