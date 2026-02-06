"""VyOS 1.4 specific Babel protocol commands."""


class BabelMapperV1_4:
    """
    Version-specific mapper for VyOS 1.4.

    VyOS 1.4 Babel does NOT support:
    - redistribute ipv4 nhrp
    - redistribute ipv6 nhrp
    """
    pass
