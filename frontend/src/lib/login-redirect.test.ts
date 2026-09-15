import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const proxy = readFileSync(join(root, "proxy.ts"), "utf8");
const login = readFileSync(join(root, "app/login/page.tsx"), "utf8");

describe("idle logout login redirect", () => {
  it("sends unauthenticated traffic to /login with no from query", () => {
    assert.equal(proxy.includes('searchParams.set("from"'), false);
    assert.match(proxy, /new URL\("\/login", request\.url\)/);
  });

  it("does not restore a deep link from the login URL", () => {
    assert.equal(login.includes('params.get("from")'), false);
    assert.equal(login.includes('afterLoginPath("",'), false);
    assert.match(login, /afterLoginPath\(appliance/);
  });

  it("continues when a session cookie is already valid", () => {
    assert.match(login, /existing\.data\?\.user/);
    assert.match(login, /authClient\.getSession\(\)/);
  });
});
