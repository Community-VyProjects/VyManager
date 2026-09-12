"""Golden (method, args, expected_path) cases for EventHandlerBatchBuilder.

Paths checked with validateTmplPath on 1.4 (100.64.64.50) and 1.5 (100.64.64.5).
Every valueless set_* leaf has a matching delete_*.
"""

import pytest

from vyos_builders.event_handler.event_handler_batch_builder import (
    EventHandlerBatchBuilder,
)

NAME = "wan-down"
BASE = ["service", "event-handler", "event"]
EVENT = BASE + [NAME]
FILTER = EVENT + ["filter"]
SCRIPT = EVENT + ["script"]

CASES = [
    ("delete_event", (NAME,), "delete", EVENT),
    ("delete_events", (), "delete", BASE),
    ("set_event_filter_pattern", (NAME, "kernel.*error"), "set", FILTER + ["pattern", "kernel.*error"]),
    ("delete_event_filter_pattern", (NAME,), "delete", FILTER + ["pattern"]),
    ("set_event_filter_syslog_identifier", (NAME, "sshd"), "set", FILTER + ["syslog-identifier", "sshd"]),
    ("delete_event_filter_syslog_identifier", (NAME,), "delete", FILTER + ["syslog-identifier"]),
    ("set_event_script_path", (NAME, "/config/scripts/handler.sh"), "set", SCRIPT + ["path", "/config/scripts/handler.sh"]),
    ("delete_event_script_path", (NAME,), "delete", SCRIPT + ["path"]),
    ("set_event_script_arguments", (NAME, "notify"), "set", SCRIPT + ["arguments", "notify"]),
    ("delete_event_script_arguments", (NAME,), "delete", SCRIPT + ["arguments"]),
    ("set_event_script_environment_value", (NAME, "FOO", "bar"), "set", SCRIPT + ["environment", "FOO", "value", "bar"]),
    ("delete_event_script_environment", (NAME, "FOO"), "delete", SCRIPT + ["environment", "FOO"]),
    ("delete_event_script_environments", (NAME,), "delete", SCRIPT + ["environment"]),
]


@pytest.mark.parametrize("method, args, op, expected_path", CASES)
@pytest.mark.parametrize("version", ["1.4", "1.5"])
def test_event_handler_builder_paths(method, args, op, expected_path, version):
    builder = EventHandlerBatchBuilder(version=version)
    getattr(builder, method)(*args)
    operations = builder.get_operations()
    assert [(item["op"], item["path"]) for item in operations] == [(op, expected_path)]
