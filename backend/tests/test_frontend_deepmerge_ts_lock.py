"""GHSA-ggr8-5vv4-36mx: frontend lock must not ship deepmerge-ts < 8."""

import json
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
FRONTEND = REPO / "frontend"
MIN = (8, 0, 0)


def _tuple(version: str) -> tuple[int, ...]:
    core = version.split("-", 1)[0]
    return tuple(int(part) for part in core.split(".")[:3])


def test_package_json_overrides_deepmerge_ts_to_v8():
    pkg = json.loads((FRONTEND / "package.json").read_text())
    pinned = pkg.get("overrides", {}).get("deepmerge-ts")
    assert pinned, "frontend package.json must override deepmerge-ts"
    assert _tuple(str(pinned)) >= MIN, pinned


def test_lockfile_resolves_deepmerge_ts_v8():
    lock = json.loads((FRONTEND / "package-lock.json").read_text())
    found = []
    for path, meta in lock["packages"].items():
        name = meta.get("name") or path.rsplit("node_modules/", 1)[-1]
        if name != "deepmerge-ts":
            continue
        version = meta["version"]
        found.append((path, version))
        assert _tuple(version) >= MIN, f"{path} resolved {version}"
    assert found, "lockfile has no deepmerge-ts package"
