import type {
  DHCPBatchOperation,
  DhcpCatalogLeaf,
  DhcpCatalogValue,
  DhcpRoute,
} from "@/lib/api/dhcp";

export type CatalogDraft = Record<string, DhcpCatalogValue>;

function prefix(childId: string | undefined, spec: string): string {
  return childId ? `${childId}|${spec}` : spec;
}

function asText(value: DhcpCatalogValue | undefined): string {
  return typeof value === "string" ? value.trim() : "";
}

function asList(value: DhcpCatalogValue | undefined): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string").map((item) => item.trim()).filter(Boolean);
}

function asRoutes(value: DhcpCatalogValue | undefined): DhcpRoute[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is DhcpRoute => typeof item === "object" && item !== null && "prefix" in item);
}

function asFlag(value: DhcpCatalogValue | undefined): boolean {
  return value === true;
}

export function emptyCatalogDraft(leaves: DhcpCatalogLeaf[]): CatalogDraft {
  const draft: CatalogDraft = {};
  for (const leaf of leaves) {
    if (leaf.kind === "flag") draft[leaf.token] = false;
    else if (leaf.kind === "multi" || leaf.kind === "route") draft[leaf.token] = [];
    else draft[leaf.token] = "";
  }
  return draft;
}

export function catalogDraftFrom(
  leaves: DhcpCatalogLeaf[],
  stored: Record<string, DhcpCatalogValue> | undefined,
): CatalogDraft {
  const draft = emptyCatalogDraft(leaves);
  if (!stored) return draft;
  for (const leaf of leaves) {
    const value = stored[leaf.token];
    if (value === undefined) continue;
    draft[leaf.token] = value;
  }
  return draft;
}

export function catalogOps(
  setOp: string,
  deleteOp: string,
  leaves: DhcpCatalogLeaf[],
  original: CatalogDraft,
  draft: CatalogDraft,
  childId?: string,
): DHCPBatchOperation[] {
  const operations: DHCPBatchOperation[] = [];
  for (const leaf of leaves) {
    const before = original[leaf.token];
    const after = draft[leaf.token];
    if (leaf.kind === "flag") {
      const was = asFlag(before);
      const now = asFlag(after);
      if (was === now) continue;
      operations.push({
        op: now ? setOp : deleteOp,
        value: prefix(childId, leaf.token),
      });
      continue;
    }
    if (leaf.kind === "multi") {
      const prev = asList(before);
      const next = asList(after);
      for (const value of prev) {
        if (!next.includes(value)) {
          operations.push({ op: deleteOp, value: prefix(childId, `${leaf.token}|${value}`) });
        }
      }
      for (const value of next) {
        if (!prev.includes(value)) {
          operations.push({ op: setOp, value: prefix(childId, `${leaf.token}|${value}`) });
        }
      }
      continue;
    }
    if (leaf.kind === "route") {
      const prev = asRoutes(before);
      const next = asRoutes(after).filter((route) => route.prefix.trim() && route.next_hop.trim());
      const nextByPrefix = new Map(next.map((route) => [route.prefix.trim(), route.next_hop.trim()]));
      for (const route of prev) {
        const prefixKey = route.prefix.trim();
        if (!nextByPrefix.has(prefixKey)) {
          operations.push({ op: deleteOp, value: prefix(childId, `${leaf.token}|${prefixKey}`) });
        }
      }
      for (const route of next) {
        const prefixKey = route.prefix.trim();
        const hop = route.next_hop.trim();
        const previous = prev.find((item) => item.prefix.trim() === prefixKey);
        if (!previous || previous.next_hop.trim() !== hop) {
          operations.push({
            op: setOp,
            value: prefix(childId, `${leaf.token}|${prefixKey}|${hop}`),
          });
        }
      }
      continue;
    }
    const prev = asText(before);
    const next = asText(after);
    if (prev === next) continue;
    if (!next) {
      operations.push({ op: deleteOp, value: prefix(childId, leaf.token) });
    } else {
      operations.push({ op: setOp, value: prefix(childId, `${leaf.token}|${next}`) });
    }
  }
  return operations;
}

export function catalogCreateOps(
  setOp: string,
  leaves: DhcpCatalogLeaf[],
  draft: CatalogDraft,
  childId?: string,
): DHCPBatchOperation[] {
  return catalogOps(setOp, setOp, leaves, emptyCatalogDraft(leaves), draft, childId).filter(
    (op) => op.op === setOp,
  );
}
