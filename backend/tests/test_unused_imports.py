"""An import whose name the module never reads is dead.

Code-quality flags it as "Unused import". The scan is per file: a bound
name counts as used when any expression, string annotation, or
``__all__`` entry in that file names it. Package ``__init__`` files are
skipped because their imports are the package's re-exports.
"""

import ast
from pathlib import Path

BACKEND = Path(__file__).resolve().parents[1]
_SKIP_DIRS = {"venv", ".venv", "node_modules", "__pycache__"}


def _bindings(node):
    for alias in node.names:
        if alias.name == "*":
            continue
        if isinstance(node, ast.Import):
            # ``import a.b`` binds ``a``; ``import a.b as c`` binds ``c``.
            yield alias.asname or alias.name.split(".")[0]
        else:
            yield alias.asname or alias.name


def _annotation_names(node) -> set[str]:
    """Names read by a quoted annotation such as ``x: "Foo"``."""
    names: set[str] = set()
    for sub in ast.walk(node):
        if isinstance(sub, ast.Constant) and isinstance(sub.value, str):
            try:
                parsed = ast.parse(sub.value, mode="eval")
            except SyntaxError:
                continue
            names.update(n.id for n in ast.walk(parsed) if isinstance(n, ast.Name))
    return names


def _used_names(tree) -> set[str]:
    used: set[str] = set()
    for node in ast.walk(tree):
        if isinstance(node, ast.Name):
            used.add(node.id)
        elif isinstance(node, (ast.arg, ast.AnnAssign)) and node.annotation is not None:
            used |= _annotation_names(node.annotation)
        elif isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)) and node.returns is not None:
            used |= _annotation_names(node.returns)
        elif isinstance(node, ast.Assign) and any(
            isinstance(t, ast.Name) and t.id == "__all__" for t in node.targets
        ):
            used.update(
                c.value for c in ast.walk(node.value) if isinstance(c, ast.Constant) and isinstance(c.value, str)
            )
    return used


def unused_imports(src: str) -> list[str]:
    tree = ast.parse(src)
    used = _used_names(tree)
    offenders = []
    for node in ast.walk(tree):
        if isinstance(node, ast.ImportFrom) and node.module == "__future__":
            continue
        if isinstance(node, (ast.Import, ast.ImportFrom)):
            offenders += [f"{node.lineno}:{name}" for name in _bindings(node) if name not in used]
    return offenders


def test_detects_unused_plain_import():
    assert unused_imports("import asyncio\nimport json\njson.dumps({})\n") == ["1:asyncio"]


def test_detects_unused_from_import_and_alias():
    src = "from typing import Any, List\nimport numpy as np\nx: List[int] = []\n"
    assert unused_imports(src) == ["1:Any", "2:np"]


def test_detects_unused_function_local_import():
    assert unused_imports("def f():\n    import os\n    return 1\n") == ["2:os"]


def test_dotted_import_is_used_through_its_root():
    assert unused_imports("import os.path\nos.path.join('a')\n") == []


def test_quoted_annotation_and_dunder_all_count_as_use():
    src = (
        "from a import Foo, Bar, Baz\n"
        "def f(x: 'Foo') -> 'Optional[Bar]':\n"
        "    return x\n"
        "__all__ = ['Baz']\n"
    )
    assert unused_imports(src) == []


def test_future_import_is_not_flagged():
    assert unused_imports("from __future__ import annotations\n") == []


def test_no_unused_imports_in_backend():
    offenders = []
    for path in sorted(BACKEND.rglob("*.py")):
        rel = path.relative_to(BACKEND)
        if _SKIP_DIRS.intersection(rel.parts) or path.name == "__init__.py":
            continue
        offenders += [f"{rel}:{o}" for o in unused_imports(path.read_text())]
    assert offenders == []
