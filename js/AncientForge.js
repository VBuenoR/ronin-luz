'use strict';

/**
 * A ANTIGA FORJA DOS SAMURAIS — leste do Reino do Fogo.
 *
 * À direita do portal de retorno, uma passagem rompe a muralha e leva a uma
 * forja ancestral: fornalha viva, bigorna colossal, chaminé cuspindo brasas.
 *
 *   MISSÃO — «Pegue 5 Metais Lendários espalhados pelos reinos.» Um em cada
 *   reino (o primeiro no buraco do Jardim Antigo) e o último no alto da
 *   própria forja, guardado pelos espíritos.
 *
 *   RECOMPENSA — imbuir a Katana da Escuridão com Metal Lendário: o golpe de
 *   vantagem ao entrar em confronto ganha um SEGUNDO corte (+10% do HP máximo
 *   do inimigo; +5% em chefes — total 25%/15% na entrada).
 *
 *   MORADORES — três Forjados: pequenas brasas disciplinadas dentro de
 *   armaduras samurai vazias. Passam quase todo o duelo em guarda, mas seu
 *   raro GOLPE AVASSALADOR concentra a força da fornalha inteira. Enquanto
 *   defendem, a REVERSÃO MÁGICA recebe o dano de uma magia, armazena o valor
 *   realmente perdido e o devolve amplificado no turno seguinte.
 *
 * Também melhora TODOS os portais do jogo com VFX técnico (vórtice, glifos
 * orbitais, runas de chão, arcos de energia, partículas).
 *
 * Módulo auto-instalável por wrapping.
 */
