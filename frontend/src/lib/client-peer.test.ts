import assert from "node:assert/strict";
import http from "node:http";
import { describe, it } from "node:test";
import { AsyncLocalStorage } from "node:async_hooks";
import { currentClientPeer, installClientPeerCapture, runWithClientPeer } from "./client-peer";

describe("client peer capture", () => {
  it("shares the peer store on globalThis so a second module copy can read it", () => {
    const key = Symbol.for("vymanager.loginRateLimitPeer");
    runWithClientPeer("203.0.113.9", () => {
      const store = (globalThis as unknown as Record<symbol, AsyncLocalStorage<string | null>>)[key];
      assert.equal(store.getStore(), "203.0.113.9");
      assert.equal(currentClientPeer(), "203.0.113.9");
    });
  });

  it("records the socket peer and ignores a client forwarded header", async () => {
    installClientPeerCapture();
    installClientPeerCapture();
    const seen: Array<string | null> = [];
    const server = http.createServer((req, res) => {
      seen.push(currentClientPeer());
      seen.push(req.headers["x-forwarded-for"]?.toString() ?? null);
      res.end("ok");
    });
    await new Promise<void>((resolve) => {
      server.listen(0, "127.0.0.1", () => resolve());
    });
    try {
      const address = server.address();
      assert.ok(address && typeof address === "object");
      const response = await fetch(`http://127.0.0.1:${address.port}/`, {
        headers: { "x-forwarded-for": "203.0.113.5", "x-real-ip": "198.51.100.9" },
      });
      assert.equal(response.status, 200);
      assert.equal(seen[0], "127.0.0.1");
      assert.equal(seen[1], "203.0.113.5");
    } finally {
      await new Promise<void>((resolve, reject) => {
        server.close((err) => (err ? reject(err) : resolve()));
      });
    }
  });
});
