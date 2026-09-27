import type { SearchIndexer, SearchResult } from "../types";
import { dedupeSearchResults } from "../dedupe";
import { englishSearchI18n, type SearchI18n } from "../i18n";
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

export async function buildDynamicSearchIndex(
  i18n: SearchI18n = englishSearchI18n
): Promise<SearchResult[]> {
  const chunks = await Promise.all(dynamicIndexers.map((indexer) => indexer.index(i18n)));
  return dedupeSearchResults(chunks.flat());
}
