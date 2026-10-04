import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { chainDefaultActions } from "./firewall-default-actions";

describe("chainDefaultActions", () => {
  it("adds return only for a named chain", () => {
    assert.deepEqual(
      chainDefaultActions(["accept", "drop", "reject"], true),
      ["accept", "drop", "reject", "return"],
    );
    assert.deepEqual(
      chainDefaultActions(["accept", "drop"], true),
      ["accept", "drop", "return"],
    );
  });

  it("does not add return for base, prerouting, or zone lists", () => {
    assert.deepEqual(
      chainDefaultActions(["accept", "drop", "reject"], false),
      ["accept", "drop", "reject"],
    );
    assert.deepEqual(
      chainDefaultActions(["accept", "drop"], false),
      ["accept", "drop"],
    );
    assert.deepEqual(
      chainDefaultActions(["drop", "reject"], false),
      ["drop", "reject"],
    );
  });

  it("does not duplicate return or mutate the caller list", () => {
    const existing = ["drop", "accept", "reject", "return"];
    assert.deepEqual(chainDefaultActions(existing, true), existing);
    assert.deepEqual(existing, ["drop", "accept", "reject", "return"]);
  });
});
