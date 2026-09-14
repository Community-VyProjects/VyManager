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
  // Dev compose and on-box UI listen on a non-http(s) port. The API is :8000
  // on the same host. Same-origin /api does not upgrade WebSockets.
  if (opts.port && opts.port !== "80" && opts.port !== "443") {
    return `${proto}://${opts.hostname}:8000`;
  }
  const host = opts.port ? `${opts.hostname}:${opts.port}` : opts.hostname;
  return `${proto}://${host}`;
}
