import type { SearchResult, SearchEntityKind } from "./types";

export type UnifiedViewSelection =
  | { type: "subnet"; data: unknown }
  | { type: "client"; data: unknown };

const UNIFIED_VIEW_KINDS: Partial<Record<SearchEntityKind, UnifiedViewSelection["type"]>> = {
  "dhcp-subnet": "subnet",
  "dhcp-range": "subnet",
  "dhcp-static": "subnet",
  "wireguard-peer": "client",
};

export function getUnifiedViewSelection(result: SearchResult): UnifiedViewSelection | null {
  const type = UNIFIED_VIEW_KINDS[result.kind];
  if (!type) return null;

  if (!result.data) return null;

  return { type, data: result.data };
}
