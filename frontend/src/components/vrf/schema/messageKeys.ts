// Message-key derivation for schema-driven editors.
//
// Schema definitions keep their English labels; the editors translate at
// render time using keys derived from stable schema ids (config paths, ops,
// option values) under the `vrfProtocols.schema` namespace:
//   schema.<scope>.<field>.label   per-entity override
//   schema.fields.<field>.label    shared label for a config path
//   schema.sections.<section>      section titles
//   schema.options.<value>         select / fixed-id option labels
//   schema.<scope>.group.*         entity-list texts (label, plural, add, ...)
// where <scope> is the protocol ("bgp", "ospf", ...) for global settings, or
// derived from an entity group's createOp + args (e.g. "bgpNeighbor").

import { EntityGroupSpec, FieldSpec, SectionSpec } from "./types";

/** camelCase key segment, e.g. "route-map export" → "routeMapExport". */
export function keySegment(s: string): string {
  const words = s
    .split(/[^A-Za-z0-9]+/)
    .filter(Boolean)
    .map((w) => w.toLowerCase());
  const key = words.map((w, i) => (i === 0 ? w : w[0].toUpperCase() + w.slice(1))).join("");
  return /^[0-9]/.test(key) ? `n${key}` : key;
}

export function fieldSegment(field: FieldSpec): string {
  return keySegment(field.path.join(" "));
}

export function sectionSegment(section: SectionSpec): string {
  return keySegment(section.title);
}

export function optionSegment(value: string): string {
  return keySegment(value);
}

export function groupScope(group: EntityGroupSpec): string {
  return keySegment([group.createOp.replace(/^vrf_/, ""), ...(group.args ?? [])].join(" "));
}
