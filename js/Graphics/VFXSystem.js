'use strict';

// Orquestrador de receitas de VFX. Este arquivo não desenha no canvas: ele
// somente descreve partículas e pulsos de pós-processamento. Assim, novas
// escolas elementais reutilizam a mesma infraestrutura de simulação e render.
const VFX = {
  profiles: {
    water: {
      core: 'rgba(255,255,255,0.98)',
      bright: 'rgba(127,212,255,0.98)',
      deep: 'rgba(45,127,214,0.74)',
      soft: 'rgba(112,205,255,0.34)',
      foam: 'rgba(245,255,255,0.96)'
    },
    fire: {
      core: 'rgba(255,246,210,0.98)',
      bright: 'rgba(255,142,74,0.96)',
      deep: 'rgba(202,60,28,0.72)',
      soft: 'rgba(255,130,64,0.34)'
    },
    dark: {
      core: 'rgba(255,248,255,0.99)',
      bright: 'rgba(224,132,255,0.98)',
      magenta: 'rgba(255,74,218,0.9)',
      deep: 'rgba(105,42,202,0.82)',
      void: 'rgba(14,8,25,0.94)',
      soft: 'rgba(174,82,255,0.38)'
    },
    wind: {
      core: 'rgba(246,255,242,0.96)',
      bright: 'rgba(174,239,202,0.92)',
      deep: 'rgba(82,164,132,0.68)',
      soft: 'rgba(184,255,220,0.28)'
    },
    light: {
      core: 'rgba(255,255,244,0.98)',
      bright: 'rgba(255,220,136,0.96)',
      deep: 'rgba(232,168,70,0.68)',
      soft: 'rgba(255,232,174,0.32)'
    }
  },

  recipes: Object.create(null),
  wall: {
    active: false, element: null, state: 'idle', t: 0,
    x: 0, y: 0, width: 0, height: 0, facing: 1,
    hitT: 0, hitY: 0
  },
  holy: {
    active: false, state: 'idle', t: 0, age: 0,
    x: 0, y: 0, radius: 78, hitT: 0, hitX: 0, hitY: 0,
    // Cada camada possui controles independentes e pode ser reutilizada por
    // outras habilidades sagradas sem alterar o desenho-base.
    layers: {
      flash:     { intensity: 1.0, scale: 1.0, rotation: 0, opacity: 1.0, speed: 0 },
      circle:    { intensity: 1.0, scale: 1.0, rotation: 0, opacity: 0.82, speed: 0.006 },
      star:      { intensity: 1.0, scale: 1.0, rotation: 0, opacity: 0.94, speed: 0.0015 },
      rays:      { intensity: 1.0, scale: 1.0, rotation: 0, opacity: 0.54, speed: -0.0018 },
      halo:      { intensity: 1.0, scale: 1.55, rotation: 0, opacity: 0.82, speed: 0 },
      particles: { intensity: 1.0, scale: 1.0, rotation: 0, opacity: 0.9, speed: 1.0 },
      dust:      { intensity: 0.85, scale: 1.0, rotation: 0, opacity: 0.75, speed: 0.65 },
      bloom:     { intensity: 1.0, scale: 0.82, rotation: 0, opacity: 0.34, speed: 0 },
      glow:      { intensity: 1.0, scale: 1.0, rotation: 0, opacity: 0.8, speed: 0 },
      pulse:     { intensity: 1.0, scale: 0.025, rotation: 0, opacity: 1.0, speed: 0.052 },
      symbols:   { intensity: 1.0, scale: 1.0, rotation: 0, opacity: 0.62, speed: 0.004 },
      flare:     { intensity: 1.0, scale: 1.0, rotation: 0, opacity: 0.42, speed: 0.08 },
      wave:      { intensity: 1.0, scale: 1.0, rotation: 0, opacity: 0.5, speed: 0.012 }
    }
  },

  register(name, recipe) {
    this.recipes[name] = recipe;
    return recipe;
  },

  profile(name) {
    return this.profiles[name] || this.profiles.light;
  },

  // Pulsos locais mantêm a distorção no ponto de impacto. O pós-processador
  // continua responsável por executar o shader apenas quando há impulso.
  distortion(x, y, direction, strength) {
    if (!window.PostProcessor || !PostProcessor.triggerDistortion) return;
    const w = PostProcessor.width || 960;
    const h = PostProcessor.height || 540;
    if (x < 0 || x > w || y < 0 || y > h) return;
    PostProcessor.triggerDistortion(
      x / w,
      1 - y / h,
      direction === undefined ? 1 : direction,
      strength === undefined ? 0.006 : strength
    );
  },

  cast(name, data) {
    const recipe = this.recipes[name];
    return recipe && recipe.cast ? recipe.cast(data) : null;
  },

  impact(name, data) {
    const recipe = this.recipes[name];
    return recipe && recipe.impact ? recipe.impact(data) : null;
  },

  emit(name, phase, data) {
    const recipe = this.recipes[name];
    return recipe && recipe[phase] ? recipe[phase](data) : null;
  },

  barrier(name, data) {
    const recipe = this.recipes[name];
    return recipe && recipe.barrier ? recipe.barrier(data) : null;
  },

  breakBarrier(name, data) {
    const recipe = this.recipes[name];
    return recipe && recipe.breakBarrier ? recipe.breakBarrier(data) : null;
  },

  hitBarrier(name, data) {
    const recipe = this.recipes[name];
    return recipe && recipe.hitBarrier ? recipe.hitBarrier(data) : null;
  },

  expireBarrier(name, data) {
    const recipe = this.recipes[name];
    return recipe && recipe.expireBarrier ? recipe.expireBarrier(data) : null;
  },

  resetWall() {
    const wall = this.wall;
    wall.active = false;
    wall.element = null;
    wall.state = 'idle';
    wall.t = 0;
    wall.hitT = 0;
  },

  resetHoly() {
    const holy = this.holy;
    holy.active = false;
    holy.state = 'idle';
    holy.t = 0;
    holy.age = 0;
    holy.hitT = 0;
  },

  resetPersistent() {
    this.resetWall();
    this.resetHoly();
  },

  update() {
    const wall = this.wall;
    if (wall.active) {
      wall.t++;
      if (wall.hitT > 0) wall.hitT--;
      if (wall.state === 'raise' && wall.t >= 12) {
        wall.state = 'sustain';
        wall.t = 0;
      } else if (wall.state === 'collapse' && wall.t >= 15) {
        this.resetWall();
      } else if (wall.state === 'break' && wall.t >= 24) {
        this.resetWall();
      }
      if (wall.active && wall.state === 'sustain' && wall.t % 9 === 0) {
        if (wall.element === 'fire') {
          const a = U.rand(0, Math.PI * 2);
          Particles.spawn({
            x: wall.x + Math.cos(a) * wall.width * 0.86,
            y: wall.y + Math.sin(a) * wall.height * 0.8 - U.rand(2, 12),
            vx: Math.cos(a) * U.rand(0.15, 0.55), vy: U.rand(-1.45, -0.42),
            grav: -0.012, drag: 0.95, life: U.rand(17, 28), size: U.rand(1.5, 3),
            color: Math.random() < 0.35 ? 'rgba(255,244,184,0.94)' : 'rgba(255,104,38,0.9)',
            type: Math.random() < 0.58 ? 'spark' : 'wisp'
          });
        } else {
          const crestY = wall.y - wall.height + Math.sin(wall.t * 0.13) * 4;
          Particles.spawn({
            x: wall.x + U.rand(-wall.width * 0.38, wall.width * 0.42),
            y: crestY + U.rand(-3, 4), vx: U.rand(-0.35, 0.35), vy: U.rand(-1.1, -0.25),
            grav: 0.08, life: U.rand(14, 24), size: U.rand(1.7, 3.1),
            color: 'rgba(245,255,255,0.88)', type: Math.random() < 0.55 ? 'foam' : 'drop'
          });
        }
      }
    }

    const holy = this.holy;
    if (!holy.active) return;
    holy.t++;
    holy.age++;
    if (holy.hitT > 0) holy.hitT--;
    if (holy.state === 'raise' && holy.t >= 14) {
      holy.state = 'sustain';
      holy.t = 0;
    } else if (holy.state === 'collapse' && holy.t >= 16) {
      this.resetHoly();
      return;
    }
    if (holy.state !== 'collapse' && holy.age % 5 === 0) {
      Particles.spawn({
        x: holy.x + U.rand(-holy.radius * 0.78, holy.radius * 0.78),
        y: holy.y + U.rand(-holy.radius * 0.48, holy.radius * 0.7),
        vx: U.rand(-0.18, 0.18), vy: U.rand(-1.05, -0.32),
        drag: 0.98, life: U.rand(26, 44), size: U.rand(1.1, 2.2),
        phase: U.rand(0, Math.PI * 2), color: '#FFE87A', core: '#FFFFFF',
        type: 'holyDust'
      });
    }
    if (holy.state === 'sustain' && holy.age % 13 === 0) {
      const a = U.rand(0, Math.PI * 2);
      const speed = U.rand(0.65, 1.25);
      Particles.spawn({
        x: holy.x + Math.cos(a) * holy.radius * 0.48,
        y: holy.y + Math.sin(a) * holy.radius * 0.48,
        vx: Math.cos(a) * speed, vy: Math.sin(a) * speed,
        drag: 0.97, life: U.rand(14, 22), size: U.rand(1.6, 2.5), width: 1.2,
        color: '#FFE87A', core: '#FFFFFF', type: 'holyRay'
      });
    }
  },

  drawPersistent(ctx) {
    if (this.wall.active) {
      if (this.wall.element === 'fire') ParticleRenderer.drawFireRing(ctx, this.wall);
      else ParticleRenderer.drawWaterWall(ctx, this.wall);
    }
    if (this.holy.active) ParticleRenderer.drawHolyShield(ctx, this.holy, false);
  },

  drawPersistentFront(ctx) {
    if (this.holy.active) ParticleRenderer.drawHolyShield(ctx, this.holy, true);
  }
};

