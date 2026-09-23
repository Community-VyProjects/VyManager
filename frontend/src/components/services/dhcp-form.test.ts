import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  DHCPService,
  type DHCPRange,
  type DHCPSharedNetwork,
  type DHCPStaticMapping,
} from "@/lib/api/dhcp";
import type { VyOSResponse } from "@/lib/types/api";
import {
  emptyMappingDraft,
  emptyRangeDraft,
  mappingDraftFrom,
  nextRangeId,
  rangeDraftFrom,
  submitMappingCreate,
  submitMappingUpdate,
  submitRangeCreate,
  submitRangeUpdate,
  validateMappingCreate,
  validateMappingShared,
  validateRangeCreate,
  validateRangeShared,
} from "./dhcp-form";

const ok: VyOSResponse = { success: true };

class RecordingDhcpService extends DHCPService {
  createdRanges: {
    network: string;
    subnet: string;
    rangeId: string;
    start: string;
    stop: string;
  }[] = [];
  deletedRanges: { network: string; subnet: string; rangeId: string }[] = [];
  createdMappings: {
    network: string;
    subnet: string;
    name: string;
    ip: string;
    mac: string;
    description?: string;
    duid?: string;
  }[] = [];
  updatedMappings: {
    network: string;
    subnet: string;
    name: string;
    config: Record<string, unknown>;
  }[] = [];

  async createRange(
    network_name: string,
    subnet: string,
    range_id: string,
    start: string,
    stop: string,
  ): Promise<VyOSResponse> {
    this.createdRanges.push({
      network: network_name,
      subnet,
      rangeId: range_id,
      start,
      stop,
    });
    return ok;
  }

  async deleteRange(
    network_name: string,
    subnet: string,
    range_id: string,
  ): Promise<VyOSResponse> {
    this.deletedRanges.push({
      network: network_name,
      subnet,
      rangeId: range_id,
    });
    return ok;
  }

  async createStaticMapping(
    network_name: string,
    subnet: string,
    mapping_name: string,
    ip_address: string,
    mac_address: string,
    description?: string,
    duid?: string,
  ): Promise<VyOSResponse> {
    this.createdMappings.push({
      network: network_name,
      subnet,
      name: mapping_name,
      ip: ip_address,
      mac: mac_address,
      description,
      duid,
    });
    return ok;
  }

  async updateStaticMapping(
    network_name: string,
    subnet: string,
    mapping_name: string,
    config: Record<string, unknown>,
  ): Promise<VyOSResponse> {
    this.updatedMappings.push({
      network: network_name,
      subnet,
      name: mapping_name,
      config,
    });
    return ok;
  }
}

const storedRange: DHCPRange = {
  range_id: "2",
  start: "192.168.1.100",
  stop: "192.168.1.200",
};

const network: DHCPSharedNetwork = {
  name: "LAN",
  authoritative: false,
  name_servers: [],
  domain_search: [],
  ping_check: false,
  subnets: [
    {
      subnet: "192.168.1.0/24",
      name_servers: [],
      domain_search: [],
      ranges: [storedRange],
      excludes: [],
      static_mappings: [],
      ping_check: false,
      enable_failover: false,
      time_servers: [],
      ntp_servers: [],
      wins_servers: [],
    },
  ],
};

const storedMapping: DHCPStaticMapping = {
  name: "printer",
  ip_address: "192.168.1.50",
  mac_address: "aa:bb:cc:dd:ee:ff",
  duid: "00:01:02",
  disable: false,
  description: "Office printer",
};

describe("validateRangeCreate", () => {
  it("rejects a missing subnet on create only", () => {
    const draft = emptyRangeDraft();
    draft.startIp = "192.168.1.10";
    draft.stopIp = "192.168.1.20";
    assert.equal(validateRangeCreate(draft), "Please select a subnet");
    assert.equal(validateRangeShared(draft), null);
  });

  it("requires start and stop on both modes", () => {
    const draft = emptyRangeDraft();
    draft.subnet = "192.168.1.0/24";
    assert.equal(validateRangeCreate(draft), "Start IP address is required");
    assert.equal(validateRangeShared(draft), "Start IP address is required");
  });
});

describe("nextRangeId", () => {
  it("picks the lowest unused numeric id", () => {
    assert.equal(nextRangeId(network, "192.168.1.0/24"), "0");
  });
});

describe("range create", () => {
  it("emits only the filled start and stop under the chosen subnet", async () => {
    const service = new RecordingDhcpService();
    const draft = emptyRangeDraft();
    draft.subnet = "192.168.1.0/24";
    draft.startIp = "192.168.1.10";
    draft.stopIp = "192.168.1.20";
    await submitRangeCreate("LAN", draft, "0", service);
    assert.deepEqual(service.createdRanges, [
      {
        network: "LAN",
        subnet: "192.168.1.0/24",
        rangeId: "0",
        start: "192.168.1.10",
        stop: "192.168.1.20",
      },
    ]);
    assert.equal(service.deletedRanges.length, 0);
  });
});

