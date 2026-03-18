"""NAT66 mapper for VyOS 1.4.

VyOS 1.4 does not support firewall group references on nat66 rules.
All common paths are inherited from the base NAT66Mapper.
"""
from ..nat66 import NAT66Mapper


class NAT66Mapper_v1_4(NAT66Mapper):
    pass
