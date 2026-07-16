'use strict';
// ─── Batalha por turnos ──────────────────────────────────────────────
const Battle = {
  active: false, t: 0,
  P: null, E: null, fieldRef: null,
  q: [], msg: '', msgT: 0,
  menu: { open: false, idx: 0, sub: false, subIdx: 0 },
  playerDef: false, sta: 10,
  playerCast: null,
  floaters: [], shake: 0, shakeX: 0, shakeY: 0, wave: null,
  menuSparks: [], menuFocusT: 0, menuDenyT: 0,
  menuCursorY: null, menuCursorTarget: null,
  anim: { p: 'idle', e: 'idle', px: 0, ex: 0, pFlash: 0, eArm: 0 },
  env: 'forest', over: false, purifyHinted: false,
  atmosphere: null,
  focusCanvas: null,
  heatCanvas: null,
  PX: 270, PY: 408, EX: 688, EY: 408,

  eScale() { return this.E.isBoss ? 3.4 : 1.75 + Math.min(this.E.tier, 6) * 0.15; },

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
    this.over = false; this.purifyHinted = false;
    this.menu = { open: false, idx: 0, sub: false, subIdx: 0 };
    this.anim = { p: 'idle', e: 'idle', px: 0, ex: 0, pFlash: 0, eArm: 0 };
    this.msg = ''; this.msgT = 0; this.shake = 0; this.shakeX = 0; this.shakeY = 0;
    this.spiritCalm = 0;
    this.env = fieldEnemy.spirit ? 'spirit'
      : (cfg.element === 'fogo') ? 'lava'
      : fieldEnemy.swim ? 'abyss'
      : fieldEnemy.y < 1100 ? 'forest'
      : fieldEnemy.x > 6410 ? 'boss'
      : (fieldEnemy.x > 5050 ? 'lake' : 'forest');
    this.mistT = 0;
    this.darkForceHits = 0;
    Particles.clear();

    // ── Recuperar Espírito: confronto espiritual (0 de dano, alta esquiva) ──
    if (fieldEnemy.spirit) {
      this.E = {
        name: 'Espírito da Luz', short: 'o Espírito', kanji: '魂', tier: 0,
        isBoss: false, spirit: true, pacified: false, dodge: 0.4,
        hp: fieldEnemy.spiritHp, maxHp: fieldEnemy.spiritHp,
        soco: 0, mare: 0, ult: 0, xp: 0,
        element: 'luz', fly: false, hits: 1, mist: false,
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
    const scaledUlt = Math.round((fieldEnemy.tier === 10 ? 31 : (fieldEnemy.tier === 9 ? 30 : 26)) * scaleDmg);
    const scaledXp = Math.round(cfg.xp * scale);

    this.E = {
      name: cfg.name, short: cfg.short, kanji: cfg.kanji, tier: fieldEnemy.tier,
      isBoss: !!cfg.boss, hp: scaledHp, maxHp: scaledHp,
      soco: scaledSoco, mare: scaledMare, ult: scaledUlt, xp: scaledXp,
      element: cfg.element || 'agua', fly: !!cfg.fly, hits: cfg.hits || 1, mist: !!cfg.mist,
      defending: false, fatigued: false, script: [], flash: 0, hitT: 0,
      aura: 0, dissolve: 0, et: U.rand(0, 100)
    };
    this.initAtmosphere();

    if (this.E.isBoss) {
      this.push({
        dur: 70,
        msg: this.E.element === 'fogo'
          ? 'A caverna inteira range — Kagutsuchi, o Shōgun das Cinzas, desperta!'
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
    const critRate = this.darkForceHits > 0 ? '100%' : '50%';
    if (this.E.spirit) {
      return [
        { id: 'atk', label: label, ok: this.sta >= 2,
          desc: `Toque o reflexo: ${P.atk} de dano. Ele se esquiva com frequência. Custa 2 EST.`,
          why: 'Sem fôlego — defenda para recuperar estamina.' },
        { id: 'def', label: '守  Defender', ok: true,
          desc: 'Recupera 2 EST e 3 PM. O Espírito não busca te ferir.' },
        { id: 'run', label: '逃  Recuar', ok: true,
          desc: 'Afaste-se do confronto. A essência permanece.' }
      ];
    }
    return [
      { id: 'atk', label: label, ok: this.sta >= 2,
        desc: `${isDark ? 'Corte das trevas' : 'Corte de luz'}: ${P.atk} de dano, ${critRate} de crítico (${P.atk * 2}).`
          + (isDark ? ` Crítico suga +${this.darkCritHeal()} PV.` : '') + ' Custa 2 EST.',
        why: 'Sem fôlego — defenda para recuperar estamina.' },
      { id: 'def', label: '守  Defender', ok: true,
        desc: 'Reduz o próximo dano pela metade. Recupera 2 EST e 3 PM — defenda para carregar suas magias.' },
      { id: 'mag', label: '術  Magia', ok: true,
        desc: 'As artes da luz' + (Game.equipped ? ' e dos elementos.' : '.') },
      { id: 'run', label: '逃  Fugir', ok: !this.E.isBoss,
        desc: '65% de chance de escapar do confronto.',
        why: 'As marés cercam a arena — não há fuga.' }
    ];
  },

  // dano mágico cresce +4 por espírito absorvido, com base +3 se empunhar a lâmina escura
  mAtk() {
    let base = Game.wielded === 'dark' ? 3 : 0;
    return base + Game.absorbed * 4;
  },

  // cor da aura de reivindicação: segue a katana empunhada
  claimColor() {
    return Game.hasDarkKatana && Game.wielded === 'dark' ? '170,110,255' : '255,214,110';
  },

  magicOptions() {
    const P = this.P;
    const light = Game.wielded === 'light';
    const lh = this.lightHeal();
    const cura = lh > 0 ? ` A luz cura +${lh} ao conjurar.` : '';
    const opts = [
      { id: 'dluz', label: '盾  Defesa da Luz', ok: P.mp >= 6 && light && !Game.essenceLost,
        desc: `Escudo sagrado: bloqueia 75% do próximo dano e cura ${4 + Game.purified} PV. Custa 6 PM.`,
        why: Game.essenceLost ? 'Sua essência está perdida — recupere-a para reaver este poder.'
          : !light ? 'A luz não responde à lâmina negra — Q para trocar.' : 'PM insuficiente (precisa de 6).' },
      { id: 'pur', label: '浄  Purificar', ok: P.mp >= 7 && light,
        desc: `Vida ≤${this.E.isBoss ? '15% (chefe)' : '20%'}: purificação garantida (+3 PV máx). Abaixo de 50%: chance de 5%. Custa 7 PM.`,
        why: !light ? 'A Katana de Luz dorme na bainha — Q para trocar.' : 'PM insuficiente (precisa de 7).' }
    ];
    if (Game.hasDarkKatana) {
      opts.push({ id: 'abs', label: '闇  Absorver', ok: P.mp >= 7 && !light,
        desc: `Devora o espírito: vida ≤${this.E.isBoss ? '15% (chefe)' : '20%'} garantido (+4 dano mágico). Abaixo de 50%: 5%. Custa 7 PM.`,
        why: light ? 'Empunhe a Katana da Escuridão — Q para trocar.' : 'PM insuficiente (precisa de 7).' });
      opts.push({ id: 'ftrevas', label: '暗  Força das Trevas', ok: P.mp >= 4 && !light,
        desc: `Poder sombrio: crítico garantido nos próximos 2 ATAQUES físicos. Custa 4 PM.`,
        why: light ? 'Empunhe a Katana da Escuridão — Q para trocar.' : 'PM insuficiente (precisa de 4).' });
      if (Game.absorbed >= 1) {
        opts.push({ id: 'bolt', label: '呪  Rajada Sombria', ok: P.mp >= 5 && !light,
          desc: `Descarga do poder devorado: ${8 + this.mAtk()} de dano.${cura} Custa 5 PM.`,
          why: light ? 'Empunhe a Katana da Escuridão — Q para trocar.' : 'PM insuficiente (precisa de 5).' });
      }
    }
    const md = 14 + this.mAtk(), pd = 16 + this.mAtk();
    if (Game.equipped === 'sui') {
      opts.push({ id: 'bagua', label: '水  Barragem de Água', ok: P.mp >= 6,
        desc: `${md} de dano e ergue uma barreira fluida (bloqueia metade do dano).${cura} Custa 6 PM.`,
        why: 'PM insuficiente (precisa de 6).' });
      opts.push({ id: 'pulso', label: '水  Pulso de Água', ok: P.mp >= 6,
        desc: `Rajada à distância: ${pd} de dano. PERFURA a defesa de espíritos de fogo.${cura} Custa 6 PM.`,
        why: 'PM insuficiente (precisa de 6).' });
    } else if (Game.equipped === 'ka') {
      opts.push({ id: 'bfogo', label: '火  Barragem de Fogo', ok: P.mp >= 6,
        desc: `${md} de dano e círculo de chamas (bloqueia metade — fraco contra água).${cura} Custa 6 PM.`,
        why: 'PM insuficiente (precisa de 6).' });
      opts.push({ id: 'incin', label: '火  Incinerar', ok: P.mp >= 6,
        desc: `Chamas intensas: ${pd} de dano. PERFURA a defesa de espíritos de água.${cura} Custa 6 PM.`,
        why: 'PM insuficiente (precisa de 6).' });
    } else if (Game.equipped === 'wind') {
      opts.push({ id: 'torn', label: '風  Tornado', ok: P.mp >= 6,
        desc: `Turbilhão espiral: ${pd} de dano. PERFURA a defesa de espíritos de água.${cura} Custa 6 PM.`,
        why: 'PM insuficiente (precisa de 6).' });
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
    // Força das Trevas dura os próximos 2 ATAQUES (consumida em actAttack), não turnos
    this.anim.p = 'idle';
    this.anim.e = this.E.fatigued ? 'hurt' : (this.E.defending ? 'defend' : 'idle');
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

  // chance de reivindicar o espírito (purificar ou absorver)
  claimChance(pct) {
    if (pct <= this.claimThreshold() + 0.001) return 1;
    if (pct < 0.5) return 0.05;
    return 0;
  },

  // dano do jogador no inimigo: defesa reduz metade (salvo perfuração); fadiga amplifica 1.5×
  finalDmg(dmg, pierce) {
    if (this.E.defending && !pierce) dmg = Math.max(1, Math.floor(dmg / 2));
    if (this.E.fatigued) dmg = Math.round(dmg * 1.5);
    return dmg;
  },

  closeMenu() { this.menu.open = false; },

  // ── ações do jogador ──
  actAttack() {
    this.closeMenu();
    this.sta -= 2;
    const forced = this.darkForceHits > 0;   // Força das Trevas: crítico garantido
    const crit = forced || U.chance(0.5);
    const darkBlade = Game.wielded === 'dark'; // Corte das Trevas
    const blocked = this.E.defending;
    const tired = this.E.fatigued;
    // névoa faz errar; o Espírito da Luz esquiva com graça
    const spiritDodge = this.E.spirit && !this.E.pacified && U.chance(this.E.dodge);
    const missed = spiritDodge || (this.mistT > 0 && U.chance(0.75));
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
      this.push({
        dur: 34,
        msg: spiritDodge
          ? 'O reflexo se desvia num passo sereno — você golpeia o vazio.'
          : 'Você corta apenas névoa — o espírito não estava ali!',
        on: () => {
          this.floater(this.EX, this.EY - 80, spiritDodge ? 'esquivou' : 'ERROU', spiritDodge ? '#ffe4a0' : '#b8c8d8');
          if (spiritDodge) { this.anim.e = 'idle'; this.anim.ex = 44; }
          Sfx.flee();
        }
      });
      this.push({
        dur: 12,
        on: () => {
          this.anim.p = 'idle';
          Game.cam.targetZoom = 1.12;
          Game.cam.targetOffsetX = 0;
        }
      });
      this.push({ dur: 1, on: () => this.afterPlayer() });
      return;
    }
    this.push({
      dur: 10,
      on: () => {
        this.E.hp = Math.max(0, this.E.hp - dmg);
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
    this.push({
      dur: 40, msg: 'Você firma a postura — a luz se adensa em escudo. (+2 EST, +3 PM)',
      on: () => {
        this.anim.p = 'defend';
        Sfx.defend();
        PlayerVFX.shield(this.PX, this.PY, 'guard', false);
      }
    });
    this.push({ dur: 1, on: () => this.afterPlayer() });
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
    this.P.mp -= 6;
    const heal = Math.min(4 + Game.purified, this.P.maxHp - this.P.hp);
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
    this.P.mp -= 7;
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
    if (U.chance(this.claimChance(pct))) {
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
    this.P.mp -= 7;
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
    if (U.chance(this.claimChance(pct))) {
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
    this.P.mp -= 4;
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
  // + 9 dissipação. Total visual: 36 frames, mantendo dano e custo originais.
  actDarkBolt() {
    this.closeMenu();
    this.P.mp -= 5;
    const dmg = this.finalDmg(8 + this.mAtk());
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
    this.E.hp = Math.max(0, this.E.hp - dmg);
    this.E.flash = 1;
    this.E.hitT = 15;
    this.shake = 0;
    this.shakeX = pierce ? -8.2 : -6.2;
    this.shakeY = 0;
    Game.cam.zoom = pierce ? 1.39 : 1.34;
    Game.freezeFrames = pierce ? 6 : 5;
    this.floater(this.EX, this.EY - 80, '-' + dmg, '#bceeff', true);
    if (pierce) {
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

  resolveFireImpact(dmg, pierce) {
    const isCrit = this.E.element === 'agua';
    this.E.hp = Math.max(0, this.E.hp - dmg);
    this.E.flash = 1;
    this.E.hitT = 15;
    this.shake = isCrit ? 12 : 0;
    this.shakeX = pierce ? -9.2 : -7.2;
    this.shakeY = pierce ? -1.2 : 0;
    Game.cam.zoom = isCrit ? 1.45 : (pierce ? 1.4 : 1.35);
    Game.freezeFrames = isCrit ? 8 : (pierce ? 7 : 5);
    this.floater(this.EX, this.EY - 80, '-' + dmg, isCrit ? '#ffe08a' : '#ffb067', isCrit);
    if (isCrit) {
      this.msg = 'CRÍTICO! Incinerar provoca uma implosão interna no espírito da água!';
      this.msgT = 0;
    } else if (pierce) {
      this.msg = 'O elemento oposto PERFURA a couraça!';
      this.msgT = 0;
    }
    PlayerVFX.impact(this.EX, this.EY - 50, 'fire', isCrit || pierce);
    EnemyVFX.hit(this.E, this.EX, this.EY - 50, isCrit || pierce);
    this.castHeal();
    Sfx.hit(isCrit || pierce);
  },

  // Incinerar usa o mesmo compasso legível de Pulso, mas com silhueta de
  // lança, aceleração seca e uma detonação que se abre como flor de fogo.
  actFireIncinerate(dmg, pierce) {
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
    this.push({ dur: 5, on: () => this.resolveFireImpact(dmg, pierce) });
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
    this.P.mp -= 6;
    const dmg = this.finalDmg(14 + this.mAtk());
    const agua = elem === 'agua';
    if (agua) {
      this.actWaterBarrier(dmg);
      return;
    }
    this.actFireBarrier(dmg);
  },

  actElemBolt(elem) {
    this.closeMenu();
    this.P.mp -= 6;
    const agua = elem === 'agua';
    const isCrit = elem === 'fogo' && this.E.element === 'agua'; // Incinerar contra espírito de água
    const pierce = this.E.defending && (
      (elem === 'agua' && this.E.element === 'fogo') ||
      (elem === 'fogo' && this.E.element === 'agua') ||
      (elem === 'wind' && this.E.element === 'agua')
    );
    let baseDmg = 16 + this.mAtk();
    if (isCrit) baseDmg *= 2; // Dano crítico!
    const dmg = this.finalDmg(baseDmg, pierce);
    if (agua) {
      this.actWaterPulse(dmg, pierce);
      return;
    }
    if (elem === 'wind') {
      this.actWindTornado(dmg, pierce);
      return;
    }
    this.actFireIncinerate(dmg, pierce);
  },

  actFlee() {
    this.closeMenu();
    // recuar do Espírito nunca falha — mas a essência permanece perdida
    if (this.E.spirit) {
      this.over = true;
      this.push({
        dur: 40, msg: 'Você recua da própria luz. Ela apenas observa, paciente.',
        on: () => { Sfx.flee(); this.anim.p = 'dash'; }
      });
      this.push({ dur: 1, on: () => Game.finishBattle('spiritFled') });
      return;
    }
    if (U.chance(0.65)) {
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

  afterPlayer() {
    // O Espírito nunca é destruído: interrompe o combate ao chegar a ~20%
    if (this.E.spirit && !this.E.pacified) {
      const thr = Math.ceil(this.E.maxHp * 0.2);
      if (this.E.hp <= thr) {
        this.E.hp = thr;
        return this.pacifySequence();
      }
      return this.enemyTurn();
    }
    if (this.E.hp <= 0) this.dissolveSequence();
    else this.enemyTurn();
  },

  // ── turno do inimigo ──
  ensureScript() {
    if (this.E.script.length > 0) return;
    if (this.E.isBoss) {
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
      // yūrei: a névoa vem cedo, e os socos aproveitam sua lâmina cega
      this.E.script = U.chance(0.7)
        ? (U.chance(0.5) ? ['nevoa', 'soco', 'defend'] : ['soco', 'nevoa', 'defend'])
        : ['defend', 'nevoa', 'soco'];
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

  enemyTurn() {
    this.E.defending = false;
    this.E.fatigued = false;

    // O Espírito da Luz nunca causa dano: esquiva, mantém distância ou faz
    // uma investida leve que passa de raspão — apenas um teste.
    if (this.E.spirit) return this.spiritTurn();

    this.ensureScript();
    const action = this.E.script.shift();
    const S = this.cap(this.E.short);
    const fire = this.E.element === 'fogo';

    if (action === 'defend') {
      this.E.defending = true;
      this.push({
        dur: 40,
        msg: fire ? `${S} endurece a lava em couraça de obsidiana.` : `${S} endurece as águas em couraça.`,
        on: () => {
          this.anim.e = 'defend';
          EnemyVFX.guard(this.E, this.EX, this.EY);
          Sfx.tone({ f: fire ? 190 : 240, dur: 0.3, type: 'triangle', vol: 0.16 });
        }
      });
    } else if (action === 'charge') {
      this.push({
        dur: 60,
        msg: fire
          ? 'O magma ferve... o Shōgun das Cinzas invoca o teto da caverna!'
          : 'O mar recua... o Shōgun acumula uma onda colossal!',
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
      this.push({ dur: 14, on: () => this.hitPlayer(this.E.ult, fire ? 'fogo' : 'agua', true) });
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
      this.push({ dur: 12, on: () => this.hitPlayer(this.E.mare, fire ? 'fogo' : 'agua', true) });
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
      this.push({ dur: 10, on: () => this.hitPlayer(this.E.soco, 'agua') });
      this.push({
        dur: 24,
        on: () => {
          this.anim.e = 'idle';
          Game.cam.targetZoom = 1.12;
          Game.cam.targetOffsetX = 0;
        }
      });
    } else if (action === 'fatigue') {
      // exausta pelas rajadas: perde o turno e recebe 1.5× de dano
      this.E.fatigued = true;
      this.push({
        dur: 50, msg: `${S} arqueja, exausta — as asas falham! (dano recebido ×1.5)`,
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
          on: () => { this.anim.ex = -46 - U.rand(0, 18); this.hitPlayer(this.E.soco, 'fogo'); }
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
    } else {
      this.push({
        dur: 20,
        msg: fire ? `${S} desfere um golpe de brasas!` : `${S} desfere um soco de maré!`,
        on: () => {
          this.anim.e = 'attack';
          this.anim.ex = -70;
          EnemyVFX.attack(this.E, this.EX, this.EY, this.PX, this.PY - 42, 20, false);
          Game.cam.targetZoom = 1.22;
          Game.cam.targetOffsetX = -40;
        }
      });
      this.push({ dur: 10, on: () => this.hitPlayer(this.E.soco, 'fisico') });
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
    let dmg = base;
    let note = null;
    let barrierWeak = false;
    if (this.playerHoly) {
      // Defesa da Luz: 75% de bloqueio, sem fraqueza elemental
      dmg = Math.max(1, Math.floor(dmg * 0.25));
      note = '盾 a luz apara!';
    } else if (this.playerBarrier) {
      // barreira elemental: fraca contra o elemento oposto (apenas água apaga barreira de fogo, fogo não evapora a de água)
      const weak = (kind === 'agua' && this.playerBarrier === 'fogo');
      barrierWeak = weak;
      dmg = Math.max(1, Math.floor(dmg * (weak ? 0.75 : 0.5)));
      note = weak
        ? 'A água APAGA a barragem!'
        : '障 barragem: metade!';
    } else if (this.playerDef) {
      dmg = Math.max(1, Math.floor(dmg / 2));
      note = '守 metade!';
    }
    const shieldKind = this.playerHoly ? 'light'
      : (this.playerBarrier || (this.playerDef ? 'guard' : null));
    this.P.hp = Math.max(0, this.P.hp - dmg);
    this.anim.pFlash = 1;
    if (this.anim.p !== 'defend') this.anim.p = 'hurt';
    this.shake = big ? 16 : 7;
    
    // Zoom punch e Hit freeze nos impactos recebidos pelo jogador
    Game.cam.zoom = big ? 1.35 : 1.25;
    Game.freezeFrames = big ? 9 : 5;
    
    Sfx.hurt();
    const col = kind === 'agua' ? '#7fd4ff' : kind === 'fogo' ? '#ffab66' : '#ffffff';
    this.floater(this.PX, this.PY - 90, '-' + dmg, col, big);
    if (note) this.floater(this.PX, this.PY - 116, note, note.includes('!') && note.length > 14 ? '#ff9a7a' : '#ffe9b0');
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
    } else if (shieldKind) PlayerVFX.block(this.PX, this.PY, shieldKind, kind);
    else PlayerVFX.impact(this.PX, this.PY - 42, kind === 'agua' ? 'water' : kind === 'fogo' ? 'fire' : 'guard', !!big);
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
    this.over = true;
    const fire = this.E.element === 'fogo';
    this.push({
      dur: 55, msg: fire ? 'O espírito de fogo se desfaz em brasas!' : 'O espírito d\'água colapsa em chuva!',
      on: () => {
        Sfx.splash();
        Particles.burst(this.EX, this.EY - 50, 26, () => ({
          x: this.EX + U.rand(-24, 24), y: this.EY - 50 + U.rand(-30, 30),
          vx: U.rand(-3, 3), vy: fire ? U.rand(-3.5, -0.8) : U.rand(-5, -1), grav: fire ? 0 : 0.25,
          life: 50, size: 3, color: fire ? 'rgba(255,146,76,0.92)' : 'rgba(140,210,255,0.9)',
          type: fire ? 'wisp' : 'drop'
        }));
        EnemyVFX.hit(this.E, this.EX, this.EY - 50, true);
      },
      upd: k => { this.E.dissolve = k; }
    });
    this.victory('won');
  },

  purifySequence() {
    this.over = true;
    this.push({
      dur: 26, msg: 'A luz encontra uma fresta na correnteza—',
      on: () => { this.E.aura = 1; Sfx.purify(); }
    });
    this.push({
      dur: 80, msg: 'O espírito d\'água se desfaz em luz!',
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
    // Zoom dramático focado no samurai vitorioso (PX = 270)
    Game.cam.targetZoom = 1.25;
    Game.cam.targetOffsetX = -60;
    Game.cam.targetOffsetY = -30;

    const P = this.P;
    const claimed = mode !== 'won';
    const xpGain = Math.round(this.E.xp * (claimed ? 1.5 : 1));
    const essGain = claimed ? 2 : 1;

    // aplica tudo já; os passos abaixo só exibem
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
          + (Game.absorbed === 1 ? '  Rajada Sombria despertou.' : '')
      });
    }
    for (const lv of levelsGained) {
      this.push({
        dur: 65, msg: `✦ Nível ${lv}! A luz interior cresce. PV, PM e EST restaurados.`,
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
      if (this.E.element === 'fogo') {
        this.push({
          dur: 90, msg: 'O Shōgun das Cinzas desmorona em brasas que esfriam...',
          on: () => {
            Game.fireBossDefeated = true;
            Sfx.amulet();
          }
        });
        this.push({ dur: 70, msg: 'As cinzas assentam sobre um trono vazio. A caverna respira.' });
      } else {
        this.push({
          dur: 90, msg: 'O Shōgun Afogado se desfaz... e o lago inteiro suspira, liberto.',
          on: () => {
            Game.bossDefeated = true;
            Sfx.amulet();
          }
        });
        this.push({ dur: 60, msg: 'Ao longe, o portal da aurora ACENDE — o caminho está livre.' });
      }
    }
    this.push({ dur: 1, on: () => Game.finishBattle(mode) });
  },

  defeatSequence() {
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
      const drawEnemyFn = this.E.element === 'fogo' ? drawFireSamurai : drawWaterSamurai;
      const opts = {
        t: this.t + this.E.et, pose: this.anim.e, facing: -1,
        flash: this.E.flash, aura: this.E.aura,
        auraCol: this.claimColor(),
        alpha: 1 - this.E.dissolve,
        armT: this.anim.e === 'attack' ? Math.min(1, (this.t % 30) / 10) : 0
      };
      if (this.E.element === 'agua' && this.E.hitT > 0) {
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

    Particles.draw(ctx, 0, 0, 'front');

    // camada 5b da atmosfera: névoa rasteira emoldurando + partículas poéticas
    if (window.BattleAtmosphere) BattleAtmosphere.drawForegroundFx(ctx);

    // onda de tsunami / chuva de meteoros
    if (this.wave && this.wave.fire) {
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
      ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
      ctx.fillText(`霧 névoa: ataques erram 75% (${this.mistT} rodada${this.mistT > 1 ? 's' : ''}) — magias não erram`, 30, 30);
      ctx.restore();
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
      lava:   ['#160607', '#4a160d']
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
    } else if (env !== 'abyss') {
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
      ctx.fillText(E.hp + ' / ' + E.maxHp, bx + bw, by - 10);

      // O glifo dá personalidade; o texto remove ambiguidade. Assim, o
      // jogador entende a leitura tática em uma olhada, sem mudar o script
      // de turnos, dano ou comportamento do inimigo.
      if (this.menu.open && E.script.length) {
        const next = E.script[0];
        const fireE = E.element === 'fogo';
        const info = {
          soco:    { k: '攻', c: '255,120,110', danger: false, label: 'GOLPE' },
          multi:   { k: '連', c: '255,150,80', danger: true,  label: 'RAJADA — DEFENDA' },
          fatigue: { k: '疲', c: '170,230,150', danger: false, label: 'FADIGA — CASTIGUE' },
          nevoa:   { k: '霧', c: '215,235,255', danger: true,  label: 'NÉVOA — USE MAGIA' },
          mare:    fireE
            ? { k: '炎', c: '255,160,80', danger: true, label: 'ERUPÇÃO — DEFENDA' }
            : { k: '潮', c: '120,240,255', danger: true, label: 'MARÉ — DEFENDA' },
          defend:  { k: '守', c: fireE ? '255,170,100' : '130,200,255', danger: false, label: 'DEFESA — DANO REDUZIDO' },
          charge:  fireE
            ? { k: '炎', c: '255,160,80', danger: true, label: 'CARGA — DEFENDA' }
            : { k: '波', c: '150,230,255', danger: true, label: 'CARGA — DEFENDA' },
          tsunami: fireE
            ? { k: '隕', c: '255,160,80', danger: true, label: 'METEOROS — DEFENDA' }
            : { k: '波', c: '150,230,255', danger: true, label: 'TSUNAMI — DEFENDA' }
        }[next];
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

    // ── mensagem ──
    if (this.msg && (this.q.length || this.msgT < 220)) {
      const shown = this.msg.slice(0, Math.floor(this.msgT * 1.6));
      ctx.save();
      ctx.fillStyle = 'rgba(6,10,22,0.8)';
      ctx.fillRect(160, 96, 640, 40);
      ctx.strokeStyle = 'rgba(255,214,130,0.35)';
      ctx.strokeRect(160, 96, 640, 40);
      ctx.fillStyle = '#f4e6c4';
      ctx.font = '15px "Segoe UI", sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(shown, 480, 117);
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
