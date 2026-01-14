"""
Cryptographic utilities for encrypting sensitive data.

Uses Fernet symmetric encryption for API keys and other secrets.
The encryption key should be stored in environment variables.
"""

import os
import base64
import hashlib
from typing import Optional


def generate_encryption_key() -> str:
    """
    Generate a new Fernet-compatible encryption key.

    Returns:
        Base64-encoded 32-byte key suitable for Fernet encryption.

    Example:
        >>> key = generate_encryption_key()
        >>> print(f"ENCRYPTION_KEY={key}")
    """
    import secrets
    key = secrets.token_bytes(32)
    return base64.urlsafe_b64encode(key).decode('utf-8')


def _get_encryption_key() -> bytes:
    """
    Get the encryption key from environment.

    The key must be set in ENCRYPTION_KEY environment variable.
    If not set, falls back to deriving a key from DATABASE_URL
    (not recommended for production).

    Returns:
        32-byte encryption key.

    Raises:
        ValueError: If no key can be derived.
    """
    env_key = os.getenv("ENCRYPTION_KEY")

    if env_key:
        # Decode the base64 key
        try:
            return base64.urlsafe_b64decode(env_key.encode('utf-8'))
        except Exception:
            # If not valid base64, use it as a passphrase
            return hashlib.sha256(env_key.encode('utf-8')).digest()

    # Fallback: derive from DATABASE_URL (not recommended)
    db_url = os.getenv("DATABASE_URL")
    if db_url:
        # Use SHA-256 hash of DATABASE_URL as a derived key
        # This is a fallback for backwards compatibility
        return hashlib.sha256(db_url.encode('utf-8')).digest()

    raise ValueError(
        "ENCRYPTION_KEY environment variable is required for API key encryption. "
        "Generate one with: python -c \"from utils.crypto import generate_encryption_key; print(generate_encryption_key())\""
    )


def encrypt_api_key(plaintext: str) -> str:
    """
    Encrypt an API key for storage in the database.

    Uses Fernet symmetric encryption with the key from environment.

    Args:
        plaintext: The API key to encrypt.

    Returns:
        Base64-encoded encrypted value prefixed with "enc:" marker.

    Example:
        >>> encrypted = encrypt_api_key("my-secret-api-key")
        >>> # Returns something like "enc:gAAA..."
    """
    if not plaintext:
        return plaintext

    # Already encrypted
    if plaintext.startswith("enc:"):
        return plaintext

    try:
        from cryptography.fernet import Fernet

        key = _get_encryption_key()
        # Fernet requires URL-safe base64 encoded 32-byte key
        fernet_key = base64.urlsafe_b64encode(key)
        fernet = Fernet(fernet_key)

        encrypted = fernet.encrypt(plaintext.encode('utf-8'))
        return f"enc:{encrypted.decode('utf-8')}"

    except ImportError:
        # cryptography not installed - return as-is with warning
        print("WARNING: cryptography library not installed. API keys stored unencrypted.")
        return plaintext
    except Exception as e:
        print(f"WARNING: Failed to encrypt API key: {e}")
        return plaintext


def decrypt_api_key(ciphertext: str) -> str:
    """
    Decrypt an API key retrieved from the database.

    Args:
        ciphertext: The encrypted API key (prefixed with "enc:").

    Returns:
        The decrypted plaintext API key.

    Example:
        >>> decrypted = decrypt_api_key("enc:gAAA...")
        >>> # Returns "my-secret-api-key"
    """
    if not ciphertext:
        return ciphertext

    # Not encrypted (legacy or fallback)
    if not ciphertext.startswith("enc:"):
        return ciphertext

    try:
        from cryptography.fernet import Fernet

        key = _get_encryption_key()
        fernet_key = base64.urlsafe_b64encode(key)
        fernet = Fernet(fernet_key)

        # Remove "enc:" prefix
        encrypted_data = ciphertext[4:]
        decrypted = fernet.decrypt(encrypted_data.encode('utf-8'))
        return decrypted.decode('utf-8')

    except ImportError:
        # cryptography not installed
        print("WARNING: cryptography library not installed. Cannot decrypt API key.")
        return ciphertext
    except Exception as e:
        print(f"WARNING: Failed to decrypt API key: {e}")
        return ciphertext


def is_encrypted(value: str) -> bool:
    """Check if a value is encrypted (has enc: prefix)."""
    return value and value.startswith("enc:")
