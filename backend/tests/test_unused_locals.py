"""A function local that is assigned and never read is dead.

Code-quality flags it as "Unused local variable". Only a bare-name target
of ``=``, an annotated assignment with a value, ``with ... as`` or ``:=``
is checked. Tuple unpacking, loop targets and ``except ... as`` names are
not, because code-quality does not report them either. Names that start
with ``_`` are deliberate placeholders. An ``x += 1`` target and a name
in an annotation (quoted or not) count as reads.

Reads in the function itself and in nested ``def`` and ``class`` bodies
come from :mod:`symtable`, so ``global`` and ``nonlocal`` names are not
locals and a nested function that rebinds the name shadows it. A class
body that rebinds the name does not shadow it for its methods, lambdas
and comprehensions. Reads in lambdas and comprehensions come from the AST
instead. Python 3.12+ inlines list, set and dict comprehensions (PEP 709),
and ``symtable`` then loses both the read of an enclosing local and the
shadowing by the comprehension's own targets. Walking those expressions
the same way on every version keeps the scan identical on 3.11 and 3.13.
Annotation names also come from the AST, because ``symtable`` drops them
under ``from __future__ import annotations``.
"""

import ast
import symtable
from pathlib import Path

from tests.annotation_names import annotation_names

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


def _params(args):
    params = args.posonlyargs + args.args + args.kwonlyargs
    return params + [a for a in (args.vararg, args.kwarg) if a]


def _defaults(args):
    return args.defaults + [d for d in args.kw_defaults if d is not None]


def _def_annotations(node):
    """Parameter and return annotations of a ``def``."""
    if isinstance(node, ast.ClassDef):
        return []
    annotations = [a.annotation for a in _params(node.args) if a.annotation is not None]
    return annotations + ([node.returns] if node.returns is not None else [])


def _outer_parts(node):
    """Decorators, bases and defaults, which run in the enclosing scope.

    Annotations also run there but are read by :func:`_annotation_lookups`.
    """
    parts = list(node.decorator_list)
    if isinstance(node, ast.ClassDef):
        return parts + node.bases + [k.value for k in node.keywords]
    return parts + _defaults(node.args)


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
        for default in _defaults(node.args):
            _expression_reads(default, bound, reads, binds, in_lambda)
        _lambda_body(node, bound, reads, binds)
        return
    if isinstance(node, _COMPREHENSIONS):
        # The first iterable runs before any target is bound.
        _expression_reads(node.generators[0].iter, bound, reads, binds, in_lambda)
        _comprehension_body(node, bound, reads, binds, in_lambda)
        return
    for child in ast.iter_child_nodes(node):
        _expression_reads(child, bound, reads, binds, in_lambda)


def _lambda_walrus_targets(node) -> set[str]:
    """Names a ``:=`` binds in this lambda, through comprehensions in it.

    A nested lambda's body is its own scope, but its defaults run here.
    """
    names: set[str] = set()
    stack = [node.body]
    while stack:
        sub = stack.pop()
        if isinstance(sub, ast.Lambda):
            stack.extend(_defaults(sub.args))
            continue
        if isinstance(sub, ast.NamedExpr):
            names.add(sub.target.id)
        stack.extend(ast.iter_child_nodes(sub))
    return names


def _lambda_body(node, bound, reads, binds):
    inner = bound | {a.arg for a in _params(node.args)} | _lambda_walrus_targets(node)
    _expression_reads(node.body, inner, reads, binds, True)


def _comprehension_body(node, bound, reads, binds, in_lambda):
    """Everything after the first iterable; each part sees the targets so far."""
    current = set(bound)
    for index, gen in enumerate(node.generators):
        if index:
            _expression_reads(gen.iter, frozenset(current), reads, binds, in_lambda)
        current |= {
            n.id for n in ast.walk(gen.target)
            if isinstance(n, ast.Name) and isinstance(n.ctx, ast.Store)
        }
        # ``o`` in ``for o.x in`` and ``d``, ``k`` in ``for d[k] in`` are reads.
        _expression_reads(gen.target, frozenset(current), reads, binds, in_lambda)
        for cond in gen.ifs:
            _expression_reads(cond, frozenset(current), reads, binds, in_lambda)
    elements = [node.key, node.value] if isinstance(node, ast.DictComp) else [node.elt]
    for element in elements:
        _expression_reads(element, frozenset(current), reads, binds, in_lambda)


