// One WebGL stage per page. Keeps at most two parsed models (the one on screen and the
// next), renders only when something changed, and moves models through camera "views"
// expressed in model units (every model is centred and scaled to a unit bounding sphere).
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import type { ModelConfig } from "../data/projects";

export type View = {
  az: number; // degrees around the up axis
  el: number; // degrees above the horizon
  dist: number; // camera distance in model radii
  tx?: number; ty?: number; tz?: number; // look-at offset in model units
  sx?: number; sy?: number; // where the model sits on screen, as a fraction of the viewport (-0.5..0.5)
  scale?: number; // 0..1, the retract/emerge "anchor" transition
  explode?: number; // 0..1, assembly groups apart (VEX robots only)
  spin?: number; // extra yaw on the model itself, degrees
};

type Entry = { root: THREE.Group; pivot: THREE.Group; explode: { value: number }; exposure: number };

export class Stage {
  renderer: THREE.WebGLRenderer;
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(30, 1, 0.01, 100);
  loader: GLTFLoader;
  cache = new Map<string, Promise<Entry>>();
  entries = new Map<string, Entry>();
  current: string | null = null;
  dirty = true;
  width = 1;
  height = 1;
  maxDpr: number;
  onFrame: ((ms: number) => void) | null = null;
  private raf = 0;
  private envRT: THREE.WebGLRenderTarget | null = null;
  private ro: ResizeObserver;
  failed = new Set<string>();
  onFail: ((key: string) => void) | null = null;

