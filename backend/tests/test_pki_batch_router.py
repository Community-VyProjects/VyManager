"""PKI routes driven through the handlers with a stub service.

execute_batch, get_full_config and the op-mode generate run through
run_in_threadpool (locked in test_batch_off_event_loop.py). These tests check
the parsed config, the emitted ops, the 400/500 paths, and that every route
passes a session lookup's HTTPException through.
"""

import datetime
from types import SimpleNamespace

import pytest
from cryptography import x509
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import rsa
from cryptography.x509.oid import NameOID
from fastapi import FastAPI, HTTPException
from fastapi.testclient import TestClient

MODULE = "routers.pki.pki"
ROLLING = "2026.09.23-0027-rolling"


def _b64(pem: bytes) -> str:
    lines = pem.decode().strip().splitlines()
    return "".join(line for line in lines if not line.startswith("-----"))


def _signing_ca():
    key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    name = x509.Name([x509.NameAttribute(NameOID.COMMON_NAME, "lab-ca")])
    now = datetime.datetime.now(datetime.timezone.utc)
    cert = (
        x509.CertificateBuilder()
        .subject_name(name)
        .issuer_name(name)
        .public_key(key.public_key())
        .serial_number(x509.random_serial_number())
        .not_valid_before(now)
        .not_valid_after(now + datetime.timedelta(days=1))
        .add_extension(x509.BasicConstraints(ca=True, path_length=None), critical=True)
        .sign(key, hashes.SHA256())
    )
    key_pem = key.private_bytes(
        serialization.Encoding.PEM, serialization.PrivateFormat.PKCS8, serialization.NoEncryption(),
    )
    return _b64(cert.public_bytes(serialization.Encoding.PEM)), _b64(key_pem)


CA_CERT, CA_KEY = _signing_ca()

FULL_TREE = {
    "pki": {
        "ca": {
            "CA1": {
                "certificate": CA_CERT,
                "crl": ["CRLA", "CRLB"],
                "description": "root",
                "private": {"key": CA_KEY},
                "system-install": {},
            },
            "LOCKED": {"certificate": "MIIC", "private": {"key": "ENC", "password-protected": {}}, "revoke": {}},
        },
        "certificate": {
            "WEB": {"certificate": "CERT", "private": {"key": "WEBKEY"}, "description": "web"},
            "LE": {"acme": {
                "domain-name": "vpn.example.com",
                "email": "admin@example.com",
                "listen-address": "192.0.2.1",
                "rsa-key-size": "2048",
                "url": "https://acme.example.com/dir",
            }},
        },
        "dh": {"DH1": {"parameters": "DHPARAMS"}},
        "key-pair": {"KP1": {"private": {"key": "KPPRIV"}, "public": {"key": "KPPUB"}}},
        "openssh": {"SSH1": {"private": {"key": "SSHPRIV", "password-protected": {}}, "public": {"key": "SSHPUB", "type": "ssh-rsa"}}},
        "openvpn": {"shared-secret": {"OVPN1": {"key": "OVPNKEY", "version": "1"}}},
        "x509": {"default": {"country": "US", "organization": "Example"}},
    }
}


OPENVPN_LINES = [
    "e4b8f6a1c2d3e4f5a6b7c8d9e0f1a2b3",
    "0f1e2d3c4b5a69788796a5b4c3d2e1f0",
    "1234567890abcdef1234567890abcdef",
]
OPENVPN_OUTPUT = "\n".join([
    "#",
    "# 2048 bit OpenVPN static key",
    "#",
    "-----BEGIN OpenVPN Static key V1-----",
    *OPENVPN_LINES,
    "-----END OpenVPN Static key V1-----",
    "",
])


