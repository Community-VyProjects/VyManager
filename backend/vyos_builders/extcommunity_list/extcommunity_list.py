from vyos_builders.policy_list import PolicyListBatchBuilder


class ExtCommunityListBatchBuilder(PolicyListBatchBuilder):
    def __init__(self, version: str):
        super().__init__(version, "extcommunity-list")
