import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { resolvedAddresses } from "./dns-dynamic-status.ts";

const hosts = [
  {
    host: "Example.COM",
    ipv4: "203.0.113.10",
    status_ipv4: "good",
    ipv6: "2001:db8::1",
    status_ipv6: "good",
  },
  { host: "other.example.com", ipv4: "", ipv6: "2001:db8::2", status_ipv6: "nochg" },
];

describe("resolvedAddresses", () => {
  it("joins the cache to configured hostnames, not the service name", () => {
    const rows = resolvedAddresses(["example.com"], hosts);

    assert.deepEqual(rows, [
      { host: "example.com", ip: "203.0.113.10", status: "good" },
      { host: "example.com", ip: "2001:db8::1", status: "good" },
    ]);
  });

  it("skips a hostname the cache has not resolved", () => {
    assert.deepEqual(resolvedAddresses(["missing.example.com"], hosts), []);
  });

  it("drops an empty address and keeps the other family", () => {
    assert.deepEqual(resolvedAddresses(["other.example.com"], hosts), [
      { host: "other.example.com", ip: "2001:db8::2", status: "nochg" },
    ]);
  });

  it("does not repeat a hostname listed twice", () => {
    const rows = resolvedAddresses(["example.com", "EXAMPLE.com"], hosts);
    assert.equal(rows.length, 2);
  });
});
