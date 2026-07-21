'use strict';
// ─── O Rōnin de Luz ──────────────────────────────────────────────────

// (drawLightSamurai foi movido para js/Graphics/Sprites.js)

// Vocabulário único para os efeitos do protagonista. Ele funciona tanto no
// mapa quanto na arena: muda apenas a escala e as coordenadas, não a leitura.
const PlayerVFX = {
  palette(kind) {
    const styles = {
      light:   { core: 'rgba(255,247,214,0.98)', accent: 'rgba(255,207,104,0.94)', soft: 'rgba(255,229,166,0.56)' },
      purify:  { core: 'rgba(255,252,222,0.98)', accent: 'rgba(255,219,120,0.96)', soft: 'rgba(255,240,184,0.62)' },
      dark:    { core: 'rgba(239,222,255,0.96)', accent: 'rgba(166,104,255,0.94)', soft: 'rgba(180,122,255,0.56)' },
      water:   { core: 'rgba(224,250,255,0.98)', accent: 'rgba(100,204,255,0.94)', soft: 'rgba(130,220,255,0.56)' },
      fire:    { core: 'rgba(255,229,182,0.98)', accent: 'rgba(255,126,66,0.94)', soft: 'rgba(255,162,88,0.58)' },
      guard:   { core: 'rgba(255,244,202,0.92)', accent: 'rgba(206,255,168,0.88)', soft: 'rgba(255,222,148,0.48)' }
    };
    const alias = { agua: 'water', sui: 'water', fogo: 'fire', ka: 'fire' };
    return styles[alias[kind] || kind] || styles.light;
  },

  step(x, y, facing, inWater, kind) {
    const c = this.palette(kind);
    if (inWater) {
      Particles.spawn({
        x: x - facing * 7, y: y - 10, vx: -facing * 0.28, vy: -0.8,
        life: 22, size: 1.7, color: c.soft, type: 'orb'
      });
      return;
    }
    Particles.burst(x - facing * 5, y - 2, 2, i => ({
      x: x - facing * 5 + U.rand(-4, 4), y: y - U.rand(0, 3),
      vx: -facing * U.rand(0.25, 0.75) + U.rand(-0.35, 0.35), vy: -U.rand(0.35, 1.05),
      life: 16 + i * 3, size: i ? 1.3 : 1.9, color: i ? c.soft : c.accent,
      type: i ? 'orb' : 'spark', drag: 0.9
    }));
  },

  jump(x, y, facing, kind, wall) {
    const c = this.palette(kind);
    Particles.spawn({
      x, y: y - 2, life: wall ? 24 : 20, size: wall ? 7 : 5,
      color: c.soft, type: 'ring'
    });
    Particles.burst(x, y - 4, wall ? 5 : 3, () => ({
      x: x + U.rand(-8, 8), y: y - U.rand(0, 7),
      vx: (wall ? -facing : U.rand(-1, 1)) * U.rand(0.5, 1.5), vy: U.rand(-2.1, -0.65),
      life: 18, size: 1.7, color: c.accent, type: 'spark', drag: 0.9
    }));
  },

  wall(x, y, wallDir, kind) {
    const c = this.palette(kind);
    Particles.spawn({
      x: x + wallDir * 10, y, vx: -wallDir * 0.7, vy: 0.35,
      life: 14, size: 1.3, color: c.accent, type: 'spark', drag: 0.86
    });
  },

  dashStart(x, y, dx, dy, kind) {
    const c = this.palette(kind);
    Particles.spawn({ x, y, life: 26, size: 9, color: c.soft, type: 'ring' });
    Particles.spawn({ x, y, life: 22, size: 5, color: c.accent, type: 'glyph', spin: 0.12 });
    Particles.burst(x, y, 7, () => ({
      x: x + U.rand(-5, 5), y: y + U.rand(-8, 8),
      vx: -dx * U.rand(1.8, 3.4) + U.rand(-0.45, 0.45),
      vy: -dy * U.rand(1.8, 3.4) + U.rand(-0.45, 0.45),
      life: U.rand(13, 22), size: U.rand(1.6, 2.8), color: c.core,
      type: 'spark', drag: 0.9
    }));
  },

  dashTrail(x, y, dx, dy, phase, kind) {
    if (phase % 2) return;
    const c = this.palette(kind);
    Particles.spawn({
      x: x - dx * 8 + U.rand(-3, 3), y: y - 20 - dy * 5 + U.rand(-5, 5),
      vx: -dx * 1.6, vy: -dy * 1.1,
      life: 18, size: 3.5, color: c.soft, type: 'wisp', drag: 0.9
    });
    if (phase % 4 === 0) {
      Particles.spawn({
        x: x - dx * 10, y: y - 22, vx: -dx * 2.4, vy: -dy * 1.6,
        life: 12, size: 1.8, color: c.accent, type: 'spark', drag: 0.88
      });
    }
  },

  dashEnd(x, y, kind) {
    const c = this.palette(kind);
    Particles.spawn({ x, y: y - 18, life: 18, size: 6, color: c.soft, type: 'ring' });
  },

  slash(x, y, facing, scale, kind, crit) {
    const c = this.palette(kind);
    const angle = facing > 0 ? -0.5 : Math.PI + 0.5;
    const size = 28 * scale;
    Particles.spawn({
      x, y, life: crit ? 20 : 16, size, width: 3.2 * scale,
      angle, span: 1.22, ccw: facing < 0, color: c.core, type: 'slash'
    });
    Particles.spawn({
      x, y, life: crit ? 24 : 19, size: size * 1.14, width: 1.4 * scale,
      angle: angle - facing * 0.12, span: 1.05, ccw: facing < 0, color: c.accent, type: 'slash'
    });
    Particles.burst(x + facing * 16 * scale, y, crit ? 8 : 5, () => ({
      x: x + facing * U.rand(7, 22) * scale, y: y + U.rand(-12, 10) * scale,
      vx: facing * U.rand(1.8, 4.2) * scale, vy: U.rand(-2.6, 1.2) * scale,
      life: U.rand(12, 23), size: U.rand(1.4, 2.6) * scale, color: c.accent,
      type: 'spark', drag: 0.9
    }));
  },

  cast(x, y, tx, ty, kind, travel, form) {
    if (kind === 'water' || kind === 'agua' || kind === 'sui') {
      this.waterCast(x, y, tx, ty, travel, form);
      return;
    }
    if (kind === 'fire' || kind === 'fogo' || kind === 'ka') {
      this.fireCast(x, y, tx, ty, travel, form);
      return;
    }
    const c = this.palette(kind);
    const dur = travel || 26;
    const ox = x + 12, oy = y - 48;
    const vx = (tx - ox) / dur, vy = (ty - oy) / dur;
    Particles.spawn({ x: ox, y: oy, life: 30, size: 8, color: c.soft, type: 'ring' });
    Particles.spawn({ x: ox, y: oy, life: 28, size: 5, color: c.accent, type: 'glyph', spin: 0.1 });
    Particles.burst(ox, oy, 6, i => ({
      x: ox + U.rand(-5, 5), y: oy + U.rand(-8, 8),
      vx: vx + U.rand(-0.32, 0.32), vy: vy + U.rand(-0.32, 0.32),
      life: dur + 5 + i * 2, size: i % 2 ? 2.9 : 2.1, color: i % 2 ? c.soft : c.core,
      type: i % 2 ? 'wisp' : 'orb', drag: 0.99
    }));
  },

  waterCast(x, y, tx, ty, travel, form) {
    this.waterPrepare(x, y, tx, ty, form);
    this.waterRelease(x, y, tx, ty, travel, form);
  },

  waterPrepare(x, y, tx, ty, form) {
    VFX.recipes.water.prepare({ x, y, tx, ty, barrage: form === 'barrage' });
  },

  waterRelease(x, y, tx, ty, travel, form) {
    VFX.cast('water', {
      x, y, tx, ty, travel: travel || 12,
      barrage: form === 'barrage'
    });
  },

  fireCast(x, y, tx, ty, travel, form) {
    this.firePrepare(x, y, tx, ty, form);
    this.fireRelease(x, y, tx, ty, travel, form);
  },

  firePrepare(x, y, tx, ty, form) {
    VFX.emit('fire', 'prepare', { x, y, tx, ty, barrage: form === 'barrage' });
  },

  fireRelease(x, y, tx, ty, travel, form) {
    VFX.cast('fire', {
      x, y, tx, ty, travel: travel || 12,
      barrage: form === 'barrage'
    });
  },

  // Receita exclusiva da Rajada Sombria. Absorver continua usando a magia
  // genérica, evitando que as duas habilidades compartilhem a mesma leitura.
  darkPrepare(x, y, tx, ty) {
    VFX.emit('dark', 'prepare', { x, y, tx, ty });
  },

  darkRelease(x, y, tx, ty, travel, groundY) {
    VFX.cast('dark', { x, y, tx, ty, travel: travel || 11, groundY });
  },

  darkImpact(x, y, groundY, heavy) {
    VFX.impact('dark', { x, y, groundY, heavy: !!heavy, direction: 1 });
  },

  darkDissipate(x, y) {
    VFX.emit('dark', 'dissipate', { x, y });
  },

  impact(x, y, kind, heavy) {
    const c = this.palette(kind);
    if (kind === 'water' || kind === 'agua' || kind === 'sui') {
      VFX.impact('water', { x, y, heavy: !!heavy, angle: 0 });
      return;
    }
    if (kind === 'fire' || kind === 'fogo' || kind === 'ka') {
      VFX.impact('fire', { x, y, heavy: !!heavy, angle: 0 });
      return;
    }
    Particles.spawn({ x, y, life: heavy ? 30 : 22, size: heavy ? 12 : 8, color: c.soft, type: 'ring' });
    Particles.spawn({ x, y, life: 16, size: heavy ? 7 : 4.5, color: c.core, type: 'glyph', spin: 0.14 });
    Particles.burst(x, y, heavy ? 14 : 9, () => ({
      x: x + U.rand(-8, 8), y: y + U.rand(-10, 10),
      vx: U.rand(-4.1, 4.1), vy: U.rand(-4.2, 1.5),
      life: U.rand(14, 25), size: U.rand(1.6, 3.1), color: c.accent,
      type: 'spark', drag: 0.91
    }));
  },

  shield(x, y, kind, holy) {
    const c = this.palette(kind);
    const cy = y - 42;
    if (kind === 'light' && holy) {
      VFX.barrier('light', { x, y, heavy: true });
      return;
    }
    if (kind === 'water' || kind === 'agua' || kind === 'sui') {
      VFX.barrier('water', { x, y, heavy: !!holy });
      return;
    }
    if (kind === 'fire' || kind === 'fogo' || kind === 'ka') {
      VFX.barrier('fire', { x, y, heavy: !!holy });
      return;
    }
    Particles.spawn({ x, y: cy, life: holy ? 42 : 34, size: holy ? 15 : 11, color: c.soft, type: 'ring' });
    Particles.spawn({ x, y: cy, life: holy ? 48 : 38, size: holy ? 10 : 7, color: c.accent, type: 'glyph', spin: holy ? 0.11 : 0.07 });
    Particles.burst(x, cy, holy ? 12 : 7, () => ({
      x: x + U.rand(-20, 20), y: cy + U.rand(-24, 24),
      vx: U.rand(-0.75, 0.75), vy: U.rand(-1.8, -0.35),
      life: U.rand(26, 46), size: U.rand(1.6, 2.8), color: c.core,
      type: 'wisp'
    }));
  },

// ─── Classe do jogador (mapa) ────────────────────────────────────────
  block(x, y, kind, incoming) {
    const c = this.palette(kind);
    const dir = incoming === 'fire' || incoming === 'fogo' ? -1 : 1;
    Particles.spawn({ x: x + dir * 10, y: y - 42, life: 18, size: 7, color: c.core, type: 'ring' });
    Particles.burst(x + dir * 12, y - 42, 8, () => ({
      x: x + dir * 12 + U.rand(-6, 6), y: y - 42 + U.rand(-9, 9),
      vx: dir * U.rand(1.2, 3.4), vy: U.rand(-2.4, 1.4),
      life: U.rand(11, 19), size: U.rand(1.5, 2.5), color: c.accent,
      type: 'spark', drag: 0.9
    }));
  },

  heal(x, y) {
    const c = this.palette('purify');
    Particles.spawn({ x, y: y - 42, life: 28, size: 9, color: c.soft, type: 'ring' });
    Particles.burst(x, y - 22, 8, () => ({
      x: x + U.rand(-15, 15), y: y - U.rand(8, 38),
      vx: U.rand(-0.55, 0.55), vy: U.rand(-1.8, -0.55),
      life: U.rand(24, 38), size: U.rand(1.7, 2.8), color: c.core,
      type: 'wisp'
    }));
  },

  windExplosion(x, y, closeToGround) {
    Particles.spawn({ x, y: y - 4, life: 16, size: 9, color: 'rgba(162, 232, 201, 0.65)', type: 'ring' });
    const numLines = 10;
    for (let i = 0; i < numLines; i++) {
      const angle = Math.PI * 0.2 + (i / numLines) * Math.PI * 0.6;
      const speed = U.rand(3.2, 5.8);
      Particles.spawn({
        x: x + U.rand(-6, 6), y: y - 4,
        vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
        life: U.rand(12, 20), size: U.rand(1.6, 2.8),
        color: 'rgba(200, 248, 230, 0.85)', type: 'spark', drag: 0.92
      });
    }
    if (closeToGround) {
      for (let i = 0; i < 6; i++) {
        const dir = i % 2 === 0 ? -1 : 1;
        Particles.spawn({
          x: x + dir * 10, y: y - 2,
          vx: dir * U.rand(4.0, 6.2), vy: U.rand(-0.6, 0.1),
          life: U.rand(16, 28), size: U.rand(3.5, 6),
          color: 'rgba(162, 232, 201, 0.45)', type: 'mist', drag: 0.88
        });
      }
    }
  }
};

