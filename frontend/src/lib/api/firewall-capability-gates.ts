type FeatureFlag = { supported?: boolean } | undefined;

type FeatureCapabilities = {
  features?: Record<string, FeatureFlag>;
  supported_actions?: string[];
} | null | undefined;

export function firewallFeatureSupported(
  capabilities: FeatureCapabilities,
  name: string,
): boolean {
  return capabilities?.features?.[name]?.supported === true;
}

export function firewallActionSupported(
  capabilities: FeatureCapabilities,
  action: string,
): boolean {
  return capabilities?.supported_actions?.includes(action) === true;
}
