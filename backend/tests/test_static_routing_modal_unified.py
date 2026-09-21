"""Static routing create and edit share one modal per entity.

CreateStaticRouteModal/EditStaticRouteModal, table routes, ARP entries, and
routing-table id were the same form twice. They are now StaticRouteModal,
TableRouteModal, ArpEntryModal, and RoutingTableModal with existing?: T | null.
"""

from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
COMP = REPO / "frontend/src/components/routing"
PAGE = REPO / "frontend/src/app/routing/static-failover/static-routes/page.tsx"
ACCORDION = COMP / "RoutingTablesAccordion.tsx"
VIEW = COMP / "ViewRoutingTableModal.tsx"


def test_cloned_create_edit_files_are_gone():
    for name in (
        "CreateStaticRouteModal.tsx",
        "EditStaticRouteModal.tsx",
        "CreateTableRouteModal.tsx",
        "EditTableRouteModal.tsx",
        "CreateArpEntryModal.tsx",
        "EditArpEntryModal.tsx",
        "CreateRoutingTableModal.tsx",
        "EditRoutingTableModal.tsx",
    ):
        assert not (COMP / name).exists()


def test_page_uses_unified_modals():
    page = PAGE.read_text()
    assert 'from "@/components/routing/StaticRouteModal"' in page
    assert "<StaticRouteModal" in page
    assert 'from "@/components/routing/ArpEntryModal"' in page
    assert "<ArpEntryModal" in page
    assert 'from "@/components/routing/RoutingTableModal"' in page
    assert "<RoutingTableModal" in page
    for gone in (
        "CreateStaticRouteModal",
        "EditStaticRouteModal",
        "CreateArpEntryModal",
        "EditArpEntryModal",
        "CreateRoutingTableModal",
        "EditRoutingTableModal",
    ):
        assert f'from "@/components/routing/{gone}"' not in page
        assert f"<{gone}" not in page


def test_table_route_callers_use_unified_modal():
    accordion = ACCORDION.read_text()
    assert 'from "./TableRouteModal"' in accordion
    assert "<TableRouteModal" in accordion
    assert "CreateTableRouteModal" not in accordion
    assert "EditTableRouteModal" not in accordion
    view = VIEW.read_text()
    assert 'from "./TableRouteModal"' in view
    assert "<TableRouteModal" in view
    assert 'from "./CreateTableRouteModal"' not in view
    assert "<CreateTableRouteModal" not in view


def test_modals_use_shared_mode_helpers():
    static_modal = (COMP / "StaticRouteModal.tsx").read_text()
    assert 'from "@/lib/modal-mode"' in static_modal
    assert "lockedIdentity(existing, (r) => r.destination, draft.destination)" in static_modal
    assert "modalWriteKind(existing ? { name: existing.destination } : null)" in static_modal

    table_modal = (COMP / "TableRouteModal.tsx").read_text()
    assert 'from "@/lib/modal-mode"' in table_modal
    assert "lockedIdentity(existing, (r) => r.destination, draft.destination)" in table_modal
    assert "modalWriteKind(existing ? { name: existing.destination } : null)" in table_modal

    arp_modal = (COMP / "ArpEntryModal.tsx").read_text()
    assert 'from "@/lib/modal-mode"' in arp_modal
    assert "lockedIdentity(existing, (e) => e.interface, draft.interfaceName)" in arp_modal
    assert "lockedIdentity(existing, (e) => e.entry.ip_address, draft.ipAddress)" in arp_modal
    assert "modalWriteKind(existing ? { name: existing.entry.ip_address } : null)" in arp_modal

    table_id_modal = (COMP / "RoutingTableModal.tsx").read_text()
    assert 'from "@/lib/modal-mode"' in table_id_modal
    assert "lockedIdentity(existing, (t) => t.table_id.toString(), draft.tableId)" in table_id_modal
    assert "modalWriteKind(existing ? { name: existing.table_id.toString() } : null)" in table_id_modal


def test_form_logic_lives_in_a_tested_module():
    """The draft, validators and submit builders have their own tests.

    Run them with: npx tsx --test src/components/routing/static-routes-form.test.ts
    (node --test cannot resolve the extensionless .ts import).
    """
    assert (COMP / "static-routes-form.ts").exists()
    assert (COMP / "static-routes-form.test.ts").exists()
    for modal in (
        "StaticRouteModal.tsx",
        "TableRouteModal.tsx",
        "ArpEntryModal.tsx",
        "RoutingTableModal.tsx",
    ):
        assert 'from "./static-routes-form"' in (COMP / modal).read_text()


def test_config_ui_shows_no_version_numbers():
    for modal in (
        "StaticRouteModal.tsx",
        "TableRouteModal.tsx",
        "ArpEntryModal.tsx",
        "RoutingTableModal.tsx",
    ):
        src = (COMP / modal).read_text()
        for banned in ("VyOS 1.5", "VyOS 1.4", "1.5+ only", "1.4 only"):
            assert banned not in src
