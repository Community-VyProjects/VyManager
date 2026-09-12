"""Export the FastAPI OpenAPI specification for the documentation site.

Run from the backend directory with the backend dependencies installed:

    python export_openapi.py

Writes docs-site/static/openapi/vymanager.json. The docs site renders that
file with Scalar at build time. Do not commit the JSON or per-endpoint pages.
"""

import json
import os

from app import app

OUTPUT = os.path.join(
    os.path.dirname(__file__),
    "..",
    "docs-site",
    "static",
    "openapi",
    "vymanager.json",
)


def export_spec(output: str | None = None) -> dict:
    spec = app.openapi()
    path = os.path.abspath(output or OUTPUT)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w") as f:
        json.dump(spec, f, indent=2)
        f.write("\n")
    return spec


if __name__ == "__main__":
    spec = export_spec()
    print(f"Wrote {os.path.normpath(os.path.abspath(OUTPUT))} ({len(spec.get('paths', {}))} paths)")
