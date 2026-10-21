/** Resolved addresses from the dynamic DNS cache, joined to configured hostnames. */

export interface DnsDynamicHostStatus {
  host: string;
  ipv4?: string | null;
  ipv6?: string | null;
  status_ipv4?: string | null;
  status_ipv6?: string | null;
}

export interface ResolvedAddress {
  host: string;
  ip: string;
  status?: string | null;
}

/** Addresses ddclient last published for this entry's hostnames.

The cache is keyed by hostname, not by the service name. Comparison is
case-insensitive. Empty address fields are not a resolved IP.
*/
export function resolvedAddresses(
  hostnames: string[],
  hosts: DnsDynamicHostStatus[],
): ResolvedAddress[] {
  const byHost = new Map(hosts.map((host) => [host.host.toLowerCase(), host]));
  const seen = new Set<string>();
  const rows: ResolvedAddress[] = [];
  for (const name of hostnames) {
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    const hit = byHost.get(key);
    if (!hit) continue;
    if (hit.ipv4) rows.push({ host: name, ip: hit.ipv4, status: hit.status_ipv4 });
    if (hit.ipv6) rows.push({ host: name, ip: hit.ipv6, status: hit.status_ipv6 });
  }
  return rows;
}
