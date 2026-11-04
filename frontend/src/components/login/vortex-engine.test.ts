import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it, mock } from "node:test";
import { VortexEngine } from "./vortex-engine";

// A browser just large enough for the engine: event targets, a manual frame
// queue and clock, and a WebGL2 context that accepts every call.

class CountingTarget extends EventTarget {
  listeners = 0;
  addEventListener(...args: Parameters<EventTarget["addEventListener"]>) {
    this.listeners++;
    super.addEventListener(...args);
  }
  removeEventListener(...args: Parameters<EventTarget["removeEventListener"]>) {
    this.listeners--;
    super.removeEventListener(...args);
  }
}

let clock = 0;
let frames = new Map<number, FrameRequestCallback>();
let nextFrame = 1;
let win: CountingTarget;
let doc: CountingTarget & { hidden: boolean };

/** Every GPU object the fake context has handed out and not had deleted. */
let live: Set<object>;

function fakeGl(overrides: Record<string, unknown> = {}) {
  const methods: Record<string, unknown> = {
    getShaderParameter: () => true,
    getProgramParameter: (_program: unknown, key: string) => (key === "ACTIVE_UNIFORMS" ? 0 : true),
    isContextLost: () => false,
    ...overrides,
  };
  return new Proxy(
    {},
    {
      get: (_target, name: string) => {
        if (name in methods) return methods[name];
        if (/^[A-Z0-9_]+$/.test(name)) return name;
        if (/^create(Program|Shader|VertexArray|Buffer|Texture|Framebuffer)$/.test(name)) {
          return () => {
            const object = { kind: name.slice(6) };
            live.add(object);
            return object;
          };
        }
        if (/^delete(Program|Shader|VertexArray|Buffer|Texture|Framebuffer)$/.test(name)) {
          return (object: object | null) => {
            if (object) live.delete(object);
          };
        }
        return () => ({});
      },
    },
  );
}

const liveKinds = () => [...live].map((o) => (o as { kind: string }).kind).sort();

function fakeCanvas(gl: unknown) {
  const canvas = new CountingTarget() as CountingTarget & Record<string, unknown>;
  canvas.width = 0;
  canvas.height = 0;
  canvas.getContext = (type: string) => (type === "webgl2" ? gl : null);
  return canvas as unknown as HTMLCanvasElement & CountingTarget;
}

function runFrame(at: number) {
  clock = at;
  const due = [...frames.values()];
  frames = new Map();
  for (const callback of due) callback(at);
}

async function until(condition: () => boolean) {
  for (let i = 0; i < 200 && !condition(); i++) {
    await new Promise((resolve) => setImmediate(resolve));
  }
  assert.ok(condition(), "condition never became true");
}

const layout = () => ({ x: 400, y: 300, radius: 200 });

beforeEach(() => {
  live = new Set();
  clock = 0;
  frames = new Map();
  win = Object.assign(new CountingTarget(), {
    innerWidth: 800,
    innerHeight: 600,
    devicePixelRatio: 1,
    setTimeout: (fn: () => void, ms: number) => setTimeout(fn, ms),
    clearTimeout: (id: ReturnType<typeof setTimeout>) => clearTimeout(id),
  });
  doc = Object.assign(new CountingTarget(), {
    hidden: false,
    createElement: () => ({
      width: 0,
      height: 0,
      getContext: () => ({
        drawImage: () => {},
        getImageData: (_x: number, _y: number, w: number, h: number) => ({
          data: new Uint8ClampedArray(w * h * 4).fill(255),
        }),
      }),
    }),
  });
  const globals: Record<string, unknown> = {
    window: win,
    document: doc,
    performance: { now: () => clock },
    requestAnimationFrame: (callback: FrameRequestCallback) => {
      frames.set(nextFrame, callback);
      return nextFrame++;
    },
    cancelAnimationFrame: (id: number) => frames.delete(id),
    Image: class {
      src = "";
      decode() {
        return Promise.resolve();
      }
    },
  };
  for (const [name, value] of Object.entries(globals)) {
    Object.defineProperty(globalThis, name, { value, configurable: true, writable: true });
  }
  mock.timers.enable({ apis: ["setTimeout"] });
});

afterEach(() => {
  mock.timers.reset();
});

async function runningEngine(onUnavailable?: () => void) {
  const canvas = fakeCanvas(fakeGl());
  const engine = new VortexEngine(canvas, { iconSrc: "/vy-icon.png", layout, onUnavailable });
  await until(() => frames.size > 0);
  return { engine, canvas };
}