def pki_client(monkeypatch, version, commit, full_config=None):
    """Return (client, executed, generated); executed holds one [(op, path), ...] per commit.

    ``commit`` may carry ``generate_result`` (the op-mode text) and
    ``generate_status`` / ``generate_error`` for the op-mode reply.
    """
    executed = []
    generated = []

    async def allow(*_args, **_kwargs):
        return None

    class Device:
        def generate(self, path):
            generated.append(path)
            return SimpleNamespace(
                status=commit.get("generate_status", 200),
                result=commit.get("generate_result", OPENVPN_OUTPUT),
                error=commit.get("generate_error"),
            )

    class Service:
        device = Device()

        def get_version(self):
            return version

        def get_full_config(self, refresh=False):
            return full_config if full_config is not None else {}

        def execute_batch(self, batch):
            if batch.is_empty():
                raise ValueError("Cannot execute empty batch")
            executed.append([(item["op"], item["path"]) for item in batch.get_operations()])
            return SimpleNamespace(status=commit["status"], result="", error=commit["error"])

    monkeypatch.setattr(f"{MODULE}.require_read_permission", allow)
    monkeypatch.setattr(f"{MODULE}.require_write_permission", allow)
    monkeypatch.setattr(f"{MODULE}.get_session_vyos_service", lambda _req: Service())

    router = __import__(MODULE, fromlist=["router"]).router
    app = FastAPI()
    app.include_router(router)
    return TestClient(app, raise_server_exceptions=False), executed, generated


@pytest.fixture
def commit():
    return {"status": 200, "error": None}


@pytest.fixture
def client(monkeypatch, commit):
    return pki_client(monkeypatch, ROLLING, commit, full_config=FULL_TREE)


@pytest.fixture
def client_14(monkeypatch, commit):
    return pki_client(monkeypatch, "1.4.3", commit, full_config=FULL_TREE)


def _batch(test_client, operations, item_name=None):
    body = {"operations": operations}
    if item_name is not None:
        body["item_name"] = item_name
    return test_client.post("/vyos/pki/batch", json=body)


# ---------------------------------------------------------------- config


def test_config_masks_secrets_and_lists_every_item(client):
    test_client, _executed, _generated = client
    resp = test_client.get("/vyos/pki/config")
    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert data["configured"] is True
    ca1, locked = data["ca"]
    assert ca1 == {
        "name": "CA1", "certificate": CA_CERT, "crl": ["CRLA", "CRLB"], "description": "root",
        "private_key": "***", "password_protected": False, "revoke": False, "system_install": True,
    }
    assert (locked["password_protected"], locked["revoke"]) == (True, True)
    web, le = data["certificates"]
    assert web["private_key"] == "***" and web["acme"] is None
    assert le["acme"] == {
        "domain_names": ["vpn.example.com"], "email": "admin@example.com", "listen_address": "192.0.2.1",
        "rsa_key_size": "2048", "url": "https://acme.example.com/dir",
    }
    assert le["private_key"] is None
    assert data["dh"] == [{"name": "DH1", "parameters": "***"}]
    assert data["key_pairs"] == [{"name": "KP1", "private_key": "***", "password_protected": False, "public_key": "KPPUB"}]
    assert data["openssh"] == [{
        "name": "SSH1", "private_key": "***", "password_protected": True, "public_key": "SSHPUB", "public_type": "ssh-rsa",
    }]
    assert data["openvpn_shared_secrets"] == [{"name": "OVPN1", "key": "***", "version": "1"}]
    assert data["x509_defaults"] == {"country": "US", "locality": None, "organization": "Example", "state": None}
    assert data["totals"] == {
        "ca": 2, "certificates": 2, "dh": 1, "key_pairs": 1, "openssh": 1, "openvpn_shared_secrets": 1,
    }
    assert "KPPRIV" not in resp.text and "OVPNKEY" not in resp.text and CA_KEY not in resp.text


