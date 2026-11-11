import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ddnsProblem, type DHCPDdnsConfig } from "@/lib/api/dhcp-server";

const base = (): DHCPDdnsConfig => ({
  present: true,
  tsig_keys: [{ name: "K1", algorithm: "sha256", secret: "***" }],
  forward_domains: [],
  reverse_domains: [],
});

describe("ddnsProblem", () => {
  it("keeps a configured key with a blank secret", () => {
    const next = { ...base(), tsig_keys: [{ name: "K1", algorithm: "sha256", secret: "" }] };
    assert.equal(ddnsProblem(base(), next), null);
  });

  it("needs a secret and an algorithm on a new key", () => {
    const noSecret = { ...base(), tsig_keys: [...base().tsig_keys, { name: "K2", algorithm: "sha1", secret: "" }] };
    const noAlgo = { ...base(), tsig_keys: [...base().tsig_keys, { name: "K2", algorithm: "", secret: "c2Vj" }] };
    assert.equal(ddnsProblem(base(), noSecret), "tsigKeyIncomplete");
    assert.equal(ddnsProblem(base(), noAlgo), "tsigKeyIncomplete");
  });

  it("rejects a domain whose key is removed", () => {
    const next = {
      ...base(),
      tsig_keys: [],
      forward_domains: [{ name: "example.com", key_name: "K1", dns_servers: [] }],
    };
    assert.equal(ddnsProblem(base(), next), "unknownKey");
  });

  it("needs an address on each DNS server", () => {
    const next = {
      ...base(),
      reverse_domains: [{ name: "2.0.192.in-addr.arpa", dns_servers: [{ id: "1", port: "53" }] }],
    };
    assert.equal(ddnsProblem(base(), next), "dnsServerAddress");
  });
});
