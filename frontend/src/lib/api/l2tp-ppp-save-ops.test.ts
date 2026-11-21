import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  MASKED_SECRET,
  buildPPPOptionsOps,
  replaceMask,
  pppOptionsProblem,
  type L2TPPPPOptionsUpdate,
} from "./l2tp-ppp-save-ops";
import { l2tpService, type BatchOperation, type L2TPPPPOptions } from "./l2tp";

const SECRET = "0123456789abcdef";

function stubbed(): { service: typeof l2tpService; sent: Array<[string, BatchOperation[]]> } {
  const sent: Array<[string, BatchOperation[]]> = [];
  const service = Object.create(l2tpService) as typeof l2tpService;
  service.batchConfigure = async (itemName: string, operations: BatchOperation[]) => {
    sent.push([itemName, operations]);
    return { success: true };
  };
  return { service, sent };
}

describe("buildPPPOptionsOps", () => {
  it("sends nothing for an untouched save", () => {
    const current: L2TPPPPOptions = {
      ipv4: "allow",
      mru: "1400",
      disable_ccp: true,
      ipv6_peer_interface_id: "calling-sid",
      ipv6_peer_interface_id_secret: MASKED_SECRET,
    };
    const updated: L2TPPPPOptionsUpdate = {
      ipv4: "allow",
      mru: "1400",
      disable_ccp: true,
      ipv6_peer_interface_id: "calling-sid",
      ipv6_peer_interface_id_secret: MASKED_SECRET,
    };
    assert.deepEqual(buildPPPOptionsOps(current, updated, true), []);
  });

  it("sets changed leaves and deletes cleared ones in one batch", () => {
    const current: L2TPPPPOptions = { ipv4: "allow", mru: "1400", disable_ccp: true };
    const updated: L2TPPPPOptionsUpdate = { ipv4: "", mru: " 1500 ", disable_ccp: false, mppe: "prefer" };
    assert.deepEqual(buildPPPOptionsOps(current, updated, false), [
      { op: "delete_ppp_ipv4" },
      { op: "set_ppp_mppe", value: "prefer" },
      { op: "set_ppp_mru", value: "1500" },
      { op: "delete_ppp_disable_ccp" },
    ]);
  });

  it("sets a typed secret, skips the mask, and deletes a cleared one", () => {
    const stored: L2TPPPPOptions = { ipv6_peer_interface_id_secret: MASKED_SECRET };
    assert.deepEqual(
      buildPPPOptionsOps({}, { ipv6_peer_interface_id_secret: SECRET }, true),
      [{ op: "set_ppp_ipv6_peer_interface_id_secret", value: SECRET }],
    );
    assert.deepEqual(buildPPPOptionsOps(stored, { ipv6_peer_interface_id_secret: MASKED_SECRET }, true), []);
    assert.deepEqual(
      buildPPPOptionsOps(stored, { ipv6_peer_interface_id_secret: "" }, true),
      [{ op: "delete_ppp_ipv6_peer_interface_id_secret" }],
    );
    assert.deepEqual(buildPPPOptionsOps({}, { ipv6_peer_interface_id_secret: "" }, true), []);
  });

  it("never sends the secret where the device has no such leaf", () => {
    assert.deepEqual(buildPPPOptionsOps({}, { ipv6_peer_interface_id_secret: SECRET }, false), []);
  });
});

describe("pppOptionsProblem", () => {
  it("requires the secret for calling-sid on a device that has it", () => {
    assert.equal(
      pppOptionsProblem({}, { ipv6_peer_interface_id: " calling-sid ", ipv6_peer_interface_id_secret: "" }, true),
      "peerInterfaceIdSecretRequired",
    );
    assert.equal(
      pppOptionsProblem(
        { ipv6_peer_interface_id: "calling-sid", ipv6_peer_interface_id_secret: MASKED_SECRET },
        { ipv6_peer_interface_id: "calling-sid", ipv6_peer_interface_id_secret: "" },
        true,
      ),
      "peerInterfaceIdSecretRequired",
    );
    assert.equal(
      pppOptionsProblem(
        { ipv6_peer_interface_id_secret: MASKED_SECRET },
        { ipv6_peer_interface_id: "calling-sid", ipv6_peer_interface_id_secret: MASKED_SECRET },
        true,
      ),
      null,
    );
    assert.equal(pppOptionsProblem({}, { ipv6_peer_interface_id: "calling-sid" }, false), null);
  });

  it("rejects a secret the lab syntax refuses", () => {
    for (const bad of ["short", "has space in it 0123", "x".repeat(129), "\u00e9".repeat(16)]) {
      assert.equal(
        pppOptionsProblem({}, { ipv6_peer_interface_id_secret: bad }, true),
        "peerInterfaceIdSecretInvalid",
      );
    }
    assert.equal(pppOptionsProblem({}, { ipv6_peer_interface_id_secret: SECRET }, true), null);
  });

  it("does not take a typed mask as a stored secret", () => {
    assert.equal(
      pppOptionsProblem(
        {},
        { ipv6_peer_interface_id: "calling-sid", ipv6_peer_interface_id_secret: MASKED_SECRET },
        true,
      ),
      "peerInterfaceIdSecretInvalid",
    );
  });
});

describe("replaceMask", () => {
  it("replaces the loaded mask instead of appending to it", () => {
    assert.equal(replaceMask(MASKED_SECRET, `${MASKED_SECRET}${SECRET}`), SECRET);
    assert.equal(replaceMask(MASKED_SECRET, "**"), "");
    assert.equal(replaceMask(MASKED_SECRET, "n"), "n");
    assert.equal(replaceMask("abc", "abcd"), "abcd");
    assert.equal(replaceMask("", MASKED_SECRET), MASKED_SECRET);
  });
});

describe("l2tpService.updatePPPOptions", () => {
  it("posts the built ops under the global item name", async () => {
    const { service, sent } = stubbed();
    await service.updatePPPOptions(
      { ipv6_peer_interface_id_secret: MASKED_SECRET },
      { ipv6_peer_interface_id: "calling-sid", ipv6_peer_interface_id_secret: MASKED_SECRET },
      true,
    );
    assert.deepEqual(sent, [["l2tp", [{ op: "set_ppp_ipv6_peer_interface_id", value: "calling-sid" }]]]);
  });

  it("skips the post when nothing changed", async () => {
    const { service, sent } = stubbed();
    const result = await service.updatePPPOptions({ mru: "1400" }, { mru: "1400" }, true);
    assert.deepEqual(result, { success: true });
    assert.deepEqual(sent, []);
  });
});
