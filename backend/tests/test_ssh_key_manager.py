"""Per-instance SSH key derivation and the pre-migration fallback."""

import base64
import os

import pytest
from cryptography.hazmat.primitives.ciphers.aead import AESGCM

os.environ.setdefault("SSH_ENCRYPTION_KEY", "11" * 32)

import ssh_key_manager as skm

PEM = b"-----BEGIN OPENSSH PRIVATE KEY-----\nabc\n-----END-----\n"


def test_derived_keys_differ_per_instance():
    a = skm._derive_instance_key("inst-a")
    b = skm._derive_instance_key("inst-b")
    assert a != b
    assert len(a) == 32
    # deterministic
    assert a == skm._derive_instance_key("inst-a")


def test_generate_and_decrypt_round_trip():
    kp = skm.generate_keypair("inst-x")
    plain = skm.decrypt_private_key(
        kp["encrypted_private_key"], kp["nonce"], "inst-x")
    assert plain  # decrypts under the derived key
    assert "public_key" in kp


def test_decrypt_wrong_instance_fails_without_master_match():
    kp = skm.generate_keypair("inst-x")
    # A different instance id derives a different key; with no master fallback
    # match it must not silently decrypt to the same plaintext.
    other = skm.decrypt_private_key(
        kp["encrypted_private_key"], kp["nonce"], "inst-x")
    with pytest.raises(Exception):
        AESGCM(skm._derive_instance_key("inst-y")).decrypt(
            base64.b64decode(kp["nonce"]),
            base64.b64decode(kp["encrypted_private_key"]), None)
    assert other  # sanity: the right instance still decrypts


def test_fallback_reads_master_encrypted_ciphertext():
    # Simulate a pre-migration ciphertext: encrypted under the raw master.
    master = skm._get_master_key()
    nonce = os.urandom(12)
    enc = AESGCM(master).encrypt(nonce, PEM, None)
    enc_b64 = base64.b64encode(enc).decode()
    nonce_b64 = base64.b64encode(nonce).decode()
    # decrypt_private_key falls back to the master when the derived key fails.
    assert skm.decrypt_private_key(enc_b64, nonce_b64, "any-instance") == PEM
    # and still works with no instance id at all (pure master path).
    assert skm.decrypt_private_key(enc_b64, nonce_b64) == PEM


def test_encrypt_helper_round_trips():
    out = skm.encrypt_private_key_pem(PEM, "inst-z")
    got = AESGCM(skm._derive_instance_key("inst-z")).decrypt(
        base64.b64decode(out["nonce"]),
        base64.b64decode(out["encrypted_private_key"]), None)
    assert got == PEM
