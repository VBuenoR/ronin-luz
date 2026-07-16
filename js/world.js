'use strict';
// ─── Mundo: geometria, zonas, decoração ──────────────────────────────
const World = {
  width: 7400, height: 2400,

  solids: [
    { x: -60, y: -400, w: 60, h: 1900 },     // parede esquerda
    { x: 7400, y: -400, w: 60, h: 1900 },    // parede direita
    { x: 0, y: 1200, w: 1560, h: 340 },      // chão — Floresta
    { x: 1560, y: 1200, w: 1280, h: 340 },   // chão — Ruínas
    { x: 1900, y: 760, w: 90, h: 440 },      // torre 1
    { x: 2350, y: 880, w: 80, h: 320 },      // torre 2
    { x: 3000, y: 1200, w: 220, h: 340 },    // ilha 1
    { x: 3420, y: 1200, w: 320, h: 340 },    // ilha 2
    { x: 3800, y: 1200, w: 1250, h: 340 },   // chão — Bosque Suspenso
    { x: 4150, y: 910, w: 70, h: 290 },      // muro 1
    { x: 4530, y: 790, w: 70, h: 410 },      // muro 2
    { x: 5050, y: 1240, w: 280, h: 300 },    // margem do lago
    { x: 5360, y: 1200, w: 70, h: 340 },     // coluna 1
    { x: 5520, y: 1150, w: 70, h: 390 },     // coluna 2
    { x: 5660, y: 1200, w: 70, h: 340 },     // coluna 3
    { x: 5810, y: 1200, w: 1290, h: 340 },   // margem 2 + arena do chefe
    { x: 7100, y: 1120, w: 300, h: 420 },    // santuário
    // ── gruta submersa (sob o lago) ──
    { x: 5250, y: 1440, w: 80, h: 550 },     // parede oeste da gruta (passagem embaixo)
    { x: 5810, y: 1540, w: 110, h: 260 },    // parede leste da gruta (acima da passagem)
    { x: 5810, y: 1980, w: 110, h: 260 },    // parede leste (abaixo) — passagem 1800–1980
    { x: 5250, y: 2140, w: 670, h: 120 },    // fundo da gruta
    { x: 5330, y: 1620, w: 170, h: 46 },     // saliência oeste
    { x: 5640, y: 1800, w: 170, h: 46 },     // saliência leste
    { x: 5330, y: 1980, w: 190, h: 46 },     // saliência oeste baixa
    // ── caverna de lava (o subterrâneo oeste — mapa 2) ──
    { x: 1620, y: 1540, w: 80, h: 900 },     // parede oeste da caverna
    { x: 1700, y: 1540, w: 3630, h: 80 },    // teto da caverna
    { x: 1700, y: 2280, w: 900, h: 120 },    // piso do trono das cinzas
    { x: 2900, y: 2280, w: 350, h: 120 },    // ilhas de pedra entre a lava
    { x: 3510, y: 2280, w: 400, h: 120 },
    { x: 4190, y: 2280, w: 460, h: 120 },
    { x: 4900, y: 2140, w: 430, h: 300 },    // túnel elevado (liga à gruta d'água)
    { x: 1700, y: 2380, w: 3630, h: 60 },    // leito rochoso sob a lava
    { x: 2720, y: 2140, w: 70, h: 240 },     // colunas vulcânicas na lava
    { x: 3340, y: 2150, w: 70, h: 230 },
    { x: 4010, y: 2150, w: 70, h: 230 },
    { x: 4740, y: 2160, w: 70, h: 220 },
    // ── salão afogado (expansão submersa leste) ──
    { x: 5920, y: 1540, w: 1480, h: 170 },   // teto do salão
    { x: 5920, y: 2340, w: 1480, h: 100 },   // leito do salão
    { x: 6180, y: 1710, w: 80, h: 320 },     // defletor do teto (passe por baixo)
    { x: 6480, y: 1980, w: 80, h: 360 },     // defletor do fundo (passe por cima)
    { x: 6780, y: 1710, w: 80, h: 330 },     // defletor do teto 2
    // ── copas sussurrantes: tronco escalável ──
    { x: 6110, y: 90, w: 55, h: 260 },
    // ── templo abandonado (início da floresta) ──
    { x: 1170, y: 1150, w: 220, h: 50 }
  ],

  oneways: [
    { x: 380, y: 1092, w: 120, h: 16 }, { x: 610, y: 996, w: 130, h: 16 }, { x: 880, y: 1080, w: 130, h: 16 },
    { x: 2130, y: 950, w: 120, h: 16 },
    { x: 2870, y: 1075, w: 110, h: 16 }, { x: 3255, y: 1085, w: 110, h: 16 },
    { x: 4245, y: 1095, w: 120, h: 16 }, { x: 4390, y: 985, w: 120, h: 16 }, { x: 4640, y: 770, w: 220, h: 18 },
    // ── copas sussurrantes: a nova camada no alto do mundo ──
    { x: 2680, y: 200, w: 280, h: 18 },   // plataforma do portal do vento
    { x: 3130, y: 290, w: 220, h: 18 },
    { x: 3560, y: 350, w: 260, h: 18 },
    { x: 4000, y: 350, w: 700, h: 18 },   // o grande galho
    { x: 4330, y: 285, w: 90, h: 14 },
    { x: 4560, y: 170, w: 180, h: 16 },   // galho alto
    { x: 4740, y: 430, w: 130, h: 16 },
    { x: 4900, y: 350, w: 610, h: 18 },   // borda oeste do vapor
    { x: 5200, y: 250, w: 60, h: 14 },
    { x: 5680, y: 350, w: 330, h: 18 },   // borda leste do vapor
    { x: 6250, y: 350, w: 340, h: 18 },
    { x: 6660, y: 240, w: 330, h: 18 }
  ],

  waters: [
    { x: 5330, y: 1290, w: 480, h: 950 },
    { x: 5810, y: 1700, w: 1590, h: 640 },  // salão afogado
    { x: 1700, y: 1620, w: 3630, h: 760 }   // veias afogadas — a antiga caverna, inundada
  ],

  // coluna de vapor termal: sem dano — carrega o jogador do lago até as copas
  updrafts: [
    { x: 5545, y: 360, w: 125, h: 930 }
  ],

  // portais entre reinos (↓ para atravessar)
  firePortal: {
    floresta: { x: 1800, y: 2280, tx: 5150, ty: 2140 },
    fogo:     { x: 5180, y: 2140, tx: 1900, ty: 2280 }
  },
  windPortal: { x: 2830, y: 200 },

  // jatos termais: aquecem, avisam com bolhas e ENTÃO explodem
  jets: [
    { x: 6320, base: 2340, h: 400, period: 260, offset: 0 },
    { x: 6620, base: 2340, h: 420, period: 260, offset: 90 },
    { x: 6900, base: 2340, h: 380, period: 260, offset: 180 }
  ],

  // na floresta não há lava nem espinhos — o fogo agora vive no próprio reino
  lavas: [],
  spikes: [],
  torches: [],

  fireAltar: { x: 1835, y: 1780, taken: false },

  checkpoints: [
    { x: 200, y: 1200 }, { x: 3880, y: 1200 }, { x: 6280, y: 1200 },
    { x: 5080, y: 2140 },
    { x: 5750, y: 350 },   // copas, na saída do vapor
    { x: 6060, y: 2340 }   // entrada do salão afogado
  ],

  zones: [
    { x: 0,    kanji: '森', name: 'Floresta das Lanternas', shown: false },
    { x: 1560, kanji: '塔', name: 'Ruínas do Vigia', shown: false },
    { x: 2840, kanji: '谷', name: 'O Vão Partido', shown: false },
    { x: 3800, kanji: '宮', name: 'Bosque Suspenso', shown: false },
    { x: 5050, kanji: '水', name: 'Jardim das Marés', shown: false },
    { x: 6410, kanji: '王', name: 'Trono do Shōgun Afogado', shown: false },
    { x: 7100, kanji: '光', name: 'Santuário da Aurora', shown: false }
  ],

  pickups: [
    { x: 665, y: 958, type: 'lotus', taken: false },
    { x: 1945, y: 720, type: 'crystal', taken: false },
    { x: 3310, y: 1045, type: 'lotus', taken: false },
    { x: 4450, y: 945, type: 'lotus', taken: false },
    { x: 4750, y: 730, type: 'crystal', taken: false },
    { x: 5555, y: 1110, type: 'crystal', taken: false },
    { x: 5940, y: 1160, type: 'lotus', taken: false },
    { x: 5700, y: 1690, type: 'crystal', taken: false },
    { x: 5380, y: 2100, type: 'lotus', taken: false },
    { x: 6250, y: 1860, type: 'crystal', taken: false },
    { x: 7060, y: 2290, type: 'lotus', taken: false },
    // copas sussurrantes
    { x: 4640, y: 138, type: 'crystal', taken: false },
    { x: 3220, y: 258, type: 'lotus', taken: false },
    { x: 6800, y: 208, type: 'crystal', taken: false },
    // veias afogadas
    { x: 3600, y: 2230, type: 'lotus', taken: false },
    { x: 3050, y: 2080, type: 'crystal', taken: false }
  ],

  gate: { x: 6150, y: 940, w: 46, h: 260, openT: 0, opening: false, cost: 3 },
  portal: { x: 7250, y: 1120 },
  amulet: { x: 2450, y: 2230, spawned: true, taken: false },
  windAmulet: { x: 2750, y: 200, taken: false },
  darkKatana: { x: 1280, y: 1150, taken: false },

  lanterns: [
    { x: 520, y: 1200 }, { x: 1180, y: 1200 }, { x: 1700, y: 1200 }, { x: 2560, y: 1200 },
    { x: 3520, y: 1200 }, { x: 3980, y: 1200 }, { x: 4880, y: 1200 }, { x: 5880, y: 1200 },
    { x: 6350, y: 1200 }, { x: 6950, y: 1200 }, { x: 7160, y: 1120 }, { x: 7360, y: 1120 }
  ],

  // paletas: [skyTop, skyBottom, fog, moss, tree]
  palettes: {
    forest: { skyT: [7, 9, 24],  skyB: [22, 42, 52],  fog: [46, 82, 92],   moss: [96, 224, 158],  tree: [9, 16, 28] },
    lake:   { skyT: [5, 11, 30], skyB: [16, 46, 82],  fog: [56, 100, 145], moss: [92, 208, 224],  tree: [7, 18, 38] },
    throne: { skyT: [4, 7, 22],  skyB: [30, 38, 84],  fog: [70, 78, 150],  moss: [130, 168, 255], tree: [10, 13, 34] }
  },

  trees: [[], [], []], grass: [], shrooms: [], stars: [], decorActors: [],

  // ── Reino do Fogo: um mapa próprio, alcançado pelo portal vermelho ──
  current: 'floresta',
  maps: null,
  mapFogo: {
    solids: [
      { x: -60, y: -400, w: 60, h: 1900 },
      { x: 7400, y: -400, w: 60, h: 1900 },
      { x: 1620, y: 1540, w: 80, h: 900 },
      { x: 1700, y: 1540, w: 3630, h: 80 },
      { x: 1700, y: 2280, w: 900, h: 120 },
      { x: 2900, y: 2280, w: 350, h: 120 },
      { x: 3510, y: 2280, w: 400, h: 120 },
      { x: 4190, y: 2280, w: 460, h: 120 },
      { x: 4900, y: 2140, w: 430, h: 300 },
      { x: 1700, y: 2380, w: 3630, h: 60 },
      { x: 2720, y: 2140, w: 70, h: 240 },
      { x: 3340, y: 2150, w: 70, h: 230 },
      { x: 4010, y: 2150, w: 70, h: 230 },
      { x: 4740, y: 2160, w: 70, h: 220 },
      { x: 1760, y: 1780, w: 150, h: 40 },
      { x: 5330, y: 1540, w: 80, h: 900 }
    ],
    oneways: [
      { x: 3050, y: 2040, w: 120, h: 16 }, { x: 3620, y: 2020, w: 130, h: 16 }, { x: 4330, y: 2030, w: 120, h: 16 },
      { x: 1780, y: 2170, w: 90, h: 14 }, { x: 1950, y: 2060, w: 90, h: 14 },
      { x: 1790, y: 1950, w: 90, h: 14 }, { x: 1900, y: 1840, w: 80, h: 14 },
      { x: 2820, y: 2060, w: 100, h: 14 }, { x: 2580, y: 1990, w: 100, h: 14 },
      { x: 2350, y: 2060, w: 90, h: 14 }, { x: 2120, y: 2120, w: 90, h: 14 }
    ],
    waters: [], jets: [], updrafts: [],
    lavas: [
      { x: 2600, y: 2300, w: 300, h: 100 },
      { x: 3250, y: 2300, w: 260, h: 100 },
      { x: 3910, y: 2300, w: 280, h: 100 },
      { x: 4650, y: 2300, w: 250, h: 100 }
    ],
    spikes: [
      { x: 3560, y: 2264, w: 110, h: 16 },
      { x: 4240, y: 2264, w: 110, h: 16 },
      { x: 1930, y: 2264, w: 140, h: 16 },
      { x: 2000, y: 2044, w: 40, h: 16 },
      { x: 1828, y: 2156, w: 42, h: 14 },
      { x: 1840, y: 1936, w: 40, h: 14 }
    ],
    torches: [
      { x: 5300, y: 2140 }, { x: 4940, y: 2140 }, { x: 4210, y: 2280 },
      { x: 2920, y: 2280 }, { x: 2580, y: 2280 }, { x: 2140, y: 2280 }
    ],
    checkpoints: [
      { x: 5060, y: 2140 }, { x: 2980, y: 2280 }
    ],
    pickups: [
      { x: 3700, y: 2240, type: 'lotus', taken: false },
      { x: 3110, y: 1998, type: 'crystal', taken: false },
      { x: 4390, y: 1988, type: 'lotus', taken: false },
      { x: 2450, y: 2238, type: 'crystal', taken: false }
    ]
  },

  load(id) {
    this.current = id;
    const m = this.maps[id];
    this.solids = m.solids;
    this.oneways = m.oneways;
    this.waters = m.waters;
    this.lavas = m.lavas;
    this.spikes = m.spikes;
    this.jets = m.jets;
    this.updrafts = m.updrafts;
    this.torches = m.torches;
    this.checkpoints = m.checkpoints;
    this.pickups = m.pickups;
    // Lista exclusiva do renderer. A física continua consultando this.solids.
    this.renderSolids = this.solids.slice(2);
    this.rebuildDecor(id === 'fogo' ? 777 : 1);
  },

  secondaryExclusions() {
    const zones = [];
    const add = (x1, y1, x2, y2, kind) => zones.push({
      x1: Math.min(x1, x2), y1: Math.min(y1, y2),
      x2: Math.max(x1, x2), y2: Math.max(y1, y2),
      kind: kind || 'hard'
    });
    const around = (p, rx, up, down, kind) => {
      if (p) add(p.x - rx, p.y - up, p.x + rx, p.y + down, kind);
    };

    for (const p of this.pickups || []) around(p, 34, 72, 18);
    for (const c of this.checkpoints || []) around(c, 68, 125, 20);
    around(this.firePortal && this.firePortal[this.current], 68, 118, 20);

    if (this.current === 'floresta') {
      around(this.windPortal, 78, 100, 22);
      around(this.portal, 95, 145, 22);
      if (this.gate) add(this.gate.x - 48, this.gate.y - 28,
        this.gate.x + this.gate.w + 48, this.gate.y + this.gate.h + 22);
      around(this.amulet, 58, 94, 20);
      around(this.darkKatana, 56, 92, 20);
      for (const lantern of this.lanterns || []) around(lantern, 32, 112, 18, 'soft');
    } else {
      around(this.fireAltar, 70, 110, 22);
    }

    for (const torch of this.torches || []) around(torch, 30, 74, 18, 'soft');
    for (const spike of this.spikes || []) {
      add(spike.x - 22, spike.y - 54, spike.x + spike.w + 22, spike.y + spike.h + 18);
    }
    for (const lava of this.lavas || []) {
      add(lava.x - 18, lava.y - 48, lava.x + lava.w + 18, lava.y + lava.h + 18);
    }
    for (const jet of this.jets || []) {
      add(jet.x - 46, jet.base - jet.h - 34, jet.x + 46, jet.base + 20);
    }
    for (const draft of this.updrafts || []) {
      add(draft.x - 28, draft.y - 28, draft.x + draft.w + 28, draft.y + draft.h + 28);
    }

    for (const enemy of this.decorActors || []) {
      if ((enemy.map || 'floresta') !== this.current) continue;
      const homeY = Number.isFinite(enemy.homeY) ? enemy.homeY : enemy.y;
      const minX = Number.isFinite(enemy.min) ? enemy.min : enemy.x;
      const maxX = Number.isFinite(enemy.max) ? enemy.max : enemy.x;
      const margin = (enemy.w || 30) * 0.5 + 36;
      let y1 = homeY - (enemy.h || 42) - 46;
      let y2 = homeY + 24;
      if (enemy.fly) { y1 -= 145; y2 += 90; }
      else if (enemy.swim) { y1 -= 42; y2 += 42; }
      add(minX - margin, y1, maxX + margin, y2, 'actor');
    }
    return zones;
  },

  setDecorActors(actors) {
    this.decorActors = actors || [];
    this.rebuildDecor(this.current === 'fogo' ? 777 : 1);
  },

  rebuildDecor(salt) {
    const rng = U.seeded(20260702 + salt);
    const isFire = this.current === 'fogo';
    this.grass = [];
    this.shrooms = [];
    TerrainSkin.rebuild(this.renderSolids, this.oneways, this.current, 20260702 + salt);
    const linkedRects = (TreeSystem.gameplay[this.current] || [])
      .map((item) => item.linkedRect)
      .filter(Boolean);
    const exclusions = this.secondaryExclusions();
    SecondaryFormsSystem.rebuild({
      mapId: this.current,
      solids: this.renderSolids,
      oneways: this.oneways,
      seed: 20260702 + salt,
      exclusions,
      blockedRects: linkedRects
    });
    if (typeof BioluminescentFloraSystem !== 'undefined') {
      BioluminescentFloraSystem.rebuild({
        mapId: this.current,
        solids: this.renderSolids,
        oneways: this.oneways,
        waters: this.waters,
        seed: 20260702 + salt,
        exclusions,
        secondaryAnchors: SecondaryFormsSystem.active
          ? SecondaryFormsSystem.active.bioAnchors
          : null
      });
    }
    const tops = this.renderSolids.concat(this.oneways);
    for (const s of tops) {
      const patches = TerrainSkin.mossPatches(s);
      for (let pi = 0; pi < patches.length; pi++) {
        const patch = patches[pi];
        let gx = patch.x1 + 4 + rng() * 6;
        const end = patch.x2 - 4;
        while (gx < end) {
          const gy = TerrainSkin.surfaceY(s, gx);
          if (gx > s.x + 13 && gx < s.x + s.w - 13 &&
              !SecondaryFormsSystem.isReserved(gx, gy, 8) && rng() < (isFire ? 0.24 : 0.78)) {
            const bladeCount = isFire ? 2 + Math.floor(rng() * 3) : 3 + Math.floor(rng() * 5);
            const blades = [];
            for (let b = 0; b < bladeCount; b++) {
              blades.push({
                dx: (b - (bladeCount - 1) * 0.5) * (1.7 + rng() * 1.35),
                len: isFire
                  ? 2 + rng() * 4
                  : 3.5 + rng() * 7.5 + (b === (bladeCount >> 1) && rng() < 0.22 ? 3 : 0),
                lean: (rng() - 0.5) * 3.2,
                phase: rng() * 6.28,
                glow: !isFire && patch.tier === 2 && rng() < 0.22
              });
            }
            this.grass.push({
              x: gx, y: gy,
              ph: rng() * 6.28, sway: 0.5 + rng() * 0.85,
              alpha: isFire ? 0.18 + rng() * 0.14 : 0.27 + rng() * 0.2,
              tone: 0.32 + rng() * 0.22,
              width: isFire ? 0.65 + rng() * 0.35 : 0.85 + rng() * 0.45,
              ash: isFire,
              blades
            });
          }
          gx += 12 + rng() * 18;
        }
        if (!isFire && patch.x2 - patch.x1 > 22 && rng() < 0.08) {
          const mx = patch.x1 + 7 + rng() * Math.max(1, patch.x2 - patch.x1 - 14);
          const my = TerrainSkin.surfaceY(s, mx);
          if (!SecondaryFormsSystem.isReserved(mx, my, 11)) {
            this.shrooms.push({
              x: mx, y: my,
              r: 2.4 + rng() * 2.8, gold: rng() < 0.34, ph: rng() * 6.28
            });
          }
        }
      }
    }
  },

  init() {
    // Reinicializações futuras podem acontecer após uma troca de reino. Volta
    // às referências canônicas da floresta antes de reconstruir caches visuais.
    const forestMap = this.maps && this.maps.floresta;
    if (forestMap) {
      this.current = 'floresta';
      for (const key of [
        'solids', 'oneways', 'waters', 'lavas', 'spikes', 'jets',
        'updrafts', 'torches', 'checkpoints', 'pickups'
      ]) this[key] = forestMap[key];
    }
    this.stars = [];
    const rng = U.seeded(20260702);
    // Toda a geometria visual é cacheada; as plataformas continuam sendo os
    // mesmos retângulos usados pela física.
    TreeSystem.init(this.width, this.oneways, this.mapFogo.oneways);
    this.trees = TreeSystem.layers;
    
    // Geração de elementos de primeiro plano (Foreground Parallax)
    this.foreElements = [];
    let fx = 100;
    while (fx < this.width * 1.25 + 960) {
      fx += 520 + rng() * 760;
      const element = {
        x: fx,
        type: rng() < 0.45 ? 'trunk' : 'branch',
        w: 28 + rng() * 20,
        h: 540,
        s: rng(),
        lean: (rng() - 0.5) * 44,
        phase: rng() * 6.28
      };
      element.seed = TreeSystem.hash(20260702, 'foreground', Math.round(fx));
      element.foliage = TreeSystem.ready
        ? TreeSystem.buildForegroundFoliage(element)
        : null;
      this.foreElements.push(element);
    }

    // estrelas (espaço de tela com leve parallax)
    for (let i = 0; i < 110; i++) {
      this.stars.push({ x: rng() * 1600, y: rng() * 330, r: 0.5 + rng() * 1.3, ph: rng() * 6.28 });
    }
    // registra os reinos: a floresta é o que está nos arrays de cima
    this.maps = {
      floresta: {
        solids: this.solids, oneways: this.oneways, waters: this.waters,
        lavas: this.lavas, spikes: this.spikes, jets: this.jets,
        updrafts: this.updrafts, torches: this.torches,
        checkpoints: this.checkpoints, pickups: this.pickups
      },
      fogo: this.mapFogo
    };
    this.load('floresta');
  },

  solidList() {
    if (this.current === 'floresta' && this.gate.openT < 0.7) return this.solids.concat([this.gate]);
    return this.solids;
  },

  palette(x, y) {
    // Reino do Fogo: sempre incandescente
    if (this.current === 'fogo') {
      return { skyT: [22, 7, 8], skyB: [66, 22, 14], fog: [140, 60, 30], moss: [255, 150, 70], tree: [34, 12, 10] };
    }
    // subterrâneo da floresta: tudo é água agora
    if (y !== undefined && y > 1450) {
      return { skyT: [3, 6, 18], skyB: [10, 28, 56], fog: [40, 70, 120], moss: [90, 195, 220], tree: [8, 14, 30] };
    }
    const P = this.palettes;
    let a, b, t;
    if (x < 4600) { a = P.forest; b = P.lake; t = U.clamp((x - 3400) / 1200, 0, 1); }
    else if (x < 6200) { a = P.lake; b = P.throne; t = U.clamp((x - 5600) / 600, 0, 0.35); }
    else { a = P.lake; b = P.throne; t = U.clamp(0.35 + (x - 6200) / 900 * 0.65, 0, 1); }
    const mix = {};
    for (const k of ['skyT', 'skyB', 'fog', 'moss', 'tree']) mix[k] = U.mixRGB(a[k], b[k], t);
    return mix;
  },

  // Posição compartilhada pelo sprite e pela iluminação da lua.
  moonScreenPosition(cam) {
    return {
      x: 730 - cam.x * 0.03,
      y: 105 - (cam.y - 870) * 0.03
    };
  },

  // ── fundo: céu, lua, árvores, névoa ──
  drawBackground(ctx, cam, frames) {
    if (this.current === 'fogo' || cam.y + 270 > 1450) { this.drawCaveBackground(ctx, cam, frames); return; }
    const pal = this.palette(cam.x + 480);
    const sky = ctx.createLinearGradient(0, 0, 0, 540);
    sky.addColorStop(0, U.rgb(pal.skyT));
    sky.addColorStop(1, U.rgb(pal.skyB));
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, 960, 540);

    // estrelas
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const st of this.stars) {
      const sx = ((st.x - cam.x * 0.06) % 1600 + 1600) % 1600 - 320;
      if (sx < -10 || sx > 970) continue;
      ctx.globalAlpha = 0.35 + 0.4 * Math.sin(frames * 0.02 + st.ph);
      ctx.fillStyle = '#cfe6ff';
      ctx.beginPath(); ctx.arc(sx, st.y - (cam.y - 870) * 0.06, st.r, 0, 7); ctx.fill();
    }
    // Lua em três profundidades: atmosfera fria, halo quente e disco.
    // A projeção sobre o cenário é composta depois pelo Lighting.
    const moon = this.moonScreenPosition(cam);
    const mx = moon.x, my = moon.y;
    const moonPulse = 0.96 + Math.sin(frames * 0.0038) * 0.04;
    const outerHalo = ctx.createRadialGradient(mx, my, 24, mx, my, 225);
    outerHalo.addColorStop(0, `rgba(211,231,250,${0.13 * moonPulse})`);
    outerHalo.addColorStop(0.45, `rgba(166,202,235,${0.055 * moonPulse})`);
    outerHalo.addColorStop(1, 'rgba(138,180,220,0)');
    ctx.globalAlpha = 1; ctx.fillStyle = outerHalo;
    ctx.beginPath(); ctx.arc(mx, my, 225, 0, Math.PI * 2); ctx.fill();

    const halo = ctx.createRadialGradient(mx, my, 8, mx, my, 132);
    halo.addColorStop(0, `rgba(255,248,224,${0.52 * moonPulse})`);
    halo.addColorStop(0.38, `rgba(229,238,241,${0.24 * moonPulse})`);
    halo.addColorStop(1, 'rgba(190,216,238,0)');
    ctx.fillStyle = halo;
    ctx.beginPath(); ctx.arc(mx, my, 132, 0, Math.PI * 2); ctx.fill();

    const moonDisc = ctx.createRadialGradient(mx - 11, my - 12, 2, mx, my, 39);
    moonDisc.addColorStop(0, '#fffef5');
    moonDisc.addColorStop(0.58, '#f2f0dc');
    moonDisc.addColorStop(1, '#cbd4d4');
    ctx.fillStyle = moonDisc;
    ctx.beginPath(); ctx.arc(mx, my, 36, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(210,200,170,0.5)';
    ctx.beginPath(); ctx.arc(mx - 10, my - 6, 6, 0, 7); ctx.arc(mx + 8, my + 10, 4, 0, 7); ctx.fill();
    ctx.restore();

    // camadas de árvores (com suporte a parallax vertical)
    const factors = [0.25, 0.45, 0.7], baseY = [470, 505, 548];
    for (let L = 0; L < 3; L++) {
      const shade = 0.35 + L * 0.32;
      const col = U.mixRGB(pal.skyB, pal.tree, shade);
      ctx.fillStyle = U.rgb(col);
      // Fórmulas de parallax vertical centralizadas no ponto da câmera da superfície (870)
      const sy = baseY[L] - (cam.y - 870) * factors[L] * 0.32;
      
      TreeSystem.drawLayer(ctx, L, cam, frames, col, sy);
      // névoa entre camadas
      if (L < 2) {
        const fg = ctx.createLinearGradient(0, sy - 60, 0, sy + 40);
        fg.addColorStop(0, U.rgb(pal.fog, 0));
        fg.addColorStop(1, U.rgb(pal.fog, 0.16));
        ctx.fillStyle = fg;
        ctx.fillRect(0, sy - 60, 960, 100);
      }
    }
    // cascata cênica no Jardim das Marés
    const wfx = 5545 - cam.x;
    if (wfx > -80 && wfx < 1040) this.drawWaterfall(ctx, wfx, cam, frames);

    // Haze de separação de profundidade (Depth Fog) - afasta o background e destaca o cenário jogável
    ctx.fillStyle = U.rgb(pal.fog, 0.34);
    ctx.fillRect(0, 0, 960, 540);
  },

  // fundo subterrâneo: rocha, estalactites e brasa distante
  drawCaveBackground(ctx, cam, frames) {
    const lava = this.current === 'fogo';
    const sky = ctx.createLinearGradient(0, 0, 0, 540);
    if (lava) {
      sky.addColorStop(0, '#160607');
      sky.addColorStop(0.6, '#2c0d0a');
      sky.addColorStop(1, '#4a160d');
    } else {
      sky.addColorStop(0, '#020510');
      sky.addColorStop(1, '#0a1c38');
    }
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, 960, 540);

    // brilho da lava subindo do fundo
    if (lava) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const g = ctx.createLinearGradient(0, 320, 0, 540);
      g.addColorStop(0, 'rgba(255,110,40,0)');
      g.addColorStop(1, `rgba(255,110,40,${0.14 + 0.05 * Math.sin(frames * 0.03)})`);
      ctx.fillStyle = g;
      ctx.fillRect(0, 320, 960, 220);
      ctx.restore();
    }

    // A caverna aquática mantém suas estalactites. No Reino do Fogo, as
    // formações angulares do TreeSystem substituem integralmente o legado.
    const layers = [{ f: 0.3, col: lava ? '#20090a' : '#050b18', n: 12, h: 90 },
                    { f: 0.6, col: lava ? '#30100c' : '#081226', n: 9, h: 140 }];
    for (let layerIndex = 0; layerIndex < layers.length; layerIndex++) {
      const L = layers[layerIndex];
      ctx.fillStyle = L.col;
      // Parallax vertical centrado na altura padrão da caverna (1200)
      const syTop = - (cam.y - 1200) * L.f * 0.28;
      const syBot = 540 - (cam.y - 1200) * L.f * 0.28;

      if (!lava) {
        for (let i = 0; i < L.n; i++) {
          const sx = ((i * 173 + 60 - cam.x * L.f) % 1200 + 1200) % 1200 - 120;
          const h = L.h * (0.6 + ((i * 37) % 10) / 10);
          ctx.beginPath();
          ctx.moveTo(sx - 26, syTop); ctx.lineTo(sx, syTop + h); ctx.lineTo(sx + 26, syTop);
          ctx.closePath(); ctx.fill();
          // estalagmites correspondentes
          ctx.beginPath();
          ctx.moveTo(sx + 60 - 30, syBot); ctx.lineTo(sx + 60, syBot - h * 0.7); ctx.lineTo(sx + 60 + 30, syBot);
          ctx.closePath(); ctx.fill();
        }
      }
      // Intercala rocha e silhuetas para que a camada distante seja ocluída
      // pela próxima, preservando profundidade real no reino vulcânico.
      if (lava) TreeSystem.drawFireLayer(ctx, cam, frames, layerIndex);
    }

    // Haze de separação de profundidade (Depth Fog) na caverna
    ctx.fillStyle = lava ? 'rgba(44, 13, 10, 0.30)' : 'rgba(10, 28, 56, 0.28)';
    ctx.fillRect(0, 0, 960, 540);
  },

  drawTree(ctx, sx, baseY, tr, col) {
    if (!tr || !tr.geometry) return;
    ctx.save();
    ctx.translate(sx, baseY);
    TreeSystem.drawTreeGeometry(ctx, tr, col, 1);
    ctx.restore();
  },

  // Suportes monumentais próximos ao plano de gameplay. Árvores largas e
  // colunas apenas acompanham oneways existentes; não criam colisores.
  drawGameplayTrees(ctx, cam, frames) {
    const pal = this.palette(cam.x + 480, cam.y + 270);
    TreeSystem.drawGameplay(ctx, cam, frames, this.current, pal);
  },

  drawWaterfall(ctx, sx, cam, frames) {
    ctx.save();
    const topY = 0, botY = 1290 - cam.y;
    const g = ctx.createLinearGradient(sx, topY, sx, botY);
    g.addColorStop(0, 'rgba(150,220,255,0.06)');
    g.addColorStop(0.7, 'rgba(150,220,255,0.16)');
    g.addColorStop(1, 'rgba(210,245,255,0.3)');
    ctx.fillStyle = g;
    ctx.fillRect(sx - 26, topY, 52, botY - topY);
    // fios de água descendo
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = 'rgba(190,235,255,0.25)';
    ctx.lineWidth = 2;
    for (let i = 0; i < 5; i++) {
      const off = ((frames * 6 + i * 173) % (botY + 80)) - 40;
      const lx = sx - 18 + i * 9;
      ctx.beginPath(); ctx.moveTo(lx, off); ctx.lineTo(lx, off + 46); ctx.stroke();
    }
    // névoa na base
    const m = ctx.createRadialGradient(sx, botY, 4, sx, botY, 70);
    m.addColorStop(0, 'rgba(220,245,255,0.28)');
    m.addColorStop(1, 'rgba(220,245,255,0)');
    ctx.fillStyle = m;
    ctx.beginPath(); ctx.arc(sx, botY, 70, 0, 7); ctx.fill();
    ctx.restore();
  },

  // ── plataformas, estruturas e objetos ──
  drawSecondaryBack(ctx, cam, frames) {
    SecondaryFormsSystem.drawBack(
      ctx, cam, frames, this.palette(cam.x + 480, cam.y + 270)
    );
  },

  drawBioluminescentBase(ctx, cam, frames) {
    if (typeof BioluminescentFloraSystem !== 'undefined') {
      BioluminescentFloraSystem.drawBase(ctx, cam, frames);
    }
  },

  drawBioluminescentEmissive(ctx, cam, frames) {
    if (typeof BioluminescentFloraSystem !== 'undefined') {
      BioluminescentFloraSystem.drawEmissive(ctx, cam, frames);
    }
  },

  drawWorld(ctx, cam, frames) {
    const pal = this.palette(cam.x + 480, cam.y + 270);
    const view = { x: cam.x - 60, y: cam.y - 60, w: 1080, h: 660 };

    // sólidos
    for (const s of this.renderSolids) {
      if (!TerrainSkin.isVisible(s, view)) continue;
      if (TerrainSkin.drawSolid(ctx, s, cam, pal)) continue;
      const sx = s.x - cam.x, sy = s.y - cam.y;
      const body = ctx.createLinearGradient(0, sy, 0, sy + Math.min(s.h, 200));
      body.addColorStop(0, '#141c2e');
      body.addColorStop(1, '#080c18');
      ctx.fillStyle = body;
      ctx.fillRect(sx, sy, s.w, s.h);
      // fissuras sutis nas estruturas verticais
      if (s.h > 250 && s.w < 120) {
        ctx.strokeStyle = 'rgba(90,110,150,0.18)';
        ctx.lineWidth = 1;
        for (let i = 1; i < 4; i++) {
          ctx.beginPath();
          ctx.moveTo(sx + 4, sy + s.h * i / 4);
          ctx.lineTo(sx + s.w - 4, sy + s.h * i / 4 + 6);
          ctx.stroke();
        }
      }
      // borda de musgo luminoso
      ctx.save();
      ctx.shadowColor = U.rgb(pal.moss, 0.9);
      ctx.shadowBlur = 9;
      ctx.fillStyle = U.rgb(pal.moss, 0.75);
      ctx.fillRect(sx, sy, s.w, 3.5);
      ctx.restore();
      ctx.fillStyle = U.rgb(pal.moss, 0.2);
      ctx.fillRect(sx, sy + 3.5, s.w, 5);
    }

    // plataformas atravessáveis
    for (const o of this.oneways) {
      if (!TerrainSkin.isVisible(o, view)) continue;
      if (TerrainSkin.drawOneway(ctx, o, cam, pal)) continue;
      const sx = o.x - cam.x, sy = o.y - cam.y;
      ctx.fillStyle = '#1a2438';
      ctx.fillRect(sx, sy, o.w, o.h);
      ctx.save();
      ctx.shadowColor = U.rgb(pal.moss, 0.8);
      ctx.shadowBlur = 7;
      ctx.fillStyle = U.rgb(pal.moss, 0.65);
      ctx.fillRect(sx, sy, o.w, 2.5);
      ctx.restore();
      ctx.fillStyle = '#0c1220';
      ctx.fillRect(sx + 3, sy + o.h - 3, o.w - 6, 3);
    }

    // Tufos de grama: massas agrupadas e grandes intervalos vazios.
    SecondaryFormsSystem.drawSurface(ctx, cam, frames, pal);

    for (const g of this.grass) {
      const sx = g.x - cam.x, sy = g.y - cam.y;
      if (sx < -24 || sx > 984 || sy < -20 || sy > 560) continue;
      const grassColor = g.ash
        ? U.mixRGB([61, 43, 42], [18, 14, 17], g.tone)
        : U.mixRGB(pal.moss, [12, 24, 28], g.tone);
      ctx.strokeStyle = U.rgb(grassColor, g.alpha);
      ctx.lineWidth = g.width;
      ctx.lineCap = 'round';
      ctx.beginPath();
      for (let bi = 0; bi < g.blades.length; bi++) {
        const blade = g.blades[bi];
        const sway = Math.sin(frames * 0.035 + g.ph + blade.phase) * g.sway + blade.lean;
        const bx = sx + blade.dx;
        ctx.moveTo(bx, sy + 0.5);
        ctx.quadraticCurveTo(
          bx + sway * 0.28, sy - blade.len * 0.58,
          bx + sway, sy - blade.len
        );
      }
      ctx.stroke();
    }
    ctx.lineCap = 'butt';

    // Corpo dos cogumelos; o halo é composto depois da iluminação.
    for (const m of this.shrooms) {
      const sx = m.x - cam.x, sy = m.y - cam.y;
      if (sx < -10 || sx > 970 || sy < -10 || sy > 550) continue;
      ctx.strokeStyle = 'rgba(30,42,46,0.8)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(sx, sy - m.r * 1.15);
      ctx.stroke();
      ctx.fillStyle = m.gold ? 'rgba(188,145,70,0.62)' : 'rgba(72,145,166,0.62)';
      ctx.beginPath();
      ctx.ellipse(sx, sy - m.r * 1.18, m.r, m.r * 0.48, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // lanternas de pedra (só na floresta)
    if (this.current === 'floresta') {
      for (const ln of this.lanterns) {
        const sx = ln.x - cam.x, sy = ln.y - cam.y;
        if (sx < -40 || sx > 1000) continue;
        this.drawLantern(ctx, sx, sy, frames + ln.x);
      }
    }

    // toriis de descanso (checkpoints do mapa atual)
    this.checkpoints.forEach((c) => {
      const sx = c.x - cam.x, sy = c.y - cam.y;
      const lit = Game.checkpoint && Game.checkpoint.map === this.current
        && Game.checkpoint.x === c.x && Game.checkpoint.y === c.y;
      if (sx > -140 && sx < 1100) this.drawTorii(ctx, sx, sy, 1, lit, frames);
    });

    if (this.current === 'floresta') {
      // grande torii do santuário
      const sx = 7250 - cam.x, sy = 1120 - cam.y;
      if (sx > -260 && sx < 1220) this.drawTorii(ctx, sx, sy, 2.3, Game.bossDefeated, frames);
      this.drawGate(ctx, cam, frames);
      this.drawPortal(ctx, cam, frames);
      this.drawAmulet(ctx, cam, frames);
      this.drawWindAmulet(ctx, cam, frames);
      this.drawDarkKatana(ctx, cam, frames);
      this.drawUpdrafts(ctx, cam, frames);
    } else {
      this.drawFireAltar(ctx, cam, frames);
    }
    this.drawRealmPortals(ctx, cam, frames);
    this.drawPickups(ctx, cam, frames);
    this.drawSpikes(ctx, cam, frames);
    this.drawTorches(ctx, cam, frames);
  },

  // Emissão do terreno é composta após Lighting.draw para não ser apagada.
  drawTerrainEmissive(ctx, cam, frames) {
    const pal = this.palette(cam.x + 480, cam.y + 270);
    const view = { x: cam.x - 100, y: cam.y - 120, w: 1160, h: 780 };
    for (const s of this.renderSolids) {
      if (TerrainSkin.isVisible(s, view)) TerrainSkin.drawEmissive(ctx, s, cam, pal);
    }
    for (const o of this.oneways) {
      if (TerrainSkin.isVisible(o, view)) TerrainSkin.drawEmissive(ctx, o, cam, pal);
    }

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';

    // Somente uma pequena fração das pontas da grama recebe emissão.
    ctx.strokeStyle = U.rgb(pal.moss, 0.42);
    ctx.lineWidth = 0.8;
    ctx.lineCap = 'round';
    for (const g of this.grass) {
      if (g.ash) continue;
      const sx = g.x - cam.x, sy = g.y - cam.y;
      if (sx < -24 || sx > 984 || sy < -20 || sy > 560) continue;
      ctx.beginPath();
      let hasGlow = false;
      for (let bi = 0; bi < g.blades.length; bi++) {
        const blade = g.blades[bi];
        if (!blade.glow) continue;
        const sway = Math.sin(frames * 0.035 + g.ph + blade.phase) * g.sway + blade.lean;
        const tx = sx + blade.dx + sway;
        const ty = sy - blade.len;
        ctx.moveTo(tx - 0.6, ty);
        ctx.lineTo(tx + 0.6, ty);
        hasGlow = true;
      }
      if (hasGlow) ctx.stroke();
    }

    for (const m of this.shrooms) {
      const sx = m.x - cam.x, sy = m.y - cam.y;
      if (sx < -20 || sx > 980 || sy < -20 || sy > 560) continue;
      const pulse = 0.5 + 0.5 * Math.sin(frames * 0.06 + m.ph);
      const color = m.gold
        ? 'rgba(255,205,105,' + (0.28 + pulse * 0.34) + ')'
        : 'rgba(105,211,245,' + (0.25 + pulse * 0.32) + ')';
      const glow = ctx.createRadialGradient(sx, sy - m.r, 0, sx, sy - m.r, m.r * 4.5);
      glow.addColorStop(0, color);
      glow.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(sx, sy - m.r, m.r * 4.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = m.gold ? 'rgba(255,232,166,0.68)' : 'rgba(184,240,255,0.66)';
      ctx.beginPath();
      ctx.ellipse(sx, sy - m.r * 1.18, m.r * 0.8, m.r * 0.3, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
    SecondaryFormsSystem.drawEmissive(ctx, cam, frames);
    TreeSystem.drawEmissive(ctx, cam, frames, this.current);
  },

  // coluna de vapor que carrega o jogador para as copas
  drawUpdrafts(ctx, cam, frames) {
    for (const u of this.updrafts) {
      const sx = u.x - cam.x, sy = u.y - cam.y;
      if (sx + u.w < -40 || sx > 1000) continue;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const g = ctx.createLinearGradient(0, sy, 0, sy + u.h);
      g.addColorStop(0, 'rgba(220,240,255,0.02)');
      g.addColorStop(0.75, 'rgba(220,240,255,0.10)');
      g.addColorStop(1, 'rgba(220,240,255,0.18)');
      ctx.fillStyle = g;
      ctx.fillRect(sx, sy, u.w, u.h);
      // fiapos de vapor subindo
      ctx.strokeStyle = 'rgba(223,242,255,0.4)';
      ctx.lineWidth = 2;
      for (let i = 0; i < 9; i++) {
        const py = u.y + u.h - ((frames * (2.2 + (i % 3)) + i * 173) % u.h);
        const px = u.x + 12 + ((i * 41) % (u.w - 24)) + Math.sin(frames * 0.05 + i) * 8;
        ctx.beginPath();
        ctx.moveTo(px - cam.x, py - cam.y);
        ctx.quadraticCurveTo(px - cam.x + 5, py - cam.y + 12, px - cam.x, py - cam.y + 24);
        ctx.stroke();
      }
      ctx.restore();
    }
  },

  // portais entre reinos
  drawRealmPortals(ctx, cam, frames) {
    const draws = [];
    if (this.current === 'floresta') {
      draws.push({ p: this.firePortal.floresta, col: '255,120,50', kanji: '火', dormant: false });
      draws.push({ p: this.windPortal, col: '190,215,200', kanji: '風', dormant: true });
    } else {
      draws.push({ p: this.firePortal.fogo, col: '140,215,255', kanji: '水', dormant: false });
    }
    for (const d of draws) {
      const sx = d.p.x - cam.x, sy = d.p.y - cam.y - 52;
      if (sx < -100 || sx > 1060 || sy < -100 || sy > 640) continue;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const a = d.dormant ? 0.35 : 0.85;
      const g = ctx.createRadialGradient(sx, sy, 3, sx, sy, 46);
      g.addColorStop(0, `rgba(${d.col},${a * 0.45})`);
      g.addColorStop(1, `rgba(${d.col},0)`);
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(sx, sy, 46, 0, 7); ctx.fill();
      ctx.strokeStyle = `rgba(${d.col},${a})`;
      ctx.lineWidth = 2.6;
      ctx.setLineDash([10, 7]);
      ctx.lineDashOffset = -frames * (d.dormant ? 0.15 : 0.7);
      ctx.beginPath(); ctx.arc(sx, sy, 38, 0, 7); ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = `rgba(${d.col},${a})`;
      ctx.font = '700 20px serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(d.kanji, sx, sy + 1);
      ctx.restore();
    }
  },

  drawSpikes(ctx, cam, frames) {
    for (const sp of this.spikes) {
      const sx = sp.x - cam.x, sy = sp.y - cam.y;
      if (sx + sp.w < -20 || sx > 980 || sy < -40 || sy > 580) continue;
      const n = Math.max(2, Math.round(sp.w / 14));
      for (let i = 0; i < n; i++) {
        const px = sx + (i + 0.5) * (sp.w / n);
        ctx.fillStyle = '#171019';
        ctx.beginPath();
        ctx.moveTo(px - 6, sy + sp.h);
        ctx.lineTo(px, sy);
        ctx.lineTo(px + 6, sy + sp.h);
        ctx.closePath(); ctx.fill();
        // ponta em brasa
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.fillStyle = `rgba(255,140,60,${0.5 + 0.3 * Math.sin(frames * 0.08 + i)})`;
        ctx.beginPath(); ctx.arc(px, sy + 2, 1.6, 0, 7); ctx.fill();
        ctx.restore();
      }
    }
  },

  drawTorches(ctx, cam, frames) {
    for (const tc of this.torches) {
      const sx = tc.x - cam.x, sy = tc.y - cam.y;
      if (sx < -40 || sx > 1000 || sy < -60 || sy > 600) continue;
      ctx.fillStyle = '#171019';
      ctx.fillRect(sx - 2, sy - 30, 4, 30);
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const fl = 0.6 + 0.4 * Math.sin(frames * 0.13 + tc.x);
      const g = ctx.createRadialGradient(sx, sy - 34, 1, sx, sy - 34, 22);
      g.addColorStop(0, `rgba(255,150,60,${0.75 * fl})`);
      g.addColorStop(1, 'rgba(255,150,60,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(sx, sy - 34, 22, 0, 7); ctx.fill();
      ctx.fillStyle = `rgba(255,220,150,${0.9 * fl})`;
      ctx.beginPath();
      ctx.ellipse(sx, sy - 34, 2.5, 4.5 + fl * 2, 0, 0, 7);
      ctx.fill();
      ctx.restore();
    }
  },

  drawFireAltar(ctx, cam, frames) {
    const a = this.fireAltar;
    const sx = a.x - cam.x, sy = a.y - cam.y;
    if (sx < -80 || sx > 1040 || sy < -100 || sy > 640) return;
    // altar de pedra
    ctx.fillStyle = '#1c1114';
    ctx.fillRect(sx - 22, sy - 12, 44, 12);
    ctx.fillRect(sx - 14, sy - 34, 28, 22);
    ctx.fillRect(sx - 18, sy - 40, 36, 6);
    const lit = !a.taken;
    if (a.taken) return;
    if (lit) {
      // Ka — o amuleto de fogo aceso
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const pulse = 0.7 + 0.3 * Math.sin(frames * 0.07);
      const g = ctx.createRadialGradient(sx, sy - 52, 2, sx, sy - 52, 42);
      g.addColorStop(0, `rgba(255,150,60,${0.55 * pulse})`);
      g.addColorStop(1, 'rgba(255,150,60,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(sx, sy - 52, 42, 0, 7); ctx.fill();
      // chama-gema
      ctx.fillStyle = '#ffd9a0';
      ctx.beginPath();
      ctx.moveTo(sx, sy - 64 - pulse * 3);
      ctx.bezierCurveTo(sx + 9, sy - 52, sx + 7, sy - 44, sx, sy - 42);
      ctx.bezierCurveTo(sx - 7, sy - 44, sx - 9, sy - 52, sx, sy - 64 - pulse * 3);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,214,140,0.9)';
      ctx.lineWidth = 2.2;
      ctx.beginPath(); ctx.arc(sx, sy - 52, 17 + Math.sin(frames * 0.09) * 2, 0, 7); ctx.stroke();
      ctx.restore();
      if (Math.random() < 0.2) {
        Particles.spawn({
          x: a.x + U.rand(-12, 12), y: a.y - 52 + U.rand(-8, 8),
          vy: U.rand(-1.2, -0.5), life: 44, size: 2.2,
          color: 'rgba(255,170,80,0.9)', type: 'wisp'
        });
      }
    } else {
      // altar adormecido
      ctx.fillStyle = 'rgba(120,80,60,0.5)';
      ctx.beginPath(); ctx.arc(sx, sy - 52, 5, 0, 7); ctx.fill();
    }
  },

  // ── lava em primeiro plano ──
  drawLava(ctx, cam, frames) {
    for (const lv of this.lavas) {
      const sx = lv.x - cam.x, sy = lv.y - cam.y;
      if (sx + lv.w < -40 || sx > 1000 || sy > 600 || sy + lv.h < -40) continue;
      const g = ctx.createLinearGradient(0, sy, 0, sy + lv.h);
      g.addColorStop(0, 'rgba(255,150,50,0.95)');
      g.addColorStop(0.4, 'rgba(230,80,20,0.95)');
      g.addColorStop(1, 'rgba(120,25,8,0.95)');
      ctx.fillStyle = g;
      ctx.fillRect(sx, sy + 2, lv.w, lv.h - 2);
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      // superfície fervente
      ctx.strokeStyle = `rgba(255,220,120,${0.7 + 0.2 * Math.sin(frames * 0.09)})`;
      ctx.lineWidth = 2.5;
      ctx.shadowColor = 'rgba(255,160,60,0.9)';
      ctx.shadowBlur = 10;
      ctx.beginPath();
      for (let x = 0; x <= lv.w; x += 14) {
        const yy = sy + Math.sin(frames * 0.05 + (lv.x + x) * 0.03) * 2.5;
        x === 0 ? ctx.moveTo(sx + x, yy) : ctx.lineTo(sx + x, yy);
      }
      ctx.stroke();
      ctx.shadowBlur = 0;
      // bolhas estourando
      for (let i = 0; i < 4; i++) {
        const bx = sx + ((frames * 0.8 + i * 83) % lv.w);
        const bph = (frames * 0.06 + i * 1.7) % 3.14;
        ctx.globalAlpha = Math.sin(bph) * 0.7;
        ctx.fillStyle = '#ffdc90';
        ctx.beginPath(); ctx.arc(bx, sy - 2 - Math.sin(bph) * 5, 2.2, 0, 7); ctx.fill();
      }
      ctx.restore();
      // brasas subindo
      if (Math.random() < 0.2) {
        Particles.spawn({
          x: lv.x + U.rand(0, lv.w), y: lv.y - 2,
          vx: U.rand(-0.3, 0.3), vy: U.rand(-1.4, -0.6),
          life: 55, size: 2, color: 'rgba(255,160,70,0.9)', type: 'wisp'
        });
      }
    }
  },

  drawDarkKatana(ctx, cam, frames) {
    const k = this.darkKatana;
    const sx = k.x - cam.x, sy = k.y - cam.y;
    if (sx < -160 || sx > 1120 || sy < -120 || sy > 660) return;

    // ── templo abandonado ──
    ctx.fillStyle = '#161221';
    // pilares rachados (o da direita, quebrado)
    ctx.fillRect(sx - 92, sy - 96, 14, 96);
    ctx.fillRect(sx + 74, sy - 58, 14, 58);
    // viga caída apoiada no pilar quebrado
    ctx.save();
    ctx.translate(sx + 46, sy - 56);
    ctx.rotate(0.32);
    ctx.fillRect(-8, -8, 96, 10);
    ctx.restore();
    // resto de telhado sobre o pilar inteiro
    ctx.beginPath();
    ctx.moveTo(sx - 112, sy - 96);
    ctx.lineTo(sx - 85, sy - 118);
    ctx.lineTo(sx - 52, sy - 96);
    ctx.closePath(); ctx.fill();
    // fissuras no piso do templo
    ctx.strokeStyle = 'rgba(90,80,130,0.3)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(sx - 60, sy - 2); ctx.lineTo(sx - 30, sy - 8); ctx.lineTo(sx - 6, sy - 3);
    ctx.stroke();

    // pedestal de pedra
    ctx.fillStyle = '#0d1220';
    ctx.fillRect(sx - 18, sy - 10, 36, 10);
    ctx.fillRect(sx - 12, sy - 18, 24, 8);

    // ── a serpente de olhos roxos ──
    if (!k.taken && !Game.serpentGone) {
      const ssx = sx - 48, ssy = sy - 4;
      ctx.save();
      // corpo ondulante
      ctx.strokeStyle = '#241832';
      ctx.lineCap = 'round';
      for (let i = 5; i >= 0; i--) {
        ctx.lineWidth = 3 + i * 1.1;
        ctx.beginPath();
        const x0 = ssx - i * 7, x1 = ssx - (i + 1) * 7;
        const y0 = ssy - 4 + Math.sin(frames * 0.06 + i * 1.2) * 2.5;
        const y1 = ssy - 4 + Math.sin(frames * 0.06 + (i + 1) * 1.2) * 2.5;
        ctx.moveTo(x0, y0); ctx.lineTo(x1, y1);
        ctx.stroke();
      }
      // cabeça erguida
      const hx = ssx + 4, hy = ssy - 12 + Math.sin(frames * 0.045) * 2;
      ctx.strokeStyle = '#241832';
      ctx.lineWidth = 4.4;
      ctx.beginPath(); ctx.moveTo(ssx, ssy - 4); ctx.quadraticCurveTo(ssx + 2, hy + 6, hx, hy); ctx.stroke();
      ctx.fillStyle = '#2e2040';
      ctx.beginPath(); ctx.ellipse(hx + 1, hy, 5, 3.4, 0.2, 0, 7); ctx.fill();
      // olhos roxos brilhantes
      ctx.globalCompositeOperation = 'lighter';
      ctx.shadowColor = '#b98fff'; ctx.shadowBlur = 7;
      ctx.fillStyle = '#c9a6ff';
      ctx.beginPath(); ctx.arc(hx + 3, hy - 1, 1.3, 0, 7); ctx.fill();
      ctx.beginPath(); ctx.arc(hx + 5.5, hy - 0.5, 1.1, 0, 7); ctx.fill();
      // língua bífida, de vez em quando
      if (frames % 110 < 10) {
        ctx.shadowBlur = 0;
        ctx.strokeStyle = '#e06a8a';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(hx + 6, hy + 1); ctx.lineTo(hx + 11, hy + 1);
        ctx.lineTo(hx + 13, hy - 1); ctx.moveTo(hx + 11, hy + 1); ctx.lineTo(hx + 13, hy + 3);
        ctx.stroke();
      }
      ctx.restore();
    }

    if (k.taken) return;
    // aura sombria
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const pulse = 0.6 + 0.4 * Math.sin(frames * 0.05);
    const g = ctx.createRadialGradient(sx, sy - 40, 2, sx, sy - 40, 52);
    g.addColorStop(0, `rgba(140,80,255,${0.30 * pulse})`);
    g.addColorStop(1, 'rgba(140,80,255,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(sx, sy - 40, 52, 0, 7); ctx.fill();
    ctx.restore();
    // lâmina cravada na pedra (invertida)
    ctx.save();
    ctx.translate(sx, sy - 18);
    ctx.rotate(-0.12 + Math.sin(frames * 0.02) * 0.02);
    ctx.shadowColor = 'rgba(160,100,255,0.9)';
    ctx.shadowBlur = 9;
    const bg2 = ctx.createLinearGradient(0, 0, 0, -52);
    bg2.addColorStop(0, '#1a1030');
    bg2.addColorStop(1, '#c9a6ff');
    ctx.strokeStyle = bg2;
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -52); ctx.stroke();
    // guarda e cabo
    ctx.shadowBlur = 0;
    ctx.strokeStyle = '#5a3a8a';
    ctx.lineWidth = 2.4;
    ctx.beginPath(); ctx.moveTo(-7, -52); ctx.lineTo(7, -52); ctx.stroke();
    ctx.strokeStyle = '#2a1a48';
    ctx.lineWidth = 3.4;
    ctx.beginPath(); ctx.moveTo(0, -52); ctx.lineTo(0, -66); ctx.stroke();
    ctx.restore();
    // fagulhas sombrias
    if (Math.random() < 0.12) {
      Particles.spawn({
        x: k.x + U.rand(-16, 16), y: k.y - 30 + U.rand(-20, 10),
        vy: -0.4, life: 55, size: 2.2,
        color: 'rgba(170,110,255,0.85)', type: 'wisp'
      });
    }
  },

  drawLantern(ctx, sx, sy, t) {
    ctx.fillStyle = '#161c2c';
    ctx.fillRect(sx - 3, sy - 26, 6, 26);          // pé
    ctx.fillRect(sx - 9, sy - 30, 18, 5);          // base da caixa
    ctx.fillRect(sx - 7, sy - 44, 14, 14);         // caixa
    ctx.beginPath();                                // telhadinho
    ctx.moveTo(sx - 12, sy - 44); ctx.lineTo(sx, sy - 54); ctx.lineTo(sx + 12, sy - 44);
    ctx.closePath(); ctx.fill();
    // chama
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const fl = 0.6 + 0.4 * Math.sin(t * 0.11);
    const g = ctx.createRadialGradient(sx, sy - 37, 1, sx, sy - 37, 16);
    g.addColorStop(0, `rgba(255,214,130,${0.8 * fl})`);
    g.addColorStop(1, 'rgba(255,214,130,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(sx, sy - 37, 16, 0, 7); ctx.fill();
    ctx.fillStyle = `rgba(255,240,200,${0.9 * fl})`;
    ctx.beginPath(); ctx.arc(sx, sy - 37, 2.4, 0, 7); ctx.fill();
    ctx.restore();
  },

  drawTorii(ctx, sx, sy, s, lit, frames) {
    ctx.save();
    ctx.translate(sx, sy);
    ctx.scale(s, s);
    ctx.fillStyle = lit ? '#33161c' : '#1c1016';
    // colunas
    ctx.fillRect(-34, -78, 9, 78);
    ctx.fillRect(25, -78, 9, 78);
    // viga superior dupla
    ctx.fillRect(-48, -92, 96, 8);
    ctx.fillRect(-40, -80, 80, 6);
    if (lit) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.shadowColor = 'rgba(255,208,110,0.9)';
      ctx.shadowBlur = 10;
      ctx.strokeStyle = 'rgba(255,214,130,0.85)';
      ctx.lineWidth = 1.6;
      ctx.strokeRect(-48, -92, 96, 8);
      ctx.strokeRect(-34, -78, 9, 78);
      ctx.strokeRect(25, -78, 9, 78);
      // shide (papéis pendurados)
      ctx.fillStyle = 'rgba(255,240,210,0.8)';
      for (let i = -1; i <= 1; i++) {
        const wob = Math.sin(frames * 0.05 + i) * 2;
        ctx.beginPath();
        ctx.moveTo(i * 22 - 3, -80);
        ctx.lineTo(i * 22 + wob, -68);
        ctx.lineTo(i * 22 + 3, -80);
        ctx.fill();
      }
      // coluna de luz suave
      const g = ctx.createLinearGradient(0, -78, 0, 0);
      g.addColorStop(0, 'rgba(255,220,150,0)');
      g.addColorStop(1, 'rgba(255,220,150,0.12)');
      ctx.fillStyle = g;
      ctx.fillRect(-25, -78, 50, 78);
      ctx.restore();
    }
    ctx.restore();
  },

  drawGate(ctx, cam, frames) {
    const g = this.gate;
    const sx = g.x - cam.x, sy = g.y - cam.y;
    if (sx < -160 || sx > 1100) return;
    // laje que sobe
    const rise = U.easeInOut(g.openT) * 240;
    if (g.openT < 1) {
      const slab = ctx.createLinearGradient(sx, sy - rise, sx, sy + g.h - rise);
      slab.addColorStop(0, '#232c44');
      slab.addColorStop(1, '#101828');
      ctx.fillStyle = slab;
      ctx.fillRect(sx, sy - rise, g.w, g.h);
      // selo entalhado
      ctx.strokeStyle = 'rgba(120,200,255,0.5)';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(sx + 8, sy - rise + 30, g.w - 16, g.h - 60);
    }
    // pilares
    ctx.fillStyle = '#1a2338';
    ctx.fillRect(sx - 26, sy - 40, 26, g.h + 300);
    ctx.fillRect(sx + g.w, sy - 40, 26, g.h + 300);
    ctx.fillRect(sx - 36, sy - 56, g.w + 72, 20);
    // soquetes de essência no pilar
    for (let i = 0; i < g.cost; i++) {
      const ex = sx - 13, ey = sy + 30 + i * 46;
      const filled = Game.essences > i;
      ctx.save();
      if (filled) {
        ctx.globalCompositeOperation = 'lighter';
        ctx.shadowColor = '#ffd678'; ctx.shadowBlur = 10;
        ctx.fillStyle = `rgba(255,220,140,${0.75 + 0.25 * Math.sin(frames * 0.1 + i)})`;
      } else {
        ctx.fillStyle = '#0a0f1c';
        ctx.strokeStyle = 'rgba(140,170,220,0.4)';
      }
      ctx.beginPath();
      ctx.moveTo(ex, ey - 8); ctx.lineTo(ex + 6, ey); ctx.lineTo(ex, ey + 8); ctx.lineTo(ex - 6, ey);
      ctx.closePath();
      filled ? ctx.fill() : (ctx.fill(), ctx.stroke());
      ctx.restore();
    }
  },

  drawPortal(ctx, cam, frames) {
    const p = this.portal;
    const sx = p.x - cam.x, sy = p.y - cam.y - 64;
    if (sx < -120 || sx > 1080) return;
    const active = Game.bossDefeated;
    const col = active ? '255,224,150' : '110,130,180';
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    // brilho interno
    const g = ctx.createRadialGradient(sx, sy, 4, sx, sy, 52);
    g.addColorStop(0, `rgba(${col},${active ? 0.4 : 0.12})`);
    g.addColorStop(1, `rgba(${col},0)`);
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(sx, sy, 52, 0, 7); ctx.fill();
    // anel rotativo
    ctx.strokeStyle = `rgba(${col},${active ? 0.9 : 0.35})`;
    ctx.lineWidth = 3;
    ctx.setLineDash([14, 9]);
    ctx.lineDashOffset = -frames * (active ? 0.8 : 0.2);
    ctx.beginPath(); ctx.arc(sx, sy, 46, 0, 7); ctx.stroke();
    ctx.setLineDash([]);
    if (active) {
      // orbes orbitando
      for (let i = 0; i < 3; i++) {
        const a = frames * 0.03 + i * 2.09;
        const ox = sx + Math.cos(a) * 46, oy = sy + Math.sin(a) * 46 * 0.5;
        ctx.fillStyle = 'rgba(255,240,200,0.9)';
        ctx.beginPath(); ctx.arc(ox, oy, 3, 0, 7); ctx.fill();
      }
    }
    ctx.restore();
  },

  drawPickups(ctx, cam, frames) {
    for (const pk of this.pickups) {
      if (pk.taken) continue;
      const sx = pk.x - cam.x, sy = pk.y - cam.y + Math.sin(frames * 0.05 + pk.x) * 4;
      if (sx < -30 || sx > 990) continue;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      if (pk.type === 'lotus') {
        const pulse = 0.7 + 0.3 * Math.sin(frames * 0.07 + pk.x);
        const g = ctx.createRadialGradient(sx, sy, 1, sx, sy, 22);
        g.addColorStop(0, `rgba(255,220,150,${0.5 * pulse})`);
        g.addColorStop(1, 'rgba(255,220,150,0)');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(sx, sy, 22, 0, 7); ctx.fill();
        ctx.fillStyle = `rgba(255,236,190,${0.9 * pulse})`;
        for (let i = 0; i < 5; i++) {
          const a = i / 5 * 6.283 - 1.57;
          ctx.beginPath();
          ctx.ellipse(sx + Math.cos(a) * 6, sy + Math.sin(a) * 6, 5.5, 2.6, a, 0, 7);
          ctx.fill();
        }
        ctx.fillStyle = '#fff6dd';
        ctx.beginPath(); ctx.arc(sx, sy, 3, 0, 7); ctx.fill();
      } else {
        const sq = Math.abs(Math.sin(frames * 0.04 + pk.x));
        const g = ctx.createRadialGradient(sx, sy, 1, sx, sy, 20);
        g.addColorStop(0, 'rgba(130,220,255,0.5)');
        g.addColorStop(1, 'rgba(130,220,255,0)');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(sx, sy, 20, 0, 7); ctx.fill();
        ctx.fillStyle = '#bfeaff';
        ctx.beginPath();
        ctx.moveTo(sx, sy - 10);
        ctx.lineTo(sx + 7 * sq + 1, sy);
        ctx.lineTo(sx, sy + 10);
        ctx.lineTo(sx - 7 * sq - 1, sy);
        ctx.closePath(); ctx.fill();
      }
      ctx.restore();
    }
  },

  drawAmulet(ctx, cam, frames) {
    const a = this.amulet;
    if (!a.spawned || a.taken) return;
    const sx = a.x - cam.x, sy = a.y - cam.y - 40 + Math.sin(frames * 0.05) * 6;
    if (sx < -40 || sx > 1000) return;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createRadialGradient(sx, sy, 2, sx, sy, 40);
    g.addColorStop(0, 'rgba(140,225,255,0.55)');
    g.addColorStop(1, 'rgba(140,225,255,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(sx, sy, 40, 0, 7); ctx.fill();
    // gota
    ctx.fillStyle = '#d8f4ff';
    ctx.beginPath();
    ctx.moveTo(sx, sy - 13);
    ctx.bezierCurveTo(sx + 10, sy - 2, sx + 8, sy + 9, sx, sy + 11);
    ctx.bezierCurveTo(sx - 8, sy + 9, sx - 10, sy - 2, sx, sy - 13);
    ctx.fill();
    // aro dourado
    ctx.strokeStyle = 'rgba(255,220,140,0.9)';
    ctx.lineWidth = 2.4;
    ctx.beginPath(); ctx.arc(sx, sy, 19 + Math.sin(frames * 0.08) * 2, 0, 7); ctx.stroke();
    ctx.restore();
    if (Math.random() < 0.15) {
      Particles.spawn({ x: a.x + U.rand(-14, 14), y: a.y - 40 + U.rand(-10, 10), vy: -0.5, life: 50, size: 2, color: 'rgba(160,230,255,0.9)', type: 'wisp' });
    }
  },

  drawWindAmulet(ctx, cam, frames) {
    const a = this.windAmulet;
    if (this.current !== 'floresta' || a.taken) return;
    const sx = a.x - cam.x, sy = a.y - cam.y - 40 + Math.sin(frames * 0.05) * 6;
    if (sx < -40 || sx > 1000) return;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    // 1. Brilho radial verde-menta
    const pulse = 0.7 + 0.3 * Math.sin(frames * 0.07);
    const g = ctx.createRadialGradient(sx, sy, 2, sx, sy, 40 * pulse);
    g.addColorStop(0, 'rgba(162,232,201,0.55)');
    g.addColorStop(1, 'rgba(162,232,201,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(sx, sy, 40 * pulse, 0, Math.PI * 2); ctx.fill();

    // 2. Desenho do amuleto
    ctx.fillStyle = '#10221a';
    ctx.beginPath();
    ctx.arc(sx, sy, 13, 0, Math.PI * 2);
    ctx.fill();

    // Aro brilhante ao redor
    ctx.strokeStyle = 'rgba(162,232,201,0.9)';
    ctx.lineWidth = 2.4;
    ctx.beginPath(); ctx.arc(sx, sy, 19 + Math.sin(frames * 0.08) * 2, 0, Math.PI * 2); ctx.stroke();

    // Símbolo do vento brilhante interno (espiral simples)
    ctx.strokeStyle = '#a2e8c9';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let theta = 0; theta < Math.PI * 3; theta += 0.1) {
      const r = 1.2 * theta;
      const tx = sx + Math.cos(theta + frames * 0.03) * r;
      const ty = sy + Math.sin(theta + frames * 0.03) * r;
      if (theta === 0) ctx.moveTo(tx, ty);
      else ctx.lineTo(tx, ty);
    }
    ctx.stroke();

    ctx.restore();
    
    // micropartículas
    if (Math.random() < 0.15) {
      Particles.spawn({
        x: a.x + U.rand(-14, 14), y: a.y - 40 + U.rand(-10, 10),
        vy: -0.5, life: 50, size: 2,
        color: 'rgba(162,232,201,0.9)', type: 'wisp'
      });
    }
  },

  // ── jatos termais (avisam com bolhas, depois explodem) ──
  drawJets(ctx, cam, frames) {
    for (const j of this.jets) {
      const sx = j.x - cam.x, sy = j.base - cam.y;
      if (sx < -60 || sx > 1020 || sy < -60 || sy > 640) continue;
      const phase = (frames + j.offset) % j.period;
      // respiradouro rochoso
      ctx.fillStyle = '#101a2c';
      ctx.beginPath();
      ctx.moveTo(sx - 16, sy); ctx.lineTo(sx - 6, sy - 12); ctx.lineTo(sx + 6, sy - 12); ctx.lineTo(sx + 16, sy);
      ctx.closePath(); ctx.fill();
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      if (phase < 60) {
        // aviso: bolhas aceleram
        const urgency = phase / 60;
        for (let i = 0; i < 3 + Math.floor(urgency * 4); i++) {
          const by = sy - 14 - ((frames * (2 + urgency * 3) + i * 37) % 60);
          ctx.globalAlpha = 0.5;
          ctx.strokeStyle = '#bfe8ff';
          ctx.lineWidth = 1.2;
          ctx.beginPath(); ctx.arc(sx + Math.sin(i * 2.6) * 6, by, 2 + (i % 3), 0, 7); ctx.stroke();
        }
      } else if (phase < 150) {
        // ERUPÇÃO: coluna térmica
        const k = (phase - 60) / 90;
        const rise = k < 0.15 ? k / 0.15 : 1;
        const top = sy - j.h * rise;
        const g = ctx.createLinearGradient(sx, sy, sx, top);
        g.addColorStop(0, 'rgba(235,250,255,0.85)');
        g.addColorStop(0.5, 'rgba(150,220,255,0.55)');
        g.addColorStop(1, 'rgba(150,220,255,0.05)');
        ctx.fillStyle = g;
        ctx.beginPath();
        for (let yy = 0; yy <= 1.001; yy += 0.125) {
          const w = 11 + Math.sin(frames * 0.3 + yy * 9) * 3 + yy * 4;
          const py = sy + (top - sy) * yy;
          yy === 0 ? ctx.moveTo(sx - w, py) : ctx.lineTo(sx - w, py);
        }
        for (let yy = 1; yy >= -0.001; yy -= 0.125) {
          const w = 11 + Math.sin(frames * 0.3 + yy * 9 + 2) * 3 + yy * 4;
          const py = sy + (top - sy) * yy;
          ctx.lineTo(sx + w, py);
        }
        ctx.closePath(); ctx.fill();
        // espuma no topo
        ctx.fillStyle = 'rgba(240,252,255,0.8)';
        for (let i = 0; i < 4; i++) {
          ctx.beginPath();
          ctx.arc(sx + Math.sin(frames * 0.4 + i * 1.7) * 12, top + 6, 3 - i * 0.4, 0, 7);
          ctx.fill();
        }
      }
      ctx.restore();
    }
  },

  // O volume colore atores e terreno antes da iluminação. A superfície é
  // composta depois, evitando apagar as fontes bioluminescentes.
  drawWaterMedium(ctx, cam, frames) {
    for (const w of this.waters) {
      const sx = w.x - cam.x, sy = w.y - cam.y;
      if (sx + w.w < -40 || sx > 1000) continue;
      const g = ctx.createLinearGradient(0, sy, 0, sy + w.h);
      g.addColorStop(0, 'rgba(70,160,220,0.34)');
      g.addColorStop(0.18, 'rgba(30,80,150,0.38)');
      g.addColorStop(0.55, 'rgba(12,36,90,0.46)');
      g.addColorStop(1, 'rgba(3,8,28,0.55)');
      ctx.fillStyle = g;
      ctx.fillRect(sx, sy + 3, w.w, w.h - 3);
      // feixes de luz penetrando a superfície
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 3; i++) {
        const bx = sx + 70 + i * 160 + Math.sin(frames * 0.01 + i * 2) * 18;
        const bg = ctx.createLinearGradient(0, sy, 0, sy + 260);
        bg.addColorStop(0, 'rgba(170,225,255,0.10)');
        bg.addColorStop(1, 'rgba(170,225,255,0)');
        ctx.fillStyle = bg;
        ctx.beginPath();
        ctx.moveTo(bx - 10, sy);
        ctx.lineTo(bx + 26, sy);
        ctx.lineTo(bx + 70, sy + 260);
        ctx.lineTo(bx - 40, sy + 260);
        ctx.closePath(); ctx.fill();
      }
      ctx.restore();
    }
  },

  drawWaterSurface(ctx, cam, frames) {
    for (const w of this.waters) {
      const sx = w.x - cam.x, sy = w.y - cam.y;
      if (sx + w.w < -40 || sx > 1000) continue;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = 'rgba(170,230,255,0.75)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let x = 0; x <= w.w; x += 16) {
        const yy = sy + Math.sin(frames * 0.06 + (w.x + x) * 0.025) * 3;
        x === 0 ? ctx.moveTo(sx + x, yy) : ctx.lineTo(sx + x, yy);
      }
      ctx.stroke();
      // cintilância
      for (let i = 0; i < 6; i++) {
        const px = sx + ((frames * 0.7 + i * 97) % w.w);
        const py = sy + 10 + (i * 37) % (w.h - 30);
        ctx.globalAlpha = 0.25 + 0.25 * Math.sin(frames * 0.1 + i * 2);
        ctx.fillStyle = '#bfe8ff';
        ctx.fillRect(px, py, 8, 1.5);
      }
      ctx.restore();
    }
  },

  // Compatibilidade com a prévia estática do mapa.
  drawWater(ctx, cam, frames) {
    this.drawWaterMedium(ctx, cam, frames);
    this.drawWaterSurface(ctx, cam, frames);
  },

  // Troncos de parallax ficam atrás dos atores e das plataformas.
  drawForegroundBack(ctx, cam, frames) {
    if (this.current !== 'floresta') return;
    ctx.save();

    const fyOffset = -(cam.y - 870) * 1.12;
    for (const fe of this.foreElements) {
      const sx = fe.x - cam.x * 1.12;
      if (sx < -150 || sx > 1110) continue;

      const edgeWeight = U.clamp(Math.abs(sx - 480) / 420, 0, 1);
      ctx.globalAlpha = 0.34 + edgeWeight * 0.24;
      const wind = Math.sin(frames * 0.012 + fe.phase) * 2;
      const lean = fe.lean + wind;
      const baseY = 570 + fyOffset;
      const topY = -40 + fyOffset;
      const w = fe.w;
      const trunkGradient = ctx.createLinearGradient(sx - w, 0, sx + w, 0);
      trunkGradient.addColorStop(0, '#050915');
      trunkGradient.addColorStop(0.58, '#09111e');
      trunkGradient.addColorStop(1, '#0d1a27');
      ctx.fillStyle = trunkGradient;

      if (fe.type === 'trunk') {
        ctx.beginPath();
        ctx.moveTo(sx - w * 0.56, baseY);
        ctx.bezierCurveTo(
          sx - w * 0.5 + lean * 0.12, baseY - 190,
          sx - w * 0.34 + lean * 0.65, topY + 190,
          sx - w * 0.23 + lean, topY
        );
        ctx.lineTo(sx + w * 0.23 + lean, topY);
        ctx.bezierCurveTo(
          sx + w * 0.34 + lean * 0.65, topY + 190,
          sx + w * 0.5 + lean * 0.12, baseY - 190,
          sx + w * 0.56, baseY
        );
        ctx.closePath();
        ctx.fill();

        // Rima atmosférica evita o aspecto de pilar preto chapado.
        ctx.strokeStyle = 'rgba(74,111,128,0.18)';
        ctx.lineWidth = 1.1;
        ctx.beginPath();
        ctx.moveTo(sx + w * 0.45, baseY);
        ctx.bezierCurveTo(
          sx + w * 0.34 + lean * 0.4, baseY - 180,
          sx + w * 0.25 + lean * 0.78, topY + 150,
          sx + w * 0.23 + lean, topY
        );
        ctx.stroke();

        // Galhos afilados, integrados ao tronco.
        const branchY = 165 + fyOffset + fe.s * 150;
        const side = fe.s < 0.5 ? -1 : 1;
        ctx.fillStyle = '#08101d';
        ctx.beginPath();
        ctx.moveTo(sx + lean * 0.45, branchY + 6);
        ctx.quadraticCurveTo(
          sx + side * 34 + lean * 0.5, branchY - 14,
          sx + side * (78 + fe.s * 22), branchY - 36
        );
        ctx.quadraticCurveTo(
          sx + side * 44 + lean * 0.5, branchY - 7,
          sx + lean * 0.45, branchY + 11
        );
        ctx.closePath();
        ctx.fill();

        // Nós quebram a verticalidade sem adicionar ruído fino.
        ctx.fillStyle = 'rgba(2,5,11,0.5)';
        ctx.beginPath();
        ctx.ellipse(sx + lean * 0.25 - side * 3, branchY + 26, w * 0.16, w * 0.28, 0.25, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // Galho pendente curvo e mais estreito que a versão anterior.
        ctx.beginPath();
        ctx.moveTo(sx + 84 + lean, topY);
        ctx.bezierCurveTo(sx + 48, 68 + fyOffset, sx - 30, 125 + fyOffset, sx - 118, 157 + fyOffset);
        ctx.lineTo(sx - 124, 143 + fyOffset);
        ctx.bezierCurveTo(sx - 42, 112 + fyOffset, sx + 28, 58 + fyOffset, sx + 62 + lean, topY);
        ctx.closePath();
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
    ctx.restore();
  },

  // Apenas folhas periféricas permanecem no pass realmente frontal.
  drawForeground(ctx, cam, frames, player) {
    if (this.current !== 'floresta') return;
    ctx.save();
    const fyOffset = -(cam.y - 870) * 1.12;
    const playerX = player ? player.x - cam.x : 480;

    for (const fe of this.foreElements) {
      const sx = fe.x - cam.x * 1.12;
      if (sx < -180 || sx > 1140 || !fe.foliage) continue;
      const focalX = fe.type === 'branch'
        ? sx - 32
        : sx + (fe.s < 0.5 ? -70 : 70);
      const safeFade = U.smoothstep
        ? U.smoothstep(U.clamp((Math.abs(focalX - playerX) - 70) / 100, 0, 1))
        : U.clamp((Math.abs(focalX - playerX) - 70) / 100, 0, 1);
      const sway = Math.sin(frames * 0.026 + fe.phase) * 2.2;
      ctx.save();
      // Folhas frontais pertencem à moldura; o centro permanece limpo para
      // navegação, telegráficos e leitura do personagem.
      ctx.beginPath();
      ctx.rect(0, 0, 150, 540);
      ctx.rect(810, 0, 150, 540);
      ctx.clip();
      ctx.translate(sx, fyOffset + sway);
      ctx.globalAlpha = (0.3 + 0.14 * Math.min(1, Math.abs(focalX - 480) / 360)) * safeFade;
      ctx.fillStyle = '#0a1422';
      ctx.fill(fe.foliage);
      ctx.strokeStyle = 'rgba(74,119,128,0.18)';
      ctx.lineWidth = 0.7;
      ctx.stroke(fe.foliage);
      ctx.restore();
    }
    ctx.restore();
  }
};
