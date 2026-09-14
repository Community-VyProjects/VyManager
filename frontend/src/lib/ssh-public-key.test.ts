import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { opensshPublicKeyParts } from "./ssh-public-key";

describe("opensshPublicKeyParts", () => {
  it("splits type and key data", () => {
    const parsed = opensshPublicKeyParts("ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIcomment user@host");
    assert.deepEqual(parsed, {
      type: "ssh-ed25519",
      data: "AAAAC3NzaC1lZDI1NTE5AAAAIcomment",
    });
  });

  it("rejects junk", () => {
    assert.equal(opensshPublicKeyParts(""), null);
    assert.equal(opensshPublicKeyParts("ssh-ed25519"), null);
  });
});
