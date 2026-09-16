import json

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


def test_accept_external_changes_handles_manager_added_leaf():
    set_saved_config("added-leaf", {"interfaces": {}})
    set_managed_config("added-leaf", {"interfaces": {"eth0": {"mtu": 2222}}})

    accept_external_changes("added-leaf", {"interfaces": {"eth0": {"mtu": 2222}}})

    assert get_saved_config("added-leaf") == {"interfaces": {}}


def test_accept_external_changes_handles_manager_added_subtree_missing_live():
    set_saved_config("missing-subtree", {"system": {}})
    set_managed_config("missing-subtree", {"system": {"host-name": "router"}})

    accept_external_changes("missing-subtree", {"system": {}})

    assert get_saved_config("missing-subtree") == {"system": {}}


def test_accept_external_changes_preserves_conflicting_manager_leaf():
    set_saved_config("conflict", {"service": {"ssh": {"port": 22}}})
    set_managed_config("conflict", {"service": {"ssh": {"port": 2222}}})

    accept_external_changes("conflict", {"service": {"ssh": {"port": 2200}}})

    assert get_saved_config("conflict") == {"service": {"ssh": {"port": 22}}}


def test_accept_external_changes_accepts_external_lists():
    set_saved_config("list", {"dns": ["1.1.1.1"]})
    set_managed_config("list", {"dns": ["1.1.1.1", "8.8.8.8"]})

    accept_external_changes("list", {"dns": ["1.1.1.1", "9.9.9.9"]})

    assert get_saved_config("list") == {"dns": ["1.1.1.1"]}


def test_snapshots_remain_json_serializable_after_reconcile():
    set_saved_config("json", {"interfaces": {}})
    set_managed_config("json", {"interfaces": {"eth0": {"description": "managed"}}})

    accept_external_changes("json", {"interfaces": {}})

    json.dumps(get_saved_config("json"))
