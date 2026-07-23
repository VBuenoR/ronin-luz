'use strict';
// ─── Espíritos d'água ────────────────────────────────────────────────
// soco: golpe comum · mare: golpe pesado elemental — defenda ou sofra
// fly: voadores desferem rajadas de golpes consecutivos (hits × soco)
const TIERS = {
  1:  { name: 'Ashigaru das Águas',            short: 'o Ashigaru', hp: 32,  soco: 7,  mare: 15, xp: 9,  kanji: '水', element: 'agua' },
  2:  { name: 'Lanceiro da Correnteza',        short: 'o Lanceiro', hp: 44,  soco: 9,  mare: 19, xp: 14, kanji: '流', element: 'agua' },
  3:  { name: 'Guardião do Lago',              short: 'o Guardião', hp: 58,  soco: 10, mare: 22, xp: 20, kanji: '湖', element: 'agua' },
  4:  { name: 'Abissal das Profundezas',       short: 'o Abissal',  hp: 63,  soco: 11, mare: 24, xp: 26, kanji: '淵', element: 'agua' },
  9:  { name: 'Suijin, o Shōgun Afogado',      short: 'o Shōgun',   hp: 180, soco: 10, mare: 20, xp: 68, kanji: '王', element: 'agua', boss: true },
  5:  { name: 'Vespa de Magma',                short: 'a Vespa',    hp: 55,  soco: 5,  mare: 26, xp: 30, kanji: '蜂', element: 'fogo', fly: true, hits: 3 },
  7:  { name: 'Yūrei da Névoa',                short: 'o Yūrei',    hp: 52,  soco: 9,  mare: 16, xp: 32, kanji: '霧', element: 'agua', fly: true, mist: true },
  6:  { name: 'Oni de Obsidiana',              short: 'o Oni',      hp: 75,  soco: 12, mare: 28, xp: 36, kanji: '鬼', element: 'fogo' },
  10: { name: 'Kagutsuchi, o Shōgun das Cinzas', short: 'o Shōgun das Cinzas', hp: 200, soco: 14, mare: 25, xp: 98, kanji: '炎', element: 'fogo', boss: true }
};

// (drawWaterSamurai e drawFireSamurai foram unificados e movidos para js/Graphics/Sprites.js)

