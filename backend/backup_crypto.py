"""
VyManager Backup Crypto

Serializes a full VyManager backup payload into a passphrase-encrypted binary
blob and back. The blob is self-describing so it can be decrypted on any
VyManager host given the passphrase (it does NOT depend on SSH_ENCRYPTION_KEY).

File layout (all concatenated, no separators):
    magic            8 bytes   b"VYMGRBAK"
    format version   1 byte    0x01
    salt            16 bytes   scrypt salt
    nonce           12 bytes   AES-256-GCM nonce
    ciphertext       N bytes   AES-256-GCM(gzip(json(payload)))

The key is derived from the passphrase with scrypt (n=2**15, r=8, p=1).
"""

import gzip
import hashlib
import json
import os
from typing import Any, Dict, Optional

from cryptography.exceptions import InvalidTag
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives.kdf.scrypt import Scrypt

MAGIC = b"VYMGRBAK"
FORMAT_VERSION = 1
_SALT_LEN = 16
_NONCE_LEN = 12
_KEY_LEN = 32

# scrypt cost parameters. n must be a power of two; these give a good
# interactive-login cost without being painful for a one-off backup operation.
_SCRYPT_N = 2 ** 15
_SCRYPT_R = 8
_SCRYPT_P = 1


class BackupCryptoError(Exception):
    """Raised when a backup blob cannot be decrypted or is malformed."""


def _derive_key(passphrase: str, salt: bytes) -> bytes:
    kdf = Scrypt(salt=salt, length=_KEY_LEN, n=_SCRYPT_N, r=_SCRYPT_R, p=_SCRYPT_P)
    return kdf.derive(passphrase.encode("utf-8"))


def encrypt_backup(payload: Dict[str, Any], passphrase: str) -> bytes:
    """Serialize and encrypt a backup payload into a self-describing blob."""
    if not passphrase:
        raise BackupCryptoError("A passphrase is required to encrypt a backup")

    plaintext = gzip.compress(
        json.dumps(payload, separators=(",", ":")).encode("utf-8")
    )

    salt = os.urandom(_SALT_LEN)
    nonce = os.urandom(_NONCE_LEN)
    key = _derive_key(passphrase, salt)
    ciphertext = AESGCM(key).encrypt(nonce, plaintext, None)

    return MAGIC + bytes([FORMAT_VERSION]) + salt + nonce + ciphertext


def decrypt_backup(blob: bytes, passphrase: str) -> Dict[str, Any]:
    """Decrypt a backup blob produced by :func:`encrypt_backup`.

    Raises :class:`BackupCryptoError` for a wrong passphrase, a corrupt file,
    or an unrecognized format.
    """
    if not passphrase:
        raise BackupCryptoError("A passphrase is required to decrypt a backup")

    header_len = len(MAGIC) + 1 + _SALT_LEN + _NONCE_LEN
    if len(blob) < header_len:
        raise BackupCryptoError("File is too small to be a VyManager backup")

    if blob[: len(MAGIC)] != MAGIC:
        raise BackupCryptoError("Not a VyManager backup file")

    version = blob[len(MAGIC)]
    if version != FORMAT_VERSION:
        raise BackupCryptoError(f"Unsupported backup format version: {version}")

    offset = len(MAGIC) + 1
    salt = blob[offset : offset + _SALT_LEN]
    offset += _SALT_LEN
    nonce = blob[offset : offset + _NONCE_LEN]
    offset += _NONCE_LEN
    ciphertext = blob[offset:]

    key = _derive_key(passphrase, salt)
    try:
        plaintext = AESGCM(key).decrypt(nonce, ciphertext, None)
    except InvalidTag:
        raise BackupCryptoError(
            "Could not decrypt backup: wrong passphrase or corrupt file"
        )

    try:
        return json.loads(gzip.decompress(plaintext).decode("utf-8"))
    except (OSError, ValueError) as exc:  # gzip/json errors
        raise BackupCryptoError(f"Backup payload is corrupt: {exc}")


def ssh_key_fingerprint() -> Optional[str]:
    """Return a short fingerprint of the host's SSH_ENCRYPTION_KEY, or None.

    Used to warn on restore when encrypted SSH private keys in a backup were
    encrypted with a different key than the current host has, and therefore
    cannot be decrypted here.
    """
    key_hex = os.getenv("SSH_ENCRYPTION_KEY")
    if not key_hex:
        return None
    return hashlib.sha256(key_hex.encode("utf-8")).hexdigest()[:16]
