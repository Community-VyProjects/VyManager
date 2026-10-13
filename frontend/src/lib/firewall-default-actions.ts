/** Default-action tokens for the policies page chain select.
 *
 *  A named ipv4 or ipv6 chain accepts `return`. Base filter chains,
 *  prerouting raw, and zones do not. Callers pass the actions they already
 *  offer; this only adds `return` for a named chain.
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
