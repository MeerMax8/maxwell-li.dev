import { Stage, sampleViews, smooth, easeOut, clamp01, lerp, webglOK, type View } from "./stage";
import { gravityWell } from "./well";
import { initScroll, ScrollTrigger, reduced, lenis } from "./scroll";
import type { ModelConfig } from "../data/projects";

type Seg = { key: string; p0: number; p1: number; emerge: boolean; keys: (View & { t: number })[] };

// Story timeline, in fractions of the story's scroll distance.
// Titan is already on the grid in the first frame; the grid tilts into a floor and the
// camera pushes into its centre stack. After that each machine retracts into a common
// anchor while the next beat's word sweeps across in front of it, and the next machine
// emerges from the same point once the word has thinned to an outline (Codex round 2:
// an occluding edit, never a crossfade). The last 14% is the stacked-word handoff.
const SEGS: Seg[] = [
  { key: "quadcopter", p0: 0, p1: 0.25, emerge: false, keys: [
    { t: 0, az: 20, el: 86, dist: 5.4 },
    { t: 0.22, az: 24, el: 80, dist: 5.2 },
    { t: 0.42, az: 38, el: 44, dist: 3.4, ty: 0.04 },
    { t: 0.52, az: 46, el: 36, dist: 2.6, ty: 0.06, explode: 0 },
    { t: 0.7, az: 58, el: 34, dist: 6.0, explode: 1 },
    { t: 0.84, az: 66, el: 30, dist: 6.0, explode: 1 },
    { t: 1, az: 74, el: 20, dist: 3.9, explode: 0 },
  ] },
  { key: "vex-highstakes", p0: 0.25, p1: 0.46, emerge: true, keys: [
    { t: 0, az: 205, el: 20, dist: 5.1 },
    { t: 0.26, az: 222, el: 18, dist: 4.9, explode: 0 },
    { t: 0.52, az: 244, el: 24, dist: 6.7, explode: 1 },
    { t: 0.76, az: 258, el: 24, dist: 6.6, explode: 1 },
    { t: 1, az: 272, el: 18, dist: 4.9, explode: 0 },
  ] },
  { key: "overunder", p0: 0.46, p1: 0.66, emerge: true, keys: [
    { t: 0, az: 20, el: 30, dist: 5.1 },
    { t: 0.24, az: 38, el: 20, dist: 4.6, explode: 0 },
    { t: 0.48, az: 60, el: 24, dist: 6.7, explode: 1 },
    { t: 0.72, az: 80, el: 22, dist: 6.6, explode: 1 },
    { t: 1, az: 108, el: 18, dist: 4.3, explode: 0 },
  ] },
  { key: "ekranoplan", p0: 0.66, p1: 0.86, emerge: true, keys: [
    { t: 0, az: 118, el: 34, dist: 4.2 },
    { t: 0.22, az: 126, el: 30, dist: 4.0, explode: 0 },
    { t: 0.46, az: 136, el: 30, dist: 5.4, explode: 1 },
    { t: 0.68, az: 144, el: 26, dist: 5.3, explode: 1 },
    { t: 0.9, az: 150, el: 18, dist: 3.5, explode: 0 },
    { t: 1, az: 152, el: 16, dist: 3.4 },
  ] },
];
const IN = 0.035, OUT = 0.03, STACK = 0.86;

export function initHome() {
  const story = document.getElementById("story")!;
  const data = JSON.parse(document.getElementById("models-json")!.textContent!) as { models: Record<string, ModelConfig> };
  const q = new URLSearchParams(location.search);
  try {
    if (reduced) story.classList.add("static");
    else { initScroll(); runStory(story, data, q); }
    initRail();
    initFolders();
    document.documentElement.classList.add("ready");
  } catch (err) {
    // anything unexpected: fall back to the readable static page
    document.documentElement.classList.remove("js");
    console.error(err);
  }
}

