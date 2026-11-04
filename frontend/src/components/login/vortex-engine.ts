/**
 * The login page's background: the VyManager mark rebuilt from particles, with
 * four streams of traffic spiralling into its blades. Everything is drawn with
 * raw WebGL2 so the login page takes on no new dependency.
 *
 * Particle motion is analytic (computed in the vertex shader from a seed and a
 * few uniforms), so the CPU only advances a clock. The scene is drawn into an
 * HDR target, blurred down a small mip chain for bloom, then tone mapped.
 */

export interface VortexLayout {
  /** Centre of the mark, in CSS pixels. */
  x: number;
  y: number;
  /** Radius of the mark, in CSS pixels. */
  radius: number;
}

export interface VortexOptions {
  iconSrc: string;
  /** Places the mark for a given viewport. */
  layout: (width: number, height: number) => VortexLayout;
  /** Render one finished frame and never animate. */
  still?: boolean;
  /** Called if WebGL is missing or the GPU context dies. */
  onUnavailable?: () => void;
}

const LOGO_PARTICLES = 110_000;
const STREAM_PARTICLES = 70_000;
const CORE_PARTICLES = 12_000;
const FLOATS_PER_PARTICLE = 8;
const PULSE_SLOTS = 4;
const BLOOM_LEVELS = 4;
const SUCCESS_SECONDS = 1.05;
/** Navigation never waits longer than this, even if frames stop (hidden tab). */
const SUCCESS_DEADLINE_MS = 1600;
/** Stop drawing after this long with no input, so an open tab does not hold the GPU. */
const IDLE_MS = 60_000;
const MAX_DPR = 2;

const ACTIVITY_EVENTS = ["pointermove", "pointerdown", "keydown", "wheel", "touchstart"] as const;

