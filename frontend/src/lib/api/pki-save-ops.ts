/**
 * Pure PKI save ops. Every create and edit in the PKI screens goes through
 * these helpers, which diff the loaded item against the form so an edit only
 * sends what changed:
 *
 * - a text leaf sets when the trimmed value changed and deletes when cleared;
 * - a stored value (certificate, key, DH parameters, shared secret) is left
 *   empty in the form to keep it, sets when text is typed, and deletes when
 *   its remove box is ticked; the config response masks secrets as `***`,
 *   and that mask is never sent;
 * - a `multi:` leaf (CA CRLs, ACME domain names) deletes removed values and
 *   sets added ones, and emptying the list deletes the whole leaf;
 * - turning ACME off deletes the `acme` node; turning it on sets the bare
 *   node first.
 *
 * Item ops go to the batch with the item name; the x509 defaults and
 * delete_pki are global ops sent without one.
 */

import type {
  BatchOperation,
  PKICA,
  PKICertificate,
  PKICertificateACME,
  PKIDH,
  PKIKeyPair,
  PKIOpenSSH,
  PKIOpenVPNSharedSecret,
  PKIX509Defaults,
} from "./pki";

export const MASKED_SECRET = "***";

/** Lab tag syntax for every `pki <kind> <name>` node (same on 1.4 and 1.5). */
export const PKI_NAME_PATTERN = /^[-_a-zA-Z0-9][\w\-.+]*$/;

/** Add-dialog name check; a key in the `shared` namespace of `pki` and `pkiCerts`. */
export function nameProblem(
  name: string,
  existingNames: readonly string[],
): "nameRequired" | "nameInvalid" | "nameExists" | null {
  const value = name.trim();
  if (!value) return "nameRequired";
  if (!PKI_NAME_PATTERN.test(value)) return "nameInvalid";
  if (existingNames.includes(value)) return "nameExists";
  return null;
}

/** A value the edit form does not show (empty = keep, or remove the stored one). */
export interface StoredValue {
  text: string;
  remove: boolean;
}

export const KEEP: StoredValue = { text: "", remove: false };

export function typed(text: string): StoredValue {
  return { text, remove: false };
}

function textLeaf(
  ops: BatchOperation[],
  setOp: string,
  deleteOp: string,
  before: string | null | undefined,
  after: string,
): void {
  const value = after.trim();
  const stored = before ?? "";
  if (value && value !== stored) ops.push({ op: setOp, value });
  else if (!value && stored) ops.push({ op: deleteOp });
}

function storedLeaf(
  ops: BatchOperation[],
  setOp: string,
  deleteOp: string,
  before: string | null | undefined,
  after: StoredValue,
): void {
  if (after.remove && before) {
    ops.push({ op: deleteOp });
    return;
  }
  const value = after.text.trim();
  if (value && value !== MASKED_SECRET) ops.push({ op: setOp, value });
}

function flagLeaf(ops: BatchOperation[], setOp: string, deleteOp: string, before: boolean, after: boolean): void {
  if (after && !before) ops.push({ op: setOp });
  else if (!after && before) ops.push({ op: deleteOp });
}

