'use strict';

/**
 * Flora bioluminescente procedural para as regioes aquaticas.
 *
 * O sistema nao cria colisores e nao altera os retangulos recebidos. Toda a
 * geometria estatica e convertida em Path2D durante rebuild(); em runtime so
 * restam culling por chunk, mudancas de estilo e movimentos analiticos leves.
 */
const BioluminescentFloraSystem = {
  VERSION: 2,
  CHUNK_SIZE: 480,
  CHUNK_HEIGHT: 320,
  MAX_CACHE_ENTRIES: 4,

  mapCache: new Map(),
  active: null,
  ready: false,
  glowStamps: null,
  stats: {},

  tones: [
    {
      stem: 'rgba(20,76,75,0.82)',
      cap: 'rgba(48,170,161,0.72)',
      gill: 'rgba(125,237,218,0.42)',
      core: 'rgba(174,255,239,0.86)',
      mote: 'rgba(103,247,222,0.82)',
      halo: [52, 235, 208]
    },
    {
      stem: 'rgba(23,70,89,0.84)',
      cap: 'rgba(58,174,209,0.74)',
      gill: 'rgba(151,236,255,0.44)',
      core: 'rgba(214,252,255,0.9)',
      mote: 'rgba(137,231,255,0.84)',
      halo: [65, 211, 245]
    }
  ],

  emptyStats() {
    return {
      clusters: 0,
      heroClusters: 0,
      caps: 0,
      lights: 0,
      motes: 0,
      chunks: 0,
      topAttachments: 0,
      ceilingAttachments: 0,
      wallAttachments: 0,
      secondaryAnchors: 0,
      guideAnchors: 0,
      candidates: 0,
      cacheHit: false,
      generationMs: 0
    };
  },

  clamp(value, min, max) {
    return value < min ? min : value > max ? max : value;
  },

  hashString(value) {
    const text = String(value);
    let h = 2166136261 >>> 0;
    for (let i = 0; i < text.length; i++) {
      h ^= text.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  },

  hash() {
    let h = 2166136261 >>> 0;
    for (let i = 0; i < arguments.length; i++) {
      const item = arguments[i];
      const value = typeof item === 'number' && Number.isFinite(item)
        ? Math.round(item * 1000) >>> 0
        : this.hashString(item);
      h ^= value;
      h = Math.imul(h, 16777619);
      h ^= h >>> 13;
    }
    h = Math.imul(h ^ (h >>> 16), 0x85ebca6b);
    h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
    return (h ^ (h >>> 16)) >>> 0;
  },

  hash01(index, seed) {
    let h = ((index | 0) ^ (seed >>> 0)) >>> 0;
    h = Math.imul(h ^ (h >>> 16), 0x45d9f3b);
    h = Math.imul(h ^ (h >>> 15), 0x45d9f3b);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967295;
  },

  seeded(seed) {
    let state = seed >>> 0;
    return () => {
      state = (state + 0x6d2b79f5) >>> 0;
      let t = state;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  },

  noise1D(x, seed) {
    const index = Math.floor(x);
    const q = x - index;
    const t = q * q * (3 - 2 * q);
    const a = this.hash01(index, seed);
    const b = this.hash01(index + 1, seed);
    return a + (b - a) * t;
  },

  fbm(x, seed) {
    const a = this.noise1D(x, seed) * 2 - 1;
    const b = this.noise1D(x * 2.07 + 13.7, seed ^ 0x68bc21eb) * 2 - 1;
    const c = this.noise1D(x * 4.11 - 7.3, seed ^ 0x02e5be93) * 2 - 1;
    return (a + b * 0.5 + c * 0.25) / 1.75;
  },

  geometrySignature(solids, oneways, waters) {
    let h = 2166136261 >>> 0;
    const visit = (rect, flag) => {
      h = this.hash(h, flag, rect.x, rect.y, rect.w, rect.h, rect.visualSeed || 0);
    };
    for (let i = 0; i < solids.length; i++) visit(solids[i], 1);
    for (let i = 0; i < oneways.length; i++) visit(oneways[i], 2);
    for (let i = 0; i < waters.length; i++) visit(waters[i], 3);
    return h >>> 0;
  },

  anchorsSignature(anchors) {
    let h = 2166136261 >>> 0;
    for (let i = 0; i < anchors.length; i++) {
      const a = anchors[i];
      h = this.hash(h, a.x, a.y, a.angle || 0, a.recipe || a.kind || '', a.hero ? 1 : 0);
    }
    return h >>> 0;
  },

  exclusionsSignature(exclusions) {
    let h = 2166136261 >>> 0;
    for (let i = 0; i < exclusions.length; i++) {
      const e = exclusions[i];
      h = this.hash(h, e.x1, e.y1, e.x2, e.y2, e.kind || 'hard');
    }
    return h >>> 0;
  },

  pointInWater(x, y, waters, padding) {
    const pad = padding || 0;
    for (let i = 0; i < waters.length; i++) {
      const w = waters[i];
      if (x >= w.x - pad && x <= w.x + w.w + pad &&
          y >= w.y - pad && y <= w.y + w.h + pad) return true;
    }
    return false;
  },

  intersectsExclusion(x, y, radius, exclusions, allowSoft) {
    for (let i = 0; i < exclusions.length; i++) {
      const e = exclusions[i];
      if (allowSoft && e.kind === 'soft') continue;
      const x1 = Math.min(e.x1, e.x2) - radius;
      const x2 = Math.max(e.x1, e.x2) + radius;
      const y1 = Math.min(e.y1, e.y2) - radius;
      const y2 = Math.max(e.y1, e.y2) + radius;
      if (x >= x1 && x <= x2 && y >= y1 && y <= y2) return true;
    }
    return false;
  },

  normalizeAnchor(anchor, fallbackKind) {
    if (!anchor) return null;
    const x = Number(anchor.x);
    const y = Number(anchor.y === undefined ? anchor.baseY : anchor.y);
    if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
    return {
      x,
      y,
      angle: Number.isFinite(anchor.angle) ? anchor.angle : 0,
      kind: anchor.kind || fallbackKind || 'secondary',
      recipe: anchor.recipe || anchor.type || '',
      profileId: anchor.profileId || anchor.profile || '',
      hero: !!anchor.hero,
      scale: Number.isFinite(anchor.scale) ? anchor.scale : 1,
      priority: Number.isFinite(anchor.priority) ? anchor.priority : 0
    };
  },

  collectSecondaryAnchors(source, mapId, waters) {
    const result = [];
    let input = source;
    if (!Array.isArray(input) && typeof SecondaryFormsSystem !== 'undefined' &&
        SecondaryFormsSystem.active && SecondaryFormsSystem.active.mapId === mapId) {
      const active = SecondaryFormsSystem.active;
      if (Array.isArray(active.bioAnchors)) {
        input = active.bioAnchors;
      } else if (Array.isArray(active.anchors)) {
        input = active.anchors;
      } else if (Array.isArray(active.metadata)) {
        input = [];
        for (let i = 0; i < active.metadata.length; i++) {
          const fields = String(active.metadata[i]).split(',');
          if (fields.length < 5) continue;
          input.push({
            x: Number(fields[2]) / 10,
            y: Number(fields[1]),
            profileId: fields[3],
            recipe: fields[4],
            kind: 'secondary'
          });
        }
      }
    }
    if (!Array.isArray(input)) return result;

    for (let i = 0; i < input.length; i++) {
      const anchor = this.normalizeAnchor(input[i], 'secondary');
      if (!anchor) continue;
      const aquaticProfile = anchor.profileId === 'submerged' || anchor.profileId === 'tide';
      const aquaticRecipe = anchor.recipe === 'waterRock' || anchor.recipe === 'reed' ||
        anchor.recipe === 'fern' || anchor.recipe === 'root';
      if (!aquaticProfile && !aquaticRecipe && !this.pointInWater(anchor.x, anchor.y, waters, 18)) continue;
      if (!this.pointInWater(anchor.x, anchor.y, waters, 22)) continue;
      result.push(anchor);
    }
    return result;
  },

  collectGuideAnchors(source, mapId, waters, includeWorldLandmarks) {
    const result = [];
    if (Array.isArray(source)) {
      for (let i = 0; i < source.length; i++) {
        const anchor = this.normalizeAnchor(source[i], 'guide');
        if (!anchor || !this.pointInWater(anchor.x, anchor.y, waters, 36)) continue;
        anchor.hero = source[i].hero === undefined ? true : !!source[i].hero;
        anchor.priority = Math.max(100, anchor.priority);
        result.push(anchor);
      }
    }

    if (includeWorldLandmarks !== false && mapId === 'floresta' &&
        typeof World !== 'undefined' && World.firePortal && World.firePortal[mapId]) {
      const portal = World.firePortal[mapId];
      if (this.pointInWater(portal.x, portal.y, waters, 40)) {
        let duplicate = false;
        for (let i = 0; i < result.length; i++) {
          if (Math.hypot(result[i].x - portal.x, result[i].y - portal.y) < 80) {
            duplicate = true;
            break;
          }
        }
        if (!duplicate) {
          result.push({
            x: portal.x,
            y: portal.y,
            angle: 0,
            kind: 'guide',
            recipe: 'portal',
            profileId: 'submerged',
            hero: true,
            scale: 1.16,
            priority: 120
          });
        }
      }
    }
    return result;
  },

  surfaceY(rect, x) {
    if (typeof TerrainSkin !== 'undefined' && TerrainSkin.surfaceY) {
      return TerrainSkin.surfaceY(rect, x);
    }
    return rect.y;
  },

  topIsExposed(rect, x, solids) {
    const probeY = rect.y - 1;
    for (let i = 0; i < solids.length; i++) {
      const other = solids[i];
      if (other === rect) continue;
      if (x > other.x + 1 && x < other.x + other.w - 1 &&
          probeY >= other.y && probeY < other.y + other.h) return false;
    }
    return true;
  },

  collectSurfaceCandidates(solids, oneways, waters, seed) {
    const candidates = [];
    const all = solids.map((rect) => ({ rect, oneWay: false }))
      .concat(oneways.map((rect) => ({ rect, oneWay: true })));

    for (let index = 0; index < all.length; index++) {
      const item = all[index];
      const rect = item.rect;
      if (!rect || rect.w < 70 || rect.x + rect.w < 0 || rect.x > 7400) continue;
      const localSeed = this.hash(seed, rect.x, rect.y, rect.w, rect.h, item.oneWay ? 1 : 0);

      // Superficies superiores e margens do lago.
      if (rect.w >= 90) {
        const margin = Math.min(56, Math.max(24, rect.w * 0.16));
        let x = rect.x + margin + this.hash01(index + 7, localSeed) * 72;
        const end = rect.x + rect.w - margin;
        let stepIndex = 0;
        while (x <= end) {
          const y = this.surfaceY(rect, x);
          if (this.topIsExposed(rect, x, solids) && this.pointInWater(x, y - 5, waters, 15)) {
            const score = this.fbm(x * 0.0068 + rect.y * 0.0017, localSeed) +
              this.hash01(stepIndex + 91, localSeed) * 0.28;
            candidates.push({
              x, y, angle: 0, kind: 'top', recipe: 'surface', profileId: 'submerged',
              hero: false, scale: 0.92 + this.hash01(stepIndex + 121, localSeed) * 0.25,
              priority: score * 22 + 18
            });
          }
          x += 250 + this.hash01(stepIndex + 211, localSeed) * 180;
          stepIndex++;
        }
      }

      if (item.oneWay) continue;

      // Fungos de prateleira sob tetos inundados.
      if (rect.w >= 150) {
        const undersideY = rect.y + rect.h;
        let x = rect.x + 52 + this.hash01(index + 17, localSeed) * 110;
        let stepIndex = 0;
        while (x < rect.x + rect.w - 45) {
          if (this.pointInWater(x, undersideY + 4, waters, 12)) {
            const score = this.fbm(x * 0.0077 - undersideY * 0.001, localSeed ^ 0x9e3779b9);
            if (score > -0.24) {
              candidates.push({
                x, y: undersideY, angle: Math.PI, kind: 'ceiling', recipe: 'shelf',
                profileId: 'submerged', hero: false,
                scale: 0.78 + this.hash01(stepIndex + 271, localSeed) * 0.22,
                priority: score * 20 + 12
              });
            }
          }
          x += 320 + this.hash01(stepIndex + 313, localSeed) * 210;
          stepIndex++;
        }
      }

      // Colunas e paredes recebem pequenas ilhas laterais, nunca uma linha uniforme.
      if (rect.h >= 105) {
        for (let wi = 0; wi < waters.length; wi++) {
          const water = waters[wi];
          const y1 = Math.max(rect.y + 34, water.y + 24);
          const y2 = Math.min(rect.y + rect.h - 34, water.y + water.h - 24);
          if (y2 - y1 < 42) continue;
          const span = y2 - y1;
          const count = Math.max(1, Math.min(3, Math.ceil(span / 290)));
          for (let n = 0; n < count; n++) {
            const q = (n + 0.34 + this.hash01(n + wi * 19, localSeed) * 0.32) / count;
            const y = y1 + span * this.clamp(q, 0.08, 0.92);
            const leftWet = this.pointInWater(rect.x - 5, y, waters, 4);
            const rightWet = this.pointInWater(rect.x + rect.w + 5, y, waters, 4);
            const sideNoise = this.hash01(n + wi * 41 + 401, localSeed);
            if (leftWet && (sideNoise < 0.64 || !rightWet)) {
              candidates.push({
                x: rect.x, y, angle: -Math.PI * 0.5, kind: 'wall', recipe: 'shelf',
                profileId: 'submerged', hero: false, scale: 0.72 + sideNoise * 0.22,
                priority: 26 + this.fbm(y * 0.008, localSeed) * 12
              });
            } else if (rightWet) {
              candidates.push({
                x: rect.x + rect.w, y, angle: Math.PI * 0.5, kind: 'wall', recipe: 'shelf',
                profileId: 'submerged', hero: false, scale: 0.72 + sideNoise * 0.22,
                priority: 26 + this.fbm(y * 0.008, localSeed ^ 0x51f15e) * 12
              });
            }
          }
        }
      }
    }
    return candidates;
  },

  projectGuideAnchor(anchor, candidates, solids, waters, seed, exclusions) {
    let best = null;
    let bestScore = Infinity;
    for (let i = 0; i < candidates.length; i++) {
      const c = candidates[i];
      if (this.intersectsExclusion(c.x, c.y, 16, exclusions, true)) continue;
      const distance = Math.hypot(c.x - anchor.x, (c.y - anchor.y) * 0.72);
      if (distance > 430) continue;
      const recipeBonus = c.kind === 'secondary' ? -34 : c.kind === 'top' ? -18 : 0;
      const score = distance + recipeBonus;
      if (score < bestScore) {
        best = c;
        bestScore = score;
      }
    }
    if (best) {
      return Object.assign({}, best, {
        kind: 'guide',
        recipe: anchor.recipe || best.recipe,
        hero: true,
        scale: Math.max(best.scale || 1, anchor.scale || 1.12),
        priority: Math.max(110, anchor.priority || 0)
      });
    }

    // Fallback: projeta o marco diretamente para o topo aquatico mais proximo.
    let rectBest = null;
    let rectDistance = Infinity;
    for (let i = 0; i < solids.length; i++) {
      const rect = solids[i];
      if (anchor.x < rect.x - 80 || anchor.x > rect.x + rect.w + 80) continue;
      const x = this.clamp(anchor.x, rect.x + 28, rect.x + rect.w - 28);
      const y = this.surfaceY(rect, x);
      if (!this.pointInWater(x, y - 5, waters, 18)) continue;
      const distance = Math.abs(y - anchor.y) + Math.abs(x - anchor.x) * 0.4;
      if (distance < rectDistance) {
        rectBest = { rect, x, y };
        rectDistance = distance;
      }
    }
    if (!rectBest || rectDistance > 300) return null;

    const rng = this.seeded(this.hash(seed, anchor.x, anchor.y, 'guide-project'));
    const sides = rng() < 0.5 ? [1, -1] : [-1, 1];
    for (let i = 0; i < sides.length; i++) {
      const x = this.clamp(
        rectBest.x + sides[i] * (72 + rng() * 34),
        rectBest.rect.x + 30,
        rectBest.rect.x + rectBest.rect.w - 30
      );
      const y = this.surfaceY(rectBest.rect, x);
      if (!this.intersectsExclusion(x, y, 18, exclusions, true)) {
        return {
          x, y, angle: 0, kind: 'guide', recipe: anchor.recipe || 'landmark',
          profileId: 'submerged', hero: true, scale: Math.max(1.12, anchor.scale || 1),
          priority: Math.max(110, anchor.priority || 0)
        };
      }
    }
    return null;
  },

  candidateOverlaps(candidate, selected, minDistance) {
    for (let i = 0; i < selected.length; i++) {
      const other = selected[i];
      const dx = candidate.x - other.x;
      const dy = (candidate.y - other.y) * 0.72;
      const separation = other.hero ? minDistance + 45 : minDistance;
      if (dx * dx + dy * dy < separation * separation) return true;
    }
    return false;
  },

  selectCandidates(surfaceCandidates, secondaryAnchors, guideAnchors, solids, waters,
      seed, exclusions, maxClusters) {
    const selected = [];
    const allCandidates = surfaceCandidates.slice();

    for (let i = 0; i < secondaryAnchors.length; i++) {
      const a = secondaryAnchors[i];
      allCandidates.push(Object.assign({}, a, {
        kind: 'secondary',
        hero: !!a.hero,
        scale: (a.scale || 1) * (a.recipe === 'reed' ? 0.88 : 1),
        priority: 58 + this.hash01(i + 41, seed) * 22
      }));
    }

    // Os marcos sao resolvidos primeiro e ficam garantidos, se houver superficie valida.
    for (let i = 0; i < guideAnchors.length; i++) {
      const guide = this.projectGuideAnchor(
        guideAnchors[i], allCandidates, solids, waters,
        this.hash(seed, i, 'guide'), exclusions
      );
      if (!guide) continue;
      if (this.intersectsExclusion(guide.x, guide.y, 16, exclusions, true)) continue;
      if (!this.candidateOverlaps(guide, selected, 155)) selected.push(guide);
    }

    allCandidates.sort((a, b) => b.priority - a.priority || a.x - b.x || a.y - b.y);
    let wallCount = 0;
    let ceilingCount = 0;
    for (let i = 0; i < allCandidates.length && selected.length < maxClusters; i++) {
      const candidate = allCandidates[i];
      if (candidate.kind === 'wall' && wallCount >= 4) continue;
      if (candidate.kind === 'ceiling' && ceilingCount >= 4) continue;
      if (!this.pointInWater(candidate.x, candidate.y, waters, 24)) continue;
      const radius = candidate.kind === 'secondary' ? 20 : 26;
      if (this.intersectsExclusion(candidate.x, candidate.y, radius, exclusions, false)) continue;
      const minDistance = candidate.kind === 'secondary' ? 218 : 280;
      if (this.candidateOverlaps(candidate, selected, minDistance)) continue;
      const organicGate = this.fbm(candidate.x * 0.0053 + candidate.y * 0.0019,
        this.hash(seed, candidate.kind));
      if (candidate.kind !== 'secondary' && organicGate < -0.28) continue;
      selected.push(candidate);
      if (candidate.kind === 'wall') wallCount++;
      else if (candidate.kind === 'ceiling') ceilingCount++;
    }

    return selected;
  },

  createPaths() {
    const make = () => new Path2D();
    return {
      shadow: make(),
      stems: [make(), make()],
      caps: [make(), make()],
      gills: [make(), make()],
      cores: [make(), make(), make(), make(), make(), make()],
      specks: [make(), make(), make(), make(), make(), make()]
    };
  },

  ensureChunk(entry, x, y) {
    const ix = Math.floor(x / this.CHUNK_SIZE);
    const iy = Math.floor(y / this.CHUNK_HEIGHT);
    const key = ix + '|' + iy;
    let chunk = entry.chunkMap.get(key);
    if (chunk) return chunk;
    chunk = {
      key,
      paths: this.createPaths(),
      clusters: [],
      lights: [],
      bounds: { x: Infinity, y: Infinity, w: 0, h: 0 },
      phase: this.hash(entry.seed, key) / 4294967295 * Math.PI * 2
    };
    entry.chunkMap.set(key, chunk);
    return chunk;
  },

  expandBounds(chunk, x1, y1, x2, y2) {
    if (!Number.isFinite(chunk.bounds.x)) {
      chunk.bounds.x = x1;
      chunk.bounds.y = y1;
      chunk.bounds.w = x2 - x1;
      chunk.bounds.h = y2 - y1;
      return;
    }
    const right = Math.max(chunk.bounds.x + chunk.bounds.w, x2);
    const bottom = Math.max(chunk.bounds.y + chunk.bounds.h, y2);
    chunk.bounds.x = Math.min(chunk.bounds.x, x1);
    chunk.bounds.y = Math.min(chunk.bounds.y, y1);
    chunk.bounds.w = right - chunk.bounds.x;
    chunk.bounds.h = bottom - chunk.bounds.y;
  },

  transformPoint(baseX, baseY, angle, localX, localY) {
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    return {
      x: baseX + localX * cos - localY * sin,
      y: baseY + localX * sin + localY * cos
    };
  },

  appendCluster(entry, candidate, index) {
    const localSeed = this.hash(entry.seed, candidate.x, candidate.y, candidate.kind, index);
    const rng = this.seeded(localSeed);
    const hero = !!candidate.hero;
    const scale = (candidate.scale || 1) * (hero ? 1.25 : 1.06);
    const tone = rng() < (hero ? 0.58 : 0.48) ? 1 : 0;
    const phase = rng() * Math.PI * 2;
    const phaseBucket = Math.floor(rng() * 3);
    const bucket = tone * 3 + phaseBucket;
    const capCount = hero ? 8 + Math.floor(rng() * 3) : 4 + Math.floor(rng() * 4);
    const spread = (hero ? 38 : 28) * scale;
    const chunk = this.ensureChunk(entry, candidate.x, candidate.y);
    const path = chunk.paths;
    const cluster = {
      x: candidate.x,
      y: candidate.y,
      angle: candidate.angle || 0,
      kind: candidate.kind,
      recipe: candidate.recipe,
      hero,
      tone,
      phase,
      phaseBucket,
      scale,
      motes: [],
      light: null
    };

    path.shadow.ellipse(
      candidate.x, candidate.y + 1,
      (hero ? 25 : 17) * scale, 3.2 * scale,
      candidate.angle || 0, 0, Math.PI * 2
    );

    let lightX = candidate.x;
    let lightY = candidate.y;
    let tallest = -Infinity;
    for (let capIndex = 0; capIndex < capCount; capIndex++) {
      const centerBias = 1 - Math.abs(capIndex - (capCount - 1) * 0.5) /
        Math.max(1, capCount * 0.5);
      const localX = (capIndex - (capCount - 1) * 0.5) *
        (spread * 2 / Math.max(1, capCount - 1)) + (rng() - 0.5) * 6 * scale;
      const height = (7.5 + rng() * 10.5 + centerBias * (hero ? 10 : 6)) * scale;
      const lean = (rng() - 0.5) * (5 + height * 0.13);
      const radiusX = (2.8 + rng() * 4.2 + centerBias * 2) * scale;
      const radiusY = radiusX * (0.34 + rng() * 0.12);
      const tilt = (rng() - 0.5) * 0.28;
      const base = this.transformPoint(candidate.x, candidate.y, candidate.angle || 0, localX, 0);
      const controlA = this.transformPoint(
        candidate.x, candidate.y, candidate.angle || 0,
        localX + lean * 0.08, -height * 0.38
      );
      const controlB = this.transformPoint(
        candidate.x, candidate.y, candidate.angle || 0,
        localX + lean * 0.58, -height * 0.78
      );
      const cap = this.transformPoint(
        candidate.x, candidate.y, candidate.angle || 0,
        localX + lean, -height
      );

      path.stems[tone].moveTo(base.x, base.y);
      path.stems[tone].bezierCurveTo(
        controlA.x, controlA.y, controlB.x, controlB.y, cap.x, cap.y
      );
      path.caps[tone].ellipse(
        cap.x, cap.y, radiusX, radiusY,
        (candidate.angle || 0) + tilt, 0, Math.PI * 2
      );
      const gillCenter = this.transformPoint(
        cap.x, cap.y, candidate.angle || 0, 0, radiusY * 0.35
      );
      path.gills[tone].ellipse(
        gillCenter.x, gillCenter.y,
        radiusX * 0.74, radiusY * 0.46,
        (candidate.angle || 0) + tilt, 0, Math.PI
      );
      path.cores[bucket].ellipse(
        cap.x, cap.y, radiusX * 0.62, Math.max(0.65, radiusY * 0.58),
        (candidate.angle || 0) + tilt, 0, Math.PI * 2
      );

      if (rng() < 0.72) {
        const dot = this.transformPoint(
          cap.x, cap.y, (candidate.angle || 0) + tilt,
          (rng() - 0.5) * radiusX * 0.9,
          (rng() - 0.5) * radiusY * 0.5
        );
        path.specks[bucket].ellipse(dot.x, dot.y, 0.45 + rng() * 0.55, 0.35 + rng() * 0.4,
          0, 0, Math.PI * 2);
      }

      if (height > tallest) {
        tallest = height;
        lightX = cap.x;
        lightY = cap.y;
      }
      entry.stats.caps++;
    }

    const moteCount = hero ? 5 : 2 + Math.floor(rng() * 3);
    for (let moteIndex = 0; moteIndex < moteCount; moteIndex++) {
      cluster.motes.push({
        phase: rng() * Math.PI * 2,
        orbitX: (8 + rng() * (hero ? 28 : 18)) * scale,
        orbitY: (5 + rng() * 12) * scale,
        lift: (10 + rng() * (hero ? 34 : 22)) * scale,
        speed: 0.006 + rng() * 0.008,
        size: 0.68 + rng() * (hero ? 1.16 : 0.82),
        drift: 1.5 + rng() * 3.5
      });
      entry.stats.motes++;
    }

    const light = {
      x: lightX,
      y: lightY,
      radius: (hero ? 148 : 80 + rng() * 34) * Math.min(1.14, scale),
      intensity: hero ? 0.78 : 0.54 + rng() * 0.16,
      phase,
      tone,
      hero
    };
    cluster.light = light;
    chunk.clusters.push(cluster);
    chunk.lights.push(light);
    this.expandBounds(
      chunk,
      candidate.x - light.radius - 12,
      candidate.y - light.radius - 34,
      candidate.x + light.radius + 12,
      candidate.y + light.radius + 26
    );

    entry.stats.clusters++;
    entry.stats.lights++;
    if (hero) entry.stats.heroClusters++;
    const angle = candidate.angle || 0;
    if (Math.abs(Math.sin(angle)) > 0.7) entry.stats.wallAttachments++;
    else if (Math.cos(angle) < -0.7) entry.stats.ceilingAttachments++;
    else entry.stats.topAttachments++;
    entry.metadata.push([
      Math.round(candidate.x * 10), Math.round(candidate.y * 10), candidate.kind,
      candidate.recipe || '', hero ? 1 : 0, tone, phaseBucket
    ].join(','));
  },

  rebuild(options) {
    const opts = options || {};
    const mapId = opts.mapId || 'floresta';
    const solids = Array.isArray(opts.solids) ? opts.solids : [];
    const oneways = Array.isArray(opts.oneways) ? opts.oneways : [];
    const waters = Array.isArray(opts.waters) ? opts.waters : [];
    const exclusions = Array.isArray(opts.exclusions) ? opts.exclusions : [];
    const seed = Number.isFinite(opts.seed) ? opts.seed : 20260702;
    const secondaryAnchors = this.collectSecondaryAnchors(opts.secondaryAnchors, mapId, waters);
    const guideAnchors = this.collectGuideAnchors(
      opts.guideAnchors || opts.anchors,
      mapId,
      waters,
      opts.includeWorldLandmarks
    );
    const secondarySignature = typeof SecondaryFormsSystem !== 'undefined' &&
      SecondaryFormsSystem.active && SecondaryFormsSystem.active.mapId === mapId
      ? SecondaryFormsSystem.visualSignature ? SecondaryFormsSystem.visualSignature() :
        (SecondaryFormsSystem.active.signature || 0)
      : 0;
    const geometrySignature = this.geometrySignature(solids, oneways, waters);
    const anchorSignature = this.hash(
      this.anchorsSignature(secondaryAnchors),
      this.anchorsSignature(guideAnchors),
      secondarySignature
    );
    const exclusionSignature = this.exclusionsSignature(exclusions);
    const key = [
      this.VERSION, mapId, seed, geometrySignature, anchorSignature, exclusionSignature,
      opts.maxClusters || 0
    ].join('|');
    const cached = this.mapCache.get(key);
    if (cached) {
      this.active = cached;
      this.ready = true;
      this.stats = Object.assign({}, cached.stats, { cacheHit: true, generationMs: 0 });
      return this.active;
    }

    if (typeof Path2D === 'undefined') {
      this.active = null;
      this.ready = false;
      this.stats = this.emptyStats();
      return null;
    }

    const started = typeof performance !== 'undefined' ? performance.now() : Date.now();
    const entry = {
      key,
      mapId,
      seed,
      waters,
      chunks: [],
      chunkMap: new Map(),
      metadata: [],
      stats: this.emptyStats(),
      signature: 0
    };
    entry.stats.secondaryAnchors = secondaryAnchors.length;
    entry.stats.guideAnchors = guideAnchors.length;

    if (mapId === 'floresta' && waters.length) {
      const surfaceCandidates = this.collectSurfaceCandidates(solids, oneways, waters, seed);
      entry.stats.candidates = surfaceCandidates.length + secondaryAnchors.length;
      let totalWaterWidth = 0;
      for (let i = 0; i < waters.length; i++) totalWaterWidth += waters[i].w;
      const maxClusters = Number.isFinite(opts.maxClusters)
        ? Math.max(1, Math.floor(opts.maxClusters))
        : this.clamp(Math.ceil(totalWaterWidth / 340), 12, 26);
      const selected = this.selectCandidates(
        surfaceCandidates, secondaryAnchors, guideAnchors,
        solids, waters, seed, exclusions, maxClusters
      );
      selected.sort((a, b) => a.x - b.x || a.y - b.y);
      for (let i = 0; i < selected.length; i++) this.appendCluster(entry, selected[i], i);
    }

    entry.chunks = Array.from(entry.chunkMap.values())
      .sort((a, b) => a.bounds.x - b.bounds.x || a.bounds.y - b.bounds.y);
    entry.chunkMap.clear();
    entry.stats.chunks = entry.chunks.length;
    entry.signature = this.hash(
      this.VERSION,
      mapId,
      seed,
      geometrySignature,
      anchorSignature,
      entry.metadata.join(';')
    );
    const ended = typeof performance !== 'undefined' ? performance.now() : Date.now();
    entry.stats.generationMs = ended - started;

    this.active = entry;
    this.ready = true;
    this.stats = Object.assign({}, entry.stats);
    this.mapCache.set(key, entry);
    while (this.mapCache.size > this.MAX_CACHE_ENTRIES) {
      this.mapCache.delete(this.mapCache.keys().next().value);
    }
    return entry;
  },

  visible(chunk, cam, margin) {
    const pad = margin || 0;
    const b = chunk.bounds;
    return b.x + b.w >= cam.x - 100 - pad && b.x <= cam.x + 1060 + pad &&
      b.y + b.h >= cam.y - 120 - pad && b.y <= cam.y + 660 + pad;
  },

  ensureGlowStamps() {
    if (this.glowStamps) return this.glowStamps;
    const canUseDocument = typeof document !== 'undefined' && document.createElement;
    const canUseOffscreen = typeof OffscreenCanvas !== 'undefined';
    if (!canUseDocument && !canUseOffscreen) return null;

    const size = 160;
    const stamps = [];
    for (let tone = 0; tone < this.tones.length; tone++) {
      const canvas = canUseOffscreen
        ? new OffscreenCanvas(size, size)
        : document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const context = canvas.getContext('2d');
      if (!context) continue;
      const color = this.tones[tone].halo;
      const gradient = context.createRadialGradient(size * 0.5, size * 0.5, 0,
        size * 0.5, size * 0.5, size * 0.5);
      gradient.addColorStop(0, `rgba(${color[0]},${color[1]},${color[2]},0.5)`);
      gradient.addColorStop(0.22, `rgba(${color[0]},${color[1]},${color[2]},0.22)`);
      gradient.addColorStop(0.58, `rgba(${color[0]},${color[1]},${color[2]},0.07)`);
      gradient.addColorStop(1, `rgba(${color[0]},${color[1]},${color[2]},0)`);
      context.fillStyle = gradient;
      context.fillRect(0, 0, size, size);
      stamps[tone] = canvas;
    }
    this.glowStamps = stamps.length ? stamps : null;
    return this.glowStamps;
  },

  drawBase(ctx, cam, frames) {
    if (!this.ready || !this.active || !this.active.chunks.length) return;
    ctx.save();
    ctx.translate(-cam.x, -cam.y);
    for (let i = 0; i < this.active.chunks.length; i++) {
      const chunk = this.active.chunks[i];
      if (!this.visible(chunk, cam)) continue;
      const path = chunk.paths;
      ctx.fillStyle = 'rgba(1,7,13,0.42)';
      ctx.fill(path.shadow);
      for (let tone = 0; tone < 2; tone++) {
        const style = this.tones[tone];
        ctx.strokeStyle = style.stem;
        ctx.lineWidth = tone === 0 ? 1.25 : 1.15;
        ctx.lineCap = 'round';
        ctx.stroke(path.stems[tone]);
        ctx.fillStyle = style.cap;
        ctx.fill(path.caps[tone]);
        ctx.strokeStyle = style.gill;
        ctx.lineWidth = 0.65;
        ctx.stroke(path.gills[tone]);
      }
      ctx.lineCap = 'butt';
    }
    ctx.restore();
  },

  forEachVisibleLight(cam, frames, callback) {
    if (!this.ready || !this.active || typeof callback !== 'function') return 0;
    let count = 0;
    for (let i = 0; i < this.active.chunks.length; i++) {
      const chunk = this.active.chunks[i];
      if (!this.visible(chunk, cam, 80)) continue;
      for (let l = 0; l < chunk.lights.length; l++) {
        const light = chunk.lights[l];
        const pulse = 0.9 + Math.sin(frames * 0.027 + light.phase) * 0.1;
        const radius = light.radius * (0.975 + Math.sin(frames * 0.019 + light.phase * 1.31) * 0.025);
        const sx = light.x - cam.x;
        const sy = light.y - cam.y;
        if (sx + radius < -40 || sx - radius > 1000 || sy + radius < -40 || sy - radius > 580) continue;
        callback(light, sx, sy, radius, light.intensity * pulse);
        count++;
      }
    }
    return count;
  },

  drawEmissive(ctx, cam, frames) {
    if (!this.ready || !this.active || !this.active.chunks.length) return;
    const stamps = this.ensureGlowStamps();

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    if (stamps) {
      for (let i = 0; i < this.active.chunks.length; i++) {
        const chunk = this.active.chunks[i];
        if (!this.visible(chunk, cam, 80)) continue;
        for (let l = 0; l < chunk.lights.length; l++) {
          const light = chunk.lights[l];
          const pulse = 0.9 + Math.sin(frames * 0.027 + light.phase) * 0.1;
          const radius = light.radius *
            (0.975 + Math.sin(frames * 0.019 + light.phase * 1.31) * 0.025);
          const sx = light.x - cam.x;
          const sy = light.y - cam.y;
          if (sx + radius < -40 || sx - radius > 1000 ||
              sy + radius < -40 || sy - radius > 580) continue;
          const stamp = stamps[light.tone];
          if (!stamp) continue;
          ctx.globalAlpha = light.intensity * pulse * (light.hero ? 0.82 : 0.66);
          ctx.drawImage(stamp, sx - radius, sy - radius, radius * 2, radius * 2);
        }
      }
    }
    ctx.restore();

    ctx.save();
    ctx.translate(-cam.x, -cam.y);
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < this.active.chunks.length; i++) {
      const chunk = this.active.chunks[i];
      if (!this.visible(chunk, cam)) continue;
      for (let bucket = 0; bucket < 6; bucket++) {
        const tone = bucket >= 3 ? 1 : 0;
        const phaseBucket = bucket % 3;
        const pulse = 0.64 + Math.sin(frames * 0.031 + phaseBucket * 2.094 + chunk.phase) * 0.16;
        ctx.globalAlpha = pulse;
        ctx.fillStyle = this.tones[tone].core;
        ctx.fill(chunk.paths.cores[bucket]);
        ctx.globalAlpha = 0.5 + pulse * 0.32;
        ctx.fillStyle = 'rgba(240,255,255,0.92)';
        ctx.fill(chunk.paths.specks[bucket]);
      }
    }
    ctx.restore();

    // Motas ambientais: posicoes analiticas, sem spawn, update ou alocacao.
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let tone = 0; tone < 2; tone++) {
      ctx.beginPath();
      let hasMotes = false;
      for (let i = 0; i < this.active.chunks.length; i++) {
        const chunk = this.active.chunks[i];
        if (!this.visible(chunk, cam, 32)) continue;
        for (let c = 0; c < chunk.clusters.length; c++) {
          const cluster = chunk.clusters[c];
          if (cluster.tone !== tone) continue;
          for (let m = 0; m < cluster.motes.length; m++) {
            const mote = cluster.motes[m];
            const time = frames * mote.speed + mote.phase;
            const normalX = Math.sin(cluster.angle);
            const normalY = -Math.cos(cluster.angle);
            const tangentX = Math.cos(cluster.angle);
            const tangentY = Math.sin(cluster.angle);
            const orbit = Math.sin(time * 1.17) * mote.orbitX;
            const lift = mote.lift + (Math.sin(time * 0.73 + mote.phase) * 0.5 + 0.5) * mote.orbitY;
            const drift = Math.sin(time * 2.13 + cluster.phase) * mote.drift;
            const x = cluster.x - cam.x + tangentX * (orbit + drift) + normalX * lift;
            const y = cluster.y - cam.y + tangentY * (orbit + drift) + normalY * lift;
            if (x < -8 || x > 968 || y < -8 || y > 548) continue;
            ctx.moveTo(x + mote.size, y);
            ctx.arc(x, y, mote.size, 0, Math.PI * 2);
            hasMotes = true;
          }
        }
      }
      if (hasMotes) {
        ctx.globalAlpha = 0.64 + Math.sin(frames * 0.023 + tone * 1.9) * 0.14;
        ctx.fillStyle = this.tones[tone].mote;
        ctx.fill();
      }
    }
    ctx.restore();
  },

  visualSignature() {
    return this.active ? this.active.signature : 0;
  },

  clearCache() {
    this.mapCache.clear();
    this.active = null;
    this.ready = false;
    this.stats = this.emptyStats();
  }
};

window.BioluminescentFloraSystem = BioluminescentFloraSystem;