const PARTICLE_VS = /* glsl */ `#version 300 es
precision highp float;

layout(location = 0) in vec3 aHome;   // xy: position in the mark, z: 1 on an edge
layout(location = 1) in vec4 aSeed;
layout(location = 2) in float aKind;  // 0 mark, 1 inbound stream, 2 core

uniform vec2 uResolution;
uniform vec3 uLayout;     // centre (device px), radius (device px)
uniform float uDpr;
uniform float uTime;
uniform float uFlow;
uniform float uAngle;
uniform float uIntro;
uniform float uEnergy;
uniform float uShatter;
uniform float uCollapse;
uniform float uBurst;
uniform float uExposure;
uniform vec2 uTilt;
uniform float uPulses[${PULSE_SLOTS}];

out vec3 vColor;

vec3 lin(vec3 c) { return pow(c, vec3(2.2)); }

vec2 flow(vec2 p, float t) {
  return vec2(
    sin(p.y * 3.1 + t * 0.7) + sin(p.y * 7.3 - t * 0.4 + p.x * 2.0),
    cos(p.x * 2.9 - t * 0.6) + cos(p.x * 6.7 + t * 0.5 - p.y * 2.0)
  );
}

mat2 rot(float a) {
  float c = cos(a), s = sin(a);
  return mat2(c, s, -s, c);
}

void main() {
  vec3 indigo = lin(vec3(0.20, 0.25, 0.95));
  vec3 azure  = lin(vec3(0.20, 0.68, 1.00));
  vec3 ice    = lin(vec3(0.82, 0.95, 1.00));
  vec3 coral  = lin(vec3(1.00, 0.33, 0.30));

  vec3 pos;
  vec3 color;
  float alpha = 1.0;
  float size = 1.0;
  float glow = 0.0;

  if (aKind < 0.5) {
    vec2 h = aHome.xy;
    float edge = aHome.z;
    h += flow(h * 1.4, uTime) * (0.004 + 0.016 * aSeed.x * (1.0 - edge));
    float r = length(h);
    float a = atan(h.y, h.x);
    // Light runs along the blades, the same way the traffic flows.
    float sweep = pow(0.5 + 0.5 * sin(a * 2.0 + r * 5.5 + uFlow * 0.9), 8.0);
    pos = vec3(h, (aSeed.y - 0.5) * 0.14 + 0.07 * sin(r * 4.0 - uTime * 0.6));
    color = mix(azure * 0.55, azure, aSeed.z);
    color = mix(color, ice, edge * 0.72);
    glow = sweep * (0.9 + edge * 1.1);
    size = mix(1.0, 1.25, edge);
    alpha = mix(0.62, 0.9, edge);
  } else {
    float isCore = step(1.5, aKind);
    float speed = mix(0.030 + 0.030 * aSeed.y, 0.12 + 0.05 * aSeed.y, isCore);
    float s = fract(aSeed.x + uFlow * speed);
    float outer = mix(3.1, 0.52, isCore);
    float inner = mix(0.92, 0.015, isCore);
    float r = mix(outer, inner, pow(s, 0.72));
    float twist = mix(-1.55, -2.6, isCore);
    float spread = mix(0.07 + 0.13 * max(r - 1.0, 0.0), 0.25, isCore);
    float a = aHome.x + twist * log(r) + (aSeed.z - 0.5) * spread * 2.0;
    pos = vec3(cos(a), sin(a), 0.0) * r;
    pos.z = (aSeed.w - 0.5) * 0.3 * r;
    // Long, thin runs of packets rather than an even mist.
    float run = smoothstep(0.55, 0.95, sin(aSeed.w * 40.0 + r * 3.0 - uFlow * 0.6) * 0.5 + 0.5);
    float fade = smoothstep(0.0, 0.16, s) * smoothstep(1.0, 0.88, s);
    color = mix(azure, indigo, smoothstep(1.0, 2.6, r));
    color = mix(color, ice, isCore * (1.0 - r) + run * 0.3);
    alpha = fade * mix(0.42 + run * 0.9, 0.55, isCore);
    size = mix(0.85 + aSeed.y * 0.5, 0.85, isCore);
    glow = run * 0.4 * (1.0 - isCore) + isCore * (1.0 - r / 0.52) * 1.2;
  }

  // Assembly: everything starts as loose dust and is pulled into place.
  float delay = (1.0 - exp(-length(pos.xy))) * 0.45 + aSeed.x * 0.25;
  float t = clamp((uIntro * 1.7 - delay) / 1.0, 0.0, 1.0);
  float e = 1.0 - pow(1.0 - t, 4.0);
  float th = aSeed.y * 6.2832;
  float ph = aSeed.z * 3.1416;
  vec3 dust = vec3(sin(ph) * cos(th), sin(ph) * sin(th), cos(ph)) * (2.4 + aSeed.w * 2.6);
  pos = mix(dust, pos, e);
  pos.xy = rot((1.0 - e) * 2.6) * pos.xy;
  alpha *= smoothstep(0.0, 0.35, t);

  // Pressing a key sends one ring out from the centre.
  float planar = length(pos.xy);
  float ring = 0.0;
  for (int i = 0; i < ${PULSE_SLOTS}; i++) {
    float age = uPulses[i];
    if (age < 0.0) continue;
    float d = planar - age * 1.7;
    ring += exp(-d * d / 0.018) * exp(-age * 1.5);
  }
  pos.z += ring * 0.16;
  pos.xy *= 1.0 + ring * 0.045;
  glow += ring * 2.4;

  // Failed sign-in: the mark breaks apart, then pulls itself back together.
  float kick = uShatter * (0.12 + 1.5 * aSeed.w * aSeed.w * aSeed.x);
  pos += normalize(pos + (aSeed.xyz - 0.5) * 1.1) * kick;
  color = mix(color, coral, clamp(uShatter * 1.5, 0.0, 1.0));

  // Successful sign-in: collapse to a point, then release.
  pos *= 1.0 - uCollapse * uCollapse * 0.965;
  pos *= 1.0 + uBurst * uBurst * (2.0 + 7.0 * aSeed.x);
  color = mix(color, ice, clamp(uCollapse * 1.4, 0.0, 1.0));
  glow += uCollapse * 2.0;
  alpha *= 1.0 - smoothstep(0.35, 1.0, uBurst);

  pos.xy = rot(uAngle) * pos.xy;
  pos.yz = rot(uTilt.y) * pos.yz;
  pos.xz = rot(uTilt.x) * pos.xz;

  float perspective = 1.0 / max(1.0 - pos.z * 0.2, 0.2);
  vec2 screen = uLayout.xy + pos.xy * perspective * uLayout.z;

  gl_Position = vec4(screen / uResolution * 2.0 - 1.0, 0.0, 1.0);
  gl_PointSize = clamp(size * perspective * uDpr * (1.5 + uLayout.z / uDpr / 900.0), 1.0, 9.0);
  vColor = color * alpha * (0.34 + glow * 0.7) * (1.0 + uEnergy * 0.5) * uExposure;
}
`;

