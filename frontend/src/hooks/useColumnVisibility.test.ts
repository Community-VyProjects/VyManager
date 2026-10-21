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

  it("does not send a toggle queued behind a rejected save, and drops unknown columns", async () => {
    window.localStorage.clear();
    let putCount = 0;
    let releasePut = () => {};
    let markStarted = () => {};
    const started = new Promise<void>((resolve) => {
      markStarted = resolve;
    });
    globalThis.fetch = (async (_url: string, init?: { method?: string }) => {
      if ((init?.method ?? "GET") === "PUT") {
        putCount += 1;
        markStarted();
        await new Promise<void>((resolve) => {
          releasePut = resolve;
        });
        return new Response(
          JSON.stringify({
            detail: {
              exists: true,
              layouts: {
                "firewall-policies-columns": {
                  visible: ["action", "not-a-column"],
                  order: ["action"],
                },
              },
              revisions: { "firewall-policies-columns": "t9" },
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
    const seen = {
      api: null as {
        toggleColumn: (id: string) => void;
        isVisible: (id: string) => boolean;
        visibleColumnCount: number;
      } | null,
    };

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
    });
    await started;
    await React.act(async () => {
      seen.api?.toggleColumn("log");
      releasePut();
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    assert.equal(putCount, 1);
    assert.equal(seen.api?.isVisible("log"), false);
    assert.equal(seen.api?.visibleColumnCount, 1);
    assert.equal(
      window.localStorage.getItem("alice:firewall-policies-columns-order"),
      JSON.stringify(["action", "log"]),
    );
    root.unmount();
  });

  it("clears the stored revision after a successful reset", async () => {
    window.localStorage.clear();
    window.localStorage.setItem("alice:firewall-policies-columns-based-on", "t1");
    globalThis.fetch = (async (_url: string, init?: { method?: string }) => {
      const method = init?.method ?? "GET";
      if (method === "GET") {
        return new Response(
          JSON.stringify({
            exists: true,
            layouts: {
              "firewall-policies-columns": {
                visible: ["action", "log"],
                order: ["action", "log"],
              },
            },
            revisions: { "firewall-policies-columns": "t1" },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }
      return new Response(JSON.stringify({ layouts: {}, exists: true, revisions: {} }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }) as typeof fetch;

    const React = await import("react");
    const { createRoot } = await import("react-dom/client");
    const { useColumnVisibility } = await import("./useColumnVisibility");
    const rootEl = document.getElementById("root");
    assert.ok(rootEl);
    const root = createRoot(rootEl);
    const seen = { api: null as { resetToDefault: () => void } | null };

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
    await React.act(async () => {
      seen.api?.resetToDefault();
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    assert.equal(window.localStorage.getItem("alice:firewall-policies-columns-based-on"), null);
    root.unmount();
  });

  it("paints a rejected save on the table that is mounted now", async () => {
    window.localStorage.clear();
    let releasePut = () => {};
    let markStarted = () => {};
    const started = new Promise<void>((resolve) => {
      markStarted = resolve;
    });
    globalThis.fetch = (async (_url: string, init?: { method?: string }) => {
      const method = init?.method ?? "GET";
      if (method === "PUT") {
        markStarted();
        await new Promise<void>((resolve) => {
          releasePut = resolve;
        });
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
              revisions: { "firewall-policies-columns": "t4" },
            },
          }),
          { status: 409, headers: { "Content-Type": "application/json" } },
        );
      }
      return new Response(
        JSON.stringify({
          exists: true,
          layouts: {
            "firewall-policies-columns": {
              visible: ["action", "log"],
              order: ["action", "log"],
            },
          },
          revisions: { "firewall-policies-columns": "t0" },
        }),
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
    await React.act(async () => {
      seen.api?.toggleColumn("log");
    });
    await started;
    await React.act(async () => {
      root.render(null);
    });
    await React.act(async () => {
      root.render(React.createElement(Harness));
    });
    await React.act(async () => {
      releasePut();
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    assert.equal(seen.api?.isVisible("log"), false);
    root.unmount();
  });

  it("does not let a read that starts during a save paint the old account layout", async () => {
    window.localStorage.clear();
    let releasePut = () => {};
    let markStarted = () => {};
    const started = new Promise<void>((resolve) => {
      markStarted = resolve;
    });
    let gets = 0;
    globalThis.fetch = (async (_url: string, init?: { method?: string }) => {
      const method = init?.method ?? "GET";
      if (method === "PUT") {
        markStarted();
        await new Promise<void>((resolve) => {
          releasePut = resolve;
        });
        return new Response(
          JSON.stringify({
            exists: true,
            layouts: {
              "firewall-policies-columns": {
                visible: ["action", "log"],
                order: ["action", "log"],
              },
            },
            revisions: { "firewall-policies-columns": "2026-10-21T18:00:00.000000Z" },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }
      gets += 1;
      return new Response(
        JSON.stringify({
          exists: true,
          layouts: {
            "firewall-policies-columns": {
              visible: ["action"],
              order: ["action", "log"],
            },
          },
          revisions: { "firewall-policies-columns": "2026-10-21T17:00:00.000000Z" },
        }),
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
    await React.act(async () => {
      seen.api?.toggleColumn("log");
    });
    await started;
    await React.act(async () => {
      root.render(null);
    });
    await React.act(async () => {
      root.render(React.createElement(Harness));
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    assert.ok(gets >= 2);
    assert.equal(seen.api?.isVisible("log"), true);
    await React.act(async () => {
      releasePut();
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    assert.equal(seen.api?.isVisible("log"), true);
    root.unmount();
  });

  it("does not keep the previous user's columns when the signed-in user changes", async () => {
    window.localStorage.clear();
    globalThis.fetch = (async () =>
      new Response(JSON.stringify({ layouts: {}, exists: false, revisions: {} }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })) as typeof fetch;
    const React = await import("react");
    const { createRoot } = await import("react-dom/client");
    const { useColumnVisibility } = await import("./useColumnVisibility");
    const rootEl = document.getElementById("root");
    assert.ok(rootEl);
    const root = createRoot(rootEl);
    const seen = { api: null as { isVisible: (id: string) => boolean; toggleColumn: (id: string) => void } | null };
    const user = { id: "alice" };

    function Harness() {
      const value = useColumnVisibility("firewall-policies-columns", COLUMNS, user.id);
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
    await React.act(async () => {
      seen.api?.toggleColumn("log");
    });
    assert.equal(seen.api?.isVisible("log"), true);
    user.id = "bob";
    await React.act(async () => {
      root.render(React.createElement(Harness));
    });
    assert.equal(seen.api?.isVisible("log"), false);
    root.unmount();
  });

  it("does not paint the previous user's rejected save into the new account", async () => {
    window.localStorage.clear();
    let releasePut = () => {};
    let markStarted = () => {};
    const started = new Promise<void>((resolve) => {
      markStarted = resolve;
    });
    globalThis.fetch = (async (_url: string, init?: { method?: string }) => {
      if ((init?.method ?? "GET") === "PUT") {
        markStarted();
        await new Promise<void>((resolve) => {
          releasePut = resolve;
        });
        return new Response(
          JSON.stringify({
            detail: {
              exists: true,
              layouts: {
                "firewall-policies-columns": {
                  visible: ["action", "log"],
                  order: ["action", "log"],
                },
              },
              revisions: { "firewall-policies-columns": "t9" },
            },
          }),
          { status: 409, headers: { "Content-Type": "application/json" } },
        );
      }
      return new Response(JSON.stringify({ layouts: {}, exists: false, revisions: {} }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }) as typeof fetch;

    const React = await import("react");
    const { createRoot } = await import("react-dom/client");
    const { useColumnVisibility } = await import("./useColumnVisibility");
    const rootEl = document.getElementById("root");
    assert.ok(rootEl);
    const root = createRoot(rootEl);
    const seen = { api: null as { isVisible: (id: string) => boolean; toggleColumn: (id: string) => void } | null };
    const user = { id: "alice" };

    function Harness() {
      const value = useColumnVisibility("firewall-policies-columns", COLUMNS, user.id);
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
    await React.act(async () => {
      seen.api?.toggleColumn("log");
    });
    await started;
    user.id = "bob";
    await React.act(async () => {
      root.render(React.createElement(Harness));
    });
    await React.act(async () => {
      releasePut();
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    assert.equal(seen.api?.isVisible("log"), false);
    root.unmount();
  });

  it("does not send a save queued by the previous user after that table unmounts", async () => {
    window.localStorage.clear();
    let putCount = 0;
    let releasePut = () => {};
    let markStarted = () => {};
    const started = new Promise<void>((resolve) => {
      markStarted = resolve;
    });
    globalThis.fetch = (async (_url: string, init?: { method?: string }) => {
      if ((init?.method ?? "GET") === "PUT") {
        putCount += 1;
        markStarted();
        await new Promise<void>((resolve) => {
          releasePut = resolve;
        });
        return new Response(
          JSON.stringify({ layouts: {}, exists: false, revisions: { "firewall-policies-columns": "t1" } }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }
      return new Response(JSON.stringify({ layouts: {}, exists: false, revisions: {} }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }) as typeof fetch;

    const React = await import("react");
    const { createRoot } = await import("react-dom/client");
    const { useColumnVisibility } = await import("./useColumnVisibility");
    const rootEl = document.getElementById("root");
    assert.ok(rootEl);
    const root = createRoot(rootEl);
    const seen = { api: null as { toggleColumn: (id: string) => void } | null };

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
    await React.act(async () => {
      seen.api?.toggleColumn("log");
    });
    await started;
    await React.act(async () => {
      seen.api?.toggleColumn("log");
      root.render(null);
    });
    await React.act(async () => {
      releasePut();
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    assert.equal(putCount, 1);
    root.unmount();
  });
});
