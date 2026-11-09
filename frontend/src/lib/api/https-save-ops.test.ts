import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildHttpsSaveOps, httpsCorsIndependent, httpsRestContainer } from "./https-save-ops";
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

function api(partial: Partial<HTTPSConfig["api"]>): HTTPSConfig["api"] {
  return {
    keys: [],
    rest: { enabled: false, debug: false, strict: false },
    graphql: {
      enabled: false,
      introspection: false,
      authentication: {},
      cors_allow_origins: [],
    },
    ...partial,
  };
}

describe("buildHttpsSaveOps", () => {
  it("emits api CORS without GraphQL when CORS is not under GraphQL", () => {
    const ops = buildHttpsSaveOps(config({
      api: api({
        graphql: {
          enabled: false,
          introspection: false,
          authentication: {},
          cors_allow_origins: ["https://x.example"],
        },
      }),
    }), { corsIndependent: true, restContainer: false });
    assert.deepEqual(
      ops.filter((op) => op.op.startsWith("set_api_")),
      [{ op: "set_api_cors_allow_origin", value: "https://x.example" }],
    );
  });

  it("does not emit GraphQL CORS when GraphQL is off", () => {
    const ops = buildHttpsSaveOps(config({
      api: api({
        graphql: {
          enabled: false,
          introspection: false,
          authentication: {},
          cors_allow_origins: ["https://x.example"],
        },
      }),
    }), { corsIndependent: false, restContainer: true });
    assert.deepEqual(ops.map((op) => op.op), ["delete_https"]);
  });

  it("emits GraphQL CORS when GraphQL is on", () => {
    const ops = buildHttpsSaveOps(config({
      api: api({
        graphql: {
          enabled: true,
          introspection: false,
          authentication: { auth_type: "key" },
          cors_allow_origins: ["https://x.example"],
        },
      }),
    }), { corsIndependent: false, restContainer: true });
    assert.deepEqual(
      ops.filter((op) => op.op.includes("cors") || op.op.includes("graphql")),
      [
        { op: "set_api_graphql_auth_type", value: "key" },
        { op: "set_api_cors_allow_origin", value: "https://x.example" },
      ],
    );
  });

  it("does not emit the REST container when that node is unsupported", () => {
    const ops = buildHttpsSaveOps(config({
      api: api({
        keys: [{ id: "k", key: "secret" }],
        rest: { enabled: true, debug: false, strict: true },
      }),
    }), { restContainer: false });
    assert.deepEqual(
      ops.map((op) => op.op),
      ["delete_https", "set_api_key", "set_api_strict"],
    );
  });

  it("emits the REST container only when the node exists and REST is enabled", () => {
    const off = buildHttpsSaveOps(config({
      api: api({ rest: { enabled: false, debug: true, strict: false } }),
    }), { restContainer: true });
    assert.equal(off.some((op) => op.op.startsWith("set_api_")), false);

    const on = buildHttpsSaveOps(config({
      api: api({ rest: { enabled: true, debug: false, strict: true } }),
    }), { restContainer: true });
    assert.deepEqual(
      on.filter((op) => op.op.startsWith("set_api_")),
      [{ op: "set_api_rest" }, { op: "set_api_strict" }],
    );
  });
});

describe("https capability readers", () => {
  it("reads cors_scope and the REST container flag, not a version field", () => {
    const caps = {
      features: {
        api_cors: { cors_scope: "api" },
        api_rest: { supported: false },
      },
    };
    assert.equal(httpsCorsIndependent(caps), true);
    assert.equal(httpsRestContainer(caps), false);
    assert.equal(httpsCorsIndependent({ features: { api_cors: { cors_scope: "graphql" } } }), false);
    assert.equal(httpsRestContainer({ features: { api_rest: { supported: true } } }), true);
    assert.equal(httpsCorsIndependent(null), false);
    assert.equal(httpsRestContainer(null), false);
  });
});
