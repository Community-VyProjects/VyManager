from vyos_builders.policy_list import PolicyListBatchBuilder


class LargeCommunityListBatchBuilder(PolicyListBatchBuilder):
    def __init__(self, version: str):
        super().__init__(version, "large-community-list")
