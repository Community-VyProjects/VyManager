/** Appliance (on-box) chrome. Backend VYMANAGER_MODE is the source of truth. */

export function isApplianceMode(status: { appliance?: boolean } | null | undefined): boolean {
  return status?.appliance === true;
}

export function postLoginPath(appliance: boolean): string {
  return appliance ? "/" : "/sites";
}

/**
 * Login/OAuth landing. `/sites` still becomes `/` in appliance.
 * `null` means mode unknown (status fetch failed): default `/` so appliance
 * auto-connect can run. VPS then redirects to /sites from AppLayout.
 */
export function afterLoginPath(from: string, appliance: boolean | null): string {
  if (appliance === false) {
    if (!from || from === "/login" || from === "/onboarding") {
      return "/sites";
    }
    return from === "/sites" ? "/sites" : from;
  }
  if (!from || from === "/login" || from === "/onboarding" || from === "/sites") {
    return "/";
  }
  return from;
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
