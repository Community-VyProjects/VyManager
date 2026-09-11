"""Shared set/delete operation list for feature batch builders."""

from typing import Any, Dict, List, Self


class BatchBuilder:
    """Accumulate VyOS set/delete ops. Subclasses own mapper construction."""

    def __init__(self, version: str) -> None:
        self.version = version
        self._operations: List[Dict[str, Any]] = []

    def add_set(self, path: List[str]) -> Self:
        if path:
            self._operations.append({"op": "set", "path": path})
        return self

    def add_delete(self, path: List[str]) -> Self:
        if path:
            self._operations.append({"op": "delete", "path": path})
        return self

    def get_operations(self) -> List[Dict[str, Any]]:
        return self._operations.copy()

    def is_empty(self) -> bool:
        return len(self._operations) == 0
