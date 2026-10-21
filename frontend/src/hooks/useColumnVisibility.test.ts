import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { JSDOM } from "jsdom";

const dom = new JSDOM("<!doctype html><html><body><div id=\"root\"></div></html>", {
  url: "http://localhost:3000",
});
const nav = dom.window.navigator;
Object.defineProperty(globalThis, "window", { value: dom.window, configurable: true });
Object.defineProperty(globalThis, "document", { value: dom.window.document, configurable: true });
Object.defineProperty(globalThis, "navigator", { value: nav, configurable: true });
Object.defineProperty(globalThis, "HTMLElement", { value: dom.window.HTMLElement, configurable: true });
Object.defineProperty(globalThis, "IS_REACT_ACT_ENVIRONMENT", { value: true, configurable: true });

const COLUMNS = [
  { id: "action", label: "Action" },
  { id: "log", label: "Log", defaultVisible: false },
];

describe("useColumnVisibility", () => {
  it("sends a PUT on toggle and a DELETE on reset", async () => {
    const calls: { method: string; url: string }[] = [];
    let releaseDelete = () => {};
    globalThis.fetch = (async (url: string, init?: { method?: string }) => {
      const method = init?.method ?? "GET";
      calls.push({ method, url: String(url) });
      if (method === "DELETE") {
        await new Promise<void>((resolve) => {
          releaseDelete = resolve;
        });
      }
      return new Response(
        JSON.stringify({ layouts: {}, exists: false, updatedAt: "t1" }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }) as typeof fetch;

    const React = await import("react");
    const { createRoot } = await import("react-dom/client");
    const { useColumnVisibility } = await import("./useColumnVisibility");

    const rootEl = document.getElementById("root");
    assert.ok(rootEl);
    const root = createRoot(rootEl);
    const seen = { api: null as {
      toggleColumn: (id: string) => void;
      resetToDefault: () => void;
    } | null };

    function Harness() {
      const value = useColumnVisibility("firewall-policies-columns", COLUMNS, "alice");
      React.useEffect(() => {
        seen.api = value;
      });
      return null;
    }

    await React.act(async () => {
      root.render(React.createElement(Harness));
    });
    await React.act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    assert.ok(seen.api);
    const ready = seen.api;

    await React.act(async () => {
      ready.toggleColumn("log");
    });
    assert.ok(calls.some((call) => call.method === "PUT" && call.url.includes("firewall-policies-columns")));

    await React.act(async () => {
      ready.resetToDefault();
    });
    assert.ok(calls.some((call) => call.method === "DELETE" && call.url.includes("firewall-policies-columns")));
    assert.equal(
      window.localStorage.getItem("alice:firewall-policies-columns-cleared"),
      "1",
    );
    releaseDelete();
    root.unmount();
  });

  it("paints the account layout when this computer's save loses", async () => {
    window.localStorage.clear();
    globalThis.fetch = (async (_url: string, init?: { method?: string }) => {
      if ((init?.method ?? "GET") === "PUT") {
        return new Response(
          JSON.stringify({
            detail: {
              exists: true,
              layouts: {
                "firewall-policies-columns": {
                  visible: ["action"],
                  order: ["action", "log"],
                },
              },
              revisions: { "firewall-policies-columns": "t2" },
            },
          }),
          { status: 409, headers: { "Content-Type": "application/json" } },
        );
      }
      return new Response(
        JSON.stringify({ layouts: {}, exists: false, revisions: {} }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }) as typeof fetch;

    const React = await import("react");
    const { createRoot } = await import("react-dom/client");
    const { useColumnVisibility } = await import("./useColumnVisibility");
    const rootEl = document.getElementById("root");
    assert.ok(rootEl);
    const root = createRoot(rootEl);
    const seen = { api: null as { toggleColumn: (id: string) => void; isVisible: (id: string) => boolean } | null };

    function Harness() {
      const value = useColumnVisibility("firewall-policies-columns", COLUMNS, "alice");
      React.useEffect(() => {
        seen.api = value;
      });
      return null;
    }

    await React.act(async () => {
      root.render(React.createElement(Harness));
    });
    await React.act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    assert.ok(seen.api);
    await React.act(async () => {
      seen.api?.toggleColumn("log");
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    assert.equal(seen.api?.isVisible("log"), false);
    root.unmount();
  });
});
