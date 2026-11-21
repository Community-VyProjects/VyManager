import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildPPPOptionsOps,
  firstMaskEdit,
  pppOptionsProblem,
  type L2TPPPPOptionsUpdate,
} from "./l2tp-ppp-save-ops";
import { l2tpService, type BatchOperation, type L2TPPPPOptions } from "./l2tp";

/** What the config response returns for a stored secret. */
const MASK = "***";
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
      ipv6_peer_interface_id_secret: MASK,
    };
    const updated: L2TPPPPOptionsUpdate = {
      ipv4: "allow",
      mru: "1400",
      disable_ccp: true,
      ipv6_peer_interface_id: "calling-sid",
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

  it("sets a typed secret, keeps an untouched one, and deletes a cleared one", () => {
    const stored: L2TPPPPOptions = { ipv6_peer_interface_id_secret: MASK };
    assert.deepEqual(
      buildPPPOptionsOps({}, { ipv6_peer_interface_id_secret: SECRET }, true),
      [{ op: "set_ppp_ipv6_peer_interface_id_secret", value: SECRET }],
    );
    assert.deepEqual(
      buildPPPOptionsOps(stored, { ipv6_peer_interface_id_secret: `${MASK}${SECRET}` }, true),
      [{ op: "set_ppp_ipv6_peer_interface_id_secret", value: `${MASK}${SECRET}` }],
    );
    assert.deepEqual(buildPPPOptionsOps(stored, { ipv6_peer_interface_id_secret: undefined }, true), []);
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
        { ipv6_peer_interface_id: "calling-sid", ipv6_peer_interface_id_secret: MASK },
        { ipv6_peer_interface_id: "calling-sid", ipv6_peer_interface_id_secret: "" },
        true,
      ),
      "peerInterfaceIdSecretRequired",
    );
    assert.equal(
      pppOptionsProblem({ ipv6_peer_interface_id_secret: MASK }, { ipv6_peer_interface_id: "calling-sid" }, true),
      null,
    );
    assert.equal(pppOptionsProblem({}, { ipv6_peer_interface_id: "calling-sid" }, false), null);
  });

  it("rejects a typed secret the lab syntax refuses, a typed mask included", () => {
    for (const bad of ["short", "has space in it 0123", "x".repeat(129), "\u00e9".repeat(16), MASK]) {
      assert.equal(
        pppOptionsProblem({ ipv6_peer_interface_id_secret: MASK }, { ipv6_peer_interface_id_secret: bad }, true),
        "peerInterfaceIdSecretInvalid",
      );
      assert.equal(
        pppOptionsProblem({}, { ipv6_peer_interface_id: "calling-sid", ipv6_peer_interface_id_secret: bad }, true),
        "peerInterfaceIdSecretInvalid",
      );
    }
    assert.equal(pppOptionsProblem({}, { ipv6_peer_interface_id_secret: SECRET }, true), null);
    assert.equal(pppOptionsProblem({}, { ipv6_peer_interface_id_secret: `${MASK}${SECRET}` }, true), null);
  });
});

describe("firstMaskEdit", () => {
  it("keeps only the inserted text wherever the caret was", () => {
    assert.equal(firstMaskEdit(MASK, "x", [0, 3]), "x");
    assert.equal(firstMaskEdit(MASK, SECRET, [0, 3]), SECRET);
    assert.equal(firstMaskEdit(MASK, `${MASK}${SECRET}`, [0, 3]), `${MASK}${SECRET}`);
    assert.equal(firstMaskEdit(MASK, `x${MASK}`, [0, 0]), "x");
    assert.equal(firstMaskEdit(MASK, "*x**", [1, 1]), "x");
    assert.equal(firstMaskEdit(MASK, `${MASK}x`, [3, 3]), "x");
    assert.equal(firstMaskEdit(MASK, `*${SECRET}`, [1, 3]), SECRET);
    assert.equal(firstMaskEdit(MASK, "*", [0, 3]), "*");
  });

  it("clears the field on a deletion", () => {
    assert.equal(firstMaskEdit(MASK, "**", [3, 3]), "");
    assert.equal(firstMaskEdit(MASK, "**", [0, 0]), "");
    assert.equal(firstMaskEdit(MASK, "", [0, 3]), "");
    assert.equal(firstMaskEdit(MASK, "*", [0, 2]), "");
  });

  it("takes a value that replaced the mask wholesale (autofill) as new text", () => {
    assert.equal(firstMaskEdit(MASK, "password123", [3, 3]), "password123");
  });
});

describe("l2tpService.updatePPPOptions", () => {
  it("posts the built ops under the global item name", async () => {
    const { service, sent } = stubbed();
    await service.updatePPPOptions(
      { ipv6_peer_interface_id_secret: MASK },
      { ipv6_peer_interface_id: "calling-sid" },
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
