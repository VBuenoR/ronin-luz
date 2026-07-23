'use strict';
// ─── Batalha por turnos ──────────────────────────────────────────────
const Battle = {
  active: false, t: 0,
  P: null, E: null, fieldRef: null,
  q: [], msg: '', msgT: 0,
  menu: { open: false, idx: 0, sub: false, subIdx: 0 },
  playerDef: false, sta: 10,
  playerCast: null,
  playerBurn: null,
  ancestralMark: null,
  enemyProjectile: null,
  ancestralBlast: null,
  floaters: [], shake: 0, shakeX: 0, shakeY: 0, wave: null,
  menuSparks: [], menuFocusT: 0, menuDenyT: 0,
  menuCursorY: null, menuCursorTarget: null,
  anim: { p: 'idle', e: 'idle', px: 0, ex: 0, pFlash: 0, eArm: 0 },
  env: 'forest', over: false, purifyHinted: false,
  atmosphere: null,
  focusCanvas: null,
  heatCanvas: null,
  PX: 270, PY: 408, EX: 688, EY: 408,

  eScale() {
    if (this.E.archetype === 'ancientGolem') return 2.35;
    if (this.E.archetype === 'ashSkeleton') return 2.15;
    if (this.E.tier === 8) return 1.85;
    if (this.E.tier === 12) return 2.15;
    return this.E.isBoss ? 3.4 : 1.75 + Math.min(this.E.tier, 6) * 0.15;
  },

  spiritGlow() { return this.spiritCalm || 0; },

  begin(fieldEnemy, advantage) {
    const cfg = fieldEnemy.spirit ? null : TIERS[fieldEnemy.tier];
    this.active = true; this.t = 0;
    this.q = []; this.floaters = []; this.wave = null;
    this.menuSparks = []; this.menuFocusT = 0; this.menuDenyT = 0;
    this.menuCursorY = null; this.menuCursorTarget = null;
    this.P = Game.player;
    this.fieldRef = fieldEnemy;
    
    // Zoom suave ao iniciar o combate
    Game.cam.targetZoom = 1.12;
    Game.cam.targetOffsetX = 0;
    Game.cam.targetOffsetY = 0;
    
    this.sta = this.P.maxSta;
    this.playerDef = false; this.playerBarrier = null; this.playerHoly = false;
    this.playerCast = null;
    this.playerBurn = null;
    this.ancestralMark = null;
    this.enemyProjectile = null;
    this.ancestralBlast = null;
    this.over = false; this.purifyHinted = false;
    this.menu = { open: false, idx: 0, sub: false, subIdx: 0 };
    this.anim = { p: 'idle', e: 'idle', px: 0, ex: 0, pFlash: 0, eArm: 0 };
    this.msg = ''; this.msgT = 0; this.shake = 0; this.shakeX = 0; this.shakeY = 0;
    this.spiritCalm = 0;
    this.env = fieldEnemy.spirit ? 'spirit'
      : fieldEnemy.map === 'vento' ? 'wind'
      : fieldEnemy.ashValley ? 'abyss'
      : (cfg && cfg.element === 'fogo') ? 'lava'
      : fieldEnemy.swim ? 'abyss'
      : fieldEnemy.y < 1100 ? 'forest'
      : fieldEnemy.x > 6410 ? 'boss'
      : (fieldEnemy.x > 5050 ? 'lake' : 'forest');
    this.mistT = 0;
    this.darkForceHits = 0;
    this.playerParaT = 0;
    this.playerTrapped = 0;
    this.lightningFlash = 0;
    this.windBlastDebuff = false;
    Particles.clear();

    // ── Recuperar Espírito: confronto espiritual (0 de dano, alta esquiva) ──
    if (fieldEnemy.spirit) {
      this.E = {
        name: 'Espírito da Luz', short: 'o Espírito', kanji: '魂', tier: 0,
        isBoss: false, spirit: true, pacified: false, dodge: 0.4,
        hp: fieldEnemy.spiritHp, maxHp: fieldEnemy.spiritHp,
        soco: 0, mare: 0, ult: 0, xp: 0,
        element: 'luz', fly: false, hits: 1, mist: false,
        ancestralMarkImmune: true,
        defending: false, fatigued: false, script: [], flash: 0, hitT: 0,
        aura: 0, dissolve: 0, et: U.rand(0, 100)
      };
      this.initAtmosphere();
      this.push({ dur: 72, msg: 'Da essência perdida ergue-se o Espírito da Luz — um reflexo de você mesmo.' });
      this.push({ dur: 58, msg: '"Prove que ainda é digno de me carregar." Ele não quer te ferir — só testar.' });
      this.push({ dur: 1, on: () => this.openMenu() });
      return;
    }

    const lvl = this.P.level;
    const scale = 1 + (lvl - 1) * 0.15;
    const scaleDmg = 1 + (lvl - 1) * 0.075;
    const scaledHp = Math.round(cfg.hp * scale);
    const scaledSoco = Math.round(cfg.soco * scaleDmg);
    const scaledMare = Math.round(cfg.mare * scaleDmg);
    const baseUlt = fieldEnemy.tier === 13 ? 34
      : fieldEnemy.tier === 10 ? 31
      : fieldEnemy.tier === 9 ? 30
      : 26;
    const scaledUlt = Math.round(baseUlt * scaleDmg);
    const scaledXp = Math.round(cfg.xp * scale);
    const scaledVulcano = Math.round((cfg.vulcanoDamage || cfg.mare || 20) * scaleDmg);
    const scaledRibBurn = Math.max(1, Math.round((cfg.ribBurnDamage || 3) * scaleDmg));
    const scaledVulcanoBurn = Math.max(1, Math.round((cfg.vulcanoBurnDamage || 4) * scaleDmg));

    this.E = {
      name: cfg.name, short: cfg.short, kanji: cfg.kanji, tier: fieldEnemy.tier,
      isBoss: !!cfg.boss, hp: scaledHp, maxHp: scaledHp,
      soco: scaledSoco, mare: scaledMare, ult: scaledUlt, xp: scaledXp,
      element: cfg.element || 'agua', fly: !!cfg.fly, hits: cfg.hits || 1, mist: !!cfg.mist,
      archetype: cfg.archetype || fieldEnemy.archetype || null,
      lightKind: cfg.lightKind || fieldEnemy.lightKind || null,
      miniBoss: !!(cfg.miniBoss || fieldEnemy.miniBoss),
      fireAbsorb: !!cfg.fireAbsorb,
      fireAbsorbRatio: Number.isFinite(cfg.fireAbsorbRatio) ? cfg.fireAbsorbRatio : 0.5,
      extraHpCap: Number.isFinite(cfg.extraHpCap) ? cfg.extraHpCap : 0.5,
      guardReduction: Number.isFinite(cfg.guardReduction) ? cfg.guardReduction : 0.5,
      ribBurnChance: Number.isFinite(cfg.ribBurnChance) ? cfg.ribBurnChance : 0.35,
      ribBurnDamage: scaledRibBurn,
      vulcanoDamage: scaledVulcano,
      vulcanoBurnDamage: scaledVulcanoBurn,
      cocoonHealPct: Number.isFinite(cfg.cocoonHealPct) ? cfg.cocoonHealPct : 0.10,
      ancestralMarkImmune: ['ashSkeleton', 'ancientGolem'].includes(cfg.archetype || fieldEnemy.archetype),
      vulcanoCharged: false, cocoonTurns: 0, cocoonUsed: false,
      storm: !!cfg.storm, stormPhase: false, tornadoCharged: false, evadePhysical: false,
      defending: false, fatigued: false, script: [], flash: 0, hitT: 0,
      aura: 0, dissolve: 0, et: U.rand(0, 100)
    };
    this.initAtmosphere();

    if (this.E.archetype === 'ancientGolem') {
      this.push({
        dur: 76,
        msg: 'As pedras do santuário se fecham — o Daidaidarabotchi da Chama Ancestral rompe o próprio cárcere!'
      });
    } else if (this.E.archetype === 'ashSkeleton') {
      this.push({
        dur: 54,
        msg: 'Um Gashadokuro das Chamas Azuis se contrai e salta das sombras!'
      });
    } else if (this.E.isBoss) {
      this.push({
        dur: 70,
        msg: this.E.element === 'fogo'
          ? 'A caverna inteira range — Kagutsuchi, o Shōgun das Cinzas, desperta!'
          : this.E.element === 'vento'
            ? 'O céu inteiro se curva — Fujin, o Rei do Vento, desperta!'
            : 'O lago inteiro se ergue — Suijin, o Shōgun Afogado, desperta!'
      });
    } else {
      const artigo = this.E.short.startsWith('a ') ? 'Uma' : 'Um';
      this.push({
        dur: 50,
        msg: `${artigo} ${this.E.name} ${this.E.element === 'fogo' ? 'irrompe das chamas!' : 'emerge das sombras!'}`
      });
    }

    if (advantage === 'player') {
      const cut = Math.max(1, Math.round(this.E.maxHp * (this.E.isBoss ? 0.10 : 0.15)));
      this.push({
        dur: 45, msg: 'Golpe de vantagem! Sua lâmina já provou o espírito.',
        on: () => {
          this.E.hp -= cut; this.E.flash = 1;
          this.floater(this.EX, this.EY - 70, '-' + cut, '#fff3cf');
          EnemyVFX.hit(this.E, this.EX, this.EY - 50, false);
          Sfx.hit(false);
        }
      });
      this.push({ dur: 1, on: () => this.openMenu() });
    } else {
      this.push({ dur: 30, msg: 'O espírito te emboscou — ele age primeiro!' });
      this.push({ dur: 1, on: () => this.enemyTurn() });
    }
  },

  // ── atmosfera "pintura respirando" ──
  initAtmosphere() {
    if (!window.BattleAtmosphere) return;
    BattleAtmosphere.init(this.env);
    BattleAtmosphere.setPositions(this.PX, this.PY, this.EX, this.EY);
  },

  push(step) { this.q.push(Object.assign({ t: 0, started: false }, step)); },

  floater(x, y, txt, color, big) {
    this.floaters.push({ x, y, txt, color, t: 0, life: 60, big: !!big });
  },

  cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); },

  // ── loop ──
  update() {
    this.t++;
    if (window.VFX && VFX.update) VFX.update();
    if (window.BattleAtmosphere) {
      // tempo em segundos: passo fixo do laço principal
      BattleAtmosphere.update(1 / 60);
      BattleAtmosphere.setPositions(
        this.PX + this.anim.px, this.PY,
        this.EX + this.anim.ex, this.EY
      );
      // tensão dramática: escolha escurece o salão; impacto abre a luz
      BattleAtmosphere.setDarkness(this.menu.open ? 0.72 : 0.60);
      if (this.shake > 6 || this.E.flash > 0.6 || this.anim.pFlash > 0.6) {
        BattleAtmosphere.impactFlash();
      }
    }
    this.msgT++;
    this.E.flash = this.E.flash > 0.015 ? this.E.flash * 0.58 : 0;
    this.E.hitT = Math.max(0, this.E.hitT - 1);
    this.anim.pFlash = this.anim.pFlash > 0.015 ? this.anim.pFlash * 0.58 : 0;
    this.shake *= 0.86;
    this.shakeX *= 0.62;
    this.shakeY *= 0.62;
    this.anim.px *= 0.86;
    this.anim.ex *= 0.86;
    const claimable = this.E.hp > 0 && this.E.hp <= this.E.maxHp * this.claimThreshold();
    this.E.aura = U.lerp(this.E.aura, claimable && !this.over ? 1 : 0, 0.08);
    if (this.wave) { this.wave.t++; if (this.wave.t > this.wave.dur) this.wave = null; }
    if (this.enemyProjectile) {
      this.enemyProjectile.t++;
      if (this.enemyProjectile.t > this.enemyProjectile.dur + 3) this.enemyProjectile = null;
    }
    if (this.ancestralBlast) {
      this.ancestralBlast.t++;
      if (this.ancestralBlast.t > this.ancestralBlast.dur) this.ancestralBlast = null;
    }
    for (let i = this.floaters.length - 1; i >= 0; i--) {
      const f = this.floaters[i];
      f.t++; f.y -= 0.8;
      if (f.t > f.life) this.floaters.splice(i, 1);
    }
    this.menuFocusT = Math.max(0, this.menuFocusT - 1);
    this.menuDenyT = Math.max(0, this.menuDenyT - 1);
    if (this.menuCursorY !== null && this.menuCursorTarget !== null) {
      this.menuCursorY = U.lerp(this.menuCursorY, this.menuCursorTarget, 0.42);
      if (Math.abs(this.menuCursorY - this.menuCursorTarget) < 0.1) this.menuCursorY = this.menuCursorTarget;
    }
    for (let i = this.menuSparks.length - 1; i >= 0; i--) {
      const spark = this.menuSparks[i];
      spark.t++; spark.x += spark.vx; spark.y += spark.vy;
      if (spark.t >= spark.life) this.menuSparks.splice(i, 1);
    }
    Particles.update();

    if (this.q.length) {
      const c = this.q[0];
      if (!c.started) {
        c.started = true;
        if (c.msg !== undefined) { this.msg = c.msg; this.msgT = 0; }
        if (c.on) c.on();
      }
      c.t++;
      if (c.upd) c.upd(c.t / c.dur);
      if (c.t >= c.dur) this.q.shift();
      return;
    }

    if (this.menu.open) this.menuInput();
  },

  // ── menu ──
  mainOptions() {
    const P = this.P;
    // Se estiver preso em Prisão de Vento, o menu fica limitado
    if (this.playerTrapped > 0) {
      return [
        { id: 'escape', label: '牢  Escapar', ok: true,
          desc: `Tente romper as correntes de vento. 60% de chance (+20% com EST cheia: ${this.sta === P.maxSta ? '80%' : '60%'}).` },
        { id: 'mag', label: '術  Magia', ok: true,
          desc: 'As artes da luz' + (Game.equipped ? ' e dos elementos.' : '.') }
      ];
    }
    // Espírito pacificado: só resta reunir as essências
    if (this.E.spirit && this.E.pacified) {
      return [
        { id: 'recuperar', label: '✦  Recuperar', ok: true,
          desc: 'Estenda a mão. Reúna sua essência e volte a ser inteiro.' },
        { id: 'run', label: '逃  Recuar', ok: true,
          desc: 'Afaste-se. O Espírito continuará esperando.' }
      ];
    }
    const isDark = Game.wielded === 'dark';
    const label = isDark ? '斬  Corte das Trevas' : '斬  Corte de Luz';
    const hasPara = this.playerParaT > 0;
    const critRate = hasPara ? '0%' : (this.darkForceHits > 0 ? '100%' : '50%');
    const atkCost = hasPara ? 4 : 2;
    if (this.E.spirit) {
      return [
        { id: 'atk', label: label, ok: this.sta >= atkCost,
          desc: `Toque o reflexo: ${P.atk} de dano. Ele se esquiva com frequência. Custa ${atkCost} EST.`,
          why: 'Sem fôlego — defenda para recuperar estamina.' },
        { id: 'def', label: '守  Defender', ok: true,
          desc: 'Recupera 2 EST e 3 PM. O Espírito não busca te ferir.' },
        { id: 'run', label: '逃  Recuar', ok: !hasPara,
          desc: 'Afaste-se do confronto. A essência permanece.',
          why: 'Paralisado — suas pernas não obedecem para fugir!' }
      ];
    }
    return [
      { id: 'atk', label: label, ok: this.sta >= atkCost,
        desc: `${isDark ? 'Corte das trevas' : 'Corte de luz'}: ${P.atk} de dano, ${critRate} de crítico (${P.atk * 2}).`
          + (isDark ? ` Crítico suga +${this.darkCritHeal()} PV.` : '') + ` Custa ${atkCost} EST.`,
        why: 'Sem fôlego — defenda para recuperar estamina.' },
      { id: 'def', label: '守  Defender', ok: true,
        desc: hasPara
          ? 'Postura defensiva sob paralisia: reduz o próximo dano em 25%. Recupera 2 EST e 3 PM.'
          : 'Reduz o próximo dano pela metade. Recupera 2 EST e 3 PM — defenda para carregar suas magias.' },
      { id: 'mag', label: '術  Magia', ok: true,
        desc: 'As artes da luz' + (Game.equipped ? ' e dos elementos.' : '.') },
      { id: 'run', label: '逃  Fugir', ok: !this.E.isBoss && !hasPara,
        desc: '65% de chance de escapar do confronto.',
        why: hasPara ? 'Paralisado — suas pernas não obedecem para fugir!' : 'As marés cercam a arena — não há fuga.' }
    ];
  },

  // Dano mágico dos amuletos cresce apenas com espíritos absorvidos.
  // Empunhar a Katana da Escuridão, por si só, não altera essas artes.
  mAtk() { return Game.absorbed * 4; },

  // Rajada Sombria possui progressão própria: 15, 20, 25... por absorção.
  darkBoltDamage() { return 15 + Game.absorbed * 5; },

  ancestralAmuletActive() {
    return Game.fireAmuletForm === 'ancestral' && Game.equipped === 'ka';
  },

  // O malefício do amuleto ancestral afeta todas as artes, não apenas fogo.
  // Menu e execução passam obrigatoriamente por estes helpers para que o custo
  // exibido nunca divirja do PM efetivamente consumido.
  magicCost(base) {
    return this.ancestralAmuletActive()
      ? Math.max(base + 1, Math.round(base * 1.15))
      : base;
  },

  canPayMagic(base) { return this.P.mp >= this.magicCost(base); },

  spendMagic(base) {
    const cost = this.magicCost(base);
    this.P.mp = Math.max(0, this.P.mp - cost);
    return cost;
  },

  // cor da aura de reivindicação: segue a katana empunhada
  claimColor() {
    return Game.hasDarkKatana && Game.wielded === 'dark' ? '170,110,255' : '255,214,110';
  },

  magicOptions() {
    const P = this.P;
    const light = Game.wielded === 'light';
    const ancestral = this.ancestralAmuletActive();
    const cocoonLocked = this.E.archetype === 'ancientGolem' && this.E.cocoonTurns > 0;
    const lh = this.lightHeal();
    const cura = lh > 0 ? ` A luz cura +${lh} ao conjurar.` : '';
    const c4 = this.magicCost(4);
    const c6 = this.magicCost(6), c7 = this.magicCost(7);
    const opts = [
      { id: 'dluz', label: '盾  Defesa da Luz', ok: P.mp >= c6 && light && !Game.essenceLost,
        desc: `Escudo sagrado: bloqueia 75% do próximo dano e cura ${4 + Math.floor(Game.purified * 0.75)} PV. Custa ${c6} PM.`,
        why: Game.essenceLost ? 'Sua essência está perdida — recupere-a para reaver este poder.'
          : !light ? 'A luz não responde à lâmina negra — Q para trocar.' : `PM insuficiente (precisa de ${c6}).` },
      { id: 'pur', label: '浄  Purificar', ok: P.mp >= c7 && light && !cocoonLocked,
        desc: `Vida ≤${this.E.isBoss ? '15% (chefe)' : '20%'}: purificação garantida (+3 PV máx). `
          + (this.E.isBoss
            ? 'Entre esse limite e 50%: chance de 5%.'
            : 'Até 50%: Iluminado concede 20% de chance.')
          + ` Custa ${c7} PM.`,
        why: cocoonLocked ? 'O casulo bloqueia a reivindicação — use Pulso de Água.'
          : !light ? 'A Katana de Luz dorme na bainha — Q para trocar.' : `PM insuficiente (precisa de ${c7}).` }
    ];
    if (Game.hasDarkKatana) {
      opts.push({ id: 'abs', label: '闇  Absorver', ok: P.mp >= c7 && !light && !cocoonLocked,
        desc: `Devora o espírito: vida ≤${this.E.isBoss ? '15% (chefe)' : '20%'} garantido (+4 dano mágico). Abaixo de 50%: 5%. Custa ${c7} PM.`,
        why: cocoonLocked ? 'O casulo bloqueia a reivindicação — use Pulso de Água.'
          : light ? 'Empunhe a Katana da Escuridão — Q para trocar.' : `PM insuficiente (precisa de ${c7}).` });
      opts.push({ id: 'ftrevas', label: '暗  Força das Trevas', ok: P.mp >= c4 && !light,
        desc: `Poder sombrio: crítico garantido nos próximos 2 ATAQUES físicos. Custa ${c4} PM.`,
        why: light ? 'Empunhe a Katana da Escuridão — Q para trocar.' : `PM insuficiente (precisa de ${c4}).` });
      opts.push({ id: 'bolt', label: '呪  Rajada Sombria', ok: P.mp >= c6 && !light,
        desc: `Descarga do poder devorado: ${this.darkBoltDamage()} de dano.${cura} Custa ${c6} PM.`,
        why: light ? 'Empunhe a Katana da Escuridão — Q para trocar.' : `PM insuficiente (precisa de ${c6}).` });
    }
    const md = 7 + this.mAtk(), pd = 16 + this.mAtk();
    if (Game.equipped === 'sui') {
      opts.push({ id: 'bagua', label: '水  Barragem de Água', ok: P.mp >= c6,
        desc: `${md} de dano e ergue uma barreira fluida (bloqueia 50%; apenas 25% contra água e eletricidade).${cura} Custa ${c6} PM.`,
        why: `PM insuficiente (precisa de ${c6}).` });
      opts.push({ id: 'pulso', label: '水  Pulso de Água', ok: P.mp >= c6,
        desc: `Rajada à distância: ${pd} de dano. PERFURA a defesa de espíritos de fogo.${cura} Custa ${c6} PM.`,
        why: `PM insuficiente (precisa de ${c6}).` });
    } else if (Game.equipped === 'ka') {
      if (!ancestral) {
        opts.push({ id: 'bfogo', label: '火  Barragem de Fogo', ok: P.mp >= c6,
          desc: `${md} de dano e círculo de chamas (bloqueia metade — fraco contra água).${cura} Custa ${c6} PM.`,
          why: `PM insuficiente (precisa de ${c6}).` });
      }
      opts.push({ id: 'incin', label: ancestral ? '藍  Incinerar' : '火  Incinerar', ok: P.mp >= c6,
        desc: `Chamas intensas: ${pd} de dano. PERFURA a defesa de espíritos de água.${cura} Custa ${c6} PM.`,
        why: `PM insuficiente (precisa de ${c6}).` });
      if (ancestral) {
        const immune = !!this.E.ancestralMarkImmune;
        const alreadyActive = !!this.ancestralMark;
        opts.push({
          id: 'aincin', label: '蒼  Incinerar Ancestral',
          ok: P.mp >= c6 && !immune && !alreadyActive,
          desc: `Envolve o corpo por 5 ações. Golpes conectados guardam 40% do dano em uma Marca oculta que explode ignorando defesa. Custa ${c6} PM.`,
          why: immune
            ? 'A chama ancestral reconhece este espírito e se recusa a marcá-lo.'
            : alreadyActive
              ? 'Incinerar Ancestral já está ativo — conclua as 5 ações antes de conjurar novamente.'
              : `PM insuficiente (precisa de ${c6}).`
        });
      }
    } else if (Game.equipped === 'wind') {
      opts.push({ id: 'torn', label: '風  Tornado', ok: P.mp >= c6,
        desc: `Turbilhão espiral: ${pd} de dano. PERFURA a defesa de espíritos de água.${cura} Custa ${c6} PM.`,
        why: `PM insuficiente (precisa de ${c6}).` });
    } else if (Game.amulets.sui || Game.amulets.ka || Game.amulets.wind) {
      opts.push({ id: 'lock', label: '珠  (sem amuleto)', ok: false,
        desc: 'Nenhum amuleto equipado. Equipe com E — fora de combate.', why: '' });
    } else {
      opts.push({ id: 'lock', label: '？  — — —', ok: false,
        desc: 'Um poder adormecido. Algo nas profundezas o guarda.', why: '' });
    }
    return opts;
  },

  menuInput() {
    // trocar de katana é uma ação livre
    if (Input.pressed('swap') && Game.hasDarkKatana) {
      Game.swapKatana(true);
      const dark = Game.wielded === 'dark';
      this.msg = dark
        ? '闇 — A lâmina negra desliza para sua mão.'
        : '光 — A lâmina de luz retorna à sua mão.';
      this.msgT = 0;
      Particles.burst(this.PX, this.PY - 40, 10, () => ({
        x: this.PX + U.rand(-12, 12), y: this.PY - 40 + U.rand(-20, 20),
        vx: U.rand(-1.2, 1.2), vy: U.rand(-1.4, 0.2),
        life: 30, size: 2.6,
        color: dark ? 'rgba(170,110,255,0.9)' : 'rgba(255,224,150,0.9)',
        type: 'wisp'
      }));
    }
    const m = this.menu;
    const opts = m.sub ? this.magicOptions() : this.mainOptions();
    const idx = m.sub ? 'subIdx' : 'idx';
    if (Input.pressed('up')) {
      m[idx] = (m[idx] + opts.length - 1) % opts.length;
      this.menuFocus(); Sfx.menuMove();
    }
    if (Input.pressed('downKey')) {
      m[idx] = (m[idx] + 1) % opts.length;
      this.menuFocus(); Sfx.menuMove();
    }
    if (Input.pressed('back') && m.sub) {
      m.sub = false; m.subIdx = 0;
      this.menuFocus(true); Sfx.menuMove(); return;
    }
    if (Input.pressed('confirm')) {
      const opt = opts[m[idx]];
      if (!opt.ok) { this.menuDenyT = 10; Sfx.deny(); return; }
      Sfx.confirm();
      if (!m.sub) {
        if (opt.id === 'recuperar') this.actRecover();
        else if (opt.id === 'escape') this.actEscape();
        else if (opt.id === 'atk') this.actAttack();
        else if (opt.id === 'def') this.actDefend();
        else if (opt.id === 'mag') { m.sub = true; m.subIdx = 0; this.menuFocus(true); }
        else if (opt.id === 'run') this.actFlee();
      } else {
        if (opt.id === 'dluz') this.actLightGuard();
        else if (opt.id === 'pur') this.actPurify();
        else if (opt.id === 'abs') this.actAbsorb();
        else if (opt.id === 'ftrevas') this.actDarkForce();
        else if (opt.id === 'bolt') this.actDarkBolt();
        else if (opt.id === 'bagua') this.actBarrier('agua');
        else if (opt.id === 'pulso') this.actElemBolt('agua');
        else if (opt.id === 'bfogo') this.actBarrier('fogo');
        else if (opt.id === 'incin') this.actElemBolt('fogo');
        else if (opt.id === 'aincin') this.actAncestralIncinerate();
        else if (opt.id === 'torn') this.actElemBolt('wind');
      }
    }
  },

  openMenu() {
    this.playerDef = false;
    if (this.playerBarrier === 'agua') VFX.expireBarrier('water');
    else if (this.playerBarrier === 'fogo') VFX.expireBarrier('fire');
    if (this.playerHoly) VFX.expireBarrier('light');
    this.playerBarrier = null;
    this.playerHoly = false;
    this.playerCast = null;
    if (this.mistT > 0) this.mistT--;
    if (this.playerParaT > 0) this.playerParaT--;
    if (this.playerTrapped > 0) this.playerTrapped--;
    if (this.E) this.E.evadePhysical = false;
    // Força das Trevas dura os próximos 2 ATAQUES (consumida em actAttack), não turnos
    this.anim.p = 'idle';
    this.anim.e = this.E.cocoonTurns > 0
      ? 'cocoon'
      : (this.E.fatigued ? 'hurt' : (this.E.defending ? 'defend' : 'idle'));
    this.ensureScript();
    this.menu.open = true; this.menu.idx = 0; this.menu.sub = false;
    this.menuFocus(true);
    if (this.E.hp > 0 && this.E.hp <= this.E.maxHp * this.claimThreshold() && !this.purifyHinted) {
      this.purifyHinted = true;
      this.msg = Game.hasDarkKatana && Game.wielded === 'dark'
        ? 'O espírito vacila — a escuridão pode devorá-lo agora.'
        : 'O espírito vacila — a luz pode alcançá-lo agora.';
      this.msgT = 0;
    }
  },

  // limiar de reivindicação: 20% para espíritos comuns, 15% para chefes
  claimThreshold() { return this.E.isBoss ? 0.15 : 0.20; },

  // Chance de reivindicar o espírito. Iluminado favorece somente Purificar
  // contra inimigos comuns; chefes e Absorver mantêm os 5% originais.
  claimChance(pct, method) {
    if (pct <= this.claimThreshold() + 0.001) return 1;
    if (pct <= 0.5) {
      return method === 'purify' && !this.E.isBoss ? 0.20 : 0.05;
    }
    return 0;
  },

  // Dano do jogador no inimigo. A frágil Defesa de Ossos bloqueia só 25%;
  // os demais guardas mantêm os 50% já existentes.
  finalDmg(dmg, pierce) {
    if (this.E.defending && !pierce) {
      const reduction = Number.isFinite(this.E.guardReduction) ? this.E.guardReduction : 0.5;
      dmg = Math.max(1, Math.floor(dmg * (1 - U.clamp(reduction, 0, 0.9))));
    }
    if (this.E.fatigued) dmg = Math.round(dmg * 1.5);
    return dmg;
  },

  /**
   * Chamas Ancestrais: magia do amuleto Ka causa zero dano. Metade do dano
   * previsto vira cura; quando a barra já está cheia, torna-se PV extra, com
   * limite de 50% para impedir alimentação infinita da passiva.
   */
  tryAbsorbEnemyFire(dmg) {
    if (!this.E.fireAbsorb) return false;
    const heal = Math.max(1, Math.floor(dmg * this.E.fireAbsorbRatio));
    const cap = Math.ceil(this.E.maxHp * (1 + this.E.extraHpCap));
    const before = this.E.hp;
    // A primeira magia apenas fecha ferimentos. PV extra só começa em uma
    // conjuração posterior, quando o esqueleto já estava com a barra cheia.
    const absorbLimit = before >= this.E.maxHp ? cap : this.E.maxHp;
    this.E.hp = Math.min(absorbLimit, this.E.hp + heal);
    const gained = this.E.hp - before;
    this.E.flash = 0.55;
    this.E.hitT = 0;
    this.msg = gained > 0
      ? 'CHAMAS ANCESTRAIS! O fogo de Ka alimenta o Gashadokuro em vez de feri-lo.'
      : 'CHAMAS ANCESTRAIS! A criatura já transborda vida extra.';
    this.msgT = 0;
    this.floater(this.EX, this.EY - 88, gained > 0 ? `+${gained}` : 'ABSORVIDO', '#8ee6ff', true);
    EnemyVFX.charge(this.E, this.EX, this.EY);
    Particles.burst(this.EX, this.EY - 48, 14, () => ({
      x: this.EX + U.rand(-18, 18), y: this.EY - 48 + U.rand(-24, 18),
      vx: U.rand(-0.7, 0.7), vy: U.rand(-1.8, -0.35), life: U.rand(30, 48),
      size: U.rand(1.8, 3.2), color: 'rgba(105,210,255,0.94)', type: 'wisp'
    }));
    Sfx.tone({ f: 430, f2: 760, dur: 0.42, type: 'sine', vol: 0.12 });
    return true;
  },

  applyPlayerBurn({ damage, turns = null, extinguishable = true, source = 'costela' }) {
    // Vulcano sempre substitui uma queimadura comum. Uma chama impossível de
    // apagar nunca é rebaixada por outra Costela Flamejante.
    if (this.playerBurn && !this.playerBurn.extinguishable && extinguishable) return;
    this.playerBurn = {
      damage: Math.max(1, Math.round(damage)),
      turns: Number.isFinite(turns) ? Math.max(1, Math.round(turns)) : null,
      extinguishable: !!extinguishable,
      source
    };
  },

  clearAncestralMark() {
    this.ancestralMark = null;
  },

  recordAncestralHit(damage) {
    if (!this.ancestralMark || damage <= 0) return;
    this.ancestralMark.stored += damage * 0.40;
    this.ancestralMark.hits++;
    // O total permanece deliberadamente oculto; o jogador conhece apenas
    // quantas vezes alimentou a Marca e quantas ações ainda restam.
    this.floater(this.EX, this.EY - 116, `MARCA ×${this.ancestralMark.hits}`, '#82ddff', false);
    Particles.burst(this.EX, this.EY - 48, 8, () => ({
      x: this.EX + U.rand(-14, 14), y: this.EY - 48 + U.rand(-20, 18),
      vx: U.rand(-0.8, 0.8), vy: U.rand(-1.6, -0.2), life: U.rand(26, 42),
      size: U.rand(1.5, 2.8), color: 'rgba(80,205,255,0.9)', type: 'wisp'
    }));
  },

  actAncestralIncinerate() {
    const cost = this.magicCost(6);
    if (!this.ancestralAmuletActive() || this.ancestralMark || this.E.ancestralMarkImmune || this.P.mp < cost) return;
    this.closeMenu();
    this.spendMagic(6);
    this.ancestralMark = { actionsLeft: 5, stored: 0, hits: 0 };
    this.push({
      dur: 52,
      msg: '蒼 — Incinerar Ancestral! A chama azul envolve seu corpo e grava uma Marca oculta no inimigo.',
      on: () => {
        this.anim.p = 'cast';
        this.playerCast = 'fire';
        Game.cam.targetZoom = 1.2;
        Game.cam.targetOffsetX = 18;
        Sfx.fire();
        Particles.burst(this.PX, this.PY - 40, 24, () => ({
          x: this.PX + U.rand(-22, 22), y: this.PY - 28 + U.rand(-44, 18),
          vx: U.rand(-1.1, 1.1), vy: U.rand(-2.2, -0.5), life: U.rand(34, 60),
          size: U.rand(2, 3.8), color: 'rgba(80,205,255,0.94)', type: 'wisp'
        }));
      }
    });
    this.push({
      dur: 18,
      on: () => {
        this.anim.p = 'idle';
        Game.cam.targetZoom = 1.12;
        Game.cam.targetOffsetX = 0;
      }
    });
    // A ativação consome o turno, mas não uma das cinco ações do efeito.
    this.push({ dur: 1, on: () => this.afterPlayer(false) });
  },

  detonateAncestralMark(mark) {
    this.clearAncestralMark();
    const damage = Math.max(0, Math.round(mark.stored));
    this.push({
      dur: 46,
      msg: damage > 0
        ? `MARCA ANCESTRAL! ${mark.hits} golpe${mark.hits === 1 ? '' : 's'} explode${mark.hits === 1 ? '' : 'm'} de dentro para fora: ${damage} de dano indefensável.`
        : 'A Marca Ancestral se fecha sem alimento e se desfaz em fogo azul.',
      on: () => {
        this.ancestralBlast = { t: 0, dur: 34, target: 'enemy' };
        if (damage > 0) {
          this.E.hp = Math.max(0, this.E.hp - damage);
          this.E.flash = 1;
          this.E.hitT = 18;
          this.shake = 12;
          Game.cam.zoom = 1.42;
          Game.freezeFrames = 8;
          this.floater(this.EX, this.EY - 92, '-' + damage, '#9eeaff', true);
          EnemyVFX.hit(this.E, this.EX, this.EY - 50, true);
          Sfx.hit(true);
        } else {
          Sfx.tone({ f: 340, f2: 180, dur: 0.34, type: 'sine', vol: 0.08 });
        }
        Particles.burst(this.EX, this.EY - 48, damage > 0 ? 30 : 14, () => ({
          x: this.EX + U.rand(-22, 22), y: this.EY - 48 + U.rand(-30, 24),
          vx: U.rand(-3.8, 3.8), vy: U.rand(-3.4, 1.5), life: U.rand(30, 55),
          size: U.rand(1.8, 4), color: 'rgba(90,215,255,0.96)', type: 'wisp'
        }));
      }
    });
    this.push({ dur: 18, on: () => { this.anim.e = this.E.hp > 0 ? 'idle' : 'hurt'; } });
    // Reentra sem contar outra ação: vitória é resolvida antes de queimadura
    // ou turno inimigo, inclusive quando a própria explosão finaliza o alvo.
    this.push({ dur: 1, on: () => this.afterPlayer(false) });
  },

  closeMenu() { this.menu.open = false; },

  // ── ações do jogador ──
  actAttack() {
    this.closeMenu();
    const hasPara = this.playerParaT > 0;
    const cost = hasPara ? 4 : 2;
    this.sta -= cost;
    const forced = this.darkForceHits > 0;   // Força das Trevas: crítico garantido
    const crit = forced || (hasPara ? false : U.chance(0.5));
    const darkBlade = Game.wielded === 'dark'; // Corte das Trevas
    const blocked = this.E.defending;
    const tired = this.E.fatigued;
    // névoa faz errar; o Espírito da Luz esquiva com graça; rajada afasta 50%
    const spiritDodge = this.E.spirit && !this.E.pacified && U.chance(this.E.dodge);
    const missed = spiritDodge || (this.mistT > 0 && U.chance(0.90)) || (this.windBlastDebuff && U.chance(0.5)) || this.E.evadePhysical;
    const dmg = this.finalDmg(this.P.atk * (crit ? 2 : 1));
    this.push({
      dur: 16, msg: 'Você avança, a katana cantando luz...',
      on: () => {
        this.anim.p = 'slash';
        this.anim.px = 60;
        Sfx.slash();
        PlayerVFX.slash(this.PX + 28, this.PY - 46, 1, 2.1,
          Game.wielded === 'dark' ? 'dark' : (Game.equipped || 'light'), crit);
        // Foca e aproxima a câmera da ação do corte
        Game.cam.targetZoom = 1.24;
        Game.cam.targetOffsetX = 45;
      }
    });
    if (missed) {
      let missMsg = 'Você corta apenas névoa — o espírito não estava ali!';
      const S = this.cap(this.E.short);
      if (spiritDodge) missMsg = 'O reflexo se desvia num passo sereno — você golpeia o vazio.';
      else if (this.E.evadePhysical) missMsg = `${S} flutua graciosamente para trás, esquivando-se completamente do corte!`;
      else if (this.windBlastDebuff) missMsg = 'A rajada de vento empurra seus braços — você erra o golpe!';

      this.push({
        dur: 34,
        msg: missMsg,
        on: () => {
          const floaterTxt = spiritDodge || this.E.evadePhysical ? 'esquivou' : 'ERROU';
          const floaterCol = spiritDodge || this.E.evadePhysical ? '#ffe4a0' : '#b8c8d8';
          this.floater(this.EX, this.EY - 80, floaterTxt, floaterCol);
          if (spiritDodge || this.E.evadePhysical) { this.anim.e = 'idle'; this.anim.ex = 44; }
          Sfx.flee();
        }
      });
      this.push({
        dur: 12,
        on: () => {
          this.anim.p = 'idle';
          Game.cam.targetZoom = 1.12;
          Game.cam.targetOffsetX = 0;
          this.windBlastDebuff = false; // Consome o debuff de vento
        }
      });
      this.push({ dur: 1, on: () => this.afterPlayer() });
      return;
    }
    this.push({
      dur: 10,
      on: () => {
        this.E.hp = Math.max(0, this.E.hp - dmg);
        this.recordAncestralHit(dmg);
        this.E.flash = 1;
        this.shake = crit ? 11 : 5;
        Sfx.hit(crit);
        
        // Efeito de Impacto: Zoom punch e Frame Freeze (Hit Stop)
        Game.cam.zoom = crit ? 1.36 : 1.28;
        Game.freezeFrames = crit ? 8 : 4;
        
        this.floater(this.EX, this.EY - 80, '-' + dmg, crit ? '#ffe08a' : '#ffffff', crit);
        if (tired) this.floater(this.EX, this.EY - 108, '疲 em cheio!', '#c8ff9e');
        // consome uma carga de Força das Trevas por golpe que conecta
        if (forced) this.darkForceHits--;
        // passiva da Katana da Escuridão: crítico com Corte das Trevas suga vida
        if (crit && darkBlade && !this.E.spirit) {
          const heal = Math.min(this.darkCritHeal(), this.P.maxHp - this.P.hp);
          if (heal > 0) {
            this.P.hp += heal;
            this.floater(this.PX, this.PY - 96, '+' + heal, '#c9a6ff');
            Particles.burst(this.EX, this.EY - 50, 8, () => ({
              x: this.EX + U.rand(-8, 8), y: this.EY - 50 + U.rand(-10, 10),
              vx: (this.PX - this.EX) * 0.01 + U.rand(-0.6, 0.6), vy: U.rand(-1, 0.4),
              life: 40, size: 2.4, color: 'rgba(170,110,255,0.9)', type: 'wisp'
            }));
          }
        }
        if (crit) { this.msg = 'CRÍTICO! A lâmina atravessa o espírito.'; this.msgT = 0; }
        else if (blocked) { this.msg = 'A couraça elemental apara metade do corte.'; this.msgT = 0; }
        this.windBlastDebuff = false; // Consome o debuff de vento
        this.sparks(this.EX, this.EY - 50, crit ? 16 : 9, Game.wielded === 'dark' ? '#c9a6ff' : '#ffe9b0');
        PlayerVFX.impact(this.EX, this.EY - 50,
          Game.wielded === 'dark' ? 'dark' : (Game.equipped || 'light'), crit);
        EnemyVFX.hit(this.E, this.EX, this.EY - 50, crit);
      }
    });
    this.push({
      dur: 24,
      on: () => {
        this.anim.p = 'idle';
        // Reseta zoom e offsets da câmera para o padrão do combate
        Game.cam.targetZoom = 1.12;
        Game.cam.targetOffsetX = 0;
      }
    });
    this.push({ dur: 1, on: () => this.afterPlayer() });
  },

  actDefend() {
    this.closeMenu();
    this.sta = Math.min(this.P.maxSta, this.sta + 2);
    this.P.mp = Math.min(this.P.maxMp, this.P.mp + 3);
    this.playerDef = true;
    const quenched = !!(this.playerBurn && this.playerBurn.extinguishable);
    const eternal = !!(this.playerBurn && !this.playerBurn.extinguishable);
    if (quenched) this.playerBurn = null;
    this.push({
      dur: 40,
      msg: quenched
        ? 'Você firma a postura e sufoca a chama da Costela. O fogo se apaga! (+2 EST, +3 PM)'
        : eternal
          ? 'Você se protege, mas a marca de Vulcano arde por dentro e não se apaga. (+2 EST, +3 PM)'
          : 'Você firma a postura — a luz se adensa em escudo. (+2 EST, +3 PM)',
      on: () => {
        this.anim.p = 'defend';
        Sfx.defend();
        PlayerVFX.shield(this.PX, this.PY, 'guard', false);
        if (quenched) {
          Particles.burst(this.PX, this.PY - 40, 12, () => ({
            x: this.PX + U.rand(-14, 14), y: this.PY - U.rand(20, 66),
            vx: U.rand(-0.7, 0.7), vy: U.rand(-1.4, -0.2), life: U.rand(20, 34),
            size: U.rand(1.4, 2.7), color: 'rgba(135,220,255,0.72)', type: 'wisp'
          }));
        }
      }
    });
    this.push({ dur: 1, on: () => this.afterPlayer() });
  },

  actEscape() {
    this.closeMenu();
    const bonus = this.sta === this.P.maxSta ? 0.2 : 0;
    const success = U.chance(0.6 + bonus);
    this.push({
      dur: 40, msg: success ? 'Você rompe as correntes de vento!' : 'As correntes de vento resistem!',
      on: () => { Sfx.windGust(true); }
    });
    if (success) {
      this.playerTrapped = 0;
      this.push({ dur: 1, on: () => this.afterPlayer() });
    } else {
      this.push({ dur: 1, on: () => this.enemyTurn() });
    }
  },

  // cura da luz: cada purificação fortalece suas magias com sustento
  lightHeal() { return Math.floor(Game.purified / 2); },

  // roubo de vida da escuridão: escala com absorções — base 2, +1 por absorção
  darkCritHeal() { return 2 + Game.absorbed; },

  castHeal() {
    const h = Math.min(this.lightHeal(), this.P.maxHp - this.P.hp);
    if (h > 0) {
      this.P.hp += h;
      this.floater(this.PX, this.PY - 116, '+' + h, '#9fff9f');
      PlayerVFX.heal(this.PX, this.PY);
    }
  },

  // Defesa da Luz: escudo sagrado — 75% de bloqueio e cura que cresce com purificações
  actLightGuard() {
    this.closeMenu();
    this.spendMagic(6);
    const heal = Math.min(4 + Math.floor(Game.purified * 0.75), this.P.maxHp - this.P.hp);
    this.push({
      dur: 45, msg: '盾 — Defesa da Luz! Um escudo sagrado floresce ao seu redor.',
      on: () => {
        this.anim.p = 'defend';
        this.playerHoly = true;
        Sfx.defend();
        Sfx.holyGuard();
        if (heal > 0) {
          this.P.hp += heal;
          this.floater(this.PX, this.PY - 90, '+' + heal, '#9fff9f');
        }
        PlayerVFX.shield(this.PX, this.PY, 'light', true);
      }
    });
    this.push({ dur: 1, on: () => this.afterPlayer() });
  },

  actPurify() {
    this.closeMenu();
    this.spendMagic(7);
    const pct = this.E.hp / this.E.maxHp;
    this.push({
      dur: 40, msg: '浄 — Você ergue a lâmina e entoa o canto da purificação...',
      on: () => {
        this.anim.p = 'cast';
        this.playerCast = 'purify';
        PlayerVFX.cast(this.PX, this.PY, this.EX, this.EY - 52, 'purify', 40);
        Sfx.tone({ f: 523, dur: 0.5, type: 'sine', vol: 0.15 });
        Sfx.tone({ f: 784, dur: 0.5, type: 'sine', vol: 0.1, delay: 0.15 });
      }
    });
    if (U.chance(this.claimChance(pct, 'purify'))) {
      this.purifySequence();
    } else {
      const failMsg = pct >= 0.5
        ? 'A luz escorre pela água — o espírito ainda está forte demais.'
        : 'O espírito estremece... mas as marés o seguram no fundo.';
      this.push({ dur: 45, msg: failMsg, on: () => { this.anim.p = 'idle'; } });
      this.push({ dur: 1, on: () => this.afterPlayer() });
    }
  },

  actAbsorb() {
    this.closeMenu();
    this.spendMagic(7);
    const pct = this.E.hp / this.E.maxHp;
    this.push({
      dur: 40, msg: '闇 — A lâmina negra se abre como uma boca faminta...',
      on: () => {
        this.anim.p = 'cast';
        this.playerCast = 'dark';
        PlayerVFX.cast(this.PX, this.PY, this.EX, this.EY - 52, 'dark', 40);
        Sfx.absorb();
      }
    });
    if (U.chance(this.claimChance(pct, 'absorb'))) {
      this.absorbSequence();
    } else {
      const failMsg = pct >= 0.5
        ? 'A escuridão morde — mas o espírito ainda é vasto demais para engolir.'
        : 'O espírito escapa por entre os dentes da lâmina.';
      this.push({ dur: 45, msg: failMsg, on: () => { this.anim.p = 'idle'; } });
      this.push({ dur: 1, on: () => this.afterPlayer() });
    }
  },

  actDarkForce() {
    this.closeMenu();
    this.spendMagic(4);
    this.push({
      dur: 45, msg: '暗 — Força das Trevas! Uma aura de KI roxo flamejante envolve o seu corpo.',
      on: () => {
        this.anim.p = 'cast';
        this.playerCast = 'dark';
        this.darkForceHits = 2;
        Sfx.tone({ f: 120, f2: 60, dur: 0.8, type: 'sawtooth', vol: 0.2 });
        Sfx.absorb();
        Particles.burst(this.PX, this.PY - 40, 16, () => ({
          x: this.PX + U.rand(-20, 20), y: this.PY - 40 + U.rand(-20, 20),
          vx: U.rand(-2, 2), vy: U.rand(-2, 2),
          life: 40, size: 3, color: 'rgba(120,60,200,0.8)', type: 'wisp'
        }));
      }
    });
    this.push({ dur: 1, on: () => this.afterPlayer() });
  },

  resolveDarkBoltImpact(dmg) {
    this.E.hp = Math.max(0, this.E.hp - dmg);
    this.E.flash = 1;
    this.E.hitT = 15;
    this.shake = 0;
    this.shakeX = -8.4;
    this.shakeY = -1.2;
    Game.cam.zoom = 1.37;
    Game.freezeFrames = 6;
    this.floater(this.EX, this.EY - 82, '-' + dmg, '#dfa6ff', true);
    PlayerVFX.darkImpact(this.EX, this.EY - 50, this.EY, false);
    EnemyVFX.hit(this.E, this.EX, this.EY - 50, false);
    this.castHeal();
    Sfx.hit(false);
  },

  // Rajada Sombria: 5 formação + 7 aceleração + 6 rotação + 9 impacto
  // + 9 dissipação. Total visual: 36 frames.
  actDarkBolt() {
    this.closeMenu();
    this.spendMagic(6);
    const dmg = this.finalDmg(this.darkBoltDamage());
    this.push({
      dur: 5,
      msg: '呪 — O poder devorado ruge para fora da lâmina!',
      on: () => {
        this.anim.p = 'cast';
        this.playerCast = 'dark';
        Game.cam.targetZoom = 1.17;
        Game.cam.targetOffsetX = 18;
        PlayerVFX.darkPrepare(this.PX, this.PY, this.EX, this.EY - 52);
        Sfx.darkCharge();
      }
    });
    this.push({
      dur: 7,
      on: () => {
        PlayerVFX.darkRelease(this.PX, this.PY, this.EX, this.EY - 52, 13, this.EY);
        this.anim.px = -7;
        Game.cam.targetZoom = 1.24;
        Game.cam.targetOffsetX = 39;
        Sfx.darkBolt();
      }
    });
    this.push({
      dur: 6,
      on: () => {
        Game.cam.targetZoom = 1.27;
        Game.cam.targetOffsetX = 46;
      }
    });
    this.push({ dur: 9, on: () => this.resolveDarkBoltImpact(dmg) });
    this.push({
      dur: 9,
      on: () => {
        PlayerVFX.darkDissipate(this.EX, this.EY - 50);
        this.anim.p = 'idle';
        Game.cam.targetZoom = 1.12;
        Game.cam.targetOffsetX = 0;
      }
    });
    this.push({ dur: 1, on: () => this.afterPlayer() });
  },

  resolveWaterImpact(dmg, pierce) {
    const brokeCocoon = this.E.archetype === 'ancientGolem' && this.E.cocoonTurns > 0;
    if (brokeCocoon) {
      this.E.cocoonTurns = 0;
      this.E.fatigued = true;
      this.E.script = ['fatigue'];
      this.anim.e = 'hurt';
    }
    this.E.hp = Math.max(0, this.E.hp - dmg);
    this.E.flash = 1;
    this.E.hitT = 15;
    this.shake = 0;
    this.shakeX = pierce ? -8.2 : -6.2;
    this.shakeY = 0;
    Game.cam.zoom = pierce ? 1.39 : 1.34;
    Game.freezeFrames = pierce ? 6 : 5;
    this.floater(this.EX, this.EY - 80, '-' + dmg, '#bceeff', true);
    if (brokeCocoon) {
      this.msg = 'PULSO DE ÁGUA! O casulo racha — o Daidaidarabotchi fica fadigado!';
      this.msgT = 0;
      Particles.burst(this.EX, this.EY - 44, 24, () => ({
        x: this.EX + U.rand(-25, 25), y: this.EY - 44 + U.rand(-30, 26),
        vx: U.rand(-3.2, 3.2), vy: U.rand(-3.1, 1.2), life: U.rand(28, 48),
        size: U.rand(1.6, 3.3), color: 'rgba(180,235,255,0.94)', type: 'spark'
      }));
    } else if (pierce) {
      this.msg = 'O elemento oposto PERFURA a couraça!';
      this.msgT = 0;
    }
    PlayerVFX.impact(this.EX, this.EY - 50, 'water', pierce);
    EnemyVFX.hit(this.E, this.EX, this.EY - 50, pierce);
    this.castHeal();
    Sfx.hit(pierce);
  },

  resolveWindImpact(dmg, pierce) {
    this.E.hp = Math.max(0, this.E.hp - dmg);
    this.E.flash = 1;
    this.E.hitT = 15;
    this.shake = 0;
    this.shakeX = pierce ? -8.2 : -6.2;
    this.shakeY = 0;
    Game.cam.zoom = pierce ? 1.39 : 1.34;
    Game.freezeFrames = pierce ? 6 : 5;
    this.floater(this.EX, this.EY - 80, '-' + dmg, '#a2e8c9', true);
    if (pierce) {
      this.msg = 'O sopro do vento dissipa a correnteza!';
      this.msgT = 0;
    }
    VFX.emit('wind', 'impact', { x: this.EX, y: this.EY, heavy: pierce });
    this.castHeal();
    Sfx.hit(pierce);
  },

  actWindTornado(dmg, pierce) {
    this.push({
      dur: 15,
      msg: '風 — Tornado!',
      on: () => {
        this.anim.p = 'cast';
        this.playerCast = 'wind';
        Game.cam.targetZoom = 1.18;
        Game.cam.targetOffsetX = 20;
        VFX.emit('wind', 'prepare', { x: this.PX, y: this.PY, tx: this.EX, ty: this.EY });
      }
    });
    this.push({
      dur: 4,
      on: () => {
        this.anim.px = -6;
        Game.cam.targetZoom = 1.24;
        Game.cam.targetOffsetX = 38;
        Sfx.windMagic();
        VFX.emit('wind', 'tornado', { x: this.EX, y: this.EY, target: this.E });
      }
    });
    this.push({ dur: 22 });
    this.push({ dur: 5, on: () => this.resolveWindImpact(dmg, pierce) });
    this.push({
      dur: 24,
      on: () => {
        this.anim.p = 'idle';
        Game.cam.targetZoom = 1.12;
        Game.cam.targetOffsetX = 0;
      }
    });
    this.push({ dur: 1, on: () => this.afterPlayer() });
  },

  // Pulso de Água: 15 quadros de convergência, 4 de disparo, 12 de voo,
  // impacto com hit-stop e 24 de dissipação antes de devolver o controle.
  actWaterPulse(dmg, pierce) {
    this.push({
      dur: 15,
      msg: '水 — Pulso de Água!',
      on: () => {
        this.anim.p = 'cast';
        this.playerCast = 'water';
        Game.cam.targetZoom = 1.18;
        Game.cam.targetOffsetX = 20;
        PlayerVFX.waterPrepare(this.PX, this.PY, this.EX, this.EY - 52, 'pulse');
      }
    });
    this.push({
      dur: 4,
      on: () => {
        PlayerVFX.waterRelease(this.PX, this.PY, this.EX, this.EY - 52, 12, 'pulse');
        this.anim.px = -6;
        Game.cam.targetZoom = 1.24;
        Game.cam.targetOffsetX = 38;
        Sfx.waterMagic();
      }
    });
    this.push({ dur: 12 });
    this.push({ dur: 5, on: () => this.resolveWaterImpact(dmg, pierce) });
    this.push({
      dur: 24,
      on: () => {
        this.anim.p = 'idle';
        Game.cam.targetZoom = 1.12;
        Game.cam.targetOffsetX = 0;
      }
    });
    this.push({ dur: 1, on: () => this.afterPlayer() });
  },

  // Barragem de Água: a preparação puxa uma cortina vertical do chão; os
  // eventos formam um ciclo único: piso, gêiser, refluxo e parede.
  resolveWaterBarrierImpact(dmg) {
    this.E.hp = Math.max(0, this.E.hp - dmg);
    this.E.flash = 1;
    this.E.hitT = 15;
    this.shake = 0;
    this.shakeX = 0;
    this.shakeY = -4.5;
    Game.cam.zoom = 1.3;
    Game.freezeFrames = 3;
    this.floater(this.EX, this.EY - 88, '-' + dmg, '#bceeff', true);
    VFX.emit('water', 'geyser', { x: this.EX, y: this.EY, heavy: false });
    EnemyVFX.hit(this.E, this.EX, this.EY - 54, false);
    this.castHeal();
    Sfx.hit(false);
  },

  actWaterBarrier(dmg) {
    this.push({
      dur: 12,
      msg: '水 — Barragem de Água! As marés golpeiam e se enroscam em escudo.',
      on: () => {
        this.anim.p = 'groundcast';
        this.playerCast = 'water';
        Game.cam.targetZoom = 1.16;
        Game.cam.targetOffsetX = 12;
        PlayerVFX.waterPrepare(this.PX, this.PY, this.EX, this.EY - 52, 'barrage');
      }
    });
    this.push({
      dur: 6,
      on: () => {
        PlayerVFX.waterRelease(this.PX, this.PY, this.EX, this.EY, 6, 'barrage');
        this.anim.px = -2;
        Game.cam.targetZoom = 1.2;
        Game.cam.targetOffsetX = 28;
        Sfx.waterMagic();
      }
    });
    this.push({
      dur: 4,
      on: () => this.resolveWaterBarrierImpact(dmg)
    });
    this.push({
      dur: 5,
      on: () => {
        VFX.emit('water', 'reflux', {
          x: this.EX, y: this.EY, tx: this.PX + 104, ty: this.PY, travel: 5
        });
      }
    });
    this.push({
      dur: 12,
      on: () => {
        this.playerBarrier = 'agua';
        this.anim.p = 'defend';
        PlayerVFX.shield(this.PX, this.PY, 'agua', false);
        Sfx.defend();
        Game.cam.targetZoom = 1.12;
        Game.cam.targetOffsetX = 0;
      }
    });
    this.push({ dur: 1, on: () => this.afterPlayer() });
  },

  resolveFireImpact(dmg, pierce, isWaterBonus) {
    if (this.tryAbsorbEnemyFire(dmg)) {
      PlayerVFX.impact(this.EX, this.EY - 50, 'fire', false);
      this.castHeal();
      return;
    }
    this.E.hp = Math.max(0, this.E.hp - dmg);
    this.E.flash = 1;
    this.E.hitT = 15;
    this.shake = (pierce || isWaterBonus) ? 12 : 0;
    this.shakeX = pierce ? -9.2 : (isWaterBonus ? -8.5 : -7.2);
    this.shakeY = pierce ? -1.2 : 0;
    Game.cam.zoom = (pierce || isWaterBonus) ? 1.4 : 1.35;
    Game.freezeFrames = isWaterBonus ? 6 : (pierce ? 7 : 5);
    this.floater(this.EX, this.EY - 80, '-' + dmg, isWaterBonus ? '#ffe08a' : '#ffb067', isWaterBonus);
    if (pierce) {
      this.msg = 'O elemento oposto PERFURA a couraça!';
      this.msgT = 0;
    } else if (isWaterBonus) {
      this.msg = 'VANTAGEM ELEMENTAL! Incinerar vaporiza o espírito da água! (×1.2 de dano)';
      this.msgT = 0;
    }
    PlayerVFX.impact(this.EX, this.EY - 50, 'fire', pierce || isWaterBonus);
    EnemyVFX.hit(this.E, this.EX, this.EY - 50, pierce || isWaterBonus);
    this.castHeal();
    Sfx.hit(pierce || isWaterBonus);
  },

  // Incinerar usa o mesmo compasso legível de Pulso, mas com silhueta de
  // lança, aceleração seca e uma detonação que se abre como flor de fogo.
  actFireIncinerate(dmg, pierce, isWaterBonus) {
    this.push({
      dur: 15,
      msg: '火 — Incinerar!',
      on: () => {
        this.anim.p = 'cast';
        this.playerCast = 'fire';
        Game.cam.targetZoom = 1.18;
        Game.cam.targetOffsetX = 20;
        PlayerVFX.firePrepare(this.PX, this.PY, this.EX, this.EY - 52, 'incinerate');
      }
    });
    this.push({
      dur: 4,
      on: () => {
        PlayerVFX.fireRelease(this.PX, this.PY, this.EX, this.EY - 52, 12, 'incinerate');
        this.anim.px = -7;
        Game.cam.targetZoom = 1.25;
        Game.cam.targetOffsetX = 40;
        Sfx.fire();
      }
    });
    this.push({ dur: 12 });
    this.push({ dur: 5, on: () => this.resolveFireImpact(dmg, pierce, isWaterBonus) });
    this.push({
      dur: 24,
      on: () => {
        this.anim.p = 'idle';
        Game.cam.targetZoom = 1.12;
        Game.cam.targetOffsetX = 0;
      }
    });
    this.push({ dur: 1, on: () => this.afterPlayer() });
  },

  resolveFireBarrierImpact(dmg) {
    if (this.tryAbsorbEnemyFire(dmg)) {
      VFX.emit('fire', 'pillar', { x: this.EX, y: this.EY, heavy: false });
      this.castHeal();
      return;
    }
    this.E.hp = Math.max(0, this.E.hp - dmg);
    this.E.flash = 1;
    this.E.hitT = 15;
    this.shake = 0;
    this.shakeX = 0;
    this.shakeY = -5.4;
    Game.cam.zoom = 1.32;
    Game.freezeFrames = 4;
    this.floater(this.EX, this.EY - 88, '-' + dmg, '#ffb067', true);
    VFX.emit('fire', 'pillar', { x: this.EX, y: this.EY, heavy: false });
    EnemyVFX.hit(this.E, this.EX, this.EY - 54, false);
    this.castHeal();
    Sfx.hit(false);
  },

  // Barragem de Fogo: selo no chão, onda de ignição, pilar, refluxo de
  // brasas e, por fim, um anel protetor que permanece até o próximo turno.
  actFireBarrier(dmg) {
    this.push({
      dur: 12,
      msg: '火 — Barragem de Fogo! As chamas mordem e dançam em círculo.',
      on: () => {
        this.anim.p = 'groundcast';
        this.playerCast = 'fire';
        Game.cam.targetZoom = 1.16;
        Game.cam.targetOffsetX = 12;
        PlayerVFX.firePrepare(this.PX, this.PY, this.EX, this.EY - 52, 'barrage');
      }
    });
    this.push({
      dur: 6,
      on: () => {
        PlayerVFX.fireRelease(this.PX, this.PY, this.EX, this.EY, 6, 'barrage');
        this.anim.px = -3;
        Game.cam.targetZoom = 1.21;
        Game.cam.targetOffsetX = 29;
        Sfx.fire();
      }
    });
    this.push({ dur: 4, on: () => this.resolveFireBarrierImpact(dmg) });
    this.push({
      dur: 5,
      on: () => {
        VFX.emit('fire', 'reflux', {
          x: this.EX, y: this.EY, tx: this.PX, ty: this.PY, travel: 5
        });
      }
    });
    this.push({
      dur: 12,
      on: () => {
        this.playerBarrier = 'fogo';
        this.anim.p = 'defend';
        PlayerVFX.shield(this.PX, this.PY, 'fogo', false);
        Sfx.defend();
        Game.cam.targetZoom = 1.12;
        Game.cam.targetOffsetX = 0;
      }
    });
    this.push({ dur: 1, on: () => this.afterPlayer() });
  },

  // Barragem: dano + barreira elemental que dura até seu próximo turno
  actBarrier(elem) {
    this.closeMenu();
    this.spendMagic(6);
    const dmg = this.finalDmg(7 + this.mAtk());
    const agua = elem === 'agua';
    if (agua) {
      this.actWaterBarrier(dmg);
      return;
    }
    this.actFireBarrier(dmg);
  },

  actElemBolt(elem) {
    this.closeMenu();
    this.spendMagic(6);
    const agua = elem === 'agua';
    const pierce = this.E.defending && (
      (elem === 'agua' && this.E.element === 'fogo') ||
      (elem === 'fogo' && this.E.element === 'agua') ||
      (elem === 'wind' && this.E.element === 'agua')
    );
    const isWaterBonus = elem === 'fogo' && this.E.element === 'agua' && !this.E.defending;
    let baseDmg = 16 + this.mAtk();
    if (isWaterBonus) {
      baseDmg = Math.round(baseDmg * 1.2);
    }
    const dmg = this.finalDmg(baseDmg, pierce);
    if (agua) {
      this.actWaterPulse(dmg, pierce);
      return;
    }
    if (elem === 'wind') {
      this.actWindTornado(dmg, pierce);
      return;
    }
    this.actFireIncinerate(dmg, pierce, isWaterBonus);
  },

  actFlee() {
    this.closeMenu();
    // recuar do Espírito nunca falha — mas a essência permanece perdida
    if (this.E.spirit) {
      this.clearAncestralMark();
      this.over = true;
      this.push({
        dur: 40, msg: 'Você recua da própria luz. Ela apenas observa, paciente.',
        on: () => { Sfx.flee(); this.anim.p = 'dash'; }
      });
      this.push({ dur: 1, on: () => Game.finishBattle('spiritFled') });
      return;
    }
    if (U.chance(0.65)) {
      this.clearAncestralMark();
      this.over = true;
      this.push({
      dur: 40, msg: 'Você se desfaz em feixes de luz e escapa!',
      on: () => {
        Sfx.flee();
        this.anim.p = 'dash';
        PlayerVFX.dashStart(this.PX, this.PY - 42, 1, 0,
          Game.wielded === 'dark' ? 'dark' : (Game.equipped || 'light'));
      }
      });
      this.push({ dur: 1, on: () => Game.finishBattle('fled') });
    } else {
      this.push({ dur: 36, msg: 'As águas agarram seus tornozelos — a fuga falhou!' });
      this.push({ dur: 1, on: () => this.afterPlayer() });
    }
  },

  afterPlayer(countAncestralAction = true) {
    // O Espírito nunca é destruído: interrompe o combate ao chegar a ~20%
    if (this.E.spirit && !this.E.pacified) {
      const thr = Math.ceil(this.E.maxHp * 0.2);
      if (this.E.hp <= thr) {
        this.E.hp = thr;
        return this.pacifySequence();
      }
      return this.enemyTurn();
    }
    // A vitória resolve antes do dano periódico: eliminar o inimigo nunca
    // produz uma derrota simultânea injusta.
    if (this.E.hp <= 0) return this.dissolveSequence();

    if (this.E.tier === 13 && !this.E.stormPhase && this.E.hp <= this.E.maxHp * 0.35) {
      return this.enterStormPhaseSequence();
    }

    if (this.ancestralMark && countAncestralAction) {
      this.ancestralMark.actionsLeft = Math.max(0, this.ancestralMark.actionsLeft - 1);
      if (this.ancestralMark.actionsLeft === 0) {
        return this.detonateAncestralMark(this.ancestralMark);
      }
    }

    if (this.playerTrapped > 0) {
      const damage = Math.max(1, Math.round(this.E.soco * 0.4));
      this.push({
        dur: 30,
        msg: `As correntes de vento apertam seu corpo! (−${damage} PV · ${this.playerTrapped} rodada${this.playerTrapped > 1 ? 's' : ''} restante${this.playerTrapped > 1 ? 's' : ''})`,
        on: () => {
          this.P.hp = Math.max(0, this.P.hp - damage);
          this.anim.pFlash = 1;
          this.floater(this.PX, this.PY - 92, '-' + damage, '#9ee8c8', false);
          this.shake = 4;
          Sfx.hurt();
          Particles.burst(this.PX, this.PY - 20, 6, () => ({
            x: this.PX + U.rand(-16, 16), y: this.PY - 20 + U.rand(-16, 16),
            vx: U.rand(-1.2, 1.2), vy: U.rand(-1.2, 1.2),
            life: 20, size: U.rand(1.2, 2.4), color: 'rgba(200,225,245,0.6)', type: 'spark'
          }));
        }
      });
      this.push({
        dur: 1,
        on: () => {
          if (this.P.hp <= 0) this.defeatSequence();
          else {
            this.afterPlayerTrappedDamage();
          }
        }
      });
      return;
    }

    this.afterPlayerTrappedDamage();
  },

  enterStormPhaseSequence() {
    this.E.stormPhase = true;
    this.E.tornadoCharged = false;
    this.E.ult = Math.round(this.E.ult * 1.3);
    this.closeMenu();
    this.push({
      dur: 65,
      msg: 'O Rei do Vento solta um grito ensurdecedor! Os céus se escurecem e raios rasgam as nuvens...',
      on: () => {
        this.anim.e = 'magic';
        Sfx.windSupreme();
        this.lightningFlash = 6;
        this.shake = 15;
        Game.cam.zoom = 1.35;
        Game.cam.targetOffsetX = -45;
        if (window.BattleAtmosphere) {
          BattleAtmosphere.setDarkness(0.9);
        }
      }
    });
    this.push({
      dur: 40,
      msg: 'A Tempestade Suprema desperta! (O Rei do Vento está mais agressivo e veloz)',
      on: () => {
        this.lightningFlash = 4;
        this.anim.e = 'idle';
        Game.cam.targetZoom = 1.12;
        Game.cam.targetOffsetX = 0;
        this.E.script = [];
      }
    });
    this.push({ dur: 1, on: () => this.enemyTurn() });
  },

  afterPlayerTrappedDamage() {
    if (this.playerBurn) {
      const burn = this.playerBurn;
      const damage = burn.damage;
      const lastTick = burn.turns === 1;
      this.push({
        dur: 30,
        msg: burn.source === 'vulcano'
          ? `A marca de Vulcano queima por dentro! (−${damage} PV${lastTick ? ' · a chama enfim cessa' : ''})`
          : `As chamas da Costela continuam ardendo! (−${damage} PV · Defender apaga)`,
        on: () => {
          this.P.hp = Math.max(0, this.P.hp - damage);
          this.anim.pFlash = 1;
          if (this.anim.p !== 'defend') this.anim.p = 'hurt';
          this.floater(this.PX, this.PY - 92, '-' + damage, '#79d8ff', false);
          this.shake = 5;
          Sfx.hurt();
          PlayerVFX.impact(this.PX, this.PY - 42, 'fire', false);
        }
      });
      this.push({ dur: 1, on: () => this.afterPlayerBurn(lastTick) });
      return;
    }
    this.enemyTurn();
  },

  afterPlayerBurn(clearBurn) {
    if (clearBurn) this.playerBurn = null;
    else if (this.playerBurn && Number.isFinite(this.playerBurn.turns)) this.playerBurn.turns--;
    if (this.P.hp <= 0) this.defeatSequence();
    else this.enemyTurn();
  },

  // ── turno do inimigo ──
  ensureScript() {
    if (this.E.archetype === 'ancientGolem') {
      if (this.E.cocoonTurns > 0) {
        this.E.script = [];
        return;
      }
      if (!this.E.cocoonUsed && this.E.hp <= this.E.maxHp * 0.62) {
        this.E.script = ['cocoon'];
        return;
      }
    }
    if (this.E.script.length > 0) return;
    if (this.E.archetype === 'ashSkeleton') {
      const lowHp = this.E.hp < this.E.maxHp * 0.4;
      const aggressive = U.chance(lowHp ? 0.6 : 0.75);
      if (aggressive) {
        const r = Math.random();
        this.E.script = r < 0.4 ? ['soco', 'costela', 'defend']
          : r < 0.75 ? ['costela', 'soco', 'defend']
          : ['costela', 'costela', 'defend'];
      } else {
        this.E.script = U.chance(0.6)
          ? ['defend', 'defend', 'soco']
          : ['defend', 'defend', 'costela'];
      }
    } else if (this.E.element === 'vento') {
      if (this.E.isBoss) {
        if (this.E.stormPhase) {
          const patterns = [
            ['tornadoCharge', 'tornado', 'vendaval', 'suprema', 'investida', 'prisao'],
            ['suprema', 'investida', 'vendaval', 'prisao', 'tornadoCharge', 'tornado'],
            ['tornadoCharge', 'tornado', 'prisao', 'suprema', 'vendaval', 'investida']
          ];
          this.E.script = patterns[Math.floor(Math.random() * patterns.length)].slice();
        } else {
          const patterns = [
            ['vendaval', 'defend', 'investida', 'prisao', 'tornadoCharge', 'tornado'],
            ['tornadoCharge', 'tornado', 'soco', 'investida', 'defend', 'prisao'],
            ['prisao', 'vendaval', 'defend', 'tornadoCharge', 'tornado', 'investida']
          ];
          this.E.script = patterns[Math.floor(Math.random() * patterns.length)].slice();
        }
      } else if (this.E.storm) {
        const patterns = [
          ['raio', 'explosao', 'charge_orb', 'paralisante'],
          ['raio', 'charge_orb', 'paralisante', 'defend'],
          ['explosao', 'raio', 'defend', 'charge_orb', 'paralisante']
        ];
        this.E.script = patterns[Math.floor(Math.random() * patterns.length)].slice();
      } else {
        const patterns = [
          ['corte_aereo', 'esquiva', 'rajada', 'defend'],
          ['corte_aereo', 'rajada', 'defend', 'esquiva'],
          ['esquiva', 'corte_aereo', 'defend', 'rajada']
        ];
        this.E.script = patterns[Math.floor(Math.random() * patterns.length)].slice();
      }
    } else if (this.E.archetype === 'ancientGolem') {
      if (this.E.vulcanoCharged) {
        this.E.script = ['vulcano'];
      } else {
        const lowHp = this.E.hp < this.E.maxHp * 0.4;
        const aggressive = U.chance(lowHp ? 0.5 : 0.75);
        if (aggressive) {
          const r = Math.random();
          this.E.script = r < 0.4 ? ['vulcanoCharge', 'vulcano']
            : r < 0.75 ? ['soco', 'vulcanoCharge', 'vulcano']
            : ['soco', 'soco', 'vulcanoCharge', 'vulcano'];
        } else {
          this.E.script = U.chance(0.6)
            ? ['defend', 'soco', 'vulcanoCharge', 'vulcano']
            : ['defend', 'defend', 'soco'];
        }
      }
    } else if (this.E.isBoss) {
      if (this.E.element === 'fogo') {
        const patterns = [
          ['soco', 'mare', 'defend', 'charge', 'tsunami'],
          ['defend', 'soco', 'charge', 'charge', 'tsunami'],
          ['charge', 'mare', 'defend', 'soco', 'charge']
        ];
        this.E.script = patterns[Math.floor(Math.random() * patterns.length)];
      } else if (this.E.element === 'agua') {
        const patterns = [
          ['soco', 'mare', 'defend', 'charge', 'tsunami'],
          ['charge', 'defend', 'soco', 'soco', 'tsunami'],
          ['charge', 'tsunami', 'soco', 'charge', 'mare']
        ];
        this.E.script = patterns[Math.floor(Math.random() * patterns.length)];
      } else {
        this.E.script = ['soco', 'mare', 'defend', 'charge', 'tsunami'];
      }
    } else if (this.E.mist) {
      // yūrei: a névoa vem cedo, e intercala entre ataques pesados (maré), carga e defesa
      const lowHp = this.E.hp < this.E.maxHp * 0.4;
      const aggressive = U.chance(lowHp ? 0.6 : 0.75);
      if (aggressive) {
        const r = Math.random();
        this.E.script = r < 0.4 ? ['nevoa', 'mare', 'soco']
          : r < 0.75 ? ['charge', 'nevoa', 'mare']
          : ['nevoa', 'mare', 'charge'];
      } else {
        this.E.script = U.chance(0.6)
          ? ['defend', 'nevoa', 'soco']
          : ['defend', 'nevoa', 'defend'];
      }
    } else if (this.E.fly) {
      // voadores: 3 rajadas seguidas até a fadiga, ou 1 rajada e recuo defensivo
      this.E.script = U.chance(0.55)
        ? ['multi', 'multi', 'multi', 'fatigue']
        : ['multi', 'defend'];
    } else {
      // quem ataca, ataca duas vezes e defende; quem defende, defende duas vezes e ataca
      const lowHp = this.E.hp < this.E.maxHp * 0.4;
      const aggressive = U.chance(lowHp ? 0.6 : 0.75);
      if (aggressive) {
        const r = Math.random();
        this.E.script = r < 0.4 ? ['soco', 'mare', 'defend']
          : r < 0.75 ? ['mare', 'soco', 'defend']
          : ['soco', 'soco', 'defend'];
      } else {
        this.E.script = U.chance(0.6)
          ? ['defend', 'defend', 'soco']
          : ['defend', 'defend', 'mare'];
      }
    }
  },

  cocoonHealTurn() {
    const remaining = this.E.cocoonTurns;
    const heal = Math.max(1, Math.ceil(this.E.maxHp * this.E.cocoonHealPct));
    const gained = Math.max(0, Math.min(heal, this.E.maxHp - this.E.hp));
    this.push({
      dur: 52,
      msg: `CHAMA CONSUMIDORA — o casulo absorve o fogo do Reino. (+${gained} PV · ${remaining}/3)`,
      on: () => {
        this.anim.e = 'heal';
        this.E.hp = Math.min(this.E.maxHp, this.E.hp + heal);
        this.E.cocoonTurns = Math.max(0, this.E.cocoonTurns - 1);
        if (gained > 0) this.floater(this.EX, this.EY - 94, '+' + gained, '#8ee6ff', true);
        EnemyVFX.charge(this.E, this.EX, this.EY);
        Sfx.tone({ f: 210, f2: 520, dur: 0.65, type: 'sine', vol: 0.12 });
      }
    });
    if (remaining === 1) {
      this.push({
        dur: 34,
        msg: 'As placas do casulo se abrem. O Daidaidarabotchi volta a caçar.',
        on: () => { this.anim.e = 'idle'; this.E.script = []; }
      });
    }
    this.push({ dur: 10 });
    this.push({ dur: 1, on: () => this.afterEnemy() });
  },

  enemyTurn() {
    this.E.defending = false;
    this.E.fatigued = false;

    // O Espírito da Luz nunca causa dano: esquiva, mantém distância ou faz
    // uma investida leve que passa de raspão — apenas um teste.
    if (this.E.spirit) return this.spiritTurn();

    if (this.E.archetype === 'ancientGolem' && this.E.cocoonTurns > 0) {
      return this.cocoonHealTurn();
    }

    this.ensureScript();
    let action = this.E.script.shift();
    if (this.E.archetype === 'ancientGolem' && action === 'vulcano' && !this.E.vulcanoCharged) {
      this.E.script.unshift('vulcano');
      action = 'vulcanoCharge';
    }
    const S = this.cap(this.E.short);
    const fire = this.E.element === 'fogo';
    const enemyMagicType = this.E.element === 'fogo'
      ? 'fireMagic'
      : this.E.element === 'agua'
        ? 'waterMagic'
        : this.E.element === 'vento'
          ? 'windMagic'
          : 'magic';

    if (action === 'cocoon' && this.E.archetype === 'ancientGolem') {
      this.E.cocoonUsed = true;
      this.E.cocoonTurns = 3;
      // Chama Consumidora gasta a energia acumulada. Se o casulo for quebrado,
      // o Golem precisa anunciar e refazer a Carga antes de lançar Vulcano.
      this.E.vulcanoCharged = false;
      this.E.script = [];
      this.push({
        dur: 64,
        msg: 'ULTIMATE — CHAMA CONSUMIDORA! O Daidaidarabotchi fecha as placas e puxa o fogo do Reino por 3 turnos.',
        on: () => {
          this.anim.e = 'cocoon';
          EnemyVFX.charge(this.E, this.EX, this.EY);
          Game.cam.targetZoom = 1.23;
          Game.cam.targetOffsetX = -42;
          Sfx.charge();
          Particles.burst(this.EX, this.EY - 42, 22, i => ({
            x: this.EX + U.rand(-150, 150), y: this.EY - 42 + U.rand(-100, 70),
            vx: (this.EX - (this.EX + U.rand(-150, 150))) / 48,
            vy: U.rand(-1.2, 1.2), life: 52 + i,
            size: U.rand(1.8, 3.3), color: 'rgba(80,195,255,0.84)', type: 'wisp', drag: 0.98
          }));
        }
      });
      this.push({
        dur: 24,
        on: () => {
          Game.cam.targetZoom = 1.12;
          Game.cam.targetOffsetX = 0;
        }
      });
    } else if (action === 'vulcanoCharge' && this.E.archetype === 'ancientGolem') {
      this.push({
        dur: 60,
        msg: 'CARGA — a boca do Daidaidarabotchi vira uma fornalha azul. Vulcano será o próximo ataque!',
        on: () => {
          this.E.vulcanoCharged = true;
          this.anim.e = 'charge';
          EnemyVFX.charge(this.E, this.EX, this.EY - 8);
          Game.cam.targetZoom = 1.22;
          Game.cam.targetOffsetX = -42;
          Sfx.charge();
        }
      });
      this.push({
        dur: 18,
        on: () => {
          this.anim.e = 'idle';
          Game.cam.targetZoom = 1.12;
          Game.cam.targetOffsetX = 0;
        }
      });
    } else if (action === 'vulcano' && this.E.archetype === 'ancientGolem') {
      this.E.vulcanoCharged = false;
      this.push({
        dur: 18,
        msg: 'VULCANO! O Daidaidarabotchi cospe uma esfera ancestral que explode dentro da sua luz!',
        on: () => {
          this.anim.e = 'magic';
          // A esfera permanece visível até o quadro real do impacto.
          this.launchEnemyProjectile('vulcano', 42);
          EnemyVFX.cast(this.E, this.EX, this.EY - 2, this.PX, this.PY - 42, 24, true);
          Game.cam.targetZoom = 1.27;
          Game.cam.targetOffsetX = -48;
          Sfx.fire();
        }
      });
      this.push({ dur: 22 });
      this.push({
        dur: 8,
        on: () => {
          this.hitPlayer(this.E.vulcanoDamage, 'fireMagic', true);
          if (this.P.hp > 0) {
            this.applyPlayerBurn({
              damage: this.E.vulcanoBurnDamage,
              turns: 3,
              extinguishable: false,
              source: 'vulcano'
            });
            this.floater(this.PX, this.PY - 122, 'VULCANO ×3', '#79d8ff', true);
          }
          this.ancestralBlast = { t: 0, dur: 28 };
        }
      });
      this.push({
        dur: 26,
        on: () => {
          this.anim.e = 'idle';
          Game.cam.targetZoom = 1.12;
          Game.cam.targetOffsetX = 0;
          this.E.script = ['fatigue'];
        }
      });
    } else if (action === 'costela' && this.E.archetype === 'ashSkeleton') {
      this.push({
        dur: 16,
        msg: 'COSTELA FLAMEJANTE! Um osso em chamas azuis gira na sua direção.',
        on: () => {
          this.anim.e = 'magic';
          // A costela cruza toda a arena e só desaparece junto do acerto.
          this.launchEnemyProjectile('costela', 37);
          EnemyVFX.cast(this.E, this.EX, this.EY, this.PX, this.PY - 42, 22, true);
          Game.cam.targetZoom = 1.2;
          Game.cam.targetOffsetX = -34;
          Sfx.fire();
        }
      });
      this.push({ dur: 19 });
      this.push({
        dur: 8,
        on: () => {
          this.hitPlayer(this.E.mare, 'fireMagic', true);
          if (this.P.hp > 0 && U.chance(this.E.ribBurnChance)) {
            if (this.playerDef) {
              this.floater(this.PX, this.PY - 120, 'APAGOU', '#dff8ff', false);
              this.msg = 'A postura Defender sufoca as chamas antes que elas se prendam ao corpo.';
            } else {
              this.applyPlayerBurn({
                damage: this.E.ribBurnDamage,
                turns: null,
                extinguishable: true,
                source: 'costela'
              });
              this.floater(this.PX, this.PY - 120, 'EM CHAMAS', '#79d8ff', false);
              this.msg = 'As chamas da Costela se agarram ao corpo — use Defender para apagá-las!';
            }
            this.msgT = 0;
          }
        }
      });
      this.push({
        dur: 22,
        on: () => {
          this.anim.e = 'idle';
          Game.cam.targetZoom = 1.12;
          Game.cam.targetOffsetX = 0;
        }
      });
    } else if (action === 'defend') {
      this.E.defending = true;
      this.push({
        dur: 40,
        msg: this.E.archetype === 'ashSkeleton'
          ? `${S} cruza braços e costelas — Defesa de Ossos bloqueia apenas 25% do dano.`
          : (fire ? `${S} endurece a lava em couraça de obsidiana.` : `${S} endurece as águas em couraça.`),
        on: () => {
          this.anim.e = 'defend';
          EnemyVFX.guard(this.E, this.EX, this.EY);
          Sfx.tone({ f: fire ? 190 : 240, dur: 0.3, type: 'triangle', vol: 0.16 });
        }
      });
    } else if (action === 'charge') {
      this.push({
        dur: 60,
        msg: this.E.isBoss
          ? (fire ? 'O magma ferve... o Shōgun das Cinzas invoca o teto da caverna!' : 'O mar recua... o Shōgun acumula uma onda colossal!')
          : `${S} acumula a energia das águas!`,
        on: () => {
          this.anim.e = 'charge';
          EnemyVFX.charge(this.E, this.EX, this.EY);
          Sfx.charge();
        }
      });
    } else if (action === 'tsunami') {
      this.push({
        dur: 30,
        msg: fire
          ? 'CHUVA DE METEOROS! O teto desaba em pedras de fogo!'
          : 'TSUNAMI! A parede d\'água desaba sobre você!',
        on: () => {
          this.anim.e = 'magic';
          Sfx.tsunami();
          this.wave = { t: 0, dur: 55, fire };
          EnemyVFX.cast(this.E, this.EX, this.EY, this.PX, this.PY - 42, 30, true);
          // Aproxima a câmera do conjurador inimigo
          Game.cam.targetZoom = 1.22;
          Game.cam.targetOffsetX = -45;
        }
      });
      this.push({ dur: 14, on: () => this.hitPlayer(this.E.ult, enemyMagicType, true) });
      this.push({
        dur: 30,
        on: () => {
          this.anim.e = 'idle';
          Game.cam.targetZoom = 1.12;
          Game.cam.targetOffsetX = 0;
        }
      });
    } else if (action === 'mare') {
      // golpe pesado: defenda ou sofra
      this.push({
        dur: 30,
        msg: fire ? `${S} desencadeia uma ERUPÇÃO!` : `${S} invoca a FÚRIA DA MARÉ!`,
        on: () => {
          this.anim.e = 'magic';
          Sfx.mare();
          this.waterRings(fire ? 'rgba(255,160,80,0.85)' : undefined);
          EnemyVFX.cast(this.E, this.EX, this.EY, this.PX, this.PY - 42, 30, true);
          // Aproxima a câmera do conjurador inimigo
          Game.cam.targetZoom = 1.22;
          Game.cam.targetOffsetX = -45;
        }
      });
      this.push({ dur: 12, on: () => this.hitPlayer(this.E.mare, enemyMagicType, true) });
      this.push({
        dur: 24,
        on: () => {
          this.anim.e = 'idle';
          Game.cam.targetZoom = 1.12;
          Game.cam.targetOffsetX = 0;
        }
      });
    } else if (action === 'nevoa' && this.mistT <= 0) {
      // névoa espessa: seus ATAQUES têm 75% de chance de errar por 2 rodadas
      this.push({
        dur: 40, msg: `${S} exala uma névoa espessa — sua lâmina perde o alvo! (75% de errar)`,
        on: () => {
          this.anim.e = 'magic';
          this.mistT = 2;
          Sfx.mist();
          EnemyVFX.cast(this.E, this.EX, this.EY, this.PX, this.PY - 42, 36, true);
          Particles.burst(this.PX + 120, 300, 16, () => ({
            x: U.rand(120, 840), y: U.rand(180, 440),
            vx: U.rand(-0.4, 0.4), vy: U.rand(-0.2, 0.2),
            life: 90, size: U.rand(8, 16), color: 'rgba(215,235,250,0.25)', type: 'orb'
          }));
          Game.cam.targetZoom = 1.20;
          Game.cam.targetOffsetX = -30;
        }
      });
      this.push({
        dur: 20,
        on: () => {
          this.anim.e = 'idle';
          Game.cam.targetZoom = 1.12;
          Game.cam.targetOffsetX = 0;
        }
      });
    } else if (action === 'nevoa') {
      // névoa já ativa: o yūrei aproveita e soca
      this.push({
        dur: 20, msg: `${S} atravessa a própria névoa com um golpe!`,
        on: () => {
          this.anim.e = 'attack';
          this.anim.ex = -70;
          EnemyVFX.attack(this.E, this.EX, this.EY, this.PX, this.PY - 42, 20, false);
          Game.cam.targetZoom = 1.22;
          Game.cam.targetOffsetX = -40;
        }
      });
      this.push({ dur: 10, on: () => this.hitPlayer(this.E.soco, 'physical') });
      this.push({
        dur: 24,
        on: () => {
          this.anim.e = 'idle';
          Game.cam.targetZoom = 1.12;
          Game.cam.targetOffsetX = 0;
        }
      });
    } else if (action === 'fatigue') {
      // exausto por rajadas, vulcano ou quebra de casulo: perde o turno e recebe 1.5× de dano
      this.E.fatigued = true;
      const fatigueMsg = this.E.archetype === 'ancientGolem'
        ? `${S} está exausto após a chama ancestral! (dano recebido ×1.5)`
        : `${S} arqueja, exausta — as asas falham! (dano recebido ×1.5)`;
      this.push({
        dur: 50, msg: fatigueMsg,
        on: () => {
          this.anim.e = 'hurt';
          EnemyVFX.fatigue(this.E, this.EX, this.EY);
          Sfx.tone({ f: 320, f2: 140, dur: 0.5, type: 'triangle', vol: 0.13 });
        }
      });
    } else if (action === 'multi') {
      // rajada de golpes consecutivos (voadores)
      this.push({
        dur: 24, msg: `${S} dispara uma rajada de brasas — ${this.E.hits} golpes!`,
        on: () => {
          this.anim.e = 'attack';
          this.anim.ex = -60;
          EnemyVFX.attack(this.E, this.EX, this.EY, this.PX, this.PY - 42, 24, true);
          Sfx.fire();
          Game.cam.targetZoom = 1.22;
          Game.cam.targetOffsetX = -40;
        }
      });
      for (let i = 0; i < this.E.hits; i++) {
        this.push({
          dur: 12,
          on: () => { this.anim.ex = -46 - U.rand(0, 18); this.hitPlayer(this.E.soco, enemyMagicType); }
        });
      }
      this.push({
        dur: 22,
        on: () => {
          this.anim.e = 'idle';
          Game.cam.targetZoom = 1.12;
          Game.cam.targetOffsetX = 0;
        }
      });
    } else if (action === 'corte_aereo') {
      this.push({
        dur: 18,
        msg: `${S} mergulha do alto em um voo rasante de lâminas!`,
        on: () => {
          this.anim.e = 'attack';
          this.anim.ex = -90;
          EnemyVFX.attack(this.E, this.EX, this.EY, this.PX, this.PY - 42, 18, false);
          Sfx.windSlash();
          Game.cam.targetZoom = 1.22;
          Game.cam.targetOffsetX = -40;
        }
      });
      for (let i = 0; i < 2; i++) {
        this.push({
          dur: 10,
          on: () => {
            this.anim.ex = -70 - U.rand(0, 10);
            this.hitPlayer(Math.round(this.E.soco * 0.75), 'windMagic');
          }
        });
      }
      this.push({
        dur: 20,
        on: () => {
          this.anim.e = 'idle';
          Game.cam.targetZoom = 1.12;
          Game.cam.targetOffsetX = 0;
        }
      });
    } else if (action === 'rajada') {
      this.push({
        dur: 38,
        msg: `${S} bate as asas violentamente, soprando uma rajada de vento que desestabiliza sua postura!`,
        on: () => {
          this.anim.e = 'magic';
          this.windBlastDebuff = true;
          Sfx.windGust(false);
          EnemyVFX.cast(this.E, this.EX, this.EY - 10, this.PX, this.PY - 42, 28, false);
          Particles.burst(this.PX, this.PY - 42, 10, () => ({
            x: this.PX + U.rand(-30, 30), y: this.PY - 42 + U.rand(-30, 30),
            vx: -3 - U.rand(0, 3), vy: U.rand(-1, 1),
            life: 25, size: U.rand(1.5, 2.5), color: 'rgba(210,235,245,0.8)', type: 'spark'
          }));
          Game.cam.targetZoom = 1.18;
          Game.cam.targetOffsetX = -25;
        }
      });
      this.push({
        dur: 10,
        on: () => {
          this.anim.e = 'idle';
          Game.cam.targetZoom = 1.12;
          Game.cam.targetOffsetX = 0;
        }
      });
    } else if (action === 'esquiva') {
      this.push({
        dur: 35,
        msg: `${S} eleva-se no ar e entra em postura evasiva! (Ataques físicos errarão)`,
        on: () => {
          this.anim.e = 'idle';
          this.E.evadePhysical = true;
          this.anim.ex = 15;
          Sfx.windGust(false);
          EnemyVFX.guard(this.E, this.EX, this.EY);
          Game.cam.targetZoom = 1.18;
          Game.cam.targetOffsetX = -20;
        }
      });
      this.push({
        dur: 10,
        on: () => {
          Game.cam.targetZoom = 1.12;
          Game.cam.targetOffsetX = 0;
        }
      });
    } else if (action === 'raio') {
      this.push({
        dur: 20,
        msg: `${S} lança um relâmpago direto da tempestade!`,
        on: () => {
          this.anim.e = 'magic';
          this.launchEnemyProjectile('raio', 20);
          EnemyVFX.cast(this.E, this.EX, this.EY - 15, this.PX, this.PY - 42, 14, false);
          Game.cam.targetZoom = 1.2;
          Game.cam.targetOffsetX = -30;
          Sfx.windLightning(false);
        }
      });
      this.push({ dur: 12 });
      this.push({
        dur: 8,
        on: () => {
          this.lightningFlash = 4;
          this.hitPlayer(this.E.soco, 'electricMagic');
        }
      });
      this.push({
        dur: 18,
        on: () => {
          this.anim.e = 'idle';
          Game.cam.targetZoom = 1.12;
          Game.cam.targetOffsetX = 0;
        }
      });
    } else if (action === 'explosao') {
      this.push({
        dur: 24,
        msg: `${S} descarrega uma explosão de energia estática ao seu redor!`,
        on: () => {
          this.anim.e = 'magic';
          EnemyVFX.cast(this.E, this.EX, this.EY - 15, this.PX, this.PY - 42, 20, true);
          Game.cam.targetZoom = 1.22;
          Game.cam.targetOffsetX = -35;
          Sfx.windLightning(true);
        }
      });
      this.push({ dur: 10 });
      this.push({
        dur: 8,
        on: () => {
          this.lightningFlash = 5;
          this.hitPlayer(Math.round(this.E.soco * 1.3), 'electricMagic', true);
        }
      });
      this.push({
        dur: 20,
        on: () => {
          this.anim.e = 'idle';
          Game.cam.targetZoom = 1.12;
          Game.cam.targetOffsetX = 0;
        }
      });
    } else if (action === 'charge_orb') {
      this.push({
        dur: 60,
        msg: `${S} condensa uma imensa esfera de eletricidade estática! A Tempestade Paralisante se aproxima!`,
        on: () => {
          this.anim.e = 'charge';
          this.E.orbCharged = true;
          EnemyVFX.charge(this.E, this.EX, this.EY - 15);
          Sfx.windCharge();
          Game.cam.targetZoom = 1.22;
          Game.cam.targetOffsetX = -40;
        }
      });
      this.push({
        dur: 15,
        on: () => {
          this.anim.e = 'idle';
          Game.cam.targetZoom = 1.12;
          Game.cam.targetOffsetX = 0;
        }
      });
    } else if (action === 'paralisante') {
      this.E.orbCharged = false;
      this.push({
        dur: 20,
        msg: `${S} dispara o feixe condensado de Tempestade Paralisante!`,
        on: () => {
          this.anim.e = 'magic';
          this.launchEnemyProjectile('raio', 24);
          EnemyVFX.cast(this.E, this.EX, this.EY - 15, this.PX, this.PY - 42, 18, true);
          Game.cam.targetZoom = 1.25;
          Game.cam.targetOffsetX = -45;
          Sfx.windLightning(true);
        }
      });
      this.push({ dur: 15 });
      this.push({
        dur: 8,
        on: () => {
          this.lightningFlash = 6;
          this.hitPlayer(Math.round(this.E.mare * 1.15), 'electricMagic', true);
          if (this.P.hp > 0) {
            const defFactor = (this.playerDef || this.playerHoly || this.playerBarrier);
            const paraChance = defFactor ? 0.15 : 0.75;
            if (U.chance(paraChance)) {
              this.playerParaT = 2;
              this.floater(this.PX, this.PY - 120, 'PARALISADO', '#ffe178', true);
              this.msg = 'A descarga elétrica paralisou seus músculos! (+2 EST por ataque, sem crítico)';
              this.msgT = 0;
            } else if (defFactor) {
              this.floater(this.PX, this.PY - 120, 'RESISTIU', '#a8dcff', false);
              this.msg = 'Sua postura defensiva absorveu a eletricidade, evitando a paralisia.';
              this.msgT = 0;
            }
          }
        }
      });
      this.push({
        dur: 22,
        on: () => {
          this.anim.e = 'idle';
          Game.cam.targetZoom = 1.12;
          Game.cam.targetOffsetX = 0;
        }
      });
    } else if (action === 'vendaval') {
      this.push({
        dur: 20,
        msg: 'CORTE DO VENDAVAL! O Rei do Vento desfere dois cortes aéreos supersônicos!',
        on: () => {
          this.anim.e = 'attack';
          this.anim.ex = -90;
          EnemyVFX.attack(this.E, this.EX, this.EY - 30, this.PX, this.PY - 42, 16, true);
          Sfx.windSlash();
          Game.cam.targetZoom = 1.25;
          Game.cam.targetOffsetX = -45;
        }
      });
      for (let i = 0; i < 2; i++) {
        this.push({
          dur: 10,
          on: () => {
            this.anim.ex = -80 - U.rand(0, 15);
            this.hitPlayer(Math.round(this.E.soco * 0.95), 'windMagic');
          }
        });
      }
      this.push({
        dur: 20,
        on: () => {
          this.anim.e = 'idle';
          Game.cam.targetZoom = 1.12;
          Game.cam.targetOffsetX = 0;
        }
      });
    } else if (action === 'investida') {
      this.push({
        dur: 15,
        msg: 'INVESTIDA AÉREA! O Rei do Vento desaparece nas correntes de ar...',
        on: () => {
          this.E.dissolve = 1;
          Sfx.windGust(false);
          Game.cam.targetZoom = 1.25;
          Game.cam.targetOffsetX = 10;
        }
      });
      this.push({
        dur: 15,
        on: () => {
          this.anim.ex = -200;
          this.E.dissolve = 0;
          this.anim.e = 'attack';
          Sfx.windGust(true);
        }
      });
      this.push({
        dur: 15,
        msg: '...e mergulha verticalmente em queda livre sobre você!',
        on: () => {
          this.anim.ex = -60;
          EnemyVFX.attack(this.E, this.PX, this.PY - 100, this.PX, this.PY - 42, 10, true);
          Game.cam.zoom = 1.35;
          Game.cam.targetOffsetX = 50;
        }
      });
      this.push({
        dur: 8,
        on: () => {
          this.hitPlayer(Math.round(this.E.mare * 1.1), 'windMagic', true);
        }
      });
      this.push({
        dur: 20,
        on: () => {
          this.anim.e = 'idle';
          this.anim.ex = 0;
          Game.cam.targetZoom = 1.12;
          Game.cam.targetOffsetX = 0;
        }
      });
    } else if (action === 'tornadoCharge') {
      this.E.tornadoCharged = true;
      this.push({
        dur: 45,
        msg: 'CARGA DE VENTO! O Rei do Vento comprime as correntes ao redor da lâmina — o Tornado vem a seguir!',
        on: () => {
          this.anim.e = 'charge';
          EnemyVFX.charge(this.E, this.EX, this.EY - 24);
          Sfx.windCharge();
          Game.cam.targetZoom = 1.2;
          Game.cam.targetOffsetX = -34;
        }
      });
      this.push({
        dur: 18,
        on: () => {
          this.anim.e = 'idle';
          Game.cam.targetZoom = 1.12;
          Game.cam.targetOffsetX = 0;
        }
      });
    } else if (action === 'tornado') {
      this.E.tornadoCharged = false;
      this.push({
        dur: 24,
        msg: 'TORNADO! Um turbilhão espiral de vento varre toda a arena!',
        on: () => {
          this.anim.e = 'magic';
          this.wave = { t: 0, dur: 55, wind: true };
          Sfx.windMagic();
          EnemyVFX.cast(this.E, this.EX, this.EY - 30, this.PX, this.PY - 42, 28, true);
          Game.cam.targetZoom = 1.22;
          Game.cam.targetOffsetX = -45;
        }
      });
      this.push({ dur: 14, on: () => this.hitPlayer(Math.round(this.E.mare * 1.15), 'windMagic', true) });
      this.push({
        dur: 24,
        on: () => {
          this.anim.e = 'idle';
          Game.cam.targetZoom = 1.12;
          Game.cam.targetOffsetX = 0;
        }
      });
    } else if (action === 'prisao') {
      this.push({
        dur: 30,
        msg: 'PRISÃO DE VENTO! Correntes aéreas circulares se fecham ao seu redor!',
        on: () => {
          this.anim.e = 'magic';
          this.playerTrapped = 3;
          Sfx.windPrison();
          EnemyVFX.cast(this.E, this.EX, this.EY - 30, this.PX, this.PY - 42, 22, true);
          Particles.burst(this.PX, this.PY - 20, 15, () => ({
            x: this.PX + U.rand(-40, 40), y: this.PY - 20 + U.rand(-40, 40),
            vx: (this.PX - (this.PX + U.rand(-40, 40))) / 18,
            vy: U.rand(-1, 1), life: 20, size: U.rand(1.5, 2.5),
            color: 'rgba(200,225,245,0.7)', type: 'wisp'
          }));
          Game.cam.targetZoom = 1.25;
          Game.cam.targetOffsetX = -30;
        }
      });
      this.push({
        dur: 15,
        on: () => {
          this.anim.e = 'idle';
          Game.cam.targetZoom = 1.12;
          Game.cam.targetOffsetX = 0;
        }
      });
    } else if (action === 'suprema') {
      this.push({
        dur: 30,
        msg: 'TEMPESTADE SUPREMA! O Rei do Vento convoca a tormenta absoluta!',
        on: () => {
          this.anim.e = 'magic';
          this.wave = { t: 0, dur: 65, wind: true };
          this.lightningFlash = 5;
          Sfx.windSupreme();
          EnemyVFX.cast(this.E, this.EX, this.EY - 30, this.PX, this.PY - 42, 35, true);
          Game.cam.targetZoom = 1.3;
          Game.cam.targetOffsetX = -50;
        }
      });
      this.push({ dur: 18, on: () => {
        this.lightningFlash = 8;
        this.hitPlayer(this.E.ult, 'electricMagic', true);
      } });
      this.push({
        dur: 30,
        on: () => {
          this.anim.e = 'idle';
          Game.cam.targetZoom = 1.12;
          Game.cam.targetOffsetX = 0;
        }
      });
    } else {
      this.push({
        dur: 20,
        msg: this.E.archetype === 'ashSkeleton'
          ? `${S} salta para a frente e golpeia com os ossos em brasa azul!`
          : this.E.archetype === 'ancientGolem'
            ? `${S} descarrega um punho de rocha vulcânica!`
            : (fire ? `${S} desfere um golpe de brasas!` : `${S} desfere um soco de maré!`),
        on: () => {
          this.anim.e = 'attack';
          this.anim.ex = -70;
          EnemyVFX.attack(this.E, this.EX, this.EY, this.PX, this.PY - 42, 20, false);
          Game.cam.targetZoom = 1.22;
          Game.cam.targetOffsetX = -40;
        }
      });
      this.push({ dur: 10, on: () => this.hitPlayer(this.E.soco, 'physical') });
      this.push({
        dur: 24,
        on: () => {
          this.anim.e = 'idle';
          Game.cam.targetZoom = 1.12;
          Game.cam.targetOffsetX = 0;
        }
      });
    }
    this.push({ dur: 12 });
    this.push({ dur: 1, on: () => this.afterEnemy() });
  },

  hitPlayer(base, kind, big) {
    const damageType = ({
      fogo: 'fireMagic', agua: 'waterMagic', vento: 'windMagic',
      eletrico: 'electricMagic', fisico: 'physical'
    })[kind] || kind;
    let dmg = base;
    let note = null;
    let ancestralNote = null;
    let ancestralHeal = 0;
    let barrierWeak = false;
    if (this.playerHoly) {
      // Defesa da Luz: 75% de bloqueio, sem fraqueza elemental
      dmg = Math.max(1, Math.floor(dmg * 0.25));
      note = '盾 a luz apara!';
    } else if (this.playerBarrier) {
      // A barragem de fogo é fraca contra água. A barragem de água perde
      // eficiência contra Maré/magia de água e contra ataques elétricos.
      const weakToWater = damageType === 'waterMagic'
        && (this.playerBarrier === 'fogo' || this.playerBarrier === 'agua');
      const weakToElectric = damageType === 'electricMagic' && this.playerBarrier === 'agua';
      const weak = weakToWater || weakToElectric;
      barrierWeak = weak;
      dmg = Math.max(1, Math.floor(dmg * (weak ? 0.75 : 0.5)));
      note = weakToElectric
        ? 'A eletricidade ATRAVESSA a barragem!'
        : weakToWater && this.playerBarrier === 'agua'
          ? 'A maré ROMPE a barragem!'
          : weakToWater
            ? 'A água APAGA a barragem!'
            : '障 barragem: metade!';
    } else if (this.playerDef) {
      const reduction = this.playerParaT > 0 ? 0.75 : 0.5;
      dmg = Math.max(1, Math.floor(dmg * reduction));
      note = this.playerParaT > 0 ? '守 paralisado: -25%!' : '守 metade!';
    }

    // Passivas do Amuleto de Fogo Ancestral. Modificadores são aplicados
    // depois de Defender/barreiras, como indicado pelos valores do HUD.
    // Queimaduras e perigos de cenário não passam por hitPlayer e, portanto,
    // jamais são convertidos em cura.
    if (this.ancestralAmuletActive()) {
      if (damageType === 'fireMagic') {
        ancestralHeal = dmg * 0.20;
        dmg -= ancestralHeal;
        ancestralNote = 'ANCESTRAL: 20% absorvido';
      } else if (damageType === 'waterMagic') {
        dmg = Math.max(1, Math.round(dmg * 1.20));
        ancestralNote = 'FRAQUEZA À ÁGUA: +20%';
      } else if (damageType === 'physical') {
        dmg = Math.max(1, Math.round(dmg * 1.15));
        ancestralNote = 'CORPO INCENDIADO: +15% físico';
      }
    }
    const shieldKind = this.playerHoly ? 'light'
      : (this.playerBarrier || (this.playerDef ? 'guard' : null));
    const hpBefore = this.P.hp;
    // O clamp acontece uma única vez, depois de dano e cura. Assim, a chama
    // convertida reduz o impacto, mas nunca ressuscita o jogador após overkill.
    const nextHp = U.clamp(hpBefore - dmg + ancestralHeal, 0, this.P.maxHp);
    this.P.hp = Math.round(nextHp * 10) / 10;
    const healed = this.P.hp > 0 ? ancestralHeal : 0;
    const formatAmount = value => Number.isInteger(value) ? value : value.toFixed(1);
    this.anim.pFlash = 1;
    if (this.anim.p !== 'defend') this.anim.p = 'hurt';
    this.shake = big ? 16 : 7;
    
    // Zoom punch e Hit freeze nos impactos recebidos pelo jogador
    Game.cam.zoom = big ? 1.35 : 1.25;
    Game.freezeFrames = big ? 9 : 5;
    
    Sfx.hurt();
    const col = damageType === 'waterMagic' ? '#7fd4ff'
      : damageType === 'fireMagic' ? '#75d9ff'
      : damageType === 'electricMagic' ? '#ffe178'
      : damageType === 'windMagic' ? '#9ee8c8'
      : '#ffffff';
    this.floater(this.PX, this.PY - 90, '-' + formatAmount(dmg), col, big);
    if (note) this.floater(this.PX, this.PY - 116, note, note.includes('!') && note.length > 14 ? '#ff9a7a' : '#ffe9b0');
    if (ancestralNote) this.floater(this.PX, this.PY - (note ? 140 : 116), ancestralNote, '#91e6ff');
    if (healed > 0) {
      this.floater(this.PX + 34, this.PY - 88, '+' + formatAmount(healed), '#9fffcf');
      PlayerVFX.heal(this.PX, this.PY);
    }
    if (shieldKind !== 'agua' && shieldKind !== 'fogo' && shieldKind !== 'light') {
      this.sparks(this.PX, this.PY - 40, 8, col === '#ffffff' ? '#ffd9a0' : col);
    }
    if (shieldKind === 'light') {
      Game.freezeFrames = 3;
      this.shake = 0;
      this.shakeX = -2.2;
      this.shakeY = 0;
      VFX.hitBarrier('light', { x: this.PX + 58, y: this.PY - 48 });
    } else if (shieldKind && barrierWeak && shieldKind === 'agua') {
      Game.freezeFrames = 3;
      VFX.breakBarrier('water', { x: this.PX, y: this.PY });
    } else if (shieldKind && barrierWeak && shieldKind === 'fogo') {
      Game.freezeFrames = 3;
      VFX.breakBarrier('fire', { x: this.PX, y: this.PY });
    } else if (shieldKind === 'agua') {
      Game.freezeFrames = 2;
      this.shake = 0;
      this.shakeX = -2.5;
      this.shakeY = 0;
      VFX.hitBarrier('water', { x: this.PX, y: this.PY - 64 });
    } else if (shieldKind === 'fogo') {
      Game.freezeFrames = 2;
      this.shake = 0;
      this.shakeX = -3.2;
      this.shakeY = -0.8;
      VFX.hitBarrier('fire', { x: this.PX, y: this.PY - 34 });
    } else if (shieldKind) {
      const incomingVfx = damageType === 'waterMagic'
        ? 'water'
        : damageType === 'fireMagic'
          ? 'fire'
          : (damageType === 'windMagic' || damageType === 'electricMagic')
            ? 'wind'
            : 'physical';
      PlayerVFX.block(this.PX, this.PY, shieldKind, incomingVfx);
    }
    else PlayerVFX.impact(this.PX, this.PY - 42,
      damageType === 'waterMagic' ? 'water'
        : damageType === 'fireMagic' ? 'fire'
          : (damageType === 'windMagic' || damageType === 'electricMagic') ? 'wind' : 'guard', !!big);
  },

  afterEnemy() {
    if (this.P.hp <= 0) this.defeatSequence();
    else this.openMenu();
  },

  // ── Recuperar Espírito: turno pacífico, pacificação e reunião ──
  spiritTurn() {
    const dodge = U.chance(0.5);
    if (dodge) {
      this.push({
        dur: 34, msg: 'O Espírito desliza para longe, mantendo distância — elegante, sereno.',
        on: () => {
          this.anim.e = 'idle'; this.anim.ex = 40;
          Sfx.tone({ f: 660, dur: 0.18, type: 'sine', vol: 0.08 });
          Particles.burst(this.EX, this.EY - 40, 6, () => ({
            x: this.EX + U.rand(-10, 10), y: this.EY - 40 + U.rand(-16, 16),
            vx: U.rand(-0.6, 0.6), vy: U.rand(-1, 0.2),
            life: 30, size: 2, color: 'rgba(255,232,170,0.85)', type: 'wisp'
          }));
        }
      });
    } else {
      this.push({
        dur: 26, msg: 'O reflexo avança numa investida leve — e passa sem te ferir.',
        on: () => { this.anim.e = 'attack'; this.anim.ex = -50; Sfx.slash(); }
      });
      this.push({
        dur: 14,
        on: () => {
          this.anim.e = 'idle';
          this.floater(this.PX, this.PY - 96, 'sem dano', '#ffe9b0');
          Particles.burst(this.PX, this.PY - 40, 5, () => ({
            x: this.PX + U.rand(-10, 10), y: this.PY - 40 + U.rand(-14, 14),
            vx: U.rand(-0.8, 0.8), vy: U.rand(-1.2, 0),
            life: 26, size: 2, color: 'rgba(255,236,180,0.8)', type: 'wisp'
          }));
        }
      });
    }
    this.push({ dur: 10 });
    this.push({ dur: 1, on: () => this.afterEnemy() });
  },

  pacifySequence() {
    this.E.pacified = true;
    this.spiritCalm = 1;
    // brilho dourado toma o cenário; o tempo se acalma
    BattleAtmosphere && BattleAtmosphere.setDarkness && BattleAtmosphere.setDarkness(0.4);
    this.push({
      dur: 70,
      msg: 'O Espírito para. Uma luz dourada intensa emana dele — ele aceita.',
      on: () => {
        this.anim.e = 'victory';
        this.E.aura = 1;
        Game.cam.targetZoom = 1.2;
        Game.cam.targetOffsetX = 0;
        Sfx.tone({ f: 523, dur: 0.8, type: 'sine', vol: 0.12 });
        Sfx.tone({ f: 659, dur: 0.9, type: 'sine', vol: 0.1, delay: 0.2 });
        Sfx.tone({ f: 784, dur: 1.0, type: 'sine', vol: 0.09, delay: 0.4 });
        Particles.burst(this.EX, this.EY - 44, 24, () => ({
          x: this.EX + U.rand(-24, 24), y: this.EY - 44 + U.rand(-30, 20),
          vx: U.rand(-0.6, 0.6), vy: U.rand(-1.6, -0.3),
          life: 70, size: 3, color: 'rgba(255,232,170,0.95)', type: 'wisp'
        }));
      }
    });
    this.push({ dur: 45, msg: '✦ É hora de Recuperar. Estenda a mão e reúna sua essência.' });
    this.push({ dur: 1, on: () => this.openMenu() });
  },

  actRecover() {
    this.closeMenu();
    this.over = true;
    Game.cam.targetZoom = 1.3;
    Game.cam.targetOffsetX = 0;
    Game.cam.targetOffsetY = -10;
    this.push({
      dur: 55,
      msg: 'Você estende a mão em direção ao Espírito...',
      on: () => {
        this.anim.p = 'cast';
        this.anim.e = 'idle';
        Sfx.tone({ f: 523, dur: 0.6, type: 'sine', vol: 0.12 });
      }
    });
    this.push({
      dur: 80,
      msg: 'Luz envolve os dois. Suas essências se reconhecem — e voltam a ser uma.',
      on: () => {
        Sfx.levelup();
        // as duas silhuetas se dissolvem uma na outra
        Particles.burst((this.PX + this.EX) / 2, this.PY - 44, 40, () => ({
          x: U.lerp(this.PX, this.EX, Math.random()) + U.rand(-12, 12),
          y: this.PY - 44 + U.rand(-40, 20),
          vx: U.rand(-1.2, 1.2), vy: U.rand(-2.2, -0.4),
          life: 80, size: 3.4, color: 'rgba(255,240,190,0.95)', type: 'wisp'
        }));
      },
      upd: k => { this.E.dissolve = k; }
    });
    this.push({
      dur: 55,
      msg: 'Vida máxima restaurada. A Defesa da Luz responde novamente à sua mão.',
      on: () => {
        if (typeof SpiritOfLight !== 'undefined') SpiritOfLight.recover();
        this.anim.p = 'victory';
        Sfx.victory();
      }
    });
    this.push({ dur: 1, on: () => Game.finishBattle('recovered') });
  },

  // ── desfechos ──
  dissolveSequence() {
    this.clearAncestralMark();
    this.over = true;
    const fire = this.E.element === 'fogo';
    const ancestral = this.E.lightKind === 'blueFire';
    const dissolveMsg = this.E.archetype === 'ancientGolem'
      ? 'O Daidaidarabotchi racha de dentro para fora — a chama ancestral abandona a rocha!'
      : this.E.archetype === 'ashSkeleton'
        ? 'Os ossos desabam e as chamas azuis se libertam!'
        : (fire ? 'O espírito de fogo se desfaz em brasas!' : 'O espírito d\'água colapsa em chuva!');
    this.push({
      dur: 55, msg: dissolveMsg,
      on: () => {
        Sfx.splash();
        Particles.burst(this.EX, this.EY - 50, 26, () => ({
          x: this.EX + U.rand(-24, 24), y: this.EY - 50 + U.rand(-30, 30),
          vx: U.rand(-3, 3), vy: fire ? U.rand(-3.5, -0.8) : U.rand(-5, -1), grav: fire ? 0 : 0.25,
          life: 50, size: 3, color: ancestral
            ? 'rgba(100,210,255,0.94)'
            : (fire ? 'rgba(255,146,76,0.92)' : 'rgba(140,210,255,0.9)'),
          type: fire ? 'wisp' : 'drop'
        }));
        EnemyVFX.hit(this.E, this.EX, this.EY - 50, true);
      },
      upd: k => { this.E.dissolve = k; }
    });
    this.victory('won');
  },

  purifySequence() {
    this.clearAncestralMark();
    this.over = true;
    this.push({
      dur: 26, msg: this.E.lightKind === 'blueFire'
        ? 'A luz encontra uma fresta entre os ossos e a chama ancestral—'
        : 'A luz encontra uma fresta na correnteza—',
      on: () => { this.E.aura = 1; Sfx.purify(); }
    });
    this.push({
      dur: 80, msg: 'O espírito se desfaz em luz!',
      on: () => {
        Particles.burst(this.EX, this.EY - 50, 30, () => ({
          x: this.EX + U.rand(-20, 20), y: this.EY - 40 + U.rand(-30, 20),
          vx: U.rand(-0.8, 0.8), vy: U.rand(-2.4, -0.8),
          life: 70, size: 3.5, color: 'rgba(255,232,170,0.95)', type: 'wisp'
        }));
      },
      upd: k => { this.E.dissolve = k; }
    });
    this.victory('purified');
  },

  absorbSequence() {
    this.clearAncestralMark();
    this.over = true;
    this.push({
      dur: 26, msg: 'A escuridão encontra a fresta—',
      on: () => { this.E.aura = 1; Sfx.absorb(); }
    });
    this.push({
      dur: 80, msg: 'Sua lâmina BEBE o espírito. O poder escorre para dentro de você.',
      on: () => {
        // energia flui do inimigo para o jogador
        Particles.burst(this.EX, this.EY - 50, 30, () => ({
          x: this.EX + U.rand(-20, 20), y: this.EY - 50 + U.rand(-30, 20),
          vx: U.rand(-8, -5), vy: U.rand(-1.2, 1.2),
          life: 60, size: 3.2, drag: 0.99,
          color: 'rgba(170,110,255,0.95)', type: 'wisp'
        }));
      },
      upd: k => { this.E.dissolve = k; }
    });
    this.victory('absorbed');
  },

  // mode: 'won' (disperso em chuva) | 'purified' | 'absorbed'
  victory(mode) {
    this.clearAncestralMark();
    Game.cam.targetZoom = 1.25;
    Game.cam.targetOffsetX = -60;
    Game.cam.targetOffsetY = -30;

    const P = this.P;
    const claimed = mode !== 'won';
    const xpGain = Math.round(this.E.xp * (claimed ? 1.5 : 1));
    const essGain = claimed ? 2 : 1;

    Game.essences += essGain;
    if (mode === 'purified') {
      Game.purified++;
      P.maxHp += 3;
      P.hp = Math.min(P.maxHp, P.hp + 9);
      P.mp = Math.min(P.maxMp, P.mp + 4);
    } else if (mode === 'absorbed') {
      Game.absorbed++;
      P.mp = Math.min(P.maxMp, P.mp + 6);
    } else {
      Game.kills++;
      P.mp = Math.min(P.maxMp, P.mp + 2);
    }
    P.xp += xpGain;
    const levelsGained = [];
    while (P.xp >= P.xpNext()) {
      P.xp -= P.xpNext();
      P.levelUp();
      levelsGained.push(P.level);
    }

    this.push({
      dur: 45,
      msg: mode === 'purified' ? 'Purificado, o espírito ascende — e agradece.'
        : mode === 'absorbed' ? 'Devorado, o espírito cala — e você sente fome de mais.'
        : this.E.lightKind === 'blueFire'
          ? 'Vitória! As chamas azuis se curvam e o Vale silencia.'
          : 'Vitória! As águas se aquietam.',
      on: () => { this.anim.p = 'victory'; if (mode === 'won') Sfx.victory(); }
    });
    this.push({
      dur: 50,
      msg: `+${xpGain} XP  ·  +${essGain} essência${essGain > 1 ? 's' : ''}`
    });
    if (mode === 'purified') {
      const atkUp = Game.purified % 3 === 0;
      this.push({
        dur: 55,
        msg: '☀ A luz retribui: +3 PV máximos.' + (atkUp ? '  A lâmina brilha mais forte: +1 de dano!' : '')
      });
    } else if (mode === 'absorbed') {
      const atkUp = Game.absorbed % 2 === 0;
      this.push({
        dur: 55,
        msg: '☾ O poder devorado: +4 de dano mágico.' + (atkUp ? '  A fome afia a lâmina: +2 de dano!' : '')
      });
    }
    for (const lv of levelsGained) {
      this.push({
        dur: 65, msg: `✦ Nível ${lv}! A luz interior cresce. 15% de PV e PM restaurados.`,
        on: () => {
          Sfx.levelup();
          Particles.burst(this.PX, this.PY - 40, 20, () => ({
            x: this.PX + U.rand(-20, 20), y: this.PY + U.rand(-70, 0),
            vx: U.rand(-1, 1), vy: U.rand(-2.5, -0.5),
            life: 55, size: 3, color: 'rgba(255,240,190,0.95)', type: 'wisp'
          }));
        }
      });
    }
    if (this.E.isBoss) {
      if (this.E.archetype === 'ancientGolem') {
        this.push({
          dur: 90,
          msg: 'O carcereiro ancestral cai. Pela primeira vez, o santuário respira sem correntes.',
          on: () => {
            Game.ancientGolemDefeated = true;
            Sfx.amulet();
          }
        });
        this.push({ dur: 68, msg: 'A chama azul permanece no Vale — mas já não obedece ao Daidaidarabotchi.' });
      } else if (this.E.element === 'fogo') {
        this.push({
          dur: 90, msg: 'O Shōgun das Cinzas desmorona em brasas que esfriam...',
          on: () => {
            Game.fireBossDefeated = true;
            Sfx.amulet();
          }
        });
        this.push({ dur: 70, msg: 'As cinzas assentam sobre um trono vazio. A caverna respira.' });
      } else if (this.E.element === 'vento') {
        this.push({
          dur: 90, msg: 'O Shōgun da Tempestade se desfaz em correntes de ar que enfim se aquietam...',
          on: () => {
            Game.windBossDefeated = true;
            Sfx.amulet();
          }
        });
        this.push({ dur: 68, msg: 'A essência do Vento se junta às que despertam o portal da aurora.' });
      } else {
        this.push({
          dur: 90, msg: 'O Shōgun Afogado se desfaz... e o lago inteiro suspira, liberto.',
          on: () => {
            Game.bossDefeated = true;
            Sfx.amulet();
          }
        });
        this.push({ dur: 60, msg: 'A essência da Água desperta. Ainda são necessárias as dos três Shōguns.' });
      }
    }
    this.push({ dur: 1, on: () => Game.finishBattle(mode) });
  },

  defeatSequence() {
    this.clearAncestralMark();
    this.over = true;
    this.push({
      dur: 80, msg: 'Sua luz vacila... e se apaga na correnteza.',
      on: () => {
        this.anim.p = 'kneel';
        Sfx.defeat();
        // Zoom focado na derrota dramática do jogador
        Game.cam.targetZoom = 1.25;
        Game.cam.targetOffsetX = -60;
        Game.cam.targetOffsetY = -10;
      }
    });
    this.push({ dur: 1, on: () => Game.finishBattle('lost') });
  },

  // ── efeitos ──
  sparks(x, y, n, color) {
    Particles.burst(x, y, n, () => ({
      x: x + U.rand(-6, 6), y: y + U.rand(-10, 10),
      vx: U.rand(-4, 4), vy: U.rand(-4, 2),
      life: 24, size: 3, color, type: 'spark', drag: 0.92
    }));
  },

  waterRings(color) {
    for (let i = 0; i < 3; i++) {
      Particles.spawn({
        x: this.EX, y: this.EY - 55, life: 40 + i * 8, size: 10 + i * 4,
        color: color || 'rgba(130,210,255,0.8)', type: 'ring'
      });
    }
  },

  launchEnemyProjectile(kind, dur) {
    this.enemyProjectile = { kind, t: 0, dur: Math.max(1, dur || 22) };
  },

  drawEnemyProjectile(ctx, frames) {
    const shot = this.enemyProjectile;
    if (shot) {
      const k = U.clamp(shot.t / shot.dur, 0, 1);
      const eased = U.easeOut(k);
      const x = U.lerp(this.EX - 18, this.PX + 10, eased);
      const arc = shot.kind === 'vulcano' ? 74 : (shot.kind === 'raio' ? 0 : 34);
      const y = U.lerp(this.EY - 50, this.PY - 46, eased) - Math.sin(k * Math.PI) * arc;
      const angle = Math.atan2((this.PY - 46) - (this.EY - 50), (this.PX + 10) - (this.EX - 18)) + k * 8;
      ctx.save();
      ctx.translate(x, y);
      if (shot.kind === 'costela') {
        ctx.rotate(angle);
        ctx.globalCompositeOperation = 'lighter';
        const tail = ctx.createLinearGradient(5, 0, 40, 0);
        tail.addColorStop(0, 'rgba(75,190,255,0.85)');
        tail.addColorStop(1, 'rgba(30,80,255,0)');
        ctx.fillStyle = tail;
        ctx.beginPath(); ctx.moveTo(4, -5); ctx.quadraticCurveTo(25, -9, 42, 0); ctx.quadraticCurveTo(25, 9, 4, 5); ctx.closePath(); ctx.fill();
        ctx.globalCompositeOperation = 'source-over';
        ctx.strokeStyle = '#536b7c'; ctx.lineWidth = 6; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.arc(0, 0, 12, -1.05, 1.05); ctx.stroke();
        ctx.strokeStyle = '#e6f1ee'; ctx.lineWidth = 3.4;
        ctx.beginPath(); ctx.arc(0, 0, 12, -1.05, 1.05); ctx.stroke();
      } else if (shot.kind === 'raio') {
        ctx.rotate(angle);
        ctx.globalCompositeOperation = 'lighter';
        const grad = ctx.createLinearGradient(0, 0, 40, 0);
        grad.addColorStop(0, 'rgba(255,255,255,0.9)');
        grad.addColorStop(1, 'rgba(120,220,255,0)');
        ctx.strokeStyle = grad; ctx.lineWidth = 4;
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(40, 0); ctx.stroke();
      } else {
        ctx.globalCompositeOperation = 'lighter';
        for (let i = 1; i <= 5; i++) {
          const trailX = i * 13;
          ctx.fillStyle = `rgba(42,145,255,${0.34 * (1 - i / 6)})`;
          ctx.beginPath(); ctx.arc(trailX, Math.sin(frames * 0.18 + i) * 3, 12 - i * 1.4, 0, 7); ctx.fill();
        }
        const r = 13 + Math.sin(frames * 0.25) * 2;
        const fireball = ctx.createRadialGradient(-3, -3, 1, 0, 0, r * 1.8);
        fireball.addColorStop(0, 'rgba(244,254,255,1)');
        fireball.addColorStop(0.28, 'rgba(105,215,255,0.98)');
        fireball.addColorStop(0.7, 'rgba(35,105,255,0.8)');
        fireball.addColorStop(1, 'rgba(15,45,180,0)');
        ctx.fillStyle = fireball; ctx.beginPath(); ctx.arc(0, 0, r * 1.8, 0, 7); ctx.fill();
      }
      ctx.restore();
    }

    if (this.ancestralBlast) {
      const k = this.ancestralBlast.t / this.ancestralBlast.dur;
      const radius = 18 + U.easeOut(U.clamp(k, 0, 1)) * 92;
      const blastX = this.ancestralBlast.target === 'enemy' ? this.EX : this.PX;
      const blastY = this.ancestralBlast.target === 'enemy' ? this.EY - 50 : this.PY - 42;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = Math.max(0, 1 - k);
      const blast = ctx.createRadialGradient(blastX, blastY, 2, blastX, blastY, radius);
      blast.addColorStop(0, 'rgba(230,252,255,0.9)');
      blast.addColorStop(0.32, 'rgba(80,195,255,0.7)');
      blast.addColorStop(1, 'rgba(30,70,255,0)');
      ctx.fillStyle = blast; ctx.beginPath(); ctx.arc(blastX, blastY, radius, 0, 7); ctx.fill();
      ctx.strokeStyle = 'rgba(130,225,255,0.8)'; ctx.lineWidth = 2.2;
      ctx.beginPath(); ctx.arc(blastX, blastY, radius * 0.72, 0, 7); ctx.stroke();
      ctx.restore();
    }
  },

  drawAncestralIncinerate(ctx, frames) {
    if (!this.ancestralMark || this.over) return;
    const px = this.PX + this.anim.px;
    const py = this.PY;
    const pulse = 1 + Math.sin(frames * 0.14) * 0.08;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const aura = ctx.createRadialGradient(px, py - 42, 5, px, py - 42, 47 * pulse);
    aura.addColorStop(0, 'rgba(205,250,255,0.24)');
    aura.addColorStop(0.45, 'rgba(60,190,255,0.18)');
    aura.addColorStop(1, 'rgba(20,70,255,0)');
    ctx.fillStyle = aura;
    ctx.beginPath(); ctx.arc(px, py - 42, 47 * pulse, 0, 7); ctx.fill();
    for (let i = 0; i < 8; i++) {
      const phase = frames * (0.17 + i * 0.004) + i * 0.9;
      const bx = px + Math.sin(phase) * (15 + (i % 2) * 5);
      const by = py - 5 - (i % 4) * 16;
      const h = 17 + (i % 3) * 5 + Math.sin(phase * 1.4) * 3;
      const flame = ctx.createLinearGradient(bx, by, bx, by - h);
      flame.addColorStop(0, 'rgba(30,105,255,0.52)');
      flame.addColorStop(0.5, 'rgba(75,210,255,0.75)');
      flame.addColorStop(1, 'rgba(225,253,255,0)');
      ctx.fillStyle = flame;
      ctx.beginPath();
      ctx.moveTo(bx - 3.5, by);
      ctx.quadraticCurveTo(bx - 5, by - h * 0.48, bx + Math.sin(phase * 1.3) * 3, by - h);
      ctx.quadraticCurveTo(bx + 5, by - h * 0.45, bx + 3.5, by);
      ctx.closePath(); ctx.fill();
    }
    ctx.restore();
  },

  drawPlayerBurn(ctx, frames) {
    if (!this.playerBurn || this.over) return;
    const eternal = !this.playerBurn.extinguishable;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < (eternal ? 7 : 5); i++) {
      const phase = frames * (0.16 + i * 0.006) + i * 1.37;
      const bx = this.PX + this.anim.px + Math.sin(phase) * (eternal ? 15 : 12);
      const by = this.PY - 7 - (i % 3) * 17;
      const h = (eternal ? 23 : 17) + Math.sin(phase * 1.3) * 5;
      const flame = ctx.createLinearGradient(bx, by, bx, by - h);
      flame.addColorStop(0, `rgba(35,95,255,${eternal ? 0.7 : 0.55})`);
      flame.addColorStop(0.55, 'rgba(70,195,255,0.82)');
      flame.addColorStop(1, 'rgba(220,250,255,0)');
      ctx.fillStyle = flame;
      ctx.beginPath(); ctx.moveTo(bx - 4, by); ctx.quadraticCurveTo(bx - 3, by - h * 0.5, bx + Math.sin(phase) * 3, by - h); ctx.quadraticCurveTo(bx + 4, by - h * 0.45, bx + 4, by); ctx.closePath(); ctx.fill();
    }
    ctx.restore();
  },

  // ── renderização ──
  draw(ctx, frames) {
    ctx.save();
    if (this.shake > 0.5) ctx.translate(U.rand(-this.shake, this.shake), U.rand(-this.shake, this.shake));
    if (Math.abs(this.shakeX) > 0.08 || Math.abs(this.shakeY) > 0.08) {
      ctx.translate(this.shakeX, this.shakeY);
    }

    // O zoom de impacto pertence à arena. A HUD fica fora desta transformação
    // para nunca sair da área segura em uma tela menor ou durante um crítico.
    ctx.save();
    if (Game.cam.zoom !== 1 || Game.cam.offsetX !== 0 || Game.cam.offsetY !== 0) {
      ctx.translate(480 + Game.cam.offsetX, 270 + Game.cam.offsetY);
      ctx.scale(Game.cam.zoom, Game.cam.zoom);
      ctx.translate(-480, -270);
    }

    this.drawBg(ctx, frames);

    // aura de reivindicação emite fagulhas (cor da katana empunhada)
    if (this.E.aura > 0.5 && !this.over && frames % 6 === 0) {
      Particles.spawn({
        x: this.EX + U.rand(-24, 24), y: this.EY - 30 + U.rand(-40, 10),
        vy: -1, life: 40, size: 2.4, color: `rgba(${this.claimColor()},0.9)`, type: 'wisp'
      });
    }
    // a escuridão exala do corpo corrompido
    const corB = Game.corruption();
    if (corB > 0.1 && Math.random() < corB * 0.12) {
      Particles.spawn({
        x: this.PX + U.rand(-14, 14), y: this.PY - U.rand(20, 80),
        vx: U.rand(-0.5, 0.5), vy: U.rand(-1.4, -0.5),
        life: 44, size: 3, color: 'rgba(140,85,235,0.75)', type: 'wisp'
      });
    }

    if (!this.over) EnemyVFX.battleAmbient(this.E, this.EX, this.EY, this.t);

    // Camada traseira: lentes, convergência e cortinas elementais não
    // encobrem a silhueta e o braço da katana.
    Particles.draw(ctx, 0, 0, 'behind');
    if (window.VFX && VFX.drawPersistent) VFX.drawPersistent(ctx);

    // camada 4 da atmosfera: halos atrás dos duelistas
    if (window.BattleAtmosphere) BattleAtmosphere.drawCharacterGlows(ctx);

    // combatentes
    const pySink = this.anim.p === 'kneel' ? 4 : 0;
    drawLightSamurai(ctx, this.PX + this.anim.px, this.PY + pySink, 2.1, {
      facing: 1, pose: this.anim.p, t: this.t,
      slashT: this.anim.p === 'slash' ? U.clamp((16 - (this.q[0] ? this.q[0].dur - this.q[0].t : 0)) / 10, 0, 1) : 0,
      flash: this.anim.pFlash, amulet: Game.equipped,
      wield: Game.wielded,
      corrupt: Game.corruption(),
      castElement: this.playerCast,
      shield: this.playerHoly ? null
        : ((this.playerBarrier === 'agua' || this.playerBarrier === 'fogo')
          ? null : (this.playerBarrier || (this.playerDef ? 'guard' : null))),
      runPhase: 0
    });
    this.drawAncestralIncinerate(ctx, frames);
    this.drawPlayerBurn(ctx, frames);

    // VFX Força das Trevas: aura de KI roxo circulando o samurai
    if (this.darkForceHits > 0 && !this.over) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const px = this.PX + this.anim.px;
      const py = this.PY + pySink;
      
      // 1. Brilho suave de fundo (radial gradient pulsante)
      const pulse = 1 + Math.sin(frames * 0.08) * 0.06;
      const glow = ctx.createRadialGradient(px, py - 40, 5, px, py - 40, 50 * pulse);
      glow.addColorStop(0, 'rgba(140, 30, 255, 0.38)');
      glow.addColorStop(0.5, 'rgba(90, 10, 180, 0.18)');
      glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(px, py - 40, 50 * pulse, 0, Math.PI * 2);
      ctx.fill();
      
      // 2. Chamas de KI subindo procedimentalmente
      const numFlames = 8;
      for (let i = 0; i < numFlames; i++) {
        // Cada chama sobe de uma posição levemente diferente na base do samurai
        const offsetAngle = (i * Math.PI * 2) / numFlames;
        // Posição de origem na base
        const bx = px + Math.sin(offsetAngle + frames * 0.035) * 14;
        const by = py + 2;
        
        // Altura e oscilação horizontal da chama
        const height = 62 + Math.sin(frames * 0.085 + i * 1.8) * 12;
        const sway = Math.sin(frames * 0.11 + i) * 5.5;
        
        ctx.beginPath();
        ctx.moveTo(bx - 11, by);
        // Curva esquerda subindo
        ctx.quadraticCurveTo(bx - 7, by - height * 0.48, bx + sway, by - height);
        // Curva direita descendo
        ctx.quadraticCurveTo(bx + 7, by - height * 0.48, bx + 11, by);
        ctx.closePath();
        
        // Cores alternadas entre roxo profundo e violeta brilhante
        ctx.fillStyle = i % 2 === 0 ? 'rgba(110, 15, 210, 0.28)' : 'rgba(160, 40, 255, 0.18)';
        ctx.fill();
      }

      // 3. Fagulhas de energia subindo
      for (let i = 0; i < 4; i++) {
        const seed = (frames + i * 45) % 90;
        const t = seed / 90; // progresso de subida 0..1
        const spx = px + Math.sin(i * 1.7 + frames * 0.05) * 16 + Math.sin(t * 8) * 4;
        const spy = py - t * 80;
        const size = (1 - t) * 2.8;
        
        ctx.fillStyle = '#dfb8ff';
        ctx.beginPath();
        ctx.arc(spx, spy, size, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    }
    if (window.VFX && VFX.drawPersistentFront) VFX.drawPersistentFront(ctx);
    // O Espírito da Luz é um reflexo do próprio Rōnin, voltado para ele
    if (this.E.spirit && this.E.dissolve < 1) {
      const poseMap = { attack: 'slash', magic: 'cast', charge: 'cast' };
      ctx.save();
      ctx.globalAlpha = 1 - this.E.dissolve;
      drawLightSamurai(ctx, this.EX + this.anim.ex, this.EY, 2.05, {
        facing: -1, pose: poseMap[this.anim.e] || this.anim.e, t: this.t + this.E.et,
        spirit: true
      });
      ctx.restore();
    } else if (this.E.dissolve < 1) {
      const drawEnemyFn = this.E.archetype === 'ashSkeleton'
        ? drawBlueFlameSkeleton
        : this.E.archetype === 'ancientGolem'
          ? drawAncientFlameGolem
          : this.E.element === 'vento'
            ? (this.E.storm ? drawStormBattleSprite : drawWindBattleSprite)
            : (this.E.element === 'fogo' ? drawFireSamurai : drawWaterSamurai);
      const cocoonPose = this.E.cocoonTurns > 0 && this.anim.e === 'idle' ? 'cocoon' : this.anim.e;
      const opts = {
        t: this.t + this.E.et, pose: cocoonPose, facing: -1,
        flash: this.E.flash, aura: this.E.aura,
        auraCol: this.claimColor(),
        alpha: 1 - this.E.dissolve,
        armT: this.anim.e === 'attack' ? Math.min(1, (this.t % 30) / 10) : 0,
        extraLife: Math.max(0, this.E.hp - this.E.maxHp),
        cocoonTurns: this.E.cocoonTurns,
        chargeProgress: this.E.vulcanoCharged || this.anim.e === 'magic'
          ? 1 : (this.anim.e === 'charge' ? 0.75 : 0.16),
        stormPhase: !!this.E.stormPhase
      };
      if (!this.E.archetype && this.E.element === 'agua' && this.E.hitT > 0) {
        const damp = this.E.hitT / 15;
        const wave = Math.sin((15 - this.E.hitT) * 2.15) * damp;
        ctx.save();
        ctx.translate(this.EX + this.anim.ex, this.EY);
        ctx.scale(1 + wave * 0.18, 1 - wave * 0.1);
        drawEnemyFn(ctx, 0, 0, this.eScale(), this.E.tier, opts);
        ctx.restore();
      } else {
        drawEnemyFn(ctx, this.EX + this.anim.ex, this.EY, this.eScale(), this.E.tier, opts);
      }
    }

    this.drawEnemyProjectile(ctx, frames);
    Particles.draw(ctx, 0, 0, 'front');

    // camada 5b da atmosfera: névoa rasteira emoldurando + partículas poéticas
    if (window.BattleAtmosphere) BattleAtmosphere.drawForegroundFx(ctx);

    // relâmpago estroboscópico na tela
    if (this.lightningFlash && this.lightningFlash > 0) {
      this.lightningFlash--;
      ctx.save();
      ctx.fillStyle = 'rgba(255,255,255,0.92)';
      ctx.fillRect(0, 0, 960, 540);
      ctx.restore();

      ctx.save();
      ctx.strokeStyle = 'rgba(200,240,255,0.95)';
      ctx.lineWidth = 3.5;
      ctx.shadowColor = '#7ddfff';
      ctx.shadowBlur = 15;
      ctx.beginPath();
      let rx = this.PX + U.rand(-80, 80);
      ctx.moveTo(rx, 0);
      ctx.lineTo(rx - 25, 120);
      ctx.lineTo(rx + 15, 230);
      ctx.lineTo(this.PX, this.PY - 40);
      ctx.stroke();
      ctx.restore();
    }

    // onda de tsunami / chuva de meteoros / tornado de vento
    if (this.wave && this.wave.wind) {
      const k = this.wave.t / this.wave.dur;
      const wx = U.lerp(this.EX, this.PX - 40, k);
      ctx.save();
      ctx.globalAlpha = k > 0.8 ? (1 - k) * 5 : 0.88;
      ctx.strokeStyle = 'rgba(215,240,245,0.72)';
      ctx.lineWidth = 2.4;
      ctx.shadowColor = '#abdfeb';
      ctx.shadowBlur = 8;
      for (let i = 0; i < 9; i++) {
        const h = i * 22;
        const w = 18 + i * 8 + Math.sin(frames * 0.18 + i) * 6;
        const phase = frames * 0.15 + i * 0.55;
        const ox = Math.sin(phase) * w * 0.4;
        ctx.beginPath();
        ctx.ellipse(wx + ox, 430 - h, w, w * 0.28, 0, 0.15, 6.13);
        ctx.stroke();
      }
      ctx.restore();
    } else if (this.wave && this.wave.fire) {
      const k = this.wave.t / this.wave.dur;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 7; i++) {
        const p = Math.min(1, Math.max(0, k * 1.6 - i * 0.07));
        if (p <= 0) continue;
        const tx = this.PX + (i - 3) * 64, ty = 428;
        const mx2 = U.lerp(880 - i * 90, tx, p);
        const my2 = U.lerp(-40, ty, p);
        ctx.strokeStyle = 'rgba(255,170,80,0.85)';
        ctx.lineWidth = 4;
        ctx.beginPath(); ctx.moveTo(mx2 + 16, my2 - 30); ctx.lineTo(mx2, my2); ctx.stroke();
        ctx.fillStyle = '#ffd9a0';
        ctx.beginPath(); ctx.arc(mx2, my2, 5.5, 0, 7); ctx.fill();
        if (p >= 1) {
          const g2 = ctx.createRadialGradient(tx, ty, 2, tx, ty, 44);
          g2.addColorStop(0, 'rgba(255,180,90,0.65)');
          g2.addColorStop(1, 'rgba(255,180,90,0)');
          ctx.fillStyle = g2;
          ctx.beginPath(); ctx.arc(tx, ty, 44, 0, 7); ctx.fill();
        }
      }
      ctx.restore();
    } else if (this.wave) {
      const k = this.wave.t / this.wave.dur;
      const wx = U.lerp(980, this.PX - 60, U.easeOut(Math.min(1, k * 1.4)));
      ctx.save();
      ctx.globalAlpha = k > 0.75 ? (1 - k) * 4 : 1;
      const g = ctx.createLinearGradient(wx, 0, wx + 320, 0);
      g.addColorStop(0, 'rgba(160,225,255,0.85)');
      g.addColorStop(1, 'rgba(30,90,180,0.25)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(wx + 300, 470);
      ctx.quadraticCurveTo(wx + 60, 430, wx + 30, 300);
      ctx.quadraticCurveTo(wx + 20, 220, wx - 40, 250);
      ctx.quadraticCurveTo(wx + 10, 320, wx - 10, 470);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(235,250,255,0.9)';
      for (let i = 0; i < 6; i++) {
        ctx.beginPath();
        ctx.arc(wx - 30 + Math.sin(i * 2 + frames * 0.3) * 14, 250 + i * 8, 5 - i * 0.5, 0, 7);
        ctx.fill();
      }
      ctx.restore();
    }

    let statusY = 30;
    // névoa em campo: bandas de bruma à deriva
    if (this.mistT > 0) {
      ctx.save();
      for (let i = 0; i < 4; i++) {
        const mx2 = ((frames * (0.4 + i * 0.15) + i * 260) % 1200) - 120;
        const my2 = 180 + i * 70;
        const mg = ctx.createRadialGradient(mx2, my2, 10, mx2, my2, 190);
        mg.addColorStop(0, 'rgba(210,230,248,0.16)');
        mg.addColorStop(1, 'rgba(210,230,248,0)');
        ctx.fillStyle = mg;
        ctx.beginPath(); ctx.ellipse(mx2, my2, 190, 60, 0, 0, 7); ctx.fill();
      }
      // aviso de lâmina cega
      ctx.fillStyle = 'rgba(215,235,255,0.85)';
      ctx.font = '700 13px "Segoe UI", sans-serif';
      ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
      ctx.fillText(`霧 névoa: ataques erram 90% (${this.mistT} rodada${this.mistT > 1 ? 's' : ''}) — magias não erram`, 30, statusY);
      ctx.restore();
      statusY += 20;
    }

    // paralisia em campo
    if (this.playerParaT > 0) {
      ctx.save();
      if (frames % 6 === 0) {
        Particles.spawn({
          x: this.PX + U.rand(-24, 24), y: this.PY - 34 + U.rand(-34, 34),
          vx: U.rand(-0.6, 0.6), vy: U.rand(-0.6, 0.6),
          life: 15, size: U.rand(1, 2.2), color: 'rgba(255,235,120,0.8)', type: 'spark'
        });
      }
      ctx.fillStyle = 'rgba(255,225,120,0.85)';
      ctx.font = '700 13px "Segoe UI", sans-serif';
      ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
      ctx.fillText(`痺 paralisia: atq custa +2 EST, sem crítico, def reduz 25% (${this.playerParaT} rodada${this.playerParaT > 1 ? 's' : ''})`, 30, statusY);
      ctx.restore();
      statusY += 20;
    }

    // prisão de vento em campo
    if (this.playerTrapped > 0) {
      ctx.save();
      ctx.strokeStyle = 'rgba(200,225,245,0.38)';
      ctx.lineWidth = 2;
      const angle = frames * 0.08;
      ctx.beginPath();
      ctx.ellipse(this.PX, this.PY - 20, 24, 10 + Math.sin(frames * 0.05) * 3, angle, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = 'rgba(200,225,245,0.85)';
      ctx.font = '700 13px "Segoe UI", sans-serif';
      ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
      ctx.fillText(`牢 prisão: menu limitado, sofre dano por rodada (${this.playerTrapped} rodada${this.playerTrapped > 1 ? 's' : ''})`, 30, statusY);
      ctx.restore();
      statusY += 20;
    }

    // debuff de rajada de vento
    if (this.windBlastDebuff) {
      ctx.save();
      ctx.fillStyle = 'rgba(150,200,245,0.85)';
      ctx.font = '700 13px "Segoe UI", sans-serif';
      ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
      ctx.fillText(`風 rajada: próximo ataque físico tem 50% de chance de errar`, 30, statusY);
      ctx.restore();
      statusY += 20;
    }

    ctx.restore();
    ctx.restore();
  },

  drawBg(ctx, frames) {
    const env = this.env;

    // ── arena espiritual: um vazio dourado sereno ──
    if (env === 'spirit') {
      const calm = this.E && this.E.pacified ? 1 : 0;
      const g = ctx.createLinearGradient(0, 0, 0, 540);
      g.addColorStop(0, '#0a0a08');
      g.addColorStop(1, calm ? '#241d0c' : '#141208');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, 960, 540);
      // halo dourado central que intensifica na pacificação
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const glowA = (0.10 + calm * 0.18) * (0.85 + 0.15 * Math.sin(frames * 0.03));
      const halo = ctx.createRadialGradient(480, 250, 40, 480, 250, 460);
      halo.addColorStop(0, `rgba(255,232,170,${glowA})`);
      halo.addColorStop(1, 'rgba(255,232,170,0)');
      ctx.fillStyle = halo;
      ctx.fillRect(0, 0, 960, 540);
      // motas douradas flutuando
      for (let i = 0; i < 20; i++) {
        const mx = ((i * 173 + Math.sin(frames * 0.01 + i) * 60) % 1000 + 1000) % 1000;
        const my = 520 - ((i * 89 + frames * (0.5 + (i % 3) * 0.3)) % 560);
        ctx.globalAlpha = (0.3 + 0.4 * Math.sin(frames * 0.05 + i)) * (0.6 + calm * 0.4);
        ctx.fillStyle = '#ffe9b0';
        ctx.beginPath(); ctx.arc(mx, my, 1.2 + (i % 3) * 0.6, 0, 7); ctx.fill();
      }
      ctx.restore();
      // chão espelhado
      const gnd = ctx.createLinearGradient(0, 408, 0, 540);
      gnd.addColorStop(0, calm ? '#2a2210' : '#181509');
      gnd.addColorStop(1, '#060503');
      ctx.fillStyle = gnd;
      ctx.fillRect(0, 408, 960, 132);
      ctx.save();
      ctx.shadowColor = 'rgba(255,220,150,0.7)'; ctx.shadowBlur = 8;
      ctx.fillStyle = 'rgba(255,220,150,0.5)';
      ctx.fillRect(0, 408, 960, 2.5);
      ctx.restore();
      ctx.fillStyle = 'rgba(0,0,0,0.4)';
      ctx.beginPath(); ctx.ellipse(this.PX, this.PY + 6, 34, 7, 0, 0, 7); ctx.fill();
      ctx.beginPath(); ctx.ellipse(this.EX, this.EY + 6, 32, 7, 0, 0, 7); ctx.fill();
      return;
    }

    const cols = {
      forest: ['#070918', '#16343a'],
      lake:   ['#050b1e', '#103652'],
      boss:   ['#04061a', '#1a2456'],
      abyss:  ['#01030c', '#07234a'],
      lava:   ['#160607', '#4a160d'],
      wind:   ['#05081a', '#102040']
    }[env];
    const sky = ctx.createLinearGradient(0, 0, 0, 540);
    sky.addColorStop(0, cols[0]);
    sky.addColorStop(1, cols[1]);
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, 960, 540);

    // camada 1 da atmosfera: shafts respirando + magma distante (lava)
    if (window.BattleAtmosphere) BattleAtmosphere.drawBackground(ctx);

    if (env === 'lava') {
      // caverna incandescente: estalagmites (o brilho de magma vem da atmosfera)
      ctx.fillStyle = '#20090a';
      for (let i = 0; i < 8; i++) {
        const tx = (i * 141 + 60) % 1000;
        const th = 80 + (i * 67) % 100;
        ctx.beginPath();
        ctx.moveTo(tx - 30, 0); ctx.lineTo(tx, th); ctx.lineTo(tx + 30, 0);
        ctx.closePath(); ctx.fill();
        ctx.beginPath();
        ctx.moveTo(tx + 66 - 28, 470); ctx.lineTo(tx + 66, 470 - th * 0.7); ctx.lineTo(tx + 66 + 28, 470);
        ctx.closePath(); ctx.fill();
      }
    } else if (env !== 'abyss' && env !== 'wind') {
      // lua
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const halo = ctx.createRadialGradient(760, 90, 8, 760, 90, 110);
      halo.addColorStop(0, 'rgba(255,244,214,0.4)');
      halo.addColorStop(1, 'rgba(255,244,214,0)');
      ctx.fillStyle = halo;
      ctx.beginPath(); ctx.arc(760, 90, 110, 0, 7); ctx.fill();
      ctx.fillStyle = '#f7ecc8';
      ctx.beginPath(); ctx.arc(760, 90, 28, 0, 7); ctx.fill();
      ctx.restore();

      // silhuetas de árvores
      ctx.fillStyle = env === 'boss' ? '#0a0d24' : '#0a1220';
      for (let i = 0; i < 9; i++) {
        const tx = (i * 127 + 40) % 1000;
        const th = 130 + (i * 53) % 110;
        ctx.beginPath();
        ctx.moveTo(tx - 8, 470);
        ctx.lineTo(tx - 2, 470 - th);
        ctx.lineTo(tx + 4, 470 - th);
        ctx.lineTo(tx + 10, 470);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(tx, 470 - th, 42, 16, 0, 0, 7);
        ctx.ellipse(tx + 14, 470 - th + 26, 34, 13, 0, 0, 7);
        ctx.fill();
      }
    } else if (env === 'wind') {
      // penhascos ventosos
      ctx.fillStyle = '#060a1c';
      for (let i = 0; i < 6; i++) {
        const tx = (i * 180 + 30) % 1000;
        const th = 200 + (i * 40) % 100;
        ctx.beginPath();
        ctx.moveTo(tx, 540); ctx.lineTo(tx, 540 - th); ctx.lineTo(tx + 120, 540);
        ctx.closePath(); ctx.fill();
      }
    } else {
      // fundo do lago: estalagmites (os feixes de luz agora respiram na atmosfera)
      ctx.fillStyle = '#050c1e';
      for (let i = 0; i < 8; i++) {
        const tx = (i * 141 + 60) % 1000;
        const th = 70 + (i * 67) % 90;
        ctx.beginPath();
        ctx.moveTo(tx - 26, 470); ctx.lineTo(tx, 470 - th); ctx.lineTo(tx + 26, 470);
        ctx.closePath(); ctx.fill();
      }
    }

    // chuva nas zonas aquáticas (brasas, cinzas e bolhas vivem no pool da atmosfera)
    if (env === 'lake' || env === 'boss') {
      ctx.save();
      ctx.strokeStyle = 'rgba(160,210,255,0.24)';
      ctx.lineWidth = 1;
      for (let i = 0; i < 40; i++) {
        const rx = ((i * 97 + frames * 3.5) % 1040) - 40;
        const ry = ((i * 211 + frames * 11) % 600) - 30;
        ctx.beginPath();
        ctx.moveTo(rx, ry);
        ctx.lineTo(rx - 3, ry + 16);
        ctx.stroke();
      }
      // relâmpago ocasional na arena do chefe
      if (env === 'boss' && Math.random() < 0.006) {
        ctx.fillStyle = 'rgba(200,220,255,0.14)';
        ctx.fillRect(0, 0, 960, 540);
      }
      ctx.restore();
    }

    // chão
    const gnd = ctx.createLinearGradient(0, 408, 0, 540);
    gnd.addColorStop(0, '#131c30');
    gnd.addColorStop(1, '#060a14');
    ctx.fillStyle = gnd;
    ctx.fillRect(0, 408, 960, 132);
    ctx.save();
    const rim = env === 'lava' ? '255,150,70' : '120,220,200';
    ctx.shadowColor = `rgba(${rim},0.7)`;
    ctx.shadowBlur = 8;
    ctx.fillStyle = `rgba(${rim},0.5)`;
    ctx.fillRect(0, 408, 960, 2.5);
    ctx.restore();
    // sombras dos combatentes
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.beginPath(); ctx.ellipse(this.PX, this.PY + 6, 34, 7, 0, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.ellipse(this.EX, this.EY + 6, 30 * this.eScale() / 2, 8, 0, 0, 7); ctx.fill();

    // camadas 2, 3 e 5a da atmosfera: reflexos no chão, corredor de foco
    // e distorção térmica — tudo sobre o cenário, nunca sobre as silhuetas
    if (window.BattleAtmosphere) {
      BattleAtmosphere.drawGroundLighting(ctx);
      BattleAtmosphere.drawChiaroscuro(ctx);
      BattleAtmosphere.drawHaze(ctx);
    }
  },

  drawUI(ctx, frames) {
    const E = this.E, P = this.P;

    // ── barra do inimigo ──
    if (E.dissolve < 0.8) {
      const bx = 570, by = 46, bw = 330, bh = 13;
      ctx.fillStyle = 'rgba(6,10,22,0.75)';
      ctx.fillRect(bx - 14, by - 30, bw + 28, 62);
      ctx.strokeStyle = 'rgba(140,180,240,0.35)';
      ctx.strokeRect(bx - 14, by - 30, bw + 28, 62);
      ctx.fillStyle = '#cfe2ff';
      ctx.font = '600 13px "Segoe UI", sans-serif';
      ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
      ctx.fillText(E.kanji + '  ' + E.name + ' (Nv. ' + P.level + ')', bx, by - 10);
      UiMotion.drawBar(ctx, 'battle-enemy-hp', bx, by, bw, bh, E.hp, E.maxHp,
        '#9fe4ff', '#2d7fd6', {
          damageTrail: 'rgba(120,210,255,0.50)',
          healTrail: 'rgba(220,250,255,0.52)',
          stroke: 'rgba(180,220,255,0.5)'
        });
      // marcas de 10% (ouro) e 50%
      const mark = (pct, col) => {
        const mx = bx + bw * pct;
        ctx.fillStyle = col;
        ctx.beginPath();
        ctx.moveTo(mx - 4, by + bh + 2);
        ctx.lineTo(mx, by + bh + 8);
        ctx.lineTo(mx + 4, by + bh + 2);
        ctx.fill();
      };
      mark(0.5, 'rgba(200,220,255,0.4)');
      mark(this.claimThreshold(), `rgba(${this.claimColor()},${0.6 + 0.4 * Math.sin(frames * 0.12)})`);
      ctx.fillStyle = '#9fb8d8';
      ctx.font = '11px "Segoe UI", sans-serif';
      ctx.textAlign = 'right';
      const extraHp = Math.max(0, E.hp - E.maxHp);
      ctx.fillStyle = extraHp > 0 ? '#86e4ff' : '#9fb8d8';
      ctx.fillText(E.hp + ' / ' + E.maxHp + (extraHp > 0 ? `  (+${extraHp} extra)` : ''), bx + bw, by - 10);

      // O glifo dá personalidade; o texto remove ambiguidade. Assim, o
      // jogador entende a leitura tática em uma olhada, sem mudar o script
      // de turnos, dano ou comportamento do inimigo.
      if (this.menu.open && E.script.length) {
        const next = E.script[0];
        const fireE = E.element === 'fogo';
        const S = this.cap(E.short);
        const isFem = E.short.startsWith('a ');
        const info = ({
          soco:    { k: '攻', c: '255,120,110', danger: false, label: `${S} vai desferir um golpe` },
          costela: { k: '骨', c: '100,210,255', danger: true, label: `${S} vai arremessar a costela` },
          vulcanoCharge: { k: '蓄', c: '95,205,255', danger: true, label: `${S} está acumulando energia de Vulcano` },
          vulcano: { k: '噴', c: '115,220,255', danger: true, label: `${S} vai cuspir a esfera de Vulcano` },
          cocoon:  { k: '繭', c: '105,215,255', danger: true, label: `${S} vai se fechar no casulo` },
          multi:   { k: '連', c: '255,150,80', danger: true,  label: `${S} vai usar a rajada` },
          fatigue: { k: '疲', c: '170,230,150', danger: false, label: `${S} está ${isFem ? 'cansada' : 'cansado'}` },
          nevoa:   { k: '霧', c: '215,235,255', danger: true,  label: `${S} vai exalar a névoa` },
          mare:    fireE
            ? { k: '炎', c: '255,160,80', danger: true, label: `${S} vai invocar a erupção` }
            : { k: '潮', c: '120,240,255', danger: true, label: `${S} vai invocar a maré` },
          defend: E.archetype === 'ashSkeleton'
            ? { k: '骨', c: '110,215,255', danger: false, label: `${S} vai erguer a defesa de ossos` }
            : { k: '守', c: fireE ? '255,170,100' : '130,200,255', danger: false, label: `${S} vai defender` },
          charge:  fireE
            ? { k: '炎', c: '255,160,80', danger: true, label: `${S} está acumulando carga de fogo` }
            : { k: '波', c: '150,230,255', danger: true, label: `${S} está acumulando carga de água` },
          tsunami: fireE
            ? { k: '隕', c: '255,160,80', danger: true, label: `${S} vai invocar a chuva de meteoros` }
            : { k: '波', c: '150,230,255', danger: true, label: `${S} vai invocar o tsunami` },
          corte_aereo: { k: '連', c: '150,200,245', danger: true, label: `${S} vai fazer um rasante de cortes` },
          rajada:    { k: '風', c: '150,200,245', danger: true, label: `${S} vai disparar uma rajada de vento` },
          esquiva:   { k: '翔', c: '150,200,245', danger: false, label: `${S} vai se esquivar de ataques físicos` },
          raio:      { k: '雷', c: '110,210,255', danger: true, label: `${S} vai disparar um raio` },
          explosao:  { k: '爆', c: '110,210,255', danger: true, label: `${S} vai provocar uma explosão` },
          charge_orb: { k: '球', c: '110,210,255', danger: true, label: `${S} está carregando uma esfera elétrica` },
          paralisante: { k: '痺', c: '110,210,255', danger: true, label: `${S} vai soltar uma carga paralisante` },
          vendaval:  { k: '斬', c: '150,200,245', danger: true, label: `${S} vai cortar com o vendaval` },
          investida: { k: '翔', c: '150,200,245', danger: true, label: `${S} vai fazer uma investida` },
          tornadoCharge: { k: '蓄', c: '150,220,245', danger: true, label: `${S} vai carregar o Tornado` },
          tornado:   { k: '旋', c: '150,200,245', danger: true, label: `${S} vai invocar um tornado` },
          prisao:    { k: '牢', c: '150,200,245', danger: true, label: `${S} vai conjurar a prisão de vento` },
          suprema:   { k: '嵐', c: '120,180,245', danger: true, label: `${S} vai desferir a tempestade suprema` }
        }[next] || { k: '？', c: '190,210,235', danger: false, label: `${S} vai realizar uma ação` });
        const ix = this.EX, iy = this.EY - 60 * this.eScale() - 34;
        const rr = info.danger ? 18 + Math.sin(frames * 0.25) * 2.5 : 16;
        ctx.save();
        ctx.globalAlpha = 0.85 + 0.15 * Math.sin(frames * 0.15);
        ctx.fillStyle = 'rgba(8,12,26,0.8)';
        ctx.beginPath(); ctx.arc(ix, iy, rr, 0, 7); ctx.fill();
        ctx.strokeStyle = `rgba(${info.c},0.9)`;
        ctx.lineWidth = info.danger ? 2.4 : 1.6;
        if (info.danger) { ctx.shadowColor = `rgba(${info.c},0.9)`; ctx.shadowBlur = 10; }
        ctx.beginPath(); ctx.arc(ix, iy, rr, 0, 7); ctx.stroke();
        ctx.shadowBlur = 0;
        ctx.fillStyle = `rgba(${info.c},1)`;
        ctx.font = `700 ${info.danger ? 18 : 16}px serif`;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(info.k, ix, iy + 1);
        if (info.danger) {
          ctx.font = '700 10px "Segoe UI", sans-serif';
          ctx.fillText('!', ix + rr + 7, iy - 6);
        }
        // Nomeia a decisão no painel de vida: o olhar percorre
        // nome → vida → intenção sem disputar espaço com a arena.
        ctx.globalAlpha = 1;
        ctx.fillStyle = `rgba(${info.c},0.98)`;
        ctx.font = '700 10px "Segoe UI", sans-serif';
        ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
        ctx.fillText(info.label, bx, by + 27);
        ctx.restore();
      }

      if (E.cocoonTurns > 0) {
        ctx.fillStyle = 'rgba(9,24,42,0.9)';
        ctx.fillRect(bx, by + 19, 244, 22);
        ctx.strokeStyle = 'rgba(105,215,255,0.65)';
        ctx.strokeRect(bx + 0.5, by + 19.5, 243, 21);
        ctx.fillStyle = '#9ee8ff';
        ctx.font = '700 10px "Segoe UI", sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(`繭 CHAMA CONSUMIDORA · ${E.cocoonTurns} cura${E.cocoonTurns > 1 ? 's' : ''} restante${E.cocoonTurns > 1 ? 's' : ''} · PULSO interrompe`, bx + 8, by + 34);
      }
    }

    // ── painel do jogador ──
    {
      const px = 636, py = 428, pw = 300, ph = 96;
      ctx.fillStyle = 'rgba(6,10,22,0.82)';
      ctx.fillRect(px, py, pw, ph);
      ctx.strokeStyle = 'rgba(255,210,130,0.4)';
      ctx.strokeRect(px, py, pw, ph);
      ctx.textBaseline = 'alphabetic';
      ctx.fillStyle = '#ffe9b0';
      ctx.font = '700 13px "Segoe UI", sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('Rōnin de Luz', px + 12, py + 20);
      if (Game.hasDarkKatana) {
        const dark = Game.wielded === 'dark';
        ctx.fillStyle = dark ? '#c9a6ff' : '#ffe4a0';
        ctx.font = '700 12px serif';
        ctx.fillText(dark ? '闇' : '光', px + 106, py + 20);
        ctx.fillStyle = '#7386a8';
        ctx.font = '10px "Segoe UI", sans-serif';
        ctx.fillText('Q ⇄ katana', px + 124, py + 20);
      }
      if (Game.equipped) {
        let symbolColor = '#a2e8c9';
        let symbolText = '風';
        if (Game.equipped === 'sui') {
          symbolColor = '#8fd8ff';
          symbolText = '水';
        } else if (Game.equipped === 'ka') {
          symbolColor = '#ffab66';
          symbolText = '火';
        }
        ctx.fillStyle = symbolColor;
        ctx.font = '700 12px serif';
        ctx.fillText(symbolText, px + 190, py + 20);
      }
      ctx.fillStyle = '#8fa3c8';
      ctx.font = '11px "Segoe UI", sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText('Nv. ' + P.level, px + pw - 12, py + 20);

      const bar = (key, y, val, max, c1, c2, label, warning) => {
        const bw2 = pw - 74;
        UiMotion.drawBar(ctx, key, px + 40, y, bw2, 9, val, max, c1, c2, {
          warning: !!warning,
          healTrail: label === 'EST' ? 'rgba(205,255,185,0.48)' : undefined,
          stroke: 'rgba(255,255,255,0.18)'
        });
        ctx.fillStyle = '#9fb8d8';
        ctx.font = '10px "Segoe UI", sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(label, px + 12, y + 8);
        ctx.textAlign = 'right';
        ctx.fillText(val + '/' + max, px + pw - 8, y + 8);
      };
      bar('battle-player-hp', py + 32, P.hp, P.maxHp, '#ffe08a', '#d98a2b', 'PV', true);
      bar('battle-player-sta', py + 50, this.sta, P.maxSta, '#b6ff9e', '#3e9e4f', 'EST');
      bar('battle-player-mp', py + 68, P.mp, P.maxMp, '#a8c8ff', '#5a6ee0', 'PM');

      if (this.ancestralMark && !this.over) {
        const markY = py - (this.playerBurn ? 48 : 24);
        const actions = this.ancestralMark.actionsLeft;
        const hits = this.ancestralMark.hits;
        ctx.fillStyle = 'rgba(12,38,72,0.95)';
        ctx.fillRect(px, markY, pw, 20);
        ctx.strokeStyle = 'rgba(105,220,255,0.82)';
        ctx.strokeRect(px + 0.5, markY + 0.5, pw - 1, 19);
        ctx.fillStyle = '#a9edff';
        ctx.font = '700 10px "Segoe UI", sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(`蒼 MARCA: ${hits} carga${hits === 1 ? '' : 's'} · ${actions} ação${actions === 1 ? '' : 'ões'} · dano oculto`, px + 9, markY + 14);
      }

      if (this.playerBurn && !this.over) {
        const eternal = !this.playerBurn.extinguishable;
        const turns = Number.isFinite(this.playerBurn.turns) ? ` · ${this.playerBurn.turns} turno${this.playerBurn.turns > 1 ? 's' : ''}` : '';
        ctx.fillStyle = eternal ? 'rgba(18,45,84,0.94)' : 'rgba(13,35,62,0.94)';
        ctx.fillRect(px, py - 24, pw, 20);
        ctx.strokeStyle = eternal ? 'rgba(105,215,255,0.82)' : 'rgba(80,185,255,0.62)';
        ctx.strokeRect(px + 0.5, py - 23.5, pw - 1, 19);
        ctx.fillStyle = '#9ee8ff';
        ctx.font = '700 10px "Segoe UI", sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(
          eternal
            ? `藍 VULCANO: −${this.playerBurn.damage} PV após sua ação${turns} · impossível apagar`
            : `藍 EM CHAMAS: −${this.playerBurn.damage} PV após sua ação · Defender apaga`,
          px + 9, py - 10
        );
      }
    }

    // ── menu de comandos ──
    if (this.menu.open) {
      const m = this.menu;
      const opts = m.sub ? this.magicOptions() : this.mainOptions();
      const sel = m.sub ? m.subIdx : m.idx;
      const mx = 24, mw = 240;
      const mh = 44 + opts.length * 24;
      const my = 524 - mh;
      ctx.fillStyle = 'rgba(6,10,22,0.85)';
      ctx.fillRect(mx, my, mw, mh);
      ctx.strokeStyle = 'rgba(255,210,130,0.45)';
      ctx.strokeRect(mx, my, mw, mh);
      if (m.sub) {
        ctx.fillStyle = '#8fa3c8';
        ctx.font = '10px "Segoe UI", sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText('◂ X para voltar', mx + 10, my + 14);
      }
      const targetY = my + 34 + sel * 24;
      if (this.menuCursorY === null) this.menuCursorY = targetY;
      this.menuCursorTarget = targetY;
      const cursorY = this.menuCursorY;
      const focus = this.menuFocusT / 10;
      ctx.fillStyle = `rgba(255,214,130,${0.12 + focus * 0.12})`;
      ctx.fillRect(mx + 6, cursorY - 15, mw - 12, 21);
      if (this.menuDenyT > 0 && !opts[sel].ok) {
        ctx.fillStyle = `rgba(180,120,255,${this.menuDenyT / 10 * 0.22})`;
        ctx.fillRect(mx + 6, cursorY - 15, mw - 12, 21);
      }
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = '#ffe08a';
      ctx.shadowColor = '#ffd678';
      ctx.shadowBlur = 5 + focus * 6;
      ctx.font = '700 14px "Segoe UI", sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('▸', mx + 10 + Math.min(4, focus * 4), cursorY);
      ctx.restore();
      opts.forEach((o, i) => {
        const oy = my + 34 + i * 24;
        const isSel = i === sel;
        ctx.fillStyle = o.ok ? (isSel ? '#fff3cf' : '#cfe2ff') : 'rgba(140,155,180,0.45)';
        ctx.font = (isSel ? '700 ' : '') + '14px "Segoe UI", sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(o.label, mx + 28, oy);
      });
      // descrição
      const cur = opts[sel];
      const dx = mx + mw + 12, dw = 330;
      ctx.fillStyle = 'rgba(6,10,22,0.85)';
      ctx.fillRect(dx, my, dw, mh);
      ctx.strokeStyle = 'rgba(140,180,240,0.3)';
      ctx.strokeRect(dx, my, dw, mh);
      ctx.fillStyle = cur.ok ? '#b8cce8' : '#d88f8f';
      ctx.font = '12px "Segoe UI", sans-serif';
      ctx.textAlign = 'left';
      this.wrapText(ctx, cur.ok ? cur.desc : (cur.why || cur.desc), dx + 12, my + 24, dw - 24, 17);

      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      for (const spark of this.menuSparks) {
        const alpha = 1 - spark.t / spark.life;
        ctx.globalAlpha = alpha;
        ctx.fillStyle = '#ffe9b0';
        ctx.shadowColor = '#ffd678';
        ctx.shadowBlur = 5;
        ctx.beginPath();
        ctx.arc(spark.x, spark.y, spark.size * (0.5 + alpha), 0, 7);
        ctx.fill();
      }
      ctx.restore();
    }

    // ── números flutuantes ──
    for (const f of this.floaters) {
      const k = 1 - f.t / f.life;
      ctx.save();
      ctx.globalAlpha = Math.min(1, k * 2);
      ctx.font = `900 ${f.big ? 30 : 20}px "Segoe UI", sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.strokeStyle = 'rgba(0,0,0,0.7)';
      ctx.lineWidth = 4;
      const fy = f.y - (f.big ? Math.sin(f.t * 0.4) * 2 : 0);
      let pop = 1;
      if (f.big && f.t < 12) {
        pop = f.t < 5
          ? 0.72 + (f.t / 5) * 0.53
          : 1.25 - ((f.t - 5) / 7) * 0.25;
      }
      ctx.translate(f.x, fy);
      ctx.scale(pop, pop);
      ctx.strokeText(f.txt, 0, 0);
      ctx.fillStyle = f.color;
      ctx.fillText(f.txt, 0, 0);
      ctx.restore();
    }
  },

  tooltipColor(word, fallback) {
    const token = word.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();
    if (token.includes('EST')) return '#b6ff9e';
    if (token.includes('PM')) return '#a8c8ff';
    if (/DEFENDA|BLOQUE|METADE|FADIGA/.test(token)) return '#b6ff9e';
    if (/PERFURA|CRITICO|50%|DANO/.test(token)) return '#ffe08a';
    return fallback;
  },

  wrapText(ctx, text, x, y, maxW, lineH) {
    const baseColor = ctx.fillStyle;
    let xx = x, yy = y;
    for (const word of text.split(' ')) {
      const segment = (xx === x ? '' : ' ') + word;
      if (xx !== x && xx - x + ctx.measureText(segment).width > maxW) {
        xx = x;
        yy += lineH;
      }
      const draw = (xx === x ? '' : ' ') + word;
      ctx.fillStyle = this.tooltipColor(word, baseColor);
      ctx.fillText(draw, xx, yy);
      xx += ctx.measureText(draw).width;
    }
    ctx.fillStyle = baseColor;
  },

  // Feedback de foco para teclado e cursor: um deslocamento curto e duas
  // partículas de luz bastam para fazer a navegação parecer responsiva.
  menuFocus(resetCursor) {
    const m = this.menu;
    const opts = m.sub ? this.magicOptions() : this.mainOptions();
    const sel = m.sub ? m.subIdx : m.idx;
    const my = 524 - (44 + opts.length * 24);
    const targetY = my + 34 + sel * 24;
    if (resetCursor || this.menuCursorY === null) this.menuCursorY = targetY;
    this.menuCursorTarget = targetY;
    this.menuFocusT = 10;
    for (let i = 0; i < 2; i++) {
      this.menuSparks.push({
        x: 44 + i * 6, y: targetY - 5 + i * 7,
        vx: 0.25 + i * 0.12, vy: -0.34 - i * 0.08,
        t: 0, life: 18, size: 1.4 + i * 0.35
      });
    }
  },
};
