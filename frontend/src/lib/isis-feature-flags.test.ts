import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  isisInterfaceFastRerouteSupported,
  isisLspRefreshRange,
  isisSrv6Supported,
  isisTeExportSupported,
  type IsisFeatureFlags,
} from "./isis-feature-flags";

function flags(overrides: Partial<Record<keyof IsisFeatureFlags, boolean>>): IsisFeatureFlags {
  const leaf = (supported: boolean) => ({ supported });
  return {
    interface_fast_reroute: leaf(overrides.interface_fast_reroute ?? false),
    srv6: leaf(overrides.srv6 ?? false),
    te_export: leaf(overrides.te_export ?? false),
  };
}

describe("ISIS UI feature gates", () => {
  it("gates every interface LFA control on interface_fast_reroute", () => {
    assert.equal(isisInterfaceFastRerouteSupported(flags({})), false);
    assert.equal(isisInterfaceFastRerouteSupported(flags({ interface_fast_reroute: true })), true);
    assert.equal(isisInterfaceFastRerouteSupported(flags({ srv6: true, te_export: true })), false);
    assert.equal(isisInterfaceFastRerouteSupported(undefined), false);
  });

  it("gates SRv6 and TED export on their own flags", () => {
    assert.equal(isisSrv6Supported(flags({})), false);
    assert.equal(isisSrv6Supported(flags({ srv6: true })), true);
    assert.equal(isisSrv6Supported(undefined), false);
    assert.equal(isisTeExportSupported(flags({ te_export: true })), true);
    assert.equal(isisTeExportSupported(flags({ srv6: true })), false);
    assert.equal(isisTeExportSupported(undefined), false);
  });

  it("reads the lsp-refresh-interval range from capabilities", () => {
    assert.deepEqual(isisLspRefreshRange({ lsp_refresh_interval: { min: 1, max: 65235 } }), { min: 1, max: 65235 });
    assert.deepEqual(isisLspRefreshRange({ lsp_refresh_interval: { min: 2, max: 65235 } }), { min: 2, max: 65235 });
    assert.deepEqual(isisLspRefreshRange(null), { min: 2, max: 65235 });
  });
});
