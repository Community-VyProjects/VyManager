import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { chainDefaultActions } from "./firewall-default-actions";

const policiesPage = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), "../app/firewall/policies/page.tsx"),
  "utf8",
);

describe("chainDefaultActions", () => {
  it("adds return only for a named chain", () => {
    assert.deepEqual(
      chainDefaultActions(["accept", "drop", "reject"], true),
      ["accept", "drop", "reject", "return"],
    );
  });

  it("does not add return for base, prerouting, or zone lists", () => {
    assert.deepEqual(
      chainDefaultActions(["accept", "drop", "reject"], false),
      ["accept", "drop", "reject"],
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

describe("policies default-action dropdown", () => {
  it("passes the custom-chain flag into chainDefaultActions", () => {
    const call = policiesPage.match(
      /chainDefaultActions\(\s*\["accept", "drop", "reject"\],\s*selectedProtocol === "ipv4" \? isCustomChain : isCustomChainIPv6,?\s*\)/,
    );
    assert.ok(
      call,
      "policies default-action select must pass the custom-chain flag",
    );
    assert.equal(policiesPage.includes('value="return"'), false);
  });
});
