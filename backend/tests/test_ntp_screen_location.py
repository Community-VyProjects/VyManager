"""NTP screens live under components/service, with the other service features."""

from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
COMP = REPO / "frontend/src/components/service/ntp"
PAGE = REPO / "frontend/src/app/service/ntp/page.tsx"
OLD = REPO / "frontend/src/components/ntp"


def test_ntp_screens_live_under_service():
    assert not OLD.exists()
    assert (COMP / "NTPContent.tsx").exists()
    assert (COMP / "NTPGlobalSettingsModal.tsx").exists()
    assert (COMP / "NTPServerModal.tsx").exists()
    assert (COMP / "DeleteNTPServerModal.tsx").exists()


def test_ntp_page_imports_screens_from_service():
    page = PAGE.read_text()
    assert 'from "@/components/service/ntp/NTPContent"' in page
    assert 'from "@/components/ntp/' not in page
