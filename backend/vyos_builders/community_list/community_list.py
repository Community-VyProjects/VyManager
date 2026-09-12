from vyos_builders.policy_list import PolicyListBatchBuilder


class CommunityListBatchBuilder(PolicyListBatchBuilder):
    def __init__(self, version: str):
        super().__init__(version, "community-list")

    def set_community_list(self, name: str) -> "CommunityListBatchBuilder":
        return self._set_list(name)

    def delete_community_list(self, name: str) -> "CommunityListBatchBuilder":
        return self._delete_list(name)

    def set_community_list_description(self, name: str, description: str) -> "CommunityListBatchBuilder":
        return self._set_list_description(name, description)

    def delete_community_list_description(self, name: str) -> "CommunityListBatchBuilder":
        return self._delete_list_description(name)
