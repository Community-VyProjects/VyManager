"""
SSH Key Manager

Generates Ed25519 keypairs for SSH monitoring and encrypts private keys
at rest using AES-256-GCM. The AES key is per-instance:
HKDF-SHA256(SSH_ENCRYPTION_KEY, info=instanceId). The master
SSH_ENCRYPTION_KEY (64-char hex = 32 bytes) is unchanged; per-instance
domain separation means a leaked ciphertext exposes only one instance and
keys rotate per instance.
"""

import os
import base64
from typing import Dict, Optional

from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives.kdf.hkdf import HKDF


def _get_master_key() -> bytes:
    """Get the master key (SSH_ENCRYPTION_KEY) — the HKDF input keying material."""
    key_hex = os.getenv("SSH_ENCRYPTION_KEY")
    if not key_hex:
        raise ValueError(
            "SSH_ENCRYPTION_KEY environment variable is required. "
            "Generate one with: python -c \"import secrets; print(secrets.token_hex(32))\""
        )
    if len(key_hex) != 64:
        raise ValueError(
            "SSH_ENCRYPTION_KEY must be exactly 64 hex characters (32 bytes)"
        )
    return bytes.fromhex(key_hex)


def _derive_instance_key(instance_id: str) -> bytes:
    """Per-instance AES-256 key: HKDF-SHA256(master, info=instanceId)."""
    hkdf = HKDF(
        algorithm=hashes.SHA256(),
        length=32,
        salt=None,
        info=instance_id.encode("utf-8"),
    )
    return hkdf.derive(_get_master_key())


def encrypt_private_key_pem(private_key_pem: bytes, instance_id: str) -> Dict[str, str]:
    """Encrypt a PEM private key under the instance's derived key."""
    aesgcm = AESGCM(_derive_instance_key(instance_id))
    nonce = os.urandom(12)  # 96-bit nonce for GCM
    encrypted = aesgcm.encrypt(nonce, private_key_pem, None)
    return {
        "encrypted_private_key": base64.b64encode(encrypted).decode("utf-8"),
        "nonce": base64.b64encode(nonce).decode("utf-8"),
    }


def generate_keypair(instance_id: str) -> Dict[str, str]:
    """
    Generate an Ed25519 keypair for SSH authentication, private key encrypted
    under the instance's derived key.

    Returns:
        Dict with:
            - public_key: OpenSSH-format public key string
            - encrypted_private_key: Base64-encoded AES-256-GCM encrypted PEM
            - nonce: Base64-encoded nonce used for encryption
    """
    private_key = Ed25519PrivateKey.generate()

    # Serialize public key in OpenSSH format
    public_key_bytes = private_key.public_key().public_bytes(
        encoding=serialization.Encoding.OpenSSH,
        format=serialization.PublicFormat.OpenSSH
    )
    public_key_str = public_key_bytes.decode("utf-8")

    # Serialize private key in PEM format (unencrypted in memory)
    private_key_pem = private_key.private_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PrivateFormat.OpenSSH,
        encryption_algorithm=serialization.NoEncryption()
    )

    result = encrypt_private_key_pem(private_key_pem, instance_id)
    result["public_key"] = public_key_str
    return result


def decrypt_private_key(
    encrypted_b64: str, nonce_b64: str, instance_id: Optional[str] = None
) -> bytes:
    """
    Decrypt an encrypted private key.

    Tries the instance's derived key first; if that fails (a key encrypted
    under the pre-migration global master, or no instance_id given), falls
    back to the raw master. This keeps both pre- and post-migration
    ciphertexts readable, so the one-time re-encrypt migration has no
    breakage window and is reversible.
    """
    encrypted = base64.b64decode(encrypted_b64)
    nonce = base64.b64decode(nonce_b64)

    if instance_id is not None:
        try:
            return AESGCM(_derive_instance_key(instance_id)).decrypt(
                nonce, encrypted, None)
        except Exception:
            pass  # fall back to the raw master (un-migrated ciphertext)

    return AESGCM(_get_master_key()).decrypt(nonce, encrypted, None)
