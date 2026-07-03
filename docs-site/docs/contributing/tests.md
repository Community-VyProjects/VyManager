---
id: tests
title: Tests
sidebar_position: 2
---

# Tests

Backend tests live in `backend/tests/` and run with pytest (installed by `requirements.txt`):

```bash
cd backend
source venv/bin/activate
pytest
```

Coverage is currently thin — three test modules exist: `test_app.py` (API root smoke test via FastAPI's `TestClient`), `test_bug_report_redaction.py` and `test_qos_stats.py`. Tests import the app directly and do not need a database or a router for what they cover.

The frontend has no automated test suite; `npm run lint` is the only check. There are no end-to-end tests. Because of this, pull requests are expected to carry manual testing notes — what you tested, on which VyOS versions — as described in `CONTRIBUTING.md`.
