import { apiClient } from "./client";
import type { ApiError, VyOSResponse } from "@/lib/types/api";
import {
  listCreateOps,
  listDeleteOps,
  listUpdateOps,
  ruleDeleteOps,
  ruleSaveOps,
  type AccessListForm,
  type AccessListRuleForm,
} from "./access-list-save-ops";

// ============================================================================
// Config (GET /vyos/access-list/config)
// ============================================================================

/** ipv4 is `policy access-list`, ipv6 is `policy access-list6`. */
export type AccessListType = "ipv4" | "ipv6";

/** One field per lab leaf. IPv6 rules have no host, inverse-mask or destination. */
export interface AccessListRule {
  rule_number: number;
  action: string | null;
  description: string | null;
  source_any: boolean;
  source_host: string | null;
  source_network: string | null;
  source_inverse_mask: string | null;
  /** IPv6 only (always false on IPv4). */
  source_exact_match: boolean;
  destination_any: boolean;
  destination_host: string | null;
  destination_network: string | null;
  destination_inverse_mask: string | null;
}

export interface AccessList {
  /** The IPv4 list number, or the IPv6 list name. */
  number: string;
  list_type: AccessListType;
  description: string | null;
  rules: AccessListRule[];
}

export interface AccessListConfigResponse {
  ipv4_lists: AccessList[];
  ipv6_lists: AccessList[];
  total_ipv4: number;
  total_ipv6: number;
}

// ============================================================================
// Capabilities (GET /vyos/access-list/capabilities)
// ============================================================================

export interface AccessListRange {
  min: number;
  max: number;
}

export type AccessListRangeKey = "rule" | "ipv4_list";

export interface AccessListCapabilitiesResponse {
  version: string;
  features: {
    ipv4_access_lists: { supported: boolean };
    ipv6_access_lists: { supported: boolean };
  };
  values: { rule_actions: string[] };
  ranges: Record<AccessListRangeKey, AccessListRange>;
  /** IPv4 list numbers whose rules need a destination. */
  extended_ranges: AccessListRange[];
  description_max_length: number;
  instance_name?: string;
  instance_id?: string;
}

// ============================================================================
// Batch (POST /vyos/access-list/batch)
// ============================================================================

export interface AccessListBatchOperation {
  op: string;
  value?: string;
}

/** One commit on one list. Rule ops need rule_number; list ops take none. */
export interface AccessListBatchRequest {
  list_type: AccessListType;
  /** The IPv4 list number or the IPv6 list name. */
  name: string;
  rule_number?: number;
  operations: AccessListBatchOperation[];
}

const NO_CHANGES: VyOSResponse = { success: true };

function throwIfFailed(result: VyOSResponse): VyOSResponse {
  if (!result.success) {
    const error: ApiError = { message: result.error || "" };
    throw error;
  }
  return result;
}

// ============================================================================
// API Service
// ============================================================================

export class AccessListService {
  async getCapabilities(): Promise<AccessListCapabilitiesResponse> {
    return apiClient.get<AccessListCapabilitiesResponse>("/vyos/access-list/capabilities");
  }

  async getConfig(refresh: boolean = false): Promise<AccessListConfigResponse> {
    return apiClient.get<AccessListConfigResponse>("/vyos/access-list/config", {
      refresh: refresh.toString(),
    });
  }

  /**
   * Commit one batch; a rejected commit throws its error as an ApiError. An
   * empty op list has nothing to send, so no POST is made.
   */
  async batchConfigure(request: AccessListBatchRequest): Promise<VyOSResponse> {
    if (request.operations.length === 0) return NO_CHANGES;
    return throwIfFailed(await apiClient.post<VyOSResponse>("/vyos/access-list/batch", request));
  }

  // ========================================================================
  // List
  // ========================================================================

  async createAccessList(listType: AccessListType, form: AccessListForm): Promise<VyOSResponse> {
    return this.batchConfigure({
      list_type: listType,
      name: form.name.trim(),
      operations: listCreateOps(form),
    });
  }

  /** Only the list leaves the form changed are sent. */
  async updateAccessList(original: AccessList, form: AccessListForm): Promise<VyOSResponse> {
    return this.batchConfigure({
      list_type: original.list_type,
      name: original.number,
      operations: listUpdateOps(original, form),
    });
  }

  async deleteAccessList(list: AccessList): Promise<VyOSResponse> {
    return this.batchConfigure({
      list_type: list.list_type,
      name: list.number,
      operations: listDeleteOps(),
    });
  }

  // ========================================================================
  // Rule
  // ========================================================================

  /** Create a rule (original null) or edit one: only changed leaves are sent. */
  async saveRule(
    listType: AccessListType,
    listName: string,
    ruleNumber: number,
    original: AccessListRule | null,
    form: AccessListRuleForm,
  ): Promise<VyOSResponse> {
    return this.batchConfigure({
      list_type: listType,
      name: listName,
      rule_number: ruleNumber,
      operations: ruleSaveOps(listType, original, form),
    });
  }

  async deleteRule(listType: AccessListType, listName: string, ruleNumber: number): Promise<VyOSResponse> {
    return this.batchConfigure({
      list_type: listType,
      name: listName,
      rule_number: ruleNumber,
      operations: ruleDeleteOps(),
    });
  }

  /** New order of every rule of the list; a rejected commit throws. */
  async reorderRules(listType: AccessListType, listName: string, ruleNumbers: number[]): Promise<VyOSResponse> {
    return throwIfFailed(
      await apiClient.post<VyOSResponse>("/vyos/access-list/reorder", {
        list_type: listType,
        name: listName,
        rule_numbers: ruleNumbers,
      }),
    );
  }
}

export const accessListService = new AccessListService();
