/**
 * Lightweight client-side error capture.
 *
 * Keeps a small rolling buffer of recent runtime errors so the bug reporter can
 * auto-attach them — users no longer have to hunt for and paste a stack trace.
 *
 * Sources captured:
 *   - uncaught exceptions          (window "error")
 *   - unhandled promise rejections (window "unhandledrejection")
 *   - React render errors          (recorded by ErrorBoundary)
 *   - failed backend requests      (recorded by the API client, 5xx/network)
 *
 * Everything captured here is still passed through the backend's redaction
 * before it can be submitted, so stacks that embed paths/hosts are scrubbed.
 */

export type CapturedErrorKind = "error" | "unhandledrejection" | "react" | "api";

export interface CapturedError {
  time: number;
  kind: CapturedErrorKind;
  message: string;
  stack?: string;
  source?: string;
}

const MAX_ERRORS = 15;
const MAX_REPORT_CHARS = 20000;

const buffer: CapturedError[] = [];
let installed = false;

export function recordError(entry: CapturedError): void {
  buffer.push(entry);
  if (buffer.length > MAX_ERRORS) buffer.shift();
}

export function getRecentErrors(): CapturedError[] {
  return [...buffer];
}

export function hasRecentErrors(): boolean {
  return buffer.length > 0;
}

export function clearRecentErrors(): void {
  buffer.length = 0;
}

/**
 * Record a failed backend request. Called by the API client.
 *
 * `payload` is the request body (e.g. a batch operations array). Including it is
 * the single most useful thing for diagnosing config failures — most VyOS 400s
 * are an app bug in how operations were batched, which is only visible from the
 * actual payload. Secrets in it are scrubbed by the backend redaction on submit.
 */
export function recordApiError(
  endpoint: string,
  status: number,
  message: string,
  payload?: string,
): void {
  let stack: string | undefined;
  if (payload) {
    const trimmed = payload.length > 4000 ? `${payload.slice(0, 4000)} …(truncated)` : payload;
    stack = `Request payload:\n${trimmed}`;
  }
  recordError({
    time: Date.now(),
    kind: "api",
    message: `${status || "network"} ${message}`.trim(),
    stack,
    source: endpoint,
  });
}

/** Render the buffered errors as plain text suitable for an issue body. */
export function formatErrorsForReport(errors: CapturedError[] = buffer): string {
  if (errors.length === 0) return "";
  const text = errors
    .map((e) => {
      const when = new Date(e.time).toISOString();
      const head = `[${when}] (${e.kind}) ${e.message}`;
      const src = e.source ? `\n  at ${e.source}` : "";
      const stack = e.stack ? `\n${e.stack}` : "";
      return head + src + stack;
    })
    .join("\n\n---\n\n");
  return text.length > MAX_REPORT_CHARS
    ? text.slice(text.length - MAX_REPORT_CHARS) // keep the most recent tail
    : text;
}

/** Install the global listeners once (no-op on the server or if already done). */
export function installGlobalErrorCapture(): void {
  if (installed || typeof window === "undefined") return;
  installed = true;

  window.addEventListener("error", (event: ErrorEvent) => {
    // Ignore resource-load errors (img/script); those target an element, not window.
    if (event.target && event.target !== window) return;
    const err = event.error as Error | undefined;
    recordError({
      time: Date.now(),
      kind: "error",
      message: err?.message || event.message || "Uncaught error",
      stack: err?.stack,
      source: event.filename ? `${event.filename}:${event.lineno}:${event.colno}` : undefined,
    });
  });

  window.addEventListener("unhandledrejection", (event: PromiseRejectionEvent) => {
    const reason = event.reason;
    const message =
      reason instanceof Error
        ? reason.message
        : typeof reason === "string"
          ? reason
          : "Unhandled promise rejection";
    recordError({
      time: Date.now(),
      kind: "unhandledrejection",
      message,
      stack: reason instanceof Error ? reason.stack : undefined,
    });
  });
}