// Gramática de VFX compartilhada por todas as famílias inimigas. As mesmas
// cores aparecem no mapa e na arena, para o jogador reconhecer a ameaça antes
// do combate começar.
const EnemyVFX = {
  style(enemy) {
    const fire = enemy.element === 'fogo';
    const ancestral = enemy.lightKind === 'blueFire' || enemy.archetype === 'ashSkeleton' || enemy.archetype === 'ancientGolem';
    const wind = enemy.element === 'vento';
    const storm = wind && (!!enemy.storm || enemy.tier === 12 || !!enemy.stormPhase);
    const mist = !!enemy.mist || enemy.tier === 7;
    const abyss = enemy.tier === 4;
    return {
      fire, ancestral, wind, storm, mist, abyss,
      core: ancestral ? 'rgba(220,250,255,0.98)'
        : fire ? 'rgba(255,226,170,0.96)'
        : storm ? 'rgba(220,248,255,0.98)'
        : wind ? 'rgba(240,248,245,0.96)'
        : mist ? 'rgba(232,228,255,0.9)'
        : abyss ? 'rgba(155,190,255,0.9)' : 'rgba(205,246,255,0.94)',
      accent: ancestral ? 'rgba(55,182,255,0.96)'
        : fire ? 'rgba(255,128,62,0.94)'
        : storm ? 'rgba(105,185,245,0.94)'
        : wind ? 'rgba(150,200,190,0.92)'
        : mist ? 'rgba(190,168,255,0.82)'
        : abyss ? 'rgba(82,116,224,0.9)' : 'rgba(88,194,255,0.92)',
      soft: ancestral ? 'rgba(35,112,255,0.48)'
        : fire ? 'rgba(255,150,76,0.5)'
        : storm ? 'rgba(72,116,176,0.48)'
        : wind ? 'rgba(200,225,215,0.45)'
        : mist ? 'rgba(215,230,255,0.32)'
        : abyss ? 'rgba(98,132,235,0.38)' : 'rgba(132,218,255,0.48)'
    };
  },

  fieldAmbient(enemy) {
    const s = this.style(enemy);
    const top = enemy.y - enemy.h + (enemy.fly ? 14 : 20);
    if (enemy.isBoss) {
      if (enemy.t % 12 === 0) {
        Particles.spawn({ x: enemy.x, y: enemy.y - enemy.h * 0.56, life: 44, size: 14, color: s.soft, type: 'ring' });
      }
      if (enemy.t % 18 === 0) {
        Particles.spawn({ x: enemy.x + U.rand(-30, 30), y: enemy.y - enemy.h * 0.54 + U.rand(-20, 18),
          vx: U.rand(-0.45, 0.45), vy: U.rand(-1.05, -0.35), life: 42, size: 2.6, color: s.core, type: 'wisp' });
      }
      return;
    }
    if (s.mist) {
      if (enemy.t % 8 === 0) {
        Particles.spawn({ x: enemy.x + U.rand(-15, 15), y: top + U.rand(-9, 20),
          vx: U.rand(-0.28, 0.28), vy: U.rand(-0.22, 0.22), life: 42, size: U.rand(4, 7),
          color: s.soft, type: 'wisp', drag: 0.98 });
      }
      return;
    }
    if (s.wind) {
      const windTick = Math.floor(enemy.t);
      if (windTick % (s.storm ? 5 : 8) === 0) {
        Particles.spawn({ x: enemy.x + U.rand(-14, 14), y: top + U.rand(-6, 22),
          vx: U.rand(-1.7, -0.55), vy: U.rand(-0.35, 0.35), life: 28, size: U.rand(1.4, 2.4),
          color: windTick % 2 ? s.core : s.accent, type: s.storm ? 'spark' : 'wisp', drag: 0.97 });
      }
      return;
    }
    if (enemy.fly) {
      if (enemy.t % 5 === 0) {
        Particles.spawn({ x: enemy.x + U.rand(-6, 6), y: top + 8,
          vx: U.rand(-0.36, 0.36), vy: U.rand(0.18, 0.82), life: 26, size: 1.9,
          color: s.accent, type: 'wisp' });
      }
      return;
    }
    if (enemy.swim || s.abyss) {
      if (enemy.t % 16 === 0) {
        Particles.spawn({ x: enemy.x + U.rand(-10, 10), y: top + U.rand(8, 24),
          vx: U.rand(-0.18, 0.18), vy: U.rand(-1.0, -0.45), life: 38, size: U.rand(1.5, 2.5),
          color: s.core, type: 'orb' });
      }
      return;
    }
    if (enemy.t % (s.fire ? 8 : 13) === 0) {
      Particles.spawn({
        x: enemy.x + U.rand(-8, 8), y: enemy.y - U.rand(4, 25),
        vx: U.rand(-0.45, 0.45), vy: s.fire ? U.rand(-1.25, -0.45) : U.rand(-1.45, -0.55),
        grav: s.fire ? 0 : 0.12, life: s.fire ? 30 : 26, size: 1.9,
        color: s.accent, type: s.fire ? 'wisp' : 'drop'
      });
    }
  },

  alert(enemy) {
    const s = this.style(enemy);
    const y = enemy.y - enemy.h - 10;
    Particles.spawn({ x: enemy.x, y, life: 22, size: 7, color: s.soft, type: 'ring' });
    Particles.spawn({ x: enemy.x, y, life: 22, size: 4, color: s.core, type: 'glyph', spin: 0.1 });
  },

  revive(enemy) {
    const s = this.style(enemy);
    Particles.spawn({ x: enemy.x, y: enemy.y - enemy.h * 0.55, life: 36, size: 10, color: s.soft, type: 'ring' });
    Particles.spawn({ x: enemy.x, y: enemy.y - enemy.h * 0.55, life: 32, size: 6, color: s.core, type: 'glyph', spin: 0.08 });
  },

  battleAmbient(enemy, x, y, time) {
    const s = this.style(enemy);
    if (enemy.isBoss && time % 18 === 0) {
      Particles.spawn({ x, y: y - 56, life: 40, size: 12, color: s.soft, type: 'ring' });
    }
    if (s.mist && time % 9 === 0) {
      Particles.spawn({ x: x + U.rand(-24, 24), y: y - 42 + U.rand(-24, 20),
        vx: U.rand(-0.3, 0.3), vy: U.rand(-0.15, 0.15), life: 42, size: U.rand(5, 9),
        color: s.soft, type: 'wisp', drag: 0.98 });
    } else if (s.wind && time % (s.storm ? 5 : 8) === 0) {
      Particles.spawn({ x: x + U.rand(-22, 22), y: y - 54 + U.rand(-20, 22),
        vx: U.rand(-1.8, -0.5), vy: U.rand(-0.35, 0.35), life: 28,
        size: U.rand(1.5, 2.6), color: time % 2 ? s.core : s.accent,
        type: s.storm ? 'spark' : 'wisp', drag: 0.97 });
    } else if (enemy.fly && time % 7 === 0) {
      Particles.spawn({ x: x + U.rand(-16, 16), y: y - 56 + U.rand(-8, 18),
        vx: U.rand(-0.35, 0.35), vy: U.rand(0.15, 0.7), life: 26, size: 1.9,
        color: s.accent, type: 'wisp' });
    } else if (s.abyss && time % 16 === 0) {
      Particles.spawn({ x: x + U.rand(-14, 14), y: y - 44 + U.rand(-10, 16),
        vy: U.rand(-0.9, -0.35), life: 36, size: 2.2, color: s.core, type: 'orb' });
    } else if (!enemy.isBoss && time % (s.fire ? 14 : 20) === 0) {
      Particles.spawn({ x: x + U.rand(-12, 12), y: y - U.rand(28, 54),
        vx: U.rand(-0.32, 0.32), vy: s.fire ? U.rand(-1.1, -0.4) : U.rand(-0.8, -0.35),
        life: 28, size: 1.8, color: s.accent, type: s.fire ? 'wisp' : 'orb' });
    }
  },

  attack(enemy, x, y, tx, ty, travel, heavy) {
    const s = this.style(enemy);
    const ox = x - 14, oy = y - 48;
    const dur = travel || 18;
    const vx = (tx - ox) / dur, vy = (ty - oy) / dur;
    Particles.spawn({ x: ox, y: oy, vx, vy, life: dur + 5, size: heavy ? 4.6 : 3.2, color: s.core, type: 'orb', drag: 0.99 });
    Particles.burst(ox, oy, heavy ? 7 : 4, () => ({
      x: ox + U.rand(-7, 7), y: oy + U.rand(-7, 7),
      vx: vx + U.rand(-0.45, 0.45), vy: vy + U.rand(-0.45, 0.45),
      life: dur + U.rand(2, 8), size: U.rand(1.4, 2.6), color: s.accent, type: 'spark', drag: 0.97
    }));
  },

  cast(enemy, x, y, tx, ty, travel, heavy) {
    const s = this.style(enemy);
    const ox = x, oy = y - 54;
    const dur = travel || 30;
    const vx = (tx - ox) / dur, vy = (ty - oy) / dur;
    Particles.spawn({ x: ox, y: oy, life: 30, size: heavy ? 12 : 8, color: s.soft, type: 'ring' });
    Particles.spawn({ x: ox, y: oy, life: 30, size: heavy ? 7 : 5, color: s.core, type: 'glyph', spin: 0.09 });
    Particles.burst(ox, oy, heavy ? 10 : 6, i => ({
      x: ox + U.rand(-8, 8), y: oy + U.rand(-10, 10),
      vx: vx + U.rand(-0.4, 0.4), vy: vy + U.rand(-0.4, 0.4),
      life: dur + 5 + i * 2, size: i % 2 ? 3.2 : 2.2, color: i % 2 ? s.soft : s.core,
      type: i % 2 ? 'wisp' : 'orb', drag: 0.99
    }));
  },

  guard(enemy, x, y) {
    const s = this.style(enemy);
    Particles.spawn({ x, y: y - 46, life: 36, size: 12, color: s.soft, type: 'ring' });
    Particles.spawn({ x, y: y - 46, life: 36, size: 7, color: s.accent, type: 'glyph', spin: 0.07 });
  },

  charge(enemy, x, y) {
    const s = this.style(enemy);
    Particles.spawn({ x, y: y - 52, life: 54, size: 16, color: s.soft, type: 'ring' });
    Particles.burst(x, y - 48, 12, () => ({
      x: x + U.rand(-24, 24), y: y - 48 + U.rand(-28, 18),
      vx: U.rand(-0.9, 0.9), vy: U.rand(-1.6, -0.3), life: U.rand(28, 50),
      size: U.rand(1.8, 3.2), color: s.core, type: 'wisp'
    }));
  },

  fatigue(enemy, x, y) {
    const s = this.style(enemy);
    Particles.burst(x, y - 42, 7, () => ({
      x: x + U.rand(-18, 18), y: y - 42 + U.rand(-18, 18),
      vx: U.rand(-0.45, 0.45), vy: U.rand(0.15, 0.75), life: U.rand(24, 38),
      size: U.rand(2.2, 4), color: s.soft, type: 'wisp', drag: 0.96
    }));
  },

  hit(enemy, x, y, heavy) {
    const s = this.style(enemy);
    Particles.spawn({ x, y, life: heavy ? 28 : 18, size: heavy ? 11 : 7, color: s.soft, type: 'ring' });
    Particles.burst(x, y, heavy ? 14 : 8, () => ({
      x: x + U.rand(-9, 9), y: y + U.rand(-11, 11),
      vx: U.rand(-3.6, 3.6), vy: U.rand(-3.7, 1.6), life: U.rand(12, 24),
      size: U.rand(1.5, 3), color: s.core, type: 'spark', drag: 0.9
    }));
  }
};

