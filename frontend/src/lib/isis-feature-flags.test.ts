import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  isisLspRefreshMinSeconds,
  isisRemoteLfaSupported,
  isisSrv6Supported,
  isisTeExportSupported,
  isisTiLfaSupported,
  type IsisFeatureFlags,
} from "./isis-feature-flags";

function flags(overrides: Partial<Record<keyof IsisFeatureFlags, boolean>>): IsisFeatureFlags {
  const leaf = (supported: boolean) => ({ supported });
  return {
    ti_lfa: leaf(overrides.ti_lfa ?? false),
    remote_lfa: leaf(overrides.remote_lfa ?? false),
    srv6: leaf(overrides.srv6 ?? false),
    te_export: leaf(overrides.te_export ?? false),
    lsp_refresh_min_1: leaf(overrides.lsp_refresh_min_1 ?? false),
  };
}

describe("ISIS UI feature gates", () => {
  it("does not enable TI-LFA from version_info; only features.ti_lfa", () => {
    assert.equal(isisTiLfaSupported(flags({})), false);
    assert.equal(isisTiLfaSupported(flags({ ti_lfa: true })), true);
    assert.equal(isisTiLfaSupported(undefined), false);
  });

  it("gates Remote LFA separately from TI-LFA", () => {
    assert.equal(isisRemoteLfaSupported(flags({ ti_lfa: true })), false);
    assert.equal(isisRemoteLfaSupported(flags({ remote_lfa: true })), true);
  });

  it("gates SRv6 and TED export on their own flags", () => {
    assert.equal(isisSrv6Supported(flags({})), false);
    assert.equal(isisSrv6Supported(flags({ srv6: true })), true);
    assert.equal(isisTeExportSupported(flags({ te_export: true })), true);
    assert.equal(isisTeExportSupported(flags({ srv6: true })), false);
  });

  it("uses lsp_refresh_min_1 for the numeric min, not is_1_5", () => {
    assert.equal(isisLspRefreshMinSeconds(flags({ lsp_refresh_min_1: true })), 1);
    assert.equal(isisLspRefreshMinSeconds(flags({})), 2);
    assert.equal(isisLspRefreshMinSeconds(undefined), 2);
  });
});
