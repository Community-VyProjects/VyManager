/** Appliance (on-box) chrome. Backend VYMANAGER_MODE is the source of truth. */

export function isApplianceMode(status: { appliance?: boolean } | null | undefined): boolean {
  return status?.appliance === true;
}

export function postLoginPath(appliance: boolean): string {
  return appliance ? "/" : "/sites";
}

/** Login/OAuth landing. A `/sites` from-param still becomes `/` in appliance. */
export function afterLoginPath(from: string, appliance: boolean): string {
  if (!from || from === "/login" || from === "/onboarding" || from === "/sites") {
    return postLoginPath(appliance);
  }
  return from;
}

export function shouldRedirectToSites(appliance: boolean, hasSession: boolean): boolean {
  return !appliance && !hasSession;
}
