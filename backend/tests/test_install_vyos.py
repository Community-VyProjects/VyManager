"""On-box install-vyos.sh: download/read/vbash, no firewall, appliance env."""

import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SCRIPT = ROOT / "install-vyos.sh"


def test_install_vyos_is_vbash_and_documents_download_read_run():
    text = SCRIPT.read_text()
    assert text.startswith("#!/bin/vbash")
    assert "less install-vyos.sh" in text
    assert "vbash install-vyos.sh" in text
    assert "curl -fsSL" in text
    assert "Do not pipe curl into vbash" in text
    assert "| vbash" not in text.split("Do not pipe curl into vbash", 1)[1][:400]


def test_install_vyos_does_not_write_firewall_nat_or_zone():
    text = SCRIPT.read_text()
    for needle in (
        "set firewall",
        "set nat",
        "set zone-policy",
        "set zone policy",
        "set service https listen-address 0.0.0.0",
        "set service ssh listen-address",
        "set service ssh port",
        "disable service ssh",
        "delete service ssh",
    ):
        assert needle not in text, needle


def test_install_vyos_appliance_shape():
    text = SCRIPT.read_text()
    assert "/config/containers/vymanager-postgres" in text
    assert "VYMANAGER_MODE value appliance" in text
    assert "VYMANAGER_APPLIANCE_HOST" in text
    assert "VYMANAGER_APPLIANCE_API_KEY" in text
    assert "TRUSTED_ORIGINS" in text
    assert "SSH_ENCRYPTION_KEY" in text
    assert "Commit this list and save?" in text
    assert "discard" in text
    assert "build_database_url" in text
    docs = (ROOT / "docs-site/docs/getting-started/install-vyos.md").read_text()
    assert "less install-vyos.sh" in docs
    assert "vbash install-vyos.sh" in docs
    assert "Do not pipe" in docs


def test_install_vyos_self_test_exercises_url_quoting_and_version_gates():
    proc = subprocess.run(
        ["bash", str(SCRIPT), "--self-test"],
        check=False,
        capture_output=True,
        text=True,
    )
    assert proc.returncode == 0, proc.stderr + proc.stdout
    assert "self-test ok" in proc.stdout
