/**
 * Account-scoped table column layouts. The browser cache is not this API.
 */

import { apiClient } from "./client";
import type { ColumnLayout, TableLayoutsPayload } from "@/lib/table-layout";

class TableLayoutService {
  get(userId: string): Promise<TableLayoutsPayload> {
    const query = new URLSearchParams({ asUser: userId });
    return apiClient.get<TableLayoutsPayload>(`/user/table-layouts?${query.toString()}`).then((payload) => {
      if (payload.userId !== userId) {
        throw Object.assign(new Error("Signed-in user changed"), { status: 403 });
      }
      return payload;
    });
  }

  save(key: string, layout: ColumnLayout, basedOn: string | null, userId: string): Promise<TableLayoutsPayload> {
    const query = new URLSearchParams();
    if (basedOn) query.set("basedOn", basedOn);
    query.set("asUser", userId);
    return apiClient.put<TableLayoutsPayload>(
      `/user/table-layouts/${encodeURIComponent(key)}?${query.toString()}`,
      layout,
    );
  }

  remove(key: string, basedOn: string | null, userId: string): Promise<TableLayoutsPayload> {
    const query = new URLSearchParams();
    if (basedOn) query.set("basedOn", basedOn);
    query.set("asUser", userId);
    return apiClient.delete<TableLayoutsPayload>(
      `/user/table-layouts/${encodeURIComponent(key)}?${query.toString()}`,
    );
  }
}

export const tableLayoutService = new TableLayoutService();
