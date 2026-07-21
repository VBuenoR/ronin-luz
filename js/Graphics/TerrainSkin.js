'use strict';

// TerrainSkin desenha uma casca orgânica independente da física.
// World.solids e World.oneways continuam sendo a única fonte de colisão.
const TerrainSkin = {
  VERSION: 6,
  solidSkins: new WeakMap(),
  onewaySkins: new WeakMap(),
  mapCache: new Map(),
  visibleChunks: [],
  stats: {
    skins: 0, chunks: 0, samples: 0, features: 0,
    mossPatches: 0, cacheHit: false, generationMs: 0
  },

  profiles: {
    forest: {
      contactAmp: 1.15, macroFreq: 0.009, microFreq: 0.046, smooth: true,
      capDepth: 38, capBand: 9, onewayDepth: 24,
      mossCoverage: 0.38, rockDensity: 0.34, crackDensity: 0.2, rootDensity: 0.46,
      top: '#293b4e', mid: '#172638', bottom: '#070d18',
      edge: 'rgba(118,151,165,0.28)', rock: '#293a49',
      facet: 'rgba(126,155,166,0.28)', root: '#292b25'
    },
    ruins: {
      contactAmp: 0.85, macroFreq: 0.012, microFreq: 0.06, smooth: false,
      capDepth: 32, capBand: 8, onewayDepth: 20,
      mossCoverage: 0.23, rockDensity: 0.55, crackDensity: 0.82, rootDensity: 0.1,
      top: '#30394c', mid: '#1a2232', bottom: '#090d17',
      edge: 'rgba(142,151,174,0.28)', rock: '#353d4d',
      facet: 'rgba(166,177,194,0.28)', root: '#2b2927'
    },
    chasm: {
      contactAmp: 1.2, macroFreq: 0.014, microFreq: 0.07, smooth: false,
      capDepth: 44, capBand: 8, onewayDepth: 27,
      mossCoverage: 0.14, rockDensity: 0.76, crackDensity: 0.62, rootDensity: 0.05,
      top: '#2b3243', mid: '#171e2d', bottom: '#070b14',
      edge: 'rgba(128,139,159,0.26)', rock: '#303746',
      facet: 'rgba(154,163,180,0.25)', root: '#282628'
    },
    grove: {
      contactAmp: 1.25, macroFreq: 0.008, microFreq: 0.04, smooth: true,
      capDepth: 43, capBand: 10, onewayDepth: 28,
      mossCoverage: 0.47, rockDensity: 0.24, crackDensity: 0.12, rootDensity: 0.68,
      top: '#263d4c', mid: '#142b35', bottom: '#060e17',
      edge: 'rgba(104,159,158,0.3)', rock: '#263b43',
      facet: 'rgba(126,169,165,0.26)', root: '#283127'
    },
    tide: {
      contactAmp: 0.95, macroFreq: 0.008, microFreq: 0.036, smooth: true,
      capDepth: 34, capBand: 9, onewayDepth: 23,
      mossCoverage: 0.31, rockDensity: 0.52, crackDensity: 0.25, rootDensity: 0.12,
      top: '#254055', mid: '#142b3d', bottom: '#06101d',
      edge: 'rgba(112,169,190,0.3)', rock: '#29465a',
      facet: 'rgba(143,188,199,0.28)', root: '#26302d'
    },
    throne: {
      contactAmp: 0.75, macroFreq: 0.011, microFreq: 0.058, smooth: false,
      capDepth: 30, capBand: 8, onewayDepth: 19,
      mossCoverage: 0.17, rockDensity: 0.58, crackDensity: 0.78, rootDensity: 0.03,
      top: '#30334f', mid: '#191b35', bottom: '#080a1b',
      edge: 'rgba(147,148,197,0.28)', rock: '#373852',
      facet: 'rgba(177,178,221,0.25)', root: '#28252f'
    },
    submerged: {
      contactAmp: 0.9, macroFreq: 0.007, microFreq: 0.034, smooth: true,
      capDepth: 36, capBand: 9, onewayDepth: 24,
      mossCoverage: 0.27, rockDensity: 0.52, crackDensity: 0.3, rootDensity: 0.18,
      top: '#203c55', mid: '#10283d', bottom: '#050c1a',
      edge: 'rgba(101,164,198,0.3)', rock: '#29465c',
      facet: 'rgba(139,187,209,0.27)', root: '#24302e'
    },
    fire: {
      contactAmp: 1.2, macroFreq: 0.016, microFreq: 0.08, smooth: false,
      capDepth: 42, capBand: 9, onewayDepth: 26,
      mossCoverage: 0.13, rockDensity: 0.82, crackDensity: 0.92, rootDensity: 0,
      top: '#4a2928', mid: '#2b171a', bottom: '#0d080c',
      edge: 'rgba(190,91,61,0.3)', rock: '#4b2d2a',
      facet: 'rgba(230,132,83,0.27)', root: '#2c211f'
    },
    wind: {
      contactAmp: 0.7, macroFreq: 0.011, microFreq: 0.05, smooth: false,
      capDepth: 30, capBand: 7, onewayDepth: 19,
      mossCoverage: 0.26, rockDensity: 0.64, crackDensity: 0.78, rootDensity: 0.08,
      top: '#6b6e72', mid: '#4a4d54', bottom: '#2a2d34',
      edge: 'rgba(180,178,168,0.32)', rock: '#7a7870',
      facet: 'rgba(200,196,182,0.30)', root: '#4a5040'
    }
  },

  clamp(v, a, b) { return v < a ? a : v > b ? b : v; },
  lerp(a, b, t) { return a + (b - a) * t; },
  smoothstep(t) {
    t = this.clamp(t, 0, 1);
    return t * t * (3 - 2 * t);
  },

  hashString(str) {
    let h = 2166136261 >>> 0;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  },

  mixSeed(rect, mapId, salt, oneWay) {
    let h = (salt ^ this.hashString(String(mapId))) >>> 0;
    h ^= Math.imul(Math.round(rect.x + 8192), 0x85ebca6b);
    h ^= Math.imul(Math.round(rect.y + 4096), 0xc2b2ae35);
    h ^= Math.imul(Math.round(rect.w), 0x27d4eb2d);
    h ^= Math.imul(Math.round(rect.h), 0x165667b1);
    h ^= oneWay ? 0x9e3779b9 : 0x68bc21eb;
    h ^= Math.imul((rect.visualSeed || 0) | 0, 0x45d9f3b);
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

  fbm(x, seed) {
    const a = this.noise1D(x, seed) * 2 - 1;
    const b = this.noise1D(x * 2.03 + 17.1, seed ^ 0x68bc21eb) * 2 - 1;
    const c = this.noise1D(x * 4.07 - 9.4, seed ^ 0x02e5be93) * 2 - 1;
    return (a + b * 0.5 + c * 0.25) / 1.75;
  },

  profileIdAt(x, y, mapId) {
    if (mapId === 'vento') return 'wind';
    if (mapId === 'fogo') return 'fire';
    if (y > 1450) return 'submerged';
    if (x < 1560) return 'forest';
    if (x < 2840) return 'ruins';
    if (x < 3800) return 'chasm';
    if (x < 5050) return 'grove';
    if (x < 6200) return 'tide';
    return 'throne';
  },

  classify(rect, oneWay) {
    if (oneWay) return 'oneway';
    if (rect.w <= 125 && rect.h >= rect.w * 1.55) return 'pillar';
    if (rect.w >= 520 && rect.h >= 75) return 'ground';
    if (rect.h <= 85 || rect.w >= rect.h * 1.5) return 'island';
    if (rect.h >= rect.w * 1.2) return 'wall';
    return 'mass';
  },

  geometrySignature(solids, oneways) {
    let h = 2166136261 >>> 0;
    const visit = (r, flag) => {
      const values = [r.x, r.y, r.w, r.h, flag, r.visualSeed || 0];
      for (let i = 0; i < values.length; i++) {
        h ^= Math.round(values[i] * 10);
        h = Math.imul(h, 16777619);
      }
    };
    for (let i = 0; i < solids.length; i++) visit(solids[i], 0);
    for (let i = 0; i < oneways.length; i++) visit(oneways[i], 1);
    return h >>> 0;
  },

  rebuild(solids, oneways, mapId, salt) {
    const signature = this.geometrySignature(solids, oneways);
    const key = this.VERSION + '|' + mapId + '|' + salt + '|' + signature;
    const cached = this.mapCache.get(key);
    if (cached) {
      this.solidSkins = cached.solidSkins;
      this.onewaySkins = cached.onewaySkins;
      this.stats = Object.assign({}, cached.stats, { cacheHit: true, generationMs: 0 });
      return;
    }

    const started = typeof performance !== 'undefined' ? performance.now() : Date.now();
    this.solidSkins = new WeakMap();
    this.onewaySkins = new WeakMap();
    this.stats = {
      skins: 0, chunks: 0, samples: 0, features: 0,
      mossPatches: 0, cacheHit: false, generationMs: 0
    };

    for (let i = 0; i < solids.length; i++) {
      const rect = solids[i];
      this.solidSkins.set(rect, this.buildSkin(rect, mapId, salt, false));
    }
    for (let i = 0; i < oneways.length; i++) {
      const rect = oneways[i];
      this.onewaySkins.set(rect, this.buildSkin(rect, mapId, salt, true));
    }

    const ended = typeof performance !== 'undefined' ? performance.now() : Date.now();
    this.stats.generationMs = ended - started;
    const entry = {
      solidSkins: this.solidSkins,
      onewaySkins: this.onewaySkins,
      stats: Object.assign({}, this.stats)
    };
    this.mapCache.set(key, entry);
    if (this.mapCache.size > 4) {
      const oldest = this.mapCache.keys().next().value;
      this.mapCache.delete(oldest);
    }
  },

  buildSkin(rect, mapId, salt, oneWay) {
    const seed = this.mixSeed(rect, mapId, salt, oneWay);
    const kind = this.classify(rect, oneWay);
    const surface = this.buildSurface(rect, mapId, seed, oneWay);
    const skin = {
      rect, mapId, seed, kind, oneWay,
      chunks: [], mossPatches: [],
      bounds: { x: rect.x - 18, y: rect.y - 24, w: rect.w + 36, h: rect.h + 132 }
    };

    const maxSpan = oneWay ? 292 : 372;
    let start = 0;
    let chunkIndex = 0;
    while (start < surface.length - 1) {
      let end = start + 1;
      while (end < surface.length - 1 && surface[end + 1].x - surface[start].x <= maxSpan) end++;
      const points = surface.slice(start, end + 1);
      const chunkSeed = (seed ^ Math.imul(Math.round(points[0].x), 0x9e3779b1)) >>> 0;
      const chunk = this.buildChunk(skin, points, chunkIndex++, U.seeded(chunkSeed));
      skin.chunks.push(chunk);
      for (let i = 0; i < chunk.moss.length; i++) {
        const patch = chunk.moss[i];
        skin.mossPatches.push({ x1: patch.x1, x2: patch.x2, tier: patch.tier });
      }
      start = end;
    }

    this.stats.skins++;
    this.stats.chunks += skin.chunks.length;
    this.stats.samples += surface.length;
    return skin;
  },

  buildSurface(rect, mapId, seed, oneWay) {
    const step = oneWay ? 8 : 10;
    const count = Math.max(2, Math.ceil(rect.w / step));
    const rng = U.seeded(seed ^ 0x7f4a7c15);
    const mounds = [];
    const moundCount = Math.min(5, Math.floor(rect.w / 300 + rng() * 1.4));
    for (let i = 0; i < moundCount; i++) {
      mounds.push({
        x: rect.x + 22 + rng() * Math.max(1, rect.w - 44),
        sigma: 28 + rng() * 54,
        amp: (rng() < 0.62 ? -1 : 1) * (0.22 + rng() * 0.48)
      });
    }

    const points = [];
    for (let i = 0; i <= count; i++) {
      const x = rect.x + rect.w * i / count;
      const id = this.profileIdAt(x, rect.y, mapId);
      const p = this.profiles[id];
      const local = x - rect.x;
      const edgeMask = this.smoothstep(Math.min(local, rect.w - local) / 13);
      let mound = 0;
      for (let m = 0; m < mounds.length; m++) {
        const d = (x - mounds[m].x) / mounds[m].sigma;
        mound += mounds[m].amp * Math.exp(-(d * d));
      }
      const macro = this.fbm(x * p.macroFreq, seed) * p.contactAmp;
      const micro = (this.noise1D(x * p.microFreq, seed ^ 0xa511e9b3) * 2 - 1) * 0.34;
      let offset = this.clamp(macro + micro + mound, -1.25, 1.25) * edgeMask;
      if (i === 0 || i === count) offset = 0;
      points.push({ x, y: rect.y + offset });
    }
    return points;
  },

  buildChunk(skin, points, index, rng) {
    const rect = skin.rect;
    const x = points[0].x;
    const w = points[points.length - 1].x - x;
    const id = this.profileIdAt(x + w * 0.5, rect.y, skin.mapId);
    const profile = this.profiles[id];
    const chunk = {
      x, w, index, id, profile, points,
      bottomPoints: [], bandPoints: [],
      moss: [], rocks: [], roots: [], cracks: [], clods: [],
      strata: [], pockets: [], notches: [], ribs: [],
      paths: null,
      bounds: { x: x - 18, y: rect.y - 24, w: w + 36, h: rect.h + 132 }
    };

    for (let i = 0; i < points.length; i++) {
      const point = points[i];
      const local = point.x - rect.x;
      const outerDist = Math.min(local, rect.w - local);
      const n = this.fbm(point.x * 0.022 + 9.7, skin.seed ^ 0x3c6ef372);
      const lobe = this.noise1D(point.x * 0.056, skin.seed ^ 0xbb67ae85) * 2 - 1;
      let depth;
      if (skin.oneWay) {
        const taper = 0.22 + 0.78 * this.smoothstep(outerDist / 20);
        depth = (profile.onewayDepth + n * 5.5 + lobe * 3.5) * taper + 3.5 * (1 - taper);
        depth = this.clamp(depth, 5, 36);
      } else {
        let kindScale = 1;
        if (skin.kind === 'pillar' || skin.kind === 'wall') kindScale = 0.65;
        else if (skin.kind === 'island') kindScale = 0.86;
        depth = profile.capDepth * kindScale + n * 7 + lobe * 4;
        depth = this.clamp(depth, 10, Math.max(10, Math.min(72, rect.h - 1)));
      }
      const bottomY = skin.oneWay ? rect.y + depth : Math.min(rect.y + rect.h - 1, rect.y + depth);
      const bandDepth = Math.min(profile.capBand + lobe * 1.4, Math.max(4, bottomY - rect.y - 2));
      chunk.bottomPoints.push({ x: point.x, y: bottomY });
      chunk.bandPoints.push({ x: point.x, y: rect.y + Math.max(4.5, bandDepth) });
    }

    this.buildFeatures(skin, chunk, rng);
    this.buildPaths(skin, chunk);
    return chunk;
  },

  buildFeatures(skin, chunk, rng) {
    const p = chunk.profile;
    const rect = skin.rect;
    const endX = chunk.x + chunk.w;

    // Ilhas explícitas de musgo: gaps reais impedem a leitura de uma linha contínua.
    let cursor = chunk.x + 10 + rng() * 18;
    while (cursor < endX - 10) {
      const hero = chunk.w > 220 && rng() < 0.12;
      let length = 14 + rng() * (24 + p.mossCoverage * 52);
      if (hero) length += 24 + rng() * 28;
      length = Math.min(length, endX - 10 - cursor);
      if (length >= 7) {
        const roll = rng();
        const tier = roll < 0.09 ? 2 : roll < 0.37 ? 1 : 0;
      const patch = {
          x1: cursor, x2: cursor + length, tier,
          coreX1: 0, coreX2: 0, tendrils: [], pads: []
        };
        if (tier >= 1) {
          let padX = cursor + 2 + rng() * 3;
          while (padX < cursor + length - 2) {
            patch.pads.push({
              x: padX,
              rx: 0.9 + rng() * 1.35,
              ry: 0.5 + rng() * 0.75,
              dy: (rng() - 0.5) * 0.8
            });
            padX += 6 + rng() * 8;
          }
        }
        if (tier === 2) {
          const coreLen = Math.min(12, Math.max(4, length * (0.2 + rng() * 0.2)));
          const coreStart = cursor + 3 + rng() * Math.max(1, length - coreLen - 6);
          patch.coreX1 = coreStart;
          patch.coreX2 = coreStart + coreLen;
          const tendrilCount = 1 + (rng() < 0.38 ? 1 : 0);
          for (let t = 0; t < tendrilCount; t++) {
            patch.tendrils.push({
              x: cursor + 5 + rng() * Math.max(1, length - 10),
              len: 5 + rng() * 9,
              bend: (rng() - 0.5) * 7
            });
          }
        }
        chunk.moss.push(patch);
        this.stats.mossPatches++;
      }
      const gap = 18 + rng() * (62 - p.mossCoverage * 26);
      cursor += length + gap;
    }

    // Lábios de terra visíveis acima da linha física, sempre arredondados.
    const clodCount = Math.min(3, Math.floor(chunk.w / 155 * 0.62 + rng() * 0.85));
    for (let i = 0; i < clodCount; i++) {
      const width = 13 + rng() * 20;
      const cx = chunk.x + 13 + rng() * Math.max(1, chunk.w - 26);
      chunk.clods.push({
        cx, width, height: 3.5 + rng() * 4.5,
        lean: (rng() - 0.5) * 5
      });
    }

    // Clusters de pedra hierárquicos, parcialmente acima da superfície.
    const rockGroups = Math.min(2, Math.floor(chunk.w / 215 * p.rockDensity + rng() * 0.72));
    for (let g = 0; g < rockGroups; g++) {
      const edgeBiased = chunk.w < 190 || rng() < 0.58;
      let cx;
      if (edgeBiased) {
        cx = rng() < 0.5
          ? chunk.x + 14 + rng() * Math.min(34, chunk.w * 0.28)
          : endX - 14 - rng() * Math.min(34, chunk.w * 0.28);
      } else {
        cx = chunk.x + 20 + rng() * Math.max(1, chunk.w - 40);
      }
      const mainR = 7 + rng() * (chunk.id === 'chasm' || chunk.id === 'fire' ? 10 : 7);
      this.addRock(chunk, cx, rect.y + mainR * 0.28, mainR, rng);
      const secondary = 1 + (rng() < 0.42 ? 1 : 0);
      for (let s = 0; s < secondary; s++) {
        const r = 3.2 + rng() * 4.8;
        const side = s % 2 ? -1 : 1;
        this.addRock(chunk, cx + side * (mainR * 0.62 + r * 0.55), rect.y + r * 0.55, r, rng);
      }
    }

    // Fissuras são eventos, não textura uniforme.
    let crackCount = Math.floor(chunk.w / 330 * p.crackDensity + rng() * 0.62);
    if (chunk.rocks.length) crackCount = Math.max(0, crackCount - (rng() < 0.55 ? 1 : 0));
    crackCount = Math.min(2, crackCount);
    for (let i = 0; i < crackCount; i++) {
      let px = chunk.x + 18 + rng() * Math.max(1, chunk.w - 36);
      let py = rect.y + 6 + rng() * 5;
      const points = [{ x: px, y: py }];
      const segments = skin.oneWay ? 3 : 5 + Math.floor(rng() * 2);
      for (let j = 0; j < segments; j++) {
        px += (rng() - 0.5) * (6 + j * 1.8);
        py += skin.oneWay ? 3 + rng() * 3 : 5 + rng() * 7;
        points.push({ x: px, y: py });
      }
      const branches = [];
      const branchCount = 1 + (rng() < 0.35 ? 1 : 0);
      for (let b = 0; b < branchCount; b++) {
        const at = 1 + Math.floor(rng() * Math.max(1, points.length - 2));
        branches.push({
          x1: points[at].x, y1: points[at].y,
          x2: points[at].x + (rng() < 0.5 ? -1 : 1) * (5 + rng() * 8),
          y2: points[at].y + 4 + rng() * 7
        });
      }
      chunk.cracks.push({ points, branches });
    }

    // Raízes curvas e afiladas, conectadas ao terreno.
    const rootChance = p.rootDensity * (skin.oneWay ? 0.92 : 0.68) *
      Math.min(1.25, 0.48 + chunk.w / 420);
    if (rng() < rootChance) {
      const sx = chunk.x + 18 + rng() * Math.max(1, chunk.w - 36);
      const sy = skin.oneWay ? this.samplePointsY(chunk.bottomPoints, sx) - 1 : rect.y + 4;
      const dir = rng() < 0.5 ? -1 : 1;
      let depth = skin.oneWay ? 30 + rng() * 52 : 42 + rng() * 54;
      if (!skin.oneWay) depth = Math.min(depth, Math.max(18, rect.h - 12));
      const ex = sx + dir * (18 + rng() * 35);
      const c1x = sx + dir * (3 + rng() * 9);
      const c2x = sx + dir * (13 + rng() * 24);
      const nodes = [];
      for (let n = 0; n <= 9; n++) {
        const t = n / 9;
        nodes.push({
          x: this.cubic(sx, c1x, c2x, ex, t),
          y: this.cubic(sy, sy + depth * 0.28, sy + depth * 0.72, sy + depth, t)
        });
      }
      const root = { nodes, width: 5 + rng() * 4, branches: [] };
      const branchCount = 1 + (rng() < 0.48 ? 1 : 0);
      for (let b = 0; b < branchCount; b++) {
        const at = 3 + Math.floor(rng() * 4);
        const start = nodes[at];
        const bdir = dir * (rng() < 0.5 ? -1 : 1);
        const branch = [];
        const len = 15 + rng() * 24;
        for (let n = 0; n <= 5; n++) {
          const t = n / 5;
          branch.push({
            x: start.x + bdir * len * t + Math.sin(t * Math.PI) * bdir * 4,
            y: start.y + len * 0.72 * t
          });
        }
        root.branches.push({ nodes: branch, width: root.width * (0.42 + rng() * 0.16) });
      }
      chunk.roots.push(root);
    }

    // Estratos largos e cavidades grandes dão leitura de material.
    const strataCount = Math.min(3, Math.floor(chunk.w / 170 + rng() * 0.65));
    for (let i = 0; i < strataCount; i++) {
      const length = Math.min(chunk.w - 24, 42 + rng() * 92);
      if (length < 18) continue;
      const x1 = chunk.x + 12 + rng() * Math.max(1, chunk.w - length - 24);
      const depthLimit = skin.oneWay
        ? Math.max(6, p.onewayDepth - 7)
        : Math.max(10, Math.min(68, rect.h - 12));
      const y = rect.y + 9 + rng() * depthLimit;
      chunk.strata.push({
        x1, y1: y,
        cx: x1 + length * (0.42 + rng() * 0.16),
        cy: y + (rng() - 0.5) * 8,
        x2: x1 + length,
        y2: y + (rng() - 0.5) * 5
      });
    }

    const pocketCount = Math.min(2, Math.floor(chunk.w / 230 + rng() * 0.55));
    for (let i = 0; i < pocketCount; i++) {
      chunk.pockets.push({
        x: chunk.x + 20 + rng() * Math.max(1, chunk.w - 40),
        y: rect.y + 15 + rng() * (skin.oneWay ? 8 : 25),
        rx: 8 + rng() * 17,
        ry: 2.5 + rng() * 5,
        rot: (rng() - 0.5) * 0.28
      });
    }

    const atLeft = Math.abs(chunk.x - rect.x) < 0.01;
    const atRight = Math.abs(endX - rect.x - rect.w) < 0.01;
    if (atLeft || atRight) {
      const count = 1 + (rng() < 0.45 ? 1 : 0);
      for (let i = 0; i < count; i++) {
        chunk.notches.push({
          side: atLeft && (!atRight || rng() < 0.5) ? -1 : 1,
          y: rect.y + 12 + rng() * Math.min(96, Math.max(16, rect.h * 0.34)),
          depth: 4 + rng() * 6,
          h: 8 + rng() * 15
        });
      }
    }

    if (skin.kind === 'pillar' || skin.kind === 'wall') {
      const ribCount = Math.min(5, 2 + Math.floor(rect.h / 150));
      for (let i = 0; i < ribCount; i++) {
        chunk.ribs.push({
          side: i % 2 ? -1 : 1,
          y: rect.y + 35 + i * (rect.h - 70) / Math.max(1, ribCount - 1),
          length: 18 + rng() * 36,
          inset: 4 + rng() * 8,
          outset: 3.5 + rng() * 4.5
        });
      }
    }

    this.stats.features += chunk.clods.length + chunk.rocks.length + chunk.roots.length +
      chunk.cracks.length + chunk.strata.length + chunk.pockets.length +
      chunk.notches.length + chunk.ribs.length;
  },

  addRock(chunk, cx, cy, radius, rng) {
    const vertices = [];
    const count = 6 + Math.floor(rng() * 2);
    for (let i = 0; i < count; i++) {
      const angle = -Math.PI * 0.5 + i / count * Math.PI * 2;
      const rr = radius * (0.78 + rng() * 0.3);
      vertices.push({
        x: cx + Math.cos(angle) * rr * 1.16,
        y: cy + Math.sin(angle) * rr
      });
    }
    chunk.rocks.push({ cx, cy, radius, vertices });
  },

  cubic(a, b, c, d, t) {
    const q = 1 - t;
    return q * q * q * a + 3 * q * q * t * b + 3 * q * t * t * c + t * t * t * d;
  },

  buildPaths(skin, chunk) {
    if (typeof Path2D === 'undefined') return;
    const rect = skin.rect;
    const make = () => new Path2D();
    const paths = {
      safety: make(), skirt: make(), cap: make(), capBottom: make(), contact: make(),
      clodShadow: make(), clodBody: make(), clodHighlight: make(),
      pocket: make(), strataDark: make(), strataLight: make(),
      rockShadow: make(), rockBody: make(), rockFacet: make(),
      rootShadow: make(), rootBody: make(), rootHighlight: make(),
      crackShadow: make(), crackBody: make(), crackLight: make(),
      notch: make(), ribsDark: make(), ribsLight: make(),
      finShadow: make(), finBody: make(), finHighlight: make(),
      pillarFacetDark: make(), pillarFacetLight: make(),
      pillarSeamDark: make(), pillarSeamLight: make(),
      mossBase: make(), mossBright: make(), mossCore: make(), mossHang: make(),
      mossPadsBase: make(), mossPadsBright: make(), mossPadsCore: make()
    };
    const has = {
      clods: false, pockets: false, strata: false, rocks: false, roots: false,
      cracks: false, notches: false, ribs: false,
      fins: false, pillar: false, mossBase: false, mossBright: false, mossCore: false,
      mossHang: false, mossPadsBase: false, mossPadsBright: false, mossPadsCore: false
    };

    paths.safety.rect(chunk.x - 0.5, rect.y, chunk.w + 1, rect.h);

    this.tracePoints(paths.skirt, chunk.points, chunk.profile.smooth);
    this.traceReverse(paths.skirt, chunk.bottomPoints, chunk.profile.smooth);
    paths.skirt.closePath();

    this.tracePoints(paths.cap, chunk.points, chunk.profile.smooth);
    this.traceReverse(paths.cap, chunk.bandPoints, chunk.profile.smooth);
    paths.cap.closePath();

    this.tracePoints(paths.capBottom, chunk.bottomPoints, chunk.profile.smooth);
    paths.contact.moveTo(chunk.x, rect.y);
    paths.contact.lineTo(chunk.x + chunk.w, rect.y);

    if (skin.kind === 'pillar' || skin.kind === 'wall') {
      const lightX1 = rect.x + rect.w * 0.12;
      const lightX2 = rect.x + rect.w * 0.34;
      const darkX1 = rect.x + rect.w * 0.68;
      const darkX2 = rect.x + rect.w * 0.92;
      paths.pillarFacetLight.moveTo(lightX1, rect.y + 9);
      paths.pillarFacetLight.lineTo(lightX2, rect.y + 18);
      paths.pillarFacetLight.lineTo(lightX2 + rect.w * 0.08, rect.y + rect.h - 8);
      paths.pillarFacetLight.lineTo(lightX1 - rect.w * 0.04, rect.y + rect.h - 8);
      paths.pillarFacetLight.closePath();
      paths.pillarFacetDark.moveTo(darkX1, rect.y + 12);
      paths.pillarFacetDark.lineTo(darkX2, rect.y + 7);
      paths.pillarFacetDark.lineTo(darkX2 + rect.w * 0.02, rect.y + rect.h - 8);
      paths.pillarFacetDark.lineTo(darkX1 - rect.w * 0.08, rect.y + rect.h - 8);
      paths.pillarFacetDark.closePath();
      has.pillar = true;
    }

    for (let i = 0; i < chunk.clods.length; i++) {
      const c = chunk.clods[i];
      const x1 = c.cx - c.width * 0.5;
      const x2 = c.cx + c.width * 0.5;
      const peakX = c.cx + c.lean;
      paths.clodShadow.moveTo(x1, rect.y + 1.5);
      paths.clodShadow.quadraticCurveTo(peakX, rect.y - c.height + 2, x2, rect.y + 1.5);
      paths.clodShadow.lineTo(x2, rect.y + 4.5);
      paths.clodShadow.quadraticCurveTo(c.cx, rect.y + 6, x1, rect.y + 4.5);
      paths.clodShadow.closePath();
      paths.clodBody.moveTo(x1, rect.y + 0.5);
      paths.clodBody.quadraticCurveTo(peakX, rect.y - c.height, x2, rect.y + 0.5);
      paths.clodBody.lineTo(x2, rect.y + 3);
      paths.clodBody.quadraticCurveTo(c.cx, rect.y + 4.5, x1, rect.y + 3);
      paths.clodBody.closePath();
      paths.clodHighlight.moveTo(x1 + 2, rect.y);
      paths.clodHighlight.quadraticCurveTo(peakX, rect.y - c.height + 1, c.cx + 1, rect.y - c.height * 0.5);
      has.clods = true;
    }

    for (let i = 0; i < chunk.pockets.length; i++) {
      const p = chunk.pockets[i];
      paths.pocket.ellipse(p.x, p.y, p.rx, p.ry, p.rot, 0, Math.PI * 2);
      has.pockets = true;
    }

    for (let i = 0; i < chunk.strata.length; i++) {
      const s = chunk.strata[i];
      paths.strataDark.moveTo(s.x1, s.y1);
      paths.strataDark.quadraticCurveTo(s.cx, s.cy, s.x2, s.y2);
      paths.strataLight.moveTo(s.x1, s.y1 - 1);
      paths.strataLight.quadraticCurveTo(s.cx, s.cy - 1, s.x2, s.y2 - 1);
      has.strata = true;
    }

    for (let i = 0; i < chunk.rocks.length; i++) {
      const rock = chunk.rocks[i];
      const v = rock.vertices;
      paths.rockShadow.ellipse(
        rock.cx + 1.5, rect.y + rock.radius * 0.56,
        rock.radius * 1.25, rock.radius * 0.48, 0, 0, Math.PI * 2
      );
      paths.rockBody.moveTo(v[0].x, v[0].y);
      for (let j = 1; j < v.length; j++) paths.rockBody.lineTo(v[j].x, v[j].y);
      paths.rockBody.closePath();
      const left = v[v.length - 1];
      const top = v[0];
      const right = v[1];
      paths.rockFacet.moveTo(left.x, left.y);
      paths.rockFacet.lineTo(top.x, top.y);
      paths.rockFacet.lineTo(right.x, right.y);
      paths.rockFacet.lineTo(rock.cx, rock.cy + rock.radius * 0.08);
      paths.rockFacet.closePath();
      has.rocks = true;
    }

    for (let i = 0; i < chunk.roots.length; i++) {
      const root = chunk.roots[i];
      this.addTaperedPath(paths.rootShadow, root.nodes, root.width + 2.6, 1.2, 1.6);
      this.addTaperedPath(paths.rootBody, root.nodes, root.width, 0, 0);
      this.addRootHighlight(paths.rootHighlight, root.nodes);
      for (let b = 0; b < root.branches.length; b++) {
        const branch = root.branches[b];
        this.addTaperedPath(paths.rootShadow, branch.nodes, branch.width + 1.6, 1, 1.2);
        this.addTaperedPath(paths.rootBody, branch.nodes, branch.width, 0, 0);
        this.addRootHighlight(paths.rootHighlight, branch.nodes);
      }
      has.roots = true;
    }

    for (let i = 0; i < chunk.cracks.length; i++) {
      const crack = chunk.cracks[i];
      const pts = crack.points;
      paths.crackShadow.moveTo(pts[0].x, pts[0].y);
      paths.crackBody.moveTo(pts[0].x, pts[0].y);
      paths.crackLight.moveTo(pts[0].x + 0.85, pts[0].y);
      for (let j = 1; j < pts.length; j++) {
        paths.crackShadow.lineTo(pts[j].x, pts[j].y);
        paths.crackBody.lineTo(pts[j].x, pts[j].y);
        paths.crackLight.lineTo(pts[j].x + 0.85, pts[j].y);
      }
      for (let b = 0; b < crack.branches.length; b++) {
        const branch = crack.branches[b];
        paths.crackShadow.moveTo(branch.x1, branch.y1);
        paths.crackShadow.lineTo(branch.x2, branch.y2);
        paths.crackBody.moveTo(branch.x1, branch.y1);
        paths.crackBody.lineTo(branch.x2, branch.y2);
      }
      has.cracks = true;
    }

    for (let i = 0; i < chunk.notches.length; i++) {
      const n = chunk.notches[i];
      const sideX = n.side < 0 ? rect.x : rect.x + rect.w;
      paths.notch.moveTo(sideX, n.y - n.h * 0.5);
      paths.notch.lineTo(sideX - n.side * n.depth, n.y);
      paths.notch.lineTo(sideX, n.y + n.h * 0.5);
      paths.notch.closePath();
      has.notches = true;
    }

    for (let i = 0; i < chunk.ribs.length; i++) {
      const rib = chunk.ribs[i];
      const sideX = rib.side < 0 ? rect.x : rect.x + rect.w;
      const inward = -rib.side;
      paths.ribsDark.moveTo(sideX, rib.y);
      paths.ribsDark.quadraticCurveTo(
        sideX + inward * rib.inset, rib.y + rib.length * 0.45,
        sideX + inward * (rib.inset * 0.55), rib.y + rib.length
      );
      paths.ribsLight.moveTo(sideX + inward * 1.2, rib.y + 1);
      paths.ribsLight.quadraticCurveTo(
        sideX + inward * (rib.inset + 1.2), rib.y + rib.length * 0.45,
        sideX + inward * (rib.inset * 0.55 + 1.2), rib.y + rib.length
      );
      const outerX = sideX + rib.side * rib.outset;
      paths.finShadow.moveTo(sideX, rib.y + 2);
      paths.finShadow.quadraticCurveTo(
        outerX + rib.side * 1.5, rib.y + rib.length * 0.3,
        outerX, rib.y + rib.length * 0.58
      );
      paths.finShadow.quadraticCurveTo(
        sideX + rib.side * 1.5, rib.y + rib.length * 0.9,
        sideX, rib.y + rib.length
      );
      paths.finShadow.closePath();
      paths.finBody.moveTo(sideX, rib.y);
      paths.finBody.quadraticCurveTo(
        outerX, rib.y + rib.length * 0.3,
        outerX - rib.side, rib.y + rib.length * 0.58
      );
      paths.finBody.quadraticCurveTo(
        sideX + rib.side, rib.y + rib.length * 0.9,
        sideX, rib.y + rib.length
      );
      paths.finBody.closePath();
      paths.finHighlight.moveTo(outerX - rib.side * 0.4, rib.y + rib.length * 0.3);
      paths.finHighlight.quadraticCurveTo(
        outerX - rib.side * 1.2, rib.y + rib.length * 0.55,
        sideX + rib.side * 0.8, rib.y + rib.length * 0.86
      );
      const seamX1 = rect.x + 7 + (i % 2) * 4;
      const seamX2 = rect.x + rect.w - 7 - ((i + 1) % 2) * 4;
      const seamMid = (seamX1 + seamX2) * 0.5;
      const seamY = rib.y + rib.length * 0.62;
      paths.pillarSeamDark.moveTo(seamX1, seamY);
      paths.pillarSeamDark.lineTo(seamMid, seamY + (i % 2 ? -2 : 2));
      paths.pillarSeamDark.lineTo(seamX2, seamY + (i % 3 - 1) * 1.5);
      paths.pillarSeamLight.moveTo(seamX1, seamY - 1);
      paths.pillarSeamLight.lineTo(seamMid, seamY + (i % 2 ? -3 : 1));
      paths.pillarSeamLight.lineTo(seamX2, seamY + (i % 3 - 1) * 1.5 - 1);
      has.ribs = true;
      has.fins = true;
    }

    for (let i = 0; i < chunk.moss.length; i++) {
      const patch = chunk.moss[i];
      this.traceSurfaceRange(paths.mossBase, chunk.points, patch.x1, patch.x2);
      has.mossBase = true;
      for (let p = 0; p < patch.pads.length; p++) {
        const pad = patch.pads[p];
        const py = this.samplePointsY(chunk.points, pad.x) - 0.35 + pad.dy;
        paths.mossPadsBase.ellipse(pad.x, py, pad.rx, pad.ry, 0, 0, Math.PI * 2);
        has.mossPadsBase = true;
      }
      if (patch.tier >= 1) {
        this.traceSurfaceRange(paths.mossBright, chunk.points, patch.x1, patch.x2);
        has.mossBright = true;
        for (let p = 0; p < patch.pads.length; p++) {
          const pad = patch.pads[p];
          const py = this.samplePointsY(chunk.points, pad.x) - 0.35 + pad.dy;
          paths.mossPadsBright.ellipse(pad.x, py, pad.rx, pad.ry, 0, 0, Math.PI * 2);
          has.mossPadsBright = true;
        }
      }
      if (patch.tier === 2) {
        this.traceSurfaceRange(paths.mossCore, chunk.points, patch.coreX1, patch.coreX2);
        has.mossCore = true;
        for (let p = 0; p < patch.pads.length; p++) {
          const pad = patch.pads[p];
          if (pad.x < patch.coreX1 - 2 || pad.x > patch.coreX2 + 2) continue;
          const py = this.samplePointsY(chunk.points, pad.x) - 0.35 + pad.dy;
          paths.mossPadsCore.ellipse(pad.x, py, pad.rx * 0.72, pad.ry * 0.72, 0, 0, Math.PI * 2);
          has.mossPadsCore = true;
        }
        for (let t = 0; t < patch.tendrils.length; t++) {
          const tendril = patch.tendrils[t];
          const y = this.samplePointsY(chunk.points, tendril.x);
          paths.mossHang.moveTo(tendril.x, y + 1);
          paths.mossHang.quadraticCurveTo(
            tendril.x + tendril.bend * 0.35, y + tendril.len * 0.55,
            tendril.x + tendril.bend, y + tendril.len
          );
          has.mossHang = true;
        }
      }
    }

    chunk.paths = paths;
    chunk.has = has;
  },

  addTaperedPath(path, nodes, width, offsetX, offsetY) {
    if (!nodes.length) return;
    const left = [];
    const right = [];
    for (let i = 0; i < nodes.length; i++) {
      const prev = nodes[Math.max(0, i - 1)];
      const next = nodes[Math.min(nodes.length - 1, i + 1)];
      const dx = next.x - prev.x;
      const dy = next.y - prev.y;
      const len = Math.max(0.001, Math.sqrt(dx * dx + dy * dy));
      const nx = -dy / len;
      const ny = dx / len;
      const t = i / Math.max(1, nodes.length - 1);
      const half = Math.max(0.35, width * 0.5 * Math.pow(1 - t, 0.78));
      left.push({ x: nodes[i].x + nx * half + offsetX, y: nodes[i].y + ny * half + offsetY });
      right.push({ x: nodes[i].x - nx * half + offsetX, y: nodes[i].y - ny * half + offsetY });
    }
    path.moveTo(left[0].x, left[0].y);
    for (let i = 1; i < left.length; i++) path.lineTo(left[i].x, left[i].y);
    for (let i = right.length - 1; i >= 0; i--) path.lineTo(right[i].x, right[i].y);
    path.closePath();
  },

  addRootHighlight(path, nodes) {
    if (nodes.length < 2) return;
    path.moveTo(nodes[0].x - 0.75, nodes[0].y);
    for (let i = 1; i < nodes.length - 1; i++) {
      path.lineTo(nodes[i].x - 0.55, nodes[i].y);
    }
  },

  tracePoints(path, points, smooth) {
    path.moveTo(points[0].x, points[0].y);
    if (!smooth) {
      for (let i = 1; i < points.length; i++) path.lineTo(points[i].x, points[i].y);
      return;
    }
    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1];
      const cur = points[i];
      path.quadraticCurveTo(prev.x, prev.y, (prev.x + cur.x) * 0.5, (prev.y + cur.y) * 0.5);
    }
    const last = points[points.length - 1];
    path.lineTo(last.x, last.y);
  },

  traceReverse(path, points, smooth) {
    const last = points[points.length - 1];
    path.lineTo(last.x, last.y);
    if (!smooth) {
      for (let i = points.length - 2; i >= 0; i--) path.lineTo(points[i].x, points[i].y);
      return;
    }
    for (let i = points.length - 2; i >= 0; i--) {
      const prev = points[i + 1];
      const cur = points[i];
      path.quadraticCurveTo(prev.x, prev.y, (prev.x + cur.x) * 0.5, (prev.y + cur.y) * 0.5);
    }
    path.lineTo(points[0].x, points[0].y);
  },

  traceSurfaceRange(path, points, x1, x2) {
    if (x2 <= x1) return;
    path.moveTo(x1, this.samplePointsY(points, x1) - 0.15);
    for (let i = 0; i < points.length; i++) {
      if (points[i].x > x1 && points[i].x < x2) {
        path.lineTo(points[i].x, points[i].y - 0.15);
      }
    }
    path.lineTo(x2, this.samplePointsY(points, x2) - 0.15);
  },

  samplePointsY(points, x) {
    if (x <= points[0].x) return points[0].y;
    const last = points[points.length - 1];
    if (x >= last.x) return last.y;
    let lo = 0;
    let hi = points.length - 1;
    while (lo + 1 < hi) {
      const mid = (lo + hi) >> 1;
      if (points[mid].x <= x) lo = mid;
      else hi = mid;
    }
    const a = points[lo];
    const b = points[hi];
    const t = (x - a.x) / Math.max(0.001, b.x - a.x);
    return this.lerp(a.y, b.y, t);
  },

  getSkin(rect) {
    return this.solidSkins.get(rect) || this.onewaySkins.get(rect) || null;
  },

  surfaceY(rect, x) {
    // A decoração acompanha a casca visual; a física continua em rect.y.
    const skin = this.getSkin(rect);
    if (!skin || !Number.isFinite(x)) return rect.y;
    for (let i = 0; i < skin.chunks.length; i++) {
      const chunk = skin.chunks[i];
      const x1 = chunk.points[0].x;
      const x2 = chunk.points[chunk.points.length - 1].x;
      if (x >= x1 - 0.01 && x <= x2 + 0.01) {
        return this.samplePointsY(chunk.points, x);
      }
    }
    return rect.y;
  },

  mossPatches(rect) {
    const skin = this.getSkin(rect);
    return skin ? skin.mossPatches : [];
  },

  mossStrength(rect, x) {
    const patches = this.mossPatches(rect);
    for (let i = 0; i < patches.length; i++) {
      if (x >= patches[i].x1 && x <= patches[i].x2) return patches[i].tier + 1;
    }
    return 0;
  },

  isVisible(rect, view) {
    const skin = this.getSkin(rect);
    const b = skin ? skin.bounds : rect;
    return b.x < view.x + view.w && b.x + b.w > view.x &&
      b.y < view.y + view.h && b.y + b.h > view.y;
  },

  collectVisible(skin, cam) {
    const out = this.visibleChunks;
    out.length = 0;
    const left = cam.x - 100;
    const right = cam.x + 1060;
    const top = cam.y - 120;
    const bottom = cam.y + 660;
    for (let i = 0; i < skin.chunks.length; i++) {
      const c = skin.chunks[i];
      const b = c.bounds;
      if (b.x + b.w < left || b.x > right || b.y + b.h < top || b.y > bottom) continue;
      out.push(c);
    }
    return out;
  },

  drawSolid(ctx, rect, cam, pal) {
    const skin = this.solidSkins.get(rect);
    if (!skin) return false;
    this.drawSkin(ctx, skin, cam, pal);
    return true;
  },

  drawOneway(ctx, rect, cam, pal) {
    const skin = this.onewaySkins.get(rect);
    if (!skin) return false;
    this.drawSkin(ctx, skin, cam, pal);
    return true;
  },

  drawSkin(ctx, skin, cam, pal) {
    const chunks = this.collectVisible(skin, cam);
    if (!chunks.length) return;
    const rect = skin.rect;
    const gradients = {};
    ctx.save();
    ctx.translate(-cam.x, -cam.y);

    const getGradients = (chunk) => {
      if (gradients[chunk.id]) return gradients[chunk.id];
      const p = chunk.profile;
      const body = ctx.createLinearGradient(0, rect.y, 0, rect.y + Math.min(rect.h, 220));
      body.addColorStop(0, skin.kind === 'pillar' || skin.kind === 'wall' ? p.top : p.mid);
      if (skin.kind === 'pillar' || skin.kind === 'wall') body.addColorStop(0.38, p.mid);
      body.addColorStop(1, p.bottom);
      const cap = ctx.createLinearGradient(0, rect.y - 5, 0, rect.y + Math.min(58, p.capDepth));
      cap.addColorStop(0, p.top);
      cap.addColorStop(0.28, p.mid);
      cap.addColorStop(1, p.bottom);
      gradients[chunk.id] = { body, cap };
      return gradients[chunk.id];
    };

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const p = chunk.profile;
      const g = getGradients(chunk);
      if (!chunk.paths) {
        ctx.fillStyle = g.body;
        ctx.fillRect(chunk.x, rect.y, chunk.w, rect.h);
        continue;
      }
      const path = chunk.paths;
      const has = chunk.has;

      // Safety body cobre exatamente o retângulo físico.
      ctx.fillStyle = g.body;
      ctx.fill(path.safety);

      // Saia e faixa superior criam volume sem mudar a superfície de pouso.
      ctx.fillStyle = g.cap;
      ctx.fill(path.skirt);
      ctx.fillStyle = p.top;
      ctx.globalAlpha = 0.72;
      ctx.fill(path.cap);
      ctx.globalAlpha = 1;

      if (has.pillar) {
        ctx.fillStyle = 'rgba(2,5,12,0.22)';
        ctx.fill(path.pillarFacetDark);
        ctx.fillStyle = 'rgba(143,161,174,0.075)';
        ctx.fill(path.pillarFacetLight);
        ctx.strokeStyle = 'rgba(2,5,12,0.52)';
        ctx.lineWidth = 2.4;
        ctx.stroke(path.pillarSeamDark);
        ctx.strokeStyle = 'rgba(145,159,171,0.11)';
        ctx.lineWidth = 0.75;
        ctx.stroke(path.pillarSeamLight);
      }

      ctx.strokeStyle = 'rgba(2,5,11,0.48)';
      ctx.lineWidth = skin.oneWay ? 3.2 : 4.4;
      ctx.stroke(path.capBottom);

      if (has.pockets) {
        ctx.fillStyle = 'rgba(2,6,13,0.38)';
        ctx.fill(path.pocket);
      }
      if (has.strata) {
        ctx.strokeStyle = 'rgba(2,6,13,0.42)';
        ctx.lineWidth = 2.2;
        ctx.stroke(path.strataDark);
        ctx.strokeStyle = 'rgba(126,151,164,0.11)';
        ctx.lineWidth = 0.9;
        ctx.stroke(path.strataLight);
      }
      if (has.notches) {
        ctx.fillStyle = p.bottom;
        ctx.fill(path.notch);
      }
      if (has.ribs) {
        ctx.strokeStyle = 'rgba(2,5,11,0.48)';
        ctx.lineWidth = 3.2;
        ctx.stroke(path.ribsDark);
        ctx.strokeStyle = 'rgba(130,151,168,0.13)';
        ctx.lineWidth = 0.9;
        ctx.stroke(path.ribsLight);
      }
      if (has.fins) {
        ctx.fillStyle = 'rgba(2,5,11,0.5)';
        ctx.fill(path.finShadow);
        ctx.fillStyle = p.top;
        ctx.globalAlpha = 0.82;
        ctx.fill(path.finBody);
        ctx.globalAlpha = 1;
        ctx.strokeStyle = p.edge;
        ctx.lineWidth = 0.85;
        ctx.stroke(path.finHighlight);
      }
      if (has.clods) {
        ctx.fillStyle = 'rgba(2,5,10,0.5)';
        ctx.fill(path.clodShadow);
        ctx.fillStyle = p.top;
        ctx.fill(path.clodBody);
        ctx.strokeStyle = p.facet;
        ctx.lineWidth = 0.9;
        ctx.stroke(path.clodHighlight);
      }
      if (has.roots) {
        ctx.fillStyle = 'rgba(2,5,10,0.56)';
        ctx.fill(path.rootShadow);
        ctx.fillStyle = p.root;
        ctx.fill(path.rootBody);
        ctx.strokeStyle = 'rgba(168,164,130,0.16)';
        ctx.lineWidth = 0.8;
        ctx.stroke(path.rootHighlight);
      }
      if (has.cracks) {
        ctx.strokeStyle = 'rgba(1,3,8,0.72)';
        ctx.lineWidth = 2.8;
        ctx.stroke(path.crackShadow);
        ctx.strokeStyle = chunk.id === 'fire' ? 'rgba(255,100,42,0.58)' : 'rgba(4,8,16,0.92)';
        ctx.lineWidth = 1.35;
        ctx.stroke(path.crackBody);
        ctx.strokeStyle = chunk.id === 'fire' ? 'rgba(255,198,96,0.32)' : 'rgba(144,161,170,0.12)';
        ctx.lineWidth = 0.7;
        ctx.stroke(path.crackLight);
      }
      if (has.rocks) {
        ctx.fillStyle = 'rgba(1,4,10,0.58)';
        ctx.fill(path.rockShadow);
        ctx.fillStyle = p.rock;
        ctx.fill(path.rockBody);
        ctx.fillStyle = p.facet;
        ctx.fill(path.rockFacet);
      }

      // Rim neutro fino mantém a navegação legível onde não há musgo.
      ctx.strokeStyle = p.edge;
      ctx.lineWidth = 1.15;
      ctx.stroke(path.contact);

      if (has.mossBase) {
        ctx.strokeStyle = U.rgb(pal.moss, chunk.id === 'fire' ? 0.32 : 0.38);
        ctx.lineWidth = skin.oneWay ? 1.35 : 1.75;
        ctx.lineCap = 'round';
        ctx.stroke(path.mossBase);
        ctx.lineCap = 'butt';
      }
      if (has.mossPadsBase) {
        ctx.fillStyle = U.rgb(pal.moss, chunk.id === 'fire' ? 0.22 : 0.3);
        ctx.fill(path.mossPadsBase);
      }
    }
    ctx.restore();
  },

  drawEmissive(ctx, rect, cam, pal) {
    const skin = this.getSkin(rect);
    if (!skin) return false;
    const chunks = this.collectVisible(skin, cam);
    if (!chunks.length) return true;
    ctx.save();
    ctx.translate(-cam.x, -cam.y);
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      if (!chunk.paths) continue;
      const path = chunk.paths;
      const has = chunk.has;
      if (has.mossBright) {
        ctx.save();
        ctx.strokeStyle = U.rgb(pal.moss, chunk.id === 'fire' ? 0.42 : 0.34);
        ctx.lineWidth = skin.oneWay ? 1.65 : 1.95;
        ctx.lineCap = 'round';
        ctx.shadowColor = U.rgb(pal.moss, 0.46);
        ctx.shadowBlur = 3.8;
        ctx.stroke(path.mossBright);
        ctx.restore();
      }
      if (has.mossPadsBright) {
        ctx.save();
        ctx.fillStyle = U.rgb(pal.moss, 0.28);
        ctx.shadowColor = U.rgb(pal.moss, 0.38);
        ctx.shadowBlur = 3.5;
        ctx.fill(path.mossPadsBright);
        ctx.restore();
      }
      if (has.mossCore) {
        ctx.save();
        ctx.strokeStyle = U.rgb(pal.moss, 0.82);
        ctx.lineWidth = skin.oneWay ? 2.2 : 2.7;
        ctx.lineCap = 'round';
        ctx.shadowColor = U.rgb(pal.moss, 0.86);
        ctx.shadowBlur = 7;
        ctx.stroke(path.mossCore);
        ctx.shadowBlur = 0;
        ctx.strokeStyle = U.rgb(U.mixRGB(pal.moss, [255, 255, 230], 0.56), 0.78);
        ctx.lineWidth = 0.8;
        ctx.stroke(path.mossCore);
        ctx.restore();
      }
      if (has.mossPadsCore) {
        ctx.save();
        ctx.fillStyle = U.rgb(U.mixRGB(pal.moss, [255, 255, 230], 0.42), 0.62);
        ctx.shadowColor = U.rgb(pal.moss, 0.72);
        ctx.shadowBlur = 5.5;
        ctx.fill(path.mossPadsCore);
        ctx.restore();
      }
      if (has.mossHang) {
        ctx.save();
        ctx.strokeStyle = U.rgb(pal.moss, 0.5);
        ctx.lineWidth = 1.15;
        ctx.lineCap = 'round';
        ctx.shadowColor = U.rgb(pal.moss, 0.48);
        ctx.shadowBlur = 4;
        ctx.stroke(path.mossHang);
        ctx.restore();
      }
    }
    ctx.restore();
    return true;
  }
};

window.TerrainSkin = TerrainSkin;
