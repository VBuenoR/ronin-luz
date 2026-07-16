'use strict';

// Simulacao com pool fixo. A API publica continua sendo Particles.spawn/burst,
// mas a lista ativa nunca faz shift/splice e os objetos retornam ao pool.
const ParticleRenderer = {
  alphaBatch: [],
  additiveBatch: [],

  isAlpha(type) {
    return type === 'drop' || type === 'leaf' || type === 'foam' ||
      type === 'puddle' || type === 'mist' || type === 'darkShard' ||
      type === 'darkPull';
  },

  draw(ctx, items, camX, camY, layer) {
    const alpha = this.alphaBatch;
    const additive = this.additiveBatch;
    alpha.length = 0;
    additive.length = 0;

    for (let i = 0; i < items.length; i++) {
      const p = items[i];
      const pLayer = p.layer || 'front';
      if (layer && pLayer !== layer) continue;
      const x = p.x - camX;
      const y = p.y - camY;
      if (x < -72 || x > 1032 || y < -72 || y > 612) continue;
      (this.isAlpha(p.type) ? alpha : additive).push(p);
    }

    ctx.save();
    if (alpha.length) {
      ctx.globalCompositeOperation = 'source-over';
      for (let i = 0; i < alpha.length; i++) {
        const p = alpha[i];
        this.drawParticle(ctx, p, p.x - camX, p.y - camY);
      }
    }
    if (additive.length) {
      ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < additive.length; i++) {
        const p = additive[i];
        this.drawParticle(ctx, p, p.x - camX, p.y - camY);
      }
    }
    ctx.restore();
  },

  drawWaterWall(ctx, wall) {
    const stateQ = wall.state === 'raise'
      ? Math.min(1, wall.t / 12)
      : wall.state === 'collapse'
        ? Math.min(1, wall.t / 15)
        : wall.state === 'break'
          ? Math.min(1, wall.t / 24) : 0;
    let rise = 1;
    if (wall.state === 'raise') {
      const expo = 1 - Math.pow(1 - stateQ, 3);
      rise = expo + Math.sin(stateQ * Math.PI) * 0.13;
    } else if (wall.state === 'collapse') {
      rise = 1 - stateQ * stateQ;
    } else if (wall.state === 'break') {
      rise = 1 - stateQ * 0.72;
    }
    rise *= 1 + Math.sin(wall.t * 0.055) * 0.025;
    const h = Math.max(2, wall.height * rise);
    const w = wall.width * (wall.state === 'raise' ? 0.78 + stateQ * 0.22 : 1);
    const hit = wall.hitT > 0 ? wall.hitT / 14 : 0;
    const dent = Math.sin((14 - wall.hitT) * 1.45) * hit * 12;
    const lean = wall.facing * 10;
    const x = wall.x;
    const baseY = wall.y;
    const topY = baseY - h;
    const breakAlpha = wall.state === 'break' ? Math.max(0, 1 - stateQ * 1.18) : 1;
    const crestA = Math.sin(wall.t * 0.09) * 4;
    const crestB = Math.sin(wall.t * 0.073 + 2.1) * 5;

    ctx.save();
    ctx.globalAlpha = breakAlpha;
    ctx.beginPath();
    ctx.moveTo(x - w * 0.56, baseY);
    ctx.bezierCurveTo(
      x - w * 0.65, baseY - h * 0.34,
      x - w * 0.48 + crestA, topY + h * 0.24,
      x - w * 0.3 + lean, topY + 7 + crestA
    );
    ctx.quadraticCurveTo(x - w * 0.08 + lean, topY - 8 + crestB, x + w * 0.08 + lean, topY + 2);
    ctx.quadraticCurveTo(x + w * 0.3 + lean, topY - 11 - crestA, x + w * 0.48 + lean, topY + 9 + crestB);
    ctx.bezierCurveTo(
      x + w * 0.56 + dent, topY + h * 0.28,
      x + w * 0.66 + dent, baseY - h * 0.38,
      x + w * 0.58, baseY
    );
    ctx.closePath();

    const body = ctx.createLinearGradient(x - w * 0.6, 0, x + w * 0.65, 0);
    body.addColorStop(0, 'rgba(45,82,178,0.18)');
    body.addColorStop(0.28, 'rgba(45,127,214,0.31)');
    body.addColorStop(0.62, 'rgba(88,190,238,0.22)');
    body.addColorStop(1, 'rgba(127,212,255,0.34)');
    ctx.fillStyle = body;
    ctx.fill();

    ctx.save();
    ctx.clip();
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 6; i++) {
      const travel = (wall.t * (1.4 + i * 0.08) + i * h * 0.19) % Math.max(1, h);
      const sy = baseY - travel;
      const sx = x - w * 0.38 + i * w * 0.15 + Math.sin(wall.t * 0.06 + i) * 5;
      ctx.globalAlpha = breakAlpha * (0.09 + (i % 2) * 0.05);
      ctx.strokeStyle = i % 2 ? '#dff9ff' : '#72d8ff';
      ctx.lineWidth = i % 2 ? 1.4 : 2.2;
      ctx.beginPath();
      ctx.moveTo(sx, sy + 25);
      ctx.bezierCurveTo(sx - 8, sy + 12, sx + 9, sy - 4, sx + 2, sy - 23);
      ctx.stroke();
    }
    ctx.globalAlpha = breakAlpha * 0.16;
    ctx.fillStyle = '#e9fbff';
    ctx.font = '700 46px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('水', x + lean * 0.45, baseY - h * 0.48);
    ctx.restore();

    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = breakAlpha * 0.9;
    ctx.shadowColor = '#7fd4ff';
    ctx.shadowBlur = 9;
    ctx.strokeStyle = 'rgba(226,252,255,0.94)';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(x - w * 0.3 + lean, topY + 7 + crestA);
    ctx.quadraticCurveTo(x - w * 0.08 + lean, topY - 8 + crestB, x + w * 0.08 + lean, topY + 2);
    ctx.quadraticCurveTo(x + w * 0.3 + lean, topY - 11 - crestA, x + w * 0.48 + lean, topY + 9 + crestB);
    ctx.stroke();
    ctx.shadowBlur = 0;

    ctx.globalAlpha = breakAlpha * 0.48;
    ctx.strokeStyle = 'rgba(127,212,255,0.9)';
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.ellipse(x, baseY + 1, w * 0.78, 9 + Math.sin(wall.t * 0.08) * 2, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(x, baseY + 2, w * 0.48, 5, 0, 0, Math.PI * 2);
    ctx.stroke();

    if (wall.hitT > 0) {
      const hitQ = 1 - wall.hitT / 14;
      const impactY = wall.hitY || baseY - h * 0.55;
      ctx.globalAlpha = Math.max(0, 1 - hitQ) * 0.95;
      const flash = ctx.createRadialGradient(x + w * 0.46, impactY, 0, x + w * 0.46, impactY, 32);
      flash.addColorStop(0, 'rgba(255,255,255,0.96)');
      flash.addColorStop(0.3, 'rgba(127,212,255,0.72)');
      flash.addColorStop(1, 'rgba(45,127,214,0)');
      ctx.fillStyle = flash;
      ctx.beginPath();
      ctx.arc(x + w * 0.46, impactY, 32, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = Math.max(0, 1 - hitQ);
      ctx.strokeStyle = '#eaffff';
      ctx.lineWidth = 1.6;
      for (let i = 0; i < 2; i++) {
        const rr = 8 + hitQ * (28 + i * 15);
        ctx.beginPath();
        ctx.ellipse(x + w * 0.32, impactY, rr * 0.72, rr, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
    ctx.restore();
  },

  // A Barragem de Fogo ocupa o chão ao redor do jogador. A silhueta baixa e
  // circular evita confundi-la com a parede vertical da escola de água.
  drawFireRing(ctx, guard) {
    const stateQ = guard.state === 'raise'
      ? Math.min(1, guard.t / 12)
      : guard.state === 'collapse'
        ? Math.min(1, guard.t / 15)
        : guard.state === 'break'
          ? Math.min(1, guard.t / 24) : 0;
    let strength = guard.state === 'raise'
      ? 1 - Math.pow(1 - stateQ, 3)
      : guard.state === 'collapse'
        ? 1 - stateQ * stateQ
        : guard.state === 'break'
          ? Math.max(0, 1 - stateQ * 1.12) : 1;
    const pulse = 0.92 + Math.sin(guard.t * 0.18) * 0.08;
    const hit = guard.hitT > 0 ? guard.hitT / 14 : 0;
    const rx = guard.width * (0.72 + strength * 0.28);
    const ry = guard.height * (0.72 + strength * 0.28);
    const x = guard.x;
    const y = guard.y;
    strength *= pulse;

    ctx.save();
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = Math.max(0, strength) * 0.38;
    const scorch = ctx.createRadialGradient(x, y, 2, x, y, rx * 1.12);
    scorch.addColorStop(0, 'rgba(80,22,12,0.08)');
    scorch.addColorStop(0.62, 'rgba(70,16,8,0.24)');
    scorch.addColorStop(1, 'rgba(20,8,5,0)');
    ctx.fillStyle = scorch;
    ctx.beginPath();
    ctx.ellipse(x, y + 2, rx * 1.12, ry * 1.05, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.globalCompositeOperation = 'lighter';
    ctx.shadowColor = '#ff6b28';
    ctx.shadowBlur = 11;
    for (let lane = 0; lane < 3; lane++) {
      const laneRx = rx * (0.72 + lane * 0.15);
      const laneRy = ry * (0.72 + lane * 0.15);
      const offset = guard.t * (0.055 + lane * 0.012) * (lane === 1 ? -1 : 1);
      ctx.strokeStyle = lane === 1 ? 'rgba(255,240,176,0.92)' : 'rgba(255,104,38,0.78)';
      ctx.lineWidth = (lane === 1 ? 2.2 : 3.4) * Math.max(0.2, strength);
      ctx.globalAlpha = Math.max(0, strength) * (0.55 + lane * 0.12);
      for (let arc = 0; arc < 4; arc++) {
        const a0 = offset + arc * Math.PI * 0.5 + lane * 0.35;
        ctx.beginPath();
        ctx.ellipse(x, y, laneRx, laneRy, 0, a0, a0 + 0.72 + Math.sin(guard.t * 0.09 + arc) * 0.12);
        ctx.stroke();
      }
    }

    const flameCount = 14;
    for (let i = 0; i < flameCount; i++) {
      const a = i / flameCount * Math.PI * 2 + guard.t * 0.018;
      const px = x + Math.cos(a) * rx * 0.91;
      const py = y + Math.sin(a) * ry * 0.91;
      const front = 0.55 + Math.sin(a) * 0.45;
      const flicker = 0.72 + Math.sin(guard.t * 0.31 + i * 1.73) * 0.28;
      const fh = (9 + front * 15) * strength * flicker;
      const fw = 2.7 + front * 2.4;
      ctx.globalAlpha = Math.max(0, strength) * (0.46 + front * 0.38);
      ctx.fillStyle = i % 3 === 0 ? '#fff0a8' : i % 2 ? '#ff8e36' : '#f04b20';
      ctx.beginPath();
      ctx.moveTo(px - fw, py + 1);
      ctx.quadraticCurveTo(px - fw * 0.4, py - fh * 0.48, px + Math.sin(guard.t * 0.22 + i) * fw, py - fh);
      ctx.quadraticCurveTo(px + fw * 1.15, py - fh * 0.35, px + fw, py + 1);
      ctx.closePath();
      ctx.fill();
    }

    ctx.shadowBlur = 0;
    ctx.globalAlpha = Math.max(0, strength) * 0.18;
    ctx.fillStyle = '#ffd08a';
    ctx.font = '700 34px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('火', x, y - 13);

    if (guard.hitT > 0) {
      const hitQ = 1 - guard.hitT / 14;
      const ix = x + guard.facing * rx * 0.88;
      const iy = guard.hitY || y - 24;
      ctx.globalAlpha = hit * 0.95;
      const flash = ctx.createRadialGradient(ix, iy, 0, ix, iy, 38);
      flash.addColorStop(0, 'rgba(255,255,224,0.98)');
      flash.addColorStop(0.28, 'rgba(255,132,48,0.82)');
      flash.addColorStop(1, 'rgba(220,45,18,0)');
      ctx.fillStyle = flash;
      ctx.beginPath();
      ctx.arc(ix, iy, 38, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#fff1b8';
      ctx.lineWidth = Math.max(0.8, 2.4 * hit);
      ctx.globalAlpha = hit;
      for (let i = 0; i < 2; i++) {
        const rr = 9 + hitQ * (24 + i * 13);
        ctx.beginPath();
        ctx.arc(ix, iy, rr, -1.1, 1.1);
        ctx.stroke();
      }
    }
    ctx.restore();
  },

  // Escudo sagrado em dois passes: a mandala fica atrás da silhueta e o
  // brilho frontal ilumina o personagem sem esconder suas formas.
  drawHolyShield(ctx, guard, front) {
    const layers = guard.layers;
    const raiseQ = guard.state === 'raise' ? Math.min(1, guard.t / 14) : 1;
    const collapseQ = guard.state === 'collapse' ? Math.min(1, guard.t / 16) : 0;
    const born = guard.state === 'raise' ? 1 - Math.pow(1 - raiseQ, 3) : 1;
    const fade = guard.state === 'collapse' ? 1 - collapseQ * collapseQ : 1;
    const breath = 1 + Math.sin(guard.age * layers.pulse.speed) * layers.pulse.scale;
    const baseAlpha = fade * layers.halo.intensity;
    const r = guard.radius * born * breath;
    const x = guard.x;
    const y = guard.y;
    if (r < 1 || baseAlpha <= 0) return;

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';

    if (!front) {
      const haloR = r * layers.halo.scale;
      const halo = ctx.createRadialGradient(x, y, 0, x, y, haloR);
      halo.addColorStop(0, 'rgba(255,255,255,0.52)');
      halo.addColorStop(0.3, 'rgba(255,232,122,0.3)');
      halo.addColorStop(0.68, 'rgba(255,210,58,0.14)');
      halo.addColorStop(1, 'rgba(255,246,176,0)');
      ctx.globalAlpha = baseAlpha * layers.halo.opacity;
      ctx.fillStyle = halo;
      ctx.beginPath();
      ctx.arc(x, y, haloR, 0, Math.PI * 2);
      ctx.fill();

      // Feixes radiais perfeitamente simétricos.
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(guard.age * layers.rays.speed + layers.rays.rotation);
      for (let i = 0; i < 16; i++) {
        const a = i / 16 * Math.PI * 2;
        const cardinal = i % 4 === 0;
        const len = r * (cardinal ? 1.48 : 1.18) * layers.rays.scale;
        const half = cardinal ? 2.8 : 1.45;
        ctx.save();
        ctx.rotate(a);
        const ray = ctx.createLinearGradient(r * 0.38, 0, len, 0);
        ray.addColorStop(0, 'rgba(255,255,255,0.62)');
        ray.addColorStop(0.4, 'rgba(255,232,122,0.32)');
        ray.addColorStop(1, 'rgba(255,210,58,0)');
        ctx.globalAlpha = fade * layers.rays.opacity * (cardinal ? 0.86 : 0.48);
        ctx.fillStyle = ray;
        ctx.beginPath();
        ctx.moveTo(r * 0.35, 0);
        ctx.lineTo(len, -half);
        ctx.lineTo(len, half);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }
      ctx.restore();

      // Anéis concêntricos em sentidos opostos.
      ctx.save();
      ctx.translate(x, y);
      ctx.globalAlpha = fade * layers.circle.opacity;
      ctx.shadowColor = '#FFE87A';
      ctx.shadowBlur = 8 * layers.glow.intensity;
      for (let lane = 0; lane < 4; lane++) {
        const rr = r * layers.circle.scale * (0.58 + lane * 0.135);
        const dir = lane % 2 ? -1 : 1;
        const rot = layers.circle.rotation + guard.age * layers.circle.speed * dir;
        ctx.save();
        ctx.rotate(rot);
        ctx.strokeStyle = lane === 1 ? '#FFFFFF' : lane === 2 ? '#FFF6B0' : '#FFE87A';
        ctx.lineWidth = lane === 1 ? 1.35 : 0.85;
        ctx.beginPath();
        ctx.arc(0, 0, rr, 0, Math.PI * 2);
        ctx.stroke();
        const segments = lane === 3 ? 16 : 8;
        for (let i = 0; i < segments; i++) {
          const a = i / segments * Math.PI * 2;
          const tick = lane === 3 ? 5 : 3;
          ctx.beginPath();
          ctx.moveTo(Math.cos(a) * (rr - tick), Math.sin(a) * (rr - tick));
          ctx.lineTo(Math.cos(a) * (rr + tick), Math.sin(a) * (rr + tick));
          ctx.stroke();
        }
        ctx.restore();
      }

      // Mandala geométrica e inscrições celestiais abstratas.
      ctx.rotate(-guard.age * layers.symbols.speed + layers.symbols.rotation);
      ctx.globalAlpha = fade * layers.symbols.opacity;
      ctx.strokeStyle = '#FFF6B0';
      ctx.lineWidth = 0.85;
      for (let i = 0; i < 8; i++) {
        const a = i / 8 * Math.PI * 2;
        const a2 = a + Math.PI / 4;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * r * 0.22, Math.sin(a) * r * 0.22);
        ctx.lineTo(Math.cos(a) * r * 0.72, Math.sin(a) * r * 0.72);
        ctx.lineTo(Math.cos(a2) * r * 0.48, Math.sin(a2) * r * 0.48);
        ctx.closePath();
        ctx.stroke();
      }
      for (let i = 0; i < 12; i++) {
        const a = i / 12 * Math.PI * 2;
        const rr = r * 0.84;
        const sx = Math.cos(a) * rr;
        const sy = Math.sin(a) * rr;
        ctx.save();
        ctx.translate(sx, sy);
        ctx.rotate(a + Math.PI * 0.5);
        ctx.beginPath();
        ctx.moveTo(0, -3.8);
        ctx.lineTo(2.8, 0);
        ctx.lineTo(0, 3.8);
        ctx.lineTo(-2.8, 0);
        ctx.closePath();
        ctx.stroke();
        ctx.restore();
      }
      ctx.restore();

      // Estrela de oito pontas: cardinais mais longas que as diagonais.
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(layers.star.rotation + guard.age * layers.star.speed);
      ctx.globalAlpha = fade * layers.star.opacity;
      ctx.shadowColor = '#FFFFFF';
      ctx.shadowBlur = 13 * layers.bloom.intensity;
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      for (let i = 0; i < 16; i++) {
        const a = -Math.PI * 0.5 + i / 16 * Math.PI * 2;
        let rr = r * 0.09;
        if (i % 2 === 0) rr = r * ((i / 2) % 2 === 0 ? 0.46 : 0.31) * layers.star.scale;
        const px = Math.cos(a) * rr;
        const py = Math.sin(a) * rr;
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.restore();

      // Onda emissiva periódica atravessando todo o círculo.
      const waveQ = (guard.age * layers.wave.speed) % 1;
      ctx.globalAlpha = fade * (1 - waveQ) * layers.wave.opacity;
      ctx.strokeStyle = '#FFF6B0';
      ctx.lineWidth = 2.2 * (1 - waveQ * 0.55);
      ctx.beginPath();
      ctx.arc(x, y, r * (0.32 + waveQ * 0.78) * layers.wave.scale, 0, Math.PI * 2);
      ctx.stroke();
    } else {
      // Flash de ativação e bloom concentrado apenas no núcleo.
      const flash = guard.state === 'raise' ? Math.max(0, 1 - guard.t / 8) : 0;
      const coreR = r * layers.bloom.scale;
      const core = ctx.createRadialGradient(x, y, 0, x, y, coreR);
      core.addColorStop(0, 'rgba(255,255,255,0.96)');
      core.addColorStop(0.2, 'rgba(255,246,176,0.58)');
      core.addColorStop(0.55, 'rgba(255,232,122,0.2)');
      core.addColorStop(1, 'rgba(255,210,58,0)');
      ctx.globalAlpha = fade * (layers.bloom.opacity + flash * layers.flash.intensity);
      ctx.fillStyle = core;
      ctx.beginPath();
      ctx.arc(x, y, coreR, 0, Math.PI * 2);
      ctx.fill();

      // Lens flare elegante: eixo principal e pequenos reflexos circulares.
      ctx.globalAlpha = fade * layers.flare.opacity * (0.72 + Math.sin(guard.age * 0.08) * 0.18);
      const flare = ctx.createLinearGradient(x - r * 1.15, y, x + r * 1.15, y);
      flare.addColorStop(0, 'rgba(255,232,122,0)');
      flare.addColorStop(0.38, 'rgba(255,246,176,0.26)');
      flare.addColorStop(0.5, 'rgba(255,255,255,0.82)');
      flare.addColorStop(0.62, 'rgba(255,246,176,0.26)');
      flare.addColorStop(1, 'rgba(255,232,122,0)');
      ctx.fillStyle = flare;
      ctx.fillRect(x - r * 1.15, y - 1.1, r * 2.3, 2.2);
      ctx.fillStyle = 'rgba(255,246,176,0.36)';
      ctx.beginPath();
      ctx.arc(x - r * 0.52, y, 4.5, 0, Math.PI * 2);
      ctx.arc(x + r * 0.7, y, 2.8, 0, Math.PI * 2);
      ctx.fill();

      if (guard.hitT > 0) {
        const hit = guard.hitT / 14;
        const hx = guard.hitX || x + r * 0.72;
        const hy = guard.hitY || y;
        const hitGlow = ctx.createRadialGradient(hx, hy, 0, hx, hy, 38);
        hitGlow.addColorStop(0, 'rgba(255,255,255,1)');
        hitGlow.addColorStop(0.32, 'rgba(255,232,122,0.78)');
        hitGlow.addColorStop(1, 'rgba(255,210,58,0)');
        ctx.globalAlpha = hit;
        ctx.fillStyle = hitGlow;
        ctx.beginPath();
        ctx.arc(hx, hy, 38, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 1.5;
        for (let i = 0; i < 2; i++) {
          ctx.globalAlpha = hit * (0.9 - i * 0.25);
          ctx.beginPath();
          ctx.arc(x, y, r * (0.76 + i * 0.16 + (1 - hit) * 0.22), -1.1, 1.1);
          ctx.stroke();
        }
      }
    }
    ctx.restore();
  },

  drawParticle(ctx, p, x, y) {
    const k = Math.max(0, 1 - p.t / p.life);
    const q = 1 - k;
    switch (p.type) {
      case 'spark': {
        ctx.globalAlpha = k;
        ctx.strokeStyle = p.color;
        ctx.lineWidth = p.size * 0.6;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x - p.vx * 3, y - p.vy * 3);
        ctx.stroke();
        break;
      }
      case 'orb':
      case 'wisp':
      case 'firefly':
      case 'firePull':
      case 'waterPull': {
        ctx.globalAlpha = (p.type === 'firefly' ? 0.5 + 0.5 * Math.sin(p.t * 0.15) : 1) * k;
        const r = Math.max(0.4, p.size * (p.type === 'wisp' ? k : 1));
        const g = ctx.createRadialGradient(x, y, 0, x, y, r * 2.6);
        g.addColorStop(0, p.color);
        g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(x, y, r * 2.6, 0, Math.PI * 2);
        ctx.fill();
        break;
      }
      case 'drop': {
        const angle = Math.atan2(p.vy, p.vx) + Math.PI * 0.5;
        ctx.globalAlpha = k * 0.88;
        ctx.fillStyle = p.color;
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(angle);
        ctx.beginPath();
        ctx.ellipse(0, 0, p.size * 0.5, p.size, 0, 0, Math.PI * 2);
        ctx.fill();
        if (p.glint && Math.abs(p.vy) < 0.45) {
          ctx.globalAlpha = k;
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(-p.size * 0.18, -p.size * 0.32, 0.8, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
        break;
      }
      case 'leaf': {
        ctx.globalAlpha = k * 0.8;
        ctx.fillStyle = p.color;
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(Math.sin(p.t * 0.08) * 1.2);
        ctx.fillRect(-p.size, -p.size * 0.35, p.size * 2, p.size * 0.7);
        ctx.restore();
        break;
      }
      case 'darkPull':
      case 'darkShard': {
        const a = (p.angle || Math.atan2(p.vy, p.vx)) + p.t * (p.spin || 0.08);
        const r = Math.max(1, p.size * (0.72 + k * 0.28));
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(a);
        ctx.globalAlpha = k * 0.92;
        ctx.fillStyle = p.color || 'rgba(14,8,25,0.94)';
        ctx.strokeStyle = p.core || 'rgba(185,95,255,0.72)';
        ctx.lineWidth = 0.75;
        ctx.beginPath();
        ctx.moveTo(r * 1.25, 0);
        ctx.lineTo(-r * 0.25, -r * 0.72);
        ctx.lineTo(-r, r * 0.22);
        ctx.lineTo(r * 0.08, r * 0.64);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
        break;
      }
      case 'foam': {
        ctx.globalAlpha = k * 0.92;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.ellipse(x, y, p.size * 1.15, p.size * 0.58, Math.atan2(p.vy, p.vx), 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = k * 0.34;
        ctx.fillStyle = 'rgba(110,212,255,0.9)';
        ctx.beginPath();
        ctx.ellipse(x, y + p.size * 0.42, p.size * 1.2, p.size * 0.26, 0, 0, Math.PI * 2);
        ctx.fill();
        break;
      }
      case 'mist': {
        const r = Math.max(1, p.size * (0.55 + q * 0.85));
        ctx.globalAlpha = k * 0.45;
        const g = ctx.createRadialGradient(x, y, 0, x, y, r * 2);
        g.addColorStop(0, p.color);
        g.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.ellipse(x, y, r * 1.45, r * 0.72, 0, 0, Math.PI * 2);
        ctx.fill();
        break;
      }
      case 'puddle': {
        const r = p.size * (0.4 + q * 0.7);
        ctx.globalAlpha = k * 0.52;
        const g = ctx.createRadialGradient(x, y, 1, x, y, r);
        g.addColorStop(0, p.core || 'rgba(225,255,255,0.62)');
        g.addColorStop(0.46, p.color);
        // Borda neutra: a mesma primitiva serve para poças e marcas de brasa.
        g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.ellipse(x, y, r * 1.75, r * 0.35, p.angle || 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = k * 0.55;
        ctx.strokeStyle = p.core || 'rgba(225,255,255,0.85)';
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.ellipse(x, y, r * 1.15, r * 0.22, p.angle || 0, 0.15, 2.8);
        ctx.stroke();
        break;
      }
      case 'ring': {
        ctx.globalAlpha = k;
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 2.2 * k;
        ctx.beginPath();
        ctx.arc(x, y, p.size * q * 3 + 2, 0, Math.PI * 2);
        ctx.stroke();
        break;
      }
      case 'ripple': {
        const r = p.size * (0.55 + q * 1.35);
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(p.angle || 0);
        ctx.scale(1.65, 0.58);
        ctx.globalAlpha = k * 0.9;
        ctx.strokeStyle = p.color;
        ctx.lineWidth = Math.max(0.75, 1.7 * k);
        ctx.beginPath();
        ctx.arc(0, 0, r, 0.1, Math.PI * 2 - 0.1);
        ctx.stroke();
        ctx.restore();
        break;
      }
      case 'waterLens': {
        const r = p.size * (0.25 + Math.min(1, q * 1.5));
        ctx.globalAlpha = k;
        const g = ctx.createRadialGradient(x, y, 0, x, y, r * 2.5);
        g.addColorStop(0, p.core || '#ffffff');
        g.addColorStop(0.35, p.color);
        g.addColorStop(1, 'rgba(70,155,255,0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.ellipse(x, y, r * 1.35, r * 0.7, p.angle || 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = p.core || '#ffffff';
        ctx.lineWidth = 0.9 + k;
        ctx.beginPath();
        ctx.arc(x, y, r * 1.1, (p.angle || 0) - 1.15, (p.angle || 0) + 1.15);
        ctx.stroke();
        break;
      }
      case 'waterGroundWave': {
        const angle = Math.atan2(p.vy, p.vx);
        const speed = Math.hypot(p.vx, p.vy);
        const tail = Math.min(92, 32 + speed * 1.7);
        const h = p.size * (0.72 + Math.sin(p.t * 0.65 + p.phase) * 0.12);
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(angle);
        ctx.globalAlpha = k * 0.9;
        const trail = ctx.createLinearGradient(-tail, 0, h * 2.2, 0);
        trail.addColorStop(0, 'rgba(45,90,190,0)');
        trail.addColorStop(0.3, p.soft || 'rgba(80,180,235,0.24)');
        trail.addColorStop(0.78, p.color || 'rgba(127,212,255,0.76)');
        trail.addColorStop(1, p.core || 'rgba(245,255,255,0.94)');
        ctx.fillStyle = trail;
        ctx.beginPath();
        ctx.moveTo(-tail, 2);
        ctx.quadraticCurveTo(-tail * 0.22, -h * 0.32, h * 0.72, -h);
        ctx.quadraticCurveTo(h * 1.58, -h * 0.78, h * 2.15, 1);
        ctx.quadraticCurveTo(h * 0.4, h * 0.4, -tail, 2);
        ctx.fill();
        ctx.globalAlpha = k * 0.52;
        ctx.strokeStyle = p.core || '#ffffff';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(-tail * 0.82, 3);
        ctx.quadraticCurveTo(-tail * 0.1, 5, h * 2.0, 2);
        ctx.stroke();
        ctx.restore();
        break;
      }
      case 'waterGeyser': {
        const growQ = Math.min(1, q / 0.34);
        const grow = 1 - Math.pow(1 - growQ, 3);
        const fallQ = q > 0.62 ? (q - 0.62) / 0.38 : 0;
        const sustain = Math.max(0, 1 - fallQ * fallQ);
        const h = p.size * 3.25 * grow * sustain;
        const w = p.size * (0.28 + fallQ * 0.18);
        const top = y - h;
        ctx.save();
        ctx.globalAlpha = Math.min(0.94, k * 1.4);
        ctx.globalCompositeOperation = 'lighter';
        const column = ctx.createLinearGradient(x - w, 0, x + w, 0);
        column.addColorStop(0, 'rgba(45,110,210,0.12)');
        column.addColorStop(0.34, p.color || 'rgba(127,212,255,0.72)');
        column.addColorStop(0.63, p.core || 'rgba(245,255,255,0.92)');
        column.addColorStop(1, 'rgba(45,127,214,0.18)');
        ctx.fillStyle = column;
        ctx.beginPath();
        ctx.moveTo(x - w * 1.2, y);
        ctx.bezierCurveTo(x - w * 0.85, y - h * 0.35, x - w * 0.52, top + h * 0.18, x - w * 0.22, top);
        ctx.quadraticCurveTo(x, top - p.size * 0.3, x + w * 0.28, top);
        ctx.bezierCurveTo(x + w * 0.68, top + h * 0.18, x + w * 0.9, y - h * 0.35, x + w * 1.25, y);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = p.core || '#ffffff';
        ctx.lineWidth = Math.max(1, 2.4 * k);
        for (let i = -2; i <= 2; i++) {
          ctx.globalAlpha = k * (0.46 + (i === 0 ? 0.34 : 0));
          ctx.beginPath();
          ctx.moveTo(x + i * w * 0.28, y - 3);
          ctx.bezierCurveTo(
            x - i * 2, y - h * 0.38,
            x + i * w * 0.18, top + h * 0.2,
            x + i * w * 0.12, top + 2
          );
          ctx.stroke();
        }
        ctx.globalAlpha = k;
        ctx.strokeStyle = 'rgba(245,255,255,0.96)';
        ctx.lineWidth = 2.1;
        for (let i = -3; i <= 3; i++) {
          const a = -Math.PI * 0.5 + i * 0.24;
          const len = p.size * (0.45 + (i % 2 ? 0.2 : 0.05));
          ctx.beginPath();
          ctx.moveTo(x, top + 3);
          ctx.lineTo(x + Math.cos(a) * len, top + Math.sin(a) * len);
          ctx.stroke();
        }
        ctx.restore();
        break;
      }
      case 'waterCharge': {
        const born = 1 - Math.pow(1 - Math.min(1, q * 1.25), 3);
        const r = p.size * (0.28 + born * 0.72);
        const flash = q > 0.82 ? (q - 0.82) / 0.18 : 0;
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(p.angle || 0);
        ctx.globalAlpha = Math.min(0.78, k * 1.25);
        const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, r * 2.6);
        glow.addColorStop(0, p.core || 'rgba(255,255,255,0.96)');
        glow.addColorStop(0.18, p.soft || 'rgba(127,212,255,0.38)');
        glow.addColorStop(1, 'rgba(45,90,210,0)');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(0, 0, r * 2.6, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = p.core || '#ffffff';
        ctx.lineWidth = 1.25;
        for (let i = 0; i < 3; i++) {
          ctx.save();
          ctx.rotate(p.t * (0.045 + i * 0.017) + i * 1.8);
          ctx.scale(1, 0.42 + i * 0.08);
          ctx.globalAlpha = k * (0.72 - i * 0.14);
          ctx.beginPath();
          ctx.arc(0, 0, r * (0.72 + i * 0.31), -1.4, 1.45);
          ctx.stroke();
          ctx.restore();
        }
        if (flash > 0) {
          ctx.globalAlpha = flash;
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(0, 0, r * (0.45 + flash * 0.35), 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
        break;
      }
      case 'fireCharge': {
        const born = 1 - Math.pow(1 - Math.min(1, q * 1.3), 3);
        const r = p.size * (0.24 + born * 0.76);
        const flash = q > 0.78 ? (q - 0.78) / 0.22 : 0;
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(p.angle || 0);
        const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, r * 2.8);
        glow.addColorStop(0, p.core || 'rgba(255,246,210,0.98)');
        glow.addColorStop(0.22, p.color || 'rgba(255,142,74,0.78)');
        glow.addColorStop(1, 'rgba(202,60,28,0)');
        ctx.globalAlpha = Math.min(0.9, k * 1.3);
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(0, 0, r * 2.8, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = p.core || '#fff1c2';
        ctx.lineWidth = 1.35;
        for (let i = 0; i < 3; i++) {
          ctx.save();
          ctx.rotate(p.t * (0.07 + i * 0.018) * (i === 1 ? -1 : 1) + i * 2.1);
          ctx.scale(1, 0.46 + i * 0.09);
          ctx.globalAlpha = k * (0.78 - i * 0.16);
          ctx.beginPath();
          ctx.arc(0, 0, r * (0.8 + i * 0.32), -1.32, 1.38);
          ctx.stroke();
          ctx.restore();
        }
        ctx.globalAlpha = Math.min(1, k + flash * 0.7);
        ctx.fillStyle = p.core || '#fff6d2';
        ctx.beginPath();
        ctx.moveTo(r * (0.55 + flash * 0.42), 0);
        ctx.quadraticCurveTo(-r * 0.2, -r * 0.58, -r * 0.72, 0);
        ctx.quadraticCurveTo(-r * 0.2, r * 0.58, r * (0.55 + flash * 0.42), 0);
        ctx.fill();
        ctx.restore();
        break;
      }
      case 'fireWake': {
        const angle = Math.atan2(p.vy, p.vx);
        const speed = Math.hypot(p.vx, p.vy);
        const tail = Math.min(142, 58 + speed * 2.6);
        const r = p.size * (0.82 + Math.sin(p.t * 0.52 + p.phase) * 0.1);
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(angle);
        ctx.globalAlpha = k * 0.72;
        ctx.shadowColor = '#ff6428';
        ctx.shadowBlur = 14;
        const trail = ctx.createLinearGradient(-tail, 0, r * 2.1, 0);
        trail.addColorStop(0, 'rgba(112,20,12,0)');
        trail.addColorStop(0.26, p.soft || 'rgba(202,60,28,0.24)');
        trail.addColorStop(0.72, p.color || 'rgba(255,120,48,0.68)');
        trail.addColorStop(1, p.core || 'rgba(255,246,210,0.96)');
        ctx.fillStyle = trail;
        ctx.beginPath();
        ctx.moveTo(r * 2.1, 0);
        ctx.bezierCurveTo(r * 0.4, -r * 1.42, -tail * 0.38, -r * 1.9, -tail, -r * 0.14);
        ctx.bezierCurveTo(-tail * 0.52, r * 1.55, r * 0.45, r * 1.28, r * 2.1, 0);
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.restore();
        break;
      }
      case 'firebolt': {
        const angle = Math.atan2(p.vy, p.vx);
        const speed = Math.hypot(p.vx, p.vy);
        const tail = Math.min(118, 38 + speed * 2.7);
        const r = p.size * (0.9 + Math.sin(p.t * 0.72 + p.phase) * 0.08);
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(angle);
        ctx.globalAlpha = Math.min(1, k * 1.3);
        ctx.shadowColor = p.color || '#ff7a32';
        ctx.shadowBlur = 17;
        const trail = ctx.createLinearGradient(-tail, 0, r * 2.7, 0);
        trail.addColorStop(0, 'rgba(160,24,12,0)');
        trail.addColorStop(0.34, p.soft || 'rgba(202,60,28,0.3)');
        trail.addColorStop(0.76, p.color || 'rgba(255,142,74,0.94)');
        trail.addColorStop(1, p.core || 'rgba(255,246,210,0.99)');
        ctx.fillStyle = trail;
        ctx.beginPath();
        ctx.moveTo(r * 2.85, 0);
        ctx.lineTo(r * 0.45, -r * 1.05);
        ctx.lineTo(-tail * 0.18, -r * 1.5);
        ctx.lineTo(-tail * 0.45, -r * 0.5);
        ctx.lineTo(-tail, -r * 0.12);
        ctx.lineTo(-tail * 0.42, r * 0.65);
        ctx.lineTo(-tail * 0.14, r * 1.42);
        ctx.lineTo(r * 0.5, r * 0.95);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = p.core || '#fff6d2';
        ctx.beginPath();
        ctx.moveTo(r * 2.9, 0);
        ctx.lineTo(-r * 0.55, -r * 0.42);
        ctx.lineTo(-r * 1.1, 0);
        ctx.lineTo(-r * 0.55, r * 0.42);
        ctx.closePath();
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.globalAlpha = k * 0.72;
        ctx.strokeStyle = '#fff0b0';
        ctx.lineWidth = 1.1;
        for (let i = 0; i < 2; i++) {
          ctx.beginPath();
          ctx.ellipse(r * 0.25, 0, r * (1.5 + i * 0.52), r * (0.55 + i * 0.18), p.t * 0.19 + i, -1.1, 1.1);
          ctx.stroke();
        }
        ctx.restore();
        break;
      }
      case 'fireDetonation': {
        const born = 1 - Math.pow(1 - q, 3);
        const r = p.size * (0.16 + born * 0.95);
        const peak = Math.max(0, 1 - q * 3.4);
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(p.angle || 0);
        const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, r * 1.5);
        glow.addColorStop(0, p.core || 'rgba(255,255,224,1)');
        glow.addColorStop(0.22, p.color || 'rgba(255,142,74,0.9)');
        glow.addColorStop(0.62, p.soft || 'rgba(202,60,28,0.45)');
        glow.addColorStop(1, 'rgba(130,16,8,0)');
        ctx.globalAlpha = Math.min(1, k * 1.4);
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(0, 0, r * 1.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = p.core || '#fff4bf';
        ctx.lineWidth = Math.max(1, 4.2 * k);
        for (let i = 0; i < 12; i++) {
          const a = i / 12 * Math.PI * 2;
          const len = r * (0.75 + (i % 4) * 0.16);
          ctx.globalAlpha = k * (i % 2 ? 0.68 : 0.92);
          ctx.beginPath();
          ctx.moveTo(Math.cos(a) * r * 0.22, Math.sin(a) * r * 0.22);
          ctx.quadraticCurveTo(Math.cos(a + 0.08) * len * 0.58, Math.sin(a + 0.08) * len * 0.58, Math.cos(a) * len, Math.sin(a) * len);
          ctx.stroke();
        }
        if (peak > 0) {
          ctx.globalAlpha = peak;
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(0, 0, r * 0.68, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
        break;
      }
      case 'fireGroundWave': {
        const angle = Math.atan2(p.vy, p.vx);
        const speed = Math.hypot(p.vx, p.vy);
        const tail = Math.min(98, 34 + speed * 1.8);
        const h = p.size * (0.8 + Math.sin(p.t * 0.72 + p.phase) * 0.15);
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(angle);
        ctx.globalAlpha = k * 0.92;
        const trail = ctx.createLinearGradient(-tail, 0, h * 2.2, 0);
        trail.addColorStop(0, 'rgba(120,20,10,0)');
        trail.addColorStop(0.32, p.soft || 'rgba(202,60,28,0.28)');
        trail.addColorStop(0.78, p.color || 'rgba(255,112,42,0.86)');
        trail.addColorStop(1, p.core || 'rgba(255,238,176,0.98)');
        ctx.fillStyle = trail;
        ctx.beginPath();
        ctx.moveTo(-tail, 2);
        ctx.lineTo(-tail * 0.36, -h * 0.2);
        ctx.lineTo(-tail * 0.1, -h * 1.15);
        ctx.lineTo(h * 0.28, -h * 0.45);
        ctx.lineTo(h * 0.92, -h * 1.72);
        ctx.lineTo(h * 2.15, 1);
        ctx.lineTo(h * 0.2, h * 0.42);
        ctx.closePath();
        ctx.fill();
        ctx.globalAlpha = k * 0.66;
        ctx.strokeStyle = p.core || '#fff1b8';
        ctx.lineWidth = 1.25;
        ctx.beginPath();
        ctx.moveTo(-tail * 0.78, 3);
        ctx.quadraticCurveTo(-tail * 0.08, 4, h * 2.0, 2);
        ctx.stroke();
        ctx.restore();
        break;
      }
      case 'firePillar': {
        const growQ = Math.min(1, q / 0.3);
        const grow = 1 - Math.pow(1 - growQ, 3);
        const fallQ = q > 0.58 ? (q - 0.58) / 0.42 : 0;
        const sustain = Math.max(0, 1 - fallQ * fallQ);
        const h = p.size * 3.35 * grow * sustain;
        const w = p.size * (0.3 + fallQ * 0.2);
        const top = y - h;
        ctx.save();
        ctx.globalAlpha = Math.min(1, k * 1.45);
        ctx.globalCompositeOperation = 'lighter';
        const column = ctx.createLinearGradient(x - w, 0, x + w, 0);
        column.addColorStop(0, 'rgba(170,28,14,0.15)');
        column.addColorStop(0.3, p.color || 'rgba(255,106,38,0.82)');
        column.addColorStop(0.58, p.core || 'rgba(255,244,190,0.98)');
        column.addColorStop(1, 'rgba(202,60,28,0.2)');
        ctx.fillStyle = column;
        ctx.beginPath();
        ctx.moveTo(x - w * 1.25, y);
        ctx.bezierCurveTo(x - w * 0.85, y - h * 0.32, x - w * 0.46, top + h * 0.18, x - w * 0.18, top);
        ctx.quadraticCurveTo(x + Math.sin(p.t * 0.5) * w * 0.28, top - p.size * 0.42, x + w * 0.3, top + 2);
        ctx.bezierCurveTo(x + w * 0.72, top + h * 0.2, x + w * 0.96, y - h * 0.34, x + w * 1.3, y);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = p.core || '#fff5c4';
        ctx.lineWidth = Math.max(1, 2.2 * k);
        for (let i = -2; i <= 2; i++) {
          ctx.globalAlpha = k * (0.38 + (i === 0 ? 0.5 : 0));
          ctx.beginPath();
          ctx.moveTo(x + i * w * 0.28, y - 2);
          ctx.bezierCurveTo(x - i * w * 0.15, y - h * 0.32, x + i * w * 0.22, top + h * 0.2, x + i * w * 0.1, top + 2);
          ctx.stroke();
        }
        ctx.restore();
        break;
      }
      case 'tornado': {
        const growQ = Math.min(1, q / 0.25);
        const grow = 1 - Math.pow(1 - growQ, 3);
        const fallQ = q > 0.65 ? (q - 0.65) / 0.35 : 0;
        const sustain = Math.max(0, 1 - fallQ * fallQ);
        const h = p.size * 5.5 * grow * sustain;
        const baseR = p.size * 0.9;
        ctx.save();
        ctx.globalAlpha = Math.min(0.85, k * 1.3);
        ctx.globalCompositeOperation = 'lighter';
        for (let i = 0; i < 7; i++) {
          const ratio = i / 6;
          const cy = y - h * ratio;
          const rx = (baseR + ratio * p.size * 2.2) * (0.8 + 0.2 * Math.sin(p.t * 0.15 + i));
          const ry = rx * 0.26;
          const g = ctx.createRadialGradient(x, cy, 0, x, cy, rx * 1.8);
          g.addColorStop(0, 'rgba(162, 232, 201, 0.07)');
          g.addColorStop(0.5, 'rgba(162, 232, 201, 0.04)');
          g.addColorStop(1, 'rgba(0,0,0,0)');
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.ellipse(x, cy, rx * 1.8, ry * 1.8, 0, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.strokeStyle = 'rgba(174, 239, 202, 0.5)';
        ctx.lineWidth = 1.6;
        for (let i = 0; i < 3; i++) {
          const offset = i * (Math.PI * 2 / 3);
          ctx.beginPath();
          for (let ratio = 0; ratio <= 1.05; ratio += 0.1) {
            const cy = y - h * ratio;
            const rx = baseR + ratio * p.size * 2.2;
            const theta = p.t * 0.34 + ratio * Math.PI * 2.2 + offset;
            const px = x + Math.cos(theta) * rx;
            const py = cy + Math.sin(theta) * rx * 0.26;
            if (ratio === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
          }
          ctx.stroke();
        }
        ctx.restore();
        break;
      }
      case 'darkCharge': {
        const born = 1 - Math.pow(1 - Math.min(1, q * 1.65), 3);
        const r = p.size * (0.18 + born * 0.82);
        const squeeze = 1 + Math.sin(p.t * 1.75) * 0.08;
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(p.angle || 0);
        const halo = ctx.createRadialGradient(0, 0, 0, 0, 0, r * 3.1);
        halo.addColorStop(0, p.core || 'rgba(255,248,255,0.99)');
        halo.addColorStop(0.13, 'rgba(255,255,255,0.98)');
        halo.addColorStop(0.3, p.color || 'rgba(224,132,255,0.92)');
        halo.addColorStop(0.58, p.soft || 'rgba(255,74,218,0.42)');
        halo.addColorStop(1, 'rgba(70,22,130,0)');
        ctx.globalAlpha = Math.min(1, k * 1.5);
        ctx.fillStyle = halo;
        ctx.beginPath();
        ctx.ellipse(0, 0, r * 3.1 * squeeze, r * 2.5 / squeeze, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowColor = '#e084ff';
        ctx.shadowBlur = 13;
        ctx.fillStyle = p.core || '#fff8ff';
        ctx.beginPath();
        ctx.arc(0, 0, r * 0.52, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        for (let i = 0; i < 3; i++) {
          ctx.save();
          ctx.rotate(p.t * (0.28 + i * 0.07) * (i === 1 ? -1 : 1) + i * 2.05);
          ctx.scale(1, 0.36 + i * 0.1);
          ctx.globalAlpha = k * (0.82 - i * 0.14);
          ctx.strokeStyle = i === 1 ? '#ff72da' : '#d496ff';
          ctx.lineWidth = 1.2 + (2 - i) * 0.45;
          ctx.beginPath();
          ctx.arc(0, 0, r * (0.9 + i * 0.5), -1.55, 1.55);
          ctx.stroke();
          ctx.restore();
        }
        ctx.restore();
        break;
      }
      case 'darkRibbon': {
        const angle = Math.atan2(p.vy, p.vx);
        const speed = Math.hypot(p.vx, p.vy);
        const tail = Math.min(178, 74 + speed * 3.2);
        const r = p.size * (0.88 + Math.sin(p.t * 0.9 + p.phase) * 0.12);
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(angle);
        ctx.globalAlpha = k * 0.88;
        ctx.shadowColor = '#a64cff';
        ctx.shadowBlur = 15;
        const body = ctx.createLinearGradient(-tail, 0, r * 1.9, 0);
        body.addColorStop(0, 'rgba(46,12,92,0)');
        body.addColorStop(0.28, p.soft || 'rgba(174,82,255,0.3)');
        body.addColorStop(0.74, p.color || 'rgba(166,78,255,0.78)');
        body.addColorStop(1, p.core || 'rgba(255,248,255,0.96)');
        ctx.fillStyle = body;
        ctx.beginPath();
        ctx.moveTo(r * 2, 0);
        ctx.bezierCurveTo(r * 0.35, -r * 1.28, -tail * 0.3, -r * 2.05, -tail, -r * 0.2);
        ctx.bezierCurveTo(-tail * 0.54, r * 1.7, r * 0.35, r * 1.18, r * 2, 0);
        ctx.fill();
        ctx.shadowBlur = 0;
        for (let i = -1; i <= 1; i++) {
          const wave = Math.sin(p.t * 1.08 + i * 2.1 + p.phase) * r * 1.4;
          ctx.globalAlpha = k * (i === 0 ? 0.92 : 0.58);
          ctx.strokeStyle = i === 0 ? '#f2dcff' : i < 0 ? '#ff66d5' : '#9d62ff';
          ctx.lineWidth = i === 0 ? 1.45 : 2.2;
          ctx.beginPath();
          ctx.moveTo(-tail, i * r * 0.45);
          ctx.bezierCurveTo(-tail * 0.66, wave, -tail * 0.25, -wave * 0.72, r * 1.72, i * r * 0.15);
          ctx.stroke();
        }
        ctx.restore();
        break;
      }
      case 'darkbolt': {
        const angle = Math.atan2(p.vy, p.vx);
        const r = p.size * (0.92 + Math.sin(p.t * 1.18) * 0.08);
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(angle);
        ctx.globalAlpha = Math.min(1, k * 1.45);
        ctx.shadowColor = '#e084ff';
        ctx.shadowBlur = 19;
        const halo = ctx.createRadialGradient(0, 0, 0, 0, 0, r * 2.65);
        halo.addColorStop(0, p.core || 'rgba(255,255,255,1)');
        halo.addColorStop(0.2, 'rgba(255,244,255,0.98)');
        halo.addColorStop(0.43, p.color || 'rgba(224,132,255,0.9)');
        halo.addColorStop(0.68, p.soft || 'rgba(255,74,218,0.42)');
        halo.addColorStop(1, 'rgba(75,20,145,0)');
        ctx.fillStyle = halo;
        ctx.beginPath();
        ctx.ellipse(0, 0, r * 2.65, r * 2.2, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.ellipse(r * 0.22, 0, r * 0.82, r * 0.58, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.strokeStyle = '#edc8ff';
        ctx.lineWidth = 1.35;
        for (let i = 0; i < 3; i++) {
          ctx.save();
          ctx.rotate(p.t * (0.42 + i * 0.1) * (i === 1 ? -1 : 1) + i * 1.9);
          ctx.scale(1, 0.45 + i * 0.1);
          ctx.globalAlpha = k * (0.86 - i * 0.16);
          ctx.beginPath();
          ctx.arc(0, 0, r * (1.05 + i * 0.48), -1.25, 1.25);
          ctx.stroke();
          ctx.restore();
        }
        ctx.restore();
        break;
      }
      case 'darkDetonation': {
        const expand = 1 - Math.pow(1 - q, 3);
        const r = p.size * (0.12 + expand * 1.08);
        const flash = Math.max(0, 1 - q * 2.35);
        ctx.save();
        ctx.translate(x, y);
        const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, r * 1.55);
        glow.addColorStop(0, 'rgba(255,255,255,1)');
        glow.addColorStop(0.18, p.core || 'rgba(255,248,255,0.98)');
        glow.addColorStop(0.4, p.color || 'rgba(224,132,255,0.9)');
        glow.addColorStop(0.68, p.soft || 'rgba(255,74,218,0.42)');
        glow.addColorStop(1, 'rgba(65,15,125,0)');
        ctx.globalAlpha = Math.min(1, k * 1.55);
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(0, 0, r * 1.55, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = k * 0.92;
        ctx.strokeStyle = '#f4dcff';
        ctx.lineWidth = Math.max(1, 3.8 * k);
        ctx.beginPath();
        ctx.arc(0, 0, r * 0.88, 0, Math.PI * 2);
        ctx.stroke();
        if (flash > 0) {
          ctx.globalAlpha = flash;
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(0, 0, r * (0.72 + flash * 0.38), 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
        break;
      }
      case 'darkSpiral': {
        const r = p.size * (0.28 + q * 1.08);
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate((p.angle || 0) + p.t * (p.spin || 0.16));
        ctx.globalAlpha = k * 0.86;
        ctx.strokeStyle = p.color || '#d78cff';
        ctx.lineWidth = Math.max(0.8, 2.6 * k);
        ctx.shadowColor = p.color || '#b95fff';
        ctx.shadowBlur = 8;
        ctx.beginPath();
        for (let i = 0; i <= 28; i++) {
          const f = i / 28;
          const a = f * Math.PI * 4.6;
          const rr = r * f;
          const px = Math.cos(a) * rr;
          const py = Math.sin(a) * rr * 0.66;
          if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
        }
        ctx.stroke();
        ctx.shadowBlur = 0;
        ctx.restore();
        break;
      }
      case 'darkGroundStreak': {
        const len = Math.max(18, p.width || p.size * 6);
        const grow = Math.min(1, q * 2.6);
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(p.angle || 0);
        ctx.globalAlpha = k * 0.78;
        ctx.shadowColor = '#f8efff';
        ctx.shadowBlur = 8;
        const streak = ctx.createLinearGradient(-len * 0.5, 0, len * 0.5, 0);
        streak.addColorStop(0, 'rgba(255,255,255,0)');
        streak.addColorStop(0.28, 'rgba(241,225,255,0.28)');
        streak.addColorStop(0.78, 'rgba(255,255,255,0.86)');
        streak.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.strokeStyle = streak;
        ctx.lineWidth = Math.max(0.8, p.size * k);
        ctx.beginPath();
        ctx.moveTo(-len * 0.5, 0);
        ctx.quadraticCurveTo(0, Math.sin(p.t * 0.7) * 1.8, -len * 0.5 + len * grow, 0);
        ctx.stroke();
        ctx.shadowBlur = 0;
        ctx.restore();
        break;
      }
      case 'holyFlash': {
        const r = p.size * (0.2 + (1 - Math.pow(1 - q, 3)) * 1.05);
        const flash = Math.max(0, 1 - q * 2.5);
        ctx.save();
        ctx.translate(x, y);
        const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, r * 1.6);
        glow.addColorStop(0, 'rgba(255,255,255,1)');
        glow.addColorStop(0.22, p.core || 'rgba(255,246,176,0.95)');
        glow.addColorStop(0.55, p.color || 'rgba(255,232,122,0.55)');
        glow.addColorStop(1, 'rgba(255,210,58,0)');
        ctx.globalAlpha = Math.min(1, k * 1.5);
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(0, 0, r * 1.6, 0, Math.PI * 2);
        ctx.fill();
        if (flash > 0) {
          ctx.globalAlpha = flash;
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(-r * 1.35, -1.4, r * 2.7, 2.8);
          ctx.fillRect(-1.4, -r * 1.35, 2.8, r * 2.7);
        }
        ctx.restore();
        break;
      }
      case 'holyDust': {
        const twinkle = 0.62 + Math.sin(p.t * 0.8 + p.phase) * 0.38;
        const r = p.size * (0.72 + twinkle * 0.32);
        ctx.save();
        ctx.translate(x, y);
        ctx.globalAlpha = k * twinkle;
        ctx.strokeStyle = p.color || '#FFE87A';
        ctx.lineWidth = Math.max(0.65, r * 0.35);
        ctx.beginPath();
        ctx.moveTo(-r * 1.8, 0); ctx.lineTo(r * 1.8, 0);
        ctx.moveTo(0, -r * 1.8); ctx.lineTo(0, r * 1.8);
        ctx.stroke();
        ctx.fillStyle = p.core || '#FFFFFF';
        ctx.beginPath();
        ctx.arc(0, 0, r * 0.48, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        break;
      }
      case 'holyRay': {
        const angle = Math.atan2(p.vy, p.vx);
        const len = p.size * (4.5 + q * 3.5);
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(angle);
        const beam = ctx.createLinearGradient(-len, 0, len * 0.25, 0);
        beam.addColorStop(0, 'rgba(255,232,122,0)');
        beam.addColorStop(0.72, p.color || 'rgba(255,232,122,0.62)');
        beam.addColorStop(1, p.core || 'rgba(255,255,255,0.96)');
        ctx.globalAlpha = k * 0.86;
        ctx.strokeStyle = beam;
        ctx.lineWidth = Math.max(0.7, p.width || 1.6);
        ctx.beginPath();
        ctx.moveTo(-len, 0);
        ctx.lineTo(len * 0.25, 0);
        ctx.stroke();
        ctx.restore();
        break;
      }
      case 'waterMuzzle': {
        const r = p.size * (0.55 + q * 0.78);
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(p.angle || 0);
        ctx.globalAlpha = k;
        ctx.strokeStyle = p.color;
        ctx.lineWidth = Math.max(0.8, 3.1 * k);
        for (let i = -1; i <= 1; i++) {
          ctx.beginPath();
          ctx.moveTo(-r * 0.15, i * r * 0.25);
          ctx.quadraticCurveTo(r * 0.45, i * r * 0.95, r * 1.75, i * r * 0.55);
          ctx.stroke();
        }
        ctx.fillStyle = p.core || '#ffffff';
        ctx.beginPath();
        ctx.arc(0, 0, r * 0.42, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        break;
      }
      case 'waterWake': {
        const angle = Math.atan2(p.vy, p.vx);
        const speed = Math.hypot(p.vx, p.vy);
        const tail = Math.min(132, 54 + speed * 2.4);
        const r = p.size * (0.82 + 0.1 * Math.sin(p.t * 0.42 + p.phase));
        const sway = Math.sin(p.t * 0.68 + p.phase) * p.waveAmp;
        ctx.save();
        ctx.translate(x, y + sway);
        ctx.rotate(angle);
        ctx.globalAlpha = k * 0.62;
        ctx.shadowColor = p.core || '#7fd4ff';
        ctx.shadowBlur = 14;
        const wake = ctx.createLinearGradient(-tail, 0, r * 2.2, 0);
        wake.addColorStop(0, 'rgba(35,55,155,0)');
        wake.addColorStop(0.24, p.color || 'rgba(45,127,214,0.36)');
        wake.addColorStop(0.78, p.soft || 'rgba(127,212,255,0.38)');
        wake.addColorStop(1, p.core || 'rgba(127,212,255,0.72)');
        ctx.fillStyle = wake;
        ctx.beginPath();
        ctx.moveTo(r * 2.2, 0);
        ctx.bezierCurveTo(r * 0.5, -r * 1.35, -tail * 0.38, -r * 1.9 - sway, -tail, -r * 0.18);
        ctx.bezierCurveTo(-tail * 0.48, r * 1.6 + sway, r * 0.4, r * 1.25, r * 2.2, 0);
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.restore();
        break;
      }
      case 'waterbolt': {
        const angle = Math.atan2(p.vy, p.vx);
        const speed = Math.hypot(p.vx, p.vy);
        const tail = Math.min(112, 34 + speed * 2.65);
        const r = p.size * (0.9 + 0.1 * Math.sin(p.t * 0.55 + p.phase));
        const sway = Math.sin(p.t * 0.85 + p.phase) * p.waveAmp;
        const compression = q > 0.84 ? Math.min(1, (q - 0.84) / 0.16) : 0;
        ctx.save();
        ctx.translate(x, y + sway);
        ctx.rotate(angle);
        ctx.scale(1 - compression * 0.38, 1 + compression * 0.62);
        ctx.globalAlpha = Math.min(1, k * 1.2);
        const trail = ctx.createLinearGradient(-tail, 0, r * 1.7, 0);
        trail.addColorStop(0, 'rgba(45,127,214,0)');
        trail.addColorStop(0.3, p.soft || 'rgba(100,200,255,0.24)');
        trail.addColorStop(0.82, p.color || 'rgba(127,212,255,0.9)');
        trail.addColorStop(1, p.core || 'rgba(255,255,255,0.98)');
        ctx.strokeStyle = trail;
        ctx.lineWidth = r * 2.05;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(-tail, 0);
        ctx.quadraticCurveTo(-tail * 0.42, -sway * 0.9 - r * 0.72, r * 1.82, 0);
        ctx.stroke();
        ctx.strokeStyle = p.core || 'rgba(240,255,255,0.92)';
        ctx.globalAlpha *= 0.72;
        ctx.lineWidth = Math.max(0.7, r * 0.34);
        for (let i = -1; i <= 1; i += 2) {
          ctx.beginPath();
          ctx.moveTo(-tail * 0.82, i * r * 0.38);
          ctx.quadraticCurveTo(-tail * 0.18, i * r * 1.08 + sway * 0.22, r * 1.55, i * r * 0.13);
          ctx.stroke();
        }
        ctx.globalAlpha = Math.min(1, k * 1.2);
        ctx.shadowColor = p.color || '#7fd4ff';
        ctx.shadowBlur = 16;
        ctx.fillStyle = p.core || 'rgba(255,255,255,0.98)';
        ctx.beginPath();
        ctx.moveTo(r * 2.45, 0);
        ctx.quadraticCurveTo(r * 0.15, -r * 1.32, -r * 1.1, 0);
        ctx.quadraticCurveTo(r * 0.15, r * 1.32, r * 2.45, 0);
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.globalAlpha = k * 0.82;
        ctx.strokeStyle = p.color || '#7fd4ff';
        ctx.lineWidth = 1.15;
        for (let i = 0; i < 2; i++) {
          ctx.beginPath();
          ctx.ellipse(r * 0.25, 0, r * (1.45 + i * 0.48), r * (0.52 + i * 0.15),
            p.t * 0.16 + i * 0.8, -1.2, 1.2);
          ctx.stroke();
        }
        ctx.globalAlpha *= 0.26;
        ctx.fillStyle = p.core || '#ffffff';
        for (let i = 1; i <= 3; i++) {
          ctx.beginPath();
          ctx.ellipse(-i * speed * 1.28, 0, r * Math.max(0.25, 1 - i * 0.2), r * 0.58, 0, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
        break;
      }
      case 'waterDetonation': {
        const born = 1 - Math.pow(1 - q, 3);
        const r = p.size * (0.18 + born * 0.92);
        const peak = Math.max(0, 1 - q * 3.1);
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(p.angle || 0);
        const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, r * 1.35);
        glow.addColorStop(0, p.core || 'rgba(255,255,255,0.98)');
        glow.addColorStop(0.18, p.soft || 'rgba(127,212,255,0.72)');
        glow.addColorStop(0.58, p.color || 'rgba(45,127,214,0.42)');
        glow.addColorStop(1, 'rgba(20,50,155,0)');
        ctx.globalAlpha = Math.min(1, k * 1.35);
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(0, 0, r * 1.35, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = p.core || '#ffffff';
        ctx.lineWidth = Math.max(1, 4.5 * k);
        ctx.globalAlpha = k * 0.94;
        for (let i = 0; i < 12; i++) {
          const spread = -1.28 + i * 0.233;
          const a = Math.PI + spread;
          const len = r * (0.72 + (i % 4) * 0.16);
          ctx.beginPath();
          ctx.moveTo(Math.cos(a) * r * 0.16, Math.sin(a) * r * 0.16);
          ctx.quadraticCurveTo(
            Math.cos(a) * len * 0.55, Math.sin(a) * len * 0.7,
            Math.cos(a) * len, Math.sin(a) * len
          );
          ctx.stroke();
        }
        if (peak > 0) {
          ctx.globalAlpha = peak;
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.ellipse(0, 0, r * 0.72, r * 0.44, 0, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
        break;
      }
      case 'waterImpact': {
        const r = p.size * (0.35 + q * 1.15);
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(p.angle || 0);
        ctx.globalAlpha = k;
        ctx.scale(1.62, 0.64);
        ctx.strokeStyle = p.color || '#7fd4ff';
        ctx.lineWidth = Math.max(0.8, 2.7 * (1 - q * 0.35));
        ctx.beginPath();
        ctx.arc(0, 0, r, -1.18, 1.18);
        ctx.stroke();
        ctx.strokeStyle = p.core || '#ffffff';
        ctx.lineWidth = Math.max(0.6, 1.35 * k);
        ctx.beginPath();
        ctx.arc(0, 0, r * 1.28, 1.72, 4.14);
        ctx.stroke();
        ctx.restore();
        break;
      }
      case 'waterBarrier': {
        const h = p.size * (1.55 + 0.08 * Math.sin(p.t * 0.15));
        const w = p.size * 0.72;
        ctx.save();
        ctx.translate(x, y);
        ctx.globalAlpha = Math.min(0.78, k * 1.15);
        ctx.strokeStyle = p.color;
        ctx.lineWidth = Math.max(1, w * 0.2);
        for (let i = -1; i <= 1; i++) {
          const phase = p.t * 0.16 + i * 1.8;
          ctx.beginPath();
          ctx.moveTo(i * w * 0.45, h * 0.82);
          ctx.bezierCurveTo(
            Math.sin(phase) * w, h * 0.3,
            Math.sin(phase + 1.3) * w, -h * 0.34,
            i * w * 0.2, -h * 0.88
          );
          ctx.stroke();
        }
        ctx.globalAlpha *= 0.72;
        ctx.strokeStyle = p.core || '#ffffff';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.ellipse(0, 0, w * 0.95, h, 0, -1.02, 1.02);
        ctx.stroke();
        ctx.restore();
        break;
      }
      case 'slash': {
        const radius = p.size * (0.46 + q * 0.54);
        const span = p.span || 1.25;
        const angle = p.angle || 0;
        ctx.globalAlpha = k * 0.88;
        ctx.strokeStyle = p.color;
        ctx.lineWidth = Math.max(0.8, (p.width || p.size * 0.14) * (1 - q * 0.42));
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 7 * k;
        ctx.beginPath();
        ctx.arc(x, y, radius, angle - span * 0.84, angle + span * (0.12 + q * 0.72), !!p.ccw);
        ctx.stroke();
        ctx.shadowBlur = 0;
        break;
      }
      case 'glyph': {
        const r = p.size * (0.7 + q * 0.3);
        ctx.globalAlpha = k * 0.8;
        ctx.strokeStyle = p.color;
        ctx.lineWidth = Math.max(0.7, 1.3 * k);
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate((p.angle || 0) + p.t * (p.spin || 0.05));
        ctx.beginPath();
        ctx.moveTo(0, -r);
        ctx.lineTo(r, 0);
        ctx.lineTo(0, r);
        ctx.lineTo(-r, 0);
        ctx.closePath();
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(-r * 0.45, 0);
        ctx.lineTo(r * 0.45, 0);
        ctx.moveTo(0, -r * 0.45);
        ctx.lineTo(0, r * 0.45);
        ctx.stroke();
        ctx.restore();
        break;
      }
    }
  }
};

const Particles = {
  maxActive: 480,
  maxPool: 512,
  list: [],
  pool: [],
  stats: { spawned: 0, evicted: 0, active: 0 },

  make() {
    return {
      x: 0, y: 0, vx: 0, vy: 0, sx: 0, sy: 0, tx: 0, ty: 0,
      life: 40, t: 0, size: 3, color: '#ffffff', type: 'orb',
      grav: 0, drag: 1, core: null, soft: null, angle: 0, span: 0,
      width: 0, ccw: false, spin: 0.05, phase: 0, waveAmp: 0,
      layer: 'front', glint: false, emitDrops: false, emitTrail: false,
      pull: false
    };
  },

  reset(p, o) {
    p.x = o.x === undefined ? 0 : o.x;
    p.y = o.y === undefined ? 0 : o.y;
    p.vx = o.vx || 0;
    p.vy = o.vy || 0;
    p.life = o.life === undefined ? 40 : o.life;
    p.t = 0;
    p.size = o.size === undefined ? 3 : o.size;
    p.color = o.color || '#ffffff';
    p.type = o.type || 'orb';
    p.grav = o.grav || 0;
    p.drag = o.drag === undefined ? 1 : o.drag;
    p.core = o.core || null;
    p.soft = o.soft || null;
    p.angle = o.angle || 0;
    p.span = o.span || 0;
    p.width = o.width || 0;
    p.ccw = !!o.ccw;
    p.spin = o.spin === undefined ? 0.05 : o.spin;
    p.phase = o.phase || 0;
    p.waveAmp = o.waveAmp || 0;
    p.layer = o.layer || 'front';
    p.glint = !!o.glint;
    p.emitDrops = !!o.emitDrops;
    p.emitTrail = !!o.emitTrail;
    p.pull = !!o.pull;
    p.sx = o.sx === undefined ? p.x : o.sx;
    p.sy = o.sy === undefined ? p.y : o.sy;
    p.tx = o.tx === undefined ? p.x : o.tx;
    p.ty = o.ty === undefined ? p.y : o.ty;
  },

  spawn(o) {
    if (this.list.length >= this.maxActive) {
      this.releaseAt(0);
      this.stats.evicted++;
    }
    const p = this.pool.pop() || this.make();
    this.reset(p, o || {});
    this.list.push(p);
    this.stats.spawned++;
    this.stats.active = this.list.length;
    return p;
  },

  burst(x, y, n, fn) {
    for (let i = 0; i < n; i++) this.spawn(fn(i));
  },

  releaseAt(index) {
    const lastIndex = this.list.length - 1;
    const p = this.list[index];
    const last = this.list[lastIndex];
    this.list.pop();
    if (index < lastIndex) this.list[index] = last;
    if (this.pool.length < this.maxPool) this.pool.push(p);
  },

  clear() {
    while (this.list.length) {
      const p = this.list.pop();
      if (this.pool.length < this.maxPool) this.pool.push(p);
    }
    this.stats.active = 0;
    if (window.VFX && VFX.resetPersistent) VFX.resetPersistent();
  },

  update() {
    for (let i = this.list.length - 1; i >= 0; i--) {
      const p = this.list[i];
      p.t++;
      if (p.type === 'waterPull' || p.type === 'firePull' || p.type === 'darkPull') {
        const q = Math.min(1, p.t / p.life);
        const easeIn = q * q;
        p.x = p.sx + (p.tx - p.sx) * easeIn;
        p.y = p.sy + (p.ty - p.sy) * easeIn;
      } else {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += p.grav;
        p.vx *= p.drag;
        p.vy *= p.drag;
      }
      if (p.type === 'firefly') {
        p.vx += U.rand(-0.02, 0.02);
        p.vy += U.rand(-0.02, 0.02);
        p.vx = U.clamp(p.vx, -0.35, 0.35);
        p.vy = U.clamp(p.vy, -0.25, 0.25);
      }
      if (p.type === 'leaf') p.vx = Math.sin(p.t * 0.06 + p.x * 0.01) * 0.7;
      if (p.type === 'waterbolt' && p.emitDrops && p.t % 2 === 0 &&
          this.list.length < this.maxActive - 8) {
        this.spawn({
          x: p.x - p.vx * 0.35 + U.rand(-2, 2),
          y: p.y - p.vy * 0.35 + U.rand(-3, 3),
          vx: -p.vx * 0.05 + U.rand(-0.35, 0.15),
          vy: -p.vy * 0.03 + U.rand(-0.5, 0.35),
          grav: 0.15, drag: 0.97, life: 13 + U.rand(0, 8),
          size: U.rand(1.6, 3.2), color: p.color, type: 'drop',
          glint: Math.random() < 0.3
        });
      }
      if (p.type === 'firebolt' && p.emitTrail && p.t % 2 === 0 &&
          this.list.length < this.maxActive - 12) {
        this.spawn({
          x: p.x - p.vx * 0.42 + U.rand(-3, 3),
          y: p.y - p.vy * 0.42 + U.rand(-4, 4),
          vx: -p.vx * 0.035 + U.rand(-0.45, 0.18),
          vy: -p.vy * 0.025 + U.rand(-1.1, 0.15),
          grav: -0.025, drag: 0.94, life: 14 + U.rand(0, 7),
          size: U.rand(1.5, 3.2), color: p.color, type: 'wisp'
        });
        if (p.t % 4 === 0 && this.list.length < this.maxActive - 8) {
          this.spawn({
            x: p.x - p.vx * 0.68 + U.rand(-4, 4),
            y: p.y - p.vy * 0.68 + U.rand(-5, 5),
            vx: -p.vx * 0.02 + U.rand(-0.18, 0.18), vy: U.rand(-0.6, -0.12),
            drag: 0.96, life: 22 + U.rand(0, 10), size: U.rand(4, 7),
            color: 'rgba(92,48,42,0.36)', type: 'mist'
          });
        }
      }
      if (p.type === 'darkbolt' && p.emitTrail && p.t % 2 === 0 &&
          this.list.length < this.maxActive - 12) {
        const side = p.t % 4 === 0 ? -1 : 1;
        this.spawn({
          x: p.x - p.vx * 0.48 + U.rand(-5, 3),
          y: p.y - p.vy * 0.48 + side * U.rand(4, 9),
          vx: -p.vx * 0.055 + U.rand(-0.35, 0.1),
          vy: -p.vy * 0.04 - side * U.rand(0.1, 0.45),
          drag: 0.93, life: 11 + U.rand(0, 7), size: U.rand(1.7, 3.4),
          angle: U.rand(0, Math.PI * 2), spin: U.rand(-0.18, 0.18),
          color: 'rgba(14,8,25,0.94)', core: 'rgba(185,95,255,0.72)',
          type: 'darkShard'
        });
        if (p.t % 4 === 0) {
          this.spawn({
            x: p.x - p.vx * 0.68, y: p.y - p.vy * 0.68,
            vx: -p.vx * 0.07, vy: -p.vy * 0.05,
            drag: 0.92, life: 14, size: U.rand(2.4, 4.2),
            color: 'rgba(192,92,255,0.58)', type: 'wisp'
          });
        }
      }
      if (p.t >= p.life) this.releaseAt(i);
    }
    this.stats.active = this.list.length;
  },

  draw(ctx, camX, camY, layer) {
    ParticleRenderer.draw(ctx, this.list, camX, camY, layer);
  }
};