def test_config_without_pki_is_the_same_shape_unconfigured(monkeypatch, commit):
    test_client, _executed, _generated = pki_client(monkeypatch, ROLLING, commit, full_config={"interfaces": {}})
    data = test_client.get("/vyos/pki/config").json()
    assert data == {
        "configured": False, "ca": [], "certificates": [], "dh": [], "key_pairs": [], "openssh": [],
        "openvpn_shared_secrets": [], "x509_defaults": {},
        "totals": {"ca": 0, "certificates": 0, "dh": 0, "key_pairs": 0, "openssh": 0, "openvpn_shared_secrets": 0},
    }


def test_bare_pki_root_is_configured(monkeypatch, commit):
    """`pki {}` still exists, so the page offers its delete."""
    test_client, _executed, _generated = pki_client(
        monkeypatch, ROLLING, commit, full_config={"pki": {"x509": {"default": {}}}},
    )
    data = test_client.get("/vyos/pki/config").json()
    assert data["configured"] is True
    # A bare `x509 default` is present by key membership.
    assert data["x509_defaults"] == {"country": None, "locality": None, "organization": None, "state": None}


# ---------------------------------------------------------------- reveal


@pytest.mark.parametrize(
    "item_type,item_name,field,value",
    [
        ("ca", "CA1", "private_key", CA_KEY),
        ("certificate", "WEB", "private_key", "WEBKEY"),
        ("dh", "DH1", "parameters", "DHPARAMS"),
        ("key_pair", "KP1", "private_key", "KPPRIV"),
        ("openvpn", "OVPN1", "key", "OVPNKEY"),
        ("certificate", "LE", "private_key", None),
    ],
)
def test_reveal_returns_the_raw_value(client, item_type, item_name, field, value):
    test_client, _executed, _generated = client
    resp = test_client.post("/vyos/pki/reveal", json={"item_type": item_type, "item_name": item_name, "field": field})
    assert resp.status_code == 200, resp.text
    assert resp.json() == {"value": value}


@pytest.mark.parametrize(
    "body,status",
    [
        ({"item_type": "x509", "item_name": "CA1", "field": "key"}, 400),
        ({"item_type": "dh", "item_name": "DH1", "field": "private_key"}, 400),
        ({"item_type": "ca", "item_name": "NOPE", "field": "private_key"}, 404),
        # Only masked fields are revealable; these are in GET /config already.
        ({"item_type": "ca", "item_name": "CA1", "field": "crl"}, 400),
        ({"item_type": "ca", "item_name": "CA1", "field": "certificate"}, 400),
        ({"item_type": "key_pair", "item_name": "KP1", "field": "public_key"}, 400),
        ({"item_type": "openssh", "item_name": "SSH1", "field": "public_key"}, 400),
    ],
)
def test_reveal_rejects_unknown_kind_field_or_item(client, body, status):
    test_client, _executed, _generated = client
    assert test_client.post("/vyos/pki/reveal", json=body).status_code == status


# ---------------------------------------------------------------- batch


def test_item_ops_bind_item_name_and_normalize_pem(client):
    test_client, executed, _generated = client
    pem = "-----BEGIN CERTIFICATE-----\nMIIB\nkTCC\n-----END CERTIFICATE-----\n"
    resp = _batch(test_client, [
        {"op": "create_ca", "value": None},
        {"op": "set_ca_certificate", "value": pem},
        {"op": "set_ca_description", "value": "a | b, c"},
        {"op": "set_ca_crl", "value": "CRLC"},
        {"op": "delete_ca_crl", "value": "CRLA"},
        {"op": "delete_ca_crl_all"},
    ], item_name="CA2")
    assert resp.json() == {"success": True, "data": {"message": "PKI configuration updated"}, "error": None}
    assert executed == [[
        ("set", ["pki", "ca", "CA2"]),
        ("set", ["pki", "ca", "CA2", "certificate", "MIIBkTCC"]),
        # One value parameter: '|' and ',' stay inside the value.
        ("set", ["pki", "ca", "CA2", "description", "a | b, c"]),
        ("set", ["pki", "ca", "CA2", "crl", "CRLC"]),
        ("delete", ["pki", "ca", "CA2", "crl", "CRLA"]),
        ("delete", ["pki", "ca", "CA2", "crl"]),
    ]]


