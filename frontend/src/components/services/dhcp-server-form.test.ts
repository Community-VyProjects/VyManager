import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  DHCPService,
  type DHCPBatchOperation,
  type DHCPConfigResponse,
  type DHCPSubnet,
} from "@/lib/api/dhcp";
import type { VyOSResponse } from "@/lib/types/api";
import {
  buildServerCreate,
  emptyServerDraft,
  serverDraftFrom,
  submitServerCreate,
  submitServerUpdate,
  validateServerCreate,
  validateServerShared,
  type ServerDraft,
  type ServerFieldSupport,
} from "./dhcp-server-form";

const ok: VyOSResponse = { success: true };

const allOn: ServerFieldSupport = {
  hasSubnetId: true,
  pingCheck: true,
  enableFailover: true,
  bootfileName: true,
  bootfileServer: true,
  tftpServerName: true,
  timeServers: true,
  ntpServers: true,
  winsServers: true,
  timeOffset: true,
  clientPrefixLength: true,
  wpadUrl: true,
  subnetDisable: true,
};

const allOff: ServerFieldSupport = {
  hasSubnetId: false,
  pingCheck: false,
  enableFailover: false,
  bootfileName: false,
  bootfileServer: false,
  tftpServerName: false,
  timeServers: false,
  ntpServers: false,
  winsServers: false,
  timeOffset: false,
  clientPrefixLength: false,
  wpadUrl: false,
  subnetDisable: false,
};

function subnet(overrides: Partial<DHCPSubnet> = {}): DHCPSubnet {
  return {
    subnet: "192.168.1.0/24",
    name_servers: ["8.8.8.8"],
    domain_name: "lan.example",
    domain_search: [],
    lease: "86400",
    default_router: "192.168.1.1",
    ranges: [{ range_id: "0", start: "192.168.1.100", stop: "192.168.1.200" }],
    excludes: [],
    static_mappings: [],
    ping_check: false,
    enable_failover: false,
    time_servers: [],
    ntp_servers: [],
    wins_servers: [],
    bootfile_name: "pxelinux.0",
    ...overrides,
  };
}

function configFor(record: DHCPSubnet, network = "LAN"): DHCPConfigResponse {
  return {
    shared_networks: [
      {
        name: network,
        authoritative: false,
        name_servers: [],
        domain_search: [],
        ping_check: false,
        subnets: [record],
      },
    ],
    ddns: { present: false, tsig_keys: [], forward_domains: [], reverse_domains: [] },
    global_config: {
      listen_addresses: [],
      listen_interfaces: [],
      hostfile_update: false,
      host_decl_name: false,
    },
    total_subnets: 1,
    total_static_mappings: 0,
  };
}

class RecordingDhcpService extends DHCPService {
  calls: { network_name: string; subnet?: string; operations: DHCPBatchOperation[] }[] = [];
  seen: DHCPConfigResponse;

  constructor(seen: DHCPConfigResponse) {
    super();
    this.seen = seen;
  }

  async getConfig(): Promise<DHCPConfigResponse> {
    return this.seen;
  }

  async batchConfigure(request: {
    network_name: string;
    subnet?: string;
    operations: DHCPBatchOperation[];
  }): Promise<VyOSResponse> {
    this.calls.push(request);
    return ok;
  }
}

function filledCreate(overrides: Partial<ServerDraft> = {}): ServerDraft {
  return {
    ...emptyServerDraft(),
    mode: "new",
    networkName: "LAN",
    subnet: "192.168.1.0/24",
    defaultRouter: "192.168.1.1",
    domainName: "lan.example",
    lease: "86400",
    nameServers: ["8.8.8.8"],
    ranges: [{ range_id: "0", start: "192.168.1.100", stop: "192.168.1.200" }],
    ...overrides,
  };
}

