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
