/** The lab `threshold` range (`numeric --range 1-255`). */
export const IGMP_THRESHOLD = { min: 1, max: 255 } as const;

/** A TTL threshold the lab accepts, or null when the text is not one. */
export function igmpThreshold(text: string): number | null {
  const value = text.trim();
  if (!/^\d{1,3}$/.test(value)) return null;
  const n = Number(value);
  return n >= IGMP_THRESHOLD.min && n <= IGMP_THRESHOLD.max ? n : null;
}

/** The role an interface has when its `role` leaf is unset (lab val_help: downstream is the default). */
export const IGMP_DEFAULT_ROLE = "downstream";

/** The role the router applies: the stored leaf, or the default when it is unset. */
export function igmpEffectiveRole(role: string | null): string {
  return role || IGMP_DEFAULT_ROLE;
}