VFX.register('water', {
  // F0-F14: gotas convergem para a lâmina e uma lente aquática cresce.
  prepare(data) {
    const c = VFX.profile('water');
    const ox = data.x + 12;
    const oy = data.y - 48;
    const pulse = !data.barrage;
    const focusX = pulse ? ox : data.x + 14;
    const focusY = pulse ? oy : data.y - 2;
    const angle = Math.atan2(data.ty - focusY, data.tx - focusX);
    Particles.spawn({
      x: focusX, y: focusY, life: 15, size: data.barrage ? 14 : 16,
      angle, color: c.bright, core: c.core, soft: c.soft, type: 'waterLens',
      layer: 'behind'
    });
    if (pulse) {
      Particles.spawn({
        x: ox, y: oy, life: 15, size: 30, angle,
        color: c.deep, core: c.core, soft: c.soft,
        type: 'waterCharge', layer: 'behind'
      });
      Particles.spawn({
        x: ox, y: oy, life: 15, size: 12, angle,
        color: c.bright, core: c.core, type: 'ripple', layer: 'behind'
      });
    }
    if (data.barrage) {
      Particles.spawn({
        x: data.x + 14, y: data.y - 2, life: 16, size: 24,
        color: c.deep, core: c.foam, type: 'puddle', layer: 'behind'
      });
      Particles.spawn({
        x: data.x + 14, y: data.y - 2, life: 14, size: 13,
        angle: 0, color: c.bright, type: 'ripple', layer: 'behind'
      });
    }
    const pullCount = pulse ? 16 : 7;
    for (let i = 0; i < pullCount; i++) {
      const a = angle + (i - (pullCount - 1) * 0.5) * (pulse ? 0.31 : 0.58);
      const r = pulse ? 26 + (i % 4) * 12 : 10 + (i % 3) * 5;
      Particles.spawn({
        x: focusX + Math.cos(a) * r, y: focusY + Math.sin(a) * r,
        sx: focusX + Math.cos(a) * r, sy: focusY + Math.sin(a) * r,
        tx: focusX, ty: focusY, life: 14 - (i % 3), size: pulse ? 1.8 + (i % 3) * 0.55 : 1.25 + (i % 2) * 0.45,
        color: i % 2 ? c.bright : c.core, type: 'waterPull', layer: 'behind'
      });
    }
    Particles.burst(focusX, focusY, pulse ? 11 : 7, i => ({
      x: focusX + U.rand(pulse ? -34 : -24, pulse ? 34 : 24),
      y: pulse ? data.y - U.rand(0, 8) : focusY + U.rand(-8, 5),
      vx: 0, vy: 0,
      life: 14 + (i % 3), size: pulse ? U.rand(1.6, 3.2) : 1.5, color: c.bright,
      type: 'waterPull', tx: focusX, ty: focusY, layer: 'behind'
    }));
  },

  // F15: splash de boca de canhão; o projétil já nasce no topo da velocidade.
  cast(data) {
    const c = VFX.profile('water');
    const ox = data.x + 12;
    const oy = data.y - 48;
    const barrage = !!data.barrage;
    const travel = barrage ? Math.max(5, data.travel || 6) : Math.max(8, data.travel || 12);
    const angle = Math.atan2(data.ty - oy, data.tx - ox);
    if (barrage) {
      const groundX = data.x + 18;
      const groundY = data.y - 3;
      const vx = (data.tx - groundX) / travel;
      Particles.spawn({
        x: groundX, y: groundY, vx, vy: 0, life: travel + 1, size: 12,
        angle: vx < 0 ? Math.PI : 0, color: c.bright, core: c.core,
        soft: c.soft, phase: 0.8, type: 'waterGroundWave'
      });
      Particles.spawn({
        x: groundX, y: groundY + 2, life: 18, size: 25,
        color: c.deep, core: c.foam, type: 'puddle'
      });
      Particles.burst(groundX, groundY, 9, () => ({
        x: groundX + U.rand(-12, 12), y: groundY + U.rand(-3, 3),
        vx: U.rand(-1.2, 1.2), vy: U.rand(-2.4, -0.55),
        grav: 0.16, drag: 0.97, life: U.rand(15, 24), size: U.rand(1.6, 3),
        color: c.bright, type: 'drop'
      }));
      return;
    }
    const lanes = [0];

    Particles.spawn({
      x: ox, y: oy, life: barrage ? 8 : 7, size: barrage ? 10 : 18,
      angle, color: c.bright, core: c.core, type: 'waterMuzzle'
    });
    if (!barrage) {
      Particles.spawn({
        x: ox, y: oy, vx: (data.tx - ox) / travel, vy: (data.ty - oy) / travel,
        life: travel + 1, size: 14, angle, color: c.deep,
        core: c.bright, soft: c.soft, phase: 1.2, waveAmp: 4.5,
        type: 'waterWake'
      });
      Particles.spawn({
        x: ox + 5, y: oy, life: 4, size: 46, width: 8,
        angle: angle - 0.18, span: 1.05, color: c.core, type: 'slash'
      });
    }

    for (let i = 0; i < lanes.length; i++) {
      const lane = lanes[i];
      const sy = oy + lane * 9;
      const endY = data.ty + lane * (barrage ? 18 : 0);
      const vx = (data.tx - ox) / travel;
      const vy = (endY - sy) / travel;
      Particles.spawn({
        x: ox, y: sy, vx, vy, life: travel + 1,
        size: barrage ? 3.4 : 9.4, color: c.bright, core: c.core,
        soft: c.soft, phase: lane * 1.7, waveAmp: barrage ? 1.8 : 4.2,
        type: 'waterbolt', emitDrops: !barrage
      });
      if (barrage) {
        Particles.spawn({
          x: ox - 4, y: sy + 2, vx: vx * 0.9, vy: vy + lane * 0.12,
          life: travel, size: 1.85, color: c.soft, core: c.core,
          soft: c.soft, phase: 1.4 + lane, waveAmp: 1.25, type: 'waterbolt'
        });
      }
    }

    Particles.burst(ox, oy, barrage ? 8 : 15, i => ({
      x: ox + U.rand(-7, 7), y: oy + U.rand(-12, 12),
      vx: -Math.cos(angle) * U.rand(1.8, barrage ? 2.7 : 4.4) + U.rand(-0.35, 0.35),
      vy: -Math.sin(angle) * U.rand(1.8, barrage ? 2.7 : 4.4) + U.rand(-0.7, 0.7),
      life: 12 + (i % 7), size: 1.4 + (i % 3) * 0.65,
      color: c.bright, type: 'drop', grav: 0.08, drag: 0.95
    }));
  },

  geyser(data) {
    const c = VFX.profile('water');
    const x = data.x;
    const y = data.y;
    Particles.spawn({
      x, y, life: 16, size: data.heavy ? 46 : 39,
      color: c.bright, core: c.core, soft: c.soft, type: 'waterGeyser'
    });
    Particles.spawn({
      x, y: y + 2, life: 24, size: data.heavy ? 35 : 29,
      color: c.deep, core: c.foam, type: 'puddle'
    });
    Particles.spawn({
      x, y: y - 82, life: 13, size: data.heavy ? 25 : 20,
      angle: -Math.PI * 0.5, color: c.bright, core: c.foam, type: 'waterImpact'
    });
    Particles.burst(x, y - 78, data.heavy ? 18 : 14, i => ({
      x: x + U.rand(-15, 15), y: y - 78 + U.rand(-8, 8),
      vx: U.rand(-3.5, 3.5), vy: U.rand(-5.8, -1.4),
      grav: 0.2, drag: 0.975, life: U.rand(18, 31),
      size: i % 3 === 0 ? 4 : U.rand(1.8, 3.2),
      color: i % 3 === 0 ? c.foam : c.bright,
      type: i % 3 === 0 ? 'foam' : 'drop', glint: i % 4 === 0
    }));
    VFX.distortion(x, y - 62, 1, data.heavy ? 0.009 : 0.0065);
  },

  reflux(data) {
    const c = VFX.profile('water');
    const travel = Math.max(4, data.travel || 5);
    const vx = (data.tx - data.x) / travel;
    Particles.spawn({
      x: data.x, y: data.y - 3, vx, vy: 0, life: travel + 2, size: 10,
      angle: vx < 0 ? Math.PI : 0, color: c.deep, core: c.bright,
      soft: c.soft, phase: 2.1, type: 'waterGroundWave'
    });
    Particles.spawn({
      x: data.x, y: data.y + 1, life: travel + 14, size: 24,
      color: c.deep, core: c.foam, type: 'puddle'
    });
  },

  // F31-F60: choque elíptico, espuma, gotas balísticas, névoa e poça.
  impact(data) {
    const c = VFX.profile('water');
    const heavy = !!data.heavy;
    const angle = data.angle || 0;
    const count = heavy ? 36 : 28;

    Particles.spawn({
      x: data.x, y: data.y, life: heavy ? 11 : 9, size: heavy ? 48 : 39,
      angle, color: c.deep, core: c.core, soft: c.soft, type: 'waterDetonation'
    });
    Particles.spawn({
      x: data.x, y: data.y, life: heavy ? 17 : 14, size: heavy ? 34 : 28,
      angle, color: c.bright, core: c.core, type: 'waterImpact'
    });
    Particles.spawn({
      x: data.x - 8, y: data.y + 2, life: heavy ? 21 : 17, size: heavy ? 29 : 23,
      angle, color: c.deep, core: c.foam, type: 'waterImpact'
    });
    Particles.spawn({
      x: data.x, y: data.y + 42, life: 26, size: heavy ? 36 : 30,
      angle, color: c.deep, core: c.foam, type: 'puddle'
    });
    Particles.spawn({
      x: data.x, y: data.y, life: 22, size: heavy ? 31 : 25,
      color: c.soft, type: 'ripple', angle
    });

    for (let i = 0; i < 12; i++) {
      const spread = -1.18 + i * 0.215;
      const speed = 2.1 + (i % 4) * 0.72;
      Particles.spawn({
        x: data.x - Math.cos(angle) * 2, y: data.y + Math.sin(spread) * 3,
        vx: -Math.cos(angle + spread) * speed, vy: -2.2 - Math.abs(Math.sin(spread)) * 3.5,
        grav: 0.14, life: 19 + (i % 4) * 3, size: 2.2 + (i % 3) * 0.75,
        color: c.foam, type: 'foam', drag: 0.97
      });
    }

    Particles.burst(data.x, data.y, count, i => {
      const a = angle + U.rand(-1.35, 1.35);
      const speed = U.rand(2.4, heavy ? 7.2 : 6.0);
      return {
        x: data.x + U.rand(-5, 5), y: data.y + U.rand(-6, 6),
        vx: Math.cos(a) * speed, vy: Math.sin(a) * speed - U.rand(1.1, 3.4),
        grav: 0.17, drag: 0.975, life: 16 + U.rand(0, 14),
        size: i % 3 === 0 ? 4.2 : 2.0 + U.rand(0, 1.6),
        color: i % 3 === 0 ? c.foam : c.bright, type: 'drop',
        glint: i % 4 === 0
      };
    });
    Particles.burst(data.x, data.y - 6, heavy ? 12 : 9, () => ({
      x: data.x + U.rand(-24, 24), y: data.y + U.rand(-10, 12),
      vx: U.rand(-0.65, 0.65), vy: U.rand(-1.5, -0.32),
      life: U.rand(28, 46), size: U.rand(5, 10),
      color: c.soft, type: 'mist', drag: 0.96
    }));

    VFX.distortion(data.x, data.y, Math.cos(angle), heavy ? 0.012 : 0.009);
  },

  // Barragem: silhueta vertical, não outro projétil horizontal.
  barrier(data) {
    const c = VFX.profile('water');
    const facing = data.facing || 1;
    const wall = VFX.wall;
    wall.active = true;
    wall.element = 'water';
    wall.state = 'raise';
    wall.t = 0;
    wall.hitT = 0;
    wall.facing = facing;
    wall.x = data.x + facing * 104;
    wall.y = data.y;
    wall.width = data.heavy ? 108 : 96;
    wall.height = data.heavy ? 162 : 148;
    const x = wall.x;
    const y = wall.y;
    Particles.spawn({
      x, y: y + 1, life: 28, size: data.heavy ? 39 : 33,
      color: c.deep, core: c.foam, type: 'puddle', layer: 'behind'
    });
    Particles.spawn({
      x, y, life: 18, size: 24, angle: 0,
      color: c.bright, type: 'ripple', layer: 'behind'
    });
    Particles.burst(x, y - 4, 16, i => ({
      x: x + U.rand(-wall.width * 0.45, wall.width * 0.45), y: y + U.rand(-6, 3),
      vx: U.rand(-1.5, 1.5), vy: U.rand(-5.2, -1.2),
      grav: 0.18, life: U.rand(18, 32), size: i % 3 === 0 ? 3.5 : U.rand(1.5, 2.8),
      color: i % 3 === 0 ? c.foam : c.bright,
      type: i % 3 === 0 ? 'foam' : 'drop', layer: 'behind'
    }));
  },

  hitBarrier(data) {
    const c = VFX.profile('water');
    const wall = VFX.wall;
    if (!wall.active) return;
    wall.hitT = 14;
    wall.hitY = data.y === undefined ? wall.y - wall.height * 0.56 : data.y;
    const x = wall.x + wall.width * 0.46 * wall.facing;
    const y = wall.hitY;
    Particles.spawn({
      x, y, life: 16, size: 22, angle: 0,
      color: c.bright, core: c.foam, type: 'waterImpact'
    });
    Particles.burst(x, y, 12, i => ({
      x: x + U.rand(-8, 8), y: y + U.rand(-10, 10),
      vx: U.rand(-2.4, 1.1) * wall.facing, vy: U.rand(-3.6, 1.4),
      grav: 0.15, drag: 0.97, life: U.rand(15, 27),
      size: i % 3 === 0 ? 3.5 : U.rand(1.4, 2.7),
      color: i % 3 === 0 ? c.foam : c.bright,
      type: i % 3 === 0 ? 'foam' : 'drop'
    }));
    VFX.distortion(x, y, -wall.facing, 0.0055);
  },

  // Fogo contra água evapora: vapor, sem fragmentos que pareçam estilhaços.
  breakBarrier(data) {
    const c = VFX.profile('water');
    const wall = VFX.wall;
    const x = wall.active ? wall.x : data.x;
    const y = wall.active ? wall.y - wall.height * 0.55 : data.y - 42;
    if (wall.active) {
      wall.state = 'break';
      wall.t = 0;
      wall.hitT = 0;
    }
    Particles.burst(x, y, 24, () => ({
      x: x + U.rand(-44, 44), y: y + U.rand(-58, 38),
      vx: U.rand(-0.9, 0.9), vy: U.rand(-2.3, -0.55),
      life: U.rand(28, 48), size: U.rand(6, 13),
      color: 'rgba(245,252,255,0.45)', type: 'mist', drag: 0.96
    }));
    Particles.burst(x, wall.active ? wall.y - 14 : y + 32, 14, () => ({
      x: x + U.rand(-40, 40), y: wall.active ? wall.y - U.rand(0, 32) : y + U.rand(20, 42),
      vx: U.rand(-2.1, 2.1), vy: U.rand(-2.6, 0.4), grav: 0.2,
      life: U.rand(18, 31), size: U.rand(1.8, 3.8),
      color: c.bright, type: 'drop'
    }));
    Particles.spawn({ x, y: wall.active ? wall.y : y + 42, life: 20, size: 31, color: c.soft, type: 'ripple' });
  },

  expireBarrier() {
    const c = VFX.profile('water');
    const wall = VFX.wall;
    if (!wall.active || wall.state === 'break') return;
    wall.state = 'collapse';
    wall.t = 0;
    Particles.spawn({
      x: wall.x, y: wall.y + 1, life: 22, size: 29,
      color: c.deep, core: c.foam, type: 'puddle'
    });
    Particles.burst(wall.x, wall.y - 5, 9, () => ({
      x: wall.x + U.rand(-wall.width * 0.48, wall.width * 0.48),
      y: wall.y - U.rand(0, wall.height * 0.35),
      vx: U.rand(-1.8, 1.8), vy: U.rand(-1.2, 0.2), grav: 0.18,
      life: U.rand(16, 27), size: U.rand(1.6, 3.1),
      color: c.bright, type: 'drop'
    }));
  }
});