describe("dhcp server form", () => {
  it("refuses a blank gateway on edit and a blank network name only on create", () => {
    const stored = subnet();
    const draft = serverDraftFrom("LAN", stored);
    draft.defaultRouter = "";
    assert.equal(
      validateServerShared(draft, stored.subnet),
      "Default router (gateway) is required",
    );
    const create = filledCreate();
    create.networkName = "";
    assert.equal(validateServerCreate(create), "Network name is required");
    assert.equal(validateServerShared(serverDraftFrom("LAN", stored), stored.subnet), null);
  });

  it("create emits only the fields the operator filled in", async () => {
    const service = new RecordingDhcpService(configFor(subnet()));
    const draft = filledCreate({
      excludes: ["192.168.1.50"],
      bootfileName: "pxelinux.0",
      pingCheck: false,
      timeServers: ["10.0.0.1"],
    });
    await submitServerCreate(draft, { ...allOn, timeServers: false }, 3, [], service);
    assert.deepEqual(service.calls, [
      {
        network_name: "LAN",
        subnet: "192.168.1.0/24",
        operations: [
          { op: "set_shared_network" },
          { op: "set_subnet" },
          { op: "set_subnet_subnet_id", value: "3" },
          { op: "set_subnet_default_router", value: "192.168.1.1" },
          { op: "set_subnet_name_server", value: "8.8.8.8" },
          { op: "set_subnet_domain_name", value: "lan.example" },
          { op: "set_subnet_lease", value: "86400" },
          { op: "set_subnet_range", value: "0" },
          { op: "set_subnet_range_start", value: "0|192.168.1.100" },
          { op: "set_subnet_range_stop", value: "0|192.168.1.200" },
          { op: "set_subnet_exclude", value: "192.168.1.50" },
          { op: "set_subnet_bootfile_name", value: "pxelinux.0" },
        ],
      },
    ]);
  });

  it("does not emit an unsupported leaf the draft still holds", () => {
    const config = buildServerCreate(
      filledCreate({ bootfileName: "pxelinux.0", pingCheck: true }),
      allOff,
      9,
      [],
    );
    assert.equal(config.bootfile_name, undefined);
    assert.equal(config.ping_check, undefined);
    assert.equal(config.subnet_id, undefined);
  });

  it("sends nothing when the edit draft matches the stored subnet", async () => {
    const stored = subnet();
    const service = new RecordingDhcpService(configFor(stored));
    const result = await submitServerUpdate(
      { network: "LAN", subnet: stored },
      serverDraftFrom("LAN", stored),
      allOn,
      [],
      service,
    );
    assert.equal(result, null);
    assert.deepEqual(service.calls, []);
  });

  it("emits a delete for a cleared bootfile and nothing for one that was already empty", async () => {
    const stored = subnet({ bootfile_name: "pxelinux.0" });
    const cleared = new RecordingDhcpService(configFor(stored));
    const draft = serverDraftFrom("LAN", stored);
    draft.bootfileName = "";
    await submitServerUpdate({ network: "LAN", subnet: stored }, draft, allOn, [], cleared);
    assert.deepEqual(cleared.calls[0].operations, [{ op: "delete_subnet_bootfile_name" }]);

    const emptyStored = subnet({ bootfile_name: undefined });
    const untouched = new RecordingDhcpService(configFor(emptyStored));
    const emptyDraft = serverDraftFrom("LAN", emptyStored);
    emptyDraft.bootfileName = "";
    const result = await submitServerUpdate(
      { network: "LAN", subnet: emptyStored },
      emptyDraft,
      allOn,
      [],
      untouched,
    );
    assert.equal(result, null);
    assert.deepEqual(untouched.calls, []);
  });

  it("replaces a changed name-server list and leaves the other fields alone", async () => {
    const stored = subnet({ name_servers: ["8.8.8.8"] });
    const service = new RecordingDhcpService(configFor(stored));
    const draft = serverDraftFrom("LAN", stored);
    draft.nameServers = ["1.1.1.1"];
    await submitServerUpdate({ network: "LAN", subnet: stored }, draft, allOn, [], service);
    assert.deepEqual(service.calls[0].operations, [
      { op: "delete_subnet_name_server", value: "8.8.8.8" },
      { op: "set_subnet_name_server", value: "1.1.1.1" },
    ]);
  });

  it("writes the stored network and subnet when the draft identity was altered", async () => {
    const stored = subnet();
    const service = new RecordingDhcpService(configFor(stored));
    const draft = serverDraftFrom("LAN", stored);
    draft.networkName = "OTHER";
    draft.selectedNetwork = "OTHER";
    draft.subnet = "10.0.0.0/24";
    draft.defaultRouter = "192.168.1.2";
    await submitServerUpdate({ network: "LAN", subnet: stored }, draft, allOn, [], service);
    assert.equal(service.calls.length, 1);
    assert.equal(service.calls[0].network_name, "LAN");
    assert.equal(service.calls[0].subnet, "192.168.1.0/24");
    assert.deepEqual(service.calls[0].operations, [
      { op: "set_subnet_default_router", value: "192.168.1.2" },
    ]);
  });
});
