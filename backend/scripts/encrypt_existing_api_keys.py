#!/usr/bin/env python3
"""
Migration Script: Encrypt Existing API Keys

This script encrypts any plaintext API keys in the database.
Run this once after enabling encryption to migrate existing data.

Usage:
    python scripts/encrypt_existing_api_keys.py

Environment variables required:
    - DATABASE_URL: PostgreSQL connection string
    - ENCRYPTION_KEY: Fernet encryption key

To generate an encryption key:
    python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
"""

import asyncio
import os
import sys

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import asyncpg
from dotenv import load_dotenv
from services.encryption import EncryptionService


async def migrate_api_keys():
    """Encrypt all plaintext API keys in the database."""

    # Load environment variables
    load_dotenv()

    database_url = os.getenv("DATABASE_URL")
    encryption_key = os.getenv("ENCRYPTION_KEY")

    if not database_url:
        print("ERROR: DATABASE_URL environment variable is required")
        sys.exit(1)

    if not encryption_key:
        print("ERROR: ENCRYPTION_KEY environment variable is required")
        print("Generate one with: python -c \"from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())\"")
        sys.exit(1)

    # Initialize encryption service
    encryption_service = EncryptionService(encryption_key)

    if not encryption_service.is_configured:
        print("ERROR: Invalid encryption key format")
        sys.exit(1)

    print("Connecting to database...")
    conn = await asyncpg.connect(database_url)

    try:
        # Get all instances with API keys
        instances = await conn.fetch(
            """
            SELECT id, name, "apiKey"
            FROM instances
            WHERE "apiKey" IS NOT NULL AND "apiKey" != ''
            """
        )

        print(f"Found {len(instances)} instances to check")

        encrypted_count = 0
        already_encrypted_count = 0
        error_count = 0

        for instance in instances:
            instance_id = instance["id"]
            instance_name = instance["name"]
            api_key = instance["apiKey"]

            # Check if already encrypted (Fernet tokens start with 'gAAAAA')
            if encryption_service.is_encrypted(api_key):
                print(f"  [{instance_name}] Already encrypted, skipping")
                already_encrypted_count += 1
                continue

            try:
                # Encrypt the API key
                encrypted_key = encryption_service.encrypt(api_key)

                # Update the database
                await conn.execute(
                    """
                    UPDATE instances
                    SET "apiKey" = $1, "updatedAt" = NOW()
                    WHERE id = $2
                    """,
                    encrypted_key,
                    instance_id
                )

                print(f"  [{instance_name}] Encrypted successfully")
                encrypted_count += 1

            except Exception as e:
                print(f"  [{instance_name}] ERROR: {e}")
                error_count += 1

        print("\n" + "=" * 50)
        print("Migration Summary:")
        print(f"  - Total instances: {len(instances)}")
        print(f"  - Newly encrypted: {encrypted_count}")
        print(f"  - Already encrypted: {already_encrypted_count}")
        print(f"  - Errors: {error_count}")
        print("=" * 50)

        if error_count > 0:
            print("\nWARNING: Some instances failed to encrypt. Please check the errors above.")
            sys.exit(1)
        else:
            print("\nMigration completed successfully!")

    finally:
        await conn.close()


if __name__ == "__main__":
    print("=" * 50)
    print("API Key Encryption Migration")
    print("=" * 50)
    print()

    asyncio.run(migrate_api_keys())
