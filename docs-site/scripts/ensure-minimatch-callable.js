#!/usr/bin/env node
"use strict";

/* eslint-disable @typescript-eslint/no-require-imports -- patches minimatch's CJS require() export */

// GHSA-g3hv-75wg-m249 is fixed only in minimatch >= 11.0.1. eslint 9,
// its plugins, and serve-handler still call require("minimatch") or the
// Babel default interop. v11's CJS build is a namespace, so those calls
// throw. Keep the registry 11.x algorithm and restore the callable export.

const fs = require("fs");
const path = require("path");
const Module = require("module");
const { spawnSync } = require("child_process");

const MARKER = "vymanager-minimatch-callable-default";
const FLOOR = [11, 0, 1];
const SCRIPT_NAME = "ensure-minimatch-callable.js";

function versionAtLeast(version, floor) {
  const parts = String(version).split(".").map((part) => {
    const match = /^(\d+)/.exec(part);
    return match ? Number(match[1]) : 0;
  });
  for (let i = 0; i < floor.length; i += 1) {
    const got = parts[i] || 0;
    if (got > floor[i]) return true;
    if (got < floor[i]) return false;
  }
  return true;
}

function assertScriptsMatch() {
  const candidates = [
    path.resolve(__dirname, `../../frontend/scripts/${SCRIPT_NAME}`),
    path.resolve(__dirname, `../../docs-site/scripts/${SCRIPT_NAME}`),
  ];
  const mine = fs.readFileSync(__filename, "utf8");
  for (const other of candidates) {
    if (path.resolve(other) === path.resolve(__filename)) continue;
    if (!fs.existsSync(other)) continue;
    const theirs = fs.readFileSync(other, "utf8");
    if (mine !== theirs) {
      throw new Error(`minimatch compat script drifted:\n${__filename}\n${other}`);
    }
  }
}

function assertLockfile(lockPath) {
  if (!fs.existsSync(lockPath)) return;
  if (lockPath.endsWith("yarn.lock")) {
    const text = fs.readFileSync(lockPath, "utf8");
    const versions = [...text.matchAll(/registry\.(?:npmjs\.org|yarnpkg\.com)\/minimatch\/-\/minimatch-(\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?)\.tgz/g)].map(
      (match) => match[1],
    );
    if (versions.length === 0) {
      throw new Error(`${lockPath} does not resolve minimatch`);
    }
    for (const version of versions) {
      if (!versionAtLeast(version, FLOOR)) {
        throw new Error(`${lockPath} resolves minimatch ${version}`);
      }
    }
    return;
  }
  const lock = JSON.parse(fs.readFileSync(lockPath, "utf8"));
  const versions = [];
  for (const [name, meta] of Object.entries(lock.packages || {})) {
    if (name === "node_modules/minimatch" || name.endsWith("/node_modules/minimatch")) {
      versions.push(meta.version);
    }
  }
  if (versions.length === 0) {
    throw new Error(`${lockPath} does not resolve minimatch`);
  }
  for (const version of versions) {
    if (!versionAtLeast(version, FLOOR)) {
      throw new Error(`${lockPath} resolves minimatch ${version}`);
    }
  }
}

function findMinimatchDirs(nodeModules) {
  const found = [];
  if (!fs.existsSync(nodeModules)) return found;
  const stack = [nodeModules];
  while (stack.length > 0) {
    const dir = stack.pop();
    let entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const full = path.join(dir, entry.name);
      if (entry.name === "minimatch") {
        const manifest = path.join(full, "package.json");
        if (!fs.existsSync(manifest)) continue;
        let meta;
        try {
          meta = JSON.parse(fs.readFileSync(manifest, "utf8"));
        } catch {
          continue;
        }
        if (meta.name === "minimatch") found.push(full);
        continue;
      }
      if (entry.name === "node_modules" || entry.name.startsWith("@")) {
        stack.push(full);
        continue;
      }
      const nested = path.join(full, "node_modules");
      if (fs.existsSync(nested)) stack.push(nested);
    }
  }
  return found;
}

function patchCjs(pkgDir) {
  const file = path.join(pkgDir, "dist", "commonjs", "index.js");
  if (!fs.existsSync(file)) {
    throw new Error(`${pkgDir} has no CJS build to patch`);
  }
  const source = fs.readFileSync(file, "utf8");
  if (source.includes(MARKER)) return;
  const footer = `
// ${MARKER}
// v3 callers use require("minimatch")(path, pattern) or Babel's default
// interop. v11 exports a namespace. Point both at the patched function.
module.exports = exports.minimatch;
module.exports.minimatch = exports.minimatch;
module.exports.default = exports.minimatch;
for (const key of ["Minimatch", "escape", "unescape", "filter", "match", "defaults", "braceExpand", "GLOBSTAR", "sep"]) {
  if (exports[key] !== undefined) module.exports[key] = exports[key];
}
Object.defineProperty(module.exports, "__esModule", { value: true });
`;
  const mapMarker = "//# sourceMappingURL=index.js.map";
  const next = source.includes(mapMarker)
    ? source.replace(mapMarker, `${footer}\n${mapMarker}`)
    : `${source}\n${footer}`;
  fs.writeFileSync(file, next);
}

