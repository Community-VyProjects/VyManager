import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { buildHttpsSaveOps, httpsCorsIndependent } from "./https-save-ops";
import type { HTTPSConfig } from "./https";

function config(overrides: Partial<HTTPSConfig> = {}): HTTPSConfig {
  return {
    listen_addresses: [],
    allow_client_addresses: [],
    tls_versions: [],
    enable_http_redirect: false,
    certificates: {},
    api: {
      keys: [],
      graphql: {
        enabled: false,
        introspection: false,
        authentication: {},
        cors_allow_origins: [],
      },
      rest: { enabled: false, debug: false, strict: false },
    },
    ...overrides,
  };
}

describe("buildHttpsSaveOps", () => {
  it("emits 1.4 CORS without turning GraphQL on", () => {
    const ops = buildHttpsSaveOps(config({
      api: {
        keys: [],
        rest: { enabled: false, debug: false, strict: false },
        graphql: {
          enabled: false,
          introspection: false,
          authentication: {},
          cors_allow_origins: ["https://x.example"],
        },
      },
    }));
    assert.deepEqual(
      ops.filter((op) => op.op.startsWith("set_api_")),
      [{ op: "set_api_cors_allow_origin", value: "https://x.example" }],
    );
  });

  it("does not emit REST when the parse says it is off", () => {
    const ops = buildHttpsSaveOps(config({
      api: {
        keys: [{ id: "k", key: "secret" }],
        rest: { enabled: false, debug: false, strict: false },
        graphql: {
          enabled: false,
          introspection: false,
          authentication: {},
          cors_allow_origins: [],
        },
      },
    }));
    assert.deepEqual(
      ops.map((op) => op.op),
      ["delete_https", "set_api_key"],
    );
  });

  it("emits the REST container only when REST is enabled", () => {
    const off = buildHttpsSaveOps(config());
    assert.equal(off.some((op) => op.op === "set_api_rest"), false);

    const on = buildHttpsSaveOps(config({
      api: {
        keys: [],
        rest: { enabled: true, debug: false, strict: true },
        graphql: {
          enabled: false,
          introspection: false,
          authentication: {},
          cors_allow_origins: [],
        },
      },
    }));
    assert.deepEqual(
      on.filter((op) => op.op.startsWith("set_api_")),
      [{ op: "set_api_rest" }, { op: "set_api_strict" }],
    );
  });
});

describe("httpsCorsIndependent", () => {
  it("reads api_cors.cors_scope, not a version flag", () => {
    assert.equal(
      httpsCorsIndependent({ features: { api_cors: { cors_scope: "api" } } }),
      true,
    );
    assert.equal(
      httpsCorsIndependent({ features: { api_cors: { cors_scope: "graphql" } } }),
      false,
    );
    assert.equal(httpsCorsIndependent(null), false);
    const withVersionFlag = {
      features: {},
      version_info: { is_1_4: true, is_1_5: false },
    };
    assert.equal(httpsCorsIndependent(withVersionFlag), false);
  });
});

describe("HTTPS modal CORS wiring", () => {
  const modal = readFileSync(new URL("../../components/https/HTTPSModal.tsx", import.meta.url), "utf8");
  const content = readFileSync(new URL("../../components/https/HTTPSContent.tsx", import.meta.url), "utf8");

  it("gates independent CORS on the capability helper", () => {
    assert.match(modal, /corsIndependent/);
    assert.match(content, /httpsCorsIndependent/);
    assert.doesNotMatch(modal, /is_1_4|is_1_5|VyOS 1\.[45]/);
    assert.doesNotMatch(content, /is_1_4|is_1_5|VyOS 1\.[45]/);
  });

  it("does not clear CORS origins just because GraphQL was turned off", () => {
    assert.match(modal, /if \(!corsIndependent\) setCorsOrigins\(\[\]\)/);
  });
});
