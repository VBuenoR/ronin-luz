'use strict';

// Gerador procedural de árvores e formações vulcânicas.
// Toda geometria é visual e cacheada. Nenhum collider é criado ou modificado.
const TreeSystem = {
  VERSION: 4,
  factors: [0.25, 0.45, 0.7],
  layers: [[], [], []],
  fireLayers: [[], []],
  gameplay: { floresta: [], fogo: [] },
  ready: false,
  stats: {
    standard: 0,
    cedar: 0,
    leaning: 0,
    forked: 0,
    dead: 0,
    wide: 0,
    basalt: 0,
    charred: 0,
    gameplay: 0,
    smokeBlobs: 0,
    generationMs: 0
  },

  clamp(v, a, b) { return v < a ? a : v > b ? b : v; },
  lerp(a, b, t) { return a + (b - a) * t; },
  smoothstep(t) {
    t = this.clamp(t, 0, 1);
    return t * t * (3 - 2 * t);
  },

  hash() {
    let h = 2166136261 >>> 0;
    for (let i = 0; i < arguments.length; i++) {
      const value = arguments[i];
      if (typeof value === 'string') {
        for (let j = 0; j < value.length; j++) {
          h ^= value.charCodeAt(j);
          h = Math.imul(h, 16777619);
        }
      } else {
        h ^= Math.round(Number(value) * 1000);
        h = Math.imul(h, 16777619);
      }
    }
    h ^= h >>> 16;
    return h >>> 0;
  },

  hash01(i, seed) {
    let h = (i | 0) ^ seed;
    h = Math.imul(h ^ (h >>> 16), 0x45d9f3b);
    h = Math.imul(h ^ (h >>> 15), 0x45d9f3b);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967295;
  },

  noise1D(x, seed) {
    const i = Math.floor(x);
    const t = x - i;
    const f = t * t * (3 - 2 * t);
    return this.hash01(i, seed) * (1 - f) + this.hash01(i + 1, seed) * f;
  },

  weightedPick(rng, entries) {
    let total = 0;
    for (let i = 0; i < entries.length; i++) total += entries[i][1];
    let roll = rng() * total;
    for (let i = 0; i < entries.length; i++) {
      roll -= entries[i][1];
      if (roll <= 0) return entries[i][0];
    }
    return entries[entries.length - 1][0];
  },

  init(worldWidth, forestOneways, fireOneways) {
    const started = typeof performance !== 'undefined' ? performance.now() : Date.now();
    this.layers = [[], [], []];
    this.fireLayers = [[], []];
    this.gameplay = { floresta: [], fogo: [] };
    this.stats = {
      standard: 0,
      cedar: 0,
      leaning: 0,
      forked: 0,
      dead: 0,
      wide: 0,
      basalt: 0,
      charred: 0,
      gameplay: 0,
      smokeBlobs: 0,
      generationMs: 0
    };

    if (typeof Path2D === 'undefined') {
      this.ready = false;
      return;
    }

    this.generateStandardLayers(worldWidth, 20260714);
    this.generateFireLayers(worldWidth, 20260715);
    this.generateGameplayForest(forestOneways || [], 20260716);
    this.generateGameplayFire(fireOneways || [], 20260717);
    this.ready = true;

    const ended = typeof performance !== 'undefined' ? performance.now() : Date.now();
    this.stats.generationMs = ended - started;
  },

  archetypeWeights(worldX) {
    if (worldX < 1560) {
      return [['cedar', 30], ['leaning', 18], ['forked', 24], ['dead', 10], ['wide', 18]];
    }
    if (worldX < 2840) {
      return [['cedar', 14], ['leaning', 20], ['forked', 18], ['dead', 36], ['wide', 12]];
    }
    if (worldX < 5050) {
      return [['cedar', 18], ['leaning', 18], ['forked', 26], ['dead', 6], ['wide', 32]];
    }
    return [['cedar', 10], ['leaning', 30], ['forked', 24], ['dead', 18], ['wide', 18]];
  },

  crownFor(archetype, rng) {
    if (archetype === 'cedar') {
      return this.weightedPick(rng, [['tiered', 72], ['clustered', 18], ['windswept', 10]]);
    }
    if (archetype === 'leaning') {
      return this.weightedPick(rng, [['windswept', 64], ['clustered', 28], ['tiered', 8]]);
    }
    if (archetype === 'forked') {
      return this.weightedPick(rng, [['clustered', 68], ['windswept', 24], ['tiered', 8]]);
    }
    if (archetype === 'dead') return 'none';
    return this.weightedPick(rng, [['clustered', 58], ['tiered', 22], ['windswept', 20]]);
  },

  generateStandardLayers(worldWidth, seed) {
    const spacing = [
      [145, 145],
      [190, 210],
      [250, 270]
    ];

    for (let layer = 0; layer < 3; layer++) {
      const factor = this.factors[layer];
      const span = worldWidth * factor + 1100;
      let x = -120;
      let cell = 0;
      const history = [];

      while (x < span) {
        const cellSeed = this.hash(seed, 'forest', layer, cell++);
        const rng = U.seeded(cellSeed);
        x += spacing[layer][0] + rng() * spacing[layer][1];
        const worldX = Math.max(0, x / factor);
        let archetype = this.weightedPick(rng, this.archetypeWeights(worldX));

        if (history.length >= 2 && history[history.length - 1] === archetype &&
            history[history.length - 2] === archetype) {
          const fallback = ['cedar', 'leaning', 'forked', 'dead', 'wide'];
          archetype = fallback[(fallback.indexOf(archetype) + 1 + Math.floor(rng() * 3)) % fallback.length];
        }
        history.push(archetype);

        const height = (135 + rng() * 130) * (1 + layer * 0.5);
        let baseWidth = (14 + rng() * 15) * (1 + layer * 0.28);
        if (archetype === 'cedar') baseWidth *= 1.12;
        if (archetype === 'wide') baseWidth *= 1.28;

        const spec = {
          x,
          height,
          baseWidth,
          archetype,
          crownFamily: this.crownFor(archetype, rng),
          seed: cellSeed,
          layer,
          factor,
          phase: rng() * Math.PI * 2,
          leanSign: rng() < 0.5 ? -1 : 1
        };
        spec.geometry = this.buildTreeGeometry(spec);
        this.layers[layer].push(spec);
        this.stats.standard++;
        this.stats[archetype]++;
      }
    }
  },

  emptyTreeGeometry() {
    return {
      wood: new Path2D(),
      trunk: new Path2D(),
      branches: new Path2D(),
      roots: new Path2D(),
      knots: new Path2D(),
      bark: new Path2D(),
      broken: new Path2D(),
      crowns: [],
      spines: [],
      bounds: { minX: -50, maxX: 50, minY: -200, maxY: 14 }
    };
  },

  curvePoint(curve, t) {
    const q = 1 - t;
    return {
      x: q * q * q * curve.p0.x + 3 * q * q * t * curve.p1.x +
        3 * q * t * t * curve.p2.x + t * t * t * curve.p3.x,
      y: q * q * q * curve.p0.y + 3 * q * q * t * curve.p1.y +
        3 * q * t * t * curve.p2.y + t * t * t * curve.p3.y
    };
  },

  curveTangent(curve, t) {
    const q = 1 - t;
    return {
      x: 3 * q * q * (curve.p1.x - curve.p0.x) +
        6 * q * t * (curve.p2.x - curve.p1.x) +
        3 * t * t * (curve.p3.x - curve.p2.x),
      y: 3 * q * q * (curve.p1.y - curve.p0.y) +
        6 * q * t * (curve.p2.y - curve.p1.y) +
        3 * t * t * (curve.p3.y - curve.p2.y)
    };
  },

  ribbonPath(curve, radius0, radius1, exponent, samples) {
    const left = [];
    const right = [];
    for (let i = 0; i <= samples; i++) {
      const t = i / samples;
      const point = this.curvePoint(curve, t);
      const tangent = this.curveTangent(curve, t);
      const length = Math.max(0.001, Math.hypot(tangent.x, tangent.y));
      const nx = -tangent.y / length;
      const ny = tangent.x / length;
      const radius = radius1 + (radius0 - radius1) * Math.pow(1 - t, exponent);
      left.push({ x: point.x + nx * radius, y: point.y + ny * radius });
      right.push({ x: point.x - nx * radius, y: point.y - ny * radius });
    }

    const path = new Path2D();
    path.moveTo(left[0].x, left[0].y);
    for (let i = 1; i < left.length; i++) path.lineTo(left[i].x, left[i].y);
    for (let i = right.length - 1; i >= 0; i--) path.lineTo(right[i].x, right[i].y);
    path.closePath();
    return path;
  },

  addRibbon(target, curve, radius0, radius1, exponent, samples) {
    target.addPath(this.ribbonPath(curve, radius0, radius1, exponent, samples));
  },

  branchCurve(origin, end, bend) {
    const dx = end.x - origin.x;
    const dy = end.y - origin.y;
    return {
      p0: origin,
      p1: {
        x: origin.x + dx * 0.3,
        y: origin.y + dy * 0.28 - Math.abs(dx) * bend * 0.25
      },
      p2: {
        x: origin.x + dx * 0.72,
        y: origin.y + dy * 0.72 - Math.abs(dx) * bend
      },
      p3: end
    };
  },

  addBranch(geometry, origin, end, width, bend) {
    const curve = this.branchCurve(origin, end, bend);
    this.addRibbon(geometry.branches, curve, width, 0.75, 0.82, 8);
    geometry.spines.push(curve);
    geometry.knots.ellipse(origin.x, origin.y, width * 0.8, width * 0.55, 0, 0, Math.PI * 2);
  },

  addRoots(geometry, width, rng, leanSign, count) {
    const roots = count || 4;
    for (let i = 0; i < roots; i++) {
      const side = i % 2 ? 1 : -1;
      const strength = side === -leanSign ? 1.25 : 0.88;
      const length = (22 + rng() * 42) * strength;
      const curve = {
        p0: { x: side * width * 0.2, y: -1 },
        p1: { x: side * length * 0.28, y: 1 + rng() * 3 },
        p2: { x: side * length * 0.7, y: 5 + rng() * 5 },
        p3: { x: side * length, y: 7 + rng() * 6 }
      };
      this.addRibbon(geometry.roots, curve, width * (0.22 + rng() * 0.1), 0.65, 0.8, 7);
    }
  },

  buildTreeGeometry(spec) {
    const rng = U.seeded(spec.seed ^ 0x6a09e667);
    const g = this.emptyTreeGeometry();
    const h = spec.height;
    const w = spec.baseWidth;
    const side = spec.leanSign;
    const anchors = [];

    if (spec.archetype === 'cedar') {
      const lean = side * h * (0.012 + rng() * 0.038);
      const curve = {
        p0: { x: 0, y: 0 },
        p1: { x: -lean * 0.12, y: -h * 0.34 },
        p2: { x: lean * 0.46, y: -h * 0.72 },
        p3: { x: lean, y: -h }
      };
      this.addRibbon(g.trunk, curve, w * 0.56, 1.1, 0.72, 14);
      g.spines.push(curve);
      const branchCount = 4 + spec.layer;
      for (let i = 0; i < branchCount; i++) {
        const t = 0.38 + i / Math.max(1, branchCount - 1) * 0.48;
        const origin = this.curvePoint(curve, t);
        const branchSide = i % 2 ? 1 : -1;
        const length = h * (0.2 - t * 0.075) * (0.82 + rng() * 0.3);
        this.addBranch(g, origin, {
          x: origin.x + branchSide * length,
          y: origin.y - length * (0.12 + rng() * 0.16)
        }, w * (0.15 - t * 0.07), 0.18 + rng() * 0.16);
      }
      anchors.push(curve.p3);
      g.bark.moveTo(-w * 0.13, -h * 0.12);
      g.bark.bezierCurveTo(lean * 0.1, -h * 0.35, lean * 0.2, -h * 0.55, lean * 0.48, -h * 0.68);
    } else if (spec.archetype === 'leaning') {
      const lean = side * h * (0.19 + rng() * 0.15);
      const curve = {
        p0: { x: 0, y: 0 },
        p1: { x: lean * 0.08, y: -h * 0.31 },
        p2: { x: lean * 0.69, y: -h * 0.72 },
        p3: { x: lean, y: -h }
      };
      this.addRibbon(g.trunk, curve, w * 0.53, 1, 0.74, 14);
      g.spines.push(curve);
      const branchCount = 3 + spec.layer;
      for (let i = 0; i < branchCount; i++) {
        const t = 0.43 + i / Math.max(1, branchCount - 1) * 0.43;
        const origin = this.curvePoint(curve, t);
        const mainSide = i === 0 ? -side : side;
        const length = h * (mainSide === side ? 0.18 : 0.11) * (0.82 + rng() * 0.35);
        this.addBranch(g, origin, {
          x: origin.x + mainSide * length,
          y: origin.y - length * (0.15 + rng() * 0.2)
        }, w * (0.14 - t * 0.055), 0.25 + rng() * 0.22);
      }
      anchors.push(curve.p3);
      g.bark.moveTo(-w * 0.1, -h * 0.08);
      g.bark.bezierCurveTo(lean * 0.08, -h * 0.28, lean * 0.44, -h * 0.56, lean * 0.74, -h * 0.76);
    } else if (spec.archetype === 'forked') {
      const forkY = -h * (0.39 + rng() * 0.2);
      const fork = { x: side * h * 0.025, y: forkY };
      const main = {
        p0: { x: 0, y: 0 },
        p1: { x: -side * w * 0.2, y: forkY * 0.35 },
        p2: { x: side * w * 0.32, y: forkY * 0.76 },
        p3: fork
      };
      this.addRibbon(g.trunk, main, w * 0.56, w * 0.31, 0.75, 10);
      g.spines.push(main);
      const endA = { x: -side * h * (0.14 + rng() * 0.08), y: -h * (0.83 + rng() * 0.12) };
      const endB = { x: side * h * (0.18 + rng() * 0.1), y: -h * (0.7 + rng() * 0.13) };
      const armA = this.branchCurve(fork, endA, 0.34);
      const armB = this.branchCurve(fork, endB, 0.24);
      this.addRibbon(g.branches, armA, w * 0.31, 0.95, 0.78, 11);
      this.addRibbon(g.branches, armB, w * 0.26, 0.9, 0.78, 10);
      g.spines.push(armA, armB);
      g.knots.ellipse(fork.x, fork.y, w * 0.34, w * 0.22, 0, 0, Math.PI * 2);
      anchors.push(endA, endB);
      this.addBranch(g, this.curvePoint(armA, 0.54), {
        x: endA.x - side * h * 0.13,
        y: endA.y + h * 0.08
      }, w * 0.1, 0.28);
      this.addBranch(g, this.curvePoint(armB, 0.5), {
        x: endB.x + side * h * 0.11,
        y: endB.y + h * 0.04
      }, w * 0.09, 0.22);
    } else if (spec.archetype === 'dead') {
      const lean = side * h * (0.07 + rng() * 0.13);
      const curve = {
        p0: { x: 0, y: 0 },
        p1: { x: -lean * 0.15, y: -h * 0.34 },
        p2: { x: lean * 0.55, y: -h * 0.7 },
        p3: { x: lean, y: -h * (0.86 + rng() * 0.08) }
      };
      this.addRibbon(g.trunk, curve, w * 0.52, 1.2, 0.94, 12);
      g.spines.push(curve);
      this.growDeadBranches(g, curve, h, w, rng, spec.layer);
      anchors.push(curve.p3);
    } else {
      const topY = -h * (0.68 + rng() * 0.12);
      const trunkTop = { x: side * h * 0.04, y: topY };
      const curve = {
        p0: { x: 0, y: 0 },
        p1: { x: -side * w * 0.12, y: topY * 0.35 },
        p2: { x: side * h * 0.035, y: topY * 0.74 },
        p3: trunkTop
      };
      this.addRibbon(g.trunk, curve, w * 0.62, w * 0.32, 0.72, 11);
      g.spines.push(curve);
      const span = h * (1.08 + rng() * 0.52);
      const leftEnd = { x: -span * 0.5, y: topY - h * (0.03 + rng() * 0.04) };
      const rightEnd = { x: span * 0.5, y: topY + h * (rng() - 0.5) * 0.05 };
      this.addBranch(g, trunkTop, leftEnd, w * 0.31, 0.2);
      this.addBranch(g, trunkTop, rightEnd, w * 0.36, 0.18);
      anchors.push(leftEnd, rightEnd, trunkTop);
    }

    this.addRoots(g, w, rng, side, spec.archetype === 'wide' ? 5 : 4);
    this.buildCanopy(g, spec, anchors, rng);
    g.wood.addPath(g.trunk);
    g.wood.addPath(g.branches);
    g.wood.addPath(g.broken);

    // Uma linha estrutural cacheada por espinha revela conicidade e direção
    // sem transformar o tronco em uma massa ruidosa.
    for (let i = 0; i < g.spines.length; i++) {
      const spine = g.spines[i];
      g.bark.moveTo(spine.p0.x, spine.p0.y);
      g.bark.bezierCurveTo(
        spine.p1.x, spine.p1.y,
        spine.p2.x, spine.p2.y,
        spine.p3.x, spine.p3.y
      );
    }

    const horizontal = spec.archetype === 'wide' ? h * 0.92 :
      spec.archetype === 'dead' ? h * 0.48 : h * 0.4;
    g.bounds = {
      minX: -horizontal + Math.min(0, side * h * 0.22) - 30,
      maxX: horizontal + Math.max(0, side * h * 0.22) + 30,
      minY: -h * 1.16,
      maxY: 18
    };
    return g;
  },

  growDeadBranches(g, trunkCurve, h, w, rng, layer) {
    const maxDepth = layer === 0 ? 2 : 3;
    let branchBudget = layer === 0 ? 6 : layer === 1 ? 9 : 12;
    const recurse = (origin, angle, length, width, depth) => {
      if (depth <= 0 || length < 9 || branchBudget-- <= 0) return;
      const bend = (rng() - 0.5) * 0.42;
      const end = {
        x: origin.x + Math.cos(angle + bend) * length,
        y: origin.y + Math.sin(angle + bend) * length
      };
      this.addBranch(g, origin, end, width, 0.12 + rng() * 0.25);
      if (rng() < 0.34) {
        const tip = width * 1.7;
        g.broken.moveTo(end.x - tip, end.y + tip * 0.4);
        g.broken.lineTo(end.x + tip * 0.35, end.y - tip);
        g.broken.lineTo(end.x + tip, end.y + tip * 0.35);
        g.broken.closePath();
      }
      const children = rng() < 0.62 ? 2 : 1;
      for (let i = 0; i < children; i++) {
        recurse(
          end,
          angle + (rng() - 0.5) * 1.18,
          length * (0.54 + rng() * 0.17),
          width * 0.58,
          depth - 1
        );
      }
    };

    const roots = [
      { t: 0.42, side: -1 },
      { t: 0.55, side: 1 },
      { t: 0.7, side: -1 },
      { t: 0.8, side: 1 }
    ];
    for (let i = 0; i < roots.length; i++) {
      const origin = this.curvePoint(trunkCurve, roots[i].t);
      const angle = roots[i].side < 0 ? -Math.PI * 0.88 : -Math.PI * 0.12;
      recurse(origin, angle, h * (0.16 + rng() * 0.11), w * 0.13, maxDepth);
    }
  },

  makeBlobPath(cx, cy, rx, ry, seed, pointCount) {
    const rng = U.seeded(seed);
    const points = [];
    const count = pointCount || 14;
    for (let i = 0; i < count; i++) {
      const angle = i / count * Math.PI * 2;
      const radial = 0.84 + rng() * 0.26 +
        Math.sin(angle * 3 + (seed & 255) * 0.017) * 0.055;
      points.push({
        x: cx + Math.cos(angle) * rx * radial,
        y: cy + Math.sin(angle) * ry * radial
      });
    }

    const path = new Path2D();
    const last = points[points.length - 1];
    const first = points[0];
    path.moveTo((last.x + first.x) * 0.5, (last.y + first.y) * 0.5);
    for (let i = 0; i < points.length; i++) {
      const current = points[i];
      const next = points[(i + 1) % points.length];
      path.quadraticCurveTo(
        current.x, current.y,
        (current.x + next.x) * 0.5,
        (current.y + next.y) * 0.5
      );
    }
    path.closePath();
    return path;
  },

  makeCanopyMass(cx, cy, rx, ry, seed, holeCount) {
    const mass = new Path2D();
    mass.addPath(this.makeBlobPath(cx, cy, rx, ry, seed, 14));
    const rng = U.seeded(seed ^ 0x510e527f);
    for (let i = 0; i < holeCount; i++) {
      const angle = rng() * Math.PI * 2;
      const distance = rx * (0.12 + rng() * 0.32);
      const hx = cx + Math.cos(angle) * distance;
      const hy = cy + Math.sin(angle) * distance * 0.45;
      mass.addPath(this.makeBlobPath(
        hx, hy,
        rx * (0.1 + rng() * 0.12),
        ry * (0.16 + rng() * 0.16),
        seed ^ Math.imul(i + 1, 0x9e3779b1),
        9
      ));
    }
    return mass;
  },

  makeLeafPath(cx, cy, rx, ry, rotation, seed) {
    const rng = U.seeded(seed);
    const raw = [
      [-1, 0],
      [-0.48, -0.86 - rng() * 0.18],
      [0.08, -0.68 - rng() * 0.16],
      [1, 0],
      [0.12, 0.62 + rng() * 0.2],
      [-0.54, 0.72 + rng() * 0.18]
    ];
    const cs = Math.cos(rotation), sn = Math.sin(rotation);
    const points = raw.map((p) => ({
      x: cx + p[0] * rx * cs - p[1] * ry * sn,
      y: cy + p[0] * rx * sn + p[1] * ry * cs
    }));
    const path = new Path2D();
    path.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      const a = points[i - 1], b = points[i];
      path.quadraticCurveTo(a.x, a.y, (a.x + b.x) * 0.5, (a.y + b.y) * 0.5);
    }
    const last = points[points.length - 1], first = points[0];
    path.quadraticCurveTo(last.x, last.y, first.x, first.y);
    path.closePath();
    return path;
  },

  buildForegroundFoliage(fe) {
    const mass = new Path2D();
    const leafCount = fe.type === 'branch' ? 6 : 3;
    const direction = fe.type === 'branch' ? -1 : (fe.s < 0.5 ? -1 : 1);
    for (let i = 0; i < leafCount; i++) {
      const x = fe.type === 'branch'
        ? -112 + i * 32
        : direction * (48 + i * 21);
      const y = fe.type === 'branch'
        ? 151 - i * 9
        : 170 + fe.s * 145 + i * 8;
      const rx = 12 + fe.s * 5;
      const ry = 5.5 + fe.s * 2.5;
      const rotation = direction * 0.34 + (i - leafCount * 0.5) * 0.035;
      mass.addPath(this.makeLeafPath(x, y, rx, ry, rotation, this.hash(fe.seed, i, 0)));
      if (i % 2 === 0) {
        mass.addPath(this.makeLeafPath(
          x - direction * rx * 0.32,
          y + ry * 0.62,
          rx * 0.68,
          ry * 0.72,
          rotation - direction * 0.42,
          this.hash(fe.seed, i, 1)
        ));
      }
    }
    return mass;
  },

  buildCanopy(g, spec, anchors, rng) {
    if (spec.crownFamily === 'none' || !anchors.length) return;
    const h = spec.height;
    const layer = spec.layer;
    const holes = layer === 0 ? 0 : layer === 1 ? 1 : 2;
    const centerX = anchors.reduce((sum, p) => sum + p.x, 0) / anchors.length;

    if (spec.crownFamily === 'tiered') {
      const count = 3 + layer;
      for (let i = 0; i < count; i++) {
        const t = i / Math.max(1, count - 1);
        const cy = -h * (0.5 + t * 0.41);
        const rx = h * (0.2 - t * 0.065) * (0.86 + rng() * 0.24);
        const ry = h * (0.036 + rng() * 0.026);
        const cx = centerX * (0.52 + t * 0.48) + (rng() - 0.5) * h * 0.045;
        g.crowns.push(this.makeCanopyMass(
          cx, cy, rx, ry,
          this.hash(spec.seed, 'tier', i),
          i === 0 ? Math.min(1, holes) : 0
        ));
      }
    } else if (spec.crownFamily === 'clustered') {
      const count = 3 + layer * 2;
      for (let i = 0; i < count; i++) {
        const anchor = anchors[i % anchors.length];
        const dominant = i === 0 ? 1.24 : 1;
        const angle = (i / count * Math.PI * 2) + rng() * 0.45;
        const spread = h * (0.045 + rng() * 0.075);
        const cx = anchor.x + Math.cos(angle) * spread;
        const cy = anchor.y + Math.sin(angle) * spread * 0.55 + h * 0.018;
        const rx = h * (0.075 + rng() * 0.055) * dominant;
        const ry = h * (0.045 + rng() * 0.035) * dominant;
        g.crowns.push(this.makeCanopyMass(
          cx, cy, rx, ry,
          this.hash(spec.seed, 'cluster', i),
          i < Math.min(2, holes) ? 1 : 0
        ));
      }
    } else {
      const direction = spec.leanSign;
      const count = 2 + layer;
      const anchor = anchors[0];
      for (let i = 0; i < count; i++) {
        const cx = anchor.x + direction * h * (0.045 + i * 0.07) +
          (rng() - 0.5) * h * 0.025;
        const cy = anchor.y + h * (0.02 + i * 0.035);
        const rx = h * (0.145 - i * 0.018) * (0.9 + rng() * 0.2);
        const ry = h * (0.042 + rng() * 0.025);
        g.crowns.push(this.makeCanopyMass(
          cx, cy, rx, ry,
          this.hash(spec.seed, 'wind', i),
          i === 0 ? Math.min(1, holes) : 0
        ));
      }
    }
  },

  drawTreeGeometry(ctx, item, color, alpha) {
    const g = item.geometry;
    const layer = item.layer || 0;
    const trunkColor = U.mixRGB(color, [2, 5, 11], 0.08 + layer * 0.03);
    const crownColor = U.mixRGB(color, [10, 24, 27], 0.08 + layer * 0.025);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = U.rgb(U.mixRGB(trunkColor, [1, 3, 7], 0.18));
    ctx.fill(g.roots);
    ctx.fillStyle = U.rgb(trunkColor);
    ctx.fill(g.wood);
    ctx.fillStyle = 'rgba(1,4,9,0.34)';
    ctx.fill(g.knots);
    ctx.strokeStyle = layer === 0
      ? 'rgba(91,124,136,0.08)'
      : layer === 1
        ? 'rgba(100,137,144,0.12)'
        : 'rgba(110,149,153,0.15)';
    ctx.lineWidth = layer === 2 ? 1.05 : layer === 1 ? 0.72 : 0.5;
    ctx.stroke(g.bark);
    ctx.fillStyle = U.rgb(crownColor);
    for (let i = 0; i < g.crowns.length; i++) {
      ctx.globalAlpha = alpha * (0.82 + (i % 3) * 0.07);
      ctx.fill(g.crowns[i], 'evenodd');
    }
    ctx.restore();
  },

  drawLayer(ctx, layerIndex, cam, frames, color, baseY) {
    if (!this.ready) return;
    const items = this.layers[layerIndex];
    const factor = this.factors[layerIndex];
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const sx = item.x - cam.x * factor;
      const b = item.geometry.bounds;
      if (sx + b.maxX < -90 || sx + b.minX > 1050) continue;
      ctx.save();
      ctx.translate(sx, baseY);
      this.drawTreeGeometry(ctx, item, color, 0.86 + layerIndex * 0.05);
      ctx.restore();
    }
  },

  generateFireLayers(worldWidth, seed) {
    const configs = [
      { factor: 0.22, minGap: 275, gap: 250, minH: 115, height: 105, layer: 0 },
      { factor: 0.48, minGap: 390, gap: 320, minH: 175, height: 135, layer: 1 }
    ];
    for (let li = 0; li < configs.length; li++) {
      const cfg = configs[li];
      const span = worldWidth * cfg.factor + 1200;
      let x = -100;
      let cell = 0;
      while (x < span) {
        const cellSeed = this.hash(seed, 'fire', li, cell++);
        const rng = U.seeded(cellSeed);
        x += cfg.minGap + rng() * cfg.gap;
        const roll = rng();
        if (roll > 0.93) continue;
        const type = roll < 0.67 ? 'basalt' : 'charred';
        const item = {
          x,
          layer: cfg.layer,
          factor: cfg.factor,
          type,
          height: cfg.minH + rng() * cfg.height,
          width: 28 + rng() * 31,
          seed: cellSeed,
          phase: rng() * Math.PI * 2
        };
        item.geometry = type === 'basalt'
          ? this.buildBasaltGeometry(item, false)
          : this.buildCharredGeometry(item);
        this.fireLayers[li].push(item);
        this.stats[type]++;
      }
    }
  },

  emptyFireGeometry() {
    return {
      body: new Path2D(),
      facet: new Path2D(),
      crusts: [],
      ash: new Path2D(),
      ember: new Path2D(),
      smoke: [],
      bounds: { minX: -80, maxX: 80, minY: -260, maxY: 18 }
    };
  },

  addAngularColumn(g, cx, height, width, rng, crust) {
    const levels = 6 + Math.floor(rng() * 4);
    const left = [];
    const right = [];
    for (let i = 0; i <= levels; i++) {
      const t = i / levels;
      const y = -height * t;
      const taper = 1 - t * (0.12 + rng() * 0.12);
      const offset = (rng() - 0.5) * width * 0.17;
      left.push({ x: cx - width * 0.5 * taper + offset, y });
      right.push({ x: cx + width * 0.5 * taper + offset * 0.42, y });
    }

    g.body.moveTo(left[0].x, left[0].y);
    for (let i = 1; i < left.length; i++) g.body.lineTo(left[i].x, left[i].y);
    for (let i = right.length - 1; i >= 0; i--) g.body.lineTo(right[i].x, right[i].y);
    g.body.closePath();

    const midX = cx + width * 0.08;
    g.facet.moveTo(midX, 0);
    for (let i = 1; i < right.length; i++) {
      g.facet.lineTo(right[i].x, right[i].y);
    }
    g.facet.lineTo(midX + width * 0.02, -height);
    g.facet.closePath();

    if (rng() < 0.72) {
      let crackX = cx + (rng() - 0.5) * width * 0.25;
      let crackY = -height + 12 + rng() * 12;
      g.ember.moveTo(crackX, crackY);
      const segments = 3 + Math.floor(rng() * 3);
      for (let i = 0; i < segments; i++) {
        crackX += (rng() - 0.5) * width * 0.2;
        crackY += height * (0.07 + rng() * 0.08);
        g.ember.lineTo(crackX, crackY);
      }
    }

    if (crust) {
      const capWidth = width * (1.12 + rng() * 0.27);
      const capDepth = 8 + rng() * 13;
      const cap = new Path2D();
      cap.moveTo(cx - capWidth * 0.5, -height + 2);
      cap.lineTo(cx - capWidth * 0.35, -height - 4 - rng() * 5);
      cap.lineTo(cx + capWidth * 0.1, -height - 2 - rng() * 4);
      cap.lineTo(cx + capWidth * 0.5, -height + 1);
      cap.lineTo(cx + capWidth * 0.36, -height + capDepth);
      cap.lineTo(cx + capWidth * 0.04, -height + capDepth * (0.72 + rng() * 0.3));
      if (rng() < 0.45) {
        cap.lineTo(cx - capWidth * 0.08, -height + capDepth + 7 + rng() * 8);
      }
      cap.lineTo(cx - capWidth * 0.4, -height + capDepth * 0.78);
      cap.closePath();
      if (rng() < 0.42) {
        cap.addPath(this.makeBlobPath(
          cx + (rng() - 0.5) * capWidth * 0.25,
          -height + capDepth * 0.42,
          capWidth * 0.08,
          capDepth * 0.16,
          Math.floor(rng() * 0xffffffff),
          8
        ));
      }
      g.crusts.push(cap);
    }
  },

  makeAshBase(width, seed) {
    return this.makeBlobPath(0, 5, width, 10, seed, 12);
  },

  buildBasaltGeometry(item, support) {
    const rng = U.seeded(item.seed ^ 0xbb67ae85);
    const g = this.emptyFireGeometry();
    const count = support ? 3 : 3 + Math.floor(rng() * 4);
    const spread = item.width * (support ? 0.78 : 1.35);
    let topY = 0;
    for (let i = 0; i < count; i++) {
      const t = count === 1 ? 0.5 : i / (count - 1);
      const anchored = support && i === (count >> 1);
      const cx = anchored
        ? 0
        : (t - 0.5) * spread + (rng() - 0.5) * item.width * 0.16;
      // O pilar central alcança a face inferior da oneway vinculada. As
      // colunas laterais continuam irregulares e estritamente visuais.
      const height = anchored ? item.height : item.height * (0.62 + rng() * 0.38);
      const width = item.width * (0.43 + rng() * 0.3);
      topY = Math.min(topY, -height);
      this.addAngularColumn(g, cx, height, width, rng, rng() < 0.68);
    }
    g.ash.addPath(this.makeAshBase(spread * 0.72, item.seed ^ 0x3c6ef372));
    if (!support && rng() < 0.28) {
      this.addSmokeBlobs(g, { x: 0, y: topY + 8 }, item.height, item.seed, 2 + item.layer);
    }
    g.bounds = {
      minX: -spread * 0.72 - 24,
      maxX: spread * 0.72 + 24,
      minY: topY - 48,
      maxY: 18
    };
    this.expandBoundsForSmoke(g);
    return g;
  },

  buildCharredGeometry(item) {
    const spec = {
      height: item.height,
      baseWidth: item.width,
      archetype: item.seed % 2 ? 'dead' : 'leaning',
      crownFamily: 'none',
      seed: item.seed,
      layer: item.layer,
      leanSign: item.seed & 2 ? -1 : 1
    };
    const tree = this.buildTreeGeometry(spec);
    const g = this.emptyFireGeometry();
    g.body.addPath(tree.roots);
    g.body.addPath(tree.wood);
    g.facet.addPath(tree.knots);
    g.ash.addPath(this.makeAshBase(item.width * 1.2, item.seed ^ 0xa54ff53a));

    const rng = U.seeded(item.seed ^ 0x1f83d9ab);
    for (let s = 0; s < Math.min(3, tree.spines.length); s++) {
      const spine = tree.spines[s];
      const startT = s === 0 ? 0.1 : 0.18;
      const endT = s === 0 ? 0.7 : 0.56;
      for (let i = 0; i <= 5; i++) {
        const t = startT + (endT - startT) * i / 5;
        const point = this.curvePoint(spine, t);
        const x = point.x + (rng() - 0.5) * item.width * 0.08;
        const y = point.y;
        if (i === 0) g.ember.moveTo(x, y);
        else g.ember.lineTo(x, y);
      }
    }
    const top = tree.spines.length
      ? tree.spines[0].p3
      : { x: 0, y: -item.height };
    this.addSmokeBlobs(g, top, item.height, item.seed, 3 + item.layer);
    g.bounds = tree.bounds;
    this.expandBoundsForSmoke(g);
    return g;
  },

  addSmokeBlobs(g, origin, height, seed, count) {
    const rng = U.seeded(seed ^ 0x5be0cd19);
    for (let i = 0; i < count; i++) {
      const rx = height * (0.045 + rng() * 0.045);
      const ry = height * (0.025 + rng() * 0.035);
      g.smoke.push({
        x: origin.x + (rng() - 0.5) * height * 0.12,
        y: origin.y - i * height * 0.055 - rng() * 8,
        rx,
        ry,
        path: this.makeBlobPath(0, 0, rx, ry, this.hash(seed, 'smoke', i), 11),
        phase: rng() * Math.PI * 2,
        drift: 2 + rng() * 5,
        rise: 2 + rng() * 6,
        alpha: 0.07 + rng() * 0.08
      });
      this.stats.smokeBlobs++;
    }
  },

  expandBoundsForSmoke(g) {
    for (let i = 0; i < g.smoke.length; i++) {
      const blob = g.smoke[i];
      g.bounds.minX = Math.min(g.bounds.minX, blob.x - blob.rx - blob.drift - 3);
      g.bounds.maxX = Math.max(g.bounds.maxX, blob.x + blob.rx + blob.drift + 3);
      g.bounds.minY = Math.min(g.bounds.minY, blob.y - blob.ry - blob.rise - 3);
      g.bounds.maxY = Math.max(g.bounds.maxY, blob.y + blob.ry + 3);
    }
  },

  drawSmoke(ctx, smoke, frames, layerAlpha) {
    ctx.save();
    ctx.fillStyle = '#120d12';
    for (let i = 0; i < smoke.length; i++) {
      const blob = smoke[i];
      const dx = Math.sin(frames * 0.009 + blob.phase) * blob.drift;
      const dy = -Math.sin(frames * 0.006 + blob.phase * 1.4) * blob.rise;
      const scale = 1 + Math.sin(frames * 0.005 + blob.phase) * 0.025;
      ctx.save();
      ctx.translate(blob.x + dx, blob.y + dy);
      ctx.scale(scale, scale);
      ctx.globalAlpha = blob.alpha * layerAlpha;
      ctx.fill(blob.path);
      ctx.restore();
    }
    ctx.restore();
  },

  drawFireGeometry(ctx, item, frames, alpha) {
    const g = item.geometry;
    this.drawSmoke(ctx, g.smoke, frames, alpha);
    ctx.save();
    ctx.globalAlpha = alpha;
    if (item.type === 'basalt') {
      ctx.fillStyle = item.layer === 0 ? '#210c0f' : '#33161a';
      ctx.fill(g.body);
      ctx.strokeStyle = item.layer === 0 ? 'rgba(132,48,30,0.12)' : 'rgba(176,64,35,0.2)';
      ctx.lineWidth = item.layer === 0 ? 0.7 : 1.05;
      ctx.stroke(g.body);
      ctx.fillStyle = item.layer === 0 ? 'rgba(80,34,29,0.36)' : 'rgba(116,49,35,0.46)';
      ctx.fill(g.facet);
      ctx.fillStyle = item.layer === 0 ? '#321a1b' : '#4a2925';
      for (let i = 0; i < g.crusts.length; i++) {
        ctx.fill(g.crusts[i], 'evenodd');
        ctx.strokeStyle = 'rgba(161,74,43,0.16)';
        ctx.lineWidth = 0.65;
        ctx.stroke(g.crusts[i]);
      }
    } else {
      ctx.fillStyle = item.layer === 0 ? '#180a0c' : '#251013';
      ctx.fill(g.body);
      ctx.strokeStyle = item.layer === 0 ? 'rgba(111,45,31,0.11)' : 'rgba(158,55,31,0.18)';
      ctx.lineWidth = item.layer === 0 ? 0.7 : 1;
      ctx.stroke(g.body);
      ctx.fillStyle = 'rgba(2,2,5,0.42)';
      ctx.fill(g.facet);
    }
    ctx.fillStyle = item.layer === 0 ? 'rgba(35,18,19,0.76)' : 'rgba(57,29,26,0.8)';
    ctx.fill(g.ash);

    const pulse = 0.56 + Math.sin(frames * 0.035 + item.phase) * 0.18;
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = alpha * pulse;
    ctx.strokeStyle = 'rgba(224,70,28,0.48)';
    ctx.lineWidth = item.layer === 0 ? 1.6 : 2.35;
    ctx.stroke(g.ember);
    ctx.strokeStyle = 'rgba(255,133,58,0.84)';
    ctx.lineWidth = item.layer === 0 ? 0.58 : 0.86;
    ctx.stroke(g.ember);
    ctx.restore();
  },

  drawFireLayer(ctx, cam, frames, layer) {
    if (!this.ready) return;
    const configs = [
      { factor: 0.22, baseY: 548, alpha: 0.72 },
      { factor: 0.48, baseY: 568, alpha: 0.9 }
    ];
    const cfg = configs[layer];
    if (!cfg) return;
    const baseY = cfg.baseY - (cam.y - 1200) * cfg.factor * 0.28;
    const items = this.fireLayers[layer];
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const sx = item.x - cam.x * cfg.factor;
      const b = item.geometry.bounds;
      if (sx + b.maxX < -110 || sx + b.minX > 1070) continue;
      ctx.save();
      ctx.translate(sx, baseY);
      this.drawFireGeometry(ctx, item, frames, cfg.alpha);
      ctx.restore();
    }
    if (layer === 0) {
      ctx.fillStyle = 'rgba(72,24,18,0.07)';
      ctx.fillRect(0, 0, 960, 540);
    }
  },

  drawFireBackground(ctx, cam, frames) {
    for (let layer = 0; layer < this.fireLayers.length; layer++) {
      this.drawFireLayer(ctx, cam, frames, layer);
    }
  },

  generateGameplayForest(oneways, seed) {
    const configs = [
      { x: 2680, ratio: 0.56, baseY: 1200, alpha: 0.54 },
      { x: 4000, ratio: 0.36, baseY: 1200, alpha: 0.7 },
      { x: 4900, ratio: 0.63, baseY: 1240, alpha: 0.65 },
      { x: 6250, ratio: 0.46, baseY: 1200, alpha: 0.62 }
    ];
    for (let i = 0; i < configs.length; i++) {
      const cfg = configs[i];
      const rect = oneways.find((r) => r.x === cfg.x);
      if (!rect) continue;
      const item = this.buildGameplayWide(rect, cfg, this.hash(seed, cfg.x));
      this.gameplay.floresta.push(item);
      this.stats.gameplay++;
    }
  },

  buildGameplayWide(rect, config, seed) {
    const rng = U.seeded(seed);
    const g = this.emptyTreeGeometry();
    const worldX = rect.x + rect.w * config.ratio;
    const topY = rect.y - config.baseY;
    const height = -topY;
    const baseWidth = 34 + rng() * 18;
    const trunkTop = { x: 0, y: topY + 12 };
    const trunk = {
      p0: { x: 0, y: 0 },
      p1: { x: (rng() - 0.5) * 26, y: topY * 0.34 },
      p2: { x: (rng() - 0.5) * 38, y: topY * 0.72 },
      p3: trunkTop
    };
    this.addRibbon(g.trunk, trunk, baseWidth * 0.58, baseWidth * 0.25, 0.72, 18);
    g.spines.push(trunk);

    const leftEnd = { x: rect.x - worldX, y: topY + 8 };
    const rightEnd = { x: rect.x + rect.w - worldX, y: topY + 8 };
    this.addBranch(g, trunkTop, leftEnd, baseWidth * 0.28, 0.15);
    this.addBranch(g, trunkTop, rightEnd, baseWidth * 0.32, 0.13);
    this.addRoots(g, baseWidth, rng, config.ratio < 0.5 ? -1 : 1, 5);

    const crownSeed = seed ^ 0x9b05688c;
    g.crowns.push(this.makeCanopyMass(
      leftEnd.x + 20, topY - 18,
      Math.min(115, rect.w * 0.18), 26 + rng() * 15,
      crownSeed, 2
    ));
    g.crowns.push(this.makeCanopyMass(
      rightEnd.x - 24, topY - 12,
      Math.min(130, rect.w * 0.2), 29 + rng() * 18,
      crownSeed ^ 0x3c6ef372, 2
    ));
    if (rect.w > 500) {
      g.crowns.push(this.makeCanopyMass(
        (leftEnd.x + rightEnd.x) * 0.5, topY - 34,
        rect.w * 0.16, 34,
        crownSeed ^ 0xa54ff53a, 1
      ));
    }
    g.wood.addPath(g.trunk);
    g.wood.addPath(g.branches);
    g.wood.addPath(g.broken);
    for (let i = 0; i < g.spines.length; i++) {
      const spine = g.spines[i];
      g.bark.moveTo(spine.p0.x, spine.p0.y);
      g.bark.bezierCurveTo(
        spine.p1.x, spine.p1.y,
        spine.p2.x, spine.p2.y,
        spine.p3.x, spine.p3.y
      );
    }
    g.bounds = {
      minX: leftEnd.x - 150,
      maxX: rightEnd.x + 150,
      minY: topY - 100,
      maxY: 20
    };
    return {
      type: 'wideGameplay',
      worldX,
      baseY: config.baseY,
      linkedRect: rect,
      geometry: g,
      layer: 2,
      alpha: config.alpha,
      seed,
      phase: rng() * Math.PI * 2
    };
  },

  generateGameplayFire(oneways, seed) {
    const targets = [
      { x: 3050, baseY: 2280 },
      { x: 3620, baseY: 2280 },
      { x: 4330, baseY: 2280 },
      { x: 2580, baseY: 2300 },
      { x: 2120, baseY: 2280 }
    ];
    for (let i = 0; i < targets.length; i++) {
      const target = targets[i];
      const rect = oneways.find((r) => r.x === target.x);
      if (!rect) continue;
      const baseY = target.baseY;
      const height = Math.max(55, baseY - rect.y - 8);
      const item = {
        type: 'basalt',
        worldX: rect.x + rect.w * 0.5,
        baseY,
        height,
        width: Math.min(48, rect.w * 0.42),
        layer: 1,
        seed: this.hash(seed, rect.x, rect.y),
        phase: this.hash(seed, rect.x) / 4294967295 * Math.PI * 2,
        alpha: 0.66,
        linkedRect: rect
      };
      item.geometry = this.buildBasaltGeometry(item, true);
      this.gameplay.fogo.push(item);
      this.stats.gameplay++;
      this.stats.basalt++;
    }
  },

  drawGameplay(ctx, cam, frames, mapId, palette) {
    if (!this.ready) return;
    const list = this.gameplay[mapId] || [];
    for (let i = 0; i < list.length; i++) {
      const item = list[i];
      const sx = item.worldX - cam.x;
      const sy = item.baseY - cam.y;
      const b = item.geometry.bounds;
      if (sx + b.maxX < -120 || sx + b.minX > 1080 ||
          sy + b.maxY < -120 || sy + b.minY > 660) continue;
      ctx.save();
      ctx.translate(sx, sy);
      if (mapId === 'fogo') {
        this.drawFireGeometry(ctx, item, frames, item.alpha);
      } else {
        this.drawTreeGeometry(ctx, item, palette.tree, item.alpha);
      }
      ctx.restore();
    }
  },

  drawEmissive(ctx, cam, frames, mapId) {
    if (!this.ready || mapId !== 'fogo') return;
    const list = this.gameplay.fogo;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < list.length; i++) {
      const item = list[i];
      const sx = item.worldX - cam.x;
      const sy = item.baseY - cam.y;
      const b = item.geometry.bounds;
      if (sx + b.maxX < -100 || sx + b.minX > 1060 ||
          sy + b.maxY < -100 || sy + b.minY > 640) continue;
      const centerFade = 0.58 + 0.42 * this.smoothstep(Math.abs(sx - 480) / 290);
      const pulse = 0.56 + Math.sin(frames * 0.035 + item.phase) * 0.13;
      ctx.save();
      ctx.translate(sx, sy);
      ctx.globalAlpha = pulse * centerFade;
      ctx.strokeStyle = 'rgba(244,92,34,0.52)';
      ctx.lineWidth = 1.45;
      ctx.stroke(item.geometry.ember);
      ctx.strokeStyle = 'rgba(255,196,112,0.46)';
      ctx.lineWidth = 0.52;
      ctx.stroke(item.geometry.ember);
      ctx.restore();
    }
    ctx.restore();
  }
};

window.TreeSystem = TreeSystem;
