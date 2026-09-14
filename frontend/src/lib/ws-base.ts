/** Browser WebSocket origin for console and monitoring. */
export function websocketBaseUrl(opts: {
  protocol: string;
  hostname: string;
  port: string;
  explicit?: string;
}): string {
  const proto = opts.protocol === "https:" ? "wss" : "ws";
  if (opts.explicit) {
    return opts.explicit;
  }
  // Compose/dev UI is :3000 and talks to the API on :8000 on the same host.
  if (opts.port === "3000") {
    return `${proto}://${opts.hostname}:8000`;
  }
  const host = opts.port ? `${opts.hostname}:${opts.port}` : opts.hostname;
  return `${proto}://${host}`;
}