/** Trimmed, de-duplicated, blank-free list (the order the user typed). */
export function normalizeList(values: string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function multiLeaf(
  ops: BatchOperation[],
  setOp: string,
  deleteOp: string,
  deleteAllOp: string,
  before: string[],
  after: string[],
): void {
  const next = normalizeList(after);
  if (next.length === 0) {
    if (before.length > 0) ops.push({ op: deleteAllOp });
    return;
  }
  for (const value of before) {
    if (!next.includes(value)) ops.push({ op: deleteOp, value });
  }
  for (const value of next) {
    if (!before.includes(value)) ops.push({ op: setOp, value });
  }
}

// ============================================================================
// Certificate Authority
// ============================================================================

export interface CAForm {
  certificate: StoredValue;
  description: string;
  privateKey: StoredValue;
  passwordProtected: boolean;
  crl: string[];
  revoke: boolean;
  systemInstall: boolean;
}

const EMPTY_CA: PKICA = {
  name: "",
  crl: [],
  password_protected: false,
  revoke: false,
  system_install: false,
};

export function caUpdateOps(current: PKICA, form: CAForm): BatchOperation[] {
  const ops: BatchOperation[] = [];
  storedLeaf(ops, "set_ca_certificate", "delete_ca_certificate", current.certificate, form.certificate);
  textLeaf(ops, "set_ca_description", "delete_ca_description", current.description, form.description);
  storedLeaf(ops, "set_ca_private_key", "delete_ca_private_key", current.private_key, form.privateKey);
  flagLeaf(
    ops, "set_ca_private_password_protected", "delete_ca_private_password_protected",
    current.password_protected, form.passwordProtected,
  );
  const storedCrl = current.crl ?? [];
  multiLeaf(ops, "set_ca_crl", "delete_ca_crl", "delete_ca_crl_all", storedCrl, crlValues(storedCrl, form.crl));
  flagLeaf(ops, "set_ca_revoke", "delete_ca_revoke", current.revoke, form.revoke);
  flagLeaf(ops, "set_ca_system_install", "delete_ca_system_install", current.system_install, form.systemInstall);
  return ops;
}

export function caCreateOps(form: CAForm): BatchOperation[] {
  return [{ op: "create_ca" }, ...caUpdateOps(EMPTY_CA, form)];
}

// ============================================================================
// Certificate (manual and ACME)
// ============================================================================

export interface CertificateForm {
  certificate: StoredValue;
  description: string;
  privateKey: StoredValue;
  passwordProtected: boolean;
  revoke: boolean;
  acme: boolean;
  domainNames: string[];
  email: string;
  listenAddress: string;
  rsaKeySize: string;
  url: string;
}

const EMPTY_CERTIFICATE: PKICertificate = {
  name: "",
  password_protected: false,
  revoke: false,
  acme: null,
};

const EMPTY_ACME: PKICertificateACME = { domain_names: [] };

export function certificateUpdateOps(current: PKICertificate, form: CertificateForm): BatchOperation[] {
  const ops: BatchOperation[] = [];
  storedLeaf(ops, "set_certificate_cert", "delete_certificate_cert", current.certificate, form.certificate);
  textLeaf(ops, "set_certificate_description", "delete_certificate_description", current.description, form.description);
  storedLeaf(
    ops, "set_certificate_private_key", "delete_certificate_private_key", current.private_key, form.privateKey,
  );
  flagLeaf(
    ops, "set_certificate_private_password_protected", "delete_certificate_private_password_protected",
    current.password_protected, form.passwordProtected,
  );
  flagLeaf(ops, "set_certificate_revoke", "delete_certificate_revoke", current.revoke, form.revoke);

  const acme = current.acme;
  if (!form.acme) {
    if (acme) ops.push({ op: "delete_certificate_acme" });
    return ops;
  }
  if (!acme) ops.push({ op: "set_certificate_acme" });
  const before = acme ?? EMPTY_ACME;
  multiLeaf(
    ops, "set_certificate_acme_domain_name", "delete_certificate_acme_domain_name",
    "delete_certificate_acme_domain_name_all", before.domain_names ?? [], form.domainNames,
  );
  textLeaf(ops, "set_certificate_acme_email", "delete_certificate_acme_email", before.email, form.email);
  textLeaf(
    ops, "set_certificate_acme_listen_address", "delete_certificate_acme_listen_address",
    before.listen_address, form.listenAddress,
  );
  textLeaf(
    ops, "set_certificate_acme_rsa_key_size", "delete_certificate_acme_rsa_key_size",
    before.rsa_key_size, form.rsaKeySize,
  );
  textLeaf(ops, "set_certificate_acme_url", "delete_certificate_acme_url", before.url, form.url);
  return ops;
}

export function certificateCreateOps(form: CertificateForm): BatchOperation[] {
  return [{ op: "create_certificate" }, ...certificateUpdateOps(EMPTY_CERTIFICATE, form)];
}

/** Backend limits for the generate forms (routers/pki/pki.py MAX_DAYS, MAX_COMMON_NAME). */
export const MAX_DAYS = 36500;
export const MAX_COMMON_NAME = 64;

/** CA and certificate generate check; a key in the `pkiCerts` namespace. */
export function generateSubjectProblem(
  commonName: string,
  days: string,
): "shared.commonNameRequired" | "shared.commonNameTooLong" | "ca.daysPositive" | "ca.daysTooMany" | null {
  if (!commonName.trim()) return "shared.commonNameRequired";
  // Code points, not UTF-16 units, so an emoji or CJK extension character counts once.
  if ([...commonName.trim()].length > MAX_COMMON_NAME) return "shared.commonNameTooLong";
  if (!/^\d+$/.test(days.trim()) || parseInt(days, 10) < 1) return "ca.daysPositive";
  if (parseInt(days, 10) > MAX_DAYS) return "ca.daysTooMany";
  return null;
}

/**
 * ACME create: only the ACME fields. Text typed on the Import tab of the
 * same dialog is not sent.
 */
export function acmeCreateForm(form: CertificateForm): CertificateForm {
  return {
    ...form,
    certificate: KEEP,
    description: "",
    privateKey: KEEP,
    passwordProtected: false,
    revoke: false,
    acme: true,
  };
}

/** Save check for the certificate form; a key in the `pkiCerts` `cert` namespace. */
export function certificateProblem(
  form: CertificateForm,
  listenAddressIpv6: boolean,
): "listenAddressIpv4Only" | null {
  if (form.acme && !listenAddressIpv6 && form.listenAddress.includes(":")) return "listenAddressIpv4Only";
  return null;
}

/** Split a comma- or newline-separated text box into list values. */
export function splitList(text: string): string[] {
  return normalizeList(text.split(/[,\n]/));
}

// A whole armored block; the END label matches BEGIN (as the backend checks).
const PEM_BLOCK = /-----BEGIN ([^\n]*?)-----[\s\S]*?-----END \1-----/g;
const PEM_ARMOR = /-----(?:BEGIN|END) [^\n]*?-----/g;

/** A PEM block's body as the backend stores it: armor, `#` lines and whitespace removed. */
export function pemBody(block: string): string {
  return block
    .replace(PEM_ARMOR, "\n")
    .split(/\r?\n/)
    .filter((line) => !line.trimStart().startsWith("#"))
    .join("")
    .replace(/\s+/g, "");
}

/** openssl header lines around a pasted block; dropped from the CRL box. */
const HEADER_LINE = /^(?:subject=|issuer=|#)/;
const BAG_ATTRIBUTES = /^Bag Attributes\b/;
const INDENTED_ATTRIBUTE = /^\s+\S[^:]*:/;

/**
 * CA CRL text box.
 * - Every matched BEGIN…END block is one value, sent whole with its armor;
 *   the backend picks the `X509 CRL` block and normalizes it.
 * - Every other non-empty line is sent, comma-split, as its own value, except
 *   openssl header shapes: `subject=` / `issuer=` lines, `Bag Attributes` and
 *   the indented `key: value` lines right after it, and `#` lines.
 * - A stray BEGIN or END line outside a matched block is always sent whole,
 *   so the backend rejects it.
 */
export function splitCrlList(text: string): string[] {
  const blocks = (text.match(PEM_BLOCK) ?? []).map((block) => block.trim());
  const values: string[] = [];
  let inBagAttributes = false;
  for (const line of text.replace(PEM_BLOCK, "\n").split(/\r?\n/)) {
    if (inBagAttributes && INDENTED_ATTRIBUTE.test(line)) continue;
    inBagAttributes = false;
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (BAG_ATTRIBUTES.test(trimmed)) {
      inBagAttributes = true;
      continue;
    }
    if (HEADER_LINE.test(trimmed)) continue;
    if (trimmed.includes("-----BEGIN ") || trimmed.includes("-----END ")) {
      values.push(trimmed);
      continue;
    }
    values.push(...trimmed.split(","));
  }
  return normalizeList([...blocks, ...values]);
}

/** A pasted CRL block whose body is already stored counts as that stored value. */
function crlValues(before: string[], after: string[]): string[] {
  return after.map((value) => {
    if (!value.includes("-----BEGIN ")) return value;
    const body = pemBody(value);
    return before.includes(body) ? body : value;
  });
}

// ============================================================================
// Diffie-Hellman, key pairs, OpenSSH, OpenVPN
// ============================================================================

export interface DHForm {
  parameters: StoredValue;
}

export function dhUpdateOps(current: PKIDH, form: DHForm): BatchOperation[] {
  const ops: BatchOperation[] = [];
  storedLeaf(ops, "set_dh_parameters", "delete_dh_parameters", current.parameters, form.parameters);
  return ops;
}

export function dhCreateOps(form: DHForm): BatchOperation[] {
  return [{ op: "create_dh" }, ...dhUpdateOps({ name: "" }, form)];
}

export interface KeyPairForm {
  privateKey: StoredValue;
  publicKey: StoredValue;
  passwordProtected: boolean;
}

export function keyPairUpdateOps(current: PKIKeyPair, form: KeyPairForm): BatchOperation[] {
  const ops: BatchOperation[] = [];
  storedLeaf(ops, "set_key_pair_private_key", "delete_key_pair_private_key", current.private_key, form.privateKey);
  storedLeaf(ops, "set_key_pair_public_key", "delete_key_pair_public_key", current.public_key, form.publicKey);
  flagLeaf(
    ops, "set_key_pair_private_password_protected", "delete_key_pair_private_password_protected",
    current.password_protected, form.passwordProtected,
  );
  return ops;
}

export function keyPairCreateOps(form: KeyPairForm): BatchOperation[] {
  return [{ op: "create_key_pair" }, ...keyPairUpdateOps({ name: "", password_protected: false }, form)];
}

export interface OpenSSHForm {
  privateKey: StoredValue;
  publicKey: StoredValue;
  publicType: string;
  passwordProtected: boolean;
}

export function openSSHUpdateOps(current: PKIOpenSSH, form: OpenSSHForm): BatchOperation[] {
  const ops: BatchOperation[] = [];
  storedLeaf(ops, "set_openssh_private_key", "delete_openssh_private_key", current.private_key, form.privateKey);
  storedLeaf(ops, "set_openssh_public_key", "delete_openssh_public_key", current.public_key, form.publicKey);
  textLeaf(ops, "set_openssh_public_type", "delete_openssh_public_type", current.public_type, form.publicType);
  flagLeaf(
    ops, "set_openssh_private_password_protected", "delete_openssh_private_password_protected",
    current.password_protected, form.passwordProtected,
  );
  return ops;
}

/** The form sets or keeps a public key. */
function hasOpenSSHPublicKey(current: PKIOpenSSH | null, form: OpenSSHForm): boolean {
  const typedKey = !!form.publicKey.text.trim() && form.publicKey.text.trim() !== MASKED_SECRET;
  const keptKey = !!current?.public_key && !form.publicKey.remove;
  return typedKey || keptKey;
}

/**
 * OpenSSH save check: a public key that will be set or kept needs a type;
 * a key in the `pki` `openssh` namespace.
 */
export function openSSHProblem(current: PKIOpenSSH | null, form: OpenSSHForm): "publicTypeRequired" | null {
  if (hasOpenSSHPublicKey(current, form) && !form.publicType.trim()) return "publicTypeRequired";
  return null;
}

/**
 * The form with the public type defaulted to the only value the version
 * offers, and only while a public key is set or kept, so a form with no
 * public key never sends `set_openssh_public_type`.
 */
export function withDefaultPublicType(
  current: PKIOpenSSH | null,
  form: OpenSSHForm,
  publicTypes: readonly string[],
): OpenSSHForm {
  if (form.publicType.trim() || publicTypes.length !== 1 || !hasOpenSSHPublicKey(current, form)) return form;
  return { ...form, publicType: publicTypes[0] };
}

export function openSSHCreateOps(form: OpenSSHForm): BatchOperation[] {
  return [{ op: "create_openssh" }, ...openSSHUpdateOps({ name: "", password_protected: false }, form)];
}

export interface OpenVPNSecretForm {
  key: StoredValue;
  version: string;
}

export function openVPNSecretUpdateOps(current: PKIOpenVPNSharedSecret, form: OpenVPNSecretForm): BatchOperation[] {
  const ops: BatchOperation[] = [];
  storedLeaf(ops, "set_openvpn_shared_secret_key", "delete_openvpn_shared_secret_key", current.key, form.key);
  textLeaf(
    ops, "set_openvpn_shared_secret_version", "delete_openvpn_shared_secret_version", current.version, form.version,
  );
  return ops;
}

export function openVPNSecretCreateOps(form: OpenVPNSecretForm): BatchOperation[] {
  return [{ op: "create_openvpn_shared_secret" }, ...openVPNSecretUpdateOps({ name: "" }, form)];
}

// ============================================================================
// Global: x509 defaults and the whole PKI tree
// ============================================================================

export interface X509DefaultsForm {
  country: string;
  locality: string;
  organization: string;
  state: string;
}

/** `x509 default` exists when the parse returns its keys (an empty object means absent). */
export function x509DefaultsPresent(current: PKIX509Defaults): boolean {
  return Object.keys(current).length > 0;
}

export function x509DefaultsUpdateOps(current: PKIX509Defaults, form: X509DefaultsForm): BatchOperation[] {
  const cleared = !form.country.trim() && !form.locality.trim() && !form.organization.trim() && !form.state.trim();
  if (cleared) return x509DefaultsPresent(current) ? x509DefaultsClearOps() : [];
  const ops: BatchOperation[] = [];
  textLeaf(ops, "set_x509_default_country", "delete_x509_default_country", current.country, form.country);
  textLeaf(ops, "set_x509_default_locality", "delete_x509_default_locality", current.locality, form.locality);
  textLeaf(
    ops, "set_x509_default_organization", "delete_x509_default_organization", current.organization, form.organization,
  );
  textLeaf(ops, "set_x509_default_state", "delete_x509_default_state", current.state, form.state);
  return ops;
}

export function x509DefaultsClearOps(): BatchOperation[] {
  return [{ op: "delete_x509_defaults" }];
}

export function deletePKIOps(): BatchOperation[] {
  return [{ op: "delete_pki" }];
}
