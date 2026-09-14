import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { websocketBaseUrl } from "./ws-base";

describe("websocketBaseUrl", () => {
  it("uses :8000 for compose UI port 3000", () => {
    assert.equal(
      websocketBaseUrl({ protocol: "http:", hostname: "192.0.2.10", port: "3000" }),
      "ws://192.0.2.10:8000",
    );
  });

  it("keeps same origin on a reverse-proxy TLS port", () => {
    assert.equal(
      websocketBaseUrl({ protocol: "https:", hostname: "app.example", port: "8443" }),
      "wss://app.example:8443",
    );
  });

  it("uses same origin on 443", () => {
    assert.equal(
      websocketBaseUrl({ protocol: "https:", hostname: "app.example", port: "443" }),
      "wss://app.example:443",
    );
  });

  it("honors an explicit URL for on-box UI on another port", () => {
    assert.equal(
      websocketBaseUrl({
        protocol: "http:",
        hostname: "100.64.64.5",
        port: "3010",
        explicit: "ws://100.64.64.5:8000",
      }),
      "ws://100.64.64.5:8000",
    );
  });
});
