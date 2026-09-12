---
id: api-reference-generation
title: API reference
sidebar_position: 3
---

# API reference

The public API reference is FastAPI's OpenAPI document, rendered by Scalar.
`app.openapi()` is the source of truth. Do not commit the spec JSON or
per-endpoint pages.

A running instance already serves interactive docs at `/docs` and the spec at
`/openapi.json`. The docs site copies that same spec at build time.

## Building the docs site

From the repository root, with backend dependencies installed:

```bash
cd backend
python export_openapi.py
cd ../docs-site
npm run build
```

`npm run build` and `npm start` in `docs-site` also run `export_openapi.py`
first when Python is available. CI exports the spec, then builds Docusaurus.
Publish the `docs-site/build` output the same way as today.

Route, model, or docstring changes do not need a docs commit. The next docs
build picks them up.
