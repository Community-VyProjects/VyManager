/** Thrown API failures are plain objects, not Error. */
export function thrownMessage(err: unknown): string {
  if (err instanceof Error && err.message) {
    return err.message;
  }
  if (err && typeof err === "object" && "message" in err) {
    const message = (err as { message: unknown }).message;
    if (typeof message === "string" && message) {
      return message;
    }
  }
  return "Command failed";
}

export function isDisconnectError(err: unknown): boolean {
  const message = thrownMessage(err).toLowerCase();
  return (
    message.includes("failed to fetch") ||
    message.includes("network error") ||
    message.includes("load failed") ||
    message.includes("networkerror")
  );
}
