import json
from pathlib import Path

from export_openapi import export_spec


def test_export_spec_writes_fastapi_document(tmp_path: Path):
    out = tmp_path / "vymanager.json"
    spec = export_spec(str(out))
    assert spec["openapi"].startswith("3.")
    assert "/vyos/show/hardware-sensors" in spec["paths"]
    dumped = json.loads(out.read_text())
    assert dumped["paths"] == spec["paths"]
