"""Event Handler Service Command Mapper."""
from typing import List
from ..base import BaseFeatureMapper

BASE = ["service", "event-handler", "event"]


class EventHandlerMapper(BaseFeatureMapper):
    def __init__(self, version: str):
        super().__init__(version)

    # ========================================================================
    # Global delete
    # ========================================================================

    def get_events_delete(self) -> List[str]:
        return BASE

    def get_event_delete(self, name: str) -> List[str]:
        return BASE + [name]

    # ========================================================================
    # Filter settings
    # ========================================================================

    def get_event_filter_pattern(self, name: str, pattern: str) -> List[str]:
        return BASE + [name, "filter", "pattern", pattern]

    def get_event_filter_pattern_delete(self, name: str) -> List[str]:
        return BASE + [name, "filter", "pattern"]

    def get_event_filter_syslog_identifier(self, name: str, identifier: str) -> List[str]:
        return BASE + [name, "filter", "syslog-identifier", identifier]

    def get_event_filter_syslog_identifier_delete(self, name: str) -> List[str]:
        return BASE + [name, "filter", "syslog-identifier"]

    # ========================================================================
    # Script settings
    # ========================================================================

    def get_event_script_path(self, name: str, path: str) -> List[str]:
        return BASE + [name, "script", "path", path]

    def get_event_script_path_delete(self, name: str) -> List[str]:
        return BASE + [name, "script", "path"]

    def get_event_script_arguments(self, name: str, arguments: str) -> List[str]:
        return BASE + [name, "script", "arguments", arguments]

    def get_event_script_arguments_delete(self, name: str) -> List[str]:
        return BASE + [name, "script", "arguments"]

    # ========================================================================
    # Script environment variables (tagged sub-node)
    # ========================================================================

    def get_event_script_environment_value(self, name: str, env_name: str, value: str) -> List[str]:
        return BASE + [name, "script", "environment", env_name, "value", value]

    def get_event_script_environment_delete(self, name: str, env_name: str) -> List[str]:
        return BASE + [name, "script", "environment", env_name]

    def get_event_script_environments_delete(self, name: str) -> List[str]:
        return BASE + [name, "script", "environment"]
