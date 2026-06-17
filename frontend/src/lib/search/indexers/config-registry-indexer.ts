import { configSources } from "../config-sources";
import { walkConfig } from "../config-walker";
import { safeIndex } from "../utils";
import type { SearchIndexer } from "../types";

export const configRegistryIndexer: SearchIndexer = {
  id: "config-registry",
  index: async () => {
    const chunks = await Promise.all(
      configSources.map((source) =>
        safeIndex(source.id, async () => {
          const data = await source.fetch();
          return walkConfig(data, {
            sourceId: source.id,
            feature: source.feature,
            hrefBase: source.hrefBase,
            hrefParams: source.hrefParams,
            kind: source.kind,
          });
        })
      )
    );
    return chunks.flat();
  },
};
