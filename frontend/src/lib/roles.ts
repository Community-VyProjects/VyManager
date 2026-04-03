/**
 * Role utility helpers for the PROJECT_ADMIN / ORG_ADMIN / VIEWER system.
 */

/** Platform-level admin roles */
const ADMIN_ROLES = new Set(["PROJECT_ADMIN", "ORG_ADMIN", "ADMIN"]);

/** Check if a role has admin-level access (PROJECT_ADMIN, ORG_ADMIN, or legacy ADMIN) */
export function isAdminRole(role: string | null | undefined): boolean {
  return !!role && ADMIN_ROLES.has(role);
}

/** Check if a role has project-wide admin access (access all orgs) */
export function isProjectAdmin(role: string | null | undefined): boolean {
  return role === "PROJECT_ADMIN" || role === "ADMIN";
}

/** Human-readable role label */
export function roleLabel(role: string): string {
  switch (role) {
    case "PROJECT_ADMIN": return "Project Admin";
    case "ORG_ADMIN": return "Org Admin";
    case "ADMIN": return "Admin";
    case "VIEWER": return "Viewer";
    default: return role;
  }
}
