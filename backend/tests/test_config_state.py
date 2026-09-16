from config_state import (
    accept_external_changes,
    get_saved_config,
    has_external_changes,
    set_managed_config,
    set_saved_config,
)


def test_accept_external_changes_preserves_managed_pending_changes():
    set_saved_config("instance", {"managed": 1, "external": 1})
    set_managed_config("instance", {"managed": 2, "external": 1})

    assert has_external_changes("instance", {"managed": 2, "external": 3})

    accept_external_changes("instance", {"managed": 2, "external": 3})

    assert get_saved_config("instance") == {"managed": 1, "external": 3}
    assert not has_external_changes("instance", {"managed": 2, "external": 3})
