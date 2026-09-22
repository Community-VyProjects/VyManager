"""User create and edit share one modal.

CreateUserModal and EditUserModal were the same form twice.
They are now UserModal with existing?: UserListItem | null.
"""

from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
COMP = REPO / "frontend/src/components/user-management"
TAB = COMP / "UsersTab.tsx"


def test_cloned_create_edit_files_are_gone():
    assert not (COMP / "CreateUserModal.tsx").exists()
    assert not (COMP / "EditUserModal.tsx").exists()


def test_users_tab_uses_unified_modal():
    page = TAB.read_text()
    assert 'from "./UserModal"' in page
    assert "<UserModal" in page
    assert 'from "./CreateUserModal"' not in page
    assert "<CreateUserModal" not in page
    assert 'from "./EditUserModal"' not in page
    assert "<EditUserModal" not in page


def test_modal_uses_shared_mode_helpers():
    modal = (COMP / "UserModal.tsx").read_text()
    assert 'from "@/lib/modal-mode"' in modal
    assert "modalWriteKind(existing ? { name: existing.id } : null)" in modal


def test_form_logic_lives_in_a_tested_module():
    """The draft, validators and submit builders have their own tests.

    Run them with: npx tsx --test src/components/user-management/user-form.test.ts
    (node --test cannot resolve the extensionless .ts import).
    """
    assert (COMP / "user-form.ts").exists()
    assert (COMP / "user-form.test.ts").exists()
    assert 'from "./user-form"' in (COMP / "UserModal.tsx").read_text()


def test_config_ui_shows_no_version_only_labels():
    src = (COMP / "UserModal.tsx").read_text()
    for banned in ("VyOS 1.5", "VyOS 1.4", "1.5+ only", "1.4 only", "Not supported on VyOS"):
        assert banned not in src
