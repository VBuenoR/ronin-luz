'use strict';
// ─── Núcleo do jogo: estados, câmera, transições, loop ───────────────
const canvas = document.getElementById('game');
const uiCanvas = document.getElementById('game-ui');
const VW = 960, VH = 540;
let viewScale = 1, viewOffX = 0, viewOffY = 0;

// Configuração híbrida Canvas 2D + WebGL
const offscreenCanvas = document.createElement('canvas');
offscreenCanvas.width = VW;
offscreenCanvas.height = VH;
const ctx = offscreenCanvas.getContext('2d');
const uiCtx = uiCanvas.getContext('2d');

let mainCtx = null;
let useWebGL = false;

function resize() {
  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.floor(innerWidth * dpr);
  canvas.height = Math.floor(innerHeight * dpr);
  canvas.style.width = innerWidth + 'px';
  canvas.style.height = innerHeight + 'px';
  uiCanvas.width = canvas.width;
  uiCanvas.height = canvas.height;
  uiCanvas.style.width = canvas.style.width;
  uiCanvas.style.height = canvas.style.height;
  viewScale = Math.min(canvas.width / VW, canvas.height / VH);
  viewOffX = (canvas.width - VW * viewScale) / 2;
  viewOffY = (canvas.height - VH * viewScale) / 2;
  if (useWebGL) {
    PostProcessor.resize(VW, VH);
  }
}
addEventListener('resize', resize);

