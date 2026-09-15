/** Appliance (on-box) chrome. Backend VYMANAGER_MODE is the source of truth. */

export function isApplianceMode(status: { appliance?: boolean } | null | undefined): boolean {
  return status?.appliance === true;
}

export function postLoginPath(appliance: boolean): string {
  return appliance ? "/" : "/sites";
}

/**
 * Same-app page path only. Rejects schemes, protocol-relative URLs, login,
 * onboarding, and API/RSC internals so `?from=` cannot break sign-in or
 * bounce the operator off-site.
 */
export function safeReturnPath(from: string | null | undefined): string | null {
  if (from == null) return null;
  const trimmed = from.trim();
  if (!trimmed.startsWith("/") || trimmed.startsWith("//") || trimmed.startsWith("/\\")) {
    return null;
  }
  const pathname = trimmed.split("#")[0].split("?")[0];
  if (pathname.length > 256) return null;
  const lower = pathname.toLowerCase();
  if (lower.startsWith("/%2f") || lower.startsWith("/%5c")) return null;
  if (pathname.includes("\\") || pathname.includes("%")) return null;
  if (!/^\/[A-Za-z0-9/_-]*$/.test(pathname)) return null;
  if (
    pathname === "/login" ||
    pathname === "/onboarding" ||
    pathname === "/api" ||
    pathname.startsWith("/login/") ||
    pathname.startsWith("/onboarding/") ||
    pathname.startsWith("/api/") ||
    pathname.startsWith("/_next/")
  ) {
    return null;
  }
  return pathname;
}

/**
 * Login/OAuth landing. `/sites` still becomes `/` in appliance.
 * `null` means mode unknown (status fetch failed): default `/` so appliance
 * auto-connect can run. VPS then redirects to /sites from AppLayout.
 */
export function afterLoginPath(from: string, appliance: boolean | null): string {
  const dest = safeReturnPath(from);
  if (appliance === false) {
    return dest && dest !== "/sites" ? dest : "/sites";
  }
  if (!dest || dest === "/sites") {
    return "/";
  }
  return dest;
}

export function shouldRedirectToSites(appliance: boolean, hasSession: boolean): boolean {
  return !appliance && !hasSession;
}

/** Site list, create/move/delete, extra instances, org switcher, fleet rollup. */
export function hideSiteInventory(appliance: boolean): boolean {
  return appliance;
}

/** Must match backend/appliance_mode.py and install-vyos.sh. */
const STACK_CONTAINER_PREFIX = "vymanager-";
const STACK_NETWORK_NAME = "vymanager";
const STACK_VOLUME_PREFIX = "/config/containers/vymanager-";

export function isProtectedStackContainer(appliance: boolean, name: string): boolean {
  return appliance && name.startsWith(STACK_CONTAINER_PREFIX);
}

export function isProtectedStackNetwork(appliance: boolean, name: string): boolean {
  return appliance && name === STACK_NETWORK_NAME;
}

export function isProtectedStackVolumePath(appliance: boolean, path: string): boolean {
  return appliance && path.startsWith(STACK_VOLUME_PREFIX);
}

export function isProtectedStackImage(appliance: boolean, image: string): boolean {
  if (!appliance || !image) return false;
  return image.split("/").some((part) => {
    const repo = part.split(":")[0].split("@")[0];
    return repo.startsWith(STACK_CONTAINER_PREFIX);
  });
}