function runStory(story: HTMLElement, data: { models: Record<string, ModelConfig> }, q: URLSearchParams) {
  const stage = story.querySelector(".stage") as HTMLElement;
  const intro = story.querySelector(".intro") as HTMLElement;
  const wellCanvas = story.querySelector("#well") as HTMLCanvasElement;
  const floor = story.querySelector(".floor") as HTMLElement;
  const words = [...story.querySelectorAll<HTMLElement>(".word")];
  const beats = [...story.querySelectorAll<HTMLElement>(".beat")];
  const stackSpans = [...story.querySelectorAll<HTMLElement>(".stack span")];
  const handoff = story.querySelector(".handoff") as HTMLElement;
  const marker = story.querySelector(".chapter-marker") as HTMLElement;
  const stills = [...story.querySelectorAll<HTMLImageElement>(".stills img")];
  const well = gravityWell(wellCanvas, stage);
  const phone = () => innerWidth < 760;

  let stageGL: Stage | null = null;
  let useStills = !webglOK() || q.get("gl") === "0";
  const goStills = () => { useStills = true; story.classList.add("use-stills"); stageGL?.destroy(); stageGL = null; update(lastP); };
  if (!useStills) {
    try {
      stageGL = new Stage(story.querySelector("#gl") as HTMLCanvasElement, { maxDpr: phone() ? 1.5 : 1.75 });
      stageGL.onFail = () => goStills();
    } catch { useStills = true; }
  }
  if (useStills) story.classList.add("use-stills");

  // Escape hatch: if frames are slow on this device, fall back to the stills.
  if (stageGL && q.get("gl") !== "1") {
    const gaps: number[] = [];
    let last = 0;
    const watch = (now: number) => {
      if (!stageGL) return;
      if (last && active) gaps.push(now - last);
      last = now;
      if (gaps.length >= 45) {
        const s = [...gaps].sort((a, b) => a - b);
        if (s[Math.floor(s.length / 2)] > 55) { goStills(); return; }
        gaps.length = 0;
        setTimeout(() => requestAnimationFrame(watch), 4000);
        return;
      }
      requestAnimationFrame(watch);
    };
    requestAnimationFrame(watch);
  }

  const prefetched = new Set<string>();
  const loadFor = (i: number) => {
    if (!stageGL || i < 0 || i >= SEGS.length) return;
    const k = SEGS[i].key;
    if (stageGL.cache.has(k) || stageGL.failed.has(k)) return;
    stageGL.load(k, data.models[k]).then(() => update(lastP)).catch(() => {});
  };
  // phones keep one parsed machine; the next one is only downloaded ahead of time
  const prefetch = (i: number) => {
    if (i >= SEGS.length) return;
    const url = data.models[SEGS[i].key].url;
    if (prefetched.has(url)) return;
    prefetched.add(url);
    fetch(url).catch(() => {});
  };

  let lastP = 0, active = false, lastSeg = -1;

  function update(p: number) {
    lastP = p;
    const vh = innerHeight / 100;

    // arrival: name lifts away, the grid tilts down into a floor under Titan
    const a = easeOut(p / 0.05);
    intro.style.opacity = String(1 - a);
    intro.style.transform = `translate3d(0, ${-a * 8}vh, 0)`;
    intro.style.visibility = a >= 0.999 ? "hidden" : "visible";
    const tilt = smooth(p / 0.07);
    const fadeWell = 1 - smooth((p - 0.2) / 0.06);
    wellCanvas.style.transform = `translate3d(0, ${tilt * 22}vh, 0) rotateX(${tilt * 64}deg) scale(${1 + tilt * 0.35})`;
    well.setDim(lerp(1, 0.55, tilt) * fadeWell);
    wellCanvas.style.opacity = String(fadeWell);

    let si = SEGS.findIndex((s) => p < s.p1);
    if (si < 0) si = SEGS.length - 1;
    const seg = SEGS[si];
    const t = clamp01((p - seg.p0) / (seg.p1 - seg.p0));
    if (si !== lastSeg) {
      lastSeg = si;
      marker.textContent = `0${si + 1} / 0${SEGS.length}`;
    }
    marker.style.opacity = String(1 - smooth((p - (STACK - 0.02)) / 0.02) - (1 - smooth(p / 0.05)));

    if (stageGL) {
      if (phone()) { stageGL.retain([seg.key]); loadFor(si); prefetch(si + 1); }
      else { stageGL.retain(SEGS.slice(si, si + 2).map((s) => s.key)); loadFor(si); loadFor(si + 1); }
    }

    const inS = seg.emerge ? easeOut((p - (seg.p0 + 0.02)) / IN) : 1;
    const outS = 1 - smooth((p - (seg.p1 - OUT)) / OUT);
    const scale = p < seg.p0 ? 0 : Math.min(inS, outS);
    const view = sampleViews(seg.keys, t);
    view.scale = scale;
    view.spin = (1 - inS) * -40 + (1 - outS) * 30;
    if (phone()) { view.sx = 0; view.sy = -0.15; view.dist *= seg.key === "ekranoplan" ? 1.45 : 1.1; }
    // in the hero Titan sits further right and smaller so it never covers the name
    else { const hero = si === 0 ? 1 - smooth(t / 0.4) : 0; view.sx = 0.19 + 0.08 * hero; view.sy = 0.01 + 0.04 * hero; view.dist *= 1 + 0.3 * hero; }

    const ready = !!stageGL && stageGL.entries.has(seg.key);
    if (stageGL) {
      if (ready) { stageGL.show(seg.key); stageGL.setView(view); }
      else stageGL.show(null);
    }
    // the machine's still covers any gap: no WebGL, a slow download, or a failed one
    stills.forEach((img) => img.classList.toggle("on", img.dataset.still === seg.key && scale > 0.5 && (useStills || !ready)));
    floor.style.opacity = String(0.9 * scale);

    // words: sweep in filled and in front, settle as an outline behind the machine, sweep out
    words.forEach((w, i) => {
      const s = SEGS[i];
      const u = (p - (s.p0 - 0.02)) / (s.p1 - s.p0 + 0.02);
      if (i === 0 || u < 0 || u > 1) { w.style.opacity = "0"; return; }
      const enter = easeOut(u / 0.16), exit = smooth((u - 0.88) / 0.12);
      const x = lerp(62, 5, enter) + lerp(0, -10, u) - exit * 60;
      w.style.opacity = String(Math.min(1, enter * 1.4) * (1 - exit));
      w.style.transform = `translate3d(${x}vw, 0, 0)`;
      const fill = 1 - smooth((u - 0.04) / 0.14);
      w.style.color = `rgba(242, 244, 243, ${0.92 * fill})`;
      w.classList.toggle("front", fill > 0.25);
    });
    // Titan's word rests behind it from the start, outline only
    const w0 = words[0];
    const u0 = p / SEGS[0].p1;
    w0.style.opacity = String(smooth((p - 0.04) / 0.04) * (1 - smooth((u0 - 0.88) / 0.12)));
    w0.style.transform = `translate3d(${lerp(8, -8, u0) - smooth((u0 - 0.88) / 0.12) * 60}vw, 0, 0)`;

    // captions (stay in the accessibility tree; only their paint fades)
    beats.forEach((b, i) => {
      const s = SEGS[i];
      const u = (p - s.p0) / (s.p1 - s.p0);
      const start = i === 0 ? 0.3 : 0.1;
      const vis = smooth((u - start) / 0.08) * (1 - smooth((u - 0.84) / 0.08));
      b.style.opacity = String(vis);
      b.style.transform = `translate3d(0, ${(1 - vis) * 18}px, 0)`;
      b.classList.toggle("off", vis < 0.05);
    });

    // handoff: the four words stack up and light one by one, then hold
    stackSpans.forEach((sp, i) => {
      const on = smooth((p - (STACK + 0.01 + i * 0.018)) / 0.015);
      sp.style.opacity = String(on);
      sp.style.transform = `translate3d(0, ${(1 - on) * 3 * vh}px, 0)`;
      sp.classList.toggle("lit", p > STACK + 0.05 + i * 0.018);
    });
    handoff.style.opacity = String(smooth((p - 0.95) / 0.02));
  }

  const st = ScrollTrigger.create({
    trigger: story, start: "top top", end: "bottom bottom",
    onUpdate: (self) => update(self.progress),
    onToggle: (self) => { active = self.isActive; },
    onRefresh: (self) => update(self.progress),
  });
  // keyboard users: tabbing to a caption's link brings its machine on screen
  beats.forEach((b, i) => b.addEventListener("focusin", () => {
    const s = SEGS[i];
    const y = st.start + ((s.p0 + s.p1) / 2 + (i === 0 ? 0.06 : 0)) * (st.end - st.start);
    if (lenis) lenis.scrollTo(y, { immediate: true }); else scrollTo(0, y);
  }));
  addEventListener("resize", () => update(lastP));
  addEventListener("load", () => ScrollTrigger.refresh());
  update(0);
}