// ─── Inimigos no mapa ────────────────────────────────────────────────
class FieldEnemy {
  constructor(o) {
    Object.assign(this, {
      tier: 1, dir: -1, state: 'patrol', cool: 0,
      dead: false, purified: false, isBoss: false, alert: 0,
      map: 'floresta'
    }, o);
    const cfg = TIERS[this.tier];
    this.element = cfg.element || 'agua';
    this.fly = !!cfg.fly;
    this.archetype = this.archetype || cfg.archetype || null;
    this.lightKind = this.lightKind || cfg.lightKind || null;
    this.miniBoss = !!(this.miniBoss || cfg.miniBoss);
    this.isBoss = !!(this.isBoss || cfg.boss);
    this.t = U.rand(0, 100);
    this.homeX = this.x; this.homeY = this.y;
    if (this.archetype === 'ancientGolem') {
      this.w = 68;
      this.h = 98;
    } else if (this.archetype === 'ashSkeleton') {
      this.w = 34;
      this.h = 50;
    } else {
      this.w = this.isBoss ? 84 : 30;
      this.h = this.isBoss ? 104 : (this.fly ? 52 : 42);
    }
    this.jumpV = 0;
    this.pounceVX = 0;
    this.pounceCharge = 0;
    this.pounceCooldown = Math.floor(U.rand(20, 70));
    this.recoverT = 0;
    this.fieldPose = 'idle';
  }

