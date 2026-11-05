type FeatureFlag = { supported?: boolean } | undefined;

type FeatureCapabilities = {
  features?: Record<string, FeatureFlag>;
  supported_actions?: string[];
  chain_actions?: Record<string, string[]>;
} | null | undefined;

export function firewallFeatureSupported(
  capabilities: FeatureCapabilities,
  name: string,
): boolean {
  return capabilities?.features?.[name]?.supported === true;
}

// A chain the payload lists in chain_actions uses that list. Any other
// chain (a custom chain) uses supported_actions, the set every chain takes.
export function firewallActionSupported(
  capabilities: FeatureCapabilities,
  action: string,
  chain?: string,
): boolean {
  const chainActions = capabilities?.chain_actions;
  // Own keys only: a custom chain may be named "constructor" or "__proto__".
  const perChain =
    chain && chainActions && Object.prototype.hasOwnProperty.call(chainActions, chain)
      ? chainActions[chain]
      : undefined;
  return (perChain ?? capabilities?.supported_actions)?.includes(action) === true;
}
