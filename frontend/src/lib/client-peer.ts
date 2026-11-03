import { AsyncLocalStorage } from "node:async_hooks";
import http from "node:http";
import { normalizePeerAddress } from "@/lib/login-rate-limit";

const STORE_KEY = Symbol.for("vymanager.loginRateLimitPeer");
const INSTALLED_KEY = Symbol.for("vymanager.loginRateLimitPeerInstalled");

type PeerGlobal = typeof globalThis & {
  [STORE_KEY]?: AsyncLocalStorage<string | null>;
  [INSTALLED_KEY]?: boolean;
};

function peerGlobal(): PeerGlobal {
  return globalThis as PeerGlobal;
}

/**
 * One store for the process. Next compiles instrumentation and the route
 * as separate bundles, so a module-level AsyncLocalStorage in this file
 * would not be the store the route reads.
 */
function peerStorage(): AsyncLocalStorage<string | null> {
  const g = peerGlobal();
  if (!g[STORE_KEY]) g[STORE_KEY] = new AsyncLocalStorage();
  return g[STORE_KEY];
}

function nodeHttp(): typeof http {
  const getter = (
    process as NodeJS.Process & {
      getBuiltinModule?: (id: string) => typeof http;
    }
  ).getBuiltinModule;
  return getter ? getter("node:http") : http;
}

export function currentClientPeer(): string | null {
  return peerStorage().getStore() ?? null;
}

export function runWithClientPeer<T>(peer: string | null, fn: () => T): T {
  return peerStorage().run(normalizePeerAddress(peer), fn);
}

/**
 * Remember the TCP peer for the request Next.js is about to handle.
 * Route handlers cannot see the socket, and Next keeps a client-supplied
 * X-Forwarded-For instead of filling it from the socket. The patch is on
 * the real node:http server, not a bundled copy.
 */
export function installClientPeerCapture(): void {
  const g = peerGlobal();
  if (g[INSTALLED_KEY]) return;
  g[INSTALLED_KEY] = true;
  const proto = nodeHttp().Server.prototype;
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
    return peerStorage().run(peer, () => original.call(this, event, ...args));
  } as typeof proto.emit;
}