  get rect() { return { x: this.x - this.w / 2, y: this.y - this.h, w: this.w, h: this.h }; }

  update(p) {
    this.t++;
    if (this.dead) {
      return;
    }
    if (this.map !== World.current) return; // dorme fora do reino ativo
    if (this.cool > 0) this.cool--;
    if (this.isBoss) {
      EnemyVFX.fieldAmbient(this);
      return; // o chefe aguarda, imóvel como o lago
    }
    if (this.archetype === 'ashSkeleton') {
      this.updateAshSkeleton(p);
      EnemyVFX.fieldAmbient(this);
      return;
    }

    const nearY = (this.swim || this.fly) ? 140 : 95;
    const near = Math.abs(p.x - this.x) < 260 && Math.abs(p.y - this.y) < nearY && this.cool <= 0;
    if (near) {
      this.state = 'chase';
      this.alert = Math.min(24, this.alert + 2);
      this.dir = p.x > this.x ? 1 : -1;
      if (this.alert === 10) EnemyVFX.alert(this);
    } else {
      this.state = 'patrol';
      this.alert = Math.max(0, this.alert - 1);
    }
    const sp = this.state === 'chase' ? 2.2 : 1.0;
    this.x += this.dir * sp;
    if (this.x < this.min) { this.x = this.min; this.dir = 1; }
    if (this.x > this.max) { this.x = this.max; this.dir = -1; }

    if (this.fly) {
      // espíritos voadores pairam e mergulham na direção do alvo
      const targetY = this.state === 'chase'
        ? U.clamp(p.y - 24, this.homeY - 130, this.homeY + 130)
        : this.homeY + Math.sin(this.t * 0.045) * 16;
      this.y = U.lerp(this.y, targetY, 0.05);
    } else if (this.swim) {
      // deriva vertical dos abissais
      this.y = this.homeY + Math.sin(this.t * 0.045) * 14;
    }
    EnemyVFX.fieldAmbient(this);
  }