function patchEsm(pkgDir) {
  const file = path.join(pkgDir, "dist", "esm", "index.js");
  if (!fs.existsSync(file)) {
    throw new Error(`${pkgDir} has no ESM build to patch`);
  }
  const source = fs.readFileSync(file, "utf8");
  if (source.includes(MARKER)) return;
  const footer = `
// ${MARKER}
// Native ESM callers use import minimatch from "minimatch". v11 has no default export.
export { minimatch as default };
`;
  const mapMarker = "//# sourceMappingURL=index.js.map";
  const next = source.includes(mapMarker)
    ? source.replace(mapMarker, `${footer}\n${mapMarker}`)
    : `${source}\n${footer}`;
  fs.writeFileSync(file, next);
}

function loadMinimatch(pkgDir) {
  const requireFrom = Module.createRequire(path.join(pkgDir, "package.json"));
  const resolved = requireFrom.resolve("./dist/commonjs/index.js");
  delete require.cache[resolved];
  return requireFrom(resolved);
}

function assertCallable(pkgDir, version) {
  const loaded = loadMinimatch(pkgDir);
  if (typeof loaded !== "function") {
    throw new Error(`${pkgDir} require('minimatch') is ${typeof loaded}, want function`);
  }
  if (typeof loaded.default !== "function") {
    throw new Error(`${pkgDir} default export is not callable`);
  }
  if (typeof loaded.minimatch !== "function") {
    throw new Error(`${pkgDir} named minimatch export is not callable`);
  }
  if (typeof loaded.Minimatch !== "function") {
    throw new Error(`${pkgDir} Minimatch export is missing`);
  }
  if (loaded("foo.js", "*.js") !== true) {
    throw new Error(`${pkgDir} callable match failed`);
  }
  if (loaded.default("foo.js", "*.js", { nocomment: true }) !== true) {
    throw new Error(`${pkgDir} default interop match failed`);
  }
  if (loaded.minimatch("Foo", "F*", { noglobstar: true }) !== true) {
    throw new Error(`${pkgDir} named match failed`);
  }
  if (new loaded.Minimatch("*.js", { dot: true, matchBase: true }).match("foo.js") !== true) {
    throw new Error(`${pkgDir} Minimatch match failed`);
  }
  const pattern = Array(6).fill("**/../a/b").join("/");
  const capped = new loaded.Minimatch(pattern, { optimizationLevel: 2, braceExpandMax: 8 });
  if (!capped.set || capped.set.length > 8) {
    throw new Error(
      `${pkgDir} minimatch ${version} still amplifies glob parts (${capped.set && capped.set.length})`,
    );
  }
}

function assertEsmDefault(pkgDir) {
  const script = [
    'import minimatch from "minimatch";',
    'if (typeof minimatch !== "function") throw new Error("esm default is " + typeof minimatch);',
    'if (typeof minimatch.Minimatch !== "function") throw new Error("esm Minimatch missing");',
    'if (minimatch("foo.js", "*.js") !== true) throw new Error("esm match failed");',
    'if (new minimatch.Minimatch("*.js", { dot: true, matchBase: true }).match("foo.js") !== true) {',
    '  throw new Error("esm Minimatch match failed");',
    "}",
  ].join("\n");
  const result = spawnSync(process.execPath, ["--input-type=module", "-e", script], {
    cwd: path.resolve(pkgDir, "../.."),
    encoding: "utf8",
  });
  if (result.status !== 0) {
    throw new Error(`${pkgDir} ESM default import failed: ${result.stderr || result.stdout}`);
  }
}

function main() {
  assertScriptsMatch();
  const root = path.resolve(__dirname, "..");
  assertLockfile(path.join(root, "package-lock.json"));
  assertLockfile(path.join(root, "yarn.lock"));
  const repo = path.resolve(__dirname, "../..");
  assertLockfile(path.join(repo, "frontend/package-lock.json"));
  assertLockfile(path.join(repo, "docs-site/package-lock.json"));
  assertLockfile(path.join(repo, "docs-site/yarn.lock"));

  const dirs = findMinimatchDirs(path.join(root, "node_modules"));
  if (dirs.length === 0) {
    process.stdout.write(`minimatch not installed under ${root}; skip\n`);
    return;
  }
  for (const pkgDir of dirs) {
    const meta = JSON.parse(fs.readFileSync(path.join(pkgDir, "package.json"), "utf8"));
    if (!versionAtLeast(meta.version, FLOOR)) {
      throw new Error(`${pkgDir} is minimatch ${meta.version}, want >= 11.0.1`);
    }
    patchCjs(pkgDir);
    patchEsm(pkgDir);
    assertCallable(pkgDir, meta.version);
    assertEsmDefault(pkgDir);
  }
  process.stdout.write(`minimatch >= 11.0.1 callable in ${dirs.length} install(s)\n`);
}

try {
  main();
} catch (error) {
  process.stderr.write(`${error.message}\n`);
  process.exit(1);
}
