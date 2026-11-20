"""VyOS 1.5 HTTPS mapper.

1.5 adds the ``api rest`` container, moves debug and strict under it, and
moves CORS under ``api graphql cors``.
"""

from typing import List

from ..https import BASE, HTTPSMapper


class HTTPSMapperV1_5(HTTPSMapper):
    """VyOS 1.5 HTTPS mapper."""

    def cors_scope(self) -> str:
        return "graphql"

    # --- api rest - VyOS 1.5 only ---
    def get_api_rest(self) -> List[str]:
        return BASE + ["api", "rest"]

    def get_api_debug(self) -> List[str]:
        return BASE + ["api", "rest", "debug"]

    def get_api_strict(self) -> List[str]:
        return BASE + ["api", "rest", "strict"]

    # --- CORS under graphql ---
    def get_api_cors_allow_origin(self, origin: str) -> List[str]:
        return BASE + ["api", "graphql", "cors", "allow-origin", origin]

    def get_api_cors_allow_origin_delete(self, origin: str) -> List[str]:
        return BASE + ["api", "graphql", "cors", "allow-origin", origin]

    def get_api_cors_allow_origins_delete(self) -> List[str]:
        return BASE + ["api", "graphql", "cors", "allow-origin"]
