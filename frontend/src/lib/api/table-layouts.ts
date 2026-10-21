/**
 * Account-scoped table column layouts. The browser cache is not this API.
 */

import { apiClient } from "./client";
import type { ColumnLayout, TableLayoutsPayload } from "@/lib/table-layout";

class TableLayoutService {
  get(): Promise<TableLayoutsPayload> {
    return apiClient.get<TableLayoutsPayload>("/user/table-layouts");
  }

  save(key: string, layout: ColumnLayout): Promise<TableLayoutsPayload> {
    return apiClient.put<TableLayoutsPayload>(
      `/user/table-layouts/${encodeURIComponent(key)}`,
      layout,
    );
  }

  remove(key: string): Promise<TableLayoutsPayload> {
    return apiClient.delete<TableLayoutsPayload>(
      `/user/table-layouts/${encodeURIComponent(key)}`,
    );
  }
}

export const tableLayoutService = new TableLayoutService();