  /**
   * O Esqueleto não desliza pelo chão: ele comprime o corpo, fixa a posição
   * do jogador e salta. O alvo não muda no ar, deixando o bote legível e
   * possível de esquivar. Os limites ficam inteiramente nas faixas seguras do
   * corredor, portanto ele nunca pousa no fogo, poço ou espinhos.
   */
  updateAshSkeleton(p) {
    const dx = p.x - this.x;
    const sameLevel = Math.abs(p.y - this.homeY) < 105;
    const near = sameLevel && Math.abs(dx) < 205 && this.cool <= 0;
    if (this.pounceCooldown > 0) this.pounceCooldown--;

    if (this.state === 'ambush') {
      this.fieldPose = 'crouch';
      this.pounceCharge--;
      this.alert = Math.min(24, this.alert + 2);
      if (this.pounceCharge <= 0) {
        const targetX = U.clamp(p.x, this.min, this.max);
        this.dir = targetX >= this.x ? 1 : -1;
        this.pounceVX = U.clamp((targetX - this.x) / 26, -5.2, 5.2);
        if (Math.abs(this.pounceVX) < 2.8) this.pounceVX = this.dir * 2.8;
        this.jumpV = -7.1;
        this.state = 'pounce';
        this.fieldPose = 'jump';
        Sfx.tone({ f: 410, f2: 690, dur: 0.16, type: 'triangle', vol: 0.07 });
      }
    } else if (this.state === 'recover') {
      this.fieldPose = 'crouch';
      this.recoverT--;
      if (this.recoverT <= 0) this.state = 'patrol';
    } else if (this.state === 'pounce' || this.state === 'hop') {
      this.fieldPose = this.state === 'pounce' ? 'attack' : 'jump';
      this.x += this.pounceVX;
      this.pounceVX *= 0.975;
    } else if (near && this.pounceCooldown <= 0) {
      this.state = 'ambush';
      this.fieldPose = 'crouch';
      this.pounceCharge = 24;
      this.dir = dx >= 0 ? 1 : -1;
      this.alert = 12;
      EnemyVFX.alert(this);
    } else {
      this.state = 'patrol';
      this.fieldPose = 'idle';
      this.alert = Math.max(0, this.alert - 1);
      if (this.t % (near ? 62 : 88) < 1) {
        this.dir = near ? (dx >= 0 ? 1 : -1) : this.dir;
        this.jumpV = near ? -5.2 : -4.3;
        this.pounceVX = this.dir * (near ? 1.65 : 1.05);
        this.state = 'hop';
        this.fieldPose = 'jump';
      }
    }

    if (this.jumpV !== 0 || this.y < this.homeY) {
      this.y += this.jumpV;
      this.jumpV += 0.43;
      if (this.y >= this.homeY && this.jumpV > 0) {
        this.y = this.homeY;
        this.jumpV = 0;
        this.pounceVX = 0;
        if (this.state === 'pounce') {
          this.state = 'recover';
          this.recoverT = 24;
          this.pounceCooldown = 96;
          this.fieldPose = 'crouch';
          Particles.burst(this.x, this.y - 3, 7, () => ({
            x: this.x + U.rand(-10, 10), y: this.y - U.rand(0, 6),
            vx: U.rand(-1.3, 1.3), vy: U.rand(-1.2, -0.2),
            life: 22, size: 1.8, color: 'rgba(110,205,255,0.75)', type: 'wisp'
          }));
        } else {
          this.state = 'patrol';
          this.fieldPose = 'idle';
        }
      }
    }

    if (this.x <= this.min) { this.x = this.min; this.dir = 1; }
    if (this.x >= this.max) { this.x = this.max; this.dir = -1; }
  }

