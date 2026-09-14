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
    message.includes("networkerror") ||
    message.includes("failed to proxy request to backend")
  );
}

/** Postgres first, then frontend, backend last so the API dies after the rest. */
export function stackRestartOrder(name: string): number {
  if (name === "vymanager-postgres") return 0;
  if (name === "vymanager-frontend") return 1;
  if (name === "vymanager-backend") return 2;
  return 3;
}
