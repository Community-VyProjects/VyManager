"""QoS page lives with the other routes, not under the (dashboard) group."""

from pathlib import Path

REPO = Path(__file__).resolve().parents[2]


def test_qos_page_left_the_dashboard_group():
    assert not (REPO / "frontend/src/app/(dashboard)").exists()
    page = REPO / "frontend/src/app/qos/page.tsx"
    assert page.is_file()
    text = page.read_text()
    assert 'from "@/components/qos/QoSContent"' in text
    nav = (REPO / "frontend/src/lib/navigation.ts").read_text()
    assert 'title: "QoS"' in nav
    assert 'href: "/qos"' in nav
