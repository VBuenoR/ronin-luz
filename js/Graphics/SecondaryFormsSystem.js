'use strict';

// Biblioteca procedural de formas secundárias. Toda geometria é visual,
// determinística e cacheada; os retângulos de colisão nunca são alterados.
const SecondaryFormsSystem = {
  VERSION: 4,
  CHUNK_SIZE: 480,
  mapCache: new Map(),
  active: null,
  ready: false,
  stats: {},

  profiles: {
    forest:    { spacing: 440, threshold: -0.12, weights: [['bush', 45], ['rock', 35], ['root', 20]] },
    ruins:     { spacing: 540, threshold: -0.04, weights: [['rock', 58], ['root', 16], ['bush', 26]] },
    chasm:     { spacing: 610, threshold:  0.02, weights: [['rock', 72], ['root', 18], ['bush', 10]] },
    grove:     { spacing: 370, threshold: -0.16, weights: [['bush', 42], ['root', 36], ['rock', 22]] },
    tide:      { spacing: 470, threshold: -0.08, weights: [['waterRock', 55], ['reed', 35], ['fern', 10]] },
    throne:    { spacing: 690, threshold:  0.08, weights: [['rock', 64], ['reed', 18], ['root', 18]] },
    submerged: { spacing: 520, threshold: -0.02, weights: [['waterRock', 55], ['reed', 35], ['fern', 10]] },
    fire:      { spacing: 580, threshold:  0.02, weights: [['fireRock', 45], ['magma', 25], ['crystal', 15], ['dry', 10], ['smoke', 5]] }
  },

  styles: {
    forest: {
      rock: '#35484d', facet: 'rgba(130,162,157,0.24)', edge: 'rgba(154,183,174,0.18)',
      root: '#30342c', rootEdge: 'rgba(169,162,126,0.17)', bush: '#15352f',
      bushLight: 'rgba(83,132,105,0.24)', plant: 'rgba(70,125,101,0.62)'
    },
    ruins: {
      rock: '#3b414d', facet: 'rgba(166,173,185,0.23)', edge: 'rgba(182,188,199,0.15)',
      root: '#302e2a', rootEdge: 'rgba(157,145,119,0.14)', bush: '#25352f',
      bushLight: 'rgba(100,132,106,0.2)', plant: 'rgba(83,119,95,0.52)'
    },
    chasm: {
      rock: '#343a47', facet: 'rgba(145,154,170,0.22)', edge: 'rgba(164,172,188,0.13)',
      root: '#29272a', rootEdge: 'rgba(139,130,116,0.12)', bush: '#222d2c',
      bushLight: 'rgba(83,111,99,0.17)', plant: 'rgba(72,100,88,0.42)'
    },
    grove: {
      rock: '#30454a', facet: 'rgba(126,166,157,0.23)', edge: 'rgba(146,184,172,0.17)',
      root: '#30382c', rootEdge: 'rgba(173,169,127,0.18)', bush: '#123a32',
      bushLight: 'rgba(81,153,119,0.27)', plant: 'rgba(69,143,109,0.66)'
    },
    tide: {
      rock: '#345364', facet: 'rgba(155,198,208,0.23)', edge: 'rgba(181,216,220,0.18)',
      root: '#2a3430', rootEdge: 'rgba(150,172,151,0.14)', bush: '#173c3d',
      bushLight: 'rgba(82,153,145,0.23)', plant: 'rgba(79,156,147,0.64)'
    },
    throne: {
      rock: '#3b3d59', facet: 'rgba(172,173,217,0.21)', edge: 'rgba(192,193,229,0.14)',
      root: '#2d2932', rootEdge: 'rgba(151,142,165,0.13)', bush: '#252e42',
      bushLight: 'rgba(104,115,163,0.2)', plant: 'rgba(103,122,168,0.5)'
    },
    submerged: {
      rock: '#315269', facet: 'rgba(151,199,218,0.23)', edge: 'rgba(175,215,229,0.17)',
      root: '#293632', rootEdge: 'rgba(143,177,162,0.14)', bush: '#143943',
      bushLight: 'rgba(74,143,155,0.23)', plant: 'rgba(75,151,164,0.62)'
    },
    fire: {
      rock: '#512f2c', facet: 'rgba(219,119,73,0.24)', edge: 'rgba(229,133,83,0.17)',
      root: '#33201f', rootEdge: 'rgba(167,83,56,0.14)', bush: '#241313',
      bushLight: 'rgba(124,54,37,0.2)', plant: 'rgba(103,47,35,0.55)'
    }
  },

  emptyStats() {
    return {
      islands: 0, chunks: 0,
      rockMain: 0, rockMedium: 0, gravel: 0,
      roots: 0, bushes: 0, ferns: 0, reeds: 0,
      magma: 0, crystals: 0, dry: 0, smokeVents: 0, bioAnchors: 0,
      cacheHit: false, generationMs: 0
    };
  },

  hash() {
    let h = 2166136261 >>> 0;
    for (let i = 0; i < arguments.length; i++) {
      const value = arguments[i];
      const text = typeof value === 'string' ? value : String(Math.round(Number(value) * 1000));
      for (let j = 0; j < text.length; j++) {
        h ^= text.charCodeAt(j);
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

  fbm(x, seed) {
    const a = this.noise1D(x, seed) * 2 - 1;
    const b = this.noise1D(x * 2.03 + 11.7, seed ^ 0x68bc21eb) * 2 - 1;
    const c = this.noise1D(x * 4.07 - 7.3, seed ^ 0x02e5be93) * 2 - 1;
    return (a + b * 0.5 + c * 0.25) / 1.75;
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

  geometrySignature(solids, oneways) {
    let h = 2166136261 >>> 0;
    const visit = (r, flag) => {
      for (const value of [r.x, r.y, r.w, r.h, flag, r.visualSeed || 0]) {
        h ^= Math.round(value * 10);
        h = Math.imul(h, 16777619);
      }
    };
    for (let i = 0; i < solids.length; i++) visit(solids[i], 0);
    for (let i = 0; i < oneways.length; i++) visit(oneways[i], 1);
    return h >>> 0;
  },

  exclusionSignature(exclusions, blockedRects) {
    let h = 2166136261 >>> 0;
    const ordered = exclusions.slice().sort((a, b) =>
      a.x1 - b.x1 || a.y1 - b.y1 || a.x2 - b.x2 || a.y2 - b.y2 ||
      String(a.kind || '').localeCompare(String(b.kind || ''))
    );
    for (let i = 0; i < ordered.length; i++) {
      const z = ordered[i];
      const kindCode = z.kind === 'actor' ? 1 : z.kind === 'soft' ? 2 : 0;
      for (const value of [z.x1, z.y1, z.x2, z.y2, kindCode]) {
        h ^= Math.round(value * 10);
        h = Math.imul(h, 16777619);
      }
    }
    const orderedBlocked = blockedRects.slice().sort((a, b) =>
      a.x - b.x || a.y - b.y || a.w - b.w || a.h - b.h
    );
    for (let i = 0; i < orderedBlocked.length; i++) {
      const rect = orderedBlocked[i];
      for (const value of [rect.x, rect.y, rect.w, rect.h, rect.visualSeed || 0]) {
        h ^= Math.round(value * 10);
        h = Math.imul(h, 16777619);
      }
    }
    return h >>> 0;
  },

  rebuild(options) {
    const mapId = options.mapId;
    const solids = options.solids || [];
    const oneways = options.oneways || [];
    const exclusions = options.exclusions || [];
    const blockedRects = options.blockedRects || [];
    const seed = options.seed ?? 1;
    const key = [
      this.VERSION,
      typeof TerrainSkin !== 'undefined' ? TerrainSkin.VERSION : 0,
      mapId,
      seed,
      this.geometrySignature(solids, oneways),
      this.exclusionSignature(exclusions, blockedRects)
    ].join('|');

    const cached = this.mapCache.get(key);
    if (cached) {
      this.active = cached;
      this.ready = true;
      this.stats = Object.assign({}, cached.stats, { cacheHit: true, generationMs: 0 });
      return;
    }

    if (typeof Path2D === 'undefined') {
      this.active = null;
      this.ready = false;
      this.stats = this.emptyStats();
      return;
    }

    const started = typeof performance !== 'undefined' ? performance.now() : Date.now();
    const entry = {
      key, mapId, chunks: [], chunkMap: new Map(), reservations: [], metadata: [], bioAnchors: [],
      stats: this.emptyStats(), signature: 0
    };
    const blocked = new Set(blockedRects);
    const ordered = solids.map((rect) => ({ rect, oneWay: false }))
      .concat(oneways.map((rect) => ({ rect, oneWay: true })))
      .slice()
      .sort((a, b) => a.rect.y - b.rect.y || a.rect.x - b.rect.x);

    for (let i = 0; i < ordered.length; i++) {
      const item = ordered[i];
      if (!this.eligibleSurface(item.rect, item.oneWay, mapId, blocked)) continue;
      this.generateForSurface(entry, item.rect, item.oneWay, solids, exclusions, seed);
    }

    if (mapId === 'floresta') {
      this.ensureBiomeCoverage(entry, ordered, solids, exclusions, seed, blocked);
    } else if (mapId === 'fogo') {
      this.ensureFireDiversity(entry, ordered, solids, exclusions, seed);
    }

    entry.chunks = Array.from(entry.chunkMap.values()).sort((a, b) => a.bounds.x - b.bounds.x);
    entry.chunkMap.clear();
    entry.stats.chunks = entry.chunks.length;
    entry.signature = this.hash(this.VERSION, TerrainSkin.VERSION, mapId, seed, entry.metadata.join(';'));
    const ended = typeof performance !== 'undefined' ? performance.now() : Date.now();
    entry.stats.generationMs = ended - started;
    this.active = entry;
    this.ready = true;
    this.stats = Object.assign({}, entry.stats);
    this.mapCache.set(key, entry);
    while (this.mapCache.size > 4) this.mapCache.delete(this.mapCache.keys().next().value);
  },

  eligibleSurface(rect, oneWay, mapId, blocked) {
    if (rect.x < 0 || rect.x >= 7400) return false;
    if (blocked.has(rect)) return false;
    if (oneWay) return rect.w >= 180;
    if (rect.w < 210) return false;
    if (mapId === 'fogo' && rect.y >= 2360) return false;
    if (rect.y >= 1450 && rect.y <= 1700 && rect.w > 500) return false;
    return true;
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

  profileAt(rect, x, mapId) {
    return TerrainSkin.profileIdAt(x, rect.y, mapId);
  },

  islandRadius(recipe) {
    if (recipe === 'root') return 110;
    if (recipe === 'magma') return 78;
    if (recipe === 'bush' || recipe === 'reed') return 70;
    if (recipe === 'smoke') return 52;
    if (recipe === 'fern' || recipe === 'dry') return 58;
    return 66;
  },

  recipeBounds(recipe, x, baseY, radius) {
    let top = 72;
    let bottom = 14;
    if (recipe === 'magma') top = 14;
    else if (recipe === 'root') { top = 34; bottom = 42; }
    else if (recipe === 'dry') top = 34;
    else if (recipe === 'smoke') top = 76;
    return { x1: x - radius, y1: baseY - top, x2: x + radius, y2: baseY + bottom };
  },

  overlapsReservations(bounds, reservations, padding) {
    const pad = padding || 0;
    for (let i = 0; i < reservations.length; i++) {
      const r = reservations[i];
      if (bounds.x1 < r.x2 + pad && bounds.x2 > r.x1 - pad &&
          bounds.y1 < r.y2 + pad && bounds.y2 > r.y1 - pad) return true;
    }
    return false;
  },

  intersectsExclusion(x1, y1, x2, y2, exclusions, includeActors) {
    for (let i = 0; i < exclusions.length; i++) {
      const z = exclusions[i];
      if (!includeActors && (z.kind === 'actor' || z.kind === 'soft')) continue;
      if (x1 < z.x2 && x2 > z.x1 && y1 < z.y2 && y2 > z.y1) return true;
    }
    return false;
  },

  generateForSurface(entry, rect, oneWay, solids, exclusions, seed) {
    const edge = oneWay ? 34 : 54;
    const start = rect.x + edge;
    const end = rect.x + rect.w - edge;
    if (end - start < 90) return;
    const surfaceSeed = this.hash(seed, entry.mapId, rect.x, rect.y, rect.w, oneWay ? 1 : 0);
    const rng = U.seeded(surfaceSeed);
    const candidates = [];
    const step = 34;
    let expected = 0;
    for (let x = start; x <= end; x += step) {
      if (!this.topIsExposed(rect, x, solids)) continue;
      const profileId = this.profileAt(rect, x, entry.mapId);
      const profile = this.profiles[profileId];
      if (!profile) continue;
      expected += step / profile.spacing;
      const cell = Math.round((x - rect.x) / step);
      const score = this.fbm(x * 0.011, surfaceSeed) * 0.72 +
        (this.hash01(cell, surfaceSeed ^ 0x9e3779b9) * 2 - 1) * 0.28;
      const prev = this.fbm((x - step) * 0.011, surfaceSeed) * 0.72;
      const next = this.fbm((x + step) * 0.011, surfaceSeed) * 0.72;
      if (score >= profile.threshold && score >= prev - 0.12 && score >= next - 0.12) {
        candidates.push({ x, score, profileId });
      }
    }
    candidates.sort((a, b) => b.score - a.score);
    const target = Math.max(1, Math.min(4, Math.floor(expected + rng() * 0.55)));
    const chosen = [];
    for (let i = 0; i < candidates.length && chosen.length < target; i++) {
      const candidate = candidates[i];
      const profileId = candidate.profileId;
      const profile = this.profiles[profileId];
      const localRng = U.seeded(this.hash(surfaceSeed, Math.round(candidate.x / step), 'island'));
      let recipe = this.weightedPick(localRng, profile.weights);
      if (oneWay && (recipe === 'rock' || recipe === 'waterRock' || recipe === 'fireRock')) {
        recipe = profileId === 'fire' ? 'magma' : profileId === 'tide' || profileId === 'submerged' ? 'reed' : 'root';
      }
      let radius = this.islandRadius(recipe);
      const baseY = TerrainSkin.surfaceY(rect, candidate.x);
      const surfaceInset = oneWay ? 12 : 8;
      if (candidate.x - radius < rect.x + surfaceInset ||
          candidate.x + radius > rect.x + rect.w - surfaceInset) continue;
      let bounds = this.recipeBounds(recipe, candidate.x, baseY, radius);
      if (this.intersectsExclusion(bounds.x1, bounds.y1, bounds.x2, bounds.y2, exclusions, false)) continue;
      const touchesActor = this.intersectsExclusion(bounds.x1, bounds.y1, bounds.x2, bounds.y2, exclusions, true);
      if (touchesActor) {
        // Patrulhas sÃ£o uma preferÃªncia visual, nÃ£o uma zona que apaga o bioma:
        // formas altas cedem lugar a uma forma baixa coerente com o perfil.
        if (profileId === 'fire') {
          if (recipe === 'fireRock') continue;
          recipe = 'magma';
        } else if (profileId === 'tide' || profileId === 'submerged') {
          recipe = 'reed';
        } else {
          recipe = 'root';
        }
        radius = this.islandRadius(recipe);
        bounds = this.recipeBounds(recipe, candidate.x, baseY, radius);
        if (candidate.x - radius < rect.x + surfaceInset ||
            candidate.x + radius > rect.x + rect.w - surfaceInset ||
            this.intersectsExclusion(bounds.x1, bounds.y1, bounds.x2, bounds.y2, exclusions, false)) continue;
      }
      let separated = true;
      for (let j = 0; j < chosen.length; j++) {
        if (Math.abs(candidate.x - chosen[j]) < Math.min(profile.spacing * 0.72, radius * 2 + 80)) {
          separated = false;
          break;
        }
      }
      if (!separated) continue;
      this.buildIsland(entry, rect, candidate.x, baseY, profileId, recipe, localRng, radius);
      chosen.push(candidate.x);
    }
  },

  ensureFireDiversity(entry, ordered, solids, exclusions, seed) {
    const needs = [];
    if (entry.stats.rockMain === 0) needs.push('fireRock');
    if (entry.stats.magma === 0) needs.push('magma');
    if (entry.stats.crystals + entry.stats.dry + entry.stats.smokeVents === 0) needs.push('smoke');
    for (let n = 0; n < needs.length; n++) {
      const recipe = needs[n];
      const radius = this.islandRadius(recipe);
      let best = null;
      for (let i = 0; i < ordered.length; i++) {
        const item = ordered[i];
        const rect = item.rect;
        if (item.oneWay || !this.eligibleSurface(rect, false, 'fogo', new Set())) continue;
        const start = rect.x + Math.max(54, radius);
        const end = rect.x + rect.w - Math.max(54, radius);
        const offset = this.hash01(i + n * 97, seed ^ 0x51f15e) * 31;
        for (let x = start + offset; x <= end; x += 31) {
          if (!this.topIsExposed(rect, x, solids)) continue;
          const baseY = TerrainSkin.surfaceY(rect, x);
          const bounds = this.recipeBounds(recipe, x, baseY, radius);
          if (this.intersectsExclusion(bounds.x1, bounds.y1, bounds.x2, bounds.y2, exclusions, false)) continue;
          if (this.overlapsReservations(bounds, entry.reservations, 22)) continue;
          const actorOverlap = this.intersectsExclusion(bounds.x1, bounds.y1, bounds.x2, bounds.y2, exclusions, true);
          const noise = this.fbm(x * 0.0087, this.hash(seed, recipe));
          const edgeRoom = Math.min(x - rect.x, rect.x + rect.w - x);
          const score = noise + Math.min(0.45, edgeRoom / 280) - (actorOverlap ? 0.28 : 0);
          if (!best || score > best.score) best = { rect, x, baseY, score };
        }
      }
      if (!best) continue;
      const rng = U.seeded(this.hash(seed, recipe, Math.round(best.x * 10), 'fallback'));
      this.buildIsland(entry, best.rect, best.x, best.baseY, 'fire', recipe, rng, radius);
    }
  },

  ensureBiomeCoverage(entry, ordered, solids, exclusions, seed, blocked) {
    const recipeByProfile = {
      forest: 'bush', ruins: 'rock', chasm: 'rock', grove: 'root',
      tide: 'reed', throne: 'rock', submerged: 'waterRock'
    };
    const present = new Set(entry.metadata.map((line) => line.split(',')[3]));
    for (const profileId of Object.keys(recipeByProfile)) {
      if (present.has(profileId)) continue;
      const recipe = recipeByProfile[profileId];
      const radius = this.islandRadius(recipe);
      let best = null;
      for (let i = 0; i < ordered.length; i++) {
        const item = ordered[i];
        const rect = item.rect;
        if (item.oneWay || !this.eligibleSurface(rect, false, 'floresta', blocked)) continue;
        const start = rect.x + radius + 8;
        const end = rect.x + rect.w - radius - 8;
        for (let x = start; x <= end; x += 29) {
          if (this.profileAt(rect, x, 'floresta') !== profileId ||
              !this.topIsExposed(rect, x, solids)) continue;
          const baseY = TerrainSkin.surfaceY(rect, x);
          const bounds = this.recipeBounds(recipe, x, baseY, radius);
          if (this.intersectsExclusion(bounds.x1, bounds.y1, bounds.x2, bounds.y2, exclusions, false) ||
              this.overlapsReservations(bounds, entry.reservations, 24)) continue;
          const softOverlap = this.intersectsExclusion(bounds.x1, bounds.y1, bounds.x2, bounds.y2, exclusions, true);
          const score = this.fbm(x * 0.0091, this.hash(seed, profileId)) - (softOverlap ? 0.32 : 0);
          if (!best || score > best.score) best = { rect, x, baseY, score };
        }
      }
      if (!best) continue;
      const rng = U.seeded(this.hash(seed, profileId, Math.round(best.x * 10), 'coverage'));
      this.buildIsland(entry, best.rect, best.x, best.baseY, profileId, recipe, rng, radius);
      present.add(profileId);
    }
  },

  createPaths() {
    const make = () => new Path2D();
    return {
      shadow: make(), rockBody: make(), rockFacet: make(), rockEdge: make(), gravel: make(),
      rootShadow: make(), rootBody: make(), rootEdge: make(),
      bushBody: make(), bushGap: make(), bushEdge: make(),
      plantStem: [make(), make(), make()], plantLeaf: [make(), make(), make()],
      dryStem: [make(), make(), make()],
      magmaOuter: make(), magmaMid: make(), magmaCore: make(), magmaCrust: make(),
      crystalBody: make(), crystalFacet: make(), crystalCore: make()
    };
  },

  ensureChunk(entry, profileId, x, y) {
    const key = profileId + '|' + Math.floor(x / this.CHUNK_SIZE) + '|' + Math.floor(y / 320);
    let chunk = entry.chunkMap.get(key);
    if (chunk) return chunk;
    chunk = {
      profileId,
      paths: this.createPaths(),
      smoke: [],
      phase: this.hash(entry.mapId, key) / 4294967295 * Math.PI * 2,
      bounds: { x: Infinity, y: Infinity, w: 0, h: 0 }
    };
    entry.chunkMap.set(key, chunk);
    return chunk;
  },

  expandBounds(chunk, x1, y1, x2, y2) {
    if (!Number.isFinite(chunk.bounds.x)) {
      chunk.bounds.x = x1; chunk.bounds.y = y1;
      chunk.bounds.w = x2 - x1; chunk.bounds.h = y2 - y1;
      return;
    }
    const right = Math.max(chunk.bounds.x + chunk.bounds.w, x2);
    const bottom = Math.max(chunk.bounds.y + chunk.bounds.h, y2);
    chunk.bounds.x = Math.min(chunk.bounds.x, x1);
    chunk.bounds.y = Math.min(chunk.bounds.y, y1);
    chunk.bounds.w = right - chunk.bounds.x;
    chunk.bounds.h = bottom - chunk.bounds.y;
  },

  buildIsland(entry, rect, x, baseY, profileId, recipe, rng, radius) {
    const chunk = this.ensureChunk(entry, profileId, x, baseY);
    if (recipe === 'rock' || recipe === 'waterRock' || recipe === 'fireRock') {
      this.buildRockIsland(chunk, entry, rect, x, baseY, profileId, recipe, rng);
    } else if (recipe === 'bush') {
      this.buildBushIsland(chunk, entry, rect, x, baseY, profileId, rng);
    } else if (recipe === 'root') {
      this.buildRootIsland(chunk, entry, rect, x, baseY, profileId, rng);
    } else if (recipe === 'reed') {
      this.buildReedIsland(chunk, entry, rect, x, baseY, profileId, rng);
    } else if (recipe === 'fern') {
      this.appendFern(chunk, x, baseY, 0.9 + rng() * 0.25, rng);
      entry.stats.ferns++;
    } else if (recipe === 'magma') {
      this.buildMagmaIsland(chunk, entry, rect, x, baseY, rng);
    } else if (recipe === 'crystal') {
      this.appendCrystal(chunk, x, baseY, 0.9 + rng() * 0.35, rng);
      entry.stats.crystals++;
    } else if (recipe === 'dry') {
      this.appendDryShrub(chunk, x, baseY, 0.9 + rng() * 0.3, rng);
      entry.stats.dry++;
    } else if (recipe === 'smoke') {
      this.appendSmokeVent(chunk, x, baseY, rng);
      entry.stats.smokeVents++;
    }
    const reserved = this.recipeBounds(recipe, x, baseY, radius);
    entry.reservations.push(reserved);
    entry.metadata.push([rect.x, rect.y, Math.round(x * 10), profileId, recipe].join(','));
    if (profileId === 'tide' || profileId === 'submerged' ||
        recipe === 'waterRock' || recipe === 'reed' || recipe === 'fern') {
      entry.bioAnchors.push({
        x, y: baseY, angle: 0, kind: 'secondary', profileId, recipe,
        scale: recipe === 'reed' ? 0.86 : recipe === 'waterRock' ? 1.08 : 0.94
      });
      entry.stats.bioAnchors++;
    }
    entry.stats.islands++;
    this.expandBounds(chunk, reserved.x1 - 18, reserved.y1 - 8, reserved.x2 + 18, reserved.y2 + 8);
  },

  groundShadow(path, cx, baseY, width, depth) {
    path.moveTo(cx - width * 0.54, baseY + 1);
    path.quadraticCurveTo(cx, baseY - depth * 0.25, cx + width * 0.58, baseY + 1);
    path.quadraticCurveTo(cx, baseY + depth, cx - width * 0.54, baseY + 1);
    path.closePath();
  },

  appendRock(chunk, cx, baseY, width, height, mode, rng, main) {
    const points = [];
    const count = mode === 'water' ? 10 : mode === 'fire' ? 6 : 8;
    for (let i = 0; i <= count; i++) {
      const t = i / count;
      const jitter = i === 0 || i === count ? 0 : (rng() - 0.5) * width * 0.035;
      const exponent = mode === 'water' ? 0.82 : mode === 'fire' ? 0.61 : 0.72;
      const dome = Math.pow(Math.sin(Math.PI * t), exponent);
      const noise = mode === 'water' ? 0.94 + rng() * 0.1 : 0.82 + rng() * 0.26;
      points.push({
        x: cx - width * 0.5 + width * t + jitter,
        y: baseY - height * dome * noise
      });
    }
    this.groundShadow(chunk.paths.shadow, cx, baseY + 2, width * 1.08, Math.max(3, height * 0.23));
    const body = chunk.paths.rockBody;
    body.moveTo(points[0].x, baseY + 4);
    if (mode === 'water') {
      body.lineTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length - 1; i++) {
        const next = points[i + 1];
        body.quadraticCurveTo(points[i].x, points[i].y, (points[i].x + next.x) * 0.5, (points[i].y + next.y) * 0.5);
      }
      body.lineTo(points[points.length - 1].x, points[points.length - 1].y);
    } else {
      for (let i = 0; i < points.length; i++) body.lineTo(points[i].x, points[i].y);
    }
    body.lineTo(points[points.length - 1].x, baseY + 4);
    body.closePath();

    const topIndex = Math.floor(points.length * (0.38 + rng() * 0.2));
    const rightIndex = Math.min(points.length - 2, topIndex + 2);
    chunk.paths.rockFacet.moveTo(points[0].x + width * 0.18, baseY - height * 0.08);
    chunk.paths.rockFacet.lineTo(points[topIndex].x, points[topIndex].y);
    chunk.paths.rockFacet.lineTo(points[rightIndex].x, points[rightIndex].y);
    chunk.paths.rockFacet.lineTo(cx + width * 0.08, baseY - height * 0.12);
    chunk.paths.rockFacet.closePath();
    if (main) {
      chunk.paths.rockEdge.moveTo(points[Math.max(1, topIndex - 1)].x, points[Math.max(1, topIndex - 1)].y + 1);
      chunk.paths.rockEdge.lineTo(points[rightIndex].x, points[rightIndex].y + 1);
    }
  },

  appendGravel(path, x, baseY, size, rng, fire) {
    const lean = (rng() - 0.5) * size * 0.6;
    path.moveTo(x - size, baseY + 0.5);
    path.lineTo(x - size * 0.35 + lean, baseY - size * (0.55 + rng() * 0.35));
    path.lineTo(x + size * (0.35 + rng() * 0.3) + lean, baseY - size * (fire ? 0.72 : 0.48));
    path.lineTo(x + size, baseY + 0.5);
    path.closePath();
  },

  buildRockIsland(chunk, entry, rect, x, baseY, profileId, recipe, rng) {
    const mode = recipe === 'waterRock' ? 'water' : recipe === 'fireRock' ? 'fire' : 'normal';
    const mainW = 34 + rng() * (mode === 'water' ? 25 : 22);
    const mainH = mode === 'water' ? 14 + rng() * 12 : 19 + rng() * 13;
    this.appendRock(chunk, x, baseY + 3, mainW, mainH, mode, rng, true);
    entry.stats.rockMain++;
    const bias = rng() < 0.5 ? -1 : 1;
    const mediumCount = 2 + (rng() < 0.35 ? 1 : 0);
    for (let i = 0; i < mediumCount; i++) {
      const side = i === 0 ? -bias : bias;
      const w = 12 + rng() * 14;
      const h = mode === 'water' ? 6 + rng() * 7 : 8 + rng() * 9;
      const px = x + side * (mainW * 0.34 + i * 9 + rng() * 7);
      this.appendRock(chunk, px, TerrainSkin.surfaceY(rect, px) + 2.5, w, h, mode, rng, false);
      entry.stats.rockMedium++;
    }
    const gravelCount = 4 + Math.floor(rng() * 4);
    for (let i = 0; i < gravelCount; i++) {
      const side = i < gravelCount * 0.68 ? bias : -bias;
      const px = x + side * (mainW * 0.42 + 12 + rng() * 34);
      const size = 1.8 + rng() * 3.4;
      this.appendGravel(chunk.paths.gravel, px, TerrainSkin.surfaceY(rect, px), size, rng, mode === 'fire');
      entry.stats.gravel++;
    }
    if (mode === 'water' && rng() < 0.64) {
      this.appendReed(chunk, x - bias * (mainW * 0.58 + 10), baseY, 0.72 + rng() * 0.2, rng);
      entry.stats.reeds++;
    }
  },

  addTaperedRibbon(path, nodes, width0, width1) {
    const left = [], right = [];
    for (let i = 0; i < nodes.length; i++) {
      const a = nodes[Math.max(0, i - 1)];
      const b = nodes[Math.min(nodes.length - 1, i + 1)];
      const dx = b.x - a.x, dy = b.y - a.y;
      const len = Math.max(0.001, Math.hypot(dx, dy));
      const nx = -dy / len, ny = dx / len;
      const t = i / Math.max(1, nodes.length - 1);
      const width = width1 + (width0 - width1) * Math.pow(1 - t, 0.74);
      left.push({ x: nodes[i].x + nx * width, y: nodes[i].y + ny * width });
      right.push({ x: nodes[i].x - nx * width, y: nodes[i].y - ny * width });
    }
    path.moveTo(left[0].x, left[0].y);
    for (let i = 1; i < left.length; i++) path.lineTo(left[i].x, left[i].y);
    for (let i = right.length - 1; i >= 0; i--) path.lineTo(right[i].x, right[i].y);
    path.closePath();
  },

  appendRoot(chunk, rect, x, baseY, length, rng) {
    const direction = rng() < 0.5 ? -1 : 1;
    const edgeX = direction < 0 ? rect.x : rect.x + rect.w;
    const maxLength = Math.max(32, Math.abs(edgeX - x) - 3);
    length = Math.min(length, maxLength);
    const endX = x + direction * length;
    const nodes = [];
    const count = 12;
    const bend = (rng() - 0.5) * 9;
    for (let i = 0; i <= count; i++) {
      const t = i / count;
      const px = x + direction * length * t;
      const surface = TerrainSkin.surfaceY(rect, px);
      nodes.push({
        x: px,
        y: surface - 1.5 - Math.sin(Math.PI * t) * (2.5 + rng() * 1.2) + bend * t * (1 - t) * 0.18
      });
    }
    if (Math.abs(edgeX - endX) < 10) {
      const last = nodes[nodes.length - 1];
      nodes.push({ x: edgeX + direction * 1.5, y: last.y + 7 });
      nodes.push({ x: edgeX + direction * 2.5, y: last.y + 18 + rng() * 15 });
    }
    const width = 4.5 + rng() * 3.8;
    this.addTaperedRibbon(chunk.paths.rootShadow, nodes, width + 1.8, 0.8);
    this.addTaperedRibbon(chunk.paths.rootBody, nodes, width, 0.35);
    chunk.paths.rootEdge.moveTo(nodes[1].x, nodes[1].y - 0.7);
    for (let i = 2; i < nodes.length - 1; i++) chunk.paths.rootEdge.lineTo(nodes[i].x, nodes[i].y - 0.7);
  },

  buildRootIsland(chunk, entry, rect, x, baseY, profileId, rng) {
    this.appendRoot(chunk, rect, x, baseY, 68 + rng() * 28, rng);
    entry.stats.roots++;
    if (profileId !== 'chasm' && profileId !== 'throne') {
      const side = rng() < 0.5 ? -1 : 1;
      this.appendFern(chunk, x + side * (28 + rng() * 18), baseY, 0.68 + rng() * 0.22, rng);
      entry.stats.ferns++;
    }
  },

  appendBush(chunk, x, baseY, width, height, rng) {
    const body = chunk.paths.bushBody;
    const points = [];
    const count = 10;
    for (let i = 0; i <= count; i++) {
      const t = i / count;
      const dome = Math.pow(Math.sin(Math.PI * t), 0.62);
      points.push({
        x: x - width * 0.5 + width * t + (i === 0 || i === count ? 0 : (rng() - 0.5) * width * 0.035),
        y: baseY - height * dome * (0.82 + rng() * 0.25)
      });
    }
    this.groundShadow(chunk.paths.shadow, x, baseY + 1, width, 5);
    body.moveTo(points[0].x, baseY + 2);
    for (let i = 0; i < points.length; i++) {
      if (i < points.length - 1) {
        const next = points[i + 1];
        body.quadraticCurveTo(points[i].x, points[i].y, (points[i].x + next.x) * 0.5, (points[i].y + next.y) * 0.5);
      } else body.lineTo(points[i].x, points[i].y);
    }
    body.lineTo(points[points.length - 1].x, baseY + 2);
    body.closePath();
    const gapCount = 1 + (rng() < 0.45 ? 1 : 0);
    for (let i = 0; i < gapCount; i++) {
      const gx = x + (rng() - 0.5) * width * 0.45;
      const gy = baseY - height * (0.36 + rng() * 0.22);
      const gw = 3 + rng() * 4.5;
      chunk.paths.bushGap.moveTo(gx - gw, gy);
      chunk.paths.bushGap.lineTo(gx, gy - 2 - rng() * 2);
      chunk.paths.bushGap.lineTo(gx + gw, gy + 0.5);
      chunk.paths.bushGap.lineTo(gx, gy + 2 + rng() * 2);
      chunk.paths.bushGap.closePath();
    }
    chunk.paths.bushEdge.moveTo(points[1].x, points[1].y + 1);
    for (let i = 2; i < points.length - 2; i += 2) chunk.paths.bushEdge.lineTo(points[i].x, points[i].y + 1);
  },

  buildBushIsland(chunk, entry, rect, x, baseY, profileId, rng) {
    const width = 36 + rng() * 20;
    const height = 17 + rng() * 11;
    this.appendBush(chunk, x, baseY + 2, width, height, rng);
    entry.stats.bushes++;
    const side = rng() < 0.5 ? -1 : 1;
    for (let i = 0; i < 2 + (rng() < 0.45 ? 1 : 0); i++) {
      const px = x + side * (width * 0.36 + i * 13 + rng() * 7);
      this.appendBush(chunk, px, TerrainSkin.surfaceY(rect, px) + 1.5, width * (0.42 + rng() * 0.16), height * (0.45 + rng() * 0.17), rng);
      entry.stats.bushes++;
    }
    if (rng() < 0.72) {
      this.appendFern(chunk, x - side * (width * 0.48 + 9), baseY, 0.72 + rng() * 0.25, rng);
      entry.stats.ferns++;
    }
  },

  appendFern(chunk, x, baseY, scale, rng) {
    const bucket = Math.floor(rng() * 3);
    const stems = chunk.paths.plantStem[bucket];
    const leaves = chunk.paths.plantLeaf[bucket];
    const count = 5 + Math.floor(rng() * 3);
    for (let i = 0; i < count; i++) {
      const t = i / Math.max(1, count - 1);
      const angle = (-1.08 + t * 2.16) + (rng() - 0.5) * 0.12;
      const length = (13 + rng() * 8) * scale * (0.82 + Math.sin(Math.PI * t) * 0.24);
      const tx = x + Math.sin(angle) * length;
      const ty = baseY - Math.cos(angle) * length;
      stems.moveTo(x, baseY);
      stems.quadraticCurveTo(x + Math.sin(angle) * length * 0.34, baseY - length * 0.42, tx, ty);
      const leafPairs = 2 + Math.floor(length / 8);
      for (let l = 1; l <= leafPairs; l++) {
        const q = l / (leafPairs + 1);
        const sx = x + (tx - x) * q;
        const sy = baseY + (ty - baseY) * q - Math.sin(Math.PI * q) * length * 0.08;
        const size = (3.8 * (1 - q * 0.58)) * scale;
        leaves.moveTo(sx, sy);
        leaves.lineTo(sx + Math.cos(angle) * size, sy + Math.sin(angle) * size);
        leaves.moveTo(sx, sy);
        leaves.lineTo(sx - Math.cos(angle) * size, sy - Math.sin(angle) * size);
      }
    }
  },

  appendReed(chunk, x, baseY, scale, rng) {
    const bucket = Math.floor(rng() * 3);
    const stems = chunk.paths.plantStem[bucket];
    const leaves = chunk.paths.plantLeaf[bucket];
    const count = 6 + Math.floor(rng() * 6);
    for (let i = 0; i < count; i++) {
      const dx = (i - (count - 1) * 0.5) * (2.1 + rng() * 0.65);
      const height = (17 + rng() * 18) * scale;
      const lean = (rng() - 0.5) * 7 * scale;
      stems.moveTo(x + dx, baseY);
      stems.bezierCurveTo(x + dx, baseY - height * 0.35, x + dx + lean * 0.35, baseY - height * 0.72, x + dx + lean, baseY - height);
      if (i % 3 === 0) {
        const tx = x + dx + lean, ty = baseY - height;
        leaves.moveTo(tx - 1.7 * scale, ty + 1.5 * scale);
        leaves.lineTo(tx, ty - 3.2 * scale);
        leaves.lineTo(tx + 1.7 * scale, ty + 1.5 * scale);
        leaves.lineTo(tx, ty + 3.8 * scale);
        leaves.closePath();
      }
    }
  },

  buildReedIsland(chunk, entry, rect, x, baseY, profileId, rng) {
    this.appendReed(chunk, x, baseY, 0.88 + rng() * 0.24, rng);
    entry.stats.reeds++;
    const side = rng() < 0.5 ? -1 : 1;
    this.appendReed(chunk, x + side * (24 + rng() * 14), baseY, 0.55 + rng() * 0.18, rng);
    entry.stats.reeds++;
    if (rng() < 0.6) {
      this.appendRock(chunk, x - side * 18, baseY + 2, 17 + rng() * 11, 7 + rng() * 6, 'water', rng, false);
      entry.stats.rockMedium++;
    }
  },

  buildMagmaIsland(chunk, entry, rect, x, baseY, rng) {
    const length = Math.min(132, 76 + rng() * 72, rect.w - 70);
    const start = x - length * 0.5;
    const segments = 7 + Math.floor(rng() * 3);
    let px = start, py = baseY - 0.5;
    const outer = chunk.paths.magmaOuter;
    const mid = chunk.paths.magmaMid;
    const core = chunk.paths.magmaCore;
    outer.moveTo(px, py); mid.moveTo(px, py); core.moveTo(px, py);
    for (let i = 1; i <= segments; i++) {
      px = start + length * i / segments;
      py = TerrainSkin.surfaceY(rect, px) + (rng() - 0.5) * 2.4;
      outer.lineTo(px, py); mid.lineTo(px, py); core.lineTo(px, py);
      if (i > 1 && i < segments && rng() < 0.4) {
        const side = rng() < 0.5 ? -1 : 1;
        const bx = px + side * (7 + rng() * 13);
        const by = py + 3 + rng() * 5;
        outer.moveTo(px, py); outer.lineTo(bx, by);
        mid.moveTo(px, py); mid.lineTo(bx, by);
      }
      if (i % 2 === 0) this.appendGravel(chunk.paths.magmaCrust, px + (rng() - 0.5) * 9, baseY, 2.5 + rng() * 3.5, rng, true);
    }
    entry.stats.magma++;
  },

  appendCrystal(chunk, x, baseY, scale, rng) {
    const count = 3 + Math.floor(rng() * 3);
    for (let i = 0; i < count; i++) {
      const dx = (i - (count - 1) * 0.5) * (6 + rng() * 2.5) * scale;
      const height = (i === (count >> 1) ? 18 + rng() * 8 : 9 + rng() * 10) * scale;
      const width = (4 + rng() * 3) * scale;
      const lean = (rng() - 0.5) * width * 0.65;
      const p = chunk.paths.crystalBody;
      p.moveTo(x + dx - width, baseY + 1);
      p.lineTo(x + dx - width * 0.42 + lean, baseY - height * 0.6);
      p.lineTo(x + dx + lean, baseY - height);
      p.lineTo(x + dx + width * 0.56 + lean, baseY - height * 0.48);
      p.lineTo(x + dx + width, baseY + 1);
      p.closePath();
      chunk.paths.crystalFacet.moveTo(x + dx + lean, baseY - height);
      chunk.paths.crystalFacet.lineTo(x + dx + width * 0.56 + lean, baseY - height * 0.48);
      chunk.paths.crystalFacet.lineTo(x + dx + width * 0.18, baseY - 1);
      chunk.paths.crystalFacet.closePath();
      if (i === (count >> 1)) {
        chunk.paths.crystalCore.moveTo(x + dx + lean, baseY - height * 0.88);
        chunk.paths.crystalCore.lineTo(x + dx + width * 0.08, baseY - height * 0.18);
      }
    }
  },

  appendDryShrub(chunk, x, baseY, scale, rng) {
    const bucket = Math.floor(rng() * 3);
    const path = chunk.paths.dryStem[bucket];
    const grow = (sx, sy, angle, length, depth) => {
      if (depth <= 0 || length < 4) return;
      const ex = sx + Math.cos(angle) * length;
      const ey = sy + Math.sin(angle) * length;
      path.moveTo(sx, sy);
      path.quadraticCurveTo(sx + Math.cos(angle) * length * 0.4 + (rng() - 0.5) * 3, sy + Math.sin(angle) * length * 0.45, ex, ey);
      grow(ex, ey, angle - 0.42 - rng() * 0.25, length * 0.55, depth - 1);
      if (rng() < 0.72) grow(ex, ey, angle + 0.38 + rng() * 0.3, length * 0.48, depth - 1);
    };
    grow(x, baseY, -Math.PI * 0.5 + (rng() - 0.5) * 0.2, (16 + rng() * 9) * scale, 3);
  },

  makeSmokeBlob(rx, ry, seed) {
    const rng = U.seeded(seed);
    const points = [];
    const count = 10;
    for (let i = 0; i < count; i++) {
      const a = i / count * Math.PI * 2;
      const r = 0.82 + rng() * 0.25;
      points.push({ x: Math.cos(a) * rx * r, y: Math.sin(a) * ry * r });
    }
    const p = new Path2D();
    const last = points[points.length - 1], first = points[0];
    p.moveTo((last.x + first.x) * 0.5, (last.y + first.y) * 0.5);
    for (let i = 0; i < points.length; i++) {
      const a = points[i], b = points[(i + 1) % points.length];
      p.quadraticCurveTo(a.x, a.y, (a.x + b.x) * 0.5, (a.y + b.y) * 0.5);
    }
    p.closePath();
    return p;
  },

  appendSmokeVent(chunk, x, baseY, rng) {
    const puffs = [];
    for (let i = 0; i < 3; i++) {
      const rx = 8 + rng() * 6 + i * 2;
      const ry = 5 + rng() * 4 + i * 1.4;
      puffs.push({
        path: this.makeSmokeBlob(rx, ry, this.hash(x, baseY, i)),
        dx: (rng() - 0.5) * 8,
        dy: -10 - i * 13 - rng() * 4,
        phase: rng() * Math.PI * 2,
        drift: 2 + rng() * 3
      });
    }
    chunk.smoke.push({ x, y: baseY, phase: rng() * Math.PI * 2, puffs });
    this.appendGravel(chunk.paths.magmaCrust, x - 5, baseY, 5 + rng() * 3, rng, true);
    this.appendGravel(chunk.paths.magmaCrust, x + 6, baseY, 4 + rng() * 3, rng, true);
  },

  visible(chunk, cam) {
    const b = chunk.bounds;
    return b.x + b.w >= cam.x - 100 && b.x <= cam.x + 1060 &&
      b.y + b.h >= cam.y - 120 && b.y <= cam.y + 660;
  },

  drawBack(ctx, cam, frames, palette) {
    if (!this.ready || !this.active) return;
    ctx.save();
    ctx.translate(-cam.x, -cam.y);
    for (let i = 0; i < this.active.chunks.length; i++) {
      const chunk = this.active.chunks[i];
      if (!this.visible(chunk, cam)) continue;
      const style = this.styles[chunk.profileId];
      const path = chunk.paths;
      ctx.fillStyle = 'rgba(1,4,8,0.45)';
      ctx.fill(path.shadow);
      ctx.fillStyle = style.rock;
      ctx.fill(path.rockBody);
      ctx.fillStyle = style.facet;
      ctx.fill(path.rockFacet);
      ctx.strokeStyle = style.edge;
      ctx.lineWidth = 0.8;
      ctx.stroke(path.rockEdge);
      ctx.fillStyle = style.bush;
      ctx.fill(path.bushBody);
      ctx.fillStyle = 'rgba(2,7,10,0.46)';
      ctx.fill(path.bushGap);
      ctx.strokeStyle = style.bushLight;
      ctx.lineWidth = 0.85;
      ctx.stroke(path.bushEdge);

      if (chunk.smoke.length) {
        ctx.fillStyle = 'rgba(16,9,12,0.5)';
        ctx.strokeStyle = 'rgba(187,76,42,0.22)';
        ctx.lineWidth = 0.75;
        for (let v = 0; v < chunk.smoke.length; v++) {
          const vent = chunk.smoke[v];
          for (let p = 0; p < vent.puffs.length; p++) {
            const puff = vent.puffs[p];
            const dx = Math.sin(frames * 0.009 + puff.phase) * puff.drift;
            const dy = -Math.sin(frames * 0.006 + puff.phase * 1.3) * 2;
            ctx.save();
            ctx.translate(vent.x + puff.dx + dx, vent.y + puff.dy + dy);
            ctx.globalAlpha = 0.5 + p * 0.11;
            ctx.fill(puff.path);
            ctx.stroke(puff.path);
            ctx.restore();
          }
        }
      }
    }
    ctx.restore();
  },

  drawSurface(ctx, cam, frames, palette) {
    if (!this.ready || !this.active) return;
    ctx.save();
    ctx.translate(-cam.x, -cam.y);
    for (let i = 0; i < this.active.chunks.length; i++) {
      const chunk = this.active.chunks[i];
      if (!this.visible(chunk, cam)) continue;
      const style = this.styles[chunk.profileId];
      const path = chunk.paths;
      ctx.fillStyle = style.rock;
      ctx.globalAlpha = 0.76;
      ctx.fill(path.gravel);
      ctx.globalAlpha = 1;
      ctx.fillStyle = 'rgba(1,4,8,0.48)';
      ctx.fill(path.rootShadow);
      ctx.fillStyle = style.root;
      ctx.fill(path.rootBody);
      ctx.strokeStyle = style.rootEdge;
      ctx.lineWidth = 0.75;
      ctx.stroke(path.rootEdge);

      for (let b = 0; b < 3; b++) {
        const sway = Math.sin(frames * 0.024 + chunk.phase + b * 1.9) * (0.42 + b * 0.16);
        ctx.save();
        ctx.translate(sway, 0);
        ctx.strokeStyle = style.plant;
        ctx.lineWidth = chunk.profileId === 'submerged' || chunk.profileId === 'tide' ? 1.05 : 0.85;
        ctx.lineCap = 'round';
        ctx.stroke(path.plantStem[b]);
        ctx.lineWidth = 0.7;
        ctx.stroke(path.plantLeaf[b]);
        ctx.fillStyle = style.plant;
        ctx.fill(path.plantLeaf[b]);
        ctx.strokeStyle = chunk.profileId === 'fire' ? 'rgba(84,32,25,0.72)' : style.plant;
        ctx.lineWidth = 1.05;
        ctx.stroke(path.dryStem[b]);
        ctx.restore();
      }
      ctx.lineCap = 'butt';

      if (chunk.profileId === 'fire') {
        ctx.fillStyle = '#39211f';
        ctx.fill(path.magmaCrust);
        ctx.strokeStyle = 'rgba(18,7,8,0.84)';
        ctx.lineWidth = 4;
        ctx.stroke(path.magmaOuter);
        ctx.strokeStyle = 'rgba(218,69,29,0.52)';
        ctx.lineWidth = 1.8;
        ctx.stroke(path.magmaMid);
        ctx.fillStyle = '#3b2025';
        ctx.fill(path.crystalBody);
        ctx.fillStyle = 'rgba(190,67,46,0.3)';
        ctx.fill(path.crystalFacet);
      }
    }
    ctx.restore();
  },

  drawEmissive(ctx, cam, frames) {
    if (!this.ready || !this.active || this.active.mapId !== 'fogo') return;
    ctx.save();
    ctx.translate(-cam.x, -cam.y);
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < this.active.chunks.length; i++) {
      const chunk = this.active.chunks[i];
      if (!this.visible(chunk, cam)) continue;
      const pulse = 0.58 + Math.sin(frames * 0.038 + chunk.phase) * 0.14;
      ctx.globalAlpha = pulse;
      ctx.strokeStyle = 'rgba(255,111,45,0.56)';
      ctx.lineWidth = 1.35;
      ctx.stroke(chunk.paths.magmaMid);
      ctx.strokeStyle = 'rgba(255,220,126,0.68)';
      ctx.lineWidth = 0.48;
      ctx.stroke(chunk.paths.magmaCore);
      ctx.strokeStyle = 'rgba(255,152,91,0.52)';
      ctx.lineWidth = 1.1;
      ctx.stroke(chunk.paths.crystalCore);
      ctx.strokeStyle = 'rgba(255,235,178,0.58)';
      ctx.lineWidth = 0.42;
      ctx.stroke(chunk.paths.crystalCore);
    }
    ctx.restore();
  },

  isReserved(x, y, padding) {
    if (!this.ready || !this.active) return false;
    const pad = padding || 0;
    for (let i = 0; i < this.active.reservations.length; i++) {
      const r = this.active.reservations[i];
      if (x >= r.x1 - pad && x <= r.x2 + pad && y >= r.y1 - pad && y <= r.y2 + pad) return true;
    }
    return false;
  },

  visualSignature() {
    return this.active ? this.active.signature : 0;
  }
};

window.SecondaryFormsSystem = SecondaryFormsSystem;