VFX.register('fire', {
  // Incinerar concentra brasas na lâmina; Barragem acende um selo no chão.
  prepare(data) {
    const c = VFX.profile('fire');
    const barrage = !!data.barrage;
    const focusX = barrage ? data.x + 12 : data.x + 12;
    const focusY = barrage ? data.y - 2 : data.y - 48;
    const angle = Math.atan2(data.ty - focusY, data.tx - focusX);
    Particles.spawn({
      x: focusX, y: focusY, life: barrage ? 13 : 15,
      size: barrage ? 23 : 31, angle, color: c.bright,
      core: c.core, soft: c.soft, type: 'fireCharge', layer: 'behind'
    });
    Particles.spawn({
      x: focusX, y: focusY, life: barrage ? 16 : 13,
      size: barrage ? 14 : 11, color: c.bright,
      type: barrage ? 'ripple' : 'ring', layer: 'behind'
    });
    const count = barrage ? 11 : 18;
    for (let i = 0; i < count; i++) {
      const a = angle + i / count * Math.PI * 2 + (barrage ? 0 : Math.PI);
      const r = (barrage ? 22 : 34) + (i % 4) * (barrage ? 7 : 10);
      Particles.spawn({
        x: focusX + Math.cos(a) * r,
        y: focusY + Math.sin(a) * r * (barrage ? 0.36 : 0.78),
        sx: focusX + Math.cos(a) * r,
        sy: focusY + Math.sin(a) * r * (barrage ? 0.36 : 0.78),
        tx: focusX, ty: focusY, life: 12 + (i % 4),
        size: 1.5 + (i % 3) * 0.55,
        color: i % 3 === 0 ? c.core : c.bright,
        type: 'firePull', layer: 'behind'
      });
    }
    if (barrage) {
      Particles.burst(focusX, focusY, 8, i => ({
        x: focusX + U.rand(-22, 22), y: focusY + U.rand(-4, 3),
        vx: U.rand(-0.25, 0.25), vy: U.rand(-1.65, -0.45),
        grav: -0.012, drag: 0.95, life: 18 + i,
        size: U.rand(1.5, 2.8), color: i % 3 === 0 ? c.core : c.bright,
        type: i % 2 ? 'spark' : 'wisp', layer: 'behind'
      }));
    }
  },

  // A leitura é de lança/cometa: núcleo branco, borda laranja e cauda rubra.
  cast(data) {
    const c = VFX.profile('fire');
    const barrage = !!data.barrage;
    const ox = barrage ? data.x + 18 : data.x + 12;
    const oy = barrage ? data.y - 3 : data.y - 48;
    const travel = barrage ? Math.max(5, data.travel || 6) : Math.max(8, data.travel || 12);
    const vx = (data.tx - ox) / travel;
    const vy = barrage ? 0 : (data.ty - oy) / travel;
    const angle = Math.atan2(vy, vx);
    if (barrage) {
      Particles.spawn({
        x: ox, y: oy, vx, vy: 0, life: travel + 1, size: 13,
        angle, color: c.bright, core: c.core, soft: c.soft,
        phase: 0.9, type: 'fireGroundWave'
      });
      Particles.spawn({
        x: ox, y: oy + 2, life: 20, size: 26,
        color: c.deep, core: c.bright, type: 'puddle'
      });
      Particles.burst(ox, oy, 10, i => ({
        x: ox + U.rand(-12, 12), y: oy + U.rand(-3, 2),
        vx: U.rand(-1.4, 1.4), vy: U.rand(-2.7, -0.65),
        grav: -0.018, drag: 0.94, life: 14 + i,
        size: U.rand(1.5, 3), color: i % 3 === 0 ? c.core : c.bright,
        type: i % 2 ? 'spark' : 'wisp'
      }));
      return;
    }
    Particles.spawn({
      x: ox, y: oy, vx, vy, life: travel + 1, size: 17,
      angle, color: c.deep, core: c.core, soft: c.soft,
      phase: 1.3, type: 'fireWake'
    });
    Particles.spawn({
      x: ox, y: oy, vx, vy, life: travel + 1, size: 10.2,
      angle, color: c.bright, core: c.core, soft: c.soft,
      phase: 0.4, type: 'firebolt', emitTrail: true
    });
    Particles.spawn({
      x: ox, y: oy, life: 5, size: 49, width: 8,
      angle: angle - 0.16, span: 1.02, color: c.core, type: 'slash'
    });
    Particles.burst(ox, oy, 17, i => ({
      x: ox + U.rand(-7, 7), y: oy + U.rand(-11, 11),
      vx: -Math.cos(angle) * U.rand(2, 5) + U.rand(-0.4, 0.4),
      vy: -Math.sin(angle) * U.rand(2, 5) + U.rand(-1.1, 0.7),
      grav: -0.018, drag: 0.92, life: 12 + (i % 7),
      size: 1.4 + (i % 3) * 0.65,
      color: i % 4 === 0 ? c.core : c.bright,
      type: i % 2 ? 'spark' : 'wisp'
    }));
  },

  pillar(data) {
    const c = VFX.profile('fire');
    const x = data.x;
    const y = data.y;
    Particles.spawn({
      x, y, life: 17, size: data.heavy ? 48 : 41,
      color: c.bright, core: c.core, soft: c.soft, type: 'firePillar'
    });
    Particles.spawn({
      x, y: y + 2, life: 25, size: data.heavy ? 38 : 31,
      color: c.deep, core: c.bright, type: 'puddle'
    });
    Particles.spawn({
      x, y: y - 70, life: 10, size: data.heavy ? 44 : 36,
      color: c.bright, core: c.core, soft: c.soft,
      type: 'fireDetonation'
    });
    Particles.burst(x, y - 62, data.heavy ? 24 : 18, i => ({
      x: x + U.rand(-18, 18), y: y - 62 + U.rand(-28, 24),
      vx: U.rand(-3.7, 3.7), vy: U.rand(-5.2, -0.8),
      grav: i % 3 === 0 ? 0.09 : -0.018, drag: 0.96,
      life: U.rand(18, 33), size: i % 4 === 0 ? 3.8 : U.rand(1.5, 3),
      color: i % 4 === 0 ? c.core : c.bright,
      type: i % 2 ? 'spark' : 'wisp'
    }));
    Particles.burst(x, y - 26, 7, () => ({
      x: x + U.rand(-20, 20), y: y - U.rand(12, 55),
      vx: U.rand(-0.45, 0.45), vy: U.rand(-1.15, -0.28),
      drag: 0.96, life: U.rand(28, 42), size: U.rand(5, 9),
      color: 'rgba(78,42,38,0.34)', type: 'mist'
    }));
    VFX.distortion(x, y - 55, 1, data.heavy ? 0.011 : 0.008);
  },

  reflux(data) {
    const c = VFX.profile('fire');
    const travel = Math.max(4, data.travel || 5);
    const vx = (data.tx - data.x) / travel;
    Particles.spawn({
      x: data.x, y: data.y - 3, vx, vy: 0, life: travel + 2, size: 10,
      angle: vx < 0 ? Math.PI : 0, color: c.deep, core: c.core,
      soft: c.soft, phase: 2.2, type: 'fireGroundWave'
    });
    Particles.burst(data.x, data.y - 4, 7, i => ({
      x: data.x + U.rand(-12, 12), y: data.y + U.rand(-5, 2),
      vx: vx * U.rand(0.12, 0.22), vy: U.rand(-1.5, -0.3),
      drag: 0.95, life: 16 + i * 2, size: U.rand(1.4, 2.7),
      color: i % 3 === 0 ? c.core : c.bright, type: 'wisp'
    }));
  },

  impact(data) {
    const c = VFX.profile('fire');
    const heavy = !!data.heavy;
    const angle = data.angle || 0;
    Particles.spawn({
      x: data.x, y: data.y, life: heavy ? 12 : 10,
      size: heavy ? 53 : 44, angle,
      color: c.bright, core: c.core, soft: c.deep, type: 'fireDetonation'
    });
    Particles.spawn({
      x: data.x, y: data.y, life: heavy ? 21 : 17,
      size: heavy ? 19 : 15, color: c.core, type: 'ring'
    });
    Particles.spawn({
      x: data.x, y: data.y + 43, life: 34,
      size: heavy ? 40 : 33, color: c.deep, core: c.bright,
      type: 'puddle'
    });
    const count = heavy ? 42 : 32;
    Particles.burst(data.x, data.y, count, i => {
      const a = angle + U.rand(-1.55, 1.55);
      const speed = U.rand(2.2, heavy ? 7.8 : 6.4);
      return {
        x: data.x + U.rand(-6, 6), y: data.y + U.rand(-8, 8),
        vx: Math.cos(a) * speed, vy: Math.sin(a) * speed - U.rand(0.8, 3.4),
        grav: i % 4 === 0 ? 0.1 : -0.02, drag: 0.95,
        life: U.rand(16, 31), size: i % 4 === 0 ? 3.8 : U.rand(1.5, 3.2),
        color: i % 4 === 0 ? c.core : c.bright,
        type: i % 2 ? 'spark' : 'wisp'
      };
    });
    Particles.burst(data.x, data.y + 2, heavy ? 12 : 9, () => ({
      x: data.x + U.rand(-24, 24), y: data.y + U.rand(-12, 18),
      vx: U.rand(-0.7, 0.7), vy: U.rand(-1.5, -0.3),
      drag: 0.96, life: U.rand(30, 48), size: U.rand(5, 11),
      color: 'rgba(78,42,38,0.35)', type: 'mist'
    }));
    VFX.distortion(data.x, data.y, Math.cos(angle), heavy ? 0.013 : 0.01);
  },

  barrier(data) {
    const c = VFX.profile('fire');
    const wall = VFX.wall;
    wall.active = true;
    wall.element = 'fire';
    wall.state = 'raise';
    wall.t = 0;
    wall.hitT = 0;
    wall.facing = data.facing || 1;
    wall.x = data.x;
    wall.y = data.y;
    wall.width = data.heavy ? 86 : 78;
    wall.height = data.heavy ? 33 : 29;
    Particles.spawn({
      x: wall.x, y: wall.y + 2, life: 30, size: 38,
      color: c.deep, core: c.bright, type: 'puddle', layer: 'behind'
    });
    Particles.spawn({
      x: wall.x, y: wall.y, life: 18, size: 30,
      color: c.core, type: 'ripple', layer: 'behind'
    });
    Particles.burst(wall.x, wall.y - 3, 22, i => {
      const a = i / 22 * Math.PI * 2 + U.rand(-0.12, 0.12);
      return {
        x: wall.x + Math.cos(a) * wall.width * U.rand(0.55, 0.95),
        y: wall.y + Math.sin(a) * wall.height * U.rand(0.5, 0.95),
        vx: Math.cos(a) * U.rand(0.3, 1.35), vy: U.rand(-3.5, -0.6),
        grav: -0.015, drag: 0.94, life: U.rand(18, 32),
        size: i % 4 === 0 ? 3.6 : U.rand(1.5, 2.9),
        color: i % 4 === 0 ? c.core : c.bright,
        type: i % 2 ? 'spark' : 'wisp', layer: 'behind'
      };
    });
  },

  hitBarrier(data) {
    const c = VFX.profile('fire');
    const wall = VFX.wall;
    if (!wall.active || wall.element !== 'fire') return;
    wall.hitT = 14;
    wall.hitY = data.y === undefined ? wall.y - 28 : data.y;
    const x = wall.x + wall.facing * wall.width * 0.88;
    const y = wall.hitY;
    Particles.spawn({
      x, y, life: 9, size: 29, color: c.bright,
      core: c.core, soft: c.deep, type: 'fireDetonation'
    });
    Particles.burst(x, y, 16, i => ({
      x: x + U.rand(-7, 7), y: y + U.rand(-9, 9),
      vx: wall.facing * U.rand(1.2, 4.1), vy: U.rand(-3.7, 1.2),
      grav: i % 3 === 0 ? 0.09 : -0.012, drag: 0.94,
      life: U.rand(14, 26), size: i % 4 === 0 ? 3.5 : U.rand(1.4, 2.8),
      color: i % 4 === 0 ? c.core : c.bright,
      type: i % 2 ? 'spark' : 'wisp'
    }));
    VFX.distortion(x, y, -wall.facing, 0.006);
  },

  // Água contra fogo apaga o anel: vapor denso e brasas morrendo.
  breakBarrier(data) {
    const wall = VFX.wall;
    const x = wall.active ? wall.x : data.x;
    const y = wall.active ? wall.y - 14 : data.y - 20;
    if (wall.active && wall.element === 'fire') {
      wall.state = 'break';
      wall.t = 0;
      wall.hitT = 0;
    }
    Particles.burst(x, y, 28, i => ({
      x: x + U.rand(-60, 60), y: y + U.rand(-28, 20),
      vx: U.rand(-0.85, 0.85), vy: U.rand(-2.35, -0.45),
      drag: 0.96, life: U.rand(30, 52), size: U.rand(6, 14),
      color: i % 3 === 0 ? 'rgba(222,238,242,0.46)' : 'rgba(92,72,68,0.38)',
      type: 'mist'
    }));
    Particles.burst(x, y + 8, 15, i => ({
      x: x + U.rand(-56, 56), y: y + U.rand(-8, 16),
      vx: U.rand(-1.7, 1.7), vy: U.rand(-2.1, 0.1),
      grav: 0.08, drag: 0.94, life: U.rand(15, 26), size: U.rand(1.3, 2.6),
      color: i % 4 === 0 ? 'rgba(255,126,54,0.72)' : 'rgba(122,58,38,0.55)',
      type: i % 2 ? 'spark' : 'wisp'
    }));
  },

  expireBarrier() {
    const c = VFX.profile('fire');
    const wall = VFX.wall;
    if (!wall.active || wall.element !== 'fire' || wall.state === 'break') return;
    wall.state = 'collapse';
    wall.t = 0;
    Particles.burst(wall.x, wall.y - 3, 13, i => ({
      x: wall.x + U.rand(-wall.width * 0.82, wall.width * 0.82),
      y: wall.y + U.rand(-wall.height, 4),
      vx: U.rand(-1.2, 1.2), vy: U.rand(-1.65, -0.25),
      grav: 0.04, drag: 0.94, life: U.rand(16, 28), size: U.rand(1.3, 2.7),
      color: i % 4 === 0 ? c.core : c.deep,
      type: i % 2 ? 'spark' : 'wisp'
    }));
  }
});

