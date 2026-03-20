"""
IPSec Mapper for VyOS 1.4

VyOS 1.4 does NOT support:
- authentication/ppk (Post-quantum Pre-shared Keys)
- options/retransmission
- remote-access/connection/*/authentication/always-send-cert
- remote-access/connection/*/authentication/ppk
- remote-access/connection/*/bind
- remote-access/connection/*/childless
- remote-access/pool/*/range (start, stop)
- site-to-site/peer/*/authentication/ppk
- site-to-site/peer/*/childless
"""


class IPSecMapperV1_4:
    """VyOS 1.4 specific IPSec paths - no additional paths beyond base."""
    pass
