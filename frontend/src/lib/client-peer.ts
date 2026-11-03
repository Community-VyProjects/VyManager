import { AsyncLocalStorage } from "node:async_hooks";
import http from "node:http";
import { normalizePeerAddress } from "@/lib/login-rate-limit";

const peerStorage = new AsyncLocalStorage<string | null>();
let installed = false;

export function currentClientPeer(): string | null {
  return peerStorage.getStore() ?? null;
}

export function runWithClientPeer<T>(peer: string | null, fn: () => T): T {
  return peerStorage.run(normalizePeerAddress(peer), fn);
}

/**
 * Remember the TCP peer for the request Next.js is about to handle.
 * Route handlers cannot see the socket, and Next keeps a client-supplied
 * X-Forwarded-For instead of filling it from the socket. The peer stored
 * here is the address the limiter trusts before any forwarded hop.
 */
export function installClientPeerCapture(): void {
  if (installed) return;
  installed = true;
  const proto = http.Server.prototype;
  const original = proto.emit as (
    this: http.Server,
    event: string | symbol,
    ...args: unknown[]
  ) => boolean;
  proto.emit = function (
    this: http.Server,
    event: string | symbol,
    ...args: unknown[]
  ): boolean {
    if (event !== "request") return original.call(this, event, ...args);
    const req = args[0] as http.IncomingMessage | undefined;
    const peer = normalizePeerAddress(req?.socket?.remoteAddress);
    return peerStorage.run(peer, () => original.call(this, event, ...args));
  } as typeof proto.emit;
}