describe("range update", () => {
  it("sends nothing when the operator changed nothing", async () => {
    const service = new RecordingDhcpService();
    const result = await submitRangeUpdate(
      "LAN",
      { subnet: "192.168.1.0/24", range: storedRange },
      rangeDraftFrom("192.168.1.0/24", storedRange),
      service,
    );
    assert.equal(result, null);
    assert.equal(service.deletedRanges.length, 0);
    assert.equal(service.createdRanges.length, 0);
  });

  it("recreates the stored range id when start or stop change", async () => {
    const service = new RecordingDhcpService();
    const draft = rangeDraftFrom("192.168.1.0/24", storedRange);
    draft.startIp = "192.168.1.110";
    await submitRangeUpdate(
      "LAN",
      { subnet: "192.168.1.0/24", range: storedRange },
      draft,
      service,
    );
    assert.deepEqual(service.deletedRanges, [
      { network: "LAN", subnet: "192.168.1.0/24", rangeId: "2" },
    ]);
    assert.deepEqual(service.createdRanges, [
      {
        network: "LAN",
        subnet: "192.168.1.0/24",
        rangeId: "2",
        start: "192.168.1.110",
        stop: "192.168.1.200",
      },
    ]);
  });

  it("writes the stored range id and subnet when the draft identity was altered", async () => {
    const service = new RecordingDhcpService();
    const draft = rangeDraftFrom("192.168.1.0/24", storedRange);
    draft.subnet = "10.0.0.0/24";
    draft.startIp = "192.168.1.111";
    await submitRangeUpdate(
      "LAN",
      { subnet: "192.168.1.0/24", range: storedRange },
      draft,
      service,
    );
    assert.equal(service.deletedRanges[0].rangeId, storedRange.range_id);
    assert.equal(service.deletedRanges[0].subnet, "192.168.1.0/24");
    assert.equal(service.createdRanges[0].rangeId, storedRange.range_id);
    assert.equal(service.createdRanges[0].subnet, "192.168.1.0/24");
  });
});

describe("validateMappingCreate", () => {
  it("rejects a missing name on create only", () => {
    const draft = emptyMappingDraft();
    draft.subnet = "192.168.1.0/24";
    draft.ipAddress = "192.168.1.50";
    draft.macAddress = "AA:BB:CC:DD:EE:FF";
    assert.equal(validateMappingCreate(draft, false), "Mapping name is required");
    assert.equal(validateMappingShared(draft), null);
  });

  it("requires an IP on create only", () => {
    const draft = emptyMappingDraft();
    draft.subnet = "192.168.1.0/24";
    draft.name = "printer";
    draft.macAddress = "AA:BB:CC:DD:EE:FF";
    assert.equal(validateMappingCreate(draft, false), "IP address is required");
    assert.equal(validateMappingShared(draft), null);
  });
});

describe("mapping create", () => {
  it("emits only the fields the operator filled in", async () => {
    const service = new RecordingDhcpService();
    const draft = emptyMappingDraft();
    draft.subnet = "192.168.1.0/24";
    draft.name = "printer";
    draft.ipAddress = "192.168.1.50";
    draft.macAddress = "AA:BB:CC:DD:EE:FF";
    draft.disabled = true;
    await submitMappingCreate("LAN", draft, service);
    assert.equal(service.createdMappings.length, 1);
    assert.deepEqual(service.createdMappings[0], {
      network: "LAN",
      subnet: "192.168.1.0/24",
      name: "printer",
      ip: "192.168.1.50",
      mac: "AA:BB:CC:DD:EE:FF",
      description: undefined,
      duid: undefined,
    });
  });
});

describe("mapping update", () => {
  const stored = {
    network: "LAN",
    subnet: "192.168.1.0/24",
    mapping: storedMapping,
  };

  it("sends nothing when the operator changed nothing", async () => {
    const service = new RecordingDhcpService();
    const result = await submitMappingUpdate(
      stored,
      mappingDraftFrom(stored.subnet, stored.mapping),
      service,
    );
    assert.equal(result, null);
    assert.equal(service.updatedMappings.length, 0);
  });

  it("deletes a cleared description", async () => {
    const service = new RecordingDhcpService();
    const draft = mappingDraftFrom(stored.subnet, stored.mapping);
    draft.description = "";
    await submitMappingUpdate(stored, draft, service);
    assert.deepEqual(service.updatedMappings[0].config, {
      delete_description: true,
    });
  });

  it("does not emit a delete for an already-empty description", async () => {
    const service = new RecordingDhcpService();
    const current = {
      ...stored,
      mapping: { ...stored.mapping, description: undefined },
    };
    const result = await submitMappingUpdate(
      current,
      mappingDraftFrom(current.subnet, current.mapping),
      service,
    );
    assert.equal(result, null);
    assert.equal(service.updatedMappings.length, 0);
  });

  it("writes the stored name when the draft name was altered", async () => {
    const service = new RecordingDhcpService();
    const draft = mappingDraftFrom(stored.subnet, stored.mapping);
    draft.name = "tampered";
    draft.ipAddress = "192.168.1.51";
    await submitMappingUpdate(stored, draft, service);
    assert.equal(service.updatedMappings.length, 1);
    assert.equal(service.updatedMappings[0].name, storedMapping.name);
    assert.equal(service.updatedMappings[0].subnet, stored.subnet);
    assert.deepEqual(service.updatedMappings[0].config, {
      ip_address: "192.168.1.51",
    });
  });

  it("sends disable only when the operator toggles it", async () => {
    const service = new RecordingDhcpService();
    const draft = mappingDraftFrom(stored.subnet, stored.mapping);
    draft.disabled = true;
    await submitMappingUpdate(stored, draft, service);
    assert.deepEqual(service.updatedMappings[0].config, { disable: true });
  });
});
