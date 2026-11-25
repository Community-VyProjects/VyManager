import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const dir = dirname(fileURLToPath(import.meta.url));
const screens = readdirSync(dir).filter((file) => file.endsWith(".tsx"));
const read = (file: string) => readFileSync(join(dir, file), "utf8");

describe("DHCP server dialogs", () => {
  for (const file of screens) {
    it(`${file} shows the backend error detail`, () => {
      assert.doesNotMatch(read(file), /instanceof Error/);
    });
  }

  for (const file of screens.filter((name) => name.endsWith("Modal.tsx"))) {
    it(`${file} ignores close while saving`, () => {
      const source = read(file);
      assert.doesNotMatch(source, /onOpenChange=\{onOpenChange\}/);
      assert.match(source, /if \(!next && loading\) return;/);
    });
  }

  for (const file of screens) {
    it(`${file} keeps line breaks in device errors`, () => {
      assert.doesNotMatch(read(file), /className="text-sm text-destructive">/);
    });
  }

  for (const file of [
    "DHCPNetworkOptionsModal.tsx",
    "DHCPClientClassModal.tsx",
    "DHCPFailoverModal.tsx",
    "DHCPDdnsModal.tsx",
    "DHCPServerSettingsModal.tsx",
    "AddLeaseToStaticMappingModal.tsx",
    "RangeModal.tsx",
    "StaticMappingModal.tsx",
  ]) {
    it(`${file} scrolls inside its height cap`, () => {
      assert.match(read(file), /<DialogContent className="[^"]*max-h-\[85vh\] overflow-y-auto"/);
    });
  }

  it("network options dialog has no unclipped ScrollArea", () => {
    assert.doesNotMatch(read("DHCPNetworkOptionsModal.tsx"), /ScrollArea/);
  });

  it("sidebar network list can shrink and scroll", () => {
    assert.match(read("DHCPServerContent.tsx"), /\{\/\* Network List \*\/\}\n\s*<ScrollArea className="flex-1 min-h-0">/);
  });

  it("a failed lease load shows the error instead of an empty list", () => {
    const source = read("DHCPServerContent.tsx");
    assert.match(source, /setLeasesError\(\(err as ApiError\)\.message \|\| t\("page\.errors\.loadLeasesFailed"\)\)/);
    const errorBranch = source.indexOf(") : leasesError ? (");
    assert.notEqual(errorBranch, -1);
    assert.ok(errorBranch < source.indexOf(") : filteredLeases.length === 0 ? ("));
  });

  it("write controls are hidden from read-only users", () => {
    const source = read("DHCPServerContent.tsx");
    assert.match(source, /const hasWrite = canWrite\(FeatureGroup\.DHCP\);/);
    const toggle = source.indexOf("onClick={requestToggleGlobalDisable}");
    assert.ok(source.lastIndexOf("{hasWrite && (", toggle) > source.lastIndexOf("</Button>", toggle));
  });

  it("global enable/disable sits with the server-wide sidebar buttons", () => {
    const source = read("DHCPServerContent.tsx");
    const toggle = source.indexOf("onClick={requestToggleGlobalDisable}");
    assert.ok(toggle > 0);
    assert.ok(toggle < source.indexOf("{/* Network List */}"));
    assert.equal(source.split("onClick={requestToggleGlobalDisable}").length, 2);
  });

  it("range and static mapping edits pass the full stored row", () => {
    const source = read("DHCPServerContent.tsx");
    assert.match(source, /const \{ subnet: rangeSubnet, \.\.\.stored \} = range;\s*setEditingRange\(\{ subnet: rangeSubnet, range: stored \}\);/);
    assert.match(source, /const \{ subnet: mappingSubnet, \.\.\.stored \} = mapping;/);
  });

  it("add-lease-to-static uses the shared mapping validate and submit", () => {
    const source = read("AddLeaseToStaticMappingModal.tsx");
    assert.match(source, /validateMappingCreate\(/);
    assert.match(source, /submitMappingCreate\(/);
    assert.match(source, /isIpInSubnet\(/);
  });

  it("existing-network pick uses the shared select", () => {
    const source = read("DHCPServerModal.tsx");
    assert.doesNotMatch(source, /<select|type="radio"/);
    assert.match(source, /<NamedListSelect/);
  });
});