def test_acme_ops_reach_the_device(client):
    test_client, executed, _generated = client
    resp = _batch(test_client, [
        {"op": "delete_certificate_acme_domain_name", "value": "old.example.com"},
        {"op": "set_certificate_acme_domain_name", "value": "new.example.com"},
        {"op": "set_certificate_acme_listen_address", "value": "2001:db8::1"},
        {"op": "set_certificate_acme_rsa_key_size", "value": "4096"},
        {"op": "delete_certificate_acme"},
    ], item_name="LE")
    assert resp.json()["success"] is True
    base = ["pki", "certificate", "LE", "acme"]
    assert executed == [[
        ("delete", base + ["domain-name", "old.example.com"]),
        ("set", base + ["domain-name", "new.example.com"]),
        ("set", base + ["listen-address", "2001:db8::1"]),
        ("set", base + ["rsa-key-size", "4096"]),
        ("delete", base),
    ]]


def test_global_ops_take_no_item_name(client):
    test_client, executed, _generated = client
    resp = _batch(test_client, [
        {"op": "set_x509_default_country", "value": "DE"},
        {"op": "set_x509_default_organization", "value": "Example, Inc."},
        {"op": "delete_x509_default_state"},
        {"op": "delete_x509_defaults"},
        {"op": "delete_pki"},
    ])
    assert resp.json()["success"] is True
    assert executed == [[
        ("set", ["pki", "x509", "default", "country", "DE"]),
        ("set", ["pki", "x509", "default", "organization", "Example, Inc."]),
        ("delete", ["pki", "x509", "default", "state"]),
        ("delete", ["pki", "x509", "default"]),
        ("delete", ["pki"]),
    ]]


@pytest.mark.parametrize(
    "operations,item_name,status",
    [
        # item op without item_name
        ([{"op": "create_ca"}], None, 400),
        # global op with an item_name
        ([{"op": "delete_pki"}], "pki", 400),
        ([{"op": "set_x509_default_country", "value": "US"}], "pki", 400),
        # missing / empty / blank value
        ([{"op": "set_ca_description"}], "CA1", 400),
        ([{"op": "set_ca_description", "value": ""}], "CA1", 400),
        ([{"op": "set_ca_description", "value": "   "}], "CA1", 400),
        ([{"op": "set_x509_default_country"}], None, 400),
        ([{"op": "set_x509_default_country", "value": ""}], None, 400),
        ([{"op": "set_x509_default_country", "value": "   "}], None, 400),
        # value on a valueless op
        ([{"op": "delete_ca", "value": "x"}], "CA1", 400),
        ([{"op": "delete_pki", "value": "x"}], None, 400),
        # unknown and internal methods
        ([{"op": "no_such_op"}], "CA1", 400),
        ([{"op": "add_set", "value": "x"}], "CA1", 400),
        ([{"op": "get_capabilities"}], None, 400),
        ([{"op": "_mapper"}], None, 400),
        ([{"op": "clear"}], None, 400),
        # builder ValueError: value outside the lab list
        ([{"op": "set_certificate_acme_rsa_key_size", "value": "1024"}], "LE", 400),
        ([{"op": "set_openssh_public_type", "value": "ssh-ed25519"}], "SSH1", 400),
    ],
)
def test_bad_requests_are_400_and_send_nothing(client, operations, item_name, status):
    test_client, executed, _generated = client
    resp = _batch(test_client, operations, item_name=item_name)
    assert resp.status_code == status, resp.text
    assert executed == []


@pytest.mark.parametrize("item_name", ["", "   "])
def test_blank_item_name_is_422(client, item_name):
    test_client, executed, _generated = client
    resp = test_client.post("/vyos/pki/batch", json={"item_name": item_name, "operations": [{"op": "create_ca"}]})
    assert resp.status_code == 422
    assert executed == []


