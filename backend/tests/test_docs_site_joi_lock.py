"""GHSA-4528-x5fx-h6hg: docs-site must not install joi < 17.13.9."""

import json
import re
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
DOCS = REPO / "docs-site"
MIN = (17, 13, 9)
NAME = "joi"


def _tuple(version: str) -> tuple[int, ...]:
    core = version.split("-", 1)[0]
    return tuple(int(part) for part in core.split(".")[:3])


def _yarn_versions(text: str, name: str) -> list[str]:
    versions: list[str] = []
    in_block = False
    for line in text.splitlines():
        if line.startswith(f"{name}@"):
            in_block = True
            continue
        if in_block and line and not line.startswith(" "):
            in_block = False
        if in_block and line.startswith('  version "'):
            versions.append(line.split('"')[1])
    return versions


def test_package_json_overrides_joi():
    pkg = json.loads((DOCS / "package.json").read_text())
    for field in ("overrides", "resolutions"):
        pinned = pkg.get(field, {}).get(NAME)
        assert pinned, f"docs-site package.json {field} must pin {NAME}"
        assert _tuple(str(pinned)) >= MIN, f"{field} pins {pinned}"


def test_npm_lock_resolves_joi_17_13_9():
    lock = json.loads((DOCS / "package-lock.json").read_text())
    found = []
    for path, meta in lock["packages"].items():
        name = meta.get("name") or path.rsplit("node_modules/", 1)[-1]
        if name != NAME:
            continue
        version = meta["version"]
        found.append((path, version))
        assert _tuple(version) >= MIN, f"{path} resolved {version}"
        resolved = meta.get("resolved", "")
        assert re.search(rf"{NAME}-{version}\.tgz$", resolved), resolved
    assert found, "package-lock.json has no joi package"


def test_yarn_lock_resolves_joi_17_13_9():
    versions = _yarn_versions((DOCS / "yarn.lock").read_text(), NAME)
    assert versions, "yarn.lock has no joi entry"
    for version in versions:
        assert _tuple(version) >= MIN, version