  revive() {
    this.dead = false;
    this.absorbed = false;
    this.purified = false;
    this.x = this.homeX;
    this.y = this.homeY;
    this.dir = -1;
    this.state = 'patrol';
    this.fieldPose = 'idle';
    this.jumpV = 0;
    this.pounceVX = 0;
    this.pounceCharge = 0;
    this.pounceCooldown = 70;
    this.recoverT = 0;
    this.alert = 0;
    this.cool = 130; // trégua enquanto se reforma
    Particles.burst(this.x, this.y - 24, 18, () => ({
      x: this.x + U.rand(-14, 14), y: this.y - 24 + U.rand(-18, 18),
      vx: U.rand(-1.5, 1.5), vy: U.rand(-2, 0.5),
      life: 44, size: 2.6,
      color: this.lightKind === 'blueFire'
        ? 'rgba(95,205,255,0.94)'
        : (this.element === 'fogo' ? 'rgba(255,150,70,0.9)' : 'rgba(140,210,255,0.9)'),
      type: 'wisp'
    }));
    EnemyVFX.revive(this);
  }

  draw(ctx, cam, frames) {
    if (this.map !== World.current) return;
    const sx = this.x - cam.x, sy = this.y - cam.y;
    if (sx < -120 || sx > 1080) return;

    if (this.dead) {
      if (this.purified || this.absorbed) {
        // purificado: vaga-lume dourado · absorvido: brasa violeta que resta
        const ox = this.homeX - cam.x + Math.sin(frames * 0.02 + this.homeX) * (this.purified ? 30 : 10);
        const oy = this.homeY - cam.y - 50 + Math.sin(frames * 0.033 + 1) * (this.purified ? 16 : 6);
        const col = this.purified ? '255,232,170' : '150,90,230';
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        const g = ctx.createRadialGradient(ox, oy, 1, ox, oy, 14);
        g.addColorStop(0, `rgba(${col},${this.purified ? 0.9 : 0.5})`);
        g.addColorStop(1, `rgba(${col},0)`);
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(ox, oy, 14, 0, 7); ctx.fill();
        ctx.fillStyle = this.purified ? '#fff6dd' : '#c9a6ff';
        ctx.beginPath(); ctx.arc(ox, oy, this.purified ? 2.2 : 1.6, 0, 7); ctx.fill();
        ctx.restore();
      }
      return;
    }

    if (this.archetype === 'ashSkeleton' && window.drawBlueFlameSkeleton) {
      drawBlueFlameSkeleton(ctx, sx, sy, 1.02, {
        t: this.t, pose: this.fieldPose || 'idle', facing: this.dir
      });
    } else if (this.archetype === 'ancientGolem' && window.drawAncientFlameGolem) {
      drawAncientFlameGolem(ctx, sx, sy, 1.55, {
        t: this.t, pose: 'idle', facing: this.dir
      });
    } else {
      let drawFn = drawWaterSamurai;
      if (this.element === 'fogo') drawFn = drawFireSamurai;
      else if (this.element === 'vento') {
        drawFn = (this.tier === 12 || this.tier === 13) ? drawStormBattleSprite : drawWindBattleSprite;
      }
      drawFn(ctx, sx, sy, this.isBoss ? 2.6 : 1.05, this.tier, {
        t: this.t,
        pose: this.state === 'chase' ? 'walk' : 'idle',
        facing: this.dir
      });
    }

    // "!" de alerta
    if (this.alert > 8 && !this.isBoss) {
      ctx.save();
      ctx.fillStyle = '#ffe08a';
      ctx.font = '700 18px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('!', sx, sy - this.h - 10 - Math.sin(frames * 0.3) * 2);
      ctx.restore();
    }
    // presença do chefe
    if (this.isBoss) {
      const bc = this.lightKind === 'blueFire'
        ? '60,175,255'
        : (this.element === 'fogo' ? '255,120,50' : '90,160,255');
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const g = ctx.createRadialGradient(sx, sy - 60, 10, sx, sy - 60, 130);
      g.addColorStop(0, `rgba(${bc},0.14)`);
      g.addColorStop(1, `rgba(${bc},0)`);
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(sx, sy - 60, 130, 0, 7); ctx.fill();
      ctx.restore();
    }
  }
}

