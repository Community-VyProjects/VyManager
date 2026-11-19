import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

// Access-list and prefix-list name pickers are one control. These checks
// catch a protocol growing its own none-plus-names copy again.

const FRONTEND = fileURLToPath(new URL("../..", import.meta.url));

const SHARED = "src/components/ui/named-list-select.tsx";
const CALLERS = [
  "src/components/babel/BabelContent.tsx",
  "src/components/babel/BabelDistributeListInterfaceModal.tsx",
  "src/components/rip/RipContent.tsx",
  "src/components/rip/RipDistributeListInterfaceModal.tsx",
  "src/components/rip/RipNetworkDistanceModal.tsx",
  "src/components/ospf/OspfAreaModal.tsx",
];

describe("named list select", () => {
  it("is the one none-plus-names control and uses a non-colliding sentinel", () => {
    const src = readFileSync(join(FRONTEND, SHARED), "utf8");
    assert.match(src, /__none__/);
    assert.match(src, /value \|\| NONE_SENTINEL/);
    assert.doesNotMatch(src, /value="none"/);
    assert.equal(existsSync(join(FRONTEND, "src/components/babel/BabelListSelect.tsx")), false);
  });

  it("replaces the RIP, OSPF, and Babel copies", () => {
    for (const file of CALLERS) {
      const src = readFileSync(join(FRONTEND, file), "utf8");
      assert.match(src, /NamedListSelect/, file);
      assert.doesNotMatch(src, /BabelListSelect/, file);
      assert.doesNotMatch(src, /accessListNames\.map/, file);
      assert.doesNotMatch(src, /prefixListNames\.map/, file);
    }
  });

  it("does not keep a route-map copy on the RIP page", () => {
    const src = readFileSync(join(FRONTEND, "src/components/rip/RipContent.tsx"), "utf8");
    assert.doesNotMatch(src, /routeMapNames\.map/);
  });

  it("uses InterfaceSelect for the RIP distribute-list interface", () => {
    const src = readFileSync(join(FRONTEND, "src/components/rip/RipDistributeListInterfaceModal.tsx"), "utf8");
    assert.match(src, /InterfaceSelect/);
    assert.doesNotMatch(src, /from "@\/components\/ui\/select"/);
  });
});
