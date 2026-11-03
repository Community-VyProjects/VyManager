"""An import whose binding the module never reads is dead.

Code-quality flags it as "Unused import". The scan resolves names per
scope with :mod:`symtable`, so a read of ``os`` in one function does not
cover an unused ``import os`` in another, and an assignment or ``del``
of the imported name is not a read. Annotations (quoted or not) and module
``__all__`` entries count as reads. Package ``__init__`` files are
skipped because their imports are the package's re-exports.
"""

import ast
import symtable
from pathlib import Path

BACKEND = Path(__file__).resolve().parents[1]
_SKIP_DIRS = {"venv", ".venv", "node_modules", "__pycache__"}
_SCOPE_NODES = (ast.FunctionDef, ast.AsyncFunctionDef, ast.ClassDef)


def _bindings(node):
    for alias in node.names:
        if alias.name == "*":
            continue
        if isinstance(node, ast.Import):
            # ``import a.b`` binds ``a``; ``import a.b as c`` binds ``c``.
            yield alias.asname or alias.name.split(".")[0]
        else:
            yield alias.asname or alias.name


def _annotation_names(annotation) -> set[str]:
    """Names an annotation reads, including quoted ones such as ``"Foo"``.

    ``symtable`` drops annotations under ``from __future__ import
    annotations``, so they are collected from the AST instead.
    """
    names: set[str] = set()
    if annotation is None:
        return names
    for sub in ast.walk(annotation):
        if isinstance(sub, ast.Name):
            names.add(sub.id)
        elif isinstance(sub, ast.Constant) and isinstance(sub.value, str):
            try:
                parsed = ast.parse(sub.value, mode="eval")
            except SyntaxError:
                continue
            names.update(n.id for n in ast.walk(parsed) if isinstance(n, ast.Name))
    return names


class _Scan:
    def __init__(self, src: str):
        self.tree = ast.parse(src)
        self.top = symtable.symtable(src, "<scan>", "exec")
        self.parent: dict[int, symtable.SymbolTable] = {}
        self.imports: list[tuple[symtable.SymbolTable, int, str]] = []
        self.extra_reads: list[tuple[symtable.SymbolTable, str]] = []
        self._index(self.top)
        self._walk(self.tree.body, self.top)

    def _index(self, table):
        for child in table.get_children():
            self.parent[child.get_id()] = table
            self._index(child)

    def _child(self, table, node):
        for child in table.get_children():
            if child.get_name() == node.name and child.get_lineno() == node.lineno:
                return child
        raise AssertionError(f"no symbol table for {node.name} at line {node.lineno}")

    def _walk(self, body, table):
        for node in body:
            self._visit(node, table)

    def _visit(self, node, table):
        if isinstance(node, (ast.Import, ast.ImportFrom)):
            if not (isinstance(node, ast.ImportFrom) and node.module == "__future__"):
                self.imports += [(table, node.lineno, name) for name in _bindings(node)]
            return
        if isinstance(node, _SCOPE_NODES):
            # Decorators, bases, defaults and annotations run in the
            # enclosing scope; only the body runs in the new one.
            if not isinstance(node, ast.ClassDef):
                arguments = node.args.posonlyargs + node.args.args + node.args.kwonlyargs
                arguments += [a for a in (node.args.vararg, node.args.kwarg) if a]
                for arg in arguments:
                    self._read_annotation(table, arg.annotation)
                self._read_annotation(table, node.returns)
            self._walk(node.body, self._child(table, node))
            return
        if isinstance(node, ast.AnnAssign):
            self._read_annotation(table, node.annotation)
        if isinstance(node, ast.Assign) and table is self.top:
            if any(isinstance(t, ast.Name) and t.id == "__all__" for t in node.targets):
                self.extra_reads += [
                    (table, c.value)
                    for c in ast.walk(node.value)
                    if isinstance(c, ast.Constant) and isinstance(c.value, str)
                ]
        for child in ast.iter_child_nodes(node):
            if isinstance(child, ast.stmt):
                self._visit(child, table)
            elif isinstance(child, (ast.ExceptHandler, ast.match_case)):
                self._walk(child.body, table)

    def _read_annotation(self, table, annotation):
        self.extra_reads += [(table, name) for name in _annotation_names(annotation)]

    def _resolve(self, table, name):
        """The table whose binding a read of ``name`` in ``table`` reaches."""
        sym = table.lookup(name) if name in table.get_identifiers() else None
        if sym is not None and sym.is_declared_global():
            return self.top
        if sym is not None and sym.is_local():
            return table
        scope = self.parent.get(table.get_id())
        while scope is not None and scope is not self.top:
            # Class bodies are not enclosing scopes for nested functions.
            if (
                scope.get_type() == "function"
                and name in scope.get_identifiers()
                and scope.lookup(name).is_local()
            ):
                return scope
            scope = self.parent.get(scope.get_id())
        return self.top

    def _all_tables(self, table):
        yield table
        for child in table.get_children():
            yield from self._all_tables(child)

    def unused(self) -> list[str]:
        used: set[tuple[int, str]] = set()
        for table in self._all_tables(self.top):
            for sym in table.get_symbols():
                if sym.is_referenced():
                    used.add((self._resolve(table, sym.get_name()).get_id(), sym.get_name()))
        for table, name in self.extra_reads:
            used.add((self._resolve(table, name).get_id(), name))
        return [
            f"{line}:{name}"
            for table, line, name in self.imports
            if (table.get_id(), name) not in used
        ]


def unused_imports(src: str) -> list[str]:
    return _Scan(src).unused()


def test_detects_unused_plain_import():
    assert unused_imports("import asyncio\nimport json\njson.dumps({})\n") == ["1:asyncio"]


def test_detects_unused_from_import_and_alias():
    src = "from typing import Any, List\nimport numpy as np\nx: List[int] = []\n"
    assert unused_imports(src) == ["1:Any", "2:np"]


def test_detects_unused_function_local_import():
    assert unused_imports("def f():\n    import os\n    return 1\n") == ["2:os"]


def test_read_in_another_function_does_not_cover_a_local_import():
    src = "def f():\n    import os\n    return 1\n\ndef g():\n    import os\n    return os.sep\n"
    assert unused_imports(src) == ["2:os"]


def test_local_import_does_not_cover_an_unused_module_import():
    src = "import os\n\ndef f():\n    import os\n    return os.sep\n"
    assert unused_imports(src) == ["1:os"]


def test_rebinding_or_deleting_is_not_a_read():
    assert unused_imports("import json\njson = {}\n") == ["1:json"]
    assert unused_imports("import json\ndel json\n") == ["1:json"]
    assert unused_imports("import json\nfor json in []:\n    pass\n") == ["1:json"]


def test_module_import_read_from_nested_scopes():
    src = (
        "import os\n"
        "import sys\n"
        "class A:\n"
        "    def m(self):\n"
        "        return [os.sep for _ in range(1)]\n"
        "def f():\n"
        "    def g():\n"
        "        return sys.argv\n"
        "    return g\n"
    )
    assert unused_imports(src) == []


def test_function_import_read_from_a_closure():
    src = "def f():\n    import os\n    def g():\n        return os.sep\n    return g\n"
    assert unused_imports(src) == []


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


def test_annotation_under_future_annotations_counts_as_use():
    src = (
        "from __future__ import annotations\n"
        "from typing import Optional\n"
        "def f() -> Optional[int]:\n"
        "    return 1\n"
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
