"""VyOS 1.5-specific VRF mapper overrides.

Static route version differences live on the global static-routes mapper.
PathPrefixMapper adds ``vrf name <vrf>``. Protocol-specific 1.5 features
live in the per-protocol base mappers.
"""


class VrfMapperV1_5:
    """No VRF-only static path overrides."""
