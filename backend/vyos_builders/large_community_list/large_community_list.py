from vyos_builders.policy_list import PolicyListBatchBuilder


class LargeCommunityListBatchBuilder(PolicyListBatchBuilder):
    def __init__(self, version: str):
        super().__init__(version, "large-community-list")

    def set_large_community_list(self, name: str) -> "LargeCommunityListBatchBuilder":
        return self._set_list(name)

    def delete_large_community_list(self, name: str) -> "LargeCommunityListBatchBuilder":
        return self._delete_list(name)

    def set_large_community_list_description(self, name: str, description: str) -> "LargeCommunityListBatchBuilder":
        return self._set_list_description(name, description)

    def delete_large_community_list_description(self, name: str) -> "LargeCommunityListBatchBuilder":
        return self._delete_list_description(name)