const PARTICLE_FS = /* glsl */ `#version 300 es
precision highp float;
in vec3 vColor;
out vec4 fragColor;
void main() {
  float d = length(gl_PointCoord - 0.5) * 2.0;
  if (d > 1.0) discard;
  float a = 1.0 - d;
  fragColor = vec4(vColor * a * a, 1.0);
}
`;

const FULLSCREEN_VS = /* glsl */ `#version 300 es
out vec2 vUv;
void main() {
  vec2 p = vec2((gl_VertexID << 1) & 2, gl_VertexID & 2);
  vUv = p;
  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}
`;

const DOWN_FS = /* glsl */ `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 fragColor;
uniform sampler2D uTex;
uniform vec2 uTexel;
uniform float uThreshold;
void main() {
  vec3 c = texture(uTex, vUv).rgb * 4.0;
  c += texture(uTex, vUv + uTexel * vec2(-1, -1)).rgb;
  c += texture(uTex, vUv + uTexel * vec2( 1, -1)).rgb;
  c += texture(uTex, vUv + uTexel * vec2(-1,  1)).rgb;
  c += texture(uTex, vUv + uTexel * vec2( 1,  1)).rgb;
  c /= 8.0;
  fragColor = vec4(max(c - uThreshold, 0.0), 1.0);
}
`;

const UP_FS = /* glsl */ `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 fragColor;
uniform sampler2D uTex;
uniform vec2 uTexel;
void main() {
  vec3 c = texture(uTex, vUv + uTexel * vec2(-2, 0)).rgb;
  c += texture(uTex, vUv + uTexel * vec2( 2, 0)).rgb;
  c += texture(uTex, vUv + uTexel * vec2( 0,-2)).rgb;
  c += texture(uTex, vUv + uTexel * vec2( 0, 2)).rgb;
  c += texture(uTex, vUv + uTexel * vec2(-1, 1)).rgb * 2.0;
  c += texture(uTex, vUv + uTexel * vec2( 1, 1)).rgb * 2.0;
  c += texture(uTex, vUv + uTexel * vec2(-1,-1)).rgb * 2.0;
  c += texture(uTex, vUv + uTexel * vec2( 1,-1)).rgb * 2.0;
  fragColor = vec4(c / 12.0, 1.0);
}
`;

const COMPOSITE_FS = /* glsl */ `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 fragColor;
uniform sampler2D uScene;
uniform sampler2D uBloom;
uniform vec2 uCentre;   // in uv
uniform float uAspect;
uniform float uTime;
uniform float uFlash;
uniform float uBloomGain;

vec3 aces(vec3 x) {
  return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0);
}

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
}

void main() {
  vec2 d = (vUv - uCentre) * vec2(uAspect, 1.0);
  float falloff = exp(-dot(d, d) * 2.6);
  vec3 base = vec3(0.0016, 0.0052, 0.0150);
  base += vec3(0.002, 0.012, 0.042) * falloff;

  vec3 c = base + texture(uScene, vUv).rgb + texture(uBloom, vUv).rgb * uBloomGain;
  c += vec3(0.5, 0.8, 1.0) * uFlash * exp(-dot(d, d) * 7.0);
  c = aces(c * 1.15);
  c = pow(c, vec3(1.0 / 2.2));

  // Dither, so the long dark gradients do not band.
  c += (hash(gl_FragCoord.xy + fract(uTime)) - 0.5) / 160.0;
  fragColor = vec4(c, 1.0);
}
`;

