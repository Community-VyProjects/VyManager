"""GHSA-mrwp-f3q8-3g9p: docs-site must not install follow-redirects < 1.16.2."""

import json
import re
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
DOCS = REPO / "docs-site"
MIN = (1, 16, 2)
NAME = "follow-redirects"


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


def test_package_json_overrides_follow_redirects():
    pkg = json.loads((DOCS / "package.json").read_text())
    for field in ("overrides", "resolutions"):
        pinned = pkg.get(field, {}).get(NAME)
        assert pinned, f"docs-site package.json {field} must pin {NAME}"
        assert _tuple(str(pinned)) >= MIN, f"{field} pins {pinned}"


def test_npm_lock_resolves_follow_redirects_1_16_2():
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
    assert found, "package-lock.json has no follow-redirects package"


def test_yarn_lock_resolves_follow_redirects_1_16_2():
    versions = _yarn_versions((DOCS / "yarn.lock").read_text(), NAME)
    assert versions, "yarn.lock has no follow-redirects entry"
    for version in versions:
        assert _tuple(version) >= MIN, version
