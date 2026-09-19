import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { VppService, type VppBatchOperation, type VyOSResponse } from "@/lib/api/vpp";
import type {
  VppBondingConfig,
  VppBridgeConfig,
  VppGreConfig,
  VppLoopbackConfig,
  VppVxlanConfig,
  VppXconnectConfig,
} from "@/lib/api/vpp";
import {
  emptyVppDraft,
  submitVppCreate,
  submitVppUpdate,
  validateVppCreate,
  validateVppEdit,
  vppDraftFrom,
  vppTabs,
  type VppDraft,
} from "./vpp-form";

/** Captures the batch the builders would send instead of reaching the API. */
class RecordingVppService extends VppService {
  calls: { interface: string; operations: VppBatchOperation[] }[] = [];

  async batchConfigure(
    interfaceName: string,
    operations: VppBatchOperation[],
  ): Promise<VyOSResponse> {
    this.calls.push({ interface: interfaceName, operations });
    return { success: true };
  }

  get only() {
    assert.equal(this.calls.length, 1, "expected exactly one batch call");
    return this.calls[0];
  }
}

const storedBonding: VppBondingConfig = {
  name: "vppbond0",
  description: "Uplink bond",
  disabled: false,
  mode: "802.3ad",
  hash_policy: "layer2",
  mac: null,
  mtu: "1500",
  addresses: ["10.0.0.1/24"],
  members: ["eth1"],
  vif: [
    { vlan_id: "100", description: "mgmt", disabled: false, addresses: ["10.1.0.1/24"], mtu: null },
  ],
};

const storedBridge: VppBridgeConfig = {
  name: "vppbr1",
  description: "L2 domain",
  members: [{ interface: "eth2", bvi: true }],
};

const storedGre: VppGreConfig = {
  name: "vppgre0",
  description: null,
  disabled: false,
  addresses: [],
  mtu: null,
  remote: "203.0.113.1",
  source_address: "203.0.113.2",
  tunnel_type: "l3",
  key: null,
};

const storedLoopback: VppLoopbackConfig = {
  name: "vpplo0",
  description: null,
  disabled: true,
  addresses: ["10.9.9.9/32"],
  mtu: null,
  vif: [],
};

const storedVxlan: VppVxlanConfig = {
  name: "vppvxlan0",
  description: null,
  disabled: false,
  addresses: [],
  mtu: null,
  remote: "198.51.100.1",
  source_address: "198.51.100.2",
  vni: "100",
};

const storedXconnect: VppXconnectConfig = {
  name: "vppxcon0",
  description: null,
  disabled: false,
  members: ["eth3", "eth4"],
};

describe("vppDraftFrom", () => {
  it("reads every bonding field off the stored record", () => {
    const draft = vppDraftFrom(storedBonding, "bonding");
    assert.equal(draft.name, "vppbond0");
    assert.equal(draft.description, "Uplink bond");
    assert.equal(draft.mtu, "1500");
    assert.deepEqual(draft.addresses, ["10.0.0.1/24"]);
    assert.deepEqual(draft.members, ["eth1"]);
    assert.equal(draft.vifs.length, 1);
    assert.equal(draft.vifs[0].vlan_id, "100");
    assert.equal(draft.vifs[0].description, "mgmt");
  });

  it("copies arrays so editing the draft cannot mutate the stored record", () => {
    const draft = vppDraftFrom(storedBonding, "bonding");
    draft.addresses.push("192.0.2.1/32");
    draft.members.push("eth9");
    draft.vifs[0].addresses.push("192.0.2.2/32");
    assert.deepEqual(storedBonding.addresses, ["10.0.0.1/24"]);
    assert.deepEqual(storedBonding.members, ["eth1"]);
    assert.deepEqual(storedBonding.vif[0].addresses, ["10.1.0.1/24"]);
  });

  it("leaves fields another sub-type owns at their empty default", () => {
    const draft = vppDraftFrom(storedGre, "gre");
    assert.equal(draft.greRemote, "203.0.113.1");
    assert.equal(draft.vxlanVni, "");
    assert.deepEqual(draft.members, []);
    assert.deepEqual(draft.vifs, []);
  });

  it("carries the bridge members and their BVI flags", () => {
    const draft = vppDraftFrom(storedBridge, "bridge");
    assert.deepEqual(draft.bridgeMembers, [{ interface: "eth2", bvi: true }]);
  });

  it("keeps a disabled interface disabled", () => {
    assert.equal(vppDraftFrom(storedLoopback, "loopback").disabled, true);
  });
});

