"""Export the FastAPI OpenAPI specification for the documentation site.

Run from the backend directory with the backend dependencies installed:

    python export_openapi.py

Writes docs-site/openapi/vymanager.json, which the docs site's OpenAPI
plugin turns into the API reference pages. Re-run whenever routes change,
then regenerate the pages (see docs-site README / Contributing docs).
"""

import json
import os

from app import app

OUTPUT = os.path.join(os.path.dirname(__file__), "..", "docs-site", "openapi", "vymanager.json")

def _escape_mdx(value):
    """Escape angle brackets and braces in description/summary strings.

    Endpoint docstrings contain placeholders like <interface-name> and literal
    {json} examples. The docs generator emits them into MDX, where an unescaped
    '<' or '{' is parsed as JSX and breaks the docs build.
    """
    return value.replace("<", "&lt;").replace("{", "&#123;").replace("}", "&#125;")


def _sanitize(node):
    if isinstance(node, dict):
        return {
            k: _escape_mdx(v) if k in ("description", "summary") and isinstance(v, str) else _sanitize(v)
            for k, v in node.items()
        }
    if isinstance(node, list):
        return [_sanitize(item) for item in node]
    return node


spec = _sanitize(app.openapi())

with open(OUTPUT, "w") as f:
    json.dump(spec, f, indent=2)

print(f"Wrote {os.path.normpath(OUTPUT)} ({len(spec.get('paths', {}))} paths)")
