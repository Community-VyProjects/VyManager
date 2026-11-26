import { apiClient } from "./client";
import type { ApiError, VyOSResponse } from "@/lib/types/api";
import {
  listCreateOps,
  listDeleteOps,
  listUpdateOps,
  ruleDeleteOps,
  ruleSaveOps,
  type PrefixListForm,
  type PrefixListRuleForm,
} from "./prefix-list-save-ops";

// ============================================================================
// Config (GET /vyos/prefix-list/config)
// ============================================================================

/** ipv4 is `policy prefix-list`, ipv6 is `policy prefix-list6`. */
export type PrefixListType = "ipv4" | "ipv6";

export interface PrefixListRule {
  rule_number: number;
  action: string | null;
  description: string | null;
  prefix: string | null;
  ge: number | null;
  le: number | null;
}

export interface PrefixList {
  name: string;
  list_type: PrefixListType;
  description: string | null;
  rules: PrefixListRule[];
}

export interface PrefixListConfigResponse {
  ipv4_lists: PrefixList[];
  ipv6_lists: PrefixList[];
  total_ipv4: number;
  total_ipv6: number;
}

// ============================================================================
// Capabilities (GET /vyos/prefix-list/capabilities)
// ============================================================================

export interface PrefixListRange {
  min: number;
  max: number;
}

export type PrefixListRangeKey = "rule" | "prefix_length_ipv4" | "prefix_length_ipv6";

export interface PrefixListCapabilitiesResponse {
  version: string;
  features: {
    ipv4_prefix_lists: { supported: boolean };
    ipv6_prefix_lists: { supported: boolean };
  };
  values: { rule_actions: string[] };
  ranges: Record<PrefixListRangeKey, PrefixListRange>;
  description_max_length: number;
  instance_name?: string;
  instance_id?: string;
}

// ============================================================================
// Batch (POST /vyos/prefix-list/batch)
// ============================================================================

export interface PrefixListBatchOperation {
  op: string;
  value?: string;
}

/** One commit on one list. Rule ops need rule_number; list ops take none. */
export interface PrefixListBatchRequest {
  list_type: PrefixListType;
  name: string;
  rule_number?: number;
  operations: PrefixListBatchOperation[];
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

export class PrefixListService {
  async getCapabilities(): Promise<PrefixListCapabilitiesResponse> {
    return apiClient.get<PrefixListCapabilitiesResponse>("/vyos/prefix-list/capabilities");
  }

  async getConfig(refresh: boolean = false): Promise<PrefixListConfigResponse> {
    return apiClient.get<PrefixListConfigResponse>("/vyos/prefix-list/config", {
      refresh: refresh.toString(),
    });
  }

  /**
   * Commit one batch; a rejected commit throws its error as an ApiError. An
   * empty op list has nothing to send, so no POST is made.
   */
  async batchConfigure(request: PrefixListBatchRequest): Promise<VyOSResponse> {
    if (request.operations.length === 0) return NO_CHANGES;
    return throwIfFailed(await apiClient.post<VyOSResponse>("/vyos/prefix-list/batch", request));
  }

  // ========================================================================
  // List
  // ========================================================================

  async createPrefixList(listType: PrefixListType, form: PrefixListForm): Promise<VyOSResponse> {
    return this.batchConfigure({
      list_type: listType,
      name: form.name.trim(),
      operations: listCreateOps(form),
    });
  }

  /** Only the list leaves the form changed are sent. */
  async updatePrefixList(original: PrefixList, form: PrefixListForm): Promise<VyOSResponse> {
    return this.batchConfigure({
      list_type: original.list_type,
      name: original.name,
      operations: listUpdateOps(original, form),
    });
  }

  async deletePrefixList(list: PrefixList): Promise<VyOSResponse> {
    return this.batchConfigure({
      list_type: list.list_type,
      name: list.name,
      operations: listDeleteOps(),
    });
  }

  // ========================================================================
  // Rule
  // ========================================================================

  /** Create a rule (original null) or edit one: only changed leaves are sent. */
  async saveRule(
    listType: PrefixListType,
    listName: string,
    ruleNumber: number,
    original: PrefixListRule | null,
    form: PrefixListRuleForm,
  ): Promise<VyOSResponse> {
    return this.batchConfigure({
      list_type: listType,
      name: listName,
      rule_number: ruleNumber,
      operations: ruleSaveOps(original, form),
    });
  }

  async deleteRule(listType: PrefixListType, listName: string, ruleNumber: number): Promise<VyOSResponse> {
    return this.batchConfigure({
      list_type: listType,
      name: listName,
      rule_number: ruleNumber,
      operations: ruleDeleteOps(),
    });
  }

  /** New order of every rule of the list; a rejected commit throws. */
  async reorderRules(listType: PrefixListType, listName: string, ruleNumbers: number[]): Promise<VyOSResponse> {
    return throwIfFailed(
      await apiClient.post<VyOSResponse>("/vyos/prefix-list/reorder", {
        list_type: listType,
        name: listName,
        rule_numbers: ruleNumbers,
      }),
    );
  }
}

export const prefixListService = new PrefixListService();
