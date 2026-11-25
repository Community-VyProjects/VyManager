import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  KEEP,
  MASKED_SECRET,
  caCreateOps,
  caUpdateOps,
  certificateCreateOps,
  certificateProblem,
  certificateUpdateOps,
  deletePKIOps,
  dhCreateOps,
  dhUpdateOps,
  keyPairCreateOps,
  keyPairUpdateOps,
  openSSHCreateOps,
  openSSHUpdateOps,
  openVPNSecretCreateOps,
  openVPNSecretUpdateOps,
  splitList,
  typed,
  x509DefaultsClearOps,
  x509DefaultsPresent,
  x509DefaultsUpdateOps,
  type CAForm,
  type CertificateForm,
} from "./pki-save-ops";
import { pkiService, type PKICA, type PKICertificate, type BatchOperation } from "./pki";
import { apiClient } from "./client";

const CA: PKICA = {
  name: "CA1",
  certificate: "MIIC",
  crl: ["CRLA", "CRLB"],
  description: "root",
  private_key: MASKED_SECRET,
  password_protected: true,
  revoke: false,
  system_install: true,
};

function caForm(overrides: Partial<CAForm> = {}): CAForm {
  return {
    certificate: KEEP,
    description: "root",
    privateKey: KEEP,
    passwordProtected: true,
    crl: ["CRLA", "CRLB"],
    revoke: false,
    systemInstall: true,
    ...overrides,
  };
}

const ACME_CERT: PKICertificate = {
  name: "LE",
  password_protected: false,
  revoke: false,
  acme: {
    domain_names: ["a.example.com", "b.example.com"],
    email: "admin@example.com",
    listen_address: "192.0.2.1",
    rsa_key_size: "2048",
    url: "https://acme.example.com/dir",
  },
};

function acmeForm(overrides: Partial<CertificateForm> = {}): CertificateForm {
  return {
    certificate: KEEP,
    description: "",
    privateKey: KEEP,
    passwordProtected: false,
    revoke: false,
    acme: true,
    domainNames: ["a.example.com", "b.example.com"],
    email: "admin@example.com",
    listenAddress: "192.0.2.1",
    rsaKeySize: "2048",
    url: "https://acme.example.com/dir",
    ...overrides,
  };
}

describe("CA ops", () => {
  it("an untouched edit sends nothing", () => {
    assert.deepEqual(caUpdateOps(CA, caForm()), []);
  });

  it("diffs CRLs instead of deleting and re-setting them", () => {
    assert.deepEqual(caUpdateOps(CA, caForm({ crl: ["CRLB", " CRLC ", "CRLC"] })), [
      { op: "delete_ca_crl", value: "CRLA" },
      { op: "set_ca_crl", value: "CRLC" },
    ]);
  });

  it("emptying the CRL list deletes every CRL", () => {
    assert.deepEqual(caUpdateOps(CA, caForm({ crl: [] })), [{ op: "delete_ca_crl_all" }]);
    assert.deepEqual(caUpdateOps({ ...CA, crl: [] }, caForm({ crl: [] })), []);
  });

  it("stored values keep, replace, or delete; the mask is never sent", () => {
    assert.deepEqual(caUpdateOps(CA, caForm({ privateKey: typed(MASKED_SECRET) })), []);
    assert.deepEqual(caUpdateOps(CA, caForm({ privateKey: typed(" NEWKEY ") })), [
      { op: "set_ca_private_key", value: "NEWKEY" },
    ]);
    assert.deepEqual(caUpdateOps(CA, caForm({ certificate: { text: "", remove: true } })), [
      { op: "delete_ca_certificate" },
    ]);
    // Nothing stored: remove is a no-op.
    assert.deepEqual(caUpdateOps({ ...CA, private_key: null }, caForm({ privateKey: { text: "", remove: true } })), []);
  });

  it("text and flag leaves set and delete", () => {
    assert.deepEqual(
      caUpdateOps(CA, caForm({ description: "  ", passwordProtected: false, revoke: true, systemInstall: false })),
      [
        { op: "delete_ca_description" },
        { op: "delete_ca_private_password_protected" },
        { op: "set_ca_revoke" },
        { op: "delete_ca_system_install" },
      ],
    );
  });

  it("create sets every filled leaf after create_ca", () => {
    assert.deepEqual(
      caCreateOps({
        certificate: typed("CERT"),
        description: "d",
        privateKey: typed("KEY"),
        passwordProtected: true,
        crl: ["C1"],
        revoke: true,
        systemInstall: true,
      }),
      [
        { op: "create_ca" },
        { op: "set_ca_certificate", value: "CERT" },
        { op: "set_ca_description", value: "d" },
        { op: "set_ca_private_key", value: "KEY" },
        { op: "set_ca_private_password_protected" },
        { op: "set_ca_crl", value: "C1" },
        { op: "set_ca_revoke" },
        { op: "set_ca_system_install" },
      ],
    );
  });
});

