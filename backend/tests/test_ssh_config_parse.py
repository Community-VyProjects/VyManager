"""SSH GET /config parse lives on the mapper (issue #966)."""

from pathlib import Path

from vyos_mappers.ssh.ssh_versions import get_ssh_mapper


def _tree():
    return {
        "service": {
            "ssh": {
                "port": ["2222", "22"],
                "listen-address": {"192.0.2.10": {}, "192.0.2.1": {}},
                "vrf": "mgmt",
                "disable-host-validation": {},
                "disable-password-authentication": {},
                "loglevel": "verbose",
                "client-keepalive-interval": "60",
                "ciphers": ["aes256-ctr", "aes128-ctr"],
                "mac": "hmac-sha2-256",
                "key-exchange": {
                    "curve25519-sha256": {},
                    "diffie-hellman-group14-sha256": {},
                },
                "hostkey-algorithm": ["ssh-ed25519"],
                "pubkey-accepted-algorithm": ["ssh-ed25519", "rsa-sha2-256"],
                "trusted-user-ca": "users-ca",
                "access-control": {
                    "allow": {"user": ["bob", "alice"], "group": "vyos"},
                    "deny": {"user": "root", "group": {"wheel": {}, "sudo": {}}},
                },
                "dynamic-protection": {
                    "allow-from": ["10.0.0.0/8", "192.0.2.0/24"],
                    "block-time": "600",
                    "detect-time": "300",
                    "threshold": "5",
                },
                "fido": {"pin-required": {}},
                "rekey": {"data": "1000", "time": "30"},
            }
        }
    }


def _empty():
    return {
        "ports": [],
        "listen_addresses": [],
        "vrfs": [],
        "disable_host_validation": False,
        "disable_password_authentication": False,
        "loglevel": None,
        "client_keepalive_interval": None,
        "ciphers": [],
        "macs": [],
        "key_exchanges": [],
        "hostkey_algorithms": [],
        "pubkey_accepted_algorithms": [],
        "trusted_user_ca": None,
        "access_control": {
            "allow_users": [],
            "allow_groups": [],
            "deny_users": [],
            "deny_groups": [],
        },
        "dynamic_protection": {
            "enabled": False,
            "allow_from": [],
            "block_time": None,
            "detect_time": None,
            "threshold": None,
        },
        "fido": {"pin_required": False, "touch_required": False},
        "rekey": {"data": None, "time": None},
    }


def test_parse_config_is_explicit_and_version_falls_through():
    mapper = get_ssh_mapper("1.4")
    assert "parse_config" in type(mapper).__dict__
    assert mapper.version == "1.4"
    assert get_ssh_mapper("1.5").version == "1.5"


def test_access_control_ciphers_and_protection():
    parsed = get_ssh_mapper("1.5").parse_config(_tree())
    assert type(parsed) is dict
    assert parsed["ports"] == ["22", "2222"]
    assert parsed["listen_addresses"] == ["192.0.2.1", "192.0.2.10"]
    assert parsed["vrfs"] == ["mgmt"]
    assert parsed["disable_host_validation"] is True
    assert parsed["disable_password_authentication"] is True
    assert parsed["loglevel"] == "verbose"
    assert parsed["client_keepalive_interval"] == "60"
    assert parsed["ciphers"] == ["aes128-ctr", "aes256-ctr"]
    assert parsed["macs"] == ["hmac-sha2-256"]
    assert parsed["key_exchanges"] == [
        "curve25519-sha256",
        "diffie-hellman-group14-sha256",
    ]
    assert parsed["trusted_user_ca"] == "users-ca"
    assert parsed["access_control"]["allow_users"] == ["alice", "bob"]
    assert parsed["access_control"]["allow_groups"] == ["vyos"]
    assert parsed["access_control"]["deny_users"] == ["root"]
    assert parsed["access_control"]["deny_groups"] == ["sudo", "wheel"]
    assert parsed["dynamic_protection"]["enabled"] is True
    assert parsed["dynamic_protection"]["allow_from"] == [
        "10.0.0.0/8",
        "192.0.2.0/24",
    ]
    assert parsed["dynamic_protection"]["threshold"] == "5"
    assert parsed["fido"] == {"pin_required": True, "touch_required": False}
    assert parsed["rekey"] == {"data": "1000", "time": "30"}
    assert get_ssh_mapper("1.4").parse_config(_tree()) == parsed


def test_cipher_node_is_preferred_and_plural_still_reads():
    both = {
        "service": {
            "ssh": {
                "cipher": ["chacha20-poly1305"],
                "ciphers": ["aes128-ctr"],
            }
        }
    }
    assert get_ssh_mapper("1.4").parse_config(both)["ciphers"] == [
        "chacha20-poly1305"
    ]
    plural = {"service": {"ssh": {"ciphers": ["aes256-ctr", "aes128-ctr"]}}}
    assert get_ssh_mapper("1.5").parse_config(plural)["ciphers"] == [
        "aes128-ctr",
        "aes256-ctr",
    ]
    bare = get_ssh_mapper("1.5").parse_config(
        {"service": {"ssh": {"dynamic-protection": None}}}
    )
    assert bare["dynamic_protection"]["enabled"] is True
    assert bare["dynamic_protection"]["allow_from"] == []


def test_empty_tree():
    assert get_ssh_mapper("1.4").parse_config({}) == _empty()
    assert get_ssh_mapper("1.5").parse_config({"service": {}}) == _empty()
    assert get_ssh_mapper("1.5").parse_config({"service": {"ssh": {}}}) == _empty()
    assert get_ssh_mapper("1.5").parse_config({"service": {"ssh": "nope"}}) == _empty()


def test_router_has_no_parse_helpers():
    root = Path(__file__).resolve().parents[1]
    text = root.joinpath("routers/ssh/ssh.py").read_text()
    assert "def _parse_" not in text
    assert "mapper.parse_config" in text
    parse_src = root.joinpath("vyos_mappers/ssh/config_parse.py").read_text()
    assert "pydantic" not in parse_src
    assert "fastapi" not in parse_src
    assert "routers" not in parse_src


def test_get_config_returns_mapper_parse(monkeypatch):
    tree = _tree()
    expected = get_ssh_mapper("1.5").parse_config(tree)

    async def allow(*_args, **_kwargs):
        return None

    class FakeService:
        def get_version(self):
            return "1.5"

        def get_full_config(self, refresh=False):
            return tree

    monkeypatch.setattr("routers.ssh.ssh.require_read_permission", allow)
    monkeypatch.setattr(
        "routers.ssh.ssh.get_session_vyos_service",
        lambda _req: FakeService(),
    )

    from fastapi import FastAPI
    from fastapi.testclient import TestClient
    from routers.ssh.ssh import router

    app = FastAPI()
    app.include_router(router)
    response = TestClient(app).get("/vyos/ssh/config")
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["ciphers"] == expected["ciphers"]
    assert body["access_control"]["allow_users"] == ["alice", "bob"]
    assert body["dynamic_protection"]["enabled"] is True
    assert body["fido"]["pin_required"] is True
    assert body["disable_password_authentication"] is True
