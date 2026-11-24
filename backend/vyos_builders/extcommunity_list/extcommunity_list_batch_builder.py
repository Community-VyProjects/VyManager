from typing import Self

from vyos_builders.policy_list import PolicyListBatchBuilder


class ExtCommunityListBatchBuilder(PolicyListBatchBuilder):
    def __init__(self, version: str):
        super().__init__(version, "extcommunity-list")

    def set_extcommunity_list(self, name: str) -> Self:
        return self._set_list(name)

    def delete_extcommunity_list(self, name: str) -> Self:
        return self._delete_list(name)

    def set_extcommunity_list_description(self, name: str, description: str) -> Self:
        return self._set_list_description(name, description)

    def delete_extcommunity_list_description(self, name: str) -> Self:
        return self._delete_list_description(name)