def test_ipv6_listen_address_is_400_on_1_4(client_14):
    test_client, executed, _generated = client_14
    resp = _batch(test_client, [{"op": "set_certificate_acme_listen_address", "value": "2001:db8::1"}], item_name="LE")
    assert resp.status_code == 400
    assert "IPv4" in resp.json()["detail"]
    assert executed == []
    ok = _batch(test_client, [{"op": "set_certificate_acme_listen_address", "value": "192.0.2.1"}], item_name="LE")
    assert ok.json()["success"] is True


def test_failed_commit_reports_the_error(client, commit):
    test_client, _executed, _generated = client
    commit.update(status=400, error="Commit failed: CA1 in use")
    resp = _batch(test_client, [{"op": "delete_ca"}], item_name="CA1")
    assert resp.status_code == 200
    assert resp.json() == {"success": False, "data": None, "error": "Commit failed: CA1 in use"}


def test_status_200_with_error_text_is_a_failure(client, commit):
    test_client, _executed, _generated = client
    commit.update(status=200, error="Warning: nothing applied")
    resp = _batch(test_client, [{"op": "delete_pki"}])
    assert resp.json() == {"success": False, "data": None, "error": "Warning: nothing applied"}


def test_empty_batch_succeeds_without_the_device(client):
    test_client, executed, _generated = client
    resp = _batch(test_client, [])
    assert resp.json() == {"success": True, "data": {"message": "No operations to execute"}, "error": None}
    assert executed == []


# ---------------------------------------------------------------- generate


def test_generate_certificate_signs_with_the_raw_ca_key(client):
    """The config parse masks the CA key; signing reads it unmasked."""
    test_client, executed, _generated = client
    resp = test_client.post("/vyos/pki/generate-certificate", json={
        "name": "SRV", "ca_name": "CA1", "common_name": "srv.example.com", "subject_alt_names": ["192.0.2.1"],
    })
    assert resp.status_code == 200, resp.text
    assert resp.json()["success"] is True
    (ops,) = executed
    assert [(op, path[:4]) for op, path in ops] == [
        ("set", ["pki", "certificate", "SRV"]),
        ("set", ["pki", "certificate", "SRV", "certificate"]),
        ("set", ["pki", "certificate", "SRV", "private"]),
    ]


@pytest.mark.parametrize("ca_name,status", [("NOPE", 404), ("LOCKED", 400)])
def test_generate_certificate_needs_a_usable_ca(client, ca_name, status):
    test_client, executed, _generated = client
    resp = test_client.post("/vyos/pki/generate-certificate", json={
        "name": "SRV", "ca_name": ca_name, "common_name": "srv.example.com",
    })
    assert resp.status_code == status
    assert executed == []


def test_generate_openvpn_secret_writes_the_parsed_key(client):
    """No `install`, no name on the op-mode path; key and header version go through the builder."""
    test_client, executed, generated = client
    resp = test_client.post("/vyos/pki/generate-openvpn-shared-secret", json={"name": "OV2"})
    assert resp.json()["success"] is True, resp.text
    assert generated == [["pki", "openvpn", "shared-secret"]]
    base = ["pki", "openvpn", "shared-secret", "OV2"]
    assert executed == [[
        ("set", base),
        ("set", base + ["key", "".join(OPENVPN_LINES)]),
        ("set", base + ["version", "1"]),
    ]]


def test_generate_openvpn_secret_version_comes_from_the_block_header(client, commit):
    test_client, executed, _generated = client
    commit["generate_result"] = OPENVPN_OUTPUT.replace("Static key V1", "Static key V2")
    resp = test_client.post("/vyos/pki/generate-openvpn-shared-secret", json={"name": "OV2"})
    assert resp.json()["success"] is True
    assert executed[0][-1] == ("set", ["pki", "openvpn", "shared-secret", "OV2", "version", "2"])


