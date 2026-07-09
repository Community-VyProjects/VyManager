/**
 * Active organization context.
 *
 * Holds the org the admin surface is currently acting in, so the API service
 * layer can attach `?org_id=` to org-scoped endpoints without importing the
 * store (avoids a cycle). The org store is the source of truth and keeps this
 * in sync; single-org users never set it (the endpoints default to the sole
 * org server-side).
 */
let activeOrgId: string | null = null;

export function getActiveOrgId(): string | null {
  return activeOrgId;
}

export function setActiveOrgId(id: string | null): void {
  activeOrgId = id;
}

/** `?org_id=…` when an org is selected, otherwise an empty string. */
export function orgQuery(prefix: "?" | "&" = "?"): string {
  return activeOrgId ? `${prefix}org_id=${encodeURIComponent(activeOrgId)}` : "";
}
