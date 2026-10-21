/**
 * Account-scoped table column layouts. The browser cache is not this API.
 */

import { apiClient } from "./client";
import type { ColumnLayout, TableLayoutsPayload } from "@/lib/table-layout";

class TableLayoutService {
  get(): Promise<TableLayoutsPayload> {
    return apiClient.get<TableLayoutsPayload>("/user/table-layouts");
  }

  save(key: string, layout: ColumnLayout, basedOn: string | null): Promise<TableLayoutsPayload> {
    return apiClient.put<TableLayoutsPayload>(
      `/user/table-layouts/${encodeURIComponent(key)}`,
      basedOn ? { ...layout, basedOn } : layout,
    );
  }

  remove(key: string, basedOn: string | null): Promise<TableLayoutsPayload> {
    const query = basedOn ? `?basedOn=${encodeURIComponent(basedOn)}` : "";
    return apiClient.delete<TableLayoutsPayload>(
      `/user/table-layouts/${encodeURIComponent(key)}${query}`,
    );
  }
}

export const tableLayoutService = new TableLayoutService();
