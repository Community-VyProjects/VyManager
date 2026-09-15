"""NAT create and edit share one modal per rule type.

Create and Edit Source/Destination/Static NAT were cloned copies.
Each rule type now has one modal with existing?: T | null.
"""

from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
NET = REPO / "frontend/src/components/network"
PAGE = REPO / "frontend/src/app/network/nat/page.tsx"
INDEX = REPO / "frontend/src/components/network/index.ts"


def test_cloned_create_edit_files_are_gone():
    for name in (
        "CreateSourceNATModal.tsx",
        "EditSourceNATModal.tsx",
        "CreateDestinationNATModal.tsx",
        "EditDestinationNATModal.tsx",
        "CreateStaticNATModal.tsx",
        "EditStaticNATModal.tsx",
    ):
        assert not (NET / name).exists(), name


def test_unified_modals_exist_with_existing_prop():
    source = (NET / "SourceNATModal.tsx").read_text()
    dest = (NET / "DestinationNATModal.tsx").read_text()
    static = (NET / "StaticNATModal.tsx").read_text()
    assert "existing?: SourceNATRule | null" in source
    assert "existing?: DestinationNATRule | null" in dest
    assert "existing?: StaticNATRule | null" in static
    assert "const isEdit = !!existing" in source
    assert "const isEdit = !!existing" in dest
    assert "const isEdit = !!existing" in static
    assert "createSourceRule" in source
    assert "updateSourceRule" in source
    assert "createDestinationRule" in dest
    assert "updateDestinationRule" in dest
    assert "createStaticRule" in static
    assert "updateStaticRule" in static


def test_nat_page_uses_unified_modals():
    page = PAGE.read_text()
    index = INDEX.read_text()
    assert "SourceNATModal" in page
    assert "DestinationNATModal" in page
    assert "StaticNATModal" in page
    assert "CreateSourceNATModal" not in page
    assert "EditSourceNATModal" not in page
    assert "CreateDestinationNATModal" not in page
    assert "EditDestinationNATModal" not in page
    assert "CreateStaticNATModal" not in page
    assert "EditStaticNATModal" not in page
    assert "CreateSourceNATModal" not in index
    assert 'export { SourceNATModal }' in index
    assert 'export { DestinationNATModal }' in index
    assert 'export { StaticNATModal }' in index
