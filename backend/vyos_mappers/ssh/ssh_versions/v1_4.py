"""VyOS 1.4 SSH mapper overrides.

On 1.4 the cipher node is named "ciphers" (plural); 1.5 uses "cipher".
FIDO and trusted-user-ca do not exist on 1.4 (gated off via capabilities).
"""
from typing import List

BASE = ["service", "ssh"]


class SSHMapperV1_4:
    def get_cipher(self, algo: str) -> List[str]:
        return BASE + ["ciphers", algo]

    def get_cipher_delete(self, algo: str) -> List[str]:
        return BASE + ["ciphers", algo]

    def get_all_ciphers_delete(self) -> List[str]:
        return BASE + ["ciphers"]
