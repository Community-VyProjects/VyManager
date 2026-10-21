import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  bumpLayoutEpoch,
  enqueueTableLayoutWrite,
  hydrateTableLayout,
  layoutEpoch,
  planTableLayoutHydration,
  type ColumnDef,
  type ColumnLayout,
} from "./table-layout";

const COLUMNS: ColumnDef[] = [
  { id: "action", label: "Action" },
  { id: "protocol", label: "Protocol" },
  { id: "log", label: "Log", defaultVisible: false },
  { id: "mark", label: "Mark", defaultVisible: false },
];

const REMOTE: ColumnLayout = {
  visible: ["action", "log"],
  order: ["log", "action", "protocol"],
};

const LOCAL: ColumnLayout = {
  visible: ["protocol"],
  order: ["action", "protocol", "log"],
};

function memory() {
  const items = new Map<string, string>();
  return {
    items,
    readItem: (key: string) => items.get(key) ?? null,
    writeItem: (key: string, value: string) => {
      items.set(key, value);
    },
    removeItem: (key: string) => {
      items.delete(key);
    },
  };
}

function seedLocal(store: ReturnType<typeof memory>, key: string, layout: ColumnLayout) {
  store.writeItem(key, JSON.stringify(layout.visible));
  store.writeItem(key + "-order", JSON.stringify(layout.order));
}

describe("planTableLayoutHydration", () => {
  const key = "firewall-policies-columns";

  it("paints the account layout over this browser when the other computer saved one", () => {
    const store = memory();
    seedLocal(store, key, LOCAL);
    const plan = planTableLayoutHydration({
      storageKey: key,
      columns: COLUMNS,
      remoteLayouts: { [key]: REMOTE },
      fetchFailed: false,
      dirty: false,
      readItem: store.readItem,
    });
    assert.deepEqual(plan.paint, {
      visible: ["action", "log"],
      order: ["log", "action", "protocol", "mark"],
    });
    assert.equal(plan.cacheLocal, true);
    assert.equal(plan.save, null);
  });

  it("uploads this browser's layout when the account has none", () => {
    const store = memory();
    seedLocal(store, key, LOCAL);
    const plan = planTableLayoutHydration({
      storageKey: key,
      columns: COLUMNS,
      remoteLayouts: {},
      fetchFailed: false,
      dirty: false,
      readItem: store.readItem,
    });
    assert.deepEqual(plan.paint?.visible, LOCAL.visible);
    assert.deepEqual(plan.save?.visible, LOCAL.visible);
    assert.equal(plan.cacheLocal, false);
  });

  it("does not upload when the read fails", () => {
    const store = memory();
    seedLocal(store, key, LOCAL);
    const plan = planTableLayoutHydration({
      storageKey: key,
      columns: COLUMNS,
      remoteLayouts: null,
      fetchFailed: true,
      dirty: false,
      readItem: store.readItem,
    });
    assert.deepEqual(plan.paint?.visible, LOCAL.visible);
    assert.equal(plan.save, null);
    assert.equal(plan.deleteRemote, false);
  });

  it("does not paint a stale read over an edit that already happened", () => {
    const store = memory();
    seedLocal(store, key, LOCAL);
    const plan = planTableLayoutHydration({
      storageKey: key,
      columns: COLUMNS,
      remoteLayouts: { [key]: REMOTE },
      fetchFailed: false,
      dirty: true,
      readItem: store.readItem,
    });
    assert.equal(plan.paint, null);
    assert.equal(plan.save, null);
  });

  it("reset deletes the account copy and does not upload defaults", () => {
    const store = memory();
    store.writeItem(key + "-cleared", "1");
    const plan = planTableLayoutHydration({
      storageKey: key,
      columns: COLUMNS,
      remoteLayouts: { [key]: REMOTE },
      fetchFailed: false,
      dirty: false,
      readItem: store.readItem,
    });
    assert.equal(plan.deleteRemote, true);
    assert.equal(plan.save, null);
    assert.deepEqual(plan.paint?.visible, ["action", "protocol"]);
  });

  it("retries a save that did not reach the account", () => {
    const store = memory();
    seedLocal(store, key, LOCAL);
    store.writeItem(key + "-unsynced", "1");
    const plan = planTableLayoutHydration({
      storageKey: key,
      columns: COLUMNS,
      remoteLayouts: { [key]: REMOTE },
      fetchFailed: false,
      dirty: false,
      readItem: store.readItem,
    });
    assert.deepEqual(plan.save?.visible, LOCAL.visible);
    assert.equal(plan.cacheLocal, false);
  });
});

describe("hydrateTableLayout", () => {
  it("drops a stale response when the user edits during the read", async () => {
    const key = "pppoe-session-columns";
    const store = memory();
    seedLocal(store, key, LOCAL);
    const start = layoutEpoch(key);
    let release: () => void = () => {};
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const saves: ColumnLayout[] = [];
    const painted = hydrateTableLayout({
      storageKey: key,
      columns: () => COLUMNS,
      readItem: store.readItem,
      writeItem: store.writeItem,
      removeItem: store.removeItem,
      getLayouts: async () => {
        await gate;
        return { exists: true, layouts: { [key]: REMOTE } };
      },
      enqueueSave: (layout) => saves.push(layout),
      enqueueDelete: () => {},
    });
    assert.equal(layoutEpoch(key), start);
    bumpLayoutEpoch(key);
    release();
    assert.equal(await painted, null);
    assert.equal(saves.length, 0);
    assert.equal(store.readItem(key), JSON.stringify(LOCAL.visible));
  });

  it("caches the account layout so the next failed read still paints it", async () => {
    const key = "firewall-bridge-columns";
    const store = memory();
    seedLocal(store, key, LOCAL);
    const painted = await hydrateTableLayout({
      storageKey: key,
      columns: () => COLUMNS,
      readItem: store.readItem,
      writeItem: store.writeItem,
      removeItem: store.removeItem,
      getLayouts: async () => ({ exists: true, layouts: { [key]: REMOTE } }),
      enqueueSave: () => {
        throw new Error("must not upload over the account copy");
      },
      enqueueDelete: () => {
        throw new Error("must not delete the account copy");
      },
    });
    assert.deepEqual(painted?.visible, ["action", "log"]);
    assert.equal(store.readItem(key), JSON.stringify(["action", "log"]));
  });
});

describe("enqueueTableLayoutWrite", () => {
  it("sends the latest edit, not every click, after the in-flight request", async () => {
    const key = "firewall-policies-columns-queue";
    let release: () => void = () => {};
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const calls: string[] = [];
    const transport = {
      save: async (_key: string, layout: ColumnLayout) => {
        calls.push(layout.visible[0]);
        await gate;
      },
      remove: async () => {
        calls.push("delete");
      },
    };
    enqueueTableLayoutWrite(key, { kind: "save", layout: LOCAL }, transport);
    enqueueTableLayoutWrite(key, { kind: "save", layout: REMOTE }, transport);
    enqueueTableLayoutWrite(key, { kind: "delete" }, transport);
    release();
    await new Promise((resolve) => setTimeout(resolve, 0));
    assert.deepEqual(calls, ["protocol", "delete"]);
  });
});
