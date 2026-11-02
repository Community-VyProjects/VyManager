/** Address-family tokens the BGP capabilities list sends.

`address_family_types.global` uses hyphens (`ipv4-unicast`, `l2vpn-evpn`).
The catalog key is that token. An underscore form is a different string and
must not match.
 */

export const AFI_NAME_KEYS = [
  "ipv4-unicast",
  "ipv6-unicast",
  "ipv4-multicast",
  "ipv6-multicast",
  "ipv4-labeled-unicast",
  "ipv6-labeled-unicast",
  "ipv4-vpn",
  "ipv6-vpn",
  "ipv4-flowspec",
  "ipv6-flowspec",
  "l2vpn-evpn",
] as const;

export type AfiNameKey = (typeof AFI_NAME_KEYS)[number];

export function afiNameKey(afi: string): AfiNameKey | null {
  return (AFI_NAME_KEYS as readonly string[]).includes(afi) ? (afi as AfiNameKey) : null;
}

/** Heading used before these names moved into the catalog. Unknown tokens still use it. */
export function formatUnknownAfi(afi: string): string {
  return afi.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
