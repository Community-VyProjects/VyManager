import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { afiNameKey, formatUnknownAfi } from "./afi-name";

// Tokens from vyos_builders/bgp/bgp_batch_builder.py address_family_types.global.
const RECEIVED = [
  "ipv4-unicast",
  "ipv6-unicast",
  "ipv4-multicast",
  "ipv6-multicast",
  "ipv4-labeled-unicast",
  "ipv6-labeled-unicast",
  "ipv4-vpn",
  "ipv6-vpn",
  "ipv4-flowspec",
  "ipv6-flowspec",
  "l2vpn-evpn",
] as const;

describe("afiNameKey", () => {
  it("maps the hyphenated token the dropdown receives", () => {
    for (const afi of RECEIVED) {
      assert.equal(afiNameKey(afi), afi);
    }
  });

  it("does not treat the underscore form as the same token", () => {
    assert.equal(afiNameKey("ipv4_unicast"), null);
    assert.equal(afiNameKey("l2vpn_evpn"), null);
  });
});

describe("formatUnknownAfi", () => {
  it("keeps the previous heading for a token that is not in the catalog", () => {
    assert.equal(formatUnknownAfi("ipv4-unicast"), "Ipv4-Unicast");
    assert.equal(formatUnknownAfi("ipv4_unicast"), "Ipv4 Unicast");
  });
});
