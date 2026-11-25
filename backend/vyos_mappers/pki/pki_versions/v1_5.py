"""VyOS 1.5 PKI mapper.

VyOS 1.5 ``pki certificate <n> acme listen-address`` takes an IPv4 or an
IPv6 address; 1.4 takes IPv4 only. Every other PKI leaf is the same.
"""

from ..pki import PKIMapper


class PKIMapperV1_5(PKIMapper):
    """VyOS 1.5 PKI mapper."""

    def acme_listen_address_ipv6(self) -> bool:
        return True
