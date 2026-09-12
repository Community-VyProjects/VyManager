"""IPv4-style thin wrappers live next to the original import paths."""

from vyos_mappers.policy_list import PolicyListMapper


class CommunityListMapper(PolicyListMapper):
    def __init__(self, version: str):
        super().__init__(version, "community-list")
