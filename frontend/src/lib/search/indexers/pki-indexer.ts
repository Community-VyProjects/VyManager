import { pkiService } from "@/lib/api/pki";
import { ShieldCheck } from "lucide-react";
import { buildHref, buildLocalized, createSearchResult, safeIndex } from "../utils";
import type { SearchIndexer, SearchResult } from "../types";
import type { SearchI18n } from "../i18n";

const FEATURE = "PKI";

function indexPki(config: Awaited<ReturnType<typeof pkiService.getConfig>>, i18n: SearchI18n): SearchResult[] {
  const results: SearchResult[] = [];
  const l = i18n.label;

  config.dh?.forEach((d) => {
    results.push(
      createSearchResult({
        id: `pki-dh-${d.name}`,
        title: d.name,
        subtitle: `PKI · ${l("DH Parameters")}`,
        description: i18n.t("pki.dhDescription"),
        kind: "pki-dh",
        feature: FEATURE,
        subcategory: `PKI · ${l("DH Parameters")}`,
        href: buildHref("/pki", { tab: "dh" }),
        icon: ShieldCheck,
        keywords: ["dh", l("parameters"), d.name, "pki"],
        data: d,
      })
    );
  });

  config.certificates?.forEach((cert) => {
    results.push(
      createSearchResult({
        id: `pki-cert-${cert.name}`,
        title: cert.name,
        subtitle: `PKI · ${l("Certificate")}`,
        description: cert.description || i18n.t("pki.certificateDescription"),
        kind: "pki-certificate",
        feature: FEATURE,
        subcategory: `PKI · ${l("Certificates")}`,
        href: buildHref("/pki", { tab: "certificates" }),
        icon: ShieldCheck,
        keywords: [l("certificate"), cert.name, cert.description ?? ""],
        data: cert,
      })
    );
  });

  return results;
}

export const pkiIndexer: SearchIndexer = {
  id: "pki",
  index: async (i18n) =>
    safeIndex("pki", async () => {
      const config = await pkiService.getConfig();
      return buildLocalized(i18n, (l) => indexPki(config, l));
    }),
};
