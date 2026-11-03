"""A module is imported with ``import`` or ``from ... import``, not both.

Code-quality flags it as "Module is imported with 'import' and 'import
from'". Mixing the two binds some names at import time and reads others
live, so a monkeypatch or a reassigned module flag reaches one and not
the other.
"""

import ast
from pathlib import Path

BACKEND = Path(__file__).resolve().parents[1]
_SKIP_DIRS = {"venv", ".venv", "node_modules", "__pycache__"}


def mixed_imports(src: str) -> list[str]:
    tree = ast.parse(src)
    plain: set[str] = set()
    from_: set[str] = set()
    for node in ast.walk(tree):
        if isinstance(node, ast.Import):
            plain.update(alias.name for alias in node.names)
        elif isinstance(node, ast.ImportFrom) and node.level == 0 and node.module:
            from_.add(node.module)
    return sorted(plain & from_)


def test_detects_module_level_mix():
    assert mixed_imports("import os\nfrom os import path\n") == ["os"]


def test_detects_function_local_mix():
    src = "from a.b import c\n\ndef f():\n    import a.b as m\n    return m\n"
    assert mixed_imports(src) == ["a.b"]


def test_allows_parent_and_submodule():
    src = "import requests\nfrom requests.exceptions import HTTPError\n"
    assert mixed_imports(src) == []


def test_ignores_relative_imports():
    assert mixed_imports("import os\nfrom . import os\n") == []


def test_no_mixed_import_style_in_backend():
    offenders = []
    for path in sorted(BACKEND.rglob("*.py")):
        if _SKIP_DIRS.intersection(path.relative_to(BACKEND).parts):
            continue
        offenders += [f"{path.relative_to(BACKEND)}: {m}" for m in mixed_imports(path.read_text())]
    assert offenders == []
