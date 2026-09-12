import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const docsSite = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const root = path.resolve(docsSite, "..");
const backend = path.join(root, "backend");
const out = path.join(docsSite, "static", "openapi", "vymanager.json");
const script = path.join(backend, "export_openapi.py");

if (process.env.SKIP_OPENAPI_EXPORT === "1") {
  if (existsSync(out)) {
    process.exit(0);
  }
  console.error("SKIP_OPENAPI_EXPORT=1 but", out, "is missing");
  process.exit(1);
}

const venvPython = path.join(backend, "venv", "bin", "python");
const python = existsSync(venvPython) ? venvPython : "python3";

const result = spawnSync(python, [script], {
  cwd: backend,
  stdio: "inherit",
  env: { ...process.env, PYTHONPATH: backend },
});

if (result.status === 0) {
  process.exit(0);
}

if (existsSync(out)) {
  console.warn("export_openapi.py failed; using existing", out);
  process.exit(0);
}

console.error(
  "Could not generate",
  out,
  "- install backend deps and retry, or run: cd backend && python export_openapi.py",
);
process.exit(1);