const AncientForge = {

  ANVIL: { x: 6430, y: 2140 },          // a bigorna colossal (↑ interage)
  DOOR:  { x: 5370, y: 2140 },          // a brecha na muralha
  FORGED_TIERS: [31, 32, 33],
  ROSTER_VERSION: 2,

  questActive: false,
  imbued: false,
  bannerShown: false,

  // um metal por reino; o quinto vive no alto da própria forja
  metals: [
    { id: 'jardim',   map: 'jardim',   x: 1112, y: 1428, taken: false },
    { id: 'floresta', map: 'floresta', x: 1370, y: 1150, taken: false },
    { id: 'fogo',     map: 'fogo',     x: 3700, y: 3576, taken: false },  // Vale dos Ossos
    { id: 'vento',    map: 'vento',    x: 5010, y: 1836, taken: false },  // Salão dos Cavaleiros
    { id: 'forja',    map: 'fogo',     x: 6590, y: 1936, taken: false }   // saliência alta da forja
  ],

  count() { return this.metals.filter(m => m.taken).length; },

  isForgeTier(tier) {
    return this.FORGED_TIERS.includes(tier);
  },

  variantForTier(tier) {
    return Math.max(0, this.FORGED_TIERS.indexOf(tier));
  },

  battleScale(tier) {
    return this.isForgeTier(tier) ? 1.58 : 2.1;
  },

  // ─────────────────── geometria: o caminho e a forja ───────────────────
  installed: false,
  buildGeometry() {
    if (this.installed || typeof World === 'undefined' || !World.mapFogo) return;
    const S = World.mapFogo.solids;

    // rompe a muralha leste: o topo permanece, abre-se a porta embaixo
    const wall = S.find(s => s.x === 5330 && s.y === 1540 && s.h === 900);
    if (wall) wall.h = 500;                              // termina em y2040 (vão de 100px)

    const add = (o) => { if (!S.some(p => p.id === o.id)) S.push(o); };
    add({ x: 5330, y: 2140, w: 1550, h: 300, id: 'forgeCauseway' });   // calçada 5330→6880
    add({ x: 6180, y: 2020, w: 170,  h: 24,  id: 'forgeLedgeA' });
    add({ x: 6480, y: 1940, w: 220,  h: 24,  id: 'forgeLedgeB' });     // o 5º metal mora aqui
    add({ x: 6880, y: 1640, w: 80,   h: 800, id: 'forgeEastWall' });

    const tor = World.mapFogo.torches;
    if (tor && !tor.some(t => t.x === 5560)) { tor.push({ x: 5560, y: 2140 }); tor.push({ x: 6760, y: 2140 }); }
    const cp = World.mapFogo.checkpoints;
    if (cp && !cp.some(c => c.x === 5620)) cp.push({ x: 5620, y: 2140 });

    // Três posições internas preservam saves/ordem; para o jogador, todos são
    // o mesmo espírito. Só a pequena variação da armadura muda.
    if (typeof TIERS !== 'undefined') {
      const forged = {
        name: 'Forjado', short: 'o Forjado', hp: 56, soco: 10, mare: 30,
        xp: 36, kanji: '鍛', element: 'fogo', guardReduction: 0.35
      };
      this.FORGED_TIERS.forEach(tier => { TIERS[tier] = { ...forged }; });
    }
    this.installed = true;
  },

  spawnEnemies() {
    if (typeof Enemies === 'undefined' || !Enemies.list) return;
    const add = (tier, x, y, min, max) => {
      if (Enemies.list.some(e => e.tier === tier)) return;
      Enemies.list.push(new FieldEnemy({ tier, x, y, min, max, map: 'fogo' }));
    };
    // Cada Forjado guarda uma estação e jamais abandona a Forja.
    add(this.FORGED_TIERS[0], 5750, 2140, 5510, 5920);
    add(this.FORGED_TIERS[1], 6080, 2140, 5890, 6270);
    add(this.FORGED_TIERS[2], 6350, 2140, 6210, 6750);
  },

  // ─────────────────────── exploração ───────────────────────
  nearAnvil: false,

  update(G) {
    const p = G.player;

    // coleta dos Metais Lendários (em qualquer reino)
    for (const m of this.metals) {
      if (m.taken || World.current !== m.map) continue;
      if (Math.abs(p.x - m.x) < 32 && Math.abs(p.y - m.y) < 64) {
        m.taken = true;
        Sfx.amulet();
        Particles.burst(m.x, m.y - 14, 16, () => ({
          x: m.x + U.rand(-10, 10), y: m.y - 14 + U.rand(-10, 10),
          vx: U.rand(-1.4, 1.4), vy: U.rand(-2.2, -0.4),
          life: 44, size: U.rand(1.6, 2.8), color: 'rgba(255,196,110,0.95)', type: 'spark'
        }));
        const n = this.count();
        Hud.toast(`鉱 Metal Lendário (${n}/5)` + (n === 5 ? ' — leve-os à Forja!' : ''), '#ffcf8a');
        if (!this.questActive) this.questActive = true;
        if (window.SaveSystem) SaveSystem.saveGame('metal-lendario');
      }
    }

    if (World.current !== 'fogo') { this.nearAnvil = false; return; }

    // a missão é passada ao se aproximar da forja
    if (!this.bannerShown && Math.abs(p.x - this.ANVIL.x) < 260 && Math.abs(p.y - this.ANVIL.y) < 120) {
      this.bannerShown = true;
      this.questActive = true;
      Hud.showBanner('鍛', 'A Antiga Forja dos Samurais', 'A fornalha ainda respira. Ela pede 5 Metais Lendários.');
      Hud.toast('«Traga-me 5 Metais Lendários dos reinos — e a Escuridão será reforjada.»', '#ffcf8a');
    }

    // interação na bigorna
    this.nearAnvil = Math.abs(p.x - this.ANVIL.x) < 52 && Math.abs(p.y - this.ANVIL.y) < 60;
    if (this.nearAnvil && p.onGround && Input.pressed('up')) {
      const n = this.count();
      if (this.imbued) {
        Hud.toast('鍛 A lâmina já carrega o Metal Lendário. A forja descansa.', '#ffcf8a');
      } else if (n < 5) {
        Sfx.confirm();
        Hud.toast(`鍛 A fornalha avalia: ${n}/5 Metais Lendários. Continua a busca.`, '#ffcf8a');
      } else if (!Game.hasDarkKatana) {
        Sfx.deny();
        Hud.toast('鍛 «O metal exige a lâmina da Escuridão. Encontra-a primeiro.»', '#c9a6ff');
      } else {
        // A IMBUIÇÃO
        this.imbued = true;
        Sfx.amulet();
        G.cam.shake = 8;
        Game.freezeFrames = Math.max(Game.freezeFrames || 0, 6);
        Particles.spawn({ x: this.ANVIL.x, y: this.ANVIL.y - 40, life: 40, size: 26, color: 'rgba(255,190,90,0.8)', type: 'ring' });
        Particles.spawn({ x: this.ANVIL.x, y: this.ANVIL.y - 40, life: 56, size: 44, color: 'rgba(190,120,255,0.5)', type: 'ring' });
        Particles.burst(this.ANVIL.x, this.ANVIL.y - 40, 26, () => ({
          x: this.ANVIL.x + U.rand(-18, 18), y: this.ANVIL.y - 40 + U.rand(-16, 16),
          vx: U.rand(-2.4, 2.4), vy: U.rand(-3, -0.5), grav: 0.06,
          life: 50, size: U.rand(1.8, 3), color: Math.random() < 0.5 ? 'rgba(255,196,110,0.95)' : 'rgba(190,122,255,0.9)', type: 'spark'
        }));
        Hud.showBanner('鍛', 'Katana Imbuída de Metal Lendário', 'O golpe de vantagem agora desfere um segundo corte devastador.');
        if (window.SaveSystem) SaveSystem.saveGame('forja');
      }
    }
  },

  // ═══════════════════ turnos dos espíritos da forja ═══════════════════

  setForgeMode(E, mode) {
    const lowHp = E.hp <= E.maxHp * 0.35;
    E._forgeMode = mode;
    E._forgeModeTurns = mode === 'defensivo'
      ? 3 + Math.floor(Math.random() * (lowHp ? 4 : 3))
      : 1 + (U.chance(0.38) ? 1 : 0);
    if (mode === 'agressivo') E._forgeAggressiveStruck = false;
  },

  ensureForgeScript(B) {
    const E = B.E;
    // O Forjado decide no próprio turno. Manter a fila vazia também impede o
    // HUD genérico de revelar o próximo movimento ou formar uma sequência.
    E.script = [];
    if (!E._forgeMode) this.setForgeMode(E, 'defensivo');
  },

  chooseForgeAction(B) {
    const E = B.E;
    this.ensureForgeScript(B);
    if (E._forgeHeavyCooldown > 0) E._forgeHeavyCooldown--;

    // Quatro guardas seguidas fazem a brasa abandonar o Bastião. A postura muda
    // internamente, sem painel ou previsão para o jogador.
    if (E._forgeMode === 'defensivo' && E._forgeGuardStreak >= 4) {
      this.setForgeMode(E, 'agressivo');
    }

    let action = 'guarda_forjada';
    if (E._forgeMode === 'agressivo') {
      const canStrike = E._forgeHeavyCooldown <= 0 && E._forgeLastAction !== 'golpe_avassalador';
      const pressure = E._forgeGuardStreak >= 5;
      const strikeChance = E._forgeModeTurns <= 1 ? 0.78 : 0.62;
      if (canStrike && (pressure || U.chance(strikeChance))) action = 'golpe_avassalador';
    }

    if (action === 'golpe_avassalador') {
      E._forgeLastAction = action;
      E._forgeGuardStreak = 0;
      E._forgeAggressiveStruck = true;
      E._forgeHeavyCooldown = 3;
      this.setForgeMode(E, 'defensivo');
      return action;
    }

    E._forgeLastAction = action;
    E._forgeGuardStreak = (E._forgeGuardStreak || 0) + 1;
    E._forgeModeTurns--;
    if (E._forgeModeTurns <= 0) {
      if (E._forgeMode === 'agressivo') {
        this.setForgeMode(E, 'defensivo');
      } else {
        const lowHp = E.hp <= E.maxHp * 0.35;
        this.setForgeMode(E, U.chance(lowHp ? 0.55 : 0.75) ? 'agressivo' : 'defensivo');
      }
    }
    return action;
  },

  magicColor(element) {
    return ({
      agua: '#8fd8ff', fogo: '#ffab66', vento: '#a2e8c9', trevas: '#c9a6ff'
    })[element] || '#eee0ff';
  },

  /** Registra apenas PV realmente perdido; a magia ainda atinge o Forjado. */
  captureMagicDamage(B, E, amount, element) {
    if (!E || E.hp <= 0 || amount <= 0) return;
    const absorbed = Math.max(1, Math.round(amount));
    E._reversalStored = (E._reversalStored || 0) + absorbed;
    E._reversalElement = element;
    E._reversalReady = true;
    B._forgeAction = 'absorver_magia';
    const col = this.magicColor(element);
    const popup = '返 SUA MAGIA FOI ABSORVIDA!';
    B.msg = popup;
    B.msgT = 0;
    B.floater(B.EX, B.EY - 112, 'MAGIA ABSORVIDA', col, true);
    const notice = B.floaters[B.floaters.length - 1];
    if (notice) notice.life = 100;
    // Reserva uma batida visual no fim da ação, antes das etapas que o turno
    // inimigo anexará à fila. Sem ela, o aviso podia ser substituído em poucos
    // décimos pela própria devolução.
    B.push({ dur: 90, msg: popup });
    Sfx.absorb();
    Particles.spawn({ x: B.EX, y: B.EY - 46, life: 40, size: 38, color: col, type: 'ring' });
    Particles.burst(B.EX, B.EY - 42, 16, () => ({
      x: B.EX + U.rand(-35, 35), y: B.EY - 42 + U.rand(-35, 35),
      vx: U.rand(-1.4, 1.4), vy: U.rand(-1.4, 1.4), life: U.rand(26, 44),
      size: U.rand(1.4, 3), color: col, type: 'wisp'
    }));
  },

  forgeTurn(B) {
    const E = B.E;
    const hasReturn = !!E._reversalReady && E._reversalStored > 0;
    E.defending = false;
    E.fatigued = false;
    E._magicReversal = false;
    this.ensureForgeScript(B);
    const acao = hasReturn ? 'retorno_magico' : this.chooseForgeAction(B);
    if (hasReturn) {
      E._forgeLastAction = 'retorno_magico';
      E._forgeGuardStreak = 0;
      E._forgeHeavyCooldown = Math.max(E._forgeHeavyCooldown || 0, 3);
      this.setForgeMode(E, 'defensivo');
    }
    B._forgeAction = acao;

    if (acao === 'guarda_forjada') {
      E.defending = true;
      E._magicReversal = true;
      E._guardCount = (E._guardCount || 0) + 1;
      B.push({
        dur: 50,
        msg: '守 O Forjado está em guarda — as placas da armadura se fecham.',
        on: () => {
          B.anim.e = 'defend';
          Sfx.defend();
          if (EnemyVFX.guard) EnemyVFX.guard(E, B.EX, B.EY - 38);
          Particles.spawn({ x: B.EX, y: B.EY - 44, life: 42, size: 34, color: 'rgba(167,205,228,0.52)', type: 'ring' });
          Particles.burst(B.EX, B.EY - 40, 10, () => ({
            x: B.EX + U.rand(-25, 25), y: B.EY - 40 + U.rand(-24, 24),
            vx: U.rand(-0.8, 0.8), vy: U.rand(-1.2, 0.2), life: U.rand(24, 42),
            size: U.rand(1.2, 2.4), color: 'rgba(174,208,229,0.82)', type: 'spark'
          }));
        }
      });
    }
    else if (acao === 'golpe_avassalador') {
      B.push({
        dur: 42,
        msg: '砕 GOLPE AVASSALADOR — a pequena brasa comprime a força da fornalha inteira!',
        on: () => {
          B.anim.e = 'charge';
          Sfx.tone({ f: 150, f2: 62, dur: 0.58, type: 'sine', vol: 0.13 });
          if (EnemyVFX.charge) EnemyVFX.charge(E, B.EX, B.EY - 42);
          Particles.burst(B.EX, B.EY - 38, 18, () => {
            const px = B.EX + U.rand(-95, 95), py = B.EY - 38 + U.rand(-70, 50);
            return { x: px, y: py, vx: (B.EX - px) * 0.055, vy: (B.EY - 38 - py) * 0.055,
              life: U.rand(24, 40), size: U.rand(1.5, 3.1), color: 'rgba(255,180,92,0.88)', type: 'spark' };
          });
        }
      });
      B.push({
        dur: 14,
        on: () => {
          B.anim.e = 'attack'; B.anim.ex = -74;
          B.hitPlayer(E.mare, 'fisico', true);
          E.fatigued = true;
          B.shake = 15; Sfx.hit(true);
          Game.freezeFrames = Math.max(Game.freezeFrames || 0, 7);
          Particles.spawn({ x: B.PX, y: B.PY - 18, life: 30, size: 42, color: 'rgba(255,226,160,0.76)', type: 'ring' });
          Particles.burst(B.PX, B.PY - 18, 22, () => ({
            x: B.PX + U.rand(-25, 25), y: B.PY - U.rand(0, 48),
            vx: U.rand(-3.4, 3.4), vy: U.rand(-3.2, -0.3), grav: 0.11,
            life: U.rand(24, 42), size: U.rand(1.7, 3.4), color: 'rgba(255,185,92,0.94)', type: 'spark'
          }));
        }
      });
      B.push({
        dur: 34,
        on: () => {
          if (B.P.hp <= 0) return;
          B.anim.e = 'hurt';
          B.msg = '隙 O impacto abre as placas da armadura — o Forjado fica EXPOSTO. Castigue!';
          B.msgT = 0;
        }
      });
    }
    else if (acao === 'retorno_magico') {
      const stored = E._reversalStored;
      const element = E._reversalElement || 'trevas';
      const returned = Math.max(Math.round(E.soco * 1.6), Math.round(stored * 1.5));
      const col = this.magicColor(element);
      B.push({
        dur: 46,
        msg: `返 REVERSÃO MÁGICA — ${stored} de magia absorvida retorna como ${returned}. Prepare-se!`,
        on: () => {
          B.anim.e = 'magic';
          Sfx.tone({ f: 260, f2: 760, dur: 0.5, type: 'triangle', vol: 0.12 });
          Particles.spawn({ x: B.EX, y: B.EY - 44, life: 46, size: 48, color: col, type: 'ring' });
          Particles.burst(B.EX, B.EY - 42, 22, () => ({
            x: B.EX + U.rand(-30, 30), y: B.EY - 42 + U.rand(-34, 30),
            vx: U.rand(-1.8, 1.8), vy: U.rand(-2.1, 0.6), life: U.rand(28, 48),
            size: U.rand(1.5, 3.2), color: col, type: 'wisp'
          }));
        }
      });
      B.push({
        dur: 16,
        on: () => {
          B.anim.e = 'attack'; B.anim.ex = -34;
          const kind = ({ agua: 'agua', fogo: 'fogo', vento: 'vento' })[element] || 'magic';
          B.hitPlayer(returned, kind, true);
          B.shake = 13;
          Game.freezeFrames = Math.max(Game.freezeFrames || 0, 6);
          Particles.spawn({ x: B.PX, y: B.PY - 42, life: 34, size: 44, color: col, type: 'ring' });
          Particles.burst(B.PX, B.PY - 40, 20, () => ({
            x: B.PX + U.rand(-24, 24), y: B.PY - 40 + U.rand(-32, 28),
            vx: U.rand(-3, 3), vy: U.rand(-2.8, 1.2), life: U.rand(22, 40),
            size: U.rand(1.5, 3.3), color: col, type: 'wisp'
          }));
          E._reversalStored = 0;
          E._reversalElement = null;
          E._reversalReady = false;
          E.fatigued = true;
        }
      });
      B.push({
        dur: 30,
        on: () => {
          if (B.P.hp <= 0) return;
          B.anim.e = 'hurt';
          B.msg = '隙 A energia deixa as placas entreabertas — o Forjado fica EXPOSTO.';
          B.msgT = 0;
        }
      });
    }

    B.push({ dur: 10 });
    B.push({ dur: 1, on: () => { if (B.P.hp <= 0) B.defeatSequence(); else B.afterEnemy(); } });
  },

  // ═══════════════════ sprites (campo e batalha) ═══════════════════

  /**
   * Silhueta compartilhada por campo e batalha: uma brasa pequena dentro de
   * armadura samurai vazia. As três variantes mudam só crista e cordão.
   */
  drawForjadoFigure(ctx, o = {}) {
    const t = o.t || 0;
    const variant = o.variant || 0;
    const pose = o.pose || 'idle';
    const reversal = !!o.reversal;
    const guarding = pose === 'defend' || (reversal && pose !== 'hurt');
    const charging = pose === 'charge';
    const attacking = pose === 'attack';
    const hurt = pose === 'hurt';
    const trim = ['#9f5438', '#a7864e', '#667f91'][variant] || '#9f5438';
    const magic = this.magicColor(o.storedElement);
    const bob = guarding ? 3 : hurt ? 5 : Math.sin(t * 0.075) * 1.3;

    ctx.save();
    ctx.translate(0, bob);

    // O núcleo é quente; a armadura permanece opaca para conservar material.
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const halo = ctx.createRadialGradient(0, -31, 2, 0, -31, reversal ? 42 : 29);
    halo.addColorStop(0, reversal ? magic : 'rgba(255,225,158,0.82)');
    halo.addColorStop(0.34, reversal ? magic + '88' : 'rgba(255,112,45,0.35)');
    halo.addColorStop(1, 'rgba(255,90,30,0)');
    ctx.fillStyle = halo;
    ctx.beginPath(); ctx.arc(0, -31, reversal ? 42 : 29, 0, 7); ctx.fill();
    ctx.restore();

    // Pequena chama-corpo, quase toda escondida pelo yoroi.
    const core = ctx.createRadialGradient(-2, -28, 2, 0, -28, 17);
    core.addColorStop(0, '#fff0ba');
    core.addColorStop(0.42, '#ff873b');
    core.addColorStop(1, '#9e2f1d');
    ctx.fillStyle = core;
    ctx.beginPath();
    ctx.moveTo(-11, -12);
    ctx.quadraticCurveTo(-17, -31, -5, -43);
    ctx.quadraticCurveTo(-2, -53 + Math.sin(t * 0.12) * 3, 3, -43);
    ctx.quadraticCurveTo(16, -31, 10, -11);
    ctx.closePath(); ctx.fill();

    // Botas e saia de placas: base triangular, baixa e teimosa.
    ctx.fillStyle = '#171a1e';
    ctx.fillRect(-13, -8, 9, 10);
    ctx.fillRect(5, -8, 9, 10);
    ctx.fillStyle = '#292e35';
    for (let i = 0; i < 5; i++) {
      const px = -18 + i * 7.2;
      ctx.beginPath();
      ctx.moveTo(px, -23); ctx.lineTo(px + 7, -23);
      ctx.lineTo(px + 9, -5); ctx.lineTo(px - 2, -5);
      ctx.closePath(); ctx.fill();
      ctx.strokeStyle = i % 2 ? trim : '#59616b';
      ctx.lineWidth = 0.9; ctx.stroke();
    }

    // Peitoral em lâminas sobrepostas deixa o núcleo respirar pelas frestas.
    const armor = ctx.createLinearGradient(-18, -49, 18, -10);
    armor.addColorStop(0, '#4b535e');
    armor.addColorStop(0.45, '#292e35');
    armor.addColorStop(1, '#15181c');
    ctx.fillStyle = armor;
    ctx.beginPath();
    ctx.moveTo(-16, -42); ctx.lineTo(16, -42);
    ctx.lineTo(13, -18); ctx.lineTo(-13, -18);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#68717c'; ctx.lineWidth = 1.2; ctx.stroke();
    ctx.strokeStyle = trim; ctx.lineWidth = 1.5;
    for (const yy of [-35, -28, -21]) {
      ctx.beginPath(); ctx.moveTo(-12, yy); ctx.lineTo(12, yy); ctx.stroke();
    }

    // Ombreiras grandes: na guarda fecham como portões sobre o peito.
    const shoulderY = guarding ? -36 : -39;
    const shoulderIn = guarding ? 4 : 0;
    for (const side of [-1, 1]) {
      ctx.save();
      ctx.translate(side * (17 - shoulderIn), shoulderY);
      ctx.rotate(side * (guarding ? -0.24 : 0.08));
      ctx.fillStyle = '#30363e';
      ctx.beginPath();
      ctx.moveTo(-8, -7); ctx.lineTo(8, -6); ctx.lineTo(10, 10); ctx.lineTo(-10, 10);
      ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#737d88'; ctx.lineWidth = 1.2; ctx.stroke();
      ctx.strokeStyle = trim; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(-8, -1); ctx.lineTo(9, 0);
      ctx.moveTo(-9, 5); ctx.lineTo(10, 6); ctx.stroke();
      ctx.restore();
    }

    // Kabuto e viseira.
    ctx.fillStyle = '#24292f';
    ctx.beginPath();
    ctx.moveTo(-17, -49); ctx.quadraticCurveTo(0, -66, 17, -49);
    ctx.lineTo(13, -38); ctx.lineTo(-13, -38); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#707985'; ctx.lineWidth = 1.3; ctx.stroke();
    ctx.fillStyle = '#111317';
    ctx.fillRect(-14, -48, 28, 7);
    ctx.fillStyle = trim;
    ctx.fillRect(-16, -52, 32, 3);

    // Maedate: meia-lua, chifres ou aro, apenas assinatura visual.
    ctx.strokeStyle = variant === 1 ? '#b49a61' : variant === 2 ? '#7894a6' : '#a65d40';
    ctx.lineWidth = 2.2; ctx.lineCap = 'round';
    if (variant === 0) {
      ctx.beginPath(); ctx.arc(0, -60, 8, 0.15, Math.PI - 0.15); ctx.stroke();
    } else if (variant === 1) {
      ctx.beginPath(); ctx.moveTo(-4, -58); ctx.lineTo(-12, -70);
      ctx.moveTo(4, -58); ctx.lineTo(12, -70); ctx.stroke();
    } else {
      ctx.beginPath(); ctx.arc(0, -63, 6, 0, 7); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, -69); ctx.lineTo(0, -74); ctx.stroke();
    }

    // Olhos e fendas revelam que não há corpo — só brasa.
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = reversal ? magic : 'rgba(255,224,160,' + (0.72 + 0.24 * Math.sin(t * 0.16)) + ')';
    ctx.fillRect(-9, -46, 6, 2);
    ctx.fillRect(3, -46, 6, 2);
    ctx.strokeStyle = reversal ? magic : '#ff8a42';
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(0, -38); ctx.lineTo(-2, -31); ctx.lineTo(2, -25); ctx.stroke();
    ctx.restore();

    // A katana curta fica baixa no idle; a carga cria uma lâmina desproporcional.
    ctx.save();
    if (guarding) {
      ctx.translate(0, -29); ctx.rotate(-0.03);
      ctx.fillStyle = '#44352b'; ctx.fillRect(-29, -2.5, 12, 5);
      const blade = ctx.createLinearGradient(-17, 0, 31, 0);
      blade.addColorStop(0, '#717c88'); blade.addColorStop(0.7, '#d8e0e5'); blade.addColorStop(1, '#ffffff');
      ctx.fillStyle = blade;
      ctx.beginPath(); ctx.moveTo(-17, -2.1); ctx.lineTo(32, -1.2); ctx.lineTo(38, 0);
      ctx.lineTo(32, 1.2); ctx.lineTo(-17, 2.1); ctx.closePath(); ctx.fill();
    } else if (charging) {
      ctx.translate(7, -38); ctx.rotate(-1.46);
      ctx.fillStyle = '#44352b'; ctx.fillRect(-4, -3, 13, 6);
      ctx.fillStyle = '#eef2f4'; ctx.fillRect(9, -3.2, 56, 6.4);
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = 'rgba(255,239,194,0.8)'; ctx.fillRect(9, -1.4, 68, 2.8); ctx.restore();
    } else if (attacking) {
      ctx.translate(6, -33); ctx.rotate(0.52);
      ctx.fillStyle = '#44352b'; ctx.fillRect(-8, -3, 15, 6);
      ctx.fillStyle = '#f4f6f7'; ctx.fillRect(7, -3.8, 60, 7.6);
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = 'rgba(255,236,188,0.82)'; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.arc(0, 0, 61, -1.3, 0.55); ctx.stroke(); ctx.restore();
    } else {
      ctx.translate(13, -28); ctx.rotate(0.88);
      ctx.fillStyle = '#44352b'; ctx.fillRect(-6, -2.4, 13, 4.8);
      ctx.fillStyle = '#8b959f'; ctx.fillRect(7, -2.2, 32, 4.4);
    }
    ctx.restore();

    // Reversão: selo segmentado gira ao contrário e guarda a cor recebida.
    if (reversal) {
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = magic; ctx.lineWidth = 1.8;
      const spin = -t * 0.055;
      for (let i = 0; i < 8; i++) {
        ctx.beginPath(); ctx.arc(0, -32, 34, spin + i * Math.PI / 4, spin + i * Math.PI / 4 + 0.46); ctx.stroke();
      }
      ctx.strokeStyle = 'rgba(225,235,245,0.48)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(0, -32, 27, -spin, -spin + 4.7); ctx.stroke();
      ctx.fillStyle = magic;
      ctx.beginPath(); ctx.arc(-24, -52, 4.2 + Math.sin(t * 0.16), 0, 7); ctx.fill();
      ctx.restore();

      ctx.save();
      ctx.translate(0, -32);
      if (o.mirrored) ctx.scale(-1, 1);
      ctx.fillStyle = magic;
      ctx.font = '700 15px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('返', 0, 1);
      ctx.restore();
    } else if (guarding) {
      ctx.save();
      ctx.strokeStyle = 'rgba(157,194,216,0.58)'; ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.arc(0, -31, 27, -2.55, 0.62); ctx.stroke();
      ctx.restore();
    }

    if (o.aura > 0) {
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = 'rgba(' + (o.auraCol || '255,196,110') + ',' + (0.32 * o.aura) + ')';
      ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, -33, 38, 0, 7); ctx.stroke(); ctx.restore();
    }
    if (o.flash > 0) {
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      const hit = ctx.createRadialGradient(0, -34, 2, 0, -34, 39);
      hit.addColorStop(0, 'rgba(255,255,255,' + (Math.min(1, o.flash) * 0.7) + ')');
      hit.addColorStop(0.5, 'rgba(255,213,156,' + (Math.min(1, o.flash) * 0.24) + ')');
      hit.addColorStop(1, 'rgba(255,213,156,0)');
      ctx.fillStyle = hit; ctx.beginPath(); ctx.arc(0, -34, 39, 0, 7); ctx.fill(); ctx.restore();
    }
    ctx.restore();
  },

  drawFieldSprite(ctx, e, cam, frames) {
    if (e.map !== World.current) return;
    const sx = e.x - cam.x, sy = e.y - cam.y;
    if (sx < -90 || sx > 1050 || sy < -100 || sy > 640) return;
    const t = frames + (e.homeX % 113);
    ctx.save();
    ctx.translate(sx, sy);
    ctx.fillStyle = 'rgba(0,0,0,0.42)';
    ctx.beginPath(); ctx.ellipse(0, 2, 17, 5, 0, 0, 7); ctx.fill();
    ctx.scale(e.dir < 0 ? -0.72 : 0.72, 0.72);
    this.drawForjadoFigure(ctx, {
      t, variant: this.variantForTier(e.tier),
      pose: e.alert > 8 ? 'defend' : 'idle',
      mirrored: e.dir < 0
    });
    ctx.restore();

    if (e.alert > 8) {
      ctx.save();
      ctx.fillStyle = '#ffe08a';
      ctx.font = '700 18px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('!', sx, sy - e.h - 10 - Math.sin(frames * 0.3) * 2);
      ctx.restore();
    }
  },

  drawBattleSprite(ctx, x, y, s, tier, o) {
    const E = typeof Battle !== 'undefined' && Battle.E && Battle.E.tier === tier ? Battle.E : null;
    const pose = o.pose || 'idle';
    const lunge = pose === 'attack' ? -22 : 0;
    ctx.save();
    ctx.globalAlpha = o.alpha !== undefined ? o.alpha : 1;
    ctx.translate(x + lunge, y);
    ctx.scale(s * (o.facing < 0 ? -1 : 1), s);
    this.drawForjadoFigure(ctx, {
      t: o.t || 0,
      variant: this.variantForTier(tier),
      pose,
      mirrored: o.facing < 0,
      // O selo violeta só nasce depois que uma magia já foi absorvida.
      reversal: !!(E && E._reversalReady),
      storedElement: E && E._reversalElement,
      aura: o.aura || 0,
      auraCol: o.auraCol,
      flash: o.flash || 0
    });
    ctx.restore();
  },

  /** Oficina reconhecível também no duelo, sem cobrir o corredor entre ambos. */
  drawBattleBackdrop(ctx, frames, B) {
    if (!B.E || !this.isForgeTier(B.E.tier)) return;
    const charged = B.E._reversalReady
      || B.anim.e === 'charge' || B.anim.e === 'magic';
    const pulse = 0.72 + 0.28 * Math.sin(frames * 0.045);
    ctx.save();

    // Parede de ferro batido e vigas quebradas ficam no perímetro.
    const wall = ctx.createLinearGradient(520, 80, 920, 410);
    wall.addColorStop(0, 'rgba(16,10,9,0.18)');
    wall.addColorStop(1, 'rgba(12,7,6,0.62)');
    ctx.fillStyle = wall;
    ctx.fillRect(515, 90, 445, 318);
    ctx.strokeStyle = 'rgba(15,10,9,0.86)';
    ctx.lineWidth = 14;
    ctx.beginPath(); ctx.moveTo(500, 104); ctx.lineTo(690, 20); ctx.lineTo(920, 116); ctx.stroke();
    ctx.lineWidth = 7;
    ctx.beginPath(); ctx.moveTo(585, 0); ctx.lineTo(585, 408); ctx.moveTo(884, 0); ctx.lineTo(884, 408); ctx.stroke();

    // Fornalha arqueada atrás do inimigo: calor forte, forma escura.
    ctx.fillStyle = 'rgba(18,10,8,0.9)';
    ctx.beginPath();
    ctx.moveTo(715, 408); ctx.lineTo(715, 238);
    ctx.quadraticCurveTo(785, 150, 855, 238);
    ctx.lineTo(855, 408); ctx.closePath(); ctx.fill();
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const furnace = ctx.createRadialGradient(785, 332, 8, 785, 332, charged ? 118 : 88);
    furnace.addColorStop(0, `rgba(255,238,183,${(charged ? 0.34 : 0.18) * pulse})`);
    furnace.addColorStop(0.36, `rgba(255,119,48,${(charged ? 0.3 : 0.16) * pulse})`);
    furnace.addColorStop(1, 'rgba(255,80,30,0)');
    ctx.fillStyle = furnace; ctx.beginPath(); ctx.arc(785, 332, charged ? 118 : 88, 0, 7); ctx.fill();
    ctx.restore();

    // Correntes e lâminas incompletas criam profundidade sem ocupar o centro.
    ctx.strokeStyle = 'rgba(82,62,48,0.58)'; ctx.lineWidth = 3;
    for (const cx of [548, 908]) {
      ctx.beginPath(); ctx.moveTo(cx, 0);
      ctx.quadraticCurveTo(cx + Math.sin(frames * 0.025 + cx) * 5, 98, cx - 2, 180); ctx.stroke();
    }
    for (let i = 0; i < 5; i++) {
      ctx.save(); ctx.translate(535 + i * 20, 399); ctx.rotate(-0.18 + i * 0.08);
      ctx.fillStyle = i % 2 ? 'rgba(97,105,114,0.48)' : 'rgba(72,80,89,0.52)';
      ctx.fillRect(-1.5, -66, 3, 66); ctx.restore();
    }

    // Sulcos convergem para os duelistas; o centro continua livre.
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = 'rgba(255,145,68,0.14)'; ctx.lineWidth = 1.4;
    for (const x of [80, 220, 740, 900]) {
      ctx.beginPath(); ctx.moveTo(x, 540); ctx.lineTo(x < 480 ? B.PX : B.EX, 410); ctx.stroke();
    }
    ctx.strokeStyle = `rgba(255,178,88,${0.12 + 0.08 * pulse})`;
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(B.EX, 414, 72, 16, 0, 0, 7); ctx.stroke();
    ctx.fillStyle = `rgba(255,190,104,${0.16 + 0.08 * pulse})`;
    ctx.font = '700 26px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('鍛', B.EX, 393);
    for (let i = 0; i < 12; i++) {
      const ex = 520 + ((i * 83 + frames * (0.35 + (i % 3) * 0.12)) % 430);
      const ey = 405 - ((i * 57 + frames * (0.42 + (i % 2) * 0.16)) % 260);
      ctx.globalAlpha = 0.22 + (i % 3) * 0.09;
      ctx.fillStyle = i % 4 ? '#ff9d4e' : '#fff0bd';
      ctx.beginPath(); ctx.arc(ex, ey, 1 + (i % 2) * 0.6, 0, 7); ctx.fill();
    }
    ctx.restore();
    ctx.restore();
  },

  // ═══════════════════ cenário da forja ═══════════════════

  drawForge(ctx, cam, frames) {
    if (World.current !== 'fogo') return;
    if (6960 - cam.x < -100 || 5330 - cam.x > 1100) return;
    ctx.save();
    ctx.translate(-cam.x, -cam.y);
    const gy = 2140;

    // a brecha na muralha (portal de pedra rude)
    ctx.fillStyle = '#241a16';
    ctx.fillRect(5330, gy - 100, 80, 100);
    ctx.fillStyle = '#3a2a22';
    ctx.beginPath();
    ctx.moveTo(5330, gy - 100); ctx.lineTo(5370, gy - 128); ctx.lineTo(5410, gy - 100);
    ctx.closePath(); ctx.fill();

    // corpo da forja: paredões com rachaduras de brasa
    const wg = ctx.createLinearGradient(0, gy - 320, 0, gy);
    wg.addColorStop(0, '#2c1e18'); wg.addColorStop(1, '#1a110d');
    ctx.fillStyle = wg;
    ctx.fillRect(6060, gy - 300, 820, 300);
    // telhado desabado em duas águas
    ctx.fillStyle = '#221610';
    ctx.beginPath();
    ctx.moveTo(6030, gy - 300); ctx.lineTo(6350, gy - 392); ctx.lineTo(6680, gy - 300);
    ctx.closePath(); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(6620, gy - 300); ctx.lineTo(6800, gy - 352); ctx.lineTo(6900, gy - 300);
    ctx.closePath(); ctx.fill();
    // rachaduras incandescentes nas paredes
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    ctx.lineWidth = 1.6;
    for (const [x0, y0, x1, y1] of [[6120, gy - 60, 6160, gy - 180], [6540, gy - 40, 6500, gy - 150], [6720, gy - 80, 6760, gy - 200]]) {
      ctx.strokeStyle = `rgba(255,140,60,${0.35 + 0.25 * Math.sin(frames * 0.07 + x0)})`;
      ctx.beginPath(); ctx.moveTo(x0, y0);
      ctx.lineTo((x0 + x1) / 2 + 12, (y0 + y1) / 2);
      ctx.lineTo(x1, y1); ctx.stroke();
    }
    ctx.restore();

    // a chaminé cuspindo brasas
    ctx.fillStyle = '#2a1c14';
    ctx.fillRect(6340, gy - 520, 64, 150);
    ctx.fillRect(6330, gy - 532, 84, 16);
    if (Math.random() < 0.35) {
      Particles.spawn({
        x: 6372 + U.rand(-18, 18), y: gy - 522,
        vx: U.rand(-0.3, 0.5), vy: U.rand(-1.6, -0.8),
        life: 90, size: U.rand(1.4, 2.6), color: 'rgba(255,150,70,0.85)', type: 'firefly'
      });
    }

    // a boca da fornalha, pulsando
    const breathe = 0.6 + 0.4 * Math.sin(frames * 0.045);
    ctx.fillStyle = '#160d0a';
    ctx.beginPath();
    ctx.moveTo(6560, gy); ctx.lineTo(6560, gy - 76);
    ctx.quadraticCurveTo(6620, gy - 118, 6680, gy - 76);
    ctx.lineTo(6680, gy); ctx.closePath(); ctx.fill();
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const fg = ctx.createRadialGradient(6620, gy - 40, 4, 6620, gy - 40, 70);
    fg.addColorStop(0, `rgba(255,190,90,${0.65 * breathe})`);
    fg.addColorStop(0.5, `rgba(255,120,50,${0.35 * breathe})`);
    fg.addColorStop(1, 'rgba(255,120,50,0)');
    ctx.fillStyle = fg;
    ctx.fillRect(6540, gy - 120, 160, 120);
    ctx.restore();

    // A BIGORNA COLOSSAL sobre pedestal de pedra
    const ax = this.ANVIL.x;
    ctx.fillStyle = '#3a3026';
    ctx.fillRect(ax - 30, gy - 26, 60, 26);
    const ag2 = ctx.createLinearGradient(ax - 40, gy - 64, ax + 40, gy - 26);
    ag2.addColorStop(0, '#4c545e'); ag2.addColorStop(0.5, '#77808c'); ag2.addColorStop(1, '#3a424c');
    ctx.fillStyle = ag2;
    ctx.beginPath();
    ctx.moveTo(ax - 40, gy - 46); ctx.lineTo(ax + 26, gy - 46);
    ctx.quadraticCurveTo(ax + 48, gy - 46, ax + 44, gy - 58);   // bico
    ctx.lineTo(ax - 34, gy - 58); ctx.closePath(); ctx.fill();
    ctx.fillRect(ax - 22, gy - 46, 44, 20);
    // martelo cravado na bigorna
    ctx.save();
    ctx.translate(ax + 8, gy - 58);
    ctx.rotate(-0.34);
    ctx.fillStyle = '#4a3c2c'; ctx.fillRect(-3, -34, 6, 34);
    ctx.fillStyle = '#3c444e'; ctx.fillRect(-11, -44, 22, 12);
    ctx.restore();
    // brasas dormentes na bigorna
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = `rgba(255,170,80,${0.35 + 0.3 * breathe})`;
    ctx.beginPath(); ctx.ellipse(ax - 6, gy - 56, 14, 3, 0, 0, 7); ctx.fill();
    ctx.restore();
    // Cinco encaixes no pedestal tornam o progresso da missão diegético.
    const metalCount = this.count();
    for (let i = 0; i < 5; i++) {
      const socketX = ax - 20 + i * 10;
      ctx.fillStyle = i < metalCount ? '#d79045' : '#181719';
      ctx.beginPath(); ctx.arc(socketX, gy - 14, 3.1, 0, 7); ctx.fill();
      ctx.strokeStyle = i < metalCount ? 'rgba(255,210,135,0.86)' : 'rgba(120,128,138,0.48)';
      ctx.lineWidth = 1; ctx.stroke();
    }

    // estantes de lâminas inacabadas + fole de parede
    for (let i = 0; i < 5; i++) {
      const bx = 6120 + i * 26;
      ctx.save();
      ctx.translate(bx, gy);
      ctx.rotate(-0.14 + i * 0.07);
      ctx.fillStyle = i % 2 ? '#565e68' : '#4a525c';
      ctx.fillRect(-1.6, -52, 3.2, 52);
      ctx.restore();
    }
    ctx.fillStyle = '#4a3c2c';
    ctx.beginPath();
    ctx.moveTo(6740, gy - 150); ctx.lineTo(6800, gy - 132); ctx.lineTo(6740, gy - 114);
    ctx.closePath(); ctx.fill();
    // correntes e molde pendurados
    ctx.strokeStyle = 'rgba(90,70,50,0.85)';
    ctx.lineWidth = 3;
    for (const chx of [6200, 6480]) {
      ctx.beginPath(); ctx.moveTo(chx, gy - 300);
      ctx.quadraticCurveTo(chx + 4, gy - 250, chx + Math.sin(frames * 0.03 + chx) * 4, gy - 210);
      ctx.stroke();
    }

    // o kanji da forja gravado, respirando
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = `rgba(255,190,110,${0.35 + 0.3 * breathe})`;
    ctx.font = '700 34px serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('鍛', 6350, gy - 200);
    ctx.restore();

    ctx.restore();
  },

  /**
   * Reacende os focos depois da máscara de iluminação. O cenário-base continua
   * sujeito às sombras; apenas fogo, metal lendário e olhos espirituais furam a
   * escuridão, como o restante da direção de arte do jogo.
   */
  drawForgeEmissive(ctx, cam, frames) {
    const inFireRealm = World.current === 'fogo';
    const visibleForge = inFireRealm && !(6960 - cam.x < -120 || 5330 - cam.x > 1080);
    ctx.save();
    ctx.translate(-cam.x, -cam.y);
    ctx.globalCompositeOperation = 'lighter';
    const gy = 2140, breathe = 0.62 + 0.38 * Math.sin(frames * 0.045);

    if (visibleForge) {
      const furnace = ctx.createRadialGradient(6620, gy - 40, 3, 6620, gy - 40, 92);
      furnace.addColorStop(0, `rgba(255,238,180,${0.58 * breathe})`);
      furnace.addColorStop(0.38, `rgba(255,128,48,${0.34 * breathe})`);
      furnace.addColorStop(1, 'rgba(255,94,32,0)');
      ctx.fillStyle = furnace; ctx.beginPath(); ctx.arc(6620, gy - 40, 92, 0, 7); ctx.fill();
      ctx.lineWidth = 1.7;
      for (const [x0, y0, x1, y1] of [[6120, gy - 60, 6160, gy - 180], [6540, gy - 40, 6500, gy - 150], [6720, gy - 80, 6760, gy - 200]]) {
        ctx.strokeStyle = `rgba(255,145,62,${0.3 + 0.28 * Math.sin(frames * 0.07 + x0)})`;
        ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo((x0 + x1) / 2 + 12, (y0 + y1) / 2); ctx.lineTo(x1, y1); ctx.stroke();
      }
      ctx.fillStyle = `rgba(255,204,126,${0.38 + 0.26 * breathe})`;
      ctx.font = '700 34px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('鍛', 6350, gy - 200);

      const ax = this.ANVIL.x, n = this.count();
      for (let i = 0; i < n; i++) {
        const socketX = ax - 20 + i * 10;
        const sg = ctx.createRadialGradient(socketX, gy - 14, 1, socketX, gy - 14, 11);
        sg.addColorStop(0, 'rgba(255,245,202,0.94)'); sg.addColorStop(0.28, 'rgba(255,183,84,0.72)'); sg.addColorStop(1, 'rgba(255,140,55,0)');
        ctx.fillStyle = sg; ctx.beginPath(); ctx.arc(socketX, gy - 14, 11, 0, 7); ctx.fill();
      }
    }

    // Veios e halo dos metais continuam visíveis sob qualquer preset de zona.
    for (const m of this.metals) {
      if (m.taken || m.map !== World.current) continue;
      const sx = m.x - cam.x, sy = m.y - cam.y;
      if (sx < -70 || sx > 1030 || sy < -70 || sy > 610) continue;
      const pulse = 0.58 + 0.42 * Math.sin(frames * 0.08 + m.x);
      const mg = ctx.createRadialGradient(m.x, m.y - 12, 1, m.x, m.y - 12, 31);
      mg.addColorStop(0, `rgba(255,244,195,${0.46 + 0.26 * pulse})`);
      mg.addColorStop(0.32, `rgba(255,190,95,${0.24 + 0.18 * pulse})`);
      mg.addColorStop(1, 'rgba(255,190,95,0)');
      ctx.fillStyle = mg; ctx.beginPath(); ctx.arc(m.x, m.y - 12, 31, 0, 7); ctx.fill();
    }

    // Só núcleo e frestas sobrenaturais dos três Forjados furam a máscara.
    if (inFireRealm && typeof Enemies !== 'undefined' && Enemies.list) {
      for (const e of Enemies.list) {
        if (e.dead || e.map !== World.current || !this.isForgeTier(e.tier)) continue;
        const sx = e.x - cam.x, sy = e.y - cam.y;
        if (sx < -100 || sx > 1060 || sy < -120 || sy > 660) continue;
        ctx.save(); ctx.translate(e.x, e.y); ctx.scale(e.dir < 0 ? -0.72 : 0.72, 0.72);
        const pulse = 0.72 + 0.24 * Math.sin(frames * 0.12 + e.homeX);
        const ember = ctx.createRadialGradient(0, -31, 2, 0, -31, 26);
        ember.addColorStop(0, `rgba(255,245,202,${pulse})`);
        ember.addColorStop(0.34, `rgba(255,130,54,${0.46 * pulse})`);
        ember.addColorStop(1, 'rgba(255,95,35,0)');
        ctx.fillStyle = ember; ctx.beginPath(); ctx.arc(0, -31, 26, 0, 7); ctx.fill();
        ctx.fillStyle = `rgba(255,228,166,${pulse})`;
        ctx.fillRect(-9, -46, 6, 2); ctx.fillRect(3, -46, 6, 2);
        ctx.strokeStyle = `rgba(255,132,58,${0.76 * pulse})`; ctx.lineWidth = 1.6;
        ctx.beginPath(); ctx.moveTo(0, -38); ctx.lineTo(-2, -31); ctx.lineTo(2, -25); ctx.stroke();
        // Um filete de aço mantém kabuto e ombreiras legíveis nas zonas escuras.
        ctx.strokeStyle = 'rgba(145,166,184,0.3)'; ctx.lineWidth = 1.35;
        ctx.beginPath();
        ctx.moveTo(-17, -49); ctx.quadraticCurveTo(0, -66, 17, -49);
        ctx.lineTo(13, -38); ctx.moveTo(-18, -45); ctx.lineTo(-25, -34);
        ctx.moveTo(18, -45); ctx.lineTo(25, -34); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(13, -28); ctx.lineTo(38, -2); ctx.stroke();
        ctx.restore();
      }
    }
    ctx.restore();
  },

  /** Os Metais Lendários no mundo — minério que canta luz. */
  drawMetals(ctx, cam, frames) {
    for (const m of this.metals) {
      if (m.taken || World.current !== m.map) continue;
      const sx = m.x - cam.x, sy = m.y - cam.y;
      if (sx < -60 || sx > 1020 || sy < -60 || sy > 600) continue;
      const pulse = 0.5 + 0.5 * Math.sin(frames * 0.08 + m.x);
      ctx.save();
      ctx.translate(sx, sy - 10 + Math.sin(frames * 0.05 + m.x) * 2);
      // pepita facetada
      ctx.fillStyle = '#6b7280';
      ctx.beginPath();
      ctx.moveTo(-9, 4); ctx.lineTo(-11, -4); ctx.lineTo(-3, -11);
      ctx.lineTo(7, -8); ctx.lineTo(11, 1); ctx.lineTo(4, 7);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#8d95a3';
      ctx.beginPath(); ctx.moveTo(-3, -11); ctx.lineTo(7, -8); ctx.lineTo(0, -1); ctx.closePath(); ctx.fill();
      // veios lendários
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = `rgba(255,196,110,${0.6 + 0.4 * pulse})`;
      ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.moveTo(-8, 1); ctx.lineTo(-1, -4); ctx.lineTo(6, -1); ctx.stroke();
      const gl = ctx.createRadialGradient(0, -2, 1, 0, -2, 26);
      gl.addColorStop(0, `rgba(255,206,130,${0.30 + 0.25 * pulse})`);
      gl.addColorStop(1, 'rgba(255,206,130,0)');
      ctx.fillStyle = gl;
      ctx.beginPath(); ctx.arc(0, -2, 26, 0, 7); ctx.fill();
      ctx.restore();
      ctx.restore();
      if (Math.random() < 0.08) {
        Particles.spawn({
          x: m.x + U.rand(-8, 8), y: m.y - 8,
          vx: 0, vy: U.rand(-0.6, -0.3), life: 40, size: 1.4,
          color: 'rgba(255,206,130,0.85)', type: 'orb'
        });
      }
    }
  },

  // ═══════════════════ VFX técnico dos portais ═══════════════════

  drawPortalVFX(ctx, px, py, col, frames, seed) {
    const sx = px, cy = py - 52;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';

    // 1. vórtice: três arcos espirais girando em velocidades opostas
    for (let ring = 0; ring < 3; ring++) {
      const dir = ring % 2 ? -1 : 1;
      const r = 20 + ring * 8;
      const a0 = frames * (0.03 + ring * 0.014) * dir + seed;
      ctx.strokeStyle = `rgba(${col},${0.5 - ring * 0.12})`;
      ctx.lineWidth = 2.4 - ring * 0.5;
      for (let arc = 0; arc < 2; arc++) {
        ctx.beginPath();
        ctx.arc(sx, cy, r, a0 + arc * Math.PI, a0 + arc * Math.PI + 1.9);
        ctx.stroke();
      }
    }

    // 2. núcleo pulsante com cruz de lente
    const pulse = 0.5 + 0.5 * Math.sin(frames * 0.09 + seed);
    const core = ctx.createRadialGradient(sx, cy, 1, sx, cy, 17);
    core.addColorStop(0, `rgba(255,255,255,${0.35 + 0.3 * pulse})`);
    core.addColorStop(0.4, `rgba(${col},${0.4 + 0.2 * pulse})`);
    core.addColorStop(1, `rgba(${col},0)`);
    ctx.fillStyle = core;
    ctx.beginPath(); ctx.arc(sx, cy, 17, 0, 7); ctx.fill();
    ctx.strokeStyle = `rgba(255,255,255,${0.25 + 0.25 * pulse})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(sx - 26, cy); ctx.lineTo(sx + 26, cy);
    ctx.moveTo(sx, cy - 30); ctx.lineTo(sx, cy + 30);
    ctx.stroke();

    // 3. glifos orbitando em elipse (profundidade: trás escuro, frente claro)
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const glifos = '界門光路命風火水';
    for (let i = 0; i < 6; i++) {
      const a = frames * 0.02 + i * (Math.PI / 3) + seed;
      const gx = sx + Math.cos(a) * 44;
      const gyy = cy + Math.sin(a) * 10;
      const front = Math.sin(a) > 0;
      const k = 0.5 + 0.5 * Math.sin(a);
      ctx.fillStyle = `rgba(${col},${0.2 + 0.55 * k})`;
      ctx.font = `700 ${9 + 4 * k}px serif`;
      ctx.fillText(glifos[(i + Math.floor(seed)) % glifos.length], gx, gyy);
      if (front && k > 0.9) {
        ctx.fillStyle = `rgba(255,255,255,${(k - 0.9) * 3})`;
        ctx.fillText(glifos[(i + Math.floor(seed)) % glifos.length], gx, gyy);
      }
    }

    // 4. runas de chão: anéis concêntricos com tiques, pulsando
    for (const [r, al] of [[34, 0.4], [24, 0.28]]) {
      ctx.strokeStyle = `rgba(${col},${al * (0.6 + 0.4 * pulse)})`;
      ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.ellipse(sx, py - 2, r, r * 0.24, 0, 0, 7); ctx.stroke();
    }
    for (let i = 0; i < 8; i++) {
      const a = i * Math.PI / 4 + frames * 0.01;
      ctx.fillStyle = `rgba(${col},${0.5 * pulse})`;
      ctx.fillRect(sx + Math.cos(a) * 29 - 1, py - 2 + Math.sin(a) * 7 - 1, 2, 2);
    }

    // 5. arco de energia ocasional (relâmpago do limiar)
    const ciclo = (frames + seed * 37) % 110;
    if (ciclo < 7) {
      ctx.strokeStyle = `rgba(255,255,255,${0.7 - ciclo * 0.1})`;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      let ly = cy + 8;
      let lx = sx + (seed % 2 ? 8 : -8);
      ctx.moveTo(lx, ly);
      for (let s = 0; s < 4; s++) {
        lx += ((frames * 13 + s * 29 + seed * 7) % 17) - 8;
        ly += 11;
        ctx.lineTo(lx, ly);
      }
      ctx.stroke();
    }

    // 6. motas ascendentes em espiral
    if (Math.random() < 0.35) {
      const a = Math.random() * 7;
      Particles.spawn({
        x: px + Math.cos(a) * 22, y: py - U.rand(0, 10),
        vx: Math.cos(a + 1.7) * 0.4, vy: U.rand(-1.1, -0.5),
        life: 52, size: U.rand(1.2, 2.2),
        color: `rgba(${col},0.85)`, type: 'orb'
      });
    }
    ctx.restore();
  },

  drawAllPortalVFX(ctx, cam, frames) {
    const anchors = [];
    if (World.current === 'floresta') {
      anchors.push([World.firePortal.floresta, '255,140,60', 1]);
      anchors.push([World.windPortal, '190,225,205', 2]);
      if (World.portal && Game.hasAllShogunEssences && Game.hasAllShogunEssences()) {
        anchors.push([World.portal, '255,215,120', 3]);
      }
    } else if (World.current === 'fogo') {
      anchors.push([World.firePortal.fogo, '140,215,255', 4]);
    } else if (World.current === 'vento' && window.WindKingdom && WindKingdom.returnPortal) {
      anchors.push([WindKingdom.returnPortal, '150,220,255', 5]);
    } else if (World.current === 'jardim' && window.AncientGarden) {
      anchors.push([{ x: AncientGarden.PORTAL.x, y: AncientGarden.PORTAL.y }, '150,215,255', 6]);
    }
    for (const [p, col, seed] of anchors) {
      const sx = p.x - cam.x, sy = p.y - cam.y;
      if (sx < -120 || sx > 1080 || sy < -160 || sy > 700) continue;
      ctx.save();
      ctx.translate(-cam.x, -cam.y);
      this.drawPortalVFX(ctx, p.x, p.y, col, frames, seed);
      ctx.restore();
    }
  }
};

window.AncientForge = AncientForge;

// ───────────────────── instalação por wrapping ─────────────────────
(function () {
  const AF = AncientForge;
  AF.buildGeometry();
  AF.spawnEnemies();

  // 1) exploração: coleta, missão, bigorna
  const _exp = Game.exploreUpdate;
  Game.exploreUpdate = function () {
    _exp.call(this);
    if (this.state === 'explore') AF.update(this);
  };

  // 2) cenário da forja + metais no mundo
  const _dw = World.drawWorld;
  World.drawWorld = function (ctx, cam, frames) {
    // A arquitetura é fundo; plataformas e tochas do renderer principal ficam por cima.
    AF.drawForge(ctx, cam, frames);
    _dw.call(this, ctx, cam, frames);
    AF.drawMetals(ctx, cam, frames);
  };
  const _te = World.drawTerrainEmissive;
  World.drawTerrainEmissive = function (ctx, cam, frames) {
    _te.call(this, ctx, cam, frames);
    AF.drawForgeEmissive(ctx, cam, frames);
  };

  // 3) prompt da bigorna
  const _fg = World.drawForeground;
  World.drawForeground = function (ctx, cam, frames, player) {
    _fg.call(this, ctx, cam, frames, player);
    if (World.current === 'fogo' && AF.nearAnvil && !Game.dialog && Game.state === 'explore') {
      const x = AF.ANVIL.x - cam.x, y = AF.ANVIL.y - 96 - cam.y;
      const bob = Math.sin(frames * 0.1) * 3;
      const n = AF.count();
      const txt = AF.imbued ? '鍛 A lâmina canta'
        : n >= 5 && Game.hasDarkKatana ? '↑ Imbuir a Escuridão'
        : `↑ Forja (${n}/5 metais)`;
      ctx.save();
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.font = '600 12px "Segoe UI", sans-serif';
      const w = ctx.measureText(txt).width + 16;
      ctx.fillStyle = 'rgba(8,12,20,0.72)';
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(x - w / 2, y - 10 + bob, w, 20, 6); else ctx.rect(x - w / 2, y - 10 + bob, w, 20);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,206,130,0.95)';
      ctx.fillText(txt, x, y + bob);
      ctx.restore();
    }
  };

  // 4) VFX de todos os portais, por cima do desenho original
  const _rp = World.drawRealmPortals;
  World.drawRealmPortals = function (ctx, cam, frames) {
    _rp.call(this, ctx, cam, frames);
    AF.drawAllPortalVFX(ctx, cam, frames);
  };

  // 5) sprites de campo dos Forjados
  const _fd = FieldEnemy.prototype.draw;
  FieldEnemy.prototype.draw = function (ctx, cam, frames) {
    if (AF.isForgeTier(this.tier) && !this.dead) {
      if (this.map !== World.current) return;
      AF.drawFieldSprite(ctx, this, cam, typeof frames === 'number' ? frames : Game.frames);
      return;
    }
    _fd.call(this, ctx, cam, frames);
  };

  // 6) sprites de batalha (o despacho de fogo cai em drawFireSamurai)
  const _dfs = window.drawFireSamurai;
  window.drawFireSamurai = function (ctx, x, y, s, tier, o = {}) {
    if (AF.isForgeTier(tier)) return AF.drawBattleSprite(ctx, x, y, s, tier, o);
    return _dfs(ctx, x, y, s, tier, o);
  };

  // Silhuetas de naturezas diferentes não devem receber a mesma escala genérica.
  const _scale = Battle.eScale;
  Battle.eScale = function () {
    if (this.E && AF.isForgeTier(this.E.tier)) return AF.battleScale(this.E.tier);
    return _scale.call(this);
  };

  // Arena exclusiva da Forja, mantida fora do centro jogável.
  const _dbg = Battle.drawBg;
  Battle.drawBg = function (ctx, frames) {
    _dbg.call(this, ctx, frames);
    AF.drawBattleBackdrop(ctx, frames, this);
  };

  // 7) turnos próprios dos Forjados. A fila genérica permanece vazia: as
  //    posturas defensiva e agressiva decidem somente quando o turno começa.
  const _et = Battle.enemyTurn;
  Battle.enemyTurn = function () {
    if (this.E && AF.isForgeTier(this.E.tier)) return AF.forgeTurn(this);
    _et.call(this);
  };
  const _es = Battle.ensureScript;
  Battle.ensureScript = function () {
    if (this.E && AF.isForgeTier(this.E.tier)) return AF.ensureForgeScript(this);
    _es.call(this);
  };

  // 8) Toda magia ofensiva registra o dano REAL recebido durante a guarda.
  //    O impacto original continua intacto; a técnica apenas armazena o valor.
  const magicImpacts = [
    ['resolveDarkBoltImpact', 'trevas'],
    ['resolveWaterImpact', 'agua'],
    ['resolveWindImpact', 'vento'],
    ['resolveWaterBarrierImpact', 'agua'],
    ['resolveFireImpact', 'fogo'],
    ['resolveFireBarrierImpact', 'fogo']
  ];
  for (const [method, element] of magicImpacts) {
    const original = Battle[method];
    if (typeof original !== 'function') continue;
    Battle[method] = function (...args) {
      const target = this.E;
      const armed = target && AF.isForgeTier(target.tier)
        && target.defending && target._magicReversal;
      const hpBefore = armed ? target.hp : 0;
      const result = original.apply(this, args);
      if (armed && this.E === target) {
        AF.captureMagicDamage(this, target, Math.max(0, hpBefore - target.hp), element);
      }
      return result;
    };
  }

  // 9) a lâmina imbuída: segundo corte no golpe de vantagem
  const _bb = Battle.begin;
  Battle.begin = function (fieldEnemy, advantage) {
    _bb.call(this, fieldEnemy, advantage);
    this._forgeAction = null;
    if (this.E && AF.isForgeTier(this.E.tier)) {
      this.E._magicReversal = false;
      this.E._reversalReady = false;
      this.E._reversalStored = 0;
      this.E._reversalElement = null;
      this.E._guardCount = 0;
      this.E._forgeMode = null;
      this.E._forgeModeTurns = 0;
      this.E._forgeHeavyCooldown = 0;
      this.E._forgeGuardStreak = 0;
      this.E._forgeLastAction = null;
      this.E._forgeAggressiveStruck = false;
      this.E.script = [];
      AF.setForgeMode(this.E, 'defensivo');
    }
    if (advantage === 'player' && AF.imbued && Game.wielded === 'dark'
      && this.E && !this.E.dummy && !this.E.spirit) {
      const extra = Math.max(2, Math.round(this.E.maxHp * (this.E.isBoss ? 0.05 : 0.10)));
      // o passo precisa nascer como os do push (t inicializado), senão a fila trava
      const msg = '鍛 O Metal Lendário morde fundo — segundo corte da Escuridão!';
      const advantageIndex = this.q.findIndex(step => step.msg && step.msg.startsWith('Golpe de vantagem'));
      const insertAt = advantageIndex >= 0 ? advantageIndex + 1 : Math.max(0, this.q.length - 1);
      this.q.splice(insertAt, 0, {
        t: 0, started: false,
        dur: window.Readability ? Readability.msgFloor(msg, 45) : 45, msg,
        on: () => {
          this.E.hp -= extra; this.E.flash = 1;
          this.floater(this.EX, this.EY - 88, '-' + extra, '#e0b8ff');
          this.shake = 7;
          Game.freezeFrames = Math.max(Game.freezeFrames || 0, 4);
          EnemyVFX.hit(this.E, this.EX, this.EY - 50, true);
          Sfx.hit(true);
          Particles.burst(this.EX, this.EY - 50, 12, () => ({
            x: this.EX + U.rand(-14, 14), y: this.EY - 50 + U.rand(-18, 18),
            vx: U.rand(-2, 2), vy: U.rand(-2, 1),
            life: 30, size: 2.2, color: 'rgba(200,140,255,0.9)', type: 'spark'
          }));
        }
      });
    }
  };

  // 10) persistência (junta-se ao SaveSystem, se presente)
  if (window.SaveSystem) {
    const _ser = SaveSystem.serialize;
    SaveSystem.serialize = function () {
      const d = _ser.call(this);
      d.forge = {
        rosterVersion: AF.ROSTER_VERSION,
        metals: AF.metals.map(m => !!m.taken),
        questActive: AF.questActive,
        imbued: AF.imbued,
        bannerShown: AF.bannerShown
      };
      return d;
    };
    const _lg = SaveSystem.loadGame;
    SaveSystem.loadGame = function () {
      const ok = _lg.call(this);
      if (ok) {
        try {
          const d = JSON.parse(localStorage.getItem(this.KEY));
          if (d && d.forge) {
            (d.forge.metals || []).forEach((t, i) => { if (AF.metals[i]) AF.metals[i].taken = !!t; });
            AF.questActive = !!d.forge.questActive;
            AF.imbued = !!d.forge.imbued;
            AF.bannerShown = !!d.forge.bannerShown;
            // Saves com o trio removido não podem trazer os novos Forjados já
            // mortos. A partir da versão 2, o estado normal volta a persistir.
            if ((Number(d.forge.rosterVersion) || 0) < AF.ROSTER_VERSION
                && typeof Enemies !== 'undefined' && Enemies.list) {
              Enemies.list.filter(e => AF.isForgeTier(e.tier)).forEach(e => {
                if (typeof e.revive === 'function') e.revive();
                else { e.dead = false; e.purified = false; e.absorbed = false; e.cool = 0; }
              });
            }
          }
        } catch (e) { /* save antigo sem forja */ }
      }
      return ok;
    };
  }

})();
