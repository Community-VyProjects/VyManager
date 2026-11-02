"""better-auth must stay on the 1.7.15 security release, not 1.6.23."""

import json
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
FRONTEND = REPO / "frontend"
MIN = (1, 7, 15)


def _tuple(version: str) -> tuple[int, ...]:
    core = version.split("-", 1)[0]
    return tuple(int(part) for part in core.split(".")[:3])


def _floor(spec: str) -> tuple[int, ...]:
    core = spec.lstrip("^~>= ").split(" ", 1)[0]
    return _tuple(core)


def test_package_json_floors_better_auth_at_1_7_15():
    pkg = json.loads((FRONTEND / "package.json").read_text())
    spec = pkg["dependencies"]["better-auth"]
    assert _floor(str(spec)) >= MIN, spec


def test_lockfile_resolves_better_auth_1_7_15():
    lock = json.loads((FRONTEND / "package-lock.json").read_text())
    found = []
    for path, meta in lock["packages"].items():
        name = meta.get("name") or path.rsplit("node_modules/", 1)[-1]
        if name != "better-auth":
            continue
        version = meta["version"]
        found.append((path, version))
        assert _tuple(version) >= MIN, f"{path} resolved {version}"
    assert found, "lockfile has no better-auth package"
