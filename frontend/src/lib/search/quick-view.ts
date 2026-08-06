import type { SearchResult, SearchEntityKind } from "./types";

export type QuickViewSelection =
  | { type: "subnet"; data: unknown }
  | { type: "client"; data: unknown };

const QUICK_VIEW_KINDS: Partial<Record<SearchEntityKind, QuickViewSelection["type"]>> = {
  "dhcp-subnet": "subnet",
  "dhcp-range": "subnet",
  "dhcp-static": "subnet",
  "wireguard-peer": "client",
};

export function getQuickViewSelection(result: SearchResult): QuickViewSelection | null {
  const type = QUICK_VIEW_KINDS[result.kind];
  if (!type) return null;

  if (!result.data) return null;

  return { type, data: result.data };
}
