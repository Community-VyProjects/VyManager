/**
 * An `ipv4net` value the VyOS `ipv4-prefix` validator accepts: four decimal octets
 * (0-255, no leading zeros), a length of 0-32 with no leading zero, and no host bits set.
 */
export function isIPv4Prefix(value: string): boolean {
  const match = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})\/(\d{1,2})$/.exec(value);
  if (!match) return false;
  const parts = match.slice(1);
  if (parts.some((part) => part.length > 1 && part.startsWith("0"))) return false;
  const octets = parts.slice(0, 4).map(Number);
  const length = Number(parts[4]);
  if (octets.some((octet) => octet > 255) || length > 32) return false;
  const ip = octets.reduce((acc, octet) => ((acc << 8) + octet) >>> 0, 0);
  const hostBits = 32 - length;
  const hostMask = hostBits === 0 ? 0 : hostBits === 32 ? 0xffffffff : (2 ** hostBits - 1) >>> 0;
  return ((ip & hostMask) >>> 0) === 0;
}