describe("validateVppCreate", () => {
  it("requires a sub-type", () => {
    assert.equal(
      validateVppCreate(emptyVppDraft("vppbond0"), null, []),
      "Please select an interface type.",
    );
  });

  it("rejects a name that does not match the sub-type pattern", () => {
    const err = validateVppCreate(emptyVppDraft("eth0"), "bonding", []);
    assert.ok(err && err.startsWith("Interface name must match pattern"));
  });

  it("rejects the reserved vppbr0 bridge name", () => {
    const err = validateVppCreate(emptyVppDraft("vppbr0"), "bridge", []);
    assert.ok(err && err.startsWith("Interface name must match pattern"));
    assert.equal(validateVppCreate(emptyVppDraft("vppbr1"), "bridge", []), null);
  });

  it("rejects a name already in use", () => {
    assert.equal(
      validateVppCreate(emptyVppDraft("vpplo0"), "loopback", ["vpplo0"]),
      "Interface 'vpplo0' already exists.",
    );
  });

  it("rejects an out-of-range MTU", () => {
    const draft = { ...emptyVppDraft("vpplo0"), mtu: "20" };
    assert.equal(validateVppCreate(draft, "loopback", []), "MTU must be between 68 and 16000.");
  });

  it("requires both tunnel endpoints for GRE", () => {
    const draft = emptyVppDraft("vppgre0");
    assert.equal(validateVppCreate(draft, "gre", []), "Remote IP is required for GRE.");
    assert.equal(
      validateVppCreate({ ...draft, greRemote: "10.0.0.1" }, "gre", []),
      "Source address is required for GRE.",
    );
  });

  it("requires a VNI in range for VXLAN", () => {
    const draft = {
      ...emptyVppDraft("vppvxlan0"),
      vxlanRemote: "10.0.0.1",
      vxlanSource: "10.0.0.2",
    };
    assert.equal(validateVppCreate(draft, "vxlan", []), "VNI is required for VXLAN.");
    assert.equal(
      validateVppCreate({ ...draft, vxlanVni: "16777215" }, "vxlan", []),
      "VNI must be between 0 and 16777214.",
    );
    assert.equal(validateVppCreate({ ...draft, vxlanVni: "100" }, "vxlan", []), null);
  });
});

describe("validateVppEdit", () => {
  it("does not re-run the create-only name rules", () => {
    // The stored name is locked in edit mode, so it is never re-validated and
    // never rejected for colliding with itself.
    const draft = vppDraftFrom(storedBonding, "bonding");
    assert.equal(validateVppEdit(draft, "bonding"), null);
  });

  it("still rejects an out-of-range MTU", () => {
    const draft = { ...vppDraftFrom(storedBonding, "bonding"), mtu: "99999" };
    assert.equal(validateVppEdit(draft, "bonding"), "MTU must be between 68 and 16000.");
  });

  it("still rejects an out-of-range VXLAN VNI", () => {
    const draft = { ...vppDraftFrom(storedVxlan, "vxlan"), vxlanVni: "-1" };
    assert.equal(validateVppEdit(draft, "vxlan"), "VNI must be between 0 and 16777214.");
  });

  it("saves an existing tunnel only once its endpoints are set", () => {
    const bare: VppGreConfig = { ...storedGre, remote: null, source_address: null };
    const draft = { ...vppDraftFrom(bare, "gre"), description: "renamed" };
    assert.equal(validateVppEdit(draft, "gre"), "Remote IP is required for GRE.");

    const filled = { ...draft, greRemote: "10.0.0.1", greSource: "10.0.0.2" };
    assert.equal(validateVppEdit(filled, "gre"), null);
  });

  it("refuses to clear a required endpoint instead of dropping the change", () => {
    const draft = { ...vppDraftFrom(storedVxlan, "vxlan"), vxlanRemote: "" };
    assert.equal(validateVppEdit(draft, "vxlan"), "Remote IP is required for VXLAN.");
  });
});

