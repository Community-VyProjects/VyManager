import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  browserLayoutKey,
  bumpLayoutEpoch,
  claimUnscopedBrowserLayout,
  clearedStorageKey,
  enqueueTableLayoutWrite,
  hydrateTableLayout,
  layoutEpoch,
  planTableLayoutHydration,
  publishedStorageKey,
  unsyncedStorageKey,
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

const KEY = "firewall-policies-columns";

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

function planFor(
  store: ReturnType<typeof memory>,
  userId: string,
  remoteLayouts: Record<string, ColumnLayout>,
  extra: { fetchFailed?: boolean; dirty?: boolean } = {},
) {
  return planTableLayoutHydration({
    userId,
    storageKey: KEY,
    columns: COLUMNS,
    remoteLayouts,
    revisions: null,
    basedOn: null,
    fetchFailed: extra.fetchFailed ?? false,
    dirty: extra.dirty ?? false,
    readItem: store.readItem,
  });
}

describe("planTableLayoutHydration", () => {
  it("paints the account layout over this user's browser copy", () => {
    const store = memory();
    seedLocal(store, browserLayoutKey("alice", KEY), LOCAL);
    const plan = planFor(store, "alice", { [KEY]: REMOTE });
    assert.deepEqual(plan.paint, {
      visible: ["action", "log"],
      order: ["log", "action", "protocol", "mark"],
    });
    assert.equal(plan.cacheLocal, true);
    assert.equal(plan.save, null);
  });

  it("does not upload an unscoped browser cache onto an empty account", () => {
    const store = memory();
    seedLocal(store, KEY, LOCAL);
    const plan = planFor(store, "bob", {});
    assert.equal(plan.save, null);
    assert.equal(plan.deleteRemote, false);
    assert.deepEqual(plan.paint?.visible, ["action", "protocol"]);
  });

  it("does not delete bob's layout because alice reset on this browser", () => {
    const store = memory();
    store.writeItem(clearedStorageKey(browserLayoutKey("alice", KEY)), "1");
    const plan = planFor(store, "bob", { [KEY]: REMOTE });
    assert.equal(plan.deleteRemote, false);
    assert.equal(plan.save, null);
    assert.deepEqual(plan.paint?.visible, ["action", "log"]);
  });

  it("does not save alice's failed columns onto bob", () => {
    const store = memory();
    seedLocal(store, browserLayoutKey("alice", KEY), LOCAL);
    store.writeItem(unsyncedStorageKey(browserLayoutKey("alice", KEY)), "1");
    const plan = planFor(store, "bob", { [KEY]: REMOTE });
    assert.equal(plan.save, null);
    assert.deepEqual(plan.paint?.visible, ["action", "log"]);
  });

  it("retries this user's failed save and does not apply the stale account row", () => {
    const store = memory();
    const scope = browserLayoutKey("alice", KEY);
    seedLocal(store, scope, LOCAL);
    store.writeItem(unsyncedStorageKey(scope), "1");
    const plan = planFor(store, "alice", { [KEY]: REMOTE });
    assert.deepEqual(plan.save?.visible, LOCAL.visible);
    assert.equal(plan.cacheLocal, false);
  });

  it("reset deletes only this user's account copy", () => {
    const store = memory();
    store.writeItem(clearedStorageKey(browserLayoutKey("alice", KEY)), "1");
    const plan = planFor(store, "alice", { [KEY]: REMOTE });
    assert.equal(plan.deleteRemote, true);
    assert.equal(plan.save, null);
    assert.deepEqual(plan.paint?.visible, ["action", "protocol"]);
  });

  it("does not upload when the read fails", () => {
    const store = memory();
    seedLocal(store, browserLayoutKey("alice", KEY), LOCAL);
    const plan = planFor(store, "alice", {}, { fetchFailed: true });
    assert.deepEqual(plan.paint?.visible, LOCAL.visible);
    assert.equal(plan.save, null);
    assert.equal(plan.deleteRemote, false);
  });

  it("does not let a failed save overwrite a newer account row", () => {
    const store = memory();
    const scope = browserLayoutKey("alice", KEY);
    seedLocal(store, scope, LOCAL);
    store.writeItem(unsyncedStorageKey(scope), "1");
    store.writeItem(scope + "-based-on", "t1");
    const plan = planTableLayoutHydration({
      userId: "alice",
      storageKey: KEY,
      columns: COLUMNS,
      remoteLayouts: { [KEY]: REMOTE },
      revisions: { [KEY]: "t2" },
      basedOn: "t1",
      fetchFailed: false,
      dirty: false,
      readItem: store.readItem,
    });
    assert.equal(plan.save, null);
    assert.equal(plan.deleteRemote, false);
    assert.deepEqual(plan.paint?.visible, ["action", "log"]);
    assert.equal(plan.clearUnsynced, true);
  });

  it("does not upload a local edit after the other computer deleted this table", () => {
    const store = memory();
    const scope = browserLayoutKey("alice", KEY);
    seedLocal(store, scope, LOCAL);
    store.writeItem(unsyncedStorageKey(scope), "1");
    store.writeItem(scope + "-based-on", "t1");
    const plan = planTableLayoutHydration({
      userId: "alice",
      storageKey: KEY,
      columns: COLUMNS,
      remoteLayouts: {},
      revisions: {},
      basedOn: "t1",
      fetchFailed: false,
      dirty: false,
      readItem: store.readItem,
    });
    assert.equal(plan.save, null);
    assert.equal(plan.clearLocal, true);
    assert.deepEqual(plan.paint?.visible, ["action", "protocol"]);
  });

  it("does not paint a stale read over an edit that already happened", () => {
    const store = memory();
    seedLocal(store, browserLayoutKey("alice", KEY), LOCAL);
    const plan = planFor(store, "alice", { [KEY]: REMOTE }, { dirty: true });
    assert.equal(plan.paint, null);
    assert.equal(plan.save, null);
  });
});

