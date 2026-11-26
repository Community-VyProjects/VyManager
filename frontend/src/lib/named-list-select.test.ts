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
  "src/components/pim/PimContent.tsx",
  "src/components/pim/PimInterfaceModal.tsx",
  "src/components/pim6/Pim6RpAddressModal.tsx",
];

// Route-map pickers that must use the shared control.
const ROUTE_MAP_CALLERS = [
  "src/components/rip/RipRedistributeModal.tsx",
  "src/components/ripng/RipngContent.tsx",
  "src/components/ripng/RipngRedistributeModal.tsx",
  "src/components/ospf/OspfContent.tsx",
  "src/components/ospf/OspfRedistributeModal.tsx",
  "src/components/ospfv3/Ospfv3Content.tsx",
  "src/components/ospfv3/Ospfv3RedistributeModal.tsx",
  "src/components/isis/IsisDefaultInfoModal.tsx",
  "src/components/isis/IsisRedistributeModal.tsx",
  "src/components/bgp/BgpContent.tsx",
  "src/components/bgp/BgpNeighborModal.tsx",
  "src/components/bgp/BgpPeerGroupModal.tsx",
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

  it("does not keep a route-map copy in RIP, RIPng, OSPF, OSPFv3, IS-IS or BGP", () => {
    for (const file of ROUTE_MAP_CALLERS) {
      const src = readFileSync(join(FRONTEND, file), "utf8");
      assert.match(src, /NamedListSelect/, file);
      assert.doesNotMatch(src, /routeMapNames\.map/, file);
      assert.doesNotMatch(src, /"__none__"|value="none"/, file);
    }
  });

  it("uses the shared control for the high-availability value picks", () => {
    for (const file of [
      "src/components/high-availability/VirtualServerModal.tsx",
      "src/components/high-availability/VrrpGroupModal.tsx",
      "src/components/high-availability/HighAvailabilityContent.tsx",
    ]) {
      const src = readFileSync(join(FRONTEND, file), "utf8");
      assert.match(src, /<NamedListSelect/, file);
      assert.doesNotMatch(src, /NONE_SENTINEL|"__none__"|<SelectItem/, file);
    }
  });

  it("uses the shared control for the BGP peer-group and BFD profile picks", () => {
    const neighbor = readFileSync(join(FRONTEND, "src/components/bgp/BgpNeighborModal.tsx"), "utf8");
    assert.match(neighbor, /<NamedListSelect id="bgp-neighbor-peer-group" value=\{peerGroup\} names=\{peerGroups\}/);
    assert.match(neighbor, /<NamedListSelect id="bgp-neighbor-bfd-profile" value=\{bfdProfile\} names=\{bfdProfileNames\}/);
    assert.doesNotMatch(neighbor, /(peerGroups|bfdProfileNames)\.map/);
    const peerGroup = readFileSync(join(FRONTEND, "src/components/bgp/BgpPeerGroupModal.tsx"), "utf8");
    assert.match(peerGroup, /<NamedListSelect id="bgp-pg-bfd-profile" value=\{bfdProfile\} names=\{bfdProfileNames\}/);
    assert.doesNotMatch(peerGroup, /bfdProfileNames\.map/);
  });

  it("keeps the BGP dialogs open during a save and the page mounted on refresh", () => {
    for (const file of ["src/components/bgp/BgpNeighborModal.tsx", "src/components/bgp/BgpPeerGroupModal.tsx"]) {
      const src = readFileSync(join(FRONTEND, file), "utf8");
      assert.match(src, /if \(!next && !loading\) handleClose\(\);/, file);
      assert.match(src, /<Dialog open=\{open\} onOpenChange=\{handleOpenChange\}>/, file);
      assert.match(src, /type="password"\s+autoComplete="new-password"/, file);
    }
    for (const file of ["src/components/bgp/DeleteBgpNeighborModal.tsx", "src/components/bgp/DeleteBgpPeerGroupModal.tsx"]) {
      const src = readFileSync(join(FRONTEND, file), "utf8");
      assert.match(src, /if \(loading\) return;/, file);
      assert.match(src, /<AlertDialog open=\{open\} onOpenChange=\{handleOpenChange\}>/, file);
      assert.doesNotMatch(src, /useEffect/, file);
    }
    const page = readFileSync(join(FRONTEND, "src/components/bgp/BgpContent.tsx"), "utf8");
    assert.match(page, /if \(loading && !config\)/);
    assert.match(page, /onClick=\{\(\) => loadData\(true\)\}\s+disabled=\{loading\}/);
    assert.match(page, /if \(!open && !pageConfirmSaving\)/);
    assert.equal((page.match(/if \(!open && !bmpSaving\)/g) ?? []).length, 2);
  });

  it("offers the lab graceful-restart values and rejects a BGP neighbor or peer group that exists", () => {
    const neighbor = readFileSync(join(FRONTEND, "src/components/bgp/BgpNeighborModal.tsx"), "utf8");
    const peerGroup = readFileSync(join(FRONTEND, "src/components/bgp/BgpPeerGroupModal.tsx"), "utf8");
    for (const src of [neighbor, peerGroup]) {
      assert.match(src, /<SelectItem value="restart-helper">/);
      assert.doesNotMatch(src, /<SelectItem value="restart">/);
    }
    assert.match(neighbor, /!isEditMode && configuredAddresses\.some\(\(a\) => sameNeighborAddress\(a, trimmed\)\)/);
    assert.match(neighbor, /!isEditMode && !isIPAddress\(trimmed\)/);
    assert.match(neighbor, /peerProblem\(\{[\s\S]*?neighbor: \{\s*address: trimmed,\s*peerGroup,\s*peerGroupRemoteAs: peerGroupRemoteAs\[peerGroup\],\s*memberRemoteAs: \(peerGroupMembers\[peerGroup\] \?\? \[\]\)/);
    assert.match(neighbor, /labeledUnicastConflict\(Object\.keys\(addressFamilies\)\)/);
    assert.match(peerGroup, /members: existingPeerGroup \? \(peerGroupMembers\[existingPeerGroup\.name\] \?\? \[\]\) : \[\]/);
    assert.match(peerGroup, /labeledUnicastConflict\(enabledAFs\)/);
    assert.match(neighbor, /routeReflectorClient: Object\.values\(addressFamilies\)\.some\(\(af\) => af\.route_reflector_client\)/);
    assert.match(peerGroup, /routeReflectorClient: \[\.\.\.enabledAFs\]\.some\(\(afi\) => afConfigs\[afi\]\?\.route_reflector_client\)/);
    assert.match(neighbor, /remoteAs: remoteAsNumber\(remoteAs\)/);
    assert.match(peerGroup, /peerProblem\(\{/);
    assert.match(peerGroup, /remoteAs: remoteAsNumber\(remoteAs\)/);
    assert.match(neighbor, /firstRangeProblem\(/);
    assert.match(neighbor, /NEIGHBOR_AF_RANGES/);
    assert.match(peerGroup, /PEER_GROUP_RANGES/);
    assert.match(peerGroup, /!isEditMode && configuredNames\.includes\(name\.trim\(\)\)/);
    assert.doesNotMatch(peerGroup, /localAsRequired|localRoleRequired/);
  });

  it("keeps the BGP edit target while the modal saves and rejects duplicate page adds", () => {
    const page = readFileSync(join(FRONTEND, "src/components/bgp/BgpContent.tsx"), "utf8");
    for (const handler of ["handleUpdateNeighbor", "handleDeleteNeighbor", "handleUpdatePeerGroup", "handleDeletePeerGroup"]) {
      const body = page.slice(page.indexOf(`const ${handler}`), page.indexOf("};", page.indexOf(`const ${handler}`)));
      assert.doesNotMatch(body, /set(Editing|Deleting)(Neighbor|PeerGroup)\(null\)/, handler);
    }
    assert.match(page, /\}, \[t\]\);/);
    assert.match(page, /content\.networkExists/);
    assert.match(page, /content\.aggregateExists/);
    assert.match(page, /staticRoutesService\.getConfig\(\)/);
    assert.match(page, /names=\{staticTableIds\.filter\(/);
    assert.doesNotMatch(page, /<Input type="number" value=\{afRedistTable\}/);
    assert.match(page, /setAfRedistProto\(""\);\n\s*setAfRedistTable\(""\);\n\s*\}, \[selectedAfi\]\);/);
    assert.match(page, /content\.bmpTargetExists/);
    assert.match(page, /const bmpTargetOk = [^\n]*\n\s*if \(!isIPAddress\(address\)\) \{/);
    assert.equal(page.match(/isNetworkPrefix\(prefix, afiFamily\(selectedAfi\)\)/g)?.length, 2);
    assert.match(page, /content\.systemAsRequired/);
    assert.match(page, /\.filter\(\(p\) => !currentAf\?\.redistribute\.some\(\(r\) => r\.protocol === p\)\)/);
    const neighbor = readFileSync(join(FRONTEND, "src/components/bgp/BgpNeighborModal.tsx"), "utf8");
    assert.match(neighbor, /existingNeighbor\?\.address_families\[afi\]/);
    assert.match(page, /const afLeaves = capabilities\?\.address_family_leaves\?\.global\?\.\[selectedAfi\] \?\? \[\];/);
    assert.match(page, /\{afLeaves\.includes\("network"\) && \(/);
    assert.match(page, /hasWritePermission && afLeaves\.includes\("network route-map"\) && \(/);
    assert.match(page, /\{afLeaves\.includes\("aggregate-address"\) && \(/);
    assert.match(page, /\{afRedistributeAll\.length > 0 && \(/);
    assert.match(neighbor, /capabilities\?\.address_family_leaves\?\.neighbor\?\.\[afi\]/);
    for (const leaf of ["nexthop-self", "default-originate", "as-override", "remove-private-as", "maximum-prefix", "allowas-in", "weight"]) {
      assert.ok(neighbor.includes(`{afHasLeaf(afi, "${leaf}") && (`), leaf);
    }
  });

  it("hides BGP write controls from read-only users", () => {
    const page = readFileSync(join(FRONTEND, "src/components/bgp/BgpContent.tsx"), "utf8");
    assert.match(page, /const hasWritePermission = canWrite\(FeatureGroup\.BGP\);/);
    assert.doesNotMatch(page, /^\s*<TableHead className="text-right">\{tc\("actions"\)\}<\/TableHead>$/m);
    assert.match(page, /!hasWritePermission \? null : !overviewEditing/);
    assert.match(page, /!hasWritePermission \? null : !paramsEditing/);
    assert.match(page, /disabled=\{afSaving \|\| !hasWritePermission\}/);
    const bmpTab = page.slice(page.indexOf('<TabsContent value="bmp">'), page.indexOf("</TabsContent>", page.indexOf('<TabsContent value="bmp">')));
    assert.doesNotMatch(bmpTab, /<Button[^>]*disabled=\{!hasWritePermission/);
    assert.equal(bmpTab.match(/\{hasWritePermission && \(\n\s*<Button/g)?.length, 3);
    assert.doesNotMatch(page, /onClick=\{handleSaveMaximumPaths\}\n\s*disabled=\{!hasWritePermission/);
    assert.match(bmpTab, /\{hasWritePermission && \(\n\s*<div className="flex flex-wrap items-end gap-3">/);
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
    assert.match(page, /label: tc\("shown\.default"\), value: "default"/);
    assert.match(page, /items\.includes\("default"\)/);
    assert.doesNotMatch(page, /showService/);
  });

  it("uses InterfaceSelect for the RIP distribute-list interface", () => {
    const src = readFileSync(join(FRONTEND, "src/components/rip/RipDistributeListInterfaceModal.tsx"), "utf8");
    assert.match(src, /InterfaceSelect/);
    assert.match(src, /filter=/);
    assert.doesNotMatch(src, /from "@\/components\/ui\/select"/);
    assert.doesNotMatch(src, /type: ""/);
    assert.match(src, /if \(ripDistributeListInterfaceEmpty\(entry\)\) \{\s*setError\(t\("validation\.selectList"\)\)/);
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
      "src/components/rip/RipInterfaceModal.tsx",
      "src/components/rip/RipRedistributeModal.tsx",
      "src/components/rip/RipNetworkDistanceModal.tsx",
      "src/components/rip/RipDistributeListInterfaceModal.tsx",
    ]) {
      const src = readFileSync(join(FRONTEND, file), "utf8");
      assert.match(src, /if \(!next && loading\) return;/, file);
      assert.match(src, /<Dialog open=\{open\} onOpenChange=\{handleOpenChange\}>/, file);
      assert.match(src, /\(err as ApiError\)\.message/, file);
      assert.doesNotMatch(src, /instanceof Error/, file);
      // Seeded from props; the page remounts the modal with a new key instead of an effect reset.
      assert.doesNotMatch(src, /useEffect/, file);
    }
  });

  it("keeps the RIP page mounted on refresh and commits the overview as one batch", () => {
    const src = readFileSync(join(FRONTEND, "src/components/rip/RipContent.tsx"), "utf8");
    assert.match(src, /if \(loading && !config\)/);
    assert.doesNotMatch(src, /instanceof Error/);
    assert.match(src, /onClick=\{cancelEditOverview\} disabled=\{overviewSaving\}/);
    assert.match(src, /onClick=\{cancelEditDlGlobal\} disabled=\{dlGlobalSaving\}/);
    const save = src.slice(src.indexOf("const saveOverview"), src.indexOf("// Networks tab handlers"));
    assert.match(save, /overviewProblem\(/);
    assert.match(save, /ripService\.updateSettings\(/);
    assert.doesNotMatch(save, /updateTimers|updateGlobalSettings/);
    assert.match(src, /onClick=\{\(\) => void reload\(\)\} disabled=\{refreshing\}/);
    assert.match(src, /disabled=\{busy \|\| !inputValue\.trim\(\)\}/);
    // A list remove opens the confirm dialog instead of committing at once.
    assert.match(src, /onClick=\{\(\) => openDelete\(kind, item\)\}/);
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
    assert.match(src, /label: tc\("shown\.default"\), value: "default"/);
    assert.match(src, /items\.includes\("default"\)/);
  });

  it("does not send OSPF area authentication none as a set value", () => {
    const src = readFileSync(join(FRONTEND, "src/components/ospf/OspfAreaModal.tsx"), "utf8");
    assert.match(src, /NONE_SENTINEL/);
    assert.doesNotMatch(src, /SelectItem value="none"/);
  });
});
