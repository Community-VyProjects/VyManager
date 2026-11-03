"""A function local that is assigned and never read is dead.

Code-quality flags it as "Unused local variable". The scan uses
:mod:`symtable`, so a read in a nested function or lambda counts, and a
``global`` or ``nonlocal`` name is not a local. Only a bare-name target
of ``=``, an annotated assignment with a value, ``with ... as`` or ``:=``
is checked. Tuple unpacking, loop targets and ``except ... as`` names
are not, because code-quality does not report them either. Names that
start with ``_`` are deliberate placeholders.
"""

import ast
import symtable
from pathlib import Path

BACKEND = Path(__file__).resolve().parents[1]
_SKIP_DIRS = {"venv", ".venv", "node_modules", "__pycache__"}
_FUNCTION_NODES = (ast.FunctionDef, ast.AsyncFunctionDef)
_SCOPE_NODES = (ast.FunctionDef, ast.AsyncFunctionDef, ast.ClassDef, ast.Lambda)
_COMPREHENSIONS = (ast.ListComp, ast.SetComp, ast.DictComp, ast.GeneratorExp)


def _child(table, node):
    for child in table.get_children():
        if child.get_name() == node.name and child.get_lineno() == node.lineno:
            return child
    raise AssertionError(f"no symbol table for {node.name} at line {node.lineno}")


def _plain_bindings(body):
    """(line, name) for bare-name assignments in this scope, not nested ones."""
    stack = list(body)
    while stack:
        node = stack.pop()
        if isinstance(node, _SCOPE_NODES):
            continue
        targets = []
        if isinstance(node, ast.Assign):
            targets = node.targets
        elif isinstance(node, ast.AnnAssign) and node.value is not None:
            targets = [node.target]
        elif isinstance(node, ast.withitem) and node.optional_vars is not None:
            targets = [node.optional_vars]
        elif isinstance(node, ast.NamedExpr):
            targets = [node.target]
        for target in targets:
            if isinstance(target, ast.Name):
                yield target.lineno, target.id
        stack.extend(ast.iter_child_nodes(node))


def _comprehension_reads(body) -> set[str]:
    """Names read inside comprehensions in this scope.

    Python 3.12+ inlines list, set and dict comprehensions (PEP 709), and
    ``symtable`` then drops the read of an enclosing local used only inside
    one, so those reads are collected from the AST instead.
    """
    names: set[str] = set()
    stack = list(body)
    while stack:
        node = stack.pop()
        if isinstance(node, _SCOPE_NODES):
            continue
        if isinstance(node, _COMPREHENSIONS):
            names.update(
                n.id for n in ast.walk(node)
                if isinstance(n, ast.Name) and isinstance(n.ctx, ast.Load)
            )
            continue
        stack.extend(ast.iter_child_nodes(node))
    return names


def _read_below(table, name) -> bool:
    """Whether a nested scope reads ``name`` from an enclosing function."""
    for child in table.get_children():
        if name in child.get_identifiers() and child.lookup(name).is_free():
            return True
        if _read_below(child, name):
            return True
    return False


def _scan(body, table, out):
    for node in body:
        _visit(node, table, out)


def _visit(node, table, out):
    if isinstance(node, (*_FUNCTION_NODES, ast.ClassDef)):
        inner = _child(table, node)
        if isinstance(node, _FUNCTION_NODES):
            comprehension_reads = _comprehension_reads(node.body)
            for line, name in sorted(_plain_bindings(node.body)):
                sym = inner.lookup(name)
                if (
                    not name.startswith("_")
                    and sym.is_local()
                    and not sym.is_referenced()
                    and name not in comprehension_reads
                    and not _read_below(inner, name)
                ):
                    out.append(f"{line}:{name}")
        _scan(node.body, inner, out)
        return
    for child in ast.iter_child_nodes(node):
        _visit(child, table, out)


def unused_locals(src: str) -> list[str]:
    out: list[str] = []
    _scan(ast.parse(src).body, symtable.symtable(src, "<scan>", "exec"), out)
    return out


def test_detects_unused_assignment():
    src = "def f():\n    ids = (1, 2)\n    x = 1\n    return x\n"
    assert unused_locals(src) == ["2:ids"]


def test_detects_unused_annotated_with_and_walrus_targets():
    src = (
        "def f(cm):\n"
        "    a: int = 1\n"
        "    with cm as b:\n"
        "        pass\n"
        "    if (c := 2):\n"
        "        pass\n"
    )
    assert unused_locals(src) == ["2:a", "3:b", "5:c"]


def test_detects_unused_local_in_async_method():
    src = "class A:\n    async def m(self):\n        r = await self.x()\n"
    assert unused_locals(src) == ["3:r"]


def test_overwrite_without_read_is_unused():
    assert unused_locals("def f():\n    x = 1\n    x = 2\n") == ["2:x", "3:x"]


def test_read_after_assignment_is_used():
    src = "def f():\n    x = 1\n    x += 1\n    y = x\n    return y\n"
    assert unused_locals(src) == []


def test_read_from_closure_lambda_or_comprehension_is_used():
    src = (
        "def f():\n"
        "    a = 1\n"
        "    b = 2\n"
        "    c = 3\n"
        "    d = 4\n"
        "    e = 5\n"
        "    def g():\n"
        "        return a\n"
        "    h = lambda: b\n"
        "    return g, h, [c for _ in range(1)], {k: d for k in e}\n"
    )
    assert unused_locals(src) == []


def test_comprehension_reads_do_not_cover_other_names():
    src = "def f(rows):\n    seen = 1\n    keep = 2\n    return [r for r in rows if r == keep]\n"
    assert unused_locals(src) == ["2:seen"]


def test_global_and_nonlocal_targets_are_not_locals():
    src = (
        "def f():\n"
        "    global G\n"
        "    G = 1\n"
        "    n = 0\n"
        "    def g():\n"
        "        nonlocal n\n"
        "        n = 1\n"
        "    return g\n"
    )
    assert unused_locals(src) == []


def test_unpacking_loop_except_and_placeholders_are_skipped():
    src = (
        "def f(pairs):\n"
        "    a, b = pairs[0]\n"
        "    for k in pairs:\n"
        "        pass\n"
        "    try:\n"
        "        pass\n"
        "    except Exception as e:\n"
        "        pass\n"
        "    _ignored = 1\n"
        "    return a\n"
    )
    assert unused_locals(src) == []


def test_module_and_class_assignments_are_not_function_locals():
    assert unused_locals("X = 1\nclass A:\n    y = 2\n") == []


def test_no_unused_locals_in_backend():
    offenders = []
    for path in sorted(BACKEND.rglob("*.py")):
        rel = path.relative_to(BACKEND)
        if _SKIP_DIRS.intersection(rel.parts):
            continue
        offenders += [f"{rel}:{o}" for o in unused_locals(path.read_text())]
    assert offenders == []