VFX.register('dark', {
  // F1-F5: matéria escura e fragmentos convergem para um núcleo branco-violeta.
  prepare(data) {
    const c = VFX.profile('dark');
    const x = data.x + 12;
    const y = data.y - 48;
    const angle = Math.atan2(data.ty - y, data.tx - x);
    Particles.spawn({
      x, y, life: 6, size: 24, angle,
      color: c.bright, core: c.core, soft: c.magenta,
      type: 'darkCharge', layer: 'behind'
    });
    Particles.spawn({
      x, y, life: 7, size: 10, color: c.magenta,
      type: 'ring', layer: 'behind'
    });
    for (let i = 0; i < 15; i++) {
      const a = i / 15 * Math.PI * 2 + angle;
      const r = 24 + (i % 4) * 10;
      const sx = x + Math.cos(a) * r;
      const sy = y + Math.sin(a) * r * 0.72;
      Particles.spawn({
        x: sx, y: sy, sx, sy, tx: x, ty: y,
        life: 5 + (i % 2), size: 1.5 + (i % 3) * 0.65,
        angle: a, spin: i % 2 ? 0.2 : -0.18,
        color: c.void, core: i % 3 === 0 ? c.magenta : c.deep,
        type: 'darkPull', layer: 'behind'
      });
    }
  },

  // F6-F18: o núcleo acelera enquanto fitas longas e anéis giram no voo.
  cast(data) {
    const c = VFX.profile('dark');
    const ox = data.x + 12;
    const oy = data.y - 48;
    const travel = Math.max(8, data.travel || 13);
    const vx = (data.tx - ox) / travel;
    const vy = (data.ty - oy) / travel;
    const angle = Math.atan2(vy, vx);
    Particles.spawn({
      x: ox, y: oy, vx, vy, life: travel + 1,
      size: 18, angle, phase: 0.8,
      color: c.deep, core: c.core, soft: c.soft,
      type: 'darkRibbon'
    });
    Particles.spawn({
      x: ox, y: oy, vx, vy, life: travel + 1,
      size: 10.5, angle, color: c.bright,
      core: c.core, soft: c.magenta,
      type: 'darkbolt', emitTrail: true
    });
    Particles.spawn({
      x: ox, y: oy, life: 5, size: 31, angle,
      color: c.bright, core: c.core, soft: c.magenta,
      type: 'darkCharge'
    });
    const groundY = data.groundY === undefined ? data.ty + 52 : data.groundY;
    const len = Math.max(80, Math.abs(data.tx - ox) * 0.86);
    Particles.spawn({
      x: (ox + data.tx) * 0.5, y: groundY,
      life: travel + 14, size: 3.2, width: len,
      angle: data.tx < ox ? Math.PI : 0,
      color: c.core, type: 'darkGroundStreak', layer: 'behind'
    });
    Particles.burst(ox, oy, 12, i => ({
      x: ox + U.rand(-7, 7), y: oy + U.rand(-10, 10),
      vx: -Math.cos(angle) * U.rand(1.7, 4.2) + U.rand(-0.25, 0.25),
      vy: -Math.sin(angle) * U.rand(1.7, 4.2) + U.rand(-0.7, 0.7),
      drag: 0.92, life: 12 + (i % 6), size: U.rand(1.4, 2.8),
      angle: U.rand(0, Math.PI * 2), spin: U.rand(-0.2, 0.2),
      color: c.void, core: i % 3 === 0 ? c.magenta : c.deep,
      type: 'darkShard'
    }));
  },

  // F19-F27: clarão branco, energia desenrolada em espirais e estilhaços.
  impact(data) {
    const c = VFX.profile('dark');
    const heavy = !!data.heavy;
    const size = heavy ? 58 : 49;
    Particles.spawn({
      x: data.x, y: data.y, life: 9, size,
      color: c.bright, core: c.core, soft: c.magenta,
      type: 'darkDetonation'
    });
    Particles.spawn({
      x: data.x, y: data.y, life: 17, size: heavy ? 57 : 48,
      color: c.bright, spin: 0.22, angle: 0.3,
      type: 'darkSpiral'
    });
    Particles.spawn({
      x: data.x, y: data.y, life: 19, size: heavy ? 49 : 42,
      color: c.magenta, spin: -0.18, angle: 2.2,
      type: 'darkSpiral'
    });
    Particles.spawn({
      x: data.x, y: data.y, life: 16, size: heavy ? 21 : 17,
      color: c.core, type: 'ring'
    });
    Particles.spawn({
      x: data.x - 68, y: data.groundY === undefined ? data.y + 52 : data.groundY,
      life: 18, size: 3.8, width: heavy ? 190 : 160,
      color: c.core, type: 'darkGroundStreak', layer: 'behind'
    });
    const count = heavy ? 32 : 25;
    Particles.burst(data.x, data.y, count, i => {
      const a = i / count * Math.PI * 2 + U.rand(-0.15, 0.15);
      const speed = U.rand(2.3, heavy ? 7.4 : 6.2);
      return {
        x: data.x + U.rand(-5, 5), y: data.y + U.rand(-6, 6),
        vx: Math.cos(a) * speed, vy: Math.sin(a) * speed - U.rand(0.4, 1.8),
        grav: 0.055, drag: 0.95, life: U.rand(17, 30),
        size: i % 5 === 0 ? 4.1 : U.rand(1.6, 3.2),
        angle: a, spin: U.rand(-0.22, 0.22),
        color: c.void, core: i % 4 === 0 ? c.magenta : c.deep,
        type: 'darkShard'
      };
    });
    VFX.distortion(data.x, data.y, data.direction || 1, heavy ? 0.014 : 0.011);
  },

  // F28-F36: os anéis perdem coesão; restam fragmentos e brilho residual.
  dissipate(data) {
    const c = VFX.profile('dark');
    Particles.spawn({
      x: data.x, y: data.y, life: 9, size: 42,
      color: c.deep, spin: -0.11, angle: 1.4,
      type: 'darkSpiral'
    });
    Particles.burst(data.x, data.y, 9, i => ({
      x: data.x + U.rand(-36, 36), y: data.y + U.rand(-28, 28),
      vx: U.rand(-0.8, 0.8), vy: U.rand(-1.1, 0.45),
      grav: 0.04, drag: 0.92, life: 9 + (i % 3),
      size: U.rand(1.4, 2.8), angle: U.rand(0, Math.PI * 2),
      spin: U.rand(-0.12, 0.12), color: c.void, core: c.deep,
      type: 'darkShard'
    }));
    Particles.burst(data.x, data.y, 6, i => ({
      x: data.x + U.rand(-24, 24), y: data.y + U.rand(-18, 18),
      vx: U.rand(-0.45, 0.45), vy: U.rand(-0.7, 0.2),
      drag: 0.92, life: 9 + i, size: U.rand(2.2, 4.2),
      color: i % 2 ? c.magenta : c.bright, type: 'wisp'
    }));
  }
});

