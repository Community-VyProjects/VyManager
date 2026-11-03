"use strict";

/* eslint-disable @typescript-eslint/no-require-imports -- the regression test loads the CJS stub */

// GHSA-gcqx-w48m-w2h4 has no patched deepmerge release. docs-site
// overrides deepmerge with stubs/deepmerge because nothing loads it.
// Both lockfiles must keep resolving that stub, never a registry copy.

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const docsSite = path.resolve(__dirname, "..");
const STUB_DIR = "stubs/deepmerge";

test("package-lock resolves every deepmerge to the local stub", () => {
  const lock = JSON.parse(fs.readFileSync(path.join(docsSite, "package-lock.json"), "utf8"));
  const entries = Object.entries(lock.packages).filter(([key]) =>
    key === "node_modules/deepmerge" || key.endsWith("/node_modules/deepmerge"),
  );
  assert.ok(entries.length > 0, "package-lock has no deepmerge entry");
  for (const [key, entry] of entries) {
    assert.deepEqual(entry, { resolved: STUB_DIR, link: true }, `${key} is not the stub link`);
  }
  assert.equal(lock.packages[STUB_DIR]?.version, "0.0.0");
});

// npm rewrites yarn.lock on install, so its block layout differs from
// yarn v1's. Check the invariant both writers keep: stub version only,
// and no registry tarball.
test("yarn.lock resolves every deepmerge range to the local stub", () => {
  const text = fs.readFileSync(path.join(docsSite, "yarn.lock"), "utf8");
  const blocks = text.split(/\n\n+/).filter((block) => /^"?deepmerge@/.test(block));
  assert.ok(blocks.length > 0, "yarn.lock has no deepmerge entry");
  for (const block of blocks) {
    const header = block.split("\n")[0];
    assert.match(block, /\n {2}version "0\.0\.0"/, `${header} is not the stub version`);
  }
  assert.doesNotMatch(text, /\/deepmerge\/-\/deepmerge-[^"\s]*\.tgz/, "deepmerge still resolves a registry tarball");
});

test("the stub throws when loaded", () => {
  assert.throws(() => require(path.join(docsSite, STUB_DIR)), /GHSA-gcqx-w48m-w2h4/);
});
