from vyos_mappers.policy_list import PolicyListMapper


class ExtCommunityListMapper(PolicyListMapper):
    def __init__(self, version: str):
        super().__init__(version, "extcommunity-list")