def test_generate_openvpn_secret_request_has_no_version_field():
    from routers.pki.pki import GenerateOpenVPNSecretRequest

    assert set(GenerateOpenVPNSecretRequest.model_fields) == {"name"}


@pytest.mark.parametrize("header", ["V1-----\nAAAA\n-----END OpenVPN Static key V2", "V-----\nAAAA\n-----END OpenVPN Static key V"])
def test_generate_openvpn_secret_needs_a_matching_versioned_block(client, commit, header):
    test_client, executed, _generated = client
    commit["generate_result"] = f"-----BEGIN OpenVPN Static key {header}-----\n"
    resp = test_client.post("/vyos/pki/generate-openvpn-shared-secret", json={"name": "OV2"})
    assert resp.json()["error"] == "VyOS returned no OpenVPN static key"
    assert executed == []


@pytest.mark.parametrize("result", ["", "no key here", None, "-----BEGIN OpenVPN Static key V1-----\n"])
def test_generate_openvpn_secret_without_a_key_block_fails(client, commit, result):
    test_client, executed, _generated = client
    commit["generate_result"] = result
    resp = test_client.post("/vyos/pki/generate-openvpn-shared-secret", json={"name": "OV2"})
    assert resp.json() == {"success": False, "data": None, "error": "VyOS returned no OpenVPN static key"}
    assert executed == []


def test_generate_openvpn_secret_op_mode_failure(client, commit):
    test_client, executed, _generated = client
    commit.update(generate_status=400, generate_error="generate failed")
    resp = test_client.post("/vyos/pki/generate-openvpn-shared-secret", json={"name": "OV2"})
    assert resp.json() == {"success": False, "data": None, "error": "generate failed"}
    assert executed == []


def test_generate_openvpn_secret_failed_commit(client, commit):
    test_client, _executed, _generated = client
    commit.update(status=400, error="Commit failed")
    resp = test_client.post("/vyos/pki/generate-openvpn-shared-secret", json={"name": "OV2"})
    assert resp.json() == {"success": False, "data": None, "error": "Commit failed"}


# Fast, valid bodies for every generate route (name filled in per test).
GENERATE = {
    "/vyos/pki/generate-ca": ("ca", {"common_name": "ca", "key_type": "ec", "key_size": 256}),
    "/vyos/pki/generate-key-pair": ("key_pair", {"key_type": "ec", "key_size": 256}),
    "/vyos/pki/generate-dh": ("dh", {"key_size": 2048}),
    "/vyos/pki/generate-certificate": ("certificate", {"ca_name": "CA1", "common_name": "c", "key_type": "ec", "key_size": 256}),
    "/vyos/pki/generate-openvpn-shared-secret": ("openvpn", {}),
    "/vyos/pki/generate-openssh": ("openssh", {}),
}
EXISTING = {"ca": "CA1", "key_pair": "KP1", "dh": "DH1", "certificate": "WEB", "openvpn": "OVPN1", "openssh": "SSH1"}


@pytest.mark.parametrize("path", list(GENERATE))
def test_generate_existing_name_is_409(client, path):
    test_client, executed, generated = client
    kind, body = GENERATE[path]
    resp = test_client.post(path, json={**body, "name": EXISTING[kind]})
    assert resp.status_code == 409, resp.text
    assert executed == [] and generated == []


@pytest.mark.parametrize("path", list(GENERATE))
@pytest.mark.parametrize("name", ["", "   ", ".dot", "a b", "a/b", "a;rm", "\u00e9t\u00e9"])
def test_generate_invalid_name_is_422(client, path, name):
    test_client, executed, generated = client
    resp = test_client.post(path, json={**GENERATE[path][1], "name": name})
    assert resp.status_code == 422
    assert executed == [] and generated == []


