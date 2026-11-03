"""`from vyos_mappers.base import ...` runs the package __init__, which
registers every feature. A separate `import vyos_mappers` beside it is
redundant, and code-quality flags it as an unused import."""

import ast
import subprocess
import sys
from pathlib import Path

BACKEND = Path(__file__).resolve().parents[1]

# Features whose routers and tests used to carry the redundant import.
FEATURES = (
    "babel",
    "bfd",
    "conntrack_sync",
    "dns_forwarding",
    "failover",
    "igmp_proxy",
    "isis",
    "mpls",
    "pim",
    "pim6",
    "qos",
    "rip",
    "ripng",
    "segment_routing",
    "traffic_engineering",
    "tunnel",
    "vxlan",
)


def test_base_import_alone_registers_features():
    code = (
        "from vyos_mappers.base import CommandMapperRegistry\n"
        f"for feature in {FEATURES!r}:\n"
        "    CommandMapperRegistry.get_mapper(feature, '1.5')\n"
    )
    result = subprocess.run(
        [sys.executable, "-c", code],
        cwd=BACKEND,
        capture_output=True,
        text=True,
        timeout=120,
    )
    assert result.returncode == 0, result.stderr


def _redundant_package_imports(path: Path) -> list[int]:
    tree = ast.parse(path.read_text(), filename=str(path))
    has_submodule_import = any(
        isinstance(node, ast.ImportFrom)
        and node.level == 0
        and (node.module or "").startswith("vyos_mappers.")
        for node in ast.walk(tree)
    )
    if not has_submodule_import:
        return []
    return [
        node.lineno
        for node in ast.walk(tree)
        if isinstance(node, ast.Import)
        and any(alias.name == "vyos_mappers" and alias.asname is None for alias in node.names)
    ]


def test_no_bare_package_import_beside_submodule_import():
    offenders = []
    for path in sorted(BACKEND.rglob("*.py")):
        rel = path.relative_to(BACKEND)
        if rel.parts[0] in {"venv", ".venv"} or "__pycache__" in rel.parts:
            continue
        offenders += [f"{rel}:{line}" for line in _redundant_package_imports(path)]
    assert offenders == []
