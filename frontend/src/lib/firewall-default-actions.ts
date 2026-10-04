/** Default-action tokens for a firewall chain select.
 *
 *  VyOS accepts `return` only on a named chain (ipv4, ipv6, and bridge).
 *  Base filter chains, prerouting raw, and zones do not. Callers pass the
 *  actions they already offer; this only adds `return` for a named chain.
 */
export function chainDefaultActions(
  actions: readonly string[],
  namedChain: boolean,
): string[] {
  if (!namedChain || actions.includes("return")) {
    return [...actions];
  }
  return [...actions, "return"];
}
