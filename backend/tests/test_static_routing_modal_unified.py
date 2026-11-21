"""Static routing create and edit share one modal per entity.

Global, routing-table and VRF routes all use StaticRouteModal with a scope;
ARP entries, multicast routes, neighbor proxy entries and routing tables
each have one modal taking existing?: T | null. Every emit lives in
frontend/src/lib/api/static-routes-save-ops.ts (tested by
`npm run test:static-routes-save`).
"""

from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
COMP = REPO / "frontend/src/components/routing"
PAGE = REPO / "frontend/src/app/routing/static-failover/static-routes/page.tsx"
ACCORDION = COMP / "RoutingTablesAccordion.tsx"
VRF_TAB = REPO / "frontend/src/components/vrf/VrfStaticRoutesTab.tsx"
SAVE_OPS = REPO / "frontend/src/lib/api/static-routes-save-ops.ts"

MODALS = (
    "StaticRouteModal.tsx",
    "ArpEntryModal.tsx",
    "CreateMrouteModal.tsx",
    "CreateNeighborProxyModal.tsx",
    "RoutingTableModal.tsx",
)


def test_cloned_create_edit_files_are_gone():
    for name in (
        "CreateStaticRouteModal.tsx",
        "EditStaticRouteModal.tsx",
        "CreateTableRouteModal.tsx",
        "EditTableRouteModal.tsx",
        "TableRouteModal.tsx",
        "DeleteTableRouteModal.tsx",
        "ViewRoutingTableModal.tsx",
        "CreateArpEntryModal.tsx",
        "EditArpEntryModal.tsx",
        "CreateRoutingTableModal.tsx",
        "EditRoutingTableModal.tsx",
        "static-routes-form.ts",
    ):
        assert not (COMP / name).exists(), name


def test_page_uses_unified_modals():
    page = PAGE.read_text()
    for modal in ("StaticRouteModal", "ArpEntryModal", "RoutingTableModal", "CreateMrouteModal"):
        assert f'from "@/components/routing/{modal}"' in page
        assert f"<{modal}" in page
    assert 'scope={{ kind: "global" }}' in page


def test_table_and_vrf_routes_use_the_route_modal():
    accordion = ACCORDION.read_text()
    assert 'from "./StaticRouteModal"' in accordion
    assert 'scope={{ kind: "table"' in accordion
    vrf_tab = VRF_TAB.read_text()
    assert 'from "@/components/routing/StaticRouteModal"' in vrf_tab
    assert 'scope={{ kind: "vrf", vrf: vrf.name }}' in vrf_tab


def test_modals_use_shared_mode_helpers():
    for modal in MODALS:
        assert 'from "@/lib/modal-mode"' in (COMP / modal).read_text(), modal
    static_modal = (COMP / "StaticRouteModal.tsx").read_text()
    assert "lockedIdentity(existing, (r) => r.destination, draft.destination)" in static_modal


def test_emits_live_in_the_save_ops_module():
    assert SAVE_OPS.exists()
    assert (REPO / "frontend/src/lib/api/static-routes-save-ops.test.ts").exists()
    client = (REPO / "frontend/src/lib/api/static-routes.ts").read_text()
    assert 'from "./static-routes-save-ops"' in client
    for modal in MODALS:
        src = (COMP / modal).read_text()
        assert '"@/lib/api/static-routes-save-ops"' in src, modal
        assert "{ op:" not in src, modal


def test_config_ui_shows_no_version_numbers():
    for modal in MODALS:
        src = (COMP / modal).read_text()
        for banned in ("VyOS 1.5", "VyOS 1.4", "1.5+ only", "1.4 only"):
            assert banned not in src
