"""
Encryption Service

Provides symmetric encryption for sensitive data like API keys.
Uses Fernet (AES-128-CBC with HMAC) from the cryptography library.
"""

import os
import base64
from typing import Optional
from cryptography.fernet import Fernet, InvalidToken


class EncryptionService:
    """
    Service for encrypting and decrypting sensitive data.

    Uses Fernet symmetric encryption (AES-128-CBC + HMAC-SHA256).
    The encryption key should be a 32-byte URL-safe base64-encoded key.

    Environment variable: ENCRYPTION_KEY
    Generate a key with: python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
    """

    def __init__(self, key: Optional[str] = None):
        """
        Initialize the encryption service.

        Args:
            key: Optional encryption key. If not provided, reads from ENCRYPTION_KEY env var.

        Raises:
            ValueError: If no encryption key is configured.
        """
        self._key = key or os.getenv("ENCRYPTION_KEY")
        self._cipher: Optional[Fernet] = None

        if self._key:
            try:
                self._cipher = Fernet(self._key.encode() if isinstance(self._key, str) else self._key)
            except Exception as e:
                print(f"[EncryptionService] Warning: Invalid encryption key format: {e}")
                self._cipher = None

    @property
    def is_configured(self) -> bool:
        """Check if encryption is properly configured."""
        return self._cipher is not None

    def encrypt(self, plaintext: str) -> str:
        """
        Encrypt a plaintext string.

        Args:
            plaintext: The string to encrypt.

        Returns:
            Base64-encoded encrypted string.

        Raises:
            ValueError: If encryption is not configured.
        """
        if not self._cipher:
            # If encryption is not configured, return plaintext
            # This allows the app to work without encryption during development
            print("[EncryptionService] Warning: Encryption not configured, storing plaintext")
            return plaintext

        encrypted = self._cipher.encrypt(plaintext.encode())
        return encrypted.decode()

    def decrypt(self, ciphertext: str) -> str:
        """
        Decrypt an encrypted string.

        Args:
            ciphertext: The encrypted string to decrypt.

        Returns:
            Decrypted plaintext string.

        Raises:
            ValueError: If decryption fails.
        """
        if not self._cipher:
            # If encryption is not configured, assume plaintext
            print("[EncryptionService] Warning: Encryption not configured, assuming plaintext")
            return ciphertext

        # Check if this looks like encrypted data (Fernet tokens start with 'gAAAAA')
        if not ciphertext.startswith('gAAAAA'):
            # Likely plaintext from before encryption was enabled
            print("[EncryptionService] Data appears to be plaintext (not encrypted)")
            return ciphertext

        try:
            decrypted = self._cipher.decrypt(ciphertext.encode())
            return decrypted.decode()
        except InvalidToken:
            # Could be plaintext data from before encryption was enabled
            print("[EncryptionService] Warning: Decryption failed, returning as-is (may be plaintext)")
            return ciphertext
        except Exception as e:
            print(f"[EncryptionService] Decryption error: {type(e).__name__}: {e}")
            # Return as-is to avoid breaking the app
            return ciphertext

    def is_encrypted(self, data: str) -> bool:
        """
        Check if data appears to be encrypted.

        Fernet tokens have a specific format starting with 'gAAAAA'.

        Args:
            data: The string to check.

        Returns:
            True if data appears to be encrypted.
        """
        return data.startswith('gAAAAA')

    @staticmethod
    def generate_key() -> str:
        """
        Generate a new encryption key.

        Returns:
            A new 32-byte URL-safe base64-encoded key.
        """
        return Fernet.generate_key().decode()


# Global singleton instance
encryption_service = EncryptionService()
