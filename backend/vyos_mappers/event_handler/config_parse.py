"""Read-model for event handler config.

Mappers own VyOS tree shape. Routers call parse_config and do not rebuild
the tree.
"""

from typing import Any, Dict, List


def _empty_filter() -> Dict[str, Any]:
    return {"pattern": None, "syslog_identifier": None}


def _empty_script() -> Dict[str, Any]:
    return {"path": None, "arguments": None, "environment": []}


def _parse_filter(raw: Any) -> Dict[str, Any]:
    if not raw or not isinstance(raw, dict):
        return _empty_filter()
    return {
        "pattern": raw.get("pattern"),
        "syslog_identifier": raw.get("syslog-identifier"),
    }


def _parse_environment(raw: Any) -> List[Dict[str, Any]]:
    if not raw or not isinstance(raw, dict):
        return []
    result = []
    for env_name, attrs in sorted(raw.items()):
        value = None
        if isinstance(attrs, dict):
            value = attrs.get("value")
        result.append({"name": env_name, "value": value})
    return result


def _parse_script(raw: Any) -> Dict[str, Any]:
    if not raw or not isinstance(raw, dict):
        return _empty_script()
    return {
        "path": raw.get("path"),
        "arguments": raw.get("arguments"),
        "environment": _parse_environment(raw.get("environment", {})),
    }


def _parse_events(raw: dict) -> List[Dict[str, Any]]:
    result = []
    for name, attrs in sorted(raw.items()):
        if not isinstance(attrs, dict):
            attrs = {}
        result.append(
            {
                "name": name,
                "filter": _parse_filter(attrs.get("filter", {})),
                "script": _parse_script(attrs.get("script", {})),
            }
        )
    return result


def parse_config(_mapper, full_config: Dict[str, Any]) -> Dict[str, Any]:
    """Normalise full VyOS config into the GET /vyos/event-handler/config payload."""
    raw = full_config.get("service", {}).get("event-handler", {}).get("event", {})
    if not raw or not isinstance(raw, dict):
        return {"events": []}
    return {"events": _parse_events(raw)}
