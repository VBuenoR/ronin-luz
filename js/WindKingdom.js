'use strict';

/**
 * REINO DO VENTO — o terceiro reino.
 *
 * Um império suspenso acima das nuvens: ruínas de templos, pontes partidas e
 * castelos flutuantes presos por correntes antigas. O jogador escala das
 * ruínas baixas até o trono do Rei do Vento, corrompido pela tempestade.
 *
 * Módulo auto-instalável: registra o mapa, os inimigos e os sistemas por
 * wrapping (World/Player/Enemies), para conviver com edições paralelas.
 * Tempo em segundos. Sinais de ventania sempre telegrafados.
 */
const WindKingdom = {

  // ─────────────────────────── mapa 'vento' ───────────────────────────
  map: {
    solids: [
      { x: -60, y: -400, w: 60, h: 2900 },
      { x: 7400, y: -400, w: 60, h: 2900 },
      // A leitura segue o esboço: portal sob a fortaleza, templo a oeste e
      // o platô do Rei do Vento muito acima da montanha de ruínas.
      { x: 4050, y: 2180, w: 1700, h: 220, id: 'fortressBase' },
      { x: 4100, y: 1540, w: 170, h: 640, id: 'westPillar' },
      { x: 5520, y: 1510, w: 180, h: 670, id: 'eastPillar' },
      // Pavimentos largos formam a rota interna da fortaleza em ruinas.
      { x: 4310, y: 2020, w: 450, h: 64, id: 'lowerHallFloor' },
      { x: 4800, y: 1840, w: 520, h: 64, id: 'grandHallFloor' },
      { x: 4420, y: 1660, w: 490, h: 64, id: 'upperGalleryFloor' },
      { x: 4950, y: 1490, w: 410, h: 64, id: 'millHallFloor' },
      { x: 4050, y: 1840, w: 280, h: 64, id: 'westBrokenBalcony' },
      { x: 5320, y: 1690, w: 430, h: 64, id: 'eastBrokenBalcony' },
      { x: 4100, y: 1360, w: 1260, h: 110, id: 'millDeck' },
      { x: 5490, y: 1360, w: 410, h: 110, id: 'millDeckEast' },
      { x: 5590, y: 1460, w: 360, h: 70, id: 'brokenRampart' },
      { x: 3650, y: 620, w: 260, h: 70, id: 'crownStaging' },
      { x: 4250, y: 260, w: 1740, h: 120, id: 'arena' },
      { x: 7100, y: 300, w: 300, h: 90, id: 'farRightCrown' },

      // Templo do Amuleto: isolado na metade esquerda, preservado e sagrado.
      { x: 650, y: 1410, w: 650, h: 90, id: 'windTempleDeck' },
      { x: 800, y: 1500, w: 300, h: 370, id: 'windTempleBase' },

      // Tres ilhas de ligacao fecham rotas de ida e volta sem trivializar o dash.
      { x: 1050, y: 2290, w: 520, h: 110, id: 'lowerLeftIsland' },
      { x: 1170, y: 2070, w: 260, h: 65, id: 'templeLowerReturn' },
      { x: 1740, y: 1415, w: 270, h: 65, id: 'templeRuinsBridge' },
      { x: 2450, y: 1400, w: 320, h: 60, id: 'middleShard' },
      { x: 2670, y: 1850, w: 260, h: 65, id: 'lowerStepA' },
      { x: 2900, y: 1660, w: 230, h: 60, id: 'lowerStepB' },
      { x: 3100, y: 1510, w: 210, h: 55, id: 'lowerStepC' },
      { x: 3300, y: 2130, w: 260, h: 80, id: 'lowerStepD' },
      { x: 5990, y: 2190, w: 300, h: 70, id: 'lowIslandBridge' },
      { x: 6530, y: 2190, w: 260, h: 80, id: 'farLowerIsland' }
    ],
    // Traversable cloud platforms are injected dynamically by the weather state.
    oneways: [],
    waters: [], lavas: [], spikes: [], jets: [], torches: [],
    updrafts: [],
    checkpoints: [
      { x: 4280, y: 2180 },
      { x: 970, y: 1410 },
      { x: 4400, y: 260 }
    ],
    pickups: [
      { x: 3470, y: 2090, type: 'lotus', taken: false },
      { x: 2790, y: 1810, type: 'crystal', taken: false },
      { x: 4740, y: 1620, type: 'lotus', taken: false },
      { x: 5840, y: 1040, type: 'crystal', taken: false },
      { x: 6380, y: 820, type: 'lotus', taken: false },
      { x: 1120, y: 1370, type: 'crystal', taken: false },
      { x: 7140, y: 260, type: 'crystal', taken: false }
    ]
  },

  // The wind realm uses no artificial moving platforms.
  movers: [],

  // zonas de ventania: dir +1 sopra p/ leste, -1 p/ oeste
  windZones: [
    { x: 2450, y: 1320, w: 3550, h: 1020, dir: 1, force: 0.50 },
    { x: 3180, y: 430, w: 1050, h: 880, dir: -1, force: 0.66 },
    { x: 5550, y: 450, w: 1500, h: 820, dir: 1, force: 0.74 },
    { x: 500, y: 1250, w: 1050, h: 700, dir: -1, force: 0.58 }
  ],

  // decoração: bandeiras, correntes penduradas, estátuas, sinos
  flags: [
    { x: 4560, y: 260 }, { x: 5700, y: 260 }, { x: 980, y: 1410 }, { x: 7135, y: 300 }
  ],
  hangChains: [
    { x: 4460, y: 1450, len: 620 }, { x: 5320, y: 1480, len: 570 },
    { x: 5700, y: 380, len: 170 }, { x: 1140, y: 1490, len: 160 }, { x: 7210, y: 390, len: 180 }
  ],

  // estátuas guardiãs nos abrigos
  statues: [
    { x: 5270, y: 1490 },
    { x: 3650, y: 620 },
    { x: 5050, y: 260 }
  ],

  // sinos do templo
  bells: [
    { x: 970, y: 1350 },
    { x: 4940, y: 1300 }
  ],

  windAmulet: { x: 970, y: 1370, groundY: 1410, taken: false },
  returnPortal: { x: 4270, y: 2180 },

  // Artefatos e marcos da escalada. Eles ficam fora de map.solids para que
  // possam mudar de comportamento sem afetar a geometria permanente.
  compass: { x: 4690, y: 1306, groundY: 1360, taken: false },
  windmills: [
    { id: 'patio', x: 4900, y: 1360, r: 150, rotorHeight: 230, bladeLength: 118, activated: false }
  ],
  ghostPlatforms: [
    { id: 'mediaBaixa', x: 3860, y: 1160, w: 160, h: 18, phase: 0.7 },
    { id: 'media', x: 3370, y: 940, w: 180, h: 18, phase: 1.8 },
    { id: 'coroa', x: 3940, y: 600, w: 150, h: 18, phase: 2.8 },
    { id: 'lesteBaixa', x: 5780, y: 1080, w: 160, h: 18, phase: 3.5 },
    { id: 'lesteMedia', x: 6250, y: 860, w: 175, h: 18, phase: 4.6 },
    { id: 'lesteAlta', x: 6840, y: 600, w: 160, h: 18, phase: 5.4 }
  ],
  phoenixFeathers: [
    { id: 1, x: 2610, y: 1356, groundY: 1400, shrine: 'ruin', taken: false },
    { id: 2, x: 5700, y: 1316, groundY: 1360, shrine: 'fortress', taken: false },
    { id: 3, x: 1300, y: 2026, groundY: 2070, shrine: 'return', taken: false },
    { id: 4, x: 6660, y: 2146, groundY: 2190, shrine: 'low-island', taken: false },
    { id: 5, x: 7250, y: 256, groundY: 300, shrine: 'crown', taken: false }
  ],
  phoenixUnlocked: false,

  // ─────────────────────── estado da ventania ───────────────────────
  t: 0,
  phase: 'calm',      // calm → warn → gust
  phaseT: 0,
  cycleDir: 1,        // persistent direction chosen by the fortress mill
  calmDuration: 45,
  cloudOffset: 0,
  cloudVelocity: 0.055,
  millBoostT: 0,
  CALM_MIN: 30, CALM_MAX: 120, WARN: 4.5, GUST: 7,

  bLow: false, bMid: false, bHigh: false, bThrone: false, bFu: false,
  gustActive() { return this.phase === 'gust'; },
  warnActive() { return this.phase === 'warn'; },
  scheduleCalm() {
    // Keep the 30s-2min range, but make shorter waits substantially more common.
    const roll = Math.pow(Math.random(), 2.2);
    this.calmDuration = this.CALM_MIN + roll * (this.CALM_MAX - this.CALM_MIN);
  },
  resetWeather() {
    this.phase = 'calm';
    this.phaseT = 0;
    this.cloudVelocity = this.cycleDir * 0.055;
    this.millBoostT = 0;
    this.scheduleCalm();
  },
  startWarning() {
    this.phase = 'warn';
    this.phaseT = 0;
    const origin = this.cycleDir > 0 ? 'oeste' : 'leste';
    Hud.toast(`O ar silencia. Uma frente de nuvens se forma a ${origin}.`, '#dbeaf2');
  },
  windPower() { // 0..1 dentro da rajada, com ataque e decaimento suaves
    if (this.phase === 'gust') {
      const k = this.phaseT / this.GUST;
      return k < 0.15 ? k / 0.15 : (k > 0.85 ? (1 - k) / 0.15 : 1);
    }
    if (this.phase === 'warn') return 0.12 * (this.phaseT / this.WARN);
    return 0;
  },

  zoneAt(x, y) {
    for (const z of this.windZones) {
      if (x >= z.x && x <= z.x + z.w && y >= z.y && y <= z.y + z.h) return z;
    }
    return null;
  },

  /** abrigado se houver um sólido a barlavento (até 90px) na altura do torso */
  sheltered(p, dir) {
    const probe = dir > 0
      ? { x: p.x - 96, y: p.y - 30, w: 88, h: 26 }
      : { x: p.x + 8, y: p.y - 30, w: 88, h: 26 };
    for (const s of World.solids) {
      if (U.aabb(probe, s)) return true;
    }
    return false;
  },

  windName(dir) { return dir > 0 ? 'leste' : 'oeste'; },

  nearestMill(p) {
    let nearest = null;
    let best = Infinity;
    for (const mill of this.windmills) {
      const d = Math.hypot(p.x - mill.x, p.y - mill.y);
      if (d < mill.r && d < best) { nearest = mill; best = d; }
    }
    return nearest;
  },

  flipWind(mill) {
    this.cycleDir *= -1;
    mill.activated = true;
    mill.turnT = this.t;
    this.millBoostT = 10;

    // A mill command accelerates the current front or calls a controlled one.
    if (this.phase === 'calm') {
      this.phase = 'warn';
      this.phaseT = Math.max(0, this.WARN - 2.2);
    } else if (this.phase === 'warn') {
      this.phaseT = Math.max(this.phaseT, this.WARN - 1.6);
    } else {
      this.phaseT = Math.min(this.phaseT, this.GUST - 2.5);
    }
    this.cloudVelocity = this.cycleDir * Math.max(1.4, Math.abs(this.cloudVelocity || 0));
    Sfx.windRise();
    if (Game.cam) Game.cam.shake = Math.max(Game.cam.shake, 5);
    Particles.burst(mill.x, mill.y - (mill.rotorHeight || 52), 18, () => ({
      x: mill.x + U.rand(-26, 26), y: mill.y - (mill.rotorHeight || 52) + U.rand(-26, 26),
      vx: this.cycleDir * U.rand(2.8, 6.2), vy: U.rand(-1.4, 1.4),
      life: U.rand(28, 48), size: U.rand(1.5, 2.8),
      color: 'rgba(192,240,227,0.9)', type: 'spark', drag: 0.98
    }));
    Hud.toast(`O moinho fixa todas as correntes para ${this.windName(this.cycleDir)}.`, '#d7f0ed');
  },

  collectCompass(p) {
    const c = this.compass;
    if (c.taken || Math.abs(p.x - c.x) > 34 || Math.abs(p.y - c.y) > 76) return;
    c.taken = true;
    Sfx.pickup();
    Hud.showBanner('◉', 'Bussola das Correntes', 'Ela mostra a direcao da proxima ventania.');
    Particles.burst(c.x, c.y, 18, () => ({
      x: c.x + U.rand(-12, 12), y: c.y + U.rand(-12, 12),
      vx: U.rand(-1.6, 1.6), vy: U.rand(-2.2, -0.3),
      life: 46, size: 2.4, color: 'rgba(191,235,228,0.9)', type: 'wisp'
    }));
  },

  featherCount() { return this.phoenixFeathers.filter((feather) => feather.taken).length; },

  collectPhoenixFeathers(p) {
    for (const feather of this.phoenixFeathers) {
      if (feather.ghost && this.gustActive()) continue;
      if (feather.taken || Math.abs(p.x - feather.x) > 34 || Math.abs(p.y - feather.y) > 76) continue;
      feather.taken = true;
      Sfx.pickup();
      const count = this.featherCount();
      Particles.burst(feather.x, feather.y, 20, () => ({
        x: feather.x + U.rand(-12, 12), y: feather.y + U.rand(-10, 10),
        vx: U.rand(-1.8, 1.8), vy: U.rand(-2.7, -0.4),
        life: 56, size: U.rand(2.2, 3.4), color: 'rgba(255,222,145,0.9)', type: 'wisp'
      }));
      if (count < this.phoenixFeathers.length) {
        Hud.toast(`Pena da Fenix ${count}/5 - a luz das asas desperta.`, '#ffe3a0');
      } else {
        this.phoenixUnlocked = true;
        p.sta = p.maxSta;
        Hud.showBanner('鳥', 'Asas da Fenix', 'No ar, segure ESPACO para planar. As asas consomem vigor.');
      }
    }
  },

  canPlayerGlide(p) {
    return this.phoenixUnlocked && !!p && p.sta > 0 && !p.inWater;
  },

  spawnPhoenixTrail(p) {
    Particles.spawn({
      x: p.x - p.facing * U.rand(7, 16), y: p.y - U.rand(17, 31),
      vx: -p.facing * U.rand(0.5, 1.6), vy: U.rand(0.1, 0.8),
      life: U.rand(24, 38), size: U.rand(1.8, 3.2),
      color: 'rgba(255,220,142,0.72)', type: 'wisp'
    });
  },

  // ───────────────────────── instalação ─────────────────────────────
  spawnPlatformEnemies() {
    const structuralIds = new Set(['westPillar', 'eastPillar', 'windTempleBase', 'arena']);
    const fortressGuardianIds = new Set(['fortressBase', 'grandHallFloor', 'millDeckEast']);
    // A fortaleza recebe pisos extras de WindFortress após a primeira instalação.
    // Delimitar a construção evita que cada escada e passarela ganhe um inimigo.
    const isFortressInterior = (solid) => solid.x + solid.w > 4020
      && solid.x < 5960 && solid.y >= 800;
    const isThroneArchitecture = (solid) => solid.id.startsWith('throne');
    const protectedItems = [
      ...this.phoenixFeathers,
      this.compass,
      this.windAmulet,
      ...this.windmills.map((mill) => ({ x: mill.x, groundY: mill.y }))
    ];
    const guardianX = (surface) => {
      const items = protectedItems.filter((item) => item.groundY === surface.y
        && item.x >= surface.x && item.x <= surface.x + surface.w);
      if (!items.length) return surface.x + surface.w * 0.5;
      const left = surface.x + surface.w * 0.2;
      const right = surface.x + surface.w * 0.8;
      const clearance = (x) => Math.min(...items.map((item) => Math.abs(item.x - x)));
      return clearance(left) >= clearance(right) ? left : right;
    };
    const surfaces = this.map.solids
      .filter((solid) => solid.id && !structuralIds.has(solid.id)
        && !isThroneArchitecture(solid)
        && (!isFortressInterior(solid) || fortressGuardianIds.has(solid.id)))
      .map((solid) => {
        return {
          id: solid.id,
          x: guardianX(solid),
          y: solid.y - 40,
          min: solid.x + Math.min(42, solid.w * 0.2),
          max: solid.x + solid.w - Math.min(42, solid.w * 0.2),
          altitude: solid.y,
          fortressGuardian: fortressGuardianIds.has(solid.id)
        };
      });

    // Remove stale guardians when this script is reloaded during development.
    const desiredIds = new Set(surfaces.map((surface) => surface.id));
    desiredIds.add('arena:boss');
    for (let index = Enemies.list.length - 1; index >= 0; index--) {
      const enemy = Enemies.list[index];
      if (enemy.map === 'vento'
        && (!enemy.windPlatformId || !desiredIds.has(enemy.windPlatformId)
          || (fortressGuardianIds.has(enemy.windPlatformId) && enemy.tier !== 8))) {
        Enemies.list.splice(index, 1);
      }
    }

    surfaces.forEach((surface, index) => {
      if (Enemies.list.some((enemy) => enemy.map === 'vento' && enemy.windPlatformId === surface.id)) return;
      const tier = surface.fortressGuardian
        ? 8
        : (surface.altitude < 1000 || index % 5 === 4 ? 12 : 8);
      const enemy = new FieldEnemy({
        tier, x: surface.x, y: surface.y,
        min: surface.min, max: surface.max, map: 'vento'
      });
      enemy.windPlatformId = surface.id;
      Enemies.list.push(enemy);
    });

    if (!Enemies.list.some((enemy) => enemy.map === 'vento' && enemy.windPlatformId === 'arena:boss')) {
      const boss = new FieldEnemy({
        tier: 13, x: 5250, y: 260, min: 5250, max: 5250,
        isBoss: true, map: 'vento'
      });
      boss.windPlatformId = 'arena:boss';
      Enemies.list.push(boss);
    }
  },

  install() {
    // registra o mapa
    World.maps.vento = this.map;

    // tiers do Reino do Vento
    TIERS[8] = {
      name: 'Espírito do Vento', short: 'o Espírito do Vento', hp: 60, soco: 10, mare: 20,
      xp: 41, kanji: '鳥', element: 'vento', fly: true, dodge: 0.3,
      abilities: ['corte_aereo', 'rajada', 'esquiva', 'defend']
    };
    TIERS[12] = {
      name: 'Espírito da Tempestade', short: 'a Tempestade', hp: 85, soco: 12, mare: 26,
      xp: 53, kanji: '雷', element: 'vento', fly: true, storm: true, paraChance: 0.65,
      abilities: ['raio', 'explosao', 'charge_orb', 'paralisante']
    };
    TIERS[13] = {
      name: 'Rei do Vento', short: 'o Rei do Vento', hp: 260, soco: 14, mare: 24,
      xp: 150, kanji: '嵐', element: 'vento', boss: true, dodge: 0.22,
      abilities: ['vendaval', 'investida', 'tornado', 'prisao', 'suprema']
    };

    // One guardian per navigable surface; structural walls are excluded.
    this.spawnPlatformEnemies();

    // sons do vento
    Sfx.windRise = function () {
      this.noise({ dur: 1.5, vol: 0.16, fc: 500, fc2: 1600, type: 'bandpass', q: 0.6 });
    };
    Sfx.gust = function () {
      this.noise({ dur: 2.6, vol: 0.3, fc: 1400, fc2: 350, type: 'bandpass', q: 0.5 });
    };
  },

  /** teletransporte entre reinos (portal cinza ↔ portal de retorno) */
  travel(target) {
    if (Game.wipe) return;
    Sfx.gate();
    Game.startWipe(() => {
      const p = Game.player;
      World.load(target);
      if (target === 'vento') {
        this.resetWeather();
        p.x = this.returnPortal.x + 120; p.y = this.returnPortal.y;
        if (!this.bLow) { this.bLow = true; Hud.showBanner('風', 'Reino do Vento', 'Um império suspenso acima das nuvens.'); }
      } else {
        p.x = World.windPortal.x; p.y = World.windPortal.y;
        Hud.toast('As copas da floresta te recebem de volta.', '#cfe8d8');
      }
      p.vx = 0; p.vy = 0; p.dashT = 0; p.invuln = 60;
      Game.cam.x = U.clamp(p.x - 480, 0, World.width - 960);
      Game.cam.y = U.clamp(p.y - 330, 0, World.height - 540);
      Particles.clear();
    });
  },

  // ───────────────────── laço (via wrapper do Player) ─────────────────
  tickMovers() {
    this.t += 1 / 60;
    if (this.millBoostT > 0) this.millBoostT = Math.max(0, this.millBoostT - 1 / 60);
    // Frentes de vento raras: a calmaria dura de 30 s a 2 min.
    this.phaseT += 1 / 60;
    if (this.phase === 'calm' && this.phaseT >= this.calmDuration) {
      this.startWarning();
      Sfx.windRise();
    } else if (this.phase === 'warn' && this.phaseT >= this.WARN) {
      this.phase = 'gust'; this.phaseT = 0; Sfx.gust();
    } else if (this.phase === 'gust' && this.phaseT >= this.GUST) {
      this.phase = 'calm'; this.phaseT = 0; this.scheduleCalm();
    }

    // Cloud velocity eases between weather states instead of snapping.
    const targetCloudSpeed = this.phase === 'gust' ? 2.35
      : this.phase === 'warn' ? 0.72 : 0.11;
    this.cloudVelocity = U.lerp(this.cloudVelocity, this.cycleDir * targetCloudSpeed,
      this.phase === 'gust' ? 0.065 : 0.025);
    this.cloudOffset += this.cloudVelocity;

    // plataformas móveis
    const gustK = this.gustActive() ? Math.min(1, this.phaseT / 1.1) : 0;
    for (const m of this.movers) {
      m.px = m.x; m.py = m.y;
      if (m.gust) {
        // impulsionada pelo vento: desliza durante a rajada, retorna na calmaria
        m._k = U.lerp(m._k || 0, gustK, 0.06);
        m.x = m.bx + m.dx * m._k * this.cycleDir;
        m.y = m.by + m.dy * m._k;
      } else {
        const s = 0.5 * (1 + Math.sin((this.t / m.period) * Math.PI * 2));
        m.x = m.bx + m.dx * s;
        m.y = m.by + m.dy * s;
      }
    }
  },

  carryPlayer(p) {
    // Apply the platform delta before gravity and collision so descending
    // platforms keep their rider grounded instead of leaving them hovering.
    for (const m of this.movers) {
      const dx = m.x - m.px;
      const dy = m.y - m.py;
      const wasOnTop = p.onGround && Math.abs(p.y - m.py) < 3
        && p.x + p.w / 2 > m.px && p.x - p.w / 2 < m.px + m.w;
      if (!wasOnTop) continue;
      p.x += dx;
      p.y += dy;
    }
  },

  afterPlayer(p) {

    const mill = this.nearestMill(p);
    if (mill && Input.pressed('up')) this.flipWind(mill);
    this.collectCompass(p);
    this.collectPhoenixFeathers(p);

    // ventania: empurrão contínuo, salvo abrigo
    const power = this.windPower();
    if (this.gustActive() && power > 0) {
      const z = this.zoneAt(p.x, p.y);
      const dir = this.cycleDir;
      if (z && !this.sheltered(p, dir)) {
        const airborne = !p.onGround;
        const millBoost = this.millBoostT > 0 ? 1.28 : 1;
        p.vx += dir * z.force * power * millBoost * (airborne ? 1.32 : 0.72);
        // folhas/poeira carregadas — o sinal visual perto do jogador
        if (Game.frames % 4 === 0) {
          Particles.spawn({
            x: p.x - dir * U.rand(120, 420), y: p.y - U.rand(0, 90),
            vx: dir * U.rand(6, 10) * power, vy: U.rand(-0.6, 0.6),
            life: 40, size: U.rand(1.5, 2.6),
            color: Math.random() < 0.5 ? 'rgba(214,228,214,0.85)' : 'rgba(235,240,245,0.7)',
            type: 'spark', drag: 1
          });
        }
      }
    }

    // queda no vazio entre as nuvens
    if (p.y > 2380) {
      p.hp = Math.max(1, p.hp - 5);
      Game.respawn(false);
      Hud.toast('Os ventos te cospem de volta às ruínas.', '#cfe8d8');
      return;
    }

    // banners de altitude
    if (!this.bMid && p.y < 1500) { this.bMid = true; Hud.showBanner('橋', 'Pontes Partidas'); }
    if (!this.bHigh && p.y < 900 && p.x > 3000) { this.bHigh = true; Hud.showBanner('塔', 'Torres do Silêncio'); }
    if (!this.bThrone && p.x > 4200 && p.x < 6100 && p.y < 430) { this.bThrone = true; Hud.showBanner('嵐', 'Trono dos Céus'); }
    if (!this.bFu && p.x < 1400 && p.y < 1600) { this.bFu = true; Hud.showBanner('鈴', 'Santuário do Fū'); }

    // portal de retorno (↓)
    const rp = this.returnPortal;
    if (Math.abs(p.x - rp.x) < 46 && Math.abs(p.y - rp.y) < 90 && Input.pressed('downKey')) {
      this.travel('floresta');
    }

    // Fū — Amuleto do Vento (guardado pelo terreno, não por chefe)
    const fa = this.windAmulet;
    if (!fa.taken && Math.abs(p.x - fa.x) < 30 && Math.abs(p.y - fa.y) < 90) {
      fa.taken = true;
      Game.amulets.wind = true;
      Game.equipped = 'wind';
      Sfx.amulet();
      Hud.showBanner('風', 'Fū — Amuleto do Vento', 'Tornado, Salto Duplo e Dash Longo despertam. E alterna amuletos.');
      Particles.burst(fa.x, fa.y, 26, () => ({
        x: fa.x + U.rand(-16, 16), y: fa.y + U.rand(-16, 16),
        vx: U.rand(-2.4, 2.4), vy: U.rand(-2.6, 0),
        life: 60, size: 3, color: 'rgba(210,235,225,0.95)', type: 'wisp'
      }));
    }
  },

  // ─────────────────────────── utilidades ─────────────────────────────

  /** Hash determinístico baseado em posição para aleatoriedade procedural */
  _hash(x, y) {
    let h = (x * 374761393 + y * 668265263) | 0;
    h = (h ^ (h >> 13)) * 1274126177;
    h = h ^ (h >> 16);
    return (h & 0x7fffffff) / 0x7fffffff;
  },

  /** Hash de semente simples para arrays de dados procedurais */
  _seed(n) {
    let h = n * 2654435761;
    h = ((h >> 16) ^ h) * 45679;
    return (h & 0x7fffffff) / 0x7fffffff;
  },

  // ─────────────────────────── partículas internas ───────────────────
  // Sistema leve de partículas locais (folhas, poeira, penas)
  _particles: [],
  _particleCap: 30,

  _spawnLeaf(cam) {
    const power = this.windPower();
    const z = this.zoneAt(Game.player.x, Game.player.y);
    const dir = this.cycleDir;
    this._particles.push({
      type: 'leaf',
      x: cam.x + (dir > 0 ? -20 : 980),
      y: cam.y + 60 + this._seed(this.t * 100) * 420,
      vx: (1.5 + power * 6) * dir,
      vy: -0.3 + this._seed(this.t * 200) * 0.6,
      rot: this._seed(this.t * 300) * 6.28,
      rotV: 0.05 + power * 0.15,
      life: 180,
      size: 2 + this._seed(this.t * 400) * 2,
      color: this._seed(this.t * 500) < 0.5 ? '#b5a878' : '#c8b880'
    });
  },

  _spawnDust(cam) {
    // poeira perto de plataformas visíveis
    for (const s of World.solids) {
      const sx = s.x - cam.x, sy = s.y - cam.y;
      if (sx + s.w < 0 || sx > 960 || sy < -40 || sy > 560) continue;
      if (s.w < 80) continue;
      if (this._seed(s.x + this.t * 10) > 0.04) continue;
      this._particles.push({
        type: 'dust',
        x: s.x + this._seed(s.x + s.y + this.t * 77) * s.w,
        y: s.y - 2,
        vx: (this._seed(s.x * 3 + this.t * 50) - 0.5) * 0.4,
        vy: -0.3 - this._seed(s.x * 7 + this.t * 30) * 0.4,
        life: 80,
        size: 1 + this._seed(s.x * 11 + this.t * 20) * 1.2,
        color: 'rgba(255,255,255,0.6)'
      });
      break; // máx 1 por frame
    }
  },

  _spawnFeather(cam) {
    if (this._particles.filter(p => p.type === 'feather').length >= 1) return;
    if (this._seed(this.t * 13) > 0.005) return;
    const dir = this._seed(this.t * 77) > 0.5 ? 1 : -1;
    this._particles.push({
      type: 'feather',
      x: cam.x + (dir > 0 ? -30 : 990),
      y: cam.y + 100 + this._seed(this.t * 91) * 300,
      vx: dir * (0.6 + this._seed(this.t * 23) * 0.8),
      vy: -0.2 + this._seed(this.t * 37) * 0.2,
      rot: 0,
      rotV: 0.02,
      life: 300,
      size: 6,
      color: 'rgba(245,248,252,0.7)'
    });
  },

  _tickParticles(cam) {
    const power = this.windPower();
    const z = this.zoneAt(Game.player.x, Game.player.y);
    const dir = this.cycleDir;
    for (let i = this._particles.length - 1; i >= 0; i--) {
      const p = this._particles[i];
      p.life--;
      if (p.life <= 0) { this._particles.splice(i, 1); continue; }
      // vento afeta partículas
      if (power > 0) {
        p.vx += dir * power * 0.15;
      }
      p.x += p.vx;
      p.y += p.vy;
      if (p.rot !== undefined) p.rot += p.rotV;
      // folhas flutuam com ondulação
      if (p.type === 'leaf') {
        p.vy += Math.sin(p.life * 0.08) * 0.02;
      }
      // culling: fora da tela?
      const sx = p.x - cam.x, sy = p.y - cam.y;
      if (sx < -60 || sx > 1020 || sy < -60 || sy > 600) {
        this._particles.splice(i, 1);
      }
    }
  },

  // ─────────────────────────── desenho ───────────────────────────────

  /** Céu cinemático: gradiente dramático, sol, ilhas flutuantes, nuvens, correntes, raios de deus */
  drawSky(ctx, cam, frames) {
    const power = this.windPower();
    const t = this.t;

    // ── Camada 0: Gradiente do céu ──
    const g = ctx.createLinearGradient(0, 0, 0, 540);
    g.addColorStop(0, '#4a6b8a');
    g.addColorStop(0.35, '#7a9ab8');
    g.addColorStop(0.6, '#c8bda8');
    g.addColorStop(0.8, '#e8d5b8');
    g.addColorStop(1, '#f0ece6');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 960, 540);

    // ── Camada 1: Sol atmosférico ──
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    // Dispersão atmosférica externa (azulada)
    const sunOuter = ctx.createRadialGradient(220, 85, 40, 220, 85, 320);
    sunOuter.addColorStop(0, 'rgba(200,220,240,0.12)');
    sunOuter.addColorStop(1, 'rgba(200,220,240,0)');
    ctx.fillStyle = sunOuter;
    ctx.beginPath(); ctx.arc(220, 85, 320, 0, 7); ctx.fill();
    // Halo quente intermediário
    const sunMid = ctx.createRadialGradient(220, 85, 10, 220, 85, 180);
    sunMid.addColorStop(0, 'rgba(255,240,200,0.35)');
    sunMid.addColorStop(0.5, 'rgba(255,230,180,0.12)');
    sunMid.addColorStop(1, 'rgba(255,230,180,0)');
    ctx.fillStyle = sunMid;
    ctx.beginPath(); ctx.arc(220, 85, 180, 0, 7); ctx.fill();
    // Disco solar núcleo
    const sunCore = ctx.createRadialGradient(220, 85, 2, 220, 85, 50);
    sunCore.addColorStop(0, 'rgba(255,252,240,0.65)');
    sunCore.addColorStop(0.6, 'rgba(255,246,220,0.3)');
    sunCore.addColorStop(1, 'rgba(255,246,220,0)');
    ctx.fillStyle = sunCore;
    ctx.beginPath(); ctx.arc(220, 85, 50, 0, 7); ctx.fill();
    ctx.restore();

    // ── Camada 2: Ilhas distantes com arquitetura (parallax 0.06-0.08) ──
    const distIslands = [
      { ox: 200,  oy: 160, pax: 0.06, type: 'tower',  w: 90, bob: 0.7 },
      { ox: 600,  oy: 200, pax: 0.07, type: 'dome',   w: 120, bob: 1.1 },
      { ox: 1050, oy: 140, pax: 0.06, type: 'castle', w: 150, bob: 0.9 },
      { ox: 1500, oy: 230, pax: 0.08, type: 'arch',   w: 100, bob: 1.3 },
      { ox: 1900, oy: 180, pax: 0.07, type: 'tower',  w: 80, bob: 0.5 },
      { ox: 2500, oy: 210, pax: 0.06, type: 'dome',   w: 110, bob: 0.8 }
    ];
    for (const isl of distIslands) {
      const sx = ((isl.ox - cam.x * isl.pax) % 1800 + 1800) % 1800 - 200;
      const sy = isl.oy - cam.y * 0.04 + Math.sin(t * 0.3 + isl.bob) * 5;
      if (sx < -200 || sx > 1160) continue;
      const hw = isl.w / 2;

      // Base rochosa da ilha (polígono irregular)
      ctx.fillStyle = 'rgba(100,115,135,0.45)';
      ctx.beginPath();
      ctx.moveTo(sx - hw, sy);
      ctx.lineTo(sx - hw * 0.7, sy - 8);
      ctx.lineTo(sx + hw * 0.8, sy - 5);
      ctx.lineTo(sx + hw, sy + 3);
      ctx.lineTo(sx + hw * 0.5, sy + 30);
      ctx.lineTo(sx - hw * 0.3, sy + 35);
      ctx.lineTo(sx - hw * 0.6, sy + 22);
      ctx.closePath(); ctx.fill();

      // Arquitetura silhuetada sobre a ilha
      ctx.fillStyle = 'rgba(85,100,120,0.5)';
      if (isl.type === 'tower') {
        // Torre em ruínas: retângulo alto com ameias no topo
        const tw = 14, th = 50;
        ctx.fillRect(sx - tw / 2, sy - th, tw, th);
        // Ameias no topo (parcialmente quebradas)
        for (let ci = 0; ci < 3; ci++) {
          if (this._hash(isl.ox, ci) > 0.3) {
            ctx.fillRect(sx - tw / 2 + ci * 5 - 1, sy - th - 7, 4, 7);
          }
        }
        // Pedaço faltando
        ctx.clearRect(sx + 2, sy - 30, 6, 14);
        ctx.fillStyle = 'rgba(100,115,135,0.45)';
        ctx.fillRect(sx + 2, sy - 30, 6, 14);
        ctx.fillStyle = 'rgba(85,100,120,0.5)';
      } else if (isl.type === 'dome') {
        // Templo com cúpula (parcialmente desabada)
        const bw = 40, bh = 16;
        ctx.fillRect(sx - bw / 2, sy - bh, bw, bh);
        // Cúpula (arco)
        ctx.beginPath();
        ctx.arc(sx, sy - bh, bw / 2.5, Math.PI, 0);
        ctx.fill();
        // Parte desabada
        ctx.save();
        ctx.globalCompositeOperation = 'destination-out';
        ctx.fillStyle = 'rgba(0,0,0,1)';
        ctx.beginPath();
        ctx.moveTo(sx + 4, sy - bh - 10);
        ctx.lineTo(sx + bw / 2.5 + 2, sy - bh - 3);
        ctx.lineTo(sx + bw / 2.5 + 2, sy - bh + 3);
        ctx.lineTo(sx + 6, sy - bh + 2);
        ctx.closePath(); ctx.fill();
        ctx.restore();
        // Repreencher a ilha base que foi apagada pelo destination-out
        ctx.fillStyle = 'rgba(100,115,135,0.45)';
        ctx.beginPath();
        ctx.moveTo(sx - hw, sy);
        ctx.lineTo(sx + hw, sy + 3);
        ctx.lineTo(sx + hw * 0.5, sy + 30);
        ctx.lineTo(sx - hw * 0.3, sy + 35);
        ctx.lineTo(sx - hw * 0.6, sy + 22);
        ctx.closePath(); ctx.fill();
      } else if (isl.type === 'castle') {
        // Muralha com ameias (quebrada no meio)
        const ww = 80, wh = 18;
        ctx.fillRect(sx - ww / 2, sy - wh, ww * 0.4, wh);
        ctx.fillRect(sx + 6, sy - wh, ww * 0.4, wh);
        // Ameias
        for (let ci = 0; ci < 7; ci++) {
          if (ci === 3 || ci === 4) continue;
          ctx.fillRect(sx - ww / 2 + ci * 12, sy - wh - 6, 6, 6);
        }
      } else if (isl.type === 'arch') {
        // Arco-ponte entre dois pilares
        const pw = 8, ph = 36;
        ctx.fillRect(sx - 30, sy - ph, pw, ph);
        ctx.fillRect(sx + 22, sy - ph, pw, ph);
        ctx.beginPath();
        ctx.arc(sx, sy - ph, 30, Math.PI, 0);
        ctx.lineWidth = 4;
        ctx.strokeStyle = 'rgba(85,100,120,0.5)';
        ctx.stroke();
      }

      // Correntes penduradas (sob algumas ilhas)
      if (this._hash(isl.ox, 99) > 0.5) {
        ctx.strokeStyle = 'rgba(80,90,110,0.3)';
        ctx.lineWidth = 1;
        const cx2 = sx + (this._hash(isl.ox, 50) - 0.5) * hw;
        ctx.beginPath();
        ctx.moveTo(cx2, sy + 28);
        ctx.lineTo(cx2 + Math.sin(t * 0.5 + isl.ox) * 3, sy + 60);
        ctx.stroke();
      }
    }

    // ── Camada 3: Ilhas de média distância (parallax 0.15-0.22) ──
    const midIslands = [
      { ox: 350,  oy: 180, pax: 0.15, w: 140, h: 50 },
      { ox: 1100, oy: 220, pax: 0.18, w: 170, h: 60 },
      { ox: 1800, oy: 160, pax: 0.20, w: 130, h: 45 },
      { ox: 2600, oy: 250, pax: 0.22, w: 160, h: 55 }
    ];
    for (const isl of midIslands) {
      const sx = ((isl.ox - cam.x * isl.pax) % 2000 + 2000) % 2000 - 200;
      const sy = isl.oy - cam.y * 0.06 + Math.sin(t * 0.25 + isl.ox * 0.01) * 4;
      if (sx < -200 || sx > 1160) continue;
      const hw = isl.w / 2;

      // Base rochosa mais detalhada
      ctx.fillStyle = '#7a8a9a';
      ctx.beginPath();
      ctx.moveTo(sx - hw, sy + 4);
      ctx.lineTo(sx - hw * 0.8, sy - 6);
      ctx.lineTo(sx - hw * 0.2, sy - 10);
      ctx.lineTo(sx + hw * 0.3, sy - 8);
      ctx.lineTo(sx + hw * 0.9, sy - 3);
      ctx.lineTo(sx + hw, sy + 6);
      ctx.lineTo(sx + hw * 0.6, sy + isl.h * 0.7);
      ctx.lineTo(sx + hw * 0.2, sy + isl.h);
      ctx.lineTo(sx - hw * 0.4, sy + isl.h * 0.8);
      ctx.lineTo(sx - hw * 0.7, sy + isl.h * 0.5);
      ctx.closePath(); ctx.fill();

      // Sombra na parte inferior
      ctx.fillStyle = '#5a6a7a';
      ctx.beginPath();
      ctx.moveTo(sx - hw * 0.7, sy + isl.h * 0.3);
      ctx.lineTo(sx + hw * 0.8, sy + isl.h * 0.25);
      ctx.lineTo(sx + hw * 0.6, sy + isl.h * 0.7);
      ctx.lineTo(sx + hw * 0.2, sy + isl.h);
      ctx.lineTo(sx - hw * 0.4, sy + isl.h * 0.8);
      ctx.closePath(); ctx.fill();

      // Torre com janelas visíveis
      const tw = 16, tBaseX = sx - 4;
      ctx.fillStyle = '#7a8a9a';
      ctx.fillRect(tBaseX - tw / 2, sy - 44, tw, 44);
      // Bordas quebradas no topo
      ctx.fillStyle = '#5a6a7a';
      ctx.beginPath();
      ctx.moveTo(tBaseX - tw / 2, sy - 44);
      ctx.lineTo(tBaseX - tw / 2 + 4, sy - 48);
      ctx.lineTo(tBaseX + 2, sy - 44);
      ctx.lineTo(tBaseX + tw / 2 - 2, sy - 50);
      ctx.lineTo(tBaseX + tw / 2, sy - 44);
      ctx.closePath(); ctx.fill();

      // Janelas visíveis (aberturas escuras)
      ctx.fillStyle = 'rgba(35,45,60,0.8)';
      ctx.fillRect(tBaseX - 3, sy - 32, 6, 8);
      ctx.fillRect(tBaseX - 3, sy - 18, 6, 8);

      // Musgo nos cantos
      ctx.fillStyle = '#98a88a';
      ctx.beginPath();
      ctx.ellipse(sx - hw * 0.5, sy - 4, 10, 4, 0, 0, 7);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(sx + hw * 0.3, sy - 6, 8, 3, 0.3, 0, 7);
      ctx.fill();

      // Correntes conectando ilhas (entre algumas)
      if (this._hash(isl.ox, 77) > 0.6) {
        ctx.strokeStyle = 'rgba(70,80,100,0.35)';
        ctx.lineWidth = 1.5;
        const chainLen = 60 + this._hash(isl.ox, 88) * 40;
        ctx.beginPath();
        ctx.moveTo(sx + hw, sy + 2);
        ctx.quadraticCurveTo(sx + hw + chainLen * 0.5, sy + 30 + Math.sin(t * 0.4) * 4, sx + hw + chainLen, sy + 5);
        ctx.stroke();
      }
    }

    // ── Camada 4a: Nuvens cirrus altas (parallax 0.02) ──
    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.lineWidth = 1;
    const cloudFlow = this.cloudOffset;
    for (let i = 0; i < 6; i++) {
      const cx2 = ((i * 310 + cloudFlow * 0.24 - cam.x * 0.02) % 1400 + 1400) % 1400 - 200;
      const cy2 = 30 + (i * 47) % 80 - cam.y * 0.01;
      const len = 80 + (i * 31) % 60;
      ctx.beginPath();
      ctx.moveTo(cx2, cy2);
      ctx.quadraticCurveTo(cx2 + len * 0.5, cy2 - 3 + Math.sin(i * 2.1) * 4, cx2 + len, cy2 + 2);
      ctx.stroke();
    }
    ctx.restore();

    // ── Camada 4b: Nuvens cumulus médias (parallax 0.12) ──
    const gustStretch = 1 + power * 0.18;
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    for (let i = 0; i < 5; i++) {
      const cx2 = ((i * 331 + cloudFlow * 0.72 - cam.x * 0.12) % 1500 + 1500) % 1500 - 250;
      const cy2 = 130 + (i * 73) % 180 - cam.y * 0.04 + Math.sin(t * 0.17 + i * 1.9) * (1.2 + power * 2);
      if (cy2 < -60 || cy2 > 400) continue;
      const basew = 100 + (i * 47) % 80;
      // 3-4 elipses sobrepostas formam cada nuvem
      ctx.beginPath();
      ctx.ellipse(cx2, cy2, basew * 0.5 * gustStretch, 22, 0, 0, 7);
      ctx.ellipse(cx2 + basew * 0.25, cy2 - 12, basew * 0.35 * gustStretch, 16, 0, 0, 7);
      ctx.ellipse(cx2 - basew * 0.2, cy2 - 8, basew * 0.3 * gustStretch, 14, 0, 0, 7);
      if (i % 2 === 0) {
        ctx.ellipse(cx2 + basew * 0.1, cy2 - 18, basew * 0.2 * gustStretch, 10, 0, 0, 7);
      }
      ctx.fill();
    }

    // ── Camada 4c: Mar de nuvens no fundo (o vazio letal) ──
    const seaY = 2320 - cam.y;
    if (seaY < 620) {
      const sea = ctx.createLinearGradient(0, seaY - 30, 0, seaY + 250);
      sea.addColorStop(0, 'rgba(255,255,255,0)');
      sea.addColorStop(0.12, 'rgba(255,255,255,0.85)');
      sea.addColorStop(0.4, 'rgba(240,244,248,0.95)');
      sea.addColorStop(1, 'rgba(214,228,240,1)');
      ctx.fillStyle = sea;
      ctx.fillRect(0, Math.max(seaY - 30, 0), 960, 600);
      // Rolos de nuvem na superfície
      ctx.fillStyle = 'rgba(255,255,255,0.92)';
      for (let i = 0; i < 10; i++) {
        const sx = ((i * 143 + cloudFlow * 1.12) % 1200) - 120;
        const cw = 80 + (i * 37) % 60;
        ctx.beginPath();
        ctx.ellipse(sx, seaY + 6, cw, 16 + (i % 3) * 4, 0, 0, 7);
        ctx.fill();
      }
      // Segundo nível de rolos
      ctx.fillStyle = 'rgba(248,252,255,0.7)';
      for (let i = 0; i < 6; i++) {
        const sx = ((i * 227 + cloudFlow * 0.62) % 1100) - 80;
        ctx.beginPath();
        ctx.ellipse(sx, seaY - 14, 60, 10, 0, 0, 7);
        ctx.fill();
      }
    }

    // ── Camada 5: Correntes gigantes de fundo (parallax 0.08) ──
    const bgChains = [
      { ox: 900,  oy: -100, len: 600 },
      { ox: 2800, oy: -80,  len: 500 },
      { ox: 5200, oy: -120, len: 700 }
    ];
    ctx.strokeStyle = 'rgba(80,90,110,0.18)';
    ctx.lineWidth = 2;
    for (const c of bgChains) {
      const sx = ((c.ox - cam.x * 0.08) % 1600 + 1600) % 1600 - 100;
      const sy = c.oy - cam.y * 0.04;
      if (sx < -30 || sx > 990) continue;
      // Corrente vertical com balanço sutil
      for (let j = 0; j < c.len; j += 16) {
        const k = j / c.len;
        const sway = Math.sin(t * 0.6 + c.ox * 0.01 + j * 0.02) * (4 + power * 10) * k;
        ctx.beginPath();
        ctx.ellipse(sx + sway, sy + j, 3, 7, sway * 0.01, 0, 7);
        ctx.stroke();
      }
    }

  },

  /** Detalhes arquitetônicos: tijolos, colunas, janelas, ameias, hera */
  drawArchitecture(ctx, cam, frames) {
    const power = this.windPower();
    const t = this.t;

    // Pula as 2 primeiras paredes (limites do mapa)
    for (let si = 2; si < this.map.solids.length; si++) {
      const s = this.map.solids[si];
      const sx = s.x - cam.x, sy = s.y - cam.y;
      if (sx + s.w < -20 || sx > 980 || sy + s.h < -20 || sy > 560) continue;

      // ── Padrão de tijolos (faces laterais de sólidos altos) ──
      if (s.h > 50) {
        ctx.strokeStyle = 'rgba(140,138,130,0.25)';
        ctx.lineWidth = 0.7;
        const brickH = 16;
        for (let row = 0; row < s.h; row += brickH) {
          const by = sy + row;
          if (by < -20 || by > 560) continue;
          // Linhas horizontais de tijolo
          ctx.beginPath();
          ctx.moveTo(Math.max(sx, 0), by);
          ctx.lineTo(Math.min(sx + s.w, 960), by);
          ctx.stroke();
          // Juntas verticais alternadas
          const offset = (row / brickH) % 2 === 0 ? 0 : 20;
          for (let bx = offset; bx < s.w; bx += 40) {
            const jx = sx + bx;
            if (jx < 0 || jx > 960) continue;
            ctx.beginPath();
            ctx.moveTo(jx, by);
            ctx.lineTo(jx, by + Math.min(brickH, s.h - row));
            ctx.stroke();
          }
        }
      }

      // ── Colunas quebradas nos cantos de plataformas largas ──
      if (s.w > 200 && s.h < 120) {
        const colW = 8 + this._hash(s.x, s.y) * 4;
        const colH = 22 + this._hash(s.x + 1, s.y) * 18;
        ctx.fillStyle = 'rgba(160,158,148,0.6)';
        // Coluna esquerda
        ctx.fillRect(sx + 8, sy - colH, colW, colH);
        // Quebra diagonal no topo
        ctx.fillStyle = 'rgba(130,128,120,0.5)';
        ctx.beginPath();
        ctx.moveTo(sx + 8, sy - colH);
        ctx.lineTo(sx + 8 + colW, sy - colH + 6);
        ctx.lineTo(sx + 8 + colW, sy - colH);
        ctx.closePath(); ctx.fill();
        // Coluna direita (às vezes ausente para variedade)
        if (this._hash(s.x + 7, s.y) > 0.3) {
          const colH2 = 18 + this._hash(s.x + 2, s.y) * 14;
          ctx.fillStyle = 'rgba(160,158,148,0.6)';
          ctx.fillRect(sx + s.w - 8 - colW, sy - colH2, colW, colH2);
        }
      }

      // ── Janelas em arco (sólidos tipo torre, h > 300) ──
      if (s.h > 300) {
        ctx.fillStyle = 'rgba(30,35,45,0.6)';
        const winW = 10, winH = 20;
        for (let wi = 0; wi < 2; wi++) {
          const wy = sy + s.h * (0.33 + wi * 0.33) - winH / 2;
          const wx = sx + s.w / 2 - winW / 2;
          if (wy < -20 || wy > 560) continue;
          // Corpo da janela
          ctx.fillRect(wx, wy, winW, winH);
          // Arco no topo
          ctx.beginPath();
          ctx.arc(wx + winW / 2, wy, winW / 2, Math.PI, 0);
          ctx.fill();
        }
      }

      // ── Ameias/crenelações no topo de sólidos largos na banda média e alta ──
      if (s.w > 180 && s.h < 120 && s.y < 1500 && s.y > 400) {
        ctx.fillStyle = 'rgba(145,142,135,0.55)';
        const crenW = 8, crenH = 10, spacing = s.w / (Math.min(6, Math.floor(s.w / 40)) + 1);
        for (let ci = 1; ci <= Math.min(6, Math.floor(s.w / 40)); ci++) {
          const cx2 = sx + ci * spacing - crenW / 2;
          // Algumas ameias podem estar "quebradas" (menores)
          const broken = this._hash(s.x + ci * 11, s.y) > 0.7;
          const h = broken ? crenH * 0.5 : crenH;
          ctx.fillRect(cx2, sy - h, crenW, h);
        }
      }

      // ── Hera pendente nas bordas ──
      if (s.w > 100 || (s.h > 40 && s.w > 40)) {
        const ivyCount = Math.min(3, Math.floor(s.w / 100) + 1);
        ctx.strokeStyle = 'rgba(90,120,80,0.45)';
        ctx.lineWidth = 1.2;
        for (let iv = 0; iv < ivyCount; iv++) {
          const ivx = sx + 10 + this._hash(s.x + iv * 23, s.y + 5) * (s.w - 20);
          const ivLen = 16 + this._hash(s.x + iv * 31, s.y + 11) * 28;
          const sway = Math.sin(frames * 0.04 + s.x + iv * 50) * (3 + power * 8);
          ctx.beginPath();
          ctx.moveTo(ivx, sy + s.h);
          ctx.quadraticCurveTo(ivx + sway, sy + s.h + ivLen * 0.6, ivx + sway * 1.3, sy + s.h + ivLen);
          ctx.stroke();
          // Folhinhas
          ctx.fillStyle = 'rgba(85,115,75,0.4)';
          for (let lf = 0; lf < 3; lf++) {
            const ly = sy + s.h + ivLen * (0.3 + lf * 0.25);
            const lx = ivx + sway * (0.3 + lf * 0.25);
            ctx.beginPath();
            ctx.ellipse(lx + 2, ly, 2.5, 1.5, sway * 0.1, 0, 7);
            ctx.fill();
          }
          ctx.strokeStyle = 'rgba(90,120,80,0.45)';
        }
      }
    }

    // ── Hera em oneways ──
    for (const ow of this.map.oneways) {
      const sx = ow.x - cam.x, sy = ow.y - cam.y;
      if (sx + ow.w < -20 || sx > 980 || sy < -20 || sy > 560) continue;
      if (ow.w < 80) continue;
      ctx.strokeStyle = 'rgba(90,120,80,0.35)';
      ctx.lineWidth = 1;
      for (let iv = 0; iv < 2; iv++) {
        const ivx = sx + 5 + this._hash(ow.x + iv * 17, ow.y) * (ow.w - 10);
        const ivLen = 12 + this._hash(ow.x + iv * 29, ow.y + 3) * 18;
        const sway = Math.sin(frames * 0.04 + ow.x + iv * 37) * (2 + power * 6);
        ctx.beginPath();
        ctx.moveTo(ivx, sy + ow.h);
        ctx.quadraticCurveTo(ivx + sway, sy + ow.h + ivLen * 0.6, ivx + sway * 1.2, sy + ow.h + ivLen);
        ctx.stroke();
      }
    }

    // ── Trono da arena do Rei do Vento, no grande plato superior ──
    {
      const throneS = this.map.solids.find((solid) => solid.id === 'arena');
      if (throneS) {
        const tx = throneS.x + throneS.w / 2 - cam.x;
        const ty = throneS.y - cam.y;
        if (tx > -200 && tx < 1160) {
        // Pilares do trono
        const pillarH = 90, pillarW = 16;
        ctx.fillStyle = 'rgba(100,105,120,0.7)';
        // Pilar esquerdo
        ctx.fillRect(tx - 60 - pillarW / 2, ty - pillarH, pillarW, pillarH);
        // Pilar direito
        ctx.fillRect(tx + 60 - pillarW / 2, ty - pillarH, pillarW, pillarH);

        // Assento entre os pilares
        ctx.fillStyle = 'rgba(90,95,110,0.6)';
        ctx.fillRect(tx - 30, ty - 28, 60, 28);
        // Encosto
        ctx.fillRect(tx - 24, ty - 50, 48, 22);

        // Arco quebrado acima
        ctx.strokeStyle = 'rgba(110,115,130,0.6)';
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.arc(tx, ty - pillarH, 62, Math.PI + 0.2, -0.2);
        ctx.stroke();
        // Parte faltando do arco
        ctx.strokeStyle = 'rgba(110,115,130,0)'; // lacuna visual
        ctx.lineWidth = 8;
        ctx.beginPath();
        ctx.arc(tx, ty - pillarH, 62, -0.8, -0.2);
        ctx.stroke();

        // Correntes penduradas do arco (quebradas)
        ctx.strokeStyle = 'rgba(90,100,115,0.5)';
        ctx.lineWidth = 1.5;
        for (let ci = 0; ci < 3; ci++) {
          const chainX = tx - 30 + ci * 30;
          const chainLen = 20 + ci * 8;
          const sway = Math.sin(t * 1.0 + ci * 2) * (2 + power * 6);
          ctx.beginPath();
          ctx.moveTo(chainX, ty - pillarH - 10);
          for (let j = 0; j < chainLen; j += 8) {
            ctx.lineTo(chainX + sway * (j / chainLen), ty - pillarH - 10 + j);
          }
          ctx.stroke();
        }

        // Tonalidade azulada no trono
          ctx.fillStyle = 'rgba(100,120,160,0.08)';
          ctx.fillRect(tx - 70, ty - pillarH - 10, 140, pillarH + 10);
        }
      }
    }
  },

  drawFortressBackdrop(ctx, cam, frames) {
    const minX = 4020, maxX = 5780, minY = 1330, maxY = 2190;
    if (maxX - cam.x < -80 || minX - cam.x > 1040 || maxY - cam.y < -80 || minY - cam.y > 620) return;

    ctx.save();
    ctx.translate(-cam.x, -cam.y);

    // Massive rear wall with an irregular, collapsed silhouette.
    const wall = ctx.createLinearGradient(0, 1420, 0, 2180);
    wall.addColorStop(0, '#56616d');
    wall.addColorStop(0.42, '#424d59');
    wall.addColorStop(1, '#293440');
    ctx.fillStyle = wall;
    ctx.beginPath();
    ctx.moveTo(4050, 2180);
    ctx.lineTo(4050, 1640);
    ctx.lineTo(4100, 1640);
    ctx.lineTo(4100, 1518);
    ctx.lineTo(4160, 1532);
    ctx.lineTo(4200, 1480);
    ctx.lineTo(4260, 1520);
    ctx.lineTo(4260, 1580);
    ctx.lineTo(4390, 1580);
    ctx.lineTo(4430, 1510);
    ctx.lineTo(4500, 1545);
    ctx.lineTo(4500, 1435);
    ctx.lineTo(4570, 1468);
    ctx.lineTo(4630, 1418);
    ctx.lineTo(4700, 1460);
    ctx.lineTo(4700, 1510);
    ctx.lineTo(4850, 1510);
    ctx.lineTo(4900, 1450);
    ctx.lineTo(4970, 1482);
    ctx.lineTo(5040, 1415);
    ctx.lineTo(5120, 1470);
    ctx.lineTo(5120, 1530);
    ctx.lineTo(5300, 1530);
    ctx.lineTo(5350, 1468);
    ctx.lineTo(5410, 1510);
    ctx.lineTo(5460, 1450);
    ctx.lineTo(5530, 1492);
    ctx.lineTo(5620, 1470);
    ctx.lineTo(5620, 2180);
    ctx.closePath();
    ctx.fill();

    // Offset blocks make the wall feel assembled, repaired and displaced.
    ctx.strokeStyle = 'rgba(186,197,200,0.16)';
    ctx.lineWidth = 1;
    for (let row = 0; row < 23; row++) {
      const y = 1470 + row * 31;
      ctx.beginPath();
      ctx.moveTo(4070, y);
      ctx.lineTo(5610, y);
      ctx.stroke();
      const offset = row % 2 ? 31 : 0;
      for (let x = 4070 + offset; x < 5610; x += 62) {
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x, y + 31);
        ctx.stroke();
      }
    }

    // Dark rooms remain visible even where the player cannot enter.
    const rooms = [
      { x: 4290, y: 1865, w: 430, h: 145 },
      { x: 4805, y: 1865, w: 485, h: 145 },
      { x: 4310, y: 1688, w: 430, h: 142 },
      { x: 4800, y: 1688, w: 510, h: 142 },
      { x: 4435, y: 1505, w: 445, h: 145 },
      { x: 4960, y: 1510, w: 390, h: 140 },
      { x: 4670, y: 1378, w: 620, h: 102 }
    ];
    for (const room of rooms) {
      const roomShade = ctx.createLinearGradient(room.x, 0, room.x + room.w, 0);
      roomShade.addColorStop(0, 'rgba(18,26,35,0.88)');
      roomShade.addColorStop(0.55, 'rgba(31,41,50,0.78)');
      roomShade.addColorStop(1, 'rgba(14,22,31,0.9)');
      ctx.fillStyle = roomShade;
      ctx.fillRect(room.x, room.y, room.w, room.h);
      ctx.strokeStyle = 'rgba(165,176,180,0.28)';
      ctx.lineWidth = 3;
      ctx.strokeRect(room.x + 2, room.y + 2, room.w - 4, room.h - 4);
    }

    const drawArch = (cx, ground, width, height, barred) => {
      const radius = width * 0.5;
      const shoulder = ground - height + radius;
      ctx.fillStyle = 'rgba(10,17,25,0.9)';
      ctx.beginPath();
      ctx.moveTo(cx - radius, ground);
      ctx.lineTo(cx - radius, shoulder);
      ctx.arc(cx, shoulder, radius, Math.PI, 0);
      ctx.lineTo(cx + radius, ground);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = 'rgba(175,185,186,0.48)';
      ctx.lineWidth = 5;
      ctx.stroke();
      if (!barred) return;
      ctx.strokeStyle = 'rgba(112,88,63,0.7)';
      ctx.lineWidth = 3;
      for (let bar = -radius + 10; bar <= radius - 10; bar += 14) {
        const archHeight = Math.sqrt(Math.max(0, radius * radius - bar * bar));
        ctx.beginPath();
        ctx.moveTo(cx + bar, ground - 8);
        ctx.lineTo(cx + bar, shoulder - archHeight + 5);
        ctx.stroke();
      }
      ctx.beginPath();
      ctx.moveTo(cx - radius + 6, ground - 38);
      ctx.lineTo(cx + radius - 6, ground - 38);
      ctx.stroke();
    };

    drawArch(4445, 2180, 170, 228, false);
    drawArch(5020, 2020, 126, 152, true);
    drawArch(4580, 1840, 116, 145, false);
    drawArch(5160, 1840, 126, 150, true);
    drawArch(4660, 1660, 105, 135, false);
    drawArch(5230, 1660, 108, 138, true);

    // Narrow windows in both broken towers.
    drawArch(4185, 1800, 48, 105, true);
    drawArch(4185, 2070, 52, 112, true);
    drawArch(5530, 1740, 50, 112, true);
    drawArch(5530, 2010, 54, 118, true);

    // Stone supports divide the rooms into believable bays.
    const supports = [
      { x: 4278, y: 1840, w: 30, h: 340 }, { x: 4740, y: 1840, w: 34, h: 340 },
      { x: 5300, y: 1690, w: 34, h: 490 }, { x: 4400, y: 1490, w: 30, h: 350 },
      { x: 4910, y: 1490, w: 34, h: 350 }, { x: 5360, y: 1490, w: 30, h: 200 }
    ];
    for (const support of supports) {
      const pillar = ctx.createLinearGradient(support.x, 0, support.x + support.w, 0);
      pillar.addColorStop(0, '#323c47');
      pillar.addColorStop(0.5, '#6d7780');
      pillar.addColorStop(1, '#29333f');
      ctx.fillStyle = pillar;
      ctx.fillRect(support.x, support.y, support.w, support.h);
      ctx.fillStyle = 'rgba(174,183,181,0.42)';
      ctx.fillRect(support.x - 7, support.y, support.w + 14, 10);
      ctx.fillRect(support.x - 5, support.y + support.h - 9, support.w + 10, 9);
    }

    // Interrupted stairs tell how the floors were once connected.
    const stairs = [
      { x: 4325, y: 2156, dx: 45, dy: -17, steps: 8, broken: 5 },
      { x: 5260, y: 1826, dx: -42, dy: -17, steps: 8, broken: 3 },
      { x: 4450, y: 1646, dx: 48, dy: -18, steps: 9, broken: 6 }
    ];
    ctx.fillStyle = 'rgba(102,113,121,0.82)';
    for (const stair of stairs) {
      for (let step = 0; step < stair.steps; step++) {
        if (step === stair.broken || step === stair.broken + 1) continue;
        const x = stair.x + stair.dx * step;
        const y = stair.y + stair.dy * step;
        const width = Math.abs(stair.dx) + 12;
        ctx.fillRect(stair.dx > 0 ? x : x - width, y, width, 11);
        ctx.fillStyle = 'rgba(202,207,199,0.22)';
        ctx.fillRect(stair.dx > 0 ? x : x - width, y, width, 2);
        ctx.fillStyle = 'rgba(102,113,121,0.82)';
      }
    }

    // Old timber braces remain wedged between collapsed rooms.
    const beams = [
      [4340, 1960, 4680, 1888], [4820, 1770, 5280, 1712],
      [4480, 1598, 4870, 1518], [5010, 1470, 5310, 1400]
    ];
    ctx.strokeStyle = 'rgba(75,55,40,0.88)';
    ctx.lineWidth = 9;
    ctx.lineCap = 'square';
    for (const beam of beams) {
      ctx.beginPath();
      ctx.moveTo(beam[0], beam[1]);
      ctx.lineTo(beam[2], beam[3]);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(151,116,75,0.25)';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.strokeStyle = 'rgba(75,55,40,0.88)';
      ctx.lineWidth = 9;
    }
    ctx.lineCap = 'butt';

    // Central wind relief, worn almost flat by centuries of storms.
    const reliefX = 5100, reliefY = 1580;
    ctx.strokeStyle = 'rgba(177,187,187,0.38)';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(reliefX, reliefY, 48, 0, Math.PI * 2);
    ctx.stroke();
    ctx.lineWidth = 3;
    ctx.beginPath();
    for (let angle = 0; angle < Math.PI * 4.5; angle += 0.18) {
      const radius = 3 + angle * 2.5;
      const x = reliefX + Math.cos(angle) * radius;
      const y = reliefY + Math.sin(angle) * radius * 0.72;
      if (angle === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Long cracks link displaced masonry blocks across several floors.
    const cracks = [
      [[4230, 1600], [4210, 1680], [4242, 1750], [4200, 1830]],
      [[4870, 1480], [4840, 1540], [4885, 1600], [4860, 1670]],
      [[5480, 1760], [5440, 1830], [5470, 1900], [5435, 1980]],
      [[5180, 1960], [5140, 2020], [5170, 2090], [5120, 2160]]
    ];
    ctx.strokeStyle = 'rgba(15,23,31,0.48)';
    ctx.lineWidth = 3;
    for (const crack of cracks) {
      ctx.beginPath();
      ctx.moveTo(crack[0][0], crack[0][1]);
      for (let point = 1; point < crack.length; point++) ctx.lineTo(crack[point][0], crack[point][1]);
      ctx.stroke();
    }

    ctx.restore();
  },

  /** Bandeiras, correntes, moinho, estátuas, sinos, tábuas de ponte, sinais de vento */
  drawWindLandforms(ctx, cam, frames) {
    for (let index = 2; index < this.map.solids.length; index++) {
      const solid = this.map.solids[index];
      const sx = solid.x - cam.x;
      const sy = solid.y - cam.y;
      if (sx + solid.w < -40 || sx > 1000 || sy + solid.h < -40 || sy > 600) continue;

      const tall = solid.h > 150 && solid.w < 360;
      ctx.save();
      if (tall) {
        const visibleH = Math.min(solid.h, 900);
        const column = ctx.createLinearGradient(sx, sy, sx + solid.w, sy);
        column.addColorStop(0, '#3c4653');
        column.addColorStop(0.48, '#697582');
        column.addColorStop(1, '#303945');
        ctx.fillStyle = column;
        ctx.fillRect(sx, sy, solid.w, visibleH);

        ctx.fillStyle = 'rgba(205,214,214,0.18)';
        ctx.fillRect(sx + 5, sy, 4, visibleH);
        ctx.fillStyle = 'rgba(19,27,38,0.28)';
        ctx.fillRect(sx + solid.w - 8, sy, 5, visibleH);
        ctx.strokeStyle = 'rgba(202,211,211,0.22)';
        ctx.lineWidth = 1.2;
        const rows = Math.max(2, Math.min(7, Math.floor(visibleH / 110)));
        for (let row = 1; row <= rows; row++) {
          const y = sy + row * visibleH / (rows + 1);
          ctx.beginPath();
          ctx.moveTo(sx + 4, y);
          ctx.lineTo(sx + solid.w - 4, y + Math.sin(frames * 0.02 + row) * 1.5);
          ctx.stroke();
        }
      } else {
        const depth = Math.min(solid.h, 210);
        const bottom = sy + depth;
        const segments = Math.max(3, Math.min(16, Math.ceil(solid.w / 145)));
        const top = [];
        for (let point = 0; point <= segments; point++) {
          const x = sx + solid.w * point / segments;
          const y = sy + 3 + this._hash(solid.x + point * 37, solid.y) * 4;
          top.push({ x, y });
        }

        const stone = ctx.createLinearGradient(0, sy, 0, bottom);
        stone.addColorStop(0, '#89939a');
        stone.addColorStop(0.16, '#66727d');
        stone.addColorStop(0.72, '#39434f');
        stone.addColorStop(1, '#242d3a');
        ctx.fillStyle = stone;
        ctx.beginPath();
        ctx.moveTo(sx - 5, sy + 8);
        for (const point of top) ctx.lineTo(point.x, point.y);
        ctx.lineTo(sx + solid.w + 5, sy + 8);
        ctx.lineTo(sx + solid.w - 5, bottom - 8);
        for (let point = segments; point >= 0; point--) {
          const x = sx + solid.w * point / segments;
          const notch = 7 + this._hash(solid.x + point * 53, solid.y + 9) * 16;
          ctx.lineTo(x, bottom - notch);
        }
        ctx.closePath();
        ctx.fill();

        ctx.strokeStyle = 'rgba(220,226,218,0.72)';
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.moveTo(sx - 4, sy + 7);
        for (const point of top) ctx.lineTo(point.x, point.y);
        ctx.lineTo(sx + solid.w + 4, sy + 7);
        ctx.stroke();

        const facets = Math.max(2, Math.min(10, Math.floor(solid.w / 125)));
        for (let facet = 0; facet < facets; facet++) {
          const ratio = (facet + 0.5) / facets;
          const x = sx + solid.w * ratio;
          const y = sy + 28 + this._hash(solid.x + facet * 41, solid.y) * 35;
          const size = 11 + this._hash(solid.x, solid.y + facet * 29) * 14;
          ctx.fillStyle = facet % 2 ? 'rgba(182,190,189,0.14)' : 'rgba(14,22,31,0.18)';
          ctx.beginPath();
          ctx.moveTo(x, y - size * 0.7);
          ctx.lineTo(x + size, y);
          ctx.lineTo(x + size * 0.4, y + size);
          ctx.lineTo(x - size * 0.7, y + size * 0.45);
          ctx.closePath();
          ctx.fill();
        }
      }
      ctx.restore();
    }

  },

  drawDecor(ctx, cam, frames) {
    const power = this.windPower();
    const warn = this.warnActive();
    const z = this.zoneAt(Game.player.x, Game.player.y);
    const dir = this.cycleDir;
    const t = this.t;

    this.drawFortressRuin(ctx, cam, frames);

    // ── Correntes gigantes com elos individuais ──
    for (const c of this.hangChains) {
      const sx = c.x - cam.x, sy = c.y - cam.y;
      if (sx < -80 || sx > 1040) continue;
      const sway = Math.sin(t * 1.2 + c.x) * (3 + power * 20) * dir;

      // Placa de ancoragem no topo
      ctx.fillStyle = 'rgba(100,108,120,0.8)';
      ctx.fillRect(sx - 8, sy - 4, 16, 6);

      // Elos individuais da corrente
      ctx.strokeStyle = 'rgba(90,100,112,0.9)';
      ctx.lineWidth = 1.8;
      for (let i = 0; i < c.len; i += 12) {
        const k = i / c.len;
        const ex = sx + sway * k;
        const ey = sy + i;
        // Alterna orientação do elo
        const angle = (i / 12) % 2 === 0 ? sway * k * 0.015 : sway * k * 0.015 + 0.3;
        ctx.save();
        ctx.translate(ex, ey);
        ctx.rotate(angle);
        ctx.beginPath();
        ctx.ellipse(0, 0, 3.5, 5.5, 0, 0, 7);
        ctx.stroke();
        ctx.restore();
      }
    }

    // ── Bandeiras rasgadas com tecido ondulante ──
    for (const f of this.flags) {
      const sx = f.x - cam.x, sy = f.y - cam.y;
      if (sx < -80 || sx > 1040) continue;
      // Mastro
      ctx.fillStyle = '#4a5568';
      ctx.fillRect(sx - 2, sy - 78, 4, 78);
      // Ornamento dourado no topo
      ctx.fillStyle = '#c9a44a';
      ctx.beginPath(); ctx.arc(sx, sy - 78, 3.5, 0, 7); ctx.fill();

      const flap = (0.25 + power * 1.1);
      const fdir = power > 0 || warn ? dir : (Math.sin(t * 0.7 + f.x) > 0 ? 1 : -1) * 0.4;

      // Tecido como série de 5 pontos ondulantes
      ctx.fillStyle = 'rgba(196,180,140,0.92)';
      ctx.beginPath();
      ctx.moveTo(sx + 2 * fdir, sy - 76);
      const flagW = 44 * fdir * (0.6 + flap * 0.6);
      const pts = [];
      // Borda superior da bandeira
      for (let pi = 0; pi <= 4; pi++) {
        const frac = pi / 4;
        const px = sx + 2 * fdir + flagW * frac;
        const py = sy - 76 + 8 * frac + Math.sin(t * 6 + f.x + pi * 1.2) * 5 * flap * frac;
        pts.push({ x: px, y: py });
        if (pi === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      // Borda inferior da bandeira
      for (let pi = 4; pi >= 0; pi--) {
        const frac = pi / 4;
        const px = sx + 2 * fdir + flagW * frac * 0.85;
        const py = sy - 56 + 4 * frac + Math.sin(t * 5.5 + f.x + pi * 1.4) * 4 * flap * frac;
        ctx.lineTo(px, py);
      }
      ctx.closePath(); ctx.fill();

      // Borda rasgada no final da bandeira
      ctx.strokeStyle = 'rgba(170,156,120,0.6)';
      ctx.lineWidth = 0.8;
      const tipX = pts[4].x;
      const tipY = pts[4].y;
      for (let ri = 0; ri < 2; ri++) {
        ctx.beginPath();
        ctx.moveTo(tipX, tipY + ri * 8);
        ctx.lineTo(tipX + fdir * (5 + ri * 3), tipY + ri * 8 + 3 + Math.sin(t * 8 + ri) * 2 * flap);
        ctx.stroke();
      }
    }

    // ── Moinho monumental do pátio ──
    {
      const patioMill = this.windmills.find((mill) => mill.id === 'patio');
      if (patioMill) {
        const mx = patioMill.x - cam.x, my = patioMill.y - cam.y;
        if (mx > -180 && mx < 1140) {
        const towerH = patioMill.rotorHeight || 230;
        const bladeLength = patioMill.bladeLength || 118;
        // Torre trapezoidal com blocos de pedra visíveis
        ctx.fillStyle = '#8a94a2';
        ctx.beginPath();
        ctx.moveTo(mx - 54, my); ctx.lineTo(mx - 25, my - towerH); ctx.lineTo(mx + 25, my - towerH); ctx.lineTo(mx + 54, my);
        ctx.closePath(); ctx.fill();

        // Linhas de blocos de pedra na torre
        ctx.strokeStyle = 'rgba(120,128,140,0.35)';
        ctx.lineWidth = 0.6;
        for (let row = 0; row < towerH; row += 18) {
          const yy = my - row;
          const shrink = row / towerH * 29;
          ctx.beginPath();
          ctx.moveTo(mx - 54 + shrink, yy);
          ctx.lineTo(mx + 54 - shrink, yy);
          ctx.stroke();
        }

        // Porta em arco na base
        ctx.fillStyle = 'rgba(35,40,50,0.7)';
        const doorW = 19, doorH = 32;
        ctx.fillRect(mx - doorW / 2, my - doorH, doorW, doorH);
        ctx.beginPath();
        ctx.arc(mx, my - doorH, doorW / 2, Math.PI, 0);
        ctx.fill();

        // Janela perto do topo
        ctx.fillStyle = 'rgba(40,45,55,0.6)';
        ctx.fillRect(mx - 5, my - towerH + 39, 10, 14);
        ctx.beginPath();
        ctx.arc(mx, my - towerH + 39, 5, Math.PI, 0);
        ctx.fill();

        // ── Pás do moinho ──
        const ang = t * (0.65 + power * 5.4) * this.cycleDir;
        ctx.save();
        ctx.translate(mx, my - towerH);

        if (patioMill.activated) {
          ctx.save();
          ctx.globalCompositeOperation = 'lighter';
          const rotorGlow = ctx.createRadialGradient(0, 0, 8, 0, 0, bladeLength + 24);
          rotorGlow.addColorStop(0, 'rgba(173,242,223,0.28)');
          rotorGlow.addColorStop(1, 'rgba(173,242,223,0)');
          ctx.fillStyle = rotorGlow;
          ctx.beginPath(); ctx.arc(0, 0, bladeLength + 24, 0, 7); ctx.fill();
          ctx.restore();
        }

        // Engrenagem no ponto do pivô
        ctx.strokeStyle = 'rgba(130,120,90,0.8)';
        ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.arc(0, 0, 10, 0, 7); ctx.stroke();
        // Dentes da engrenagem
        ctx.lineWidth = 2;
        for (let d = 0; d < 12; d++) {
          const da = d * Math.PI / 6 + ang * 0.3;
          ctx.beginPath();
          ctx.moveTo(Math.cos(da) * 10, Math.sin(da) * 10);
          ctx.lineTo(Math.cos(da) * 14, Math.sin(da) * 14);
          ctx.stroke();
        }

        // Pás
        for (let b = 0; b < 4; b++) {
          const a = ang + b * Math.PI / 2;
          const broken = b === 2;
          const len = broken ? 40 : bladeLength;
          // Estrutura de madeira (traço)
          ctx.strokeStyle = 'rgba(70,78,92,0.95)';
          ctx.lineWidth = 4;
          ctx.beginPath(); ctx.moveTo(0, 0);
          ctx.lineTo(Math.cos(a) * len, Math.sin(a) * len);
          ctx.stroke();

          if (!broken) {
            // Tecido da pá (semi-transparente, ondula com o vento)
            ctx.save();
            ctx.rotate(a);
            ctx.fillStyle = 'rgba(196,186,150,0.75)';
            // Tecido ondulante
            ctx.beginPath();
            ctx.moveTo(24, -14);
            const ripple1 = Math.sin(t * 5 + b * 1.5) * 2 * (0.3 + power);
            const ripple2 = Math.sin(t * 5.5 + b * 1.5 + 1) * 2.5 * (0.3 + power);
            ctx.quadraticCurveTo(64, -16 + ripple1, bladeLength - 8, -13 + ripple2);
            ctx.lineTo(bladeLength - 8, 8 + ripple2 * 0.5);
            ctx.quadraticCurveTo(64, 10 + ripple1 * 0.5, 24, 7);
            ctx.closePath(); ctx.fill();
            // Armação visível
            ctx.strokeStyle = 'rgba(90,85,70,0.5)';
            ctx.lineWidth = 0.8;
            ctx.beginPath(); ctx.moveTo(64, -14); ctx.lineTo(64, 9); ctx.stroke();
            ctx.restore();
          } else {
            // Pá quebrada: tiras de tecido esvoaçantes
            ctx.save();
            ctx.rotate(a);
            ctx.strokeStyle = 'rgba(196,186,150,0.6)';
            ctx.lineWidth = 1.5;
            for (let strip = 0; strip < 3; strip++) {
              const sy2 = -6 + strip * 5;
              const stripLen = 14 + strip * 6;
              const flutter = Math.sin(t * 7 + strip * 2) * (4 + power * 10);
              ctx.beginPath();
              ctx.moveTo(20, sy2);
              ctx.quadraticCurveTo(20 + stripLen * 0.5, sy2 + flutter, 20 + stripLen, sy2 + flutter * 0.7);
              ctx.stroke();
            }
            ctx.restore();
          }
        }
          ctx.restore();
        }
      }
    }

    // ── Engrenagem antiga meio enterrada perto da torre ──
    {
      const gx = 4560 - cam.x, gy = 2166 - cam.y;
      if (gx > -60 && gx < 1020) {
        ctx.save();
        ctx.translate(gx, gy);
        ctx.rotate(t * (0.1 + power * 0.7));
        ctx.strokeStyle = 'rgba(148,132,92,0.8)';
        ctx.lineWidth = 5;
        ctx.beginPath(); ctx.arc(0, 0, 26, 0, 7); ctx.stroke();
        for (let d = 0; d < 8; d++) {
          const a = d * Math.PI / 4;
          ctx.beginPath();
          ctx.moveTo(Math.cos(a) * 26, Math.sin(a) * 26);
          ctx.lineTo(Math.cos(a) * 35, Math.sin(a) * 35);
          ctx.stroke();
        }
        ctx.restore();
      }
    }

    // ── Estátuas guardiãs (falcão guerreiro em pedra) ──
    for (const st of this.statues) {
      const sx = st.x - cam.x, sy = st.y - cam.y;
      if (sx < -80 || sx > 1040 || sy < -80 || sy > 600) continue;

      ctx.save();
      ctx.translate(sx + 21, sy); // centraliza na base do sólido-abrigo (42px de largura)

      // Pedestal
      ctx.fillStyle = 'rgba(140,138,130,0.85)';
      ctx.fillRect(-16, -8, 32, 8);
      // Inscrição erodida no pedestal
      ctx.fillStyle = 'rgba(100,98,90,0.4)';
      ctx.font = '6px serif';
      ctx.textAlign = 'center';
      ctx.fillText('風', 0, -2);

      // Corpo sentado de pernas cruzadas
      ctx.fillStyle = 'rgba(140,138,130,0.8)';
      ctx.beginPath();
      // Base do corpo (sentado)
      ctx.ellipse(0, -16, 11, 8, 0, 0, 7);
      ctx.fill();
      // Torso
      ctx.fillRect(-7, -32, 14, 18);

      // Asas (arcos estendidos para cima)
      ctx.strokeStyle = 'rgba(140,138,130,0.7)';
      ctx.lineWidth = 2.5;
      // Asa esquerda (intacta)
      ctx.beginPath();
      ctx.moveTo(-6, -28);
      ctx.quadraticCurveTo(-22, -48, -14, -58);
      ctx.stroke();
      // Asa direita (parcialmente quebrada)
      ctx.beginPath();
      ctx.moveTo(6, -28);
      ctx.quadraticCurveTo(18, -44, 12, -48);
      ctx.stroke();
      // Ponta quebrada (fragmento)
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(12, -48);
      ctx.lineTo(14, -50);
      ctx.stroke();

      // Cabeça de falcão
      ctx.fillStyle = 'rgba(140,138,130,0.85)';
      ctx.beginPath(); ctx.arc(0, -38, 5, 0, 7); ctx.fill();
      // Bico
      ctx.fillStyle = 'rgba(130,128,120,0.8)';
      ctx.beginPath();
      ctx.moveTo(4, -39); ctx.lineTo(10, -37); ctx.lineTo(4, -36);
      ctx.closePath(); ctx.fill();

      // Katana de pedra sobre o colo
      ctx.strokeStyle = 'rgba(150,148,140,0.7)';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(-14, -18);
      ctx.lineTo(16, -22);
      ctx.stroke();
      // Guarda da katana
      ctx.fillStyle = 'rgba(130,128,120,0.6)';
      ctx.fillRect(-2, -22, 4, 6);

      // Musgo nos cantos da estátua
      ctx.fillStyle = 'rgba(90,130,80,0.35)';
      ctx.beginPath(); ctx.ellipse(-10, -10, 5, 3, -0.2, 0, 7); ctx.fill();
      ctx.beginPath(); ctx.ellipse(8, -14, 4, 2.5, 0.3, 0, 7); ctx.fill();

      ctx.restore();
    }

    // ── Sinos do templo ──
    for (const bell of this.bells) {
      const bx = bell.x - cam.x, by = bell.y - cam.y;
      if (bx < -60 || bx > 1020 || by < -60 || by > 580) continue;

      ctx.save();
      ctx.translate(bx, by);

      // Suporte de pedra
      ctx.fillStyle = 'rgba(130,128,122,0.75)';
      ctx.fillRect(-4, -30, 8, 8);
      // Braço do suporte
      ctx.fillRect(-4, -26, 28, 4);

      // Sino (pendurado do braço)
      const bellSwing = Math.sin(t * 2.5 + bell.x) * (0.02 + power * 0.15);
      ctx.save();
      ctx.translate(22, -22);
      ctx.rotate(bellSwing);

      // Corda de sustentação
      ctx.strokeStyle = 'rgba(120,110,90,0.6)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(0, 6);
      ctx.stroke();

      // Corpo do sino (trapézio invertido com topo arredondado)
      ctx.fillStyle = 'rgba(140,150,120,0.85)';
      ctx.beginPath();
      ctx.moveTo(-6, 6);
      ctx.lineTo(-10, 28);
      ctx.lineTo(10, 28);
      ctx.lineTo(6, 6);
      ctx.closePath(); ctx.fill();
      // Topo arredondado
      ctx.beginPath();
      ctx.arc(0, 6, 6, Math.PI, 0);
      ctx.fill();
      // Borda inferior
      ctx.fillStyle = 'rgba(120,130,105,0.9)';
      ctx.fillRect(-11, 26, 22, 3);
      // Badalo
      ctx.fillStyle = 'rgba(110,105,90,0.8)';
      ctx.beginPath();
      ctx.arc(0, 25, 2.5, 0, 7);
      ctx.fill();

      // Ondas sonoras durante rajadas
      if (power > 0.3) {
        ctx.strokeStyle = `rgba(180,190,170,${(power - 0.3) * 0.5})`;
        ctx.lineWidth = 0.8;
        for (let wi = 0; wi < 3; wi++) {
          const wr = 14 + wi * 8 + Math.sin(t * 4 + wi) * 2;
          ctx.beginPath();
          ctx.arc(0, 20, wr, -0.8, 0.8);
          ctx.stroke();
        }
      }

      ctx.restore(); // bellSwing
      ctx.restore(); // translate
    }

    // ── Tábuas de ponte (visual sobre as rotas de ascensão) ──
    for (const ow of this.map.oneways) {
      if (ow.x < 2450 || ow.x > 6600) continue;
      const sx = ow.x - cam.x, sy = ow.y - cam.y;
      if (sx + ow.w < -20 || sx > 980 || sy < -20 || sy > 560) continue;

      // Tábuas de madeira
      ctx.fillStyle = 'rgba(140,120,90,0.6)';
      const plankW = 18, plankH = 6, gap = 4;
      for (let px = 0; px < ow.w - plankW; px += plankW + gap) {
        const plankSway = Math.sin(frames * 0.03 + ow.x + px * 0.1) * (0.5 + power * 1.5);
        ctx.save();
        ctx.translate(sx + px + plankW / 2, sy + ow.h / 2);
        ctx.rotate(plankSway * 0.015);
        ctx.fillRect(-plankW / 2, -plankH / 2, plankW, plankH);
        ctx.restore();
      }

      // Cordas laterais (catenária)
      ctx.strokeStyle = 'rgba(120,105,75,0.5)';
      ctx.lineWidth = 1;
      for (const side of [-6, ow.h + 4]) {
        ctx.beginPath();
        ctx.moveTo(sx - 4, sy + side - 8);
        ctx.quadraticCurveTo(sx + ow.w / 2, sy + side - 2, sx + ow.w + 4, sy + side - 8);
        ctx.stroke();
      }
    }

    // ── Florzinhas brancas junto da grama ──
    ctx.fillStyle = 'rgba(250,250,245,0.85)';
    for (const s of World.solids) {
      if (s.w < 120 || s.h < 40) continue;
      const sx = s.x - cam.x, sy = s.y - cam.y;
      if (sx + s.w < 0 || sx > 960 || sy < -20 || sy > 560) continue;
      for (let i = 0; i < Math.min(5, s.w / 90); i++) {
        const fx = sx + 30 + ((s.x + i * 137) % (s.w - 50));
        ctx.beginPath(); ctx.arc(fx, sy - 3, 1.7, 0, 7); ctx.fill();
      }
    }

    // ── Sinais de ventania (expandidos) ──
    if (power > 0 || warn) {
      const intensity = warn ? 0.35 : power;
      // Linhas de vento atravessando a tela
      ctx.save();
      ctx.strokeStyle = `rgba(255,255,255,${0.18 + 0.25 * intensity})`;
      ctx.lineWidth = 1.6;
      for (let i = 0; i < 10; i++) {
        const wy = ((i * 97 + frames * 0.6) % 560) - 10;
        const wxBase = ((i * 211 + frames * (24 + intensity * 48) * dir) % 1300 + 1300) % 1300 - 170;
        ctx.beginPath();
        ctx.moveTo(wxBase, wy);
        ctx.quadraticCurveTo(wxBase + 60 * dir, wy - 6, wxBase + 130 * dir, wy);
        ctx.stroke();
      }

      // Detritos durante rajadas
      if (power > 0.5) {
        ctx.fillStyle = `rgba(180,170,140,${(power - 0.5) * 0.6})`;
        for (let i = 0; i < 6; i++) {
          const dx = ((i * 193 + frames * (32 + power * 50) * dir) % 1200 + 1200) % 1200 - 120;
          const dy = ((i * 127 + frames * 0.8) % 560) - 10;
          ctx.save();
          ctx.translate(dx, dy);
          ctx.rotate(frames * 0.15 + i);
          ctx.fillRect(-1.5, -1, 3, 2);
          ctx.restore();
        }
      }

      // Setas de direção na borda da tela
      const ax = dir > 0 ? 906 : 54;
      ctx.fillStyle = `rgba(235,245,250,${0.5 + 0.5 * Math.sin(frames * 0.2)})`;
      ctx.font = '700 26px "Segoe UI", sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      for (let i = 0; i < 3; i++) {
        ctx.fillText(dir > 0 ? '»' : '«', ax - dir * i * 26, 120 + i * 24);
      }
      if (warn) {
        ctx.font = '700 13px "Segoe UI", sans-serif';
        ctx.fillStyle = 'rgba(235,245,250,0.9)';
        ctx.fillText('VENTANIA SE APROXIMANDO', 480, 66);
      }

      // Escurecimento sutil na borda oposta ao vento
      if (power > 0.2) {
        const vigAlpha = (power - 0.2) * 0.12;
        const vg = dir > 0
          ? ctx.createLinearGradient(0, 0, 120, 0)
          : ctx.createLinearGradient(960, 0, 840, 0);
        vg.addColorStop(0, `rgba(0,0,0,${vigAlpha})`);
        vg.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = vg;
        ctx.fillRect(dir > 0 ? 0 : 840, 0, 120, 540);
      }

      ctx.restore();
    }

    // ── Plataformas móveis (visuais melhorados) ──
    for (const m of this.movers) {
      const sx = m.x - cam.x, sy = m.y - cam.y;
      if (sx + m.w < -40 || sx > 1000 || sy < -40 || sy > 580) continue;
      // Corpo da plataforma
      ctx.fillStyle = '#7d8b9c';
      ctx.fillRect(sx, sy, m.w, m.h);
      // Brilho no topo
      ctx.fillStyle = 'rgba(228,236,242,0.85)';
      ctx.fillRect(sx, sy, m.w, 3);
      // Textura de linhas de pedra
      ctx.strokeStyle = 'rgba(110,120,135,0.3)';
      ctx.lineWidth = 0.5;
      for (let li = 0; li < m.w; li += 22) {
        ctx.beginPath();
        ctx.moveTo(sx + li, sy);
        ctx.lineTo(sx + li, sy + m.h);
        ctx.stroke();
      }

      // Corrente visual para o ponto de ancoragem (acima)
      ctx.strokeStyle = 'rgba(100,110,125,0.3)';
      ctx.lineWidth = 1;
      const anchorY = sy - 40;
      ctx.beginPath();
      ctx.moveTo(sx + m.w / 2, sy);
      ctx.quadraticCurveTo(sx + m.w / 2 + 3, anchorY + 20, sx + m.w / 2, anchorY);
      ctx.stroke();

      if (m.gust) {
        // Runas de vento + brilho durante ativação
        const glowAlpha = this.gustActive() ? 0.3 + 0.3 * Math.sin(frames * 0.15) : 0;
        if (glowAlpha > 0) {
          ctx.save();
          ctx.globalCompositeOperation = 'lighter';
          ctx.fillStyle = `rgba(160,200,230,${glowAlpha})`;
          ctx.fillRect(sx - 2, sy - 2, m.w + 4, m.h + 4);
          ctx.restore();
        }
        ctx.fillStyle = `rgba(180,220,240,${0.5 + 0.4 * Math.sin(frames * 0.15)})`;
        ctx.font = '10px serif';
        ctx.textAlign = 'center';
        ctx.fillText('風', sx + m.w / 2, sy + m.h + 10);
      }
    }

    this.drawWindTemple(ctx, cam, frames);
    this.drawGhostPlatforms(ctx, cam, frames);
    this.drawWindmills(ctx, cam, frames);
    this.drawCompassPickup(ctx, cam, frames);
    this.drawPhoenixFeathers(ctx, cam, frames);

    // portal de retorno + amuleto Fū
    this.drawReturnPortal(ctx, cam, frames);
    this.drawFu(ctx, cam, frames);
  },

  drawReturnPortal(ctx, cam, frames) {
    const p = this.returnPortal;
    const sx = p.x - cam.x, sy = p.y - cam.y - 52;
    if (sx < -80 || sx > 1040) return;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createRadialGradient(sx, sy, 3, sx, sy, 46);
    g.addColorStop(0, 'rgba(160,220,180,0.4)');
    g.addColorStop(1, 'rgba(160,220,180,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(sx, sy, 46, 0, 7); ctx.fill();
    ctx.strokeStyle = 'rgba(160,220,180,0.85)';
    ctx.lineWidth = 2.6;
    ctx.setLineDash([10, 7]);
    ctx.lineDashOffset = -frames * 0.7;
    ctx.beginPath(); ctx.arc(sx, sy, 38, 0, 7); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = 'rgba(160,220,180,0.95)';
    ctx.font = '700 20px serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('森', sx, sy + 1);
    ctx.restore();
  },

  drawFu(ctx, cam, frames) {
    const a = this.windAmulet;
    if (a.taken) return;
    const sx = a.x - cam.x, sy = a.y - cam.y + Math.sin(frames * 0.05) * 5;
    if (sx < -60 || sx > 1020) return;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createRadialGradient(sx, sy, 2, sx, sy, 38);
    g.addColorStop(0, 'rgba(205,240,225,0.55)');
    g.addColorStop(1, 'rgba(205,240,225,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(sx, sy, 38, 0, 7); ctx.fill();
    // espiral de vento
    ctx.strokeStyle = '#d9f2e6';
    ctx.lineWidth = 2.6;
    ctx.beginPath();
    for (let a2 = 0; a2 < Math.PI * 4; a2 += 0.2) {
      const r = 2 + a2 * 2.1;
      const px = sx + Math.cos(a2 + frames * 0.04) * r;
      const py = sy + Math.sin(a2 + frames * 0.04) * r * 0.8;
      a2 === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
    }
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,224,150,0.9)';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(sx, sy, 19 + Math.sin(frames * 0.08) * 2, 0, 7); ctx.stroke();
    ctx.restore();
  },

  drawFortressRuin(ctx, cam, frames) {
    const base = this.map.solids.find((solid) => solid.id === 'fortressBase');
    const deck = this.map.solids.find((solid) => solid.id === 'millDeck');
    const west = this.map.solids.find((solid) => solid.id === 'westPillar');
    const east = this.map.solids.find((solid) => solid.id === 'eastPillar');
    if (!base || !deck || !west || !east) return;
    if (base.x + base.w - cam.x < -100 || base.x - cam.x > 1060 ||
      base.y + base.h - cam.y < -100 || deck.y - cam.y > 640) return;

    const power = this.windPower();
    const dir = this.cycleDir;
    ctx.save();
    ctx.translate(-cam.x, -cam.y);

    // Load-bearing columns make every floor read as part of one structure.
    const supports = [
      { x: 4335, top: 2084, bottom: 2180, w: 34 },
      { x: 4710, top: 2084, bottom: 2180, w: 30 },
      { x: 4825, top: 1904, bottom: 2020, w: 34 },
      { x: 5265, top: 1904, bottom: 2020, w: 32 },
      { x: 4445, top: 1724, bottom: 1840, w: 34 },
      { x: 4860, top: 1724, bottom: 1840, w: 30 },
      { x: 4980, top: 1554, bottom: 1660, w: 34 },
      { x: 5315, top: 1554, bottom: 1660, w: 32 }
    ];
    for (const support of supports) {
      const face = ctx.createLinearGradient(support.x, 0, support.x + support.w, 0);
      face.addColorStop(0, '#303a45');
      face.addColorStop(0.45, '#77818a');
      face.addColorStop(1, '#29333e');
      ctx.fillStyle = face;
      ctx.fillRect(support.x, support.top, support.w, support.bottom - support.top);
      ctx.fillStyle = 'rgba(193,200,196,0.52)';
      ctx.fillRect(support.x - 7, support.top, support.w + 14, 9);
      ctx.fillStyle = 'rgba(31,40,49,0.5)';
      ctx.fillRect(support.x - 5, support.bottom - 8, support.w + 10, 8);
      ctx.strokeStyle = 'rgba(20,28,36,0.55)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(support.x + support.w * 0.7, support.top + 18);
      ctx.lineTo(support.x + support.w * 0.35, support.top + 42);
      ctx.lineTo(support.x + support.w * 0.62, support.top + 64);
      ctx.stroke();
    }

    // Stone arch rims remain after the doors and halls behind them collapsed.
    const arches = [
      { x: 4445, y: 2180, w: 170, h: 228 },
      { x: 5020, y: 2020, w: 126, h: 152 },
      { x: 4580, y: 1840, w: 116, h: 145 },
      { x: 5160, y: 1840, w: 126, h: 150 },
      { x: 4660, y: 1660, w: 105, h: 135 },
      { x: 5230, y: 1660, w: 108, h: 138 }
    ];
    ctx.strokeStyle = 'rgba(127,138,145,0.92)';
    ctx.lineWidth = 10;
    for (const arch of arches) {
      const radius = arch.w * 0.5;
      const shoulder = arch.y - arch.h + radius;
      ctx.beginPath();
      ctx.moveTo(arch.x - radius, arch.y);
      ctx.lineTo(arch.x - radius, shoulder);
      ctx.arc(arch.x, shoulder, radius, Math.PI, 0);
      ctx.lineTo(arch.x + radius, arch.y);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(208,211,200,0.24)';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.strokeStyle = 'rgba(127,138,145,0.92)';
      ctx.lineWidth = 10;
    }

    // Broken railings and balconies create narrow, interrupted passages.
    const railings = [
      { x: 4058, y: 1840, w: 264, gap: 2 },
      { x: 4810, y: 1840, w: 500, gap: 5 },
      { x: 5330, y: 1690, w: 405, gap: 3 },
      { x: 4430, y: 1660, w: 470, gap: 6 }
    ];
    ctx.strokeStyle = 'rgba(104,82,58,0.82)';
    ctx.lineWidth = 4;
    for (const rail of railings) {
      const count = Math.max(4, Math.floor(rail.w / 52));
      const intact = [];
      for (let post = 0; post <= count; post++) {
        if (post === rail.gap || post === rail.gap + 1) continue;
        const x = rail.x + rail.w * post / count;
        intact.push(x);
        ctx.beginPath();
        ctx.moveTo(x, rail.y - 38);
        ctx.lineTo(x, rail.y);
        ctx.stroke();
      }
      for (let post = 0; post < intact.length - 1; post++) {
        if (intact[post + 1] - intact[post] > rail.w / count * 1.5) continue;
        ctx.beginPath();
        ctx.moveTo(intact[post], rail.y - 36);
        ctx.lineTo(intact[post + 1], rail.y - 34 + (post % 2) * 3);
        ctx.stroke();
      }
    }

    // Crenellations along the mill deck, with sections lost to the collapse.
    for (let merlon = 0; merlon < 23; merlon++) {
      if (merlon === 4 || merlon === 5 || merlon === 14 || merlon === 17 || merlon === 18 || merlon === 19) continue;
      const x = deck.x + 24 + merlon * 76;
      const height = 20 + this._hash(merlon, 81) * 16;
      ctx.fillStyle = merlon % 3 === 0 ? '#69737b' : '#747e84';
      ctx.fillRect(x, deck.y - height, 30, height);
      ctx.fillStyle = 'rgba(211,214,204,0.22)';
      ctx.fillRect(x, deck.y - height, 30, 3);
    }

    // Interior chains have missing links and unequal lengths.
    const innerChains = [
      { x: 4610, y: 1470, len: 142, phase: 0.4 },
      { x: 5140, y: 1904, len: 108, phase: 1.8 },
      { x: 5380, y: 1754, len: 156, phase: 2.9 }
    ];
    ctx.strokeStyle = 'rgba(78,87,94,0.76)';
    ctx.lineWidth = 2;
    for (const chain of innerChains) {
      const sway = Math.sin(frames * 0.035 + chain.phase) * (2 + power * 10) * dir;
      for (let link = 0; link < chain.len; link += 12) {
        if (link > chain.len * 0.62 && link < chain.len * 0.72) continue;
        const ratio = link / chain.len;
        ctx.beginPath();
        ctx.ellipse(chain.x + sway * ratio, chain.y + link, 4, 6, ratio * sway * 0.02, 0, 7);
        ctx.stroke();
      }
    }

    // Rubble fields cover the otherwise empty base of the fortress.
    for (let rock = 0; rock < 28; rock++) {
      const x = base.x + 32 + this._hash(rock * 47, 311) * (base.w - 64);
      const width = 10 + this._hash(rock * 29, 313) * 30;
      const height = 7 + this._hash(rock * 53, 317) * 23;
      const y = base.y - height * 0.45;
      ctx.fillStyle = rock % 3 === 0 ? '#606b73' : '#48545f';
      ctx.beginPath();
      ctx.moveTo(x - width * 0.5, base.y);
      ctx.lineTo(x - width * 0.32, y);
      ctx.lineTo(x + width * 0.18, y - height * 0.35);
      ctx.lineTo(x + width * 0.5, base.y - 2);
      ctx.closePath();
      ctx.fill();
    }

    // Two damaged guardian statues preserve fragments of the old heraldry.
    const brokenStatues = [
      { x: 4640, y: 2020, mirror: 1 },
      { x: 5485, y: 1690, mirror: -1 }
    ];
    for (const statue of brokenStatues) {
      ctx.save();
      ctx.translate(statue.x, statue.y);
      ctx.scale(statue.mirror, 1);
      ctx.fillStyle = 'rgba(113,122,127,0.92)';
      ctx.fillRect(-22, -10, 44, 10);
      ctx.fillRect(-14, -43, 28, 33);
      ctx.beginPath();
      ctx.moveTo(-12, -38);
      ctx.lineTo(-28, -54);
      ctx.lineTo(-18, -61);
      ctx.lineTo(1, -44);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#313b45';
      ctx.beginPath();
      ctx.moveTo(4, -43);
      ctx.lineTo(15, -58);
      ctx.lineTo(14, -39);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    // Ivy and small plants reclaim cracks along the outer towers and floors.
    const vines = [
      { x: 4260, y: 1560, len: 360, phase: 0.2 },
      { x: 5450, y: 1530, len: 390, phase: 1.4 },
      { x: 4740, y: 2020, len: 128, phase: 2.1 },
      { x: 4890, y: 1660, len: 116, phase: 2.8 }
    ];
    for (const vine of vines) {
      ctx.strokeStyle = 'rgba(72,106,73,0.72)';
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(vine.x, vine.y);
      for (let length = 18; length <= vine.len; length += 18) {
        const bend = Math.sin(length * 0.055 + vine.phase + frames * 0.012) * (5 + power * 5);
        ctx.lineTo(vine.x + bend, vine.y + length);
      }
      ctx.stroke();
      ctx.fillStyle = 'rgba(83,122,81,0.72)';
      for (let length = 38; length < vine.len; length += 42) {
        const bend = Math.sin(length * 0.055 + vine.phase + frames * 0.012) * (5 + power * 5);
        ctx.beginPath();
        ctx.ellipse(vine.x + bend + (length % 84 ? 5 : -5), vine.y + length, 5, 2.6,
          length % 84 ? 0.45 : -0.45, 0, 7);
        ctx.fill();
      }
    }

    const plantBeds = [
      { x: 4360, y: 2020, count: 5 }, { x: 4860, y: 1840, count: 6 },
      { x: 4510, y: 1660, count: 5 }, { x: 5010, y: 1490, count: 4 }
    ];
    ctx.strokeStyle = 'rgba(99,135,89,0.72)';
    ctx.lineWidth = 1.5;
    for (const bed of plantBeds) {
      for (let plant = 0; plant < bed.count; plant++) {
        const x = bed.x + plant * 13;
        const sway = Math.sin(frames * 0.04 + plant) * (2 + power * 4) * dir;
        ctx.beginPath();
        ctx.moveTo(x, bed.y);
        ctx.quadraticCurveTo(x + sway * 0.35, bed.y - 10, x + sway, bed.y - 18 - plant % 3 * 3);
        ctx.stroke();
      }
    }

    this.drawFortressWalkableEdges(ctx, frames);

    ctx.restore();
  },

  drawFortressWalkableEdges(ctx, frames) {
    const floorIds = [
      'lowerHallFloor', 'grandHallFloor', 'upperGalleryFloor',
      'millHallFloor', 'westBrokenBalcony', 'eastBrokenBalcony'
    ];
    const pulse = 0.84 + Math.sin(frames * 0.045) * 0.08;

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = `rgba(162,232,201,${pulse})`;
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.shadowColor = 'rgba(162,232,201,0.8)';
    ctx.shadowBlur = 8;
    for (const id of floorIds) {
      const floor = this.map.solids.find((solid) => solid.id === id);
      if (!floor) continue;
      ctx.beginPath();
      ctx.moveTo(floor.x, floor.y);
      ctx.lineTo(floor.x + floor.w, floor.y);
      ctx.stroke();
    }
    ctx.restore();
  },

  drawWindTemple(ctx, cam, frames) {
    const deck = this.map.solids.find((solid) => solid.id === 'windTempleDeck');
    if (!deck) return;
    const sx = deck.x + deck.w * 0.5 - cam.x;
    const sy = deck.y - cam.y;
    if (sx < -180 || sx > 1140 || sy < -190 || sy > 600) return;

    const sway = Math.sin(frames * 0.035) * 2;
    ctx.save();
    ctx.fillStyle = 'rgba(93,108,127,0.94)';
    ctx.fillRect(sx - 72, sy - 72, 144, 72);
    ctx.fillStyle = 'rgba(50,60,75,0.78)';
    ctx.fillRect(sx - 16, sy - 38, 32, 38);
    ctx.beginPath();
    ctx.arc(sx, sy - 38, 16, Math.PI, 0);
    ctx.fill();

    ctx.fillStyle = 'rgba(78,93,114,0.98)';
    ctx.beginPath();
    ctx.moveTo(sx - 126, sy - 68);
    ctx.quadraticCurveTo(sx - 74, sy - 82, sx, sy - 136 + sway);
    ctx.quadraticCurveTo(sx + 74, sy - 82, sx + 126, sy - 68);
    ctx.lineTo(sx + 104, sy - 54);
    ctx.quadraticCurveTo(sx + 46, sy - 76, sx, sy - 112 + sway);
    ctx.quadraticCurveTo(sx - 46, sy - 76, sx - 104, sy - 54);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(198,218,230,0.78)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(sx - 126, sy - 68);
    ctx.quadraticCurveTo(sx, sy - 128 + sway, sx + 126, sy - 68);
    ctx.stroke();

    ctx.fillStyle = 'rgba(178,192,203,0.62)';
    ctx.fillRect(sx - 90, sy - 60, 10, 60);
    ctx.fillRect(sx + 80, sy - 60, 10, 60);
    ctx.strokeStyle = 'rgba(213,234,240,0.48)';
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.moveTo(sx - 118, sy - 47);
    ctx.quadraticCurveTo(sx - 74, sy - 52 + sway, sx - 36, sy - 45);
    ctx.moveTo(sx + 36, sy - 45);
    ctx.quadraticCurveTo(sx + 78, sy - 52 - sway, sx + 118, sy - 47);
    ctx.stroke();
    ctx.restore();
  },

  drawGhostPlatforms(ctx, cam, frames) {
    const active = !this.gustActive();
    const warn = this.warnActive();
    const dissolve = active ? 1 : U.clamp(1 - this.phaseT / 0.34, 0, 1);
    const reveal = active ? (warn ? 1 : 0.9) : dissolve * 0.72;
    for (const platform of this.ghostPlatforms) {
      const sx = platform.x - cam.x;
      const sy = platform.y - cam.y;
      if (sx + platform.w < -50 || sx > 1010 || sy < -50 || sy > 590) continue;
      if (reveal <= 0.01) continue;
      const bob = Math.sin(frames * 0.045 + platform.phase) * (active ? 1.8 : 3.2);
      const centerX = sx + platform.w * 0.5;
      const cloudY = sy + bob;
      const pulse = 0.5 + 0.5 * Math.sin(frames * 0.12 + platform.phase * 2.7);
      const glow = ctx.createRadialGradient(centerX, cloudY - 3, 2,
        centerX, cloudY - 3, platform.w * 0.67);
      glow.addColorStop(0, `rgba(174,237,244,${reveal * (0.22 + pulse * 0.08)})`);
      glow.addColorStop(0.55, `rgba(126,216,230,${reveal * 0.1})`);
      glow.addColorStop(1, 'rgba(201,244,248,0)');

      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.ellipse(centerX, cloudY - 3, platform.w * 0.68, 28 + pulse * 3, 0, 0, 7);
      ctx.fill();

      ctx.globalCompositeOperation = 'source-over';
      const underside = ctx.createLinearGradient(0, cloudY - 18, 0, cloudY + 16);
      underside.addColorStop(0, `rgba(213,246,248,${reveal * 0.92})`);
      underside.addColorStop(0.48, `rgba(145,211,224,${reveal * 0.88})`);
      underside.addColorStop(1, `rgba(59,126,151,${reveal * 0.76})`);
      ctx.fillStyle = underside;
      ctx.beginPath();
      ctx.ellipse(centerX, cloudY + 2, platform.w * 0.46, 11, 0, 0, 7);
      ctx.ellipse(sx + platform.w * 0.13, cloudY + 1, platform.w * 0.14, 7, -0.08, 0, 7);
      ctx.ellipse(sx + platform.w * 0.28, cloudY - 5, platform.w * 0.2, 13, 0.05, 0, 7);
      ctx.ellipse(sx + platform.w * 0.47, cloudY - 10, platform.w * 0.22, 17, -0.04, 0, 7);
      ctx.ellipse(sx + platform.w * 0.67, cloudY - 7, platform.w * 0.22, 14, 0.05, 0, 7);
      ctx.ellipse(sx + platform.w * 0.86, cloudY, platform.w * 0.15, 8, 0.08, 0, 7);
      ctx.fill();

      ctx.strokeStyle = `rgba(229,253,255,${reveal * (0.5 + pulse * 0.16)})`;
      ctx.lineWidth = 1.25;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(sx + platform.w * 0.08, cloudY - 1);
      ctx.bezierCurveTo(sx + platform.w * 0.25, cloudY - 16,
        sx + platform.w * 0.36, cloudY - 24, centerX, cloudY - 25);
      ctx.bezierCurveTo(sx + platform.w * 0.67, cloudY - 25,
        sx + platform.w * 0.76, cloudY - 12, sx + platform.w * 0.93, cloudY - 1);
      ctx.stroke();

      ctx.fillStyle = `rgba(90,165,187,${reveal * 0.28})`;
      for (let wisp = 0; wisp < 3; wisp++) {
        const wx = sx + platform.w * (0.28 + wisp * 0.22);
        const drift = Math.sin(frames * 0.055 + platform.phase + wisp) * 5;
        ctx.beginPath();
        ctx.ellipse(wx + drift, cloudY + 10 + wisp % 2, platform.w * 0.1, 2.5, 0, 0, 7);
        ctx.fill();
      }

      if (active) {
        ctx.globalCompositeOperation = 'lighter';
        ctx.strokeStyle = `rgba(224,252,255,${reveal * (0.52 + pulse * 0.34)})`;
        ctx.lineWidth = 1.35;
        ctx.shadowColor = 'rgba(124,230,246,0.72)';
        ctx.shadowBlur = 5;
        for (let arc = 0; arc < 3; arc++) {
          const ax = sx + 14 + arc * (platform.w - 28) / 2;
          ctx.beginPath();
          ctx.moveTo(ax, cloudY - 3 - (arc % 2) * 3);
          ctx.lineTo(ax + 7, cloudY - 10);
          ctx.lineTo(ax + 12, cloudY - 3);
          ctx.lineTo(ax + 19, cloudY - 9 + (arc % 2) * 2);
          ctx.stroke();
        }
      } else {
        ctx.globalCompositeOperation = 'lighter';
        ctx.strokeStyle = `rgba(226,250,255,${reveal * 0.7})`;
        ctx.lineWidth = 1.4;
        for (let streak = 0; streak < 4; streak++) {
          const fromX = sx + platform.w * (0.18 + streak * 0.2);
          ctx.beginPath();
          ctx.moveTo(fromX, cloudY);
          ctx.quadraticCurveTo(fromX + this.cycleDir * 28, cloudY - 7,
            fromX + this.cycleDir * 62, cloudY + 2);
          ctx.stroke();
        }
      }
      ctx.restore();
    }
  },

  drawWindmills(ctx, cam, frames) {
    const near = this.nearestMill(Game.player);
    for (const mill of this.windmills) {
      const sx = mill.x - cam.x;
      const sy = mill.y - cam.y;
      if (sx < -110 || sx > 1070 || sy < -180 || sy > 600) continue;
      const powered = mill.activated;
      const pulse = 0.45 + 0.35 * Math.sin(frames * 0.11 + mill.x);
      ctx.save();
      if (mill.id !== 'patio') {
        ctx.fillStyle = 'rgba(101,112,125,0.92)';
        ctx.beginPath();
        ctx.moveTo(sx - 18, sy); ctx.lineTo(sx - 10, sy - 48);
        ctx.lineTo(sx + 10, sy - 48); ctx.lineTo(sx + 18, sy); ctx.closePath();
        ctx.fill();
        ctx.fillStyle = 'rgba(42,48,59,0.75)';
        ctx.fillRect(sx - 5, sy - 20, 10, 20);
      }
      ctx.translate(sx, sy - (mill.id === 'patio' ? (mill.rotorHeight || 230) : 52));
      const angle = frames * (powered ? 0.1 : 0.018) * this.cycleDir;
      ctx.strokeStyle = powered ? 'rgba(204,238,229,0.95)' : 'rgba(122,130,135,0.9)';
      ctx.lineWidth = powered ? 2.3 : 1.7;
      for (let blade = 0; blade < 4; blade++) {
        const a = angle + blade * Math.PI / 2;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        const spokeLength = mill.id === 'patio' ? 15 : 25;
        ctx.lineTo(Math.cos(a) * spokeLength, Math.sin(a) * spokeLength);
        ctx.stroke();
      }
      ctx.fillStyle = powered ? '#d4f0e7' : '#8e979b';
      ctx.beginPath(); ctx.arc(0, 0, 6, 0, 7); ctx.fill();
      if (powered) {
        ctx.globalCompositeOperation = 'lighter';
        ctx.strokeStyle = `rgba(180,238,222,${pulse})`;
        ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.arc(0, 0, 16 + pulse * 4, 0, 7); ctx.stroke();
      }
      ctx.restore();

      if (near === mill) {
        const labelY = sy - (mill.id === 'patio' ? (mill.rotorHeight || 230) + 74 : 106);
        ctx.save();
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.font = '700 12px "Segoe UI", sans-serif';
        ctx.fillStyle = 'rgba(7,15,24,0.78)';
        ctx.fillRect(sx - 82, labelY - 12, 164, 24);
        ctx.strokeStyle = 'rgba(191,233,224,0.54)';
        ctx.strokeRect(sx - 82, labelY - 12, 164, 24);
        ctx.fillStyle = '#d9f2ea';
        ctx.fillText('↑ inverter as correntes', sx, labelY + 1);
        ctx.restore();
      }
    }
  },

  drawCompassDial(ctx, cx, cy, radius, frames, charged) {
    const pulse = 0.5 + 0.5 * Math.sin(frames * 0.13);
    ctx.save();
    ctx.translate(cx, cy);

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const halo = ctx.createRadialGradient(0, 0, 2, 0, 0, radius * 2.1);
    halo.addColorStop(0, `rgba(137,241,218,${0.2 + pulse * 0.16})`);
    halo.addColorStop(1, 'rgba(137,241,218,0)');
    ctx.fillStyle = halo;
    ctx.beginPath(); ctx.arc(0, 0, radius * 2.1, 0, 7); ctx.fill();
    ctx.restore();

    const glass = ctx.createRadialGradient(-radius * 0.28, -radius * 0.34, 1, 0, 0, radius);
    glass.addColorStop(0, 'rgba(225,255,248,0.92)');
    glass.addColorStop(0.32, 'rgba(88,151,154,0.72)');
    glass.addColorStop(1, 'rgba(13,31,42,0.96)');
    ctx.fillStyle = glass;
    ctx.beginPath(); ctx.arc(0, 0, radius, 0, 7); ctx.fill();
    ctx.strokeStyle = charged ? '#c4ffed' : '#c9ad69';
    ctx.lineWidth = radius * 0.16;
    ctx.beginPath(); ctx.arc(0, 0, radius * 1.04, 0, 7); ctx.stroke();
    ctx.strokeStyle = 'rgba(238,218,151,0.72)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(0, 0, radius * 0.78, 0, 7); ctx.stroke();

    ctx.save();
    ctx.rotate(frames * 0.004);
    for (let tick = 0; tick < 12; tick++) {
      const a = tick * Math.PI / 6;
      const inner = tick % 3 === 0 ? radius * 0.66 : radius * 0.76;
      ctx.strokeStyle = tick % 3 === 0 ? '#f5df9b' : 'rgba(205,241,233,0.66)';
      ctx.lineWidth = tick % 3 === 0 ? 1.4 : 0.8;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * inner, Math.sin(a) * inner);
      ctx.lineTo(Math.cos(a) * radius * 0.92, Math.sin(a) * radius * 0.92);
      ctx.stroke();
    }
    ctx.restore();

    ctx.save();
    ctx.rotate((this.cycleDir > 0 ? 0 : Math.PI) + Math.sin(frames * 0.035) * 0.025);
    ctx.fillStyle = '#d9fff4';
    ctx.beginPath();
    ctx.moveTo(radius * 0.82, 0); ctx.lineTo(-radius * 0.1, -radius * 0.24);
    ctx.lineTo(radius * 0.08, 0); ctx.lineTo(-radius * 0.1, radius * 0.24);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#c89a43';
    ctx.beginPath();
    ctx.moveTo(-radius * 0.7, 0); ctx.lineTo(radius * 0.04, -radius * 0.17);
    ctx.lineTo(radius * 0.04, radius * 0.17); ctx.closePath(); ctx.fill();
    ctx.restore();

    ctx.fillStyle = '#f8e4a4';
    ctx.beginPath(); ctx.arc(0, 0, radius * 0.13, 0, 7); ctx.fill();
    ctx.restore();
  },

  drawCompassPickup(ctx, cam, frames) {
    const c = this.compass;
    if (c.taken) return;
    const sx = c.x - cam.x;
    const sy = c.y - cam.y + Math.sin(frames * 0.07) * 3;
    const groundY = c.groundY - cam.y;
    if (sx < -60 || sx > 1020 || groundY < -80 || sy > 620) return;
    ctx.save();

    // Ancient pedestal beside the monumental mill.
    const pedestal = ctx.createLinearGradient(sx - 22, sy, sx + 22, groundY);
    pedestal.addColorStop(0, '#9aa49f');
    pedestal.addColorStop(1, '#3e4a51');
    ctx.fillStyle = pedestal;
    ctx.beginPath();
    ctx.moveTo(sx - 14, sy + 20); ctx.lineTo(sx + 14, sy + 20);
    ctx.lineTo(sx + 22, groundY); ctx.lineTo(sx - 22, groundY); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(221,235,226,0.72)';
    ctx.fillRect(sx - 19, sy + 19, 38, 3);
    ctx.strokeStyle = 'rgba(175,235,218,0.45)';
    ctx.beginPath(); ctx.arc(sx, sy + 37, 7, 0, 7); ctx.stroke();

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const beam = ctx.createLinearGradient(0, sy - 42, 0, groundY);
    beam.addColorStop(0, 'rgba(155,244,222,0)');
    beam.addColorStop(0.5, 'rgba(155,244,222,0.10)');
    beam.addColorStop(1, 'rgba(155,244,222,0)');
    ctx.fillStyle = beam;
    ctx.fillRect(sx - 16, sy - 42, 32, groundY - sy + 42);
    ctx.restore();

    this.drawCompassDial(ctx, sx, sy, 22, frames, this.warnActive());
    for (let mote = 0; mote < 5; mote++) {
      const a = frames * 0.018 + mote * Math.PI * 0.4;
      const r = 29 + (mote % 2) * 7;
      ctx.fillStyle = `rgba(181,247,229,${0.32 + (mote % 2) * 0.18})`;
      ctx.beginPath(); ctx.arc(sx + Math.cos(a) * r, sy + Math.sin(a * 1.3) * 17, 1.2, 0, 7); ctx.fill();
    }
    ctx.restore();
  },

  drawFeatherSanctuary(ctx, cam, frames, feather, platformBob, fade) {
    const sx = feather.x - cam.x;
    const groundY = feather.groundY - cam.y + platformBob;
    if (sx < -90 || sx > 1050 || groundY < -90 || groundY > 640) return;
    const lit = !feather.taken;
    const cloud = feather.shrine === 'cloud';
    const crown = feather.shrine === 'crown';
    const pulse = 0.5 + 0.5 * Math.sin(frames * 0.08 + feather.id);
    ctx.save();
    ctx.globalAlpha = fade;

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const shaft = ctx.createLinearGradient(0, groundY - 110, 0, groundY);
    shaft.addColorStop(0, 'rgba(255,224,144,0)');
    shaft.addColorStop(0.56, `rgba(255,218,125,${lit ? 0.08 + pulse * 0.05 : 0.015})`);
    shaft.addColorStop(1, 'rgba(255,218,125,0)');
    ctx.fillStyle = shaft;
    ctx.fillRect(sx - 30, groundY - 110, 60, 110);
    ctx.restore();

    const stone = cloud ? 'rgba(165,204,210,0.82)' : crown ? '#8d846c' : '#747d79';
    ctx.fillStyle = stone;
    ctx.beginPath(); ctx.ellipse(sx, groundY - 3, 39, 9, 0, 0, 7); ctx.fill();
    ctx.fillStyle = cloud ? 'rgba(77,112,124,0.88)' : '#3e4748';
    ctx.beginPath(); ctx.ellipse(sx, groundY + 2, 32, 7, 0, 0, 7); ctx.fill();
    ctx.fillStyle = stone;
    ctx.fillRect(sx - 27, groundY - 10, 54, 7);

    // Broken shrine arch frames the collectible without hiding the route.
    ctx.fillStyle = cloud ? 'rgba(184,221,225,0.72)' : 'rgba(127,130,119,0.94)';
    ctx.fillRect(sx - 33, groundY - 57, 7, 48);
    ctx.fillRect(sx + 26, groundY - 57, 7, 48);
    ctx.fillRect(sx - 38, groundY - 59, 76, 7);
    ctx.fillStyle = crown ? '#b69a55' : 'rgba(202,213,205,0.55)';
    ctx.fillRect(sx - 43, groundY - 65, 86, 5);
    ctx.fillRect(sx - 31, groundY - 71, 62, 4);

    ctx.strokeStyle = lit ? `rgba(255,224,151,${0.34 + pulse * 0.24})` : 'rgba(170,172,160,0.18)';
    ctx.lineWidth = 1.3;
    ctx.beginPath(); ctx.arc(sx, groundY - 43, 23 + pulse * 1.5, 0, 7); ctx.stroke();
    for (let rune = 0; rune < 6; rune++) {
      const a = rune * Math.PI / 3 + frames * 0.002;
      const rx = sx + Math.cos(a) * 28;
      const ry = groundY - 43 + Math.sin(a) * 28;
      ctx.beginPath();
      ctx.moveTo(rx - Math.sin(a) * 2, ry + Math.cos(a) * 2);
      ctx.lineTo(rx + Math.sin(a) * 2, ry - Math.cos(a) * 2);
      ctx.stroke();
    }

    ctx.fillStyle = lit ? '#d6aa50' : '#6c6658';
    ctx.beginPath();
    ctx.moveTo(sx - 12, groundY - 11); ctx.lineTo(sx + 12, groundY - 11);
    ctx.lineTo(sx + 8, groundY - 3); ctx.lineTo(sx - 8, groundY - 3); ctx.closePath(); ctx.fill();
    ctx.restore();
  },

  drawPhoenixFeathers(ctx, cam, frames) {
    for (const feather of this.phoenixFeathers) {
      const fade = feather.ghost && this.gustActive()
        ? U.clamp(1 - this.phaseT / 0.34, 0, 1)
        : 1;
      if (fade <= 0.01) continue;
      const ghostPlatform = feather.ghost
        ? this.ghostPlatforms.find((platform) => feather.x >= platform.x && feather.x <= platform.x + platform.w)
        : null;
      const platformBob = ghostPlatform
        ? Math.sin(frames * 0.045 + ghostPlatform.phase) * 1.8
        : 0;
      this.drawFeatherSanctuary(ctx, cam, frames, feather, platformBob, fade);
      if (feather.taken) continue;

      const sx = feather.x - cam.x;
      const sy = feather.y - cam.y + platformBob + Math.sin(frames * 0.06 + feather.id) * 3;
      if (sx < -55 || sx > 1015 || sy < -70 || sy > 610) continue;
      const pulse = 0.5 + 0.5 * Math.sin(frames * 0.14 + feather.id);
      ctx.save();
      ctx.globalAlpha = fade;
      ctx.translate(sx, sy);

      ctx.save();
      ctx.globalAlpha = fade;
      ctx.globalCompositeOperation = 'lighter';
      const aura = ctx.createRadialGradient(0, 0, 2, 0, 0, 34 + pulse * 6);
      aura.addColorStop(0, `rgba(255,233,169,${0.34 + pulse * 0.18})`);
      aura.addColorStop(1, 'rgba(255,214,116,0)');
      ctx.fillStyle = aura;
      ctx.beginPath(); ctx.arc(0, 0, 40, 0, 7); ctx.fill();
      ctx.restore();

      ctx.rotate(Math.sin(frames * 0.04 + feather.id) * 0.12 - 0.28);
      ctx.shadowColor = 'rgba(255,198,92,0.9)';
      ctx.shadowBlur = 14 + pulse * 6;
      const plume = ctx.createLinearGradient(-8, -20, 8, 22);
      plume.addColorStop(0, '#fff8d5');
      plume.addColorStop(0.45, '#ffd77c');
      plume.addColorStop(1, '#d88b32');
      ctx.fillStyle = plume;
      ctx.beginPath();
      ctx.moveTo(2, -21);
      ctx.bezierCurveTo(12, -12, 11, 4, -3, 18);
      ctx.bezierCurveTo(1, 7, -5, -7, 2, -21);
      ctx.closePath(); ctx.fill();
      ctx.shadowBlur = 0;

      ctx.strokeStyle = '#fff4c7';
      ctx.lineWidth = 1.35;
      ctx.beginPath(); ctx.moveTo(2, -18); ctx.quadraticCurveTo(1, 2, -6, 23); ctx.stroke();
      ctx.lineWidth = 0.8;
      for (let barb = 0; barb < 5; barb++) {
        const by = -12 + barb * 6;
        const lean = barb * 0.8;
        ctx.beginPath(); ctx.moveTo(1 - barb * 0.55, by);
        ctx.lineTo(8 - lean, by - 4); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0 - barb * 0.55, by + 1);
        ctx.lineTo(-6 - lean, by + 6); ctx.stroke();
      }
      ctx.restore();

      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      for (let mote = 0; mote < 4; mote++) {
        const a = frames * 0.025 + feather.id + mote * Math.PI * 0.5;
        ctx.fillStyle = `rgba(255,226,151,${0.38 + (mote % 2) * 0.22})`;
        ctx.beginPath();
        ctx.arc(sx + Math.cos(a) * (16 + mote * 3), sy + Math.sin(a * 1.4) * 15, 1 + (mote % 2) * 0.45, 0, 7);
        ctx.fill();
      }
      ctx.restore();
    }
  },

  drawHud(ctx) {
    if (!this.compass.taken) return;
    const warn = this.warnActive();
    const gust = this.gustActive();
    const x = 786, y = 12, w = 162, h = this.phoenixUnlocked ? 106 : 66;
    const pulse = 0.5 + 0.5 * Math.sin(Game.frames * 0.16);
    ctx.save();
    ctx.fillStyle = 'rgba(5,12,20,0.8)';
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = warn ? `rgba(204,242,234,${0.5 + pulse * 0.4})` : 'rgba(174,214,210,0.42)';
    ctx.lineWidth = warn ? 1.5 : 1;
    ctx.strokeRect(x, y, w, h);
    const cx = x + 31, cy = y + 33;
    this.drawCompassDial(ctx, cx, cy, 18, Game.frames, warn || gust);
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = '#d9f1ea'; ctx.font = '700 10px "Segoe UI", sans-serif';
    ctx.fillText(warn ? 'FRENTE A CAMINHO' : gust ? 'VENTO ATUAL' : 'PROXIMA FRENTE', x + 57, y + 25);
    ctx.fillStyle = warn ? '#f1fffb' : '#a9c7c3'; ctx.font = '10px "Segoe UI", sans-serif';
    ctx.fillText(`sopra para ${this.windName(this.cycleDir)}`, x + 57, y + 43);
    if (this.phoenixUnlocked) {
      const p = Game.player;
      const fill = U.clamp(p.sta / p.maxSta, 0, 1);
      ctx.fillStyle = '#ffe6aa'; ctx.font = '700 10px "Segoe UI", sans-serif';
      ctx.fillText('ASAS DA FENIX', x + 14, y + 80);
      ctx.fillStyle = 'rgba(28,33,44,0.9)'; ctx.fillRect(x + 14, y + 88, 132, 7);
      ctx.fillStyle = '#d7a953'; ctx.fillRect(x + 14, y + 88, 132 * fill, 7);
      ctx.strokeStyle = 'rgba(255,231,173,0.45)'; ctx.strokeRect(x + 14, y + 88, 132, 7);
    }
    ctx.restore();
  },

  drawPhoenixWings(ctx, x, y, scale, facing, frames) {
    const flutter = Math.sin(frames * 0.22) * 3;
    ctx.save();
    ctx.translate(x, y - 24 * scale);
    ctx.scale(scale * facing, scale);
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = 'rgba(255,220,148,0.2)';
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(-2, 2);
      ctx.quadraticCurveTo(side * 18, -18 - flutter, side * 34, -5);
      ctx.quadraticCurveTo(side * 24, 4 + flutter, side * 8, 12);
      ctx.closePath(); ctx.fill();
      ctx.strokeStyle = 'rgba(255,239,196,0.56)'; ctx.lineWidth = 1.1;
      for (let feather = 0; feather < 3; feather++) {
        const fy = -7 + feather * 7;
        ctx.beginPath();
        ctx.moveTo(side * 4, fy);
        ctx.quadraticCurveTo(side * (19 + feather * 4), fy - 8 + flutter * 0.25, side * (31 - feather * 2), fy + 4);
        ctx.stroke();
      }
    }
    ctx.restore();
  },

  /** Efeitos de vento: folhas, poeira, penas, tufos de grama, linhas de vento aprimoradas */
  drawWindEffects(ctx, cam, frames) {
    const power = this.windPower();
    const warn = this.warnActive();
    const z = this.zoneAt(Game.player.x, Game.player.y);
    const dir = this.cycleDir;
    const t = this.t;

    // ── Gerenciamento de partículas internas ──
    // Folhas (3-5 visíveis)
    const leafCount = this._particles.filter(p => p.type === 'leaf').length;
    if (leafCount < (power > 0.3 ? 5 : 3) && frames % (power > 0.3 ? 8 : 20) === 0) {
      this._spawnLeaf(cam);
    }
    // Poeira perto de plataformas
    if (frames % 6 === 0) this._spawnDust(cam);
    // Penas (raras)
    this._spawnFeather(cam);
    // Atualiza partículas
    this._tickParticles(cam);

    // ── Desenha partículas ──
    for (const p of this._particles) {
      const sx = p.x - cam.x, sy = p.y - cam.y;
      if (sx < -20 || sx > 980 || sy < -20 || sy > 560) continue;

      if (p.type === 'leaf') {
        ctx.save();
        ctx.translate(sx, sy);
        ctx.rotate(p.rot || 0);
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.ellipse(0, 0, p.size, p.size * 0.5, 0, 0, 7);
        ctx.fill();
        ctx.restore();
      } else if (p.type === 'dust') {
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(sx, sy, p.size, 0, 7);
        ctx.fill();
      } else if (p.type === 'feather') {
        ctx.save();
        ctx.translate(sx, sy);
        ctx.rotate(p.rot || 0);
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.ellipse(0, 0, p.size, p.size * 0.25, 0, 0, 7);
        ctx.fill();
        // Linha central da pena
        ctx.strokeStyle = 'rgba(220,225,235,0.5)';
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.moveTo(-p.size, 0);
        ctx.lineTo(p.size, 0);
        ctx.stroke();
        ctx.restore();
      }
    }

    // ── Tufos de grama nas plataformas ──
    for (const s of World.solids) {
      if (s.w < 120 || s.h < 30) continue;
      const sx = s.x - cam.x, sy = s.y - cam.y;
      if (sx + s.w < 0 || sx > 960 || sy < -40 || sy > 560) continue;

      const grassCount = Math.min(5, Math.floor(s.w / 80));
      for (let gi = 0; gi < grassCount; gi++) {
        const gx = sx + 20 + this._hash(s.x + gi * 47, s.y + 3) * (s.w - 40);
        const gy = sy;
        const lean = (power > 0 ? dir * power * 0.6 : Math.sin(t * 0.5 + s.x + gi) * 0.08);

        ctx.strokeStyle = 'rgba(110,140,95,0.45)';
        ctx.lineWidth = 1;
        // 3-4 lâminas por tufo
        const bladeCount = 3 + Math.floor(this._hash(s.x + gi * 19, s.y + 7));
        for (let bi = 0; bi < bladeCount; bi++) {
          const bladeH = 8 + this._hash(s.x + gi * 31 + bi, s.y + 11) * 10;
          const spread = (bi - bladeCount / 2) * 2.5;
          const bendAmount = lean + Math.sin(t * 2 + s.x + gi + bi * 0.7) * 0.05;
          ctx.beginPath();
          ctx.moveTo(gx + spread, gy);
          ctx.quadraticCurveTo(
            gx + spread + bendAmount * bladeH * 12,
            gy - bladeH * 0.6,
            gx + spread + bendAmount * bladeH * 20,
            gy - bladeH
          );
          ctx.stroke();
        }
      }
    }

    // ── Linhas de vento aprimoradas (substitui as linhas básicas) ──
    if (power > 0.01 || warn) {
      const intensity = warn ? 0.35 : power;
      ctx.save();

      if (intensity < 0.15) {
        // Calmaria: quase invisíveis, muito lentas
        ctx.strokeStyle = `rgba(255,255,255,0.05)`;
        ctx.lineWidth = 0.8;
        for (let i = 0; i < 4; i++) {
          const wy = ((i * 137 + frames * 0.15) % 560) - 10;
          const wxBase = ((i * 281 + frames * 3 * dir) % 1300 + 1300) % 1300 - 170;
          ctx.beginPath();
          ctx.moveTo(wxBase, wy);
          ctx.lineTo(wxBase + 60 * dir, wy - 2);
          ctx.stroke();
        }
      } else if (intensity < 0.5) {
        // Aviso: moderadas, crescendo
        ctx.strokeStyle = `rgba(255,255,255,${0.08 + intensity * 0.2})`;
        ctx.lineWidth = 1.2;
        for (let i = 0; i < 8; i++) {
          const wy = ((i * 97 + frames * 0.4) % 560) - 10;
          const wxBase = ((i * 211 + frames * (14 + intensity * 28) * dir) % 1300 + 1300) % 1300 - 170;
          ctx.beginPath();
          ctx.moveTo(wxBase, wy);
          ctx.quadraticCurveTo(wxBase + 40 * dir, wy - 4, wxBase + 90 * dir, wy + 1);
          ctx.stroke();
        }
      } else {
        // Rajada: densas, rápidas, múltiplas camadas com turbulência
        // Camada principal
        ctx.strokeStyle = `rgba(255,255,255,${0.15 + intensity * 0.15})`;
        ctx.lineWidth = 1.5;
        for (let i = 0; i < 14; i++) {
          const wy = ((i * 73 + frames * 0.8) % 560) - 10;
          const wxBase = ((i * 171 + frames * (30 + intensity * 46) * dir) % 1400 + 1400) % 1400 - 220;
          const curveAmt = Math.sin(frames * 0.1 + i * 1.3) * 8;
          ctx.beginPath();
          ctx.moveTo(wxBase, wy);
          ctx.quadraticCurveTo(wxBase + 70 * dir, wy - 6 + curveAmt, wxBase + 150 * dir, wy + curveAmt * 0.5);
          ctx.stroke();
        }
        // Linhas longas e mais opacas
        ctx.strokeStyle = `rgba(255,255,255,${0.25 + intensity * 0.08})`;
        ctx.lineWidth = 2;
        for (let i = 0; i < 4; i++) {
          const wy = ((i * 157 + frames * 1.2) % 560) - 10;
          const wxBase = ((i * 311 + frames * (40 + intensity * 58) * dir) % 1600 + 1600) % 1600 - 320;
          ctx.beginPath();
          ctx.moveTo(wxBase, wy);
          ctx.quadraticCurveTo(wxBase + 120 * dir, wy - 8, wxBase + 260 * dir, wy + 3);
          ctx.stroke();
        }
      }
      ctx.restore();
    }
  },

  /** Atmosfera: névoa de altitude, vinheta da rajada, nuvens de primeiro plano */
  drawAtmosphere(ctx, cam, frames) {
    const power = this.windPower();
    const t = this.t;
    const z = this.zoneAt(Game.player.x, Game.player.y);
    const dir = this.cycleDir;
    const cloudFlow = this.cloudOffset;

    // ── Névoa de altitude (banda alta, y < 900) ──
    const playerWorldY = cam.y + 270; // centro da tela no mundo
    if (playerWorldY < 1000) {
      const fogIntensity = 1 - (playerWorldY / 1000);
      const fogAlpha = 0.03 + fogIntensity * 0.07; // 0.03 a 0.10
      ctx.fillStyle = `rgba(240,244,248,${Math.min(fogAlpha, 0.10)})`;
      ctx.fillRect(0, 0, 960, 540);
    }

    // ── Vinheta da rajada (escurecimento na borda oposta ao vento) ──
    if (power > 0.15) {
      const vigAlpha = (power - 0.15) * 0.14;
      // Borda oposta ao vento
      const fromEdge = dir > 0 ? 0 : 840;
      const vg = ctx.createLinearGradient(fromEdge, 0, fromEdge + (dir > 0 ? 100 : 120) * (dir > 0 ? 1 : -1), 0);
      // Ajuste para ambas direções
      if (dir > 0) {
        const vg2 = ctx.createLinearGradient(0, 0, 100, 0);
        vg2.addColorStop(0, `rgba(0,0,0,${vigAlpha})`);
        vg2.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = vg2;
        ctx.fillRect(0, 0, 100, 540);
      } else {
        const vg2 = ctx.createLinearGradient(960, 0, 860, 0);
        vg2.addColorStop(0, `rgba(0,0,0,${vigAlpha})`);
        vg2.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = vg2;
        ctx.fillRect(860, 0, 100, 540);
      }

      // Bordas superior e inferior também sutilmente
      const topBot = ctx.createLinearGradient(0, 0, 0, 60);
      topBot.addColorStop(0, `rgba(0,0,0,${vigAlpha * 0.5})`);
      topBot.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = topBot;
      ctx.fillRect(0, 0, 960, 60);

      const botG = ctx.createLinearGradient(0, 540, 0, 480);
      botG.addColorStop(0, `rgba(0,0,0,${vigAlpha * 0.5})`);
      botG.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = botG;
      ctx.fillRect(0, 480, 960, 60);
    }

    // ── Nuvens de primeiro plano (foreground wisps, parallax > 1.0) ──
    ctx.save();
    const fgClouds = [
      { ox: 400,  oy: 280, w: 200, h: 30, speed: 1.3, alpha: 0.06 },
      { ox: 1200, oy: 150, w: 260, h: 35, speed: 1.5, alpha: 0.08 },
      { ox: 2100, oy: 400, w: 180, h: 25, speed: 1.2, alpha: 0.05 }
    ];
    for (const fc of fgClouds) {
      // Parallax > 1.0 significa que elas passam mais rápido que a câmera
      const sx = ((fc.ox + cloudFlow * fc.speed * 1.35 - cam.x * fc.speed) % 1600 + 1600) % 1600 - 300;
      const sy = fc.oy - cam.y * 0.02 + Math.sin(t * 0.12 + fc.ox) * (1 + power * 2);
      if (sx < -300 || sx > 1260 || sy < -50 || sy > 590) continue;
      ctx.fillStyle = `rgba(255,255,255,${fc.alpha})`;
      ctx.beginPath();
      ctx.ellipse(sx, sy, fc.w * 0.5, fc.h * 0.5, 0, 0, 7);
      ctx.ellipse(sx + fc.w * 0.2, sy - fc.h * 0.3, fc.w * 0.35, fc.h * 0.4, 0, 0, 7);
      ctx.ellipse(sx - fc.w * 0.15, sy - fc.h * 0.2, fc.w * 0.3, fc.h * 0.35, 0, 0, 7);
      ctx.fill();
    }
    ctx.restore();
  },

  // ─────────────── inimigos do vento (sprites próprios) ───────────────

  /** Espírito do Vento / Rei do Vento — pássaro-samurai elegante */
  drawWindSamurai(ctx, x, y, s, tier, o = {}) {
    const t = o.t || 0;
    const pose = o.pose || 'idle';
    const facing = o.facing || 1;
    const alpha = o.alpha === undefined ? 1 : o.alpha;
    if (alpha <= 0) return;
    const king = tier === 13;
    const hover = Math.sin(t * 0.08) * 4 - 12;
    const cx = (pose === 'attack' ? 10 : 0), cy = -24 + hover;

    ctx.save();
    ctx.translate(x, y);
    ctx.scale(s * facing, s);
    ctx.globalAlpha = alpha;

    if (o.aura > 0) {
      const ac = o.auraCol || '255,216,120';
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = `rgba(${ac},${o.aura * (0.45 + 0.3 * Math.sin(t * 0.18))})`;
      ctx.lineWidth = 2.5;
      ctx.shadowColor = `rgba(${ac},0.9)`; ctx.shadowBlur = 12;
      ctx.beginPath(); ctx.arc(cx, cy, 28 + Math.sin(t * 0.18) * 3, 0, 7); ctx.stroke();
      ctx.restore();
    }

    // aura tempestuosa do rei em fúria
    if (king && o.stormPhase) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const sg = ctx.createRadialGradient(cx, cy, 4, cx, cy, 46);
      sg.addColorStop(0, `rgba(120,170,255,${0.25 + 0.15 * Math.sin(t * 0.4)})`);
      sg.addColorStop(1, 'rgba(120,170,255,0)');
      ctx.fillStyle = sg;
      ctx.beginPath(); ctx.arc(cx, cy, 46, 0, 7); ctx.fill();
      ctx.restore();
    }

    // asas (abertas ao atacar, recolhidas em guarda)
    const spread = pose === 'attack' || pose === 'magic' ? 1 : 0.45 + 0.1 * Math.sin(t * 0.15);
    for (const side of [-1, 1]) {
      ctx.save();
      ctx.translate(cx - 4, cy - 2);
      ctx.rotate(side * (0.5 + spread * 0.7) + Math.sin(t * 0.2) * 0.06);
      const wg = ctx.createLinearGradient(0, 0, side * 30, -12);
      wg.addColorStop(0, 'rgba(240,246,252,0.95)');
      wg.addColorStop(1, 'rgba(150,190,230,0.35)');
      ctx.fillStyle = wg;
      for (let fth = 0; fth < 4; fth++) {
        ctx.beginPath();
        ctx.ellipse(side * (10 + fth * 7), -3 - fth * 2.4, 12 - fth * 1.6, 4.4, side * 0.35, 0, 7);
        ctx.fill();
      }
      ctx.restore();
    }

    // corpo emplumado (branco-azulado)
    const bg = ctx.createRadialGradient(cx - 3, cy - 6, 2, cx, cy, 20);
    bg.addColorStop(0, 'rgba(250,252,255,0.98)');
    bg.addColorStop(0.6, 'rgba(214,228,244,0.95)');
    bg.addColorStop(1, 'rgba(150,180,215,0.9)');
    ctx.fillStyle = bg;
    ctx.beginPath();
    ctx.ellipse(cx, cy, 12, 16 + (king ? 4 : 0), 0, 0, 7);
    ctx.fill();
    // penas da cauda
    ctx.fillStyle = 'rgba(170,200,230,0.8)';
    for (let f2 = 0; f2 < 3; f2++) {
      ctx.beginPath();
      ctx.ellipse(cx - 12 - f2 * 5, cy + 10 + f2 * 3, 8, 3, -0.5, 0, 7);
      ctx.fill();
    }

    // armadura leve (peitoral + ombreira)
    ctx.fillStyle = '#33415c';
    ctx.strokeStyle = '#5b6f92';
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    ctx.moveTo(cx - 9, cy - 2);
    ctx.quadraticCurveTo(cx, cy + 5, cx + 9, cy - 2);
    ctx.lineTo(cx + 7, cy + 5);
    ctx.quadraticCurveTo(cx, cy + 10, cx - 7, cy + 5);
    ctx.closePath(); ctx.fill(); ctx.stroke();

    // cabeça de falcão + bico dourado
    const hx = cx + 6, hy = cy - 16;
    ctx.fillStyle = 'rgba(245,249,253,0.98)';
    ctx.beginPath(); ctx.arc(hx, hy, 6.5, 0, 7); ctx.fill();
    ctx.fillStyle = '#c9a44a';
    ctx.beginPath();
    ctx.moveTo(hx + 5, hy - 1); ctx.lineTo(hx + 12, hy + 1.5); ctx.lineTo(hx + 5, hy + 3);
    ctx.closePath(); ctx.fill();
    // penacho / coroa do rei
    if (king) {
      ctx.fillStyle = '#c9a44a';
      ctx.beginPath();
      ctx.moveTo(hx - 5, hy - 5); ctx.lineTo(hx - 3, hy - 13); ctx.lineTo(hx - 1, hy - 5);
      ctx.moveTo(hx - 1, hy - 6); ctx.lineTo(hx + 1, hy - 15); ctx.lineTo(hx + 3, hy - 6);
      ctx.moveTo(hx + 3, hy - 5); ctx.lineTo(hx + 5, hy - 12); ctx.lineTo(hx + 7, hy - 4);
      ctx.fill();
    } else {
      ctx.fillStyle = 'rgba(120,160,210,0.9)';
      ctx.beginPath();
      ctx.moveTo(hx - 4, hy - 5); ctx.quadraticCurveTo(hx - 9, hy - 12, hx - 13, hy - 9);
      ctx.quadraticCurveTo(hx - 8, hy - 7, hx - 5, hy - 3);
      ctx.fill();
    }
    // olho
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.shadowColor = '#bfe0ff'; ctx.shadowBlur = 6;
    ctx.fillStyle = king && o.stormPhase ? '#9fd0ff' : '#dceeff';
    ctx.beginPath(); ctx.ellipse(hx + 2, hy - 1.4, 1.8, 1.3, 0, 0, 7); ctx.fill();
    ctx.restore();

    // katana de vento (lâmina translúcida em espiral)
    if (pose !== 'defend') {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const bx = cx + 13, by = cy + 2;
      const reach = pose === 'attack' ? 30 : 22;
      const grad = ctx.createLinearGradient(bx, by, bx + reach, by - reach * 0.8);
      grad.addColorStop(0, 'rgba(235,248,255,0.95)');
      grad.addColorStop(1, 'rgba(160,210,245,0.1)');
      ctx.strokeStyle = grad;
      ctx.lineWidth = 2.6;
      ctx.shadowColor = 'rgba(190,225,255,0.9)'; ctx.shadowBlur = 7;
      ctx.beginPath();
      ctx.moveTo(bx, by);
      ctx.quadraticCurveTo(bx + reach * 0.6, by - reach * 0.28 + Math.sin(t * 0.3) * 2, bx + reach, by - reach * 0.8);
      ctx.stroke();
      ctx.restore();
    } else {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = `rgba(200,230,250,${0.5 + 0.3 * Math.sin(t * 0.2)})`;
      ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.arc(cx + 14, cy, 14, -1.2, 1.2); ctx.stroke();
      ctx.restore();
    }

    if (o.flash > 0) {
      ctx.save();
      ctx.globalAlpha = Math.min(1, o.flash) * alpha;
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = 'rgba(255,255,255,0.75)';
      ctx.beginPath(); ctx.ellipse(cx, cy, 14, 18, 0, 0, 7); ctx.fill();
      ctx.restore();
    }
    ctx.restore();
  },

  /** Espírito da Tempestade — nuvem negra, relâmpagos, núcleo azul */
  drawStormSpirit(ctx, x, y, s, tier, o = {}) {
    const t = o.t || 0;
    const pose = o.pose || 'idle';
    const facing = o.facing || 1;
    const alpha = o.alpha === undefined ? 1 : o.alpha;
    if (alpha <= 0) return;
    const hover = Math.sin(t * 0.07) * 5 - 14;
    const cx = 0, cy = -26 + hover;

    ctx.save();
    ctx.translate(x, y);
    ctx.scale(s * facing, s);
    ctx.globalAlpha = alpha;

    if (o.aura > 0) {
      const ac = o.auraCol || '255,216,120';
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = `rgba(${ac},${o.aura * (0.45 + 0.3 * Math.sin(t * 0.18))})`;
      ctx.lineWidth = 2.5;
      ctx.shadowColor = `rgba(${ac},0.9)`; ctx.shadowBlur = 12;
      ctx.beginPath(); ctx.arc(cx, cy, 30 + Math.sin(t * 0.18) * 3, 0, 7); ctx.stroke();
      ctx.restore();
    }

    // corpo de nuvem escura (blobs agregados pulsando)
    const puffs = [
      [0, 0, 16], [-12, 4, 11], [12, 3, 12], [-6, -10, 11], [7, -9, 10], [0, 10, 12]
    ];
    for (const [px, py, pr] of puffs) {
      const wob = 1 + 0.1 * Math.sin(t * 0.15 + px);
      const g = ctx.createRadialGradient(cx + px, cy + py, 1, cx + px, cy + py, pr * wob);
      g.addColorStop(0, 'rgba(90,100,125,0.95)');
      g.addColorStop(1, 'rgba(40,46,64,0.9)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(cx + px, cy + py, pr * wob, 0, 7); ctx.fill();
    }

    // núcleo elétrico azul
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const core = ctx.createRadialGradient(cx, cy, 1, cx, cy, 12);
    const pulse = 0.6 + 0.4 * Math.sin(t * 0.35);
    core.addColorStop(0, `rgba(150,200,255,${0.9 * pulse})`);
    core.addColorStop(1, 'rgba(150,200,255,0)');
    ctx.fillStyle = core;
    ctx.beginPath(); ctx.arc(cx, cy, 12, 0, 7); ctx.fill();

    // veias de relâmpago tremeluzindo
    if (Math.floor(t) % 3 !== 1 || pose === 'magic' || pose === 'charge') {
      ctx.strokeStyle = `rgba(190,225,255,${0.6 + 0.4 * pulse})`;
      ctx.lineWidth = 1.4;
      ctx.shadowColor = '#bfe0ff'; ctx.shadowBlur = 6;
      for (let b = 0; b < 3; b++) {
        const a = (t * 0.5 + b * 2.1) % 6.28;
        let lx = cx + Math.cos(a) * 4, ly = cy + Math.sin(a) * 4;
        ctx.beginPath(); ctx.moveTo(lx, ly);
        for (let seg = 0; seg < 3; seg++) {
          lx += Math.cos(a) * 8 + (((b * 7 + seg * 13 + Math.floor(t * 2)) % 7) - 3);
          ly += Math.sin(a) * 8 + (((b * 5 + seg * 11 + Math.floor(t * 2)) % 7) - 3);
          ctx.lineTo(lx, ly);
        }
        ctx.stroke();
      }
    }
    ctx.restore();

    // olhos-fenda elétricos
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.shadowColor = '#cfe6ff'; ctx.shadowBlur = 8;
    ctx.fillStyle = '#dceeff';
    ctx.beginPath(); ctx.ellipse(cx + 4, cy - 5, 2.4, 1.2, 0.2, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.ellipse(cx + 10, cy - 4, 2.2, 1.1, 0.2, 0, 7); ctx.fill();
    ctx.restore();

    // esfera elétrica durante a preparação da Tempestade Paralisante
    if (pose === 'charge') {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const orb = 8 + (t % 30) * 0.5;
      ctx.strokeStyle = `rgba(170,215,255,${0.7 + 0.3 * Math.sin(t * 0.6)})`;
      ctx.lineWidth = 2;
      ctx.shadowColor = '#bfe0ff'; ctx.shadowBlur = 10;
      ctx.beginPath(); ctx.arc(cx + 20, cy - 2, Math.min(orb, 15), 0, 7); ctx.stroke();
      ctx.restore();
    }

    if (o.flash > 0) {
      ctx.save();
      ctx.globalAlpha = Math.min(1, o.flash) * alpha;
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = 'rgba(255,255,255,0.75)';
      ctx.beginPath(); ctx.ellipse(cx, cy, 18, 20, 0, 0, 7); ctx.fill();
      ctx.restore();
    }
    ctx.restore();
  }
};

window.WindKingdom = WindKingdom;

// ───────────────────── auto-instalação por wrapping ─────────────────────
(function () {
  // registra mapa/tiers/inimigos assim que o mundo iniciar
  const _init = World.init;
  World.init = function () {
    _init.call(this);
    WindKingdom.install();
  };

  // plataformas móveis entram na colisão apenas no reino do vento
  const _solidList = World.solidList;
  World.solidList = function () {
    const base = _solidList.call(this);
    if (this.current !== 'vento') return base;
    return base.concat(WindKingdom.movers);
  };

  // céu acima das nuvens
  const _bg = World.drawBackground;
  World.drawBackground = function (ctx, cam, frames) {
    if (this.current === 'vento') { WindKingdom.drawSky(ctx, cam, frames); return; }
    _bg.call(this, ctx, cam, frames);
  };

  // paleta clara: branco, cinza, azul-claro, dourado envelhecido, musgo
  const _pal = World.palette;
  World.palette = function (x, y) {
    if (this.current === 'vento') {
      return { skyT: [156, 192, 226], skyB: [238, 243, 246], fog: [214, 226, 236], moss: [116, 168, 118], tree: [122, 138, 152] };
    }
    return _pal.call(this, x, y);
  };

  // Meio-chão: pula árvores de floresta no reino do vento
  const _gt = World.drawGameplayTrees;
  World.drawGameplayTrees = function (ctx, cam, frames) {
    if (this.current === 'vento') return;
    _gt.call(this, ctx, cam, frames);
  };

  // Pula primeiro plano de floresta
  const _fb = World.drawForegroundBack;
  World.drawForegroundBack = function (ctx, cam, frames) {
    if (this.current === 'vento') return;
    _fb.call(this, ctx, cam, frames);
  };

  // Pula formas secundárias de floresta
  const _sb = World.drawSecondaryBack;
  World.drawSecondaryBack = function (ctx, cam, frames) {
    if (this.current === 'vento') return;
    _sb.call(this, ctx, cam, frames);
  };

  // decoração + arquitetura + efeitos de vento por cima do mundo
  const _dw = World.drawWorld;
  World.drawWorld = function (ctx, cam, frames) {
    if (this.current === 'vento') WindKingdom.drawFortressBackdrop(ctx, cam, frames);
    _dw.call(this, ctx, cam, frames);
    if (this.current === 'vento') {
      WindKingdom.drawWindLandforms(ctx, cam, frames);
      WindKingdom.drawArchitecture(ctx, cam, frames);
      WindKingdom.drawDecor(ctx, cam, frames);
      WindKingdom.drawWindEffects(ctx, cam, frames);
    }
  };

  // Primeiro plano: nuvens de atmosfera em vez de floresta
  const _fg = World.drawForeground;
  World.drawForeground = function (ctx, cam, frames, player) {
    if (this.current === 'vento') { WindKingdom.drawAtmosphere(ctx, cam, frames); return; }
    _fg.call(this, ctx, cam, frames, player);
  };

  // no céu claro não há máscara de escuridão
  if (window.Lighting && Lighting.draw) {
    const _ld = Lighting.draw.bind(Lighting);
    Lighting.draw = function (ctx, cam, frames) {
      if (World.current === 'vento') return;
      _ld(ctx, cam, frames);
    };
  }

  // física do vento + plataformas móveis + gatilhos do reino
  const _pu = Player.prototype.update;
  Player.prototype.update = function () {
    if (World.current === 'vento') {
      WindKingdom.tickMovers();
      WindKingdom.carryPlayer(this);
    }
    _pu.call(this);
    if (World.current === 'vento') WindKingdom.afterPlayer(this);
  };

  // Os mesmos modelos da batalha também representam os espíritos no mapa.
  // O fallback mantém o reino carregável caso Sprites.js seja testado isoladamente.
  const _fed = FieldEnemy.prototype.draw;
  FieldEnemy.prototype.draw = function (ctx, cam, frames) {
    if (this.map !== World.current) return;
    if (this.element === 'vento' && !this.dead) {
      const sx = this.x - cam.x, sy = this.y - cam.y;
      if (sx < -120 || sx > 1080) return;
      const cfg = TIERS[this.tier];
      const battleFn = cfg.storm ? window.drawStormBattleSprite : window.drawWindBattleSprite;
      const fallbackFn = cfg.storm ? WindKingdom.drawStormSpirit : WindKingdom.drawWindSamurai;
      const fn = typeof battleFn === 'function' ? battleFn : fallbackFn;
      const pose = this.state === 'chase' ? 'attack' : 'idle';
      fn(ctx, sx, sy, this.isBoss ? 2.4 : 1.15, this.tier, {
        t: this.t,
        pose,
        facing: this.dir,
        armT: pose === 'attack' ? Math.min(1, (this.t % 30) / 10) : 0,
        stormPhase: false
      });
      if (this.isBoss) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        const auraY = sy - 96;
        const g = ctx.createRadialGradient(sx, auraY, 10, sx, auraY, 130);
        g.addColorStop(0, 'rgba(180,215,255,0.16)');
        g.addColorStop(1, 'rgba(180,215,255,0)');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(sx, auraY, 130, 0, 7); ctx.fill();
        ctx.restore();
      }
      return;
    }
    _fed.call(this, ctx, cam, frames);
  };
})();
