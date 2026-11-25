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

  it("network options dialog scrolls inside its height cap", () => {
    const source = read("DHCPNetworkOptionsModal.tsx");
    assert.match(source, /<DialogContent className="[^"]*max-h-\[85vh\] overflow-y-auto"/);
    assert.doesNotMatch(source, /ScrollArea/);
  });

  it("global enable/disable sits with the server-wide sidebar buttons", () => {
    const source = read("DHCPServerContent.tsx");
    const toggle = source.indexOf("onClick={requestToggleGlobalDisable}");
    assert.ok(toggle > 0);
    assert.ok(toggle < source.indexOf("{/* Network List */}"));
    assert.equal(source.split("onClick={requestToggleGlobalDisable}").length, 2);
  });
});
