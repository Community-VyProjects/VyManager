"""Prepend a path prefix to every command path a feature mapper returns.

VRF configuration is the global feature tree with ``vrf name <vrf>`` in
front. The prefix lives here, not in a second builder method per leaf.
"""

from __future__ import annotations

from typing import Any, List

_VRF_15_ONLY = frozenset({"dhcp", "dhcpv6", "failover"})


def require_feature_version(proto: str, version: str) -> None:
    """Raise when a 1.5-only VRF feature is asked to emit on 1.4."""
    if proto not in _VRF_15_ONLY:
        return
    if "1.4" in version and "1.5" not in version:
        raise ValueError(f"{proto} is not supported on this device")


class PathPrefixMapper:
    """Wrap a feature mapper and prepend ``prefix`` to each path it returns."""

    def __init__(self, inner: Any, prefix: List[str]) -> None:
        self._inner = inner
        self._prefix = list(prefix)

    def __getattr__(self, name: str) -> Any:
        attr = getattr(self._inner, name)
        if not callable(attr):
            return attr

        def wrapped(*args: Any, **kwargs: Any) -> Any:
            result = attr(*args, **kwargs)
            if (
                isinstance(result, list)
                and result
                and all(isinstance(part, str) for part in result)
            ):
                return self._prefix + list(result)
            return result

        return wrapped