interface Target {
  framebuffer: WebGLFramebuffer;
  texture: WebGLTexture;
  width: number;
  height: number;
}

type Uniforms = Record<string, WebGLUniformLocation | null>;

interface Program {
  program: WebGLProgram;
  uniforms: Uniforms;
}

function compile(gl: WebGL2RenderingContext, vertex: string, fragment: string): Program {
  const shader = (type: number, source: string) => {
    const s = gl.createShader(type);
    if (!s) throw new Error("createShader failed");
    gl.shaderSource(s, source);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS) && !gl.isContextLost()) {
      throw new Error(gl.getShaderInfoLog(s) ?? "shader compile failed");
    }
    return s;
  };
  const program = gl.createProgram();
  if (!program) throw new Error("createProgram failed");
  gl.attachShader(program, shader(gl.VERTEX_SHADER, vertex));
  gl.attachShader(program, shader(gl.FRAGMENT_SHADER, fragment));
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS) && !gl.isContextLost()) {
    throw new Error(gl.getProgramInfoLog(program) ?? "program link failed");
  }
  const uniforms: Uniforms = {};
  const count = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS) as number;
  for (let i = 0; i < count; i++) {
    const info = gl.getActiveUniform(program, i);
    if (!info) continue;
    const name = info.name.replace(/\[0\]$/, "");
    uniforms[name] = gl.getUniformLocation(program, info.name);
  }
  return { program, uniforms };
}

function shuffle(data: Float32Array, stride: number) {
  // Lets the adaptive quality step draw a prefix of the buffer and still get
  // an even sample of the whole scene.
  const count = data.length / stride;
  const swap = new Float32Array(stride);
  for (let i = count - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const a = i * stride;
    const b = j * stride;
    swap.set(data.subarray(a, a + stride));
    data.copyWithin(a, b, b + stride);
    data.set(swap, b);
  }
}

/** Samples the real logo file, weighting towards its edges so the shape stays crisp. */
function buildParticles(image: CanvasImageSource): Float32Array {
  const size = 420;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("no 2d context");
  ctx.drawImage(image, 0, 0, size, size);
  const pixels = ctx.getImageData(0, 0, size, size).data;
  const solid = (x: number, y: number) =>
    x >= 0 && y >= 0 && x < size && y < size && pixels[(y * size + x) * 4 + 3] > 128;

  const total = LOGO_PARTICLES + STREAM_PARTICLES + CORE_PARTICLES;
  const data = new Float32Array(total * FLOATS_PER_PARTICLE);
  const write = (i: number, x: number, y: number, edge: number, kind: number) => {
    const o = i * FLOATS_PER_PARTICLE;
    data[o] = x;
    data[o + 1] = y;
    data[o + 2] = edge;
    data[o + 3] = Math.random();
    data[o + 4] = Math.random();
    data[o + 5] = Math.random();
    data[o + 6] = Math.random();
    data[o + 7] = kind;
  };

  let placed = 0;
  let attempts = 0;
  const reach = 3;
  while (placed < LOGO_PARTICLES && attempts < LOGO_PARTICLES * 60) {
    attempts++;
    const fx = Math.random() * size;
    const fy = Math.random() * size;
    const x = Math.floor(fx);
    const y = Math.floor(fy);
    if (!solid(x, y)) continue;
    const onEdge =
      !solid(x + reach, y) || !solid(x - reach, y) || !solid(x, y + reach) || !solid(x, y - reach);
    if (!onEdge && Math.random() > 0.42) continue;
    write(placed++, (fx / size) * 2 - 1, 1 - (fy / size) * 2, onEdge ? 1 : 0, 0);
  }
  if (placed < LOGO_PARTICLES) throw new Error("logo mask is empty");

  // Each arm leaves a blade tip, so the streams read as feeding the mark.
  const tip = 0.24;
  for (let i = 0; i < STREAM_PARTICLES; i++) {
    const arm = tip + (Math.floor(Math.random() * 4) * Math.PI) / 2;
    write(LOGO_PARTICLES + i, arm, 0, 0, 1);
  }
  for (let i = 0; i < CORE_PARTICLES; i++) {
    const arm = tip + (Math.floor(Math.random() * 4) * Math.PI) / 2;
    write(LOGO_PARTICLES + STREAM_PARTICLES + i, arm, 0, 0, 2);
  }
  shuffle(data, FLOATS_PER_PARTICLE);
  return data;
}

