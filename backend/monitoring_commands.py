"""
Monitoring Commands Allowlist

Defines whitelisted VyOS commands that can be executed via SSH monitoring.
All commands are validated against strict parameter rules before execution.
No raw user input is ever passed to SSH.
"""

import re
from typing import Dict, List, Optional


# Parameter validation patterns
INTERFACE_PATTERN = re.compile(r"^[a-zA-Z0-9\-\.]+$")  # eth0, bond0.100, wg0
FILTER_PATTERN = re.compile(r"^[a-zA-Z0-9\s\.\:\-\/\(\)and or not host port src dst net proto icmp tcp udp]+$", re.IGNORECASE)
LINES_PATTERN = re.compile(r"^\d{1,5}$")  # 1-99999


class MonitoringCommand:
    """Definition of an allowed monitoring command."""

    def __init__(
        self,
        name: str,
        description: str,
        template: str,
        params: Optional[Dict[str, dict]] = None,
    ):
        self.name = name
        self.description = description
        self.template = template
        self.params = params or {}


# Allowlist of monitoring commands
COMMANDS: Dict[str, MonitoringCommand] = {
    "monitor_traffic": MonitoringCommand(
        name="monitor_traffic",
        description="Monitor traffic on an interface (tcpdump)",
        template="monitor traffic interface {iface}",
        params={
            "iface": {
                "required": True,
                "pattern": INTERFACE_PATTERN,
                "description": "Network interface name (e.g., eth0, bond0)",
            },
            "filter": {
                "required": False,
                "pattern": FILTER_PATTERN,
                "description": "Packet filter expression (e.g., 'host 10.0.0.1')",
            },
        },
    ),
    "monitor_log": MonitoringCommand(
        name="monitor_log",
        description="Monitor system log in real-time",
        template="monitor log",
        params={},
    ),
    "monitor_protocol_bgp": MonitoringCommand(
        name="monitor_protocol_bgp",
        description="Monitor BGP protocol messages",
        template="monitor protocol bgp",
        params={},
    ),
    "monitor_protocol_ospf": MonitoringCommand(
        name="monitor_protocol_ospf",
        description="Monitor OSPF protocol messages",
        template="monitor protocol ospf",
        params={},
    ),
    "show_log_tail": MonitoringCommand(
        name="show_log_tail",
        description="Show recent log entries",
        template="show log tail {lines}",
        params={
            "lines": {
                "required": False,
                "pattern": LINES_PATTERN,
                "description": "Number of lines to show (default: 50)",
                "default": "50",
            },
        },
    ),
    "monitor_conntrack": MonitoringCommand(
        name="monitor_conntrack",
        description="Monitor connection tracking events",
        template="monitor conntrack",
        params={},
    ),
}


def get_available_commands() -> List[dict]:
    """Return list of available commands with their descriptions and parameters."""
    result = []
    for cmd_name, cmd in COMMANDS.items():
        params_info = {}
        for param_name, param_def in cmd.params.items():
            params_info[param_name] = {
                "required": param_def["required"],
                "description": param_def["description"],
                "default": param_def.get("default"),
            }
        result.append({
            "name": cmd_name,
            "description": cmd.description,
            "params": params_info,
        })
    return result


def build_command(name: str, params: Dict[str, str]) -> str:
    """
    Validate parameters and build a command string.

    Args:
        name: Command name from allowlist
        params: Parameter values

    Returns:
        Validated command string ready for SSH execution

    Raises:
        ValueError: If command not found or parameters invalid
    """
    if name not in COMMANDS:
        raise ValueError(f"Unknown command: {name}")

    cmd = COMMANDS[name]
    command_str = cmd.template

    # Validate and substitute parameters
    for param_name, param_def in cmd.params.items():
        value = params.get(param_name)

        if value is None or value == "":
            if param_def["required"]:
                raise ValueError(f"Required parameter missing: {param_name}")
            # Use default or skip optional param
            default = param_def.get("default")
            if default:
                value = default
            else:
                continue

        # Validate against pattern
        pattern = param_def["pattern"]
        if not pattern.match(value):
            raise ValueError(
                f"Invalid value for {param_name}: contains disallowed characters"
            )

        command_str = command_str.replace(f"{{{param_name}}}", value)

    # Handle optional filter for monitor_traffic
    if name == "monitor_traffic":
        filter_val = params.get("filter")
        if filter_val and FILTER_PATTERN.match(filter_val):
            command_str += f' filter "{filter_val}"'

    return command_str
