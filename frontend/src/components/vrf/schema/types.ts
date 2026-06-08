// Declarative schema for VRF configuration editors.
//
// Each field maps to a backend batch op (set_<op> / delete_<op>) and a path in
// the feature's raw_config used to read the current value. The generic
// SchemaEditor renders these and emits the right batch operations.

export type FieldType = "text" | "number" | "select" | "toggle" | "list";

export interface SelectOption {
  value: string;
  label: string;
}

export interface FieldSpec {
  /** Base op name; the editor prefixes `set_`/`delete_`. e.g. "vrf_isis_net". */
  op: string;
  /** Override the delete op (when set/delete don't share a base, e.g. shared deletes). */
  delOp?: string;
  /** Display label. */
  label: string;
  type: FieldType;
  /** Keys into the feature raw_config to read the current value/presence. */
  path: string[];
  /** Fixed args inserted after the context and before the value (e.g. ["level-1"]). */
  args?: string[];
  /** For `list` fields: the delete op clears the whole leaf (no per-value delete), so save = clear + re-add. */
  listClearAll?: boolean;
  /** Options for `select`. */
  options?: SelectOption[];
  placeholder?: string;
  help?: string;
  /** Capability flag (capabilities.features[capability].supported) gating the field. */
  capability?: string;
}

export interface SectionSpec {
  title: string;
  description?: string;
  fields: FieldSpec[];
}

/**
 * A named, repeatable entity (BGP neighbor, OSPF area, DHCP subnet, …).
 * Entities may nest a single child group (e.g. neighbor → address-family).
 */
export interface EntityGroupSpec {
  /** Singular label, e.g. "Neighbor". */
  label: string;
  /** Key (or nested key path) into the parent raw_config holding the entity map, e.g. "neighbor" or ["authentication","md5","key-id"]. */
  rawKey: string | string[];
  /** Base op for creating/deleting an entity: set_<createOp> / delete_<createOp>. */
  createOp: string;
  /** Per-entity flat fields. */
  schema: SectionSpec[];
  /** Placeholder for the new-entity id input. */
  idPlaceholder?: string;
  /** When entity ids come from a fixed enum (e.g. address-family). */
  fixedIds?: SelectOption[];
  /** Fixed args that address this group (e.g. ["ipv4"] for redistribute IPv4), inserted before the entity id. */
  args?: string[];
  /** Optional nested entity groups (e.g. area → range + virtual-link). */
  children?: EntityGroupSpec[];
  /** Capability gate for the whole group. */
  capability?: string;
}
