import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const src = join(dirname(fileURLToPath(import.meta.url)), "../..");

function source(path: string): string {
  return readFileSync(join(src, path), "utf8");
}

describe("SSH setup notice wiring", () => {
  it("always links, including appliance mode", () => {
    const notice = source("components/console/SSHNotConfigured.tsx");
    assert.match(notice, /sshSetupLink/);
    assert.equal(notice.includes("!appliance"), false);
    assert.equal(notice.includes('href="/sites"'), false);
  });

  it("monitoring uses the shared notice", () => {
    const page = source("app/monitoring/page.tsx");
    assert.match(page, /<SSHNotConfigured \/>/);
    assert.equal(page.includes("openSiteManager"), false);
    assert.equal(page.includes("sshNotConfiguredHelp"), false);
  });

  it("administration opens the editor tab the setup link names", () => {
    const page = source("app/administration/page.tsx");
    assert.match(page, /instanceEditorTabFromSearch/);
    assert.match(page, /initialTab=\{editorInitialTab\}/);
    assert.match(source("components/sites/InstanceModal.tsx"), /initialTab/);
  });
});
