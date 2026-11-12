import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ddnsProblem, dhcpServerService, type DHCPBatchRequest, type DHCPDdnsConfig } from "@/lib/api/dhcp-server";

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
    for (const secret of ["  ", "***", " *** "]) {
      const masked = { ...base(), tsig_keys: [...base().tsig_keys, { name: "K2", algorithm: "sha1", secret }] };
      assert.equal(ddnsProblem(base(), masked), "tsigKeyIncomplete");
    }
  });

  it("rejects a domain whose key is removed", () => {
    const next = {
      ...base(),
      tsig_keys: [],
      forward_domains: [{ name: "example.com", key_name: "K1", dns_servers: [] }],
    };
    assert.equal(ddnsProblem(base(), next), "unknownKey");
  });

  it("rejects duplicate key names, domain names and DNS server ids", () => {
    const keys = { ...base(), tsig_keys: [...base().tsig_keys, { name: "K1 ", algorithm: "sha1", secret: "c2Vj" }] };
    const domains = {
      ...base(),
      forward_domains: [
        { name: "example.com", dns_servers: [] },
        { name: "example.com ", dns_servers: [] },
      ],
    };
    const servers = {
      ...base(),
      forward_domains: [
        {
          name: "example.com",
          dns_servers: [
            { id: "2", address: "192.0.2.1" },
            { id: "2", address: "192.0.2.2" },
          ],
        },
      ],
    };
    assert.equal(ddnsProblem(base(), keys), "duplicateName");
    assert.equal(ddnsProblem(base(), domains), "duplicateName");
    assert.equal(ddnsProblem(base(), servers), "duplicateName");
  });

  it("rejects a cleared name instead of dropping the entry", () => {
    const key = { ...base(), tsig_keys: [{ name: " ", algorithm: "sha256", secret: "" }] };
    const domain = { ...base(), forward_domains: [{ name: "", key_name: "K1", dns_servers: [] }] };
    const server = {
      ...base(),
      forward_domains: [{ name: "example.com", dns_servers: [{ id: "", address: "192.0.2.1" }] }],
    };
    assert.equal(ddnsProblem(base(), key), "missingName");
    assert.equal(ddnsProblem(base(), domain), "missingName");
    assert.equal(ddnsProblem(base(), server), "missingName");
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
    const service = Object.create(dhcpServerService) as typeof dhcpServerService;
    service.batchConfigure = async (request: DHCPBatchRequest) => {
      sent = request;
      return { success: true };
    };
    const next: DHCPDdnsConfig = {
      ...base(),
      tsig_keys: [
        { name: "K1 ", algorithm: "sha256", secret: "   " },
        { name: "K2", algorithm: "sha1", secret: " c2Vj " },
      ],
      forward_domains: [
        { name: " example.com", key_name: "K1", dns_servers: [{ id: "1 ", address: " 192.0.2.1", port: "" }] },
      ],
    };
    await service.saveDdns(base(), next, false, true);
    assert.deepEqual(sent?.operations, [
      { op: "set_ddns_tsig_key", value: "K2" },
      { op: "set_ddns_tsig_key_algorithm", value: "K2|sha1" },
      { op: "set_ddns_tsig_key_secret", value: "K2|c2Vj" },
      { op: "set_ddns_domain", value: "forward-domain|example.com" },
      { op: "set_ddns_domain_key_name", value: "forward-domain|example.com|K1" },
      { op: "set_ddns_domain_dns_server_address", value: "forward-domain|example.com|1|192.0.2.1" },
    ]);
  });
});
