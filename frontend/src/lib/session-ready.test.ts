import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { confirmLoggedIn } from "./session-ready";

describe("confirmLoggedIn", () => {
  it("trusts a hook session with a user", async () => {
    let fetched = false;
    const ok = await confirmLoggedIn({ user: { id: "1" } }, async () => {
      fetched = true;
      return { data: null };
    });
    assert.equal(ok, true);
    assert.equal(fetched, false);
  });

  it("refetches when the hook has no user", async () => {
    const ok = await confirmLoggedIn(null, async () => ({ data: { user: { id: "1" } } }));
    assert.equal(ok, true);
  });

  it("is logged out when refetch has no user", async () => {
    const ok = await confirmLoggedIn(undefined, async () => ({ data: null }));
    assert.equal(ok, false);
  });
});
