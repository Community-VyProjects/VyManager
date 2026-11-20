import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  MASKED_SECRET,
  buildHttpsSaveOps,
  httpsConfigured,
  httpsCorsIndependent,
  httpsGraphqlAuthTypes,
  httpsRestContainer,
  httpsTlsVersions,
} from "./https-save-ops";
import { httpsService, type BatchOperation, type HTTPSConfig } from "./https";

const V15 = { capsReady: true, corsIndependent: false, restContainer: true };
const V14 = { capsReady: true, corsIndependent: true, restContainer: false };

function api(partial: Partial<HTTPSConfig["api"]> = {}): HTTPSConfig["api"] {
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

function config(overrides: Partial<HTTPSConfig> = {}): HTTPSConfig {
  return {
    listen_addresses: [],
    allow_client_addresses: [],
    tls_versions: [],
    enable_http_redirect: false,
    certificates: {},
    api: api(),
    ...overrides,
  };
}

function graphql(partial: Partial<HTTPSConfig["api"]["graphql"]>): HTTPSConfig["api"]["graphql"] {
  return {
    enabled: true,
    introspection: false,
    authentication: { auth_type: "key" },
    cors_allow_origins: [],
    ...partial,
  };
}

// What the lab returns: keys masked, graphql type key, REST on.
const LOADED = config({
  port: 8443,
  listen_addresses: ["192.0.2.1"],
  tls_versions: ["1.2", "1.3"],
  api: api({
    keys: [
      { id: "vym", key: MASKED_SECRET },
      { id: "ops", key: MASKED_SECRET },
    ],
    rest: { enabled: true, debug: false, strict: false },
    graphql: graphql({ introspection: true, cors_allow_origins: ["https://a.example"] }),
  }),
});

function edit(change: (draft: HTTPSConfig) => void): HTTPSConfig {
  const draft = structuredClone(LOADED);
  change(draft);
  return draft;
}

describe("buildHttpsSaveOps", () => {
  it("sends nothing for an untouched save", () => {
    assert.deepEqual(buildHttpsSaveOps(LOADED, structuredClone(LOADED), V15), []);
  });

  it("never sends a masked key and keeps it when other leaves change", () => {
    const ops = buildHttpsSaveOps(LOADED, edit((d) => { d.port = 443; }), V15);
    assert.deepEqual(ops, [{ op: "set_port", value: "443" }]);
    assert.equal(JSON.stringify(ops).includes(MASKED_SECRET), false);
  });

  it("sets only new or replaced keys and deletes removed ids", () => {
    const ops = buildHttpsSaveOps(LOADED, edit((d) => {
      d.api.keys = [
        { id: "vym", key: MASKED_SECRET },
        { id: "ops", key: "rotated" },
        { id: "new", key: "fresh" },
      ];
    }), V15);
    assert.deepEqual(ops, [
      { op: "set_api_key", value: "ops,rotated" },
      { op: "set_api_key", value: "new,fresh" },
    ]);

    const removed = buildHttpsSaveOps(LOADED, edit((d) => {
      d.api.keys = [{ id: "ops", key: MASKED_SECRET }];
    }), V15);
    assert.deepEqual(removed, [{ op: "delete_api_key", value: "vym" }]);
  });

  it("deletes the key list when every key is removed", () => {
    const ops = buildHttpsSaveOps(LOADED, edit((d) => { d.api.keys = []; }), V15);
    assert.deepEqual(ops, [{ op: "delete_api_keys" }]);
  });

  it("diffs multi-value leaves value by value", () => {
    const ops = buildHttpsSaveOps(LOADED, edit((d) => {
      d.listen_addresses = ["192.0.2.2"];
      d.tls_versions = ["1.3"];
      d.allow_client_addresses = ["10.0.0.0/8"];
    }), V15);
    assert.deepEqual(ops, [
      { op: "delete_listen_address", value: "192.0.2.1" },
      { op: "set_listen_address", value: "192.0.2.2" },
      { op: "set_allow_client_address", value: "10.0.0.0/8" },
      { op: "delete_tls_version", value: "1.2" },
    ]);

    const cleared = buildHttpsSaveOps(LOADED, edit((d) => {
      d.listen_addresses = [];
      d.tls_versions = [];
    }), V15);
    assert.deepEqual(cleared, [{ op: "delete_listen_addresses" }, { op: "delete_tls_versions" }]);
  });

  it("deletes a cleared single value and sets a changed one", () => {
    const ops = buildHttpsSaveOps(
      config({ port: 8443, vrf: "mgmt", certificates: { certificate: "srv" } }),
      config({ vrf: "blue", certificates: { ca_certificate: "ca" }, enable_http_redirect: true }),
      V15,
    );
    assert.deepEqual(ops, [
      { op: "delete_port" },
      { op: "set_vrf", value: "blue" },
      { op: "set_enable_http_redirect" },
      { op: "delete_certificates_certificate" },
      { op: "set_certificates_ca_certificate", value: "ca" },
    ]);
  });

  it("drops the whole graphql node when GraphQL is turned off on 1.5", () => {
    const ops = buildHttpsSaveOps(LOADED, edit((d) => {
      d.api.graphql = { enabled: false, introspection: false, authentication: {}, cors_allow_origins: [] };
    }), V15);
    assert.deepEqual(ops, [{ op: "delete_api_graphql" }]);
  });

  it("creates graphql with its type before the other graphql leaves", () => {
    const ops = buildHttpsSaveOps(
      config({ api: api({ keys: [{ id: "vym", key: MASKED_SECRET }] }) }),
      config({
        api: api({
          keys: [{ id: "vym", key: MASKED_SECRET }],
          graphql: graphql({
            authentication: { auth_type: "token", expiration: 600 },
            cors_allow_origins: ["https://x.example"],
          }),
        }),
      }),
      V15,
    );
    assert.deepEqual(ops, [
      { op: "set_api_graphql_auth_type", value: "token" },
      { op: "set_api_graphql_auth_expiration", value: "600" },
      { op: "set_api_cors_allow_origin", value: "https://x.example" },
    ]);
  });

  it("treats a missing loaded auth type as the lab default key", () => {
    const loaded = config({ api: api({ graphql: graphql({ authentication: {} }) }) });
    const unchanged = config({ api: api({ graphql: graphql({ authentication: { auth_type: "key" } }) }) });
    assert.deepEqual(buildHttpsSaveOps(loaded, unchanged, V15), []);
  });

  it("deletes token leaves when switching back to key", () => {
    const loaded = config({
      api: api({ graphql: graphql({ authentication: { auth_type: "token", expiration: 600, secret_length: 64 } }) }),
    });
    const updated = config({ api: api({ graphql: graphql({ authentication: { auth_type: "key" } }) }) });
    assert.deepEqual(buildHttpsSaveOps(loaded, updated, V15), [
      { op: "set_api_graphql_auth_type", value: "key" },
      { op: "delete_api_graphql_auth_expiration" },
      { op: "delete_api_graphql_auth_secret_length" },
    ]);
  });

  it("diffs 1.4 api CORS without GraphQL", () => {
    const loaded = config({
      api: api({ graphql: { ...api().graphql, cors_allow_origins: ["https://a.example"] } }),
    });
    const updated = config({
      api: api({ graphql: { ...api().graphql, cors_allow_origins: ["https://b.example"] } }),
    });
    assert.deepEqual(buildHttpsSaveOps(loaded, updated, V14), [
      { op: "delete_api_cors_allow_origin", value: "https://a.example" },
      { op: "set_api_cors_allow_origin", value: "https://b.example" },
    ]);
  });

  it("toggles 1.4 debug and strict directly", () => {
    const ops = buildHttpsSaveOps(
      config({ api: api({ rest: { enabled: false, debug: true, strict: false } }) }),
      config({ api: api({ rest: { enabled: false, debug: false, strict: true } }) }),
      V14,
    );
    assert.deepEqual(ops, [{ op: "delete_api_debug" }, { op: "set_api_strict" }]);
  });

  it("adds and removes the 1.5 REST container", () => {
    const off = buildHttpsSaveOps(LOADED, edit((d) => {
      d.api.rest = { enabled: false, debug: false, strict: false };
    }), V15);
    assert.deepEqual(off, [{ op: "delete_api_rest" }]);

    const on = buildHttpsSaveOps(
      config({ api: api({ keys: [{ id: "vym", key: MASKED_SECRET }] }) }),
      config({
        api: api({
          keys: [{ id: "vym", key: MASKED_SECRET }],
          rest: { enabled: true, debug: false, strict: true },
        }),
      }),
      V15,
    );
    assert.deepEqual(on, [{ op: "set_api_rest" }, { op: "set_api_strict" }]);
  });

  it("deletes the api node when nothing under it is left", () => {
    const ops = buildHttpsSaveOps(LOADED, edit((d) => { d.api = api(); }), V15);
    assert.deepEqual(ops, [{ op: "delete_api" }]);
  });

  it("deletes the service when every field is cleared", () => {
    assert.deepEqual(buildHttpsSaveOps(LOADED, config(), V15), [{ op: "delete_https" }]);
    assert.deepEqual(buildHttpsSaveOps(config(), config(), V15), []);
  });

  it("refuses to build a save when capabilities were not loaded", () => {
    assert.throws(() => buildHttpsSaveOps(config(), config()), /capabilities are required/);
  });
});

describe("httpsService.saveConfig", () => {
  function stubbed(): { service: typeof httpsService; sent: BatchOperation[][] } {
    const sent: BatchOperation[][] = [];
    const service = Object.create(httpsService) as typeof httpsService;
    service.batchConfigure = async (operations: BatchOperation[]) => {
      sent.push(operations);
      return { success: true };
    };
    return { service, sent };
  }

  it("normalizes padded, blank, and masked values before the diff", async () => {
    const { service, sent } = stubbed();
    const updated = edit((d) => {
      d.listen_addresses = [" 192.0.2.1 ", " "];
      d.vrf = "  ";
      d.api.keys = [
        { id: " vym ", key: MASKED_SECRET },
        { id: "ops ", key: ` ${MASKED_SECRET} ` },
        { id: " new ", key: " fresh " },
      ];
      d.api.graphql.cors_allow_origins = [" https://a.example "];
    });
    const result = await service.saveConfig(LOADED, updated, V15);
    assert.deepEqual(result, { success: true });
    assert.deepEqual(sent, [[{ op: "set_api_key", value: "new,fresh" }]]);
  });

  it("skips the request when nothing changed", async () => {
    const { service, sent } = stubbed();
    assert.deepEqual(await service.saveConfig(LOADED, structuredClone(LOADED), V15), { success: true });
    assert.deepEqual(sent, []);
  });
});

describe("https capability readers", () => {
  it("reads the mapper lists and flags, not a version field", () => {
    const caps = {
      features: {
        api_cors: { cors_scope: "api" },
        api_rest: { supported: false },
        tls_version: { options: ["1.2", "1.3"] },
        api_graphql_auth: { auth_types: ["key", "token"] },
      },
    };
    assert.equal(httpsCorsIndependent(caps), true);
    assert.equal(httpsRestContainer(caps), false);
    assert.deepEqual(httpsTlsVersions(caps), ["1.2", "1.3"]);
    assert.deepEqual(httpsGraphqlAuthTypes(caps), ["key", "token"]);
    assert.equal(httpsCorsIndependent({ features: { api_cors: { cors_scope: "graphql" } } }), false);
    assert.equal(httpsRestContainer({ features: { api_rest: { supported: true } } }), true);
    assert.equal(httpsCorsIndependent(null), false);
    assert.equal(httpsRestContainer(null), false);
    assert.deepEqual(httpsTlsVersions(null), []);
    assert.deepEqual(httpsGraphqlAuthTypes(undefined), []);
  });

  it("counts a config with only API keys as configured", () => {
    assert.equal(httpsConfigured(config()), false);
    assert.equal(httpsConfigured(config({ api: api({ keys: [{ id: "k", key: MASKED_SECRET }] }) })), true);
  });
});
