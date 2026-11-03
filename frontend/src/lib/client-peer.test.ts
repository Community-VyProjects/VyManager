import assert from "node:assert/strict";
import http from "node:http";
import { describe, it } from "node:test";
import { currentClientPeer, installClientPeerCapture } from "./client-peer";

describe("client peer capture", () => {
  it("a second module instance reads the peer stored by the first", async () => {
    const first = await import("./client-peer.ts");
    const second = await import(`./client-peer.ts?instance=${Date.now()}`);
    assert.notEqual(first.currentClientPeer, second.currentClientPeer);
    first.runWithClientPeer("203.0.113.44", () => {
      assert.equal(second.currentClientPeer(), "203.0.113.44");
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
