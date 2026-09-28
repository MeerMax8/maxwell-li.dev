// Maxwell's gravity well (built 2026-09-27), moved into a module unchanged in feel:
// a dot grid pulled toward the pointer, idle drift when nobody is pointing.
// Additions: pauses when off screen, stays still under reduced motion, exposes `setDim`.
export function gravityWell(canvas: HTMLCanvasElement, host: HTMLElement) {
  const ctx = canvas.getContext("2d")!;
  const SPACING = 26;
  const GRID_PADDING = 200;
  const accent = getComputedStyle(document.documentElement).getPropertyValue("--copper").trim() || "#d78446";
  const still = matchMedia("(prefers-reduced-motion: reduce)").matches;

  let width = 0, height = 0, dpr = 1;
  let grid: { baseX: number; baseY: number; x: number; y: number; g: number }[][] = [];
  const real = { x: 0, y: 0 }, eased = { x: 0, y: 0 };
  let pointerIn = false, drift = true, time = 0, running = false, dim = 1;

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = host.clientWidth;
    height = host.clientHeight;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = width + "px";
    canvas.style.height = height + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    grid = [];
    const cols = Math.ceil((width + 2 * GRID_PADDING) / SPACING) + 1;
    const rows = Math.ceil((height + 2 * GRID_PADDING) / SPACING) + 1;
    for (let r = 0; r < rows; r++) {
      grid[r] = [];
      for (let c = 0; c < cols; c++) {
        const x = -GRID_PADDING + c * SPACING, y = -GRID_PADDING + r * SPACING;
        grid[r][c] = { baseX: x, baseY: y, x, y, g: 0 };
      }
    }
    if (!pointerIn) { real.x = eased.x = width / 2; real.y = eased.y = height / 2; }
    draw();
  }

  function step() {
    if (drift && !still) {
      time += 0.008;
      real.x = width * (0.5 + 0.34 * Math.sin(time * 0.7) * Math.cos(time * 0.23));
      real.y = height * (0.5 + 0.3 * Math.sin(time * 0.52 + 1.1));
    }
    eased.x += (real.x - eased.x) * 0.1;
    eased.y += (real.y - eased.y) * 0.1;
    const SIG = 0.18 * Math.min(width, height);
    const PULL = 0.15 * Math.min(width, height);
    const s2 = 2 * SIG * SIG;
    for (const row of grid) for (const p of row) {
      const dx = eased.x - p.baseX, dy = eased.y - p.baseY;
      const d = Math.sqrt(dx * dx + dy * dy);
      const g = Math.exp(-(d * d) / s2);
      p.g = g;
      p.x = p.baseX + (d > 0 ? dx / d : 0) * g * PULL;
      p.y = p.baseY + (d > 0 ? dy / d : 0) * g * PULL;
    }
  }

  function draw() {
    ctx.clearRect(0, 0, width, height);
    ctx.strokeStyle = accent;
    for (let r = 0; r < grid.length; r++) for (let c = 0; c < grid[r].length; c++) {
      const p = grid[r][c];
      const right = grid[r][c + 1], below = grid[r + 1]?.[c];
      for (const q of [right, below]) {
        if (!q) continue;
        const g = (p.g + q.g) / 2;
        if (g < 0.004) continue;
        ctx.globalAlpha = (0.04 + g * 0.62) * dim;
        ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y); ctx.stroke();
      }
    }
    ctx.fillStyle = "#ffffff";
    for (const row of grid) for (const p of row) {
      ctx.globalAlpha = (0.16 + p.g * 0.62) * dim;
      ctx.beginPath(); ctx.arc(p.x, p.y, 0.9 + p.g * 1.9, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function loop() {
    if (!running) return;
    if (dim > 0.001) { step(); draw(); }
    requestAnimationFrame(loop);
  }

  host.addEventListener("pointermove", (e) => {
    if (e.pointerType === "touch") return;
    pointerIn = true; drift = false;
    const r = canvas.getBoundingClientRect();
    real.x = e.clientX - r.left; real.y = e.clientY - r.top;
  });
  host.addEventListener("pointerleave", () => { drift = true; });

  new ResizeObserver(resize).observe(host);
  new IntersectionObserver(([entry]) => {
    const vis = entry.isIntersecting;
    if (vis && !running) { running = true; requestAnimationFrame(loop); }
    if (!vis) running = false;
  }).observe(host);
  resize();
  step(); draw();

  return { setDim(v: number) { dim = v; if (!running) draw(); } };
}
