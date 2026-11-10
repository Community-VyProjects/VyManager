"""Pseudo-ethernet modals live with the other interface types."""

from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
COMP = REPO / "frontend/src/components/interfaces"
PAGE = REPO / "frontend/src/app/network/interfaces/page.tsx"
OLD = REPO / "frontend/src/components/pseudo-ethernet"


def test_pseudo_ethernet_modals_live_under_interfaces():
    assert not OLD.exists()
    assert (COMP / "CreatePseudoEthernetModal.tsx").exists()
    assert (COMP / "EditPseudoEthernetModal.tsx").exists()
    assert (COMP / "DeletePseudoEthernetModal.tsx").exists()


def test_interfaces_page_imports_pseudo_ethernet_from_interfaces():
    page = PAGE.read_text()
    assert 'from "@/components/interfaces/CreatePseudoEthernetModal"' in page
    assert 'from "@/components/interfaces/EditPseudoEthernetModal"' in page
    assert 'from "@/components/interfaces/DeletePseudoEthernetModal"' in page
    assert 'from "@/components/pseudo-ethernet/' not in page