const Game = {
  state: 'title',
  frames: 0, runFrames: 0,
  titleVfx: null,
  player: null,
  cam: {
    x: 0, y: 0, shake: 0,
    zoom: 1.0, targetZoom: 1.0,
    offsetX: 0.0, offsetY: 0.0,
    targetOffsetX: 0.0, targetOffsetY: 0.0
  },
  freezeFrames: 0,
  pauseIdx: 0,
  prevState: null,
  essences: 0, kills: 0, purified: 0, absorbed: 0,
  amulets: { sui: false, ka: false, wind: false }, equipped: null, // um amuleto por vez, equipado fora de combate
  fireAmuletForm: 'base', // 'base' | 'ancestral'
  ancientEssenceClaimed: false,
  hasDarkKatana: false, bossDefeated: false, fireBossDefeated: false, windBossDefeated: false,
  ancientGolemDefeated: false,
  wielded: 'light', // 'light' | 'dark' — qual katana está na mão
  checkpoint: { map: 'floresta', x: 200, y: 1200 },
  caveShown: false, lavaShown: false, ashShown: false,
  floodShown: false, canopyShown: false, veiasShown: false,
  dialog: null, serpentCd: 0, serpentGone: false, serpentNear: false, introT: 0,
  // Recuperar Espírito: essência perdida na morte
  essenceLost: false, essence: null, hpPenalty: 0,
  wipe: null,
  portalHintCd: 0,
  toriiHints: {},
  developerMode: false,

  shogunEssenceCount() {
    return Number(this.bossDefeated) + Number(this.fireBossDefeated) + Number(this.windBossDefeated);
  },

  hasAllShogunEssences() {
    return this.shogunEssenceCount() === 3;
  },

  toggleDeveloperMode() {
    this.developerMode = !this.developerMode;
    if (this.player) {
      this.player.vx = 0;
      this.player.vy = 0;
      this.player.dashT = 0;
      this.player.setMeditating(false);
      if (this.developerMode) this.player.invuln = 0;
    }
    Sfx.confirm();
    Hud.toast(
      this.developerMode
        ? 'Modo desenvolvedor ativado: voo e imunidade a inimigos.'
        : 'Modo desenvolvedor desativado.',
      this.developerMode ? '#9fffe0' : '#c8d0dc'
    );
  },

  drawDeveloperBadge(ctx) {
    if (!this.developerMode) return;
    ctx.save();
    ctx.fillStyle = 'rgba(4,20,24,0.90)';
    ctx.fillRect(400, 12, 160, 40);
    ctx.strokeStyle = 'rgba(125,255,218,0.75)';
    ctx.lineWidth = 1;
    ctx.strokeRect(400.5, 12.5, 159, 39);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#baffeb';
    ctx.font = '700 11px "Segoe UI", sans-serif';
    ctx.fillText('MODO DEV ATIVO', 480, 25);
    ctx.fillStyle = '#7ed9c1';
    ctx.font = '9px "Segoe UI", sans-serif';
    ctx.fillText('VOO | INVULNERAVEL | F9', 480, 41);
    ctx.restore();
  },

  pointerWorldPosition() {
    if (!Input.pointer.just) return null;
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return null;

    const pixelX = (Input.pointer.x - rect.left) * (canvas.width / rect.width);
    const pixelY = (Input.pointer.y - rect.top) * (canvas.height / rect.height);
    const screenX = (pixelX - viewOffX) / viewScale;
    const screenY = (pixelY - viewOffY) / viewScale;
    if (screenX < 0 || screenX > VW || screenY < 0 || screenY > VH) return null;

    const zoom = this.cam.zoom || 1;
    const sceneX = (screenX - VW / 2 - this.cam.offsetX) / zoom + VW / 2;
    const sceneY = (screenY - VH / 2 - this.cam.offsetY) / zoom + VH / 2;
    return { x: sceneX + this.cam.x, y: sceneY + this.cam.y };
  },

  updateToriiInteraction(p) {
    const click = this.pointerWorldPosition();
    for (const c of World.checkpoints) {
      const near = Math.abs(p.x - c.x) < 42 && Math.abs(p.y - c.y) < 70;
      if (!near) continue;
      if (!p.onGround) continue;

      const key = `${World.current}:${c.x}:${c.y}`;
      const isCurrent = this.checkpoint.map === World.current
        && this.checkpoint.x === c.x && this.checkpoint.y === c.y;
      if (!isCurrent) {
        this.checkpoint = { map: World.current, x: c.x, y: c.y };
        Sfx.checkpoint();
      }
      if (!this.toriiHints[key]) {
        this.toriiHints[key] = true;
        Hud.toast('O torii guarda sua luz — ↑ ou clique para meditar.');
      }

      const clickedTorii = click
        && Math.abs(click.x - c.x) < 58
        && click.y > c.y - 110 && click.y < c.y + 18;
      if (!Input.pressed('up') && !clickedTorii) break;

      p.setMeditating(!p.meditating);
      if (p.meditating) {
        Sfx.tone({ f: 392, f2: 523, dur: 0.42, type: 'sine', vol: 0.07 });
        Hud.toast('瞑 Meditação iniciada — mova-se para despertar.', '#d9f5d8');
      } else {
        Sfx.tone({ f: 523, f2: 392, dur: 0.22, type: 'sine', vol: 0.05 });
        Hud.toast('A meditação foi encerrada.', '#c8d0dc');
      }
      break;
    }
  },

  cycleAmulet() {
    const owned = ['sui', 'ka', 'wind'].filter(a => this.amulets[a]);
    if (!owned.length) return;
    const i = owned.indexOf(this.equipped);
    this.equipped = owned[(i + 1) % owned.length];
    const sui = this.equipped === 'sui';
    const ka = this.equipped === 'ka';
    const wind = this.equipped === 'wind';
    Sfx.equip();
    let label = '';
    let color = '';
    if (sui) {
      label = '水 Sui equipado — as marés respondem à lâmina';
      color = '#a8dcff';
    } else if (ka) {
      const ancestral = this.fireAmuletForm === 'ancestral';
      label = ancestral
        ? '蒼 Amuleto de Fogo Ancestral equipado — a chama azul marca seus golpes'
        : '火 Ka equipado — as chamas respondem à lâmina';
      color = ancestral ? '#82ddff' : '#ffc08a';
    } else {
      label = '風 Fū equipado — as correntes de vento respondem à lâmina';
      color = '#a2e8c9';
    }
    Hud.toast(label, color);
    const p = this.player;
    Particles.burst(p.x, p.y - 20, 10, () => ({
      x: p.x + U.rand(-10, 10), y: p.y - 20 + U.rand(-12, 12),
      vx: U.rand(-1, 1), vy: U.rand(-1.4, 0),
      life: 30, size: 2.4,
      color: sui
        ? 'rgba(140,220,255,0.9)'
        : (ka
          ? (this.fireAmuletForm === 'ancestral'
            ? 'rgba(110,220,255,0.94)'
            : 'rgba(255,160,80,0.9)')
          : 'rgba(162,232,201,0.9)'),
      type: 'wisp'
    }));
  },

  // a escuridão toma o corpo conforme espíritos são absorvidos
  corruption() { return U.clamp(this.absorbed / 8, 0, 1); },

  // ── diálogo da serpente ──
  openSerpentDialog() {
    if (World.current !== 'floresta') return;
    Sfx.absorb();
    this.dialog = {
      t: 0, sel: 1,
      speaker: '??? — uma pequena serpente de olhos roxos',
      lines: [
        '“Deseja ganhar mais poder?',
        'E esquecer todas as mentiras que o seu Deus disse a você?',
        'Seja poderoso como nós — pegue a Katana da Escuridão.”'
      ],
      options: ['Aceitar', 'Negar'],
      onChoose: (i) => {
        this.dialog = null;
        if (i === 0) {
          World.darkKatana.taken = true;
          this.hasDarkKatana = true;
          this.wielded = 'dark';
          this.serpentGone = true;
          Sfx.darkTake();
          this.cam.shake = 7;
          Hud.showBanner('闇', 'Katana da Escuridão', 'A magia Absorver desperta. Q alterna entre as lâminas.');
          Hud.toast('A serpente sorri — e se derrama na sua sombra.', '#c9a6ff');
          const dk2 = World.darkKatana;
          Particles.burst(dk2.x, dk2.y - 40, 26, () => ({
            x: dk2.x + U.rand(-18, 18), y: dk2.y - 40 + U.rand(-24, 24),
            vx: U.rand(-2, 2), vy: U.rand(-2.5, 0.5),
            life: 65, size: 3, color: 'rgba(170,110,255,0.95)', type: 'wisp'
          }));
        } else {
          this.serpentCd = 420;
          Sfx.deny();
          Hud.toast('“Voltarei a esperar. Todos voltam.”', '#c9a6ff');
        }
      }
    };
  },

  openAncientEssenceDialog() {
    if (!window.AshValley || !AshValley.ancientEssenceAvailable(this) || this.dialog) return false;

    if (!this.amulets.ka) {
      Sfx.deny();
      this.dialog = {
        t: 0, sel: 0,
        typeSpeed: 3,
        speaker: 'Essência Ancestral',
        accent: '#82ddff',
        lines: [
          'Você precisa pegar o Amuleto de Fogo antes',
          'para aguentar a Essência Ancestral.'
        ],
        options: ['Entendi'],
        optionAccents: ['#82ddff'],
        onChoose: () => {
          this.dialog = null;
          Sfx.deny();
        }
      };
      return true;
    }

    Sfx.tone({ f: 220, f2: 440, dur: 0.38, type: 'sine', vol: 0.07 });
    this.dialog = {
      t: 0, sel: 0,
      minConfirmT: 60,
      typeSpeed: 8,
      speaker: 'Transformar o Amuleto de Fogo?',
      accent: '#82ddff',
      lines: [
        'Ao pegar a Essência Ancestral, o Amuleto de Fogo será',
        'consumido e renascerá como Amuleto de Fogo Ancestral.',
        'Você perderá permanentemente a Barragem de Fogo.',
        'Benefício: 20% da magia de fogo inimiga vira cura.',
        'Malefício: +20% de dano recebido de magia de Água.',
        'Malefício: +15% de dano físico recebido.',
        'Malefício: +15% no custo de todas as magias.',
        'Ativação: Incinerar Ancestral marca golpes por 5 ações.',
        'Tem certeza de que deseja continuar?'
      ],
      options: ['Agora não', 'Transformar Ka'],
      optionAccents: ['#d6c8a7', '#82ddff'],
      onChoose: (i) => {
        this.dialog = null;
        if (i !== 1) {
          Sfx.deny();
          Hud.toast('A Essência Ancestral continua aguardando no santuário.', '#9bcfff');
          return;
        }

        // Revalida tudo antes da mutação: a transformação acontece inteira
        // ou não acontece, e Ka continua sendo o amuleto equipado.
        if (!AshValley.ancientEssenceAvailable(this) || !this.amulets.ka) {
          Sfx.deny();
          Hud.toast('A Essência Ancestral rejeitou a transformação.', '#9bcfff');
          return;
        }

        this.amulets.ka = true;
        this.equipped = 'ka';
        this.fireAmuletForm = 'ancestral';
        this.ancientEssenceClaimed = true;

        const essence = AshValley.ANCIENT_ESSENCE;
        const p = this.player;
        Sfx.amulet();
        this.cam.shake = Math.max(this.cam.shake, 9);
        Hud.showBanner('蒼', 'Amuleto de Fogo Ancestral', 'Incinerar Ancestral despertou. Barragem de Fogo foi consumida.');
        Hud.toast('Ka renasceu em chamas azuis.', '#82ddff');
        Particles.burst(essence.x, essence.y - 28, 34, () => ({
          x: essence.x + U.rand(-18, 18), y: essence.y - 28 + U.rand(-22, 16),
          vx: U.rand(-2.4, 2.4), vy: U.rand(-3.1, -0.3),
          life: 72, size: U.rand(2.2, 4.2), color: 'rgba(110,215,255,0.96)', type: 'wisp'
        }));
        Particles.burst(p.x, p.y - 24, 22, () => ({
          x: p.x + U.rand(-14, 14), y: p.y - 24 + U.rand(-18, 18),
          vx: U.rand(-1.8, 1.8), vy: U.rand(-2.6, 0.2),
          life: 58, size: U.rand(2, 3.6), color: 'rgba(180,240,255,0.94)', type: 'wisp'
        }));
      }
    };
    return true;
  },

  updateAncientEssenceInteraction(p) {
    if (!window.AshValley || !AshValley.ancientEssenceAvailable(this)) return false;
    if (!AshValley.playerNearAncientEssence(p) || !Input.pressed('up')) return false;
    p.setMeditating(false);
    return this.openAncientEssenceDialog();
  },

  updateDialog() {
    const d = this.dialog;
    d.t++;
    const options = Array.isArray(d.options) && d.options.length ? d.options : ['Continuar'];
    d.sel = U.clamp(Number.isFinite(d.sel) ? d.sel : 0, 0, options.length - 1);
    const previous = Input.pressed('up') || Input.pressed('left');
    const next = Input.pressed('downKey') || Input.pressed('right');
    if (options.length > 1 && (previous || next)) {
      d.sel = (d.sel + (previous ? -1 : 1) + options.length) % options.length;
      Sfx.menuMove();
    }
    if (Input.pressed('confirm') && d.t > (d.minConfirmT || 30)) d.onChoose(d.sel);
  },

  drawDialog() {
    const d = this.dialog;
    ctx.fillStyle = 'rgba(2,4,10,0.55)';
    ctx.fillRect(0, 0, 960, 540);
    const bx = 130, bw = 700;
    const lineCount = Math.max(1, Array.isArray(d.lines) ? d.lines.length : 1);
    const bh = Math.min(400, Math.max(192, 118 + lineCount * 25));
    const by = 540 - bh - 38;
    const accent = d.accent || '#c9a6ff';
    ctx.fillStyle = 'rgba(10,8,20,0.94)';
    ctx.fillRect(bx, by, bw, bh);
    ctx.strokeStyle = accent;
    ctx.globalAlpha = 0.58;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(bx, by, bw, bh);
    ctx.globalAlpha = 1;
    ctx.fillStyle = accent;
    ctx.font = '700 13px "Segoe UI", sans-serif';
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    ctx.fillText(d.speaker, bx + 18, by + 28);
    ctx.fillStyle = '#e4dcf2';
    ctx.font = '15px "Segoe UI", sans-serif';
    let budget = Math.floor(d.t * (d.typeSpeed || 1.5));
    d.lines.forEach((ln, i) => {
      ctx.fillText(ln.slice(0, Math.max(0, budget)), bx + 18, by + 58 + i * 25);
      budget -= ln.length;
    });
    const options = Array.isArray(d.options) && d.options.length ? d.options : ['Continuar'];
    const buttonW = options.length === 1 ? 170 : 190;
    const buttonGap = 14;
    const totalButtonsW = options.length * buttonW + (options.length - 1) * buttonGap;
    const optionStartX = bx + bw - 18 - totalButtonsW;
    options.forEach((op, i) => {
      const ox = optionStartX + i * (buttonW + buttonGap), oy = by + bh - 44;
      const seld = d.sel === i;
      const optionAccent = (d.optionAccents && d.optionAccents[i]) || (i === 0 ? '#b98fff' : '#ffe08a');
      ctx.fillStyle = seld ? 'rgba(92,118,150,0.28)' : 'rgba(30,26,46,0.8)';
      ctx.fillRect(ox, oy, buttonW, 30);
      ctx.strokeStyle = seld ? optionAccent : 'rgba(120,110,160,0.4)';
      ctx.strokeRect(ox, oy, buttonW, 30);
      ctx.fillStyle = seld ? '#ffffff' : '#a8a0c0';
      ctx.font = (seld ? '700 ' : '') + '14px "Segoe UI", sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(op, ox + buttonW / 2, oy + 15);
    });
    ctx.fillStyle = 'rgba(150,140,180,0.7)';
    ctx.font = '11px "Segoe UI", sans-serif';
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    ctx.fillText(options.length > 1 ? '← → escolher · ENTER confirmar' : 'ENTER continuar', bx + 18, by + bh - 24);
  },

  swapKatana(silent) {
    if (!this.hasDarkKatana) return false;
    this.wielded = this.wielded === 'light' ? 'dark' : 'light';
    const dark = this.wielded === 'dark';
    if (dark) Sfx.absorb(); else Sfx.confirm();
    const p = this.player;
    Particles.burst(p.x, p.y - 20, 12, () => ({
      x: p.x + U.rand(-10, 10), y: p.y - 20 + U.rand(-14, 14),
      vx: U.rand(-1.2, 1.2), vy: U.rand(-1.6, 0.2),
      life: 34, size: 2.6,
      color: dark ? 'rgba(170,110,255,0.9)' : 'rgba(255,224,150,0.9)',
      type: 'wisp'
    }));
    if (!silent) Hud.toast(dark ? '闇 Katana da Escuridão empunhada' : '光 Katana de Luz empunhada',
      dark ? '#c9a6ff' : '#ffe9b0');
    return true;
  },

  init() {
    resize();
    Input.init();
    World.init();
    Enemies.init();
    // O Reino do Vento se registra durante World.init, antes de Enemies.init
    // limpar a lista. Reinstalar aqui repoe seus inimigos de forma idempotente.
    if (window.WindKingdom) WindKingdom.install();
    if (window.AshValley) AshValley.spawnEnemies(Enemies.list);
    World.setDecorActors(Enemies.list);
    Lighting.init(); // Inicializa o buffer de iluminação
    this.player = new Player(World.checkpoints[0].x, World.checkpoints[0].y);
    if (typeof LakeSerpentSystem !== 'undefined') {
      LakeSerpentSystem.init(0x51f15e7d);
    }
    
    // Inicialização híbrida WebGL / 2D fallback
    useWebGL = PostProcessor.init(canvas);
    if (!useWebGL) {
      mainCtx = canvas.getContext('2d');
    }
    
    this.cam.x = U.clamp(this.player.x - 480, 0, World.width - VW);
    this.cam.y = U.clamp(this.player.y - 330, 0, World.height - VH);
  },

  startWipe(mid) {
    if (this.wipe) return;
    if (typeof LakeSerpentSystem !== 'undefined') {
      LakeSerpentSystem.suspend(180);
    }
    this.wipe = { t: 0, half: 26, mid, done: false };
  },

  updateWipe() {
    const w = this.wipe;
    if (!w) return false;
    w.t++;
    if (w.t >= w.half && !w.done) { w.done = true; w.mid(); }
    if (w.t >= w.half * 2) this.wipe = null;
    return true;
  },

  // ── entrada e saída de batalha ──
  startBattle(fieldEnemy, advantage) {
    if (this.wipe) return;
    this.player.setMeditating(false);
    Sfx.noise({ dur: 0.4, vol: 0.3, fc: 2000, fc2: 300 });
    this.cam.shake = 6;
    this.startWipe(() => {
      Battle.begin(fieldEnemy, advantage);
      this.state = 'battle';
    });
  },

  finishBattle(outcome) {
    this.startWipe(() => {
      const f = Battle.fieldRef;
      Battle.active = false;
      this.state = 'explore';
      Particles.clear();
      
      // Reseta zoom e offsets da câmera para exploração
      this.cam.targetZoom = 1.0;
      this.cam.targetOffsetX = 0;
      this.cam.targetOffsetY = 0;
      if (outcome === 'won' || outcome === 'purified' || outcome === 'absorbed') {
        f.dead = true;
        f.purified = outcome === 'purified';
        f.absorbed = outcome === 'absorbed';
      } else if (outcome === 'fled') {
        f.cool = 160;
      } else if (outcome === 'lost') {
        // parte da Essência Divina fica no local da derrota
        if (typeof SpiritOfLight !== 'undefined' && f && !f.spirit) {
          SpiritOfLight.onDeath(f.map || World.current, f.x, f.y);
        }
        this.respawn(true);
        if (f.isBoss) {
          Hud.toast(
            f.archetype === 'ancientGolem'
              ? 'O Golem continua preso no santuário, alimentando a chama ancestral.'
              : 'O Shōgun aguarda, imóvel como o lago.',
            f.archetype === 'ancientGolem' ? '#7ad8ff' : '#a8c4e8'
          );
        }
        Hud.toast('Parte da sua luz ficou para trás — um Espírito nasceu.', '#ffe4a0');
      } else if (outcome === 'recovered') {
        Hud.toast('Sua essência retornou. Você está inteiro novamente.', '#ffe9b0');
      } else if (outcome === 'spiritFled') {
        // desarma o gatilho para o jogador poder se afastar sem ser puxado de volta
        if (typeof SpiritOfLight !== 'undefined') SpiritOfLight.disarm();
        this.player.invuln = 60;
        Hud.toast('Você recua — o Espírito continua a esperar. Afaste-se.', '#ffe4a0');
      }
      this.player.invuln = 90;
    });
  },

  // ── Recuperar Espírito: a arena espiritual se forma ──
  startSpiritBattle() {
    if (this.wipe || this.state !== 'explore') return;
    this.player.setMeditating(false);
    const e = this.essence;
    Sfx.tone({ f: 523, dur: 0.7, type: 'sine', vol: 0.12 });
    Sfx.tone({ f: 784, dur: 0.9, type: 'sine', vol: 0.1, delay: 0.25 });
    this.cam.shake = 5;
    this.startWipe(() => {
      Battle.begin({
        spirit: true, map: e.map, x: e.x, y: e.y,
        spiritHp: e.spiritHp, dead: false, cool: 0, isBoss: false
      }, 'spirit');
      this.state = 'battle';
    });
  },

  respawn(full) {
    const c = this.checkpoint;
    if (typeof LakeSerpentSystem !== 'undefined') {
      LakeSerpentSystem.suspend(180);
    }
    if (World.current !== c.map) World.load(c.map);
    const p = this.player;
    p.x = c.x; p.y = c.y;
    p.vx = 0; p.vy = 0; p.dashT = 0;
    p.setMeditating(false);
    if (full) { p.hp = p.maxHp; p.mp = p.maxMp; p.sta = p.maxSta; }
    this.cam.x = U.clamp(p.x - 480, 0, World.width - VW);
    this.cam.y = U.clamp(p.y - 330, 0, World.height - VH);
  },

  handlePlayerExplorationDeath() {
    const p = this.player;
    Sfx.defeat();
    this.cam.shake = Math.max(this.cam.shake, 15);

    if (typeof SpiritOfLight !== 'undefined') {
      SpiritOfLight.onDeath(World.current, p.x, p.y);
    }

    this.startWipe(() => {
      Particles.clear();
      this.respawn(true);
      if (this.prevState === 'battle') {
        this.state = 'explore';
      }
      Hud.toast('Você sucumbiu aos perigos. Parte de sua essência ficou para trás.', '#ffe4a0');
    });
  },

  // ── exploração ──
  exploreUpdate() {
    const p = this.player;
    this.runFrames++;
    if (this.dialog) {
      if (typeof LakeSerpentSystem !== 'undefined') LakeSerpentSystem.suspend(180);
      this.updateDialog(); Hud.update(); return;
    }
    if (this.serpentCd > 0) this.serpentCd--;
    if (this.portalHintCd > 0) this.portalHintCd--;
    this.updateToriiInteraction(p);
    if (this.updateAncientEssenceInteraction(p)) { Hud.update(); return; }
    p.update();

    // golpe de katana inicia confronto com vantagem
    const hb = p.attackHitbox();
    if (hb) {
      for (const e of Enemies.list) {
        if (e.map === World.current && !e.dead && e.cool <= 0 && U.aabb(hb, e.rect)) {
          this.startBattle(e, 'player');
          return;
        }
      }
    }

    Enemies.update(p);

    // Recuperar Espírito: cicatriz + gatilho do encontro
    if (typeof SpiritOfLight !== 'undefined') {
      SpiritOfLight.update();
      if (this.state !== 'explore') return; // o encontro começou
    }

    // contato: o inimigo embosca (dash atravessa ileso)
    if (p.invuln <= 0 && p.dashT <= 0) {
      for (const e of Enemies.list) {
        if (e.map === World.current && !e.dead && e.cool <= 0 && U.aabb(p.rect, e.rect)) {
          this.startBattle(e, 'enemy');
          return;
        }
      }
    }

    // coletáveis
    for (const pk of World.pickups) {
      if (pk.taken) continue;
      if (Math.abs(p.x - pk.x) < 26 && Math.abs(p.y - 18 - pk.y) < 36) {
        if (pk.type === 'lotus') {
          const gain = 6; // metade dos antigos 12 PV
          p.maxHp += gain;
          p.hp = Math.min(p.maxHp, p.hp + gain);
          Hud.toast('Estrela de vida — +6 PV máximos');
        } else if (pk.type === 'crystal') {
          const gain = 2.5; // metade dos antigos 5 PM
          p.maxMp += gain;
          p.mp = Math.min(p.maxMp, p.mp + gain);
          Hud.toast('Essência de mana — +2,5 PM máximos', '#a8dcff');
        } else {
          continue;
        }
        pk.taken = true;
        Sfx.pickup();
        Particles.burst(pk.x, pk.y, 10, () => ({
          x: pk.x + U.rand(-8, 8), y: pk.y + U.rand(-8, 8),
          vx: U.rand(-1.5, 1.5), vy: U.rand(-2, -0.5),
          life: 30, size: 2.5,
          color: pk.type === 'lotus' ? 'rgba(255,228,160,0.9)' : 'rgba(150,220,255,0.9)',
          type: 'wisp'
        }));
      }
    }

    // portão selado removido
    // A travessia é livre; o progresso agora é travado no Portal da Aurora.

    // portais entre reinos (↓ para atravessar)
    const fp = World.firePortal[World.current];
    if (fp && !this.wipe && Math.abs(p.x - fp.x) < 46 && Math.abs(p.y - fp.y) < 95 && Input.pressed('downKey')) {
      const target = World.current === 'floresta' ? 'fogo' : 'floresta';
      Sfx.gate();
      this.startWipe(() => {
        World.load(target);
        p.x = fp.tx; p.y = fp.ty;
        p.vx = 0; p.vy = 0; p.dashT = 0;
        p.invuln = 60;
        this.cam.x = U.clamp(p.x - 480, 0, World.width - VW);
        this.cam.y = U.clamp(p.y - 330, 0, World.height - VH);
        Particles.clear();
        if (target === 'fogo' && !this.lavaShown) {
          this.lavaShown = true;
          Hud.showBanner('炎', 'Reino do Fogo');
        } else if (target === 'floresta') {
          Hud.toast('As águas da floresta te recebem de volta.', '#a8dcff');
        }
      });
      return;
    }
    // portal do vento
    const wp = World.windPortal;
    if (World.current === 'floresta' && !this.wipe
      && Math.abs(p.x - wp.x) < 46 && Math.abs(p.y - wp.y) < 85 && Input.pressed('downKey')) {
      WindKingdom.travel('vento');
      return;
    }

    if (typeof LakeSerpentSystem !== 'undefined') {
      LakeSerpentSystem.update(p);
    }

    // vapor termal: elevador de ar (sem dano)
    for (const u of World.updrafts) {
      if (U.aabb(p.rect, u)) {
        p.vy = Math.max(-7.5, p.vy - 1.6);
        p.canAirDash = true;
        if (this.frames % 3 === 0) {
          Particles.spawn({
            x: p.x + U.rand(-12, 12), y: p.y - U.rand(0, 20),
            vy: -2.2, life: 22, size: 2, color: 'rgba(223,242,255,0.7)', type: 'orb'
          });
        }
      }
    }

    // Sui — amuleto da água
    const am = World.amulet;
    if (World.current === 'floresta' && am.spawned && !am.taken && Math.abs(p.x - am.x) < 36 && Math.abs(p.y - am.y) < 90) {
      am.taken = true;
      this.amulets.sui = true;
      this.equipped = 'sui';
      Sfx.amulet();
      Hud.showBanner('水', 'Sui — Amuleto da Água', 'Barragem e Pulso de Água despertam. E alterna amuletos.');
      Particles.burst(am.x, am.y - 40, 24, () => ({
        x: am.x + U.rand(-14, 14), y: am.y - 40 + U.rand(-14, 14),
        vx: U.rand(-2, 2), vy: U.rand(-2.5, 0),
        life: 60, size: 3, color: 'rgba(160,230,255,0.95)', type: 'wisp'
      }));
    }

    // Ka — amuleto de fogo, no altar acima do trono das cinzas (só o terreno o guarda)
    const fa = World.fireAltar;
    if (World.current === 'fogo' && !fa.taken && Math.abs(p.x - fa.x) < 46 && Math.abs(p.y - fa.y) < 95) {
      fa.taken = true;
      this.amulets.ka = true;
      this.equipped = 'ka';
      Sfx.amulet();
      Hud.showBanner('火', 'Ka — Amuleto de Fogo', 'Barragem de Fogo e Incinerar despertam. E alterna amuletos.');
      Particles.burst(fa.x, fa.y - 52, 26, () => ({
        x: fa.x + U.rand(-16, 16), y: fa.y - 52 + U.rand(-16, 16),
        vx: U.rand(-2, 2), vy: U.rand(-2.5, 0),
        life: 60, size: 3, color: 'rgba(255,170,80,0.95)', type: 'wisp'
      }));
    }

    // (O Fū — Amuleto do Vento — foi movido para o Reino do Vento: WindKingdom.afterPlayer)

    // portal da aurora — exige as 3 essências dos 3 chefes
    const po = World.portal;
    if (Math.abs(p.x - po.x) < 52 && p.onGround && Input.pressed('up')) {
      if (this.hasAllShogunEssences()) {
        this.startWipe(() => { this.state = 'ending'; });
      } else if (this.portalHintCd <= 0) {
        this.portalHintCd = 240;
        Sfx.deny();
        Hud.toast(`O portal dorme... Reúna as 3 essências de luz dos Shōguns (Água, Fogo e Vento) para ativá-lo. Você tem ${this.shogunEssenceCount()}/3.`, '#a8c4e8');
      }
    }

    // trocar de katana / amuleto (fora do combate)
    if (!p.meditating && Input.pressed('swap')) this.swapKatana(false);
    if (!p.meditating && Input.pressed('equip')) this.cycleAmulet();

    // a serpente do templo abandonado apenas CHAMA; o diálogo abre com ↑
    const dk = World.darkKatana;
    this.serpentNear = false;
    if (World.current === 'floresta'
        && !dk.taken && !this.serpentGone && this.serpentCd <= 0
        && Math.abs(p.x - dk.x) < 120 && Math.abs(p.y - dk.y) < 100) {
      this.serpentNear = true;
      if (Input.pressed('up')) this.openSerpentDialog();
    }

    // banners regionais
    if (World.current === 'floresta') {
      if (!this.caveShown && p.x > 5250 && p.x < 5920 && p.y > 1620) {
        this.caveShown = true;
        Hud.showBanner('淵', 'As Profundezas Sem Sol');
      }
      if (!this.veiasShown && p.x > 1700 && p.x < 5250 && p.y > 1640) {
        this.veiasShown = true;
        Hud.showBanner('淵', 'Veias Afogadas');
      }
      if (!this.floodShown && p.x > 5850 && p.y > 1700) {
        this.floodShown = true;
        Hud.showBanner('沈', 'Salão Afogado');
      }
      if (!this.canopyShown && p.x > 2600 && p.x < 7050 && p.y < 560) {
        this.canopyShown = true;
        Hud.showBanner('梢', 'Copas Sussurrantes');
      }
    } else if (!this.ashShown && p.x < 2750 && p.y > 1900) {
      this.ashShown = true;
      Hud.showBanner('灰', 'Trono das Cinzas');
    }

    // lava queima a luz — pule fora!
    for (const lv of World.lavas) {
      if (U.aabb(p.rect, { x: lv.x, y: lv.y + 4, w: lv.w, h: lv.h })) {
        p.vy = -12;
        p.canAirDash = true;
        if (p.invuln <= 0) {
          // Amuleto de Fogo confere imunidade ao dano de lava
          if (this.equipped !== 'ka') {
            const dmg = World.current === 'fogo' ? 10 : 5;
            p.hp = Math.max(0, p.hp - dmg);
            p.invuln = 50;
          }
        }
        Sfx.fire();
        this.cam.shake = Math.max(this.cam.shake, 6);
        Particles.burst(p.x, lv.y, 12, () => ({
          x: p.x + U.rand(-12, 12), y: lv.y + U.rand(-4, 4),
          vx: U.rand(-2, 2), vy: U.rand(-3.5, -1), grav: 0.15,
          life: 34, size: 2.4, color: 'rgba(255,160,70,0.95)', type: 'wisp'
        }));
      }
    }

    // jatos termais do salão afogado (vapor) dão 2x mais dano (4 -> 8)
    for (const j of World.jets) {
      const phase = (this.frames + j.offset) % j.period;
      if (phase >= 60 && phase < 150) {
        const jr = { x: j.x - 14, y: j.base - j.h, w: 28, h: j.h };
        if (U.aabb(p.rect, jr)) {
          p.y -= 7;
          p.vy = -3.4;
          if (p.invuln <= 0) {
            p.hp = Math.max(0, p.hp - 8);
            p.invuln = 40;
            Sfx.splash();
            this.cam.shake = Math.max(this.cam.shake, 5);
          }
        }
      }
    }

    // espinhos de obsidiana (2x mais dano no reino de fogo: 4 -> 8)
    if (p.invuln <= 0) {
      for (const sp of World.spikes) {
        if (U.aabb(p.rect, sp)) {
          const dmg = World.current === 'fogo' ? 8 : 4;
          p.hp = Math.max(0, p.hp - dmg);
          p.invuln = 45;
          p.vy = -8;
          p.vx = (p.x < sp.x + sp.w / 2 ? -1 : 1) * 4;
          Sfx.hurt();
          this.cam.shake = Math.max(this.cam.shake, 5);
          break;
        }
      }
    }

    // abismo (o subterrâneo tem fundo sólido; fora dele, cair é fatal)
    if (World.current === 'floresta') {
      const killY = p.x > 1620 ? World.height + 60 : 1560;
      if (p.y > killY) {
        p.hp = Math.max(0, p.hp - 5);
        this.respawn(false);
        Hud.toast('O abismo te devolve ao último torii.');
      }
    } else if (p.y > World.height + 60) {
      p.hp = Math.max(0, p.hp - 5);
      this.respawn(false);
      Hud.toast('As muralhas profundas te devolvem ao último torii.');
    }

    // banners de zona (superfície da floresta)
    if (World.current === 'floresta') {
      for (const z of World.zones) {
        if (!z.shown && p.x >= z.x) { z.shown = true; Hud.showBanner(z.kanji, z.name); }
      }
    }

    // ambiente vivo
    if (window.AshValley) AshValley.update(this);
    this.ambient(p);
    Particles.update();

    // câmera
    const tx = U.clamp(p.x - 480 + p.facing * 70, 0, World.width - VW);
    const ty = U.clamp(p.y - 330, 0, World.height - VH);
    this.cam.x = U.lerp(this.cam.x, tx, 0.09);
    this.cam.y = U.lerp(this.cam.y, ty, 0.12);
    this.cam.shake *= 0.85;

    // morte na exploração
    if (p.hp <= 0) {
      this.handlePlayerExplorationDeath();
      return;
    }

    Hud.update();
  },

  ambient(p) {
    const cx = this.cam.x, cy = this.cam.y;

    // Poeira atmosférica em suspensão (motas de poeira / pólen que flutuam lentamente)
    if (Math.random() < 0.18) {
      Particles.spawn({
        x: cx + U.rand(0, 960), y: cy + U.rand(0, 540),
        vx: U.rand(-0.16, 0.16), vy: U.rand(-0.12, 0.08),
        life: 180 + U.rand(0, 100), size: 1.0 + Math.random() * 0.8,
        color: World.current === 'fogo' ? 'rgba(255, 120, 40, 0.42)' : 'rgba(255, 245, 220, 0.45)',
        type: 'firefly'
      });
    }

    // vaga-lumes
    if (World.current === 'floresta' && Math.random() < 0.1) {
      const gold = p.x < 5050 || Math.random() < 0.4;
      Particles.spawn({
        x: cx + U.rand(0, 960), y: cy + U.rand(120, 480),
        vx: U.rand(-0.2, 0.2), vy: U.rand(-0.15, 0.15),
        life: 240, size: 1.8,
        color: gold ? 'rgba(255,230,150,0.9)' : 'rgba(140,225,255,0.9)',
        type: 'firefly'
      });
    }
    // folhas na floresta
    if (World.current === 'floresta' && p.x < 5050 && p.y < 1500 && Math.random() < 0.045) {
      Particles.spawn({
        x: cx + U.rand(0, 960), y: cy - 10,
        vy: 0.8, grav: 0.004, life: 320, size: 3,
        color: 'rgba(70,130,95,0.8)', type: 'leaf'
      });
    }
    // borrifo da cascata
    if (Math.abs(5545 - cx - 480) < 700 && Math.random() < 0.3) {
      Particles.spawn({
        x: 5545 + U.rand(-24, 24), y: 1288,
        vx: U.rand(-1.6, 1.6), vy: U.rand(-2.6, -0.6), grav: 0.1,
        life: 34, size: 2, color: 'rgba(200,240,255,0.7)', type: 'drop'
      });
    }
    // bolhas nas profundezas
    if (p.inWater && Math.random() < 0.2) {
      Particles.spawn({
        x: cx + U.rand(200, 760), y: cy + U.rand(200, 540),
        vy: U.rand(-1.4, -0.7), life: 70, size: U.rand(1.4, 2.6),
        color: 'rgba(190,235,255,0.6)', type: 'orb'
      });
    }
    // motas de brasa no Reino do Fogo
    if (World.current === 'fogo' && (!window.AshValley || !AshValley.inValley(p.x, p.y)) && Math.random() < 0.25) {
      Particles.spawn({
        x: cx + U.rand(0, 960), y: cy + U.rand(280, 560),
        vx: U.rand(-0.25, 0.25), vy: U.rand(-0.9, -0.4),
        life: 140, size: 1.8, color: 'rgba(255,160,70,0.85)', type: 'firefly'
      });
    }
  },

  // ── renderização ──
  drawExplore() {
    const shx = this.cam.shake > 0.4 ? U.rand(-this.cam.shake, this.cam.shake) : 0;
    const shy = this.cam.shake > 0.4 ? U.rand(-this.cam.shake, this.cam.shake) * 0.6 : 0;
    const cam = { x: this.cam.x + shx, y: this.cam.y + shy };

    World.drawBackground(ctx, cam, this.frames);
    World.drawGameplayTrees(ctx, cam, this.frames);
    World.drawForegroundBack(ctx, cam, this.frames);
    World.drawSecondaryBack(ctx, cam, this.frames);
    World.drawWorld(ctx, cam, this.frames);
    World.drawBioluminescentBase(ctx, cam, this.frames);
    if (typeof LakeSerpentSystem !== 'undefined') {
      LakeSerpentSystem.drawBody(ctx, cam, this.frames);
    }
    Enemies.draw(ctx, cam, this.frames);
    if (window.AshValley) AshValley.drawAncientEssenceBase(ctx, cam, this.frames, this);
    if (typeof SpiritOfLight !== 'undefined') SpiritOfLight.draw(ctx, cam, this.frames);
    this.player.draw(ctx, cam);
    if (window.AshValley) AshValley.drawBurn(ctx, this.player, cam);

    // O volume aquático colore a cena; fontes de luz são compostas depois.
    World.drawWaterMedium(ctx, cam, this.frames);

    // Desenha a máscara de sombras e recortes de luz dinâmicos (Light Mask)
    Lighting.draw(ctx, cam, this.frames);
    World.drawTerrainEmissive(ctx, cam, this.frames);
    World.drawBioluminescentEmissive(ctx, cam, this.frames);
    if (window.AshValley) AshValley.drawAncientEssenceEmissive(ctx, cam, this.frames, this);
    if (typeof LakeSerpentSystem !== 'undefined') {
      LakeSerpentSystem.drawEmissive(ctx, cam, this.frames);
    }

    Particles.draw(ctx, cam.x, cam.y);
    World.drawJets(ctx, cam, this.frames);
    World.drawLava(ctx, cam, this.frames);
    World.drawWaterSurface(ctx, cam, this.frames);
    if (typeof LakeSerpentSystem !== 'undefined') {
      LakeSerpentSystem.drawSurfaceFx(ctx, cam, this.frames);
    }
    
    // Desenha elementos de primeiro plano (Foreground Parallax)
    World.drawForeground(ctx, cam, this.frames, this.player);

    // névoa baixa + vinheta
    const pal = World.palette(cam.x + 480, cam.y + 270);
    const fog = ctx.createLinearGradient(0, 400, 0, 540);
    fog.addColorStop(0, U.rgb(pal.fog, 0));
    fog.addColorStop(1, U.rgb(pal.fog, 0.16));
    ctx.fillStyle = fog;
    ctx.fillRect(0, 400, 960, 140);
    // submerso: a luz se estreita conforme desce
    if (this.player.inWater) {
      const depth = U.clamp((this.player.y - 1290) / 850, 0, 1);
      ctx.fillStyle = `rgba(6,20,55,${0.05 + depth * 0.12})`;
      ctx.fillRect(0, 0, 960, 540);
      const px = this.player.x - cam.x, py = this.player.y - cam.y - 20;
      const halo = ctx.createRadialGradient(px, py, 60, px, py, 300 + (1 - depth) * 320);
      halo.addColorStop(0, 'rgba(1,4,14,0)');
      halo.addColorStop(1, `rgba(1,4,14,${0.2 + depth * 0.3})`);
      ctx.fillStyle = halo;
      ctx.fillRect(0, 0, 960, 540);
    }
    if (typeof LakeSerpentSystem !== 'undefined') {
      LakeSerpentSystem.drawCore(ctx, cam);
    }
    const vig = ctx.createRadialGradient(480, 270, 240, 480, 270, 620);
    vig.addColorStop(0, 'rgba(2,4,10,0)');
    vig.addColorStop(1, `rgba(2,4,10,${this.player.inWater ? 0.3 : 0.5})`);
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, 960, 540);

    // dica do portal
    const po = World.portal;
    if (this.hasAllShogunEssences() && World.current === 'floresta' && Math.abs(this.player.x - po.x) < 70) {
      const sx = po.x - cam.x, sy = po.y - cam.y - 140 + Math.sin(this.frames * 0.1) * 4;
      ctx.fillStyle = 'rgba(255,235,180,0.9)';
      ctx.font = '700 20px "Segoe UI", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('↑', sx, sy);
    }

    if (window.AshValley) AshValley.drawAncientEssencePrompt(ctx, cam, this.frames, this);

    // o chamado da serpente (só o convite; o diálogo abre com ↑)
    if (World.current === 'floresta' && this.serpentNear && !this.dialog) {
      const dk = World.darkKatana;
      const sx = dk.x - 20 - cam.x, sy = dk.y - cam.y - 70 + Math.sin(this.frames * 0.06) * 3;
      ctx.save();
      ctx.textAlign = 'center';
      ctx.font = 'italic 13px "Segoe UI", serif';
      ctx.shadowColor = 'rgba(0,0,0,0.8)'; ctx.shadowBlur = 4;
      ctx.fillStyle = 'rgba(201,166,255,0.96)';
      ctx.fillText('“Ei, antigo guerreiro, se aproxime.”', sx, sy);
      ctx.shadowBlur = 0;
      ctx.font = '700 12px "Segoe UI", sans-serif';
      ctx.fillStyle = `rgba(255,235,180,${0.65 + 0.35 * Math.sin(this.frames * 0.12)})`;
      ctx.fillText('↑ conversar', sx, sy + 18);
      ctx.restore();
    }

    if (this.dialog) this.drawDialog();
  },

  drawTitleLegacy() {
    const sky = ctx.createLinearGradient(0, 0, 0, 540);
    sky.addColorStop(0, '#05070f');
    sky.addColorStop(1, '#101c26');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, 960, 540);

    // kanji gigante ao fundo
    ctx.save();
    ctx.globalAlpha = 0.06 + 0.02 * Math.sin(this.frames * 0.02);
    ctx.fillStyle = '#ffe9b0';
    ctx.font = '420px serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('光', 480, 280);
    ctx.restore();

    // lua
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const halo = ctx.createRadialGradient(790, 90, 8, 790, 90, 120);
    halo.addColorStop(0, 'rgba(255,244,214,0.4)');
    halo.addColorStop(1, 'rgba(255,244,214,0)');
    ctx.fillStyle = halo;
    ctx.beginPath(); ctx.arc(790, 90, 120, 0, 7); ctx.fill();
    ctx.fillStyle = '#f7ecc8';
    ctx.beginPath(); ctx.arc(790, 90, 26, 0, 7); ctx.fill();
    ctx.restore();

    // duelo congelado
    ctx.fillStyle = '#0b111e';
    ctx.fillRect(0, 470, 960, 70);
    ctx.save();
    ctx.shadowColor = 'rgba(120,220,190,0.6)';
    ctx.shadowBlur = 8;
    ctx.fillStyle = 'rgba(110,215,180,0.45)';
    ctx.fillRect(0, 470, 960, 2);
    ctx.restore();
    drawLightSamurai(ctx, 300, 470, 2.2, { facing: 1, pose: 'idle', t: this.frames });

    if (Math.random() < 0.15) {
      Particles.spawn({
        x: U.rand(0, 960), y: U.rand(120, 460),
        vx: U.rand(-0.2, 0.2), vy: U.rand(-0.1, 0.1),
        life: 200, size: 1.6, color: 'rgba(255,230,150,0.85)', type: 'firefly'
      });
    }
    Particles.update();
    Particles.draw(ctx, 0, 0);

    // títulos
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = '#c8b890';
    ctx.font = '18px serif';
    ctx.fillText('浪 人 の 光', 480, 118);
    ctx.save();
    ctx.shadowColor = 'rgba(255,214,120,0.6)';
    ctx.shadowBlur = 16;
    ctx.fillStyle = '#ffedbe';
    ctx.font = '700 58px "Yu Mincho", "Segoe UI", serif';
    ctx.fillText('RŌNIN DE LUZ', 480, 172);
    ctx.restore();
    ctx.fillStyle = '#8fa3c8';
    ctx.font = 'italic 15px "Segoe UI", sans-serif';
    ctx.fillText('a floresta afogada aguarda a aurora', 480, 214);

    if (Math.sin(this.frames * 0.07) > -0.3) {
      ctx.fillStyle = '#ffe9b0';
      ctx.font = '600 18px "Segoe UI", sans-serif';
      ctx.fillText('— PRESSIONE  ENTER —', 480, 330);
    }
    ctx.fillStyle = 'rgba(160,175,205,0.75)';
    ctx.font = '12px "Segoe UI", sans-serif';
    ctx.fillText('← →  mover      ESPAÇO  pular      SHIFT  dash      X  atacar      ↑ ↓  escalar paredes', 480, 522);
  },

  drawTitle() {
    const t = this.frames;

    // Sementes fixas: nenhum objeto é criado durante a animação.
    if (!this.titleVfx) {
      this.titleVfx = {
        ambient: Array.from({ length: 28 }, () => ({
          x: U.rand(35, 925), y: U.rand(45, 445), phase: U.rand(0, Math.PI * 2),
          speed: U.rand(0.002, 0.006), size: U.rand(0.5, 1.35), cyan: Math.random() < 0.36
        })),
        light: Array.from({ length: 18 }, () => ({
          x: U.rand(-42, -5), phase: Math.random(), speed: U.rand(0.0017, 0.0034),
          size: U.rand(0.8, 2.1), sway: U.rand(0.018, 0.045)
        })),
        dark: Array.from({ length: 16 }, (_, i) => ({
          radius: U.rand(22, 64), angle: U.rand(0, Math.PI * 2),
          speed: U.rand(0.0018, 0.004), size: U.rand(0.8, 2.4), smoke: i % 3 === 0
        })),
        title: Array.from({ length: 8 }, () => ({
          phase: Math.random(), speed: U.rand(0.0025, 0.005),
          y: U.rand(-17, 17), size: U.rand(0.8, 1.7)
        }))
      };
    }
    const fx = this.titleVfx;

    // Noite silenciosa com divisão tonal sem linha central explícita.
    const sky = ctx.createLinearGradient(0, 0, 0, 540);
    sky.addColorStop(0, '#03050d'); sky.addColorStop(0.62, '#09121d'); sky.addColorStop(1, '#101721');
    ctx.fillStyle = sky; ctx.fillRect(0, 0, 960, 540);
    const warmSky = ctx.createRadialGradient(360, 375, 10, 360, 375, 390);
    warmSky.addColorStop(0, 'rgba(101,73,34,0.15)'); warmSky.addColorStop(0.58, 'rgba(45,33,24,0.05)'); warmSky.addColorStop(1, 'rgba(25,20,18,0)');
    ctx.fillStyle = warmSky; ctx.fillRect(0, 0, 960, 540);
    const darkSky = ctx.createRadialGradient(610, 360, 10, 610, 360, 380);
    darkSky.addColorStop(0, 'rgba(8,2,18,0.38)'); darkSky.addColorStop(0.58, 'rgba(14,5,28,0.14)'); darkSky.addColorStop(1, 'rgba(5,4,14,0)');
    ctx.fillStyle = darkSky; ctx.fillRect(0, 0, 960, 540);

    // Árvores quase invisíveis e um torii distante.
    ctx.save();
    ctx.fillStyle = 'rgba(2,5,11,0.72)';
    const trees = [52, 166, 286, 708, 828, 920];
    for (let i = 0; i < trees.length; i++) {
      const x = trees[i], w = 24 + (i % 3) * 8, top = 150 + (i % 2) * 52;
      ctx.beginPath();
      ctx.moveTo(x - w * 0.65, 472); ctx.quadraticCurveTo(x - w * 0.42, 310, x - w * 0.16, top);
      ctx.lineTo(x + w * 0.35, top - 18); ctx.quadraticCurveTo(x + w * 0.18, 320, x + w * 0.72, 472);
      ctx.closePath(); ctx.fill();
      ctx.strokeStyle = 'rgba(8,13,24,0.58)'; ctx.lineWidth = 9 + (i % 2) * 3; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(x, 285 + (i % 2) * 30);
      ctx.quadraticCurveTo(x + (i < 3 ? 42 : -42), 248, x + (i < 3 ? 74 : -74), 232); ctx.stroke();
    }
    ctx.fillStyle = 'rgba(3,5,12,0.54)';
    ctx.fillRect(420, 270, 14, 202); ctx.fillRect(526, 270, 14, 202);
    ctx.fillRect(396, 270, 168, 13); ctx.fillRect(411, 289, 138, 8);
    ctx.restore();

    // Lua neutra e fria.
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const moonHalo = ctx.createRadialGradient(790, 90, 8, 790, 90, 132);
    moonHalo.addColorStop(0, 'rgba(220,239,255,0.25)'); moonHalo.addColorStop(0.45, 'rgba(158,198,235,0.09)'); moonHalo.addColorStop(1, 'rgba(116,163,210,0)');
    ctx.fillStyle = moonHalo; ctx.beginPath(); ctx.arc(790, 90, 132, 0, Math.PI * 2); ctx.fill();
    const moon = ctx.createRadialGradient(782, 81, 2, 790, 90, 29);
    moon.addColorStop(0, '#f8fcff'); moon.addColorStop(0.62, '#d6e6f2'); moon.addColorStop(1, '#91a9be');
    ctx.fillStyle = moon; ctx.beginPath(); ctx.arc(790, 90, 27, 0, Math.PI * 2); ctx.fill();
    ctx.restore();

    // Névoa discreta com deriva lenta.
    ctx.save(); ctx.globalCompositeOperation = 'screen';
    for (let i = 0; i < 3; i++) {
      const fy = 315 + i * 58, drift = Math.sin(t * 0.0018 + i * 2.1) * 26;
      const fog = ctx.createLinearGradient(80 + drift, fy, 880 + drift, fy);
      fog.addColorStop(0, 'rgba(88,116,143,0)'); fog.addColorStop(0.5, `rgba(88,116,143,${0.025 + i * 0.009})`); fog.addColorStop(1, 'rgba(88,116,143,0)');
      ctx.fillStyle = fog; ctx.fillRect(0, fy, 960, 34);
    }
    ctx.restore();

    // Fungos bioluminescentes distantes.
    const fungi = [[102,449,0.65],[198,459,0.46],[332,445,0.62],[690,451,0.48],[742,441,0.7],[874,457,0.5]];
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < fungi.length; i++) {
      const f = fungi[i], pulse = 0.62 + Math.sin(t * 0.018 + i * 1.7) * 0.18;
      const g = ctx.createRadialGradient(f[0], f[1], 0, f[0], f[1], 18 * f[2]);
      g.addColorStop(0, `rgba(91,230,218,${0.24 * pulse})`); g.addColorStop(1, 'rgba(58,165,188,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(f[0], f[1], 18 * f[2], 0, 7); ctx.fill();
      ctx.fillStyle = `rgba(126,244,228,${0.52 * pulse})`;
      ctx.beginPath(); ctx.ellipse(f[0], f[1], 4 * f[2], 1.8 * f[2], 0, Math.PI, 0); ctx.fill();
    }
    ctx.restore();

    // Motes ambientais de baixo contraste.
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (const p of fx.ambient) {
      const x = p.x + Math.sin(t * p.speed + p.phase) * 11;
      const y = p.y + Math.cos(t * p.speed * 0.72 + p.phase) * 7;
      const a = 0.12 + (0.5 + 0.5 * Math.sin(t * p.speed * 2 + p.phase)) * 0.22;
      ctx.fillStyle = p.cyan ? `rgba(113,216,216,${a})` : `rgba(151,174,204,${a * 0.7})`;
      ctx.beginPath(); ctx.arc(x, y, p.size, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();

    // Chão: reflexão dourada à esquerda e absorção à direita.
    ctx.fillStyle = '#070b13'; ctx.fillRect(0, 468, 960, 72);
    ctx.fillStyle = 'rgba(88,119,126,0.28)'; ctx.fillRect(0, 468, 960, 1);
    ctx.save(); ctx.translate(480, 468); ctx.scale(1, 0.25);
    ctx.globalCompositeOperation = 'lighter';
    const floorLight = ctx.createRadialGradient(-48, 0, 1, -48, 0, 178);
    floorLight.addColorStop(0, 'rgba(255,199,92,0.22)'); floorLight.addColorStop(0.52, 'rgba(213,143,55,0.07)'); floorLight.addColorStop(1, 'rgba(170,105,38,0)');
    ctx.fillStyle = floorLight; ctx.beginPath(); ctx.arc(-48, 0, 178, 0, 7); ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
    const floorDark = ctx.createRadialGradient(58, 0, 2, 58, 0, 182);
    floorDark.addColorStop(0, 'rgba(0,0,5,0.62)'); floorDark.addColorStop(0.55, 'rgba(10,2,20,0.28)'); floorDark.addColorStop(1, 'rgba(5,2,14,0)');
    ctx.fillStyle = floorDark; ctx.beginPath(); ctx.arc(58, 0, 182, 0, 7); ctx.fill(); ctx.restore();

    const actorX = 480, actorY = 468, actorCenterY = 417, orbitPhase = t * 0.0042;

    // Halos locais equilibrados.
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    let aura = ctx.createRadialGradient(actorX - 22, actorCenterY, 2, actorX - 22, actorCenterY, 86);
    aura.addColorStop(0, 'rgba(255,216,130,0.23)'); aura.addColorStop(1, 'rgba(255,174,70,0)');
    ctx.fillStyle = aura; ctx.beginPath(); ctx.arc(actorX - 22, actorCenterY, 86, 0, 7); ctx.fill();
    aura = ctx.createRadialGradient(actorX + 25, actorCenterY, 2, actorX + 25, actorCenterY, 82);
    aura.addColorStop(0, 'rgba(123,76,202,0.10)'); aura.addColorStop(1, 'rgba(82,36,150,0)');
    ctx.fillStyle = aura; ctx.beginPath(); ctx.arc(actorX + 25, actorCenterY, 82, 0, 7); ctx.fill(); ctx.restore();

    // Duas correntes orbitais em sentidos opostos.
    ctx.save(); ctx.translate(actorX, actorCenterY); ctx.rotate(-0.13); ctx.globalCompositeOperation = 'lighter';
    ctx.shadowBlur = 12; ctx.shadowColor = 'rgba(255,190,78,0.55)'; ctx.strokeStyle = 'rgba(255,207,104,0.34)'; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.ellipse(0, 0, 78, 38, 0, orbitPhase, orbitPhase + Math.PI * 1.08); ctx.stroke();
    ctx.shadowColor = 'rgba(135,82,215,0.28)'; ctx.strokeStyle = 'rgba(48,22,72,0.62)'; ctx.lineWidth = 6;
    ctx.beginPath(); ctx.ellipse(0, 0, 83, 42, 0, -orbitPhase + Math.PI, -orbitPhase + Math.PI * 2.05); ctx.stroke();
    ctx.strokeStyle = 'rgba(168,112,239,0.18)'; ctx.lineWidth = 1.3;
    ctx.beginPath(); ctx.ellipse(0, 0, 83, 42, 0, -orbitPhase + Math.PI, -orbitPhase + Math.PI * 2.05); ctx.stroke(); ctx.restore();

    // Sombras vivas restritas ao lado escuro.
    ctx.save(); ctx.strokeStyle = 'rgba(30,12,46,0.42)'; ctx.lineWidth = 7; ctx.lineCap = 'round';
    for (let i = 0; i < 3; i++) {
      const sy = actorCenterY + 24 - i * 20, sway = Math.sin(t * 0.008 + i * 1.8) * 8;
      ctx.beginPath(); ctx.moveTo(actorX + 8, sy);
      ctx.bezierCurveTo(actorX + 30 + sway, sy - 8, actorX + 48 - sway, sy - 28, actorX + 38, sy - 48); ctx.stroke();
    }
    ctx.restore();

    // Um único protagonista, composto por duas metades do mesmo idle.
    ctx.save(); ctx.beginPath(); ctx.rect(0, 0, actorX + 1, 540); ctx.clip();
    drawLightSamurai(ctx, actorX, actorY, 2.45, { facing: 1, pose: 'idle', t, corrupt: 0, wield: 'light' }); ctx.restore();
    ctx.save(); ctx.beginPath(); ctx.rect(actorX, 0, 960 - actorX, 540); ctx.clip();
    ctx.filter = 'brightness(0.56) saturate(1.2)';
    drawLightSamurai(ctx, actorX, actorY, 2.45, { facing: 1, pose: 'idle', t, corrupt: 1, wield: 'dark' }); ctx.restore();

    // Partículas de luz sobem somente à esquerda.
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (const p of fx.light) {
      const q = (p.phase + t * p.speed) % 1;
      const x = actorX + p.x + Math.sin(t * p.sway + p.phase * 9) * 7;
      const y = actorY - 5 - q * 112, a = Math.pow(Math.sin(q * Math.PI), 1.2) * 0.72;
      ctx.fillStyle = `rgba(255,213,112,${a})`; ctx.beginPath(); ctx.arc(x, y, p.size, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();

    // Fragmentos e fumaça descem/circulam somente à direita.
    ctx.save();
    for (let i = 0; i < fx.dark.length; i++) {
      const p = fx.dark[i], a = p.angle - t * p.speed;
      const x = actorX + 13 + Math.cos(a) * p.radius;
      const y = actorCenterY + Math.sin(a) * p.radius * 0.58 + ((t * p.speed * 9 + i * 7) % 18);
      if (p.smoke) {
        ctx.fillStyle = 'rgba(13,5,21,0.28)'; ctx.beginPath(); ctx.ellipse(x, y, p.size * 3.4, p.size * 1.7, a, 0, 7); ctx.fill();
      } else {
        ctx.fillStyle = 'rgba(4,2,9,0.72)'; ctx.fillRect(x, y, p.size * 1.4, p.size * 2.5);
        ctx.strokeStyle = 'rgba(151,92,220,0.20)'; ctx.lineWidth = 0.6; ctx.strokeRect(x, y, p.size * 1.4, p.size * 2.5);
      }
    }
    ctx.restore();

    // Pontas das correntes dão direção ao movimento orbital.
    ctx.save(); ctx.translate(actorX, actorCenterY); ctx.rotate(-0.13); ctx.globalCompositeOperation = 'lighter';
    const lx = Math.cos(orbitPhase + Math.PI * 1.08) * 78, ly = Math.sin(orbitPhase + Math.PI * 1.08) * 38;
    ctx.fillStyle = '#ffe39b'; ctx.shadowColor = '#ffc65d'; ctx.shadowBlur = 12;
    ctx.beginPath(); ctx.arc(lx, ly, 3.4, 0, 7); ctx.fill();
    const da = -orbitPhase + Math.PI * 2.05, dx = Math.cos(da) * 83, dy = Math.sin(da) * 42;
    ctx.fillStyle = 'rgba(162,101,231,0.44)'; ctx.shadowColor = '#8d4bd1'; ctx.shadowBlur = 5;
    ctx.beginPath(); ctx.arc(dx, dy, 2.7, 0, 7); ctx.fill(); ctx.restore();

    // Apenas “LUZ” recebe brilho dourado.
    ctx.textBaseline = 'middle'; ctx.textAlign = 'center'; ctx.fillStyle = '#aebbd0';
    ctx.font = '17px "Yu Mincho", serif'; ctx.fillText('浪人の光', 480, 111);
    const prefix = 'RŌNIN DE ', lightWord = 'LUZ';
    ctx.font = '700 57px "Yu Mincho", "Segoe UI", serif';
    const prefixW = ctx.measureText(prefix).width, lightW = ctx.measureText(lightWord).width;
    const titleX = 480 - (prefixW + lightW) * 0.5, lightX = titleX + prefixW;
    ctx.textAlign = 'left'; ctx.save(); ctx.shadowColor = 'rgba(196,214,235,0.22)'; ctx.shadowBlur = 8;
    ctx.fillStyle = '#eef2f7'; ctx.fillText(prefix, titleX, 166); ctx.restore();
    ctx.save(); ctx.shadowColor = 'rgba(255,191,72,0.72)'; ctx.shadowBlur = 16;
    const titleGold = ctx.createLinearGradient(lightX, 140, lightX, 190);
    titleGold.addColorStop(0, '#fff6c9'); titleGold.addColorStop(0.54, '#ffd671'); titleGold.addColorStop(1, '#d9952f');
    ctx.fillStyle = titleGold; ctx.fillText(lightWord, lightX, 166); ctx.restore();

    // Faíscas atravessam somente a palavra LUZ.
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (const p of fx.title) {
      const q = (p.phase + t * p.speed) % 1;
      const x = lightX + q * lightW, y = 166 + p.y + Math.sin(q * Math.PI * 2) * 3;
      ctx.fillStyle = `rgba(255,226,145,${Math.sin(q * Math.PI) * 0.8})`;
      ctx.beginPath(); ctx.arc(x, y, p.size, 0, 7); ctx.fill();
    }
    ctx.restore();

    ctx.textAlign = 'center'; ctx.fillStyle = '#8497b5'; ctx.font = 'italic 14px "Segoe UI", sans-serif';
    ctx.fillText('a floresta afogada aguarda a aurora', 480, 211);
    const promptAlpha = 0.58 + Math.sin(t * 0.045) * 0.28;
    ctx.fillStyle = `rgba(236,228,207,${promptAlpha})`; ctx.font = '600 17px "Segoe UI", sans-serif';
    ctx.fillText('— PRESSIONE  ENTER —', 480, 326);
    ctx.fillStyle = 'rgba(148,164,191,0.68)'; ctx.font = '12px "Segoe UI", sans-serif';
    ctx.fillText('← →  mover      ESPAÇO  pular      SHIFT  dash      X  atacar      ↑ ↓  escalar paredes', 480, 522);
  },

  drawIntro() {
    ctx.fillStyle = '#04060e';
    ctx.fillRect(0, 0, 960, 540);
    // luz que desce do alto
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const gl = ctx.createRadialGradient(480, -80, 40, 480, -80, 560);
    gl.addColorStop(0, `rgba(255,236,190,${0.22 * U.clamp(this.introT / 60, 0, 1)})`);
    gl.addColorStop(1, 'rgba(255,236,190,0)');
    ctx.fillStyle = gl;
    ctx.fillRect(0, 0, 960, 540);
    ctx.globalAlpha = 0.07;
    ctx.fillStyle = '#ffe9b0';
    ctx.font = '340px serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('光', 480, 270);
    ctx.restore();

    if (Math.random() < 0.2) {
      Particles.spawn({
        x: U.rand(300, 660), y: -10, vy: U.rand(0.4, 1),
        life: 200, size: 2, color: 'rgba(255,236,190,0.8)', type: 'wisp'
      });
    }
    Particles.update();
    Particles.draw(ctx, 0, 0);

    const a1 = U.clamp((this.introT - 25) / 55, 0, 1);
    const a2 = U.clamp((this.introT - 95) / 55, 0, 1);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.save();
    ctx.globalAlpha = a1;
    ctx.fillStyle = '#f4e6c4';
    ctx.font = '600 26px "Yu Mincho", "Segoe UI", serif';
    ctx.fillText('“Eu te revivo como um espírito da luz.', 480, 224);
    ctx.globalAlpha = a2;
    ctx.fillText('Traga paz ao reino usando a Katana da Luz.”', 480, 268);
    ctx.fillStyle = '#c8b890';
    ctx.font = 'italic 15px "Segoe UI", sans-serif';
    ctx.fillText('— a Voz da Aurora', 480, 322);
    ctx.restore();

    if (this.introT > 150 && Math.sin(this.frames * 0.07) > -0.3) {
      ctx.fillStyle = 'rgba(200,215,240,0.8)';
      ctx.font = '13px "Segoe UI", sans-serif';
      ctx.fillText('ENTER', 480, 470);
    }
  },

  drawEnding() {
    ctx.fillStyle = '#04060e';
    ctx.fillRect(0, 0, 960, 540);
    ctx.save();
    ctx.globalAlpha = 0.1;
    ctx.fillStyle = '#ffe9b0';
    ctx.font = '380px serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('光', 480, 270);
    ctx.restore();

    if (Math.random() < 0.2) {
      Particles.spawn({
        x: U.rand(0, 960), y: 560, vy: U.rand(-1.2, -0.5),
        life: 180, size: 2, color: 'rgba(255,232,170,0.9)', type: 'wisp'
      });
    }
    Particles.update();
    Particles.draw(ctx, 0, 0);

    const p = this.player;
    const total = Enemies.total;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffedbe';
    ctx.font = '700 34px "Yu Mincho", "Segoe UI", serif';
    ctx.fillText('A floresta respira novamente.', 480, 120);

    ctx.font = '16px "Segoe UI", sans-serif';
    ctx.fillStyle = '#c8d4ea';
    const lines = [
      `Tempo de jornada — ${U.fmtTime(this.runFrames)}`,
      `Nível alcançado — ${p.level}`,
      `Espíritos purificados — ${this.purified} de ${total}`,
      `Espíritos absorvidos — ${this.absorbed} de ${total}`,
      `Espíritos dispersos em chuva — ${this.kills}`
    ];
    lines.forEach((l, i) => ctx.fillText(l, 480, 190 + i * 30));

    // balança do karma
    Hud.drawKarma(ctx, 367, 342, 226);

    ctx.fillStyle = '#ffe9b0';
    ctx.font = 'italic 15px "Segoe UI", sans-serif';
    if (this.purified >= total) {
      ctx.fillText('Nenhuma gota foi desperdiçada — todos voltaram à luz.', 480, 388);
    } else if (this.absorbed >= total) {
      ctx.fillStyle = '#c9a6ff';
      ctx.fillText('A floresta inteira arde dentro de você — fria, faminta, sua.', 480, 388);
    } else if (this.absorbed > this.purified) {
      ctx.fillStyle = '#c9a6ff';
      ctx.fillText('A escuridão caminha vestindo a sua luz.', 480, 388);
    } else if (this.purified > this.absorbed) {
      ctx.fillText('Os vaga-lumes dourados lembrarão de você.', 480, 388);
    } else {
      ctx.fillStyle = '#dfe8ff';
      ctx.fillText('Entre a chuva e a aurora, você escolheu a fronteira.', 480, 388);
    }

    drawLightSamurai(ctx, 480, 460, 2, {
      facing: 1, pose: 'victory', t: this.frames,
      amulet: this.equipped, wield: this.wielded, corrupt: this.corruption()
    });

    if (Math.sin(this.frames * 0.07) > -0.3) {
      ctx.fillStyle = 'rgba(200,215,240,0.8)';
      ctx.font = '13px "Segoe UI", sans-serif';
      ctx.fillText('ENTER — continuar vagando pela floresta', 480, 516);
    }
  },

  drawWipe() {
    const w = this.wipe;
    if (!w) return;
    const k = w.t < w.half ? w.t / w.half : 1 - (w.t - w.half) / w.half;
    const r = Math.max(0, (1 - k) * 720 + 6);
    ctx.save();
    ctx.fillStyle = '#02030a';
    ctx.beginPath();
    ctx.rect(0, 0, 960, 540);
    ctx.arc(480, 270, r, 0, Math.PI * 2, true);
    ctx.fill('evenodd');
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = 'rgba(255,220,140,0.85)';
    ctx.lineWidth = 5;
    ctx.shadowColor = 'rgba(255,220,140,0.9)';
    ctx.shadowBlur = 18;
    ctx.beginPath(); ctx.arc(480, 270, r, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();
  },

  updatePauseMenu() {
    // Tecla Escape ou P para despausar
    const isEscOrP = (Input.keys['Escape'] && Input.just['Escape']) || (Input.keys['KeyP'] && Input.just['KeyP']);
    if (isEscOrP) {
      Sfx.confirm();
      this.state = this.prevState;
      return;
    }

    const optionsCount = 3; // 0: Continuar, 1: Volume Jogo, 2: Volume Música

    if (Input.pressed('up')) {
      this.pauseIdx = (this.pauseIdx + optionsCount - 1) % optionsCount;
      Sfx.menuMove();
    }
    if (Input.pressed('downKey')) {
      this.pauseIdx = (this.pauseIdx + 1) % optionsCount;
      Sfx.menuMove();
    }

    if (this.pauseIdx === 0) { // Continuar
      if (Input.pressed('confirm')) {
        Sfx.confirm();
        this.state = this.prevState;
      }
    } else if (this.pauseIdx === 1) { // Volume SFX
      let change = 0;
      if (Input.pressed('left')) {
        change = -0.1;
      }
      if (Input.pressed('right')) {
        change = 0.1;
      }
      if (change !== 0) {
        Sfx.setSfxVolume(Sfx.sfxVolume + change);
        Sfx.menuMove();
      }
    } else if (this.pauseIdx === 2) { // Volume Música
      let change = 0;
      if (Input.pressed('left')) {
        change = -0.1;
      }
      if (Input.pressed('right')) {
        change = 0.1;
      }
      if (change !== 0) {
        Sfx.setMusicVolume(Sfx.musicVolume + change);
        Sfx.menuMove();
      }
    }
  },

  drawPauseMenu() {
    // 1. Overlay escuro de fundo
    ctx.fillStyle = 'rgba(2, 4, 10, 0.72)';
    ctx.fillRect(0, 0, 960, 540);

    // 2. Painel central
    const bx = 280, by = 120, bw = 400, bh = 300;
    ctx.fillStyle = 'rgba(10, 14, 26, 0.92)';
    ctx.fillRect(bx, by, bw, bh);
    ctx.strokeStyle = 'rgba(255, 214, 130, 0.42)';
    ctx.lineWidth = 2;
    ctx.strokeRect(bx, by, bw, bh);

    // 3. Título do menu
    ctx.fillStyle = '#ffe9b0';
    ctx.font = '700 24px "Yu Mincho", "Segoe UI", serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(255, 214, 130, 0.5)';
    ctx.shadowBlur = 10;
    ctx.fillText('JOGO PAUSADO', 480, by + 40);
    ctx.shadowBlur = 0;

    // Subtítulo descritivo
    ctx.fillStyle = '#7386a8';
    ctx.font = 'italic 12px "Segoe UI", sans-serif';
    ctx.fillText('use as setas para ajustar e ENTER para confirmar', 480, by + 70);

    // 4. Desenhar as opções do menu
    const options = [
      { label: 'Continuar', type: 'button' },
      { label: 'Som do Jogo (SFX)', type: 'slider', value: Sfx.sfxVolume },
      { label: 'Volume da Música', type: 'slider', value: Sfx.musicVolume }
    ];

    options.forEach((opt, idx) => {
      const oy = by + 120 + idx * 50;
      const isSelected = this.pauseIdx === idx;

      // Cor e estilização do texto
      ctx.fillStyle = isSelected ? '#ffffff' : '#8fa3c8';
      ctx.font = isSelected ? '700 16px "Segoe UI", sans-serif' : '15px "Segoe UI", sans-serif';
      ctx.textAlign = 'center';

      if (opt.type === 'button') {
        const text = isSelected ? '▶  ' + opt.label : opt.label;
        ctx.fillText(text, 480, oy);
      } else {
        // Rótulo alinhado à esquerda
        ctx.textAlign = 'left';
        ctx.fillText(opt.label, bx + 40, oy);

        // Valor percentual alinhado à direita
        const percent = Math.round(opt.value * 100);
        ctx.textAlign = 'right';
        ctx.fillText(percent + '%', bx + bw - 40, oy);

        // Barra de progresso
        const barX = bx + 40;
        const barY = oy + 8;
        const barW = bw - 80;
        const barH = 6;

        // Fundo da barra
        ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
        ctx.fillRect(barX, barY, barW, barH);

        // Preenchimento da barra
        ctx.fillStyle = isSelected ? '#ffe08a' : 'rgba(255, 214, 130, 0.6)';
        ctx.fillRect(barX, barY, barW * opt.value, barH);

        // Bordas
        ctx.strokeStyle = isSelected ? 'rgba(255, 214, 130, 0.8)' : 'rgba(255, 255, 255, 0.15)';
        ctx.lineWidth = 1;
        ctx.strokeRect(barX - 1, barY - 1, barW + 2, barH + 2);
      }
    });
  },

  // ── laço principal ──
  update() {
    Sfx.updateMix(this.state, World.current, this.player);

    if (Input.pressed('developer')) this.toggleDeveloperMode();

    if (this.state === 'paused') {
      this.updatePauseMenu();
      Input.endFrame();
      return;
    }

    const canPause = this.state === 'explore' || (this.state === 'battle' && !Battle.menu.sub);
    const isEscOrP = (Input.keys['Escape'] && Input.just['Escape']) || (Input.keys['KeyP'] && Input.just['KeyP']);
    if (canPause && isEscOrP) {
      Sfx.confirm();
      this.prevState = this.state;
      this.state = 'paused';
      this.pauseIdx = 0;
      Input.endFrame();
      return;
    }

    // Interpolação suave do zoom e offset da câmera
    this.cam.zoom = U.lerp(this.cam.zoom, this.cam.targetZoom || 1.0, 0.08);
    this.cam.offsetX = U.lerp(this.cam.offsetX, this.cam.targetOffsetX || 0.0, 0.08);
    this.cam.offsetY = U.lerp(this.cam.offsetY, this.cam.targetOffsetY || 0.0, 0.08);

    // Efeito Hit Freeze (Frame Stop) para peso de combate
    if (this.freezeFrames > 0) {
      this.freezeFrames--;
      Input.endFrame(); // consome inputs para não empilhar ações durante o freeze
      return;
    }

    if (window.PostProcessor && PostProcessor.updateImpulses) {
      PostProcessor.updateImpulses();
    }
    this.frames++;
    if (this.updateWipe()) { Input.endFrame(); return; }
    switch (this.state) {
      case 'title':
        if (Input.pressed('confirm')) {
          Sfx.confirm();
          Particles.clear();
          this.state = 'intro';
          this.introT = 0;
          Sfx.tone({ f: 392, dur: 1.2, type: 'sine', vol: 0.1 });
          Sfx.tone({ f: 587, dur: 1.4, type: 'sine', vol: 0.08, delay: 0.4 });
        }
        break;
      case 'intro':
        this.introT++;
        if (this.introT > 60 && Input.pressed('confirm')) {
          Sfx.confirm();
          this.startWipe(() => { Particles.clear(); this.state = 'explore'; });
        }
        break;
      case 'explore':
        this.exploreUpdate();
        break;
      case 'battle':
        this.runFrames++;
        Battle.update();
        Hud.update();
        break;
      case 'ending':
        if (Input.pressed('confirm')) {
          this.startWipe(() => { Particles.clear(); this.state = 'explore'; });
        }
        break;
    }
    Input.endFrame();
  },

  render() {
    // 1. Limpa e desenha a cena no canvas offscreen 2D (1:1 de 960x540)
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, VW, VH);
    
    ctx.save();
    
    // Na batalha, Battle.draw aplica o punch zoom somente à arena. Dessa forma,
    // os golpes mantêm peso sem ampliar e recortar a interface de combate.
    const isPaused = this.state === 'paused';
    const drawState = isPaused ? this.prevState : this.state;

    if (drawState !== 'battle' &&
        (this.cam.zoom !== 1 || this.cam.offsetX !== 0 || this.cam.offsetY !== 0)) {
      ctx.translate(480 + this.cam.offsetX, 270 + this.cam.offsetY);
      ctx.scale(this.cam.zoom, this.cam.zoom);
      ctx.translate(-480, -270);
    }
    
    ctx.beginPath();
    ctx.rect(0, 0, VW, VH);
    ctx.clip();
    
    switch (this.state) {
      case 'title': this.drawTitle(); break;
      case 'intro': this.drawIntro(); break;
      case 'explore': this.drawExplore(); break;
      case 'battle': Battle.draw(ctx, this.frames); break;
      case 'ending': this.drawEnding(); break;
      case 'paused':
        if (this.prevState === 'explore') {
          this.drawExplore();
        } else if (this.prevState === 'battle') {
          Battle.draw(ctx, this.frames);
        }
        this.drawPauseMenu();
        break;
    }
    this.drawWipe();
    ctx.restore();

    // 2. Apresentação final na tela
    if (useWebGL) {
      // Aplica o preset de pós-processamento adequado para o ambiente atual
      let activePreset = 'forest';
      const presetState = isPaused ? this.prevState : this.state;
      if (presetState === 'battle') {
        if (Battle.env === 'lava') activePreset = 'lava';
        else if (Battle.env === 'abyss') activePreset = 'abyss';
        else if (Battle.env === 'wind') activePreset = 'wind';
      } else {
        if (World.current === 'fogo') activePreset = 'lava';
        else if (World.current === 'vento') activePreset = 'wind';
        else if (this.player && (this.player.inWater || this.player.y > 1450)) activePreset = 'abyss';
      }
      VFXConfigs.applyPreset(activePreset);

      // Reaproveita os sinais visuais da ventania sem interferir em fisica ou colisao.
      if (activePreset === 'wind' && window.WindKingdom) {
        const direction = WindKingdom.cycleDir;
        const power = WindKingdom.windPower();
        PostProcessor.Config.WindAtmosphere.strength = 0.18 + power * 0.82;
        PostProcessor.Config.WindAtmosphere.direction = direction;
        PostProcessor.Config.WindMotion.strength = 0.00035 + power * 0.00115;
        PostProcessor.Config.WindMotion.direction = direction;
      }

      const gl = PostProcessor.gl;
      // Limpa o viewport principal (com fundo preto para o letterboxing)
      gl.clearColor(0.0, 0.0, 0.0, 1.0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      
      // Ajusta o viewport WebGL para manter a proporção com o letterbox/centramento
      gl.viewport(viewOffX, viewOffY, VW * viewScale, VH * viewScale);
      
      // Envia o canvas 2D para ser processado no pipeline de pós-processamento WebGL com proporções corrigidas
      PostProcessor.process(offscreenCanvas, this.frames, viewOffX, viewOffY, VW * viewScale, VH * viewScale);
    } else {
      // Fallback 2D convencional
      mainCtx.setTransform(1, 0, 0, 1, 0, 0);
      mainCtx.fillStyle = '#000';
      mainCtx.fillRect(0, 0, canvas.width, canvas.height);
      
      mainCtx.setTransform(viewScale, 0, 0, viewScale, viewOffX, viewOffY);
      mainCtx.drawImage(offscreenCanvas, 0, 0);
    }

    this.renderUi();
  },

  // A interface é composta depois do cenário e do pós-processamento. Isso
  // preserva a noite, o bloom e a distorção na cena sem borrar texto, barras
  // ou telegráficos de decisão.
  renderUi() {
    uiCtx.setTransform(1, 0, 0, 1, 0, 0);
    uiCtx.clearRect(0, 0, uiCanvas.width, uiCanvas.height);
    if (this.wipe) return;

    uiCtx.setTransform(viewScale, 0, 0, viewScale, viewOffX, viewOffY);
    if (this.state === 'explore') Hud.draw(uiCtx);
    else if (this.state === 'battle') Battle.drawUI(uiCtx, this.frames);
    if (this.state === 'explore' || this.state === 'battle' || this.state === 'paused') {
      this.drawDeveloperBadge(uiCtx);
    }
  }
};

// laço com passo fixo de 60 fps
let last = performance.now(), acc = 0;
function frame(now) {
  requestAnimationFrame(frame);
  acc += Math.min(now - last, 100);
  last = now;
  while (acc >= 1000 / 60) {
    Game.update();
    acc -= 1000 / 60;
  }
  Game.render();
}

Game.init();
requestAnimationFrame(frame);

// gancho de depuração
window.GAME = { Game, Battle, World, Enemies, get player() { return Game.player; } };