VFX.register('light', {
  barrier(data) {
    const holy = VFX.holy;
    VFX.resetWall();
    holy.active = true;
    holy.state = 'raise';
    holy.t = 0;
    holy.age = 0;
    holy.hitT = 0;
    holy.x = data.x;
    holy.y = data.y - 48;
    holy.radius = data.heavy ? 82 : 74;
    Particles.spawn({
      x: holy.x, y: holy.y, life: 14, size: holy.radius * 0.72,
      color: '#FFE87A', core: '#FFF6B0', type: 'holyFlash'
    });
    Particles.spawn({
      x: holy.x, y: holy.y, life: 22, size: holy.radius * 0.36,
      color: '#FFFFFF', type: 'ring', layer: 'behind'
    });
    Particles.burst(holy.x, holy.y, 18, i => {
      const a = i / 18 * Math.PI * 2;
      const speed = 1.1 + (i % 4) * 0.32;
      return {
        x: holy.x + Math.cos(a) * U.rand(4, 16),
        y: holy.y + Math.sin(a) * U.rand(4, 16),
        vx: Math.cos(a) * speed, vy: Math.sin(a) * speed,
        drag: 0.96, life: 18 + (i % 7), size: 2 + (i % 3) * 0.5,
        width: i % 4 === 0 ? 1.8 : 1.05,
        color: i % 3 === 0 ? '#FFFFFF' : '#FFE87A',
        core: '#FFFFFF', type: 'holyRay'
      };
    });
    Particles.burst(holy.x, holy.y + 20, 16, i => ({
      x: holy.x + U.rand(-holy.radius * 0.65, holy.radius * 0.65),
      y: holy.y + U.rand(-holy.radius * 0.4, holy.radius * 0.72),
      vx: U.rand(-0.28, 0.28), vy: U.rand(-1.45, -0.4),
      drag: 0.98, life: U.rand(28, 48), size: U.rand(1.2, 2.5),
      phase: i * 0.7, color: i % 4 === 0 ? '#FFFFFF' : '#FFE87A',
      core: '#FFFFFF', type: 'holyDust'
    }));
    VFX.distortion(holy.x, holy.y, 1, 0.0045);
  },

  hitBarrier(data) {
    const holy = VFX.holy;
    if (!holy.active) return;
    holy.hitT = 14;
    holy.hitX = data.x === undefined ? holy.x + holy.radius * 0.72 : data.x;
    holy.hitY = data.y === undefined ? holy.y : data.y;
    Particles.spawn({
      x: holy.hitX, y: holy.hitY, life: 9, size: 25,
      color: '#FFE87A', core: '#FFFFFF', type: 'holyFlash'
    });
    Particles.burst(holy.hitX, holy.hitY, 12, i => {
      const a = -1.1 + i / 11 * 2.2;
      const speed = U.rand(1.3, 3.2);
      return {
        x: holy.hitX, y: holy.hitY,
        vx: Math.cos(a) * speed, vy: Math.sin(a) * speed,
        drag: 0.94, life: U.rand(13, 23), size: U.rand(1.5, 2.7), width: 1.25,
        color: i % 3 === 0 ? '#FFFFFF' : '#FFD23A',
        core: '#FFFFFF', type: 'holyRay'
      };
    });
    VFX.distortion(holy.hitX, holy.hitY, -1, 0.004);
  },

  expireBarrier() {
    const holy = VFX.holy;
    if (!holy.active || holy.state === 'collapse') return;
    holy.state = 'collapse';
    holy.t = 0;
    Particles.burst(holy.x, holy.y, 12, i => ({
      x: holy.x + U.rand(-holy.radius * 0.72, holy.radius * 0.72),
      y: holy.y + U.rand(-holy.radius * 0.58, holy.radius * 0.58),
      vx: U.rand(-0.4, 0.4), vy: U.rand(-1.15, -0.2),
      drag: 0.96, life: 16 + (i % 8), size: U.rand(1.2, 2.4),
      phase: i, color: i % 3 === 0 ? '#FFFFFF' : '#FFE87A',
      core: '#FFFFFF', type: 'holyDust'
    }));
  }
});

