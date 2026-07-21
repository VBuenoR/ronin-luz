'use strict';

/**
 * O JARDIM ANTIGO — prólogo do jogo.
 *
 * O jardim de um palácio arruinado pela guerra, já meio devorado pela
 * vegetação: vinhas pendem das pérgolas, mato alto entre as lajes, hera
 * subindo pelos pilares. É aqui que o jogo começa:
 *
 *   CUTSCENE — uma luz desce do céu sobre um CORPO caído (o próprio guerreiro,
 *   apagado, sem brilho). A Voz da Aurora fala. O corpo se ergue, refeito em luz.
 *
 * Pedras com escrituras ensinam a exploração (↑ para ler). Os RESTOS DE
 * ARMADURA — uma armadura de samurai pendurada numa estaca — ensinam o combate:
 * golpeá-la (X/J) inicia o duelo de treino, onde a Voz ensina cada comando e a
 * armadura devolve o teu próprio brilho ("Reflexo da Luz", 1 de dano, anulável
 * com Defender ou Defesa da Luz). Ao fim do jardim, o portal azul leva ao
 * Reino da Água.
 *
 * Módulo auto-instalável por wrapping (World/Game/Battle/TIERS/sprites).
 */
const AncientGarden = {

  SPAWN:  { x: 480,  y: 1300 },
  BODY:   { x: 470,  y: 1300 },    // o corpo caído da cutscene
  ARMOR:  { x: 1520, y: 1300 },    // os Restos de Armadura na estaca
  PORTAL: { x: 2250, y: 1120 },
  WIDTH: 2400,
  DUMMY_TIER: 30,

  // ───────────────────────── o mapa ─────────────────────────
  map: {
    solids: [
      { x: -60,  y: 860,  w: 60,  h: 840 },                    // muralha oeste
      { x: 2400, y: 860,  w: 60,  h: 840 },                    // muralha leste
      { x: -60,  y: 1300, w: 1060, h: 500, id: 'esplanade' },  // esplanada (0..1000)
      { x: 1000, y: 1430, w: 150,  h: 370, id: 'gardenPit' },  // fenda da guerra
      { x: 1150, y: 1300, w: 530,  h: 500, id: 'courtyard' },  // pátio central
      { x: 1680, y: 1120, w: 780,  h: 680, id: 'terrace' }     // terraço do palácio
    ],
    oneways: [
      { x: 300,  y: 1190, w: 110, h: 14 },   // pérgola sobre a esplanada
      { x: 1580, y: 1210, w: 84,  h: 14 },   // capitel caído (meio degrau)
      { x: 1900, y: 1000, w: 130, h: 14 }    // sacada em ruína, com cristal
    ],
    waters: [], lavas: [], spikes: [], jets: [], updrafts: [],
    torches: [],
    checkpoints: [],                          // sem torii no jardim
    pickups: [
      { x: 1075, y: 1400, type: 'lotus',   taken: false },
      { x: 1960, y: 968,  type: 'crystal', taken: false }
    ]
  },

  // amanhecer frio sobre pedra e musgo
  palette: { skyT: [24, 32, 52], skyB: [128, 108, 76], fog: [96, 116, 104], moss: [116, 182, 120], tree: [18, 26, 22] },

  // ───────────── as pedras-escritura (↑ para ler) ─────────────
  stones: [
    {
      x: 640, y: 1300, kanji: '歩', title: 'Pedra do Caminhar', read: false,
      lines: ['«Os pés aprendem antes da lâmina.»',
              '← → (ou A / D) caminham. ESPAÇO salta.',
              'A fenda adiante engole os distraídos —',
              'corre e salta na beirada.']
    },
    {
      x: 1250, y: 1300, kanji: '壁', title: 'Pedra da Muralha', read: false,
      lines: ['«A muralha não é fim: é caminho.»',
              'Contra a parede, segure a direção para',
              'deslizar — e salte para escalar.',
              'SHIFT desfere o avanço de luz.']
    },
    {
      x: 1790, y: 1120, kanji: '刃', title: 'Pedra da Lâmina', read: false,
      lines: ['«A lâmina desperta os adormecidos.»',
              'J (ou X) corta no mapa.',
              'Tocar um espírito inicia o duelo:',
              'lá, ataca-se, defende-se e conjura-se.']
    },
    {
      x: 2090, y: 1120, kanji: '浄', title: 'Pedra da Pureza', read: false,
      lines: ['«Não vieste para matar. Vieste purificar.»',
              'Enfraquece o espírito até restar pouco',
              'e a magia Purificar o libertará.',
              'Há outro caminho, mais sombrio…',
              'que esta pedra se recusa a nomear.']
    }
  ],

  // ─────────── vegetação que consome as ruínas ───────────
  // vinhas penduradas {x, topY, len, phase}
  vines: [
    { x: 310, topY: 1190, len: 52, phase: 0.4 }, { x: 352, topY: 1190, len: 74, phase: 1.7 },
    { x: 395, topY: 1190, len: 60, phase: 3.1 }, { x: 150, topY: 1104, len: 46, phase: 0.9 },
    { x: 366, topY: 1000, len: 88, phase: 2.2 }, { x: 1475, topY: 980, len: 96, phase: 1.1 },
    { x: 1590, topY: 1210, len: 44, phase: 2.8 }, { x: 1918, topY: 1000, len: 58, phase: 0.2 },
    { x: 1972, topY: 1000, len: 82, phase: 1.5 }, { x: 2016, topY: 1000, len: 64, phase: 3.6 },
    { x: 1996, topY: 780,  len: 70, phase: 2.4 }, { x: 2222, topY: 1008, len: 54, phase: 0.7 },
    { x: 2286, topY: 1008, len: 68, phase: 1.9 }
  ],
  // moitas de mato {x, gy, s}
  bushes: [
    { x: 130,  gy: 1300, s: 1.0 }, { x: 545,  gy: 1300, s: 0.8 }, { x: 760,  gy: 1300, s: 1.2 },
    { x: 985,  gy: 1300, s: 0.9 }, { x: 1195, gy: 1300, s: 1.1 }, { x: 1620, gy: 1300, s: 0.85 },
    { x: 1730, gy: 1120, s: 1.0 }, { x: 2005, gy: 1120, s: 0.75 }, { x: 2165, gy: 1120, s: 1.15 },
    { x: 2360, gy: 1120, s: 0.9 }, { x: 1085, gy: 1430, s: 0.8 }
  ],

  // ───────────────── a cutscene de abertura ─────────────────
  voiceLines: [
    '“Levante-se, homem. Eu lhe darei mais uma chance.”',
    '“O reino caiu na perdição — o mal os corrompeu através da magia.”',
    '“Use apenas esta Katana de Luz para purificar as criaturas de todo o reino.”',
    '“Para iniciar uma Era de Paz.”'
  ],

  cut: null,          // { t, phase: fade|beam|lines|rise, line, lineT, riseT }
  reading: null,
  nearStone: null, nearPortal: false, nearArmor: false,
  trained: false,     // a Voz só dá a aula completa uma vez

  // o adversário de treino (objeto de campo sintético, como o Espírito)
  armorFoe: null,

  beginCutscene(G) {
    World.load('jardim');
    const p = G.player;
    p.x = this.SPAWN.x; p.y = this.SPAWN.y;
    p.vx = 0; p.vy = 0; p.facing = 1;
    G.cam.x = 0; G.cam.y = 970; G.cam.shake = 0;
    G.checkpoint = { map: 'jardim', x: this.SPAWN.x, y: this.SPAWN.y };
    this.cut = { t: 0, phase: 'fade', line: 0, lineT: 0, riseT: 0, flash: 0, circle: 0 };
  },

  cutUpdate(G) {
    const c = this.cut;
    if (!c) return;
    c.t++;
    c.flash *= 0.9;
    Particles.update();
    const B = this.BODY;

    // poeira de luz caindo do céu durante toda a cena
    if (c.t > 30 && Math.random() < 0.25) {
      Particles.spawn({
        x: B.x + U.rand(-70, 70), y: G.cam.y - 10,
        vy: U.rand(0.5, 1.1), life: 190, size: U.rand(1.2, 2.2),
        color: 'rgba(255,236,190,0.75)', type: 'wisp'
      });
    }

    // antes da luz: os últimos fiapos de alma escapam do corpo frio
    if ((c.phase === 'fade' || (c.phase === 'beam' && c.t < 100)) && Math.random() < 0.12) {
      Particles.spawn({
        x: B.x + U.rand(-22, 22), y: B.y - U.rand(2, 10),
        vx: U.rand(-0.15, 0.15), vy: U.rand(-0.5, -0.25),
        life: 70, size: U.rand(1.6, 2.8),
        color: 'rgba(150,160,180,0.35)', type: 'mist'
      });
    }

    if (c.phase === 'fade' && c.t > 45) {
      c.phase = 'beam';
      // a câmera se aproxima devagar do corpo
      G.cam.targetZoom = 1.14;
      G.cam.targetOffsetY = -14;
    }
    else if (c.phase === 'beam') {
      // motas douradas descendo DENTRO do feixe
      if (c.t > 55 && Math.random() < 0.5) {
        const k = U.clamp((c.t - 45) / 55, 0, 1);
        Particles.spawn({
          x: B.x + U.rand(-34, 34) * (1 - k * 0.5), y: G.cam.y + U.rand(0, 120),
          vx: U.rand(-0.06, 0.06), vy: U.rand(1.2, 2.2),
          life: 150, size: U.rand(1, 2), color: 'rgba(255,244,200,0.85)', type: 'orb'
        });
      }
      // o círculo ancestral acorda no chão sob o corpo
      if (c.t > 70) c.circle = Math.min(1, c.circle + 0.02);
      if (c.t === 100) {   // A IGNIÇÃO: a luz toca o corpo apagado
        c.flash = 1;
        Sfx.tone({ f: 523, dur: 1.0, type: 'sine', vol: 0.12 });
        Sfx.tone({ f: 784, dur: 1.2, type: 'sine', vol: 0.07, delay: 0.3 });
        Sfx.noise({ dur: 0.5, vol: 0.1, fc: 1200, fc2: 3600, type: 'bandpass', q: 1 });
        // onda de choque rasteira + poeira e capim soprados para fora
        Particles.spawn({ x: B.x, y: B.y - 4, life: 34, size: 30, color: 'rgba(255,240,200,0.7)', type: 'ring' });
        Particles.spawn({ x: B.x, y: B.y - 4, life: 48, size: 52, color: 'rgba(255,236,180,0.4)', type: 'ring' });
        Particles.burst(B.x, B.y - 4, 18, () => {
          const dir = Math.random() < 0.5 ? -1 : 1;
          return {
            x: B.x + dir * U.rand(4, 20), y: B.y - U.rand(0, 6),
            vx: dir * U.rand(1.5, 3.6), vy: U.rand(-1.2, -0.2), grav: 0.06,
            life: 38, size: U.rand(1.4, 2.4), color: 'rgba(214,200,150,0.8)', type: 'spark', drag: 0.92
          };
        });
        Particles.burst(B.x, B.y - 10, 14, () => ({
          x: B.x + U.rand(-26, 26), y: B.y - U.rand(2, 16),
          vx: U.rand(-0.8, 0.8), vy: U.rand(-1.6, -0.4),
          life: 60, size: U.rand(1.4, 2.6), color: 'rgba(255,232,170,0.95)', type: 'spark'
        }));
      }
      // depois da ignição, veias de luz percorrem o corpo (fagulhas rastejantes)
      if (c.t > 100 && c.t % 9 === 0) {
        Particles.spawn({
          x: B.x + U.rand(-24, 24), y: B.y - U.rand(2, 9),
          vx: U.rand(-0.3, 0.3), vy: U.rand(-0.15, -0.05),
          life: 34, size: 1.4, color: 'rgba(255,238,180,0.9)', type: 'spark', drag: 0.95
        });
      }
      if (c.t > 150) { c.phase = 'lines'; c.line = 0; c.lineT = 0; }
    }
    else if (c.phase === 'lines') {
      c.lineT++;
      c.circle = Math.min(1, c.circle + 0.02);
      // o corpo pulsa devagar sob a luz enquanto a Voz fala
      if (c.lineT % 26 === 0) {
        Particles.spawn({
          x: B.x + U.rand(-20, 20), y: B.y - U.rand(2, 10),
          vx: 0, vy: -0.4, life: 44, size: 1.6,
          color: 'rgba(255,240,195,0.8)', type: 'orb'
        });
      }
      if (c.lineT > 40 && Input.pressed('confirm')) {
        Sfx.confirm();
        c.line++; c.lineT = 0;
        if (c.line >= this.voiceLines.length) {
          c.phase = 'rise'; c.riseT = 0;
          c.flash = 0.7;
          G.cam.targetZoom = 1.0;
          G.cam.targetOffsetY = 0;
          Sfx.tone({ f: 392, dur: 1.4, type: 'sine', vol: 0.1 });
          Sfx.tone({ f: 587, dur: 1.6, type: 'sine', vol: 0.08, delay: 0.4 });
          Particles.spawn({ x: this.SPAWN.x, y: this.SPAWN.y - 20, life: 40, size: 16, color: 'rgba(255,240,200,0.6)', type: 'ring' });
          Particles.spawn({ x: this.SPAWN.x, y: this.SPAWN.y - 20, life: 56, size: 30, color: 'rgba(255,236,180,0.35)', type: 'ring' });
        }
      }
    }
    else if (c.phase === 'rise') {
      c.riseT++;
      c.circle = Math.max(0, c.circle - 0.02);
      // o corpo se desfaz em luz que espirala para dentro do guerreiro de pé
      if (c.riseT < 46 && c.riseT % 2 === 0) {
        const a = c.riseT * 0.5 + Math.random() * 2;
        const r = 26 - c.riseT * 0.3;
        Particles.spawn({
          x: B.x + Math.cos(a) * r, y: B.y - 4 - c.riseT * 0.7,
          vx: -Math.cos(a) * 0.8, vy: U.rand(-1.6, -0.9),
          life: 34, size: U.rand(1.6, 2.6),
          color: 'rgba(255,240,200,0.9)', type: 'orb', drag: 0.97
        });
      }
      if (c.riseT % 6 === 0) {
        Particles.spawn({
          x: this.SPAWN.x + U.rand(-12, 12), y: this.SPAWN.y - U.rand(0, 40),
          vx: U.rand(-0.3, 0.3), vy: U.rand(-1.4, -0.6),
          life: 40, size: 2, color: 'rgba(255,240,200,0.85)', type: 'orb'
        });
      }
      if (c.riseT === 30) {
        Particles.spawn({ x: this.SPAWN.x, y: this.SPAWN.y - 24, life: 34, size: 20, color: 'rgba(255,244,210,0.6)', type: 'ring' });
      }
      if (c.riseT > 75) {
        this.cut = null;
        G.cam.targetZoom = 1.0;
        G.cam.targetOffsetX = 0;
        G.cam.targetOffsetY = 0;
        Hud.showBanner('庭', 'O Jardim Antigo', 'As ruínas do palácio dormem sob o musgo. Leia as pedras (↑).');
      }
    }
  },

  // ─────────────── exploração: pedras, armadura e portal ───────────────
  update(G) {
    const p = G.player;
    this.nearStone = null;
    for (const s of this.stones) {
      if (Math.abs(p.x - s.x) < 42 && Math.abs(p.y - s.y) < 60) { this.nearStone = s; break; }
    }
    if (this.nearStone && p.onGround && Input.pressed('up')) {
      this.reading = this.nearStone;
      this.reading.read = true;
      Sfx.confirm();
    }

    // os Restos de Armadura: golpeá-los (X/J) inicia o treino
    this.nearArmor = Math.abs(p.x - this.ARMOR.x) < 54 && Math.abs(p.y - this.ARMOR.y) < 70;
    if (this.nearArmor && !G.wipe && Input.pressed('attack')) {
      if (!this.armorFoe) {
        this.armorFoe = {
          dummy: true, tier: this.DUMMY_TIER, x: this.ARMOR.x, y: this.ARMOR.y,
          map: 'jardim', dead: false, cool: 0, isBoss: false
        };
      }
      if (this.armorFoe.cool > 0) return;
      this.armorFoe.dead = false;          // a armadura é recomposta na estaca
      G.startBattle(this.armorFoe);
      return;
    }
    if (this.armorFoe && this.armorFoe.cool > 0) this.armorFoe.cool--;

    // o portal para o Reino da Água (↓ para atravessar)
    this.nearPortal = Math.abs(p.x - this.PORTAL.x) < 46 && Math.abs(p.y - this.PORTAL.y) < 90;
    if (this.nearPortal && !G.wipe && Input.pressed('downKey')) {
      Sfx.confirm();
      G.startWipe(() => {
        World.load('floresta');
        p.x = 200; p.y = 1200; p.vx = 0; p.vy = 0;
        G.checkpoint = { map: 'floresta', x: 200, y: 1200 };
        G.cam.x = U.clamp(p.x - 480, 0, World.width - 960);
        G.cam.y = U.clamp(p.y - 330, 0, World.height - 540);
        Hud.showBanner('水', 'Reino da Água', 'A jornada da purificação começa.');
      });
    }

    // névoa dourada baixa do jardim
    if (Math.random() < 0.12) {
      Particles.spawn({
        x: G.cam.x + U.rand(0, 960), y: G.cam.y + U.rand(320, 540),
        vx: U.rand(-0.2, 0.2), vy: U.rand(-0.25, -0.1),
        life: 150, size: U.rand(3, 5), color: 'rgba(190,190,140,0.14)', type: 'mist'
      });
    }
  },

  readingUpdate(G) {
    const r = this.reading;
    r._t = (r._t || 0) + 1;
    if (r._t > 20 && (Input.pressed('confirm') || Input.pressed('up') || Input.pressed('back'))) {
      r._t = 0;
      this.reading = null;
      Sfx.confirm();
    }
  },

  // ═══════════════ o duelo de treino (dentro da batalha) ═══════════════

  /** Substitui a abertura genérica: a Voz dá a aula de combate. */
  battleIntro(B) {
    B.q = [];
    B.push({ dur: 64, msg: '⚔ A armadura vazia range na estaca — os RESTOS DE ARMADURA aceitam teu treino.' });
    if (!this.trained) {
      B.push({ dur: 84, msg: 'A Voz da Aurora: «Mostra-me que ainda lembras como se luta.»' });
      B.push({ dur: 92, msg: '«ATACAR desfere o corte físico da katana. Cada golpe gasta vigor — vigia a barra âmbar.»' });
      B.push({ dur: 92, msg: '«DEFENDER apara golpes físicos, como socos e lâminas — e devolve o teu fôlego.»' });
    }
    B.push({ dur: 1, on: () => B.openMenu() });
  },

  /** O turno da armadura: Reflexo da Luz (ou um ranger de ferro vazio). */
  dummyTurn(B) {
    B.E.defending = false;
    B.E.fatigued = false;
    const S = 'A armadura';

    if (!B.E._taughtReflex) {
      B.E._taughtReflex = true;
      B.push({ dur: 88, msg: 'A Voz: «Vê — ela devolve o teu próprio brilho. DEFENDE, ou ergue a Defesa da Luz.»' });
    }

    if (U.chance(0.28) && B.E._taughtReflex && B.E.hp < B.E.maxHp) {
      // pausa de ferro: a armadura só se recompõe na estaca
      B.push({
        dur: 40, msg: `${S} range e se reassenta na estaca, vazia.`,
        on: () => {
          B.anim.e = 'idle';
          Sfx.noise({ dur: 0.25, vol: 0.1, fc: 500, fc2: 1400, type: 'bandpass', q: 1.4 });
        }
      });
    } else {
      B.push({
        dur: 46, msg: '鏡 REFLEXO DA LUZ — teu próprio brilho volta contra ti!',
        on: () => {
          B.anim.e = 'magic';
          Sfx.tone({ f: 880, f2: 440, dur: 0.4, type: 'sine', vol: 0.12 });
          // o brilho do Rōnin é sugado e refletido
          Particles.burst(B.PX, B.PY - 46, 8, () => ({
            x: B.PX + U.rand(-14, 14), y: B.PY - 46 + U.rand(-20, 20),
            vx: U.rand(1.2, 2.6), vy: U.rand(-0.5, 0.5),
            life: 24, size: 2.2, color: 'rgba(255,238,180,0.9)', type: 'orb', drag: 0.97
          }));
        }
      });
      B.push({
        dur: 26,
        on: () => {
          const guarded = B.playerHoly || B.playerBarrier || B.playerDef;
          B.anim.e = 'idle';
          if (guarded) {
            const note = B.playerHoly ? '盾 o escudo bebe o reflexo!'
              : B.playerBarrier ? '障 a barragem dispersa o brilho!'
              : '守 aparado — a luz se dispersa!';
            B.floater(B.PX, B.PY - 96, note, '#bfe8ff');
            Sfx.tone({ f: 660, dur: 0.2, type: 'sine', vol: 0.09 });
            Particles.spawn({ x: B.PX, y: B.PY - 44, life: 22, size: 9, color: 'rgba(190,230,255,0.7)', type: 'ring' });
          } else {
            B.P.hp = Math.max(0, B.P.hp - 1);
            B.anim.pFlash = 6;
            B.floater(B.PX, B.PY - 96, '-1', '#ffd9a0');
            Sfx.hurt();
            Particles.burst(B.PX, B.PY - 40, 6, () => ({
              x: B.PX + U.rand(-10, 10), y: B.PY - 40 + U.rand(-14, 14),
              vx: U.rand(-1.4, -0.2), vy: U.rand(-1, 0.6),
              life: 24, size: 2, color: 'rgba(255,232,170,0.85)', type: 'spark'
            }));
          }
        }
      });
    }

    // a segunda lição chega depois do primeiro reflexo
    if (!this.trained && !B.E._taughtMagic && B.E._taughtReflex) {
      B.E._taughtMagic = true;
      B.push({ dur: 92, msg: 'A Voz: «As MAGIAS moldam a tua luz em poder. Cada conjuração custa mana — a barra azul.»' });
      B.push({ dur: 96, msg: '«A DEFESA DA LUZ ergue um escudo poderoso ao preço de mana. Quase nada o atravessa.»' });
      B.push({ dur: 88, msg: '«PURIFICAR liberta espíritos corrompidos já enfraquecidos. É a tua missão — e a tua paz.»' });
    }

    B.push({ dur: 10 });
    B.push({
      dur: 1, on: () => {
        if (B.P.hp <= 0) B.defeatSequence();
        else B.afterEnemy();
      }
    });
  },

  /** Purificar contra a armadura: a Voz corrige, sem custo. */
  purifyDeny(B) {
    B.closeMenu();
    B.push({ dur: 80, msg: 'A Voz: «Guarda o Purificar — este ferro está vazio, não há espírito aqui.»' });
    B.push({ dur: 66, msg: '«Os corrompidos que precisam da tua luz esperam além do portal.»' });
    B.push({ dur: 1, on: () => B.openMenu() });
  },

  /** A queda da armadura: fim do treino, bênção da Voz. */
  dummyFall(B) {
    B.menu.open = false;
    B.over = true;
    B.push({
      dur: 60, msg: 'Os RESTOS DE ARMADURA se desfazem — as peças tombam da estaca, em paz.',
      on: () => {
        B.E.dissolve = 0.01;
        Sfx.noise({ dur: 0.5, vol: 0.18, fc: 300, fc2: 900, type: 'bandpass', q: 1 });
        Particles.burst(B.EX, B.EY - 40, 16, () => ({
          x: B.EX + U.rand(-22, 22), y: B.EY - U.rand(0, 70),
          vx: U.rand(-1.2, 1.2), vy: U.rand(0.5, 2.4), grav: 0.12,
          life: 40, size: U.rand(2, 3.4), color: 'rgba(150,150,160,0.9)', type: 'spark'
        }));
      },
      upd: () => { B.E.dissolve = Math.min(1, B.E.dissolve + 0.03); }
    });
    B.push({ dur: 88, msg: this.trained
      ? 'A Voz: «Bom treino. A estaca te espera, sempre que precisares.»'
      : 'A Voz: «Estás pronto, guerreiro. Atravessa o portal — e começa a Era de Paz.»' });
    B.push({
      dur: 1, on: () => {
        this.trained = true;
        if (this.armorFoe) this.armorFoe.cool = 90;
        Game.finishBattle('won');
      }
    });
  },

  // ═══════════════════════ desenho ═══════════════════════════

  /** Céu do amanhecer com o palácio arruinado ao fundo. Substitui o fundo. */
  drawSky(ctx, cam, frames) {
    const g = ctx.createLinearGradient(0, 0, 0, 540);
    g.addColorStop(0, '#182034');
    g.addColorStop(0.55, '#3d4152');
    g.addColorStop(1, '#8a7454');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 960, 540);

    const sunX = 760 - cam.x * 0.05, sunY = 300 - (cam.y - 970) * 0.08;
    const sun = ctx.createRadialGradient(sunX, sunY, 6, sunX, sunY, 260);
    sun.addColorStop(0, 'rgba(255,226,168,0.5)');
    sun.addColorStop(0.4, 'rgba(230,180,120,0.16)');
    sun.addColorStop(1, 'rgba(230,180,120,0)');
    ctx.fillStyle = sun;
    ctx.fillRect(0, 0, 960, 540);

    // o palácio distante em silhueta — pagode partido
    ctx.save();
    ctx.translate(-cam.x * 0.16, -(cam.y - 970) * 0.1);
    ctx.fillStyle = 'rgba(26,30,42,0.85)';
    const pag = (bx, by, w, tiers, brokenTop) => {
      for (let i = 0; i < tiers; i++) {
        const tw = w - i * (w / (tiers + 1));
        const ty = by - i * 46;
        if (brokenTop && i === tiers - 1) {
          ctx.beginPath();
          ctx.moveTo(bx - tw / 2, ty);
          ctx.lineTo(bx - tw / 6, ty - 30);
          ctx.lineTo(bx + tw / 4, ty - 12);
          ctx.lineTo(bx + tw / 2, ty);
          ctx.closePath(); ctx.fill();
          break;
        }
        ctx.fillRect(bx - tw / 2, ty - 34, tw, 34);
        ctx.beginPath();
        ctx.moveTo(bx - tw / 2 - 16, ty - 34);
        ctx.quadraticCurveTo(bx, ty - 52, bx + tw / 2 + 16, ty - 34);
        ctx.lineTo(bx + tw / 2, ty - 28);
        ctx.lineTo(bx - tw / 2, ty - 28);
        ctx.closePath(); ctx.fill();
      }
    };
    pag(430, 430, 220, 4, true);
    pag(700, 445, 150, 3, false);
    pag(190, 440, 120, 2, true);
    ctx.fillStyle = 'rgba(30,34,46,0.7)';
    ctx.beginPath();
    ctx.moveTo(-100, 460);
    for (let x = -100; x < 1200; x += 60) {
      ctx.lineTo(x, 440 + ((x * 7919) % 100 > 55 ? 22 : 0));
      ctx.lineTo(x + 30, 436);
    }
    ctx.lineTo(1200, 540); ctx.lineTo(-100, 540);
    ctx.closePath(); ctx.fill();
    ctx.restore();

    for (let i = 0; i < 3; i++) {
      const my = 350 + i * 60 - (cam.y - 970) * 0.15;
      const drift = (frames * (0.1 + i * 0.06)) % 1200 - 120;
      const mg = ctx.createLinearGradient(0, my, 0, my + 46);
      mg.addColorStop(0, 'rgba(190,186,160,0)');
      mg.addColorStop(0.5, `rgba(190,186,160,${0.10 - i * 0.02})`);
      mg.addColorStop(1, 'rgba(190,186,160,0)');
      ctx.fillStyle = mg;
      ctx.fillRect(-drift * 0.3, my, 1400, 46);
    }
  },

  /** Uma moita de mato (camadas de verde, balançando de leve). */
  _bush(ctx, x, gy, s, frames) {
    const sway = Math.sin(frames * 0.03 + x) * 1.5;
    ctx.save();
    ctx.translate(x, gy);
    ctx.scale(s, s);
    ctx.fillStyle = 'rgba(38,58,36,0.95)';
    ctx.beginPath(); ctx.ellipse(0, -10, 26, 14, 0, 0, 7); ctx.fill();
    ctx.fillStyle = 'rgba(58,86,48,0.9)';
    ctx.beginPath(); ctx.ellipse(-8 + sway * 0.4, -16, 16, 10, 0, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.ellipse(10 + sway * 0.4, -14, 13, 9, 0, 0, 7); ctx.fill();
    ctx.fillStyle = 'rgba(96,138,76,0.8)';
    ctx.beginPath(); ctx.ellipse(2 + sway, -21, 9, 6, 0, 0, 7); ctx.fill();
    // hastes altas saindo da moita
    ctx.strokeStyle = 'rgba(88,116,66,0.85)';
    ctx.lineWidth = 1.4;
    for (let b = -2; b <= 2; b++) {
      ctx.beginPath();
      ctx.moveTo(b * 8, -6);
      ctx.quadraticCurveTo(b * 8 + sway, -26, b * 8 + sway * 1.6 + b, -34 - Math.abs(b) * -4);
      ctx.stroke();
    }
    ctx.restore();
  },

  /** Tufos de capim ao longo de uma superfície. */
  _grassRun(ctx, x0, x1, gy, frames, cam) {
    ctx.strokeStyle = 'rgba(96,128,72,0.75)';
    ctx.lineWidth = 1.3;
    for (let x = x0; x < x1; x += 46) {
      const h = 8 + ((x * 2654435761) % 11);
      const sway = Math.sin(frames * 0.04 + x * 0.13) * 2.2;
      for (let b = 0; b < 3; b++) {
        ctx.beginPath();
        ctx.moveTo(x + b * 4, gy);
        ctx.quadraticCurveTo(x + b * 4 + sway * 0.5, gy - h * 0.6, x + b * 4 + sway + (b - 1) * 2, gy - h - b * 2);
        ctx.stroke();
      }
    }
  },

  /** Uma vinha pendurada com folhas, balançando. */
  _vine(ctx, v, frames) {
    const sway = Math.sin(frames * 0.025 + v.phase) * (3 + v.len * 0.04);
    ctx.strokeStyle = 'rgba(74,104,62,0.9)';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(v.x, v.topY);
    ctx.quadraticCurveTo(v.x + sway * 0.4, v.topY + v.len * 0.55, v.x + sway, v.topY + v.len);
    ctx.stroke();
    // folhinhas alternadas
    ctx.fillStyle = 'rgba(96,138,76,0.85)';
    for (let i = 1; i < 5; i++) {
      const t = i / 5;
      const lx = v.x + sway * t * t;
      const ly = v.topY + v.len * t;
      const side = i % 2 ? 1 : -1;
      ctx.beginPath();
      ctx.ellipse(lx + side * 4, ly, 4.5, 2.2, side * 0.6, 0, 7);
      ctx.fill();
    }
  },

  /** O corpo caído — o próprio guerreiro, apagado, sem brilho.
   *  Mesma escala do jogador em campo (1.05) — é ELE, do tamanho dele. */
  drawFallenBody(ctx, frames, alpha) {
    if (alpha <= 0) return;
    const b = this.BODY;
    // sombra fria sob o corpo
    ctx.save();
    ctx.globalAlpha = alpha * 0.5;
    ctx.fillStyle = 'rgba(8,12,20,0.8)';
    ctx.beginPath();
    ctx.ellipse(b.x - 2, b.y - 2, 26, 5, 0, 0, 7);
    ctx.fill();
    ctx.restore();
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(b.x - 9, b.y - 4);
    ctx.rotate(-Math.PI / 2 + 0.1);          // deitado de costas no chão
    try { ctx.filter = 'grayscale(0.92) brightness(0.48)'; } catch (e) { /* sem filtro */ }
    if (typeof drawLightSamurai === 'function') {
      drawLightSamurai(ctx, 0, 0, 1.05, { facing: 1, pose: 'idle', t: 30 });
    }
    try { ctx.filter = 'none'; } catch (e) { /* sem filtro */ }
    ctx.restore();
    // a katana da luz caída ao lado, ainda com um fio de brilho
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(b.x + 22, b.y - 3);
    ctx.rotate(0.26);
    ctx.strokeStyle = 'rgba(210,214,222,0.85)';
    ctx.lineWidth = 1.8;
    ctx.beginPath(); ctx.moveTo(-12, 0); ctx.lineTo(14, 0); ctx.stroke();
    ctx.strokeStyle = 'rgba(120,96,60,0.9)';
    ctx.lineWidth = 2.6;
    ctx.beginPath(); ctx.moveTo(-17, 0); ctx.lineTo(-12, 0); ctx.stroke();
    // o fio de luz que ainda resiste na lâmina
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = `rgba(255,240,190,${0.25 + 0.15 * Math.sin(frames * 0.07)})`;
    ctx.lineWidth = 0.8;
    ctx.beginPath(); ctx.moveTo(-10, -1); ctx.lineTo(12, -1); ctx.stroke();
    ctx.restore();
  },

  /** Os Restos de Armadura pendurados na estaca de madeira. */
  drawArmorStand(ctx, frames) {
    const a = this.ARMOR;
    const beaten = this.armorFoe && this.armorFoe.dead;
    const creak = Math.sin(frames * 0.02 + 2) * 0.015;
    ctx.save();
    ctx.translate(a.x, a.y);
    ctx.rotate(beaten ? 0.05 : creak);

    // a estaca e a travessa
    ctx.fillStyle = '#4a3c2c';
    ctx.fillRect(-4, -118, 8, 118);
    ctx.fillRect(-34, -96, 68, 7);
    // corda desbotada
    ctx.strokeStyle = 'rgba(150,130,90,0.7)';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(0, -118); ctx.lineTo(0, -96); ctx.stroke();

    if (!beaten) {
      // kabuto no topo
      ctx.fillStyle = '#3c4250';
      ctx.beginPath();
      ctx.arc(0, -104, 12, Math.PI, 0);
      ctx.lineTo(13, -100); ctx.lineTo(-13, -100);
      ctx.closePath(); ctx.fill();
      ctx.strokeStyle = 'rgba(255,214,120,0.85)';
      ctx.lineWidth = 2.2;
      ctx.beginPath(); ctx.arc(0, -116, 7, Math.PI * 0.15, Math.PI * 0.85, true); ctx.stroke();
      // dō (peitoral) pendurado na travessa
      const dg = ctx.createLinearGradient(-18, -92, 18, -50);
      dg.addColorStop(0, '#4c5364');
      dg.addColorStop(0.5, '#6b7386');
      dg.addColorStop(1, '#3a4150');
      ctx.fillStyle = dg;
      ctx.beginPath();
      ctx.moveTo(-17, -92);
      ctx.lineTo(17, -92);
      ctx.lineTo(14, -54);
      ctx.lineTo(-14, -54);
      ctx.closePath(); ctx.fill();
      // lamelas horizontais
      ctx.strokeStyle = 'rgba(24,28,36,0.6)';
      ctx.lineWidth = 1.2;
      for (let i = 1; i < 4; i++) {
        ctx.beginPath(); ctx.moveTo(-16 + i, -92 + i * 10); ctx.lineTo(16 - i, -92 + i * 10); ctx.stroke();
      }
      // sode (ombreiras) pendendo da travessa
      for (const side of [-1, 1]) {
        ctx.fillStyle = '#454c5c';
        ctx.save();
        ctx.translate(side * 26, -92);
        ctx.rotate(side * (0.12 + creak * 3));
        ctx.fillRect(-7, 0, 14, 22);
        ctx.restore();
      }
      // kusazuri (saiote) em placas
      ctx.fillStyle = '#414858';
      for (let i = -1; i <= 1; i++) {
        ctx.save();
        ctx.translate(i * 10, -54);
        ctx.rotate(i * 0.12);
        ctx.fillRect(-5, 0, 10, 16);
        ctx.restore();
      }
      // musgo tomando a armadura
      ctx.fillStyle = 'rgba(104,158,96,0.5)';
      ctx.fillRect(-17, -92, 12, 4);
      ctx.fillRect(6, -70, 9, 3);
    } else {
      // derrotada: as peças tombadas ao pé da estaca
      ctx.fillStyle = '#3c4250';
      ctx.beginPath(); ctx.arc(-16, -6, 10, Math.PI, 0); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#4c5364';
      ctx.save(); ctx.translate(10, -8); ctx.rotate(0.5); ctx.fillRect(-13, -8, 26, 16); ctx.restore();
      ctx.fillStyle = '#454c5c';
      ctx.fillRect(24, -6, 12, 6);
    }
    ctx.restore();
  },

  /** Arquitetura + vegetação do jardim. */
  drawDecor(ctx, cam, frames) {
    ctx.save();
    ctx.translate(-cam.x, -cam.y);

    // ── colunatas (musgo e hera por toda parte) ──
    const cols = [
      { x: 150,  gy: 1300, h: 240, broken: 0.4 }, { x: 360,  gy: 1300, h: 300, broken: 0 },
      { x: 830,  gy: 1300, h: 210, broken: 0.55 }, { x: 1210, gy: 1300, h: 260, broken: 0.3 },
      { x: 1470, gy: 1300, h: 320, broken: 0 },   { x: 1740, gy: 1120, h: 280, broken: 0.5 },
      { x: 1990, gy: 1120, h: 340, broken: 0 },   { x: 2330, gy: 1120, h: 250, broken: 0.35 }
    ];
    for (const c of cols) {
      const top = c.gy - c.h * (1 - c.broken * 0.6);
      const w = 34;
      const grad = ctx.createLinearGradient(c.x - w / 2, 0, c.x + w / 2, 0);
      grad.addColorStop(0, '#4a5148');
      grad.addColorStop(0.45, '#7d8574');
      grad.addColorStop(1, '#3f463e');
      ctx.fillStyle = grad;
      ctx.fillRect(c.x - w / 2, top, w, c.gy - top);
      ctx.fillStyle = '#5c6456';
      ctx.fillRect(c.x - w / 2 - 6, c.gy - 12, w + 12, 12);
      if (c.broken === 0) {
        ctx.fillRect(c.x - w / 2 - 6, top - 10, w + 12, 10);
      } else {
        ctx.fillStyle = '#39403a';
        ctx.beginPath();
        ctx.moveTo(c.x - w / 2, top);
        ctx.lineTo(c.x + w / 2, top + 14);
        ctx.lineTo(c.x + w / 2, top);
        ctx.closePath(); ctx.fill();
      }
      // musgo no topo
      ctx.fillStyle = 'rgba(104,158,96,0.55)';
      ctx.fillRect(c.x - w / 2, top + (c.broken ? 14 : 0), w, 8);
      // hera subindo pelo fuste (zigue-zague com folhas)
      ctx.strokeStyle = 'rgba(78,112,64,0.85)';
      ctx.lineWidth = 1.5;
      const ivyH = (c.gy - top) * 0.8;
      ctx.beginPath();
      ctx.moveTo(c.x - 10, c.gy);
      for (let s = 1; s <= 5; s++) {
        ctx.lineTo(c.x - 10 + (s % 2 ? 14 : -6) + Math.sin(c.x + s) * 3, c.gy - ivyH * s / 5);
      }
      ctx.stroke();
      ctx.fillStyle = 'rgba(96,138,76,0.8)';
      for (let s = 1; s <= 4; s++) {
        const ly = c.gy - ivyH * s / 5;
        ctx.beginPath();
        ctx.ellipse(c.x - 8 + (s % 2 ? 10 : -2), ly, 4, 2.2, 0.5, 0, 7);
        ctx.fill();
      }
      // rachadura
      ctx.strokeStyle = 'rgba(24,28,24,0.5)';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(c.x - 6, c.gy - 30);
      ctx.lineTo(c.x + 4, c.gy - c.h * 0.4);
      ctx.stroke();
    }

    // coluna tombada diante da fenda, engolida por trepadeiras
    ctx.save();
    ctx.translate(960, 1296);
    ctx.rotate(0.24);
    ctx.fillStyle = '#6d7566';
    ctx.fillRect(-110, -14, 220, 28);
    ctx.fillStyle = 'rgba(104,158,96,0.5)';
    ctx.fillRect(-110, -14, 220, 6);
    ctx.strokeStyle = 'rgba(78,112,64,0.8)';
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.moveTo(-90 + i * 70, 14);
      ctx.quadraticCurveTo(-70 + i * 70, -6, -50 + i * 70, -18);
      ctx.stroke();
    }
    ctx.restore();

    // ── lanternas de pedra com chama espiritual ──
    for (const [lx, gy] of [[240, 1300], [1400, 1300], [1890, 1120], [2180, 1120]]) {
      ctx.fillStyle = '#59614f';
      ctx.fillRect(lx - 5, gy - 34, 10, 34);
      ctx.fillRect(lx - 14, gy - 46, 28, 12);
      ctx.beginPath();
      ctx.moveTo(lx - 18, gy - 46);
      ctx.quadraticCurveTo(lx, gy - 60, lx + 18, gy - 46);
      ctx.closePath(); ctx.fill();
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const fl = 0.6 + 0.4 * Math.sin(frames * 0.11 + lx);
      const lg = ctx.createRadialGradient(lx, gy - 40, 1, lx, gy - 40, 26);
      lg.addColorStop(0, `rgba(255,214,140,${0.5 * fl})`);
      lg.addColorStop(1, 'rgba(255,214,140,0)');
      ctx.fillStyle = lg;
      ctx.beginPath(); ctx.arc(lx, gy - 40, 26, 0, 7); ctx.fill();
      ctx.restore();
    }

    // ── restos da guerra ──
    ctx.strokeStyle = 'rgba(74,64,50,0.9)';
    ctx.lineWidth = 3;
    for (const [sx, gy, tilt] of [[720, 1300, -0.2], [1330, 1300, 0.14], [2020, 1120, 0.2]]) {
      ctx.save();
      ctx.translate(sx, gy);
      ctx.rotate(tilt);
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -74); ctx.stroke();
      ctx.fillStyle = 'rgba(150,152,158,0.85)';
      ctx.beginPath(); ctx.moveTo(-3, -74); ctx.lineTo(0, -90); ctx.lineTo(3, -74); ctx.closePath(); ctx.fill();
      ctx.restore();
    }
    for (const [bx, gy] of [[560, 1300], [1660, 1300]]) {
      ctx.strokeStyle = 'rgba(64,56,44,0.9)';
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(bx, gy); ctx.lineTo(bx, gy - 110); ctx.stroke();
      const wav = Math.sin(frames * 0.05 + bx) * 8;
      ctx.fillStyle = 'rgba(120,84,74,0.8)';
      ctx.beginPath();
      ctx.moveTo(bx, gy - 108);
      ctx.lineTo(bx + 40, gy - 104 + wav * 0.4);
      ctx.lineTo(bx + 30, gy - 84 + wav * 0.7);
      ctx.lineTo(bx + 38, gy - 60 + wav);
      ctx.lineTo(bx, gy - 68);
      ctx.closePath(); ctx.fill();
    }
    ctx.strokeStyle = 'rgba(70,60,46,0.8)';
    ctx.lineWidth = 2;
    for (const [ax, gy, r] of [[900, 1300, 0.5], [1245, 1300, -0.4], [1420, 1300, 0.3]]) {
      ctx.save(); ctx.translate(ax, gy); ctx.rotate(r);
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -26); ctx.stroke();
      ctx.restore();
    }

    // ── vegetação que consome tudo: capim, moitas e vinhas ──
    this._grassRun(ctx, 20, 990, 1300, frames, cam);
    this._grassRun(ctx, 1160, 1670, 1300, frames, cam);
    this._grassRun(ctx, 1690, 2390, 1120, frames, cam);
    this._grassRun(ctx, 1010, 1140, 1430, frames, cam);
    for (const b of this.bushes) this._bush(ctx, b.x, b.gy, b.s, frames);
    for (const v of this.vines) this._vine(ctx, v, frames);

    // ── o corpo caído (cutscene) ou a marca de luz que ele deixou ──
    if (this.cut) {
      const alpha = this.cut.phase === 'rise' ? Math.max(0, 1 - this.cut.riseT / 40) : 1;
      this.drawFallenBody(ctx, frames, alpha);
    } else {
      // a silhueta de luz onde o guerreiro renasceu
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const ip = 0.5 + 0.5 * Math.sin(frames * 0.05);
      const ig = ctx.createRadialGradient(this.BODY.x, this.BODY.y - 4, 2, this.BODY.x, this.BODY.y - 4, 40);
      ig.addColorStop(0, `rgba(255,238,190,${0.10 + 0.06 * ip})`);
      ig.addColorStop(1, 'rgba(255,238,190,0)');
      ctx.fillStyle = ig;
      ctx.beginPath();
      ctx.ellipse(this.BODY.x, this.BODY.y - 4, 40, 10, 0, 0, 7);
      ctx.fill();
      ctx.restore();
    }

    // ── os Restos de Armadura na estaca ──
    this.drawArmorStand(ctx, frames);

    // ── as pedras-escritura ──
    for (const s of this.stones) {
      ctx.save();
      ctx.translate(s.x, s.y);
      const sg = ctx.createLinearGradient(-18, -52, 18, 0);
      sg.addColorStop(0, '#666e60');
      sg.addColorStop(1, '#454c42');
      ctx.fillStyle = sg;
      ctx.beginPath();
      ctx.moveTo(-17, 0);
      ctx.lineTo(-15, -40);
      ctx.quadraticCurveTo(0, -56, 15, -40);
      ctx.lineTo(17, 0);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(104,158,96,0.6)';
      ctx.fillRect(-17, -6, 34, 6);
      const unread = !s.read;
      ctx.fillStyle = unread
        ? `rgba(255,230,160,${0.75 + 0.25 * Math.sin(frames * 0.09 + s.x)})`
        : 'rgba(210,214,200,0.55)';
      ctx.font = '700 20px serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(s.kanji, 0, -28);
      if (unread) {
        ctx.globalCompositeOperation = 'lighter';
        const gl = ctx.createRadialGradient(0, -28, 2, 0, -28, 24);
        gl.addColorStop(0, 'rgba(255,230,160,0.25)');
        gl.addColorStop(1, 'rgba(255,230,160,0)');
        ctx.fillStyle = gl;
        ctx.beginPath(); ctx.arc(0, -28, 24, 0, 7); ctx.fill();
      }
      ctx.restore();
    }

    // ── o portal para o Reino da Água ──
    const po = this.PORTAL;
    ctx.save();
    ctx.translate(po.x, po.y);
    ctx.fillStyle = '#3d4a58';
    ctx.fillRect(-34, -96, 10, 96);
    ctx.fillRect(24, -96, 10, 96);
    ctx.fillRect(-44, -100, 88, 10);
    ctx.beginPath();
    ctx.moveTo(-52, -112);
    ctx.quadraticCurveTo(0, -124, 52, -112);
    ctx.lineTo(48, -102);
    ctx.quadraticCurveTo(0, -112, -48, -102);
    ctx.closePath(); ctx.fill();
    ctx.globalCompositeOperation = 'lighter';
    const shimmer = 0.5 + 0.5 * Math.sin(frames * 0.07);
    const pv = ctx.createLinearGradient(0, -96, 0, 0);
    pv.addColorStop(0, `rgba(140,215,255,${0.16 + 0.1 * shimmer})`);
    pv.addColorStop(0.5, `rgba(100,190,240,${0.30 + 0.12 * shimmer})`);
    pv.addColorStop(1, 'rgba(140,215,255,0.10)');
    ctx.fillStyle = pv;
    ctx.fillRect(-24, -96, 48, 96);
    ctx.strokeStyle = `rgba(190,235,255,${0.25 + 0.2 * shimmer})`;
    ctx.lineWidth = 1.4;
    for (let i = 0; i < 3; i++) {
      const wy = -80 + i * 28 + Math.sin(frames * 0.06 + i * 2) * 5;
      ctx.beginPath();
      ctx.moveTo(-22, wy);
      ctx.quadraticCurveTo(0, wy + 6, 22, wy);
      ctx.stroke();
    }
    ctx.fillStyle = `rgba(200,240,255,${0.75 + 0.25 * shimmer})`;
    ctx.font = '700 22px serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('水', 0, -48);
    if (Math.random() < 0.3) {
      Particles.spawn({
        x: po.x + U.rand(-20, 20), y: po.y - U.rand(0, 80),
        vx: 0, vy: U.rand(-0.7, -0.3), life: 50, size: 1.6,
        color: 'rgba(150,220,255,0.8)', type: 'orb'
      });
    }
    ctx.restore();

    ctx.restore();
  },

  /** Overlays: prompts, painel de leitura, capim frontal e a cutscene. */
  drawFront(ctx, cam, frames, player) {
    // capim mais alto em primeiro plano (profundidade)
    ctx.save();
    ctx.translate(-cam.x, -cam.y);
    ctx.strokeStyle = 'rgba(46,66,40,0.9)';
    ctx.lineWidth = 2;
    for (const fx of [90, 470, 905, 1310, 1605, 1855, 2290]) {
      const gy = fx >= 1680 ? 1122 : (fx >= 1000 && fx < 1150 ? 1432 : 1302);
      const sway = Math.sin(frames * 0.045 + fx) * 3;
      for (let b = 0; b < 4; b++) {
        ctx.beginPath();
        ctx.moveTo(fx + b * 5, gy);
        ctx.quadraticCurveTo(fx + b * 5 + sway * 0.6, gy - 12, fx + b * 5 + sway + (b - 1.5) * 3, gy - 20 - (b % 2) * 6);
        ctx.stroke();
      }
    }
    ctx.restore();

    // prompts de interação
    if (!this.cut && !this.reading) {
      if (this.nearStone) this._prompt(ctx, this.nearStone.x - cam.x, this.nearStone.y - 78 - cam.y, '↑ Ler', frames);
      if (this.nearArmor && (!this.armorFoe || this.armorFoe.cool <= 0)) {
        this._prompt(ctx, this.ARMOR.x - cam.x, this.ARMOR.y - 138 - cam.y, 'X / J — Treinar', frames);
      }
      if (this.nearPortal) this._prompt(ctx, this.PORTAL.x - cam.x, this.PORTAL.y - 132 - cam.y, '↓ Atravessar', frames);
    }

    if (this.reading) this._readingPanel(ctx, this.reading, frames);
    if (this.cut) this._cutOverlay(ctx, cam, frames);
  },

  _prompt(ctx, x, y, txt, frames) {
    const bob = Math.sin(frames * 0.1) * 3;
    ctx.save();
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = '600 12px "Segoe UI", sans-serif';
    const w = ctx.measureText(txt).width + 16;
    ctx.fillStyle = 'rgba(8,12,20,0.72)';
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(x - w / 2, y - 10 + bob, w, 20, 6);
    else ctx.rect(x - w / 2, y - 10 + bob, w, 20);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,236,190,0.95)';
    ctx.fillText(txt, x, y + bob);
    ctx.restore();
  },

  _readingPanel(ctx, s, frames) {
    ctx.save();
    ctx.fillStyle = 'rgba(4,8,14,0.62)';
    ctx.fillRect(0, 0, 960, 540);
    const w = 520, h = 96 + s.lines.length * 24, px = 480 - w / 2, py = 270 - h / 2;
    const pg = ctx.createLinearGradient(0, py, 0, py + h);
    pg.addColorStop(0, '#2a3030');
    pg.addColorStop(1, '#1a2020');
    ctx.fillStyle = pg;
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(px, py, w, h, 10); else ctx.rect(px, py, w, h);
    ctx.fill();
    ctx.strokeStyle = 'rgba(180,200,170,0.35)';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(255,230,160,0.9)';
    ctx.font = '700 30px serif';
    ctx.fillText(s.kanji, 480, py + 34);
    ctx.fillStyle = '#d8e2cc';
    ctx.font = '600 15px "Yu Mincho", "Segoe UI", serif';
    ctx.fillText(s.title, 480, py + 62);
    ctx.fillStyle = '#c2cbb6';
    ctx.font = '13px "Segoe UI", sans-serif';
    for (let i = 0; i < s.lines.length; i++) {
      ctx.fillText(s.lines[i], 480, py + 88 + i * 24);
    }
    if (Math.sin(frames * 0.08) > -0.2) {
      ctx.fillStyle = 'rgba(200,215,240,0.7)';
      ctx.font = '11px "Segoe UI", sans-serif';
      ctx.fillText('ENTER para fechar', 480, py + h - 14);
    }
    ctx.restore();
  },

  _cutOverlay(ctx, cam, frames) {
    const c = this.cut;
    const bp = { x: this.BODY.x - cam.x, y: this.BODY.y - cam.y };
    ctx.save();

    const dark = c.phase === 'rise' ? Math.max(0, 0.5 - c.riseT / 150) : 0.5;
    ctx.fillStyle = `rgba(6,10,18,${dark})`;
    ctx.fillRect(0, 0, 960, 540);

    // ── o círculo ancestral gravado no chão sob o corpo ──
    if (c.circle > 0) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = c.circle;
      const spin = frames * 0.008;
      const pulse = 0.8 + 0.2 * Math.sin(frames * 0.06);
      for (const [r, lw, al] of [[46, 1.6, 0.5], [34, 1.1, 0.4], [58, 0.8, 0.25]]) {
        ctx.strokeStyle = `rgba(255,238,180,${al * pulse})`;
        ctx.lineWidth = lw;
        ctx.beginPath();
        ctx.ellipse(bp.x, bp.y - 2, r * c.circle, r * 0.24 * c.circle, 0, 0, 7);
        ctx.stroke();
      }
      // marcas rúnicas girando no anel externo
      ctx.fillStyle = `rgba(255,240,190,${0.55 * pulse})`;
      ctx.font = '700 9px serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      for (let i = 0; i < 8; i++) {
        const a = spin + i * Math.PI / 4;
        ctx.fillText('光浄魂天'[i % 4],
          bp.x + Math.cos(a) * 52 * c.circle,
          bp.y - 2 + Math.sin(a) * 12.5 * c.circle);
      }
      ctx.restore();
    }

    // ── o feixe de luz que desce sobre o corpo ──
    let beamK = 0;
    if (c.phase === 'beam') beamK = U.clamp((c.t - 45) / 55, 0, 1);
    else if (c.phase === 'lines' || c.phase === 'rise') beamK = 1;
    if (beamK > 0) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const reach = beamK * (bp.y - 6);
      const wTop = 90, wBot = 34;
      const bg = ctx.createLinearGradient(0, 0, 0, bp.y);
      bg.addColorStop(0, 'rgba(255,240,200,0.05)');
      bg.addColorStop(0.7, `rgba(255,238,190,${0.16 * beamK})`);
      bg.addColorStop(1, `rgba(255,236,180,${0.30 * beamK})`);
      ctx.fillStyle = bg;
      ctx.beginPath();
      ctx.moveTo(bp.x - wTop / 2, -10);
      ctx.lineTo(bp.x + wTop / 2, -10);
      ctx.lineTo(bp.x + wBot / 2, reach);
      ctx.lineTo(bp.x - wBot / 2, reach);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = `rgba(255,248,220,${0.20 * beamK})`;
      ctx.beginPath();
      ctx.moveTo(bp.x - 12, -10);
      ctx.lineTo(bp.x + 12, -10);
      ctx.lineTo(bp.x + 5, reach);
      ctx.lineTo(bp.x - 5, reach);
      ctx.closePath(); ctx.fill();
      // o corpo aceso pela luz
      if (beamK > 0.95) {
        const flash = c.phase === 'beam' ? U.clamp((c.t - 100) / 20, 0, 1) : 1;
        const hg = ctx.createRadialGradient(bp.x, bp.y - 8, 2, bp.x, bp.y - 8, 64);
        hg.addColorStop(0, `rgba(255,244,200,${0.45 * flash})`);
        hg.addColorStop(1, 'rgba(255,244,200,0)');
        ctx.fillStyle = hg;
        ctx.beginPath();
        ctx.ellipse(bp.x, bp.y - 8, 64, 30, 0, 0, 7);
        ctx.fill();

        // veias de luz rastejando pelo corpo apagado
        if (flash > 0.3 && c.phase !== 'rise') {
          const vp = 0.5 + 0.5 * Math.sin(frames * 0.12);
          ctx.strokeStyle = `rgba(255,242,190,${(0.3 + 0.35 * vp) * flash})`;
          ctx.lineWidth = 1;
          for (const [x0, y0, x1, y1, x2, y2] of [
            [-20, -3, -8, -8, 4, -4], [2, -9, 10, -3, 18, -7], [-12, -2, -2, -5, 8, -9]
          ]) {
            ctx.beginPath();
            ctx.moveTo(bp.x + x0, bp.y + y0);
            ctx.quadraticCurveTo(bp.x + x1, bp.y + y1, bp.x + x2, bp.y + y2);
            ctx.stroke();
          }
        }
      }
      ctx.restore();
    }

    // ── o clarão da ignição ──
    if (c.flash > 0.02) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = `rgba(255,248,228,${c.flash * 0.55})`;
      ctx.fillRect(0, 0, 960, 540);
      ctx.restore();
    }

    // ── letterbox de cinema (desliza para dentro e para fora) ──
    let barH = 56;
    if (c.phase === 'fade') barH = 56 * U.clamp(c.t / 36, 0, 1);
    else if (c.phase === 'rise') barH = 56 * Math.max(0, 1 - c.riseT / 55);
    if (barH > 0.5) {
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, 960, barH);
      ctx.fillRect(0, 540 - barH, 960, barH);
    }
    // vinheta suave concentrando o olhar
    const vg = ctx.createRadialGradient(480, 300, 200, 480, 300, 560);
    vg.addColorStop(0, 'rgba(0,0,0,0)');
    vg.addColorStop(1, `rgba(0,0,0,${0.32 * (barH / 56)})`);
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, 960, 540);

    // ── as falas da Voz ──
    if (c.phase === 'lines') {
      const a = U.clamp(c.lineT / 30, 0, 1);
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.save();
      ctx.globalAlpha = a;
      ctx.fillStyle = '#f4e6c4';
      ctx.font = '600 21px "Yu Mincho", "Segoe UI", serif';
      ctx.shadowColor = 'rgba(0,0,0,0.8)'; ctx.shadowBlur = 8;
      ctx.fillText(this.voiceLines[c.line], 480, 430);
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#c8b890';
      ctx.font = 'italic 13px "Segoe UI", sans-serif';
      ctx.fillText('— a Voz da Aurora', 480, 460);
      ctx.restore();
      if (c.lineT > 40 && Math.sin(frames * 0.08) > -0.2) {
        ctx.fillStyle = 'rgba(200,215,240,0.75)';
        ctx.font = '12px "Segoe UI", sans-serif';
        ctx.fillText('ENTER', 480, 508);
      }
    }

    if (c.phase === 'fade' || c.t < 60) {
      const f = c.phase === 'fade' ? 1 - c.t / 45 : Math.max(0, 1 - c.t / 60);
      ctx.fillStyle = `rgba(0,0,0,${U.clamp(f, 0, 1)})`;
      ctx.fillRect(0, 0, 960, 540);
    }
    ctx.restore();
  },

  /** Sprite dos Restos de Armadura em batalha: armadura oca, flutuando. */
  drawArmorHuskBattle(ctx, x, y, s, o) {
    const t = o.t || 0;
    const bob = Math.sin(t * 0.05) * 3;
    const pose = o.pose || 'idle';
    const lunge = pose === 'attack' ? -14 : 0;
    const spread = pose === 'magic' ? 8 : 0;
    const rattle = pose === 'hurt' ? Math.sin(t * 1.4) * 3 : 0;
    ctx.save();
    ctx.globalAlpha = (o.alpha !== undefined ? o.alpha : 1);
    ctx.translate(x + lunge + rattle, y + bob);
    ctx.scale(s * 0.92, s * 0.92);

    // aura de reivindicação (quando enfraquecida)
    if (o.aura > 0) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const ag = ctx.createRadialGradient(0, -46, 4, 0, -46, 70);
      ag.addColorStop(0, `rgba(${o.auraCol || '255,236,180'},${0.20 * o.aura})`);
      ag.addColorStop(1, `rgba(${o.auraCol || '255,236,180'},0)`);
      ctx.fillStyle = ag;
      ctx.beginPath(); ctx.arc(0, -46, 70, 0, 7); ctx.fill();
      ctx.restore();
    }

    // fio de luz que mantém as peças unidas
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = `rgba(255,238,180,${0.25 + 0.15 * Math.sin(t * 0.1)})`;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(0, -86);
    ctx.lineTo(0, -12);
    ctx.stroke();
    ctx.restore();

    // kusazuri (saiote) flutuando
    ctx.fillStyle = '#414858';
    for (let i = -1; i <= 1; i++) {
      ctx.save();
      ctx.translate(i * (11 + spread), -26 + Math.sin(t * 0.07 + i) * 2);
      ctx.rotate(i * 0.14);
      ctx.fillRect(-6, 0, 12, 18);
      ctx.restore();
    }
    // dō (peitoral)
    const dg = ctx.createLinearGradient(-20, -70, 20, -26);
    dg.addColorStop(0, '#4c5364');
    dg.addColorStop(0.5, '#6b7386');
    dg.addColorStop(1, '#3a4150');
    ctx.fillStyle = dg;
    ctx.beginPath();
    ctx.moveTo(-19, -70);
    ctx.lineTo(19, -70);
    ctx.lineTo(15, -28);
    ctx.lineTo(-15, -28);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(24,28,36,0.6)';
    ctx.lineWidth = 1.4;
    for (let i = 1; i < 4; i++) {
      ctx.beginPath(); ctx.moveTo(-18 + i, -70 + i * 11); ctx.lineTo(18 - i, -70 + i * 11); ctx.stroke();
    }
    // sode (ombreiras) flutuando afastadas do corpo
    for (const side of [-1, 1]) {
      ctx.save();
      ctx.translate(side * (26 + spread), -66 + Math.sin(t * 0.06 + side) * 2.5);
      ctx.rotate(side * 0.2);
      ctx.fillStyle = '#454c5c';
      ctx.fillRect(-8, 0, 16, 24);
      ctx.strokeStyle = 'rgba(24,28,36,0.5)';
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(-7, 8); ctx.lineTo(7, 8); ctx.stroke();
      ctx.restore();
    }
    // kabuto flutuando sobre o vazio (sem cabeça)
    ctx.save();
    ctx.translate(0, -88 + Math.sin(t * 0.08) * 2.5);
    ctx.fillStyle = '#3c4250';
    ctx.beginPath();
    ctx.arc(0, 0, 14, Math.PI, 0);
    ctx.lineTo(15, 5); ctx.lineTo(-15, 5);
    ctx.closePath(); ctx.fill();
    for (const side of [-1, 1]) {
      ctx.fillStyle = '#4a5162';
      ctx.beginPath();
      ctx.moveTo(side * 13, -5); ctx.lineTo(side * 22, 3); ctx.lineTo(side * 13, 5);
      ctx.closePath(); ctx.fill();
    }
    ctx.strokeStyle = 'rgba(255,214,120,0.9)';
    ctx.lineWidth = 2.4;
    ctx.beginPath(); ctx.arc(0, -11, 8, Math.PI * 0.15, Math.PI * 0.85, true); ctx.stroke();
    // o vazio sob o kabuto
    ctx.fillStyle = 'rgba(10,12,18,0.85)';
    ctx.beginPath();
    ctx.ellipse(0, 6, 10, 5, 0, 0, 7);
    ctx.fill();
    ctx.restore();

    // espelho de luz no peito durante o Reflexo
    if (pose === 'magic') {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const mg = ctx.createRadialGradient(0, -50, 1, 0, -50, 30);
      mg.addColorStop(0, 'rgba(255,244,200,0.8)');
      mg.addColorStop(1, 'rgba(255,244,200,0)');
      ctx.fillStyle = mg;
      ctx.beginPath(); ctx.arc(0, -50, 30, 0, 7); ctx.fill();
      ctx.restore();
    }

    // flash de dano
    if (o.flash > 0) {
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = `rgba(255,255,255,${o.flash / 8 * 0.5})`;
      ctx.fillRect(-30, -104, 60, 100);
    }
    ctx.restore();
  }
};

