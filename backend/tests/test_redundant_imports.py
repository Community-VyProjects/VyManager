"""An ``import`` that rebinds a name already bound to the same module is dead.

Code-quality flags it as "Module is imported more than once". A function
that re-imports a module already imported at module scope, or a second
module-level ``import os``, does nothing.
"""

import ast
from pathlib import Path

BACKEND = Path(__file__).resolve().parents[1]
_SKIP_DIRS = {"venv", ".venv", "node_modules", "__pycache__"}


def _bindings(node: ast.Import):
    for alias in node.names:
        # ``import a.b`` binds ``a``; ``import a.b as c`` binds ``c``.
        yield alias.name, alias.asname or alias.name.split(".")[0]


def _scan(body, inherited, offenders):
    seen = dict(inherited)
    for stmt in body:
        if not isinstance(stmt, ast.Import):
            continue
        for key in _bindings(stmt):
            if key in seen:
                offenders.append(stmt.lineno)
            else:
                seen[key] = stmt.lineno
    return seen


def redundant_imports(src: str) -> list[int]:
    tree = ast.parse(src)
    offenders: list[int] = []
    module_scope = _scan(tree.body, {}, offenders)
    for node in ast.walk(tree):
        if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
            _scan(node.body, module_scope, offenders)
    return sorted(offenders)


def test_detects_function_reimport_of_module_level_import():
    src = "import json\n\ndef f():\n    import json\n    return json\n"
    assert redundant_imports(src) == [4]


def test_detects_second_module_level_import():
    assert redundant_imports("import os\nimport sys\nimport os\n") == [3]


def test_detects_aliased_reimport():
    src = "import a.b as c\n\ndef f():\n    import a.b as c\n"
    assert redundant_imports(src) == [4]


def test_allows_distinct_bindings_and_first_local_import():
    src = (
        "import a.b as c\n"
        "import a.b as d\n"
        "def f():\n"
        "    import json\n"
        "def g():\n"
        "    import json\n"
    )
    assert redundant_imports(src) == []


def test_no_redundant_imports_in_backend():
    offenders = []
    for path in sorted(BACKEND.rglob("*.py")):
        if _SKIP_DIRS.intersection(path.relative_to(BACKEND).parts):
            continue
        offenders += [f"{path.relative_to(BACKEND)}:{n}" for n in redundant_imports(path.read_text())]
    assert offenders == []
