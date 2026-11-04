"""Names an annotation reads, shared by the dead-binding scans."""

import ast


def annotation_names(annotation) -> set[str]:
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