window.AncientGarden = AncientGarden;

// ───────────────────── instalação por wrapping ─────────────────────
(function () {
  const AG = AncientGarden;

  // 0) o mapa e a ficha do adversário de treino
  World.maps.jardim = AG.map;
  if (typeof TIERS !== 'undefined') {
    TIERS[AG.DUMMY_TIER] = {
      name: 'Restos de Armadura', short: 'a armadura', hp: 20,
      soco: 1, mare: 1, xp: 5, kanji: '鎧', element: 'agua'
    };
  }

  // 1) largura do mundo por mapa
  const _load = World.load;
  World.load = function (id) {
    _load.call(this, id);
    if (id === 'jardim') {
      if (!this._preGardenWidth) this._preGardenWidth = this.width;
      this.width = AG.WIDTH;
    } else if (this._preGardenWidth) {
      this.width = this._preGardenWidth;
      this._preGardenWidth = null;
    }
  };

  // 2) paleta própria do jardim
  const _pal = World.palette;
  World.palette = function (x, y) {
    if (this.current === 'jardim') return AG.palette;
    return _pal.call(this, x, y);
  };

  // 3) céu do amanhecer substitui o fundo
  const _bg = World.drawBackground;
  World.drawBackground = function (ctx, cam, frames) {
    if (this.current === 'jardim') { AG.drawSky(ctx, cam, frames); return; }
    _bg.call(this, ctx, cam, frames);
  };

  // 4) decoração do jardim após o mundo base
  const _dw = World.drawWorld;
  World.drawWorld = function (ctx, cam, frames) {
    _dw.call(this, ctx, cam, frames);
    if (this.current === 'jardim') AG.drawDecor(ctx, cam, frames);
  };

  // 5) overlays por cima de tudo
  const _fg = World.drawForeground;
  World.drawForeground = function (ctx, cam, frames, player) {
    _fg.call(this, ctx, cam, frames, player);
    if (this.current === 'jardim') AG.drawFront(ctx, cam, frames, player);
  };

  // 6) o play leva ao jardim: converte o estado 'intro' na cutscene in-world
  const _upd = Game.update;
  Game.update = function () {
    _upd.call(this);
    if (this.state === 'intro') {
      this.state = 'explore';
      AG.beginCutscene(this);
    }
  };

  // 7) cutscene e leitura travam o controle; senão, interações do jardim
  const _exp = Game.exploreUpdate;
  Game.exploreUpdate = function () {
    if (World.current === 'jardim') {
      if (AG.cut) { AG.cutUpdate(this); Hud.update(); return; }
      if (AG.reading) { AG.readingUpdate(this); Hud.update(); return; }
    } else if (AG.cut) {
      // cutscene órfã (o mapa mudou por baixo dela): encerra e devolve a câmera
      AG.cut = null;
      this.cam.targetZoom = 1.0;
      this.cam.targetOffsetX = 0;
      this.cam.targetOffsetY = 0;
    }
    _exp.call(this);
    if (this.state === 'explore' && World.current === 'jardim') AG.update(this);
  };

  // 8) o guerreiro só é visível quando a luz o refaz (fade-in no 'rise')
  const _pd = Player.prototype.draw;
  Player.prototype.draw = function (ctx, cam) {
    if (World.current === 'jardim' && AG.cut) {
      if (AG.cut.phase !== 'rise') return;
      ctx.save();
      ctx.globalAlpha = U.clamp(AG.cut.riseT / 50, 0, 1);
      _pd.call(this, ctx, cam);
      ctx.restore();
      return;
    }
    _pd.call(this, ctx, cam);
  };

  // 9) HUD escondida durante a cutscene
  const _hd = Hud.draw;
  Hud.draw = function (...a) {
    if (AG.cut) return;
    _hd.apply(this, a);
  };

  // ── integração com a batalha (o duelo de treino) ──

  // 10) abertura: a Voz dá a aula no lugar da entrada genérica
  const _bb = Battle.begin;
  Battle.begin = function (fieldEnemy, advantage) {
    _bb.call(this, fieldEnemy, advantage);
    if (fieldEnemy && fieldEnemy.dummy && this.E) {
      this.E.dummy = true;
      AG.battleIntro(this);
    }
  };

  // 11) o turno da armadura é o Reflexo da Luz
  const _et = Battle.enemyTurn;
  Battle.enemyTurn = function () {
    if (this.E && this.E.dummy) return AG.dummyTurn(this);
    _et.call(this);
  };

  // 12) Purificar/Absorver contra o ferro vazio: a Voz corrige, sem custo
  const _ap = Battle.actPurify;
  Battle.actPurify = function () {
    if (this.E && this.E.dummy) return AG.purifyDeny(this);
    _ap.call(this);
  };
  const _aa = Battle.actAbsorb;
  Battle.actAbsorb = function () {
    if (this.E && this.E.dummy) return AG.purifyDeny(this);
    _aa.call(this);
  };

  // 13) a queda da armadura tem o próprio final (sem karma, sem espólio)
  const _ds = Battle.dissolveSequence;
  Battle.dissolveSequence = function () {
    if (this.E && this.E.dummy) return AG.dummyFall(this);
    _ds.call(this);
  };

  // 14) perder para o treino não fere a essência: derrota gentil, sem
  //     Espírito da Luz. (O caminho original roda num callback de wipe —
  //     alternar a flag `spirit` de forma síncrona não funcionaria.)
  const _fb = Game.finishBattle;
  Game.finishBattle = function (outcome) {
    const f = Battle.fieldRef;
    if (f && f.dummy && outcome === 'lost') {
      this.startWipe(() => {
        Battle.active = false;
        this.state = 'explore';
        Particles.clear();
        this.cam.targetZoom = 1.0;
        this.cam.targetOffsetX = 0;
        this.cam.targetOffsetY = 0;
        this.respawn(true);
        this.player.invuln = 90;
        if (f === AG.armorFoe) f.cool = 90;
        Hud.toast('A Voz: «Levanta. O treino ainda não terminou.»', '#ffe9b0');
      });
      return;
    }
    _fb.call(this, outcome);
  };

  // 15) em batalha, a armadura tem o próprio sprite (armadura oca)
  const _dws = window.drawWaterSamurai;
  window.drawWaterSamurai = function (ctx, x, y, s, tier, o = {}) {
    if (tier === AG.DUMMY_TIER) return AG.drawArmorHuskBattle(ctx, x, y, s, o);
    return _dws(ctx, x, y, s, tier, o);
  };
  try { drawWaterSamurai = window.drawWaterSamurai; } catch (e) { /* binding const */ }
})();