class Player {
  constructor(x, y) {
    this.x = x; this.y = y;
    this.w = 20; this.h = 34;
    this.vx = 0; this.vy = 0;
    this.facing = 1;
    this.onGround = false; this.onOneway = false;
    this.wallDir = 0; this.grabbing = false;
    this.coyote = 0; this.jumpBuf = 0; this.wallCoyote = 0;
    this.dashT = 0; this.dashCd = 0; this.canAirDash = true;
    this.canDoubleJump = true;
    this.dashDx = 1; this.dashDy = 0;
    this.attackT = 0; this.attackCd = 0;
    this.steerLock = 0; this.dropT = 0;
    this.invuln = 0; this.t = 0; this.runPhase = 0;
    this.inWater = false;

    // atributos de RPG
    this.level = 1; this.xp = 0;
    this.maxHp = 40; this.hp = 40;
    this.maxMp = 10; this.mp = 10;
    this.maxSta = 10; this.sta = 10;
    this.gliding = false; this.glideDrainT = 0; this.staRegenT = 0;
    this.meditating = false; this.meditationT = 0;
    this.healHoldTimer = 0; this.lastHp = this.hp;
  }

  // dano físico: base + nível + bênçãos da luz (1/3 purificações) + fome da escuridão (2 a cada 2 absorções)
  get atk() {
    return 5 + Math.floor((this.level - 1) / 2)
      + Math.floor(Game.purified / 3)
      + Math.floor(Game.absorbed / 2) * 2;
  }
  xpNext() { return 18 + (this.level - 1) * 14; }
  vfxKind() { return Game.wielded === 'dark' ? 'dark' : (Game.equipped || 'light'); }

