import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { DHCPSharedNetwork } from "@/lib/api/dhcp-server";
import { networkSettingsDraft, networkSettingsOps } from "./dhcp-network-settings";

const stored: DHCPSharedNetwork = {
  name: "LAN",
  authoritative: true,
  description: "office",
  name_servers: ["192.0.2.53", "192.0.2.54"],
  domain_name: "example.com",
  domain_search: ["example.com"],
  ping_check: false,
  subnets: [],
};

describe("networkSettingsOps", () => {
  it("emits nothing for an untouched draft", () => {
    assert.deepEqual(networkSettingsOps(stored, networkSettingsDraft(stored)), []);
  });

  it("sets and deletes each shared-network leaf the draft changed", () => {
    const ops = networkSettingsOps(stored, {
      description: "",
      authoritative: false,
      pingCheck: true,
      nameServers: ["192.0.2.54", " 192.0.2.55 ", ""],
      domainName: "lan.example.com",
      domainSearch: [],
    });
    assert.deepEqual(ops, [
      { op: "delete_shared_network_description" },
      { op: "delete_shared_network_authoritative" },
      { op: "set_shared_network_ping_check" },
      { op: "delete_shared_network_name_server", value: "192.0.2.53" },
      { op: "set_shared_network_name_server", value: "192.0.2.55" },
      { op: "set_shared_network_domain_name", value: "lan.example.com" },
      { op: "delete_shared_network_domain_search", value: "example.com" },
    ]);
  });

  it("deletes the domain name when it is cleared", () => {
    const draft = { ...networkSettingsDraft(stored), domainName: " " };
    assert.deepEqual(networkSettingsOps(stored, draft), [
      { op: "delete_shared_network_domain_name" },
    ]);
  });
});