describe("certificate ops", () => {
  it("an untouched ACME edit sends nothing", () => {
    assert.deepEqual(certificateUpdateOps(ACME_CERT, acmeForm()), []);
  });

  it("diffs domain names: deletes removed, sets added", () => {
    assert.deepEqual(certificateUpdateOps(ACME_CERT, acmeForm({ domainNames: ["b.example.com", "c.example.com"] })), [
      { op: "delete_certificate_acme_domain_name", value: "a.example.com" },
      { op: "set_certificate_acme_domain_name", value: "c.example.com" },
    ]);
  });

  it("emptying the domain list deletes every domain", () => {
    assert.deepEqual(certificateUpdateOps(ACME_CERT, acmeForm({ domainNames: [] })), [
      { op: "delete_certificate_acme_domain_name_all" },
    ]);
  });

  it("clears ACME leaves one by one", () => {
    assert.deepEqual(
      certificateUpdateOps(ACME_CERT, acmeForm({ email: "", listenAddress: "", rsaKeySize: "", url: "" })),
      [
        { op: "delete_certificate_acme_email" },
        { op: "delete_certificate_acme_listen_address" },
        { op: "delete_certificate_acme_rsa_key_size" },
        { op: "delete_certificate_acme_url" },
      ],
    );
  });

  it("turning ACME off deletes the acme node and nothing under it", () => {
    assert.deepEqual(certificateUpdateOps(ACME_CERT, acmeForm({ acme: false, email: "" })), [
      { op: "delete_certificate_acme" },
    ]);
  });

  it("turning ACME on sets the bare node first", () => {
    const manual: PKICertificate = { name: "WEB", password_protected: false, revoke: false, acme: null };
    assert.deepEqual(
      certificateUpdateOps(manual, acmeForm({ domainNames: ["a.example.com"], listenAddress: "", rsaKeySize: "", url: "" })),
      [
        { op: "set_certificate_acme" },
        { op: "set_certificate_acme_domain_name", value: "a.example.com" },
        { op: "set_certificate_acme_email", value: "admin@example.com" },
      ],
    );
  });

  it("manual create sends no ACME op; ACME create does", () => {
    assert.deepEqual(
      certificateCreateOps(acmeForm({ acme: false, certificate: typed("CERT"), description: "web" })),
      [
        { op: "create_certificate" },
        { op: "set_certificate_cert", value: "CERT" },
        { op: "set_certificate_description", value: "web" },
      ],
    );
    assert.deepEqual(certificateCreateOps(acmeForm({ domainNames: ["a.example.com"], email: "" })).slice(0, 3), [
      { op: "create_certificate" },
      { op: "set_certificate_acme" },
      { op: "set_certificate_acme_domain_name", value: "a.example.com" },
    ]);
  });

  it("stored certificate and key delete when removed", () => {
    const cert: PKICertificate = { ...ACME_CERT, certificate: "CERT", private_key: MASKED_SECRET };
    assert.deepEqual(
      certificateUpdateOps(cert, acmeForm({ certificate: { text: "", remove: true }, privateKey: { text: "", remove: true } })),
      [{ op: "delete_certificate_cert" }, { op: "delete_certificate_private_key" }],
    );
  });

  it("an IPv6 listen address is a save error only where capabilities say IPv4 only", () => {
    const form = acmeForm({ listenAddress: "2001:db8::1" });
    assert.equal(certificateProblem(form, false), "listenAddressIpv4Only");
    assert.equal(certificateProblem(form, true), null);
    assert.equal(certificateProblem({ ...form, acme: false }, false), null);
    assert.equal(certificateProblem(acmeForm(), false), null);
  });

  it("splitList trims, drops blanks and duplicates", () => {
    assert.deepEqual(splitList(" a.example.com, b.example.com,,a.example.com\nc.example.com "), [
      "a.example.com", "b.example.com", "c.example.com",
    ]);
  });
});

