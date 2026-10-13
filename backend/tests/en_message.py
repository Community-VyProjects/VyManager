"""Resolve one English catalog string by dotted key.

A substring scan of the whole file is not enough. Another key can contain
the same words, so a deleted leaf would still look present.
"""

import json
from pathlib import Path


def en_message(repo: Path, catalog: str, key: str) -> str:
    path = repo / "frontend" / "messages" / "en" / catalog
    node = json.loads(path.read_text())
    for part in key.split("."):
        if not isinstance(node, dict) or part not in node:
            raise KeyError(f"{catalog} has no {key}")
        node = node[part]
    if not isinstance(node, str):
        raise TypeError(f"{catalog} {key} is not a string")
    return node
