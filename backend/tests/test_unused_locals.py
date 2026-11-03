"""A function local that is assigned and never read is dead.

Code-quality flags it as "Unused local variable". Only a bare-name target
of ``=``, an annotated assignment with a value, ``with ... as`` or ``:=``
is checked. Tuple unpacking, loop targets and ``except ... as`` names are
not, because code-quality does not report them either. Names that start
with ``_`` are deliberate placeholders.

Reads in the function itself and in nested ``def`` and ``class`` bodies
come from :mod:`symtable`, so ``global`` and ``nonlocal`` names are not
locals and a nested function that rebinds the name shadows it. Reads in
lambdas and comprehensions come from the AST instead. Python 3.12+
inlines list, set and dict comprehensions (PEP 709), and ``symtable`` then
loses both the read of an enclosing local and the shadowing by the
comprehension's own targets. Walking those expressions the same way on
every version keeps the scan identical on 3.11 and 3.13.
"""

import ast
import symtable
from pathlib import Path

BACKEND = Path(__file__).resolve().parents[1]
_SKIP_DIRS = {"venv", ".venv", "node_modules", "__pycache__"}
_FUNCTION_NODES = (ast.FunctionDef, ast.AsyncFunctionDef)
_DEF_NODES = (*_FUNCTION_NODES, ast.ClassDef)
_COMPREHENSIONS = (ast.ListComp, ast.SetComp, ast.DictComp, ast.GeneratorExp)
_EXPRESSION_SCOPES = (ast.Lambda, *_COMPREHENSIONS)


def _child(table, node):
    for child in table.get_children():
        if child.get_name() == node.name and child.get_lineno() == node.lineno:
            return child
    raise AssertionError(f"no symbol table for {node.name} at line {node.lineno}")


def _outer_parts(node):
    """Pieces of a ``def`` or ``class`` that run in the enclosing scope."""
    parts = list(node.decorator_list)
    if isinstance(node, ast.ClassDef):
        return parts + node.bases + [k.value for k in node.keywords]
    args = node.args
    parts += args.defaults + [d for d in args.kw_defaults if d is not None]
    params = args.posonlyargs + args.args + args.kwonlyargs
    params += [a for a in (args.vararg, args.kwarg) if a]
    parts += [a.annotation for a in params if a.annotation is not None]
    return parts + ([node.returns] if node.returns is not None else [])


def _scope_nodes(body):
    """Nodes evaluated in this scope.

    Nested ``def`` and ``class`` bodies are left out. Lambdas and
    comprehensions are yielded but not entered.
    """
    stack = list(body)
    while stack:
        node = stack.pop()
        yield node
        if isinstance(node, _DEF_NODES):
            stack.extend(_outer_parts(node))
        elif not isinstance(node, _EXPRESSION_SCOPES):
            stack.extend(ast.iter_child_nodes(node))


def _plain_bindings(body):
    """(line, name) for bare-name assignments in this scope."""
    for node in _scope_nodes(body):
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


def _expression_reads(node, bound, reads, binds, in_lambda=False):
    """Collect names a lambda or comprehension reads from the enclosing scope.

    ``bound`` holds the lambda parameters and comprehension targets in
    effect, which shadow the enclosing names. A ``:=`` inside a
    comprehension binds in the enclosing function, so it goes to ``binds``
    unless a lambda sits in between.
    """
    if isinstance(node, ast.Name):
        if isinstance(node.ctx, ast.Load) and node.id not in bound:
            reads.add(node.id)
        return
    if isinstance(node, ast.NamedExpr):
        if not in_lambda:
            binds.add((node.target.lineno, node.target.id))
        _expression_reads(node.value, bound, reads, binds, in_lambda)
        return
    if isinstance(node, ast.Lambda):
        args = node.args
        for default in args.defaults + [d for d in args.kw_defaults if d is not None]:
            _expression_reads(default, bound, reads, binds, in_lambda)
        params = args.posonlyargs + args.args + args.kwonlyargs
        params += [a for a in (args.vararg, args.kwarg) if a]
        inner = bound | {a.arg for a in params}
        _expression_reads(node.body, inner, reads, binds, True)
        return
    if isinstance(node, _COMPREHENSIONS):
        # The first iterable runs before any target is bound; each later
        # clause and the element see every target bound so far.
        current = set(bound)
        for gen in node.generators:
            _expression_reads(gen.iter, frozenset(current), reads, binds, in_lambda)
            current |= {n.id for n in ast.walk(gen.target) if isinstance(n, ast.Name)}
            for cond in gen.ifs:
                _expression_reads(cond, frozenset(current), reads, binds, in_lambda)
        elements = [node.key, node.value] if isinstance(node, ast.DictComp) else [node.elt]
        for element in elements:
            _expression_reads(element, frozenset(current), reads, binds, in_lambda)
        return
    for child in ast.iter_child_nodes(node):
        _expression_reads(child, bound, reads, binds, in_lambda)


