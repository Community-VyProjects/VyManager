"""VyOS 1.5 specific commands for local route policy."""

from ..local_route import LocalRouteMapper


class LocalRouteMapperV1_5(LocalRouteMapper):
    """Version-specific mapper for VyOS 1.5.

    Uses the base mapper's full set of versioned rule ``set`` actions.
    """

    pass