  get rect() { return { x: this.x - this.w / 2, y: this.y - this.h, w: this.w, h: this.h }; }

  attackHitbox() {
    if (this.attackT < 3 || this.attackT > 10) return null;
    const cx = this.x + this.facing * 26;
    return { x: cx - 24, y: this.y - 44, w: 48, h: 46 };
  }

  levelUp() {
    this.level++;
    this.maxHp += 6; this.maxMp += 2; this.maxSta += 1;
    this.hp = Math.min(this.maxHp, Math.round((this.hp + this.maxHp * 0.15) * 10) / 10);
    this.mp = Math.min(this.maxMp, Math.round((this.mp + this.maxMp * 0.15) * 10) / 10);
    this.sta = this.maxSta;
  }

  setMeditating(active) {
    this.meditating = !!active;
    this.meditationT = 0;
    this.healHoldTimer = 0;
    this.lastHp = this.hp;
    if (!this.meditating) return;

    this.vx = 0; this.vy = 0;
    this.dashT = 0; this.attackT = 0; this.jumpBuf = 0;
    this.grabbing = false; this.gliding = false;
  }

  updateMeditation() {
    this.meditationT++;
    this.vx = 0; this.vy = 0;
    this.dashT = 0; this.attackT = 0; this.jumpBuf = 0;
    this.grabbing = false; this.gliding = false;
    this.healHoldTimer = 0;

    this.sta = Math.min(this.maxSta, Math.round((this.sta + 0.10) * 100) / 100);

    // O torii carrega por 3 segundos (180 quadros) e restaura 100% de PV e PM.
    if (this.meditationT < 180) {
      if (this.meditationT % 8 === 0) {
        for (let i = 0; i < 2; i++) {
          Particles.spawn({
            x: this.x + U.rand(-18, 18), y: this.y - U.rand(2, 22),
            vx: U.rand(-0.4, 0.4), vy: U.rand(-1.5, -0.7),
            life: U.rand(24, 38), size: U.rand(1.7, 2.9),
            color: i ? 'rgba(171,235,190,0.85)' : 'rgba(255,226,150,0.92)',
            type: 'wisp', drag: 0.95
          });
        }
      }
    } else if (this.meditationT === 180) {
      this.hp = this.maxHp;
      this.mp = this.maxMp;
      this.sta = this.maxSta;
      PlayerVFX.heal(this.x, this.y);
      Sfx.tone({ f: 523, f2: 784, dur: 0.35, type: 'sine', vol: 0.1 });
      if (typeof Hud !== 'undefined' && Hud.toast) {
        Hud.toast('✦ Torii: Vida e Mana plenamente restauradas!', '#9fffe0');
      }
    } else {
      this.hp = this.maxHp;
      this.mp = this.maxMp;
      this.sta = this.maxSta;
      if (this.meditationT % 30 === 0) {
        Particles.spawn({
          x: this.x + U.rand(-10, 10), y: this.y - U.rand(4, 16),
          vx: U.rand(-0.2, 0.2), vy: U.rand(-1.2, -0.6),
          life: 30, size: 2,
          color: 'rgba(255,240,190,0.7)', type: 'wisp'
        });
      }
    }
  }

