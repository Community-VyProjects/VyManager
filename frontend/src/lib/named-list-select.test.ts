import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import {
  fromNamedListValue,
  listedNames,
  NONE_SENTINEL,
  toNamedListValue,
} from "./named-list-select-options.ts";

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

describe("named list select options", () => {
  it("maps none onto a sentinel that cannot collide with a list named none", () => {
    assert.equal(toNamedListValue(""), NONE_SENTINEL);
    assert.equal(toNamedListValue("none"), "none");
    assert.equal(fromNamedListValue(NONE_SENTINEL), "");
    assert.equal(fromNamedListValue("none"), "none");
    assert.notEqual(NONE_SENTINEL, "none");
  });

  it("keeps a configured name the loaded list does not include", () => {
    assert.deepEqual(listedNames(["a", "b"], "kept"), ["kept", "a", "b"]);
    assert.deepEqual(listedNames(["a", "kept"], "kept"), ["a", "kept"]);
    assert.deepEqual(listedNames(["", NONE_SENTINEL, "a"], ""), ["a"]);
  });
});

describe("named list select", () => {
  it("is the one none-plus-names control", () => {
    const src = readFileSync(join(FRONTEND, SHARED), "utf8");
    assert.match(src, /toNamedListValue/);
    assert.match(src, /fromNamedListValue/);
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
    assert.match(src, /filter=/);
    assert.doesNotMatch(src, /from "@\/components\/ui\/select"/);
    assert.doesNotMatch(src, /type: ""/);
  });

  it("keeps the lab default value on the RIP passive-interface picker", () => {
    const src = readFileSync(join(FRONTEND, "src/components/rip/RipContent.tsx"), "utf8");
    assert.match(src, /noneOption=\{\{ label: "default", value: "default" \}\}/);
  });

  it("does not send OSPF area authentication none as a set value", () => {
    const src = readFileSync(join(FRONTEND, "src/components/ospf/OspfAreaModal.tsx"), "utf8");
    assert.match(src, /NONE_SENTINEL/);
    assert.doesNotMatch(src, /SelectItem value="none"/);
  });
});
