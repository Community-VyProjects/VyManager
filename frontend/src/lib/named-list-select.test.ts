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
  "src/components/ripng/RipngContent.tsx",
  "src/components/ripng/RipngDistributeListInterfaceModal.tsx",
  "src/components/ospfv3/Ospfv3AreaModal.tsx",
];

// Route-map pickers that must use the shared control.
const ROUTE_MAP_CALLERS = [
  "src/components/rip/RipRedistributeModal.tsx",
  "src/components/ripng/RipngContent.tsx",
  "src/components/ripng/RipngRedistributeModal.tsx",
  "src/components/ospfv3/Ospfv3Content.tsx",
  "src/components/ospfv3/Ospfv3RedistributeModal.tsx",
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

  it("replaces the RIP, RIPng, OSPF, OSPFv3, and Babel copies", () => {
    for (const file of CALLERS) {
      const src = readFileSync(join(FRONTEND, file), "utf8");
      assert.match(src, /NamedListSelect/, file);
      assert.doesNotMatch(src, /BabelListSelect/, file);
      assert.doesNotMatch(src, /accessListNames\.map/, file);
      assert.doesNotMatch(src, /prefixListNames\.map/, file);
      assert.doesNotMatch(src, /"__none__"|value="none"/, file);
    }
  });

  it("does not keep a route-map copy on the RIP page", () => {
    const src = readFileSync(join(FRONTEND, "src/components/rip/RipContent.tsx"), "utf8");
    assert.doesNotMatch(src, /routeMapNames\.map/);
  });

  it("reads the RIP redistribute protocols from capabilities", () => {
    const modal = readFileSync(join(FRONTEND, "src/components/rip/RipRedistributeModal.tsx"), "utf8");
    assert.doesNotMatch(modal, /ALL_PROTOCOLS|"nhrp"/);
    const page = readFileSync(join(FRONTEND, "src/components/rip/RipContent.tsx"), "utf8");
    assert.match(page, /protocols=\{capabilities\?\.features\.redistribute\.protocols \|\| \[\]\}/);
  });

  it("does not keep a route-map copy in RIP, RIPng or OSPFv3", () => {
    for (const file of ROUTE_MAP_CALLERS) {
      const src = readFileSync(join(FRONTEND, file), "utf8");
      assert.match(src, /NamedListSelect/, file);
      assert.doesNotMatch(src, /routeMapNames\.map/, file);
      assert.doesNotMatch(src, /"__none__"|value="none"/, file);
    }
  });

  it("loads the IPv6 access and prefix lists that RIPng and OSPFv3 reference", () => {
    for (const file of ["src/components/ripng/RipngContent.tsx", "src/components/ospfv3/Ospfv3Content.tsx"]) {
      const src = readFileSync(join(FRONTEND, file), "utf8");
      assert.doesNotMatch(src, /ipv4_lists/, file);
      assert.match(src, /accessListService\.getConfig\(\)\.then\(\(c\) => c\.ipv6_lists/, file);
    }
    const ripng = readFileSync(join(FRONTEND, "src/components/ripng/RipngContent.tsx"), "utf8");
    assert.match(ripng, /prefixListService\.getConfig\(\)\.then\(\(c\) => c\.ipv6_lists/);
  });

  it("uses InterfaceSelect for the RIPng distribute-list and passive interfaces", () => {
    const modal = readFileSync(join(FRONTEND, "src/components/ripng/RipngDistributeListInterfaceModal.tsx"), "utf8");
    assert.match(modal, /InterfaceSelect/);
    assert.match(modal, /filter=/);
    assert.doesNotMatch(modal, /from "@\/components\/ui\/select"/);
    const page = readFileSync(join(FRONTEND, "src/components/ripng/RipngContent.tsx"), "utf8");
    assert.match(page, /InterfaceSelect/);
    assert.match(page, /label: "default", value: "default"/);
    assert.match(page, /items\.includes\("default"\)/);
    assert.doesNotMatch(page, /showService/);
  });

  it("uses InterfaceSelect for the RIP distribute-list interface", () => {
    const src = readFileSync(join(FRONTEND, "src/components/rip/RipDistributeListInterfaceModal.tsx"), "utf8");
    assert.match(src, /InterfaceSelect/);
    assert.match(src, /filter=/);
    assert.doesNotMatch(src, /from "@\/components\/ui\/select"/);
    assert.doesNotMatch(src, /type: ""/);
    assert.match(src, /!aclIn && !aclOut && !plIn && !plOut\) return t\("validation\.selectList"\)/);
  });

  it("labels the RIP list-section inputs", () => {
    const src = readFileSync(join(FRONTEND, "src/components/rip/RipContent.tsx"), "utf8");
    assert.match(src, /<Label htmlFor=\{inputId\}/);
    for (const id of ["ripNetworks", "neighbors", "staticRoutes", "passiveInterfaces"]) {
      assert.match(src, new RegExp(`"rip-list-${id}"`), id);
    }
  });

  it("keeps the RIP delete dialog open with the device error", () => {
    const src = readFileSync(join(FRONTEND, "src/components/rip/DeleteRipModal.tsx"), "utf8");
    assert.match(src, /event\.preventDefault\(\)/);
    assert.match(src, /\(err as ApiError\)\.message/);
    assert.match(src, /if \(loading\) return;/);
  });

  it("keeps the RIP modals open during a save and shows the ApiError detail", () => {
    for (const file of [
      "src/components/rip/RipRedistributeModal.tsx",
      "src/components/rip/RipNetworkDistanceModal.tsx",
      "src/components/rip/RipDistributeListInterfaceModal.tsx",
    ]) {
      const src = readFileSync(join(FRONTEND, file), "utf8");
      assert.match(src, /if \(!next && !loading\) handleClose\(\);/, file);
      assert.match(src, /<Dialog open=\{open\} onOpenChange=\{handleOpenChange\}>/, file);
      assert.match(src, /\(err as ApiError\)\.message/, file);
      assert.doesNotMatch(src, /instanceof Error/, file);
    }
  });

  it("keeps the RIP page mounted on refresh and re-reads after a failed overview save", () => {
    const src = readFileSync(join(FRONTEND, "src/components/rip/RipContent.tsx"), "utf8");
    assert.match(src, /if \(loading && !config\)/);
    assert.doesNotMatch(src, /instanceof Error/);
    assert.match(src, /onClick=\{cancelEditOverview\} disabled=\{overviewSaving\}/);
    assert.match(src, /onClick=\{cancelEditDlGlobal\} disabled=\{dlGlobalSaving\}/);
    const save = src.slice(src.indexOf("const saveOverview"), src.indexOf("// Networks tab handlers"));
    assert.match(save, /catch \(err\) \{[\s\S]*await loadData\(true\);[\s\S]*\} finally/);
    assert.match(save, /overviewProblem\(/);
    assert.match(src, /onClick=\{\(\) => loadData\(true\)\} disabled=\{loading\}/);
    assert.match(src, /disabled=\{busy \|\| !inputValue\.trim\(\)\}/);
    assert.match(src, /runListAction\(inputId, \(\) => onRemove\(item\)\)/);
  });

  it("validates RIP metric and distance with the shared lab ranges", () => {
    const redist = readFileSync(join(FRONTEND, "src/components/rip/RipRedistributeModal.tsx"), "utf8");
    assert.match(redist, /inRange\(metric, METRIC_RANGE\)/);
    const nd = readFileSync(join(FRONTEND, "src/components/rip/RipNetworkDistanceModal.tsx"), "utf8");
    assert.match(nd, /inRange\(distance, DISTANCE_RANGE\)/);
    for (const src of [redist, nd]) assert.doesNotMatch(src, /parseInt\([^)]*\)[^;]*(<|>) ?\d/);
  });

  it("keeps the lab default value on the RIP passive-interface picker", () => {
    const src = readFileSync(join(FRONTEND, "src/components/rip/RipContent.tsx"), "utf8");
    assert.match(src, /label: "default", value: "default"/);
    assert.match(src, /items\.includes\("default"\)/);
  });

  it("does not send OSPF area authentication none as a set value", () => {
    const src = readFileSync(join(FRONTEND, "src/components/ospf/OspfAreaModal.tsx"), "utf8");
    assert.match(src, /NONE_SENTINEL/);
    assert.doesNotMatch(src, /SelectItem value="none"/);
  });
});
