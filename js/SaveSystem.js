'use strict';

/**
 * SAVE & CACHE — persistência de progresso em localStorage.
 *
 * Chave: `ronin_de_luz_save_v1` (save único, com autosave).
 *
 *   AUTOSAVE — ao ativar/meditar num torii, ao derrotar chefes, ao obter
 *   amuletos (Sui/Ka/Fū/Ancestral) ou a Katana da Escuridão, e ao cruzar
 *   portais entre reinos.
 *
 *   TÍTULO — «CONTINUAR» (quando há save) / «NOVO JOGO».
 *   PAUSA  — «Salvar Jogo», «Carregar Jogo», «Novo Jogo (apagar save)».
 *
 * Integração 100% por wrapping. O truque central: PostProcessor.process
 * recebe o canvas offscreen todo frame — interceptá-lo dá acesso ao ctx do
 * jogo (que é uma const fechada no main.js) e a um ponto pré-apresentação
 * para desenhar os menus, sem editar arquivos compartilhados.
 */
const SaveSystem = {
  KEY: 'ronin_de_luz_save_v1',
  VERSION: 1,

  _ctx: null,            // ctx do canvas offscreen, capturado no primeiro frame
  titleIdx: 0,           // 0 = CONTINUAR, 1 = NOVO JOGO
  confirmNew: false,     // «Novo Jogo» na pausa pede confirmação dupla
  savedFlashT: 0,        // «✓ Salvo!» no menu de pausa
  pendingSave: 0,        // save agendado (pós-chefe, espera a poeira baixar)
  cooldown: 0,           // anti-spam de autosave
  _snap: null,           // snapshot p/ detectar ganhos (amuletos, katana...)

  // ───────────────────── armazenamento ─────────────────────

  hasSave() {
    try { return !!localStorage.getItem(this.KEY); } catch (e) { return false; }
  },

  getSaveInfo() {
    try {
      const d = JSON.parse(localStorage.getItem(this.KEY));
      if (!d || d.version !== this.VERSION) return null;
      const nomes = { floresta: 'Reino da Água', fogo: 'Reino do Fogo', vento: 'Reino do Vento', jardim: 'Jardim Antigo' };
      return {
        timestamp: d.timestamp,
        mapa: nomes[d.game.currentMap] || d.game.currentMap,
        level: d.player.level || 1
      };
    } catch (e) { return null; }
  },

  clearSave() {
    try { localStorage.removeItem(this.KEY); } catch (e) { /* indisponível */ }
  },

  serialize() {
    const G = Game, P = G.player;
    const pickupsPorMapa = {};
    for (const id of Object.keys(World.maps)) {
      pickupsPorMapa[id] = (World.maps[id].pickups || []).map(p => !!p.taken);
    }
    return {
      version: this.VERSION,
      timestamp: Date.now(),
      player: {
        x: P.x, y: P.y, facing: P.facing,
        hp: P.hp, maxHp: P.maxHp, mp: P.mp, maxMp: P.maxMp,
        sta: P.sta, maxSta: P.maxSta, level: P.level, xp: P.xp
      },
      game: {
        currentMap: World.current,
        checkpoint: { ...G.checkpoint },
        essences: G.essences, kills: G.kills, purified: G.purified, absorbed: G.absorbed,
        amulets: { ...G.amulets }, equipped: G.equipped,
        fireAmuletForm: G.fireAmuletForm, ancientEssenceClaimed: G.ancientEssenceClaimed,
        hasDarkKatana: G.hasDarkKatana, wielded: G.wielded,
        bossDefeated: G.bossDefeated, fireBossDefeated: G.fireBossDefeated,
        windBossDefeated: G.windBossDefeated, ancientGolemDefeated: G.ancientGolemDefeated,
        serpentGone: G.serpentGone, toriiHints: { ...G.toriiHints },
        caveShown: G.caveShown, lavaShown: G.lavaShown, ashShown: G.ashShown,
        floodShown: G.floodShown, canopyShown: G.canopyShown, veiasShown: G.veiasShown,
        essenceLost: G.essenceLost, essence: G.essence ? { ...G.essence } : null,
        hpPenalty: G.hpPenalty
      },
      pickups: pickupsPorMapa,
      keyItems: {
        darkKatanaTaken: !!(World.darkKatana && World.darkKatana.taken),
        suiAmuletTaken: !!(World.amulet && World.amulet.taken),
        fireAltarTaken: !!(World.fireAltar && World.fireAltar.taken),
        windAmuletTaken: !!(window.WindKingdom && WindKingdom.windAmulet && WindKingdom.windAmulet.taken)
      },
      wind: window.WindKingdom ? {
        compassTaken: !!WindKingdom.compass.taken,
        phoenixFeathers: WindKingdom.phoenixFeathers.map(feather => !!feather.taken),
        phoenixUnlocked: !!WindKingdom.phoenixUnlocked
      } : null,
      enemies: (typeof Enemies !== 'undefined' ? Enemies.list : []).map(e => ({
        dead: !!e.dead, purified: !!e.purified, absorbed: !!e.absorbed, cool: e.cool || 0
      })),
      garden: window.AncientGarden ? {
        trained: !!AncientGarden.trained,
        stonesRead: AncientGarden.stones.map(s => !!s.read),
        armorDead: !!(AncientGarden.armorFoe && AncientGarden.armorFoe.dead)
      } : null
    };
  },

  saveGame(origem) {
    if (!Game.player) return false;
    try {
      localStorage.setItem(this.KEY, JSON.stringify(this.serialize()));
    } catch (e) { return false; }
    this.cooldown = 90;
    this.syncSnapshot();
    if (Game.state === 'explore' && typeof Hud !== 'undefined' && Hud.toast) {
      Hud.toast(`✓ Progresso salvo${origem ? ' — ' + origem : ''}.`, '#bfe8c0');
    }
    return true;
  },

  loadGame() {
    let d = null;
    try { d = JSON.parse(localStorage.getItem(this.KEY)); } catch (e) { return false; }
    if (!d || d.version !== this.VERSION || !d.player || !d.game) return false;
    const G = Game, gv = d.game;

    // estado do Game
    G.checkpoint = { ...gv.checkpoint };
    G.essences = gv.essences | 0; G.kills = gv.kills | 0;
    G.purified = gv.purified | 0; G.absorbed = gv.absorbed | 0;
    G.amulets = { sui: !!gv.amulets.sui, ka: !!gv.amulets.ka, wind: !!gv.amulets.wind };
    G.equipped = gv.equipped || null;
    G.fireAmuletForm = gv.fireAmuletForm || 'base';
    G.ancientEssenceClaimed = !!gv.ancientEssenceClaimed;
    G.hasDarkKatana = !!gv.hasDarkKatana;
    G.wielded = gv.wielded || 'light';
    G.bossDefeated = !!gv.bossDefeated;
    G.fireBossDefeated = !!gv.fireBossDefeated;
    G.windBossDefeated = !!gv.windBossDefeated;
    G.ancientGolemDefeated = !!gv.ancientGolemDefeated;
    G.serpentGone = !!gv.serpentGone;
    G.toriiHints = { ...(gv.toriiHints || {}) };
    G.caveShown = !!gv.caveShown; G.lavaShown = !!gv.lavaShown; G.ashShown = !!gv.ashShown;
    G.floodShown = !!gv.floodShown; G.canopyShown = !!gv.canopyShown; G.veiasShown = !!gv.veiasShown;
    G.essenceLost = !!gv.essenceLost;
    G.essence = gv.essence ? { ...gv.essence } : null;
    G.hpPenalty = gv.hpPenalty || 0;
    G.dialog = null; G.serpentNear = false; G.serpentCd = 0;

    // itens-chave do mundo
    if (World.darkKatana) World.darkKatana.taken = !!d.keyItems.darkKatanaTaken;
    if (World.amulet) World.amulet.taken = !!d.keyItems.suiAmuletTaken;
    if (World.fireAltar) World.fireAltar.taken = !!d.keyItems.fireAltarTaken;
    if (window.WindKingdom && WindKingdom.windAmulet) {
      WindKingdom.windAmulet.taken = !!d.keyItems.windAmuletTaken;
    }
    if (window.WindKingdom && d.wind) {
      WindKingdom.compass.taken = !!d.wind.compassTaken;
      (d.wind.phoenixFeathers || []).forEach((taken, i) => {
        if (WindKingdom.phoenixFeathers[i]) WindKingdom.phoenixFeathers[i].taken = !!taken;
      });
      WindKingdom.phoenixUnlocked = !!d.wind.phoenixUnlocked
        || WindKingdom.phoenixFeathers.every(feather => feather.taken);
    }

    // coletáveis por mapa (objetos vivem em World.maps — persistem entre loads)
    for (const id of Object.keys(d.pickups || {})) {
      const alvo = World.maps[id] && World.maps[id].pickups;
      if (!alvo) continue;
      d.pickups[id].forEach((taken, i) => { if (alvo[i]) alvo[i].taken = !!taken; });
    }

    // estados dos espíritos do mapa (evita recontar karma)
    if (typeof Enemies !== 'undefined' && Array.isArray(d.enemies)) {
      d.enemies.forEach((s, i) => {
        const e = Enemies.list[i];
        if (!e) return;
        e.dead = !!s.dead; e.purified = !!s.purified;
        e.absorbed = !!s.absorbed; e.cool = s.cool | 0;
      });
    }

    // jardim antigo
    if (window.AncientGarden && d.garden) {
      AncientGarden.trained = !!d.garden.trained;
      d.garden.stonesRead.forEach((r, i) => {
        if (AncientGarden.stones[i]) AncientGarden.stones[i].read = !!r;
      });
      if (d.garden.armorDead) {
        if (!AncientGarden.armorFoe) {
          AncientGarden.armorFoe = {
            dummy: true, tier: AncientGarden.DUMMY_TIER,
            x: AncientGarden.ARMOR.x, y: AncientGarden.ARMOR.y,
            map: 'jardim', dead: true, cool: 0, isBoss: false
          };
        } else AncientGarden.armorFoe.dead = true;
      }
      AncientGarden.cut = null; AncientGarden.reading = null;
    }

    // mundo e jogador
    World.load(gv.currentMap || 'floresta');
    const P = G.player, pv = d.player;
    P.x = pv.x; P.y = pv.y; P.facing = pv.facing || 1;
    P.vx = 0; P.vy = 0;
    P.maxHp = pv.maxHp; P.hp = Math.min(pv.hp, pv.maxHp);
    P.maxMp = pv.maxMp; P.mp = Math.min(pv.mp, pv.maxMp);
    P.maxSta = pv.maxSta; P.sta = Math.min(pv.sta, pv.maxSta);
    P.level = pv.level || 1; P.xp = pv.xp || 0;
    if (P.setMeditating) P.setMeditating(false);
    // Normaliza saves antigos, nos quais o Espírito guardava 75% da vida
    // original. A regra atual usa 50% também para uma essência já perdida.
    if (G.essenceLost && G.essence) {
      const originalMax = P.maxHp + G.hpPenalty;
      G.essence.spiritHp = Math.max(12, Math.round(originalMax * 0.50));
    }

    G.cam.x = U.clamp(P.x - 480, 0, World.width - 960);
    G.cam.y = U.clamp(P.y - 330, 0, World.height - 540);
    G.cam.targetZoom = 1.0; G.cam.zoom = 1.0;
    G.cam.targetOffsetX = 0; G.cam.targetOffsetY = 0;

    this.syncSnapshot();
    this.cooldown = 120;
    return true;
  },

  // ───────────── autosave: vigia de conquistas ─────────────

  syncSnapshot() {
    const G = Game;
    this._snap = {
      map: World.current,
      sui: G.amulets.sui, ka: G.amulets.ka, wind: G.amulets.wind,
      dark: G.hasDarkKatana, forma: G.fireAmuletForm,
      ancestral: G.ancientEssenceClaimed,
      b1: G.bossDefeated, b2: G.fireBossDefeated, b3: G.windBossDefeated, b4: G.ancientGolemDefeated,
      meditando: !!(G.player && G.player.meditating)
    };
  },

  watch(G) {
    if (this.cooldown > 0) this.cooldown--;
    if (this.savedFlashT > 0) this.savedFlashT--;
    if (this.pendingSave > 0 && --this.pendingSave === 0 && !G.wipe) {
      this.saveGame('vitória');
    }
    if (!this._snap) { this.syncSnapshot(); return; }
    // a cutscene só bloqueia o autosave dentro do próprio jardim
    if (G.wipe || (window.AncientGarden && AncientGarden.cut && World.current === 'jardim')) return;

    const s = this._snap, A = G.amulets;
    let motivo = null;
    if (World.current !== s.map) motivo = 'novo reino';
    else if (A.sui !== s.sui || A.ka !== s.ka || A.wind !== s.wind) motivo = 'amuleto';
    else if (G.hasDarkKatana !== s.dark) motivo = 'katana';
    else if (G.fireAmuletForm !== s.forma || G.ancientEssenceClaimed !== s.ancestral) motivo = 'ancestral';
    else if (G.bossDefeated !== s.b1 || G.fireBossDefeated !== s.b2
      || G.windBossDefeated !== s.b3 || G.ancientGolemDefeated !== s.b4) motivo = 'chefe';
    else if (G.player && G.player.meditating && !s.meditando) motivo = 'meditação';

    if (motivo && this.cooldown <= 0) this.saveGame(motivo);
    else if (motivo) this.syncSnapshot();
  },

  // ───────────────────── telas (overlays) ─────────────────────

  drawTitleMenu(ctx, frames) {
    const info = this.getSaveInfo();
    if (!info) return;
    ctx.save();
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';

    // painel discreto sobre a área do prompt original
    const py = 432;
    ctx.fillStyle = 'rgba(4,8,16,0.78)';
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(330, py - 20, 300, 96, 8); else ctx.rect(330, py - 20, 300, 96);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,214,130,0.35)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    const ops = ['CONTINUAR', 'NOVO JOGO'];
    for (let i = 0; i < 2; i++) {
      const sel = this.titleIdx === i;
      const oy = py + i * 30;
      if (sel) {
        ctx.fillStyle = `rgba(255,214,130,${0.85 + 0.15 * Math.sin(frames * 0.1)})`;
        ctx.font = '700 17px "Yu Mincho", "Segoe UI", serif';
        ctx.fillText('› ' + ops[i] + ' ‹', 480, oy);
      } else {
        ctx.fillStyle = 'rgba(180,190,210,0.6)';
        ctx.font = '600 15px "Yu Mincho", "Segoe UI", serif';
        ctx.fillText(ops[i], 480, oy);
      }
    }
    // detalhes do save sob a opção CONTINUAR
    const dt = new Date(info.timestamp);
    const quando = `${String(dt.getDate()).padStart(2, '0')}/${String(dt.getMonth() + 1).padStart(2, '0')} ${String(dt.getHours()).padStart(2, '0')}:${String(dt.getMinutes()).padStart(2, '0')}`;
    ctx.fillStyle = 'rgba(140,155,180,0.7)';
    ctx.font = 'italic 10px "Segoe UI", sans-serif';
    ctx.fillText(`${info.mapa} · Nv ${info.level} · ${quando}`, 480, py + 58);
    ctx.restore();
  },

  drawPauseExtras(ctx, frames) {
    const G = Game;
    // extensão compacta do painel original (bx 280, by 120, bw 400, bh 300)
    // — termina em y 532, dentro da viewport de 540
    const bx = 280, ey = 420, ew = 400, eh = 112;
    ctx.save();
    ctx.fillStyle = 'rgba(10, 14, 26, 0.92)';
    ctx.fillRect(bx, ey, ew, eh);
    ctx.strokeStyle = 'rgba(255, 214, 130, 0.42)';
    ctx.lineWidth = 2;
    ctx.strokeRect(bx, ey, ew, eh);
    // costura visual entre os painéis
    ctx.fillStyle = 'rgba(10, 14, 26, 0.92)';
    ctx.fillRect(bx + 2, ey - 3, ew - 4, 6);

    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const podeSalvar = G.prevState === 'explore';
    const ops = [
      {
        label: this.savedFlashT > 0 ? '✓ Salvo!'
          : podeSalvar ? 'Salvar Jogo' : 'Salvar Jogo — só no mapa',
        ok: podeSalvar
      },
      { label: 'Carregar Jogo', ok: this.hasSave() },
      { label: this.confirmNew ? 'Apagar save e recomeçar?' : 'Novo Jogo', ok: true }
    ];
    for (let i = 0; i < 3; i++) {
      const idx = 4 + i;
      const sel = G.pauseIdx === idx;
      const oy = ey + 24 + i * 34;
      if (sel) {
        ctx.fillStyle = 'rgba(255,214,130,0.14)';
        ctx.fillRect(bx + 24, oy - 13, ew - 48, 26);
      }
      ctx.fillStyle = !ops[i].ok ? 'rgba(120,130,150,0.45)'
        : sel ? '#ffe9b0' : 'rgba(200,208,224,0.85)';
      ctx.font = (sel ? '700 ' : '600 ') + '15px "Yu Mincho", "Segoe UI", serif';
      ctx.fillText((sel ? '› ' : '') + ops[i].label + (sel ? ' ‹' : ''), 480, oy);
    }
    ctx.restore();
  },

  // entrada do título: true = evento consumido (não repassar ao jogo)
  titleInput(G) {
    if (!this.hasSave()) return false;
    if (Input.pressed('up') || Input.pressed('downKey')) {
      this.titleIdx = 1 - this.titleIdx;
      Sfx.menuMove();
      return true;
    }
    if (Input.pressed('confirm')) {
      if (this.titleIdx === 0) {           // CONTINUAR
        Sfx.confirm();
        G.startWipe(() => {
          if (this.loadGame()) {
            G.state = 'explore';
            Hud.toast('Jornada retomada. O reino te esperava.', '#ffe9b0');
          } else {
            G.state = 'title';
            this.clearSave();
          }
        });
        return true;
      }
      return false;                        // NOVO JOGO → fluxo original (cutscene)
    }
    return false;
  }
};