@pytest.mark.parametrize("name", ["a", "-a", "_a", "9", "a.b+c-d_e"])
def test_lab_tag_names_are_accepted(client, name):
    test_client, executed, _generated = client
    resp = test_client.post("/vyos/pki/generate-key-pair", json={"name": name, "key_type": "ec", "key_size": 256})
    assert resp.json()["success"] is True
    assert executed[0][0] == ("set", ["pki", "key-pair", name])


@pytest.mark.parametrize("item_name", [".x", "a b", "a,b"])
def test_batch_item_name_follows_the_lab_tag(client, item_name):
    test_client, executed, _generated = client
    resp = test_client.post("/vyos/pki/batch", json={"item_name": item_name, "operations": [{"op": "create_ca"}]})
    assert resp.status_code == 422
    assert executed == []


@pytest.mark.parametrize("path", ["/vyos/pki/generate-ca", "/vyos/pki/generate-certificate"])
@pytest.mark.parametrize(
    "overrides,detail",
    [
        ({"days": 0}, "days must be between 1 and 36500"),
        ({"days": 36501}, "days must be between 1 and 36500"),
        ({"country": "USA"}, "country must be a 2-letter code"),
        ({"country": "U1"}, "country must be a 2-letter code"),
        ({"common_name": ""}, "common_name must be 1 to 64 characters"),
        ({"common_name": "   "}, "common_name must be 1 to 64 characters"),
        ({"common_name": "x" * 65}, "common_name must be 1 to 64 characters"),
    ],
)
def test_subject_is_validated_up_front(client, path, overrides, detail):
    test_client, executed, _generated = client
    resp = test_client.post(path, json={**GENERATE[path][1], "name": "NEW", **overrides})
    assert resp.status_code == 400
    assert resp.json()["detail"] == detail
    assert executed == []


def test_subject_edges_are_accepted(client):
    test_client, executed, _generated = client
    resp = test_client.post("/vyos/pki/generate-ca", json={
        **GENERATE["/vyos/pki/generate-ca"][1], "name": "NEW", "days": 36500, "country": "de", "common_name": "x" * 64,
    })
    assert resp.json()["success"] is True, resp.text
    assert len(executed) == 1


@pytest.mark.parametrize(
    "ca,detail",
    [
        ({"certificate": "bm90IGEgY2VydA==", "private": {"key": CA_KEY}}, "CA 'BAD' certificate cannot be loaded"),
        ({"certificate": CA_CERT, "private": {"key": "bm90IGEga2V5"}}, "CA 'BAD' private key cannot be loaded"),
    ],
)
def test_unloadable_ca_is_400_naming_the_ca(monkeypatch, commit, ca, detail):
    tree = {"pki": {**FULL_TREE["pki"], "ca": {**FULL_TREE["pki"]["ca"], "BAD": ca}}}
    test_client, executed, _generated = pki_client(monkeypatch, ROLLING, commit, full_config=tree)
    resp = test_client.post("/vyos/pki/generate-certificate", json={
        **GENERATE["/vyos/pki/generate-certificate"][1], "name": "NEW", "ca_name": "BAD",
    })
    assert resp.status_code == 400
    assert resp.json()["detail"] == detail
    assert executed == []


def test_generate_openssh_failed_commit_returns_its_error_without_cleanup(client, commit):
    test_client, executed, _generated = client
    commit.update(status=400, error="Commit failed: bad key")
    resp = test_client.post("/vyos/pki/generate-openssh", json={"name": "SSH9"})
    assert resp.json() == {"success": False, "data": None, "error": "Commit failed: bad key"}
    # One commit attempt; no delete_openssh afterwards.
    assert len(executed) == 1
    assert all(op == "set" for op, _path in executed[0])


