"""Baseline reconciliation for external config changes (#855).

The unsaved-changes banner must show only edits VyManager itself made. Changes
made by another session (SSH, CLI, another tool) get absorbed into the saved
baseline instead of prompting the user to save or discard someone else's work.

Most cases are checked three ways, because a baseline that looks plausible can
still break the banner:

- the merged baseline itself
- ``deep_diff(current, baseline)``, which is what the banner renders
- ``_build_discard_operations`` on that diff, which is what Discard executes

and every baseline must stay JSON serializable, since ``/vyos/config/diff``
serializes values taken straight out of it.
"""

import json

import pytest

from config_state import (
    clear_managed_config,
    get_managed_config,
    get_saved_config,
    reconcile_baseline,
    set_managed_config,
    set_saved_config,
)
from routers.config.config import _build_discard_operations, deep_diff


@pytest.fixture
def instance():
    """A snapshot key isolated from other tests in this module."""
    instance_id = "test-instance"
    yield instance_id
    set_saved_config(instance_id, {})
    clear_managed_config(instance_id)


def reconcile(instance_id, saved, managed, current):
    """Seed both snapshots, reconcile, and return (baseline, diff, discard ops)."""
    set_saved_config(instance_id, saved)
    set_managed_config(instance_id, managed)
    baseline = reconcile_baseline(instance_id, current)
    assert baseline is not None
    added, removed, modified = deep_diff(current, baseline)
    return baseline, (added, removed, modified), _build_discard_operations(added, removed, modified)


# ---------------------------------------------------------------------------
# External-only changes: absorbed silently, no banner
# ---------------------------------------------------------------------------

def test_external_edit_with_no_vymanager_edits_is_absorbed(instance):
    baseline, diff, ops = reconcile(
        instance,
        saved={"system": {"host-name": "a"}},
        managed={"system": {"host-name": "a"}},
        current={"system": {"host-name": "cli"}},
    )

    assert baseline == {"system": {"host-name": "cli"}}
    assert diff == ({}, {}, {})
    assert ops == []


def test_external_delete_of_untouched_key_is_absorbed(instance):
    baseline, diff, ops = reconcile(
        instance,
        saved={"service": {"ssh": {"port": "22"}}, "x": 1},
        managed={"service": {"ssh": {"port": "22"}}, "x": 1},
        current={"x": 1},
    )

    assert baseline == {"x": 1}
    assert diff == ({}, {}, {})
    assert ops == []


def test_external_add_of_untouched_key_is_absorbed(instance):
    baseline, diff, ops = reconcile(
        instance,
        saved={"x": 1},
        managed={"x": 1},
        current={"x": 1, "firewall": {"group": {"g1": {"address": "10.0.0.1"}}}},
    )

    assert baseline == {"x": 1, "firewall": {"group": {"g1": {"address": "10.0.0.1"}}}}
    assert diff == ({}, {}, {})
    assert ops == []


# ---------------------------------------------------------------------------
# VyManager-owned changes: preserved in the banner, reversible by Discard
# ---------------------------------------------------------------------------

def test_vymanager_edit_survives_a_sibling_external_edit(instance):
    baseline, (added, removed, modified), ops = reconcile(
        instance,
        saved={"managed": 1, "external": 1},
        managed={"managed": 2, "external": 1},
        current={"managed": 2, "external": 3},
    )

    assert baseline == {"managed": 1, "external": 3}
    assert (added, removed) == ({}, {})
    assert modified == {"managed": {"old": 1, "new": 2}}
    assert ops == [{"op": "set", "path": ["managed", "1"]}]


def test_vymanager_added_leaf_still_live_is_reported_as_added(instance):
    """Regression: the baseline must not invent ``{}`` for a VyManager-owned add.

    A ``{}`` placeholder turned the entry into a bogus ``modified`` whose
    discard expanded to zero operations, so the banner could never be cleared.
    """
    baseline, (added, removed, modified), ops = reconcile(
        instance,
        saved={"service": {"ssh": {}}, "system": {"host-name": "a"}},
        managed={"service": {"ssh": {"port": "2222"}}, "system": {"host-name": "a"}},
        current={"service": {"ssh": {"port": "2222"}}, "system": {"host-name": "cli"}},
    )

    assert baseline == {"service": {"ssh": {}}, "system": {"host-name": "cli"}}
    assert added == {"service.ssh.port": "2222"}
    assert (removed, modified) == ({}, {})
    assert ops == [{"op": "delete", "path": ["service", "ssh", "port"]}]


def test_vymanager_added_subtree_still_live_is_reported_as_added(instance):
    baseline, (added, removed, modified), ops = reconcile(
        instance,
        saved={"x": 1},
        managed={"x": 1, "firewall": {"group": {"g1": {"address": "10.0.0.1"}}}},
        current={"x": 9, "firewall": {"group": {"g1": {"address": "10.0.0.1"}}}},
    )

    assert baseline == {"x": 9}
    assert added == {"firewall": {"group": {"g1": {"address": "10.0.0.1"}}}}
    assert (removed, modified) == ({}, {})
    assert ops == [{"op": "delete", "path": ["firewall"]}]