const Enemies = {
  list: [],

  init() {
    this.list = [
      new FieldEnemy({ tier: 1, x: 1000, y: 1200, min: 920,  max: 1140 }),
      new FieldEnemy({ tier: 1, x: 2150, y: 1200, min: 2060, max: 2330 }),
      new FieldEnemy({ tier: 2, x: 3080, y: 1200, min: 3020, max: 3190 }),
      new FieldEnemy({ tier: 2, x: 3560, y: 1200, min: 3450, max: 3700 }),
      new FieldEnemy({ tier: 2, x: 4800, y: 1200, min: 4700, max: 4950 }),
      new FieldEnemy({ tier: 3, x: 4720, y: 770,  min: 4660, max: 4830 }),
      new FieldEnemy({ tier: 3, x: 5960, y: 1200, min: 5860, max: 6090 }),
      // abissais das profundezas (nadam na gruta submersa)
      new FieldEnemy({ tier: 4, x: 5620, y: 1560, min: 5540, max: 5760, swim: true }),
      new FieldEnemy({ tier: 4, x: 5450, y: 1770, min: 5350, max: 5620, swim: true }),
      new FieldEnemy({ tier: 4, x: 5660, y: 2060, min: 5560, max: 5780, swim: true }),
      // o velho trono na superfície, agora ocupado por sentinelas
      new FieldEnemy({ tier: 2, x: 6480, y: 1200, min: 6380, max: 6680 }),
      new FieldEnemy({ tier: 3, x: 6820, y: 1200, min: 6720, max: 6980 }),
      // salão afogado — e Suijin no seu trono submerso
      new FieldEnemy({ tier: 4, x: 6300, y: 2060, min: 6200, max: 6430, swim: true }),
      new FieldEnemy({ tier: 4, x: 6850, y: 2180, min: 6760, max: 6930, swim: true }),
      new FieldEnemy({ tier: 3, x: 6650, y: 2340, min: 6580, max: 6880 }),
      new FieldEnemy({ tier: 9, x: 7150, y: 2340, min: 7150, max: 7150, isBoss: true, swim: true }),
      // copas sussurrantes — yūrei entre as árvores, no alto do mundo
      new FieldEnemy({ tier: 7, x: 3650, y: 310, min: 3580, max: 4050 }),
      new FieldEnemy({ tier: 7, x: 4400, y: 310, min: 4060, max: 4680 }),
      new FieldEnemy({ tier: 7, x: 6350, y: 310, min: 6270, max: 6560 }),
      // veias afogadas (a antiga caverna, agora submersa)
      new FieldEnemy({ tier: 4, x: 2600, y: 2100, min: 2450, max: 2880, swim: true }),
      new FieldEnemy({ tier: 4, x: 3900, y: 2050, min: 3700, max: 4150, swim: true }),
      // ── REINO DO FOGO (mapa próprio, via portal) ──
      new FieldEnemy({ tier: 6, x: 3050, y: 2280, min: 2920, max: 3220, map: 'fogo' }),
      new FieldEnemy({ tier: 6, x: 4480, y: 2280, min: 4360, max: 4620, map: 'fogo' }),
      new FieldEnemy({ tier: 5, x: 3400, y: 2120, min: 3260, max: 3690, map: 'fogo' }),
      new FieldEnemy({ tier: 5, x: 4500, y: 2100, min: 4310, max: 4840, map: 'fogo' }),
      new FieldEnemy({ tier: 10, x: 2320, y: 2280, min: 2320, max: 2320, isBoss: true, map: 'fogo' })
    ];
  },

  get total() { return this.list.length; },

  update(p) { for (const e of this.list) e.update(p); },

  draw(ctx, cam, frames) { for (const e of this.list) e.draw(ctx, cam, frames); },

  respawnKatanaKills() {
    for (const e of this.list) {
      if (e.dead && !e.purified && !e.absorbed && !e.isBoss) {
        e.revive();
      }
    }
  }
};
