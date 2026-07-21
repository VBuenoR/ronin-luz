'use strict';

// Predador ambiental das Veias Afogadas. O sistema não participa de Enemies,
// não possui HP e só cria uma cápsula ofensiva durante o bote.
const LakeSerpentSystem = {
  VERSION: 1,

  DAMAGE: 25,
  TELEGRAPH_FRAMES: 54,
  LUNGE_FRAMES: 6,
  DIVE_FRAMES: 15,
  REVEAL_FRAMES: 30,

  // A serpente patrulha por toda a extensão das Veias Afogadas (de x=1700 até x=5330),
  // surgindo assim que o jogador entra na zona da caverna alagada.
  zone: { x1: 1700, y1: 1620, x2: 5330, y2: 2380 },
  waterClip: { x1: 1700, y1: 1620, x2: 5330, y2: 2380 },
  patrolBounds: { x1: 1920, y1: 1730, x2: 5110, y2: 2230 },
  attackBounds: { x1: 1740, y1: 1665, x2: 5290, y2: 2250 },

  state: 'hidden',
  stateT: 0,
  active: false,
  initialized: false,
  reentryGrace: 0,
  attackCd: 0,
  orbit: 0,
  orbitDir: 1,
  rngState: 0x51f15e7d,

  x: 2320,
  y: 1910,
  vx: 0,
  vy: 0,
  headAngle: Math.PI,
  bodyPhase: 0,

  targetX: 0,
  targetY: 0,
  launchX: 0,
  launchY: 0,
  lungeStartX: 0,
  lungeStartY: 0,
  lungeEndX: 0,
  lungeEndY: 0,
  dirX: -1,
  dirY: 0,
  hitResolved: false,
  impactTriggered: false,

  NODE_COUNT: 18,
  SEGMENT_LENGTH: 21,
  nodeX: new Float32Array(18),
  nodeY: new Float32Array(18),
  physX: new Float32Array(18),
  physY: new Float32Array(18),
  edgeLX: new Float32Array(18),
  edgeLY: new Float32Array(18),
  edgeRX: new Float32Array(18),
  edgeRY: new Float32Array(18),
  nodeWidth: new Float32Array(18),
  eyePos: new Float32Array(6),

  TRAIL_COUNT: 8,
  trailX: new Float32Array(8),
  trailY: new Float32Array(8),
  trailUsed: 0,
  trailAlpha: 0,

  RIPPLE_COUNT: 6,
  rippleActive: new Uint8Array(6),
  rippleX: new Float32Array(6),
  rippleY: new Float32Array(6),
  rippleAge: new Float32Array(6),
  rippleLife: new Float32Array(6),
  rippleSize: new Float32Array(6),
  rippleAngle: new Float32Array(6),
  ripplePurple: new Uint8Array(6),
  rippleCursor: 0,

  DROP_COUNT: 18,
  dropActive: new Uint8Array(18),
  dropX: new Float32Array(18),
  dropY: new Float32Array(18),
  dropVx: new Float32Array(18),
  dropVy: new Float32Array(18),
  dropGravity: new Float32Array(18),
  dropAge: new Float32Array(18),
  dropLife: new Float32Array(18),
  dropSize: new Float32Array(18),
  dropPurple: new Uint8Array(18),
  dropCursor: 0,

  MOTE_COUNT: 14,
  moteActive: new Uint8Array(14),
  moteX: new Float32Array(14),
  moteY: new Float32Array(14),
  moteVx: new Float32Array(14),
  moteVy: new Float32Array(14),
  moteAge: new Float32Array(14),
  moteLife: new Float32Array(14),
  moteSize: new Float32Array(14),
  moteCursor: 0,

  clamp(v, a, b) {
    return v < a ? a : v > b ? b : v;
  },

  lerp(a, b, t) {
    return a + (b - a) * t;
  },

  smoothstep(t) {
    t = this.clamp(t, 0, 1);
    return t * t * (3 - 2 * t);
  },

  turnToward(current, target, amount) {
    let delta = target - current;
    while (delta > Math.PI) delta -= Math.PI * 2;
    while (delta < -Math.PI) delta += Math.PI * 2;
    return current + delta * amount;
  },

  random() {
    this.rngState = (Math.imul(this.rngState, 1664525) + 1013904223) >>> 0;
    return this.rngState / 4294967296;
  },

  rand(a, b) {
    return a + (b - a) * this.random();
  },

  randFrames(a, b) {
    return Math.floor(this.rand(a, b + 1));
  },

  init(seed) {
    this.rngState = (seed === undefined ? 0x51f15e7d : seed) >>> 0;
    this.state = 'hidden';
    this.stateT = 0;
    this.active = false;
    this.reentryGrace = 0;
    this.attackCd = 0;
    this.orbit = this.random() * Math.PI * 2;
    this.orbitDir = this.random() < 0.5 ? -1 : 1;
    this.x = 2320;
    this.y = 1910;
    this.vx = 0;
    this.vy = 0;
    this.headAngle = Math.PI;
    this.bodyPhase = this.random() * Math.PI * 2;
    this.hitResolved = false;
    this.impactTriggered = false;
    this.trailUsed = 0;
    this.trailAlpha = 0;
    this.clearFx();
    this.seedBody(this.headAngle);
    this.initialized = true;
  },

  clearFx() {
    this.rippleActive.fill(0);
    this.dropActive.fill(0);
    this.moteActive.fill(0);
    this.rippleCursor = 0;
    this.dropCursor = 0;
    this.moteCursor = 0;
  },

  suspend(graceFrames) {
    this.active = false;
    this.state = 'hidden';
    this.stateT = 0;
    this.reentryGrace = Math.max(this.reentryGrace, graceFrames === undefined ? 150 : graceFrames);
    this.trailUsed = 0;
    this.trailAlpha = 0;
    this.vx = 0;
    this.vy = 0;
  },

  receiveDamage() {
    return false;
  },

  playerInTerritory(player) {
    if (!player || !player.inWater) return false;
    const py = player.y - (player.h || 34) * 0.5;
    return player.x >= this.zone.x1 && player.x <= this.zone.x2 &&
      py >= this.zone.y1 && py <= this.zone.y2;
  },

  canRun(player) {
    if (typeof World !== 'undefined' && World.current !== 'floresta') return false;
    if (typeof Game !== 'undefined') {
      if (Game.state && Game.state !== 'explore') return false;
      if (Game.wipe || Game.dialog) return false;
    }
    return this.playerInTerritory(player);
  },

  beginReveal(player) {
    const py = player.y - (player.h || 34) * 0.5;
    const side = player.x < 3515 ? 1 : -1;
    this.x = this.clamp(player.x + side * 285, this.patrolBounds.x1, this.patrolBounds.x2);
    this.y = this.clamp(py - 115, this.patrolBounds.y1, this.patrolBounds.y2);
    this.vx = 0;
    this.vy = 0;
    this.headAngle = Math.atan2(py - this.y, player.x - this.x);
    this.active = true;
    this.state = 'reveal';
    this.stateT = 0;
    this.attackCd = this.randFrames(180, 420);
    this.orbit = this.random() * Math.PI * 2;
    this.orbitDir = this.random() < 0.5 ? -1 : 1;
    this.trailUsed = 0;
    this.trailAlpha = 0;
    this.seedBody(this.headAngle);
    this.spawnRipple(this.x, this.y, 56, 42, 1, this.headAngle);
    for (let i = 0; i < 8; i++) this.spawnMote(this.x, this.y, 0.9);
  },

  beginTelegraph(player) {
    const py = player.y - (player.h || 34) * 0.5;
    this.targetX = this.clamp(player.x, this.attackBounds.x1, this.attackBounds.x2);
    this.targetY = this.clamp(py, this.attackBounds.y1, this.attackBounds.y2);
    let dx = this.targetX - this.x;
    let dy = this.targetY - this.y;
    let d = Math.hypot(dx, dy);
    if (d < 0.001) {
      dx = Math.cos(this.headAngle);
      dy = Math.sin(this.headAngle);
      d = 1;
    }
    this.dirX = dx / d;
    this.dirY = dy / d;
    this.launchX = this.x;
    this.launchY = this.y;
    this.state = 'telegraph';
    this.stateT = 0;
    this.vx *= 0.25;
    this.vy *= 0.25;
    this.spawnRipple(this.x, this.y, 44, 38, 1, this.headAngle);
    this.playTelegraphSfx();
  },

  beginLunge() {
    this.state = 'lunge';
    this.stateT = 0;
    this.lungeStartX = this.x;
    this.lungeStartY = this.y;
    let dx = this.targetX - this.lungeStartX;
    let dy = this.targetY - this.lungeStartY;
    let d = Math.hypot(dx, dy);
    if (d < 0.001) d = 1;
    this.dirX = dx / d;
    this.dirY = dy / d;
    // O overshoot precisa atravessar o alvo; limitar cada eixo separadamente
    // encurtava a diagonal e podia fazer o bote errar junto ao Portal de Fogo.
    this.lungeEndX = this.targetX + this.dirX * 160;
    this.lungeEndY = this.targetY + this.dirY * 160;
    this.headAngle = Math.atan2(this.dirY, this.dirX);
    this.hitResolved = false;
    this.impactTriggered = false;
    this.trailUsed = 1;
    this.trailX[0] = this.x;
    this.trailY[0] = this.y;
    this.trailAlpha = 1;
    this.playLungeSfx();
  },

  beginDive() {
    this.state = 'dive';
    this.stateT = 0;
    this.attackCd = this.randFrames(300, 900);
  },

  update(player) {
    if (!this.initialized) this.init();
    this.updateFx();

    if (!this.canRun(player)) {
      if (this.state !== 'hidden') this.suspend(120);
      return;
    }

    if (this.state === 'hidden') {
      if (this.reentryGrace > 0) {
        this.reentryGrace--;
        return;
      }
      this.beginReveal(player);
    }

    this.stateT++;

    if (this.state === 'reveal') {
      const q = this.stateT / this.REVEAL_FRAMES;
      if (this.attackCd > 0) this.attackCd--;
      this.orbit += this.orbitDir * 0.01;
      this.x += Math.cos(this.orbit) * 0.24;
      this.y += Math.sin(this.orbit * 1.7) * 0.16;
      if (this.stateT === 12) this.spawnRipple(this.x, this.y, 72, 46, 0, this.headAngle);
      if (q >= 1) {
        this.state = 'patrol';
        this.stateT = 0;
      }
    } else if (this.state === 'patrol') {
      this.updatePatrol(player);
      if (this.attackCd > 0) this.attackCd--;
      if (this.attackCd <= 0) this.beginTelegraph(player);
    } else if (this.state === 'telegraph') {
      this.updateTelegraph();
      if (this.stateT >= this.TELEGRAPH_FRAMES) this.beginLunge();
    } else if (this.state === 'lunge') {
      this.updateLunge(player);
    } else if (this.state === 'dive') {
      this.updateDive();
    }

    this.updateBody();

    // Check collision with any body node if active and not hidden
    if (this.active && this.state !== 'hidden' && player.invuln <= 0 && player.dashT <= 0) {
      const px = player.x;
      const py = player.y - (player.h || 34) * 0.5;
      for (let i = 0; i < this.NODE_COUNT; i++) {
        const nx = this.nodeX[i];
        const ny = this.nodeY[i];
        const radius = this.nodeWidth[i] + 10;
        const dx = px - nx;
        const dy = py - ny;
        if (dx * dx + dy * dy <= radius * radius) {
          this.applyBodyHit(player, nx, ny);
          break;
        }
      }
    }
  },

  updatePatrol(player) {
    this.orbit += this.orbitDir * 0.02;
    const py = player.y - (player.h || 34) * 0.5;
    const desiredX = this.clamp(player.x + Math.cos(this.orbit) * 230,
      this.patrolBounds.x1, this.patrolBounds.x2);
    const desiredY = this.clamp(py - 45 + Math.sin(this.orbit) * 85,
      this.patrolBounds.y1, this.patrolBounds.y2);
    this.vx = (this.vx + (desiredX - this.x) * 0.018) * 0.94;
    this.vy = (this.vy + (desiredY - this.y) * 0.018) * 0.94;
    const speed = Math.hypot(this.vx, this.vy);
    if (speed > 7.7) {
      this.vx *= 7.7 / speed;
      this.vy *= 7.7 / speed;
    }
    this.x = this.clamp(this.x + this.vx, this.patrolBounds.x1, this.patrolBounds.x2);
    this.y = this.clamp(this.y + this.vy, this.patrolBounds.y1, this.patrolBounds.y2);
    
    this.resolveSolidCollisions();

    if (speed > 0.08) {
      this.headAngle = this.turnToward(this.headAngle, Math.atan2(this.vy, this.vx), 0.24);
    }
    if ((this.stateT & 31) === 0) this.spawnMote(this.x, this.y, 0.42);
  },

  updateTelegraph() {
    const q = this.clamp(this.stateT / this.TELEGRAPH_FRAMES, 0, 1);
    const recoil = q * q * 12;
    this.x = this.lerp(this.x, this.launchX - this.dirX * recoil, 0.18);
    this.y = this.lerp(this.y, this.launchY - this.dirY * recoil, 0.18);
    this.headAngle = this.turnToward(this.headAngle, Math.atan2(this.dirY, this.dirX), 0.22);
    this.vx *= 0.8;
    this.vy *= 0.8;
    if (this.stateT === 14 || this.stateT === 31 || this.stateT === 45) {
      this.spawnRipple(this.x, this.y, 46 + q * 44, 34, 1, this.headAngle);
    }
    if ((this.stateT & 3) === 0) {
      this.spawnMote(this.x + this.rand(-34, 34), this.y + this.rand(-25, 25), 1.0 + q);
    }
  },

  updateLunge(player) {
    const oldX = this.x;
    const oldY = this.y;
    const q = this.clamp(this.stateT / this.LUNGE_FRAMES, 0, 1);
    const eased = this.smoothstep(q);
    this.x = this.lerp(this.lungeStartX, this.lungeEndX, eased);
    this.y = this.lerp(this.lungeStartY, this.lungeEndY, eased);
    this.vx = this.x - oldX;
    this.vy = this.y - oldY;
    this.headAngle = Math.atan2(this.dirY, this.dirX);
    this.pushTrail(this.x, this.y);

    // Colisão com estruturas durante o lunge
    let hitSolid = false;
    if (typeof World !== 'undefined') {
      const solids = World.solidList();
      const r = 22;
      const rect = { x: this.x - r, y: this.y - r, w: r * 2, h: r * 2 };
      for (const s of solids) {
        if (U.aabb(rect, s)) {
          hitSolid = true;
          // Afasta o centro de colisão da estrutura ligeiramente
          if (this.vx > 0) this.x = s.x - r;
          else if (this.vx < 0) this.x = s.x + s.w + r;
          if (this.vy > 0) this.y = s.y - r;
          else if (this.vy < 0) this.y = s.y + s.h + r;
          break;
        }
      }
    }

    this.spawnMote(this.x - this.dirX * 12 + this.rand(-5, 5),
      this.y - this.dirY * 12 + this.rand(-5, 5), 1.35);
    if ((this.stateT & 1) === 0) {
      const nx = -this.dirY;
      const ny = this.dirX;
      const side = (this.stateT & 2) === 0 ? -1 : 1;
      this.spawnDrop(this.x + nx * side * 13, this.y + ny * side * 13,
        -this.dirX * 0.7 + nx * side * this.rand(0.5, 1.4),
        -this.dirY * 0.7 + ny * side * this.rand(0.5, 1.4),
        0, 24, this.rand(1.3, 2.5), 0);
    }

    if (!this.hitResolved && this.sweptHit(player, oldX, oldY, this.x, this.y, 48)) {
      this.hitResolved = true;
      if (player.dashT > 0 || player.invuln > 0) {
        this.spawnRipple(player.x, player.y - (player.h || 34) * 0.5, 40, 24, 1, this.headAngle);
      } else {
        this.applyHit(player);
      }
    }

    if (this.stateT >= this.LUNGE_FRAMES || hitSolid) {
      if (!this.impactTriggered) {
        this.spawnImpact(this.x, this.y, true); // impacto pesado se bater
        this.shakeCamera(4.5);
        this.playSplashSfx();
        this.triggerDistortion(this.x, this.y, this.dirX, 0.004);
      }
      this.beginDive();
    }
  },

  updateDive() {
    const q = this.clamp(this.stateT / this.DIVE_FRAMES, 0, 1);
    if (this.attackCd > 0) this.attackCd--;
    this.x += this.dirX * (3.4 - q * 2.4) * 2.0;
    this.y = this.clamp(this.y + (1.3 + q * 2.2) * 2.0,
      this.attackBounds.y1, this.attackBounds.y2);
    this.vx *= 0.84;
    this.vy *= 0.84;
    
    this.resolveSolidCollisions();

    if (this.stateT === 8) this.spawnRipple(this.x, this.y, 58, 38, 0, this.headAngle);
    if (this.stateT % 5 === 0) this.spawnMote(this.x, this.y, 0.5);
    if (this.stateT >= this.DIVE_FRAMES) {
      this.state = 'patrol';
      this.stateT = 0;
      this.x = this.clamp(this.x, this.patrolBounds.x1, this.patrolBounds.x2);
      this.y = this.clamp(this.y, this.patrolBounds.y1, this.patrolBounds.y2);
      this.vx = 0;
      this.vy = 0;
      this.trailUsed = 0;
    }
  },

  sweptHit(player, ax, ay, bx, by, radius) {
    if (!player) return false;
    const px = player.x;
    const py = player.y - (player.h || 34) * 0.5;
    const abx = bx - ax;
    const aby = by - ay;
    const len2 = abx * abx + aby * aby;
    let t = len2 > 0.0001 ? ((px - ax) * abx + (py - ay) * aby) / len2 : 0;
    t = this.clamp(t, 0, 1);
    const dx = px - (ax + abx * t);
    const dy = py - (ay + aby * t);
    return dx * dx + dy * dy <= radius * radius;
  },

  applyHit(player) {
    const hp = Number.isFinite(player.hp) ? player.hp : 1;
    const scale = 1 + (player.level - 1) * 0.15;
    const currentDamage = Math.round(this.DAMAGE * scale);
    if (!Game.developerMode) player.hp = Math.max(0, hp - currentDamage);
    player.invuln = Math.max(player.invuln || 0, 75);
    player.vx = this.dirX * 5.2;
    player.vy = this.dirY * 3.8 - 1.2;
    if ('steerLock' in player) player.steerLock = Math.max(player.steerLock || 0, 8);
    this.impactTriggered = true;
    this.spawnImpact(player.x, player.y - (player.h || 34) * 0.5, true);
    this.shakeCamera(7);
    this.playHitSfx();
    this.triggerDistortion(player.x, player.y - (player.h || 34) * 0.5,
      this.dirX, 0.0032);
  },

  applyBodyHit(player, nx, ny) {
    const hp = Number.isFinite(player.hp) ? player.hp : 1;
    const scale = 1 + (player.level - 1) * 0.15;
    const currentDamage = Math.round(this.DAMAGE * scale);
    if (!Game.developerMode) player.hp = Math.max(0, hp - currentDamage);
    player.invuln = Math.max(player.invuln || 0, 75);
    
    // Knockback em direção oposta ao nó
    let kx = player.x - nx;
    let ky = (player.y - (player.h || 34) * 0.5) - ny;
    let dist = Math.hypot(kx, ky) || 1;
    player.vx = (kx / dist) * 5.2;
    player.vy = (ky / dist) * 3.8 - 1.2;
    
    if ('steerLock' in player) player.steerLock = Math.max(player.steerLock || 0, 8);
    this.spawnImpact(player.x, player.y - (player.h || 34) * 0.5, true);
    this.shakeCamera(7);
    this.playHitSfx();
    this.triggerDistortion(player.x, player.y - (player.h || 34) * 0.5,
      kx / dist, 0.0032);
  },

  resolveSolidCollisions() {
    if (typeof World === 'undefined') return;
    const solids = World.solidList();
    const r = 20; // raio de colisão da cabeça
    
    // Verifica eixo X
    let rect = { x: this.x - r, y: this.y - r, w: r * 2, h: r * 2 };
    for (const s of solids) {
      if (U.aabb(rect, s)) {
        if (this.vx > 0) {
          this.x = s.x - r;
          this.vx = -this.vx * 0.5;
        } else if (this.vx < 0) {
          this.x = s.x + s.w + r;
          this.vx = -this.vx * 0.5;
        }
        this.spawnImpact(this.x, this.y, false);
        break;
      }
    }
    
    // Verifica eixo Y
    rect = { x: this.x - r, y: this.y - r, w: r * 2, h: r * 2 };
    for (const s of solids) {
      if (U.aabb(rect, s)) {
        if (this.vy > 0) {
          this.y = s.y - r;
          this.vy = -this.vy * 0.5;
        } else if (this.vy < 0) {
          this.y = s.y + s.h + r;
          this.vy = -this.vy * 0.5;
        }
        this.spawnImpact(this.x, this.y, false);
        break;
      }
    }
  },

  seedBody(angle) {
    const dx = Math.cos(angle);
    const dy = Math.sin(angle);
    const nx = -dy;
    const ny = dx;
    for (let i = 0; i < this.NODE_COUNT; i++) {
      this.physX[i] = this.x - dx * i * this.SEGMENT_LENGTH;
      this.physY[i] = this.y - dy * i * this.SEGMENT_LENGTH;
      
      const wave = Math.sin(this.bodyPhase - i * 0.68) * (4 + i * 0.28);
      this.nodeX[i] = this.physX[i] + nx * wave;
      this.nodeY[i] = this.physY[i] + ny * wave;
    }
    this.updateEdges();
  },

  updateBody() {
    let waveAmp = 11;
    let phaseSpeed = 0.11;
    if (this.state === 'telegraph') {
      const q = this.clamp(this.stateT / this.TELEGRAPH_FRAMES, 0, 1);
      waveAmp = 14 + q * 9;
      phaseSpeed = 0.2 + q * 0.16;
    } else if (this.state === 'lunge') {
      waveAmp = 4.5;
      phaseSpeed = 0.24;
    } else if (this.state === 'dive') {
      waveAmp = 14;
      phaseSpeed = 0.18;
    } else if (this.state === 'reveal') {
      waveAmp = 8;
      phaseSpeed = 0.09;
    }
    this.bodyPhase += phaseSpeed;

    // 1. Física de Corda (Seguimento de Rastro): cada nó segue o nó anterior mantendo SEGMENT_LENGTH de distância
    this.physX[0] = this.x;
    this.physY[0] = this.y;
    for (let i = 1; i < this.NODE_COUNT; i++) {
      let dx = this.physX[i] - this.physX[i-1];
      let dy = this.physY[i] - this.physY[i-1];
      let dist = Math.hypot(dx, dy);
      if (dist === 0) {
        dx = -Math.cos(this.headAngle);
        dy = -Math.sin(this.headAngle);
        dist = 1;
      }
      this.physX[i] = this.physX[i-1] + (dx / dist) * this.SEGMENT_LENGTH;
      this.physY[i] = this.physY[i-1] + (dy / dist) * this.SEGMENT_LENGTH;
    }

    // 2. Ondulação Senoidal Visual: projeta o movimento sinuoso de nado perpendicularmente aos segmentos da corda
    this.nodeX[0] = this.x;
    this.nodeY[0] = this.y;
    for (let i = 1; i < this.NODE_COUNT; i++) {
      const prev = i - 1;
      const next = i < this.NODE_COUNT - 1 ? i + 1 : i;
      let tx = this.physX[next] - this.physX[prev];
      let ty = this.physY[next] - this.physY[prev];
      let d = Math.hypot(tx, ty);
      if (d < 0.001) d = 1;
      tx /= d;
      ty /= d;
      
      const nx = -ty;
      const ny = tx;
      const t = i / (this.NODE_COUNT - 1);
      const wave = Math.sin(this.bodyPhase - i * 0.68) * waveAmp * (0.42 + t * 0.74);
      
      this.nodeX[i] = this.physX[i] + nx * wave;
      this.nodeY[i] = this.physY[i] + ny * wave;
    }

    this.updateEdges();

    if (this.state === 'lunge') this.trailAlpha = 1;
    else this.trailAlpha = Math.max(0, this.trailAlpha - 0.055);
  },

  updateEdges() {
    const last = this.NODE_COUNT - 1;
    for (let i = 0; i < this.NODE_COUNT; i++) {
      const prev = i > 0 ? i - 1 : i;
      const next = i < last ? i + 1 : i;
      let tx = this.nodeX[next] - this.nodeX[prev];
      let ty = this.nodeY[next] - this.nodeY[prev];
      let d = Math.hypot(tx, ty);
      if (d < 0.001) d = 1;
      tx /= d;
      ty /= d;
      const nx = -ty;
      const ny = tx;
      const t = i / last;
      let width = 3 + 27 * Math.pow(1 - t, 0.72);
      if (i === 0) width = 23;
      this.nodeWidth[i] = width;
      this.edgeLX[i] = this.nodeX[i] + nx * width;
      this.edgeLY[i] = this.nodeY[i] + ny * width;
      this.edgeRX[i] = this.nodeX[i] - nx * width;
      this.edgeRY[i] = this.nodeY[i] - ny * width;
    }
  },

  pushTrail(x, y) {
    for (let i = this.TRAIL_COUNT - 1; i > 0; i--) {
      this.trailX[i] = this.trailX[i - 1];
      this.trailY[i] = this.trailY[i - 1];
    }
    this.trailX[0] = x;
    this.trailY[0] = y;
    if (this.trailUsed < this.TRAIL_COUNT) this.trailUsed++;
  },

  spawnRipple(x, y, size, life, purple, angle) {
    const i = this.rippleCursor++ % this.RIPPLE_COUNT;
    this.rippleActive[i] = 1;
    this.rippleX[i] = x;
    this.rippleY[i] = y;
    this.rippleAge[i] = 0;
    this.rippleLife[i] = life;
    this.rippleSize[i] = size;
    this.ripplePurple[i] = purple ? 1 : 0;
    this.rippleAngle[i] = angle || 0;
  },

  spawnDrop(x, y, vx, vy, gravity, life, size, purple) {
    const i = this.dropCursor++ % this.DROP_COUNT;
    this.dropActive[i] = 1;
    this.dropX[i] = x;
    this.dropY[i] = y;
    this.dropVx[i] = vx;
    this.dropVy[i] = vy;
    this.dropGravity[i] = gravity;
    this.dropAge[i] = 0;
    this.dropLife[i] = life;
    this.dropSize[i] = size;
    this.dropPurple[i] = purple ? 1 : 0;
  },

  spawnMote(x, y, energy) {
    const i = this.moteCursor++ % this.MOTE_COUNT;
    const a = this.random() * Math.PI * 2;
    const speed = this.rand(0.12, 0.62) * energy;
    this.moteActive[i] = 1;
    this.moteX[i] = x + this.rand(-7, 7);
    this.moteY[i] = y + this.rand(-7, 7);
    this.moteVx[i] = Math.cos(a) * speed;
    this.moteVy[i] = Math.sin(a) * speed;
    this.moteAge[i] = 0;
    this.moteLife[i] = this.rand(24, 46);
    this.moteSize[i] = this.rand(1.1, 2.5);
  },

  spawnImpact(x, y, heavy) {
    this.spawnRipple(x, y, heavy ? 92 : 72, heavy ? 40 : 34, 1, this.headAngle);
    this.spawnRipple(x, y, heavy ? 64 : 48, heavy ? 30 : 26, 0, this.headAngle + 0.55);
    const nx = -this.dirY;
    const ny = this.dirX;
    const drops = heavy ? 16 : 11;
    for (let i = 0; i < drops; i++) {
      const side = i & 1 ? -1 : 1;
      const lateral = this.rand(0.7, heavy ? 3.3 : 2.5) * side;
      this.spawnDrop(x + nx * this.rand(-9, 9), y + ny * this.rand(-9, 9),
        this.dirX * this.rand(0.1, 1.2) + nx * lateral,
        this.dirY * this.rand(0.1, 1.2) + ny * lateral,
        0.012, this.rand(20, 38), this.rand(1.4, 3.2), i % 4 === 0);
    }
    const motes = heavy ? 10 : 7;
    for (let i = 0; i < motes; i++) this.spawnMote(x, y, heavy ? 1.8 : 1.15);
  },

  updateFx() {
    for (let i = 0; i < this.RIPPLE_COUNT; i++) {
      if (!this.rippleActive[i]) continue;
      this.rippleAge[i]++;
      if (this.rippleAge[i] >= this.rippleLife[i]) this.rippleActive[i] = 0;
    }
    for (let i = 0; i < this.DROP_COUNT; i++) {
      if (!this.dropActive[i]) continue;
      this.dropAge[i]++;
      if (this.dropAge[i] >= this.dropLife[i]) {
        this.dropActive[i] = 0;
        continue;
      }
      this.dropX[i] += this.dropVx[i];
      this.dropY[i] += this.dropVy[i];
      this.dropVy[i] += this.dropGravity[i];
      this.dropVx[i] *= 0.965;
      this.dropVy[i] *= 0.965;
    }
    for (let i = 0; i < this.MOTE_COUNT; i++) {
      if (!this.moteActive[i]) continue;
      this.moteAge[i]++;
      if (this.moteAge[i] >= this.moteLife[i]) {
        this.moteActive[i] = 0;
        continue;
      }
      this.moteX[i] += this.moteVx[i];
      this.moteY[i] += this.moteVy[i];
      this.moteVx[i] *= 0.975;
      this.moteVy[i] *= 0.975;
    }
  },

  bodyAlpha() {
    if (this.state === 'reveal') return 0.08 + 0.42 * this.clamp(this.stateT / this.REVEAL_FRAMES, 0, 1);
    if (this.state === 'telegraph') return 0.54 + 0.18 * this.clamp(this.stateT / this.TELEGRAPH_FRAMES, 0, 1);
    if (this.state === 'lunge') return 0.82;
    if (this.state === 'dive') return 0.72 * (1 - this.clamp(this.stateT / this.DIVE_FRAMES, 0, 1)) + 0.05;
    return 0.32 + Math.sin(this.bodyPhase * 0.42) * 0.06;
  },

  emissiveAlpha() {
    if (this.state === 'reveal') return 0.25 + 0.5 * this.clamp(this.stateT / this.REVEAL_FRAMES, 0, 1);
    if (this.state === 'telegraph') return 0.58 + 0.42 * this.clamp(this.stateT / this.TELEGRAPH_FRAMES, 0, 1);
    if (this.state === 'lunge') return 1;
    if (this.state === 'dive') return 0.78 * (1 - this.clamp(this.stateT / this.DIVE_FRAMES, 0, 1)) + 0.18;
    return 0.54 + Math.sin(this.bodyPhase * 0.7) * 0.1;
  },

  eyeRadius() {
    if (this.state === 'telegraph') {
      return 16 + 22 * this.smoothstep(this.stateT / this.TELEGRAPH_FRAMES);
    }
    if (this.state === 'lunge') return 32;
    if (this.state === 'reveal') return 12 + 7 * this.clamp(this.stateT / this.REVEAL_FRAMES, 0, 1);
    if (this.state === 'dive') return 18 * (1 - this.clamp(this.stateT / this.DIVE_FRAMES, 0, 1)) + 8;
    return 17 + Math.sin(this.bodyPhase * 0.8) * 2;
  },

  isDrawable(cam, pad) {
    if (!this.active || this.state === 'hidden') return false;
    if (typeof World !== 'undefined' && World.current !== 'floresta') return false;
    pad = pad === undefined ? 430 : pad;
    return this.x >= cam.x - pad && this.x <= cam.x + 960 + pad &&
      this.y >= cam.y - pad && this.y <= cam.y + 540 + pad;
  },

  beginWaterClip(ctx, cam) {
    const clip = this.waterClip;
    ctx.save();
    ctx.beginPath();
    ctx.rect(clip.x1 - cam.x, clip.y1 - cam.y,
      clip.x2 - clip.x1, clip.y2 - clip.y1);
    ctx.clip();
  },

  drawBody(ctx, cam, frames) {
    if (!this.isDrawable(cam)) return;
    const alpha = this.bodyAlpha();
    this.beginWaterClip(ctx, cam);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = '#061019';
    ctx.strokeStyle = 'rgba(20,40,58,0.86)';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(this.edgeLX[0] - cam.x, this.edgeLY[0] - cam.y);
    for (let i = 1; i < this.NODE_COUNT; i++) {
      ctx.lineTo(this.edgeLX[i] - cam.x, this.edgeLY[i] - cam.y);
    }
    for (let i = this.NODE_COUNT - 1; i >= 0; i--) {
      ctx.lineTo(this.edgeRX[i] - cam.x, this.edgeRY[i] - cam.y);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    const hx = this.x - cam.x;
    const hy = this.y - cam.y;
    ctx.globalAlpha = Math.min(1, alpha * 1.12);
    ctx.fillStyle = '#091622';
    ctx.beginPath();
    ctx.ellipse(hx, hy, 31, 22, this.headAngle, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Reflexos em ilhas, para sugerir que trechos diferentes atravessam a névoa.
    ctx.globalAlpha = alpha * 0.42;
    ctx.strokeStyle = 'rgba(66,106,132,0.72)';
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    const shift = Math.floor((frames || 0) * 0.015) % 5;
    for (let band = 0; band < 3; band++) {
      const start = 2 + ((shift + band * 5) % 12);
      const end = Math.min(this.NODE_COUNT - 1, start + 2);
      ctx.beginPath();
      ctx.moveTo(this.nodeX[start] - cam.x, this.nodeY[start] - cam.y);
      for (let i = start + 1; i <= end; i++) {
        ctx.lineTo(this.nodeX[i] - cam.x, this.nodeY[i] - cam.y);
      }
      ctx.stroke();
    }
    ctx.lineCap = 'butt';
    ctx.restore();
  },

  traceStripeGroup(ctx, cam, group) {
    ctx.beginPath();
    for (let i = 2 + group * 2; i <= 14; i += 4) {
      let nx = this.edgeLX[i] - this.edgeRX[i];
      let ny = this.edgeLY[i] - this.edgeRY[i];
      let d = Math.hypot(nx, ny);
      if (d < 0.001) d = 1;
      nx /= d;
      ny /= d;
      const tx = -ny;
      const ty = nx;
      const half = this.nodeWidth[i] * 0.68;
      const cx = this.nodeX[i] - cam.x;
      const cy = this.nodeY[i] - cam.y;
      ctx.moveTo(cx - nx * half, cy - ny * half);
      ctx.quadraticCurveTo(cx + tx * 4, cy + ty * 4, cx + nx * half, cy + ny * half);
    }
  },

  eyePositions(cam) {
    const dx = Math.cos(this.headAngle);
    const dy = Math.sin(this.headAngle);
    const nx = -dy;
    const ny = dx;
    const hx = this.x - cam.x + dx * 13;
    const hy = this.y - cam.y + dy * 13;
    const eyes = this.eyePos;
    eyes[0] = hx + nx * 5.2;
    eyes[1] = hy + ny * 5.2;
    eyes[2] = hx - nx * 5.2;
    eyes[3] = hy - ny * 5.2;
    eyes[4] = hx;
    eyes[5] = hy;
    return eyes;
  },

  drawEmissive(ctx, cam, frames) {
    if (!this.isDrawable(cam)) return;
    const alpha = this.emissiveAlpha();
    const pulseSpeed = this.state === 'telegraph' ? 0.18 : 0.05;
    this.beginWaterClip(ctx, cam);
    ctx.globalCompositeOperation = 'lighter';

    for (let group = 0; group < 2; group++) {
      const pulse = 0.66 + 0.34 * Math.sin((frames || 0) * pulseSpeed + group * 1.8);
      ctx.globalAlpha = alpha * pulse * 0.68;
      ctx.strokeStyle = this.state === 'telegraph' ? '#D56CFF' : '#8D56FF';
      ctx.lineWidth = 4.8;
      ctx.lineCap = 'round';
      this.traceStripeGroup(ctx, cam, group);
      ctx.stroke();
      ctx.globalAlpha = alpha * pulse * 0.92;
      ctx.strokeStyle = '#E8D8FF';
      ctx.lineWidth = 1.05;
      this.traceStripeGroup(ctx, cam, group);
      ctx.stroke();
    }

    const eyes = this.eyePositions(cam);
    const radius = this.eyeRadius();
    const glow = ctx.createRadialGradient(eyes[4], eyes[5], 0, eyes[4], eyes[5], radius);
    glow.addColorStop(0, `rgba(242,232,255,${Math.min(1, alpha)})`);
    glow.addColorStop(0.24, `rgba(185,137,255,${alpha * 0.72})`);
    glow.addColorStop(1, 'rgba(112,67,217,0)');
    ctx.globalAlpha = 1;
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(eyes[4], eyes[5], radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#F2E8FF';
    ctx.globalAlpha = Math.min(1, alpha * 1.2);
    ctx.beginPath();
    ctx.ellipse(eyes[0], eyes[1], 4.2, 1.55, this.headAngle, 0, Math.PI * 2);
    ctx.ellipse(eyes[2], eyes[3], 4.2, 1.55, this.headAngle, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineCap = 'butt';
    ctx.restore();
  },

  drawSurfaceFx(ctx, cam, frames) {
    if (typeof World !== 'undefined' && World.current !== 'floresta') return;
    this.beginWaterClip(ctx, cam);
    ctx.globalCompositeOperation = 'lighter';

    if (this.active && this.state === 'telegraph') {
      const q = this.clamp(this.stateT / this.TELEGRAPH_FRAMES, 0, 1);
      const hx = this.x - cam.x;
      const hy = this.y - cam.y;
      const reach = 60 + q * 54;
      const nx = -this.dirY;
      const ny = this.dirX;
      ctx.globalAlpha = 0.05 + q * 0.11;
      ctx.fillStyle = '#9a74ff';
      ctx.beginPath();
      ctx.moveTo(hx + nx * 12, hy + ny * 12);
      ctx.lineTo(hx + this.dirX * reach, hy + this.dirY * reach);
      ctx.lineTo(hx - nx * 12, hy - ny * 12);
      ctx.closePath();
      ctx.fill();
    }

    if (this.trailUsed > 1 && this.trailAlpha > 0.01) {
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(this.trailX[this.trailUsed - 1] - cam.x, this.trailY[this.trailUsed - 1] - cam.y);
      for (let i = this.trailUsed - 2; i >= 0; i--) {
        ctx.lineTo(this.trailX[i] - cam.x, this.trailY[i] - cam.y);
      }
      ctx.globalAlpha = this.trailAlpha * 0.22;
      ctx.strokeStyle = '#6d46db';
      ctx.lineWidth = 17;
      ctx.stroke();
      ctx.globalAlpha = this.trailAlpha * 0.64;
      ctx.strokeStyle = '#bd94ff';
      ctx.lineWidth = 3.2;
      ctx.stroke();

      const nx = -this.dirY;
      const ny = this.dirX;
      for (let side = -1; side <= 1; side += 2) {
        ctx.beginPath();
        ctx.moveTo(this.trailX[this.trailUsed - 1] - cam.x + nx * side * 10,
          this.trailY[this.trailUsed - 1] - cam.y + ny * side * 10);
        for (let i = this.trailUsed - 2; i >= 0; i--) {
          ctx.lineTo(this.trailX[i] - cam.x + nx * side * 10,
            this.trailY[i] - cam.y + ny * side * 10);
        }
        ctx.globalAlpha = this.trailAlpha * 0.25;
        ctx.strokeStyle = '#a9ddf2';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
      ctx.lineCap = 'butt';
      ctx.lineJoin = 'miter';
    }

    for (let i = 0; i < this.RIPPLE_COUNT; i++) {
      if (!this.rippleActive[i]) continue;
      const q = this.rippleAge[i] / this.rippleLife[i];
      const r = 5 + this.rippleSize[i] * this.smoothstep(q);
      const alpha = (1 - q) * (this.ripplePurple[i] ? 0.72 : 0.46);
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = this.ripplePurple[i] ? '#b989ff' : '#a9ddf2';
      ctx.lineWidth = Math.max(0.7, 2.1 * (1 - q));
      ctx.beginPath();
      ctx.ellipse(this.rippleX[i] - cam.x, this.rippleY[i] - cam.y,
        r, r * 0.36, this.rippleAngle[i], 0, Math.PI * 2);
      ctx.stroke();
    }

    for (let i = 0; i < this.DROP_COUNT; i++) {
      if (!this.dropActive[i]) continue;
      const q = this.dropAge[i] / this.dropLife[i];
      ctx.globalAlpha = (1 - q) * (this.dropPurple[i] ? 0.86 : 0.62);
      ctx.fillStyle = this.dropPurple[i] ? '#b989ff' : '#c5efff';
      ctx.beginPath();
      ctx.ellipse(this.dropX[i] - cam.x, this.dropY[i] - cam.y,
        this.dropSize[i] * (1 - q * 0.35), this.dropSize[i] * 0.55,
        Math.atan2(this.dropVy[i], this.dropVx[i]), 0, Math.PI * 2);
      ctx.fill();
    }

    for (let i = 0; i < this.MOTE_COUNT; i++) {
      if (!this.moteActive[i]) continue;
      const q = this.moteAge[i] / this.moteLife[i];
      ctx.globalAlpha = (1 - q) * 0.74;
      ctx.fillStyle = i % 3 === 0 ? '#eadfff' : '#9a68ef';
      ctx.beginPath();
      ctx.arc(this.moteX[i] - cam.x, this.moteY[i] - cam.y,
        this.moteSize[i] * (1 - q * 0.3), 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  },

  drawCore(ctx, cam) {
    if (!this.isDrawable(cam)) return;
    const alpha = this.emissiveAlpha();
    this.beginWaterClip(ctx, cam);
    ctx.globalCompositeOperation = 'lighter';
    const eyes = this.eyePositions(cam);
    ctx.globalAlpha = Math.min(1, 0.58 + alpha * 0.42);
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(eyes[0], eyes[1], 2.5, 0.82, this.headAngle, 0, Math.PI * 2);
    ctx.ellipse(eyes[2], eyes[3], 2.5, 0.82, this.headAngle, 0, Math.PI * 2);
    ctx.fill();

    ctx.globalAlpha = this.state === 'telegraph' || this.state === 'lunge' ? alpha * 0.82 : alpha * 0.46;
    ctx.strokeStyle = '#f4eaff';
    ctx.lineWidth = 0.72;
    ctx.lineCap = 'round';
    ctx.beginPath();
    for (let i = 2; i <= 12; i += 4) {
      let nx = this.edgeLX[i] - this.edgeRX[i];
      let ny = this.edgeLY[i] - this.edgeRY[i];
      let d = Math.hypot(nx, ny);
      if (d < 0.001) d = 1;
      nx /= d;
      ny /= d;
      const half = this.nodeWidth[i] * 0.5;
      const cx = this.nodeX[i] - cam.x;
      const cy = this.nodeY[i] - cam.y;
      ctx.moveTo(cx - nx * half, cy - ny * half);
      ctx.lineTo(cx + nx * half, cy + ny * half);
    }
    ctx.stroke();
    ctx.restore();
  },

  // Callback sem alocação:
  // fn(worldX, worldY, cutoutRadius, cutoutIntensity,
  //    rgbString, glowRadius, glowAlpha)
  forEachLight(fn) {
    if (typeof fn !== 'function' || !this.active || this.state === 'hidden') return;
    if (typeof World !== 'undefined' && World.current !== 'floresta') return;
    let radius = 46;
    let intensity = 0.38;
    let glowRadius = 48;
    let glowAlpha = 0.13;
    if (this.state === 'telegraph') {
      const q = this.smoothstep(this.stateT / this.TELEGRAPH_FRAMES);
      radius = 52 + q * 58;
      intensity = 0.42 + q * 0.4;
      glowRadius = 58 + q * 58;
      glowAlpha = 0.14 + q * 0.16;
    } else if (this.state === 'lunge') {
      radius = 92;
      intensity = 0.78;
      glowRadius = 105;
      glowAlpha = 0.27;
    } else if (this.state === 'dive') {
      const fade = 1 - this.clamp(this.stateT / this.DIVE_FRAMES, 0, 1);
      radius = 30 + fade * 28;
      intensity = 0.2 + fade * 0.36;
      glowRadius = 34 + fade * 36;
      glowAlpha = 0.06 + fade * 0.12;
    } else if (this.state === 'reveal') {
      const q = this.clamp(this.stateT / this.REVEAL_FRAMES, 0, 1);
      radius = 30 + q * 20;
      intensity = 0.2 + q * 0.22;
      glowRadius = 34 + q * 20;
      glowAlpha = 0.06 + q * 0.08;
    }
    fn(this.x, this.y, radius, intensity, '145,74,255', glowRadius, glowAlpha);
  },

  shakeCamera(amount) {
    if (typeof Game !== 'undefined' && Game.cam) {
      Game.cam.shake = Math.max(Game.cam.shake || 0, amount);
    }
  },

  triggerDistortion(worldX, worldY, direction, strength) {
    if (typeof Game === 'undefined' || !Game.cam) return;
    const sx = worldX - Game.cam.x;
    const sy = worldY - Game.cam.y;
    if (typeof VFX !== 'undefined' && VFX && typeof VFX.distortion === 'function') {
      VFX.distortion(sx, sy, direction < 0 ? -1 : 1, strength);
    } else if (typeof PostProcessor !== 'undefined' &&
               PostProcessor && typeof PostProcessor.triggerDistortion === 'function') {
      if (sx < 0 || sx > 960 || sy < 0 || sy > 540) return;
      PostProcessor.triggerDistortion(sx / 960,
        1 - sy / 540, direction < 0 ? -1 : 1, strength);
    }
  },

  playTelegraphSfx() {
    if (typeof Sfx === 'undefined' || !Sfx) return;
    if (typeof Sfx.lakeSerpentTelegraph === 'function') Sfx.lakeSerpentTelegraph();
    else if (typeof Sfx.charge === 'function') Sfx.charge();
    else if (typeof Sfx.tone === 'function') {
      Sfx.tone({ f: 88, f2: 210, dur: 0.8, type: 'sine', vol: 0.12 });
    }
  },

  playLungeSfx() {
    if (typeof Sfx === 'undefined' || !Sfx) return;
    if (typeof Sfx.lakeSerpentLunge === 'function') Sfx.lakeSerpentLunge();
    else {
      if (typeof Sfx.splash === 'function') Sfx.splash();
      if (typeof Sfx.tone === 'function') {
        Sfx.tone({ f: 520, f2: 72, dur: 0.2, type: 'sawtooth', vol: 0.11 });
      }
    }
  },

  playHitSfx() {
    if (typeof Sfx === 'undefined' || !Sfx) return;
    if (typeof Sfx.lakeSerpentHit === 'function') Sfx.lakeSerpentHit();
    else {
      if (typeof Sfx.hurt === 'function') Sfx.hurt();
      if (typeof Sfx.splash === 'function') Sfx.splash();
    }
  },

  playSplashSfx() {
    if (typeof Sfx === 'undefined' || !Sfx) return;
    if (typeof Sfx.lakeSerpentSplash === 'function') Sfx.lakeSerpentSplash();
    else if (typeof Sfx.splash === 'function') Sfx.splash();
  }
};

window.LakeSerpentSystem = LakeSerpentSystem;
