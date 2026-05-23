"""VyOS 1.4 HTTPS mapper overrides.

Differences from 1.5:
  - api/debug    (not api/rest/debug)
  - api/strict   (not api/rest/strict)
  - api/cors/... (not api/graphql/cors/...)
  - No api/rest container node
"""
from typing import List

BASE = ["service", "https"]


class HTTPSMapperV1_4:
    def get_api_debug(self) -> List[str]:
        return BASE + ["api", "debug"]

    def get_api_strict(self) -> List[str]:
        return BASE + ["api", "strict"]

    def get_api_rest(self) -> List[str]:
        return []

    def get_api_cors_allow_origin(self, origin: str) -> List[str]:
        return BASE + ["api", "cors", "allow-origin", origin]

    def get_api_cors_allow_origin_delete(self, origin: str) -> List[str]:
        return BASE + ["api", "cors", "allow-origin", origin]

    def get_api_cors_allow_origins_delete(self) -> List[str]:
        return BASE + ["api", "cors", "allow-origin"]