  updateHealSkill() {
    const canChannel = Game.state === 'explore'
      && Input.is('healSkill')
      && this.onGround && !this.inWater
      && this.dashT <= 0 && this.attackT <= 0
      && !this.meditating;
    if (!canChannel) {
      this.healHoldTimer = 0;
      return;
    }

    if (++this.healHoldTimer < 20) return;
    this.healHoldTimer = 0;
    if (this.mp < 2 || (this.hp >= this.maxHp && this.sta >= this.maxSta)) return;

    this.mp = Math.max(0, this.mp - 2);
    this.hp = Math.min(this.maxHp, this.hp + 2);
    this.sta = Math.min(this.maxSta, this.sta + 2);
    PlayerVFX.heal(this.x, this.y);
    Sfx.tone({ f: 523, f2: 659, dur: 0.15, type: 'sine', vol: 0.05 });
  }

  update() {
    this.t++;
    this.gliding = false;
    if (this.attackT > 0) this.attackT--;
    if (this.attackCd > 0) this.attackCd--;
    if (this.dashCd > 0) this.dashCd--;
    if (this.invuln > 0) this.invuln--;
    if (this.coyote > 0) this.coyote--;
    if (this.wallCoyote > 0) this.wallCoyote--;
    if (this.jumpBuf > 0) this.jumpBuf--;
    if (this.dropT > 0) this.dropT--;
    if (this.steerLock > 0) this.steerLock--;

    const tookDamage = this.hp < this.lastHp - 0.001;
    const meditationMove = Input.is('left') || Input.is('right')
      || Input.is('downKey') || Input.is('jump') || Input.is('dash');
    if (this.meditating && (tookDamage || meditationMove)) this.setMeditating(false);

    if (Input.pressed('jump')) this.jumpBuf = 7;

    if (this.meditating) {
      this.updateMeditation();
      this.lastHp = this.hp;
      return;
    }

    // dentro d'água?
    const wasInWater = this.inWater;
    let waterRect = null;
    for (const w of World.waters) {
      if (this.x > w.x && this.x < w.x + w.w && this.y - 16 > w.y && this.y - 16 < w.y + w.h) waterRect = w;
    }
    this.inWater = !!waterRect;
    if (this.inWater !== wasInWater && Math.abs(this.vy) > 2.5) {
      Sfx.splash();
      const wy = waterRect ? waterRect.y : (World.waters[0] ? World.waters[0].y : this.y);
      Particles.burst(this.x, wy, 12, () => ({
        x: this.x + U.rand(-12, 12), y: wy + U.rand(-3, 3),
        vx: U.rand(-2, 2), vy: U.rand(-3.5, -1), grav: 0.22,
        life: 32, size: 2.4, color: 'rgba(170,225,255,0.85)', type: 'drop'
      }));
    }

    const L = Input.is('left'), R = Input.is('right');
    let move = (R ? 1 : 0) - (L ? 1 : 0);
    if (this.steerLock > 0) move = 0;

    if (Game.developerMode) {
      // Free flight still uses the regular collision pass below.
      const vertical = (Input.is('downKey') ? 1 : 0) -
        ((Input.is('up') || Input.is('jump')) ? 1 : 0);
      const boosting = Input.keys.ShiftLeft || Input.keys.ShiftRight;
      const speed = boosting ? 8.5 : 5.2;
      this.grabbing = false;
      this.gliding = false;
      this.dashT = 0;
      this.jumpBuf = 0;
      this.canAirDash = true;
      this.canDoubleJump = true;
      this.vx = U.lerp(this.vx, move * speed, move ? 0.32 : 0.22);
      this.vy = U.lerp(this.vy, vertical * speed, vertical ? 0.32 : 0.22);
      if (move !== 0) this.facing = move;

      if (Input.pressed('attack') && this.attackCd <= 0) {
        this.attackT = 12; this.attackCd = 22;
        Sfx.slash();
        PlayerVFX.slash(this.x + this.facing * 12, this.y - 24, this.facing, 0.62, this.vfxKind());
      }
    } else if (this.dashT > 0) {
      // ── dash ──
      this.dashT--;
      const isWind = Game.equipped === 'wind';
      const speed = isWind ? 13.0 : 11.5;
      this.vx = this.dashDx * speed;
      this.vy = this.dashDy * speed;
      PlayerVFX.dashTrail(this.x, this.y, this.dashDx, this.dashDy, this.dashT, this.vfxKind());
      if (this.dashT === 0) {
        this.vx *= 0.45; this.vy = Math.min(this.vy, 3);
        PlayerVFX.dashEnd(this.x, this.y, this.vfxKind());
      }
    } else if (this.inWater) {
      // ── nado ──
      this.grabbing = false;
      this.canAirDash = true;
      const isSui = Game.equipped === 'sui';
      const swimMult = isSui ? 1.5 : 1.0;
      if (move !== 0) { this.vx += move * 0.32 * swimMult; this.facing = move; }
      if (Input.is('up')) this.vy -= 0.34 * swimMult;
      if (Input.is('downKey')) this.vy += 0.26 * swimMult;
      this.vy += 0.10; // a luz afunda devagar
      this.vx *= 0.93; this.vy *= 0.93;
      this.vx = U.clamp(this.vx, -3.2 * swimMult, 3.2 * swimMult);
      this.vy = U.clamp(this.vy, -3.6 * swimMult, 3.6 * swimMult);
      // braçada / salto para fora perto da superfície
      if (this.jumpBuf > 0) {
        this.jumpBuf = 0;
        if (this.y - waterRect.y < 46) { this.vy = -10; Sfx.jump(); }
        else this.vy = -3.8;
      }
      // bolhas
      if (this.t % 12 === 0) {
        Particles.spawn({
          x: this.x + U.rand(-6, 6), y: this.y - 26,
          vy: U.rand(-1.2, -0.6), life: 40, size: 1.8,
          color: 'rgba(200,240,255,0.7)', type: 'orb'
        });
      }
      // ataque debaixo d'água
      if (Input.pressed('attack') && this.attackCd <= 0) {
        this.attackT = 12; this.attackCd = 22;
        Sfx.slash();
        PlayerVFX.slash(this.x + this.facing * 12, this.y - 24, this.facing, 0.62, this.vfxKind());
      }
      // dash aquático
      if (Input.pressed('dash') && this.dashCd <= 0) {
        let dx = move, dy = (Input.is('up') ? -1 : 0) + (Input.is('downKey') ? 1 : 0);
        if (!dx && !dy) dx = this.facing;
        const n = Math.hypot(dx, dy) || 1;
        this.dashDx = dx / n; this.dashDy = dy / n;
        if (dx !== 0) this.facing = dx > 0 ? 1 : -1;
        const isWind = Game.equipped === 'wind';
        this.dashT = isWind ? 12 : 9;
        this.dashCd = isWind ? 32 : 28;
        this.vy = 0;
        Sfx.dash();
        PlayerVFX.dashStart(this.x, this.y - 20, this.dashDx, this.dashDy, this.vfxKind());
      }
    } else {
      // ── movimento normal ──
      if (move !== 0) {
        this.vx += move * (this.onGround ? 0.55 : 0.4);
        this.facing = move;
      } else {
        this.vx *= this.onGround ? 0.74 : 0.93;
        if (Math.abs(this.vx) < 0.08) this.vx = 0;
      }
      if (Math.abs(this.vx) > 4.3) this.vx *= 0.92;

      this.vy = Math.min(this.vy + 0.55, 12);

      // Asas da Fenix: depois do salto, segurar pulo reduz a queda e preserva
      // o impulso horizontal. O vigor se recupera apenas em terreno seguro.
      this.grabbing = false;
      const wantsWall = this.wallDir !== 0 &&
        ((this.wallDir === 1 && R) || (this.wallDir === -1 && L));
      const canGlide = window.WindKingdom && WindKingdom.canPlayerGlide(this);
      this.gliding = !!(canGlide && !this.onGround && !wantsWall && Input.is('jump') && this.vy > -2.4);
      if (this.gliding) {
        this.staRegenT = 0;
        this.vy = Math.min(this.vy, 1.18) - 0.24;
        this.vx *= 0.996;
        if (++this.glideDrainT >= 20) {
          this.sta = Math.max(0, this.sta - 1);
          this.glideDrainT = 0;
        }
        if (this.t % 8 === 0) WindKingdom.spawnPhoenixTrail(this);
      } else {
        this.glideDrainT = 0;
      }

      // agarrar parede
      if (!this.onGround && this.wallDir !== 0 &&
          wantsWall) {
        this.grabbing = true;
        this.canAirDash = true;
        this.canDoubleJump = true;
        this.wallCoyote = 7;
        if (Input.is('up')) this.vy = -2.4;
        else if (Input.is('downKey')) this.vy = 3;
        else this.vy = Math.min(this.vy, 0.7);
        if (this.t % 5 === 0) {
          PlayerVFX.wall(this.x, this.y - U.rand(4, 28), this.wallDir, this.vfxKind());
        }
      }

      // descer de plataforma atravessável
      if (this.onOneway && Input.is('downKey') && this.jumpBuf > 0) {
        this.dropT = 10; this.jumpBuf = 0; this.y += 2;
      }

      // pulos
      if (this.jumpBuf > 0) {
        if (this.onGround || this.coyote > 0) {
          this.vy = -11.5; this.jumpBuf = 0; this.coyote = 0;
          Sfx.jump();
          this.dust(4);
          PlayerVFX.jump(this.x, this.y, this.facing, this.vfxKind(), false);
        } else if (this.grabbing || this.wallCoyote > 0) {
          const wd = this.wallDir !== 0 ? this.wallDir : -this.facing;
          this.vy = -10.8; this.vx = -wd * 7.4;
          this.steerLock = 9; this.facing = -wd;
          this.jumpBuf = 0; this.wallCoyote = 0;
          Sfx.wallJump();
          this.dust(4);
          PlayerVFX.jump(this.x, this.y, this.facing, this.vfxKind(), true);
        } else if (Game.equipped === 'wind' && this.canDoubleJump) {
          this.vy = -10.5;
          this.jumpBuf = 0;
          this.canDoubleJump = false;
          Sfx.doubleJump();
          const closeToGround = (this.y >= World.height - 80) || 
            (World.solidList().some(s => this.x > s.x && this.x < s.x + s.w && this.y + 60 >= s.y && this.y <= s.y));
          PlayerVFX.windExplosion(this.x, this.y, closeToGround);
        }
      }
      // pulo variável
      if (!Input.is('jump') && this.vy < -4.5) this.vy = -4.5;

      // iniciar dash
      if (Input.pressed('dash') && this.dashCd <= 0 && this.canAirDash) {
        let dx = move, dy = (Input.is('up') ? -1 : 0) + (Input.is('downKey') ? 1 : 0);
        if (!dx && !dy) dx = this.facing;
        const n = Math.hypot(dx, dy) || 1;
        this.dashDx = dx / n; this.dashDy = dy / n;
        if (dx !== 0) this.facing = dx > 0 ? 1 : -1;
        const isWind = Game.equipped === 'wind';
        this.dashT = isWind ? 12 : 9;
        this.dashCd = isWind ? 32 : 28;
        if (!this.onGround) this.canAirDash = false;
        this.vy = 0;
        Sfx.dash();
        Game.cam.shake = Math.max(Game.cam.shake, 3);
        PlayerVFX.dashStart(this.x, this.y - 20, this.dashDx, this.dashDy, this.vfxKind());
      }

      // ataque
      if (Input.pressed('attack') && this.attackCd <= 0) {
        this.attackT = 12; this.attackCd = 22;
        Sfx.slash();
        PlayerVFX.slash(this.x + this.facing * 12, this.y - 24, this.facing, 0.62, this.vfxKind());
      }
    }

    // ── integração + colisão ──
    const solids = World.solidList();
    this.wallDir = 0;

    this.x += this.vx;
    let r = this.rect;
    for (const s of solids) {
      if (U.aabb(r, s)) {
        if (this.vx > 0) { this.x = s.x - this.w / 2; this.wallDir = 1; }
        else if (this.vx < 0) { this.x = s.x + s.w + this.w / 2; this.wallDir = -1; }
        this.vx = 0;
        r = this.rect;
      }
    }

    const prevBottom = this.y - this.vy;
    this.y += this.vy;
    const wasAir = !this.onGround;
    this.onGround = false; this.onOneway = false;
    r = this.rect;
    for (const s of solids) {
      if (U.aabb(r, s)) {
        if (this.vy > 0) { this.y = s.y; this.onGround = true; }
        else if (this.vy < 0) { this.y = s.y + s.h + this.h; }
        this.vy = 0;
        r = this.rect;
      }
    }
    if (this.vy >= 0 && this.dropT <= 0) {
      const oneways = World.onewayList ? World.onewayList() : World.oneways;
      for (const o of oneways) {
        if (r.x < o.x + o.w && r.x + r.w > o.x &&
            prevBottom <= o.y + 1 && this.y >= o.y && this.y <= o.y + o.h + 10) {
          this.y = o.y; this.vy = 0;
          this.onGround = true; this.onOneway = true;
          r = this.rect;
        }
      }
    }
    if (this.onGround) {
      this.coyote = 7;
      this.canAirDash = true;
      this.canDoubleJump = true;
      if (!this.gliding && this.sta < this.maxSta && ++this.staRegenT >= 12) {
        this.sta = Math.min(this.maxSta, this.sta + 1);
        this.staRegenT = 0;
      }
      if (wasAir) {
        this.dust(5);
        PlayerVFX.jump(this.x, this.y, this.facing, this.vfxKind(), false);
      }
    } else if (!this.gliding) {
      this.staRegenT = 0;
    }

    this.updateHealSkill();

    if (Math.abs(this.vx) > 0.4 && this.onGround) {
      this.runPhase += Math.abs(this.vx) * 0.09;
      if (this.t % 9 === 0) PlayerVFX.step(this.x, this.y, this.facing, false, this.vfxKind());
    } else if (this.inWater && Math.hypot(this.vx, this.vy) > 0.7 && this.t % 10 === 0) {
      PlayerVFX.step(this.x, this.y, this.facing, true, this.vfxKind());
    }

    // a escuridão exala do corpo corrompido
    const cor = Game.corruption();
    if (cor > 0.1 && Math.random() < cor * 0.09) {
      Particles.spawn({
        x: this.x + U.rand(-8, 8), y: this.y - U.rand(10, 34),
        vx: U.rand(-0.4, 0.4), vy: U.rand(-1.1, -0.4),
        life: 40, size: 2.4,
        color: 'rgba(140,85,235,0.75)', type: 'wisp'
      });
    }
    this.lastHp = this.hp;
  }