const smoothstep = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

export class VortexEngine {
  private readonly gl: WebGL2RenderingContext;
  private readonly canvas: HTMLCanvasElement;
  private readonly options: VortexOptions;
  private particleProgram!: Program;
  private downProgram!: Program;
  private upProgram!: Program;
  private compositeProgram!: Program;
  private vao: WebGLVertexArrayObject | null = null;
  private emptyVao: WebGLVertexArrayObject | null = null;
  private scene: Target | null = null;
  private mips: Target[] = [];
  private internalFormat: number = 0;
  private hdr = false;

  private raf = 0;
  private lastFrame = 0;
  private disposed = false;
  private ready = false;
  private width = 0;
  private height = 0;
  private dpr = 1;
  private qualityScale = 1;
  private drawCount = LOGO_PARTICLES + STREAM_PARTICLES + CORE_PARTICLES;
  private slowFrames = 0;
  private sampledFrames = 0;

  private time = 0;
  private flow = 0;
  private angle = 0;
  private intro = 0;
  private energy = 0;
  private busy = false;
  private failedAt = -1;
  private succeededAt = -1;
  private resolveSuccess: (() => void) | null = null;
  private successDeadline = 0;
  private lastActivity = 0;
  private readonly pulses = new Float32Array(PULSE_SLOTS).fill(-1);
  private nextPulse = 0;

  constructor(canvas: HTMLCanvasElement, options: VortexOptions) {
    this.canvas = canvas;
    this.options = options;
    const gl = canvas.getContext("webgl2", {
      alpha: false,
      antialias: false,
      depth: false,
      stencil: false,
    });
    if (!gl) throw new Error("WebGL2 is unavailable");
    this.gl = gl;

    this.particleProgram = compile(gl, PARTICLE_VS, PARTICLE_FS);
    this.downProgram = compile(gl, FULLSCREEN_VS, DOWN_FS);
    this.upProgram = compile(gl, FULLSCREEN_VS, UP_FS);
    this.compositeProgram = compile(gl, FULLSCREEN_VS, COMPOSITE_FS);
    this.emptyVao = gl.createVertexArray();

    this.hdr = Boolean(gl.getExtension("EXT_color_buffer_float") || gl.getExtension("EXT_color_buffer_half_float"));
    this.internalFormat = this.hdr ? gl.RGBA16F : gl.RGBA8;

    // Allocate before listening, so a throw here leaves nothing registered.
    this.resize();

    canvas.addEventListener("webglcontextlost", this.handleContextLost);
    window.addEventListener("resize", this.handleResize);
    document.addEventListener("visibilitychange", this.handleVisibility);
    for (const type of ACTIVITY_EVENTS) window.addEventListener(type, this.wake, { passive: true });

    void this.loadIcon();
  }

