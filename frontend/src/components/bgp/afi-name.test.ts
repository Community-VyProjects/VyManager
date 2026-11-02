import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { AFI_NAME_KEYS, afiNameKey, formatUnknownAfi } from "./afi-name";

describe("afiNameKey", () => {
  it("round-trips every catalog key and rejects the underscore form", () => {
    for (const afi of AFI_NAME_KEYS) {
      assert.equal(afiNameKey(afi), afi);
      assert.equal(afiNameKey(afi.replaceAll("-", "_")), null);
    }
  });
});

describe("formatUnknownAfi", () => {
  it("keeps the previous heading for a token that is not in the catalog", () => {
    assert.equal(formatUnknownAfi("ipv4-unicast"), "Ipv4-Unicast");
    assert.equal(formatUnknownAfi("ipv4_unicast"), "Ipv4 Unicast");
  });
});