def _class_bypass_reads(node, reads):
    """Reads in a class-body lambda or comprehension that skip the class.

    Lambda defaults and a comprehension's first iterable run in the class
    scope, so only expression scopes nested in them reach further out.
    """
    if isinstance(node, ast.Lambda):
        outer = _defaults(node.args)
        _lambda_body(node, frozenset(), reads, set())
    else:
        outer = [node.generators[0].iter]
        _comprehension_body(node, frozenset(), reads, set(), False)
    for sub in _scope_nodes(outer):
        if isinstance(sub, _EXPRESSION_SCOPES):
            _class_bypass_reads(sub, reads)


def _nested_reads(table, node, name) -> bool:
    """Whether nested scope ``table`` (for ``node``) reads ``name`` from outside.

    CPython marks a name free in every scope it passes through, so a
    function child answers directly, and one that rebinds the name has it
    local, not free. A class that rebinds the name keeps it local, yet its
    methods, lambdas and comprehensions still read the outer one.
    """
    if name in table.get_identifiers() and table.lookup(name).is_free():
        return True
    if not isinstance(node, ast.ClassDef):
        return False
    for sub in _scope_nodes(node.body):
        if isinstance(sub, _DEF_NODES):
            if _nested_reads(_child(table, sub), sub, name):
                return True
        elif isinstance(sub, _EXPRESSION_SCOPES):
            reads: set[str] = set()
            _class_bypass_reads(sub, reads)
            if name in reads:
                return True
    return False


def _stops_at(table, name) -> bool:
    if name not in table.get_identifiers():
        return False
    sym = table.lookup(name)
    return sym.is_local() or sym.is_declared_global()


def _annotation_lookups(table, body):
    """(own, passed) annotation names whose lookup starts in this scope.

    ``own`` are annotations evaluated here. ``passed`` come up from nested
    scopes that do not bind them. A class stops its own annotation names
    if it binds them, but names from its methods skip the class.
    """
    own: set[str] = set()
    passed: set[str] = set()
    for sub in _scope_nodes(body):
        if isinstance(sub, ast.AnnAssign):
            own |= annotation_names(sub.annotation)
        if not isinstance(sub, _DEF_NODES):
            continue
        for annotation in _def_annotations(sub):
            own |= annotation_names(annotation)
        child = _child(table, sub)
        child_own, child_passed = _annotation_lookups(child, sub.body)
        if isinstance(sub, ast.ClassDef):
            passed |= {n for n in child_own if not _stops_at(child, n)} | child_passed
        else:
            passed |= {n for n in child_own | child_passed if not _stops_at(child, n)}
    return own, passed


def _scan(body, table, out):
    for node in body:
        _visit(node, table, out)


