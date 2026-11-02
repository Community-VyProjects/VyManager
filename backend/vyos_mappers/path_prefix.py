"""Prepend a path prefix to every command path a feature mapper returns.

VRF configuration is the global feature tree with ``vrf name <vrf>`` in
front. The prefix lives here, not in a second builder method per leaf.
"""

from __future__ import annotations

from typing import Any, Callable, List


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
