"""Unit tests for the bug-report redaction boundary.

These run in isolation (no VyOS, no network) per the project's testing guidance.
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from routers.bug_report.redaction import redact, REDACTED, REDACTED_IP, REDACTED_PEM


def test_pem_block_is_removed():
    text = (
        "here is my key:\n"
        "-----BEGIN RSA PRIVATE KEY-----\n"
        "MIIEowIBAAKCAQEA1234567890abcdef\n"
        "abcdefghijklmnopqrstuvwxyz0987654\n"
        "-----END RSA PRIVATE KEY-----\n"
        "thanks"
    )
    out = redact(text)
    assert REDACTED_PEM in out
    assert "MIIEowIBAAKCAQEA" not in out
    assert "BEGIN RSA PRIVATE KEY" not in out


def test_certificate_block_is_removed():
    text = "-----BEGIN CERTIFICATE-----\nAAAABBBBCCCCDDDD\n-----END CERTIFICATE-----"
    out = redact(text)
    assert REDACTED_PEM in out
    assert "AAAABBBBCCCC" not in out


def test_password_kv_redacted_preserving_key():
    for sample in [
        "set vpn ipsec authentication password 'SuperSecret123'",
        '"api_key": "abcd1234efgh"',
        "PASSWORD=hunter2horse",
        "pre-shared-secret = MyPSKvalue99",
    ]:
        out = redact(sample)
        assert REDACTED in out, sample
        assert "SuperSecret123" not in out
        assert "abcd1234efgh" not in out
        assert "hunter2horse" not in out
        assert "MyPSKvalue99" not in out


def test_bearer_token_redacted():
    out = redact("Authorization: Bearer ghp_AbCdEf123456789Token")
    assert "ghp_AbCdEf123456789Token" not in out
    assert REDACTED in out


def test_wireguard_key_redacted():
    wg = "WJ8sKzQ2Z1bN3mF4pV6rT8yU0wX2aC5dE7gH9jK1lMq="  # 44-char base64 (43 + pad)
    out = redact(f"public-key {wg}")
    assert wg not in out
    assert REDACTED in out


def test_long_hex_blob_redacted():
    h = "a" * 64
    out = redact(f"hash is {h} done")
    assert h not in out
    assert REDACTED in out


def test_public_ipv4_redacted():
    out = redact("server at 8.8.8.8 failed")
    assert "8.8.8.8" not in out
    assert REDACTED_IP in out


def test_private_ipv4_kept():
    for ip in ["10.0.0.1", "192.168.1.1", "172.16.5.4", "127.0.0.1", "100.64.64.50"]:
        out = redact(f"connecting to {ip}")
        assert ip in out, f"private/special IP should be kept: {ip}"


def test_version_string_not_treated_as_ip():
    # A semver-with-suffix is not a valid IPv4 and must be left untouched.
    # (A bare 4-octet "1.0.0.3" IS a valid public IP and is intentionally
    # redacted — over-redaction is acceptable for the safety boundary.)
    out = redact("VyManager version 1.0.0-beta.3 running")
    assert "1.0.0-beta.3" in out


def test_public_ipv6_redacted_private_kept():
    assert REDACTED_IP in redact("addr 2606:4700:4700::1111 here")
    assert "fe80::1" in redact("link local fe80::1 ok")
    assert "::1" in redact("loopback ::1 ok")


def test_empty_string():
    assert redact("") == ""


if __name__ == "__main__":
    import traceback

    failures = 0
    for name, fn in sorted(globals().items()):
        if name.startswith("test_") and callable(fn):
            try:
                fn()
                print(f"PASS {name}")
            except Exception:
                failures += 1
                print(f"FAIL {name}")
                traceback.print_exc()
    print(f"\n{'ALL PASSED' if not failures else str(failures) + ' FAILED'}")
    sys.exit(1 if failures else 0)
