'use strict';

/**
 * BattleAtmosphere — "Uma pintura respirando"
 *
 * Módulo auto-contido que cuida de toda a composição atmosférica da cena de
 * batalha: colunas de luz orgânicas, névoa rasteira, corredor de foco
 * (chiaroscuro), reflexos no chão, partículas poéticas e variante vulcânica.
 *
 * Todas as animações usam tempo em **segundos** (acumulador interno).
 * Nenhuma dependência de contagem fixa de frames.
 */
const BattleAtmosphere = {

  // ───────────────────────────── estado ──────────────────────────────
  time: 0,            // acumulador de tempo em segundos
  env: 'forest',      // ambiente ativo
  isFire: false,      // atalho para env === 'lava'

  // posições dos combatentes (atualizadas externamente por battle.js)
  px: 280, py: 430,   // Rōnin
  ex: 680, ey: 430,   // inimigo

  // escuridão suavizada
  darknessCurrent: 0.60,
  darknessTarget:  0.60,

  // ────────────────────────── constantes ─────────────────────────────
  W: 960,
  H: 540,
  GROUND_Y: 408,

  // ──────────────────────── ruído hash-based ─────────────────────────

  /** Ruído de valor 2D (hash-based, período ~65536). */
  noise2d(x, y) {
    const ix = Math.floor(x), iy = Math.floor(y);
    const fx = x - ix, fy = y - iy;
    const sx = fx * fx * (3 - 2 * fx);
    const sy = fy * fy * (3 - 2 * fy);
    const h = this._hash;
    const n00 = h(ix, iy);
    const n10 = h(ix + 1, iy);
    const n01 = h(ix, iy + 1);
    const n11 = h(ix + 1, iy + 1);
    const nx0 = n00 + (n10 - n00) * sx;
    const nx1 = n01 + (n11 - n01) * sx;
    return nx0 + (nx1 - nx0) * sy;
  },

  /** Ruído de valor 3D (hash-based). */
  noise3d(x, y, z) {
    const iz = Math.floor(z), fz = z - iz;
    const sz = fz * fz * (3 - 2 * fz);
    // interpola duas fatias 2D
    const a = this._noise2dSeeded(x, y, iz);
    const b = this._noise2dSeeded(x, y, iz + 1);
    return a + (b - a) * sz;
  },

  /** Fatia 2D com semente Z para noise3d. */
  _noise2dSeeded(x, y, zSeed) {
    const ix = Math.floor(x), iy = Math.floor(y);
    const fx = x - ix, fy = y - iy;
    const sx = fx * fx * (3 - 2 * fx);
    const sy = fy * fy * (3 - 2 * fy);
    const h = this._hashZ;
    const n00 = h(ix, iy, zSeed);
    const n10 = h(ix + 1, iy, zSeed);
    const n01 = h(ix, iy + 1, zSeed);
    const n11 = h(ix + 1, iy + 1, zSeed);
    const nx0 = n00 + (n10 - n00) * sx;
    const nx1 = n01 + (n11 - n01) * sx;
    return nx0 + (nx1 - nx0) * sy;
  },

  /** Hash 2D → [0, 1]. */
  _hash(ix, iy) {
    let n = (ix * 374761393 + iy * 668265263 + 1013904223) | 0;
    n = ((n >> 13) ^ n) | 0;
    n = (n * (n * n * 15731 + 789221) + 1376312589) | 0;
    return (n & 0x7fffffff) / 0x7fffffff;
  },

  /** Hash 3D → [0, 1]. */
  _hashZ(ix, iy, iz) {
    let n = (ix * 374761393 + iy * 668265263 + iz * 1274126177 + 1013904223) | 0;
    n = ((n >> 13) ^ n) | 0;
    n = (n * (n * n * 15731 + 789221) + 1376312589) | 0;
    return (n & 0x7fffffff) / 0x7fffffff;
  },

  // ──────────────────────── utilitários math ─────────────────────────

  smoothstep(edge0, edge1, x) {
    const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
    return t * t * (3 - 2 * t);
  },

  /** Interpolação exponencial (suavização baseada em tempo real). */
  lerpExp(current, target, dt, tau) {
    return current + (target - current) * (1 - Math.exp(-dt / tau));
  },

  clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  //  1. LIGHT SHAFTS (Colunas de Luz)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  shafts: [],

  _initShafts() {
    this.shafts = [];
    const count = this.isFire ? 5 : (this.env === 'abyss' ? 6 : 4);

    for (let i = 0; i < count; i++) {
      const t = (i + 0.5) / count;
      this.shafts.push({
        xBase: 80 + t * (this.W - 160) + (this._hash(i * 7, 31) - 0.5) * 120,
        widthBase: 40 + this._hash(i * 3, 17) * 60,
        T:     14 + this._hash(i * 11, 23) * 14,         // período: 14–28s
        phi:   this._hash(i * 5, 41) * Math.PI * 2,      // fase única
        A:     3 + this._hash(i * 13, 7) * 6,             // amplitude lateral: 3–9px
        alphaBase: 0.025 + this._hash(i * 9, 53) * 0.050, // opacidade: 0.025–0.075
        feather: 40 + this._hash(i * 2, 61) * 40,         // borda suave: 40–80px
        samples: 16                                        // amostras verticais
      });
    }
  },

  _updateShafts(/* dt não necessário, shafts usam time diretamente */) {},

  _drawShafts(ctx) {
    const t = this.time;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';

    for (const s of this.shafts) {
      const breath = 0.5 + 0.5 * Math.sin(2 * Math.PI * t / s.T + s.phi);
      const cx = s.xBase + s.A * Math.sin(2 * Math.PI * t / (s.T * 1.7) + s.phi);
      const w  = s.widthBase * (0.97 + 0.06 * breath);
      const alpha = s.alphaBase * (0.72 + 0.28 * breath);

      // cor depende do ambiente
      let r, g, b;
      if (this.isFire) {
        r = 255; g = 120 + Math.floor(this._hash(s.phi * 10, 0) * 60); b = 40;
      } else {
        r = 140; g = 210; b = 255;
      }

      // path orgânico com noise nas bordas
      const stepY = this.GROUND_Y / (s.samples - 1);
      const leftPts = [];
      const rightPts = [];

      for (let j = 0; j < s.samples; j++) {
        const y = j * stepY;
        // modulação lateral com ruído suave
        const edgeNoise = 5 * this.noise2d(y * 0.008, t * 0.035)
                        + 2 * Math.sin(y * 0.018 + t * 0.12);
        const localX = cx + edgeNoise;
        // gradiente de largura: mais estreito no topo, mais largo na base
        const widthMul = 0.6 + 0.4 * (y / this.GROUND_Y);
        const halfW = w * widthMul * 0.5;
        leftPts.push({ x: localX - halfW, y });
        rightPts.push({ x: localX + halfW, y });
      }

      // desenhar como path preenchido
      ctx.beginPath();
      ctx.moveTo(leftPts[0].x, leftPts[0].y);
      for (let j = 1; j < leftPts.length; j++) {
        ctx.lineTo(leftPts[j].x, leftPts[j].y);
      }
      for (let j = rightPts.length - 1; j >= 0; j--) {
        ctx.lineTo(rightPts[j].x, rightPts[j].y);
      }
      ctx.closePath();

      // gradiente vertical: transparente → opaco → transparente
      const grad = ctx.createLinearGradient(0, 0, 0, this.GROUND_Y);
      grad.addColorStop(0, `rgba(${r},${g},${b},${(alpha * 0.3).toFixed(4)})`);
      grad.addColorStop(0.3, `rgba(${r},${g},${b},${alpha.toFixed(4)})`);
      grad.addColorStop(0.8, `rgba(${r},${g},${b},${(alpha * 0.7).toFixed(4)})`);
      grad.addColorStop(1, `rgba(${r},${g},${b},0)`);
      ctx.fillStyle = grad;

      // bordas suaves via shadow
      ctx.shadowColor = `rgba(${r},${g},${b},${(alpha * 0.5).toFixed(4)})`;
      ctx.shadowBlur = s.feather;
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    ctx.restore();
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  //  2. GROUND FOG (Névoa Rasteira)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  fogBands: [],

  _initFog() {
    this.fogBands = [];
    const count = this.isFire ? 4 : 5;

    for (let j = 0; j < count; j++) {
      this.fogBands.push({
        yBase: this.GROUND_Y - 30 + j * 18,
        A:     6 + this._hash(j * 3, 99) * 12,
        B:     4 + this._hash(j * 7, 88) * 8,
        k:     0.003 + this._hash(j * 11, 77) * 0.005,
        omega: 0.15 + this._hash(j * 13, 66) * 0.2,
        phi:   this._hash(j * 17, 55) * Math.PI * 2,
        f:     0.002 + this._hash(j * 19, 44) * 0.003,
        speed: 2 + this._hash(j * 23, 33) * 4,     // 2–6 px/s
        alphaBase: this.isFire ? 0.04 : 0.035,
        height: 28 + this._hash(j * 29, 22) * 18    // altura da faixa
      });
    }
  },

  _drawFog(ctx) {
    const t = this.time;
    ctx.save();

    for (const band of this.fogBands) {
      ctx.beginPath();

      // primeiro ponto
      const startY = band.yBase
        + band.A * Math.sin(band.k * 0 + band.omega * t + band.phi)
        + band.B * this.noise2d(0 * band.f + band.speed * t * 0.01, band.phi);
      ctx.moveTo(-20, startY + band.height);

      // borda superior ondulada
      for (let x = -20; x <= this.W + 20; x += 12) {
        const waveY = band.yBase
          + band.A * Math.sin(band.k * x + band.omega * t + band.phi)
          + band.B * this.noise2d(x * band.f + band.speed * t * 0.01, band.phi);
        ctx.lineTo(x, waveY);
      }

      // fechar pela base
      ctx.lineTo(this.W + 20, this.H);
      ctx.lineTo(-20, this.H);
      ctx.closePath();

      // gradiente horizontal com opacidade variável nas bordas
      // criado proceduralmente para cada faixa
      const grad = ctx.createLinearGradient(0, band.yBase - 10, 0, band.yBase + band.height + 40);

      // cor depende do ambiente
      let fr, fg, fb;
      if (this.isFire) {
        fr = 60; fg = 35; fb = 30; // fumaça quente cinza-avermelhada
      } else {
        fr = 120; fg = 150; fb = 170; // azul acinzentado
      }

      // densidade maior nas extremidades via composição
      grad.addColorStop(0, `rgba(${fr},${fg},${fb},${(band.alphaBase * 0.3).toFixed(4)})`);
      grad.addColorStop(0.4, `rgba(${fr},${fg},${fb},${(band.alphaBase).toFixed(4)})`);
      grad.addColorStop(1, `rgba(${fr},${fg},${fb},0)`);

      ctx.fillStyle = grad;
      ctx.fill();

      // agora sobrepõe a máscara de densidade nas bordas
      // (opacidade aumenta nas extremidades laterais)
      this._drawFogEdgeDensity(ctx, band, fr, fg, fb);
    }

    ctx.restore();
  },

  /** Aumenta a opacidade da névoa nas bordas laterais da tela. */
  _drawFogEdgeDensity(ctx, band, r, g, b) {
    const t = this.time;
    // gradiente da esquerda
    const leftGrad = ctx.createLinearGradient(0, 0, this.W * 0.35, 0);
    const edgeAlpha = band.alphaBase * 1.8;
    leftGrad.addColorStop(0, `rgba(${r},${g},${b},${edgeAlpha.toFixed(4)})`);
    leftGrad.addColorStop(1, `rgba(${r},${g},${b},0)`);

    // gradiente da direita
    const rightGrad = ctx.createLinearGradient(this.W, 0, this.W * 0.65, 0);
    rightGrad.addColorStop(0, `rgba(${r},${g},${b},${edgeAlpha.toFixed(4)})`);
    rightGrad.addColorStop(1, `rgba(${r},${g},${b},0)`);

    const yTop = band.yBase - 10;
    const yBot = band.yBase + band.height + 40;

    ctx.fillStyle = leftGrad;
    ctx.fillRect(0, yTop, this.W * 0.35, yBot - yTop);

    ctx.fillStyle = rightGrad;
    ctx.fillRect(this.W * 0.65, yTop, this.W * 0.35, yBot - yTop);
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  //  3. CHIAROSCURO CORRIDOR (Máscara de Foco)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  // Estado: escuridão usa lerpExp para suavidade
  // darknessCurrent / darknessTarget declarados no topo

  /** Define o alvo de escuridão (chamado por battle.js nos estados de combate). */
  setDarkness(level) {
    this.darknessTarget = this.clamp(level, 0, 1);
  },

  /** Pulso de impacto: reduz a escuridão brevemente. */
  impactFlash() {
    this.darknessCurrent = 0.45;
  },

  _drawChiaroscuro(ctx) {
    const t = this.time;
    const ax = this.px, ay = this.py - 40; // centro do Rōnin (torso)
    const bx = this.ex, by = this.ey - 40; // centro do inimigo (torso)

    // sigma do corredor gaussiano
    const sigma = 140;
    const sigma2 = sigma * sigma;
    const darkness = this.darknessCurrent;

    // Pré-computa o vetor AB
    const abx = bx - ax, aby = by - ay;
    const abLen2 = abx * abx + aby * aby;
    const invAbLen2 = abLen2 > 0.001 ? 1 / abLen2 : 0;

    // Resolução da máscara: blocos de 16px para performance
    const step = 16;
    ctx.save();

    for (let py = 0; py < this.H; py += step) {
      for (let px = 0; px < this.W; px += step) {
        const pcx = px + step * 0.5;
        const pcy = py + step * 0.5;

        // Projeção do ponto no segmento AB
        const apx = pcx - ax, apy = pcy - ay;
        const u = this.clamp((apx * abx + apy * aby) * invAbLen2, 0, 1);
        const qx = ax + u * abx;
        const qy = ay + u * aby;

        // Distância ao corredor
        const dx = pcx - qx, dy = pcy - qy;
        const distSq = dx * dx + dy * dy;

        // foco gaussiano
        const focus = Math.exp(-distSq / sigma2);

        // vinheta (escurece bordas da tela naturalmente)
        const vnx = (pcx / this.W - 0.5) * 2;
        const vny = (pcy / this.H - 0.5) * 2;
        const vig = this.clamp(vnx * vnx + vny * vny, 0, 1);
        const vignette = 0.6 + 0.4 * vig;

        // escuridão final
        const finalDark = darkness * (1 - focus) * vignette;

        if (finalDark > 0.01) {
          ctx.fillStyle = `rgba(0,0,0,${finalDark.toFixed(3)})`;
          ctx.fillRect(px, py, step, step);
        }
      }
    }

    ctx.restore();
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  //  4. CHARACTER GROUND LIGHTS (Reflexos no Chão)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  _drawGroundLights(ctx) {
    const t = this.time;
    const gy = this.GROUND_Y + 4; // logo abaixo do chão

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';

    // ── Luz do Rōnin (dourado) ──
    {
      const rx = 110, ry = 16;
      const intensity = 0.14 + 0.02 * Math.sin(2 * Math.PI * t / 6.0);
      const grad = ctx.createRadialGradient(this.px, gy, 0, this.px, gy, rx);
      grad.addColorStop(0, `rgba(255,220,140,${intensity.toFixed(4)})`);
      grad.addColorStop(0.5, `rgba(220,170,80,${(intensity * 0.5).toFixed(4)})`);
      grad.addColorStop(1, 'rgba(180,120,40,0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.ellipse(this.px, gy, rx, ry, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // ── Luz do Inimigo (ciano / laranja) ──
    {
      const rx = this.isFire ? 95 : 88;
      const ry = 14;
      // oscilação como luz através de água
      const wobble = this.isFire ? 0 : 0.02 * Math.sin(2 * Math.PI * t / 3.2 + 1.3);
      const intensity = 0.12 + 0.02 * Math.sin(2 * Math.PI * t / 4.8) + wobble;

      let r1, g1, b1, r2, g2, b2;
      if (this.isFire) {
        r1 = 255; g1 = 130; b1 = 50;   // laranja
        r2 = 200; g2 = 80;  b2 = 20;
      } else {
        r1 = 140; g1 = 230; b1 = 255;   // ciano
        r2 = 60;  g2 = 160; b2 = 220;
      }

      const grad = ctx.createRadialGradient(this.ex, gy, 0, this.ex, gy, rx);
      grad.addColorStop(0, `rgba(${r1},${g1},${b1},${intensity.toFixed(4)})`);
      grad.addColorStop(0.5, `rgba(${r2},${g2},${b2},${(intensity * 0.45).toFixed(4)})`);
      grad.addColorStop(1, `rgba(${r2},${g2},${b2},0)`);
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.ellipse(this.ex, gy, rx, ry, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // ── Interseção (azul-prateado dessaturado quando próximos) ──
    {
      const dist = Math.abs(this.px - this.ex);
      if (dist < 280) {
        const overlap = this.smoothstep(280, 120, dist);
        const midX = (this.px + this.ex) * 0.5;
        const overlapAlpha = 0.06 * overlap;
        const grad = ctx.createRadialGradient(midX, gy, 0, midX, gy, 70);
        grad.addColorStop(0, `rgba(190,200,220,${overlapAlpha.toFixed(4)})`);
        grad.addColorStop(1, 'rgba(190,200,220,0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.ellipse(midX, gy, 70, 12, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.restore();
  },

  // ── Halo em torno dos personagens (núcleo + halo + coroa) ──
  _drawCharacterGlows(ctx) {
    const t = this.time;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';

    // ── Rōnin: branco-dourado ──
    {
      const cx = this.px, cy = this.py - 40;
      const pulse = 0.85 + 0.15 * Math.sin(2 * Math.PI * t / 5.5);

      // Coroa (halo grande, muito sutil)
      const g3 = ctx.createRadialGradient(cx, cy, 30, cx, cy, 120);
      g3.addColorStop(0, `rgba(255,210,120,${(0.04 * pulse).toFixed(4)})`);
      g3.addColorStop(1, 'rgba(255,180,80,0)');
      ctx.fillStyle = g3;
      ctx.beginPath(); ctx.arc(cx, cy, 120, 0, Math.PI * 2); ctx.fill();

      // Halo intermediário
      const g2 = ctx.createRadialGradient(cx, cy, 4, cx, cy, 45);
      g2.addColorStop(0, `rgba(255,230,180,${(0.10 * pulse).toFixed(4)})`);
      g2.addColorStop(1, 'rgba(255,200,120,0)');
      ctx.fillStyle = g2;
      ctx.beginPath(); ctx.arc(cx, cy, 45, 0, Math.PI * 2); ctx.fill();

      // Núcleo pequeno
      const g1 = ctx.createRadialGradient(cx, cy, 0, cx, cy, 12);
      g1.addColorStop(0, `rgba(255,248,230,${(0.12 * pulse).toFixed(4)})`);
      g1.addColorStop(1, 'rgba(255,220,160,0)');
      ctx.fillStyle = g1;
      ctx.beginPath(); ctx.arc(cx, cy, 12, 0, Math.PI * 2); ctx.fill();
    }

    // ── Inimigo: ciano frio / laranja-magma ──
    {
      const cx = this.ex, cy = this.ey - 40;
      // pequenas oscilações como luz através de água
      const wobX = this.isFire ? 0 : 2 * Math.sin(2 * Math.PI * t / 2.8);
      const wobY = this.isFire ? 0 : 1.5 * Math.cos(2 * Math.PI * t / 3.4 + 0.7);
      const wcx = cx + wobX, wcy = cy + wobY;
      const pulse = 0.80 + 0.20 * Math.sin(2 * Math.PI * t / 4.2 + 1.0);

      let cr1, cg1, cb1, cr2, cg2, cb2, cr3, cg3, cb3;
      if (this.isFire) {
        cr1 = 255; cg1 = 200; cb1 = 140; // núcleo
        cr2 = 255; cg2 = 140; cb2 = 60;  // halo
        cr3 = 200; cg3 = 80;  cb3 = 30;  // coroa
      } else {
        cr1 = 200; cg1 = 240; cb1 = 255; // núcleo ciano
        cr2 = 100; cg2 = 200; cb2 = 255; // halo azul
        cr3 = 50;  cg3 = 140; cb3 = 220; // coroa azul profundo
      }

      // Coroa
      const g3 = ctx.createRadialGradient(wcx, wcy, 20, wcx, wcy, 100);
      g3.addColorStop(0, `rgba(${cr3},${cg3},${cb3},${(0.035 * pulse).toFixed(4)})`);
      g3.addColorStop(1, `rgba(${cr3},${cg3},${cb3},0)`);
      ctx.fillStyle = g3;
      ctx.beginPath(); ctx.arc(wcx, wcy, 100, 0, Math.PI * 2); ctx.fill();

      // Halo
      const g2 = ctx.createRadialGradient(wcx, wcy, 3, wcx, wcy, 38);
      g2.addColorStop(0, `rgba(${cr2},${cg2},${cb2},${(0.08 * pulse).toFixed(4)})`);
      g2.addColorStop(1, `rgba(${cr2},${cg2},${cb2},0)`);
      ctx.fillStyle = g2;
      ctx.beginPath(); ctx.arc(wcx, wcy, 38, 0, Math.PI * 2); ctx.fill();

      // Núcleo
      const g1 = ctx.createRadialGradient(wcx, wcy, 0, wcx, wcy, 10);
      g1.addColorStop(0, `rgba(${cr1},${cg1},${cb1},${(0.10 * pulse).toFixed(4)})`);
      g1.addColorStop(1, `rgba(${cr1},${cg1},${cb1},0)`);
      ctx.fillStyle = g1;
      ctx.beginPath(); ctx.arc(wcx, wcy, 10, 0, Math.PI * 2); ctx.fill();
    }

    ctx.restore();
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  //  5. POETIC PARTICLE POOL
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  particles: [],
  PARTICLE_MAX: 35,

  _initParticles() {
    this.particles = [];
    // Pré-popula com partículas já distribuídas
    if (this.isFire) {
      this._spawnEmbers(8);
      this._spawnAsh(6);
      this._spawnFireflies(4, true); // brasas quase apagadas
    } else {
      this._spawnDust(10);
      this._spawnFireflies(5, false);
      if (this.env === 'abyss' || this.env === 'lake' || this.env === 'boss') {
        this._spawnBubbles(7);
      }
    }
  },

  _spawnDust(count) {
    for (let i = 0; i < count && this.particles.length < this.PARTICLE_MAX; i++) {
      this.particles.push({
        type: 'dust',
        x: this._hash(i * 37, 101) * this.W,
        y: 60 + this._hash(i * 41, 102) * (this.GROUND_Y - 120),
        vx: 0, vy: 0,
        targetVx: 0, targetVy: 0,
        life: 4 + this._hash(i * 43, 103) * 5,        // 4–9s
        maxLife: 4 + this._hash(i * 43, 103) * 5,
        age: this._hash(i * 47, 104) * 4,              // começa em fase aleatória
        size: 1.2 + this._hash(i * 51, 105) * 1.5,
        speed: 2 + this._hash(i * 53, 106) * 5,        // 2–7 px/s
        seed: i * 7.3,
        r: this.isFire ? 255 : 220,
        g: this.isFire ? 180 : 200,
        b: this.isFire ? 100 : 180,
        baseAlpha: 0.25 + this._hash(i * 57, 107) * 0.3
      });
    }
  },

  _spawnFireflies(count, isEmber) {
    for (let i = 0; i < count && this.particles.length < this.PARTICLE_MAX; i++) {
      // preferencialmente nos terços laterais
      const side = this._hash(i * 61, 201) < 0.5 ? 0 : 1;
      const xRange = side === 0
        ? [40, this.W * 0.33]
        : [this.W * 0.67, this.W - 40];

      this.particles.push({
        type: isEmber ? 'ember-fly' : 'firefly',
        x: xRange[0] + this._hash(i * 63, 202) * (xRange[1] - xRange[0]),
        y: 120 + this._hash(i * 67, 203) * (this.GROUND_Y - 200),
        vx: 0, vy: 0,
        targetVx: 0, targetVy: 0,
        // parâmetros de órbita
        x0: 0, y0: 0, // serão calculados a partir da posição inicial
        A: 15 + this._hash(i * 71, 204) * 30,
        omegaX: 0.4 + this._hash(i * 73, 205) * 0.6,
        omegaY: 0.71 * (0.4 + this._hash(i * 73, 205) * 0.6),
        phiX: this._hash(i * 77, 206) * Math.PI * 2,
        phiY: this._hash(i * 79, 207) * Math.PI * 2,
        life: 999,    // vaga-lumes não morrem, apenas piscam
        maxLife: 999,
        age: this._hash(i * 81, 208) * 10,
        size: isEmber ? 1.8 : 2.2,
        seed: i * 13.7,
        // pulsação de brilho
        glowPeriod: 3 + this._hash(i * 83, 209) * 4,
        glowPhase: this._hash(i * 87, 210) * Math.PI * 2,
        r: isEmber ? 255 : 220,
        g: isEmber ? 140 : 220,
        b: isEmber ? 40 : 160,
        baseAlpha: isEmber ? 0.5 : 0.6
      });
      // guardar posição de referência para órbita
      const p = this.particles[this.particles.length - 1];
      p.x0 = p.x;
      p.y0 = p.y;
    }
  },

  _spawnBubbles(count) {
    for (let i = 0; i < count && this.particles.length < this.PARTICLE_MAX; i++) {
      this.particles.push({
        type: 'bubble',
        x: this.ex - 40 + this._hash(i * 89, 301) * 80,
        y: this.ey - 20 + this._hash(i * 91, 302) * 60,
        vx: 0, vy: 0,
        targetVx: 0, targetVy: 0,
        riseSpeed: 18 + this._hash(i * 93, 303) * 17,   // 18–35 px/s
        lateralA: 3 + this._hash(i * 97, 304) * 6,       // 3–9px
        lateralOmega: 1.5 + this._hash(i * 99, 305) * 2,
        lateralPhi: this._hash(i * 101, 306) * Math.PI * 2,
        life: 5 + this._hash(i * 103, 307) * 4,
        maxLife: 5 + this._hash(i * 103, 307) * 4,
        age: this._hash(i * 107, 308) * 3,
        size: 1.5 + this._hash(i * 109, 309) * 1.5,
        scaleInitial: 1.0,
        seed: i * 19.3,
        r: 190, g: 235, b: 255,
        baseAlpha: 0.30
      });
    }
  },

  _spawnEmbers(count) {
    for (let i = 0; i < count && this.particles.length < this.PARTICLE_MAX; i++) {
      this.particles.push({
        type: 'ember',
        x: this._hash(i * 113, 401) * this.W,
        y: this.GROUND_Y + this._hash(i * 117, 402) * 40,
        vx: 0, vy: 0,
        targetVx: 0, targetVy: 0,
        riseSpeed: 18 + this._hash(i * 119, 403) * 27,   // 18–45 px/s
        lateralA: 3 + this._hash(i * 121, 404) * 6,
        lateralOmega: 1.0 + this._hash(i * 123, 405) * 2,
        lateralPhi: this._hash(i * 127, 406) * Math.PI * 2,
        life: 1.5 + this._hash(i * 129, 407) * 2.5,     // 1.5–4s
        maxLife: 1.5 + this._hash(i * 129, 407) * 2.5,
        age: this._hash(i * 131, 408) * 2,
        size: 1.0 + this._hash(i * 133, 409) * 1.0,
        seed: i * 23.7,
        r: 255, g: 130 + Math.floor(this._hash(i * 137, 410) * 60), b: 40,
        baseAlpha: 0.5 + this._hash(i * 139, 411) * 0.3,
        bright: this._hash(i * 141, 412) < 0.2           // poucas unidades brilhantes
      });
    }
  },

  _spawnAsh(count) {
    for (let i = 0; i < count && this.particles.length < this.PARTICLE_MAX; i++) {
      this.particles.push({
        type: 'ash',
        x: this._hash(i * 143, 501) * this.W,
        y: 60 + this._hash(i * 147, 502) * (this.GROUND_Y - 100),
        vx: 0, vy: 0,
        targetVx: 0, targetVy: 0,
        // cinzas: alternam subida, suspensão, queda
        driftPhase: this._hash(i * 149, 503) * Math.PI * 2,
        driftPeriod: 6 + this._hash(i * 151, 504) * 6,
        life: 999,    // cinzas persistem
        maxLife: 999,
        age: this._hash(i * 153, 505) * 8,
        size: 2 + this._hash(i * 157, 506) * 2,
        speed: 1 + this._hash(i * 159, 507) * 3,
        seed: i * 29.1,
        r: 80, g: 65, b: 60,  // formas escuras
        baseAlpha: 0.08 + this._hash(i * 161, 508) * 0.17
      });
    }
  },

  _updateParticles(dt) {
    const t = this.time;

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.age += dt;

      // reciclagem
      if (p.age >= p.life) {
        this._recycleParticle(p);
        continue;
      }

      switch (p.type) {
        case 'dust': {
          // trajetória contínua via noise
          const theta = Math.PI * 2 * this.noise3d(
            p.x * 0.006, p.y * 0.006, t * 0.04 + p.seed
          );
          p.targetVx = Math.cos(theta) * p.speed;
          p.targetVy = Math.sin(theta) * p.speed
            + 1.5 * Math.sin(t * 0.8 + p.seed); // oscilação vertical
          p.vx = this.lerpExp(p.vx, p.targetVx, dt, 1.8);
          p.vy = this.lerpExp(p.vy, p.targetVy, dt, 1.8);
          p.x += p.vx * dt;
          p.y += p.vy * dt;
          // wrap
          if (p.x < -20) p.x += this.W + 40;
          if (p.x > this.W + 20) p.x -= this.W + 40;
          if (p.y < 20) p.y = this.GROUND_Y - 60;
          if (p.y > this.GROUND_Y - 20) p.y = 40;
          break;
        }

        case 'firefly':
        case 'ember-fly': {
          // órbita suave com pausa
          p.x = p.x0 + p.A * Math.sin(p.omegaX * t + p.phiX)
            + (p.A * 0.37) * Math.sin(0.37 * p.omegaX * t);
          p.y = p.y0 + (p.A * 0.5) * Math.sin(p.omegaY * t + p.phiY);
          // manter nos terços laterais (repelir do centro)
          const centerDist = Math.abs(p.x - this.W * 0.5);
          if (centerDist < this.W * 0.15) {
            p.x0 += (p.x < this.W * 0.5 ? -1 : 1) * dt * 8;
          }
          break;
        }

        case 'bubble': {
          const progress = p.age / p.life;
          p.y -= p.riseSpeed * dt;
          p.x = p.x + p.lateralA * Math.sin(p.lateralOmega * t + p.lateralPhi) * dt;
          p.size = (p.scaleInitial || 1.5) * (1 + 0.18 * progress);
          // expirar se saiu da tela
          if (p.y < -20) p.age = p.life;
          break;
        }

        case 'ember': {
          p.y -= p.riseSpeed * dt;
          p.x += p.lateralA * Math.sin(p.lateralOmega * t + p.lateralPhi) * dt * 2;
          if (p.y < -20) p.age = p.life;
          break;
        }

        case 'ash': {
          // alternam subida, suspensão e queda
          const phase = Math.sin(2 * Math.PI * t / p.driftPeriod + p.driftPhase);
          // phase: -1 (desce), 0 (suspensão), +1 (sobe)
          const theta = Math.PI * 2 * this.noise3d(
            p.x * 0.004, p.y * 0.004, t * 0.03 + p.seed
          );
          p.vx = this.lerpExp(p.vx, Math.cos(theta) * p.speed, dt, 2.0);
          p.vy = this.lerpExp(p.vy, phase * -p.speed * 1.5, dt, 2.5);
          p.x += p.vx * dt;
          p.y += p.vy * dt;
          // wrap
          if (p.x < -20) p.x += this.W + 40;
          if (p.x > this.W + 20) p.x -= this.W + 40;
          if (p.y < 20) p.y = this.GROUND_Y - 40;
          if (p.y > this.GROUND_Y) p.y = 60;
          break;
        }
      }
    }
  },

  _recycleParticle(p) {
    // Reciclagem: reinicializa a partícula em vez de destruir/criar
    p.age = 0;
    switch (p.type) {
      case 'dust':
        p.x = this._hash(this.time * 100 + p.seed, 600) * this.W;
        p.y = 60 + this._hash(this.time * 100 + p.seed + 1, 601) * (this.GROUND_Y - 120);
        p.vx = 0; p.vy = 0;
        break;
      case 'bubble':
        p.x = this.ex - 40 + this._hash(this.time * 100 + p.seed, 700) * 80;
        p.y = this.ey - 10;
        p.size = p.scaleInitial || 1.5;
        break;
      case 'ember':
        p.x = this._hash(this.time * 100 + p.seed, 800) * this.W;
        p.y = this.GROUND_Y + 10;
        break;
    }
  },

  _drawParticles(ctx) {
    const t = this.time;
    ctx.save();

    for (const p of this.particles) {
      const lifeRatio = p.maxLife < 900 ? p.age / p.life : 1;
      // Fade in/out suave
      let alphaLife;
      if (p.maxLife < 900) {
        const fadeIn  = this.smoothstep(0, 0.15, lifeRatio);
        const fadeOut = 1 - this.smoothstep(0.75, 1.0, lifeRatio);
        alphaLife = fadeIn * fadeOut;
      } else {
        alphaLife = 1;
      }

      let alpha = p.baseAlpha * alphaLife;

      switch (p.type) {
        case 'dust': {
          ctx.globalAlpha = alpha;
          ctx.fillStyle = `rgb(${p.r},${p.g},${p.b})`;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
          break;
        }

        case 'firefly':
        case 'ember-fly': {
          // pulsação de brilho
          const glow = 0.3 + 0.7 * (0.5 + 0.5 * Math.sin(
            2 * Math.PI * t / p.glowPeriod + p.glowPhase
          ));
          alpha = p.baseAlpha * glow;
          ctx.save();
          ctx.globalCompositeOperation = 'lighter';
          ctx.globalAlpha = alpha;
          // halo
          const haloR = p.size * 4;
          const haloGrad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, haloR);
          haloGrad.addColorStop(0, `rgba(${p.r},${p.g},${p.b},${(alpha * 0.7).toFixed(3)})`);
          haloGrad.addColorStop(1, `rgba(${p.r},${p.g},${p.b},0)`);
          ctx.fillStyle = haloGrad;
          ctx.beginPath();
          ctx.arc(p.x, p.y, haloR, 0, Math.PI * 2);
          ctx.fill();
          // núcleo
          ctx.globalAlpha = alpha * 1.2;
          ctx.fillStyle = `rgb(${Math.min(255, p.r + 40)},${Math.min(255, p.g + 40)},${Math.min(255, p.b + 20)})`;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * 0.6, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
          break;
        }

        case 'bubble': {
          ctx.globalAlpha = alpha * (1 - this.smoothstep(0.8, 1.0, lifeRatio));
          ctx.strokeStyle = `rgba(${p.r},${p.g},${p.b},${(alpha * 0.7).toFixed(3)})`;
          ctx.lineWidth = 0.8;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.stroke();
          // brilho especular
          ctx.fillStyle = `rgba(${p.r},${p.g},${p.b},${(alpha * 0.3).toFixed(3)})`;
          ctx.beginPath();
          ctx.arc(p.x - p.size * 0.3, p.y - p.size * 0.3, p.size * 0.25, 0, Math.PI * 2);
          ctx.fill();
          break;
        }

        case 'ember': {
          ctx.save();
          ctx.globalCompositeOperation = 'lighter';
          const emberAlpha = alpha * (1 - this.smoothstep(0.7, 1.0, lifeRatio));
          ctx.globalAlpha = emberAlpha;
          if (p.bright) {
            // poucas unidades brilhantes com halo
            const hg = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 5);
            hg.addColorStop(0, `rgba(255,200,100,${(emberAlpha * 0.5).toFixed(3)})`);
            hg.addColorStop(1, 'rgba(255,160,60,0)');
            ctx.fillStyle = hg;
            ctx.beginPath(); ctx.arc(p.x, p.y, p.size * 5, 0, Math.PI * 2); ctx.fill();
          }
          ctx.fillStyle = `rgb(${p.r},${p.g},${p.b})`;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
          break;
        }

        case 'ash': {
          ctx.globalAlpha = alpha;
          ctx.fillStyle = `rgb(${p.r},${p.g},${p.b})`;
          // formas irregulares: retângulo pequeno rotacionado
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(t * 0.3 + p.seed);
          ctx.fillRect(-p.size * 0.5, -p.size * 0.25, p.size, p.size * 0.5);
          ctx.restore();
          break;
        }
      }
    }

    ctx.globalAlpha = 1;
    ctx.restore();
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  //  6. MAGMA DISTANTE (Somente Fogo)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  _drawMagmaGlow(ctx) {
    if (!this.isFire) return;
    const t = this.time;

    // Pulsação lenta de magma
    const intensity = 0.86
      + 0.09 * Math.sin(2 * Math.PI * t / 8.5)
      + 0.05 * this.noise2d(t * 0.12, 0.5);

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';

    // Brilho inferior (subindo do chão)
    const grad = ctx.createLinearGradient(0, this.GROUND_Y - 40, 0, this.H);
    const baseAlpha = 0.14 * intensity;
    grad.addColorStop(0, 'rgba(255,90,34,0)');
    grad.addColorStop(0.3, `rgba(255,90,34,${(baseAlpha * 0.4).toFixed(4)})`);
    grad.addColorStop(0.7, `rgba(255,90,34,${baseAlpha.toFixed(4)})`);
    grad.addColorStop(1, `rgba(142,36,24,${(baseAlpha * 1.2).toFixed(4)})`);
    ctx.fillStyle = grad;
    ctx.fillRect(0, this.GROUND_Y - 40, this.W, this.H - this.GROUND_Y + 40);

    // Reflexo horizontal no chão (borda magma)
    const rimGrad = ctx.createLinearGradient(0, this.GROUND_Y - 2, 0, this.GROUND_Y + 12);
    rimGrad.addColorStop(0, `rgba(255,176,74,${(0.20 * intensity).toFixed(4)})`);
    rimGrad.addColorStop(1, 'rgba(255,90,34,0)');
    ctx.fillStyle = rimGrad;
    ctx.fillRect(0, this.GROUND_Y - 2, this.W, 14);

    ctx.restore();
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  //  7. HEAT HAZE (Distorção Térmica — Canvas 2D, somente Fogo)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  /** Buffer offscreen para heat haze (criado uma vez). */
  _hazeCanvas: null,
  _hazeCtx: null,

  _initHaze() {
    if (!this.isFire) return;
    if (!this._hazeCanvas) {
      this._hazeCanvas = document.createElement('canvas');
      this._hazeCanvas.width = this.W;
      this._hazeCanvas.height = this.H;
      this._hazeCtx = this._hazeCanvas.getContext('2d');
    }
  },

  /**
   * Desenha a distorção térmica por faixas horizontais.
   * Deve ser chamado SOBRE o fundo desenhado, mas ANTES dos combatentes.
   * Afeta somente os 35% inferiores da tela.
   */
  _drawHeatHaze(ctx) {
    if (!this.isFire || !this._hazeCanvas) return;
    const t = this.time;

    const hazeCtx = this._hazeCtx;
    const startY = Math.floor(this.H * 0.65);
    const stripH = 3;

    // copia toda a região inferior do canvas principal para o buffer de haze
    hazeCtx.clearRect(0, startY, this.W, this.H - startY);
    hazeCtx.drawImage(ctx.canvas, 0, startY, this.W, this.H - startY,
                                   0, startY, this.W, this.H - startY);

    // agora aplica o deslocamento por faixas horizontais
    for (let y = startY; y < this.GROUND_Y; y += stripH) {
      // máscara inferior: mais intenso perto do chão
      const normalY = (y - startY) / (this.H - startY);
      const mask = this.smoothstep(0, 0.8, normalY);

      const offsetX = mask * (
        0.7 * Math.sin(0.045 * y + 1.2 * t)
        + 0.4 * Math.sin(0.091 * y - 0.7 * t)
      );

      // redesenha a faixa deslocada
      if (Math.abs(offsetX) > 0.1) {
        ctx.drawImage(
          this._hazeCanvas,
          0, y, this.W, stripH,                  // fonte
          offsetX, y, this.W, stripH             // destino deslocado
        );
      }
    }
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  //  API PÚBLICA
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  /**
   * Inicializa toda a atmosfera para o ambiente de batalha atual.
   * @param {string} env - 'forest'|'lake'|'boss'|'abyss'|'lava'
   */
  init(env) {
    this.env = env;
    this.isFire = (env === 'lava');
    this.time = 0;
    this.darknessCurrent = 0.60;
    this.darknessTarget = 0.60;

    this._initShafts();
    this._initFog();
    this._initParticles();
    this._initHaze();
  },

  /**
   * Avança o estado da atmosfera em dt segundos.
   * @param {number} dt - Delta em segundos (tipicamente 1/60).
   */
  update(dt) {
    this.time += dt;

    // suavização da escuridão
    this.darknessCurrent = this.lerpExp(
      this.darknessCurrent, this.darknessTarget, dt, 0.7
    );

    this._updateParticles(dt);
  },

  /**
   * Atualiza as posições dos combatentes (chamado por battle.js cada frame).
   */
  setPositions(px, py, ex, ey) {
    this.px = px;
    this.py = py;
    this.ex = ex;
    this.ey = ey;
  },

  /**
   * Camada 1: Colunas de luz + névoa rasteira.
   * Desenhada LOGO APÓS o gradiente do céu, ANTES das silhuetas.
   */
  drawBackground(ctx) {
    this._drawShafts(ctx);
    if (this.isFire) this._drawMagmaGlow(ctx);
  },

  /**
   * Camada 2: Reflexos no chão dos personagens.
   * Desenhada SOBRE o chão, ANTES dos combatentes.
   */
  drawGroundLighting(ctx) {
    this._drawGroundLights(ctx);
  },

  /**
   * Camada 3: Máscara de escuridão com corredor de foco.
   * Desenhada APÓS o chão e reflexos, ANTES dos combatentes.
   */
  drawChiaroscuro(ctx) {
    this._drawChiaroscuro(ctx);
  },

  /**
   * Camada 4: Halos em torno dos personagens.
   * Desenhada logo ANTES dos combatentes para que o glow fique "atrás" deles.
   */
  drawCharacterGlows(ctx) {
    this._drawCharacterGlows(ctx);
  },

  /**
   * Camada 5a: Heat haze (variante vulcânica).
   * Desenhada SOBRE o fundo pronto e ANTES dos combatentes — a distorção
   * térmica afeta somente o cenário, nunca as silhuetas ou a UI.
   */
  drawHaze(ctx) {
    if (this.isFire) this._drawHeatHaze(ctx);
  },

  /**
   * Camada 5b: Névoa rasteira + partículas poéticas.
   * Desenhada APÓS os combatentes como efeitos de primeiro plano.
   */
  drawForegroundFx(ctx) {
    this._drawFog(ctx);
    this._drawParticles(ctx);
  }
};

window.BattleAtmosphere = BattleAtmosphere;
