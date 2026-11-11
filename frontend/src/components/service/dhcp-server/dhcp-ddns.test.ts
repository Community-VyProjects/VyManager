import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ddnsProblem, dhcpService, type DHCPBatchRequest, type DHCPDdnsConfig } from "@/lib/api/dhcp-server";

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

describe("saveDdns", () => {
  it("emits the trimmed names it validated", async () => {
    let sent: DHCPBatchRequest | undefined;
    const service = Object.create(dhcpService) as typeof dhcpService;
    service.batchConfigure = async (request: DHCPBatchRequest) => {
      sent = request;
      return { success: true };
    };
    const next: DHCPDdnsConfig = {
      ...base(),
      tsig_keys: [{ name: "K1 ", algorithm: "sha256", secret: "" }],
      forward_domains: [
        { name: " example.com", key_name: "K1", dns_servers: [{ id: "1 ", address: " 192.0.2.1", port: "" }] },
      ],
    };
    await service.saveDdns(base(), next, false, true);
    assert.deepEqual(sent?.operations, [
      { op: "set_ddns_domain", value: "forward-domain|example.com" },
      { op: "set_ddns_domain_key_name", value: "forward-domain|example.com|K1" },
      { op: "set_ddns_domain_dns_server_address", value: "forward-domain|example.com|1|192.0.2.1" },
    ]);
  });
});
