from vyos_builders.policy_list import PolicyListBatchBuilder


class CommunityListBatchBuilder(PolicyListBatchBuilder):
    def __init__(self, version: str):
        super().__init__(version, "community-list")
