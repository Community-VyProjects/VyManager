import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { navigation } from "./navigation";

describe("monitoring navigation", () => {
  it("does not deep-link a conntrack monitor that is not a VyOS command", () => {
    const monitoring = navigation.find((item) => item.href === "/monitoring");
    assert.ok(monitoring);
    const sections = monitoring.sections ?? [];
    assert.equal(sections.some((section) => section.id === "monitor-conntrack"), false);
    assert.equal(
      sections.some((section) => section.searchParams?.command === "monitor_conntrack"),
      false,
    );
  });
});
