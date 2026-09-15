import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  backendIsReachable,
  isDisconnectError,
  stackRestartOrder,
  thrownMessage,
  waitForBackend,
} from "./api-error";

describe("thrownMessage", () => {
  it("reads ApiError objects", () => {
    assert.equal(
      thrownMessage({ message: "Failed to proxy request to backend" }),
      "Failed to proxy request to backend",
    );
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
  it("restarts frontend last so the UI can wait on the API", () => {
    const names = ["vymanager-backend", "vymanager-postgres", "vymanager-frontend"];
    names.sort((a, b) => stackRestartOrder(a) - stackRestartOrder(b));
    assert.deepEqual(names, [
      "vymanager-postgres",
      "vymanager-backend",
      "vymanager-frontend",
    ]);
  });
});

describe("backendIsReachable", () => {
  it("treats 500 proxy failures as down", async () => {
    const fetcher = async () => ({
      status: 500,
      json: async () => ({ error: "Failed to proxy request to backend" }),
    });
    assert.equal(await backendIsReachable(fetcher), false);
  });

  it("treats 401 as up (backend answered)", async () => {
    const fetcher = async () => ({
      status: 401,
      json: async () => ({ detail: "Authentication required" }),
    });
    assert.equal(await backendIsReachable(fetcher), true);
  });
});

describe("waitForBackend", () => {
  it("returns true once a probe succeeds", async () => {
    let n = 0;
    const fetcher = async () => {
      n += 1;
      if (n < 3) {
        throw new Error("fetch failed");
      }
      return { status: 200, json: async () => ({}) };
    };
    const ok = await waitForBackend({
      fetcher,
      timeoutMs: 5_000,
      intervalMs: 1,
      sleep: async () => undefined,
    });
    assert.equal(ok, true);
    assert.equal(n, 3);
  });
});
