"""Route-map rules table shows IPv6 prefix-list matches like IPv4."""

from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
ROW = REPO / "frontend/src/components/policies/RouteMapRuleRow.tsx"


def test_row_renders_match_overview_from_helper():
    text = ROW.read_text()
    assert 'from "./route-map-overview"' in text
    assert "routeMapMatchOverviewBadges(rule.match)" in text
