/** ISIS UI gates on capability feature flags, never version_info. */

export interface IsisFeatureLeaf {
  supported: boolean;
}

export interface IsisFeatureFlags {
  ti_lfa: IsisFeatureLeaf;
  remote_lfa: IsisFeatureLeaf;
  srv6: IsisFeatureLeaf;
  te_export: IsisFeatureLeaf;
  lsp_refresh_min_1: IsisFeatureLeaf;
}

export function isisTiLfaSupported(features: IsisFeatureFlags | undefined): boolean {
  return features?.ti_lfa.supported ?? false;
}

export function isisRemoteLfaSupported(features: IsisFeatureFlags | undefined): boolean {
  return features?.remote_lfa.supported ?? false;
}

export function isisSrv6Supported(features: IsisFeatureFlags | undefined): boolean {
  return features?.srv6.supported ?? false;
}

export function isisTeExportSupported(features: IsisFeatureFlags | undefined): boolean {
  return features?.te_export.supported ?? false;
}

export function isisLspRefreshMinSeconds(features: IsisFeatureFlags | undefined): number {
  return features?.lsp_refresh_min_1.supported ? 1 : 2;
}
