import type { SearchIndexer, SearchResult } from "../types";
import { dedupeSearchResults } from "../dedupe";
import { firewallIndexer } from "./firewall-indexer";
import { networkIndexer } from "./network-indexer";
import { routingIndexer } from "./routing-indexer";
import { systemIndexer } from "./system-indexer";
import { loadBalancingIndexer } from "./load-balancing-indexer";
import { pkiIndexer } from "./pki-indexer";
import { configRegistryIndexer } from "./config-registry-indexer";

/** Curated indexers run first; generic config walk fills gaps */
export const dynamicIndexers: SearchIndexer[] = [
  networkIndexer,
  firewallIndexer,
  routingIndexer,
  systemIndexer,
  loadBalancingIndexer,
  pkiIndexer,
  configRegistryIndexer,
];

export async function buildDynamicSearchIndex(): Promise<SearchResult[]> {
  const chunks = await Promise.all(dynamicIndexers.map((indexer) => indexer.index()));
  return dedupeSearchResults(chunks.flat());
}
