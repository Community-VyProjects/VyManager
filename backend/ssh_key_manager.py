"""
SSH Key Manager

Generates Ed25519 keypairs for SSH monitoring and encrypts private keys
at rest using AES-256-GCM. The encryption key is derived from the
SSH_ENCRYPTION_KEY environment variable (64-char hex = 32 bytes).
"""

import os
import base64
from typing import Dict

from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.ciphers.aead import AESGCM


def _get_encryption_key() -> bytes:
    """Get the AES-256 encryption key from environment variable."""
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


def generate_keypair() -> Dict[str, str]:
    """
    Generate an Ed25519 keypair for SSH authentication.

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

    # Encrypt private key with AES-256-GCM
    encryption_key = _get_encryption_key()
    aesgcm = AESGCM(encryption_key)
    nonce = os.urandom(12)  # 96-bit nonce for GCM
    encrypted = aesgcm.encrypt(nonce, private_key_pem, None)

    return {
        "public_key": public_key_str,
        "encrypted_private_key": base64.b64encode(encrypted).decode("utf-8"),
        "nonce": base64.b64encode(nonce).decode("utf-8"),
    }


def decrypt_private_key(encrypted_b64: str, nonce_b64: str) -> bytes:
    """
    Decrypt an encrypted private key.

    Args:
        encrypted_b64: Base64-encoded encrypted private key
        nonce_b64: Base64-encoded nonce

    Returns:
        PEM-encoded private key bytes
    """
    encryption_key = _get_encryption_key()
    aesgcm = AESGCM(encryption_key)
    encrypted = base64.b64decode(encrypted_b64)
    nonce = base64.b64decode(nonce_b64)
    return aesgcm.decrypt(nonce, encrypted, None)