describe("DH, key pair, OpenSSH and OpenVPN ops", () => {
  it("DH parameters keep, set, delete", () => {
    assert.deepEqual(dhCreateOps({ parameters: typed("P") }), [
      { op: "create_dh" }, { op: "set_dh_parameters", value: "P" },
    ]);
    assert.deepEqual(dhUpdateOps({ name: "DH1", parameters: MASKED_SECRET }, { parameters: KEEP }), []);
    assert.deepEqual(dhUpdateOps({ name: "DH1", parameters: MASKED_SECRET }, { parameters: { text: "", remove: true } }), [
      { op: "delete_dh_parameters" },
    ]);
  });

  it("key pair leaves", () => {
    assert.deepEqual(
      keyPairCreateOps({ privateKey: typed("PRIV"), publicKey: typed("PUB"), passwordProtected: true }),
      [
        { op: "create_key_pair" },
        { op: "set_key_pair_private_key", value: "PRIV" },
        { op: "set_key_pair_public_key", value: "PUB" },
        { op: "set_key_pair_private_password_protected" },
      ],
    );
    assert.deepEqual(
      keyPairUpdateOps(
        { name: "KP", private_key: MASKED_SECRET, public_key: "PUB", password_protected: true },
        { privateKey: { text: "", remove: true }, publicKey: { text: "", remove: true }, passwordProtected: false },
      ),
      [
        { op: "delete_key_pair_private_key" },
        { op: "delete_key_pair_public_key" },
        { op: "delete_key_pair_private_password_protected" },
      ],
    );
  });

  it("OpenSSH leaves, type from the picker", () => {
    assert.deepEqual(
      openSSHCreateOps({ privateKey: typed("PRIV"), publicKey: typed("PUB"), publicType: "ssh-rsa", passwordProtected: false }),
      [
        { op: "create_openssh" },
        { op: "set_openssh_private_key", value: "PRIV" },
        { op: "set_openssh_public_key", value: "PUB" },
        { op: "set_openssh_public_type", value: "ssh-rsa" },
      ],
    );
    assert.deepEqual(
      openSSHUpdateOps(
        { name: "SSH", private_key: MASKED_SECRET, public_key: "PUB", public_type: "ssh-rsa", password_protected: true },
        { privateKey: { text: "", remove: true }, publicKey: { text: "", remove: true }, publicType: "", passwordProtected: false },
      ),
      [
        { op: "delete_openssh_private_key" },
        { op: "delete_openssh_public_key" },
        { op: "delete_openssh_public_type" },
        { op: "delete_openssh_private_password_protected" },
      ],
    );
  });

  it("OpenVPN shared secret leaves", () => {
    assert.deepEqual(openVPNSecretCreateOps({ key: typed("K"), version: "1" }), [
      { op: "create_openvpn_shared_secret" },
      { op: "set_openvpn_shared_secret_key", value: "K" },
      { op: "set_openvpn_shared_secret_version", value: "1" },
    ]);
    assert.deepEqual(
      openVPNSecretUpdateOps({ name: "OV", key: MASKED_SECRET, version: "1" }, { key: { text: "", remove: true }, version: "" }),
      [{ op: "delete_openvpn_shared_secret_key" }, { op: "delete_openvpn_shared_secret_version" }],
    );
  });
});

describe("global ops", () => {
  const current = { country: "US", locality: null, organization: "Example", state: null };

  it("x509 defaults diff per leaf", () => {
    assert.deepEqual(
      x509DefaultsUpdateOps(current, { country: "DE", locality: "Berlin", organization: "", state: "" }),
      [
        { op: "set_x509_default_country", value: "DE" },
        { op: "set_x509_default_locality", value: "Berlin" },
        { op: "delete_x509_default_organization" },
      ],
    );
  });

  it("clearing every x509 field deletes the section, and only when it exists", () => {
    const cleared = { country: "", locality: "", organization: "", state: "" };
    assert.deepEqual(x509DefaultsUpdateOps(current, cleared), [{ op: "delete_x509_defaults" }]);
    // A bare `x509 default` parses with its keys and still gets the delete.
    assert.deepEqual(
      x509DefaultsUpdateOps({ country: null, locality: null, organization: null, state: null }, cleared),
      [{ op: "delete_x509_defaults" }],
    );
    assert.deepEqual(x509DefaultsUpdateOps({}, cleared), []);
    assert.equal(x509DefaultsPresent({}), false);
    assert.equal(x509DefaultsPresent({ country: null }), true);
  });

  it("clear and delete-all are single global ops", () => {
    assert.deepEqual(x509DefaultsClearOps(), [{ op: "delete_x509_defaults" }]);
    assert.deepEqual(deletePKIOps(), [{ op: "delete_pki" }]);
  });
});

describe("pkiService batch requests", () => {
  async function captured(run: () => Promise<unknown>): Promise<{ endpoint: string; body: unknown }[]> {
    const calls: { endpoint: string; body: unknown }[] = [];
    const original = apiClient.post;
    apiClient.post = (async (endpoint: string, body?: unknown) => {
      calls.push({ endpoint, body });
      return { success: true };
    }) as typeof apiClient.post;
    try {
      await run();
    } finally {
      apiClient.post = original;
    }
    return calls;
  }

  it("global ops are sent without an item_name", async () => {
    const calls = await captured(async () => {
      await pkiService.deleteAllPKI();
      await pkiService.clearX509Defaults();
      await pkiService.updateX509Defaults({}, { country: "US", locality: "", organization: "", state: "" });
    });
    const batches = calls.filter((call) => call.endpoint === "/vyos/pki/batch").map((call) => call.body);
    assert.deepEqual(batches, [
      { operations: [{ op: "delete_pki" }] },
      { operations: [{ op: "delete_x509_defaults" }] },
      { operations: [{ op: "set_x509_default_country", value: "US" }] },
    ]);
  });

  it("item ops carry the item name; an unchanged edit posts nothing", async () => {
    const calls = await captured(async () => {
      await pkiService.updateCertificate("LE", ACME_CERT, acmeForm({ domainNames: ["a.example.com"] }));
      await pkiService.updateCA("CA1", CA, caForm());
    });
    assert.deepEqual(calls.filter((call) => call.endpoint === "/vyos/pki/batch").map((call) => call.body), [
      {
        item_name: "LE",
        operations: [{ op: "delete_certificate_acme_domain_name", value: "b.example.com" }] as BatchOperation[],
      },
    ]);
  });
});