  private async loadIcon() {
    try {
      const image = new Image();
      image.src = this.options.iconSrc;
      await image.decode();
      if (this.disposed) return;
      const data = buildParticles(image);
      const gl = this.gl;
      this.vao = gl.createVertexArray();
      gl.bindVertexArray(this.vao);
      const buffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
      const stride = FLOATS_PER_PARTICLE * 4;
      gl.enableVertexAttribArray(0);
      gl.vertexAttribPointer(0, 3, gl.FLOAT, false, stride, 0);
      gl.enableVertexAttribArray(1);
      gl.vertexAttribPointer(1, 4, gl.FLOAT, false, stride, 12);
      gl.enableVertexAttribArray(2);
      gl.vertexAttribPointer(2, 1, gl.FLOAT, false, stride, 28);
      gl.bindVertexArray(null);
      this.ready = true;
      if (this.options.still) {
        this.intro = 1;
        this.time = 12;
        this.flow = 12;
        this.render();
      } else {
        this.start();
      }
    } catch (err) {
      console.error("[Vortex] could not start:", err);
      this.giveUp();
    }
  }

  private start() {
    if (this.raf || this.disposed || !this.ready || this.options.still || document.hidden) return;
    this.lastFrame = performance.now();
    this.lastActivity = this.lastFrame;
    this.raf = requestAnimationFrame(this.frame);
  }

  private stop() {
    cancelAnimationFrame(this.raf);
    this.raf = 0;
  }

  /** Resumes drawing after an idle pause. */
  private wake = () => {
    this.lastActivity = performance.now();
    this.start();
  };

  /** One ring out from the centre. Call on each keystroke. */
  pulse() {
    this.wake();
    this.pulses[this.nextPulse] = 0;
    this.nextPulse = (this.nextPulse + 1) % PULSE_SLOTS;
  }

  /** Spin up while a sign-in is in flight. */
  setBusy(busy: boolean) {
    this.busy = busy;
    this.wake();
  }

  fail() {
    this.wake();
    this.failedAt = this.time;
  }

  /** Resolves when the animation is over and it is time to navigate. */
  succeed(): Promise<void> {
    this.wake();
    if (this.options.still || !this.raf) return Promise.resolve();
    this.finishSuccess();
    this.succeededAt = this.time;
    return new Promise((resolve) => {
      this.resolveSuccess = resolve;
      // Frames stop in a hidden tab; timers still run, so this bounds the wait.
      this.successDeadline = window.setTimeout(() => this.finishSuccess(), SUCCESS_DEADLINE_MS);
    });
  }