def test_generate_openssh_stores_the_base64_public_key(client):
    test_client, executed, _generated = client
    resp = test_client.post("/vyos/pki/generate-openssh", json={"name": "SSH9"})
    assert resp.json()["success"] is True
    by_leaf = {tuple(path[3:5]): path for _op, path in executed[0] if len(path) > 5}
    assert by_leaf[("public", "type")][-1] == "ssh-rsa"
    public = by_leaf[("public", "key")][-1]
    assert " " not in public and public.startswith("AAAAB3NzaC1yc2E")


@pytest.mark.parametrize(
    "value,stored",
    [
        ("ssh-rsa AAAAB3NzaC1yc2EAAAADAQAB user@host", "AAAAB3NzaC1yc2EAAAADAQAB"),
        ("ssh-rsa AAAAB3NzaC1yc2EAAAADAQAB", "AAAAB3NzaC1yc2EAAAADAQAB"),
        ("  AAAAB3NzaC1yc2EAAAADAQAB  ", "AAAAB3NzaC1yc2EAAAADAQAB"),
    ],
)
def test_openssh_public_key_line_is_stored_as_its_base64(client, value, stored):
    test_client, executed, _generated = client
    resp = _batch(test_client, [{"op": "set_openssh_public_key", "value": value}], item_name="SSH1")
    assert resp.json()["success"] is True
    assert executed == [[("set", ["pki", "openssh", "SSH1", "public", "key", stored])]]


def test_openvpn_key_import_strips_the_mixed_case_armor(client):
    test_client, executed, _generated = client
    block = OPENVPN_OUTPUT[OPENVPN_OUTPUT.index("-----BEGIN"):]
    resp = _batch(test_client, [{"op": "set_openvpn_shared_secret_key", "value": block}], item_name="OVPN2")
    assert resp.json()["success"] is True
    assert executed == [[("set", ["pki", "openvpn", "shared-secret", "OVPN2", "key", "".join(OPENVPN_LINES)])]]


# ---------------------------------------------------------------- passthrough


ROUTES = [
    ("get", "/vyos/pki/capabilities", None),
    ("get", "/vyos/pki/config", None),
    ("post", "/vyos/pki/reveal", {"item_type": "ca", "item_name": "CA1", "field": "private_key"}),
    ("post", "/vyos/pki/batch", {"operations": [{"op": "delete_pki"}]}),
    ("post", "/vyos/pki/generate-ca", {"name": "CA9", "common_name": "ca"}),
    ("post", "/vyos/pki/generate-key-pair", {"name": "KP9"}),
    ("post", "/vyos/pki/generate-dh", {"name": "DH9", "key_size": 2048}),
    ("post", "/vyos/pki/generate-certificate", {"name": "C9", "ca_name": "CA1", "common_name": "c"}),
    ("post", "/vyos/pki/generate-openvpn-shared-secret", {"name": "OV9"}),
    ("post", "/vyos/pki/generate-openssh", {"name": "SSH9"}),
]


def test_routes_list_is_complete():
    router = __import__(MODULE, fromlist=["router"]).router
    assert {route.path for route in router.routes} == {path for _method, path, _body in ROUTES}


@pytest.mark.parametrize("method,path,body", ROUTES, ids=[row[1] for row in ROUTES])
def test_session_http_exception_passes_through(monkeypatch, client, method, path, body):
    test_client, _executed, _generated = client

    def deny(_req):
        raise HTTPException(status_code=400, detail="No active VyOS session")

    # The session resolves before any key generation: a slow generator never runs.
    monkeypatch.setattr(f"{MODULE}.dh.generate_parameters", _must_not_run)
    monkeypatch.setattr(f"{MODULE}.rsa.generate_private_key", _must_not_run)
    monkeypatch.setattr(f"{MODULE}.get_session_vyos_service", deny)
    kwargs = {"json": body} if body is not None else {}
    resp = getattr(test_client, method)(path, **kwargs)
    assert resp.status_code == 400
    assert resp.json()["detail"] == "No active VyOS session"


def _must_not_run(*_args, **_kwargs):
    raise AssertionError("key generation ran before the session lookup")