describe("submitVppCreate", () => {
  it("sends the bonding fields the operator filled in", async () => {
    const service = new RecordingVppService();
    const draft: VppDraft = {
      ...emptyVppDraft("vppbond0"),
      description: "Uplink",
      mtu: "9000",
      addresses: ["10.0.0.1/24"],
      members: ["eth1", "eth2"],
      vifs: [
        { vlan_id: "10", description: "mgmt", disabled: true, addresses: ["10.1.0.1/24"], addressInput: "", mtu: "1400" },
      ],
    };

    await submitVppCreate("bonding", draft, service);

    assert.equal(service.only.interface, "vppbond0");
    assert.deepEqual(service.only.operations, [
      { op: "set_bonding_description", value: "Uplink" },
      { op: "set_bonding_mode", value: "802.3ad" },
      { op: "set_bonding_hash_policy", value: "layer2" },
      { op: "set_bonding_mtu", value: "9000" },
      { op: "set_bonding_address", value: "10.0.0.1/24" },
      { op: "set_bonding_member", value: "eth1" },
      { op: "set_bonding_member", value: "eth2" },
      { op: "set_bonding_vif_description", value: "10:mgmt" },
      { op: "set_bonding_vif_disable", value: "10" },
      { op: "set_bonding_vif_address", value: "10:10.1.0.1/24" },
      { op: "set_bonding_vif_mtu", value: "10:1400" },
    ]);
  });

  it("trims the name and the tunnel endpoints", async () => {
    const service = new RecordingVppService();
    const draft: VppDraft = {
      ...emptyVppDraft("  vppgre0  "),
      greRemote: " 10.0.0.1 ",
      greSource: " 10.0.0.2 ",
    };

    await submitVppCreate("gre", draft, service);

    assert.equal(service.only.interface, "vppgre0");
    assert.deepEqual(service.only.operations, [
      { op: "set_gre_remote", value: "10.0.0.1" },
      { op: "set_gre_source_address", value: "10.0.0.2" },
      { op: "set_gre_tunnel_type", value: "l3" },
    ]);
  });

  it("sends a bridge member with its BVI flag", async () => {
    const service = new RecordingVppService();
    const draft: VppDraft = {
      ...emptyVppDraft("vppbr1"),
      bridgeMembers: [{ interface: "eth2", bvi: true }],
    };

    await submitVppCreate("bridge", draft, service);

    assert.deepEqual(service.only.operations, [
      { op: "set_bridge_member", value: "eth2" },
      { op: "set_bridge_member_bvi", value: "eth2" },
    ]);
  });

  it("sends the disable op only when the operator asked for it", async () => {
    const enabled = new RecordingVppService();
    await submitVppCreate("xconnect", emptyVppDraft("vppxcon0"), enabled);
    assert.deepEqual(enabled.only.operations, []);

    const disabled = new RecordingVppService();
    await submitVppCreate("xconnect", { ...emptyVppDraft("vppxcon0"), disabled: true }, disabled);
    assert.deepEqual(disabled.only.operations, [{ op: "set_xconnect_disable" }]);
  });
});

