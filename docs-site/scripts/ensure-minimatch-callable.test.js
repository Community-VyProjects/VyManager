"use strict";

/* eslint-disable @typescript-eslint/no-require-imports -- the regression test loads the CJS patcher and the patched require() export */

const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const { spawnSync } = require("node:child_process");

function withTemp(prefix, fn) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  try {
    return fn(dir);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

const {
  yarnMinimatchVersions,
  assertLockfile,
  patchCjs,
  patchEsm,
  findMinimatchDirs,
} = require("./ensure-minimatch-callable.js");

test("a package-lock that nests minimatch below 11.0.1 fails", () => {
  withTemp("mm-plock-", (dir) => {
    const lock = path.join(dir, "package-lock.json");
    fs.writeFileSync(
      lock,
      JSON.stringify({
        packages: {
          "node_modules/eslint/node_modules/minimatch": { version: "3.1.5" },
          "node_modules/@typescript-eslint/typescript-estree/node_modules/minimatch": { version: "9.0.9" },
          "node_modules/@types/minimatch": { version: "5.1.2" },
        },
      }),
    );
    assert.throws(() => assertLockfile(lock), /resolves minimatch 3\.1\.5/);
  });
});

test("a package-lock that resolves only minimatch 11.0.4 passes", () => {
  withTemp("mm-plock-ok-", (dir) => {
    const lock = path.join(dir, "package-lock.json");
    fs.writeFileSync(
      lock,
      JSON.stringify({
        packages: {
          "node_modules/minimatch": { version: "11.0.4" },
          "node_modules/@types/minimatch": { version: "5.1.2" },
        },
      }),
    );
    assertLockfile(lock);
  });
});

test("a package-lock with no minimatch package does not count as resolved", () => {
  withTemp("mm-plock-empty-", (dir) => {
    const lock = path.join(dir, "package-lock.json");
    fs.writeFileSync(
      lock,
      JSON.stringify({ packages: { "node_modules/@types/minimatch": { version: "5.1.2" } } }),
    );
    assert.throws(() => assertLockfile(lock), /does not resolve minimatch/);
  });
});

test("yarn resolver ignores @types/minimatch tarballs", () => {
  const text = [
    'resolved "https://registry.npmjs.org/@types/minimatch/-/minimatch-5.1.2.tgz"',
    'resolved "https://registry.npmjs.org/minimatch/-/minimatch-11.0.4.tgz"',
    'resolved "https://registry.yarnpkg.com/minimatch/-/minimatch-11.0.4.tgz"',
  ].join("\n");
  assert.deepEqual(yarnMinimatchVersions(text), ["11.0.4", "11.0.4"]);
});

test("a yarn lockfile that only names @types/minimatch does not count as resolved", () => {
  withTemp("mm-types-", (dir) => {
    const lock = path.join(dir, "yarn.lock");
    fs.writeFileSync(
      lock,
      'resolved "https://registry.npmjs.org/@types/minimatch/-/minimatch-5.1.2.tgz"\n',
    );
    assert.throws(() => assertLockfile(lock), /does not resolve minimatch/);
  });
});

test("a yarn lockfile that resolves minimatch 3.1.5 fails", () => {
  withTemp("mm-old-", (dir) => {
    const lock = path.join(dir, "yarn.lock");
    fs.writeFileSync(
      lock,
      'resolved "https://registry.npmjs.org/minimatch/-/minimatch-3.1.5.tgz"\n',
    );
    assert.throws(() => assertLockfile(lock), /resolves minimatch 3.1.5/);
  });
});

test("findMinimatchDirs ignores a directory that is not the minimatch package", () => {
  withTemp("mm-find-", (dir) => {
    const types = path.join(dir, "@types", "minimatch");
    fs.mkdirSync(types, { recursive: true });
    fs.writeFileSync(path.join(types, "package.json"), JSON.stringify({ name: "@types/minimatch", version: "5.1.2" }));
    const real = path.join(dir, "minimatch");
    fs.mkdirSync(real);
    fs.writeFileSync(path.join(real, "package.json"), JSON.stringify({ name: "minimatch", version: "11.0.4" }));
    const found = findMinimatchDirs(dir);
    assert.deepEqual(found, [real]);
  });
});

test("postinstall skips when minimatch is not installed", () => {
  withTemp("mm-skip-", (dir) => {
    fs.mkdirSync(path.join(dir, "scripts"));
    fs.mkdirSync(path.join(dir, "node_modules"));
    fs.copyFileSync(
      path.join(__dirname, "ensure-minimatch-callable.js"),
      path.join(dir, "scripts", "ensure-minimatch-callable.js"),
    );
    const result = spawnSync(process.execPath, [path.join(dir, "scripts", "ensure-minimatch-callable.js")], {
      encoding: "utf8",
    });
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /minimatch not installed/);
  });
});

test("the CJS and ESM patches restore the callable default", () => {
  withTemp("mm-patch-", (root) => {
  const pkg = path.join(root, "node_modules", "minimatch");
  fs.mkdirSync(path.join(pkg, "dist", "commonjs"), { recursive: true });
  fs.mkdirSync(path.join(pkg, "dist", "esm"), { recursive: true });
  fs.writeFileSync(path.join(pkg, "dist", "commonjs", "package.json"), "{\"type\":\"commonjs\"}\n");
  fs.writeFileSync(path.join(pkg, "dist", "esm", "package.json"), "{\"type\":\"module\"}\n");
  fs.writeFileSync(
    path.join(pkg, "package.json"),
    JSON.stringify({ name: "minimatch", version: "11.0.4", type: "module" }),
  );
  fs.writeFileSync(
    path.join(pkg, "dist", "commonjs", "index.js"),
    [
      '"use strict";',
      "Object.defineProperty(exports, \"__esModule\", { value: true });",
      "exports.minimatch = void 0;",
      "const minimatch = (p, pattern) => pattern === \"*.js\" && p.endsWith(\".js\");",
      "exports.minimatch = minimatch;",
      "class Minimatch { match(p) { return String(p).endsWith(\".js\"); } }",
      "exports.Minimatch = Minimatch;",
      "exports.minimatch.Minimatch = Minimatch;",
      "//# sourceMappingURL=index.js.map",
      "",
    ].join("\n"),
  );
  fs.writeFileSync(
    path.join(pkg, "dist", "esm", "index.js"),
    [
      "export const minimatch = (p, pattern) => pattern === \"*.js\" && String(p).endsWith(\".js\");",
      "export class Minimatch { match(p) { return String(p).endsWith(\".js\"); } }",
      "minimatch.Minimatch = Minimatch;",
      "//# sourceMappingURL=index.js.map",
      "",
    ].join("\n"),
  );
  patchCjs(pkg);
  patchEsm(pkg);
  const loaded = require(path.join(pkg, "dist", "commonjs", "index.js"));
  assert.equal(typeof loaded, "function");
  assert.equal(loaded("foo.js", "*.js"), true);
  assert.equal(typeof loaded.default, "function");
  assert.equal(typeof loaded.Minimatch, "function");
  const imported = spawnSync(
    process.execPath,
    ["--input-type=module", "-e", `import minimatch from ${JSON.stringify(path.join(pkg, "dist", "esm", "index.js"))}; if (typeof minimatch !== "function" || minimatch("foo.js", "*.js") !== true || typeof minimatch.Minimatch !== "function") process.exit(2);`],
    { encoding: "utf8" },
  );
  assert.equal(imported.status, 0, imported.stderr || imported.stdout);
  });
});
