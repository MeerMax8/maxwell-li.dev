import { Stage, sampleViews, smooth, easeOut, clamp01, webglOK, type View } from "./stage";
import { initScroll, ScrollTrigger, reduced } from "./scroll";
import { gravityWell } from "./well";
import type { ModelConfig } from "../data/projects";

// Camera path per build, over the chapter's scroll (0..1). The VEX robots come apart
// into their assembly groups during "Design & Build" and are back together for the results.
const PATHS: Record<string, (View & { t: number })[]> = {
  quadcopter: [
    { t: 0, az: 20, el: 86, dist: 5.3 },
    { t: 0.45, az: 40, el: 32, dist: 3.4, ty: 0.04 },
    { t: 1, az: 80, el: 14, dist: 5.0 },
  ],
  ekranoplan: [
    { t: 0, az: 120, el: 36, dist: 5.0 },
    { t: 0.5, az: 140, el: 22, dist: 3.9 },
    { t: 1, az: 152, el: 16, dist: 4.0 },
  ],
  overunder: [
    { t: 0, az: 0, el: 80, dist: 5.4 },
    { t: 0.18, az: 30, el: 22, dist: 5.0, explode: 0 },
    { t: 0.32, az: 48, el: 26, dist: 6.9, explode: 1 },
    { t: 0.46, az: 64, el: 24, dist: 6.8, explode: 1 },
    { t: 0.62, az: 86, el: 14, dist: 4.4, explode: 0 },
    { t: 1, az: 112, el: 16, dist: 4.9 },
  ],
  "vex-highstakes": [
    { t: 0, az: 225, el: 20, dist: 5.1 },
    { t: 0.18, az: 244, el: 12, dist: 4.4, explode: 0 },
    { t: 0.32, az: 258, el: 24, dist: 6.9, explode: 1 },
    { t: 0.46, az: 274, el: 22, dist: 6.8, explode: 1 },
    { t: 0.62, az: 292, el: 14, dist: 4.4, explode: 0 },
    { t: 1, az: 310, el: 18, dist: 5.1 },
  ],
};

export function initProjects() {
  const head = document.getElementById("pj-head");
  if (head) gravityWell(document.getElementById("pj-well") as HTMLCanvasElement, head);
  initLightbox();
  initYouTube();
  const chapters = [...document.querySelectorAll<HTMLElement>(".chapter")];
  chapters.forEach((c) => c.style.setProperty("--still", `url(${c.dataset.still})`));
  document.documentElement.classList.add("ready");
  if (reduced) { document.body.classList.add("static-chapters"); return; }
  initScroll();

  const models = JSON.parse(document.getElementById("models-json")!.textContent!) as Record<string, ModelConfig>;
  const pstage = document.getElementById("pstage")!;
  const pword = document.getElementById("pword")!;
  const pstill = document.getElementById("pstill") as HTMLImageElement;
  const q = new URLSearchParams(location.search);
  let stage: Stage | null = null;
  if (webglOK() && q.get("gl") !== "0") {
    try { stage = new Stage(document.getElementById("pgl") as HTMLCanvasElement, { maxDpr: innerWidth < 860 ? 1.5 : 1.75 }); } catch { stage = null; }
    if (stage) stage.onFail = () => { stage?.destroy(); stage = null; pstage.classList.add("use-stills"); render(); };
  }
  if (!stage) pstage.classList.add("use-stills");

  const keys = chapters.map((c) => c.dataset.key!);
  const progress = new Map<string, number>();
  let active: string | null = null;
  const phone = () => innerWidth < 860;

  const ensure = (i: number) => {
    if (!stage || i < 0 || i >= keys.length) return;
    const k = keys[i];
    if (!stage.cache.has(k) && !stage.failed.has(k)) stage.load(k, models[k]).then(() => render()).catch(() => {});
  };

  function render() {
    if (!active) { pstage.classList.remove("on"); return; }
    pstage.classList.add("on");
    const i = keys.indexOf(active);
    const t = progress.get(active) ?? 0;
    const chap = chapters[i];
    pword.textContent = chap.dataset.short || "";
    pword.style.transform = `translate3d(${(0.5 - t) * 12}vw, 0, 0)`;
    if (pstill.getAttribute("src") !== chap.dataset.still) pstill.src = chap.dataset.still!;
    if (!stage) return;
    // phones keep one parsed model; desktop keeps the next one ready for an instant handoff
    stage.retain((phone() ? [keys[i]] : [keys[i], keys[i + 1]]).filter(Boolean) as string[]);
    ensure(i); if (!phone()) ensure(i + 1);
    const ready = stage.entries.has(active);
    pstage.classList.toggle("loading", !ready);
    if (!ready) { stage.show(null); return; }
    const v = sampleViews(PATHS[active], t);
    const inS = easeOut(t / 0.06), outS = 1 - smooth((t - 0.94) / 0.06);
    v.scale = Math.min(inS, outS);
    v.spin = (1 - inS) * -40 + (1 - outS) * 30;
    if (phone()) { v.dist *= active === "ekranoplan" ? 1.35 : 1.02; v.sy = 0.02; }
    stage.show(active);
    stage.setView(v);
  }

  chapters.forEach((chap) => {
    const key = chap.dataset.key!;
    ScrollTrigger.create({
      trigger: chap, start: "top top", end: "bottom bottom",
      onUpdate: (self) => { progress.set(key, clamp01(self.progress)); if (self.isActive) { active = key; render(); } },
      onToggle: (self) => {
        if (self.isActive) active = key;
        else if (active === key) active = null;
        render();
      },
    });
    // start fetching a model as its chapter approaches
    ScrollTrigger.create({ trigger: chap, start: "top 250%", onEnter: () => ensure(keys.indexOf(key)) });
  });
  addEventListener("resize", render);
}

function initLightbox() {
  const box = document.getElementById("lightbox") as HTMLDialogElement;
  const img = document.getElementById("lightbox-img") as HTMLImageElement;
  let opener: HTMLElement | null = null;
  document.querySelectorAll<HTMLButtonElement>(".thumb").forEach((b) => b.addEventListener("click", () => {
    opener = b;
    img.src = b.dataset.full!;
    img.alt = b.querySelector("img")?.alt ?? "";
    box.showModal();
  }));
  const close = () => { box.close(); };
  document.getElementById("lightbox-close")!.addEventListener("click", close);
  box.addEventListener("click", (e) => { if (e.target === box) close(); });
  box.addEventListener("close", () => opener?.focus());
}

function initYouTube() {
  document.querySelectorAll<HTMLButtonElement>(".yt").forEach((b) => b.addEventListener("click", () => {
    const f = document.createElement("iframe");
    f.src = `https://www.youtube-nocookie.com/embed/${b.dataset.yt}?autoplay=1&rel=0`;
    f.title = b.getAttribute("aria-label")!.replace(/^Play /, "");
    f.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture";
    f.allowFullscreen = true;
    const wrap = document.createElement("div");
    wrap.className = "yt";
    wrap.appendChild(f);
    b.replaceWith(wrap);
    f.focus();
  }, { once: true }));
}
