---
id: api-reference-generation
title: Regenerating the API reference
sidebar_position: 3
---

# Regenerating the API reference

The API reference pages under `/api` are generated from the backend's OpenAPI specification and committed to the repository, so the docs site builds without Python or a running backend. When routes, models or docstrings change, regenerate them:

## 1. Export the spec

Requires the backend dependencies (use the backend venv):

```bash
cd backend
source venv/bin/activate
python export_openapi.py
```

This imports the FastAPI app and writes `docs-site/openapi/vymanager.json`. The script also escapes `<`, `{` and `}` in description strings — endpoint docstrings contain placeholders like `<interface-name>` that would otherwise be parsed as JSX and break the MDX build.

## 2. Regenerate the pages

```bash
cd docs-site
npm run clean-api-docs vymanager
npm run gen-api-docs vymanager
```

This rewrites `docs-site/docs/api/` (one MDX page per endpoint plus `sidebar.ts`, grouped by router tag). The main `sidebars.ts` imports the generated sidebar; no manual wiring is needed after regeneration.

## 3. Build and commit

```bash
npm run build
```

Fix anything the build reports (a new docstring with unescaped markup shows up here), then commit the changed spec and generated pages together with the backend change that caused them.

Keep routers tagged: every `APIRouter` sets `tags=[...]`, and those tags become the sidebar categories. A new router without a tag ends up in a loose group at the bottom of the API sidebar.
