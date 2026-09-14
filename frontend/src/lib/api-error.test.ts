import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isDisconnectError, stackRestartOrder, thrownMessage } from "./api-error";

describe("thrownMessage", () => {
  it("reads ApiError objects", () => {
    assert.equal(thrownMessage({ message: "Failed to proxy request to backend" }), "Failed to proxy request to backend");
  });
});

describe("isDisconnectError", () => {
  it("treats the Next.js proxy 500 as a drop", () => {
    assert.equal(
      isDisconnectError({ message: "Failed to proxy request to backend" }),
      true,
    );
  });
});

describe("stackRestartOrder", () => {
  it("restarts backend last", () => {
    const names = ["vymanager-backend", "vymanager-postgres", "vymanager-frontend"];
    names.sort((a, b) => stackRestartOrder(a) - stackRestartOrder(b));
    assert.deepEqual(names, ["vymanager-postgres", "vymanager-frontend", "vymanager-backend"]);
  });
});
