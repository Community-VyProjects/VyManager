"""`monitor conntrack` is not an op node on VyOS 1.4 or 1.5.

The monitoring picker must not offer it. Both lab trees have
`monitor log conntrack-sync` and `show conntrack`, which are different
commands. 1.5 `show log conntrack` is a one-shot journal read, not a
stream, and 1.4 has no conntrack event op.
"""

import pytest

from monitoring_commands import build_command, get_available_commands


def test_monitor_conntrack_is_not_offered():
    names = [cmd["name"] for cmd in get_available_commands()]
    assert "monitor_conntrack" not in names


def test_monitor_conntrack_is_rejected():
    with pytest.raises(ValueError, match="Unknown command"):
        build_command("monitor_conntrack", {})
