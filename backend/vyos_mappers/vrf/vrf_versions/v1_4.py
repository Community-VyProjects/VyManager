"""VyOS 1.4-specific VRF mapper overrides.

Static route version differences live on the global static-routes mapper.
PathPrefixMapper adds ``vrf name <vrf>``.
"""


class VrfMapperV1_4:
    """No VRF-only static path overrides."""
