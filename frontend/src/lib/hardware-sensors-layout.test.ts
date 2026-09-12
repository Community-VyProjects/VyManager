import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { hardwareSensorsLayout } from "./hardware-sensors-layout";

describe("hardwareSensorsLayout", () => {
  it("uses a single inner column at span 1 so names are not squeezed", () => {
    const layout = hardwareSensorsLayout(1);
    assert.equal(layout.wide, false);
    assert.equal(layout.showLiveLabel, false);
    assert.match(layout.tileGridClass, /grid-cols-1/);
    assert.doesNotMatch(layout.tileGridClass, /sm:/);
    assert.match(layout.statusClass, /flex-col/);
    assert.match(layout.tileClass, /flex-col/);
    assert.match(layout.nameClass, /break-words/);
    assert.doesNotMatch(layout.nameClass, /truncate/);
  });

  it("uses two inner columns at span 2 and 3", () => {
    for (const span of [2, 3]) {
      const layout = hardwareSensorsLayout(span);
      assert.equal(layout.wide, true);
      assert.equal(layout.showLiveLabel, true);
      assert.match(layout.tileGridClass, /grid-cols-2/);
      assert.match(layout.statusClass, /flex-row/);
    }
  });

  it("treats a missing span as one column", () => {
    assert.equal(hardwareSensorsLayout(undefined).wide, false);
  });
});