def test_vymanager_delete_is_reported_as_removed(instance):
    baseline, (added, removed, modified), ops = reconcile(
        instance,
        saved={"service": {"ssh": {"port": "22"}}, "x": 1},
        managed={"x": 1},
        current={"x": 9},
    )

    assert baseline == {"x": 9, "service": {"ssh": {"port": "22"}}}
    assert removed == {"service": {"ssh": {"port": "22"}}}
    assert (added, modified) == ({}, {})
    assert ops == [{"op": "set", "path": ["service", "ssh", "port", "22"]}]


def test_vymanager_edit_to_a_list_valued_node_is_preserved(instance):
    baseline, (added, removed, modified), ops = reconcile(
        instance,
        saved={"group": {"address": ["10.0.0.1", "10.0.0.2"]}, "x": 1},
        managed={"group": {"address": ["10.0.0.1", "10.0.0.2", "10.0.0.3"]}, "x": 1},
        current={"group": {"address": ["10.0.0.1", "10.0.0.2", "10.0.0.3"]}, "x": 9},
    )

    assert baseline == {"group": {"address": ["10.0.0.1", "10.0.0.2"]}, "x": 9}
    assert (added, removed) == ({}, {})
    assert modified == {
        "group.address": {
            "old": ["10.0.0.1", "10.0.0.2"],
            "new": ["10.0.0.1", "10.0.0.2", "10.0.0.3"],
        }
    }
    assert ops == [{"op": "delete", "path": ["group", "address", "10.0.0.3"]}]


def test_external_edit_to_a_list_valued_node_vymanager_also_touched(instance):
    baseline, _, _ = reconcile(
        instance,
        saved={"dns": ["1.1.1.1"]},
        managed={"dns": ["1.1.1.1", "8.8.8.8"]},
        current={"dns": ["1.1.1.1", "9.9.9.9"]},
    )

    assert baseline == {"dns": ["1.1.1.1"]}


# ---------------------------------------------------------------------------
# Conflicts and sentinel leakage
# ---------------------------------------------------------------------------

def test_same_leaf_conflict_keeps_the_saved_value_so_the_change_stays_visible(instance):
    """VyManager and an external session both changed the same leaf.

    Policy: the baseline stays at the on-disk value. Live config still differs
    from disk, so the banner reports it and Discard restores disk. Following
    live config instead would hide a real unsaved deviation and lose it at the
    next reboot.
    """
    baseline, (added, removed, modified), ops = reconcile(
        instance,
        saved={"system": {"host-name": "disk"}},
        managed={"system": {"host-name": "vym"}},
        current={"system": {"host-name": "cli"}},
    )

    assert baseline == {"system": {"host-name": "disk"}}
    assert (added, removed) == ({}, {})
    assert modified == {"system.host-name": {"old": "disk", "new": "cli"}}
    assert ops == [{"op": "set", "path": ["system", "host-name", "disk"]}]


def test_vymanager_add_deleted_externally_leaves_no_sentinel_in_the_baseline(instance):
    """Regression: the absent-key sentinel must never be stored.

    Storing it made ``/vyos/config/diff`` raise ``TypeError: Object of type
    object is not JSON serializable`` for the rest of the process lifetime.
    """
    baseline, diff, ops = reconcile(
        instance,
        saved={"system": {"host-name": "a"}},
        managed={
            "system": {"host-name": "a"},
            "firewall": {"group": {"g1": {"address": "10.0.0.1"}}},
        },
        current={"system": {"host-name": "cli"}},
    )

    assert baseline == {"system": {"host-name": "cli"}}
    assert diff == ({}, {}, {})
    assert ops == []
    json.dumps(baseline)


@pytest.mark.parametrize(
    "saved,managed,current",
    [
        ({"a": 1}, {"a": 1, "b": {"c": 2}}, {"a": 9}),
        ({"a": 1}, {"a": 2}, {"a": 3}),
        ({"a": {"b": 1}}, {"a": {"b": 2, "c": 3}}, {"a": {"b": 2, "d": 4}}),
        ({"a": {"b": 1}}, {}, {"z": 1}),
        ({}, {"a": {"b": 1}}, {"a": {"b": 1}}),
        ({"interfaces": {}}, {"interfaces": {"eth0": {"description": "managed"}}}, {"interfaces": {}}),
    ],
)
def test_baseline_is_always_json_serializable(instance, saved, managed, current):
    set_saved_config(instance, saved)
    set_managed_config(instance, managed)

    json.dumps(reconcile_baseline(instance, current))


# ---------------------------------------------------------------------------
# Missing or absent snapshots
# ---------------------------------------------------------------------------

