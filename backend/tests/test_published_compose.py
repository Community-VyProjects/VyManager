"""Published compose must migrate before backend health, and Prisma pins must match."""

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


PUBLISHED = [
    ROOT / "install.sh",
    ROOT / "README.md",
    ROOT / "docs-site/docs/getting-started/install-docker.md",
]


def test_published_compose_has_one_shot_migrate_before_backend():
    for path in PUBLISHED:
        text = path.read_text()
        assert "npx prisma migrate deploy" in text, path
        assert re.search(r"^  migrate:$", text, re.M), path
        assert text.count("service_completed_successfully") >= 2, path
        assert "backend:\n        condition: service_healthy" not in text, path


def test_prisma_client_and_cli_pins_match():
    pkg = json.loads((ROOT / "frontend/package.json").read_text())
    client = pkg["dependencies"]["@prisma/client"]
    cli = pkg["devDependencies"]["prisma"]
    assert client == cli
    lock = json.loads((ROOT / "frontend/package-lock.json").read_text())
    assert lock["packages"][""]["dependencies"]["@prisma/client"] == client
    assert lock["packages"][""]["devDependencies"]["prisma"] == cli
    assert lock["packages"]["node_modules/@prisma/client"]["version"] == client
    assert lock["packages"]["node_modules/prisma"]["version"] == cli