window.SaveSystem = SaveSystem;

// ───────────────────── instalação por wrapping ─────────────────────
(function () {
  const SS = SaveSystem;

  // 1) captura do ctx + desenho dos menus, pré-apresentação (todo frame)
  const _proc = PostProcessor.process;
  PostProcessor.process = function (offCanvas, ...rest) {
    if (offCanvas && !SS._ctx) SS._ctx = offCanvas.getContext('2d');
    if (SS._ctx) {
      if (Game.state === 'title') SS.drawTitleMenu(SS._ctx, Game.frames);
      else if (Game.state === 'paused') SS.drawPauseExtras(SS._ctx, Game.frames);
    }
    return _proc.call(this, offCanvas, ...rest);
  };

  // 2) título: CONTINUAR intercepta antes do fluxo original
  const _upd = Game.update;
  Game.update = function () {
    if (this.state === 'title' && SS.titleInput(this)) {
      this.frames++;
      this.updateWipe();
      Input.endFrame();
      return;
    }
    _upd.call(this);
  };

  // 3) menu de pausa com Habilidades/Salvar/Carregar/Novo Jogo (7 opções)
  Game.updatePauseMenu = function () {
    if (window.AbilityMenu && AbilityMenu.open) {
      AbilityMenu.update(this);
      return;
    }
    const isEscOrP = (Input.keys['Escape'] && Input.just['Escape']) || (Input.keys['KeyP'] && Input.just['KeyP']);
    if (isEscOrP) {
      Sfx.confirm();
      SS.confirmNew = false;
      this.state = this.prevState;
      return;
    }
    const optionsCount = 7;
    if (Input.pressed('up')) {
      this.pauseIdx = (this.pauseIdx + optionsCount - 1) % optionsCount;
      SS.confirmNew = false;
      Sfx.menuMove();
    }
    if (Input.pressed('downKey')) {
      this.pauseIdx = (this.pauseIdx + 1) % optionsCount;
      SS.confirmNew = false;
      Sfx.menuMove();
    }

    if (this.pauseIdx === 0) {              // Continuar
      if (Input.pressed('confirm')) {
        Sfx.confirm();
        this.state = this.prevState;
      }
    } else if (this.pauseIdx === 1) {       // Habilidades
      if (Input.pressed('confirm') && window.AbilityMenu) {
        AbilityMenu.openMenu();
      }
    } else if (this.pauseIdx === 2) {       // Volume SFX
      let change = 0;
      if (Input.pressed('left')) change = -0.1;
      if (Input.pressed('right')) change = 0.1;
      if (change !== 0) { Sfx.setSfxVolume(Sfx.sfxVolume + change); Sfx.menuMove(); }
    } else if (this.pauseIdx === 3) {       // Volume Música
      let change = 0;
      if (Input.pressed('left')) change = -0.1;
      if (Input.pressed('right')) change = 0.1;
      if (change !== 0) { Sfx.setMusicVolume(Sfx.musicVolume + change); Sfx.menuMove(); }
    } else if (this.pauseIdx === 4) {       // Salvar Jogo
      if (Input.pressed('confirm') && this.prevState === 'explore') {
        if (SS.saveGame('manual')) { SS.savedFlashT = 90; Sfx.confirm(); }
        else Sfx.deny();
      } else if (Input.pressed('confirm')) Sfx.deny();
    } else if (this.pauseIdx === 5) {       // Carregar Jogo
      if (Input.pressed('confirm')) {
        if (SS.hasSave()) {
          Sfx.confirm();
          this.state = this.prevState;      // sai da pausa; o wipe assume
          this.startWipe(() => {
            if (SS.loadGame()) {
              Battle.active = false;
              this.state = 'explore';
              Hud.toast('Jogo carregado.', '#ffe9b0');
            }
          });
        } else Sfx.deny();
      }
    } else if (this.pauseIdx === 6) {       // Novo Jogo (confirmação dupla)
      if (Input.pressed('confirm')) {
        if (!SS.confirmNew) { SS.confirmNew = true; Sfx.menuMove(); }
        else {
          SS.clearSave();
          Sfx.confirm();
          location.href = location.pathname + '?fresh=' + Date.now();
        }
      }
    }
  };

  // 4) autosave: torii ativado (o checkpoint mudou de lugar)
  const _torii = Game.updateToriiInteraction;
  Game.updateToriiInteraction = function (p) {
    const antes = this.checkpoint;
    const antesKey = antes ? `${antes.map}:${antes.x}:${antes.y}` : '';
    _torii.call(this, p);
    const dep = this.checkpoint;
    if (dep && `${dep.map}:${dep.x}:${dep.y}` !== antesKey && SS.cooldown <= 0) {
      SS.saveGame('torii');
    }
  };

  // 5) autosave: vigia de conquistas a cada quadro de exploração
  const _exp = Game.exploreUpdate;
  Game.exploreUpdate = function () {
    _exp.call(this);
    if (this.state === 'explore' || this.state === 'battle') SS.watch(this);
  };

  // 6) autosave: vitória sobre chefes (agendado p/ depois da poeira baixar)
  const _fb = Game.finishBattle;
  Game.finishBattle = function (outcome) {
    const f = Battle.fieldRef;
    _fb.call(this, outcome);
    if (f && f.isBoss && (outcome === 'won' || outcome === 'purified' || outcome === 'absorbed')) {
      SS.pendingSave = 120;
    }
  };
})();