  dust(n) {
    Particles.burst(this.x, this.y, n, () => ({
      x: this.x + U.rand(-8, 8), y: this.y - 2,
      vx: U.rand(-1, 1), vy: U.rand(-1.4, -0.2),
      life: 20, size: 2, color: 'rgba(255,224,160,0.7)', type: 'orb'
    }));
  }

  pose() {
    if (this.meditating) return 'kneel';
    if (this.dashT > 0) return 'dash';
    if (this.attackT > 0) return 'slash';
    if (this.inWater) return 'swim';
    if (this.grabbing) return 'wall';
    if (!this.onGround) return this.vy < 0 ? 'jump' : 'fall';
    if (Math.abs(this.vx) > 0.4) return 'run';
    return 'idle';
  }

  draw(ctx, cam) {
    if (this.invuln > 0 && (this.t % 8 < 3)) return;
    if (this.gliding && window.WindKingdom && WindKingdom.drawPhoenixWings) {
      WindKingdom.drawPhoenixWings(ctx, this.x - cam.x, this.y - cam.y, 1.05, this.facing, this.t);
    }
    drawLightSamurai(ctx, this.x - cam.x, this.y - cam.y, 1.05, {
      facing: this.facing,
      pose: this.pose(),
      t: this.t,
      runPhase: this.runPhase,
      slashT: this.attackT > 0 ? 1 - this.attackT / 12 : 0,
      amulet: Game.equipped,
      wield: Game.wielded,
      corrupt: Game.corruption(),
      weak: Game.essenceLost
    });
  }
}
