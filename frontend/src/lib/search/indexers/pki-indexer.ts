import { pkiService } from "@/lib/api/pki";
import { ShieldCheck } from "lucide-react";
import { buildHref, createSearchResult, safeIndex } from "../utils";
import type { SearchIndexer, SearchResult } from "../types";

const FEATURE = "PKI";

export const pkiIndexer: SearchIndexer = {
  id: "pki",
  index: async () =>
    safeIndex("pki", async () => {
      const config = await pkiService.getConfig();
      const results: SearchResult[] = [];

      config.dh?.forEach((d) => {
        results.push(
          createSearchResult({
            id: `pki-dh-${d.name}`,
            title: d.name,
            subtitle: "PKI · DH Parameters",
            description: "Diffie-Hellman parameters",
            kind: "pki-dh",
            feature: FEATURE,
            subcategory: "PKI · DH Parameters",
            href: buildHref("/pki", { tab: "dh" }),
            icon: ShieldCheck,
            keywords: ["dh", "parameters", d.name, "pki"],
            data: d,
          })
        );
      });

      config.certificates?.forEach((cert) => {
        results.push(
          createSearchResult({
            id: `pki-cert-${cert.name}`,
            title: cert.name,
            subtitle: "PKI · Certificate",
            description: cert.description || "PKI certificate",
            kind: "pki-certificate",
            feature: FEATURE,
            subcategory: "PKI · Certificates",
            href: buildHref("/pki", { tab: "certificates" }),
            icon: ShieldCheck,
            keywords: ["certificate", cert.name, cert.description ?? ""],
            data: cert,
          })
        );
      });

      return results;
    }),
};