def test_reconcile_returns_none_when_the_instance_has_no_baseline():
    assert reconcile_baseline("never-seen-instance", {"a": 1}) is None


def test_a_dropped_managed_snapshot_does_not_accept_a_vymanager_edit_as_external(instance):
    """A write succeeded but reading it back failed, so the managed snapshot is gone.

    The pending edit must stay in the banner. Folding it into the baseline here
    would hide it, which is the exact failure #855 is about, in reverse.
    """
    set_saved_config(instance, {"system": {"host-name": "disk"}})
    clear_managed_config(instance)

    current = {"system": {"host-name": "vym"}}
    baseline = reconcile_baseline(instance, current)

    assert baseline == {"system": {"host-name": "disk"}}
    assert baseline is not None
    added, removed, modified = deep_diff(current, baseline)
    assert (added, removed) == ({}, {})
    assert modified == {"system.host-name": {"old": "disk", "new": "vym"}}
    assert get_managed_config(instance) is None


def test_reconcile_is_a_no_op_when_live_config_matches_the_managed_snapshot(instance):
    set_saved_config(instance, {"a": 1})
    set_managed_config(instance, {"a": 2})

    assert reconcile_baseline(instance, {"a": 2}) == {"a": 1}
    assert get_saved_config(instance) == {"a": 1}


def test_discard_reverts_only_the_vymanager_edit_not_the_external_one(instance):
    """Regression for the discard path specifically.

    Discard must reconcile before diffing. Diffing the raw baseline, which has
    not absorbed the external change yet, makes Discard silently revert an edit
    made by SSH or the CLI since the last poll.
    """
    _, (added, removed, modified), ops = reconcile(
        instance,
        saved={"system": {"host-name": "disk"}, "service": {"ssh": {"port": "22"}}},
        managed={"system": {"host-name": "vym"}, "service": {"ssh": {"port": "22"}}},
        current={"system": {"host-name": "vym"}, "service": {"ssh": {"port": "2222"}}},
    )

    assert (added, removed) == ({}, {})
    assert modified == {"system.host-name": {"old": "disk", "new": "vym"}}
    assert ops == [{"op": "set", "path": ["system", "host-name", "disk"]}]
    assert not any(op["path"][:2] == ["service", "ssh"] for op in ops)


# ---------------------------------------------------------------------------
# Post-write read-back failure
# ---------------------------------------------------------------------------

def test_failed_read_back_after_a_write_drops_the_managed_snapshot(instance):
    """A write succeeded but reading the new config back failed.

    Keeping the pre-write managed snapshot would make the next reconcile see
    live config differing from it, classify the VyManager edit as external,
    and fold it into the baseline, so the unsaved-changes banner would never
    show the edit. Dropping the snapshot leaves the baseline alone instead.
    """
    from vyos_service import VyOSService

    set_saved_config(instance, {"system": {"host-name": "disk"}})
    set_managed_config(instance, {"system": {"host-name": "disk"}})

    service = object.__new__(VyOSService)

    def failing_get_full_config(refresh=False):
        raise ValueError("Failed to retrieve full config: connection refused")

    service.get_full_config = failing_get_full_config
    service._record_managed_config(instance)

    assert get_managed_config(instance) is None

    # The VyManager edit that did land must still reach the banner.
    current = {"system": {"host-name": "vym"}}
    baseline = reconcile_baseline(instance, current)
    assert baseline == {"system": {"host-name": "disk"}}
    assert baseline is not None
    added, removed, modified = deep_diff(current, baseline)
    assert (added, removed) == ({}, {})
    assert modified == {"system.host-name": {"old": "disk", "new": "vym"}}


def test_successful_read_back_after_a_write_records_the_managed_snapshot(instance):
    from vyos_service import VyOSService

    set_saved_config(instance, {"system": {"host-name": "disk"}})
    service = object.__new__(VyOSService)
    service.get_full_config = lambda refresh=False: {"system": {"host-name": "vym"}}

    service._record_managed_config(instance)

    assert get_managed_config(instance) == {"system": {"host-name": "vym"}}


# ---------------------------------------------------------------------------
# Snapshot isolation
# ---------------------------------------------------------------------------

def test_snapshots_do_not_alias_the_caller_dict(instance):
    config = {"system": {"host-name": "a"}}
    set_saved_config(instance, config)

    config["system"]["host-name"] = "mutated"

    assert get_saved_config(instance) == {"system": {"host-name": "a"}}
    assert get_managed_config(instance) == {"system": {"host-name": "a"}}


def test_saved_and_managed_snapshots_are_independent_copies(instance):
    set_saved_config(instance, {"system": {"host-name": "a"}})

    saved = get_saved_config(instance)
    assert saved is not None
    saved["system"]["host-name"] = "mutated"

    assert get_managed_config(instance) == {"system": {"host-name": "a"}}
