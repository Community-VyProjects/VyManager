/** ISIS UI gates on capability feature flags, never on a version string. */

export interface IsisFeatureLeaf {
  supported: boolean;
}

export interface IsisFeatureFlags {
  interface_fast_reroute: IsisFeatureLeaf;
  srv6: IsisFeatureLeaf;
  te_export: IsisFeatureLeaf;
}

/** Interface LFA, remote LFA and TI-LFA (``interface <if> fast-reroute``). */
export function isisInterfaceFastRerouteSupported(features: IsisFeatureFlags | undefined): boolean {
  return features?.interface_fast_reroute?.supported === true;
}

/** SRv6 locator, interface and node MSD. */
export function isisSrv6Supported(features: IsisFeatureFlags | undefined): boolean {
  return features?.srv6?.supported === true;
}

export function isisTeExportSupported(features: IsisFeatureFlags | undefined): boolean {
  return features?.te_export?.supported === true;
}

/** Range used before capabilities load: the one both releases accept. */
const LSP_REFRESH_FALLBACK = { min: 2, max: 65235 };

/** lsp-refresh-interval range from capabilities (1.4: 1-65235, 1.5: 2-65235). */
export function isisLspRefreshRange(
  caps: { lsp_refresh_interval?: { min: number; max: number } } | null | undefined,
): { min: number; max: number } {
  return caps?.lsp_refresh_interval ?? LSP_REFRESH_FALLBACK;
}
