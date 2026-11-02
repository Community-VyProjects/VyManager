/**
 * better-auth 1.7 registers generic OAuth on `/callback/:id`. This app already
 * publishes `/oauth2/callback/:id` to identity providers. Keep that redirect
 * URI so existing registrations still match, and rewrite the browser hit onto
 * the handler the new release actually serves.
 */

function trimTrailingSlashes(value: string): string {
  let end = value.length;
  while (end > 0 && value.charCodeAt(end - 1) === 47) end--;
  return end === value.length ? value : value.slice(0, end);
}

/**
 * Join a configured base URL the same way better-auth `withPath` does.
 * A base that already has a path is kept; an origin gets `/api/auth`.
 */
export function authCallbackBase(configuredBaseURL: string): string {
  const trimmed = trimTrailingSlashes(configuredBaseURL);
  const path = trimTrailingSlashes(new URL(trimmed).pathname) || "/";
  if (path !== "/") return trimmed;
  return `${trimmed}/api/auth`;
}

export function publishedOAuthRedirectURI(
  configuredBaseURL: string,
  providerId: string,
): string {
  return `${authCallbackBase(configuredBaseURL)}/oauth2/callback/${providerId}`;
}

const LEGACY_CALLBACK = "/oauth2/callback/";
const HANDLER_CALLBACK = "/callback/";

export function rewriteLegacyOAuthCallbackURL(url: URL): URL {
  if (!url.pathname.includes(LEGACY_CALLBACK)) return url;
  const next = new URL(url);
  next.pathname = url.pathname.replace(LEGACY_CALLBACK, HANDLER_CALLBACK);
  return next;
}

export function isOAuthCallbackPath(pathname: string): boolean {
  return (
    pathname.includes(LEGACY_CALLBACK) ||
    pathname.includes("/api/auth/callback/")
  );
}
