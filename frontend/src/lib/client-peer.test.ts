import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import http from "node:http";
import https from "node:https";
import os from "node:os";
import path from "node:path";
import { describe, it } from "node:test";
import { CLIENT_IP_HEADER, betterAuthIpAddress, rateLimitAddress } from "./login-rate-limit";
import { getIP } from "@better-auth/core/utils/ip";
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
      seen.push(req.headers["x-vymanager-client-ip"]?.toString() ?? null);
      seen.push(req.headers["x-real-ip"]?.toString() ?? null);
      res.end("ok");
    });
    await new Promise<void>((resolve) => {
      server.listen(0, "127.0.0.1", () => resolve());
    });
    try {
      const address = server.address();
      assert.ok(address && typeof address === "object");
      const response = await fetch(`http://127.0.0.1:${address.port}/`, {
        headers: {
          "x-forwarded-for": "203.0.113.5",
          "x-real-ip": "198.51.100.9",
          "x-vymanager-client-ip": "8.8.8.8",
        },
      });
      assert.equal(response.status, 200);
      assert.equal(seen[0], "127.0.0.1");
      assert.equal(seen[1], "127.0.0.1");
      assert.equal(seen[2], "127.0.0.1");
      assert.equal(seen[3], null);
    } finally {
      await new Promise<void>((resolve, reject) => {
        server.close((err) => (err ? reject(err) : resolve()));
      });
    }
  });

  it("captures the peer on https.Server, which does not inherit http.Server", async () => {
    installClientPeerCapture();
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "vymanager-peer-"));
    const key = path.join(dir, "key.pem");
    const cert = path.join(dir, "cert.pem");
    execFileSync("openssl", [
      "req", "-x509", "-newkey", "rsa:2048",
      "-keyout", key, "-out", cert,
      "-days", "1", "-nodes", "-subj", "/CN=localhost",
    ]);
    const seen: Array<string | null> = [];
    const server = https.createServer({ key: fs.readFileSync(key), cert: fs.readFileSync(cert) }, (req, res) => {
      seen.push(currentClientPeer());
      seen.push(req.headers[CLIENT_IP_HEADER]?.toString() ?? null);
      res.end("ok");
    });
    await new Promise<void>((resolve) => {
      server.listen(0, "127.0.0.1", () => resolve());
    });
    try {
      const address = server.address();
      assert.ok(address && typeof address === "object");
      const status = await new Promise<number>((resolve, reject) => {
        const req = https.request({
          hostname: "127.0.0.1",
          port: address.port,
          path: "/",
          method: "GET",
          rejectUnauthorized: false,
          headers: {
            "x-forwarded-for": "203.0.113.5",
            [CLIENT_IP_HEADER]: "8.8.8.8",
          },
        }, (res) => {
          res.resume();
          res.on("end", () => resolve(res.statusCode ?? 0));
        });
        req.on("error", reject);
        req.end();
      });
      assert.equal(status, 200);
      assert.equal(seen[0], "127.0.0.1");
      assert.equal(seen[1], "127.0.0.1");
    } finally {
      await new Promise<void>((resolve, reject) => {
        server.close((err) => (err ? reject(err) : resolve()));
      });
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it("stamps a full IPv6 peer that Better Auth accepts", async () => {
    installClientPeerCapture();
    const seen: string[] = [];
    const server = http.createServer((req, res) => {
      seen.push(req.headers[CLIENT_IP_HEADER]?.toString() ?? "");
      res.end("ok");
    });
    await new Promise<void>((resolve, reject) => {
      server.listen(0, "::1", () => resolve());
      server.on("error", reject);
    });
    try {
      const address = server.address();
      assert.ok(address && typeof address === "object");
      const response = await fetch(`http://[::1]:${address.port}/`, {
        headers: { "x-forwarded-for": "2001:db8::9", [CLIENT_IP_HEADER]: "2001:db8::8" },
      });
      assert.equal(response.status, 200);
      const stamped = seen[0];
      assert.equal(stamped, "::1");
      const resolved = getIP(
        { headers: { get: (name: string) => (name === CLIENT_IP_HEADER ? stamped : null) } },
        { advanced: { ipAddress: betterAuthIpAddress() } },
      );
      assert.ok(resolved);
      assert.notEqual(stamped, rateLimitAddress(stamped));
    } finally {
      await new Promise<void>((resolve, reject) => {
        server.close((err) => (err ? reject(err) : resolve()));
      });
    }
  });
});
