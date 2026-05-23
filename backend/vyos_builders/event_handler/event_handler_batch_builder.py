"""Event Handler Service Batch Builder.

Generates VyOS set/delete operations for the event handler service.

Configuration lives under: service event-handler event <name>

Key sections:
  - filter: pattern (regex match) and syslog-identifier (process name filter)
  - script: path, arguments, and per-variable environment settings

Version differences:
  - Schema is identical on VyOS 1.4 and 1.5
"""

from typing import List, Dict, Any
from vyos_mappers import CommandMapperRegistry


class EventHandlerBatchBuilder:
    def __init__(self, version: str):
        self.version = version
        self._operations: List[Dict[str, Any]] = []
        self.mappers = CommandMapperRegistry.get_all_mappers(version)
        self.m = self.mappers["event_handler"]

    # -----------------------------------------------------------------------
    # Core helpers
    # -----------------------------------------------------------------------

    def add_set(self, path: List[str]) -> "EventHandlerBatchBuilder":
        if path:
            self._operations.append({"op": "set", "path": path})
        return self

    def add_delete(self, path: List[str]) -> "EventHandlerBatchBuilder":
        if path:
            self._operations.append({"op": "delete", "path": path})
        return self

    def get_operations(self) -> List[Dict[str, Any]]:
        return self._operations.copy()

    def is_empty(self) -> bool:
        return len(self._operations) == 0

    # -----------------------------------------------------------------------
    # Capabilities
    # -----------------------------------------------------------------------

    def get_capabilities(self) -> Dict[str, Any]:
        is_1_4 = "1.4" in self.version
        is_1_5 = not is_1_4

        return {
            "version": self.version,
            "features": {
                "filter_pattern": {
                    "supported": True,
                    "description": "Regex pattern to match log lines that trigger the event",
                },
                "filter_syslog_identifier": {
                    "supported": True,
                    "description": "Syslog process identifier to filter events by source",
                },
                "script_path": {
                    "supported": True,
                    "description": "Absolute path to the script to execute on match",
                },
                "script_arguments": {
                    "supported": True,
                    "description": "Command-line arguments passed to the script",
                },
                "script_environment": {
                    "supported": True,
                    "description": "Environment variables injected into the script process",
                },
            },
            "version_info": {
                "is_1_4": is_1_4,
                "is_1_5": is_1_5,
            },
        }

    # -----------------------------------------------------------------------
    # Event-level delete
    # -----------------------------------------------------------------------

    def delete_event(self, name: str) -> "EventHandlerBatchBuilder":
        return self.add_delete(self.m.get_event_delete(name))

    def delete_events(self) -> "EventHandlerBatchBuilder":
        return self.add_delete(self.m.get_events_delete())

    # -----------------------------------------------------------------------
    # Filter settings
    # -----------------------------------------------------------------------

    def set_event_filter_pattern(self, name: str, pattern: str) -> "EventHandlerBatchBuilder":
        return self.add_set(self.m.get_event_filter_pattern(name, pattern))

    def delete_event_filter_pattern(self, name: str) -> "EventHandlerBatchBuilder":
        return self.add_delete(self.m.get_event_filter_pattern_delete(name))

    def set_event_filter_syslog_identifier(self, name: str, identifier: str) -> "EventHandlerBatchBuilder":
        return self.add_set(self.m.get_event_filter_syslog_identifier(name, identifier))

    def delete_event_filter_syslog_identifier(self, name: str) -> "EventHandlerBatchBuilder":
        return self.add_delete(self.m.get_event_filter_syslog_identifier_delete(name))

    # -----------------------------------------------------------------------
    # Script settings
    # -----------------------------------------------------------------------

    def set_event_script_path(self, name: str, path: str) -> "EventHandlerBatchBuilder":
        return self.add_set(self.m.get_event_script_path(name, path))

    def delete_event_script_path(self, name: str) -> "EventHandlerBatchBuilder":
        return self.add_delete(self.m.get_event_script_path_delete(name))

    def set_event_script_arguments(self, name: str, arguments: str) -> "EventHandlerBatchBuilder":
        return self.add_set(self.m.get_event_script_arguments(name, arguments))

    def delete_event_script_arguments(self, name: str) -> "EventHandlerBatchBuilder":
        return self.add_delete(self.m.get_event_script_arguments_delete(name))

    # -----------------------------------------------------------------------
    # Script environment variables
    # -----------------------------------------------------------------------

    def set_event_script_environment_value(self, name: str, env_name: str, value: str) -> "EventHandlerBatchBuilder":
        return self.add_set(self.m.get_event_script_environment_value(name, env_name, value))

    def delete_event_script_environment(self, name: str, env_name: str) -> "EventHandlerBatchBuilder":
        return self.add_delete(self.m.get_event_script_environment_delete(name, env_name))

    def delete_event_script_environments(self, name: str) -> "EventHandlerBatchBuilder":
        return self.add_delete(self.m.get_event_script_environments_delete(name))
