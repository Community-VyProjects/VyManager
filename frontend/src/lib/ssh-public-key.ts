/** Split an OpenSSH public key into type and key material for VyOS set. */
export function opensshPublicKeyParts(
  pub: string,
): { type: string; data: string } | null {
  const parts = pub.trim().split(/\s+/);
  if (parts.length < 2 || !parts[0] || !parts[1]) {
    return null;
  }
  return { type: parts[0], data: parts[1] };
}
