import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { bondingVlanCapabilities, type BondingCapabilities } from "./bonding";

const DEVICE_LEAVES = {
  ipv6_address_interface_identifier: "vif_ipv6_address_interface_identifier",
  dhcpv6_no_request_dns: "vif_dhcpv6_options_no_request_dns",
  dhcpv6_no_request_domain_name: "vif_dhcpv6_options_no_request_domain_name",
} as const;

type BondFlag = keyof typeof DEVICE_LEAVES;

function caps(version: string, on: BondFlag[]): Pick<BondingCapabilities, "version" | "features"> {
  const features: BondingCapabilities["features"] = {};
  for (const key of Object.keys(DEVICE_LEAVES) as BondFlag[]) {
    features[key] = { supported: on.includes(key), description: key };
  }
  return { version, features };
}

function vlanFlags(c: Pick<BondingCapabilities, "version" | "features">): Record<string, boolean> {
  const out = bondingVlanCapabilities(c) as unknown as { features: { vlan: Record<string, boolean> } };
  return out.features.vlan;
}

describe("bondingVlanCapabilities", () => {
  it("ignores the version string when the bond flags are off", () => {
    const vlan = vlanFlags(caps("1.5-rolling-202611010000", []));
    for (const leaf of Object.values(DEVICE_LEAVES)) assert.equal(vlan[leaf], false, leaf);
  });

  it("ignores the version string when the bond flags are on", () => {
    const vlan = vlanFlags(caps("1.4.3", Object.keys(DEVICE_LEAVES) as BondFlag[]));
    for (const leaf of Object.values(DEVICE_LEAVES)) assert.equal(vlan[leaf], true, leaf);
  });

  it("maps each bond flag to its own VLAN leaf", () => {
    for (const flag of Object.keys(DEVICE_LEAVES) as BondFlag[]) {
      const vlan = vlanFlags(caps("1.5", [flag]));
      for (const [other, leaf] of Object.entries(DEVICE_LEAVES)) {
        assert.equal(vlan[leaf], other === flag, `${flag} sets ${leaf}`);
      }
    }
  });

  it("treats a missing bond flag as unsupported", () => {
    const vlan = vlanFlags({ version: "1.5", features: {} });
    for (const leaf of Object.values(DEVICE_LEAVES)) assert.equal(vlan[leaf], false, leaf);
  });

  it("keeps the vif-s and vif-c QoS leaves off and passes the version through", () => {
    const out = bondingVlanCapabilities(caps("1.5", [])) as unknown as {
      version: string;
      features: { vlan: Record<string, boolean> };
    };
    assert.equal(out.version, "1.5");
    for (const leaf of ["vif_s_egress_qos", "vif_s_ingress_qos", "vif_c_egress_qos", "vif_c_ingress_qos"]) {
      assert.equal(out.features.vlan[leaf], false, leaf);
    }
    assert.equal(out.features.vlan.vif_egress_qos, true);
  });
});
