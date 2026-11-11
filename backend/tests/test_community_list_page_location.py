"""Community list pages follow the VyOS policy leaves, not bgp-* paths."""

from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
POLICIES = REPO / "frontend/src/app/policies"


def test_community_list_pages_left_the_bgp_paths():
    for old in ("bgp-community", "bgp-extended-community", "bgp-large-community"):
        assert not (POLICIES / old).exists()
    assert not (REPO / "frontend/messages/en/bgpLists.json").exists()
    assert not (REPO / "frontend/messages/zh-CN/bgpLists.json").exists()


def test_community_list_pages_match_the_policy_leaves():
    pages = {
        "community-list": ("CommunityListPage", "communityList"),
        "extcommunity-list": ("ExtCommunityListPage", "extcommunityList"),
        "large-community-list": ("LargeCommunityListPage", "largeCommunityList"),
    }
    nav = (REPO / "frontend/src/lib/navigation.ts").read_text()
    for leaf, (symbol, namespace) in pages.items():
        page = POLICIES / leaf / "page.tsx"
        assert page.is_file()
        text = page.read_text()
        assert f"function {symbol}(" in text
        assert f'useTranslations("{namespace}")' in text
        assert 'useTranslations("bgpLists")' not in text
        assert f'href: "/policies/{leaf}"' in nav
    assert 'title: "Community List"' in nav
    assert 'title: "ExtCommunity List"' in nav
    assert 'title: "Large Community List"' in nav
    assert "/policies/bgp-" not in nav