function initRail() {
  const rail = document.getElementById("rail");
  if (!rail) return;
  const stageEl = rail.querySelector(".rail-stage") as HTMLElement;
  const machines = [...rail.querySelectorAll<HTMLButtonElement>(".machine")];
  const items = [...rail.querySelectorAll<HTMLElement>(".rail-item")];
  let cur = 0;
  const select = (i: number, scroll = true) => {
    cur = (i + machines.length) % machines.length;
    machines.forEach((m, j) => m.setAttribute("aria-pressed", String(j === cur)));
    items.forEach((it, j) => (it.hidden = j !== cur));
    stageEl.style.setProperty("--lit", `${12.5 + cur * 25}%`);
    if (scroll && stageEl.scrollWidth > stageEl.clientWidth + 4) {
      const m = machines[cur];
      stageEl.scrollTo({ left: m.offsetLeft - (stageEl.clientWidth - m.clientWidth) / 2, behavior: reduced ? "auto" : "smooth" });
    }
  };
  machines.forEach((m, i) => m.addEventListener("click", () => select(i)));
  document.getElementById("prev")!.addEventListener("click", () => select(cur - 1));
  document.getElementById("next")!.addEventListener("click", () => select(cur + 1));
  // arrow keys only on the rail's own controls, never on the links inside the text
  rail.addEventListener("keydown", (e) => {
    const t = e.target as HTMLElement;
    if (!t.closest(".machine, .nav-btn")) return;
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    e.preventDefault();
    select(cur + (e.key === "ArrowRight" ? 1 : -1));
    if (t.classList.contains("machine")) machines[cur].focus();
  });
  let timer = 0;
  stageEl.addEventListener("scroll", () => {
    clearTimeout(timer);
    timer = window.setTimeout(() => {
      if (stageEl.scrollWidth <= stageEl.clientWidth + 4) return;
      const mid = stageEl.scrollLeft + stageEl.clientWidth / 2;
      let best = 0, bd = Infinity;
      machines.forEach((m, j) => { const d = Math.abs(m.offsetLeft + m.clientWidth / 2 - mid); if (d < bd) { bd = d; best = j; } });
      if (best !== cur) select(best, false);
    }, 120);
  }, { passive: true });
  select(0, false);
}

function initFolders() {
  const cards = [...document.querySelectorAll<HTMLElement>(".folder-card")];
  const set = (c: HTMLElement, open: boolean) => { c.classList.toggle("open", open); c.setAttribute("aria-expanded", String(open)); };
  cards.forEach((c) => {
    const toggle = () => { const was = c.classList.contains("open"); cards.forEach((x) => set(x, false)); set(c, !was); };
    c.addEventListener("click", toggle);
    c.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggle(); }
      if (e.key === "Escape") set(c, false);
    });
  });
  document.addEventListener("click", (e) => { if (!(e.target as HTMLElement).closest(".folder-card")) cards.forEach((x) => set(x, false)); });
}