def _check_function(node, table, out):
    own, passed = _annotation_lookups(table, node.body)
    reads: set[str] = own | passed
    binds: set[tuple[int, str]] = set(_plain_bindings(node.body))
    nested = []
    for sub in _scope_nodes(node.body):
        if isinstance(sub, _EXPRESSION_SCOPES):
            _expression_reads(sub, frozenset(), reads, binds)
        elif isinstance(sub, ast.AugAssign) and isinstance(sub.target, ast.Name):
            reads.add(sub.target.id)
        elif isinstance(sub, _DEF_NODES):
            nested.append(sub)
    for line, name in sorted(binds):
        sym = table.lookup(name)
        if (
            not name.startswith("_")
            and sym.is_local()
            and not sym.is_referenced()
            and name not in reads
            and not any(_nested_reads(_child(table, n), n, name) for n in nested)
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


def test_augmented_assignment_reads_its_target():
    src = "def f(o):\n    x = 0\n    x += 1\n    o.n += 1\n    o[0] += 1\n"
    assert unused_locals(src) == []


def test_class_that_rebinds_the_name_does_not_shadow_its_methods():
    src = (
        "def f(rows):\n"
        "    x = 1\n"
        "    y = 2\n"
        "    z = 3\n"
        "    w = 4\n"
        "    class C:\n"
        "        x = y = z = w = 0\n"
        "        def m(self):\n"
        "            return x\n"
        "        g = lambda self: y\n"
        "        h = [z for _ in rows]\n"
        "        class D:\n"
        "            def n(self):\n"
        "                return w\n"
        "    return C\n"
    )
    assert unused_locals(src) == []


def test_class_scope_parts_of_class_lambdas_and_comprehensions_read_the_class():
    src = (
        "def f():\n"
        "    x = 1\n"
        "    y = 2\n"
        "    class C:\n"
        "        x = y = [0]\n"
        "        g = lambda self, v=x: v\n"
        "        h = [r for r in y]\n"
        "    return C\n"
    )
    assert unused_locals(src) == ["2:x", "3:y"]


def test_reads_in_class_bases_keywords_and_kw_defaults_are_used():
    src = (
        "def f(mk):\n"
        "    a = 1\n"
        "    b = 2\n"
        "    c = 3\n"
        "    class C(mk(lambda: a), metaclass=mk(lambda: b)):\n"
        "        pass\n"
        "    def g(*, v=(lambda: c)):\n"
        "        return v\n"
        "    return C, g\n"
    )
    assert unused_locals(src) == []


def test_annotation_reads_count_under_future_annotations():
    src = (
        "from __future__ import annotations\n"
        "def f():\n"
        "    A = int\n"
        "    P = int\n"
        "    R = int\n"
        "    Q = int\n"
        "    M = int\n"
        "    a: A = 1\n"
        "    def g(v: P) -> 'R':\n"
        "        w: Q = v\n"
        "        return w\n"
        "    class C:\n"
        "        M = 0\n"
        "        def m(self):\n"
        "            q: M = 0\n"
        "            return q\n"
        "    return a, g, C\n"
    )
    assert unused_locals(src) == []


def test_annotation_name_bound_in_a_nested_scope_does_not_reach_out():
    src = (
        "from __future__ import annotations\n"
        "def f():\n"
        "    T = int\n"
        "    U = int\n"
        "    M = int\n"
        "    def g():\n"
        "        T = str\n"
        "        w: T = 1\n"
        "        return w, T\n"
        "    class C:\n"
        "        U = M = str\n"
        "        v: U = 1\n"
        "        def m(self) -> M:\n"
        "            pass\n"
        "    return g, C\n"
    )
    assert unused_locals(src) == ["3:T", "4:U", "5:M"]


def test_bare_annotation_without_value_is_not_a_binding():
    assert unused_locals("def f():\n    x: int\n    return 1\n") == []


def test_comprehension_in_a_function_scope_lambda_default_is_read():
    src = "def f(r):\n    c = 1\n    g = lambda v=[c for _ in r]: v\n    return g\n"
    assert unused_locals(src) == []


def test_comprehension_condition_sees_its_own_target():
    src = "def f(rows):\n    r = 1\n    return [r for r in rows if r]\n"
    assert unused_locals(src) == ["2:r"]


def test_lambda_nested_in_class_comprehension_iterable_reads_the_function():
    src = (
        "def f():\n"
        "    x = 1\n"
        "    class C:\n"
        "        x = 0\n"
        "        h = [a for a in (lambda: x)()]\n"
        "    return C\n"
    )
    assert unused_locals(src) == []


def test_annotation_name_declared_global_in_a_nested_function_does_not_reach_out():
    src = (
        "from __future__ import annotations\n"
        "def f():\n"
        "    T = int\n"
        "    def g():\n"
        "        global T\n"
        "        w: T = 1\n"
        "        return w\n"
        "    return g\n"
    )
    assert unused_locals(src) == ["3:T"]


def test_every_lambda_parameter_kind_shadows_the_local():
    src = (
        "def f():\n"
        "    p = 1\n"
        "    a = 2\n"
        "    k = 3\n"
        "    o = 4\n"
        "    return lambda p, /, *a, o, **k: (p, a, o, k)\n"
    )
    assert unused_locals(src) == ["2:p", "3:a", "4:k", "5:o"]


def test_set_dict_and_generator_comprehensions_read_and_shadow():
    src = (
        "def f(rows):\n"
        "    s = 1\n"
        "    g = 2\n"
        "    d = 3\n"
        "    key = 4\n"
        "    sr = 5\n"
        "    gr = 6\n"
        "    return (\n"
        "        {s for s in rows},\n"
        "        (g for g in rows),\n"
        "        {d: v for d, v in rows},\n"
        "        {key: 0 for _ in rows},\n"
        "        {sr for _ in rows},\n"
        "        (gr for _ in rows),\n"
        "    )\n"
    )
    assert unused_locals(src) == ["2:s", "3:g", "4:d"]


def test_star_parameter_annotations_count_under_future_annotations():
    src = (
        "from __future__ import annotations\n"
        "def f():\n"
        "    P = int\n"
        "    Q = int\n"
        "    O = int\n"
        "    def g(x: O, /, *v: P, **w: Q):\n"
        "        return x, v, w\n"
        "    return g\n"
    )
    assert unused_locals(src) == []


def test_walrus_value_in_a_comprehension_reads_the_local():
    src = "def f(rows):\n    k = 1\n    return [(t := k) for _ in rows], t\n"
    assert unused_locals(src) == []


def test_lambda_nested_in_a_class_lambda_default_reads_the_function():
    src = (
        "def f():\n"
        "    x = 1\n"
        "    class C:\n"
        "        x = 0\n"
        "        g = lambda self, v=(lambda: x): v\n"
        "    return C\n"
    )
    assert unused_locals(src) == []


def test_later_comprehension_iterable_and_lambda_body_iterable_are_read():
    src = (
        "def f(rows):\n"
        "    k = 1\n"
        "    x = 2\n"
        "    return [y for _ in rows for y in k], lambda: [a for a in x]\n"
    )
    assert unused_locals(src) == []


def test_functions_under_compound_statements_are_scanned():
    src = (
        "if True:\n"
        "    def f():\n"
        "        x = 1\n"
        "class A:\n"
        "    try:\n"
        "        def m(self):\n"
        "            y = 1\n"
        "    finally:\n"
        "        pass\n"
    )
    assert unused_locals(src) == ["3:x", "7:y"]


def test_redefined_function_is_matched_to_its_own_symbol_table():
    src = "def f():\n    x = 1\n\ndef f():\n    y = 2\n    return y\n"
    assert unused_locals(src) == ["2:x"]


def test_read_in_class_decorator_is_used():
    src = (
        "def f(mk):\n"
        "    d = 1\n"
        "    @mk(lambda: d)\n"
        "    class C:\n"
        "        pass\n"
        "    return C\n"
    )
    assert unused_locals(src) == []


def test_annotations_reach_out_of_classes_and_nested_functions():
    src = (
        "from __future__ import annotations\n"
        "def f():\n"
        "    V = int\n"
        "    D = int\n"
        "    class C:\n"
        "        v: V = 1\n"
        "    def g():\n"
        "        def h():\n"
        "            w: D = 1\n"
        "            return w\n"
        "        return h\n"
        "    return C, g\n"
    )
    assert unused_locals(src) == []


def test_comprehension_attribute_and_subscript_targets_read_their_names():
    src = (
        "def f(rows):\n"
        "    o = 1\n"
        "    d = 2\n"
        "    k = 3\n"
        "    return [1 for o.x in rows], [1 for d[k] in rows]\n"
    )
    assert unused_locals(src) == []


def test_def_with_a_lambda_default_gets_its_own_symbol_table():
    src = "def f():\n    def g(v=lambda: 0):\n        y = 1\n    return g\n"
    assert unused_locals(src) == ["3:y"]


def test_walrus_in_a_lambda_shadows_the_local_for_that_lambda():
    src = (
        "def f():\n"
        "    x = 1\n"
        "    y = 2\n"
        "    z = 3\n"
        "    w = 4\n"
        "    return (\n"
        "        lambda: (x := 0) + x,\n"
        "        lambda rows: [(y := r) for r in rows] and y,\n"
        "        lambda: ((lambda: (z := 0))(), z),\n"
        "        lambda: ((lambda v=(w := 0): v), w),\n"
        "    )\n"
    )
    assert unused_locals(src) == ["2:x", "3:y", "5:w"]


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
