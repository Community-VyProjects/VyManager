from vyos_mappers.policy_list import PolicyListMapper


class LargeCommunityListMapper(PolicyListMapper):
    def __init__(self, version: str):
        super().__init__(version, "large-community-list")