VFX.register('wind', {
  prepare(data) {
    const c = VFX.profile('wind');
    const focusX = data.x + 12;
    const focusY = data.y - 48;
    const count = 12;
    for (let i = 0; i < count; i++) {
      const a = i / count * Math.PI * 2;
      const r = 26 + (i % 3) * 10;
      Particles.spawn({
        x: focusX + Math.cos(a) * r,
        y: focusY + Math.sin(a) * r * 0.78,
        sx: focusX + Math.cos(a) * r,
        sy: focusY + Math.sin(a) * r * 0.78,
        tx: focusX, ty: focusY,
        life: 14 - (i % 3),
        size: 1.5 + (i % 2) * 0.5,
        color: i % 2 ? c.bright : c.core,
        type: 'waterPull',
        layer: 'behind'
      });
    }
    Particles.spawn({
      x: focusX, y: focusY, life: 15, size: 28,
      color: c.bright, core: c.core, soft: c.soft,
      type: 'waterCharge',
      layer: 'behind'
    });
  },

  tornado(data) {
    const c = VFX.profile('wind');
    const x = data.x;
    const y = data.y;
    Particles.spawn({
      x, y, life: 25, size: 28,
      color: c.bright, core: c.core, soft: c.soft, type: 'tornado'
    });
    Particles.burst(x, y, 16, i => ({
      x: x + U.rand(-20, 20), y: y - U.rand(0, 10),
      vx: U.rand(-2.2, 2.2), vy: U.rand(-4.5, -1.8),
      grav: -0.015, drag: 0.95, life: U.rand(20, 36),
      size: U.rand(1.5, 3), color: i % 2 ? c.bright : c.core,
      type: 'spark'
    }));
    VFX.distortion(x, y - 60, 1, 0.0075);
  },

  impact(data) {
    const c = VFX.profile('wind');
    const heavy = !!data.heavy;
    const x = data.x;
    const y = data.y;
    Particles.spawn({
      x, y: y - 48, life: heavy ? 14 : 11, size: heavy ? 16 : 12,
      color: c.bright, type: 'ring'
    });
    Particles.burst(x, y - 48, heavy ? 24 : 18, i => {
      const a = U.rand(0, Math.PI * 2);
      const speed = U.rand(2.2, heavy ? 6.5 : 5.0);
      return {
        x: x + U.rand(-10, 10), y: y - 48 + U.rand(-10, 10),
        vx: Math.cos(a) * speed, vy: Math.sin(a) * speed,
        drag: 0.93, life: U.rand(12, 22), size: U.rand(1.5, 3),
        color: i % 2 ? c.bright : c.core, type: 'spark'
      };
    });
    Particles.burst(x, y - 48, heavy ? 8 : 6, () => ({
      x: x + U.rand(-15, 15), y: y - 48 + U.rand(-10, 10),
      vx: U.rand(-1.2, 1.2), vy: U.rand(-1.2, 1.2),
      life: U.rand(24, 38), size: U.rand(4.5, 9),
      color: c.soft, type: 'mist', drag: 0.95
    }));
  }
});

window.VFX = VFX;