def _read_by_nested_def(table, body, name) -> bool:
    """Whether a nested ``def`` or ``class`` reads ``name`` from this scope.

    CPython marks a name free in every scope it passes through, so the
    direct children are enough, and a child that rebinds the name has it
    local, not free.
    """
    for node in _scope_nodes(body):
        if isinstance(node, _DEF_NODES):
            child = _child(table, node)
            if name in child.get_identifiers() and child.lookup(name).is_free():
                return True
    return False


def _scan(body, table, out):
    for node in body:
        _visit(node, table, out)


def _check_function(node, table, out):
    reads: set[str] = set()
    binds: set[tuple[int, str]] = set(_plain_bindings(node.body))
    for sub in _scope_nodes(node.body):
        if isinstance(sub, _EXPRESSION_SCOPES):
            _expression_reads(sub, frozenset(), reads, binds)
    for line, name in sorted(binds):
        sym = table.lookup(name)
        if (
            not name.startswith("_")
            and sym.is_local()
            and not sym.is_referenced()
            and name not in reads
            and not _read_by_nested_def(table, node.body, name)
        ):
            out.append(f"{line}:{name}")


def _visit(node, table, out):
    if isinstance(node, _DEF_NODES):
        inner = _child(table, node)
        if isinstance(node, _FUNCTION_NODES):
            _check_function(node, inner, out)
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


def test_shadowing_nested_function_does_not_cover_the_outer_local():
    src = (
        "def f():\n"
        "    x = 1\n"
        "    def g():\n"
        "        x = 2\n"
        "        def h():\n"
        "            return x\n"
        "        return h\n"
        "    return g\n"
    )
    assert unused_locals(src) == ["2:x"]


def test_read_passed_through_nested_scopes_is_used():
    src = (
        "def f():\n"
        "    x = 1\n"
        "    y = 2\n"
        "    def g():\n"
        "        def h():\n"
        "            return x\n"
        "        return h\n"
        "    class C:\n"
        "        def m(self):\n"
        "            return y\n"
        "    return g, C\n"
    )
    assert unused_locals(src) == []


def test_comprehension_target_and_lambda_parameter_shadow_the_local():
    src = (
        "def f(rows):\n"
        "    r = 1\n"
        "    a = 2\n"
        "    b = 3\n"
        "    x = 4\n"
        "    return (\n"
        "        [r for r in rows],\n"
        "        (lambda a: a),\n"
        "        [lambda: b for b in rows],\n"
        "        [y for x in rows for y in x],\n"
        "    )\n"
    )
    assert unused_locals(src) == ["2:r", "3:a", "4:b", "5:x"]


def test_first_comprehension_iterable_reads_the_enclosing_name():
    src = "def f():\n    r = [1]\n    return [r for r in r]\n"
    assert unused_locals(src) == []


def test_walrus_in_comprehension_binds_the_function():
    unused = "def f(rows):\n    [(t := r) for r in rows]\n"
    used = "def f(rows):\n    [(t := r) for r in rows]\n    return t\n"
    in_lambda = "def f(rows):\n    return [lambda: (t := r) for r in rows]\n"
    assert unused_locals(unused) == ["2:t"]
    assert unused_locals(used) == []
    assert unused_locals(in_lambda) == []


def test_read_in_nested_def_decorator_or_default_is_used():
    src = (
        "def f(deco):\n"
        "    x = 1\n"
        "    y = 2\n"
        "    @deco(lambda: x)\n"
        "    def g(v=[y for _ in range(1)]):\n"
        "        return v\n"
        "    return g\n"
    )
    assert unused_locals(src) == []


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