  private finishSuccess() {
    window.clearTimeout(this.successDeadline);
    this.successDeadline = 0;
    this.resolveSuccess?.();
    this.resolveSuccess = null;
  }

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.stop();
    this.canvas.removeEventListener("webglcontextlost", this.handleContextLost);
    window.removeEventListener("resize", this.handleResize);
    document.removeEventListener("visibilitychange", this.handleVisibility);
    for (const type of ACTIVITY_EVENTS) window.removeEventListener(type, this.wake);
    this.finishSuccess();
    // The context is left alive: React's strict mode re-mounts onto this same
    // canvas, and a canvas that has lost its context cannot get another.
  }

  /** Tears down before handing over to the static fallback. */
  private giveUp() {
    if (this.disposed) return;
    this.dispose();
    this.options.onUnavailable?.();
  }

  private handleContextLost = (event: Event) => {
    event.preventDefault();
    this.giveUp();
  };

  private handleResize = () => {
    this.resize();
    // Resizing clears the canvas; repaint it when no frame loop is running.
    if (this.ready && !this.raf) this.render();
  };

  private handleVisibility = () => {
    if (document.hidden) this.stop();
    else this.start();
  };

  private resize() {
    const gl = this.gl;
    this.dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR) * this.qualityScale;
    this.width = Math.max(1, Math.round(window.innerWidth * this.dpr));
    this.height = Math.max(1, Math.round(window.innerHeight * this.dpr));
    this.canvas.width = this.width;
    this.canvas.height = this.height;

    const destroy = (t: Target | null) => {
      if (!t) return;
      gl.deleteFramebuffer(t.framebuffer);
      gl.deleteTexture(t.texture);
    };
    destroy(this.scene);
    this.mips.forEach(destroy);

    this.scene = this.createTarget(this.width, this.height);
    this.mips = [];
    let w = this.width;
    let h = this.height;
    for (let i = 0; i < BLOOM_LEVELS; i++) {
      w = Math.max(2, w >> 1);
      h = Math.max(2, h >> 1);
      this.mips.push(this.createTarget(w, h));
    }
  }

  private createTarget(width: number, height: number): Target {
    const gl = this.gl;
    const texture = gl.createTexture();
    const framebuffer = gl.createFramebuffer();
    if (!texture || !framebuffer) throw new Error("could not allocate render target");
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texStorage2D(gl.TEXTURE_2D, 1, this.internalFormat, width, height);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
    return { framebuffer, texture, width, height };
  }

  private frame = (now: number) => {
    if (this.disposed) return;
    if (now - this.lastActivity > IDLE_MS && !this.busy && this.succeededAt < 0) {
      // The last frame stays on screen; any input resumes the loop.
      this.raf = 0;
      return;
    }
    this.raf = requestAnimationFrame(this.frame);
    const elapsed = (now - this.lastFrame) / 1000;
    this.lastFrame = now;
    this.step(Math.min(elapsed, 0.1));
    this.render();
    this.adaptQuality(elapsed);
  };

  /** Steps down twice at most on hardware that cannot hold the frame rate. */
  private adaptQuality(elapsed: number) {
    if (this.intro < 1 || this.qualityScale <= 0.5) return;
    this.sampledFrames++;
    if (elapsed > 1 / 40) this.slowFrames++;
    if (this.sampledFrames < 90) return;
    if (this.slowFrames > 45) {
      this.qualityScale *= 0.72;
      this.drawCount = Math.floor(this.drawCount * 0.7);
      this.resize();
    }
    this.sampledFrames = 0;
    this.slowFrames = 0;
  }

  private step(dt: number) {
    this.time += dt;
    this.intro = Math.min(1, this.intro + dt / 2.6);

    const follow = (rate: number) => 1 - Math.exp(-rate * dt);
    this.energy += ((this.busy ? 1 : 0) - this.energy) * follow(this.busy ? 3 : 1.6);
    this.angle += (-0.075 - this.energy * 1.5) * dt;
    this.flow += (1 + this.energy * 6) * dt;

    for (let i = 0; i < PULSE_SLOTS; i++) {
      if (this.pulses[i] < 0) continue;
      this.pulses[i] += dt;
      if (this.pulses[i] > 2.6) this.pulses[i] = -1;
    }

    if (this.succeededAt >= 0 && this.time - this.succeededAt >= SUCCESS_SECONDS) {
      this.finishSuccess();
    }
  }

  private fullscreen(target: Target | null, program: Program) {
    const gl = this.gl;
    gl.bindFramebuffer(gl.FRAMEBUFFER, target ? target.framebuffer : null);
    gl.viewport(0, 0, target ? target.width : this.width, target ? target.height : this.height);
    gl.useProgram(program.program);
  }

  private render() {
    const gl = this.gl;
    if (!this.scene || !this.vao) return;

    const layout = this.options.layout(window.innerWidth, window.innerHeight);
    const cx = layout.x * this.dpr;
    const cy = this.height - layout.y * this.dpr;
    const radius = layout.radius * this.dpr;

    const sinceFail = this.failedAt < 0 ? -1 : this.time - this.failedAt;
    const shatter = sinceFail < 0 ? 0 : smoothstep(0, 0.09, sinceFail) * Math.exp(-sinceFail * 1.7);
    const sinceSuccess = this.succeededAt < 0 ? -1 : this.time - this.succeededAt;
    const collapse = sinceSuccess < 0 ? 0 : smoothstep(0, 0.52, sinceSuccess);
    const burst = sinceSuccess < 0 ? 0 : smoothstep(0.5, SUCCESS_SECONDS, sinceSuccess);
    const flash = sinceSuccess < 0 ? 0 : smoothstep(0.42, 0.56, sinceSuccess) * (1 - smoothstep(0.56, SUCCESS_SECONDS, sinceSuccess) * 0.8);

    // Scene
    const p = this.particleProgram;
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.scene.framebuffer);
    gl.viewport(0, 0, this.width, this.height);
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(p.program);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE);
    gl.uniform2f(p.uniforms.uResolution, this.width, this.height);
    gl.uniform3f(p.uniforms.uLayout, cx, cy, radius);
    gl.uniform1f(p.uniforms.uDpr, this.dpr);
    gl.uniform1f(p.uniforms.uTime, this.time);
    gl.uniform1f(p.uniforms.uFlow, this.flow);
    gl.uniform1f(p.uniforms.uAngle, this.angle);
    gl.uniform1f(p.uniforms.uIntro, this.intro);
    gl.uniform1f(p.uniforms.uEnergy, this.energy);
    gl.uniform1f(p.uniforms.uShatter, shatter);
    gl.uniform1f(p.uniforms.uCollapse, collapse);
    gl.uniform1f(p.uniforms.uBurst, burst);
    // The particle count is fixed, so a smaller mark would otherwise burn out.
    gl.uniform1f(p.uniforms.uExposure, Math.min(1, Math.max(0.14, (layout.radius / 290) ** 2)));
    gl.uniform2f(
      p.uniforms.uTilt,
      -0.2 + Math.sin(this.time * 0.17) * 0.05,
      0.16 + Math.cos(this.time * 0.13) * 0.04,
    );
    gl.uniform1fv(p.uniforms.uPulses, this.pulses);
    gl.bindVertexArray(this.vao);
    gl.drawArrays(gl.POINTS, 0, this.drawCount);
    gl.disable(gl.BLEND);

    // Bloom: walk down the chain, then add back up it.
    gl.bindVertexArray(this.emptyVao);
    gl.activeTexture(gl.TEXTURE0);
    let source: Target = this.scene;
    this.mips.forEach((mip, i) => {
      this.fullscreen(mip, this.downProgram);
      gl.bindTexture(gl.TEXTURE_2D, source.texture);
      gl.uniform1i(this.downProgram.uniforms.uTex, 0);
      gl.uniform2f(this.downProgram.uniforms.uTexel, 1 / source.width, 1 / source.height);
      gl.uniform1f(this.downProgram.uniforms.uThreshold, i === 0 ? 0.12 : 0);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      source = mip;
    });
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE);
    for (let i = this.mips.length - 1; i > 0; i--) {
      const from = this.mips[i];
      this.fullscreen(this.mips[i - 1], this.upProgram);
      gl.bindTexture(gl.TEXTURE_2D, from.texture);
      gl.uniform1i(this.upProgram.uniforms.uTex, 0);
      gl.uniform2f(this.upProgram.uniforms.uTexel, 0.5 / from.width, 0.5 / from.height);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }
    gl.disable(gl.BLEND);

    // Composite
    const c = this.compositeProgram;
    this.fullscreen(null, c);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.scene.texture);
    gl.uniform1i(c.uniforms.uScene, 0);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, this.mips[0].texture);
    gl.uniform1i(c.uniforms.uBloom, 1);
    gl.uniform2f(c.uniforms.uCentre, cx / this.width, cy / this.height);
    gl.uniform1f(c.uniforms.uAspect, this.width / this.height);
    gl.uniform1f(c.uniforms.uTime, this.time);
    gl.uniform1f(c.uniforms.uFlash, flash * 3.5);
    gl.uniform1f(c.uniforms.uBloomGain, this.hdr ? 0.34 : 0.24);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.bindVertexArray(null);
  }
}
