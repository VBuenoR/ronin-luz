'use strict';
// ─── Utilidades gerais ───────────────────────────────────────────────
const U = {
  clamp(v, a, b) { return v < a ? a : v > b ? b : v; },
  lerp(a, b, t) { return a + (b - a) * t; },
  rand(a, b) { return a + Math.random() * (b - a); },
  randi(a, b) { return Math.floor(a + Math.random() * (b - a + 1)); },
  pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; },
  chance(p) { return Math.random() < p; },
  aabb(a, b) { return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y; },
  dist(x1, y1, x2, y2) { const dx = x2 - x1, dy = y2 - y1; return Math.sqrt(dx * dx + dy * dy); },
  // RNG determinístico para decoração do mundo
  seeded(seed) {
    let s = seed >>> 0;
    return function () { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
  },
  easeOut(t) { return 1 - Math.pow(1 - t, 3); },
  easeIn(t) { return t * t * t; },
  easeInOut(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; },
  // mistura duas cores [r,g,b]
  mixRGB(c1, c2, t) {
    return [
      Math.round(U.lerp(c1[0], c2[0], t)),
      Math.round(U.lerp(c1[1], c2[1], t)),
      Math.round(U.lerp(c1[2], c2[2], t))
    ];
  },
  rgb(c, a) { return a === undefined ? `rgb(${c[0]},${c[1]},${c[2]})` : `rgba(${c[0]},${c[1]},${c[2]},${a})`; },
  fmtTime(frames) {
    const s = Math.floor(frames / 60), m = Math.floor(s / 60), r = s % 60;
    return m + ':' + String(r).padStart(2, '0');
  }
};
