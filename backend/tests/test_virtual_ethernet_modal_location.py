"""Virtual-ethernet modals live with the other interface types."""

from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
COMP = REPO / "frontend/src/components/interfaces"
PAGE = REPO / "frontend/src/app/network/interfaces/page.tsx"
OLD = REPO / "frontend/src/components/virtual-ethernet"


def test_virtual_ethernet_modals_live_under_interfaces():
    assert not OLD.exists()
    assert (COMP / "CreateVirtualEthernetModal.tsx").exists()
    assert (COMP / "EditVirtualEthernetModal.tsx").exists()
    assert (COMP / "DeleteVirtualEthernetModal.tsx").exists()


def test_interfaces_page_imports_virtual_ethernet_from_interfaces():
    page = PAGE.read_text()
    assert 'from "@/components/interfaces/CreateVirtualEthernetModal"' in page
    assert 'from "@/components/interfaces/EditVirtualEthernetModal"' in page
    assert 'from "@/components/interfaces/DeleteVirtualEthernetModal"' in page
    assert 'from "@/components/virtual-ethernet/' not in page
