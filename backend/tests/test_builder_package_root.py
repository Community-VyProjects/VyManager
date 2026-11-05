"""The vyos_builders package root is not a builder catalog (#990).

The root used to re-export a hand-kept subset of builders, so later features
(MPLS, QoS, VXLAN, ...) could not be imported from it and callers mixed both
styles. Builders are imported from the package that owns them.
"""

import ast
import inspect
from pathlib import Path

import vyos_builders

BACKEND_ROOT = Path(__file__).resolve().parents[1]
SKIP_DIRS = {"venv", ".venv", "node_modules", "__pycache__"}


def _root_imports(source: str) -> list[int]:
    """Line numbers of ``from vyos_builders import ...`` in ``source``."""
    return [
        node.lineno
        for node in ast.walk(ast.parse(source))
        if isinstance(node, ast.ImportFrom) and node.module == "vyos_builders"
    ]


def test_root_import_scan_flags_only_the_package_root():
    assert _root_imports("from vyos_builders import MplsBatchBuilder\n") == [1]
    assert _root_imports("x = 1\nfrom vyos_builders import (\n    A,\n)\n") == [2]
    assert _root_imports("from vyos_builders.mpls import MplsBatchBuilder\n") == []
    assert _root_imports("from vyos_builders.base import BatchBuilder\n") == []
    assert _root_imports("import vyos_builders.mpls\n") == []


def test_package_root_exports_no_builders():
    assert not hasattr(vyos_builders, "__all__")
    exported = sorted(
        name
        for name, value in vars(vyos_builders).items()
        if not name.startswith("_") and inspect.isclass(value)
    )
    assert exported == []


def test_backend_imports_builders_from_their_own_package():
    offenders = []
    for path in sorted(BACKEND_ROOT.rglob("*.py")):
        if SKIP_DIRS.intersection(path.relative_to(BACKEND_ROOT).parts):
            continue
        for line in _root_imports(path.read_text()):
            offenders.append(f"{path.relative_to(BACKEND_ROOT)}:{line}")
    assert offenders == []