describe("claimUnscopedBrowserLayout", () => {
  it("keeps a pre-account layout on this browser for the account that opens it, without uploading", () => {
    const store = memory();
    seedLocal(store, KEY, LOCAL);
    claimUnscopedBrowserLayout(
      "alice",
      KEY,
      COLUMNS,
      store.readItem,
      store.writeItem,
      store.removeItem,
    );
    assert.equal(store.readItem(KEY), null);
    assert.equal(
      store.readItem(browserLayoutKey("alice", KEY)),
      JSON.stringify(LOCAL.visible),
    );
    claimUnscopedBrowserLayout(
      "bob",
      KEY,
      COLUMNS,
      store.readItem,
      store.writeItem,
      store.removeItem,
    );
    assert.equal(store.readItem(browserLayoutKey("bob", KEY)), null);
  });

  it("survives the empty-account read that follows the claim", async () => {
    const store = memory();
    seedLocal(store, KEY, LOCAL);
    claimUnscopedBrowserLayout(
      "alice",
      KEY,
      COLUMNS,
      store.readItem,
      store.writeItem,
      store.removeItem,
    );
    const saves: string[] = [];
    const painted = await hydrateTableLayout({
      userId: "alice",
      storageKey: KEY,
      columns: () => COLUMNS,
      readItem: store.readItem,
      writeItem: store.writeItem,
      removeItem: store.removeItem,
      getLayouts: async () => ({ exists: false, layouts: {} }),
      enqueueSave: () => {
        saves.push("save");
      },
      enqueueDelete: () => {
        saves.push("delete");
      },
    });
    assert.deepEqual(painted?.visible, LOCAL.visible);
    assert.deepEqual(saves, ["save"]);
    assert.equal(
      store.readItem(browserLayoutKey("alice", KEY)),
      JSON.stringify(LOCAL.visible),
    );
  });
});

describe("hydrateTableLayout", () => {
  it("drops a published browser copy when the account row is gone", async () => {
    const store = memory();
    const scope = browserLayoutKey("alice", KEY);
    seedLocal(store, scope, LOCAL);
    store.writeItem(publishedStorageKey(scope), "1");
    const painted = await hydrateTableLayout({
      userId: "alice",
      storageKey: KEY,
      columns: () => COLUMNS,
      readItem: store.readItem,
      writeItem: store.writeItem,
      removeItem: store.removeItem,
      getLayouts: async () => ({ exists: false, layouts: {} }),
      enqueueSave: () => {
        throw new Error("must not upload a reset layout");
      },
      enqueueDelete: () => {},
    });
    assert.deepEqual(painted?.visible, ["action", "protocol"]);
    assert.equal(store.readItem(scope), null);
  });

  it("drops a stale response when this user edits during the read", async () => {
    const store = memory();
    const scope = browserLayoutKey("alice", KEY);
    seedLocal(store, scope, LOCAL);
    const start = layoutEpoch(scope);
    let release: () => void = () => {};
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const saves: ColumnLayout[] = [];
    const painted = hydrateTableLayout({
      userId: "alice",
      storageKey: KEY,
      columns: () => COLUMNS,
      readItem: store.readItem,
      writeItem: store.writeItem,
      removeItem: store.removeItem,
      getLayouts: async () => {
        await gate;
        return { exists: true, layouts: { [KEY]: REMOTE } };
      },
      enqueueSave: (layout) => saves.push(layout),
      enqueueDelete: () => {},
    });
    assert.equal(layoutEpoch(scope), start);
    bumpLayoutEpoch(scope);
    release();
    assert.equal(await painted, null);
    assert.equal(saves.length, 0);
    assert.equal(store.readItem(scope), JSON.stringify(LOCAL.visible));
  });

  it("caches the account layout under this user, not an unscoped key", async () => {
    const store = memory();
    seedLocal(store, KEY, LOCAL);
    const saves: ColumnLayout[] = [];
    const painted = await hydrateTableLayout({
      userId: "bob",
      storageKey: KEY,
      columns: () => COLUMNS,
      readItem: store.readItem,
      writeItem: store.writeItem,
      removeItem: store.removeItem,
      getLayouts: async () => ({ exists: true, layouts: { [KEY]: REMOTE } }),
      enqueueSave: (layout) => saves.push(layout),
      enqueueDelete: () => {
        throw new Error("must not delete the account copy");
      },
    });
    assert.equal(saves.length, 0);
    assert.deepEqual(painted?.visible, ["action", "log"]);
    assert.equal(
      store.readItem(browserLayoutKey("bob", KEY)),
      JSON.stringify(["action", "log"]),
    );
    assert.equal(store.readItem(KEY), JSON.stringify(LOCAL.visible));
  });
});

describe("enqueueTableLayoutWrite", () => {
  it("sends the latest edit, not every click, after the in-flight request", async () => {
    const key = "alice:firewall-policies-columns-queue";
    let release: () => void = () => {};
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const calls: string[] = [];
    const transport = {
      save: async (layout: ColumnLayout) => {
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