describe("VortexEngine success", () => {
  it("resolves at the deadline when no frame runs, as in a hidden tab", async () => {
    const { engine } = await runningEngine();
    let resolved = false;
    void engine.succeed().then(() => (resolved = true));

    mock.timers.tick(1599);
    await until(() => true);
    assert.equal(resolved, false);

    mock.timers.tick(1);
    await until(() => resolved);
    engine.dispose();
  });

  it("resolves when the animation finishes, before the deadline", async () => {
    const { engine } = await runningEngine();
    let resolved = false;
    void engine.succeed().then(() => (resolved = true));
    for (let t = 16; t <= 1300; t += 16) runFrame(t);
    await until(() => resolved);
    engine.dispose();
  });

  it("resolves at once when the tab is hidden", async () => {
    const { engine } = await runningEngine();
    doc.hidden = true;
    doc.dispatchEvent(new Event("visibilitychange"));
    assert.equal(frames.size, 0);
    let resolved = false;
    void engine.succeed().then(() => (resolved = true));
    await until(() => resolved);
    engine.dispose();
  });
});

describe("VortexEngine teardown", () => {
  it("removes every listener when the GPU context is lost, and reports it once", async () => {
    let unavailable = 0;
    const { engine, canvas } = await runningEngine(() => unavailable++);
    assert.ok(win.listeners > 0);

    const lost = new Event("webglcontextlost", { cancelable: true });
    canvas.dispatchEvent(lost);
    assert.equal(lost.defaultPrevented, true);
    assert.equal(unavailable, 1);
    assert.equal(win.listeners, 0);
    assert.equal(doc.listeners, 0);
    assert.equal(canvas.listeners, 0);
    assert.equal(frames.size, 0);

    engine.dispose();
    assert.equal(unavailable, 1);
    assert.equal(win.listeners, 0);
  });

  it("registers nothing and frees what it made when allocation throws in the constructor", () => {
    const canvas = fakeCanvas(fakeGl({ createTexture: () => null }));
    assert.throws(() => new VortexEngine(canvas, { iconSrc: "/vy-icon.png", layout }));
    assert.equal(win.listeners, 0);
    assert.equal(doc.listeners, 0);
    assert.equal(canvas.listeners, 0);
    assert.deepEqual(liveKinds(), []);
  });

  it("frees the programs it made when a later shader fails to compile", () => {
    let compiled = 0;
    const canvas = fakeCanvas(
      fakeGl({ getShaderParameter: () => ++compiled < 5, getShaderInfoLog: () => "bad shader" }),
    );
    assert.throws(() => new VortexEngine(canvas, { iconSrc: "/vy-icon.png", layout }), /bad shader/);
    assert.deepEqual(liveKinds(), []);
  });

  it("keeps compiled programs but frees their shaders", async () => {
    const { engine } = await runningEngine();
    assert.ok(liveKinds().includes("Program"));
    assert.ok(!liveKinds().includes("Shader"));
    engine.dispose();
  });

  it("frees every GPU object on dispose", async () => {
    const { engine } = await runningEngine();
    assert.ok(live.size > 0);
    engine.dispose();
    assert.deepEqual(liveKinds(), []);
  });

  it("frees every GPU object when the context is lost", async () => {
    const { canvas } = await runningEngine();
    canvas.dispatchEvent(new Event("webglcontextlost", { cancelable: true }));
    assert.deepEqual(liveKinds(), []);
  });

  it("does not grow GPU objects across resizes", async () => {
    const { engine } = await runningEngine();
    const before = live.size;
    win.dispatchEvent(new Event("resize"));
    win.dispatchEvent(new Event("resize"));
    assert.equal(live.size, before);
    engine.dispose();
  });
});

describe("VortexEngine idle", () => {
  it("stops drawing after a minute without input and resumes on input", async () => {
    const { engine } = await runningEngine();
    runFrame(30_000);
    assert.equal(frames.size, 1, "still drawing inside the idle window");

    runFrame(60_001);
    assert.equal(frames.size, 0, "drawing stopped after the idle window");

    win.dispatchEvent(new Event("pointermove"));
    assert.equal(frames.size, 1, "input restarts the frame loop");
    engine.dispose();
  });

  it("keeps drawing while a sign-in is in flight", async () => {
    const { engine } = await runningEngine();
    engine.setBusy(true);
    runFrame(120_000);
    assert.equal(frames.size, 1);
    engine.dispose();
  });
});