describe("submitVppUpdate", () => {
  it("writes to the stored name, not the draft name", async () => {
    const service = new RecordingVppService();
    const draft = { ...vppDraftFrom(storedLoopback, "loopback"), name: "vpplo9", mtu: "9000" };

    await submitVppUpdate("loopback", storedLoopback.name, storedLoopback, draft, service);

    assert.equal(service.only.interface, "vpplo0");
  });

  it("sends nothing when the operator changed nothing", async () => {
    const service = new RecordingVppService();
    const draft = vppDraftFrom(storedBonding, "bonding");

    await submitVppUpdate("bonding", storedBonding.name, storedBonding, draft, service);

    assert.deepEqual(service.calls, []);
  });

  it("does not delete a leaf the stored record never had", async () => {
    // A delete for a node the router does not have is noise at best, so an
    // already-empty field must produce no operation.
    const service = new RecordingVppService();
    const draft = { ...vppDraftFrom(storedBonding, "bonding"), description: "changed" };

    await submitVppUpdate("bonding", storedBonding.name, storedBonding, draft, service);

    assert.deepEqual(service.only.operations, [
      { op: "set_bonding_description", value: "changed" },
    ]);
  });

  it("clears a field the operator emptied", async () => {
    const service = new RecordingVppService();
    const draft = { ...vppDraftFrom(storedBonding, "bonding"), description: "", mtu: "" };

    await submitVppUpdate("bonding", storedBonding.name, storedBonding, draft, service);

    assert.deepEqual(service.only.operations, [
      { op: "delete_bonding_description" },
      { op: "delete_bonding_mtu" },
    ]);
  });

  it("replaces the stored addresses and members as whole lists", async () => {
    const service = new RecordingVppService();
    const draft = {
      ...vppDraftFrom(storedBonding, "bonding"),
      addresses: ["10.0.0.2/24"],
      members: ["eth5"],
    };

    await submitVppUpdate("bonding", storedBonding.name, storedBonding, draft, service);

    assert.deepEqual(service.only.operations, [
      { op: "delete_bonding_address", value: "10.0.0.1/24" },
      { op: "set_bonding_address", value: "10.0.0.2/24" },
      { op: "delete_bonding_member", value: "eth1" },
      { op: "set_bonding_member", value: "eth5" },
    ]);
  });

  it("removes a VIF the operator deleted", async () => {
    const service = new RecordingVppService();
    const draft = { ...vppDraftFrom(storedBonding, "bonding"), vifs: [] };

    await submitVppUpdate("bonding", storedBonding.name, storedBonding, draft, service);

    assert.deepEqual(service.only.operations, [
      { op: "delete_bonding_vif", value: "100" },
    ]);
  });

  it("rewrites a VIF whose address changed", async () => {
    const service = new RecordingVppService();
    const draft = vppDraftFrom(storedBonding, "bonding");
    draft.vifs[0].addresses = ["10.2.0.1/24"];

    await submitVppUpdate("bonding", storedBonding.name, storedBonding, draft, service);

    assert.deepEqual(service.only.operations, [
      { op: "delete_bonding_vif", value: "100" },
      { op: "set_bonding_vif_description", value: "100:mgmt" },
      { op: "set_bonding_vif_address", value: "100:10.2.0.1/24" },
    ]);
  });

  it("turns the disabled checkbox back off with a delete", async () => {
    const service = new RecordingVppService();
    const draft = { ...vppDraftFrom(storedLoopback, "loopback"), disabled: false };

    await submitVppUpdate("loopback", storedLoopback.name, storedLoopback, draft, service);

    assert.deepEqual(service.only.operations, [{ op: "delete_loopback_disable" }]);
  });

  it("drops a bridge member and its BVI flag", async () => {
    const service = new RecordingVppService();
    const draft = { ...vppDraftFrom(storedBridge, "bridge"), bridgeMembers: [] };

    await submitVppUpdate("bridge", storedBridge.name, storedBridge, draft, service);

    assert.deepEqual(service.only.operations, [
      { op: "delete_bridge_member", value: "eth2" },
    ]);
  });

  it("re-sends a bridge member whose BVI flag was toggled", async () => {
    const service = new RecordingVppService();
    const draft = {
      ...vppDraftFrom(storedBridge, "bridge"),
      bridgeMembers: [{ interface: "eth2", bvi: false }],
    };

    await submitVppUpdate("bridge", storedBridge.name, storedBridge, draft, service);

    assert.deepEqual(service.only.operations, [
      { op: "delete_bridge_member", value: "eth2" },
      { op: "set_bridge_member", value: "eth2" },
    ]);
  });

  it("leaves untouched xconnect members alone", async () => {
    const service = new RecordingVppService();
    const draft = { ...vppDraftFrom(storedXconnect, "xconnect"), description: "renamed" };

    await submitVppUpdate("xconnect", storedXconnect.name, storedXconnect, draft, service);

    assert.deepEqual(service.only.operations, [
      { op: "set_xconnect_description", value: "renamed" },
    ]);
  });

  it("does not rewrite the VNI of an otherwise-edited VXLAN", async () => {
    const service = new RecordingVppService();
    const draft = { ...vppDraftFrom(storedVxlan, "vxlan"), mtu: "1400" };

    await submitVppUpdate("vxlan", storedVxlan.name, storedVxlan, draft, service);

    assert.deepEqual(service.only.operations, [
      { op: "set_vxlan_mtu", value: "1400" },
    ]);
  });
});

describe("vppTabs", () => {
  it("gives bonding addresses, members and VIFs", () => {
    assert.deepEqual(vppTabs("bonding"), {
      addresses: true,
      members: true,
      bridgeMembers: false,
      vif: true,
    });
  });

  it("gives bridge only its own member list", () => {
    assert.deepEqual(vppTabs("bridge"), {
      addresses: false,
      members: false,
      bridgeMembers: true,
      vif: false,
    });
  });

  it("gives a tunnel addresses and nothing else", () => {
    assert.deepEqual(vppTabs("gre"), {
      addresses: true,
      members: false,
      bridgeMembers: false,
      vif: false,
    });
  });
});
