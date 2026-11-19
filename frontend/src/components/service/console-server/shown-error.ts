/** API failures are often plain objects. Empty and the client's English fallbacks use the caller's translated string. */
const ENGLISH_FALLBACKS = new Set(["Operation failed", "Command failed"]);

export function shownError(err: unknown, fallback: string): string {
  let message = "";
  if (err instanceof Error) {
    message = err.message;
  } else if (err && typeof err === "object" && "message" in err) {
    const raw = (err as { message: unknown }).message;
    if (typeof raw === "string") message = raw;
  }
  if (!message || ENGLISH_FALLBACKS.has(message)) return fallback;
  return message;
}