  constructor(public canvas: HTMLCanvasElement, opts: { maxDpr?: number } = {}) {
    this.maxDpr = opts.maxDpr ?? 1.75;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "high-performance" });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.setClearColor(0x000000, 0);
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.envRT = pmrem.fromScene(new RoomEnvironment(), 0.04);
    this.scene.environment = this.envRT.texture;
    pmrem.dispose();
    this.scene.environmentIntensity = 0.9;
    // copper rim from behind-left, cool key from front-right: the blueprint palette on the metal
    const rim = new THREE.DirectionalLight(0xf0a15f, 2.2);
    rim.position.set(-3, 2.5, -4);
    const key = new THREE.DirectionalLight(0xdfe9f2, 1.1);
    key.position.set(3, 4, 3);
    this.scene.add(rim, key, new THREE.HemisphereLight(0x9db0bf, 0x071724, 0.6));
    this.loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
    this.resize();
    this.ro = new ResizeObserver(() => this.resize());
    this.ro.observe(canvas);
    const loop = () => {
      this.raf = requestAnimationFrame(loop);
      if (!this.dirty) return;
      this.dirty = false;
      const t0 = performance.now();
      this.renderer.render(this.scene, this.camera);
      this.onFrame?.(performance.now() - t0);
    };
    this.raf = requestAnimationFrame(loop);
  }

  resize() {
    const r = this.canvas.getBoundingClientRect();
    this.width = Math.max(1, r.width);
    this.height = Math.max(1, r.height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, this.maxDpr));
    this.renderer.setSize(this.width, this.height, false);
    this.camera.aspect = this.width / this.height;
    // phones get a wider lens so the machine still fits the narrow frame
    this.camera.fov = this.width < 700 ? 38 : 28;
    this.camera.updateProjectionMatrix();
    this.dirty = true;
  }

  load(key: string, cfg: ModelConfig): Promise<Entry> {
    if (this.cache.has(key)) return this.cache.get(key)!;
    const p = new Promise<Entry>((resolve, reject) => {
      this.loader.load(cfg.url, (gltf) => {
        const model = gltf.scene;
        const [rx, ry, rz] = cfg.rotation.map((d) => (d * Math.PI) / 180);
        model.rotation.set(rx, ry, rz);
        model.updateMatrixWorld(true);
        // the model has no parent yet, so its world box is in its parent's space:
        // subtracting the centre from its position centres the rotated model
        const box = new THREE.Box3().setFromObject(model);
        const centre = box.getCenter(new THREE.Vector3());
        const radius = box.getSize(new THREE.Vector3()).length() / 2;
        model.position.sub(centre);
        const pivot = new THREE.Group();
        const inner = new THREE.Group();
        inner.add(model);
        inner.scale.setScalar(1 / radius);
        pivot.add(inner);
        const explode = { value: 0 };
        model.traverse((o) => {
          const mesh = o as THREE.Mesh;
          if (!mesh.isMesh) return;
          const mat = mesh.material as THREE.MeshStandardMaterial;
          mat.envMapIntensity = 1;
          if (mesh.geometry.attributes._explode) {
            const m2 = mat.clone();
            m2.onBeforeCompile = (sh) => {
              sh.uniforms.uExplode = explode;
              sh.vertexShader = sh.vertexShader
                .replace("#include <common>", "#include <common>\nattribute vec4 _explode;\nuniform float uExplode;")
                .replace(
                  "#include <begin_vertex>",
                  "#include <begin_vertex>\nfloat e = clamp((uExplode - _explode.w * 0.3) / 0.7, 0.0, 1.0);\ne = e * e * (3.0 - 2.0 * e);\ntransformed += _explode.xyz * e;",
                );
            };
            m2.customProgramCacheKey = () => "explode";
            mesh.material = m2;
          }
        });
        const root = new THREE.Group();
        root.add(pivot);
        root.visible = false;
        // retained away while it was still downloading: free it instead of adding it
        if (this.cache.get(key) !== p) {
          model.traverse((o) => { const m = o as THREE.Mesh; if (m.isMesh) { m.geometry.dispose(); (m.material as THREE.Material).dispose(); } });
          reject(new Error("released"));
          return;
        }
        this.scene.add(root);
        const entry = { root, pivot, explode, exposure: cfg.exposure };
        this.entries.set(key, entry);
        this.renderer.compile(this.scene, this.camera);
        resolve(entry);
      }, undefined, (err) => {
        if (this.cache.get(key) === p) this.cache.delete(key);
        this.failed.add(key);
        this.onFail?.(key);
        reject(err);
      });
    });
    this.cache.set(key, p);
    return p;
  }

  /** Keep only these models parsed; free the GPU memory of everything else. */
  retain(keys: string[]) {
    for (const [key, entry] of this.entries) {
      if (keys.includes(key)) continue;
      entry.root.traverse((o) => {
        const mesh = o as THREE.Mesh;
        if (!mesh.isMesh) return;
        mesh.geometry.dispose();
        (Array.isArray(mesh.material) ? mesh.material : [mesh.material]).forEach((m) => m.dispose());
      });
      this.scene.remove(entry.root);
      this.entries.delete(key);
      this.cache.delete(key);
    }
  }

  show(key: string | null, view?: View) {
    for (const [k, e] of this.entries) e.root.visible = k === key;
    this.current = key;
    if (key && view) this.setView(view);
    this.dirty = true;
  }

  setView(v: View) {
    const e = this.current ? this.entries.get(this.current) : null;
    if (!e) return;
    const az = (v.az * Math.PI) / 180;
    const el = (v.el * Math.PI) / 180;
    const target = new THREE.Vector3(v.tx ?? 0, v.ty ?? 0, v.tz ?? 0);
    this.camera.position.set(
      target.x + Math.cos(el) * Math.sin(az) * v.dist,
      target.y + Math.sin(el) * v.dist,
      target.z + Math.cos(el) * Math.cos(az) * v.dist,
    );
    this.camera.up.set(0, 1, 0);
    this.camera.lookAt(target);
    const sx = v.sx ?? 0, sy = v.sy ?? 0;
    this.camera.setViewOffset(this.width, this.height, -sx * this.width, -sy * this.height, this.width, this.height);
    const s = Math.max(0.0001, v.scale ?? 1);
    e.pivot.scale.setScalar(s);
    e.pivot.rotation.y = ((v.spin ?? 0) * Math.PI) / 180;
    e.explode.value = v.explode ?? 0;
    e.root.visible = (v.scale ?? 1) > 0.002;
    this.renderer.toneMappingExposure = e.exposure;
    this.dirty = true;
  }

  destroy() {
    cancelAnimationFrame(this.raf);
    this.ro.disconnect();
    this.retain([]);
    this.cache.clear();
    this.envRT?.dispose();
    this.renderer.dispose();
    this.renderer.forceContextLoss();
  }
}

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const clamp01 = (t: number) => Math.min(1, Math.max(0, t));
export const smooth = (t: number) => { t = clamp01(t); return t * t * (3 - 2 * t); };
export const easeOut = (t: number) => 1 - Math.pow(1 - clamp01(t), 3);

/** Interpolate a list of keyed views at local time t (0..1). */
export function sampleViews(keys: (View & { t: number })[], t: number): View {
  if (t <= keys[0].t) return { ...keys[0] };
  for (let i = 0; i < keys.length - 1; i++) {
    const a = keys[i], b = keys[i + 1];
    if (t <= b.t) {
      const u = smooth((t - a.t) / (b.t - a.t));
      const mix = (x?: number, y?: number, d = 0) => lerp(x ?? d, y ?? d, u);
      return {
        az: mix(a.az, b.az), el: mix(a.el, b.el), dist: mix(a.dist, b.dist),
        tx: mix(a.tx, b.tx), ty: mix(a.ty, b.ty), tz: mix(a.tz, b.tz),
        sx: mix(a.sx, b.sx), sy: mix(a.sy, b.sy),
        scale: mix(a.scale, b.scale, 1), explode: mix(a.explode, b.explode), spin: mix(a.spin, b.spin),
      };
    }
  }
  return { ...keys[keys.length - 1] };
}

export function webglOK(): boolean {
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch { return false; }
}
