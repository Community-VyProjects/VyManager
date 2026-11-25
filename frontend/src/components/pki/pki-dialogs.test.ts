import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const dialogs = readdirSync(here).filter((file) => file.endsWith("Modal.tsx"));
const page = readFileSync(join(here, "../../app/pki/page.tsx"), "utf8");

describe("PKI dialogs", () => {
  it("finds every modal", () => {
    assert.deepEqual(dialogs.sort(), [
      "CAModal.tsx",
      "CertificateModal.tsx",
      "DHModal.tsx",
      "DeletePKIItemModal.tsx",
      "KeyPairModal.tsx",
      "OpenSSHModal.tsx",
      "OpenVPNSecretModal.tsx",
      "X509DefaultsModal.tsx",
    ]);
  });

  for (const file of dialogs) {
    const source = readFileSync(join(here, file), "utf8");

    it(`${file} ignores close while saving`, () => {
      assert.ok(source.includes("if (!next && loading) return;"), file);
      assert.ok(!source.includes("onOpenChange={onOpenChange}"), file);
    });

    it(`${file} shows the API error and checks success`, () => {
      assert.ok(!source.includes("instanceof Error"), file);
      assert.ok(source.includes("(err as ApiError).message ||"), file);
      assert.ok(source.includes("result.success"), file);
    });
  }

  it("the page confirm ignores close while applying and checks success", () => {
    assert.ok(!page.includes("instanceof Error"));
    assert.ok(page.includes("if (!next && confirmSaving) return;"));
    assert.ok(page.includes("result.success"));
  });

  it("delete all PKI shows only when the parse reports pki present", () => {
    assert.ok(page.includes('hasWrite && config?.configured && ('));
    assert.ok(page.includes("pkiService.deleteAllPKI()"));
    assert.ok(page.includes("pkiService.clearX509Defaults()"));
  });

  it("every Add dialog gets the existing names of its kind", () => {
    for (const file of ["CAModal.tsx", "CertificateModal.tsx", "DHModal.tsx", "KeyPairModal.tsx", "OpenSSHModal.tsx", "OpenVPNSecretModal.tsx"]) {
      const source = readFileSync(join(here, file), "utf8");
      assert.equal((source.match(/nameProblem\(/g) ?? []).length, 2, file);
    }
    for (const kind of ["ca", "certificates", "dh", "key_pairs", "openssh", "openvpn_shared_secrets"]) {
      assert.ok(page.includes(`existingNames={(config?.${kind} || []).map((item) => item.name)}`), kind);
    }
  });

  it("country is the shared country picker", () => {
    for (const file of ["CAModal.tsx", "CertificateModal.tsx", "X509DefaultsModal.tsx"]) {
      const source = readFileSync(join(here, file), "utf8");
      assert.ok(source.includes("<CountrySelect"), file);
      assert.ok(!/country-?\w*" value=\{country\} onChange=\{\(e\)/.test(source), file);
    }
  });

  it("the certificate dialog has no edit-mode tab leftovers and checks days", () => {
    const cert = readFileSync(join(here, "CertificateModal.tsx"), "utf8");
    assert.ok(!cert.includes("effectiveMode"));
    assert.ok(!cert.includes('setMode(acme ? "acme" : "manual")'));
    assert.ok(cert.includes("acmeCreateForm(entered)"));
    assert.ok(cert.includes('setError(t("ca.daysPositive"))'));
  });

  it("value lists come from capabilities with no hardcoded fallback", () => {
    const cert = readFileSync(join(here, "CertificateModal.tsx"), "utf8");
    const ssh = readFileSync(join(here, "OpenSSHModal.tsx"), "utf8");
    assert.ok(cert.includes("capabilities ? capabilities.features.acme.rsa_key_sizes : []"));
    assert.ok(cert.includes("capabilities ? capabilities.features.acme.listen_address_ipv6 : false"));
    assert.ok(!cert.includes("listen_address_ipv6 ??"));
    assert.ok(ssh.includes("capabilities ? capabilities.features.openssh.public_types : []"));
    assert.ok(!ssh.includes('<SelectItem value="ssh-rsa">'));
  });
});
