import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { connectionLineMatchesIp } from "./pppoe-connections";

describe("connectionLineMatchesIp", () => {
  it("matches the session IP as a token", () => {
    assert.equal(
      connectionLineMatchesIp("42  100.127.200.187:51234  1.1.1.1:443  tcp  ESTABLISHED", "100.127.200.187"),
      true,
    );
  });

  it("does not match a longer address that shares a prefix", () => {
    assert.equal(
      connectionLineMatchesIp("42  100.127.200.187:51234  1.1.1.1:443  tcp", "100.127.200.18"),
      false,
    );
  });
});
