import { configSources } from "../config-sources";
import { walkConfig } from "../config-walker";
import { buildLocalized, safeIndex } from "../utils";
import type { SearchIndexer } from "../types";

export const configRegistryIndexer: SearchIndexer = {
  id: "config-registry",
  index: async (i18n) => {
    const chunks = await Promise.all(
      configSources.map((source) =>
        safeIndex(source.id, async () => {
          const data = await source.fetch();
          return buildLocalized(i18n, (l) =>
            walkConfig(
              data,
              {
                sourceId: source.id,
                feature: source.feature,
                hrefBase: source.hrefBase,
                hrefParams: source.hrefParams,
                kind: source.kind,
              },
              l
            )
          );
        })
      )
    );
    return chunks.flat();
  },
};
