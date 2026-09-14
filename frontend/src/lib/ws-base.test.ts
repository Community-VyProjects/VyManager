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

  it("uses :8000 for on-box UI on another port", () => {
    assert.equal(
      websocketBaseUrl({ protocol: "http:", hostname: "100.64.64.5", port: "3010" }),
      "ws://100.64.64.5:8000",
    );
  });

  it("uses same origin on 443", () => {
    assert.equal(
      websocketBaseUrl({ protocol: "https:", hostname: "app.example", port: "443" }),
      "wss://app.example:443",
    );
  });

  it("honors an explicit URL", () => {
    assert.equal(
      websocketBaseUrl({
        protocol: "http:",
        hostname: "x",
        port: "3010",
        explicit: "wss://proxy.example/ws",
      }),
      "wss://proxy.example/ws",
    );
  });
});
