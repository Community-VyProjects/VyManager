"""One-time re-encrypt of instance SSH keys under per-instance derived keys.

Before: every instance's SSH private key was encrypted under the raw
SSH_ENCRYPTION_KEY. After: each is encrypted under
HKDF(SSH_ENCRYPTION_KEY, info=instanceId). Run once after deploying the
per-instance-key code:

    DATABASE_URL=... SSH_ENCRYPTION_KEY=... python -m scripts.migrate_ssh_keys

For each instance with a stored key it decrypts under the raw master,
re-encrypts under the derived key, verifies the new ciphertext round-trips
to the same plaintext, and only then writes it back — all inside one
transaction. Idempotent: a key already under the derived form is detected
by the round-trip and left unchanged. --dry-run reports without writing.

The change is reversible: decrypt_private_key still falls back to the raw
master, so a key left un-migrated (or a rolled-back deploy) keeps working.
"""

import asyncio
import os
import sys
import base64

from cryptography.hazmat.primitives.ciphers.aead import AESGCM

from ssh_key_manager import (
    _derive_instance_key,
    _get_master_key,
    encrypt_private_key_pem,
)


def _decrypt(key: bytes, enc_b64: str, nonce_b64: str) -> bytes:
    return AESGCM(key).decrypt(
        base64.b64decode(nonce_b64), base64.b64decode(enc_b64), None)


async def run(database_url: str, dry_run: bool) -> int:
    import asyncpg

    master = _get_master_key()
    conn = await asyncpg.connect(database_url)
    migrated = already = failed = 0
    try:
        rows = await conn.fetch(
            'SELECT id, "sshEncryptedPrivKey", "sshKeyNonce" FROM instances'
            ' WHERE "sshEncryptedPrivKey" IS NOT NULL'
            '   AND "sshKeyNonce" IS NOT NULL')
        print(f"{len(rows)} instance(s) with a stored SSH key")

        async with conn.transaction():
            for row in rows:
                iid = row["id"]
                enc, nonce = row["sshEncryptedPrivKey"], row["sshKeyNonce"]
                derived = _derive_instance_key(iid)

                # Already under the derived key? Leave it.
                try:
                    _decrypt(derived, enc, nonce)
                    already += 1
                    continue
                except Exception:
                    pass

                # Decrypt under the raw master, re-encrypt under derived.
                try:
                    plaintext = _decrypt(master, enc, nonce)
                except Exception:
                    failed += 1
                    print(f"  FAIL {iid}: not decryptable under the master key")
                    continue

                new = encrypt_private_key_pem(plaintext, iid)
                # Verify the new ciphertext round-trips before writing.
                if _decrypt(derived, new["encrypted_private_key"],
                            new["nonce"]) != plaintext:
                    failed += 1
                    print(f"  FAIL {iid}: round-trip mismatch, not written")
                    continue

                if not dry_run:
                    await conn.execute(
                        'UPDATE instances SET "sshEncryptedPrivKey" = $1,'
                        ' "sshKeyNonce" = $2, "updatedAt" = NOW() WHERE id = $3',
                        new["encrypted_private_key"], new["nonce"], iid)
                migrated += 1
                print(f"  {'would migrate' if dry_run else 'migrated'} {iid}")

            if dry_run:
                raise _Rollback()
    except _Rollback:
        pass
    finally:
        await conn.close()

    print(f"\nmigrated={migrated} already-derived={already} failed={failed}"
          f"{' (dry-run, nothing written)' if dry_run else ''}")
    return 1 if failed else 0


class _Rollback(Exception):
    pass


def main() -> int:
    database_url = os.environ.get("DATABASE_URL")
    if not database_url:
        print("DATABASE_URL is required", file=sys.stderr)
        return 2
    dry_run = "--dry-run" in sys.argv
    return asyncio.run(run(database_url, dry_run))


if __name__ == "__main__":
    sys.exit(main())
